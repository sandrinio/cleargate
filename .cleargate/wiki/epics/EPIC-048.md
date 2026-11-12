---
type: epic
id: "EPIC-048"
parent: ""
children: 
  - "[[STORY-048-01-Connector-Dial-Spawn-Teardown]]"
  - "[[STORY-048-02-Connector-Normalize-Lifecycle]]"
  - "[[STORY-048-03-Connector-Real-Credential-Register]]"
  - "[[STORY-048-04-Connector-Reconnect-Reattach-Backoff]]"
  - "[[STORY-048-05-Connector-Resume-From-Seq-Idempotency]]"
  - "[[STORY-048-06-Connector-Version-Drift-Guard-CI-Fixtures]]"
  - "[[STORY-048-07-Connector-Sessions-And-Metrics]]"
  - "[[STORY-048-08-Connector-Sandboxing-Hardening]]"
  - "[[STORY-048-09-Connector-Linux-Docker-Teardown-Verification]]"
cites: []
cited_by: []
status: "In Review"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-048_Connector_Daemon.md"
last_ingest: "2026-11-12T21:25:29.802Z"
last_ingest_commit: "ec5e6d5673cec3082c3761ae296d81d819ac08f7"
repo: "planning"
---

# EPIC-048: Connector Daemon

**Status:** In Review · **Sprint:** none · **Gate:** fail: existing-surfaces-verified

## Objective
Build the local Node/TS daemon that dials out to the broker, spawns `claude` per turn, normalizes its stream into the event contract, and tears turns down cleanly — co-located with Claude Code on the user's machine.

## Problem & Value
**Why are we doing this?**
The Connector is the half that actually runs Claude Code where the user's workspace, login, and local MCP servers live. It's the only component that touches `claude`, so it owns the fragile, version-sensitive job of turning raw `stream-json` into a stable, app-renderable event contract — and of never leaving an orphaned process behind.

[+349 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-048_Connector_Daemon.md]

## Scope
**In:**
- [ ] WS dial-out to the broker + register (announce `protocol_version`) + reconnect/re-attach by `connection_id`, with **full-jitter backoff** (spreads the post-deploy reconnect storm across the drain window so 100 connectors don't re-verify
**Out:**
- The broker / registry / routing (→ EPIC-046) and credential minting (→ EPIC-047).
- The `cleargate connector` onboarding command + companion packaging (→ later onboarding epic).

[+3,502 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-048_Connector_Daemon.md]

## Architecture rules
- Node/TS, shipped as an optional ClearGate companion (default off); reuse cleargate-cli auth plumbing (acquire.ts, token-store keychain). No runtime code enters the shipped npm planning payload.
- Spawn-per-turn: claude -p "<prompt>" --output-format stream-json --verbose --include-partial-messages < /dev/null. The /dev/null is mandatory; --include-partial-messages is required for token deltas.

[+1,005 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-048_Connector_Daemon.md]

## Decisions
- "Reuse `cleargate-cli/src/auth/*` by importing it, or factor it into a shared `@cleargate/auth` lib both the CLI and daemon depend on?" → **Import directly** for M2 (keep the sprint scoped to the daemon); a shared `@cleargate/auth` lib is a later clean-up CR. **Caveat (Architect SDR must confirm):** the imported auth subtree must be **PM-SDK-clean** (EPIC-027) — if it transitively pulls a PM-tool SDK, factor the minimal auth surface into a shared lib instead.

[+1,123 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-048_Connector_Daemon.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (9): [[STORY-048-01-Connector-Dial-Spawn-Teardown]], [[STORY-048-02-Connector-Normalize-Lifecycle]], [[STORY-048-03-Connector-Real-Credential-Register]], [[STORY-048-04-Connector-Reconnect-Reattach-Backoff]], [[STORY-048-05-Connector-Resume-From-Seq-Idempotency]], [[STORY-048-06-Connector-Version-Drift-Guard-CI-Fixtures]], [[STORY-048-07-Connector-Sessions-And-Metrics]], [[STORY-048-08-Connector-Sandboxing-Hardening]], [[STORY-048-09-Connector-Linux-Docker-Teardown-Verification]]
<!-- END relations -->
