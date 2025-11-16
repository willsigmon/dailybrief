import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: Date;
  snippet: string;
  content: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  location: string | null;
  attendees: string[];
}

interface LimitlessRecording {
  id: string;
  startTime: Date;
  endTime: Date;
  transcript: string;
  participants: string[];
}

/**
 * Execute MCP CLI command and parse JSON result
 */
async function executeMCPCommand(command: string): Promise<any> {
  try {
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('results was saved')) {
      console.error('[MCP] Error:', stderr);
    }

    // Extract file path from output
    const filePathMatch = stdout.match(/\/tmp\/manus-mcp\/mcp_result_[a-f0-9]+\.json/);
    if (filePathMatch) {
      const fs = await import('fs/promises');
      const fileContent = await fs.readFile(filePathMatch[0], 'utf-8');
      return JSON.parse(fileContent);
    }

    return null;
  } catch (error) {
    console.error('[MCP] Command execution failed:', error);
    return null; // Return null instead of throwing to allow graceful degradation
  }
}

/**
 * Fetch recent Gmail messages from HTI email
 */
export async function fetchGmailMessages(daysBack: number = 2): Promise<GmailMessage[]> {
  const afterDate = new Date();
  afterDate.setDate(afterDate.getDate() - daysBack);
  const afterTimestamp = Math.floor(afterDate.getTime() / 1000);

  const command = `manus-mcp-cli tool call gmail_search_messages --server gmail --input '{"q":"after:${afterTimestamp}"}'`;
  
  const result = await executeMCPCommand(command);
  
  if (!result || !result.result?.threads) {
    console.warn('[MCP] Gmail integration returned no data');
    return [];
  }

  const messages: GmailMessage[] = [];
  
  for (const thread of result.result.threads) {
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
}

/**
 * Fetch upcoming calendar events
 */
export async function fetchCalendarEvents(daysAhead: number = 7): Promise<CalendarEvent[]> {
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + daysAhead);

  const timeMin = now.toISOString();
  const timeMax = future.toISOString();

  const command = `manus-mcp-cli tool call google_calendar_search_events --server google-calendar --input '{"time_min":"${timeMin}","time_max":"${timeMax}","max_results":50}'`;
  
  const result = await executeMCPCommand(command);
  
  if (!result || !result.items) {
    console.warn('[MCP] Calendar integration returned no data');
    return [];
  }

  const events: CalendarEvent[] = result.items
    .filter((item: any) => item.summary && !item.summary.toLowerCase().includes('home'))
    .map((item: any) => ({
      id: item.id,
      title: item.summary,
      description: item.description || null,
      startTime: new Date(item.start?.dateTime || item.start?.date),
      endTime: new Date(item.end?.dateTime || item.end?.date),
      location: item.location || null,
      attendees: item.attendees?.map((a: any) => a.email) || [],
    }));

  return events;
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
    
    if (!result || !result.lifelogs) {
      console.warn('[MCP] Limitless integration returned no data');
      return [];
    }

    const recordings: LimitlessRecording[] = result.lifelogs.map((log: any) => ({
      id: log.id,
      startTime: new Date(log.startTime),
      endTime: new Date(log.endTime),
      transcript: log.transcript || '',
      participants: log.participants || [],
    }));

    return recordings;
  } catch (error) {
    console.warn('[MCP] Limitless integration failed, continuing without it:', error);
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
 */
export function calculateHealthScore(messages: GmailMessage[], contactEmail: string): number {
  const contactMessages = messages.filter(m => 
    m.from.includes(contactEmail) || m.to.includes(contactEmail)
  );

  if (contactMessages.length === 0) return 50;

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

  return Math.max(0, Math.min(100, score));
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
