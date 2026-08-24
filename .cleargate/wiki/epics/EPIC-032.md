---
type: epic
id: "EPIC-032"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-032_Code_Map_Awareness_Layer.md"
last_ingest: "2026-08-24T09:45:20.081Z"
last_ingest_commit: "eb44e22d41c078a7f8efd139e15a6dfee49f91c2"
repo: "planning"
---

# EPIC-032: Code-Map Awareness Layer for Execution Agents

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Emit a token-budgeted structural skeleton (exports + signatures + module relationships) of each TypeScript package into .cleargate/wiki/code/&lt;package&gt;.md, refreshed by the existing wiki compile pipeline, so Architect/Developer agents read structure once per dispatch instead of re-grepping source.</objective>
  <architecture_rules>
    <rule>Reuse the existing wiki compile pipeline (cleargate-cli/src/wiki/**) — code-map is a new bucket/synthesis pass, not a parallel system.</rule>
    <rule>Drift detection uses git-SHA per ADR locked 2026-04-19 (same as work-item ingest). No content hashing.</rule>
    <rule>No new runtime dependency in target repos beyond what `tsc` already provides. Extractor uses the raw TypeScript Compiler API (`ts.createProgram`); ts-morph is REJECTED (§6 Q4, resolved 2026-05-29).</rule>
    <rule>No PM-tool SDK imports (EPIC-027 boundary).</rule>
    <rule>Code-map is advisory context for agents — must never be treated as source of truth.

[+20,622 bytes not shown — read .cleargate/delivery/archive/EPIC-032_Code_Map_Awareness_Layer.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
