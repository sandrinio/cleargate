---
type: sprint
id: "SPRINT-32"
parent: ""
children: []
cites: []
cited_by: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-32_Parallel_Waves_And_Code_Map.md"
last_ingest: "2026-11-12T21:25:29.802Z"
last_ingest_commit: "22b2db2d6a2697c471c85cb18ed53bc17ad6ca9b"
repo: "planning"
sprint_cleargate_id: "SPRINT-32"
report_raw_path: ".cleargate/sprint-runs/SPRINT-32/SPRINT-32_REPORT.md"
last_report_ingest_commit: "6883a94781e46a04f797d1e76e74a69b95c21b33"
---

# SPRINT-32: Parallel Waves + Code Map

**Status:** Completed · **Sprint:** SPRINT-32 · **Gate:** pass

## Goal
Ship EPIC-033 v1 (parallel-wave sprint execution on a fixed token-ledger) and EPIC-032 (code-map awareness layer), enabling the next planning sprint to run collision-free parallel waves with correct per-story attribution and structure-aware Architect planning.

## Deliverables
| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure |
|---|---|---|---|---|---|
| `STORY-033-02` | Parallel-Spawn Ledger Attribution (RUN_ID, barrier-writer) | standard | M1 | y | med |
| `STORY-032-01` | TS skeleton extractor (exports/signatures/import-edges + `db_writes`) | standard | M1 | y | med |
| `STORY-033-03` | Architect Planning Workflow (SDR fan-out) | standard | M2 | y | med |
| `STORY-032-02` | Code-map page schema + git-SHA drift + token budget | standard | M2 | y | low |
| `STORY-033-04` | Wave Execution + Barrier (`launch_wave.mjs`, kill-switch) | standard | M2 | n | high |
| `STORY-032-03` | wiki-build integration + synthesis/index linking + Architect consumption | standard | M2 | n | med |

<!-- BEGIN relations -->
## Relations
- Parent: none
<!-- END relations -->
<!-- BEGIN sprint-report -->
## Sprint Report
**Report status:** Shipped · **Report:** .cleargate/sprint-runs/SPRINT-32/SPRINT-32_REPORT.md · **Improvement suggestions:** .cleargate/sprint-runs/SPRINT-32/improvement-suggestions.md

### Carried Over
- None. All 6 stories reached Done.
<!-- END sprint-report -->
