import { GmailMessage, extractContactFromEmail, calculateHealthScore, calculateTrend } from '../../services/mcpIntegration';
import { InsertRelationship } from '../../../drizzle/schema';

export class RelationshipManager {
  processRelationships(gmailMessages: GmailMessage[]): InsertRelationship[] {
    const contactMap = new Map<string, InsertRelationship>();

    for (const msg of gmailMessages) {
      const contact = extractContactFromEmail(msg);
      if (!contact || contact.email.includes('noreply')) continue;

      if (!contactMap.has(contact.email)) {
        const healthScore = calculateHealthScore(gmailMessages, contact.email);
        const trend = calculateTrend(gmailMessages, contact.email);

        contactMap.set(contact.email, {
          contactName: contact.name,
          organization: contact.organization || null,
          email: contact.email,
          healthScore,
          trend,
          lastInteraction: msg.date,
          lastInteractionType: 'email',
        });
      } else {
        // Update lastInteraction if this message is newer
        const existing = contactMap.get(contact.email)!;
        if (existing.lastInteraction && msg.date > existing.lastInteraction) {
            existing.lastInteraction = msg.date;
            // Also update name/org if they were missing/less complete?
            // For now, just date is critical.
        }
      }
    }

    return Array.from(contactMap.values());
  }
}
