---
type: sprint
id: "SPRINT-46"
parent: ""
children: 
  - "[[EPIC-066]]"
  - "[[STORY-066-03]]"
  - "[[STORY-066-04]]"
  - "[[STORY-066-05]]"
  - "[[STORY-066-06]]"
  - "[[STORY-066-07]]"
  - "[[STORY-066-08]]"
  - "[[STORY-066-09]]"
  - "[[STORY-066-10]]"
  - "[[STORY-066-11]]"
  - "[[STORY-066-12]]"
cites: 
  - "[[BUG-086]]"
  - "[[BUG-087]]"
  - "[[EPIC-065]]"
  - "[[EPIC-066]]"
  - "[[INITIATIVE-002]]"
  - "[[SPRINT-42]]"
  - "[[SPRINT-43]]"
  - "[[SPRINT-45]]"
cited_by: 
  - "[[SPRINT-47]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-46_build_step_sized_by_risk.md"
last_ingest: "2026-11-15T22:01:22.099Z"
last_ingest_commit: "66e3803832a5759bb8ab4562bf48d67ca6039142"
repo: "planning"
last_contradict_sha: "4d498cf6a2e74d3e7f1e446187c5bcea29f1e600414d61f63ba94f89e5d959db"
report_raw_path: ".cleargate/sprint-runs/SPRINT-46/SPRINT-46_REPORT.md"
last_report_ingest_commit: "66e3803832a5759bb8ab4562bf48d67ca6039142"
---

# SPRINT-46: Build Step Sized by Risk

**Status:** Completed · **Dates:** 2026-11-15 → 2026-11-19 · **Gate:** pass

## Goal
Make the build step fit the item: a script assigns fast, standard or runtime from risk signals, a shipped runner runs the plan as written, scripts replace the agents that only ran commands, and QA-Verify runs the item and names where a defect is, proven by a dry run of the shipped runner, a real scan of a copy of dispenser_adapter, and lane assignment on the last four sprints' items.

## Deliverables
<!-- cleargate:ignore-ids -->The Proof column applies INITIATIVE-002 rule 1 by hand, as in SPRINT-45.<!-- /cleargate:ignore-ids --> Lanes are set at the Sprint
Design Review by the current rubric; this sprint runs on the current loop.

| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure | Proof (tier — check) |
|---|---|---|---|---|---|---|
| `STORY-066-03` | Pre-gate scan runs configured commands on any stack <!-- cleargate:ignore-ids -->(absorbs BUG-087)<!-- /cleargate:ignore-ids --> | standard | M1 | y | med | Real run — `pre_gate_runner.sh qa` on a copy of dispenser_adapter runs `make check`; meta-repo worktree reports `n/a`, not FAIL |
| `STORY-066-04` | Kickoff baseline | standard | M1 | y | low | Real run — kickoff on a fixture sprint writes `baseline.json` with a known pre-existing failure |
| `STORY-066-05` | Computed lanes | standard | M1 | y | med | <!-- cleargate:ignore-ids -->Real run — `assign_lane.mjs` over SPRINT-43..46 items and dispenser_adapter SPRINT-04 stories<!-- /cleargate:ignore-ids --> |
| `STORY-066-06` | Stage table | standard | M1 | y | low | Unit — `stagesFor` per lane; verdict validation with `lane` and `stages_run` |
| `STORY-066-07` | QA-Red seals its own tests | standard | M1 | y | med | Integration — `seal_red.mjs` on a fixture repo commits, scans and flags an oversized red set |
| `STORY-066-08` | Merge by script <!-- cleargate:ignore-ids -->(absorbs BUG-086, BUG-107, BUG-116)<!-- /cleargate:ignore-ids --> | standard | M2 | n (after 03, 04) | high | Integration — `merge_story.mjs` on npm and Go fixture repos: clean, failing check, conflict, residue |
| `STORY-066-09` | QA-Verify runs the item | standard | M2 | n (after 04, 07) | med | Unit + docs-match-code — pack `commands` section; `DEFECT_IN` in the VERIFY output contract |

[+4,318 bytes not shown — read .cleargate/delivery/archive/SPRINT-46_build_step_sized_by_risk.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (11): [[EPIC-066]], [[STORY-066-03]], [[STORY-066-04]], [[STORY-066-05]], [[STORY-066-06]], [[STORY-066-07]], [[STORY-066-08]], [[STORY-066-09]], [[STORY-066-10]], [[STORY-066-11]], [[STORY-066-12]]
- Cites (8): [[BUG-086]], [[BUG-087]], [[EPIC-065]], [[EPIC-066]], [[INITIATIVE-002]], [[SPRINT-42]], [[SPRINT-43]], [[SPRINT-45]]
- Cited by (1): [[SPRINT-47]]
<!-- END relations -->
<!-- BEGIN sprint-report -->
## Sprint Report
**Report status:** Shipped · **Report:** .cleargate/sprint-runs/SPRINT-46/SPRINT-46_REPORT.md · **Improvement suggestions:** .cleargate/sprint-runs/SPRINT-46/improvement-suggestions.md

### Carried Over
- None. All 21 items are Done. Findings deferred to later sprints are in `intake.md` (58 lines; low/medium, most from sandbox runs 1-7 and post-flights). Gate 4 re-sync notes (copy-together lists: `lib/sprint-root.mjs`, `seal_red.mjs`, `pre_gate_runner.sh`, `merge_story.mjs`, `validate_bounce_readiness.mjs`, `qa_red_lint.mjs`, `wave_runner.js`, `record_baseline.mjs`, `assign_lane.mjs`, `lib/sprint-finish.mjs`) are recorded in sprint-context Mid-Sprint Amendments, rule 11.
<!-- END sprint-report -->
