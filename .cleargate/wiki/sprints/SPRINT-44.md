---
type: sprint
id: "SPRINT-44"
parent: ""
children: []
cites: 
  - "[[BUG-052]]"
  - "[[BUG-087]]"
  - "[[BUG-118]]"
  - "[[BUG-119]]"
cited_by: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-44_dashboard_backlog_board_and_sprint_planner.md"
last_ingest: "2026-11-12T20:33:09.611Z"
last_ingest_commit: "9d2bc8c9597007f7d12cf32c477364a29752960b"
repo: "planning"
sprint_cleargate_id: "SPRINT-44"
report_raw_path: ".cleargate/sprint-runs/SPRINT-44/SPRINT-44_REPORT.md"
last_report_ingest_commit: "fc6bdeec9ef2b5e8e2a11dc76e70c8c973df97a7"
---

# SPRINT-44: Dashboard Backlog Board and Sprint Planner

**Status:** Completed · **Sprint:** SPRINT-44 · **Gate:** pass

## Goal
Ship `cleargate dashboard`: one local page where the owner sees every open work item, assembles the next sprint, and follows the running one, with `cleargate sprint add|remove` as the single write path for sprint membership.

**Proposed Goal Acceptance Check** (confirmed at Gate 2, recorded in `sprint-context.md`):
1. With no `.active` sentinel, `cleargate dashboard --open` serves a page with Backlog, Plan and Sprint tabs, and the Backlog lists the repo's pending-sync items with gate badges.
2. `cleargate sprint add <draft-sprint> <ids> --json` followed by `sprint remove` round-trips, and `git diff` on the touched files shows only frontmatter list, `sprint_cleargate_id` and stamp changes.
3. `POST /plan` without the launch token returns 403; with it, a Plan-tab commit changes membership exactly as the command does.
4. `npm run typecheck` and `npm test` are green in `cleargate-cli/`.
5. After the Gate 4 rebuild and re-sync, `node cleargate-cli/dist/cli.js doctor` reports no scaffold drift for the sprint-dashboard skill.

## Deliverables
| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure |
|---|---|---|---|---|---|
| `STORY-062-01` | Dashboard runs without a sprint, with a tab shell | standard | M1 | y | med |
| `STORY-062-02` | Backlog collector and Backlog tab | standard | M1 | y | low |
| `STORY-062-03` | `cleargate sprint add` and `remove` command | standard | M1 | y | med |
| `STORY-062-04` | Plan tab and guarded write endpoint | standard | M2 | n | med |
| `STORY-062-05` | Backlog ticket view and host guard (mid-sprint scope add, owner-approved at the walkthrough) | standard | M3 | n | low |
| `STORY-062-06` | Backlog status filter (mid-sprint scope add, owner request at the walkthrough) | standard | M4 | n | low |

<!-- BEGIN relations -->
## Relations
- Parent: none
- Cites (4): [[BUG-052]], [[BUG-087]], [[BUG-118]], [[BUG-119]]
<!-- END relations -->
<!-- BEGIN sprint-report -->
## Sprint Report
**Report status:** Shipped · **Report:** .cleargate/sprint-runs/SPRINT-44/SPRINT-44_REPORT.md · **Improvement suggestions:** .cleargate/sprint-runs/SPRINT-44/improvement-suggestions.md

### Carried Over
None. Carry-forward follow-ups (not stories) are listed in §6 Process.
<!-- END sprint-report -->
