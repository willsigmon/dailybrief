/**
 * Find hidden connections between contacts
 */

import type { GmailMessage } from './mcpIntegration';

export interface Connection {
  contact1: string;
  contact2: string;
  connectionType: 'shared_domain' | 'mutual_contact' | 'similar_topics' | 'organizational';
  strength: number; // 0-100
  evidence: string[];
}

/**
 * Find connections between contacts based on shared email domains
 */
export function findSharedDomainConnections(
  messages: GmailMessage[]
): Connection[] {
  const domainMap = new Map<string, Set<string>>(); // domain -> set of emails

  // Extract domains from email addresses
  for (const msg of messages) {
    const fromMatch = msg.from.match(/<(.+?)>/);
    const fromEmail = fromMatch ? fromMatch[1] : msg.from.includes('@') ? msg.from : null;

    if (fromEmail) {
      const domain = fromEmail.split('@')[1];
      if (domain) {
        if (!domainMap.has(domain)) {
          domainMap.set(domain, new Set());
        }
        domainMap.get(domain)!.add(fromEmail);
      }
    }
  }

  const connections: Connection[] = [];

  // Find domains with multiple contacts
  for (const [domain, emails] of domainMap.entries()) {
    const emailArray = Array.from(emails);
    if (emailArray.length >= 2) {
      // Create connections between all pairs in the domain
      for (let i = 0; i < emailArray.length; i++) {
        for (let j = i + 1; j < emailArray.length; j++) {
          connections.push({
            contact1: emailArray[i],
            contact2: emailArray[j],
            connectionType: 'shared_domain',
            strength: 80,
            evidence: [`Both contacts use ${domain} email domain`],
          });
        }
      }
    }
  }

  return connections;
}

/**
 * Find connections based on similar topics/themes
 */
export function findTopicConnections(
  messages: GmailMessage[]
): Connection[] {
  const contactTopics = new Map<string, Set<string>>();

  // Extract topics for each contact
  const keywords = [
    'partnership', 'collaboration', 'funding', 'grant', 'proposal',
    'meeting', 'call', 'project', 'opportunity', 'initiative',
  ];

  for (const msg of messages) {
    const fromMatch = msg.from.match(/<(.+?)>/);
    const fromEmail = fromMatch ? fromMatch[1] : msg.from.includes('@') ? msg.from : null;

    if (!fromEmail) continue;

    if (!contactTopics.has(fromEmail)) {
      contactTopics.set(fromEmail, new Set());
    }

    const content = (msg.subject + ' ' + msg.content).toLowerCase();
    for (const keyword of keywords) {
      if (content.includes(keyword)) {
        contactTopics.get(fromEmail)!.add(keyword);
      }
    }
  }

  const connections: Connection[] = [];
  const contacts = Array.from(contactTopics.keys());

  // Compare topics between contacts
  for (let i = 0; i < contacts.length; i++) {
    for (let j = i + 1; j < contacts.length; j++) {
      const topics1 = contactTopics.get(contacts[i])!;
      const topics2 = contactTopics.get(contacts[j])!;

      const intersection = new Set([...topics1].filter(t => topics2.has(t)));
      const union = new Set([...topics1, ...topics2]);

      if (intersection.size > 0) {
        const similarity = (intersection.size / union.size) * 100;
        if (similarity > 20) { // At least 20% topic overlap
          connections.push({
            contact1: contacts[i],
            contact2: contacts[j],
            connectionType: 'similar_topics',
            strength: Math.min(100, similarity * 1.5),
            evidence: [`Shared topics: ${Array.from(intersection).join(', ')}`],
          });
        }
      }
    }
  }

  return connections;
}

/**
 * Find all connections between contacts
 */
export function findAllConnections(messages: GmailMessage[]): Connection[] {
  const domainConnections = findSharedDomainConnections(messages);
  const topicConnections = findTopicConnections(messages);

  // Combine and deduplicate
  const connectionMap = new Map<string, Connection>();

  for (const conn of [...domainConnections, ...topicConnections]) {
    const key = [conn.contact1, conn.contact2].sort().join('|');
    const existing = connectionMap.get(key);

    if (!existing || conn.strength > existing.strength) {
      connectionMap.set(key, conn);
    } else if (existing && conn.strength === existing.strength) {
      // Merge evidence
      existing.evidence.push(...conn.evidence);
    }
  }

  return Array.from(connectionMap.values());
}
