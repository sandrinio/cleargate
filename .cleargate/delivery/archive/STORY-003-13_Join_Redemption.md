---
story_id: STORY-003-13
parent_epic_ref: EPIC-003
status: Completed
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-003_MCP_Adapter.md
sprint_id: SPRINT-03
shipped_commit: e3c2550
completed_at: 2026-04-18T14:00:00Z
created_at: 2026-04-18T00:00:00Z
updated_at: 2026-04-18T18:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
depends_on:
  - STORY-003-02
  - STORY-004-07
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:43:55.389Z
push_version: 3
---

# STORY-003-13: `POST /join/:invite_token` Redemption Endpoint

**Complexity:** L2 — one route, one integration test file, reuses existing JWT issuance + invite storage.

## 1. The Spec

Public MCP-side route (no auth) that redeems an opaque invite token from the `invites` Postgres table (see STORY-004-07), mints a refresh token via the existing STORY-003-02 issuance path, and returns it with the member's project context. **Postgres is the source of truth — no Redis in the redemption path.**

### Detailed Requirements
- Route path: `POST /join/:invite_token` (public; not under `/admin-api/v1`; rate-limited via the anonymous bucket)
- Atomic one-time redemption via a single SQL statement:
  ```sql
  UPDATE invites
     SET consumed_at = now()
   WHERE id = $1
     AND consumed_at IS NULL
     AND expires_at > now()
  RETURNING member_id, project_id
  ```
  - 0 rows returned → distinguish 404 vs 410 with a second cheap query:
    - `SELECT consumed_at, expires_at FROM invites WHERE id = $1` — if no row → 404; if row with `consumed_at IS NOT NULL` → 410 "already consumed"; if `expires_at <= now()` → 410 "expired"
  - 1 row returned → proceed to mint refresh token
- On successful redemption:
  - `JOIN` projects + members to fetch `project_name` and `member_role` (single query, not N+1)
  - Mint refresh token via `issueRefreshToken(member_id)` from `mcp/src/auth/issue.ts` (STORY-003-02) — **do not duplicate JWT minting logic**
  - Return `{ refresh_token, project_id, project_name, member_role }`
- Response never includes the invite token; refresh token is the only secret in the body
- Logged through existing audit middleware (STORY-003-09) with `tool_name = "join"` so redemptions are traceable; request body is never logged (middleware already excludes bodies)
- Rate-limit: anonymous bucket (stricter than user-role) to prevent invite-token brute-forcing

## 2. Acceptance

```gherkin
Scenario: Valid redemption
  Given a pending invite for member M in project P (expires_at > now(), consumed_at IS NULL)
  When POST /join/<invite_token>
  Then response is 200 with {refresh_token, project_id, project_name, member_role}
  And invites.consumed_at is set to approximately now()
  And the refresh token exchanges successfully at POST /auth/refresh for an access JWT
  And that access JWT authenticates a subsequent push_item call

Scenario: Expired invite
  Given an invite issued 25h ago
  When POST /join/<invite_token>
  Then response is 410 with {error: "invite expired"}
  And no refresh token is issued

Scenario: Already consumed
  Given an invite that was redeemed successfully
  When POST /join/<invite_token> a second time
  Then response is 410 with {error: "invite already consumed"}
  And no new refresh token is issued

Scenario: Unknown token
  When POST /join/deadbeef-not-a-real-token
  Then response is 404

Scenario: Concurrent redemptions produce one refresh token
  Given two requests hit POST /join/<invite_token> simultaneously
  Then exactly one returns 200 with a refresh token
  And the other returns 410 (already consumed)

Scenario: Audit row written
  After a successful redemption
  Then audit_log has a row with tool_name="join", project_id=<P>, member_id=<M>
```

## 3. Implementation

- `mcp/src/routes/join.ts` — Fastify route handler
- `mcp/src/routes/join.test.ts` — integration tests (real Postgres 18 + Redis 8, matching existing `mcp/src/admin-api/*.test.ts` pattern)
- Register route in `mcp/src/server.ts` alongside the MCP transport mount point — it's not an MCP tool, it's a plain HTTP route
- Reuse `issueRefreshToken()` from `mcp/src/auth/issue.ts`; do not call JWT libs directly

## 4. Quality Gates

- Integration test for all five scenarios above against real Postgres + Redis
- Concurrent-redemption test uses two parallel `fetch()` calls — verify exactly one 200, one 410 (same pattern as STORY-003-11 concurrent-boot test)
- Rate-limit test: 429 after anonymous-bucket cap within the window
- `docker build ./mcp` still succeeds; image size delta < 5 KB

## 5. Open questions

1. **Anonymous rate-limit bucket exists?** STORY-003-07 defined per-role buckets (user, admin). Check whether an anonymous/unauthenticated bucket was registered; if not, add one in this Story (`anonymous: 10/min`) or gate `/join` behind a stricter override of the existing user bucket. Decide at implementation time by reading `mcp/src/middleware/rate-limit.ts`.

## Ambiguity Gate

🟢 — EPIC-005 §6.5 resolved the endpoint contract; STORY-004-07 pinned the storage shape (Postgres source-of-truth); this Story implements the route. Only remaining decision is the rate-limit bucket registration path.
