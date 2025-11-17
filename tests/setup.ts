/**
 * Test setup and utilities
 */
import { beforeAll, afterAll, beforeEach } from 'vitest';

/**
 * Test fixtures for Gmail messages
 */
export function createGmailMessageFixture(overrides?: Partial<import('../server/services/mcpIntegration').GmailMessage>): import('../server/services/mcpIntegration').GmailMessage {
  return {
    id: 'msg-123',
    threadId: 'thread-123',
    from: 'test@example.com',
    to: 'user@example.com',
    subject: 'Test Email',
    date: new Date(),
    snippet: 'Test snippet',
    content: 'Test content',
    ...overrides,
  };
}

/**
 * Test fixtures for calendar events
 */
export function createCalendarEventFixture(overrides?: Partial<import('../server/services/mcpIntegration').CalendarEvent>): import('../server/services/mcpIntegration').CalendarEvent {
  return {
    id: 'event-123',
    title: 'Test Meeting',
    description: 'Test description',
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // Tomorrow + 1 hour
    location: 'Test Location',
    attendees: ['attendee@example.com'],
    ...overrides,
  };
}

/**
 * Test fixtures for relationships
 */
export function createRelationshipFixture(overrides?: Partial<import('../drizzle/schema').InsertRelationship>): import('../drizzle/schema').InsertRelationship {
  return {
    contactName: 'Test Contact',
    email: 'test@example.com',
    organization: 'Test Org',
    healthScore: 75,
    trend: 'stable',
    lastInteraction: new Date(),
    lastInteractionType: 'email',
    ...overrides,
  };
}

/**
 * Mock database for testing
 */
export function createMockDb() {
  const data: {
    briefings: import('../drizzle/schema').Briefing[];
    alerts: import('../drizzle/schema').Alert[];
    relationships: import('../drizzle/schema').Relationship[];
    calendarEvents: import('../drizzle/schema').CalendarEvent[];
    llmAnalyses: import('../drizzle/schema').LlmAnalysis[];
  } = {
    briefings: [],
    alerts: [],
    relationships: [],
    calendarEvents: [],
    llmAnalyses: [],
  };

  return {
    data,
    reset: () => {
      data.briefings = [];
      data.alerts = [];
      data.relationships = [];
      data.calendarEvents = [];
      data.llmAnalyses = [];
    },
  };
}

/**
 * Wait utility for async tests
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
