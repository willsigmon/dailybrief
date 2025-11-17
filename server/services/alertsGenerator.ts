import type { InsertAlert } from '../../drizzle/schema';
import type { GmailMessage, CalendarEvent } from './mcpIntegration';

/**
 * Check if two alerts are duplicates
 */
function areAlertsDuplicate(alert1: Omit<InsertAlert, 'id' | 'createdAt'>, alert2: Omit<InsertAlert, 'id' | 'createdAt'>): boolean {
  // Same type and category
  if (alert1.type !== alert2.type || alert1.category !== alert2.category) {
    return false;
  }

  // Same contact
  if (alert1.contactName !== alert2.contactName) {
    return false;
  }

  // Similar titles (fuzzy match)
  const title1 = alert1.title.toLowerCase();
  const title2 = alert2.title.toLowerCase();
  const similarity = calculateStringSimilarity(title1, title2);

  return similarity > 0.7; // 70% similarity threshold
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Deduplicate alerts based on similarity
 */
export function deduplicateAlerts(alerts: Omit<InsertAlert, 'id' | 'createdAt'>[]): Omit<InsertAlert, 'id' | 'createdAt'>[] {
  const deduplicated: Omit<InsertAlert, 'id' | 'createdAt'>[] = [];
  const seen = new Set<string>();

  for (const alert of alerts) {
    // Create a signature for quick duplicate checking
    const signature = `${alert.type}:${alert.category}:${alert.contactName}:${alert.title}`;

    // Check if we've seen a similar alert
    let isDuplicate = false;
    for (const seenAlert of deduplicated) {
      if (areAlertsDuplicate(alert, seenAlert)) {
        isDuplicate = true;
        // Keep the one with earlier deadline or more urgent
        if (alert.deadline && seenAlert.deadline && alert.deadline < seenAlert.deadline) {
          const index = deduplicated.indexOf(seenAlert);
          deduplicated[index] = alert;
        } else if (!seenAlert.deadline && alert.deadline) {
          const index = deduplicated.indexOf(seenAlert);
          deduplicated[index] = alert;
        }
        break;
      }
    }

    if (!isDuplicate && !seen.has(signature)) {
      deduplicated.push(alert);
      seen.add(signature);
    }
  }

  return deduplicated;
}

/**
 * Generate response urgency alerts
 */
export function generateResponseUrgencyAlerts(
  messages: GmailMessage[],
  briefingId: number
): Omit<InsertAlert, 'id' | 'createdAt'>[] {
  const alerts: Omit<InsertAlert, 'id' | 'createdAt'>[] = [];

  // Find meetings that happened in the last 24 hours
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const recentMeetingEmails = messages.filter(m => {
    const isRecent = m.date >= yesterday;
    const isMeetingRelated = m.subject.toLowerCase().includes('meeting') ||
                            m.subject.toLowerCase().includes('call') ||
                            m.content.toLowerCase().includes('thank you for') ||
                            m.content.toLowerCase().includes('great to meet');
    return isRecent && isMeetingRelated;
  });

  for (const email of recentMeetingEmails) {
    const contact = extractContactName(email.from);
    const organization = extractOrganization(email.from);

    alerts.push({
      briefingId,
      type: 'urgent',
      category: 'response_urgency',
      title: `Follow up on recent meeting with ${contact}`,
      description: `Meeting or call happened within the last 24 hours. Following up quickly demonstrates professionalism and keeps momentum high.`,
      contactName: contact,
      organization: organization || undefined,
      actionRequired: `Send a thank-you email by end of day. Recap key discussion points and confirm next steps.`,
      deadline: new Date(now.getTime() + 8 * 60 * 60 * 1000), // 8 hours from now
      completed: false,
      completedAt: null,
    });
  }

  return alerts;
}

/**
 * Generate relationship cooling alerts
 */
export function generateRelationshipCoolingAlerts(
  messages: GmailMessage[],
  briefingId: number
): Omit<InsertAlert, 'id' | 'createdAt'>[] {
  const alerts: Omit<InsertAlert, 'id' | 'createdAt'>[] = [];

  // Group messages by contact
  const contactMap = new Map<string, GmailMessage[]>();

  for (const msg of messages) {
    const email = extractEmail(msg.from);
    if (!email || email.includes('noreply') || email.includes('no-reply')) continue;

    if (!contactMap.has(email)) {
      contactMap.set(email, []);
    }
    contactMap.get(email)!.push(msg);
  }

  const now = new Date();

  const contactEntries = Array.from(contactMap.entries());
  for (const [email, contactMessages] of contactEntries) {
    const sortedMessages = contactMessages.sort((a, b) => b.date.getTime() - a.date.getTime());
    const mostRecent = sortedMessages[0];
    const daysSinceContact = Math.floor((now.getTime() - mostRecent.date.getTime()) / (1000 * 60 * 60 * 24));

    // Alert if no contact in 12+ days and thread was previously active
    if (daysSinceContact >= 12 && sortedMessages.length >= 2) {
      const contact = extractContactName(mostRecent.from);
      const organization = extractOrganization(mostRecent.from);

      // Check if response length decreased (engagement signal)
      const recentAvgLength = sortedMessages.slice(0, 2).reduce((sum, m) => sum + m.content.length, 0) / 2;
      const olderAvgLength = sortedMessages.slice(2, 4).reduce((sum, m) => sum + m.content.length, 0) / Math.min(2, sortedMessages.length - 2);

      const engagementDropped = olderAvgLength > 0 && recentAvgLength < olderAvgLength * 0.5;

      alerts.push({
        briefingId,
        type: 'important',
        category: 'relationship_cooling',
        title: `${contact} thread is going cold`,
        description: `Last contact was ${daysSinceContact} days ago. ${engagementDropped ? 'Response length has decreased significantly.' : ''} Threads that go 14+ days without response have a 70% chance of going dormant.`,
        contactName: contact,
        organization: organization || undefined,
        actionRequired: `Re-engage with a fresh angle or new information. Consider referencing recent news or developments related to their organization.`,
        deadline: new Date(now.getTime() + 48 * 60 * 60 * 1000), // 48 hours
        completed: false,
        completedAt: null,
      });
    }
  }

  return alerts;
}

/**
 * Generate calendar preparation alerts
 */
export function generateCalendarPreparationAlerts(
  events: CalendarEvent[],
  briefingId: number
): Omit<InsertAlert, 'id' | 'createdAt'>[] {
  const alerts: Omit<InsertAlert, 'id' | 'createdAt'>[] = [];

  const now = new Date();
  const next48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const upcomingEvents = events.filter(e => e.startTime >= now && e.startTime <= next48Hours);

  for (const event of upcomingEvents) {
    const hoursUntil = Math.floor((event.startTime.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (hoursUntil <= 24) {
      alerts.push({
        briefingId,
        type: 'urgent',
        category: 'meeting_preparation',
        title: `Prepare for: ${event.title}`,
        description: `Meeting starts in ${hoursUntil} hours. ${event.attendees.length > 0 ? `Attendees: ${event.attendees.slice(0, 3).join(', ')}${event.attendees.length > 3 ? '...' : ''}` : ''}`,
        contactName: event.attendees[0] || null,
        organization: null,
        actionRequired: `Research attendees, prepare talking points, and review any relevant past conversations or commitments.`,
        deadline: event.startTime,
        completed: false,
        completedAt: null,
      });
    }
  }

  return alerts;
}

/**
 * Generate strategic opportunity alerts
 */
export function generateStrategicOpportunityAlerts(
  messages: GmailMessage[],
  events: CalendarEvent[],
  briefingId: number
): Omit<InsertAlert, 'id' | 'createdAt'>[] {
  const alerts: Omit<InsertAlert, 'id' | 'createdAt'>[] = [];

  // Look for high-value keywords in recent emails
  const strategicKeywords = [
    'partnership', 'collaboration', 'funding', 'grant', 'donation',
    'sponsor', 'opportunity', 'proposal', 'investment', 'digital equity'
  ];

  for (const msg of messages) {
    const content = (msg.subject + ' ' + msg.content).toLowerCase();
    const hasStrategicKeyword = strategicKeywords.some(kw => content.includes(kw));

    if (hasStrategicKeyword) {
      const contact = extractContactName(msg.from);
      const organization = extractOrganization(msg.from);

      alerts.push({
        briefingId,
        type: 'strategic',
        category: 'strategic_opportunity',
        title: `Strategic opportunity with ${organization || contact}`,
        description: `Email mentions partnership, collaboration, or funding opportunities. This could be a high-value lead.`,
        contactName: contact,
        organization: organization || undefined,
        actionRequired: `Review the email thread carefully and assess strategic fit. Consider scheduling a follow-up call.`,
        deadline: null,
        completed: false,
        completedAt: null,
      });
      break; // Only one alert per contact
    }
  }

  return alerts;
}

/**
 * Helper: Extract contact name from email "From" field
 */
function extractContactName(from: string): string {
  const match = from.match(/(.*?)\s*<(.+?)>/);
  if (match) {
    return match[1].trim().replace(/"/g, '');
  }
  return from.split('@')[0];
}

/**
 * Helper: Extract email address
 */
function extractEmail(from: string): string | null {
  const match = from.match(/<(.+?)>/);
  if (match) {
    return match[1].trim();
  }
  if (from.includes('@')) {
    return from.trim();
  }
  return null;
}

/**
 * Helper: Extract organization from email domain
 */
function extractOrganization(from: string): string | null {
  const email = extractEmail(from);
  if (!email) return null;

  const domain = email.split('@')[1];
  if (!domain) return null;

  const orgName = domain.split('.')[0];
  return orgName.charAt(0).toUpperCase() + orgName.slice(1);
}
