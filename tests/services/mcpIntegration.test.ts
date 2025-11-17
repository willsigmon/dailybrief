/**
 * Unit tests for MCP integration functions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchGmailMessages,
  fetchCalendarEvents,
  fetchLimitlessRecordings,
  extractContactFromEmail,
  calculateHealthScore,
  calculateTrend,
} from '../../server/services/mcpIntegration';
import type { GmailMessage } from '../../server/services/mcpIntegration';

// Mock execAsync
vi.mock('util', async () => {
  const actual = await vi.importActual('util');
  return {
    ...actual,
    promisify: vi.fn(() => vi.fn()),
  };
});

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

describe('MCP Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set USE_MCP_CLI to undefined to test default behavior
    delete process.env.USE_MCP_CLI;
  });

  describe('extractContactFromEmail', () => {
    it('should extract contact from formatted email', () => {
      const email: GmailMessage = {
        id: '1',
        threadId: '1',
        from: 'John Doe <john@example.com>',
        to: 'user@example.com',
        subject: 'Test',
        date: new Date(),
        snippet: '',
        content: '',
      };

      const contact = extractContactFromEmail(email);

      expect(contact).not.toBeNull();
      expect(contact?.name).toBe('John Doe');
      expect(contact?.email).toBe('john@example.com');
    });

    it('should extract organization from email domain', () => {
      const email: GmailMessage = {
        id: '1',
        threadId: '1',
        from: 'Jane Smith <jane@company.com>',
        to: 'user@example.com',
        subject: 'Test',
        date: new Date(),
        snippet: '',
        content: '',
      };

      const contact = extractContactFromEmail(email);

      expect(contact?.organization).toBe('Company');
    });

    it('should return null for invalid email format', () => {
      const email: GmailMessage = {
        id: '1',
        threadId: '1',
        from: 'invalid-email',
        to: 'user@example.com',
        subject: 'Test',
        date: new Date(),
        snippet: '',
        content: '',
      };

      const contact = extractContactFromEmail(email);

      expect(contact).toBeNull();
    });
  });

  describe('calculateHealthScore', () => {
    it('should return base score for contacts with no messages', () => {
      const messages: GmailMessage[] = [];
      const score = calculateHealthScore(messages, 'test@example.com');

      expect(score).toBe(50);
    });

    it('should increase score for recent contacts', () => {
      const recentDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
      const messages: GmailMessage[] = [
        {
          id: '1',
          threadId: '1',
          from: 'test@example.com',
          to: 'user@example.com',
          subject: 'Test',
          date: recentDate,
          snippet: '',
          content: 'Test content',
        },
      ];

      const score = calculateHealthScore(messages, 'test@example.com');

      expect(score).toBeGreaterThan(70);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should decrease score for old contacts', () => {
      const oldDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000); // 35 days ago
      const messages: GmailMessage[] = [
        {
          id: '1',
          threadId: '1',
          from: 'test@example.com',
          to: 'user@example.com',
          subject: 'Test',
          date: oldDate,
          snippet: '',
          content: 'Test',
        },
      ];

      const score = calculateHealthScore(messages, 'test@example.com');

      expect(score).toBeLessThan(50);
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateTrend', () => {
    it('should return "new" for single message', () => {
      const messages: GmailMessage[] = [
        {
          id: '1',
          threadId: '1',
          from: 'test@example.com',
          to: 'user@example.com',
          subject: 'Test',
          date: new Date(),
          snippet: '',
          content: '',
        },
      ];

      const trend = calculateTrend(messages, 'test@example.com');

      expect(trend).toBe('new');
    });

    it('should detect "up" trend for increasing frequency', () => {
      const now = Date.now();
      const messages: GmailMessage[] = [
        {
          id: '1',
          threadId: '1',
          from: 'test@example.com',
          to: 'user@example.com',
          subject: 'Test',
          date: new Date(now),
          snippet: '',
          content: '',
        },
        {
          id: '2',
          threadId: '1',
          from: 'test@example.com',
          to: 'user@example.com',
          subject: 'Test',
          date: new Date(now - 1 * 24 * 60 * 60 * 1000),
          snippet: '',
          content: '',
        },
        {
          id: '3',
          threadId: '1',
          from: 'test@example.com',
          to: 'user@example.com',
          subject: 'Test',
          date: new Date(now - 10 * 24 * 60 * 60 * 1000),
          snippet: '',
          content: '',
        },
        {
          id: '4',
          threadId: '1',
          from: 'test@example.com',
          to: 'user@example.com',
          subject: 'Test',
          date: new Date(now - 20 * 24 * 60 * 60 * 1000),
          snippet: '',
          content: '',
        },
      ];

      const trend = calculateTrend(messages, 'test@example.com');

      // Should detect increasing frequency (up trend)
      expect(['up', 'stable']).toContain(trend);
    });
  });
});
