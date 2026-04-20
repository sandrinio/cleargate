---
story_id: STORY-004-01
parent_epic_ref: EPIC-004
status: Draft
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-003_MCP_Adapter.md
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-17T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
depends_on:
  - STORY-003-02
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:44:53.356Z
push_version: 2
---

# STORY-004-01: Admin JWT Scope + Middleware

**Complexity:** L2.

## 1. The Spec
Middleware that enforces `role=admin` on every `/admin-api/v1/*` route. On 403, writes audit row with `error_code=admin_required`.

### Detailed Requirements
- Admin JWT issued via `POST /admin-api/v1/auth/exchange` (session cookie → admin JWT)
- Non-admin JWT → 403 (never 401, since the JWT is valid, just wrong role)

## 2. Acceptance
```gherkin
Scenario: Admin passes
  Given JWT with role=admin
  When GET /admin-api/v1/projects
  Then status 200

Scenario: User rejected
  Given JWT with role=user
  When GET /admin-api/v1/projects
  Then status 403; audit row logged
```

## 3. Implementation
- `mcp/src/auth/admin-middleware.ts`
- `mcp/src/admin-api/auth-exchange.ts` — session → admin JWT route

## Ambiguity Gate
🟢.
