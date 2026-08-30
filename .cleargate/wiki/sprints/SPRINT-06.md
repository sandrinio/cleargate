---
type: sprint
id: "SPRINT-06"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-06_Admin_UI.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "df788e44cbb85fc71c13016b80799a517cde93db"
repo: "planning"
---

# SPRINT-06: Admin UI (SvelteKit + DaisyUI + GitHub OAuth)

## Sprint Goal

Ship **EPIC-006 (Admin UI)** end-to-end on SvelteKit 2 + Svelte 5 + Tailwind v4 + DaisyUI 5 with the custom **`cleargate` theme** from the [Design Guide](../../knowledge/design-guide.md), and close out the two OAuth-path items deferred from SPRINT-03 (`POST /admin-api/v1/auth/exchange` for the UI session → admin-JWT handoff, and `cleargate-admin login` for the CLI device flow). After this sprint, a root admin can (a) log in at `admin.cleargate.<domain>` via GitHub OAuth and drive every EPIC-004 surface visually (projects · members · tokens · items · audit · stats · settings), and (b) alternatively log in from a terminal via `cleargate-admin login` without needing to hand-paste `CLEARGATE_ADMIN_TOKEN`. The admin container ships to Coolify with a repeatable runbook. This closes PROPOSAL-003's v0.1 admin-surface scope — after SPRINT-04, every Admin API endpoint has at least one documented client path.

## Consolidated Deliverables

[+19,542 bytes not shown — read .cleargate/delivery/archive/SPRINT-06_Admin_UI.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
