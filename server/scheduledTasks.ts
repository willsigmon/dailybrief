import { generateDailyBriefing } from './services/briefingGenerator';
import { retryWithBackoff, isRetryableError } from './_core/retry';
import { logger, logError } from './_core/logger';

interface TaskExecutionResult {
  success: boolean;
  briefingId?: number;
  error?: Error;
  retries?: number;
}

/**
 * Scheduled task: Generate daily briefing at 8 AM on weekdays
 * This function is called by the cron scheduler
 * Includes error recovery with retry logic
 */
export async function runDailyBriefingTask(): Promise<TaskExecutionResult> {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

  // Only run on weekdays (Monday-Friday)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    logger.debug('Skipping briefing generation on weekend', { dayOfWeek });
    return { success: true };
  }

  logger.info('Starting scheduled daily briefing generation', { dayOfWeek, timestamp: now.toISOString() });

  let retryCount = 0;

  try {
    const briefingId = await retryWithBackoff(
      async () => {
        retryCount++;
        return await generateDailyBriefing();
      },
      {
        maxRetries: 2, // Retry up to 2 times for scheduled tasks
        initialDelayMs: 5000, // 5 second delay between retries
        maxDelayMs: 30000,
        retryableErrors: (error) => {
          // Retry on transient errors
          if (error instanceof Error) {
            return (
              isRetryableError(error) ||
              error.message.includes('timeout') ||
              error.message.includes('network') ||
              error.message.includes('ECONNREFUSED')
            );
          }
          return false;
        },
      }
    );

    logger.info('Daily briefing generated successfully', {
      briefingId,
      retries: retryCount - 1,
    });
    return { success: true, briefingId, retries: retryCount - 1 };
  } catch (error) {
    logError(error, {
      operation: 'runDailyBriefingTask',
      retries: retryCount - 1,
    });

    // TODO: Add notification system (email/logging service) for critical failures
    // This would notify administrators of persistent failures

    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      retries: retryCount - 1,
    };
  }
}
