import { db, schema } from "./base";
import { eq } from "drizzle-orm";

export const llmAnalysisRepository = {
  async getByBriefingId(briefingId: number) {
    return await db.query.llmAnalyses.findMany({
      where: eq(schema.llmAnalyses.briefingId, briefingId),
    });
  },

  async create(data: schema.InsertLlmAnalysis) {
    return await db.insert(schema.llmAnalyses).values(data);
  }
};
