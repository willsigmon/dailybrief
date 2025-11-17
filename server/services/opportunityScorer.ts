/**
 * Score and prioritize strategic opportunities
 */

import type { GmailMessage, CalendarEvent } from './mcpIntegration';
import type { InsertAlert } from '../../drizzle/schema';

export interface OpportunityScore {
  score: number; // 0-100
  factors: {
    relationshipHealth: number;
    strategicKeywords: number;
    timingUrgency: number;
    engagementLevel: number;
  };
}

/**
 * Score a strategic opportunity based on multiple factors
 */
export function scoreOpportunity(
  alert: Omit<InsertAlert, 'id' | 'createdAt'>,
  relationshipHealthScore: number,
  messages: GmailMessage[],
  calendarEvents: CalendarEvent[]
): OpportunityScore {
  // Factor 1: Relationship Health Score (0-100, weighted 30%)
  const relationshipHealth = relationshipHealthScore;
  const relationshipWeight = 0.3;

  // Factor 2: Strategic Keyword Density (0-100, weighted 25%)
  const strategicKeywords = [
    'partnership', 'collaboration', 'funding', 'grant', 'donation',
    'sponsor', 'opportunity', 'proposal', 'investment', 'digital equity',
    'strategic', 'initiative', 'program', 'project',
  ];

  const relevantMessages = messages.filter(m =>
    m.from.includes(alert.contactName || '') ||
    m.to.includes(alert.contactName || '')
  );

  let keywordCount = 0;
  for (const msg of relevantMessages) {
    const content = (msg.subject + ' ' + msg.content).toLowerCase();
    keywordCount += strategicKeywords.filter(kw => content.includes(kw)).length;
  }

  const keywordDensity = Math.min(100, (keywordCount / Math.max(1, relevantMessages.length)) * 20);
  const keywordWeight = 0.25;

  // Factor 3: Timing/Urgency (0-100, weighted 25%)
  let timingUrgency = 50; // Default
  if (alert.deadline) {
    const daysUntilDeadline = Math.floor((alert.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilDeadline <= 7) {
      timingUrgency = 100 - (daysUntilDeadline * 10); // Higher urgency for closer deadlines
    } else if (daysUntilDeadline <= 30) {
      timingUrgency = 70 - ((daysUntilDeadline - 7) * 2);
    } else {
      timingUrgency = 30;
    }
    timingUrgency = Math.max(0, Math.min(100, timingUrgency));
  }
  const timingWeight = 0.25;

  // Factor 4: Engagement Level (0-100, weighted 20%)
  // Based on message frequency and response patterns
  const engagementScore = Math.min(100, relevantMessages.length * 10);
  const engagementWeight = 0.2;

  // Calculate weighted score
  const score = Math.round(
    relationshipHealth * relationshipWeight +
    keywordDensity * keywordWeight +
    timingUrgency * timingWeight +
    engagementScore * engagementWeight
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    factors: {
      relationshipHealth,
      strategicKeywords: keywordDensity,
      timingUrgency,
      engagementLevel: engagementScore,
    },
  };
}

/**
 * Sort alerts by opportunity score (highest first)
 */
export function sortAlertsByScore(
  alerts: Array<Omit<InsertAlert, 'id' | 'createdAt'>>,
  relationshipHealthScores: Map<string, number>,
  messages: GmailMessage[],
  calendarEvents: CalendarEvent[]
): Array<Omit<InsertAlert, 'id' | 'createdAt'> & { opportunityScore: number }> {
  const scoredAlerts = alerts
    .filter(a => a.type === 'strategic')
    .map(alert => {
      const email = alert.contactName || '';
      const healthScore = relationshipHealthScores.get(email) || 50;
      const scoreResult = scoreOpportunity(alert, healthScore, messages, calendarEvents);

      return {
        ...alert,
        opportunityScore: scoreResult.score,
      };
    })
    .sort((a, b) => b.opportunityScore - a.opportunityScore);

  return scoredAlerts;
}
