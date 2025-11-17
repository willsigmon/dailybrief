/**
 * Enhanced calendar intelligence with strategic value assessment
 */

import { invokeLLM } from '../_core/llm';
import { logger, logError } from '../_core/logger';
import type { CalendarEvent } from './mcpIntegration';
import type { InsertCalendarEvent } from '../../drizzle/schema';

export interface CalendarIntelligence {
  strategicValue: string | null;
  preparationNeeded: string | null;
  talkingPoints: string[];
  attendeeContext: Record<string, string>; // email -> context
}

/**
 * Assess strategic value of a calendar event using LLM
 */
export async function assessStrategicValue(
  event: CalendarEvent,
  relationships: Array<{ email?: string | null; organization?: string | null; healthScore: number }>
): Promise<CalendarIntelligence> {
  const prompt = `Analyze this calendar event and provide strategic intelligence:

EVENT: ${event.title}
DESCRIPTION: ${event.description || 'No description'}
ATTENDEES: ${event.attendees.join(', ')}
LOCATION: ${event.location || 'Not specified'}
TIME: ${event.startTime.toISOString()}

RELATIONSHIP CONTEXT:
${relationships.map(r => `- ${r.email || 'Unknown'}: Health score ${r.healthScore}/100`).join('\n')}

Provide:
1. STRATEGIC_VALUE: Assess the strategic importance (high/medium/low) and why
2. PREPARATION_NEEDED: What preparation is needed (research, talking points, materials)
3. TALKING_POINTS: 3-5 key talking points based on context
4. ATTENDEE_CONTEXT: Brief context about each attendee if available

Format your response as:
STRATEGIC_VALUE: [assessment]
PREPARATION_NEEDED: [preparation steps]
TALKING_POINTS:
- [point 1]
- [point 2]
- [point 3]
ATTENDEE_CONTEXT:
- [email]: [context]`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'You are a strategic business development advisor. Analyze calendar events and provide actionable intelligence for preparation.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const messageContent = response.choices[0]?.message?.content;
    if (!messageContent || typeof messageContent !== 'string') {
      return {
        strategicValue: null,
        preparationNeeded: null,
        talkingPoints: [],
        attendeeContext: {},
      };
    }

    // Parse response
    const strategicMatch = messageContent.match(/STRATEGIC_VALUE:\s*(.+?)(?:\n|$)/i);
    const prepMatch = messageContent.match(/PREPARATION_NEEDED:\s*(.+?)(?:\n|TALKING_POINTS|$)/is);
    const talkingPointsMatch = messageContent.match(/TALKING_POINTS:\s*([\s\S]*?)(?:\nATTENDEE_CONTEXT|$)/i);
    const attendeeMatch = messageContent.match(/ATTENDEE_CONTEXT:\s*([\s\S]*?)$/i);

    const talkingPoints: string[] = [];
    if (talkingPointsMatch) {
      const points = talkingPointsMatch[1].split('\n')
        .map(p => p.replace(/^[-•]\s*/, '').trim())
        .filter(p => p.length > 0);
      talkingPoints.push(...points);
    }

    const attendeeContext: Record<string, string> = {};
    if (attendeeMatch) {
      const lines = attendeeMatch[1].split('\n');
      for (const line of lines) {
        const match = line.match(/^[-•]\s*(.+?):\s*(.+)$/);
        if (match) {
          attendeeContext[match[1].trim()] = match[2].trim();
        }
      }
    }

    return {
      strategicValue: strategicMatch?.[1]?.trim() || null,
      preparationNeeded: prepMatch?.[1]?.trim() || null,
      talkingPoints,
      attendeeContext,
    };
  } catch (error) {
    logError(error, { operation: 'assessStrategicValue', eventTitle: event.title });
    return {
      strategicValue: null,
      preparationNeeded: null,
      talkingPoints: [],
      attendeeContext: {},
    };
  }
}

/**
 * Enhance calendar events with strategic intelligence
 */
export async function enhanceCalendarEvents(
  events: CalendarEvent[],
  relationships: Array<{ email?: string | null; organization?: string | null; healthScore: number }>
): Promise<Array<InsertCalendarEvent & { strategicValue?: string | null; preparationNeeded?: string | null }>> {
  const enhanced: Array<InsertCalendarEvent & { strategicValue?: string | null; preparationNeeded?: string | null }> = [];

  for (const event of events) {
    // Only assess strategic value for events in the next 48 hours
    const hoursUntil = (event.startTime.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil > 0 && hoursUntil <= 48) {
      const intelligence = await assessStrategicValue(event, relationships);

      enhanced.push({
        briefingId: 0, // Will be set by caller
        title: event.title,
        description: event.description,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        attendees: JSON.stringify(event.attendees),
        eventType: null,
        strategicValue: intelligence.strategicValue,
        preparationNeeded: intelligence.preparationNeeded,
      });
    } else {
      // For events further out, just add basic info
      enhanced.push({
        briefingId: 0,
        title: event.title,
        description: event.description,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        attendees: JSON.stringify(event.attendees),
        eventType: null,
        strategicValue: null,
        preparationNeeded: null,
      });
    }
  }

  return enhanced;
}
