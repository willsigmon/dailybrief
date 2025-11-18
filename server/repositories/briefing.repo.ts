import { db, schema } from "./base";
import { desc, eq } from "drizzle-orm";

export const briefingRepository = {
  async getLatest() {
    return await db.query.briefings.findFirst({
      orderBy: [desc(schema.briefings.date)],
    });
  },

  async getById(id: number) {
    return await db.query.briefings.findFirst({
      where: eq(schema.briefings.id, id),
    });
  },

  async create(data: schema.InsertBriefing) {
    const [result] = await db.insert(schema.briefings).values(data).$returningId();
    return { insertId: result.id };
  },

  async updateExecutiveSummary(id: number, summary: string) {
    return await db.update(schema.briefings)
      .set({ executiveSummary: summary, updatedAt: new Date() })
      .where(eq(schema.briefings.id, id));
  }
};
