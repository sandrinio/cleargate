---
type: initiative
id: "INITIATIVE-001"
parent: ""
children: []
status: "In Triage"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/INITIATIVE-001_Broker_Rendezvous_Plane.md"
last_ingest: "2026-08-24T09:45:20.081Z"
last_ingest_commit: "a06160cd6d6b5743501f46d7a77155617b88a5b1"
repo: "planning"
---

# INITIATIVE-001: Broker / Rendezvous Plane for Local Claude Code Connectors

> For the ClearGate planning session: this is stakeholder input from a sibling product (the "Claude Code Connector"), owned by the same person who owns ClearGate. We want you to triage it and tell us what can be built on the ClearGate infra, where it should live, and roughly what it takes — not to accept a pre-baked design. The §6 questions are the real ask. Where this doc references ClearGate internals, treat them as our outside-in guesses to confirm or correct, not assertions — we have not verified your stack; please do.

## 0. Glossary (so this stands alone)

- **The Connector** — a planned (not yet built) local service that wraps a user's locally-installed `claude` CLI and exposes it over an outbound network connection. A separate product from ClearGate; same owner. Its local-side design is tracked as EPIC-012 in the Connector repo (which also owns the event contract below).
- **The ClearGate plane** — the shared hosting/infra/auth layer behind `*.cleargate.soula.ge` (deploy platform, datastore, the ClearGate MCP backend, the admin UI, and token minting) — as distinct from the ClearGate planning-framework CLI product.

[+11,825 bytes not shown — read .cleargate/delivery/pending-sync/INITIATIVE-001_Broker_Rendezvous_Plane.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
