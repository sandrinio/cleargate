---
type: epic
id: "EPIC-033"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-033_Parallel_Wave_Sprint_Execution.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "eb44e22d41c078a7f8efd139e15a6dfee49f91c2"
repo: "planning"
---

# EPIC-033: Parallel-Wave Sprint Execution via Dynamic Workflows

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Replace the orchestrator's per-dispatch babysitting (write marker → spawn agent → read prose → decide → spawn next) with Architect-planned, collision-free PARALLEL WAVES executed as Claude Code Dynamic Workflows: the Architect schedules stories into waves on a file-surface axis (+ a coarse DB axis); the Orchestrator launches each wave as one fire-and-forget Workflow of worktree-isolated per-story segments (QA-Red → TPV → Developer → QA-Verify → Architect post-flight) that return a schema-typed verdict; the Orchestrator consolidates at a barrier and advances. PLANNING LAYER ONLY.</objective>
  <architecture_rules>
    <rule>SPIKE GATES EVERYTHING. No execution story (STORY-033-02..04) is implemented until STORY-033-01 answers the Workflow↔hook contract. (Partial result already observed this session — see §1.)</rule>
    <rule>PLANNING-LAYER SCOPE. Every file this epic touches lives under cleargate-cli/, .claude/, .cleargate/, or the cleargate-planning/ canonical mirror. NO changes to mcp/ or admin/ source — those are separate deploy products with their own lifecycle.</rule>
    <rule>Gates stay in the Orchestrator.

[+24,467 bytes not shown — read .cleargate/delivery/archive/EPIC-033_Parallel_Wave_Sprint_Execution.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
