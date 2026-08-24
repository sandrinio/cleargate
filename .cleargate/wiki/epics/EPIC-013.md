---
type: epic
id: "EPIC-013"
parent: ""
children: 
  - "[[STORY-013-01]]"
  - "[[STORY-013-02]]"
  - "[[STORY-013-03]]"
  - "[[STORY-013-04]]"
  - "[[STORY-013-05]]"
  - "[[STORY-013-06]]"
  - "[[STORY-013-07]]"
  - "[[STORY-013-08]]"
  - "[[STORY-013-09]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-013_Execution_Phase_v2.md"
last_ingest: "2026-08-24T09:45:20.081Z"
last_ingest_commit: "2691d20a51eb6e8211a9ec862c0ec0ddf8c09601"
repo: "planning"
---

# EPIC-013: Execution Phase v2 — Bounce Loop, Worktrees, Pre-Gates, Self-Improvement

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Harden ClearGate's execution phase by porting 8 mechanized patterns from V-Bounce Engine — git worktree per story, pre-gate scanner, independent bounce counters with machine-readable state, circuit-breaker blockers report, immediate flashcard gate, user walkthrough on sprint branch, mid-sprint triage, sprint-close self-improvement pipeline — while preserving ClearGate's three-repo split (delivery/wiki/mcp) and Karpathy wiki drift model.</objective>
  <architecture_rules>
    <rule>Do NOT replace the four-agent contract (architect/developer/qa/reporter). DevOps + Scribe are OUT OF SCOPE for v2; optional split stays future work.</rule>
    <rule>Do NOT touch MCP adapter, wiki ingest/lint, or scaffold manifest surfaces. This epic is execution-loop only.</rule>
    <rule>All new state lives under .cleargate/sprint-runs/&lt;id&gt;/ or .cleargate/delivery/pending-sync/; no changes to .cleargate/wiki/ writers.</rule>
    <rule>state.json is a cache of sprint markdown, not a new source of truth.

[+38,267 bytes not shown — read .cleargate/delivery/archive/EPIC-013_Execution_Phase_v2.md]

## Blast radius
Affects: [[STORY-013-01]], [[STORY-013-02]], [[STORY-013-03]], [[STORY-013-04]], [[STORY-013-05]], [[STORY-013-06]], [[STORY-013-07]], [[STORY-013-08]], [[STORY-013-09]]
