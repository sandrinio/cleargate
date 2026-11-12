---
type: epic
id: "EPIC-055"
parent: ""
children: 
  - "[[CR-124]]"
cites: 
  - "[[BUG-033]]"
  - "[[BUG-034]]"
  - "[[CR-106]]"
  - "[[CR-124]]"
  - "[[CR-126]]"
  - "[[EPIC-033]]"
  - "[[SPRINT-38]]"
cited_by: 
  - "[[BUG-044]]"
  - "[[BUG-046]]"
  - "[[BUG-049]]"
  - "[[BUG-062]]"
  - "[[CR-106]]"
  - "[[CR-124]]"
  - "[[EPIC-056]]"
  - "[[EPIC-057]]"
  - "[[SPRINT-39]]"
  - "[[SPRINT-41]]"
  - "[[SPRINT-43]]"
  - "[[STORY-058-12]]"
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-055_Parallel_Wave_Scheduling.md"
last_ingest: "2026-11-12T19:31:58.580Z"
last_ingest_commit: "d3ca3bef420c543e8cc459e9333b736e15a556ba"
repo: "planning"
sprint_cleargate_id: "SPRINT-39"
---

# EPIC-055: Parallel wave scheduling — waves become a DAG, not a chain

**Status:** Draft · **Sprint:** SPRINT-39 · **Gate:** pass

## Objective
Replace the serial wave loop with a dependency-DAG scheduler that admits any wave whose predecessors have merged, bounded by a global segment budget, with a single-consumer merge queue.

## Problem & Value
**Why are we doing this?**

Sprint plans already declare cross-milestone concurrency that the execution machine silently discards. SPRINT-39 §2.1 states *"M1 — Spike type (runs concurrently with M0)"* and *"M3 — CLAUDE.md write integrity (fully parallel with M0–M2)"*.

[+976 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-055_Parallel_Wave_Scheduling.md]

## Scope
**In:**
- [ ] The ready-set scheduler consumes CR-124's per-story `upstream` edges and `contracts[]` from `waves.json` `schema_version: 2`.
**Out:**
- *(Moved to [[CR-124]], delivered in SPRINT-41: the per-story contract-first DAG, `waves.json` `schema_version: 2` with per-story `upstream`, and the real-collision predicate.

[+912 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-055_Parallel_Wave_Scheduling.md]

## Architecture rules
- Must use the real-collision predicate and contract model from CR-124 (architect-synth.md) — do NOT redesign collision detection
- Must preserve the serial merge invariant: sprint/S-NN is a single-writer axis, one story merged at a time (SKILL.md:445)
- Must preserve the per-story segment body (SKILL.md C.1-C.9) unchanged — this is a scheduler above launchWave, not a rewrite of it
- No changes to the verdict schema, validateVerdicts, or mintRunId
- Blocked on CR-106 — do not start before the execution-state event log has landed

## Decisions
- "Should this epic be preceded by a SPIKE charter? The open risks are concurrency-runtime facts, not design taste: (a) does… → **Spike first** — decided 2026-08-26. This epic does not decompose until a SPIKE charter has answered the three runtime questions below. The charter cannot be drafted until `STORY-054-01` (SPRINT-39 M1 wave 1) ships `.cleargate/templates/spike.md` — no spike template exists in the tree today.

[+231 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-055_Parallel_Wave_Scheduling.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (1): [[CR-124]]
- Cites (7): [[BUG-033]], [[BUG-034]], [[CR-106]], [[CR-124]], [[CR-126]], [[EPIC-033]], [[SPRINT-38]]
- Cited by (12): [[BUG-044]], [[BUG-046]], [[BUG-049]], [[BUG-062]], [[CR-106]], [[CR-124]], [[EPIC-056]], [[EPIC-057]], [[SPRINT-39]], [[SPRINT-41]], [[SPRINT-43]], [[STORY-058-12]]
<!-- END relations -->
