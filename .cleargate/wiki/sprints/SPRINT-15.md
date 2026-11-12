---
type: sprint
id: "SPRINT-15"
parent: ""
children: 
  - "[[STORY-015-05]]"
  - "[[STORY-015-06]]"
cites: []
cited_by: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-15_Process_v3.md"
last_ingest: "2026-11-12T20:33:09.611Z"
last_ingest_commit: "89539e8bfcdb817b90712e9e148c6e392145214e"
repo: "planning"
sprint_cleargate_id: "SPRINT-15"
report_raw_path: ".cleargate/sprint-runs/SPRINT-15/REPORT.md"
last_report_ingest_commit: "6883a94781e46a04f797d1e76e74a69b95c21b33"
---

# SPRINT-15: Process v3 — Awareness, Ledger, Hierarchy, Upgrade

**Status:** Completed · **Sprint:** SPRINT-15 · **Gate:** not run

## Goal
Tighten ClearGate's *internal* process layer so the framework can describe its own state honestly to itself, its agents, and its operators. Five things land together:

1. **Wiki tells the truth about contradictions.** EPIC-020 ships an advisory contradiction-check phase in wiki-ingest so Draft work items get screened against their cited neighborhood. No new gates blocked; surfaces drift the lint pass can't see.
2. **The token ledger reports real cost.** Two sequential CRs in M3 split per the granularity rubric (L3+high default split): **CR-016** replaces transcript-scan attribution with explicit dispatch markers (closes BUG-021); **CR-018** replaces cumulative-snapshot rows with per-turn deltas + flips the Reporter contract + cuts the 0.9.0 release (closes BUG-022). Reporter math becomes additive across multi-session sprints; Anthropic-dashboard reconciliation becomes possible.
3.

[+2,088 bytes not shown — read .cleargate/delivery/archive/SPRINT-15_Process_v3.md]

## Deliverables
| Item | Type | Title | Lane | Complexity | Parallel? | Bounce Exposure | Milestone |
|---|---|---|---|---|---|---|---|
| `STORY-020-01` | Story | Contradict subagent + schema delta (`last_contradict_sha` additive) | standard | L2 | n | med | M1 |
| `STORY-020-02` | Story | Wiki-ingest Phase 4 + advisory contradictions log | standard | L2 | n | med | M1 |
| `STORY-020-03` | Story | `cleargate wiki contradict` CLI subcommand | standard | L1 | y | low | M1 |
| `STORY-015-05` | Story | Templates: add `parent_cleargate_id:` + `sprint_cleargate_id:` top-level keys to epic.md / story.md / Sprint Plan Template.md / CR.md / Bug.md / hotfix.md | fast | L1 | y | low | M2 |
| `STORY-015-06` | Story | `cleargate push` + wiki-ingest extract & propagate hierarchy keys; one-shot backfill on next ingest pass | standard | L2 | n | med | M2 |
| [`CR-016`](CR-016_Token_Ledger_Hook_v2.md) | CR | Token Ledger — dispatch-marker attribution (closes BUG-021) | standard | L2 | n | med | M3 |

[+3,815 bytes not shown — read .cleargate/delivery/archive/SPRINT-15_Process_v3.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (2): [[STORY-015-05]], [[STORY-015-06]]
<!-- END relations -->
<!-- BEGIN sprint-report -->
## Sprint Report
**Report status:** Shipped · **Report:** .cleargate/sprint-runs/SPRINT-15/REPORT.md · **Improvement suggestions:** .cleargate/sprint-runs/SPRINT-15/improvement-suggestions.md

### Carried Over
- None.
<!-- END sprint-report -->
