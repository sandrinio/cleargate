---
type: initiative
id: "INITIATIVE-001"
parent: ""
children: 
  - "[[EPIC-046]]"
  - "[[EPIC-047]]"
cites: []
cited_by: 
  - "[[BUG-051]]"
status: "In Triage"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/INITIATIVE-001_Broker_Rendezvous_Plane.md"
last_ingest: "2026-11-12T20:33:09.611Z"
last_ingest_commit: "ec5e6d5673cec3082c3761ae296d81d819ac08f7"
repo: "planning"
---

# INITIATIVE-001: Broker / Rendezvous Plane for Local Claude Code Connectors

**Status:** In Triage · **Sprint:** none · **Gate:** fail: success-criteria-populated

## Glossary (so this stands alone)
- **The Connector** — a planned (not yet built) local service that wraps a user's locally-installed `claude` CLI and exposes it over an outbound network connection.

[+1,853 bytes not shown — read .cleargate/delivery/pending-sync/INITIATIVE-001_Broker_Rendezvous_Plane.md]

## User Flow
**Happy path:**

1. Operator runs the broker on the ClearGate plane.
2. Connector-owner installs the Connector on their own machine — the same machine their Claude Code runs on (laptop, server, anywhere).
3.

[+1,260 bytes not shown — read .cleargate/delivery/pending-sync/INITIATIVE-001_Broker_Rendezvous_Plane.md]

## Diagrams
**Topology** (Connectors dial out from behind NAT; apps dial in; broker is the only public, reachable piece):

[+1,827 bytes not shown — read .cleargate/delivery/pending-sync/INITIATIVE-001_Broker_Rendezvous_Plane.md]

## End-to-End Verbal Description
The Connector must run co-located with Claude Code on the user's machine — it needs the user's local workspace files, the machine's Claude Code login, and the user's locally-configured (Claude Code) MCP

[+794 bytes not shown — read .cleargate/delivery/pending-sync/INITIATIVE-001_Broker_Rendezvous_Plane.md]

## Business Outcome
If this ships, any chat app can drive a user's local Claude Code from anywhere with zero network setup by the user (no tunnels, no port-forwarding) — "Claude Code on my machine" becomes a service any app can connect

[+263 bytes not shown — read .cleargate/delivery/pending-sync/INITIATIVE-001_Broker_Rendezvous_Plane.md]

## Success Criteria
- **Reachability:** a Connector on a NAT'd machine (no inbound port, no tunnel) connects to the broker and appears online.

[+1,203 bytes not shown — read .cleargate/delivery/pending-sync/INITIATIVE-001_Broker_Rendezvous_Plane.md]

## Open Questions for AI Triage
*(The "tell us what can be done" ask. Phrased at outcome level; please answer from your own codebase — our parenthetical guesses are non-binding inference.)*

[+2,417 bytes not shown — read .cleargate/delivery/pending-sync/INITIATIVE-001_Broker_Rendezvous_Plane.md]

## Stakeholder Authoring Notes (not pushed)
Authored by the Connector project as stakeholder input to ClearGate; same owner (Sandro). `source: manual-paste`.

[+1,267 bytes not shown — read .cleargate/delivery/pending-sync/INITIATIVE-001_Broker_Rendezvous_Plane.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (2): [[EPIC-046]], [[EPIC-047]]
- Cited by (1): [[BUG-051]]
<!-- END relations -->
