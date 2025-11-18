import { db, schema } from "./base";
import { eq } from "drizzle-orm";

export const alertRepository = {
  async getByBriefingId(briefingId: number) {
    return await db.query.alerts.findMany({
      where: eq(schema.alerts.briefingId, briefingId),
    });
  },

  async create(data: schema.InsertAlert) {
    return await db.insert(schema.alerts).values(data);
  },

  async createBatch(dataArray: schema.InsertAlert[]) {
    if (dataArray.length === 0) return;
    const batchSize = 100;
    for (let i = 0; i < dataArray.length; i += batchSize) {
      await db.insert(schema.alerts).values(dataArray.slice(i, i + batchSize));
    }
  },

  async updateCompletion(id: number, completed: boolean) {
    return await db.update(schema.alerts)
      .set({
        completed,
        completedAt: completed ? new Date() : null
      })
      .where(eq(schema.alerts.id, id));
  }
};
