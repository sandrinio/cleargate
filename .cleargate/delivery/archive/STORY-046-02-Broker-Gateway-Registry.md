---
story_id: STORY-046-02
parent_epic_ref: EPIC-046
parent_cleargate_id: "EPIC-046"
sprint_cleargate_id: null
carry_over: false
status: Draft
ambiguity: 🟢 Low
context_source: EPIC-046 (INITIATIVE-001 direct-approval) + connector/docs/envelope-protocol.md + verified codebase grounding
actor: App / Connector operator
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
db_write_set: []
dep_predecessors:
  - STORY-046-01
deferred_verification: []
area: connector
created_at: 2026-06-04T00:00:00Z
updated_at: 2026-06-04T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: existing-surfaces-verified
      detail: "cited paths do not exist on disk: mcp/src/middleware/rate-limit.ts, connector/docs/envelope-protocol.md"
  last_gate_check: 2026-06-04T08:21:53Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-046-02
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-04T08:34:58Z
  sessions: []
---

# STORY-046-02: Broker M0 — WS gateway (both edges) + in-memory registry + register stub + presence
**Complexity:** L2 — one stateful WS service holding connections behind a swappable Registry interface; auth is a quarantined stub.

## 1. The Spec (The Contract)

### 1.1 User Story
As a Connector dialing out and an app dialing in, I want the broker to accept both my WebSocket connections, register the Connector under a stable `connection_id` bound to a project, and report the target's online/offline presence, so that an app can discover and address a live Connector before any turn is routed.

### 1.2 Detailed Requirements
- **WS gateway** (`ws` library, `perMessageDeflate: false`) on a single port accepting **both edges**: Connector dial-in (`register`) and app dial-in (`hello`). Frames are decoded with the shared envelope codec; `payload` stays opaque.
- **`register`** → `auth-stub.verifyCredential()` (shared-secret from env `CONNECTOR_SHARED_SECRET`, returns stub claims incl. `project_id`) → assign a fresh `connection_id` (uuid) → bind `project_id` → store in the `Registry` → reply `registered` with the assigned `connection_id` + server time.
- **`hello`** → `auth-stub.verifyAppToken()` (shared-secret) → resolve the target `connection_id` → reply `ready` with presence (`online`/`offline`) + the negotiated `protocol_version` (reject `version_mismatch` on a major mismatch — a pure integer compare; the broker still never reads payload).
- **`Registry` interface** — `register / lookup / drop → { instance_id, socket?, project_id }`, backed by an in-memory `Map` keyed by `connection_id`. `instance_id` is a constant stub at N=1. This is the seam a Redis-backed impl swaps into later **without touching the gateway hot path**.
- **Presence** via a **single heartbeat sweep timer** over a `lastSeen` table fed by `ping`/`pong` on both edges; a connection that misses its beats is marked offline and evicted. **Not** one timer per socket.
- **Stub-auth quarantine:** all credential checks live behind the single `auth-stub.ts` seam (`verifyCredential` / `verifyAppToken`). No auth logic leaks into gateway or registry code — EPIC-047 removes `auth-stub.ts` wholesale at M1.

### 1.3 Out of Scope
Prompt routing / event relay / cancel / `turn_end` tracking (STORY-046-03). Real credential verification, revocation, indexed token verify (EPIC-047). Bounded send buffers, resume-from-seq, fairness caps, blue-green drain, observability counters, audit batch-flush (EPIC-046 hardening).

### 1.4 Open Questions

- **Question:** Does `hello` bind the target `connection_id` for the session, or does each `prompt` carry it?
- **Recommended:** Bind at `hello` (per `envelope-protocol.md` open-question #1 lean), so `prompt` only needs `turn_id`. The registry entry records the app→connection binding.
- **Human decision:** {default-accept}

### 1.5 Risks

- **Risk:** Per-socket heartbeat timers don't scale and leak under churn.
- **Mitigation:** Single sweep timer over a `lastSeen` table — the EPIC-046 architecture rule; verified by an eviction test.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Broker gateway, registry, and presence

  Scenario: Connector registers and is assigned a connection_id
    Given the broker is listening
    When a Connector dials in and sends register with a valid shared secret
    Then the broker assigns a connection_id, binds the project, and replies registered

  Scenario: App hello reports an online target
    Given a Connector is registered and online for project P
    When an app sends hello targeting that connection_id with a valid token
    Then the broker replies ready with presence online and a negotiated protocol_version

  Scenario: App hello reports an offline target
    Given no Connector is online for the target connection_id
    When an app sends hello for it
    Then the broker replies ready with presence offline (it does not hang)

  Scenario: Incompatible protocol version is rejected at hello
    Given a Connector is registered with protocol_version 1
    When an app sends hello declaring an incompatible major protocol_version
    Then the broker replies error version_mismatch (a pure integer compare; payload is never read)
    And it does not bind the app to the connection

  Scenario: Bad credential is rejected
    Given a Connector dials in with a wrong shared secret
    When it sends register
    Then the broker replies error unauthorized and does not create a registry entry

  Scenario: Missed heartbeats evict the connection
    Given a registered Connector that stops responding to ping
    When the sweep timer observes missed beats past the threshold
    Then the connection is marked offline and evicted from the registry

  Scenario: Compression is disabled
    Given the WS server configuration
    Then permessage-deflate is off
```

### 2.2 Verification Steps (Manual)
- [ ] Start the broker; dial a Connector with a valid secret → `registered` with a uuid `connection_id`.
- [ ] `hello` for that connection → `ready` online; `hello` for an unknown connection → `ready` offline, no hang.
- [ ] Confirm `perMessageDeflate: false` in the gateway config.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Broker entry (new) | `connector/broker/src/server.ts` |
| WS gateway (new) | `connector/broker/src/ws-gateway.ts` |
| Registry interface + in-memory impl (new) | `connector/broker/src/registry.ts` |
| Quarantined auth stub (new) | `connector/broker/src/auth-stub.ts` |
| Registry + presence tests (new) | `connector/broker/test/registry.node.test.ts` |

### 3.2 Technical Logic
`ws-gateway.ts` owns the `WebSocketServer` (`perMessageDeflate: false`) and decodes inbound frames with `connector/shared/envelope.ts` (imported read-only — frozen by STORY-046-01). On `register`/`hello` it calls the `auth-stub.ts` seam, then `registry.ts`. The `Registry` is an interface with an in-memory `Map` impl; every entry carries `{ socket, project_id, protocol_version, presence, instance_id }`. A single `setInterval` sweep compares `lastSeen` against the heartbeat threshold and evicts stale entries. Routing/relay is explicitly NOT here — `server.ts` exposes the gateway + registry for STORY-046-03 to attach a router to.

### 3.3 API Contract (if applicable)

| Frame | Direction | Auth | Carries | Broker action |
|---|---|---|---|---|
| `register` | Connector → Broker | shared-secret (stub) | protocol_version, label, cwd, allowed_tools | verify → assign connection_id → bind project → `registered` |
| `hello` | App → Broker | shared-secret (stub) | target connection_id, protocol_version | verify → presence + version check → `ready` |
| `ping`/`pong` | both edges | none | — | refresh `lastSeen` → presence |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 7 | register-assigns-id, hello-online, hello-offline, version-mismatch-rejected, bad-credential-rejected, heartbeat-eviction, deflate-off |
| E2E / acceptance tests | 0 | E2E is STORY-046-04 |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] `grep` confirms no credential logic outside `auth-stub.ts` (quarantine intact).
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `mcp/src/middleware/rate-limit.ts` — the fixed-window Redis-counter pattern the broker-edge connect limiter will reuse **later** (EPIC-046 hardening); cited as the reuse reference, not extended in this story.
- **Surface:** `connector/docs/envelope-protocol.md` §Register handshake / §Resilience — the literal register/hello/presence rules implemented here.
- **Coverage of this requirement:** none — net-new. `mcp` is stateless (`requestTimeout 30s`, no persistent connections); no WS registry/presence seam exists on the plane.

## Why not simpler?

- **Smallest existing surface that could carry this:** none — `mcp` is deliberately stateless and cannot hold long-lived connection state.
- **Why isn't extension / parameterization / config sufficient?** A registry of live sockets with presence is inherently stateful and sticky; bolting it onto the stateless MCP server would fight its design. A separate broker package is the right size.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific file paths traceable to EPIC-046 `<target_files>`.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered.
