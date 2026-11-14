---
type: sprint
id: "SPRINT-45"
parent: ""
children: 
  - "[[BUG-117]]"
  - "[[BUG-133]]"
  - "[[BUG-134]]"
  - "[[CR-120]]"
  - "[[EPIC-064]]"
  - "[[STORY-064-01]]"
  - "[[STORY-064-02]]"
cites: []
cited_by: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/SPRINT-45_measured_loop_and_safe_upgrade.md"
last_ingest: "2026-11-14T08:11:40.337Z"
last_ingest_commit: ""
repo: "planning"
last_contradict_sha: "9f4323fce86953e6a8c25dfc6074064025057e9cbf36a85baad100dd56b430fe"
---

# SPRINT-45: Measured Loop and Safe Upgrade

**Status:** Draft · **Dates:** 2026-11-14 → 2026-11-17 · **Gate:** pass

## Goal
Make the sprint report's rework and cost figures come from what actually happened (the host's subagent transcripts and git), and make `cleargate upgrade` safe for repos with local edits, proven against a holdout recount of SPRINT-44 and dispenser_adapter's sprints.

## Deliverables
The Proof column applies INITIATIVE-002 rule 1 by hand: the tier, and the check that produces the evidence.

| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure | Proof (tier — check) |
|---|---|---|---|---|---|---|
| `CR-120` | Measure the subagent, not the orchestrator — dispatch ledger incl. workflow runs | standard | M1 | y | med | Real run — reader on SPRINT-44 and dispenser_adapter sessions; dispatch counts match the holdout recount |
| `STORY-064-01` | Per-item metrics derived from transcripts and git | standard | M1 | y (on contract C1) | med | Real run — `sprint_metrics.mjs` on the evidence set vs the holdout recount (10% / ±1 per item) |
| `STORY-064-02` | Sprint report reads derived metrics | standard | M2 | n (after 064-01) | low | Real run — bundle for SPRINT-44 and SPRINT-45's own close |
| `BUG-117` | Pricing table lacks Claude 5 models | fast | M1 | y | low | Unit — pricing lookups for every Claude 5 model id |
| `BUG-133` | Upgrade output hides lost local edits | standard | M1 | y | med | Real run — packed RC, `upgrade --dry-run` on a copy of dispenser_adapter |
| `BUG-134` | Upgrade settings merge reorders hooks | standard | M1 | y | low | Real run — packed RC, `upgrade --yes` on a copy of dispenser_adapter; `settings.json` diff shows only ClearGate hooks |

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (7): [[BUG-117]], [[BUG-133]], [[BUG-134]], [[CR-120]], [[EPIC-064]], [[STORY-064-01]], [[STORY-064-02]]
<!-- END relations -->
