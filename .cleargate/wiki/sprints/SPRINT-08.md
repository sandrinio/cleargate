---
type: sprint
id: "SPRINT-08"
parent: ""
children: 
  - "[[EPIC-011]]"
cites: []
cited_by: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-08_End_To_End_Production_Readiness.md"
last_ingest: "2026-11-13T01:02:08.963Z"
last_ingest_commit: "e2fef1f5c8d58f66c94aa3418a1150ece11573d2"
repo: "planning"
sprint_cleargate_id: "SPRINT-08"
report_raw_path: ".cleargate/sprint-runs/SPRINT-08/REPORT.md"
last_report_ingest_commit: "6883a94781e46a04f797d1e76e74a69b95c21b33"
---

# SPRINT-08: End-to-End Production Readiness

**Status:** Completed · **Dates:** from 2026-04-20 · **Gate:** not run

## Goal
Ship **EPIC-011 (End-to-End Production Readiness)** — close the four remaining onboarding blockers (CLI wire-up · service-token middleware · bootstrap-root CLI · Coolify deploy execution) so that a brand-new user can run `npm install cleargate && cleargate init && cleargate join <invite-url> && cleargate sync` against a production `mcp.cleargate.<domain>` + `admin.cleargate.<domain>` in under 5 minutes. After this sprint, ClearGate v1-alpha is demonstrably shippable.

## Deliverables
### EPIC-011 — End-to-End Production Readiness (4 stories)

- [`STORY-011-01`](STORY-011-01_Wire_Acquire_Into_CLI.md): Wire `acquireAccessToken` into sync / pull / push / sync-log / conflicts / mcp-client — single-flight cache, env-first fallback, clear `no-stored-token` error · **L1**
- [`STORY-011-02`](STORY-011-02_Service_Token_Middleware.md): Service-token middleware on `/mcp` — bcrypt-compare plaintext Bearer against `tokens.token_hash`, chain order JWT → service-token → 401, pino redaction holds · **L2**
- [`STORY-011-03`](STORY-011-03_Bootstrap_Root_Admin.md): `cleargate admin bootstrap-root <handle>` — idempotent SQL via `pg`, refuses second root without `--force`, scrubs DATABASE_URL password from errors · **L2**
- [`STORY-011-04`](STORY-011-04_Coolify_Deploy_Execution.md): Coolify deploy execution — register 2 prod GitHub OAuth apps, provision subdomains with TLS, run bootstrap-root, E2E onboarding verification, record time-to-deploy · **L2** (ops-heavy; zero new code)

**Total: 4 stories, 1 Epic. Complexity: 1 × L1 + 3 × L2.**

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (1): [[EPIC-011]]
<!-- END relations -->
<!-- BEGIN sprint-report -->
## Sprint Report
**Report status:** unknown · **Report:** .cleargate/sprint-runs/SPRINT-08/REPORT.md

### Carried Over
(none recorded)
<!-- END sprint-report -->
