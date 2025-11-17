import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
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
import { logger } from './_core/logger';

let _db: ReturnType<typeof drizzle> | null = null;
let _connectionPool: mysql.Pool | null = null;

/**
 * Create database connection pool with optimized settings
 */
function createConnectionPool(): mysql.Pool | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  try {
    // Parse connection string and create pool
    const pool = mysql.createPool({
      uri: process.env.DATABASE_URL,
      connectionLimit: parseInt(process.env.DB_POOL_SIZE || '10'),
      queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || '0'),
      acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
      timeout: parseInt(process.env.DB_TIMEOUT || '60000'),
      reconnect: true,
    });

    logger.info('Database connection pool created', {
      connectionLimit: parseInt(process.env.DB_POOL_SIZE || '10'),
    });

    return pool;
  } catch (error) {
    logger.error('Failed to create database connection pool', { error });
    return null;
  }
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Create connection pool if not exists
      if (!_connectionPool) {
        _connectionPool = createConnectionPool();
      }

      if (_connectionPool) {
        _db = drizzle(_connectionPool);
      } else {
        // Fallback to direct connection if pool creation fails
        _db = drizzle(process.env.DATABASE_URL);
      }
    } catch (error) {
      logger.warn("Failed to connect to database", { error });
      _db = null;
    }
  }
  return _db;
}

/**
 * Close database connection pool (for graceful shutdown)
 */
export async function closeDb(): Promise<void> {
  if (_connectionPool) {
    await _connectionPool.end();
    _connectionPool = null;
    _db = null;
    logger.info('Database connection pool closed');
  }
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

  // Drizzle with MySQL2 returns ResultSetHeader which has insertId
  // Type definition for MySQL2 ResultSetHeader
  interface MySQL2ResultSetHeader {
    insertId: number;
    affectedRows: number;
    warningCount: number;
  }

  const result = await db.insert(briefings).values(data);

  // MySQL2 driver returns ResultSetHeader directly or as first element of array
  const resultHeader = (Array.isArray(result) ? result[0] : result) as unknown as MySQL2ResultSetHeader;
  const insertId = resultHeader?.insertId;

  if (!insertId || isNaN(insertId)) {
    throw new Error(`Failed to get insertId from database result: ${JSON.stringify(result)}`);
  }

  return { insertId: Number(insertId) };
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

/**
 * Batch insert alerts for better performance
 */
export async function createAlertsBatch(dataArray: InsertAlert[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (dataArray.length === 0) return;

  // Insert in batches of 100 to avoid query size limits
  const batchSize = 100;
  for (let i = 0; i < dataArray.length; i += batchSize) {
    const batch = dataArray.slice(i, i + batchSize);
    await db.insert(alerts).values(batch);
  }
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

/**
 * Batch upsert relationships for better performance
 */
export async function createOrUpdateRelationshipsBatch(dataArray: InsertRelationship[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (dataArray.length === 0) return;

  // Process in batches of 50 for upserts
  const batchSize = 50;
  for (let i = 0; i < dataArray.length; i += batchSize) {
    const batch = dataArray.slice(i, i + batchSize);
    for (const data of batch) {
      await db.insert(relationships).values(data).onDuplicateKeyUpdate({
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
  }
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

/**
 * Batch insert calendar events for better performance
 */
export async function createCalendarEventsBatch(dataArray: InsertCalendarEvent[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (dataArray.length === 0) return;

  // Insert in batches of 100 to avoid query size limits
  const batchSize = 100;
  for (let i = 0; i < dataArray.length; i += batchSize) {
    const batch = dataArray.slice(i, i + batchSize);
    await db.insert(calendarEvents).values(batch);
  }
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
