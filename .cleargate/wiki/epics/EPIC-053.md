---
type: epic
id: "EPIC-053"
parent: ""
children: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-053_Downstream_DB_Collision_Detection.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "432843b8bfda7d93a2eef5af9dc4dea349e59689"
repo: "planning"
---

# EPIC-053: Downstream DB Collision Detection — Fail-Safe by Default, Derived Not Declared

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Make the wave planner's DB-collision axis fail SAFE instead of open, and populate it by derivation from the repo rather than by author declaration, for downstream repos on any stack.</objective>
  <architecture_rules>
    <rule>Polarity first, derivation second. WS1 (fail-safe) must land before or with WS2-WS5. Shipping derivation onto an axis that still fails open delivers a detector nobody can trust.</rule>
    <rule>Absent MUST be distinguishable from empty. `db_write_set: []` means "a detector ran and found nothing"; absent/null means "no evidence" and MUST serialize. Never collapse the two.</rule>
    <rule>Detection is a LADDER and every rung is optional. L0 path globs must work with zero parser and zero TypeScript. Never make a downstream repo's protection depend on the TS compiler being resolvable.</rule>
    <rule>Do NOT connect to a live database. All detection is static — file paths and source text only. No credentials, no introspection, no runtime.</rule>
    <rule>Do NOT build an ORM plugin/adapter system.

[+31,045 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-053_Downstream_DB_Collision_Detection.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
