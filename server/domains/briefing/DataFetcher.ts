import {
  fetchGmailMessages,
  fetchCalendarEvents,
  fetchLimitlessRecordings,
  GmailMessage,
  CalendarEvent,
  LimitlessRecording
} from '../../services/mcpIntegration';
import { logger } from '../../_core/logger';

export interface BriefingData {
  gmailMessages: GmailMessage[];
  calendarEvents: CalendarEvent[];
  limitlessRecordings: LimitlessRecording[];
}

export class DataFetcher {
  async fetchAll(daysBack = 2, daysAhead = 7): Promise<BriefingData> {
    logger.debug('Fetching data from MCP integrations');
    const startTime = Date.now();

    let gmailSuccess = true, calendarSuccess = true, limitlessSuccess = true;

    const [gmailMessages, calendarEvents, limitlessRecordings] = await Promise.all([
      fetchGmailMessages(daysBack).catch(err => {
        logger.error('Failed to fetch Gmail messages', { error: err });
        gmailSuccess = false;
        return [];
      }),
      fetchCalendarEvents(daysAhead).catch(err => {
        logger.error('Failed to fetch Calendar events', { error: err });
        calendarSuccess = false;
        return [];
      }),
      fetchLimitlessRecordings(daysBack).catch(err => {
        logger.error('Failed to fetch Limitless recordings', { error: err });
        limitlessSuccess = false;
        return [];
      }),
    ]);

    logger.info('Data fetched', {
      durationMs: Date.now() - startTime,
      gmailCount: gmailMessages.length,
      calendarCount: calendarEvents.length,
      limitlessCount: limitlessRecordings.length
    });

    return {
      gmailMessages,
      calendarEvents,
      limitlessRecordings
    };
  }
}
