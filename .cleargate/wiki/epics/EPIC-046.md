---
type: epic
id: "EPIC-046"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-046_Broker_Rendezvous_Data_Plane.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "8a306a5d6eff6e90b64b5bf128a81d682aec481f"
repo: "planning"
---

# EPIC-046: Broker Rendezvous Data Plane

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Stand up the public broker: a stateful WS service that holds Connector connections, keeps a live project-scoped registry, and routes/relays opaque envelope frames between apps and Connectors with cancel — running and understanding nothing itself.</objective>
  <architecture_rules>
    <rule>Separate plane service in `connector/broker/` (sub-folder of the one `/connector` repo), NOT embedded in mcp — mcp is deliberately stateless (requestTimeout 30s); embedding WS fights its design.</rule>
    <rule>Payload is OPAQUE — separable framing [u32 header_len][header][payload]; route on the header ONLY; forward payload bytes untouched; ZERO JSON.parse/re-encode of payload (keystone for 30k-fps GC + CPU budget).</rule>
    <rule>Bounded per-connection send buffers + drain-aware relay; slow consumer past the cap → stall/disconnect + resume-from-seq.

[+17,330 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-046_Broker_Rendezvous_Data_Plane.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
