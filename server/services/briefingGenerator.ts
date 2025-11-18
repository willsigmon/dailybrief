import { DataFetcher } from '../domains/briefing/DataFetcher';
import { AlertEngine } from '../domains/briefing/AlertEngine';
import { RelationshipManager } from '../domains/briefing/RelationshipManager';
import { InsightGenerator } from '../domains/briefing/InsightGenerator';
import { briefingRepository } from '../repositories/briefing.repo';
import { alertRepository } from '../repositories/alert.repo';
import { relationshipRepository } from '../repositories/relationship.repo';
import { calendarRepository } from '../repositories/calendar.repo';
import { llmAnalysisRepository } from '../repositories/llm.repo';
import { progressTracker } from './progressTracker';
import { logger, logPerformance, logError } from '../_core/logger';
import { trackBriefingGeneration } from '../_core/metrics';
import { enhanceCalendarEvents } from './calendarIntelligence';
import { analyzeEmailActivity, clusterTopics } from './patternRecognition';
import { findAllConnections } from './connectionFinder';

/**
 * Main briefing generation orchestrator
 */
export async function generateDailyBriefing(sessionId?: string): Promise<number> {
  const trackingId = sessionId || `briefing-${Date.now()}`;
  const requestId = trackingId;

  if (sessionId) {
    progressTracker.startSession(trackingId);
  }

  const startTime = Date.now();
  logger.info('Starting daily briefing generation', { requestId, sessionId });

  try {
    // --- Step 1: Data Fetching ---
    if (sessionId) {
      progressTracker.updateProgress(trackingId, {
        step: 'fetching',
        progress: 10,
        message: 'Fetching data from Gmail, Calendar, and Limitless...',
      });
    }

    const dataFetcher = new DataFetcher();
    const data = await dataFetcher.fetchAll();

    if (sessionId) {
      progressTracker.updateProgress(trackingId, {
        step: 'data-fetched',
        progress: 30,
        message: `Fetched ${data.gmailMessages.length} emails, ${data.calendarEvents.length} events, ${data.limitlessRecordings.length} recordings`,
      });
    }

    // --- Step 2: Create Briefing Record ---
    const briefingDate = new Date();
    briefingDate.setHours(6, 0, 0, 0);

    const { insertId: briefingId } = await briefingRepository.create({
      date: briefingDate,
      executiveSummary: 'Generating...',
    });

    logger.info('Created briefing record', { requestId, briefingId });

    // --- Step 3: Alert Generation ---
    if (sessionId) {
      progressTracker.updateProgress(trackingId, {
        step: 'generating-alerts',
        progress: 40,
        message: 'Generating smart alerts and detecting patterns...',
      });
    }

    const alertEngine = new AlertEngine();
    const alerts = await alertEngine.generateAlerts(briefingId, data);

    await alertRepository.createBatch(alerts); // Type mismatch potential here if I didn't export InsertAlert correctly in repo but I think I did

    logger.info('Generated smart alerts', {
      requestId,
      briefingId,
      alertCount: alerts.length
    });

    if (sessionId) {
      progressTracker.updateProgress(trackingId, {
        step: 'alerts-generated',
        progress: 50,
        message: `Generated ${alerts.length} smart alerts`,
      });
    }

    // --- Step 4: Relationship Processing ---
    if (sessionId) {
      progressTracker.updateProgress(trackingId, {
        step: 'processing-relationships',
        progress: 60,
        message: 'Analyzing relationship health and engagement trends...',
      });
    }

    const relationshipManager = new RelationshipManager();
    const relationships = relationshipManager.processRelationships(data.gmailMessages);

    await relationshipRepository.createOrUpdateBatch(relationships);

    logger.info('Processed relationships', {
      requestId,
      briefingId,
      relationshipCount: relationships.length,
    });

    // --- Step 5: Calendar Intelligence ---
    if (data.calendarEvents.length > 0) {
      const relationshipsForContext = relationships.map(r => ({
        email: r.email,
        organization: r.organization,
        healthScore: r.healthScore || 50,
      }));

      const enhancedEvents = await enhanceCalendarEvents(data.calendarEvents, relationshipsForContext);

      const eventsToSave = enhancedEvents.map(event => ({
        ...event,
        briefingId,
      }));

      await calendarRepository.createBatch(eventsToSave);
    }

    // --- Step 6: Pattern Recognition ---
    const patternStartTime = Date.now();
    const emailActivity = analyzeEmailActivity(data.gmailMessages);
    const topicClusters = clusterTopics(data.gmailMessages);
    const connections = findAllConnections(data.gmailMessages);

    logPerformance('patternRecognition', Date.now() - patternStartTime, {
      requestId,
      connectionsFound: connections.length,
      topicsClustered: topicClusters.length,
    });

    // --- Step 7: Insight Generation (LLM) ---
    if (sessionId) {
      progressTracker.updateProgress(trackingId, {
        step: 'generating-summary',
        progress: 80,
        message: 'Running AI analysis and generating summary...',
      });
    }

    const insightGenerator = new InsightGenerator();
    const analyses = await insightGenerator.analyzeOpportunities(briefingId, alerts);

    // Store analyses
    for (const analysis of analyses) {
        await llmAnalysisRepository.create(analysis);
    }

    // Generate Executive Summary
    const executiveSummary = await insightGenerator.generateExecutiveSummary(alerts);

    // Update Briefing
    await briefingRepository.updateExecutiveSummary(briefingId, executiveSummary);

    const totalDuration = Date.now() - startTime;
    trackBriefingGeneration(true, totalDuration);

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
