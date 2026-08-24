---
type: epic
id: "EPIC-044"
parent: ""
children: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-044_Agent_Dispatch_Reliability_And_Token_Efficiency.md"
last_ingest: "2026-08-24T09:45:20.081Z"
last_ingest_commit: "67a785d3d14637f0f7c2192b5ae948aa1bbee1b5"
repo: "planning"
---

# EPIC-044: Agent Dispatch Reliability & Token Efficiency

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Make serial agent dispatch deterministic (structured verdicts instead of free-text parsing) and token-efficient (prompt-cache-friendly dispatch structure + explicit model tiering), without altering the adversarial 5-agent split or any gate semantics.</objective>
  <architecture_rules>
    <rule>Do NOT alter the QA-Red seal, immutable-red-tests, DevOps single-writer, or bounce-cap. These are the integrity core; this epic optimizes dispatch mechanics around them.</rule>
    <rule>Structured-verdict adoption must MATCH the shape the parallel-wave path already returns (GREEN/ESCALATED/BLOCKED + tokens) so serial and parallel converge on one contract, not two.</rule>
    <rule>Model-tier choices are conservative-by-default: keep opus where judgment lives (architect-synth, QA verdicts), sonnet/haiku only for mechanical roles already proven on them (architect-reader, developer).</rule>
    <rule>Canonical → payload → live mirror discipline applies to every agent-contract edit.</rule>
  </architecture_rules>
  <target_files>
    <file path=".claude/skills/sprint-execution/SKILL.md" action="modify" />
    <file

[+7,652 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-044_Agent_Dispatch_Reliability_And_Token_Efficiency.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
