---
type: epic
id: "EPIC-008"
parent: ""
children: 
  - "[[STORY-008-01]]"
  - "[[STORY-008-02]]"
  - "[[STORY-008-03]]"
  - "[[STORY-008-04]]"
  - "[[STORY-008-05]]"
  - "[[STORY-008-06]]"
  - "[[STORY-008-07]]"
status: "Abandoned"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-008_Token_Cost_And_Readiness_Gates.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "2691d20a51eb6e8211a9ec862c0ec0ddf8c09601"
repo: "planning"
---

# EPIC-008: Per-Work-Item Token Cost + Machine-Checkable Readiness Gates

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Ship two paired capabilities: (1) per-work-item `draft_tokens` frontmatter stamp populated by a PostToolUse hook from the sprint token ledger; (2) a closed-set predicate engine + `cleargate gate check` CLI that writes `cached_gate_result:` into each work item's frontmatter, blocks `wiki lint` on Epic/Story/CR/Bug failures, and advises (non-blocking) on Proposals. Also includes a SessionStart hook emitting a ~100-token blocked-items summary, and the token-ledger hook fix for the SPRINT-04→SPRINT-03 routing regression captured in FLASHCARD 2026-04-19.</objective>
  <architecture_rules>
    <rule>Agent never invokes stamp-tokens or gate check directly — a PostToolUse hook chains stamp-tokens → gate check → wiki ingest on every Write/Edit under .cleargate/delivery/**.</rule>
    <rule>Predicates are a CLOSED set (frontmatter/body/section/file-exists/link-target/status-of). No shell-out, no network, no arbitrary code in predicate execution.</rule>
    <rule>Gate definitions live centrally in .cleargate/knowledge/readiness-gates.md keyed by {work_item_type, transition}.

[+19,927 bytes not shown — read .cleargate/delivery/archive/EPIC-008_Token_Cost_And_Readiness_Gates.md]

## Blast radius
Affects: [[STORY-008-01]], [[STORY-008-02]], [[STORY-008-03]], [[STORY-008-04]], [[STORY-008-05]], [[STORY-008-06]], [[STORY-008-07]]
