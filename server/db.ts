import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  briefings, 
  alerts, 
  relationships, 
  calendarEvents, 
  llmAnalyses,
  InsertBriefing,
  InsertAlert,
  InsertRelationship,
  InsertCalendarEvent,
  InsertLlmAnalysis
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Briefing queries
export async function getLatestBriefing() {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(briefings).orderBy(desc(briefings.date)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getBriefingById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(briefings).where(eq(briefings.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createBriefing(data: InsertBriefing) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(briefings).values(data);
  return result;
}

// Alert queries
export async function getAlertsByBriefingId(briefingId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(alerts).where(eq(alerts.briefingId, briefingId));
}

export async function createAlert(data: InsertAlert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(alerts).values(data);
}

export async function updateAlertCompletion(id: number, completed: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(alerts)
    .set({ 
      completed, 
      completedAt: completed ? new Date() : null 
    })
    .where(eq(alerts.id, id));
}

// Relationship queries
export async function getAllRelationships() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(relationships).orderBy(desc(relationships.healthScore));
}

export async function createOrUpdateRelationship(data: InsertRelationship) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(relationships).values(data).onDuplicateKeyUpdate({
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
}

// Calendar event queries
export async function getCalendarEventsByBriefingId(briefingId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(calendarEvents).where(eq(calendarEvents.briefingId, briefingId));
}

export async function createCalendarEvent(data: InsertCalendarEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(calendarEvents).values(data);
}

// LLM analysis queries
export async function getLlmAnalysesByBriefingId(briefingId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(llmAnalyses).where(eq(llmAnalyses.briefingId, briefingId));
}

export async function createLlmAnalysis(data: InsertLlmAnalysis) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(llmAnalyses).values(data);
}
