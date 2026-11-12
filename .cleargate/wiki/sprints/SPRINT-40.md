---
type: sprint
id: "SPRINT-40"
parent: ""
children: []
cites: 
  - "[[BUG-041]]"
cited_by: 
  - "[[BUG-094]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-40_field_defect_remediation.md"
last_ingest: "2026-11-12T20:33:09.611Z"
last_ingest_commit: "a6e6d2b749ca8aac494c2d5ffd3c13bbe825fb38"
repo: "planning"
sprint_cleargate_id: "SPRINT-40"
report_raw_path: ".cleargate/sprint-runs/SPRINT-40/SPRINT-40_REPORT.md"
last_report_ingest_commit: "b99863b7a923f80c9de4ee3e837fcdcc00856d7c"
---

# SPRINT-40: Field-Defect Remediation

**Status:** Completed · **Sprint:** SPRINT-40 · **Gate:** pass

## Goal
Restore the agent-dispatch telemetry that a host tool rename silently broke, so sprint accounting and the pre-dispatch flashcard gate work again.

## Deliverables
| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure |
|---|---|---|---|---|---|
| `BUG-068` | PreToolUse dispatch hooks gate on the tool name `Task` | standard | M1 | n | med |
| `BUG-069` | Token-ledger fallback inherits the previous row's attribution | standard | M1 | n | med |
| `CR-117` | A CLI script that ignores an argument says so | fast | M2 | n | low |

**Descoped at SDR (2026-09-01), human decision.** `BUG-047`, `BUG-048`, and `CR-115` were refused by
`architect-synth` under the BUG-046 reachability predicate: their surfaces lie in `cleargate-cli/**`,
an independent nested git repo that is gitignored here and materializes zero tracked files inside a
`git worktree add` checkout. `collision_surface.sh` prescribes the remedy itself — *"Edit it from the
main checkout."* They remain in `pending-sync/`, approved and gate-passing, for a follow-up sprint
scoped for cli-main-checkout execution, where BUG-048's two-substrate split can be decided
deliberately rather than under kickoff pressure.

<!-- BEGIN relations -->
## Relations
- Parent: none
- Cites (1): [[BUG-041]]
- Cited by (1): [[BUG-094]]
<!-- END relations -->
<!-- BEGIN sprint-report -->
## Sprint Report
**Report status:** Shipped · **Report:** .cleargate/sprint-runs/SPRINT-40/SPRINT-40_REPORT.md · **Improvement suggestions:** .cleargate/sprint-runs/SPRINT-40/improvement-suggestions.md

### Carried Over
- None.

**Footnote — three items descoped, not carried over.** `BUG-047`, `BUG-048`, `CR-115` were refused
by `architect-synth` at Sprint Design Review under the BUG-046 reachability predicate: their
surfaces live in `cleargate-cli/**`, an independent nested git repo that is gitignored in this
meta-repo and materializes zero tracked files inside a `git worktree add` checkout. They never
entered a wave and are not "carried over" in the bounce/escalation sense — they remain in
`pending-sync/`, approved and gate-passing, for a follow-up sprint scoped for cli-main-checkout
execution. Descoping this way narrowed the Sprint Goal itself (see sprint-context.md's goal-narrow
note) and left `CR-117` as `GOAL_RELATION: off critical path` — real, necessary work, just not what
this sprint is measured by.
<!-- END sprint-report -->
