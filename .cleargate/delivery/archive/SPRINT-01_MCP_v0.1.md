---
sprint_id: "SPRINT-01"
remote_id: null
source_tool: "local"
status: "Completed"
start_date: "2026-04-17"
end_date: "2026-04-17"
completed_at: "2026-04-17T17:00:00Z"
synced_at: null
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-17T00:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
approved: true
sprint_cleargate_id: "SPRINT-01"

---

# SPRINT-01: MCP Server v0.1

## Sprint Goal
Ship a deployable v0.1 of the ClearGate MCP server — a real client authenticates via JWT over Streamable HTTP, exercises all four tools with versioned item storage, and the image runs cleanly on Coolify.

## Consolidated Deliverables

- `STORY-003-01`: DB schema + Drizzle migrations — ✅ Done 2026-04-17 (8 tables + last-10-version pruning trigger verified against Postgres 18)
- `STORY-003-02`: JWT issue / verify / refresh — 15-min access + 90-day rotating refresh, Redis revocation list
- `STORY-003-03`: `push_item` + row-level lock versioning + trigger-based pruning
- `STORY-003-04`: `pull_item` (current or historical version)
- `STORY-003-05`: `list_items` with keyset cursor pagination
- `STORY-003-06`: `sync_status` wrapper around `push_item`
- `STORY-003-07`: Rate-limit middleware (Redis sliding window, per-role)
- `STORY-003-08`: Idempotency middleware (24h Redis cache on `push_item`)
- `STORY-003-09`: Audit middleware (one row per tool call, no bodies)
- `STORY-003-10`: Streamable HTTP transport registration (`@modelcontextprotocol/sdk@^1.29`)
- `STORY-003-11`: First-admin bootstrap + `scripts/dev-issue-token.ts` (dev-only helper that mints a refresh token for manual smoke testing — no Admin UI/CLI yet in this sprint)
- `STORY-003-12`: Dockerfile verification + Coolify deployment runbook

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| MCP SDK v1.29 API drift vs. training-time knowledge | Already inspected installed `.d.ts` files; concrete API known, Fastify integration path identified |
| Concurrent push producing inconsistent versions | Postgres row-level lock via `SELECT … FOR UPDATE` inside push transaction |
| JWT refresh rotation race | Atomic Redis `SET NX` on revocation key during exchange |
| Coolify deploy workflow first-run surprises | Allocate explicit time in M4; STORY-003-12 is manual-verify |
| `drizzle-kit` dev-only esbuild CVEs | Documented; non-blocking in prod; revisit when 0.31+ stable |
| Fastify v5 production hardening sufficiency | `requestTimeout` + `return503OnClosing` already applied; Traefik in front on Coolify |
| Postgres 18 / Redis 8 freshness | Images pulled and smoke-tested locally (pruning trigger + server boot verified) |

**Dependencies:** Postgres 18 + Redis 8 via `docker compose up -d` (local) or Coolify-managed (prod); Node 24 on dev host; Coolify VPS access for M4.

## Metrics & Metadata
- **Expected Impact:** First demonstrable end-to-end ClearGate execution — a client can push and pull work items against a deployed, authenticated, audited MCP hub. Unblocks every downstream Epic (Admin API, CLI, UI, metadata, wiki).
- **Priority Alignment:** Platform priority = High (this is the backbone; everything else depends on it). Codebase priority = High (critical path; all other Stories blocked until schema + transport land).

---

## Execution Guidelines (Local Annotation — Not Pushed)

### Starting Point
`STORY-003-02` (JWT). Schema is live (verified via integration tests). Auth is the next critical path item — every subsequent tool reads `project_id` + `member_id` off the JWT, so no tool Story can land without it.

### Relevant Context
- Schema + DB client: `mcp/src/db/schema.ts`, `mcp/src/db/client.ts`
- MCP SDK API reference: `mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/server/streamableHttp.d.ts` and `/server/mcp.d.ts`
- Fastify v5 production hardening already in `mcp/src/server.ts` (requestTimeout, return503OnClosing)
- Config schema + env loading: `mcp/src/config.ts` (zod-validated)
- Integration test pattern: `mcp/src/db/schema.test.ts` (reuse shape for auth, tools)

### Constraints
- No Admin API work (EPIC-004) this sprint
- No UI work (EPIC-006) this sprint
- No CLI/client package work (EPIC-000, EPIC-005) this sprint
- No PM-tool adapters (Linear/Jira/Azure) — deferred to v1.1
- No webhook receiver — deferred to v1.1
- `role` column stays `text` (not pg enum) — revisit in future sprint

### Milestones within sprint
1. **M1 — Critical path (Stories 01 ✅ / 02 / 03 / 10):** authenticated `push_item` succeeds over `/mcp`, version 1 written.
2. **M2 — Middleware burst (07 / 08 / 09):** 429 on rate limit, idempotency cache hit, audit rows written. Can run as parallel subagents (independent files).
3. **M3 — Secondary tools (04 / 05 / 06):** full four-tool surface. Also parallelizable.
4. **M4 — Finalize (11 / 12):** seed-admin bootstrap on empty DB; Dockerfile + Coolify runbook verified end-to-end.

### Sprint Definition of Done
- [x] `STORY-003-01` complete — schema + migrations + pruning trigger verified
- [x] All 12 Stories merged (commits `9931eac` → `b368017`, pushed to `sandrinio/cleargate-mcp`)
- [x] `npm run typecheck` clean
- [x] `npm test` passes — 46 tests across 12 files (integration against real Postgres 18 + Redis 7.4)
- [x] `docker build ./mcp` succeeds; image = **199 MB** (< 250 MB target)
- [ ] Coolify deploy verified on your VPS (requires your action — `coolify/DEPLOYMENT.md` runbook covers every step)
- [x] Smoke roundtrip: `npm run dev:issue-token` → access token → MCP `initialize` → `tools/call push_item` → `{"version":1,"updated_at":"..."}` — verified end-to-end against containerized image
- [x] Rate limit enforces 429 at N+1 for user role within 60s window (unit tests `src/middleware/rate-limit.test.ts`)
- [x] Refresh rotation: R1 exchange → R2 issued, R1 rejected (integration tests `src/auth/routes.test.ts`)
- [x] First-admin bootstrap creates seed row on empty DB when env var set — tested (5 integration tests in `src/bootstrap/admin.test.ts`) and verified in live container smoke
- [x] Audit log has rows for every tool call (wired through `runTool()` wrapper in `src/mcp/register-tools.ts`; tested in `src/middleware/audit.test.ts`)

### Commit cadence
One commit per Story; tests must pass before committing. Lockfile + generated migrations committed.

### Next Sprint Preview
`SPRINT-02`: Admin API (EPIC-004) — 6 Stories, all building on this sprint's schema + JWT middleware.
