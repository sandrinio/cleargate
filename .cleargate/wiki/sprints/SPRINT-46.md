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
cited_by: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/SPRINT-46_build_step_sized_by_risk.md"
last_ingest: "2026-11-14T20:43:13.835Z"
last_ingest_commit: "c811caa1022d57b1d6410c64f9acc1c8e0c97513"
repo: "planning"
last_contradict_sha: "4d498cf6a2e74d3e7f1e446187c5bcea29f1e600414d61f63ba94f89e5d959db"
---

# SPRINT-46: Build Step Sized by Risk

**Status:** Draft · **Dates:** 2026-11-15 → 2026-11-19 · **Gate:** pass

## Goal
Make the build step fit the item: a script assigns fast, standard or runtime from risk signals, a shipped runner runs the plan as written, scripts replace the agents that only ran commands, and QA-Verify runs the item and names where a defect is, proven by a dry run of the shipped runner, a real scan of a copy of dispenser_adapter, and lane assignment on the last four sprints' items.

## Deliverables
The Proof column applies INITIATIVE-002 rule 1 by hand, as in SPRINT-45. Lanes are set at the Sprint
Design Review by the current rubric; this sprint runs on the current loop.

| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure | Proof (tier — check) |
|---|---|---|---|---|---|---|
| `STORY-066-03` | Pre-gate scan runs configured commands on any stack (absorbs BUG-087) | standard | M1 | y | med | Real run — `pre_gate_runner.sh qa` on a copy of dispenser_adapter runs `make check`; meta-repo worktree reports `n/a`, not FAIL |
| `STORY-066-04` | Kickoff baseline | standard | M1 | y | low | Real run — kickoff on a fixture sprint writes `baseline.json` with a known pre-existing failure |
| `STORY-066-05` | Computed lanes | standard | M1 | y | med | Real run — `assign_lane.mjs` over SPRINT-43..46 items and dispenser_adapter SPRINT-04 stories |
| `STORY-066-06` | Stage table | standard | M1 | y | low | Unit — `stagesFor` per lane; verdict validation with `lane` and `stages_run` |
| `STORY-066-07` | QA-Red seals its own tests | standard | M1 | y | med | Integration — `seal_red.mjs` on a fixture repo commits, scans and flags an oversized red set |
| `STORY-066-08` | Merge by script (absorbs BUG-086, BUG-107, BUG-116) | standard | M2 | n (after 03, 04) | high | Integration — `merge_story.mjs` on npm and Go fixture repos: clean, failing check, conflict, residue |
| `STORY-066-09` | QA-Verify runs the item | standard | M2 | n (after 04, 07) | med | Unit + docs-match-code — pack `commands` section; `DEFECT_IN` in the VERIFY output contract |
| `STORY-066-10` | Rework by defect location | standard | M2 | n (after 05) | low | Unit — `--defect-in` events; `sprint_metrics.mjs` split on a fixture sprint |

[+346 bytes not shown — read .cleargate/delivery/pending-sync/SPRINT-46_build_step_sized_by_risk.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (11): [[EPIC-066]], [[STORY-066-03]], [[STORY-066-04]], [[STORY-066-05]], [[STORY-066-06]], [[STORY-066-07]], [[STORY-066-08]], [[STORY-066-09]], [[STORY-066-10]], [[STORY-066-11]], [[STORY-066-12]]
- Cites (8): [[BUG-086]], [[BUG-087]], [[EPIC-065]], [[EPIC-066]], [[INITIATIVE-002]], [[SPRINT-42]], [[SPRINT-43]], [[SPRINT-45]]
<!-- END relations -->
