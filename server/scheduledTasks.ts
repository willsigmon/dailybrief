import { generateDailyBriefing } from './services/briefingGenerator';

/**
 * Scheduled task: Generate daily briefing at 8 AM on weekdays
 * This function is called by the cron scheduler
 */
export async function runDailyBriefingTask() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

  // Only run on weekdays (Monday-Friday)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    console.log('[Scheduler] Skipping briefing generation on weekend');
    return;
  }

  console.log('[Scheduler] Starting scheduled daily briefing generation...');
  
  try {
    const briefingId = await generateDailyBriefing();
    console.log(`[Scheduler] Daily briefing generated successfully: ${briefingId}`);
  } catch (error) {
    console.error('[Scheduler] Failed to generate daily briefing:', error);
  }
}
