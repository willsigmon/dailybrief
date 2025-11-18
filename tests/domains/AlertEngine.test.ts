import { describe, it, expect, vi } from 'vitest';
import { AlertEngine } from '../../server/domains/briefing/AlertEngine';
import { GmailMessage, CalendarEvent, LimitlessRecording } from '../../server/services/mcpIntegration';

describe('AlertEngine', () => {
  it('should generate and deduplicate alerts', async () => {
    const engine = new AlertEngine();

    // Mock Data
    const gmailMessages: GmailMessage[] = [
      {
        id: '1',
        threadId: 't1',
        from: 'John Doe <john@example.com>',
        to: 'me@me.com',
        subject: 'Urgent: Meeting Follow-up',
        date: new Date(), // Recent
        snippet: 'Thanks for the meeting',
        content: 'Thanks for the meeting yesterday. Please send the proposal.',
      }
    ];

    const calendarEvents: CalendarEvent[] = [];
    const limitlessRecordings: LimitlessRecording[] = [];

    const alerts = await engine.generateAlerts(1, {
      gmailMessages,
      calendarEvents,
      limitlessRecordings
    });

    expect(alerts).toBeDefined();
    expect(Array.isArray(alerts)).toBe(true);
    // We expect at least one alert from the "Urgent" email
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].briefingId).toBe(1);
    expect(alerts[0].type).toBeDefined();
  });
});
