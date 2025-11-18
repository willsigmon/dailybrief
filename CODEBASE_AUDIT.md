# Codebase Audit & Action Plan

## Executive Summary

This codebase is a solid prototype but exhibits signs of "organic growth" that will impede scalability and maintenance. The architecture relies heavily on procedural "god functions" (specifically in briefing generation) and mixes infrastructure concerns with business logic.

**Severity:** Moderate.
**Immediate Risk:** Database connection handling was fragile (fixed).
**Long-term Risk:** The `generateDailyBriefing` function is untestable and will become a bug farm as logic complexity grows.

## 1. Critical Architecture Issues

### A. The "God Function" (`server/services/briefingGenerator.ts`)
The `generateDailyBriefing` function is ~450 lines of procedural code handling:
1.  Data Fetching (API calls)
2.  Business Logic (Alert generation, deduplication)
3.  Persistence (DB writes)
4.  AI Orchestration (LLM calls)

**Recommendation:** Refactor into a `BriefingPipeline` class with distinct steps (Pipe & Filter pattern). Each step (e.g., `DataFetcher`, `AlertAnalyzer`, `SummaryGenerator`) should be independently testable.

### B. Database Layer (`server/db.ts`)
*   **Issue:** Previously mixed connection pool management with query logic. It swallowed connection errors, leading to "silent failures" where the app would run but return empty data.
*   **Action:** I have refactored this to fail fast if `DATABASE_URL` is missing and use a cleaner Singleton pattern.
*   **Next Step:** Move the specific query functions (e.g., `getLatestBriefing`) into dedicated Repository files (e.g., `server/repositories/BriefingRepository.ts`).

### C. Project Hygiene
*   **Found:** `server/services/briefingGenerator.ts.tmp` (Deleted).
*   **Found:** `patches/wouter@3.7.1.patch`. Patching dependencies is a smell.
    *   **Recommendation:** Check if `wouter` has a newer version fixing this, or document *why* the patch exists in `README.md`.
*   **Environment:** `server/storage.ts` relies on `ENV` globals. This makes testing hard. Use dependency injection or a configuration object.

## 2. Security & Performance

*   **Rate Limiting:** You have basic rate limiting (`server/_core/rateLimiter.ts`), which is good.
*   **Logging:** You are logging PII (potentially) in debug logs. Ensure `gmailMessages` content isn't being dumped raw into logs in production.
*   **Prompt Injection:** You are concatenating user/email content directly into LLM prompts (`server/services/briefingGenerator.ts`).
    *   **Risk:** Malicious emails could manipulate the briefing summary.
    *   **Fix:** Sanitize inputs or use LLM providers' "system prompt" vs "user content" separation strictly.

## 3. Frontend (`client/`)

*   **Routing:** `wouter` is lightweight but less standard than `react-router`. If the app grows complex nested routes, this might become a pain point.
*   **Structure:** Good component separation. `trpc` integration is clean.

## 4. Proposed "Lead SWE" Roadmap

1.  **✅ Immediate Fixes:**
    *   Cleaned up `server/db.ts` (Done).
    *   Removed trash files (Done).

2.  **🚧 Refactor Briefing Generator:**
    *   Create `server/domain/briefing/steps/`.
    *   Move logic out of the big function.

3.  **🛡️ Hardening:**
    *   Add unit tests for `alertsGenerator.ts` (currently relies on integration tests or luck).
    *   Sanitize inputs for LLM.

4.  **Documentation:**
    *   Update `README.md` with specific setup instructions (the current `scripts` are good, but environment variable requirements need to be explicit).
