/**
 * Type definitions for MCP command responses
 */

/**
 * Gmail MCP Response Structure
 */
export interface GmailMCPMessage {
  id: string;
  threadId: string;
  internalDate: string;
  snippet?: string;
  pickedHeaders?: {
    from?: string;
    to?: string;
    subject?: string;
  };
  pickedPlainContent?: string;
  pickedMarkdownContent?: string;
}

export interface GmailMCPThread {
  messages: GmailMCPMessage[];
}

export interface GmailMCPResult {
  result?: {
    threads?: GmailMCPThread[];
  };
}

/**
 * Calendar MCP Response Structure
 */
export interface CalendarMCPAttendee {
  email: string;
  displayName?: string;
  responseStatus?: string;
}

export interface CalendarMCPDateTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

export interface CalendarMCPItem {
  id: string;
  summary: string;
  description?: string;
  start?: CalendarMCPDateTime;
  end?: CalendarMCPDateTime;
  location?: string;
  attendees?: CalendarMCPAttendee[];
}

export interface CalendarMCPResult {
  items?: CalendarMCPItem[];
}

/**
 * Limitless MCP Response Structure
 */
export interface LimitlessMCPLifelog {
  id: string;
  startTime: string;
  endTime: string;
  transcript?: string;
  participants?: string[];
}

export interface LimitlessMCPResult {
  lifelogs?: LimitlessMCPLifelog[];
}

/**
 * Union type for all MCP results
 */
export type MCPResult = GmailMCPResult | CalendarMCPResult | LimitlessMCPResult | null;
