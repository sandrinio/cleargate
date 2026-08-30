---
type: epic
id: "EPIC-047"
parent: ""
children: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-047_Connection_Identity_And_Credentials.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "a640863cd4532ce2a199d0bb477d74902e776586"
repo: "planning"
---

# EPIC-047: Connection Identity & Credentials

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Give the broker a way to verify who's at the door — without becoming an identity provider. mcp mints + verifies all credentials; the broker calls a verify endpoint at connect and reacts to revocation via subscription.</objective>
  <architecture_rules>
    <rule>mcp is the SINGLE identity authority. The broker verifies, never mints, holds no signing secret or DB credentials.</rule>
    <rule>Clone existing primitives: pairing-code ≈ invites (one-time consume); app-token ≈ tokens service-token (bcrypt + Redis rev:).</rule>
    <rule>Revocation must be INSTANT and kill in-flight turns → connect-time introspection + a runtime revoke subscription (Redis pub/sub — first plane use).</rule>
    <rule>Fail CLOSED: deny connect if verify fails or mcp is unreachable.

[+10,430 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-047_Connection_Identity_And_Credentials.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
