---
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-19T16:05:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "post-SPRINT-05"
---

# ClearGate Work-Items Index

Curated roadmap of Epics, Stories, Sprints, and Proposals. Raw files live in `pending-sync/` (active/planned/draft) or `archive/` (shipped/approved). The compiled `.cleargate/wiki/index.md` supersedes this hand-curated index for day-to-day triage (built via `cleargate wiki build`); this file persists as the strategic overview.

## Proposal → Epic map

| Source Proposal | Epic | Status | Priority |
|---|---|---|---|
| — | [EPIC-000: CLI Package Scaffold](archive/EPIC-000_CLI_Package_Scaffold.md) | ✅ Completed (SPRINT-03) | Prerequisite for EPIC-001, EPIC-002, EPIC-005 |
| [PROP-001](archive/PROPOSAL-001_Document_Metadata.md) | [EPIC-001: Document Metadata Lifecycle](archive/EPIC-001_Document_Metadata_Lifecycle.md) | ✅ Completed (SPRINT-05) | **High — shipped** |
| [PROP-002](archive/PROPOSAL-002_Knowledge_Wiki.md) | [EPIC-002: Knowledge Wiki Layer](archive/EPIC-002_Knowledge_Wiki_Layer.md) | ✅ Completed (SPRINT-04) | **High — shipped** |
| [PROP-003](archive/PROPOSAL-003_MCP_Adapter.md) | [EPIC-003: MCP Server Core](archive/EPIC-003_MCP_Server_Core.md) | ✅ Completed (SPRINT-01 + SPRINT-03) | **High — shipped** |
| [PROP-003](archive/PROPOSAL-003_MCP_Adapter.md) | [EPIC-004: Admin API](archive/EPIC-004_Admin_API.md) | ✅ Completed (SPRINT-02 + SPRINT-03) | Medium — shipped |
| [PROP-003](archive/PROPOSAL-003_MCP_Adapter.md) | [EPIC-005: Admin CLI + Client Bootstrap](archive/EPIC-005_Admin_CLI.md) | ✅ Completed (SPRINT-03) | Low — shipped (OAuth login deferred to SPRINT-06) |
| [PROP-003](archive/PROPOSAL-003_MCP_Adapter.md) | [EPIC-006: Admin UI (SvelteKit)](pending-sync/EPIC-006_Admin_UI.md) | 🟢 Ready — SPRINT-06 | High — deferred twice (SPRINT-04 → SPRINT-05 → SPRINT-06) |
| [PROP-004](archive/PROPOSAL-004_Public_Discoverability.md) | [EPIC-007: Public Discoverability](archive/EPIC-007_Public_Discoverability.md) | ✅ Completed (ad-hoc post-SPRINT-04, 2026-04-19) | High — repo published, SEO-optimized |
| [PROP-005](archive/PROPOSAL-005_Token_Cost_And_Readiness_Gates.md) | [EPIC-008: Token Cost + Readiness Gates](archive/EPIC-008_Token_Cost_And_Readiness_Gates.md) | ✅ Completed (SPRINT-05) | **High — shipped** |
| [PROP-006](archive/PROPOSAL-006_Scaffold_Manifest_And_Uninstall.md) | [EPIC-009: Scaffold Manifest + Uninstall](archive/EPIC-009_Scaffold_Manifest_And_Uninstall.md) | ✅ Completed (SPRINT-05) | Medium — shipped |
| [PROP-007](pending-sync/PROPOSAL-007_Multi_Participant_MCP_Sync.md) | EPIC-TBD: Multi-Participant MCP Sync | 🔴 Draft Proposal — wait and observe (Q10 resolution) | Low — target 3–6 months post-SPRINT-05 |

## Story decomposition (78 Stories across 9 Epics — 59 shipped)

### EPIC-000: CLI Package Scaffold (4) — ✅ shipped in SPRINT-03
- [STORY-000-01: Package Scaffold](archive/STORY-000-01_Package_Scaffold.md) · L1
- [STORY-000-02: Commander Entry](archive/STORY-000-02_Commander_Entry.md) · L1
- [STORY-000-03: Config Loader](archive/STORY-000-03_Config_Loader.md) · L1
- [STORY-000-04: Token Store (Keychain + File)](archive/STORY-000-04_Token_Store.md) · L2

### EPIC-001: Document Metadata Lifecycle (6) — ✅ shipped in SPRINT-05
- [STORY-001-01: Template Metadata Fields](archive/STORY-001-01_Template_Metadata_Fields.md) · L1 · `b104529`
- [STORY-001-02: Protocol §11](archive/STORY-001-02_Protocol_Section_11.md) · L1 · `37da42e`
- [STORY-001-03: codebase-version helper](archive/STORY-001-03_Codebase_Version_Helper.md) · L2 · `1a46e3d`
- [STORY-001-04: stamp-frontmatter helper](archive/STORY-001-04_Stamp_Frontmatter_Helper.md) · L2 · `2b103d8`
- [STORY-001-05: `cleargate stamp` CLI](archive/STORY-001-05_Stamp_CLI.md) · L1 · `23234ca`
- [STORY-001-06: MCP push_item writes server_pushed_at_version](archive/STORY-001-06_MCP_Pushed_At_Version.md) · L1 · `ca263ff` (in mcp/)

### EPIC-002: Knowledge Wiki Layer (9) — ✅ shipped in SPRINT-04
- [STORY-002-01: Protocol §10](archive/STORY-002-01_Protocol_Section_10.md) · L1 · `aef73b1`
- [STORY-002-02: wiki-ingest subagent](archive/STORY-002-02_Wiki_Ingest_Subagent.md) · L2 · `8c82e30`
- [STORY-002-03: wiki-query subagent](archive/STORY-002-03_Wiki_Query_Subagent.md) · L1 · `8c82e30`
- [STORY-002-04: wiki-lint subagent](archive/STORY-002-04_Wiki_Lint_Subagent.md) · L2 · `8c82e30`
- [STORY-002-05: init writes PostToolUse hook](archive/STORY-002-05_Init_Writes_Hook.md) · L2 · `f98b2b8`
- [STORY-002-06: `cleargate wiki build` CLI](archive/STORY-002-06_Wiki_Build_CLI.md) · L2 · `bee297e`
- [STORY-002-07: `cleargate wiki ingest` CLI](archive/STORY-002-07_Wiki_Ingest_CLI.md) · L2 · `c890bb0`
- [STORY-002-08: `cleargate wiki lint` CLI](archive/STORY-002-08_Wiki_Lint_CLI.md) · L2 · `7d5ebcb`
- [STORY-002-09: Synthesis templates + open-gates corpus-shape fix](archive/STORY-002-09_Synthesis_Templates.md) · L1 · `8448039`

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
- [STORY-004-08: `POST /admin-api/v1/auth/exchange` (session → admin JWT)](pending-sync/STORY-004-08_Auth_Exchange.md) · L2 · scheduled in SPRINT-06

### EPIC-005: Admin CLI + Client Bootstrap (6)
- [STORY-005-01: `cleargate-admin create-project`](archive/STORY-005-01_Admin_CLI_Create_Project.md) · L1
- [STORY-005-02: `cleargate-admin invite`](archive/STORY-005-02_Admin_CLI_Invite.md) · L1
- [STORY-005-03: `cleargate-admin issue-token`](archive/STORY-005-03_Admin_CLI_Issue_Token.md) · L1
- [STORY-005-04: `cleargate-admin revoke-token`](archive/STORY-005-04_Admin_CLI_Revoke.md) · L1
- [STORY-005-05: `cleargate join`](archive/STORY-005-05_Cleargate_Join.md) · L2
- [STORY-005-06: `cleargate-admin login` (GitHub OAuth device flow)](pending-sync/STORY-005-06_Admin_CLI_Login.md) · L2 · scheduled in SPRINT-06

### EPIC-006: Admin UI — SvelteKit (10) — scheduled in SPRINT-06
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

### EPIC-007: Public Discoverability (4) — ✅ shipped ad-hoc post-SPRINT-04
- See archive — repo renamed, description + topics set, root README + CLI README synced.

### EPIC-008: Token Cost + Readiness Gates (7) — ✅ shipped in SPRINT-05
- [STORY-008-01: Author `readiness-gates.md`](archive/STORY-008-01_Readiness_Gates_Doc.md) · L2 · `16ddf86`
- [STORY-008-02: Predicate evaluator + frontmatter-cache libs](archive/STORY-008-02_Predicate_Evaluator.md) · L3 · `7d56c16`
- [STORY-008-03: `cleargate gate` CLI (check + explain)](archive/STORY-008-03_Gate_CLI.md) · L2 · `e723eb5`
- [STORY-008-04: Ledger hook generalization + sprint-routing fix + ledger-reader](archive/STORY-008-04_Ledger_Hook_Generalization.md) · L2 · `0f20994`
- [STORY-008-05: `cleargate stamp-tokens` CLI](archive/STORY-008-05_Stamp_Tokens_CLI.md) · L1 · `08c9d8e`
- [STORY-008-06: PostToolUse + SessionStart hooks + `cleargate doctor` extensions](archive/STORY-008-06_Hooks_And_Doctor.md) · L2 · `354d11b` + kickback `fbbb78a`
- [STORY-008-07: Template stubs + protocol §12 + wiki-lint enforcement](archive/STORY-008-07_Templates_Protocol_WikiLint.md) · L2 · `79fd3ba`

### EPIC-009: Scaffold Manifest + Uninstall (8) — ✅ shipped in SPRINT-05
- [STORY-009-01: sha256 hasher + manifest lib](archive/STORY-009-01_SHA256_Manifest_Lib.md) · L2 · `2c3a0a7`
- [STORY-009-02: Build-time MANIFEST.json + CHANGELOG diff](archive/STORY-009-02_Build_Manifest_And_Changelog.md) · L2 · `02716a1`
- [STORY-009-03: `cleargate init` writes snapshot + restore-from-marker](archive/STORY-009-03_Init_Snapshot_And_Restore.md) · L2 · `84c767a`
- [STORY-009-04: `cleargate doctor --check-scaffold` + drift cache](archive/STORY-009-04_Doctor_Check_Scaffold.md) · L2 · `b77bf73`
- [STORY-009-05: `cleargate upgrade` three-way merge](archive/STORY-009-05_Upgrade_Command.md) · L3 · `1fd2822`
- [STORY-009-06: `claude-md-surgery` + `settings-json-surgery` libs](archive/STORY-009-06_Surgery_Libs.md) · L2 · `ed434df`
- [STORY-009-07: `cleargate uninstall`](archive/STORY-009-07_Uninstall_Command.md) · L3 · `d99fded`
- [STORY-009-08: Protocol §13](archive/STORY-009-08_Protocol_Section_13.md) · L1 · `8d7e97a`

## Sprint roadmap

| Sprint | Epic(s) | Goal | Status |
|---|---|---|---|
| [SPRINT-01](archive/SPRINT-01_MCP_v0.1.md) | EPIC-003 | MCP Server v0.1 — deployable, four tools, auth + middleware | **Completed** (2026-04-17) — 12/12 stories |
| [SPRINT-02](archive/SPRINT-02_Admin_API.md) | EPIC-004 | Admin API — CRUD + audit + stats | **Completed** (2026-04-17) — 6/6 stories |
| [SPRINT-03](archive/SPRINT-03_CLI_Packages.md) | EPIC-000 + EPIC-005 (+ STORY-003-13, STORY-004-07) | CLI package scaffold + admin CLI + `cleargate join` + MCP redemption route + invite storage retrofit | **Completed** (2026-04-18) — 11/11 stories |
| [SPRINT-04](archive/SPRINT-04_Knowledge_Wiki.md) | EPIC-002 | Knowledge Wiki Layer (Karpathy pattern) + subagents + PostToolUse hook | **Completed** (2026-04-19) — 9/9 stories one-shot |
| [SPRINT-05](archive/SPRINT-05_ClearGate_Process_Refinement.md) | EPIC-001 + EPIC-008 + EPIC-009 | ClearGate process refinement (dogfood trifecta): auto-stamped metadata + per-item token cost + machine-checked readiness gates + scaffold manifest with drift detection + clean uninstall | **Completed** (2026-04-19) — 21/21 stories + 1 QA kickback patch; ops close-out tracked in [REPORT.md](../sprint-runs/SPRINT-05/REPORT.md) |
| [SPRINT-06](pending-sync/SPRINT-06_Admin_UI.md) | EPIC-006 (+ STORY-004-08 + STORY-005-06) | Admin UI (SvelteKit + Chart.js + GitHub OAuth) + deferred OAuth closeouts | Planned — deferred twice (SPRINT-04 → SPRINT-05 → SPRINT-06) |
| v1.1 batch | PM adapters, webhooks, OAuth 2.1, wiki-federation (cross-repo), PROP-007 multi-participant sync | Deferred | Post-launch |

## Gate status

- Seven Proposals: ✅ Approved (PROP-001/002/003/004/005/006); 🔴 Draft — PROP-007 (multi-participant sync; wait-and-observe per Q10).
- Ten Epics: ✅ EPIC-000, EPIC-001 (SPRINT-05), EPIC-002 (SPRINT-04), EPIC-003, EPIC-004 (pending STORY-004-08 in SPRINT-06), EPIC-005 (pending STORY-005-06 in SPRINT-06), EPIC-007, EPIC-008 (SPRINT-05), EPIC-009 (SPRINT-05) shipped; 🟢 Ready — EPIC-006 (scheduled for SPRINT-06).
- 78 Stories: 59 shipped (SPRINT-01: 12, SPRINT-02: 6, SPRINT-03: 11, SPRINT-04: 9, SPRINT-05: 21); 12 scheduled in SPRINT-06 (10 EPIC-006 + STORY-004-08 + STORY-005-06); remaining 7 (EPIC-007 repo-ops, not ClearGate framework stories).
- Gate 2 is now machine-checkable — run `cleargate gate check <file>` for Epic/Story/CR/Bug readiness.

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
| js-yaml | ^4.1 | Added in SPRINT-05 for readiness-gates parse |
| diff | ^5.2 | Added in SPRINT-05 for `cleargate upgrade` three-way merge |
| tsx | ^4 | Added in SPRINT-05 for build-manifest prebuild script |

## Planning / Execution process — current state (post-SPRINT-05)

**New CLI commands shipped in SPRINT-05:**
- `cleargate stamp <file>` — stamp metadata frontmatter (idempotent)
- `cleargate stamp-tokens <file>` — hook-invoked; accumulates ledger cost into frontmatter
- `cleargate gate check <file> [-v] [--transition]` — machine-checked readiness gate
- `cleargate gate explain <file>` — human-readable criterion list
- `cleargate doctor [--check-scaffold] [--session-start] [--pricing <file>]` — scaffold drift + session blocked-items + cost preview
- `cleargate upgrade [--dry-run] [--yes] [--only <tier>]` — three-way merge driver
- `cleargate uninstall [--dry-run] [--preserve] [--remove] [--yes] [--path] [--force]` — preservation-first uninstall

**New hooks shipped in SPRINT-05 (`.claude/hooks/` + canonical mirror):**
- `stamp-and-gate.sh` (PostToolUse) — chains `stamp-tokens → gate check → wiki ingest` on edits to `.cleargate/delivery/**`. Always exits 0; failures logged to `.cleargate/hook-log/gate-check.log`.
- `session-start.sh` (SessionStart) — injects blocked-items summary (≤10 items, ≤400 char cap) via `cleargate doctor --session-start`.
- `token-ledger.sh` (SubagentStop, existing) — generalized for `STORY/EPIC/CR/BUG/PROPOSAL` work items via `.active` sentinel routing.

**Protocol sections added in SPRINT-05 (`cleargate-protocol.md`):**
- §11 Document Metadata Lifecycle — field semantics, stamp invocation, dirty-SHA convention, archive immutability, git-absent fallback, stale detection.
- §12 Token Cost & Readiness Gates — `draft_tokens` + `cached_gate_result` semantics, hook chain, severity model (advisory vs enforcing), staleness.
- §13 Scaffold Manifest & Uninstall — MANIFEST.json shape, `.install-manifest.json`, drift detection, upgrade flow, uninstall preservation, `.uninstalled` marker.

**Template stubs added in SPRINT-05 (all 7 templates):**
- Metadata: `created_at`, `updated_at`, `created_at_version`, `updated_at_version` (all 7) + `server_pushed_at_version` (5 write templates).
- Token + gate: `draft_tokens: null`, `cached_gate_result: null` — populated by hooks on first use.

## Complexity summary

| Level | Count (all) | Shipped | Remaining |
|---|---|---|---|
| L1 (trivial, <1hr) | 30 | 26 | 4 |
| L2 (standard, 2-4hr) | 41 | 26 | 15 |
| L3 (complex, 1-2d) | 7 | 7 | 0 |
| L4 (uncertain, >2d) | 0 | 0 | 0 |
| **Total** | **78** | **59** | **19** |

All L3 stories now shipped. Remaining 19 stories: EPIC-006 (10) + STORY-004-08 + STORY-005-06 + EPIC-007 ops stories already shipped. The SPRINT-06 story count is 12; any deltas reflect subsequent replanning.
