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
  deduplicateAlerts,
} from './alertsGenerator';
import { analyzeOpportunity } from './llmAnalysis';
import { invokeLLM } from '../_core/llm';
import { progressTracker } from './progressTracker';
import { logger, logPerformance, logError } from '../_core/logger';
import { trackBriefingGeneration, trackLLMCall, trackMCPCall, trackDatabaseOperation } from '../_core/metrics';

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
    logError(error, { operation: 'generateExecutiveSummary', alertsCount });
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

  const startTime = Date.now();
  const requestId = sessionId || `briefing-${Date.now()}`;

  try {
    logger.info('Starting daily briefing generation', { requestId, sessionId });

  // Step 1: Fetch data from all sources
  if (sessionId) {
    progressTracker.updateProgress(trackingId, {
      step: 'fetching',
      progress: 10,
      message: 'Fetching data from Gmail, Calendar, and Limitless...',
    });
  }
  logger.debug('Fetching data from MCP integrations', { requestId });
  const fetchStartTime = Date.now();

  let gmailSuccess = true, calendarSuccess = true, limitlessSuccess = true;

  const [gmailMessages, calendarEvents, limitlessRecordings] = await Promise.all([
    fetchGmailMessages(2).catch(() => { gmailSuccess = false; return []; }),
    fetchCalendarEvents(7).catch(() => { calendarSuccess = false; return []; }),
    fetchLimitlessRecordings(2).catch(() => { limitlessSuccess = false; return []; }),
  ]);

  trackMCPCall('gmail', gmailSuccess);
  trackMCPCall('calendar', calendarSuccess);
  trackMCPCall('limitless', limitlessSuccess);

  logPerformance('fetchMCPData', Date.now() - fetchStartTime, {
    requestId,
    gmailCount: gmailMessages.length,
    calendarCount: calendarEvents.length,
    limitlessCount: limitlessRecordings.length,
  });

  logger.info('Data fetched from MCP integrations', {
    requestId,
    gmailMessages: gmailMessages.length,
    calendarEvents: calendarEvents.length,
    limitlessRecordings: limitlessRecordings.length,
  });

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

  logger.info('Created briefing record', { requestId, briefingId });

  // Step 3: Generate alerts
  if (sessionId) {
    progressTracker.updateProgress(trackingId, {
      step: 'generating-alerts',
      progress: 40,
      message: 'Generating smart alerts and detecting patterns...',
    });
  }
  logger.debug('Generating smart alerts', { requestId, briefingId });
  const alertsStartTime = Date.now();

  // Extract commitments from Limitless recordings
  const commitments = await extractCommitmentsFromRecordings(limitlessRecordings);
  const upcomingCommitments = filterUpcomingCommitments(commitments, 7);

  // Generate commitment alerts
  const commitmentAlerts = upcomingCommitments.map(commitment => ({
    briefingId,
    type: 'important' as const,
    category: 'commitment_tracking',
    title: `Commitment: ${commitment.action}`,
    description: commitment.context || `Action item from conversation`,
    contactName: commitment.responsibleParty || null,
    organization: null,
    actionRequired: commitment.action,
    deadline: commitment.deadline,
    completed: false,
    completedAt: null,
  }));

  // Generate standard alerts
  const standardAlerts = [
    ...generateResponseUrgencyAlerts(gmailMessages, briefingId),
    ...generateRelationshipCoolingAlerts(gmailMessages, briefingId),
    ...generateCalendarPreparationAlerts(calendarEvents, briefingId),
    ...generateStrategicOpportunityAlerts(gmailMessages, calendarEvents, briefingId),
  ];

  // Score and sort strategic opportunities
  const relationshipHealthMap = new Map<string, number>();
  for (const msg of gmailMessages) {
    const contact = extractContactFromEmail(msg);
    if (contact && !relationshipHealthMap.has(contact.email)) {
      relationshipHealthMap.set(contact.email, calculateHealthScore(gmailMessages, contact.email));
    }
  }

  const strategicAlertsList = standardAlerts.filter(a => a.type === 'strategic');
  const scoredStrategicAlerts = sortAlertsByScore(
    strategicAlertsList,
    relationshipHealthMap,
    gmailMessages,
    calendarEvents
  );

  // Replace strategic alerts with scored versions
  const allAlerts = [
    ...standardAlerts.filter(a => a.type !== 'strategic'),
    ...scoredStrategicAlerts.map(({ opportunityScore, ...alert }) => alert),
    ...commitmentAlerts,
  ];

  // Deduplicate alerts to remove similar/duplicate entries
  const deduplicatedAlerts = deduplicateAlerts(allAlerts);
  logger.debug('Alert deduplication complete', {
    requestId,
    originalCount: allAlerts.length,
    deduplicatedCount: deduplicatedAlerts.length,
    removed: allAlerts.length - deduplicatedAlerts.length,
  });

  // Insert alerts in batch for better performance
  if (deduplicatedAlerts.length > 0) {
    await db.createAlertsBatch(deduplicatedAlerts);
  }
  logPerformance('generateAlerts', Date.now() - alertsStartTime, {
    requestId,
    alertCount: deduplicatedAlerts.length,
  });

  logger.info('Generated smart alerts', {
    requestId,
    briefingId,
    alertCount: deduplicatedAlerts.length,
    urgent: deduplicatedAlerts.filter(a => a.type === 'urgent').length,
    important: deduplicatedAlerts.filter(a => a.type === 'important').length,
    strategic: deduplicatedAlerts.filter(a => a.type === 'strategic').length,
  });

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
  logger.debug('Processing relationships', { requestId, briefingId });
  const relationshipsStartTime = Date.now();
  interface RelationshipData {
    contactName: string;
    organization?: string;
    email: string;
    healthScore: number;
    trend: 'up' | 'down' | 'stable' | 'new';
    lastInteraction: Date;
    lastInteractionType: string;
  }
  const contactMap = new Map<string, RelationshipData>();

  for (const msg of gmailMessages) {
    const contact = extractContactFromEmail(msg);
    if (!contact || contact.email.includes('noreply')) continue;

    if (!contactMap.has(contact.email)) {
      const healthScore = calculateHealthScore(gmailMessages, contact.email);
      const trend = calculateTrend(gmailMessages, contact.email);

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

  // Insert/update relationships in batch for better performance
  const relationshipsArray = Array.from(contactMap.values());
  if (relationshipsArray.length > 0) {
    await db.createOrUpdateRelationshipsBatch(relationshipsArray);
  }
  logPerformance('processRelationships', Date.now() - relationshipsStartTime, {
    requestId,
    relationshipCount: contactMap.size,
  });

  logger.info('Processed relationships', {
    requestId,
    briefingId,
    relationshipCount: contactMap.size,
  });

  // Step 5: Store calendar events with enhanced intelligence
  logger.debug('Storing calendar events with strategic intelligence', { requestId, briefingId });
  if (calendarEvents.length > 0) {
    // Get relationships for context
    const relationshipsForContext = relationshipsArray.map(r => ({
      email: r.email,
      organization: r.organization,
      healthScore: r.healthScore,
    }));

    // Enhance events with strategic intelligence
    const enhancedEvents = await enhanceCalendarEvents(calendarEvents, relationshipsForContext);

    // Set briefingId for all events
    const calendarEventsData = enhancedEvents.map(event => ({
      ...event,
      briefingId,
    }));

    await db.createCalendarEventsBatch(calendarEventsData);
  }

  // Step 6: Run pattern recognition and connection analysis
  logger.debug('Running pattern recognition and connection analysis', { requestId, briefingId });
  const patternStartTime = Date.now();

  // Analyze email activity patterns
  const emailActivity = analyzeEmailActivity(gmailMessages);
  logger.debug('Email activity analysis complete', {
    requestId,
    totalEmails: emailActivity.totalEmails,
    responseTrend: emailActivity.responseTimeTrend,
  });

  // Cluster topics
  const topicClusters = clusterTopics(gmailMessages);
  logger.debug('Topic clustering complete', {
    requestId,
    topicCount: topicClusters.length,
  });

  // Find hidden connections
  const connections = findAllConnections(gmailMessages);
  logger.debug('Connection analysis complete', {
    requestId,
    connectionCount: connections.length,
  });

  logPerformance('patternRecognition', Date.now() - patternStartTime, {
    requestId,
    connectionsFound: connections.length,
    topicsClustered: topicClusters.length,
  });

  // Step 7: Run multi-LLM analysis on top opportunities
  logger.debug('Running multi-LLM analysis', { requestId, briefingId });
  const strategicAlerts = deduplicatedAlerts.filter(a => a.type === 'strategic').slice(0, 2);
  const llmAnalysisStartTime = Date.now();

  for (const alert of strategicAlerts) {
    const context = `
Organization: ${alert.organization || 'Unknown'}
Contact: ${alert.contactName}
Description: ${alert.description}
Action Required: ${alert.actionRequired}
    `.trim();

    try {
      const analysisStartTime = Date.now();
      const analysis = await analyzeOpportunity(alert.title, context);
      logPerformance('analyzeOpportunity', Date.now() - analysisStartTime, {
        requestId,
        topic: alert.title,
      });

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

      logger.debug('LLM analysis stored with confidence scores', {
        requestId,
        briefingId,
        topic: alert.title,
        confidenceScore: analysis.confidenceScore,
        modelAgreement: analysis.modelAgreement,
      });

      logger.info('Completed LLM analysis', { requestId, briefingId, topic: alert.title });
    } catch (error) {
      logError(error, { requestId, briefingId, operation: 'analyzeOpportunity', topic: alert.title });
    }
  }
  logPerformance('multiLLMAnalysis', Date.now() - llmAnalysisStartTime, {
    requestId,
    analysisCount: strategicAlerts.length,
  });

  // Step 7: Generate executive summary
  if (sessionId) {
    progressTracker.updateProgress(trackingId, {
      step: 'generating-summary',
      progress: 90,
      message: 'Generating executive summary...',
    });
  }
  logger.debug('Generating executive summary', { requestId, briefingId });
  const summaryStartTime = Date.now();
  const urgentCount = deduplicatedAlerts.filter(a => a.type === 'urgent').length;
  const importantCount = deduplicatedAlerts.filter(a => a.type === 'important').length;
  const strategicCount = deduplicatedAlerts.filter(a => a.type === 'strategic').length;

  const topOpportunities = deduplicatedAlerts
    .filter(a => a.type === 'strategic')
    .slice(0, 3)
    .map(a => a.title);

  // Generate email activity summary
  const emailActivitySummary = generateEmailActivitySummary(gmailMessages);

  let executiveSummary: string;
  try {
    const summaryPrompt = `Generate a brief executive summary (2-3 sentences) for a daily business development briefing:

ALERTS:
- ${urgentCount} urgent actions requiring immediate attention
- ${importantCount} important actions for this week
- ${strategicCount} strategic opportunities to monitor

TOP OPPORTUNITIES:
${topOpportunities.map((opp, i) => `${i + 1}. ${opp}`).join('\n')}

EMAIL ACTIVITY:
${emailActivitySummary.summary}

Write a concise, actionable summary that highlights the most critical items and sets the tone for the day.`;

    const response = await invokeLLM({
      messages: [{ role: 'user', content: summaryPrompt }],
    });

    const messageContent = response.choices[0]?.message?.content;
    executiveSummary = typeof messageContent === 'string' ? messageContent : 'Your daily briefing is ready.';
  } catch (error) {
    logError(error, { requestId, briefingId, operation: 'generateExecutiveSummary' });
    // Fallback summary with email activity
    executiveSummary = `Today's briefing includes ${urgentCount} urgent action${urgentCount !== 1 ? 's' : ''}, ${importantCount} important item${importantCount !== 1 ? 's' : ''}, and ${strategicCount} strategic opportunit${strategicCount !== 1 ? 'ies' : 'y'}. ${topOpportunities.length > 0 ? `Key opportunities: ${topOpportunities.join(', ')}.` : ''} ${emailActivitySummary.summary}`;
  }
  logPerformance('generateExecutiveSummary', Date.now() - summaryStartTime, { requestId });

  // Update briefing with executive summary
  try {
    const dbInstance = await db.getDb();
    if (dbInstance) {
      await dbInstance.update(briefings)
        .set({ executiveSummary, updatedAt: new Date() })
        .where(eq(briefings.id, briefingId));
      logger.debug('Executive summary updated', { requestId, briefingId });
    }
  } catch (error) {
    logError(error, { requestId, briefingId, operation: 'updateExecutiveSummary' });
    throw new Error('Failed to save executive summary');
  }

    const totalDuration = Date.now() - startTime;
    trackBriefingGeneration(true, totalDuration);

    logPerformance('generateDailyBriefing', totalDuration, {
      requestId,
      briefingId,
      alertCount: deduplicatedAlerts.length,
      relationshipCount: contactMap.size,
    });
    logger.info('Daily briefing generation complete', {
      requestId,
      briefingId,
      durationMs: totalDuration,
    });

    if (sessionId) {
      progressTracker.completeSession(trackingId, true, 'Briefing generated successfully!');
    }

    return briefingId;
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    trackBriefingGeneration(false, totalDuration);

    logError(error, {
      requestId,
      operation: 'generateDailyBriefing',
      durationMs: totalDuration,
    });

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
