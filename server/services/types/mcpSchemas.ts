/**
 * Zod schemas for runtime validation of MCP command responses
 */
import { z } from 'zod';

/**
 * Gmail MCP Response Schemas
 */
export const GmailMCPMessageSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  internalDate: z.string(),
  snippet: z.string().optional(),
  pickedHeaders: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    subject: z.string().optional(),
  }).optional(),
  pickedPlainContent: z.string().optional(),
  pickedMarkdownContent: z.string().optional(),
});

export const GmailMCPThreadSchema = z.object({
  messages: z.array(GmailMCPMessageSchema),
});

export const GmailMCPResultSchema = z.object({
  result: z.object({
    threads: z.array(GmailMCPThreadSchema).optional(),
  }).optional(),
});

/**
 * Calendar MCP Response Schemas
 */
export const CalendarMCPAttendeeSchema = z.object({
  email: z.string(),
  displayName: z.string().optional(),
  responseStatus: z.string().optional(),
});

export const CalendarMCPDateTimeSchema = z.object({
  dateTime: z.string().optional(),
  date: z.string().optional(),
  timeZone: z.string().optional(),
});

export const CalendarMCPItemSchema = z.object({
  id: z.string(),
  summary: z.string(),
  description: z.string().optional(),
  start: CalendarMCPDateTimeSchema.optional(),
  end: CalendarMCPDateTimeSchema.optional(),
  location: z.string().optional(),
  attendees: z.array(CalendarMCPAttendeeSchema).optional(),
});

export const CalendarMCPResultSchema = z.object({
  items: z.array(CalendarMCPItemSchema).optional(),
});

/**
 * Limitless MCP Response Schemas
 */
export const LimitlessMCPLifelogSchema = z.object({
  id: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  transcript: z.string().optional(),
  participants: z.array(z.string()).optional(),
});

export const LimitlessMCPResultSchema = z.object({
  lifelogs: z.array(LimitlessMCPLifelogSchema).optional(),
});

/**
 * Union schema for all MCP results (for runtime validation)
 */
export const MCPResultSchema = z.union([
  GmailMCPResultSchema,
  CalendarMCPResultSchema,
  LimitlessMCPResultSchema,
]);
