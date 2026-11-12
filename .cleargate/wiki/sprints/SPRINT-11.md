---
type: sprint
id: "SPRINT-11"
parent: ""
children: []
cites: []
cited_by: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-11_Wiki_Hygiene.md"
last_ingest: "2026-11-12T19:31:58.580Z"
last_ingest_commit: "e2fef1f5c8d58f66c94aa3418a1150ece11573d2"
repo: "planning"
sprint_cleargate_id: "SPRINT-11"
report_raw_path: ".cleargate/sprint-runs/SPRINT-11/REPORT.md"
last_report_ingest_commit: "6883a94781e46a04f797d1e76e74a69b95c21b33"
---

# SPRINT-11: Wiki Index Hygiene & Scale

**Status:** Completed · **Sprint:** SPRINT-11 · **Gate:** not run

## Goal
Ship **EPIC-015** — reshape `.cleargate/wiki/index.md` from a flat 151-row table into a scale-ready hierarchical index, land a status-audit CLI that reconciles stale frontmatter (SPRINT-10, EPIC-001, EPIC-008, EPIC-009 and their stranded child stories), add a token-budget lint to block index bloat at the gate, and wire a sprint-close stamp so the drift we just fixed stays fixed.

After this sprint: agents reading `index.md` at session start see an Active surface ≤ 2k tokens (80% case), `cleargate wiki lint` fails if the index exceeds 8k tokens, and `cleargate sprint-archive` stamps sprint frontmatter to Completed atomically before rebuilding the wiki.

**Scope:** 4 stories, 1 epic. All four already approved 🟢 Low Ambiguity from the 2026-04-24 interrogation pass (6 questions resolved).

## Deliverables
| Story | Complexity | Parallel? | Bounce Exposure | Milestone |
|---|---|---|---|---|
| [`STORY-015-01`](STORY-015-01_Hierarchical_Index_Rendering.md) Hierarchical Index Rendering | L2 | y | low | M1 |
| [`STORY-015-02`](STORY-015-02_Status_Audit_CLI.md) Status Audit CLI + One-Time Fix | L2 | y | low | M1 |
| [`STORY-015-03`](STORY-015-03_Index_Token_Budget_Lint.md) Index Token-Budget Lint | L1 | n | low | M2 |
| [`STORY-015-04`](STORY-015-04_Abandoned_Status_And_Sprint_Close_Stamp.md) Abandoned Status + Sprint-Close Stamp | L2 | n | med | M2 |

**Totals: 4 stories, 1 Epic. Complexity: 1×L1 + 3×L2. No L3/L4.**

<!-- BEGIN relations -->
## Relations
- Parent: none
<!-- END relations -->
<!-- BEGIN sprint-report -->
## Sprint Report
**Report status:** unknown · **Report:** .cleargate/sprint-runs/SPRINT-11/REPORT.md

### Carried Over
(none recorded)
<!-- END sprint-report -->
