import * as db from '../db';
import { briefings } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import {
  fetchGmailMessages,
  fetchCalendarEvents,
  fetchLimitlessRecordings,
  extractContactFromEmail,
  calculateHealthScore,
  calculateTrend,
} from './mcpIntegration';
import {
  generateResponseUrgencyAlerts,
  generateRelationshipCoolingAlerts,
  generateCalendarPreparationAlerts,
  generateStrategicOpportunityAlerts,
} from './alertsGenerator';
import { analyzeOpportunity } from './llmAnalysis';
import { invokeLLM } from '../_core/llm';
import { progressTracker } from './progressTracker';

/**
 * Generate executive summary using LLM
 */
async function generateExecutiveSummary(
  alertsCount: { urgent: number; important: number; strategic: number },
  topOpportunities: string[]
): Promise<string> {
  const prompt = `Generate a brief executive summary (2-3 sentences) for a daily business development briefing with the following information:

- ${alertsCount.urgent} urgent actions requiring immediate attention
- ${alertsCount.important} important actions for this week
- ${alertsCount.strategic} strategic opportunities to monitor

Top opportunities:
${topOpportunities.map((opp, i) => `${i + 1}. ${opp}`).join('\n')}

Write a concise, actionable summary that highlights the most critical items and sets the tone for the day.`;

  try {
    const response = await invokeLLM({
      messages: [{ role: 'user', content: prompt }],
    });

    const messageContent = response.choices[0]?.message?.content;
    return typeof messageContent === 'string' ? messageContent : 'Your daily briefing is ready.';
  } catch (error) {
    console.error('[Briefing] Executive summary generation failed:', error);
    return `Good morning. Today's briefing surfaces ${alertsCount.urgent} high-priority actions and ${alertsCount.strategic} strategic opportunities from your recent activity.`;
  }
}

/**
 * Main briefing generation function
 */
export async function generateDailyBriefing(sessionId?: string): Promise<number> {
  const trackingId = sessionId || `briefing-${Date.now()}`;
  
  if (sessionId) {
    progressTracker.startSession(trackingId);
  }
  
  try {
    console.log('[Briefing] Starting daily briefing generation...');

  // Step 1: Fetch data from all sources
  if (sessionId) {
    progressTracker.updateProgress(trackingId, {
      step: 'fetching',
      progress: 10,
      message: 'Fetching data from Gmail, Calendar, and Limitless...',
    });
  }
  console.log('[Briefing] Fetching data from MCP integrations...');
  const [gmailMessages, calendarEvents, limitlessRecordings] = await Promise.all([
    fetchGmailMessages(2),
    fetchCalendarEvents(7),
    fetchLimitlessRecordings(2),
  ]);

  console.log(`[Briefing] Data fetched: ${gmailMessages.length} emails, ${calendarEvents.length} events, ${limitlessRecordings.length} recordings`);
  
  if (sessionId) {
    progressTracker.updateProgress(trackingId, {
      step: 'data-fetched',
      progress: 30,
      message: `Fetched ${gmailMessages.length} emails, ${calendarEvents.length} events, ${limitlessRecordings.length} recordings`,
    });
  }

  // Step 2: Create briefing record
  const briefingDate = new Date();
  briefingDate.setHours(6, 0, 0, 0); // 6 AM today

  const briefingResult = await db.createBriefing({
    date: briefingDate,
    executiveSummary: 'Generating...', // Will update later
  });

  const briefingId = briefingResult.insertId;
  
  if (!briefingId || isNaN(briefingId)) {
    throw new Error(`Failed to create briefing: invalid ID ${briefingId}`);
  }
  
  console.log(`[Briefing] Created briefing record: ${briefingId}`);

  // Step 3: Generate alerts
  if (sessionId) {
    progressTracker.updateProgress(trackingId, {
      step: 'generating-alerts',
      progress: 40,
      message: 'Generating smart alerts and detecting patterns...',
    });
  }
  console.log('[Briefing] Generating smart alerts...');
  const allAlerts = [
    ...generateResponseUrgencyAlerts(gmailMessages as any[], briefingId),
    ...generateRelationshipCoolingAlerts(gmailMessages as any[], briefingId),
    ...generateCalendarPreparationAlerts(calendarEvents as any[], briefingId),
    ...generateStrategicOpportunityAlerts(gmailMessages as any[], calendarEvents as any[], briefingId),
  ];

  // Insert alerts
  for (const alert of allAlerts) {
    await db.createAlert(alert);
  }

  console.log(`[Briefing] Generated ${allAlerts.length} alerts`);
  
  if (sessionId) {
    progressTracker.updateProgress(trackingId, {
      step: 'alerts-generated',
      progress: 50,
      message: `Generated ${allAlerts.length} smart alerts`,
    });
  }

  // Step 4: Process relationships
  if (sessionId) {
    progressTracker.updateProgress(trackingId, {
      step: 'processing-relationships',
      progress: 60,
      message: 'Analyzing relationship health and engagement trends...',
    });
  }
  console.log('[Briefing] Processing relationships...');
  const contactMap = new Map<string, any>();

  for (const msg of gmailMessages) {
    const contact = extractContactFromEmail(msg as any);
    if (!contact || contact.email.includes('noreply')) continue;

    if (!contactMap.has(contact.email)) {
      const healthScore = calculateHealthScore(gmailMessages as any[], contact.email);
      const trend = calculateTrend(gmailMessages as any[], contact.email);

      contactMap.set(contact.email, {
        contactName: contact.name,
        organization: contact.organization,
        email: contact.email,
        healthScore,
        trend,
        lastInteraction: msg.date,
        lastInteractionType: 'email',
      });
    }
  }

  // Insert/update relationships
  const relationshipsArray = Array.from(contactMap.values());
  for (const relationship of relationshipsArray) {
    await db.createOrUpdateRelationship(relationship);
  }

  console.log(`[Briefing] Processed ${contactMap.size} relationships`);

  // Step 5: Store calendar events
  console.log('[Briefing] Storing calendar events...');
  for (const event of calendarEvents) {
    await db.createCalendarEvent({
      briefingId,
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

  // Step 6: Run multi-LLM analysis on top opportunities
  console.log('[Briefing] Running multi-LLM analysis...');
  const strategicAlerts = allAlerts.filter(a => a.type === 'strategic').slice(0, 2);

  for (const alert of strategicAlerts) {
    const context = `
Organization: ${alert.organization || 'Unknown'}
Contact: ${alert.contactName}
Description: ${alert.description}
Action Required: ${alert.actionRequired}
    `.trim();

    try {
      const analysis = await analyzeOpportunity(alert.title, context);

      await db.createLlmAnalysis({
        briefingId,
        topic: alert.title,
        claudeAnalysis: analysis.claude,
        geminiAnalysis: analysis.gemini,
        grokAnalysis: analysis.grok,
        perplexityAnalysis: analysis.perplexity,
        consensus: analysis.consensus,
        dissent: analysis.dissent,
        recommendation: analysis.recommendation,
      });

      console.log(`[Briefing] Completed LLM analysis for: ${alert.title}`);
    } catch (error) {
      console.error(`[Briefing] LLM analysis failed for ${alert.title}:`, error);
    }
  }

  // Step 7: Generate executive summary
  if (sessionId) {
    progressTracker.updateProgress(trackingId, {
      step: 'generating-summary',
      progress: 90,
      message: 'Generating executive summary...',
    });
  }
  console.log('[Briefing] Generating executive summary...');
  const urgentCount = allAlerts.filter(a => a.type === 'urgent').length;
  const importantCount = allAlerts.filter(a => a.type === 'important').length;
  const strategicCount = allAlerts.filter(a => a.type === 'strategic').length;

  const topOpportunities = allAlerts
    .filter(a => a.type === 'strategic')
    .slice(0, 3)
    .map(a => a.title);

  let executiveSummary: string;
  try {
    executiveSummary = await generateExecutiveSummary(
      { urgent: urgentCount, important: importantCount, strategic: strategicCount },
      topOpportunities
    );
  } catch (error) {
    console.error('[Briefing] Executive summary generation failed:', error);
    // Fallback summary
    executiveSummary = `Today's briefing includes ${urgentCount} urgent action${urgentCount !== 1 ? 's' : ''}, ${importantCount} important item${importantCount !== 1 ? 's' : ''}, and ${strategicCount} strategic opportunit${strategicCount !== 1 ? 'ies' : 'y'}. ${topOpportunities.length > 0 ? `Key opportunities: ${topOpportunities.join(', ')}.` : ''}`;
  }

  // Update briefing with executive summary
  try {
    const dbInstance = await db.getDb();
    if (dbInstance) {
      await dbInstance.update(briefings)
        .set({ executiveSummary, updatedAt: new Date() })
        .where(eq(briefings.id, briefingId));
      console.log('[Briefing] Executive summary updated successfully');
    }
  } catch (error) {
    console.error('[Briefing] Failed to update executive summary:', error);
    throw new Error('Failed to save executive summary');
  }

    console.log('[Briefing] Daily briefing generation complete!');
    
    if (sessionId) {
      progressTracker.completeSession(trackingId, true, 'Briefing generated successfully!');
    }
    
    return briefingId;
  } catch (error) {
    console.error('[Briefing] Generation failed:', error);
    
    if (sessionId) {
      progressTracker.completeSession(
        trackingId,
        false,
        `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
    
    throw error;
  }
}
