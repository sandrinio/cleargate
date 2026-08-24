---
type: sprint
id: "SPRINT-35"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-35_Connector_M0_Walking_Skeleton.md"
last_ingest: "2026-08-24T09:45:20.081Z"
last_ingest_commit: "1ed0fb723bbcefc386f623e2587d4d155fcc4295"
repo: "planning"
---

# SPRINT-35: Connector M0 — Walking Skeleton (Relay Loop E2E)

## 0. Stakeholder Brief
*(First sprint of the Connector program. Local/pre-member — not pushed.)*

- **Sprint Goal:** Prove the relay loop works end-to-end — one app → one prompt → live streamed reply → cancel, with zero orphaned processes — by building a thin vertical slice across the broker and the connector daemon, with auth stubbed.
- **Business Outcome:** A runnable demo that de-risks the entire INITIATIVE-001 architecture before investing in production hardening. You can watch Claude Code, driven from a test app, stream a reply through the public broker and cancel it.
- **Risks (top 3):** `claude` stream-json drift · process-tree teardown leaving orphans · stub auth leaking into later code.
- **Metrics:** E2E test green; stream arrives in order; **a background task's second `result` is delivered (relay holds open past the first)**; cancel terminates the turn and **reaps detached descendants**; **0 orphaned `claude`/child processes** after cancel/disconnect.

## Sprint Goal
Stand up the minimum broker + connector daemon needed to relay a single live Claude Code turn end-to-end and cancel it cleanly — the walking skeleton that proves the architecture, not a production system.

[+11,686 bytes not shown — read .cleargate/delivery/archive/SPRINT-35_Connector_M0_Walking_Skeleton.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
