---
epic_id: EPIC-003
status: Completed
ambiguity: 🟢 Low
context_source: PROPOSAL-003_MCP_Adapter.md
owner: Vibe Coder (ssuladze@exadel.com)
target_date: 2026-04-18
completed_in_sprints:
  - SPRINT-01
  - SPRINT-03
completed_at: 2026-04-18T14:00:00Z
completion_notes: 12/13 stories shipped in SPRINT-01; STORY-003-13 (join redemption) closed in SPRINT-03.
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-18T18:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
resolved_at: 2026-04-17T00:00:00Z
resolved_by: Vibe Coder (ssuladze@exadel.com)
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:43:26.007Z
push_version: 3
children:
  - "[[STORY-003-01]]"
  - "[[STORY-003-02]]"
  - "[[STORY-003-03]]"
  - "[[STORY-003-04]]"
  - "[[STORY-003-05]]"
  - "[[STORY-003-06]]"
  - "[[STORY-003-07]]"
  - "[[STORY-003-08]]"
  - "[[STORY-003-09]]"
  - "[[STORY-003-10]]"
  - "[[STORY-003-11]]"
  - "[[STORY-003-12]]"
  - "[[STORY-003-13]]"
---

# EPIC-003: MCP Server Core

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Build the ClearGate MCP server: Fastify + @modelcontextprotocol/sdk over Streamable HTTP, backed by Postgres (Drizzle) and Redis, serving four tools (push_item / pull_item / list_items / sync_status) with versioned item storage, JWT bearer auth, multi-tenant by project, rate limit, idempotency, and audit log.</objective>
  <architecture_rules>
    <rule>No Chyro-specific code. MCP is generic — Chyro is just one client.</rule>
    <rule>No PM-tool adapters in v1 (deferred to v1.1). MCP is canonical store in v1.</rule>
    <rule>All storage writes scoped to project_id from JWT claims — never accept project_id from request body.</rule>
    <rule>Server timestamps items; client clocks are not trusted.</rule>
    <rule>Last 10 versions per item retained; older pruned.</rule>
    <rule>Token plaintext never persisted — bcrypt hashes only.</rule>
    <rule>Authorization header scrubbed from all log output via pino redaction.</rule>
  </architecture_rules>
  <target_files>
    <file path="mcp/src/db/schema.ts" action="create" />
    <file path="mcp/src/db/client.ts" action="create" />
    <file path="mcp/src/db/migrations/" action="create" />
    <file path="mcp/drizzle.config.ts" action="create" />
    <file path="mcp/src/redis/client.ts" action="create" />
    <file path="mcp/src/auth/jwt.ts" action="create" />
    <file path="mcp/src/auth/middleware.ts" action="create" />
    <file path="mcp/src/tools/push-item.ts" action="create" />
    <file path="mcp/src/tools/pull-item.ts" action="create" />
    <file path="mcp/src/tools/list-items.ts" action="create" />
    <file path="mcp/src/tools/sync-status.ts" action="create" />
    <file path="mcp/src/middleware/rate-limit.ts" action="create" />
    <file path="mcp/src/middleware/idempotency.ts" action="create" />
    <file path="mcp/src/middleware/audit.ts" action="create" />
    <file path="mcp/src/server.ts" action="modify" />
    <file path="mcp/scripts/bootstrap-admin.ts" action="create" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
Without a running MCP server, ClearGate has no backbone — Claude Code and Chyro cannot exchange work items. The MCP is the central hub holding the canonical state (in v1) and enforcing multi-tenant auth, conflict policy, and audit.

**Success Metrics (North Star):**
- A client can `push_item`, have it stored with version 1, `pull_item` and get the same payload.
- Two clients pushing the same `cleargate_id` concurrently produce version 2 (loser preserved in `item_versions`).
- Unauthorized requests are rejected with 401/403 and never write to the DB.
- Container starts in < 3 seconds on Coolify with `/health` returning 200.

## 2. Scope Boundaries

**✅ IN-SCOPE**
- [ ] Postgres schema + Drizzle migrations for all tables in PROPOSAL-003 §2.7
- [ ] JWT issue + verify + refresh endpoint
- [ ] Bearer JWT middleware that validates + attaches `{project_id, member_id, role, client_id}` to request
- [ ] Four MCP tools wired through `@modelcontextprotocol/sdk` Streamable HTTP transport
- [ ] Versioning on `push_item` (increment, archive to `item_versions`, prune to last 10)
- [ ] Last-write-wins conflict: server timestamp + row-level lock on `items`
- [ ] Rate-limit middleware (Redis sliding window, per-role limits)
- [ ] Idempotency middleware for `push_item` (24h Redis cache, keyed by sha256 of cleargate_id + payload)
- [ ] Audit middleware (one row per tool invocation, no payload content)
- [ ] First-admin bootstrap from `CLEARGATE_ADMIN_BOOTSTRAP_GH_USER` env var
- [ ] Dockerfile (already scaffolded — verify it builds)
- [ ] Local dev workflow: `docker compose up -d` + `npm run dev` works end-to-end

**❌ OUT-OF-SCOPE (explicitly deferred)**
- Admin API endpoints (projects / members / tokens CRUD) — that is EPIC-004
- Admin UI — that is EPIC-006
- Admin CLI (`cleargate-admin`) — that is EPIC-005
- Any PM-tool adapter (Linear, Jira, Azure DevOps)
- Webhook receiver
- OAuth 2.1 (bearer JWT only)
- MCP → client callbacks / Streamable HTTP GET streaming

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Performance | `push_item` + `pull_item` p95 < 100ms local, < 300ms over VPS |
| Security | JWT signing key min 32 chars; refused boot otherwise. Token plaintext never stored. Authorization header redacted from logs. |
| Versioning | Exactly last 10 versions retained per item. Pruning via trigger on `item_versions` insert. |
| Conflict | Last-write-wins by server `NOW()`. Postgres row-level lock on `items` serializes writes. |
| Multi-tenancy | Every query filters by `project_id`. No cross-project access ever possible. |
| Tooling version risk | MCP SDK API must be verified against the version installed at build time — my training may be stale. |

## 4. Technical Grounding

*(Populated from approved PROPOSAL-003.)*

**Affected files** (all new; `mcp/` already scaffolded):
- `mcp/src/db/schema.ts` — Drizzle schema (projects, members, clients, tokens, items, item_versions, audit_log, admin_users)
- `mcp/src/db/client.ts` — pg Pool + Drizzle instance
- `mcp/src/db/migrations/` — generated SQL migration files
- `mcp/drizzle.config.ts` — Drizzle migration config
- `mcp/src/redis/client.ts` — ioredis wrapper
- `mcp/src/auth/jwt.ts` — jose-based issue/verify
- `mcp/src/auth/middleware.ts` — Fastify preHandler hook
- `mcp/src/tools/push-item.ts` — versioning + pruning
- `mcp/src/tools/pull-item.ts` — current or specific version
- `mcp/src/tools/list-items.ts` — paginated by cursor
- `mcp/src/tools/sync-status.ts` — wrapper on push_item
- `mcp/src/middleware/rate-limit.ts` — Redis sliding window
- `mcp/src/middleware/idempotency.ts` — Redis cache
- `mcp/src/middleware/audit.ts` — write to audit_log
- `mcp/src/server.ts` — register everything
- `mcp/scripts/bootstrap-admin.ts` — env-var → admin_users row at first boot

**Data changes:**
- New tables per PROPOSAL-003 §2.7. No changes to existing schema (there isn't one).

## 5. Acceptance Criteria

```gherkin
Feature: MCP Server Core

  Scenario: Healthy boot
    Given a valid .env with DATABASE_URL, REDIS_URL, JWT_SIGNING_KEY
    When I run `docker compose up -d && npm run dev`
    Then GET /health returns 200 with { status: "ok" }
    And the server logs "cleargate-mcp listening" within 3 seconds

  Scenario: First push creates version 1
    Given an authenticated client with role=user, project_id=P
    When the client calls push_item with { cleargate_id: "EPIC-042", type: "epic", payload: {...} }
    Then the response is { version: 1, updated_at: <server_ts> }
    And a row exists in items with current_version=1
    And a row exists in item_versions with version=1

  Scenario: Concurrent push produces version 2, preserves version 1
    Given an item at version 1
    When two clients call push_item with different payloads in quick succession
    Then both succeed (no 409)
    And items.current_version = 2
    And item_versions contains versions 1 and 2

  Scenario: Version history prunes at 11 writes
    Given an item that has been pushed 11 times
    When I query item_versions for that item
    Then only versions 2..11 remain (version 1 pruned)

  Scenario: Idempotent replay
    Given push_item was called with idempotency_key K
    When push_item is called again with the same K within 24h
    Then the response matches the original without writing a new version

  Scenario: Cross-project access rejected
    Given a JWT scoped to project_id = P
    When the client attempts any tool call targeting project_id = Q
    Then the server returns 403 and logs an audit row with result=error, error_code=cross_project

  Scenario: Rate limit enforced
    Given a user token with limit 60 req/min
    When the client makes 61 requests within one minute
    Then the 61st returns 429 with Retry-After header
```

## 6. AI Interrogation Loop — RESOLVED

All 10 questions resolved 2026-04-17 by Vibe Coder (accept all recommendations).

1. **Story execution order** — **Resolved:** schema-first → JWT → tools (03-06) → middleware (07-09) → transport (10) → bootstrap (11) → deploy (12). Every other Story depends on DB types.
2. **Test strategy** — **Resolved:** Vitest unit tests for pure logic + integration tests against real containerized Postgres + Redis (via dev `docker-compose.yml`). Mocks hide migration and SQL bugs.
3. **First deployable milestone** — **Resolved:** yes, ship v0.1 internal milestone after STORY-03-01/02/03/10 (schema + auth + push_item + transport). Validate Coolify deploy path early.
4. **MCP SDK version verification** — **Resolved:** install to lockfile + read the `.d.ts` + WebFetch current documentation before wiring tool code.
5. **Migration workflow** — **Resolved:** Drizzle auto-generate; hand-review each generated migration before applying; commit generated SQL to git.
6. **Last-10 version pruning** — **Resolved:** DB trigger on `item_versions` INSERT. Invariant enforced regardless of which code path writes.
7. **Idempotency key** — **Resolved:** client-provided (per PROPOSAL-003). Survives retries across network failures where the server never acknowledged.
8. **JWT refresh endpoint** — **Resolved:** same service, path `/auth/refresh`. Simplicity first; split later if scale demands.
9. **First-admin bootstrap race** — **Resolved:** Postgres advisory lock held during bootstrap. Only one instance creates the admin row; others no-op. Idempotent.
10. **`JWT_SIGNING_KEY` rotation** — **Resolved:** v1 accepts "rotate key = everyone re-logs-in". Document this; design for key rotation later (maintain kid claim + key set).

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟢 Low Ambiguity — READY for Story decomposition + coding**

Gate requirements (all met 2026-04-17):
- [x] PROPOSAL-003 has `approved: true`
- [x] `<agent_context>` block complete and validated
- [x] §4 Technical Grounding paths verified (all exist in `mcp/` scaffold)
- [x] §6 AI Interrogation Loop resolved
- [x] No blocking TBDs (target_date will be set when Stories are scheduled)
- [x] Storage provider locked: **Postgres** (local Docker for dev, Coolify-managed for prod — vendor-neutral via `DATABASE_URL`)
