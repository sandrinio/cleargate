---
story_id: STORY-046-01
parent_epic_ref: EPIC-046
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
ambiguity: 🟢 Low
context_source: EPIC-046 (INITIATIVE-001 direct-approval) + connector/docs/envelope-protocol.md + connector/PRD.md v0.3.1 + verified connector repo grounding
actor: Connector Platform Developer
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: low
lane: fast
db_write_set: []
dep_predecessors: []
deferred_verification: []
area: connector
created_at: 2026-06-04T00:00:00Z
updated_at: 2026-06-04T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-06-04T09:08:14Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-046-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-04T08:21:03Z
  sessions: []
---

# STORY-046-01: Scaffold /connector workspace + frozen envelope codec
**Complexity:** L2 — multi-file greenfield scaffold + a cross-package wire codec module; mechanical but foundational.

## 1. The Spec (The Contract)

### 1.1 User Story
As a Connector platform developer, I want a scaffolded `/connector` workspace (`shared/`, `broker/`, `daemon/`) with a frozen envelope codec, so that every component speaks one wire contract and the rest of the sprint's stories build against stable, imported types instead of re-deriving the frame shape.

### 1.2 Detailed Requirements
- **Workspace root** `connector/package.json`: npm workspaces `["shared","broker","daemon"]`; Node 24; TypeScript ^5.8; node:test runner via `tsx --test` (vitest forbidden, per EPIC-028).
- **`connector/shared/types.ts`** — the `Envelope` type + `FrameType` string union exactly per `envelope-protocol.md`: types `register | registered | hello | ready | prompt | event | turn_end | cancel | error | ping | pong`; fields `v:number, type:FrameType, connection_id:string, turn_id?:string, app_id?:string, seq?:number, payload?:unknown`. Plus a broker-originated `ErrorCode` enum (`offline | unauthorized | version_mismatch | no_capacity`).
- **`connector/shared/envelope.ts`** — M0 codec: `encode(env: Envelope): string` and `decode(buf: string | Buffer): Envelope` using **JSON line framing** (one JSON object per WS message). `decode` validates `v === 1` and `type ∈ FrameType`, throwing a typed `EnvelopeDecodeError` on malformed input. The codec decodes **only the envelope**; `payload` is carried through as an opaque value and is never inspected.
- **`connector/broker/package.json`** + **`connector/daemon/package.json`** — each depends on `shared`; `build` (`tsc`) + `test` (`tsx --test`) scripts; typecheck clean importing `shared`.
- **`connector/tsconfig.base.json`** — shared strict compiler config; per-package tsconfig extends it.
- **Round-trip unit tests** for the codec.

### 1.3 Out of Scope
Separable binary framing `[u32 header_len][header][payload]` (deferred to EPIC-046 hardening — M0 is JSON). Any broker/daemon runtime behaviour. Auth. Backpressure. Bounded buffers. The `resume`/`seq` replay window.

### 1.4 Open Questions

- **Question:** JSON line framing vs separable binary framing for M0?
- **Recommended:** JSON line framing — human-debuggable, fastest path to a working loop; the 30k-fps separable-framing keystone is an EPIC-046 hardening story, not a walking-skeleton requirement.
- **Human decision:** {default-accept unless flagged at Brief}

### 1.5 Risks

- **Risk:** Greenfield toolchain config (workspaces + tsc + tsx --test) churns and eats wall-time.
- **Mitigation:** `fast` lane; blocks nothing until done; copy the proven Node 24 + `tsx --test` shape from `cleargate-cli` rather than inventing it.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Scaffold + frozen envelope codec

  Scenario: Codec round-trips an envelope
    Given an Envelope with v=1, a known type, connection_id, turn_id, seq, and an opaque payload
    When it is encode()d and then decode()d
    Then the decoded envelope deep-equals the original
    And the payload value is carried through untouched

  Scenario: Reject a wrong envelope version
    Given a serialized frame with v=2
    When decode() runs
    Then it throws EnvelopeDecodeError

  Scenario: Reject an unknown frame type
    Given a serialized frame with type "frobnicate"
    When decode() runs
    Then it throws EnvelopeDecodeError

  Scenario: Both packages build against the shared contract
    Given broker/ and daemon/ each import the shared envelope module
    When typecheck and node:test run per package
    Then both are green
```

### 2.2 Verification Steps (Manual)
- [ ] `npm --workspace shared test` green (codec round-trip + reject cases).
- [ ] `npm --workspace broker run build` and `npm --workspace daemon run build` typecheck clean importing `shared`.
- [ ] `grep -r "vitest" connector/` returns nothing.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Workspace root (new) | `connector/package.json` |
| Shared config (new) | `connector/tsconfig.base.json` |
| Codec + types (new) | `connector/shared/envelope.ts`, `connector/shared/types.ts` |
| Codec tests (new) | `connector/shared/envelope.node.test.ts` |
| Broker package manifest (new) | `connector/broker/package.json` |
| Daemon package manifest (new) | `connector/daemon/package.json` |

### 3.2 Technical Logic
`envelope.ts` wraps `JSON.stringify`/`JSON.parse` with a validation guard: after parse, assert `v === 1` and `type` is in the `FrameType` set, else throw `EnvelopeDecodeError`. The `payload` field is typed `unknown` and never read by the codec — this is the discipline the broker depends on (it routes on the envelope and forwards `payload` bytes). Mirror the `cleargate-cli` test-runner wiring (`tsx --test`, `*.node.test.ts`). The frame shape and frame-type table are the literal contract from `connector/docs/envelope-protocol.md`; do not extend them in this story.

### 3.3 API Contract (if applicable)
N/A — this is a library module, not a network endpoint. The wire contract it encodes is `connector/docs/envelope-protocol.md` §Frame shape.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | round-trip identity, version reject, unknown-type reject, opaque-payload pass-through |
| E2E / acceptance tests | 0 | E2E is STORY-046-04 |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/package.json` — the working Node 24 + `tsx --test` + `*.node.test.ts` runner wiring to copy (config reference, not extended code).
- **Surface:** `connector/docs/envelope-protocol.md` — the literal frame shape + frame-type table this module encodes.
- **Coverage of this requirement:** none — net-new. No cross-package wire codec exists in `/connector` (the repo holds only design docs + spike captures today).

## Why not simpler?

- **Smallest existing surface that could carry this:** none — net-new workspace; there is no `/connector` runtime code yet.
- **Why isn't extension / parameterization / config sufficient?** The three packages must share one frame contract enforced at compile time; that requires a real shared module and workspace wiring, not a config toggle. This is the foundation every other M0 story imports.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific file paths traceable to EPIC-046 `<target_files>` + the agreed `connector/shared/` M0 layout.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered.
