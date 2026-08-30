---
type: epic
id: "EPIC-048"
parent: ""
children: []
status: "In Review"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-048_Connector_Daemon.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "ec5e6d5673cec3082c3761ae296d81d819ac08f7"
repo: "planning"
---

# EPIC-048: Connector Daemon

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Build the local Node/TS daemon that dials out to the broker, spawns `claude` per turn, normalizes its stream into the event contract, and tears turns down cleanly — co-located with Claude Code on the user's machine.</objective>
  <architecture_rules>
    <rule>Node/TS, shipped as an optional ClearGate companion (default off); reuse cleargate-cli auth plumbing (acquire.ts, token-store keychain). No runtime code enters the shipped npm planning payload.</rule>
    <rule>Spawn-per-turn: claude -p "<prompt>" --output-format stream-json --verbose --include-partial-messages < /dev/null. The /dev/null is mandatory; --include-partial-messages is required for token deltas.</rule>
    <rule>Allowlist-map known record types → event contract; LOG unmapped types (drift); never forward raw stream-json. Forward pin claude 2.1.162 (baseline re-verified 2026-06-04; original spike 2.1.161) — snapshot shapes as CI fixtures, re-verify on upgrade.</rule>
    <rule>EOF is the terminus, not `result` (multiple results per turn). Detect errors via is_error, never subtype. Render text from text_delta only; skip signature_delta.

[+13,292 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-048_Connector_Daemon.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
