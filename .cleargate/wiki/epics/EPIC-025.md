---
type: epic
id: "EPIC-025"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-025_Prepare_Close_Observe_Phase_Mechanics.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "7cbc665f6f3a6c98cfacf10f23c14b95ebf481a9"
repo: "planning"
---

# EPIC-025: Prepare / Close / Observe-Phase Mechanics

> **Decomposition wrapper.** The full design spec lives in [`CR-021_Prepare_Close_Observe_Phase_Mechanics.md`](CR-021_Prepare_Close_Observe_Phase_Mechanics.md) — read that for the why, the blast-radius analysis, the per-surface edit blueprint, and the verification protocol. This epic exists to give the six child stories a proper `parent_epic_ref` and to enumerate the wave structure for sprint execution.

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Land CR-021 Prepare/Close/Observe-phase mechanics across 6 disjoint stories: Reporter context-bundle scripts, sprint-preflight CLI, close_sprint integration, Sprint Plan + Sprint Report templates, Reporter agent capability surface, CLAUDE.md + enforcement.md §13.</objective>
  <architecture_rules>
    <rule>Mirror parity invariant — every live edit replicated in cleargate-planning/ canonical mirror in the same commit (per FLASHCARD 2026-04-19 #wiki #protocol #mirror).</rule>
    <rule>v2 file-surface contract — every staged file must appear in the story's §3.1 file table or in surface-whitelist.txt.</rule>
    <rule>Real infra, no mocks — preflight tests exec real `git worktree list` / `git show-ref` / `git status`

[+11,303 bytes not shown — read .cleargate/delivery/archive/EPIC-025_Prepare_Close_Observe_Phase_Mechanics.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
