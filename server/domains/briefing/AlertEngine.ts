import {
  generateResponseUrgencyAlerts,
  generateRelationshipCoolingAlerts,
  generateCalendarPreparationAlerts,
  generateStrategicOpportunityAlerts,
  deduplicateAlerts
} from '../../services/alertsGenerator';
import { GmailMessage, CalendarEvent, LimitlessRecording } from '../../services/mcpIntegration';
import { InsertAlert } from '../../../drizzle/schema';
import { extractCommitmentsFromRecordings, filterUpcomingCommitments } from '../../services/commitmentExtractor';
import { logger } from '../../_core/logger';

export class AlertEngine {
  async generateAlerts(
    briefingId: number,
    data: {
      gmailMessages: GmailMessage[];
      calendarEvents: CalendarEvent[];
      limitlessRecordings: LimitlessRecording[];
    }
  ): Promise<Omit<InsertAlert, 'id' | 'createdAt'>[]> {
    const { gmailMessages, calendarEvents, limitlessRecordings } = data;

    // 1. Generate Standard Alerts
    const standardAlerts = [
      ...generateResponseUrgencyAlerts(gmailMessages, briefingId),
      ...generateRelationshipCoolingAlerts(gmailMessages, briefingId),
      ...generateCalendarPreparationAlerts(calendarEvents, briefingId),
      ...generateStrategicOpportunityAlerts(gmailMessages, calendarEvents, briefingId),
    ];

    // 2. Generate Commitment Alerts (from Limitless recordings)
    let commitmentAlerts: Omit<InsertAlert, 'id' | 'createdAt'>[] = [];
    try {
        // Assuming extractCommitmentsFromRecordings is properly implemented and imported
        const commitments = await extractCommitmentsFromRecordings(limitlessRecordings);
        const upcomingCommitments = filterUpcomingCommitments(commitments, 7);

        commitmentAlerts = upcomingCommitments.map(commitment => ({
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
    } catch (error) {
        logger.warn('Commitment extraction failed', { error });
    }

    const allAlerts = [...standardAlerts, ...commitmentAlerts];
    return deduplicateAlerts(allAlerts);
  }
}
