---
type: sprint
id: "SPRINT-42"
parent: ""
children: 
  - "[[BUG-052]]"
  - "[[EPIC-059]]"
  - "[[STORY-059-01]]"
  - "[[STORY-059-02]]"
  - "[[STORY-059-03]]"
  - "[[STORY-059-04]]"
cites: 
  - "[[BUG-118]]"
  - "[[BUG-119]]"
cited_by: 
  - "[[SPRINT-31]]"
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/SPRINT-42_planning_catches_what_execution_stopped_for.md"
last_ingest: "2026-11-13T01:02:08.963Z"
last_ingest_commit: "7ba61eb5110056cbc5302b31b3248bf5e2331090"
repo: "planning"
sprint_cleargate_id: "SPRINT-42"
---

# SPRINT-42: Planning Catches What Execution Stopped For

**Status:** Draft · **Dates:** 2026-10-08 → 2026-10-16 · **Gate:** pass

## Goal
- **Sprint Goal:** Move to plan confirmation the owner decisions a downstream sprint paid for mid-execution, and make the surface gate check each story commit against that story's own surface.

- **Success measure:** (1) EPIC-059's four rules are in the canonical scaffold and the live mirror, pinned by tests. §A.4 names `sprint.draft_reviewers` and §§2.1–2.6, `config.example.yml` documents the key, and the Sprint Plan template carries §2.6. (2) With `sprint.draft_reviewers` empty, §A.4 behaves exactly as today. (3) After BUG-052 merges, a commit on `story/<ID>` is checked against `<ID>`'s §3.1 with no `SKIP_SURFACE_GATE=1`, and orchestrator commits to `.cleargate/delivery/**` and `.cleargate/sprint-runs/**` on a branch with no story id pass. (4) `doctor` reports no scaffold drift for any touched file after the dist rebuild.

## Deliverables
| ID | Type | Lane | Milestone | Parallel? | Bounce exposure |
|---|---|---|---|---|---|
| BUG-052 | Bug | standard | M1 | y | med |
| STORY-059-01 | Story | standard | M1 | y | low |
| STORY-059-03 | Story | standard | M1 | y | med |
| STORY-059-04 | Story | fast | M1 | y | low |
| STORY-059-02 | Story | standard | M2 | n | med |

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (6): [[BUG-052]], [[EPIC-059]], [[STORY-059-01]], [[STORY-059-02]], [[STORY-059-03]], [[STORY-059-04]]
- Cites (2): [[BUG-118]], [[BUG-119]]
- Cited by (1): [[SPRINT-31]]
<!-- END relations -->
