import { db, schema } from "./base";
import { eq } from "drizzle-orm";

export const calendarRepository = {
  async getByBriefingId(briefingId: number) {
    return await db.query.calendarEvents.findMany({
      where: eq(schema.calendarEvents.briefingId, briefingId),
    });
  },

  async create(data: schema.InsertCalendarEvent) {
    return await db.insert(schema.calendarEvents).values(data);
  },

  async createBatch(dataArray: schema.InsertCalendarEvent[]) {
    if (dataArray.length === 0) return;
    const batchSize = 100;
    for (let i = 0; i < dataArray.length; i += batchSize) {
      await db.insert(schema.calendarEvents).values(dataArray.slice(i, i + batchSize));
    }
  }
};
