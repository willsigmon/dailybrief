import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RelationshipManager } from '../../server/domains/briefing/RelationshipManager';
import { GmailMessage } from '../../server/services/mcpIntegration';

// Mock the mcpIntegration helper functions
vi.mock('../../server/services/mcpIntegration', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../server/services/mcpIntegration')>();
  return {
    ...actual,
    // We'll keep the actual implementations for extractContactFromEmail as it's pure logic
    // But we might want to mock calculateHealthScore if it had side effects (it caches, but that's fine)
  };
});

describe('RelationshipManager', () => {
  let manager: RelationshipManager;

  beforeEach(() => {
    manager = new RelationshipManager();
  });

  it('should process emails and extract relationships', () => {
    const messages: GmailMessage[] = [
      {
        id: '1',
        threadId: 't1',
        from: 'Alice Smith <alice@example.com>',
        to: 'me@me.com',
        subject: 'Hello',
        date: new Date('2023-01-01'),
        snippet: 'Hi',
        content: 'Hi there',
      },
      {
        id: '2',
        threadId: 't1',
        from: 'Alice Smith <alice@example.com>',
        to: 'me@me.com',
        subject: 'Re: Hello',
        date: new Date('2023-01-02'),
        snippet: 'Hi back',
        content: 'Hi back',
      },
      {
        id: '3',
        threadId: 't2',
        from: 'Bob Jones <bob@acme.org>',
        to: 'me@me.com',
        subject: 'Project',
        date: new Date('2023-01-03'),
        snippet: 'Update',
        content: 'Update here',
      }
    ];

    const results = manager.processRelationships(messages);

    expect(results).toHaveLength(2); // Alice and Bob

    const alice = results.find(r => r.email === 'alice@example.com');
    expect(alice).toBeDefined();
    expect(alice?.contactName).toBe('Alice Smith');
    expect(alice?.organization).toBe('example'); // Extracted from domain
    expect(alice?.lastInteraction).toEqual(new Date('2023-01-02')); // Latest message

    const bob = results.find(r => r.email === 'bob@acme.org');
    expect(bob).toBeDefined();
    expect(bob?.contactName).toBe('Bob Jones');
    expect(bob?.organization).toBe('acme');
  });

  it('should ignore noreply emails', () => {
    const messages: GmailMessage[] = [
      {
        id: '1',
        threadId: 't1',
        from: 'No Reply <noreply@service.com>',
        to: 'me@me.com',
        subject: 'Notification',
        date: new Date(),
        snippet: 'Alert',
        content: 'Alert',
      }
    ];

    const results = manager.processRelationships(messages);
    expect(results).toHaveLength(0);
  });
});
