---
sprint_id: "SPRINT-03"
remote_id: null
source_tool: "local"
status: "Completed"
start_date: "2026-04-17"
end_date: "2026-04-18"
activated_at: "2026-04-17T21:38:00Z"
completed_at: "2026-04-18T17:37:00Z"
synced_at: null
created_at: "2026-04-18T00:00:00Z"
updated_at: "2026-04-18T18:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
---

# SPRINT-03: CLI Packages (`cleargate-cli` scaffold + Admin CLI + `cleargate join`)

## Sprint Goal
Ship the two CLI packages that make the MCP hub operable without the UI: (a) `cleargate-cli` — the shared scoped npm package (`@cleargate/cli`) that every future client command roots into; (b) `cleargate-admin` — headless admin ops run against SPRINT-02's `/admin-api/v1/*` surface; (c) `cleargate join` — the Vibe Coder onboarding flow that redeems an invite token and seats a refresh token in the OS keychain. Two storage-layer corrections also land this sprint: STORY-004-07 migrates invite storage from Redis-only (SPRINT-02) to a Postgres `invites` table (durability + auditability + UI queryability), and STORY-003-13 adds the MCP-side `POST /join/:invite_token` redemption route that SPRINT-01 didn't cover. After this sprint, a root admin can create a project + issue an invite from their terminal, a Vibe Coder can redeem the invite on their machine, and Claude Code can authenticate to MCP using the resulting refresh token — with no UI required.

## Consolidated Deliverables

### EPIC-000 — `cleargate-cli` Package Scaffold (4 stories)
- [`STORY-000-01`](../stories/STORY-000-01_Package_Scaffold.md): Package scaffold — `cleargate-cli/` sibling of `mcp/`, `@cleargate/cli` scoped name, `bin/cleargate`, tsup build, ESM + CJS dual emit — ✅ Done 2026-04-17 (`3bcfcd4`)
- [`STORY-000-02`](../stories/STORY-000-02_Commander_Entry.md): Commander entry — `cli.ts` with stub subcommands registered, `--help` / `--version` working — ✅ Done 2026-04-17 (`43c50c3`)
- [`STORY-000-03`](../stories/STORY-000-03_Config_Loader.md): Config loader — zod-validated, precedence = flags > env > `~/.cleargate/config.json` > defaults — ✅ Done 2026-04-17 (`acde4ba`)
- [`STORY-000-04`](../stories/STORY-000-04_Token_Store.md): TokenStore abstraction — Keychain + File fallback, `~/.cleargate/auth.json` chmod 600 — ✅ Done 2026-04-18 (`f97b3f1`) — `@napi-rs/keyring@^1.2.0` chosen; 🟡 marker resolved

### EPIC-003 — MCP Server Core (1 add-in, closing SPRINT-01 gap)
- [`STORY-003-13`](../stories/STORY-003-13_Join_Redemption.md): `POST /join/:invite_token` — public MCP redemption route, atomic `UPDATE … RETURNING` against `invites` table, reuses STORY-003-02 refresh-token issuance — ✅ Done 2026-04-18 (`e3c2550`) — includes new anonymous rate-limit bucket (10 req / 15 min per IP)

### EPIC-004 — Admin API (1 retrofit, correcting SPRINT-02 Redis-only storage)
- [`STORY-004-07`](../stories/STORY-004-07_Invite_Storage_Retrofit.md): Migrate invite storage from Redis to Postgres `invites` table — source of truth for durability, auditability, admin-UI queryability — ✅ Done 2026-04-18 (`bda4308`) — Redis dropped from invite path; LATERAL-join member-status derivation

### EPIC-005 — Admin CLI + Client Bootstrap (5 stories)
- [`STORY-005-01`](../stories/STORY-005-01_Admin_CLI_Create_Project.md): `cleargate-admin create-project` — calls `POST /admin-api/v1/projects` — ✅ Done 2026-04-18 (`a3d9227`; setup-fix `cad6638` for D6 baseUrl)
- [`STORY-005-02`](../stories/STORY-005-02_Admin_CLI_Invite.md): `cleargate-admin invite` — calls `POST /admin-api/v1/projects/:id/members`, prints invite URL — ✅ Done 2026-04-18 (`a578d7f`)
- [`STORY-005-03`](../stories/STORY-005-03_Admin_CLI_Issue_Token.md): `cleargate-admin issue-token` — calls `POST /admin-api/v1/projects/:id/tokens`, prints plaintext token once — ✅ Done 2026-04-18 (`fb7be36`)
- [`STORY-005-04`](../stories/STORY-005-04_Admin_CLI_Revoke.md): `cleargate-admin revoke-token` — calls `DELETE /admin-api/v1/tokens/:id`, idempotent — ✅ Done 2026-04-18 (`85a5969`)
- [`STORY-005-05`](../stories/STORY-005-05_Cleargate_Join.md): `cleargate join <invite-url>` — redeems invite via STORY-003-13, seats refresh token via TokenStore — ✅ Done 2026-04-18 (`13460ed`)

### Setup commits (not stories)
- M3 setup — npm workspaces + AdminApiClient + admin-auth + `cleargate-admin` scaffold: `50e29e0` (meta-repo) + `7e0e289` (mcp-repo)
- Setup-fix — AdminApiClient network error includes `baseUrl` per D6: `cad6638` (meta-repo)

**Summary:** 11/11 stories shipped, 14 commits total (11 stories + 2 setup + 1 setup-fix). Engineering DoD complete; 5 operational close-out items (install-matrix smoke, two-terminal E2E, README expansion, Coolify redeploy, first npm publish) tracked in [REPORT.md §Sprint DoD check](../../.cleargate/sprint-runs/SPRINT-03/REPORT.md).

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| **Invite redemption endpoint (`POST /join/:invite_token`) missing from SPRINT-01 scope.** EPIC-005 §6.5 resolves to a public MCP endpoint, but no STORY-003-* covers it. | **Resolved** — split into [STORY-003-13](../stories/STORY-003-13_Join_Redemption.md). Lives in EPIC-003 (MCP route, not CLI). Scheduled in M4 after STORY-004-07. |
| **Invite storage in Redis is not production-grade.** SPRINT-02 STORY-004-03 put invites in Redis with 24h TTL — cache, not identity store. Loses state on Redis restart/eviction; no audit trail; can't be queried for admin UI. | **Resolved** — [STORY-004-07](../stories/STORY-004-07_Invite_Storage_Retrofit.md) retrofits to a Postgres `invites` table with `id`/`project_id`/`member_id`/`expires_at`/`consumed_at`. Redis drops out of the invite path. Runs first in M4 (STORY-003-13 depends on the new table). Retrofit is cheap now (no real invites in alpha); cost grows after EPIC-006 ships. |
| **Admin JWT acquisition path.** EPIC-005 §6.2 proposes `cleargate-admin login` via GitHub OAuth device flow — but SPRINT-02 deferred the session → admin-JWT exchange to EPIC-006 (it ships with the GitHub OAuth session). | **Defer `cleargate-admin login` to SPRINT-04 (EPIC-006).** For SPRINT-03, admin JWT sources: `CLEARGATE_ADMIN_TOKEN` env var first, then `~/.cleargate/admin-auth.json` chmod 600. Dev-issue via the extended `dev-issue-token --role=admin --gh-user=X` helper landed in SPRINT-02 (`mcp/scripts/dev-issue-token.ts`). Document the env-var flow in `cleargate-cli/README.md`; a TODO pointer to EPIC-006 for the OAuth flow. |
| **Keychain library native-binary breakage on Node 24.** EPIC-000 §6.3 left the pick open (`keytar` vs `@napi-rs/keyring`), STORY-000-04 defaults to `@napi-rs/keyring`. | Verify prebuilt binaries for Node 24 LTS on macOS (arm64 + x64) and Linux (x64 + arm64) at implementation time. If `@napi-rs/keyring` fails `npm i` on any target, fall back to `keytar` (still maintained as of 2026). File fallback works regardless — acceptance tests must pass on a keychain-unavailable environment (CI runs headless Linux without libsecret). |
| **Typed admin-API client drift.** SPRINT-02's mid-sprint adjustment authored `openapi.json` by hand rather than from `zod-to-openapi`. A generator-based typed client would rebuild from the spec; a hand-rolled thin wrapper needs manual updates. | Hand-roll a thin `AdminApiClient` in `cleargate-cli/src/admin-api/client.ts` covering the ~10 endpoints CLI consumes (projects, members, tokens CRUD). Import the request/response Zod schemas directly from `mcp/src/admin-api/schemas.ts` via a relative monorepo path OR vendor a snapshot — decide at M1. When endpoint count grows or EPIC-006 needs richer validation, swap to `openapi-typescript` codegen off the snapshot spec. |
| **Three install modes (npx / local devDep / global) diverge.** EPIC-005 §6.6 mandates all three, but matrix testing is easy to skip. | Sprint DoD adds a matrix-smoke script: `scripts/install-smoke.sh` runs `npx @cleargate/cli --version`, `npm i -D` in a tmp project + run via `npm exec`, and `npm i -g` + invoke `cleargate` from PATH. All three must print the same version string. Run locally before close. |
| **Refresh token printed to stdout accidentally.** `cleargate join` receives a plaintext refresh token from MCP and must never leak it to stdout/logs — only to the TokenStore. | Response-logger strip at the CLI layer mirrors SPRINT-02's response-logger pattern. Unit test asserts `refresh_token` never appears in captured stdout/stderr when `cleargate join` completes successfully. Token is passed directly from fetch-response → TokenStore.save, never printed. |
| **Monorepo topology: `cleargate-cli/` sibling vs. `mcp/scripts/`.** Admin CLI lives in `mcp/scripts/` (ships with the service); client CLI lives in `cleargate-cli/` (separate npm package). Shared code (TokenStore, config loader) lives in `cleargate-cli/` but admin CLI would also benefit. | Admin CLI imports from `cleargate-cli` via a workspace `file:../cleargate-cli` dep in `mcp/package.json`, OR duplicates the minimal config loader. **Chosen:** workspace dep — single source for TokenStore. npm workspaces declared at repo root (`package.json` at `/Users/ssuladze/Documents/Dev/ClearGate/`). If that's disruptive to existing `mcp/` tooling, fall back to duplication — it's ~50 LOC. |

**Dependencies:** SPRINT-02 shipped all required Admin API endpoints. No new infra. New dev deps: `commander` (^12.x), `zod` (already shared with mcp), `@napi-rs/keyring` or `keytar` (native), `tsup` (build), `vitest` (test — reuse mcp's version for consistency). No Postgres or Redis changes.

## Metrics & Metadata
- **Expected Impact:** First end-to-end operable ClearGate hub without UI. Root admin terminal-only workflow (create-project → invite → issue-token → revoke) and Vibe Coder onboarding flow (redeem invite → seat refresh token → MCP authenticated) both ship. Unblocks the v0.9 "headless alpha" milestone: anyone with VPS access can stand up an MCP and onboard a team via SSH + CLI. Also unblocks the downstream EPICs that root into `cleargate-cli/`: EPIC-001 (`cleargate stamp`) and EPIC-002 (`cleargate wiki *`).
- **Priority Alignment:** Platform priority = **Medium-High** (operability, not new capability). Codebase priority = **High** (prerequisite for EPIC-001, EPIC-002; eight of the remaining Epics' Stories live in this package).

---

## Execution Guidelines (Local Annotation — Not Pushed)

### Starting Point
`STORY-000-01` (package scaffold). Every EPIC-000 story is a direct dependency of every EPIC-005 story — no admin command can run until `bin/cleargate-admin` exists and parses args. Land 000-01 / 000-02 / 000-03 sequentially (they're all L1 and compose tightly), then parallelize 000-04 against 005-01/02/03/04.

### Relevant Context
- Admin API contract: `mcp/src/admin-api/schemas.ts` (Zod source) and `mcp/src/admin-api/__snapshots__/openapi.test.ts.snap` (hand-authored OpenAPI 3.1). CLI's typed client should import request/response schemas directly.
- Existing admin-ops smoke test: `mcp/scripts/smoke-admin.ts` (from SPRINT-02) — the Admin CLI subcommands are roughly this script's calls, one per CLI subcommand. Factor shared HTTP logic out of smoke script into `cleargate-cli/src/admin-api/client.ts` and reuse.
- Dev-issue-token helper: `mcp/scripts/dev-issue-token.ts` — extended in SPRINT-02 to accept `--role=admin --gh-user=X`. Use its output as the `CLEARGATE_ADMIN_TOKEN` during integration tests.
- Refresh-token issuance path: `mcp/src/auth/issue.ts` (STORY-003-02) — the `cleargate join` MCP-side endpoint should call this directly, not duplicate JWT minting.
- Invite row lifecycle: `mcp/src/admin-api/members/invite.ts` (STORY-004-03) — sets `member_invite:<mid>` in Redis with 24h TTL. `POST /join/:invite_token` consumes this key (atomic `GETDEL` or `GET` + `DEL`-on-success).
- Stack versions pinned in `INDEX.md` §"Stack versions reference". Node 24 LTS target.

### Constraints
- No `cleargate whoami`, `cleargate stamp`, `cleargate wiki *` commands — those are EPIC-001, EPIC-002 territory.
- No GitHub OAuth device flow (`cleargate-admin login`) — deferred to SPRINT-04 (EPIC-006). Admin JWT via env var + file only.
- No multi-profile UX polish — `--profile` flag accepted (default `"default"`), but a profile-switcher UX ships later.
- No `cleargate-admin list-projects` / `list-tokens` this sprint — not in the 5-story decomposition; add in a v1.0.1 increment if ops demands it before UI ships. (EPIC-005 §2.1 lists them IN-SCOPE but the Story decomposition omitted them.)
- No publish-to-npm automation — first publish is manual from a maintainer machine after DoD passes. Publish automation = v1.1.
- No SAML / SSO join flow — v1.1.

### Milestones within sprint
1. **M1 — Package scaffold (000-01 / 000-02 / 000-03):** `npx @cleargate/cli --help` prints stub subcommand list; `cleargate --version` matches `package.json`; config loader returns typed config from env + file. Blocks everything downstream. Sequential (each depends on the previous).
2. **M2 — TokenStore (000-04):** keychain roundtrip on macOS + file fallback on headless Linux CI. Parallelizable with M3 once 000-03 lands.
3. **M3 — Admin CLI subcommands (005-01 / 005-02 / 005-03 / 005-04):** four commands each calling one Admin API endpoint. Parallelizable across subagents — files are independent. Each reuses the `AdminApiClient` laid down in M1.
4. **M4 — Storage retrofit + join flow (004-07 → 003-13 → 005-05):** strictly ordered.
   1. **STORY-004-07 first** — migration creates `invites` table; `members.ts` invite create/list/delete paths rewritten to use DB; all existing member/invite tests green; Redis drops out of the invite flow.
   2. **STORY-003-13 next** — MCP redemption route (`POST /join/:invite_token`) against the new table; atomic `UPDATE … RETURNING` redemption; new integration tests.
   3. **STORY-005-05 last** — `cleargate join` calls the live redemption endpoint.
   End-to-end smoke: `dev-issue-token admin` → `cleargate-admin create-project` → `cleargate-admin invite` → copy invite URL → `cleargate join <url>` on a separate shell → verify refresh token in keychain → MCP `initialize` + `push_item` succeeds using the new refresh token.

### Sprint Definition of Done
- [ ] All 11 Stories merged on `sandrinio/cleargate-mcp` `main` (4 EPIC-000 + 1 EPIC-003 add-in (003-13) + 1 EPIC-004 retrofit (004-07) + 5 EPIC-005)
- [ ] `npm run typecheck` clean in both `cleargate-cli/` and `mcp/`
- [ ] `npm test` passes in `cleargate-cli/` — new unit suites for config loader, TokenStore (keychain mocked + file tmp dir), AdminApiClient (fetch mocked), each CLI subcommand (argument parsing + exit codes)
- [ ] `npm test` in `mcp/` still green — STORY-004-07 rewrites existing `src/admin-api/members.test.ts` to assert DB state (no `member_invite:*` Redis keys); STORY-003-13 adds `src/routes/join.test.ts` (valid redeem → `consumed_at` set + refresh token issued; expired → 410; already-consumed → 410; non-existent → 404; concurrent redemption → exactly one 200)
- [ ] Three-install-mode matrix smoke passes locally: `npx`, `npm i -D`, `npm i -g` all print matching `--version`
- [ ] End-to-end smoke: admin terminal → `cleargate-admin create-project` + `invite` + `issue-token`; vibe-coder terminal → `cleargate join <invite-url>` → keychain populated; subsequent MCP `initialize` + `push_item` authenticates via stored refresh token
- [ ] `docker build ./mcp` still succeeds (new route adds ~2 KB to bundle)
- [ ] Keychain library final pick documented in STORY-000-04 close-out comment; remove 🟡 ambiguity marker
- [ ] `cleargate-cli/README.md` covers: install modes, admin JWT sourcing (env var + file), `cleargate join` usage, TokenStore backends, troubleshooting (keychain unavailable → file fallback warning)
- [ ] Coolify redeploy — **deferred to ops step.** Changes to the MCP image: one new migration (`invites` table, applied on boot via existing `migrations-on-boot`) + handler rewrites + the new `POST /join/:invite_token` route. No new env vars. Rerun `coolify/DEPLOYMENT.md` runbook when convenient.
- [ ] First npm publish of `@cleargate/cli@0.1.0-alpha.1` — **manual, maintainer machine only.** Verify `npx @cleargate/cli@0.1.0-alpha.1 --version` works from a cold shell before closing sprint.

### Scope adjustments to watch for mid-sprint
- **If `@napi-rs/keyring` fails to `npm i` on Node 24** → swap to `keytar`. Decision recorded in a sprint-kickoff addendum; no story refactor needed (both implement the same `TokenStore` interface).
- **If workspace-dep (`mcp` → `cleargate-cli`) causes `tsc` pain** → duplicate the ~50 LOC of config loader + TokenStore into `mcp/scripts/_shared/`. Flag as "tech-debt to consolidate in v1.1" in the sprint retro.
- **If STORY-004-07 migration surfaces any existing invite rows** in the alpha DB (shouldn't — SPRINT-02 was Redis-only) → investigate before wiping; they may be manual test data. Flush only after confirming no real usage.
- **If the anonymous rate-limit bucket doesn't exist** (STORY-003-13 §5 Q1) → add it in STORY-003-13 rather than splitting into its own Story. Small addition (~10 LOC in `mcp/src/middleware/rate-limit.ts`).

### Commit cadence
One commit per Story = 11 commits. Tests must pass before each commit. The workspace-root `package.json` (if npm workspaces used) + any new lockfile committed with STORY-000-01. STORY-004-07 and STORY-003-13 commit to `mcp/` only (no CLI files); STORY-004-07's commit includes the `invites` migration.

### Next Sprint Preview
`SPRINT-04`: EPIC-006 (Admin UI — SvelteKit) — 10 Stories. Includes the deferred `POST /admin-api/v1/auth/exchange` session → admin-JWT route and `cleargate-admin login` GitHub OAuth device flow as closeout items once the OAuth infra lands.
