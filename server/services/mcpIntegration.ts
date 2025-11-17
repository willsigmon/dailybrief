import { exec } from 'child_process';
import { promisify } from 'util';
import type {
  GmailMCPResult,
  CalendarMCPResult,
  LimitlessMCPResult,
  MCPResult,
} from './types/mcpTypes';
import {
  GmailMCPResultSchema,
  CalendarMCPResultSchema,
  LimitlessMCPResultSchema,
} from './types/mcpSchemas';
import { retryWithBackoff, isRetryableError } from '../_core/retry';
import { mcpCircuitBreaker } from '../_core/circuitBreaker';
import { logger } from '../_core/logger';
import { mcpDataCache, relationshipCache, getMCPCacheKey, getRelationshipCacheKey, cached } from '../_core/cache';

const execAsync = promisify(exec);

/**
 * Normalized Gmail message structure
 */
export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: Date;
  snippet: string;
  content: string;
}

/**
 * Normalized calendar event structure
 */
export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  location: string | null;
  attendees: string[];
}

/**
 * Normalized Limitless recording structure
 */
export interface LimitlessRecording {
  id: string;
  startTime: Date;
  endTime: Date;
  transcript: string;
  participants: string[];
}

/**
 * Execute MCP CLI command and parse JSON result
 * Falls back gracefully if manus-mcp-cli is not available
 */
async function executeMCPCommand(command: string): Promise<MCPResult> {
  // Check if MCP CLI is enabled (defaults to enabled for backward compatibility)
  // Set USE_MCP_CLI=false to disable and use direct API integrations instead
  if (process.env.USE_MCP_CLI === 'false') {
    logger.info('MCP CLI disabled - using direct API integrations instead');
    return null;
  }

  try {
    return await mcpCircuitBreaker.execute(() => retryWithBackoff(
      async () => {
        const { stdout, stderr } = await execAsync(command, { timeout: 30000 }); // 30 second timeout

        if (stderr && !stderr.includes('results was saved')) {
          logger.warn('MCP command stderr', { stderr, command });
        }

        // Extract file path from output
        const filePathMatch = stdout.match(/\/tmp\/manus-mcp\/mcp_result_[a-f0-9]+\.json/);
        if (filePathMatch) {
          const fs = await import('fs/promises');
          const fileContent = await fs.readFile(filePathMatch[0], 'utf-8');
          const parsed = JSON.parse(fileContent);

          // Runtime validation - try to match against known schemas
          // This helps catch malformed responses early
          try {
            // Try Gmail schema first
            GmailMCPResultSchema.parse(parsed);
            return parsed as GmailMCPResult;
          } catch {
            try {
              // Try Calendar schema
              CalendarMCPResultSchema.parse(parsed);
              return parsed as CalendarMCPResult;
            } catch {
              try {
                // Try Limitless schema
                LimitlessMCPResultSchema.parse(parsed);
                return parsed as LimitlessMCPResult;
              } catch {
                // If none match, return as-is but log warning
                logger.warn('MCP response did not match expected schema, returning unvalidated', { command });
                return parsed as MCPResult;
              }
            }
          }
        }

        return null;
      },
      {
        maxRetries: 2, // Fewer retries for MCP commands
        initialDelayMs: 500,
        retryableErrors: isRetryableError,
      }
    ));
  } catch (error) {
    logger.warn('MCP command execution failed after retries (this is OK if not using Manus)', { error, command });
    return null; // Return null instead of throwing to allow graceful degradation
  }
}

/**
 * Fetch recent Gmail messages from HTI email
 * Results are cached for 30 minutes to reduce API calls
 */
export async function fetchGmailMessages(daysBack: number = 2): Promise<GmailMessage[]> {
  const cacheKey = getMCPCacheKey('gmail', { daysBack });

  return cached(
    mcpDataCache,
    cacheKey,
    async () => {
      const afterDate = new Date();
      afterDate.setDate(afterDate.getDate() - daysBack);
      const afterTimestamp = Math.floor(afterDate.getTime() / 1000);

      const command = `manus-mcp-cli tool call gmail_search_messages --server gmail --input '{"q":"after:${afterTimestamp}"}'`;

      const result = await executeMCPCommand(command);

  if (!result || !('result' in result) || !result.result?.threads) {
    logger.debug('Gmail integration returned no data', { daysBack });
    return [];
  }

  const gmailResult = result as GmailMCPResult;
  const messages: GmailMessage[] = [];

  for (const thread of gmailResult.result.threads || []) {
    for (const message of thread.messages) {
      const headers = message.pickedHeaders || {};
      messages.push({
        id: message.id,
        threadId: message.threadId,
        from: headers.from || '',
        to: headers.to || '',
        subject: headers.subject || '',
        date: new Date(parseInt(message.internalDate)),
        snippet: message.snippet || '',
        content: message.pickedPlainContent || message.pickedMarkdownContent || '',
      });
    }
  }

  return messages;
    },
    30 * 60 * 1000 // 30 minute cache TTL
  );
}

/**
 * Fetch upcoming calendar events
 * Results are cached for 15 minutes to reduce API calls
 */
export async function fetchCalendarEvents(daysAhead: number = 7): Promise<CalendarEvent[]> {
  const cacheKey = getMCPCacheKey('calendar', { daysAhead });

  return cached(
    mcpDataCache,
    cacheKey,
    async () => {
      const now = new Date();
      const future = new Date();
      future.setDate(future.getDate() + daysAhead);

      const timeMin = now.toISOString();
      const timeMax = future.toISOString();

      const command = `manus-mcp-cli tool call google_calendar_search_events --server google-calendar --input '{"time_min":"${timeMin}","time_max":"${timeMax}","max_results":50}'`;

      const result = await executeMCPCommand(command);

  if (!result || !('items' in result) || !result.items) {
    logger.debug('Calendar integration returned no data', { daysAhead });
    return [];
  }

  const calendarResult = result as CalendarMCPResult;
  const events: CalendarEvent[] = (calendarResult.items || [])
    .filter((item) => item.summary && !item.summary.toLowerCase().includes('home'))
    .map((item) => ({
      id: item.id,
      title: item.summary,
      description: item.description || null,
      startTime: new Date(item.start?.dateTime || item.start?.date || Date.now()),
      endTime: new Date(item.end?.dateTime || item.end?.date || Date.now()),
      location: item.location || null,
      attendees: item.attendees?.map((a) => a.email) || [],
    }));

  return events;
    },
    15 * 60 * 1000 // 15 minute cache TTL
  );
}

/**
 * Fetch recent Limitless recordings
 */
export async function fetchLimitlessRecordings(daysBack: number = 2): Promise<LimitlessRecording[]> {
  const startTime = new Date();
  startTime.setDate(startTime.getDate() - daysBack);
  startTime.setHours(6, 0, 0, 0);

  const endTime = new Date();

  const command = `manus-mcp-cli tool call searchLifelogsWithTranscripts --server limitless --input '{"startTime":"${startTime.toISOString()}","endTime":"${endTime.toISOString()}","limit":20}'`;

  try {
    const result = await executeMCPCommand(command);

    if (!result || !('lifelogs' in result) || !result.lifelogs) {
      logger.debug('Limitless integration returned no data', { daysBack });
      return [];
    }

    const limitlessResult = result as LimitlessMCPResult;
    const recordings: LimitlessRecording[] = (limitlessResult.lifelogs || []).map((log) => ({
      id: log.id,
      startTime: new Date(log.startTime),
      endTime: new Date(log.endTime),
      transcript: log.transcript || '',
      participants: log.participants || [],
    }));

    return recordings;
  } catch (error) {
    logger.warn('Limitless integration failed, continuing without it', { error, daysBack });
    return [];
  }
}

/**
 * Extract contact information from email
 */
export function extractContactFromEmail(email: GmailMessage): { name: string; email: string; organization?: string } | null {
  const fromMatch = email.from.match(/(.*?)\s*<(.+?)>/);
  if (fromMatch) {
    const name = fromMatch[1].trim().replace(/"/g, '');
    const emailAddr = fromMatch[2].trim();

    // Try to extract organization from email domain
    const domain = emailAddr.split('@')[1];
    const organization = domain ? domain.split('.')[0] : undefined;

    return { name, email: emailAddr, organization };
  }

  return null;
}

/**
 * Calculate relationship health score based on email patterns
 * Results are cached for 1 hour
 */
export function calculateHealthScore(messages: GmailMessage[], contactEmail: string): number {
  const cacheKey = getRelationshipCacheKey(contactEmail);
  const cached = relationshipCache.get<number>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const contactMessages = messages.filter(m =>
    m.from.includes(contactEmail) || m.to.includes(contactEmail)
  );

  if (contactMessages.length === 0) {
    const score = 50;
    relationshipCache.set(cacheKey, score);
    return score;
  }

  const mostRecent = contactMessages[0];
  const daysSinceContact = Math.floor((Date.now() - mostRecent.date.getTime()) / (1000 * 60 * 60 * 24));

  // Base score
  let score = 70;

  // Recency factor
  if (daysSinceContact <= 2) score += 20;
  else if (daysSinceContact <= 7) score += 10;
  else if (daysSinceContact <= 14) score -= 10;
  else if (daysSinceContact <= 30) score -= 20;
  else score -= 30;

  // Frequency factor
  if (contactMessages.length >= 5) score += 10;
  else if (contactMessages.length >= 3) score += 5;

  // Response length factor (engagement)
  const avgLength = contactMessages.reduce((sum, m) => sum + m.content.length, 0) / contactMessages.length;
  if (avgLength > 500) score += 5;

  const finalScore = Math.max(0, Math.min(100, score));
  relationshipCache.set(cacheKey, finalScore);
  return finalScore;
}

/**
 * Determine relationship trend
 */
export function calculateTrend(messages: GmailMessage[], contactEmail: string): 'up' | 'down' | 'stable' | 'new' {
  const contactMessages = messages.filter(m =>
    m.from.includes(contactEmail) || m.to.includes(contactEmail)
  ).sort((a, b) => b.date.getTime() - a.date.getTime());

  if (contactMessages.length === 0) return 'new';
  if (contactMessages.length === 1) return 'new';

  const recent = contactMessages.slice(0, Math.ceil(contactMessages.length / 2));
  const older = contactMessages.slice(Math.ceil(contactMessages.length / 2));

  const recentAvgInterval = recent.length > 1
    ? (recent[0].date.getTime() - recent[recent.length - 1].date.getTime()) / (recent.length - 1)
    : 0;

  const olderAvgInterval = older.length > 1
    ? (older[0].date.getTime() - older[older.length - 1].date.getTime()) / (older.length - 1)
    : 0;

  if (recentAvgInterval === 0 || olderAvgInterval === 0) return 'stable';

  if (recentAvgInterval < olderAvgInterval * 0.7) return 'up';
  if (recentAvgInterval > olderAvgInterval * 1.3) return 'down';

  return 'stable';
}
