---
story_id: STORY-003-11
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
pushed_at: 2026-04-20T19:45:03.028Z
push_version: 2
---

# STORY-003-11: First-Admin Bootstrap + Dev-Issue-Token Script

**Complexity:** L2.

## 1. The Spec

### 1.1 Server-side bootstrap
On first server boot against an empty `admin_users` table, if `CLEARGATE_ADMIN_BOOTSTRAP_GH_USER` is set, create the seed admin with `is_root=true`. Use a Postgres advisory lock so concurrent instances don't duplicate.

### 1.2 Dev-only token issuance script
Without the Admin UI (EPIC-006) or Admin CLI (EPIC-005), SPRINT-01 has no happy-path way to mint the first refresh token for manual testing. This Story also ships a **dev-only** helper: `mcp/scripts/dev-issue-token.ts`. It is NEVER imported by `server.ts` and NEVER runs in production.

### Detailed Requirements
**Bootstrap:**
- Idempotent: if admin exists, no-op
- If env var missing AND table empty → log WARNING at boot, continue
- Advisory lock key = hash("cleargate:bootstrap")

**dev-issue-token script:**
- Reads `DATABASE_URL` + `JWT_SIGNING_KEY` from env
- Upserts: admin user (from bootstrap env), project ("dev-project"), member (user role), refresh token row (bcrypt hash in DB)
- Prints the plaintext refresh token once to stdout, with a "SAVE NOW — shown only here" warning
- Exits. No server process started.
- Invoked by `npm run dev:issue-token` (script added to package.json)
- Lives in `mcp/scripts/` so it's never bundled into `dist/`

## 2. Acceptance
```gherkin
Scenario: First boot with env var
  Given empty admin_users + CLEARGATE_ADMIN_BOOTSTRAP_GH_USER=ssuladze
  When server boots
  Then admin_users has one row: github_handle=ssuladze, is_root=true

Scenario: Second boot no-ops
  Given admin_users already has a row
  When server boots again
  Then admin_users unchanged

Scenario: Concurrent boots produce one admin
  Given two instances boot simultaneously against empty DB
  Then exactly one admin_users row exists

Scenario: Dev-issue-token produces a working refresh token
  Given the bootstrap admin exists
  When I run `npm run dev:issue-token`
  Then stdout contains a plaintext refresh token and a warning
  And that token exchanges successfully at POST /auth/refresh for an access JWT
  And the access JWT authenticates a push_item call end-to-end
```

## 3. Implementation
- `mcp/scripts/bootstrap-admin.ts` — invoked from `server.ts` at startup
- `mcp/scripts/dev-issue-token.ts` — standalone dev helper, never imported by server
- `mcp/package.json` — add `"dev:issue-token": "tsx --env-file=.env scripts/dev-issue-token.ts"` script

## 4. Quality Gates
- Integration: two parallel Node processes racing → one admin row
- Idempotency test on bootstrap
- Manual smoke: `npm run dev:issue-token` → token usable in a `push_item` call

## Ambiguity Gate
🟢 — per EPIC-003 Q9, plus dev-script added to close the SPRINT-01 bootstrap-token gap.
