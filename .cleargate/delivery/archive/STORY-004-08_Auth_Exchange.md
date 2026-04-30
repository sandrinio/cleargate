---
story_id: STORY-004-08
parent_epic_ref: EPIC-004
status: Completed
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-003_MCP_Adapter.md, EPIC-006 §6.4, SPRINT-03 deferral
sprint_id: SPRINT-04
created_at: 2026-04-18T18:00:00Z
updated_at: 2026-04-18T18:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
depends_on:
  - STORY-004-01
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:45:05.023Z
push_version: 2
---

# STORY-004-08: `POST /admin-api/v1/auth/exchange` (Session → Admin JWT)

**Complexity:** L2 — one route, one handler, reuses existing admin-JWT issuance; no new schema.

## 1. The Spec

Server-side exchange endpoint consumed by the Admin UI (EPIC-006 STORY-006-02) after the user completes GitHub OAuth. Accepts the session cookie set by `@auth/sveltekit`, resolves it to an `admin_user`, and mints a short-lived admin JWT that the UI then attaches to every `/admin-api/v1/*` request.

This is the SPRINT-02 deferral called out in EPIC-006 §6.4 and SPRINT-03 Risks row 3 ("Admin JWT acquisition path"). CLI and UI now have distinct admin-JWT acquisition paths: UI uses this exchange route; CLI uses env-var + file (SPRINT-03) with `cleargate-admin login` arriving in STORY-005-06.

### Detailed Requirements
- Route path: `POST /admin-api/v1/auth/exchange` — **no admin JWT required**; the session cookie *is* the credential. Rate-limited via the anonymous bucket registered in STORY-003-13.
- Request: no body; reads `cg_session` cookie (HttpOnly, Secure, SameSite=Lax) — name must match what `admin/src/hooks.server.ts` writes.
- Session lookup: read session JSON from Redis key `cg_session:<cookie_value>` (adapter owned by STORY-006-02; MCP only reads the same format). Session JSON contains `{ github_handle, github_user_id, expires_at }`.
- Authorization: verify `github_handle` exists in `admin_users` and row's `disabled_at IS NULL`. If not, 403 `not_authorized` (no admin JWT issued).
- Expiry: if session row is missing or `expires_at <= now()`, 401 `session_expired`.
- Success response: `{ admin_token, expires_at }` where `admin_token` is a 15-min JWT with `role=admin`, `admin_user_id`, and `is_root` claims. Reuse `issueAdminToken()` from STORY-004-01 — do not duplicate signing.
- Cookie touch: on successful exchange, bump Redis TTL on `cg_session:<cookie_value>` by 15 min (sliding session). Do not rotate the cookie value.
- Audit: write `audit_log` row with `tool_name="auth.exchange"`, `admin_user_id`, `project_id=NULL`. Do not log cookie value.

## 2. Acceptance

```gherkin
Scenario: Valid session exchanges for admin JWT
  Given admin_users has my github_handle and disabled_at IS NULL
  And a valid cg_session cookie resolves to my handle in Redis
  When POST /admin-api/v1/auth/exchange
  Then response is 200 with { admin_token, expires_at }
  And admin_token verifies against JWT_SECRET with role=admin and my admin_user_id
  And exp is ~15 minutes from now
  And Redis TTL on cg_session:<cookie> is extended

Scenario: Non-admin GitHub user rejected
  Given a cg_session cookie for a GitHub handle NOT in admin_users
  When POST /admin-api/v1/auth/exchange
  Then response is 403 with { error: "not_authorized" }
  And no admin JWT is minted
  And no audit row is written (per audit-row-on-success-only convention)

Scenario: Disabled admin rejected
  Given admin_users has my handle but disabled_at IS NOT NULL
  When POST /admin-api/v1/auth/exchange
  Then response is 403 with { error: "not_authorized" }

Scenario: Missing or expired session
  When POST /admin-api/v1/auth/exchange with no cookie OR with a cookie whose Redis entry is gone
  Then response is 401 with { error: "session_expired" }

Scenario: Rate limited
  When POST /admin-api/v1/auth/exchange is hit more than the anonymous bucket allows within the window
  Then response is 429

Scenario: Audit row on success
  After a successful exchange
  Then audit_log has a row with tool_name="auth.exchange", admin_user_id=<my id>, project_id IS NULL
```

## 3. Implementation

- `mcp/src/admin-api/auth-exchange.ts` — Fastify route handler
- `mcp/src/admin-api/auth-exchange.test.ts` — integration test against real Postgres 18 + Redis 8 (same pattern as SPRINT-02's admin-api tests)
- Register route in `mcp/src/admin-api/index.ts` under `/admin-api/v1/auth/exchange`; explicitly opt out of the admin-JWT middleware on this path (the session cookie is the credential)
- Reuse `issueAdminToken()` from `mcp/src/auth/admin-jwt.ts` (STORY-004-01) — do not call JWT libs directly
- Session-cookie name + Redis key shape must match STORY-006-02's adapter; cross-reference that story's decisions at implementation time. Default cookie name: `cg_session`; Redis key: `cg_session:<value>`.

## 4. Quality Gates

- Integration test covers all six scenarios above.
- No cookie value ever appears in pino output (response-logger strip already covers `cookie` header; assert in test).
- `docker build ./mcp` still succeeds; bundle delta < 5 KB.
- Snapshot-drift test (`cleargate-cli/src/admin-api/__tests__/snapshot-drift.test.ts` from SPRINT-03) updated to include the new endpoint's request/response shape.

## 5. Open questions

1. **Cookie name + Redis key shape.** MCP reads keys written by the UI's Redis adapter (STORY-006-02). Architect W1 (or W2) pins the exact shape; if STORY-006-02 ships first, follow its convention verbatim.
2. **Rate-limit bucket.** Anonymous bucket from STORY-003-13 is `10 req / 15 min per IP` — tight for production UI login bursts. Consider a per-cookie-value secondary bucket if we see false positives during QA. Decide at M2.

## Ambiguity Gate

🟢 — architecture locked in EPIC-006 §6.4; storage shape owned by STORY-006-02; admin-JWT issuance already exists.
