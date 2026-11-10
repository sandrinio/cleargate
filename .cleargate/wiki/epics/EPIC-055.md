---
type: epic
id: "EPIC-055"
parent: ""
children: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-055_Parallel_Wave_Scheduling.md"
last_ingest: "2026-10-08T13:22:57.536Z"
last_ingest_commit: "0b97950dd8b43e5071fd0da173af49cfd2297628"
repo: "planning"
---

# EPIC-055: Parallel wave scheduling — waves become a DAG, not a chain

> **Not scheduled for SPRINT-39.** Gate-green, but sequenced behind [[CR-106]] and a mandatory SPIKE charter (decided 2026-08-26). The charter is blocked on `STORY-054-01` shipping `.cleargate/templates/spike.md`. See §6.

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Replace the serial wave loop with a dependency-DAG scheduler that admits any wave whose predecessors have merged, bounded by a global segment budget, with a single-consumer merge queue.</objective>
  <architecture_rules>
    <rule>Must use the real-collision predicate and contract model from CR-124 (architect-synth.md) — do NOT redesign collision detection</rule>
    <rule>Must preserve the serial merge invariant: sprint/S-NN is a single-writer axis, one story merged at a time (SKILL.md:445)</rule>
    <rule>Must preserve the per-story segment body (SKILL.md C.1-C.9) unchanged — this is a scheduler above launchWave, not a rewrite of it</rule>
    <rule>No changes to the verdict schema, validateVerdicts, or mintRunId</rule>
    <rule>Blocked on CR-106 — do not start before the execution-state event log has landed</rule>
  </architecture_rules>
  <target_files>
    <file

[+13,112 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-055_Parallel_Wave_Scheduling.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
