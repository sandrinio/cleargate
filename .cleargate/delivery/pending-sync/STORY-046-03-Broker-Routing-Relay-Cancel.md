---
story_id: STORY-046-03
parent_epic_ref: EPIC-046
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
ambiguity: 🟢 Low
context_source: EPIC-046 (INITIATIVE-001 direct-approval) + connector/docs/envelope-protocol.md + verified codebase grounding
actor: App developer
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
db_write_set: []
dep_predecessors:
  - STORY-046-02
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
      detail: "cited paths do not exist on disk: connector/broker/src/registry.ts, connector/docs/envelope-protocol.md"
  last_gate_check: 2026-06-04T08:22:39Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-046-03
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-04T08:22:38Z
  sessions: []
---

# STORY-046-03: Broker M0 — prompt routing + ordered event relay + cancel + turn_end/EOF tracking + offline fast-fail
**Complexity:** L2 — the routing core: forward frames by `(connection_id, turn_id, app_id)`, opaque, in order, closing on `turn_end` not on a result.

## 1. The Spec (The Contract)

### 1.1 User Story
As an app driving a Connector, I want the broker to route my prompt down the bound Connection and relay every event frame back to me in order until the turn ends, with cancel and offline-fast-fail working, so that a single live turn flows end-to-end without the broker ever understanding the payload.

### 1.2 Detailed Requirements
- **Prompt routing (down):** on `prompt(turn_id=T)` from an app bound to connection C, route it down C's socket; record the in-flight turn keyed by `(connection_id, turn_id, app_id)`.
- **Event relay (up), in order:** relay each `event(T, seq)` from the Connector back to the **initiating `app_id`** in `seq` order; the `payload` is forwarded **byte-for-byte** — the broker decodes only the envelope and **never `JSON.parse`s or re-encodes `payload`**.
- **Cancel pass-through:** route `cancel(T)` down C's line; stop relaying T after `turn_end(T)`.
- **`turn_end` / EOF tracking:** close in-flight tracking for T on `turn_end(T)` **only** — never on a `result`/`turn_result` payload frame (a turn can emit several; the terminus is the Connector's EOF-driven `turn_end`).
- **Offline fast-fail:** a `prompt` (or `hello`) for a connection with no live line → immediate broker-originated `error: offline`; the app must not hang.
- **No cross-talk:** with multiple apps / multiple turns on one Connection, every relayed frame is fanned to its own `app_id` and tagged by `turn_id`; streams never cross.

### 1.3 Out of Scope
Bounded send buffers / drain / resume-from-seq (EPIC-046 hardening — M0 relies on raw WS backpressure). Large-frame chunking. Fairness/concurrent-turn caps. Separable framing. Audit metadata. The cross-instance `route() → remote` branch (stub stays `local`).

### 1.4 Open Questions

- **Question:** Closed enum vs opaque for `error` codes?
- **Recommended:** Small closed enum for broker-originated errors (`offline | unauthorized | version_mismatch | no_capacity`, from STORY-046-01's `ErrorCode`); opaque detail for Connector-originated errors. (Matches `envelope-protocol.md` open-question #3 lean.)
- **Human decision:** {default-accept}

### 1.5 Risks

- **Risk:** A relay path that decodes `payload` (even once) reintroduces the GC/CPU cost the architecture forbids and silently couples the broker to the event contract.
- **Mitigation:** A test asserts the relay reads only envelope fields and forwards `payload` as an opaque value; code review greps for `payload` parsing in `relay.ts`.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Broker routing, relay, cancel, and turn lifecycle

  Scenario: Relay one turn end to end, in order
    Given a Connector is online for project P and an app is bound to it
    When the app sends prompt(turn_id=T)
    Then the broker routes it down the Connector line
    And relays every event(T, seq) back to that app in seq order until turn_end(T)

  Scenario: Offline fast-fail
    Given no Connector is online for the target connection
    When an app sends a prompt
    Then the broker returns error offline immediately and the app does not hang

  Scenario: Cancel tears down cleanly
    Given a turn T is streaming
    When the app sends cancel(T)
    Then the broker delivers cancel down the Connector line
    And stops relaying T after turn_end(T)

  Scenario: A turn is not closed on a result frame
    Given a turn T that emits two turn_result event frames before EOF
    When the broker relays them
    Then it keeps T's in-flight tracking open until turn_end(T)

  Scenario: Concurrent turns do not cross
    Given two apps each run a turn against one Connector
    When both stream concurrently
    Then each app receives only its own turn_id's events

  Scenario: Payload bytes are never parsed
    Given any event frame
    When the broker routes it
    Then it reads only the envelope and forwards the payload value unchanged
    And it never JSON-parses or re-encodes the payload
```

### 2.2 Verification Steps (Manual)
- [ ] Drive a prompt through a fake Connector + fake app harness → events arrive in `seq` order until `turn_end`.
- [ ] Send `cancel` mid-stream → relay stops after `turn_end`.
- [ ] Prompt with no online Connector → immediate `error: offline`.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Router — prompt down + in-flight tracking (new) | `connector/broker/src/router.ts` |
| Relay — ordered opaque event fan-out (new) | `connector/broker/src/relay.ts` |
| Gateway dispatch wiring (edit) | `connector/broker/src/ws-gateway.ts` |
| Router + relay tests (new) | `connector/broker/test/router.node.test.ts` |

### 3.2 Technical Logic
`router.ts` consumes the `Registry` (from STORY-046-02) to find the bound connection's socket and tracks in-flight turns in a `Map<turn_id, { connection_id, app_id }>`. `relay.ts` forwards `event` frames to the initiating app's socket, preserving `seq` order and treating `payload` as opaque (it re-emits the already-decoded envelope with the same payload value — no payload parse). `ws-gateway.ts` is edited to dispatch `prompt`/`event`/`cancel`/`turn_end` frames into the router/relay (this is the only file shared with STORY-046-02, which must merge first). Closing rule: in-flight tracking for T is removed on `turn_end(T)` exclusively.

### 3.3 API Contract (if applicable)

| Frame | Direction | Broker action |
|---|---|---|
| `prompt` | App → Broker → Connector | record in-flight T; route down bound line; `error: offline` if no live line |
| `event` | Connector → Broker → App | relay opaque, in `seq` order, to the initiating `app_id` |
| `cancel` | App → Broker → Connector | route down; stop relaying T after `turn_end(T)` |
| `turn_end` | Connector → Broker → App | close in-flight T; relay terminal marker |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 6 | relay-in-order, offline-fast-fail, cancel-stops-after-turn_end, two-results-not-terminal, no-cross-talk, payload-never-parsed |
| E2E / acceptance tests | 0 | E2E is STORY-046-04 |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] `relay.ts` contains no `JSON.parse`/re-encode of `payload` (grep + test).
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `connector/broker/src/registry.ts` (created by STORY-046-02) — the lookup the router routes through.
- **Surface:** `connector/docs/envelope-protocol.md` §Turn lifecycle / §Multiplexing rules — the literal routing, ordering, and "close on turn_end not result" rules.
- **Coverage of this requirement:** none — net-new. Directed, presence-aware, opaque frame routing has no analogue on the plane.

## Why not simpler?

- **Smallest existing surface that could carry this:** none — routing depends on the net-new registry from STORY-046-02; nothing pre-existing forwards frames between two live sockets.
- **Why isn't extension / parameterization / config sufficient?** Ordered, multiplexed, opaque relay with EOF-driven turn closure is bespoke routing logic; there is nothing to parameterize.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific file paths traceable to EPIC-046 `<target_files>`.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered.
