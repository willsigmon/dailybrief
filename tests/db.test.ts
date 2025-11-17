/**
 * Unit tests for database operations
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../server/db';
import type { InsertBriefing, InsertAlert, InsertRelationship } from '../drizzle/schema';

// Mock drizzle
vi.mock('drizzle-orm/mysql2', () => ({
  drizzle: vi.fn(),
}));

describe('Database Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDb', () => {
    it('should return null when DATABASE_URL is not set', async () => {
      const originalUrl = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      const dbInstance = await db.getDb();

      expect(dbInstance).toBeNull();

      if (originalUrl) {
        process.env.DATABASE_URL = originalUrl;
      }
    });
  });

  describe('createBriefing', () => {
    it('should throw error when database is not available', async () => {
      vi.spyOn(db, 'getDb').mockResolvedValue(null);

      const briefingData: InsertBriefing = {
        date: new Date(),
        executiveSummary: 'Test',
      };

      await expect(db.createBriefing(briefingData)).rejects.toThrow('Database not available');
    });
  });

  describe('getAlertsByBriefingId', () => {
    it('should return empty array when database is not available', async () => {
      vi.spyOn(db, 'getDb').mockResolvedValue(null);

      const alerts = await db.getAlertsByBriefingId(1);

      expect(alerts).toEqual([]);
    });
  });

  describe('getAllRelationships', () => {
    it('should return empty array when database is not available', async () => {
      vi.spyOn(db, 'getDb').mockResolvedValue(null);

      const relationships = await db.getAllRelationships();

      expect(relationships).toEqual([]);
    });
  });
});
