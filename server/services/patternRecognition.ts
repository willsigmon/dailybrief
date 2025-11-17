/**
 * Pattern recognition and insights from email/calendar data
 */

import type { GmailMessage, CalendarEvent } from './mcpIntegration';
import { logger } from '../_core/logger';

export interface EmailActivityPattern {
  totalEmails: number;
  respondedCount: number;
  pendingCount: number;
  averageResponseTimeHours: number;
  responseTimeTrend: 'improving' | 'worsening' | 'stable';
  topTopics: Array<{ topic: string; count: number }>;
}

export interface CommunicationFrequencyPattern {
  contactEmail: string;
  contactName: string;
  averageDaysBetweenMessages: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  lastContactDaysAgo: number;
}

export interface RelationshipEngagementPattern {
  contactEmail: string;
  engagementScore: number; // 0-100
  engagementTrend: 'up' | 'down' | 'stable';
  preferredContactMethod: 'email' | 'meeting' | 'call';
  bestContactTime: string | null; // Day of week or time range
}

/**
 * Analyze email activity patterns
 */
export function analyzeEmailActivity(messages: GmailMessage[]): EmailActivityPattern {
  const now = Date.now();
  const respondedEmails: GmailMessage[] = [];
  const pendingEmails: GmailMessage[] = [];
  const responseTimes: number[] = [];

  // Group messages by thread to identify responses
  const threadMap = new Map<string, GmailMessage[]>();
  for (const msg of messages) {
    if (!threadMap.has(msg.threadId)) {
      threadMap.set(msg.threadId, []);
    }
    threadMap.get(msg.threadId)!.push(msg);
  }

  // Analyze each thread
  for (const [threadId, threadMessages] of threadMap.entries()) {
    const sorted = threadMessages.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Check if thread has multiple messages (indicating response)
    if (sorted.length > 1) {
      respondedEmails.push(...sorted.slice(0, -1)); // All except last

      // Calculate response time between first and second message
      if (sorted.length >= 2) {
        const responseTime = (sorted[1].date.getTime() - sorted[0].date.getTime()) / (1000 * 60 * 60);
        if (responseTime > 0 && responseTime < 168) { // Within a week
          responseTimes.push(responseTime);
        }
      }
    } else {
      // Single message thread - likely pending
      pendingEmails.push(sorted[0]);
    }
  }

  // Calculate average response time
  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
    : 0;

  // Determine response time trend (comparing recent vs older)
  const recentResponseTimes = responseTimes.slice(-Math.min(10, Math.floor(responseTimes.length / 2)));
  const olderResponseTimes = responseTimes.slice(0, Math.max(0, responseTimes.length - recentResponseTimes.length));

  let responseTimeTrend: 'improving' | 'worsening' | 'stable' = 'stable';
  if (recentResponseTimes.length > 0 && olderResponseTimes.length > 0) {
    const recentAvg = recentResponseTimes.reduce((sum, t) => sum + t, 0) / recentResponseTimes.length;
    const olderAvg = olderResponseTimes.reduce((sum, t) => sum + t, 0) / olderResponseTimes.length;

    if (recentAvg < olderAvg * 0.8) {
      responseTimeTrend = 'improving';
    } else if (recentAvg > olderAvg * 1.2) {
      responseTimeTrend = 'worsening';
    }
  }

  // Extract topics from email subjects (simple keyword extraction)
  const topicMap = new Map<string, number>();
  for (const msg of messages) {
    const words = msg.subject.toLowerCase().split(/\s+/);
    const keywords = ['meeting', 'call', 'partnership', 'proposal', 'follow-up', 'opportunity', 'project'];
    for (const keyword of keywords) {
      if (words.some(w => w.includes(keyword))) {
        topicMap.set(keyword, (topicMap.get(keyword) || 0) + 1);
      }
    }
  }

  const topTopics = Array.from(topicMap.entries())
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalEmails: messages.length,
    respondedCount: respondedEmails.length,
    pendingCount: pendingEmails.length,
    averageResponseTimeHours: avgResponseTime,
    responseTimeTrend,
    topTopics,
  };
}

/**
 * Detect communication frequency patterns
 */
export function detectCommunicationFrequency(
  messages: GmailMessage[],
  contactEmail: string
): CommunicationFrequencyPattern | null {
  const contactMessages = messages
    .filter(m => m.from.includes(contactEmail) || m.to.includes(contactEmail))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (contactMessages.length < 2) {
    return null;
  }

  // Calculate average days between messages
  const intervals: number[] = [];
  for (let i = 1; i < contactMessages.length; i++) {
    const days = (contactMessages[i].date.getTime() - contactMessages[i - 1].date.getTime()) / (1000 * 60 * 60 * 24);
    intervals.push(days);
  }

  const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

  // Determine trend
  const recentIntervals = intervals.slice(-Math.min(5, Math.floor(intervals.length / 2)));
  const olderIntervals = intervals.slice(0, Math.max(0, intervals.length - recentIntervals.length));

  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (recentIntervals.length > 0 && olderIntervals.length > 0) {
    const recentAvg = recentIntervals.reduce((sum, i) => sum + i, 0) / recentIntervals.length;
    const olderAvg = olderIntervals.reduce((sum, i) => sum + i, 0) / olderIntervals.length;

    if (recentAvg < olderAvg * 0.8) {
      trend = 'increasing'; // More frequent = smaller intervals
    } else if (recentAvg > olderAvg * 1.2) {
      trend = 'decreasing';
    }
  }

  const lastContact = contactMessages[contactMessages.length - 1];
  const lastContactDaysAgo = Math.floor((Date.now() - lastContact.date.getTime()) / (1000 * 60 * 60 * 24));

  // Extract contact name from first message
  const contactName = contactMessages[0].from.match(/(.*?)\s*</)?.[1]?.trim() || contactEmail.split('@')[0];

  return {
    contactEmail,
    contactName,
    averageDaysBetweenMessages: avgInterval,
    trend,
    lastContactDaysAgo,
  };
}

/**
 * Cluster topics/themes from email content
 */
export function clusterTopics(messages: GmailMessage[]): Array<{ topic: string; count: number; messages: GmailMessage[] }> {
  const topicMap = new Map<string, GmailMessage[]>();

  // Simple keyword-based clustering
  const keywords = [
    'meeting', 'call', 'partnership', 'collaboration', 'proposal',
    'funding', 'grant', 'opportunity', 'project', 'follow-up',
    'deadline', 'deliverable', 'contract', 'agreement',
  ];

  for (const msg of messages) {
    const content = (msg.subject + ' ' + msg.content).toLowerCase();
    let matched = false;

    for (const keyword of keywords) {
      if (content.includes(keyword)) {
        if (!topicMap.has(keyword)) {
          topicMap.set(keyword, []);
        }
        topicMap.get(keyword)!.push(msg);
        matched = true;
        break; // Assign to first matching keyword
      }
    }

    // If no keyword matches, assign to "general"
    if (!matched) {
      if (!topicMap.has('general')) {
        topicMap.set('general', []);
      }
      topicMap.get('general')!.push(msg);
    }
  }

  return Array.from(topicMap.entries())
    .map(([topic, messages]) => ({
      topic,
      count: messages.length,
      messages,
    }))
    .sort((a, b) => b.count - a.count);
}
