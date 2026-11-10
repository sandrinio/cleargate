---
type: epic
id: "EPIC-060"
parent: ""
children: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-060_fresh_context_review_before_approval.md"
last_ingest: "2026-10-28T14:06:19.555Z"
last_ingest_commit: ""
repo: "planning"
---

# EPIC-060: Fresh-Context Review Before Approval

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Before the owner approves an epic or CR, and before a sprint's stories execute, have read-only reviewer agents that never saw the drafting conversation check the draft, and record how each of their findings was handled.</objective>
  <architecture_rules>
    <rule>A reviewer receives the target file path and nothing from the drafting conversation. On Claude Code it runs with omitClaudeMd: true and tools Read, Grep, Glob.</rule>
    <rule>Reviewer prompt text is written for ClearGate. The approach comes from Google's Elephant-Goldfish Model (Apache-2.0); do not copy its prompt text into the MIT-licensed cleargate-cli. Each reviewer file credits EGM with a link.</rule>
    <rule>No new gate. The Gate-1 review runs before the existing Brief; the story review rides EPIC-059's §A.4 plan-confirmation halt.</rule>
    <rule>Canonical edits land in cleargate-cli/scaffold/** on a story branch in the cleargate-cli repo. Live mirrors follow the framework-sprint routine (.cleargate/** on merge, /.claude/** and the root CLAUDE.md block at Gate 4); cleargate doctor reports no drift afterwards.

[+17,610 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-060_fresh_context_review_before_approval.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
