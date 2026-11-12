---
type: epic
id: "EPIC-033"
parent: ""
children: 
  - "[[STORY-033-01]]"
  - "[[STORY-033-02]]"
  - "[[STORY-033-03]]"
  - "[[STORY-033-04]]"
cites: 
  - "[[BUG-029]]"
cited_by: 
  - "[[BUG-046]]"
  - "[[BUG-049]]"
  - "[[CR-074]]"
  - "[[EPIC-053]]"
  - "[[EPIC-054]]"
  - "[[EPIC-055]]"
  - "[[EPIC-057]]"
  - "[[STORY-033-02]]"
  - "[[STORY-033-03]]"
  - "[[STORY-033-04]]"
  - "[[STORY-054-07]]"
  - "[[STORY-058-12]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-033_Parallel_Wave_Sprint_Execution.md"
last_ingest: "2026-11-12T20:33:09.611Z"
last_ingest_commit: "eb44e22d41c078a7f8efd139e15a6dfee49f91c2"
repo: "planning"
sprint_cleargate_id: "SPRINT-31"
---

# EPIC-033: Parallel-Wave Sprint Execution via Dynamic Workflows

**Status:** Completed · **Sprint:** SPRINT-31 · **Gate:** pass

## Objective
Replace the orchestrator's per-dispatch babysitting (write marker → spawn agent → read prose → decide → spawn next) with Architect-planned, collision-free PARALLEL WAVES executed as Claude Code Dynamic Workflows: the Architect schedules stories into waves on a file-surface axis (+ a coarse DB axis); the Orchestrator launches each wave

[+257 bytes not shown — read .cleargate/delivery/archive/EPIC-033_Parallel_Wave_Sprint_Execution.md]

## Problem & Value
**Why are we doing this?**

The five-dispatch sprint loop runs strictly serially. The Orchestrator babysits every step — write a dispatch marker, spawn an agent, read its prose result, decide, spawn the next — burning main-context tokens on glue and wall-time on stories that have no reason to wait for each other.

[+2,963 bytes not shown — read .cleargate/delivery/archive/EPIC-033_Parallel_Wave_Sprint_Execution.md]

## Scope
**In:**
- [ ] **STORY-033-01 — Workflow Capability Spike (BLOCKING).** Probe the Workflow↔hook contract; record a yes/no checklist that selects the ledger-writer and
**Out:**
- Any change to `mcp/` or `admin/` source. They are separate deploy products (Coolify / deploy-mirror) with their own lifecycle.

[+3,275 bytes not shown — read .cleargate/delivery/archive/EPIC-033_Parallel_Wave_Sprint_Execution.md]

## Architecture rules
- SPIKE GATES EVERYTHING. No execution story (STORY-033-02..04) is implemented until STORY-033-01 answers the Workflow↔hook contract. (Partial result already observed this session — see §1.)
- PLANNING-LAYER SCOPE.

[+1,513 bytes not shown — read .cleargate/delivery/archive/EPIC-033_Parallel_Wave_Sprint_Execution.md]

## Decisions
- Kill-switch surface — env var (`CLEARGATE_PARALLEL_WAVES=off`) or a sprint-frontmatter field (`execution_mode: v2-parallel` vs `v2-serial`)? → Accept — sprint-frontmatter field (`execution_mode: v2-parallel` | `v2-serial`), with `CLEARGATE_PARALLEL_WAVES=off` as a within-session override.

[+978 bytes not shown — read .cleargate/delivery/archive/EPIC-033_Parallel_Wave_Sprint_Execution.md]

## Open questions
- Spike outcome branch — if STORY-033-01 shows `workflow()` does NOT emit the `Task` event (hooks dead under workflows), proceed with barrier-written ledger rows from `verdict.tokens`, or pause execution stories and ship only the planning workflow (STORY-033-03) until the runtime exposes a workflow-dispatch hook?

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (4): [[STORY-033-01]], [[STORY-033-02]], [[STORY-033-03]], [[STORY-033-04]]
- Cites (1): [[BUG-029]]
- Cited by (12): [[BUG-046]], [[BUG-049]], [[CR-074]], [[EPIC-053]], [[EPIC-054]], [[EPIC-055]], [[EPIC-057]], [[STORY-033-02]], [[STORY-033-03]], [[STORY-033-04]], [[STORY-054-07]], [[STORY-058-12]]
<!-- END relations -->
