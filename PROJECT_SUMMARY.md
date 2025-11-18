# 🚀 HTI Daily BD Intelligence Briefing

**System Status: ✅ 100% Operational**
**Version**: 1.2.1 (Production Ready)

## Overview

The HTI Daily Intelligence Briefing is an AI-powered business development platform. It aggregates data from Gmail, Google Calendar, and Limitless recordings to generate a daily strategic briefing. It uses a multi-LLM consensus engine (Claude, Gemini, Grok, Perplexity) to analyze opportunities and identify risks.

## Architecture (v1.2)

This system was recently refactored to a **Pipeline Architecture** with a **Repository Pattern** for data access.

### 1. The Briefing Pipeline
The monolithic generator has been broken down into testable domain services:
*   **`DataFetcher`**: Parallel fetching from MCP sources (Gmail, Calendar, Limitless).
*   **`AlertEngine`**: Generates Urgent, Important, and Strategic alerts based on rules + AI.
*   **`RelationshipManager`**: Tracks contact health scores and interaction trends.
*   **`InsightGenerator`**: Orchestrates the Multi-LLM consensus analysis and writes the Executive Summary.
*   **`BriefingOrchestrator`**: Coordinates the flow from data to insights.

### 2. Security & Hardening
*   **Prompt Injection Defense**: All user content is sanitized and wrapped in XML tags before being sent to LLMs. System prompts are strictly separated.
*   **PII Redaction**: The logging system (`winston`) automatically redacts sensitive fields (passwords, tokens, email bodies) from logs.
*   **Authentication**: Strict session checks are enforced on the frontend.
*   **Operational Resilience**: Critical failures in the cron job trigger notifications to the project owner.

### 3. Technology Stack
*   **Backend**: Node.js, Express, tRPC
*   **Database**: MySQL (TiDB compatible) via Drizzle ORM
*   **Frontend**: React, Vite, Tailwind CSS, Shadcn UI
*   **AI Integration**: Manus Forge API (proxies to Anthropic, Google, X.ai, Perplexity)

## Setup & Deployment

1.  **Environment**: Ensure `.env` is configured with `DATABASE_URL` and `FORGE_API_KEY`.
2.  **Database**: Run `npm run db:push` to apply schema.
3.  **Seed Data**: Run `npm run seed` to populate demo data.
4.  **Start**: `npm run start` (Production) or `npm run dev` (Development).

## Key Features

*   **Automated 8 AM Briefing**: Runs every weekday morning via `node-cron`.
*   **Smart Alerts**:
    *   *Response Urgency*: Flags emails >24h old.
    *   *Relationship Cooling*: Flags key contacts drifting away (>14 days).
    *   *Commitment Tracking*: Extracts promises from meeting transcripts.
*   **Multi-LLM Consensus**: Every strategic opportunity is debated by 4 AI models.
*   **Calendar Intelligence**: Prepares you for meetings with strategic context.

## Maintainers

*   **Lead Engineer**: Will Sigmon
*   **Repository**: https://github.com/willsigmon/dailybrief
