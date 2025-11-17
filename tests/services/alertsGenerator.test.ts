/**
 * Unit tests for alert generation functions
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateResponseUrgencyAlerts,
  generateRelationshipCoolingAlerts,
  generateCalendarPreparationAlerts,
  generateStrategicOpportunityAlerts,
} from '../../server/services/alertsGenerator';
import type { GmailMessage, CalendarEvent } from '../../server/services/mcpIntegration';
import { createGmailMessageFixture, createCalendarEventFixture } from '../setup';

describe('Alert Generation', () => {
  describe('generateResponseUrgencyAlerts', () => {
    it('should generate alert for recent meeting email', () => {
      const now = new Date();
      const recentDate = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago

      const messages: GmailMessage[] = [
        createGmailMessageFixture({
          date: recentDate,
          subject: 'Thank you for the meeting',
          content: 'Great to meet with you today',
        }),
      ];

      const alerts = generateResponseUrgencyAlerts(messages, 1);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('urgent');
      expect(alerts[0].category).toBe('response_urgency');
    });

    it('should not generate alert for old emails', () => {
      const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago

      const messages: GmailMessage[] = [
        createGmailMessageFixture({
          date: oldDate,
          subject: 'Meeting follow-up',
        }),
      ];

      const alerts = generateResponseUrgencyAlerts(messages, 1);

      expect(alerts).toHaveLength(0);
    });

    it('should not generate alert for non-meeting emails', () => {
      const recentDate = new Date(Date.now() - 12 * 60 * 60 * 1000);

      const messages: GmailMessage[] = [
        createGmailMessageFixture({
          date: recentDate,
          subject: 'Regular email',
          content: 'No meeting mentioned',
        }),
      ];

      const alerts = generateResponseUrgencyAlerts(messages, 1);

      expect(alerts).toHaveLength(0);
    });
  });

  describe('generateRelationshipCoolingAlerts', () => {
    it('should generate alert for contacts with 12+ days gap', () => {
      const now = new Date();
      const oldDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000); // 15 days ago

      const messages: GmailMessage[] = [
        createGmailMessageFixture({
          from: 'contact@example.com',
          date: oldDate,
        }),
        createGmailMessageFixture({
          from: 'contact@example.com',
          date: new Date(oldDate.getTime() - 5 * 24 * 60 * 60 * 1000), // 20 days ago
        }),
      ];

      const alerts = generateRelationshipCoolingAlerts(messages, 1);

      expect(alerts.length).toBeGreaterThan(0);
      if (alerts.length > 0) {
        expect(alerts[0].type).toBe('important');
        expect(alerts[0].category).toBe('relationship_cooling');
      }
    });

    it('should not generate alert for recent contacts', () => {
      const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago

      const messages: GmailMessage[] = [
        createGmailMessageFixture({
          from: 'contact@example.com',
          date: recentDate,
        }),
      ];

      const alerts = generateRelationshipCoolingAlerts(messages, 1);

      expect(alerts).toHaveLength(0);
    });

    it('should filter out noreply emails', () => {
      const messages: GmailMessage[] = [
        createGmailMessageFixture({
          from: 'noreply@example.com',
          date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        }),
      ];

      const alerts = generateRelationshipCoolingAlerts(messages, 1);

      expect(alerts).toHaveLength(0);
    });
  });

  describe('generateCalendarPreparationAlerts', () => {
    it('should generate alert for upcoming meeting within 24 hours', () => {
      const upcomingDate = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours from now

      const events: CalendarEvent[] = [
        createCalendarEventFixture({
          startTime: upcomingDate,
          endTime: new Date(upcomingDate.getTime() + 60 * 60 * 1000),
          title: 'Important Meeting',
        }),
      ];

      const alerts = generateCalendarPreparationAlerts(events, 1);

      expect(alerts.length).toBeGreaterThan(0);
      if (alerts.length > 0) {
        expect(alerts[0].type).toBe('urgent');
        expect(alerts[0].category).toBe('meeting_preparation');
      }
    });

    it('should not generate alert for meetings more than 48 hours away', () => {
      const futureDate = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours from now

      const events: CalendarEvent[] = [
        createCalendarEventFixture({
          startTime: futureDate,
          endTime: new Date(futureDate.getTime() + 60 * 60 * 1000),
        }),
      ];

      const alerts = generateCalendarPreparationAlerts(events, 1);

      expect(alerts).toHaveLength(0);
    });
  });

  describe('generateStrategicOpportunityAlerts', () => {
    it('should generate alert for emails with strategic keywords', () => {
      const messages: GmailMessage[] = [
        createGmailMessageFixture({
          subject: 'Partnership opportunity',
          content: 'We would like to discuss collaboration',
        }),
      ];

      const alerts = generateStrategicOpportunityAlerts(messages, [], 1);

      expect(alerts.length).toBeGreaterThan(0);
      if (alerts.length > 0) {
        expect(alerts[0].type).toBe('strategic');
        expect(alerts[0].category).toBe('strategic_opportunity');
      }
    });

    it('should not generate alert for regular emails', () => {
      const messages: GmailMessage[] = [
        createGmailMessageFixture({
          subject: 'Regular email',
          content: 'Just checking in',
        }),
      ];

      const alerts = generateStrategicOpportunityAlerts(messages, [], 1);

      expect(alerts).toHaveLength(0);
    });
  });
});
