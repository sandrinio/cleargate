---
type: sprint
id: "SPRINT-31"
parent: ""
children: []
cites: 
  - "[[EPIC-031]]"
  - "[[SPRINT-42]]"
  - "[[STORY-031-01]]"
  - "[[STORY-031-02]]"
cited_by: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/SPRINT-31_Test_Speed.md"
last_ingest: "2026-11-12T21:25:29.802Z"
last_ingest_commit: "a6e6d2b749ca8aac494c2d5ffd3c13bbe825fb38"
repo: "planning"
sprint_cleargate_id: "SPRINT-31"
---

# SPRINT-31: Test Speed — Runner Split + Scoped QA

**Status:** Draft · **Sprint:** SPRINT-31 · **Gate:** pass

## Goal
- **Sprint Goal:** Cut sprint-execution test wall time by ≥ 50% on cleargate-cli/ by splitting the test runner (parallel-unit + serial-db) and switching QA-Verify default to scoped tests.

- **Success measure:** `time npm test` on cleargate-cli/ drops from ~10min to ≤ 5min on an 8-core machine; QA-Verify dispatches in the next sprint run scoped by default; full-suite invocations cite a trigger.

## Deliverables
| ID | Type | Lane | Milestone | Parallel? | Bounce exposure |
|---|---|---|---|---|---|
| STORY-031-01 | Story | standard | M1 | y | low |
| STORY-031-02 | Story | standard | M1 | y | low |

Both stories are L1/L2 and touch disjoint surfaces (cleargate-cli/package.json + test files vs cleargate-planning/.claude/agents/qa.md + template). They can run in parallel in M1.

<!-- BEGIN relations -->
## Relations
- Parent: none
- Cites (4): [[EPIC-031]], [[SPRINT-42]], [[STORY-031-01]], [[STORY-031-02]]
<!-- END relations -->
