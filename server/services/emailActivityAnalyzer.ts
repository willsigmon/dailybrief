/**
 * Analyze email activity patterns and generate summary
 */

import type { GmailMessage } from './mcpIntegration';
import { analyzeEmailActivity } from './patternRecognition';

export interface EmailActivitySummary {
  totalEmails: number;
  respondedCount: number;
  pendingCount: number;
  averageResponseTimeHours: number;
  responseTimeTrend: 'improving' | 'worsening' | 'stable';
  topTopics: Array<{ topic: string; count: number }>;
  summary: string;
}

/**
 * Generate email activity summary for executive summary
 */
export function generateEmailActivitySummary(messages: GmailMessage[]): EmailActivitySummary {
  const activity = analyzeEmailActivity(messages);

  // Generate human-readable summary
  const responseRate = activity.totalEmails > 0
    ? Math.round((activity.respondedCount / activity.totalEmails) * 100)
    : 0;

  let summary = `Email activity: ${activity.totalEmails} total emails, ${activity.respondedCount} responded (${responseRate}% response rate). `;

  if (activity.averageResponseTimeHours > 0) {
    summary += `Average response time: ${Math.round(activity.averageResponseTimeHours)} hours. `;
  }

  if (activity.responseTimeTrend === 'improving') {
    summary += 'Response times are improving. ';
  } else if (activity.responseTimeTrend === 'worsening') {
    summary += 'Response times are worsening - attention needed. ';
  }

  if (activity.pendingCount > 0) {
    summary += `${activity.pendingCount} emails pending response. `;
  }

  if (activity.topTopics.length > 0) {
    summary += `Top topics: ${activity.topTopics.slice(0, 3).map(t => t.topic).join(', ')}.`;
  }

  return {
    ...activity,
    summary: summary.trim(),
  };
}
