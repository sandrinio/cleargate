---
type: epic
id: "EPIC-052"
parent: ""
children: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-052_Requirement_Level_Grounding.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "1859a5d425935945e1e4df3242770e0c40b375b7"
repo: "planning"
---

# EPIC-052: Requirement-Level Grounding — Make "Is This Shipped?" Answerable

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Make every requirement in an Epic, Story, CR, Bug, or Initiative carry a machine-checked status + code citation + locking test, and detect when those citations go stale.</objective>
  <architecture_rules>
    <rule>Must extend the existing readiness-predicate registry in cleargate-cli/src/lib/readiness-predicates.ts — mirror the closed-set shape of prior-work-recorded (:124), do not invent a parallel validation path.</rule>
    <rule>Must extend the existing wiki lint pass in cleargate-cli/src/wiki/lint-checks.ts — evidence verification is a lint check, NOT a new top-level command.</rule>
    <rule>Evidence is ranked: executing a row's locking test is proof; resolving its file::symbol is only a staleness tripwire. Never present symbol resolution as proof that a requirement shipped.</rule>
    <rule>Citations are required only for rows claiming SHIPPED or PARTIAL. Never require a citation for a SPECIFIED/OPEN/BLOCKED row — that would force authors to invent evidence for unwritten code.</rule>
    <rule>The relevance judge (WS6) is advisory and stays advisory.

[+34,926 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-052_Requirement_Level_Grounding.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
