---
type: epic
id: "EPIC-051"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-051_Enforcement_Integrity_Restoration.md"
last_ingest: "2026-08-24T09:45:20.081Z"
last_ingest_commit: "e5444d52a21b1661b98f32112a6b97573dde56b6"
repo: "planning"
---

# EPIC-051: Enforcement Integrity Restoration (post-CR-074)

## 0. AI Coding Agent Handoff
*(This section is strictly for downstream AI execution agents. It contains zero business fluff.)*

```xml
<agent_context>
  <objective>Close the gap between "documented as enforced" and "actually enforced" that CR-070/CR-074's execution_mode retirement opened: restore the pre-commit gates that silently went advisory, purge dead v1/v2 vocabulary, and add a guard so canonical→live/payload drift cannot recur.</objective>
  <architecture_rules>
    <rule>CLEARGATE_ADVISORY=1 is the ONLY sanctioned enforcement-strength lever post-CR-074; do not reintroduce execution_mode / v1 / v2 / CLEARGATE_PARALLEL_WAVES / CLEARGATE_EXEC_MODE as behavior switches.</rule>
    <rule>Every canonical edit under cleargate-planning/** must be mirrored to the npm payload via `npm run prebuild` and hand-synced to the live /.claude|/.cleargate copies (dogfood split — see CLAUDE.md).</rule>
    <rule>Real infra, no mocks for gate tests; node:test only (*.node.test.ts via tsx).

[+13,318 bytes not shown — read .cleargate/delivery/archive/EPIC-051_Enforcement_Integrity_Restoration.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
