---
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-19T00:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "post-phase-2c"
---

# ClearGate Work-Items Index

Curated roadmap of Epics, Stories, Sprints, and Proposals. Raw files live in `pending-sync/` (active/planned/draft) or `archive/` (shipped/approved). Once EPIC-002 Knowledge Wiki ships (SPRINT-04), a compiled `.cleargate/wiki/index.md` will supersede this hand-curated index for day-to-day triage; this file will persist as the strategic overview.

## Proposal → Epic map

| Source Proposal | Epic | Status | Priority |
|---|---|---|---|
| — | [EPIC-000: CLI Package Scaffold](archive/EPIC-000_CLI_Package_Scaffold.md) | ✅ Completed (SPRINT-03) | Prerequisite for EPIC-001, EPIC-002, EPIC-005 |
| [PROP-001](archive/PROPOSAL-001_Document_Metadata.md) | [EPIC-001: Document Metadata Lifecycle](pending-sync/EPIC-001_Document_Metadata_Lifecycle.md) | 🟢 Ready | Medium (blocked by EPIC-000 + cross-Epic dep on STORY-003-03) |
| [PROP-002](archive/PROPOSAL-002_Knowledge_Wiki.md) | [EPIC-002: Knowledge Wiki Layer](pending-sync/EPIC-002_Knowledge_Wiki_Layer.md) | 🟢 Ready — **SPRINT-04** | **High — active sprint** |
| [PROP-003](archive/PROPOSAL-003_MCP_Adapter.md) | [EPIC-003: MCP Server Core](archive/EPIC-003_MCP_Server_Core.md) | ✅ Completed (SPRINT-01 + SPRINT-03) | **High — shipped** |
| [PROP-003](archive/PROPOSAL-003_MCP_Adapter.md) | [EPIC-004: Admin API](archive/EPIC-004_Admin_API.md) | ✅ Completed (SPRINT-02 + SPRINT-03) | Medium — shipped |
| [PROP-003](archive/PROPOSAL-003_MCP_Adapter.md) | [EPIC-005: Admin CLI + Client Bootstrap](archive/EPIC-005_Admin_CLI.md) | ✅ Completed (SPRINT-03) | Low — shipped (OAuth login deferred to SPRINT-05) |
| [PROP-003](archive/PROPOSAL-003_MCP_Adapter.md) | [EPIC-006: Admin UI (SvelteKit)](pending-sync/EPIC-006_Admin_UI.md) | 🟢 Ready — SPRINT-05 | High — deferred one sprint |

## Story decomposition (57 Stories across 7 Epics)

### EPIC-000: CLI Package Scaffold (4)
- [STORY-000-01: Package Scaffold](archive/STORY-000-01_Package_Scaffold.md) · L1
- [STORY-000-02: Commander Entry](archive/STORY-000-02_Commander_Entry.md) · L1
- [STORY-000-03: Config Loader](archive/STORY-000-03_Config_Loader.md) · L1
- [STORY-000-04: Token Store (Keychain + File)](archive/STORY-000-04_Token_Store.md) · L2

### EPIC-001: Document Metadata Lifecycle (6)
- [STORY-001-01: Template Metadata Fields](pending-sync/STORY-001-01_Template_Metadata_Fields.md) · L1
- [STORY-001-02: Protocol §11](pending-sync/STORY-001-02_Protocol_Section_11.md) · L1
- [STORY-001-03: codebase-version helper](pending-sync/STORY-001-03_Codebase_Version_Helper.md) · L2
- [STORY-001-04: stamp-frontmatter helper](pending-sync/STORY-001-04_Stamp_Frontmatter_Helper.md) · L2
- [STORY-001-05: `cleargate stamp` CLI](pending-sync/STORY-001-05_Stamp_CLI.md) · L1
- [STORY-001-06: MCP push_item writes server_pushed_at_version](pending-sync/STORY-001-06_MCP_Pushed_At_Version.md) · L1 · depends on STORY-003-03

### EPIC-002: Knowledge Wiki Layer (9)
- [STORY-002-01: Protocol §10](pending-sync/STORY-002-01_Protocol_Section_10.md) · L1
- [STORY-002-02: wiki-ingest subagent](pending-sync/STORY-002-02_Wiki_Ingest_Subagent.md) · L2
- [STORY-002-03: wiki-query subagent](pending-sync/STORY-002-03_Wiki_Query_Subagent.md) · L1
- [STORY-002-04: wiki-lint subagent](pending-sync/STORY-002-04_Wiki_Lint_Subagent.md) · L2
- [STORY-002-05: init writes PostToolUse hook](pending-sync/STORY-002-05_Init_Writes_Hook.md) · L2
- [STORY-002-06: `cleargate wiki build` CLI](pending-sync/STORY-002-06_Wiki_Build_CLI.md) · L2
- [STORY-002-07: `cleargate wiki ingest` CLI](pending-sync/STORY-002-07_Wiki_Ingest_CLI.md) · L2
- [STORY-002-08: `cleargate wiki lint` CLI](pending-sync/STORY-002-08_Wiki_Lint_CLI.md) · L2
- [STORY-002-09: Synthesis templates](pending-sync/STORY-002-09_Synthesis_Templates.md) · L1

### EPIC-003: MCP Server Core (13) — the critical path
- [STORY-003-01: DB schema + Drizzle migrations](archive/STORY-003-01_DB_Schema_Migrations.md) · L3
- [STORY-003-02: JWT issue/verify/refresh](archive/STORY-003-02_JWT_Auth.md) · L3
- [STORY-003-03: push_item + versioning + prune](archive/STORY-003-03_Push_Item.md) · L3
- [STORY-003-04: pull_item](archive/STORY-003-04_Pull_Item.md) · L1
- [STORY-003-05: list_items (cursor pagination)](archive/STORY-003-05_List_Items.md) · L2
- [STORY-003-06: sync_status](archive/STORY-003-06_Sync_Status.md) · L1
- [STORY-003-07: Rate-limit middleware](archive/STORY-003-07_Rate_Limit.md) · L2
- [STORY-003-08: Idempotency middleware](archive/STORY-003-08_Idempotency.md) · L2
- [STORY-003-09: Audit middleware](archive/STORY-003-09_Audit_Middleware.md) · L2
- [STORY-003-10: Streamable HTTP transport](archive/STORY-003-10_Streamable_HTTP.md) · L3 · 🟡
- [STORY-003-11: First-admin bootstrap](archive/STORY-003-11_Admin_Bootstrap.md) · L2
- [STORY-003-12: Dockerfile + Coolify runbook](archive/STORY-003-12_Dockerfile_Coolify.md) · L2
- [STORY-003-13: `POST /join/:invite_token` redemption](archive/STORY-003-13_Join_Redemption.md) · L2 · added post-SPRINT-02 · scheduled in SPRINT-03

### EPIC-004: Admin API (8)
- [STORY-004-01: Admin JWT middleware](archive/STORY-004-01_Admin_JWT_Middleware.md) · L2
- [STORY-004-02: Projects CRUD](archive/STORY-004-02_Projects_CRUD.md) · L2
- [STORY-004-03: Members CRUD](archive/STORY-004-03_Members_CRUD.md) · L2
- [STORY-004-04: Tokens CRUD (one-time-display)](archive/STORY-004-04_Tokens_CRUD.md) · L2
- [STORY-004-05: Audit log query](archive/STORY-004-05_Audit_Endpoint.md) · L2
- [STORY-004-06: Stats endpoint](archive/STORY-004-06_Stats_Endpoint.md) · L2
- [STORY-004-07: Invite storage retrofit (Redis → Postgres)](archive/STORY-004-07_Invite_Storage_Retrofit.md) · L2 · added post-SPRINT-02 · shipped in SPRINT-03
- [STORY-004-08: `POST /admin-api/v1/auth/exchange` (session → admin JWT)](pending-sync/STORY-004-08_Auth_Exchange.md) · L2 · added post-SPRINT-03 · scheduled in SPRINT-04

### EPIC-005: Admin CLI + Client Bootstrap (6)
- [STORY-005-01: `cleargate-admin create-project`](archive/STORY-005-01_Admin_CLI_Create_Project.md) · L1
- [STORY-005-02: `cleargate-admin invite`](archive/STORY-005-02_Admin_CLI_Invite.md) · L1
- [STORY-005-03: `cleargate-admin issue-token`](archive/STORY-005-03_Admin_CLI_Issue_Token.md) · L1
- [STORY-005-04: `cleargate-admin revoke-token`](archive/STORY-005-04_Admin_CLI_Revoke.md) · L1
- [STORY-005-05: `cleargate join`](archive/STORY-005-05_Cleargate_Join.md) · L2
- [STORY-005-06: `cleargate-admin login` (GitHub OAuth device flow)](pending-sync/STORY-005-06_Admin_CLI_Login.md) · L2 · added post-SPRINT-03 · scheduled in SPRINT-04

### EPIC-006: Admin UI — SvelteKit (10)
- [STORY-006-01: SvelteKit + DaisyUI + Tailwind scaffold](pending-sync/STORY-006-01_SvelteKit_Scaffold.md) · L2
- [STORY-006-02: GitHub OAuth + Redis session](pending-sync/STORY-006-02_GitHub_OAuth_Session.md) · L3
- [STORY-006-03: Dashboard](pending-sync/STORY-006-03_Dashboard.md) · L1
- [STORY-006-04: Project detail + members](pending-sync/STORY-006-04_Project_Detail_Members.md) · L2
- [STORY-006-05: Tokens page + one-time-display modal](pending-sync/STORY-006-05_Tokens_Page.md) · L2
- [STORY-006-06: Items browser + version history](pending-sync/STORY-006-06_Items_Browser_History.md) · L2
- [STORY-006-07: Audit viewer](pending-sync/STORY-006-07_Audit_Viewer.md) · L2
- [STORY-006-08: Stats page (Chart.js)](pending-sync/STORY-006-08_Stats_Page.md) · L2
- [STORY-006-09: Settings page (root only)](pending-sync/STORY-006-09_Settings_Page.md) · L1
- [STORY-006-10: Dockerfile + Coolify runbook](pending-sync/STORY-006-10_Dockerfile_Coolify.md) · L2

## Sprint roadmap

| Sprint | Epic(s) | Goal | Status |
|---|---|---|---|
| [SPRINT-01](archive/SPRINT-01_MCP_v0.1.md) | EPIC-003 | MCP Server v0.1 — deployable, four tools, auth + middleware | **Completed** (2026-04-17) |
| [SPRINT-02](archive/SPRINT-02_Admin_API.md) | EPIC-004 | Admin API — CRUD + audit + stats | **Completed** (2026-04-17) |
| [SPRINT-03](archive/SPRINT-03_CLI_Packages.md) | EPIC-000 + EPIC-005 (+ STORY-003-13, STORY-004-07) | CLI package scaffold + admin CLI + `cleargate join` + MCP redemption route + invite storage retrofit | **Completed** (2026-04-18) — 11/11 stories; ops close-out tracked in [REPORT.md](../sprint-runs/SPRINT-03/REPORT.md) |
| [SPRINT-04](pending-sync/SPRINT-04_Knowledge_Wiki.md) | EPIC-002 | Knowledge Wiki Layer (Karpathy pattern) + subagents + PostToolUse hook — adapted for our three-repo case (git-SHA drift, dual-source ingest) | **Active** (start 2026-04-19) |
| [SPRINT-05](pending-sync/SPRINT-05_Admin_UI.md) | EPIC-006 (+ auth/exchange + `cleargate-admin login`) | Admin UI (SvelteKit + Chart.js + GitHub OAuth) + deferred OAuth closeouts | Planned (deferred one sprint from SPRINT-04) |
| SPRINT-06 | EPIC-001 | Document metadata lifecycle (stamp CLI + MCP push-time version) — priority re-assessed post-SPRINT-04 since wiki uses git SHA, not stamp-frontmatter | Planned |
| v1.1 batch | PM adapters, webhooks, OAuth 2.1, wiki-federation (cross-repo) | Deferred | Post-launch |

## Draft order (original, superseded by sprint roadmap above)

1. **EPIC-000** — CLI package scaffold. Small, unblocks EPIC-001/002/005.
2. **EPIC-003** — MCP server core. Critical path. Start with STORY-003-01 (schema) → STORY-003-02 (JWT) → STORY-003-03 (push_item) → STORY-003-10 (transport) for the v0.1 milestone.
3. **EPIC-004** — Admin API. Builds on EPIC-003 schema.
4. **EPIC-006** — Admin UI. Builds on EPIC-004 endpoints + OpenAPI.
5. **EPIC-005** — Admin CLI + `cleargate join`. Builds on EPIC-004 + EPIC-000.
6. **EPIC-001** — Metadata lifecycle. Builds on EPIC-000 + cross-Epic dep on STORY-003-03.
7. **EPIC-002** — Knowledge wiki. Builds on EPIC-000.

## Gate status

- All three Proposals: ✅ Approved (Gate 1 passed).
- Seven Epics: ✅ EPIC-000, EPIC-003, EPIC-004 (pending STORY-004-08 in SPRINT-05), EPIC-005 (pending STORY-005-06 in SPRINT-05) Completed-or-nearly as of 2026-04-19; **EPIC-002 active in SPRINT-04**; 🟢 Ready — EPIC-001, EPIC-006 (deferred to SPRINT-05).
- 57 Stories: 29 shipped (SPRINT-01: 12, SPRINT-02: 6, SPRINT-03: 11); 9 scheduled in SPRINT-04 (all EPIC-002); 12 scheduled in SPRINT-05 (10 EPIC-006 + STORY-004-08 + STORY-005-06); 7 remaining across EPIC-001 (6) plus STORY-001-06 cross-cut. Ambiguity at drafting: 🟢 Low (55), 🟡 Medium (2: STORY-002-05 hook syntax — will be WebFetch-resolved at Architect plan time per SPRINT-04 Risk row 1). STORY-000-04's 🟡 marker resolved in SPRINT-03 close-out (`@napi-rs/keyring@^1.2.0`).

## Storage provider

**Postgres 18** (vendor-neutral via `DATABASE_URL`). Local Docker for dev, Coolify-managed for prod. **Redis 8** also Coolify-managed. See [PROPOSAL-003 §2.12](archive/PROPOSAL-003_MCP_Adapter.md) for the full stack table.

## Stack versions reference (verified April 2026)

Single source of truth for version decisions. Stories reference libraries by name; this table is the canonical version spec. Update here when bumping majors.

| Layer | Version | Notes |
|---|---|---|
| Node.js | 24 LTS (Krypton) | Active LTS; Node 22 now Maintenance |
| TypeScript | ^5.8 | Conservative pin; TS 6 released but most typings still target 5.x |
| Fastify | ^5.8 | v5 production hardening applied in `server.ts` |
| @modelcontextprotocol/sdk | ^1.29 (v1.x) | v2 pre-alpha; v1 is production-recommended |
| Drizzle ORM | ^0.45.2 | v1.0 still beta; 0.45.2 has SQL injection fix |
| Drizzle Kit | ^0.30 | Matches 0.45.x orm |
| Zod | ^4.3 | v4 major rewrite from v3 — watch for API differences |
| pino | ^9.4 | + `pino-pretty` devDep for dev mode |
| Postgres | 18 | 18.3 latest as of Feb 2026 |
| Redis | 8 | Redis 8.6.x GA Feb 2026 |
| SvelteKit | ^2 (Svelte ^5 runtime) | Svelte 5 is default |
| Tailwind CSS | ^4.2 | v4 = major rewrite; CSS-first config via `@import "tailwindcss"` |
| DaisyUI | ^5.5 | Tailwind v4 compatible via `@plugin "daisyui"` |
| Chart.js | ^4 | Per EPIC-006 Q2 override |
| `@auth/sveltekit` | current | GitHub OAuth provider only in v1 |

## Complexity summary

| Level | Count | Notes |
|---|---|---|
| L1 (trivial, <1hr) | 20 | Stamping, config loading, one-off CLI wrappers, UI pages |
| L2 (standard, 2-4hr) | 30 | Most middleware, CRUD routes, UI components |
| L3 (complex, 1-2d) | 5 | Schema, JWT, push_item, Streamable HTTP, OAuth+session |
| L4 (uncertain, >2d) | 0 | None at this granularity |
