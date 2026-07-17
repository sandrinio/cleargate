---
story_id: STORY-048-04
parent_epic_ref: EPIC-048
parent_cleargate_id: "EPIC-048"
sprint_cleargate_id: null
carry_over: false
status: Draft
ambiguity: 🟢 Low
context_source: EPIC-048 (INITIATIVE-001 direct-approval + §6 decisions acked 2026-06-06) + connector/docs/{event-contract,spike-findings-claude-2.1.161,envelope-protocol,auth-seam}.md + verified codebase grounding (M0 daemon on disk)
actor: Connector daemon (on the user's machine)
complexity_label: L3
parallel_eligible: n
expected_bounce_exposure: high
lane: standard
db_write_set: []
dep_predecessors:
  - STORY-048-03
deferred_verification: []
area: connector
created_at: 2026-06-06T00:00:00Z
updated_at: 2026-06-06T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: existing-surfaces-verified
      detail: "cited paths do not exist on disk: connector/daemon/src/dial.ts, connector/daemon/src/index.ts, connector/shared/src/types.ts, connector/docs/envelope-protocol.md, connector/broker/src/auth/revoke-subscriber.ts"
  last_gate_check: 2026-06-05T20:14:55Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-048-04
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-05T20:14:55Z
  sessions: []
---

# STORY-048-04: Connector M2 — reconnect + re-attach by connection_id + full-jitter backoff + heartbeat ping/pong
**Complexity:** L3 — a reconnect supervisor that reworks the M0 terminal-close path (`index.ts` today reaps every turn on `ws.close`), threading credential re-register, persisted `connection_id` re-attach, full-jitter backoff, ping/pong liveness, and a revoke-vs-network-drop fail-closed branch — high-bounce resilience logic over an existing turn path.

## 1. The Spec (The Contract)

### 1.1 User Story
As the Connector daemon on the user's machine, I want to redial the broker on a dropped socket, re-register with the **same** credential, re-attach to the **same** `connection_id` under full-jitter backoff, and answer broker `ping` with `pong` — while refusing to reconnect after a revoke-driven close — so that a network blip is a hiccup (not a lost connection), a broker redeploy doesn't trigger a synchronized re-verify storm, and a dead credential fails closed instead of hammering the broker with unauthorized re-registers.

### 1.2 Detailed Requirements
- **`index.ts` — rework the terminal-close path (do NOT rebuild M0):** today the `conn.ws.addEventListener("close", …)` handler at `index.ts:210` calls `exitHandler()`, treating *every* close as terminal and reaping all live turns. Split this: a **network-drop close** routes to the reconnect supervisor (preserve live turns for re-attach reconciliation); a **revoke-driven close** keeps the existing reap-and-stop behavior (fail closed). The `startDaemon` boot path (`dial → register`, `index.ts:98`) is unchanged; the supervisor wraps it.
- **`reconnect.ts` (new) — reconnect supervisor:** on a non-revoke `ws.close`, redial via the existing `dial(opts.url, dialOpts)` call (reuse `DialOpts` verbatim from `index.ts:88`), re-sending `register` with the **same** `opts.credential` (the real credential from STORY-048-03 — identity is the credential, not the socket, per `envelope-protocol.md` §Resilience). The supervisor owns the redial loop, the backoff timer, and the persisted `connection_id`.
- **Persisted `connection_id` re-attach:** the broker assigns `connection_id` once at the first `registered` (`dial.ts:152`) and **never re-sends it on a re-attach** — the daemon must persist the first-register `connectionId` across the redial and pass it forward so the turn path keeps emitting `event`/`turn_end` frames under the original id (the `conn.connectionId ?? ""` reads at `index.ts:131,155,178` must resolve to the persisted id, not a fresh socket's null).
- **`backoff.ts` (new) — full-jitter backoff:** compute each redial delay as `random(0, min(cap, base * 2^attempt))` with **cap 0–60s** (the acked default for the ~100-connector population). Full-jitter (not equal-jitter, not exponential-only) is mandatory so a broker redeploy's drain window spreads re-verify across the whole 0–60s span rather than synchronizing 100 daemons on the same backoff schedule. Reset the attempt counter to 0 on a successful re-register.
- **Heartbeat `ping`/`pong`:** the broker drives presence via `ping`/`pong` on both edges (`shared/src/types.ts` `FrameType` already includes `"ping" | "pong"`; `envelope-protocol.md` §Resilience: "missed beats → mark offline, evict"). Add a frame handler (via the existing `conn.onFrame` dispatch at `index.ts:193`) that, on receiving a `ping` envelope, replies with a `pong` envelope (same `connection_id`, no `turn_id`) within the heartbeat window so the broker keeps the connection present. **Missed-beat eviction is the broker's job** (EPIC-046, shipped) — the daemon only answers.
- **Revoke-vs-network-drop classification (fail closed):** distinguish the two close causes. A revoke-driven close (broker `error: unauthorized` / `project_revoked`, or the broker force-killing the line per `broker/src/auth/revoke-subscriber.ts` semantics) means the credential is **dead** — the supervisor must NOT reconnect (a re-register would just return `ErrorCode.unauthorized`). Detection: an `error` frame with `unauthorized` before the close, OR an immediate `unauthorized` on the first re-register attempt → stop the supervisor, reap turns, fail closed. A bare network drop (no unauthorized signal) → reconnect.
- **In-flight turn reconciliation:** on a successful re-attach, live `turn_id`s recorded in the `liveTurns` map are **re-attached, not restarted** — the supervisor does NOT re-issue `prompt`, and no duplicate prompt is spawned (`envelope-protocol.md` §Idempotency: "a reconnect mid-turn resumes streaming the existing turn rather than re-issuing prompt"). This story re-attaches the *connection*; the *turn-stream* resume-from-`seq` replay handoff lands in STORY-048-05.

### 1.3 Out of Scope
- **Resume-from-`seq` replay** of turn events against the broker's bounded replay ring (STORY-048-05 — this story re-attaches the connection and reconciles `turn_id`s; 048-05 resumes the turn stream from the last delivered `seq`).
- **Broker-side heartbeat sweep / missed-beat eviction** (EPIC-046, shipped — the daemon only answers `ping`).
- **Real-credential acquisition** (STORY-048-03 — this story reuses whatever credential `opts.credential` already carries; it does not mint or refresh it).
- Runtime version-drift guard, sessions, metrics, sandboxing (STORY-048-06…08).

### 1.4 Open Questions
The forks are **RESOLVED at the epic §6 level** (Sandro, 2026-06-06). The relevant resolved decision: **import auth directly** for M2 (no shared `@cleargate/auth` lib) and **keep `connector/daemon` as a sub-package** — so the credential the supervisor re-registers with is read from `opts.credential` (already wired through `DialOpts`), no new package boundary. The full-jitter **cap 0–60s** is the acked default for the ~100-connector population. No story-level forks remain; backoff cap and fail-closed-on-revoke are both fixed by the epic.

### 1.5 Risks
- **Risk:** Reconnect storm — 100 daemons redial in lockstep after a broker redeploy and synchronize the re-verify load.
- **Mitigation:** Full-jitter backoff, cap 0–60s (acked default); a unit test asserts a sampled population of delays spreads across the span (not clustered) — distinct delays, max ≤ cap.
- **Risk:** Revoke-vs-network-drop misclassification — a revoke-close is mistaken for a blip and the daemon reconnects, hammering the broker with `unauthorized` re-registers.
- **Mitigation:** Fail-closed detection — an `error: unauthorized` (pre-close or on the immediate re-register) suppresses reconnect entirely and reaps turns; a unit test drives a revoke-close and asserts **zero** redial attempts.
- **Risk:** Lost `connection_id` on re-attach — the broker never re-sends it, so a daemon that drops it emits frames under `""` and the broker can't route them.
- **Mitigation:** Persist the first-register `connectionId` in the supervisor; a test asserts the post-reconnect frame carries the original id.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Connector reconnect, re-attach, full-jitter backoff, and heartbeat

  Scenario: Reconnect re-attaches to the same connection_id by credential
    Given a registered daemon holding a broker-assigned connection_id
    When the socket drops on a network blip
    Then the daemon redials and re-registers with the SAME credential
    And it re-attaches to the SAME connection_id (the broker recognizes it by credential, not socket)
    And post-reconnect event frames carry the original connection_id

  Scenario: Full-jitter backoff spreads the post-deploy reconnect storm
    Given 100 daemons reconnecting after a broker redeploy
    When each computes its redial delay
    Then the delays use full-jitter, capped 0-60s
    And the sampled delays are spread across the window, not synchronized

  Scenario: Heartbeat ping is answered with pong
    Given a connected daemon
    When the broker sends a ping frame
    Then the daemon replies pong within the heartbeat window under the same connection_id
    And the broker keeps the connection present (not evicted)

  Scenario: Revoke-driven close fails closed, never reconnects
    Given a socket closed because the credential was revoked (unauthorized)
    When the supervisor would otherwise reconnect
    Then it does NOT reconnect — it reaps live turns and stops (fail closed)
    And it issues zero redial attempts

  Scenario: In-flight turns are re-attached, not restarted
    Given a reconnect succeeds with live turn_ids in flight
    When the connection re-attaches
    Then those turns are reconciled (re-attached) not restarted
    And no duplicate prompt is issued (resume-from-seq handoff lands in 048-05)
```

### 2.2 Verification Steps (Manual)
- [ ] Register the daemon against a local broker stub, drop the socket without an `unauthorized` signal → observe a redial, a re-register with the same credential, and the original `connection_id` on the next `event` frame.
- [ ] Sample the backoff function ~100 times → assert distinct delays, all ≤ 60s, visibly spread (not clustered).
- [ ] Send a `ping` frame from the stub → observe a `pong` reply carrying the same `connection_id`.
- [ ] Close the socket after an `error: unauthorized` → assert the supervisor reaps turns and makes **no** redial attempt.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Reconnect supervisor (new) | `connector/daemon/src/reconnect.ts` |
| Full-jitter backoff helper (new) | `connector/daemon/src/backoff.ts` |
| Daemon entry — rework close path + ping/pong (extend) | `connector/daemon/src/index.ts` |
| WS dial-out client — reuse `dial()` + `DialHandle` (read-only) | `connector/daemon/src/dial.ts` |
| Shared envelope types — `FrameType` ping/pong, `ErrorCode.unauthorized` (read-only) | `connector/shared/src/types.ts` |
| Reconnect/backoff/ping-pong tests (new) | `connector/daemon/test/reconnect.node.test.ts` |
| Red tests (new) | `connector/daemon/test/reconnect.red.node.test.ts` |

### 3.2 Technical Logic
`index.ts:98` already does `const conn = await dial(opts.url, dialOpts)` and `index.ts:210` wires `conn.ws.addEventListener("close", () => void exitHandler())` — that close handler is the single rework point. The new `reconnect.ts` supervisor wraps `startDaemon`'s connection lifecycle: it captures the first-register `conn.connectionId` (`dial.ts:152` assigns it once; the broker never re-sends it), and on a non-revoke close it loops `dial(opts.url, dialOpts)` under `backoff.ts` delays, re-using the **same** `dialOpts.credential` built at `index.ts:88`. `backoff.ts` exposes a pure `fullJitter(attempt, { baseMs, capMs }) → number` returning `random(0, min(capMs, baseMs * 2^attempt))`, capMs defaulting to 60_000 — pure and unit-testable without a socket. Ping/pong attaches to the existing `conn.onFrame` dispatch (`index.ts:193`): when `env.type === "ping"`, send a `pong` envelope `{ v: 1, type: "pong", connection_id: <persisted> }` via `conn.ws.send(encode(...))` (mirroring the `emitTurnEnd` send at `index.ts:159`). Revoke detection reads the broker `error` frame: an `ErrorCode.unauthorized` (from `shared/src/types.ts`) seen before the close — or returned on the immediate re-register — flags the credential dead; the supervisor then calls the existing `exitHandler()` reap and stops, matching the force-kill posture of `broker/src/auth/revoke-subscriber.ts` (drop + kill in-flight, fail closed). Live `turn_id`s in the `liveTurns` map (`index.ts:86`) are preserved across a network-drop reconnect (no `liveTurns.clear()` on that path) so the turn path keeps streaming under the re-attached `connection_id`; the supervisor never re-issues `prompt`.

### 3.3 API Contract (if applicable)

| Surface | Shape |
|---|---|
| `fullJitter(attempt, opts)` | `(attempt: number, { baseMs, capMs }: { baseMs: number; capMs?: number }) → number` (delay ms in `[0, min(capMs, baseMs·2^attempt)]`, capMs default 60_000) |
| `createReconnectSupervisor(opts)` | `→ { connectionId(): string \| null; onClose(cause): void; stop(): Promise<void> }` — drives redial + re-register + persisted connection_id |
| `pong` reply frame | `{ v: 1, type: "pong", connection_id: <persisted> }` (no `turn_id`), sent on inbound `ping` |
| Revoke signal | `error` frame with `ErrorCode.unauthorized` (pre-close or on re-register) → suppress reconnect |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 5 | redial-reattaches-same-connection_id, full-jitter-spread (capped 0–60s), ping-pong-reply, revoke-close-no-reconnect (zero redials), network-drop-reconnect-preserves-turns |
| E2E / acceptance tests | 0 | E2E lives in EPIC-046 (broker) + a later connector E2E; this story is unit-level over the daemon process+WS |

### 4.2 Definition of Done (The Gate)
- [ ] Reconnect supervisor redials + re-registers with the same credential on a non-revoke drop; `index.ts` no longer treats every `ws.close` as terminal-reap.
- [ ] Full-jitter backoff cap 0–60s (acked default); revoke-close path explicitly suppresses reconnect (fail closed).
- [ ] Heartbeat: daemon replies `pong` to broker `ping`; missed-beat presence remains the broker's job (not re-implemented here).
- [ ] Re-attach uses the broker-assigned `connection_id` from the first register (broker never re-sends it — the daemon persists it across the redial).
- [ ] Unit tests ≥5: redial-reattaches-same-connection_id, full-jitter-spread, ping-pong, revoke-close-no-reconnect, network-drop-reconnect.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `connector/daemon/src/dial.ts` — `dial()` + `DialHandle` (`.ws` / `.close()` / `.onFrame()` / `.connectionId`); the supervisor redials through this verbatim and reads the persisted `connectionId` from it. No rebuild.
- **Surface:** `connector/daemon/src/index.ts` — the `ws.close` handler at `:210` that today reaps all turns via `exitHandler()`, and the `conn.onFrame` dispatch at `:193`. **REWORK** (split network-drop vs revoke-close; add ping→pong), do not rebuild M0.
- **Surface:** `connector/shared/src/types.ts` — `FrameType` already lists `"ping" | "pong"` and `ErrorCode.unauthorized`; no schema change, the daemon just handles the existing frames.
- **Surface:** `connector/docs/envelope-protocol.md` §Resilience + §Idempotency — the reconnect/re-attach-by-credential, heartbeat, and "resume not re-issue prompt" rules implemented here.
- **Surface:** `connector/broker/src/auth/revoke-subscriber.ts` — force-kill / fail-closed semantics; contract reference for revoke-close detection (drop + kill in-flight, do not drain).
- **Coverage of this requirement:** partial — extends the existing `dial()` + `index.ts` close/dispatch path and reuses the shared ping/pong + `unauthorized` types (~40% reuse); net-new is the supervisor loop, full-jitter `backoff.ts`, the revoke-vs-drop branch, and persisted-`connection_id` re-attach.

## Why not simpler?

- **Smallest existing surface that could carry this:** `index.ts`'s single `ws.close → exitHandler()` line is the closest hook, but it is hard-coded as *terminal* (reap everything) — it has no redial, no backoff, no credential re-register, and no way to tell a blip from a revoke. It cannot carry reconnect without the supervisor rework.
- **Why isn't extension / parameterization / config sufficient?** A config flag (e.g. "auto-reconnect: true") would still leave the storm problem (synchronized re-verify), the fail-closed-on-revoke branch, and the persisted-`connection_id` re-attach unsolved — these are net-new control-flow, not a tunable on the existing terminal-close path. Full-jitter spreading and revoke classification are genuinely new logic the M0 skeleton never exercised (it ran one connection per turn, no reconnect).

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Readied 2026-06-06: the §6 forks are resolved at the epic level (import-auth-direct, sub-package, full-jitter cap 0–60s acked by Sandro), and the M0 daemon modules (`dial.ts`, `index.ts`, `backend.ts`, `turn-runner.ts`, `teardown.ts`) are on disk with 35 tests passing — the supervisor extends a verified turn path, not a hypothetical one → 🟢.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2 (re-attach-by-credential, full-jitter cap, ping/pong, revoke fail-closed, turn reconciliation).
- [x] Implementation Guide (§3) maps to specific file paths traceable to EPIC-048 `<target_files>` (`reconnect.ts`, `backoff.ts`, reworked `index.ts`, read-only `dial.ts`/`types.ts`).
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path (cites five: `dial.ts`, `index.ts`, `shared/src/types.ts`, `envelope-protocol.md`, `revoke-subscriber.ts`).
- [x] Why not simpler? has both sub-bullets answered.
- [x] §1.4 granularity decision recorded — no story-level fork; forks resolved at epic §6 (cap 0–60s + fail-closed-on-revoke fixed by the epic), single L3 unit kept whole.
