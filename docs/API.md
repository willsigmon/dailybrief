# HTI Daily Briefing API Documentation

## Overview

The HTI Daily Briefing API is built with tRPC and provides endpoints for managing daily briefings, alerts, relationships, and generating new briefings.

## Base URL

- Development: `http://localhost:3000/api/trpc`
- Production: `https://your-domain.com/api/trpc`

## Authentication

All endpoints require authentication via session cookie. The session is established through OAuth flow.

## Endpoints

### System

#### `system.ping`
Health check endpoint.

**Query:**
```typescript
system.ping.query()
```

**Response:**
```typescript
{ pong: true }
```

---

### Authentication

#### `auth.me`
Get current authenticated user.

**Query:**
```typescript
auth.me.query()
```

**Response:**
```typescript
{
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  role: 'user' | 'admin';
}
```

#### `auth.logout`
Log out current user.

**Mutation:**
```typescript
auth.logout.mutation()
```

**Response:**
```typescript
{ success: true }
```

---

### Briefings

#### `briefing.getLatest`
Get the latest briefing with all related data (alerts, calendar events, LLM analyses).

**Query:**
```typescript
briefing.getLatest.query()
```

**Response:**
```typescript
{
  briefing: {
    id: number;
    date: Date;
    executiveSummary: string | null;
    generatedAt: Date;
    updatedAt: Date;
  };
  alerts: Array<{
    id: number;
    briefingId: number;
    type: 'urgent' | 'important' | 'strategic';
    category: string;
    title: string;
    description: string;
    contactName: string | null;
    organization: string | null;
    actionRequired: string | null;
    deadline: Date | null;
    completed: boolean;
    completedAt: Date | null;
    createdAt: Date;
  }>;
  calendarEvents: Array<{
    id: number;
    briefingId: number;
    title: string;
    description: string | null;
    startTime: Date;
    endTime: Date;
    location: string | null;
    attendees: string | null; // JSON string
    strategicValue: string | null;
    preparationNeeded: string | null;
  }>;
  llmAnalyses: Array<{
    id: number;
    briefingId: number;
    topic: string;
    claudeAnalysis: string | null;
    geminiAnalysis: string | null;
    grokAnalysis: string | null;
    perplexityAnalysis: string | null;
    consensus: string | null;
    dissent: string | null;
    recommendation: string | null;
    createdAt: Date;
  }>;
} | null
```

#### `briefing.getById`
Get a specific briefing by ID.

**Query:**
```typescript
briefing.getById.query({ id: number })
```

**Response:** Same as `briefing.getLatest`

#### `briefing.toggleAlert`
Mark an alert as complete or incomplete.

**Mutation:**
```typescript
briefing.toggleAlert.mutate({
  id: number;
  completed: boolean;
})
```

**Response:**
```typescript
{ success: true }
```

---

### Relationships

#### `relationships.getAll`
Get all relationship records.

**Query:**
```typescript
relationships.getAll.query()
```

**Response:**
```typescript
Array<{
  id: number;
  contactName: string;
  organization: string | null;
  email: string | null;
  healthScore: number;
  trend: 'up' | 'down' | 'stable' | 'new';
  lastInteraction: Date | null;
  lastInteractionType: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}>
```

---

### Generation

#### `generate.dailyBriefing`
Generate a new daily briefing.

**Rate Limit:** 5 requests per hour per IP

**Mutation:**
```typescript
generate.dailyBriefing.mutate({
  sessionId?: string; // Optional: for progress tracking
})
```

**Response:**
```typescript
{
  success: true;
  briefingId: number;
  sessionId?: string;
}
```

**Error Responses:**
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Generation failed

#### `generate.refreshBriefing`
Refresh an existing briefing with latest data.

**Mutation:**
```typescript
generate.refreshBriefing.mutate({
  briefingId: number;
})
```

**Response:**
```typescript
{
  success: true;
  briefingId: number; // New briefing ID
}
```

---

## Progress Tracking

### Server-Sent Events (SSE)

Progress updates are available via SSE endpoint:

**Endpoint:** `/api/progress/:sessionId`

**Usage:**
```javascript
const eventSource = new EventSource(`/api/progress/${sessionId}`);
eventSource.onmessage = (event) => {
  const progress = JSON.parse(event.data);
  console.log(progress.step, progress.progress, progress.message);
};
```

**Progress Events:**
```typescript
{
  step: 'fetching' | 'data-fetched' | 'generating-alerts' | 'alerts-generated' |
        'processing-relationships' | 'generating-summary' | 'complete';
  progress: number; // 0-100
  message: string;
  completed?: boolean;
  error?: string;
}
```

---

## Rate Limits

- **API Endpoints**: 100 requests per 15 minutes per IP
- **Briefing Generation**: 5 requests per hour per IP
- **LLM API Calls**: 20 requests per minute (internal)

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: When the rate limit resets (ISO timestamp)

---

## Health & Metrics

### Health Check

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600
}
```

### Metrics (Prometheus Format)

**Endpoint:** `GET /metrics`

Returns Prometheus-formatted metrics including:
- `counter_briefing_generation_total`
- `histogram_briefing_generation_duration_ms`
- `counter_llm_calls_total`
- `histogram_llm_call_duration_ms`
- `counter_mcp_calls_total`
- `counter_cache_operations_total`

---

## Error Handling

All errors follow this format:

```typescript
{
  error: string;
  message: string;
  code?: string;
}
```

Common error codes:
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `UNAUTHORIZED`: Authentication required
- `NOT_FOUND`: Resource not found
- `INTERNAL_ERROR`: Server error

---

## Examples

### Generate Briefing with Progress Tracking

```typescript
// Start generation
const result = await trpc.generate.dailyBriefing.mutate({
  sessionId: 'my-session-123'
});

// Track progress
const eventSource = new EventSource(`/api/progress/${result.sessionId}`);
eventSource.onmessage = (event) => {
  const progress = JSON.parse(event.data);
  updateProgressBar(progress.progress);

  if (progress.completed) {
    eventSource.close();
    loadBriefing(result.briefingId);
  }
};
```

### Get Latest Briefing

```typescript
const briefing = await trpc.briefing.getLatest.query();

if (briefing) {
  console.log(`Found ${briefing.alerts.length} alerts`);
  console.log(`Executive Summary: ${briefing.briefing.executiveSummary}`);
}
```

### Mark Alert as Complete

```typescript
await trpc.briefing.toggleAlert.mutate({
  id: 123,
  completed: true
});
```

---

## TypeScript Types

All types are exported from the tRPC router:

```typescript
import type { AppRouter } from './server/routers';

type Briefing = RouterOutputs['briefing']['getLatest'];
type Alert = Briefing['alerts'][0];
```

---

## Notes

- All timestamps are in ISO 8601 format
- All text fields support markdown formatting
- Calendar event attendees are stored as JSON string arrays
- LLM analyses include confidence scores and model agreement metrics
