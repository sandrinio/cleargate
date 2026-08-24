---
type: epic
id: "EPIC-050"
parent: ""
children: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-050_Connector_Onboarding_And_Companion_Packaging.md"
last_ingest: "2026-08-24T09:45:20.081Z"
last_ingest_commit: "69d4814e7370023ba8352eea1f7de913e3acd8d9"
repo: "planning"
---

# EPIC-050: Connector Onboarding & Companion Packaging

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Ship the Connector as an OPT-IN, default-off ClearGate companion that the `cleargate` CLI installs, identifies, and supervises — including running N independent daemons on one machine, each bound to its own repo/project. This is the epic where the product's charter visibly expands from planning-only to planning + connectivity.</objective>
  <architecture_rules>
    <rule>NEVER bundle connector runtime code into the shipped npm planning payload (`cleargate-cli/src`, `.claude/`, the package). The connector ships as a SEPARATE package `@cleargate/connector` (own repo). `cleargate connector` is a THIN launcher that installs/spawns it and imports NOTHING from it. (EPIC-027 boundary.)</rule>
    <rule>Default OFF: a plain `npm i -g cleargate` + `cleargate init` installs and starts NOTHING. The daemon materializes only on explicit `cleargate connector` opt-in.</rule>
    <rule>Member-gated like push/pull/sync: pre-member → exit 2 with "Run: cleargate join <invite-url>".

[+11,442 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-050_Connector_Onboarding_And_Companion_Packaging.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
