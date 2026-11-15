---
type: epic
id: "EPIC-066"
parent: "[[INITIATIVE-002]]"
children: 
  - "[[BUG-137]]"
  - "[[BUG-138]]"
  - "[[BUG-139]]"
  - "[[CR-133]]"
  - "[[CR-134]]"
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
  - "[[STORY-066-13]]"
  - "[[STORY-066-14]]"
  - "[[STORY-066-15]]"
  - "[[STORY-066-16]]"
  - "[[STORY-066-17]]"
  - "[[STORY-066-18]]"
  - "[[STORY-066-19]]"
  - "[[STORY-066-20]]"
cites: 
  - "[[BUG-074]]"
  - "[[BUG-075]]"
  - "[[BUG-086]]"
  - "[[BUG-087]]"
  - "[[BUG-102]]"
  - "[[BUG-107]]"
  - "[[BUG-113]]"
  - "[[BUG-116]]"
  - "[[CR-024]]"
  - "[[CR-078]]"
  - "[[CR-081]]"
  - "[[CR-082]]"
  - "[[CR-110]]"
  - "[[CR-120]]"
  - "[[CR-121]]"
  - "[[CR-122]]"
  - "[[CR-124]]"
  - "[[EPIC-013]]"
  - "[[EPIC-022]]"
  - "[[EPIC-031]]"
  - "[[EPIC-033]]"
  - "[[EPIC-054]]"
  - "[[EPIC-055]]"
  - "[[EPIC-065]]"
  - "[[INITIATIVE-002]]"
  - "[[SPRINT-42]]"
  - "[[SPRINT-43]]"
  - "[[STORY-022-04]]"
  - "[[STORY-043-08]]"
  - "[[STORY-059-03]]"
cited_by: 
  - "[[EPIC-065]]"
  - "[[SPRINT-46]]"
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
  - "[[STORY-066-13]]"
  - "[[STORY-066-14]]"
  - "[[STORY-066-15]]"
  - "[[STORY-066-16]]"
  - "[[STORY-066-17]]"
  - "[[STORY-066-18]]"
  - "[[STORY-066-19]]"
  - "[[STORY-066-20]]"
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-066_build_step_sized_by_risk.md"
last_ingest: "2026-11-14T20:08:29.305Z"
last_ingest_commit: ""
repo: "planning"
last_contradict_sha: "ca2ecc15f77301b4125a1b88bce5dddcf1ceffec354821d02b22bb4918d7cb62"
parent_cleargate_id: "INITIATIVE-002"
---

# EPIC-066: Build Step Sized by Risk

**Status:** Draft · **Sprint:** SPRINT-46 · **Gate:** pass

## Objective
The per-item build step runs one of three paths chosen by a script from risk signals (fast: Developer, script check, script merge; standard: QA-Red, Developer, QA-Verify, script merge; runtime: story plan, then standard, then Architect review); the stage list per lane ships as code that the wave launcher and the serial dispatcher both read; no agent is dispatched for work a script can do;

[+123 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-066_build_step_sized_by_risk.md]

## Problem & Value
**Why are we doing this?**
Every item pays for the whole pipeline, and the pipeline spends its effort in the wrong places. The
fast lane was used once in 77 items here, although bugs bounce less than stories (14% against 23% in
new_app). The per-milestone Architect plan blocks every story in the milestone: dispenser M1 took 24
minutes against a 10-minute budget and produced a 60 KB plan.

[+2,360 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-066_build_step_sized_by_risk.md]

## Scope
**In:**
Prerequisites, moved from [[EPIC-065]] by owner decision 2026-11-14 because the fast lane's check
and QA-Verify's run both depend on tests that actually run:
- [ ] The pre-gate scan runs any
**Out:**
- Proof tiers, the evidence file, the Done guard, holdout scenarios and the property-not-shape rule
  for red tests ([[EPIC-065]], next sprint).

[+5,212 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-066_build_step_sized_by_risk.md]

## Architecture rules
- Keep the three lane names `fast`, `standard`, `runtime` (owner decision, INITIATIVE-002 §6). `runtime` becomes a real `state.json` value. No new state and no new work unit (EPIC-054 lock).
- One source for "which stages does this lane run": `segment_stages.mjs`. The skill, `launch_wave.mjs`, `dispatch_serial.mjs` and the shipped runner read it; none of them restates the list.

[+804 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-066_build_step_sized_by_risk.md]

## Decisions
- "Make it work in next sprint" can mean two things. (a) SPRINT-46 here builds this epic on the current loop,… → As recommended (owner, 2026-11-14). SPRINT-46 builds this epic on the current loop. After its close and the live re-sync, SPRINT-47 here is the first sprint on the new loop.

[+3,447 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-066_build_step_sized_by_risk.md]

<!-- BEGIN relations -->
## Relations
- Parent: [[INITIATIVE-002]]
- Children (23): [[BUG-137]], [[BUG-138]], [[BUG-139]], [[CR-133]], [[CR-134]], [[STORY-066-03]], [[STORY-066-04]], [[STORY-066-05]], [[STORY-066-06]], [[STORY-066-07]], [[STORY-066-08]], [[STORY-066-09]], [[STORY-066-10]], [[STORY-066-11]], [[STORY-066-12]], [[STORY-066-13]], [[STORY-066-14]], [[STORY-066-15]], [[STORY-066-16]], [[STORY-066-17]], +3 more
- Cites (30): [[BUG-074]], [[BUG-075]], [[BUG-086]], [[BUG-087]], [[BUG-102]], [[BUG-107]], [[BUG-113]], [[BUG-116]], [[CR-024]], [[CR-078]], [[CR-081]], [[CR-082]], [[CR-110]], [[CR-120]], [[CR-121]], [[CR-122]], [[CR-124]], [[EPIC-013]], [[EPIC-022]], [[EPIC-031]], +10 more
- Cited by (20): [[EPIC-065]], [[SPRINT-46]], [[STORY-066-03]], [[STORY-066-04]], [[STORY-066-05]], [[STORY-066-06]], [[STORY-066-07]], [[STORY-066-08]], [[STORY-066-09]], [[STORY-066-10]], [[STORY-066-11]], [[STORY-066-12]], [[STORY-066-13]], [[STORY-066-14]], [[STORY-066-15]], [[STORY-066-16]], [[STORY-066-17]], [[STORY-066-18]], [[STORY-066-19]], [[STORY-066-20]]
<!-- END relations -->
