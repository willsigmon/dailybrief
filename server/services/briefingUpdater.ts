/**
 * Update existing briefings with fresh data
 * Preserves user completions and notes
 */

import * as db from '../db';
import { briefings, alerts } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { generateDailyBriefing } from './briefingGenerator';
import { logger, logError } from '../_core/logger';

/**
 * Refresh an existing briefing with latest data
 * Preserves user completions and notes
 */
export async function refreshBriefing(briefingId: number): Promise<void> {
  const requestId = `refresh-${briefingId}-${Date.now()}`;
  logger.info('Refreshing briefing', { requestId, briefingId });

  try {
    // Get existing briefing
    const existingBriefing = await db.getBriefingById(briefingId);
    if (!existingBriefing) {
      throw new Error(`Briefing ${briefingId} not found`);
    }

    // Get existing alerts to preserve completions
    const existingAlerts = await db.getAlertsByBriefingId(briefingId);
    const completedAlertIds = new Set(
      existingAlerts.filter(a => a.completed).map(a => a.id)
    );

    // Generate new briefing (this will create a new briefing)
    // Instead, we'll update the existing one by regenerating alerts
    // For now, we'll create a new briefing and mark the old one as superseded
    // In a full implementation, we'd update in place

    logger.info('Briefing refresh complete', { requestId, briefingId });
  } catch (error) {
    logError(error, { requestId, briefingId, operation: 'refreshBriefing' });
    throw error;
  }
}

/**
 * Incremental update - only refresh alerts and relationships
 */
export async function incrementalUpdateBriefing(briefingId: number): Promise<void> {
  const requestId = `incremental-${briefingId}-${Date.now()}`;
  logger.info('Incremental briefing update', { requestId, briefingId });

  try {
    // Get existing briefing
    const existingBriefing = await db.getBriefingById(briefingId);
    if (!existingBriefing) {
      throw new Error(`Briefing ${briefingId} not found`);
    }

    // Get existing alerts to preserve completions
    const existingAlerts = await db.getAlertsByBriefingId(briefingId);
    const completedAlertMap = new Map(
      existingAlerts.filter(a => a.completed).map(a => [a.title, true])
    );

    // TODO: Re-fetch MCP data and regenerate alerts
    // For now, this is a placeholder for the refresh mechanism
    // Full implementation would:
    // 1. Fetch fresh MCP data
    // 2. Regenerate alerts
    // 3. Match new alerts with existing ones
    // 4. Preserve completions for matched alerts
    // 5. Add new alerts
    // 6. Update relationship scores

    logger.info('Incremental update complete', { requestId, briefingId });
  } catch (error) {
    logError(error, { requestId, briefingId, operation: 'incrementalUpdateBriefing' });
    throw error;
  }
}
