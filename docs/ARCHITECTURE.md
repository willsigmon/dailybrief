# HTI Daily Briefing - System Architecture

## Overview

The HTI Daily Briefing is a full-stack application that generates AI-powered business development intelligence briefings from email, calendar, and conversation data.

## Architecture Diagram

```
┌─────────────────┐
│   React Client  │
│   (Frontend)    │
└────────┬────────┘
         │ HTTP/SSE
         │
┌────────▼─────────────────────────────────────┐
│         Express Server                        │
│  ┌─────────────────────────────────────────┐ │
│  │  tRPC API Router                         │ │
│  │  - Briefing endpoints                   │ │
│  │  - Relationship endpoints              │ │
│  │  - Generation endpoints                │ │
│  └─────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────┐ │
│  │  Services Layer                         │ │
│  │  - BriefingGenerator                    │ │
│  │  - AlertsGenerator                     │ │
│  │  - LLMAnalysis                         │ │
│  │  - MCPIntegration                      │ │
│  │  - PatternRecognition                  │ │
│  │  - CommitmentExtractor                 │ │
│  └─────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────┐ │
│  │  Core Infrastructure                   │ │
│  │  - Retry Logic                         │ │
│  │  - Circuit Breaker                     │ │
│  │  - Caching Layer                       │ │
│  │  - Rate Limiting                       │ │
│  │  - Structured Logging                  │ │
│  │  - Metrics Collection                  │ │
│  └─────────────────────────────────────────┘ │
└────────┬──────────────────────────────────────┘
         │
    ┌────┴────┬──────────┬──────────────┐
    │         │          │              │
┌───▼───┐ ┌──▼────┐ ┌───▼────┐ ┌──────▼────┐
│ MySQL │ │ LLM  │ │  MCP   │ │ Scheduled │
│  DB   │ │ APIs │ │  CLI   │ │   Tasks   │
└───────┘ └──────┘ └────────┘ └───────────┘
```

## Component Overview

### Frontend (React 19)

**Location:** `client/src/`

**Key Components:**
- `Dashboard.tsx` - Main briefing display
- `BriefingProgressBar.tsx` - Real-time progress tracking
- `GenerateBriefingButton.tsx` - Manual generation trigger
- `DashboardLayout.tsx` - Layout wrapper

**State Management:**
- TanStack Query for server state
- tRPC for type-safe API calls
- React Context for theme/auth

### Backend (Express + tRPC)

**Location:** `server/`

#### API Layer (`server/routers.ts`)
- tRPC procedures for all endpoints
- Type-safe request/response handling
- Rate limiting integration

#### Services Layer (`server/services/`)

**BriefingGenerator** (`briefingGenerator.ts`)
- Orchestrates entire briefing generation flow
- Coordinates data fetching, alert generation, LLM analysis
- Tracks progress via SSE

**AlertsGenerator** (`alertsGenerator.ts`)
- Generates response urgency alerts
- Detects relationship cooling
- Creates calendar preparation alerts
- Identifies strategic opportunities
- Deduplicates similar alerts

**LLMAnalysis** (`llmAnalysis.ts`)
- Multi-model analysis (Claude, Gemini, Grok, Perplexity)
- Consensus aggregation with weighted voting
- Confidence score calculation
- Model agreement tracking

**MCPIntegration** (`mcpIntegration.ts`)
- Fetches Gmail messages
- Retrieves calendar events
- Gets Limitless recordings
- Extracts contact information
- Calculates relationship health scores

**PatternRecognition** (`patternRecognition.ts`)
- Email activity analysis
- Communication frequency patterns
- Topic clustering
- Response time trend detection

**CommitmentExtractor** (`commitmentExtractor.ts`)
- Extracts commitments from transcripts
- Parses deadlines and responsible parties
- Filters upcoming commitments

**ConnectionFinder** (`connectionFinder.ts`)
- Finds shared email domains
- Detects topic similarities
- Identifies organizational relationships

**OpportunityScorer** (`opportunityScorer.ts`)
- Multi-factor scoring algorithm
- Prioritizes strategic opportunities
- Sorts alerts by score

**CalendarIntelligence** (`calendarIntelligence.ts`)
- Assesses strategic value of events
- Generates preparation notes
- Provides talking points

**EmailActivityAnalyzer** (`emailActivityAnalyzer.ts`)
- Calculates email statistics
- Tracks response times
- Generates activity summaries

#### Core Infrastructure (`server/_core/`)

**Retry Logic** (`retry.ts`)
- Exponential backoff
- Configurable retry counts
- Retryable error detection

**Circuit Breaker** (`circuitBreaker.ts`)
- Prevents cascade failures
- Automatic recovery
- State management (closed/open/half-open)

**Caching** (`cache.ts`)
- In-memory cache with TTL
- Cache invalidation
- Hit/miss tracking

**Rate Limiting** (`rateLimiter.ts`)
- Per-IP rate limiting
- Multiple limiters for different endpoints
- Rate limit headers

**Logging** (`logger.ts`)
- Winston-based structured logging
- Request ID tracking
- Performance metrics
- File rotation

**Metrics** (`metrics.ts`)
- Prometheus-format metrics
- Counter, gauge, histogram support
- `/metrics` endpoint

**Security** (`security.ts`)
- Security headers (CSP, HSTS, etc.)
- Input sanitization
- XSS prevention

**Database** (`db.ts`)
- Drizzle ORM integration
- Connection pooling
- Batch operations
- Type-safe queries

### Data Flow

#### Briefing Generation Flow

1. **Trigger**: User clicks "Generate Briefing" or scheduled task runs
2. **Data Fetching**: Parallel fetch from Gmail, Calendar, Limitless (with caching)
3. **Alert Generation**:
   - Response urgency detection
   - Relationship cooling alerts
   - Calendar preparation alerts
   - Strategic opportunity detection
   - Commitment extraction
   - Deduplication
4. **Relationship Processing**:
   - Contact extraction
   - Health score calculation (cached)
   - Trend analysis
   - Batch upsert
5. **Pattern Recognition**:
   - Email activity analysis
   - Topic clustering
   - Connection detection
6. **Calendar Enhancement**:
   - Strategic value assessment (LLM)
   - Preparation notes generation
7. **LLM Analysis**:
   - Multi-model analysis on top opportunities
   - Consensus generation
   - Confidence scoring
8. **Executive Summary**:
   - LLM-generated summary
   - Includes email activity insights
9. **Storage**: Batch inserts for alerts, relationships, calendar events

#### Progress Tracking

- Server-Sent Events (SSE) for real-time updates
- Progress tracker emits events at each step
- Frontend subscribes to progress stream
- Updates progress bar and status messages

### Database Schema

**Tables:**
- `users` - User accounts
- `briefings` - Daily briefing records
- `alerts` - Actionable items (indexed by briefingId, type, completed, deadline)
- `relationships` - Contact tracking (indexed by email, healthScore, lastInteraction)
- `calendarEvents` - Upcoming events (indexed by briefingId, startTime)
- `llmAnalyses` - Multi-model analysis results (indexed by briefingId)

**Indexes:**
- All foreign keys indexed
- Frequently queried fields indexed
- Composite indexes where beneficial

### External Integrations

#### MCP (Model Context Protocol)
- Gmail integration via `manus-mcp-cli`
- Google Calendar integration
- Limitless recording integration
- Graceful degradation when unavailable

#### LLM APIs
- Claude (via Forge API)
- Gemini 2.5 Pro
- Grok 4
- Perplexity Sonar Pro
- All with retry logic and circuit breakers

### Scheduled Tasks

**Daily Briefing Generation**
- Runs at 8 AM weekdays (America/New_York)
- Uses `node-cron` for scheduling
- Includes error recovery and retry logic
- Logs results for monitoring

### Security

- Rate limiting on all endpoints
- Security headers (CSP, HSTS, etc.)
- Input sanitization
- Session-based authentication
- SQL injection prevention (Drizzle ORM)

### Performance Optimizations

- Database connection pooling
- Batch insert operations
- Caching layer (relationships, MCP data)
- Database indexes on key fields
- Parallel data fetching
- Efficient alert deduplication

### Monitoring & Observability

- Structured logging with Winston
- Performance metrics collection
- Prometheus metrics endpoint
- Health check endpoint
- Request ID tracking
- Error aggregation

### Error Handling

- Retry logic with exponential backoff
- Circuit breakers for external APIs
- Graceful degradation
- Comprehensive error logging
- User-friendly error messages

### Scalability Considerations

- Stateless API design
- Horizontal scaling ready
- Database connection pooling
- Caching reduces load
- Batch operations minimize queries
- Rate limiting prevents abuse

## Deployment

### Environment Variables

Required:
- `DATABASE_URL` - MySQL connection string
- `FORGE_API_KEY` - LLM API key
- `COOKIE_SECRET` - Session encryption key

Optional:
- `GEMINI_API_KEY` - Gemini API key
- `XAI_API_KEY` - Grok API key
- `SONAR_API_KEY` - Perplexity API key
- `USE_MCP_CLI` - Enable/disable MCP CLI (default: enabled)
- `LOG_LEVEL` - Logging level (default: info)
- `DB_POOL_SIZE` - Database pool size (default: 10)

### Build & Run

```bash
# Development
pnpm install
pnpm dev

# Production
pnpm build
pnpm start
```

### Database Migrations

```bash
pnpm db:push
```

## Future Enhancements

- Redis for distributed caching
- WebSocket for real-time updates
- GraphQL API option
- Advanced ML models for pattern detection
- Email notifications for critical alerts
- Mobile app support
