import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Daily briefings table - stores generated briefing data
 */
export const briefings = mysqlTable("briefings", {
  id: int("id").autoincrement().primaryKey(),
  date: timestamp("date").notNull(), // The date this briefing is for
  executiveSummary: text("executiveSummary"),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  dateIdx: index("briefings_date_idx").on(table.date),
}));

export type Briefing = typeof briefings.$inferSelect;
export type InsertBriefing = typeof briefings.$inferInsert;

/**
 * Smart alerts - actionable items extracted from briefing
 */
export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  briefingId: int("briefingId").notNull(),
  type: mysqlEnum("type", ["urgent", "important", "strategic"]).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // e.g., "response_urgency", "relationship_cooling"
  title: text("title").notNull(),
  description: text("description").notNull(),
  contactName: varchar("contactName", { length: 255 }),
  organization: varchar("organization", { length: 255 }),
  actionRequired: text("actionRequired"),
  deadline: timestamp("deadline"),
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  briefingIdIdx: index("alerts_briefingId_idx").on(table.briefingId),
  typeIdx: index("alerts_type_idx").on(table.type),
  completedIdx: index("alerts_completed_idx").on(table.completed),
  deadlineIdx: index("alerts_deadline_idx").on(table.deadline),
}));

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

/**
 * Relationships - track contacts and their engagement
 */
export const relationships = mysqlTable("relationships", {
  id: int("id").autoincrement().primaryKey(),
  contactName: varchar("contactName", { length: 255 }).notNull(),
  organization: varchar("organization", { length: 255 }),
  email: varchar("email", { length: 320 }),
  healthScore: int("healthScore").default(50), // 0-100
  trend: mysqlEnum("trend", ["up", "stable", "down", "new"]).default("stable").notNull(),
  lastInteraction: timestamp("lastInteraction"),
  lastInteractionType: varchar("lastInteractionType", { length: 100 }), // email, meeting, call
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  emailIdx: index("relationships_email_idx").on(table.email),
  healthScoreIdx: index("relationships_healthScore_idx").on(table.healthScore),
  lastInteractionIdx: index("relationships_lastInteraction_idx").on(table.lastInteraction),
}));

export type Relationship = typeof relationships.$inferSelect;
export type InsertRelationship = typeof relationships.$inferInsert;

/**
 * Calendar events - upcoming meetings and events
 */
export const calendarEvents = mysqlTable("calendarEvents", {
  id: int("id").autoincrement().primaryKey(),
  briefingId: int("briefingId").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  location: text("location"),
  attendees: text("attendees"), // JSON array of email addresses
  eventType: varchar("eventType", { length: 100 }), // meeting, networking, event
  strategicValue: text("strategicValue"),
  preparationNeeded: text("preparationNeeded"),
}, (table) => ({
  briefingIdIdx: index("calendarEvents_briefingId_idx").on(table.briefingId),
  startTimeIdx: index("calendarEvents_startTime_idx").on(table.startTime),
}));

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = typeof calendarEvents.$inferInsert;

/**
 * LLM analyses - store multi-model consensus results
 */
export const llmAnalyses = mysqlTable("llmAnalyses", {
  id: int("id").autoincrement().primaryKey(),
  briefingId: int("briefingId").notNull(),
  topic: text("topic").notNull(), // What was analyzed
  claudeAnalysis: text("claudeAnalysis"),
  geminiAnalysis: text("geminiAnalysis"),
  grokAnalysis: text("grokAnalysis"),
  perplexityAnalysis: text("perplexityAnalysis"),
  consensus: text("consensus"), // Summary of agreement
  dissent: text("dissent"), // Summary of disagreements
  recommendation: text("recommendation"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  briefingIdIdx: index("llmAnalyses_briefingId_idx").on(table.briefingId),
}));

export type LlmAnalysis = typeof llmAnalyses.$inferSelect;
export type InsertLlmAnalysis = typeof llmAnalyses.$inferInsert;
