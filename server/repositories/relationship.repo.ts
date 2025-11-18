import { db, schema } from "./base";
import { desc } from "drizzle-orm";

export const relationshipRepository = {
  async getAll() {
    return await db.query.relationships.findMany({
      orderBy: [desc(schema.relationships.healthScore)],
    });
  },

  async createOrUpdate(data: schema.InsertRelationship) {
    return await db.insert(schema.relationships).values(data).onDuplicateKeyUpdate({
      set: {
        organization: data.organization,
        email: data.email,
        healthScore: data.healthScore,
        trend: data.trend,
        lastInteraction: data.lastInteraction,
        lastInteractionType: data.lastInteractionType,
        notes: data.notes,
        updatedAt: new Date(),
      }
    });
  },

  async createOrUpdateBatch(dataArray: schema.InsertRelationship[]) {
    if (dataArray.length === 0) return;
    const batchSize = 50;
    for (let i = 0; i < dataArray.length; i += batchSize) {
      const batch = dataArray.slice(i, i + batchSize);
      for (const data of batch) {
         await this.createOrUpdate(data);
      }
    }
  }
};
