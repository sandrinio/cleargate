---
story_id: STORY-047-06
parent_epic_ref: EPIC-047
parent_cleargate_id: "EPIC-047"
sprint_cleargate_id: null
carry_over: false
status: Draft
ambiguity: 🟢 Low
context_source: EPIC-047 (INITIATIVE-001 direct-approval) §2/§5/§6-resolved + connector/broker/src/{router,relay,registry}.ts verified codebase grounding
actor: Project operator
complexity_label: L3
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
db_write_set: []
dep_predecessors:
  - STORY-047-04
  - STORY-047-05
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
      detail: "cited paths do not exist on disk: connector/broker/src/registry.ts, connector/broker/src/router.ts, connector/broker/src/relay.ts"
  last_gate_check: 2026-06-04T14:13:55Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-047-06
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-04T14:13:54Z
  sessions: []
---

# STORY-047-06: Broker M1 — revoke-subscriber (PSUBSCRIBE rev:*) + kill-in-flight + whole-tenant kill
**Complexity:** L3 — one dedicated Redis subscriber connection that reacts to revoke messages in real time by dropping registry subjects, killing in-flight turns through the 046-03 cancel/teardown path, and invalidating the 047-05 verify cache, fail-closed.

## 1. The Spec (The Contract)

### 1.1 User Story
As a project operator, I want the broker to react instantly to a revoke — dropping the revoked connection/app-token/whole-project from the registry, terminating any turn it is currently driving, and clearing it from the verify cache — so that revocation is instant (not connect-time-only) and a compromised credential cannot keep an in-flight turn alive on the user's machine.

### 1.2 Detailed Requirements
- **One dedicated subscriber connection.** Open a SINGLE broker-owned Redis subscriber connection that issues `PSUBSCRIBE rev:*` (a connection in subscribe mode cannot also run normal commands — it is dedicated, separate from the broker's request-path Redis client). All revoke reactions flow through this one connection's message handler.
- **On a per-subject revoke message** (`rev:connection:<id>` or `rev:apptoken:<id>` from STORY-047-04's publish), the handler atomically:
  1. **Drops the subject from the registry** — `registry.drop(connection_id)` for a connection; for an app-token, drop the app binding(s) and refuse the app's further frames.
  2. **Kills any in-flight turn(s) for the subject** — reuse the STORY-046-03 cancel/teardown path (`router.ts` cancel + `relay.ts` turn teardown). Every turn tracked against the dropped connection/app is force-cancelled and torn down (not left to drain).
  3. **Invalidates the STORY-047-05 verify cache** for the subject — call the cache's `invalidate(subject)` hook so a reconnect within the TTL window cannot reuse a stale positive binding.
  4. **Writes an audit row** recording the revoke reaction: `{subject_kind, subject_id, project_id, turns_killed, drop_latency_ms, at}`.
- **Whole-tenant kill** (`rev:project:<id>`): drop **ALL** of the project's connections (every registry entry whose `project_id` matches), kill all of their in-flight turns, invalidate their cache entries, and **refuse re-register for that project until cleared** — the broker holds the project in a "revoked" set so a fresh `register` for it is rejected (`error: project_revoked`) until an explicit clear message lifts it.
- **Instant + measurable.** The kill must terminate an already-streaming turn; the test measures the drop latency (publish-to-turn-killed elapsed) and asserts the in-flight turn is gone.
- **Fail-closed posture.** If the subscriber connection drops/reconnects, the broker must not assume cache validity over the gap; on resubscribe it flushes the verify cache (it may have missed a revoke). A missed revoke never silently outlives its subject.

### 1.3 Out of Scope
- The `mcp`-side publish-on-revoke (STORY-047-04) — this story consumes the channels, does not produce them.
- The verify-client + short-TTL positive cache implementation (STORY-047-05) — this story calls its `invalidate(subject)` hook, does not build the cache.
- The lane wiring / `auth-stub.ts` retirement that replaces register-time stub verification with the real verify-client (STORY-047-07).
- The clear-revocation mint/admin API (who emits the `rev:project:<id>` clear) — out of this story; the broker only reacts to the clear message shape.

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** When a `rev:project:<id>` arrives, what lifts the project from the broker's "revoked" set so re-register works again?
- **Recommended:** A `rev:project:<id>:clear` message on the same channel pattern (also caught by `PSUBSCRIBE rev:*`) removes the project from the revoked set. No timed auto-expiry — a revoked tenant stays refused until explicitly cleared (fail-closed).
- **Human decision:** {default-accept}

- **Question:** If a turn-kill races a naturally-arriving `turn_end` for the same turn, is a double-teardown a problem?
- **Recommended:** Teardown is idempotent — reuse the 046-03 path which closes in-flight tracking on `turn_end` ONLY and tolerates an already-removed turn. The revoke kill removes the turn and the later `turn_end` is a no-op.
- **Human decision:** {default-accept}

### 1.5 Risks

> Risks specific to this Story (cross-story risks belong in the milestone plan).

- **Risk:** A revoke arrives between a successful verify and the turn actually starting — the turn could slip through after the registry drop.
- **Mitigation:** Drop-then-kill ordering plus cache invalidation: the registry entry is removed first (a new `prompt` for it fast-fails `offline` via 046-03), then any tracked turn is killed; the cache invalidation closes the reconnect-reuse window. The race window is bounded to one frame and the next frame fast-fails.

- **Risk:** Subscriber connection silently dies and the broker keeps serving cached positive bindings for revoked subjects (fail-open).
- **Mitigation:** On any subscriber disconnect/resubscribe, flush the verify cache; the test exercises a resubscribe and asserts the cache is empty afterward.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Broker revoke-subscriber — kill-in-flight and whole-tenant kill

  Scenario: Revoke a connection drops it and kills its in-flight turn
    Given a connection C is registered for project P and driving an in-flight turn T
    When a rev:connection:<C> message is published
    Then the broker drops C from the registry
    And it terminates the in-flight turn T via the cancel/teardown path
    And it invalidates the verify cache entry for C
    And it writes an audit row recording the revoke

  Scenario: Revoke an app-token denies the app and kills its in-flight turn
    Given an app A bound to connection C is driving an in-flight turn T with an app-token
    When a rev:apptoken:<A> message is published
    Then the broker denies app A's further frames
    And it terminates A's in-flight turn T
    And it invalidates the verify cache entry for that app-token

  Scenario: Whole-tenant kill drops all of a project's connections
    Given two connections C1 and C2 are registered for project P
    When a rev:project:<P> message is published
    Then both C1 and C2 are dropped from the registry
    And any in-flight turns on either are killed
    And a fresh register for project P is refused with error project_revoked until cleared

  Scenario: Whole-tenant clear lifts the re-register refusal
    Given project P is in the broker's revoked set
    When a rev:project:<P>:clear message is published
    Then a fresh register for project P succeeds again

  Scenario: Verify cache entry is invalidated on revoke
    Given the verify cache holds a positive binding for subject S
    When a revoke for S is published
    Then the broker calls the cache invalidate(S) hook
    And a subsequent reconnect for S does not reuse the cached binding

  Scenario: Drop latency is measured and bounded
    Given a connection C is driving a streaming in-flight turn
    When rev:connection:<C> is published
    Then the test measures the elapsed time until the turn is killed
    And the in-flight turn is confirmed gone

  Scenario: Subscriber resubscribe flushes the cache (fail-closed)
    Given the dedicated subscriber connection drops and resubscribes
    Then the broker flushes the verify cache so no missed revoke survives the gap
```

### 2.2 Verification Steps (Manual)
- [ ] Against real Redis (docker-compose Postgres 18 + Redis 8 / OrbStack): register a connection, start a streaming turn through the fake-Connector harness, `PUBLISH rev:connection:<id>` → confirm the turn stops and the registry entry is gone.
- [ ] `PUBLISH rev:project:<id>` with two live connections → both dropped; a fresh `register` for that project returns `error: project_revoked`.
- [ ] `PUBLISH rev:project:<id>:clear` → re-register for that project succeeds.
- [ ] Confirm exactly ONE Redis connection is in subscribe mode (`PSUBSCRIBE rev:*`), separate from the request-path client.

## 3. The Implementation Guide

### 3.1 Context & Files

> **v2 gate input:** under v2 execution mode, this table is a pre-commit gate input (cleargate-enforcement.md §6). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows are ignored by the parser.

| Item | Value |
|---|---|
| Revoke subscriber (new) | `connector/broker/src/auth/revoke-subscriber.ts` |
| Registry — drop reused, project-scoped drop + revoked-set (modify) | `connector/broker/src/registry.ts` |
| Router/relay — kill-in-flight hook reused (modify) | `connector/broker/src/router.ts`, `connector/broker/src/relay.ts` |
| Server wiring — start subscriber on boot (modify) | `connector/broker/src/server.ts` |
| Revoke-subscriber tests (new) | `connector/broker/test/revoke-subscriber.node.test.ts` |
| New Files Needed | Yes — `revoke-subscriber.ts`, `revoke-subscriber.node.test.ts` |

### 3.2 Technical Logic
`revoke-subscriber.ts` opens one dedicated Redis connection in subscribe mode and runs `PSUBSCRIBE rev:*`. Its message handler parses the channel name to classify the subject (`connection` | `apptoken` | `project` | `project-clear`) and dispatches:
- **connection / apptoken:** look up the registry entry/app binding, force-cancel its in-flight turn(s) by invoking the STORY-046-03 teardown (the same `router.ts` cancel path that marks the turn cancelled in `relay.ts` and removes in-flight tracking), then `registry.drop(connection_id)` (`registry.ts:94`) / unbind the app, then call the STORY-047-05 cache `invalidate(subject)`, then write the audit row.
- **project:** iterate registry entries where `entry.project_id === <id>` (the `project_id` field is on every `RegistryEntry`, `registry.ts:23`), apply the connection-drop path to each, add `<id>` to an in-memory `revokedProjects` set so `ws-gateway.ts` register handling (added in STORY-047-07; this story exposes the predicate) rejects re-register with `error: project_revoked`.
- **project-clear:** remove `<id>` from `revokedProjects`.

The kill ordering is drop-from-registry → kill-in-flight → invalidate-cache → audit, so a racing `prompt` fast-fails `offline` (046-03) the instant the registry entry is gone. Teardown is idempotent: the 046-03 path closes in-flight tracking on `turn_end` only and tolerates an already-removed turn, so a force-kill followed by a natural `turn_end` is safe. On subscriber disconnect/resubscribe the handler flushes the verify cache (fail-closed). The subscriber is started from `server.ts` at broker boot and shares no connection with the request-path Redis client.

### 3.3 API Contract (if applicable)

| Channel (PSUBSCRIBE rev:*) | Source | Broker reaction |
|---|---|---|
| `rev:connection:<id>` | STORY-047-04 publish | drop connection, kill its turn(s), invalidate cache, audit |
| `rev:apptoken:<id>` | STORY-047-04 publish | deny app, kill its turn(s), invalidate cache, audit |
| `rev:project:<id>` | STORY-047-04 publish | drop all project connections, kill turns, refuse re-register until cleared |
| `rev:project:<id>:clear` | clear emitter (out of scope) | lift the project's re-register refusal |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit / integration tests | 7 | connection-revoke-drops+kills, apptoken-revoke-denies+kills, project-revoke-drops-all, project-clear-lifts-refusal, cache-invalidated-on-revoke, drop-latency-measured, resubscribe-flushes-cache — all `*.node.test.ts` via `tsx --test` against **real Redis 8** (docker-compose / OrbStack), NO mocks |
| E2E / acceptance tests | 0 | end-to-end kill-in-flight is exercised by the connector E2E story, not here |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] `grep` confirms exactly one `PSUBSCRIBE` and one dedicated subscriber connection (no second subscribe on the request-path client).
- [ ] Peer/Architect Review passed.

## Existing Surfaces

> L1 reuse audit. List source-tree implementations the request could extend. Cite file:line.

- **Surface:** `connector/broker/src/registry.ts:94` (`drop(connection_id)`) + `registry.ts:23` (`project_id` on every `RegistryEntry`) — the registry mutation reused for per-subject and whole-tenant drop. **Coverage:** partial — `drop` exists; project-scoped iteration + the `revokedProjects` refusal set are net-new additions here.
- **Surface:** `connector/broker/src/router.ts:53-200` (cancel forward + in-flight tracking closed on `turn_end` only) + `connector/broker/src/relay.ts` (turn teardown / `markCancelled`) — the STORY-046-03 cancel/teardown path reused as the kill-in-flight mechanism. **Coverage:** partial — the teardown path exists; invoking it from a revoke message (vs. an app `cancel` frame) is the new caller.
- **Surface:** STORY-047-04 publish channels `rev:connection|apptoken|project:<id>` (EPIC-047 §2 IN-SCOPE) — the channels this subscriber consumes. **Coverage:** none here — produced by 047-04.
- **Surface:** STORY-047-05 verify cache `invalidate(subject)` hook (EPIC-047 §2 short-TTL cache, §6-resolved) — called on each revoke. **Coverage:** none here — built by 047-05.
- **Surface:** `connector/broker/src/auth/` — empty directory awaiting the M1 real-auth files (`verify-client.ts` from 047-05, `revoke-subscriber.ts` from this story) per EPIC-047 `<target_files>`. **Coverage:** none — net-new file.

## Why not simpler?

> L2 / L3 right-size + justify-complexity. Answer both.

- **Smallest existing surface that could carry this:** none net-new for the subscriber itself — `registry.drop` and the 046-03 cancel/teardown path are reused, but no pub/sub consumer exists on the plane today (EPIC-047 §2 notes Redis pub/sub is net-new; only `set`/`get` exist).
- **Why isn't extension / parameterization / config sufficient?** Connect-time introspection (047-05) alone cannot revoke an *already-connected* subject — by definition the credential was valid at connect. Instant revocation that kills a streaming turn requires a runtime push channel the broker actively listens on; that is a new stateful subscriber with its own dedicated connection, drop/kill/invalidate orchestration, and a fail-closed resubscribe flush. There is no existing knob to flip — the listening seam does not exist. This is the L3 surface (cross-cutting: subscriber + registry + router/relay + cache + audit, with a measurable real-time kill) that EPIC-047's "revocation must be INSTANT and kill in-flight turns" architecture rule demands.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2 (per-subject drop+kill, apptoken deny+kill, whole-tenant drop + re-register refusal + clear, cache invalidation, measured drop latency, resubscribe cache flush).
- [x] Implementation Guide (§3) maps to specific, verified file paths — `registry.ts`, `router.ts`, `relay.ts`, `server.ts` exist on disk; `auth/` is the empty M1 directory from EPIC-047 `<target_files>`.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path (`registry.ts:94`, `router.ts:53-200`, `relay.ts`).
- [x] Why not simpler? has both sub-bullets answered.
