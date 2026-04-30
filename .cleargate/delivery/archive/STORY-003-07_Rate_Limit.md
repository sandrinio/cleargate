---
story_id: STORY-003-07
parent_epic_ref: EPIC-003
status: Abandoned
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-003_MCP_Adapter.md
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-17T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:44:47.380Z
push_version: 2
---

# STORY-003-07: Rate-Limit Middleware (Redis Sliding Window)

**Complexity:** L2.

## 1. The Spec
Fastify preHandler hook that enforces per-role rate limits via Redis sliding window. Returns 429 with `Retry-After` header on breach.

### Detailed Requirements
- Key: `rl:{token_id}:{window_start_minute}` (INCR with EX)
- Limits: `RATE_LIMIT_USER_PER_MIN` / `RATE_LIMIT_SERVICE_PER_MIN` / `RATE_LIMIT_ADMIN_PER_MIN`
- Sliding window: count over last 60s
- Exempt: `/health`, `/auth/refresh` uses a separate anti-abuse limiter

## 2. Acceptance
```gherkin
Scenario: Under limit passes
  Given user token with 60/min limit, 10 requests sent
  When 11th request arrives
  Then status is not 429

Scenario: Over limit returns 429
  When 61 requests arrive within 60s
  Then the 61st returns 429 with Retry-After header
```

## 3. Implementation
- `mcp/src/middleware/rate-limit.ts`

## 4. Quality Gates
- Unit with mocked Redis; integration against real Redis

## Ambiguity Gate
🟢.
