---
type: epic
id: "EPIC-046"
parent: "[[INITIATIVE-001]]"
children: 
  - "[[STORY-046-01-Scaffold-Envelope-Codec]]"
  - "[[STORY-046-02-Broker-Gateway-Registry]]"
  - "[[STORY-046-03-Broker-Routing-Relay-Cancel]]"
  - "[[STORY-046-04-E2E-Walking-Skeleton]]"
cites: []
cited_by: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-046_Broker_Rendezvous_Data_Plane.md"
last_ingest: "2026-11-12T20:33:09.611Z"
last_ingest_commit: "a6e6d2b749ca8aac494c2d5ffd3c13bbe825fb38"
repo: "planning"
parent_cleargate_id: "INITIATIVE-001"
---

# EPIC-046: Broker Rendezvous Data Plane

**Status:** Completed · **Sprint:** none · **Gate:** fail: parent-approved

## Objective
Stand up the public broker: a stateful WS service that holds Connector connections, keeps a live project-scoped registry, and routes/relays opaque envelope frames between apps and Connectors with cancel — running and understanding nothing itself.

## Problem & Value
**Why are we doing this?**
A user's local Claude Code sits behind NAT with no inbound port — no app can reach it. The broker is the one public, reachable component that both sides dial, so a turn can be relayed without the user setting up tunnels. Nothing else in the product works until this exists.

[+898 bytes not shown — read .cleargate/delivery/archive/EPIC-046_Broker_Rendezvous_Data_Plane.md]

## Scope
**In:**
*Core relay*
- [ ] WS gateway on both edges (Connector dial-out; app dial-in).
- [ ] In-memory, project-scoped registry + presence (online/offline), keyed by `connection_id`, **behind a `Registry` interface** (`register`/`lookup`/`drop` → `{instance_id, socket?}`) so the in-memory `Map` can be
**Out:**
- Credential minting/verification logic (→ EPIC-047; broker only *calls* verify). The **indexed-token-verify fix** that defuses the reconnect storm lives in EPIC-047.
- Connector internals / `claude` spawning (→ EPIC-048).

[+4,576 bytes not shown — read .cleargate/delivery/archive/EPIC-046_Broker_Rendezvous_Data_Plane.md]

## Architecture rules
- Separate plane service in `connector/broker/` (sub-folder of the one `/connector` repo), NOT embedded in mcp — mcp is deliberately stateless (requestTimeout 30s); embedding WS fights its design.
- Payload is OPAQUE — separable framing [u32 header_len][header][payload]; route on the header ONLY; forward payload bytes untouched; ZERO JSON.parse/re-encode of payload (keystone for 30k-fps GC + CPU budget).
- Bounded per-connection send buffers + drain-aware relay; slow consumer past the cap → stall/disconnect + resume-from-seq. Memory under backpressure is THE failure mode, not CPU.

[+771 bytes not shown — read .cleargate/delivery/archive/EPIC-046_Broker_Rendezvous_Data_Plane.md]

## Open questions
- "Tuning constants to fix at the load-test gate, or pin now? per-connection send-buffer cap (~1 MB), large-frame chunk threshold (~128 KB), replay-ring size (~256 frames / 1 MB), heartbeat sweep interval (~15–30 s)."

<!-- BEGIN relations -->
## Relations
- Parent: [[INITIATIVE-001]]
- Children (4): [[STORY-046-01-Scaffold-Envelope-Codec]], [[STORY-046-02-Broker-Gateway-Registry]], [[STORY-046-03-Broker-Routing-Relay-Cancel]], [[STORY-046-04-E2E-Walking-Skeleton]]
<!-- END relations -->
