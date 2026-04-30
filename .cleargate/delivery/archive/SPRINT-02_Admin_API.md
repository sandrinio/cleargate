---
sprint_id: "SPRINT-02"
remote_id: null
source_tool: "local"
status: "Completed"
start_date: "2026-04-17"
end_date: "2026-04-17"
activated_at: "2026-04-17T00:00:00Z"
completed_at: "2026-04-17T23:50:00Z"
synced_at: null
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-17T00:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
approved: true
sprint_cleargate_id: "SPRINT-02"

---

# SPRINT-02: Admin API

## Sprint Goal
Expose the admin-scoped REST surface on the MCP server — projects/members/tokens CRUD, audit log query, and stats — so that EPIC-005 (Admin CLI) and EPIC-006 (Admin UI) have a typed, OpenAPI-documented backend to build against.

## Consolidated Deliverables

- `STORY-004-01`: Admin JWT scope + middleware — ✅ Done 2026-04-17 (401 on bad token, 403+audit on wrong role, nullable `audit_log.project_id` migration, `dev-issue-token --role=admin`)
- `STORY-004-02`: Projects CRUD — ✅ Done 2026-04-17 (`GET/POST /projects`, `GET/DELETE /projects/:id`, soft-delete, 404-not-403 on non-owned, seed member row for creator)
- `STORY-004-03`: Members CRUD — ✅ Done 2026-04-17 (Redis-backed invite with 24h TTL; status=pending derived from `member_invite:<mid>` key; FK cascade on member delete)
- `STORY-004-04`: Tokens CRUD — ✅ Done 2026-04-17 (43-char base64url plaintext once, bcrypt-12 hash, `rev:token:<id>` Redis key with expiry-aware TTL, idempotent DELETE)
- `STORY-004-05`: Audit log query — ✅ Done 2026-04-17 (base64url JSON cursor `{ts,id}`, Postgres row-constructor tuple comparison, 200-row cap, 7-day default)
- `STORY-004-06`: Stats endpoint — ✅ Done 2026-04-17 (`generate_series` zero-fill, parallel queries via `Promise.all`, measured p95 over 10k rows ≈ 6 ms vs. 500 ms target)

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| Admin-JWT issuance path undefined at server side (UI owns the session in EPIC-006) | Resolved §6.1: UI-session → admin-JWT exchange route lives here (`POST /admin-api/v1/auth/exchange`); CLI copies the same JWT from UI. Dev smoke via extended `dev-issue-token` with `--role=admin` flag. |
| Cross-project leakage via missing ownership filter | Every list/detail/audit/stats query must JOIN on `projects.created_by = admin_user_id`. Add shared `assertProjectOwnership(adminId, projectId)` helper; unit-test every endpoint's 403 path. |
| Token plaintext accidentally logged | Strip `token` field in response logger; unit test asserts `token` never appears in pino output. Bcrypt cost = 12 (matches EPIC-003 story-04 precedent). |
| Stats endpoint p95 regression on large audit tables | Verify existing `audit_log(project_id, timestamp DESC)` index from STORY-003-09 is present; add 10k-row seed perf test (gated on p95 < 500ms). Precomputed rollups deferred to v1.1. |
| OpenAPI spec drift from Zod schemas | Single-source via `zod-to-openapi`; spec served at `/admin-api/v1/openapi.json` and snapshot-tested in CI so schema changes are visible in diffs. |
| Soft-delete semantics leaking into child reads | Shared `withActiveProject()` query helper that always appends `WHERE deleted_at IS NULL`; enforce via code review + integration test per endpoint. |
| Redis revocation TTL mismatch with JWT lifetime | Set Redis TTL = max(token expires_at − now, 0); integration test that a revoked short-lived token disappears from the set after expiry. |

**Dependencies:** SPRINT-01 schema + JWT middleware merged (`mcp/src/db/schema.ts`, `mcp/src/auth/*`). No new infra — Postgres 18 + Redis 8 already provisioned. Requires `zod-to-openapi` (^7.x) as a new dev dependency.

## Metrics & Metadata
- **Expected Impact:** Unblocks EPIC-005 and EPIC-006 simultaneously. Converts admin operations from SQL-only to typed HTTP, which is the precondition for any UI/CLI work and for external admins onboarding their own projects.
- **Priority Alignment:** Platform priority = **High** (blocks two downstream Epics). Codebase priority = **High** (every EPIC-006 UI page and every EPIC-005 CLI command depends on at least one endpoint here).

---

## Execution Guidelines (Local Annotation — Not Pushed)

### Starting Point
`STORY-004-01` (Admin JWT middleware + session→JWT exchange). Every other story in this sprint depends on it — no admin endpoint can be meaningfully tested without a working `role=admin` path. Land this first and smoke-test with an extended `dev-issue-token --role=admin` before fanning out.

### Relevant Context
- Existing JWT verify/issue: `mcp/src/auth/*` (SPRINT-01 output) — extend, do not fork
- DB schema (projects, members, tokens, audit_log): `mcp/src/db/schema.ts`
- Soft-delete precedent: check if `deleted_at` column exists on `projects`; if not, add a migration as part of STORY-004-02
- Rate-limit middleware from STORY-003-07 — register a second per-role bucket (admin: 30/min)
- Audit middleware from STORY-003-09 — reuse as-is; admin endpoints log through the same `runTool()` wrapper pattern
- OpenAPI generation: `zod-to-openapi` ^7 (add to `mcp/package.json` devDeps); mount spec at `/admin-api/v1/openapi.json`
- Integration test pattern: `mcp/src/auth/routes.test.ts` (refresh-rotation test) is the closest parallel

### Constraints
- No UI work (EPIC-006) this sprint
- No Admin CLI work (EPIC-005) this sprint
- No bulk import/export endpoints — v1.1
- No precomputed stats rollups — live query only; optimize only if p95 breaches in prod
- No `PATCH /members/:mid` role mutation — delete + re-invite (per §6.5 resolution)
- No hard-delete endpoint — soft-delete only; the 30-day grace-period purge is a future separate admin command
- Path-versioned (`/admin-api/v1/*`) from day one — do not ship unversioned routes

### Milestones within sprint
1. **M1 — Admin auth gate (Story 01):** `POST /admin-api/v1/auth/exchange` + middleware; any GET under `/admin-api/v1/*` returns 403 for user role, 200 for admin role. Blocks everything downstream.
2. **M2 — Resource CRUD burst (02 / 03 / 04):** projects, members, tokens. Parallelizable across subagents — files are independent.
3. **M3 — Read-heavy endpoints (05 / 06):** audit + stats. Parallelizable. Stats requires perf test harness (seed 10k rows).
4. **M4 — OpenAPI + polish:** mount `/openapi.json`, snapshot-test, verify typed-client generation works end-to-end against a sample SvelteKit consumer.

### Sprint Definition of Done
- [x] All 6 Stories merged on `sandrinio/cleargate-mcp` `main` (commits `86506f2` → `185781e`)
- [x] `npm run typecheck` clean
- [x] `npm test` passes — **96 tests across 20 files** (50 new across 6 admin-api suites). Coverage: role gate (403/200), cross-admin isolation (404-not-403), token one-time display + bcrypt round-trip + list-never-leaks-plaintext, token DB + Redis revocation state, audit cursor walk of 250 rows with no dupes + tool/user/window filters, stats p95 **~6 ms** on 10k rows vs. 500 ms target, admin rate-limit 429 at cap+1 (`src/admin-api/index.test.ts`)
- [x] `GET /admin-api/v1/openapi.json` serves valid OpenAPI 3.1 + snapshot committed at `mcp/src/admin-api/__snapshots__/openapi.test.ts.snap`
- [x] Admin-role rate limit enforces 429 at 31st req/min (`src/admin-api/index.test.ts` > rate limit kicks in at admin cap + 1)
- [x] `docker build ./mcp` succeeds; image = **199 MB** (< 250 MB target)
- [ ] Coolify redeploy — **deferred to ops step**. No infra changes beyond two new migrations (applied automatically on boot via existing `migrations-on-boot`); rerun `coolify/DEPLOYMENT.md` runbook when convenient.
- [x] Smoke script: `npm run smoke:admin` — 22 assertions cover openapi fetch, project create/list, member invite, token issue/list-no-leak/revoke (idempotent), audit fetch, stats 30d-window, member cascade delete, project soft-delete.  **Note:** end-to-end `401 on MCP call after revoke` intentionally deferred — the bcrypt-token → JWT exchange path lands with EPIC-005 (`cleargate join`). DB + Redis revocation state verified in `src/admin-api/tokens.test.ts`.

### Scope adjustments resolved mid-sprint
- **`POST /admin-api/v1/auth/exchange` deferred to EPIC-006.** The exchange is a UI-session → admin-JWT handshake; the session cookie ships with EPIC-006 GitHub OAuth. For SPRINT-02, admin JWTs are minted via extended `dev-issue-token --role=admin --gh-user=X`. Decision recorded in sprint kickoff — no blocker for downstream sprints (SPRINT-03 CLI consumes the JWT directly; SPRINT-04 UI ships exchange alongside OAuth).
- **OpenAPI authored by hand, not via `zod-to-openapi`.** Zod 4's API migration plus a ~10-endpoint surface made a hand-maintained doc simpler than a generator pipeline. Single-source is preserved at request time (same Zod schemas still validate); drift surfaces via snapshot diff. Swap to generator when endpoint count grows or EPIC-006 needs richer validation extraction.

### Commit cadence
One commit per Story; tests pass before each commit. Any new `zod-to-openapi` or admin-middleware dependency committed with the first Story that introduces it. Migration for `projects.deleted_at` (if needed) ships with STORY-004-02.

### Next Sprint Preview
`SPRINT-03`: EPIC-000 (CLI package scaffold) + EPIC-005 (Admin CLI + `cleargate join`) — 9 Stories, all consuming this sprint's `/admin-api/v1/*` surface through the generated OpenAPI typed client.
