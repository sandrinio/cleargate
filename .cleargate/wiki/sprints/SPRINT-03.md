---
type: sprint
id: "SPRINT-03"
parent: ""
children: []
cites: []
cited_by: 
  - "[[EPIC-002]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-03_CLI_Packages.md"
last_ingest: "2026-11-13T01:02:08.963Z"
last_ingest_commit: "e2fef1f5c8d58f66c94aa3418a1150ece11573d2"
repo: "planning"
sprint_cleargate_id: "SPRINT-03"
report_raw_path: ".cleargate/sprint-runs/SPRINT-03/REPORT.md"
last_report_ingest_commit: "6883a94781e46a04f797d1e76e74a69b95c21b33"
---

# SPRINT-03: CLI Packages (`cleargate-cli` scaffold + Admin CLI + `cleargate join`)

**Status:** Completed · **Dates:** 2026-04-17 → 2026-04-18 · **Gate:** not run

## Goal
Ship the two CLI packages that make the MCP hub operable without the UI: (a) `cleargate-cli` — the shared scoped npm package (`@cleargate/cli`) that every future client command roots into; (b) `cleargate-admin` — headless admin ops run against SPRINT-02's `/admin-api/v1/*` surface; (c) `cleargate join` — the Vibe Coder onboarding flow that redeems an invite token and seats a refresh token in the OS keychain. Two storage-layer corrections also land this sprint: STORY-004-07 migrates invite storage from Redis-only (SPRINT-02) to a Postgres `invites` table (durability + auditability + UI queryability), and STORY-003-13 adds the MCP-side `POST /join/:invite_token` redemption route that SPRINT-01 didn't cover. After this sprint, a root admin can create a project + issue an invite from their terminal, a Vibe Coder can redeem the invite on their machine, and Claude Code can authenticate to MCP using the resulting refresh token — with no UI required.

## Deliverables
### EPIC-000 — `cleargate-cli` Package Scaffold (4 stories)
- [`STORY-000-01`](STORY-000-01_Package_Scaffold.md): Package scaffold — `cleargate-cli/` sibling of `mcp/`, `@cleargate/cli` scoped name, `bin/cleargate`, tsup build, ESM + CJS dual emit — ✅ Done 2026-04-17 (`3bcfcd4`)
- [`STORY-000-02`](STORY-000-02_Commander_Entry.md): Commander entry — `cli.ts` with stub subcommands registered, `--help` / `--version` working — ✅ Done 2026-04-17 (`43c50c3`)
- [`STORY-000-03`](STORY-000-03_Config_Loader.md): Config loader — zod-validated, precedence = flags > env > `~/.cleargate/config.json` > defaults — ✅ Done 2026-04-17 (`acde4ba`)
- [`STORY-000-04`](STORY-000-04_Token_Store.md): TokenStore abstraction — Keychain + File fallback, `~/.cleargate/auth.json` chmod 600 — ✅ Done 2026-04-18 (`f97b3f1`) — `@napi-rs/keyring@^1.2.0` chosen; 🟡 marker resolved

### EPIC-003 — MCP Server Core (1 add-in, closing SPRINT-01 gap)
- [`STORY-003-13`](STORY-003-13_Join_Redemption.md): `POST /join/:invite_token` — public MCP redemption route, atomic `UPDATE … RETURNING` against `invites` table, reuses STORY-003-02 refresh-token issuance — ✅ Done 2026-04-18 (`e3c2550`) — includes new anonymous rate-limit bucket (10 req / 15 min per IP)

[+2,010 bytes not shown — read .cleargate/delivery/archive/SPRINT-03_CLI_Packages.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Cited by (1): [[EPIC-002]]
<!-- END relations -->
<!-- BEGIN sprint-report -->
## Sprint Report
**Report status:** unknown · **Report:** .cleargate/sprint-runs/SPRINT-03/REPORT.md

### Carried Over
(none recorded)
<!-- END sprint-report -->
