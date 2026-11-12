---
type: sprint
id: "SPRINT-06"
parent: ""
children: []
cites: []
cited_by: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-06_Admin_UI.md"
last_ingest: "2026-11-12T19:31:58.580Z"
last_ingest_commit: "df788e44cbb85fc71c13016b80799a517cde93db"
repo: "planning"
sprint_cleargate_id: "SPRINT-06"
report_raw_path: ".cleargate/sprint-runs/SPRINT-06/REPORT.md"
last_report_ingest_commit: "6883a94781e46a04f797d1e76e74a69b95c21b33"
---

# SPRINT-06: Admin UI (SvelteKit + DaisyUI + GitHub OAuth)

**Status:** Completed · **Sprint:** SPRINT-06 · **Gate:** not run

## Goal
Ship **EPIC-006 (Admin UI)** end-to-end on SvelteKit 2 + Svelte 5 + Tailwind v4 + DaisyUI 5 with the custom **`cleargate` theme** from the [Design Guide](../../knowledge/design-guide.md), and close out the two OAuth-path items deferred from SPRINT-03 (`POST /admin-api/v1/auth/exchange` for the UI session → admin-JWT handoff, and `cleargate-admin login` for the CLI device flow). After this sprint, a root admin can (a) log in at `admin.cleargate.<domain>` via GitHub OAuth and drive every EPIC-004 surface visually (projects · members · tokens · items · audit · stats · settings), and (b) alternatively log in from a terminal via `cleargate-admin login` without needing to hand-paste `CLEARGATE_ADMIN_TOKEN`. The admin container ships to Coolify with a repeatable runbook. This closes PROPOSAL-003's v0.1 admin-surface scope — after SPRINT-04, every Admin API endpoint has at least one documented client path.

## Deliverables
### EPIC-006 — Admin UI (10 stories)
- [`STORY-006-01`](STORY-006-01_SvelteKit_Scaffold.md): SvelteKit + DaisyUI + Tailwind scaffold — `admin/` package, custom `cleargate` theme registered per Design Guide §2.2, Inter Variable self-hosted, shell layout (72px top bar + inset sidebar) per §7.1 · L2
- [`STORY-006-02`](STORY-006-02_GitHub_OAuth_Session.md): GitHub OAuth + Redis session — `@auth/sveltekit` + custom Redis adapter (shared MCP Redis), session cookie → admin-JWT via `POST /admin-api/v1/auth/exchange` · L3
- [`STORY-006-03`](STORY-006-03_Dashboard.md): Dashboard — `/` route listing projects with member counts + actionable empty state · L1
- [`STORY-006-04`](STORY-006-04_Project_Detail_Members.md): Project detail + members — overview page + members page with invite modal (copyable URL) and remove-member flow · L2
- [`STORY-006-05`](STORY-006-05_Tokens_Page.md): Tokens page + one-time-display modal — plaintext shown once, "I've saved it" gate + `beforeunload` warning · L2
- [`STORY-006-06`](STORY-006-06_Items_Browser_History.md): Items browser + version history — paginated list + timeline view (last 10 versions) · L2
- [`STORY-006-07`](STORY-006-07_Audit_Viewer.md): Audit log viewer — date-range picker, user + tool filters, cursor pagination · L2
- [`STORY-006-08`](STORY-006-08_Stats_Page.md): Stats page — Chart.js bar chart (requests/day), error rate,

[+1,023 bytes not shown — read .cleargate/delivery/archive/SPRINT-06_Admin_UI.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
<!-- END relations -->
<!-- BEGIN sprint-report -->
## Sprint Report
**Report status:** unknown · **Report:** .cleargate/sprint-runs/SPRINT-06/REPORT.md

### Carried Over
(none recorded)
<!-- END sprint-report -->
