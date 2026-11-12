---
type: epic
id: "EPIC-054"
parent: ""
children: 
  - "[[BUG-042]]"
  - "[[BUG-043]]"
  - "[[BUG-055]]"
  - "[[BUG-059]]"
  - "[[BUG-060]]"
  - "[[CR-105]]"
  - "[[CR-112]]"
  - "[[STORY-054-01]]"
  - "[[STORY-054-02]]"
  - "[[STORY-054-03]]"
  - "[[STORY-054-04]]"
  - "[[STORY-054-05]]"
  - "[[STORY-054-06]]"
  - "[[STORY-054-07]]"
cites: 
  - "[[BUG-041]]"
  - "[[CR-039]]"
  - "[[EPIC-033]]"
  - "[[EPIC-052]]"
cited_by: 
  - "[[BUG-042]]"
  - "[[BUG-043]]"
  - "[[BUG-055]]"
  - "[[BUG-059]]"
  - "[[BUG-088]]"
  - "[[CR-105]]"
  - "[[CR-112]]"
  - "[[CR-123]]"
  - "[[STORY-054-01]]"
  - "[[STORY-054-02]]"
  - "[[STORY-054-03]]"
  - "[[STORY-054-04]]"
  - "[[STORY-054-05]]"
  - "[[STORY-054-06]]"
  - "[[STORY-054-07]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-054_Spike_And_Task_Decomposition_Surfaces.md"
last_ingest: "2026-11-12T20:33:09.611Z"
last_ingest_commit: "3a8f523f763e2c95870b25af7fabfacafcc749fc"
repo: "planning"
---

# EPIC-054: Spike & Task Decomposition Surfaces — Discovery Before, Execution Within

**Status:** Completed · **Sprint:** none · **Gate:** pass

## Objective
Add the two missing decomposition surfaces — a pre-sprint SPIKE charter type for bounded discovery, and a Task Breakdown section inside Story/CR/Bug for L3 execution sequencing — without adding a second granularity to the sprint execution machine.

## Problem & Value
**Why are we doing this?**

ClearGate has exactly one granularity between "epic" and "commit": the Story. That single rung is asked to carry two jobs it cannot do, at opposite ends of the lifecycle.

**Before a spec exists**, there is no artifact for bounded discovery.

[+1,895 bytes not shown — read .cleargate/delivery/archive/EPIC-054_Spike_And_Task_Decomposition_Surfaces.md]

## Scope
**In:**
- [ ] **WS1 — Spike charter template.** New `.cleargate/templates/spike.md` + the `cleargate-planning/.cleargate/templates/` mirror.
**Out:**
- A `task` work-item type, id, or remote push. Tasks are a template section and nothing more.
- Any `state.json` schema change, spike lane, spike worktree, or spike token-ledger attribution. Spikes are pre-sprint and produce a document, not merged code.

[+6,098 bytes not shown — read .cleargate/delivery/archive/EPIC-054_Spike_And_Task_Decomposition_Surfaces.md]

## Architecture rules
- The atomic execution unit stays the Story. Nothing in this epic may add a second unit to state.json, worktree cutting, dispatch markers, or token-ledger attribution.
- Tasks are a template section, never a pushed work item. They get no id, no remote id, no lifecycle state.
- Spikes run pre-sprint. A spike never enters the five-agent loop and its prototype code never merges to a sprint branch.

[+841 bytes not shown — read .cleargate/delivery/archive/EPIC-054_Spike_And_Task_Decomposition_Surfaces.md]

## Decisions
- "Should tasks be a work-item type with ids that push to the PM tool, or a template section?" → Template section. Confirmed after the closed-set execution unit was verified in `state.json` — `stories` is the only per-unit map, and a second unit would have to grow through worktrees, dispatch markers, ledger attribution, the lane rubric, and the wave planner. Recorded as the WS6 scope boundary and as an explicit OUT-OF-SCOPE line.
- "Does a spike run inside the five-agent loop, or pre-sprint?" → Pre-sprint.

[+721 bytes not shown — read .cleargate/delivery/archive/EPIC-054_Spike_And_Task_Decomposition_Surfaces.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (14): [[BUG-042]], [[BUG-043]], [[BUG-055]], [[BUG-059]], [[BUG-060]], [[CR-105]], [[CR-112]], [[STORY-054-01]], [[STORY-054-02]], [[STORY-054-03]], [[STORY-054-04]], [[STORY-054-05]], [[STORY-054-06]], [[STORY-054-07]]
- Cites (4): [[BUG-041]], [[CR-039]], [[EPIC-033]], [[EPIC-052]]
- Cited by (15): [[BUG-042]], [[BUG-043]], [[BUG-055]], [[BUG-059]], [[BUG-088]], [[CR-105]], [[CR-112]], [[CR-123]], [[STORY-054-01]], [[STORY-054-02]], [[STORY-054-03]], [[STORY-054-04]], [[STORY-054-05]], [[STORY-054-06]], [[STORY-054-07]]
<!-- END relations -->
