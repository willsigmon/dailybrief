import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema";
import { logger } from "./_core/logger";

// Fail fast if database configuration is missing
if (!process.env.DATABASE_URL) {
  logger.error("DATABASE_URL is not set");
  throw new Error("DATABASE_URL environment variable is required");
}

// Create connection pool with optimized settings
const poolConnection = mysql.createPool({
  uri: process.env.DATABASE_URL,
  connectionLimit: parseInt(process.env.DB_POOL_SIZE || '10'),
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || '0'),
  acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
  timeout: parseInt(process.env.DB_TIMEOUT || '60000'),
  reconnect: true, // Note: mysql2/promise pool handles reconnection automatically
});

// Singleton Drizzle instance
export const db = drizzle(poolConnection, { mode: "default", schema });

// Graceful shutdown
export async function closeDb(): Promise<void> {
  await poolConnection.end();
  logger.info('Database connection pool closed');
}
