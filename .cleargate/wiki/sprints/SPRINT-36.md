---
type: sprint
id: "SPRINT-36"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-36_Connector_M1_Identity_And_Credentials.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "1ed0fb723bbcefc386f623e2587d4d155fcc4295"
repo: "planning"
---

# SPRINT-36: Connector M1 — Connection Identity & Credentials (Real Auth)

## 0. Stakeholder Brief
*(Second sprint of the Connector program. Local/pre-member — not pushed. Decomposes EPIC-047; spans the `mcp` and `connector` repos.)*

- **Sprint Goal:** Replace the M0 shared-secret stub with real, revocable, attributable identity — `mcp` mints + verifies all credentials, the broker **verifies (never mints)** and reacts to revocation **instantly** (kills in-flight turns) — across the pairing / member / app-token register lanes, so the relay loop is safe to expose beyond a single trusted machine.
- **Business Outcome:** The walking skeleton becomes a *trustable* loop: a revoked pairing/app-token cannot reach a Connector or start a turn, a revoke kills an in-flight turn, and every relayed turn is attributable. This is the gate before any remote exposure (EPIC-050 tunnel / a real chat-app client) can be considered.
- **Risks (top 3):** app-token = an RCE surface (treat as a production credential) · instant-revoke-must-kill-in-flight (connect-check alone is insufficient) · first Redis pub/sub use on the plane + a live `mcp` DB migration.

[+8,582 bytes not shown — read .cleargate/delivery/archive/SPRINT-36_Connector_M1_Identity_And_Credentials.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
