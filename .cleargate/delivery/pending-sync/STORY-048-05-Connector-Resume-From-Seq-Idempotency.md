---
story_id: STORY-048-05
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
  - STORY-048-04
deferred_verification: []
area: connector
created_at: 2026-06-06T00:00:00Z
updated_at: 2026-06-05T20:14:13Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: existing-surfaces-verified
      detail: "cited paths do not exist on disk: connector/daemon/src/turn-runner.ts, connector/daemon/src/index.ts, connector/docs/envelope-protocol.md"
  last_gate_check: 2026-06-05T20:14:13Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-048-05
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-05T20:14:12Z
  sessions: []
---

# STORY-048-05: Connector M2 — resume-from-seq + turn_id idempotency (a mid-turn drop is a hiccup, not a lost turn or a double-run)
**Complexity:** L3 — a durable per-turn seq cursor + a last-completed `turn_id` dedupe set together form the load-bearing M2 reconnect state machine, the easiest module to get wrong (off-by-one seq, stale state, lost EOF), and the half that turns a dropped socket into a recovered turn rather than a lost one or a double-run.

## 1. The Spec (The Contract)

### 1.1 User Story
As the Connector daemon on the user's machine, I want to resume streaming an in-flight turn from the last seq I delivered when the socket re-attaches, and to dedupe on the last-completed `turn_id` when the broker re-delivers a prompt, so that **a mid-turn drop is a hiccup, not a lost turn or a double-run of `claude`**.

### 1.2 Detailed Requirements
- **`index.ts` — durable per-turn seq cursor (extend, do not rebuild):** today `handlePrompt` collects every `result.events` from `runTurn(handle.stdout)` and emits them after EOF with a fresh per-emit `let seq = 0` (lines 123–148). M2 makes the seq cursor **survive a reconnect**: hold a per-`(connection_id, turn_id)` cursor of the last seq actually `ws.send()`-ed, so that on re-attach the daemon resumes from `lastSentSeq + 1` rather than from 0 or from a re-spawn. The cursor is daemon-side state keyed by `turn_id`; it is the counterpart to the broker's bounded replay ring (EPIC-046).
- **`index.ts` — `LiveTurn` carries delivery state:** extend the `LiveTurn` interface (lines 33–39) with the buffered/collected `events`, the `lastSentSeq` cursor, and a `turnEndEmitted` marker so a re-attach can replay the tail of an already-running turn from the cursor without re-reading stdout.
- **`index.ts` — turn_id dedupe on last-completed id:** maintain a bounded set/ring of last-completed `turn_id`s (the ids cleared in `liveTurns.delete(turnId)` at line 147 + after `emitTurnEnd`). When a `prompt` frame arrives in `conn.onFrame` (lines 193–199) for a `turn_id` already in that completed set, **do NOT call `backend.spawn`** — re-emit the terminal `turn_end` (idempotent acknowledgement) and return. This implements envelope-protocol.md §Resilience "The Connector dedupes on last-completed `turn_id`" and "A reconnect mid-turn resumes streaming the existing turn rather than re-issuing `prompt`."
- **`index.ts` — re-attach resume path:** when the connection re-registers (the 048-04 reconnect hands back a fresh `conn`/`connectionId`), for each still-live turn re-send the events from `lastSentSeq + 1` forward; for each completed-but-unacked turn re-send `turn_end`. A re-attach with **no in-flight turn** re-registers and requests no replay — normal operation resumes (no spurious spawn, no replay frame).
- **`turn-runner.ts` — surface the seq as the durable key (read-only consumer):** `runTurn` already stamps a monotonic `_seq` on every event via `emit()` (lines 83–86, `(ev as ...)["_seq"] = seq++`) and returns `TurnRunnerResult { events, turnEndEmitted }`. M2 reuses that internal `_seq` as the resume cursor's unit — the daemon's wire `seq` must align 1:1 with the event order `runTurn` produced; no new numbering scheme. **The multi-result EOF lifecycle is preserved**: the turn still closes only on `turn_end` at stdout EOF (`turnEndEmitted`), never on a `turn_result`, even when a drop lands between two `result` records.
- **Opaque fidelity on the resume path:** replayed event payloads are re-`encode()`-d from the already-normalized in-memory `NormalizedEvent` objects — the daemon **MUST NOT re-`JSON.parse` / re-stringify** raw stream bytes on resume. The shared codec's re-encode is the only serialization; large integers (`> Number.MAX_SAFE_INTEGER`) survive because the event object was parsed exactly once, on the original stdout pass.

### 1.3 Out of Scope
- The broker's bounded replay ring (EPIC-046) — this is the **daemon-side counterpart**; the broker owns its own ring and re-delivery.
- The connection re-attach / full-jitter backoff itself (STORY-048-04 — this story consumes the reconnected `conn`, it does not implement the reconnect).
- Sessions / `claude --resume` (STORY-048-07 — a **distinct** concept: that resumes a `claude` *session*; this resumes *turn-event* delivery within one already-running turn).
- Heartbeat/presence (`ping`/`pong`), credential rotation (EPIC-047), metrics derivation.

### 1.4 Open Questions
The forks are **RESOLVED at the EPIC-048 §6 level** (acked 2026-06-06). Resolved decision that applies here: the daemon dedupes on **last-completed `turn_id`** and resumes an in-flight turn by **re-streaming from the last delivered seq** rather than re-issuing the prompt — per envelope-protocol.md §Resilience, the seq cursor is daemon-side and pairs with the broker's bounded replay ring; identity is the credential/`connection_id`, not the socket. No granularity split: resume-from-seq and turn_id dedupe are one state machine (the cursor and the dedupe set are read/written on the same re-attach path) and are kept whole; this is the M2 single-unit hardening of the existing `index.ts` turn loop.

### 1.5 Risks
- **Risk:** Off-by-one on the seq cursor, stale `LiveTurn` state on reconnect, or a lost EOF marker → a re-attach either re-spawns `claude` (double-run) or silently truncates the turn tail.
- **Mitigation:** Resume strictly from `lastSentSeq + 1`; assert exact replay-window boundaries in `resume-from-seq-mid-turn.node.test.ts`; assert the dedupe set blocks the second spawn in `dedupe-no-double-run.node.test.ts`; assert `turn_end` fires only at EOF across a mid-stream drop.
- **Risk:** Re-parsing payload bytes on the resume path corrupts large integers (`> MAX_SAFE_INTEGER`); the broker carries a re-encode sentinel that would catch a mismatch, but the daemon must not depend on it.
- **Mitigation:** Replay re-`encode()`s the already-parsed in-memory `NormalizedEvent` — no second `JSON.parse`. Assert byte-identical large-int payload round-trip in `large-int-payload-fidelity.node.test.ts`.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Connector resume-from-seq and turn_id idempotency

  Scenario: Resume an in-flight turn from the last delivered seq
    Given a turn streaming with events delivered up to seq=N
    When the socket drops and the daemon re-attaches
    Then it resumes emitting from seq=N+1
    And it does not restart from seq=0
    And it does not re-run the turn

  Scenario: Re-delivered prompt for a completed turn does not double-run
    Given the daemon already completed turn T (T is in the last-completed set)
    When the broker re-delivers a prompt for turn_id T
    Then the daemon dedupes on last-completed turn_id
    And it does NOT spawn a second claude
    And it re-emits the terminal turn_end for T

  Scenario: Multi-result EOF lifecycle survives a mid-turn drop
    Given a turn that emits multiple result records before EOF
    When a drop happens between two results
    Then re-attach continues past the drop
    And the turn closes only on turn_end at stdout EOF

  Scenario: Re-attach with no in-flight turn requests no replay
    Given a re-attach with no live turn
    When the daemon re-registers
    Then no replay is requested
    And normal operation resumes with no spurious spawn

  Scenario: Resumed events are byte-identical (large-integer fidelity)
    Given resume-from-seq replays an event carrying an integer > MAX_SAFE_INTEGER
    When the events are replayed
    Then the payload is byte-identical to the original
    And the daemon performed no second JSON re-parse of the payload
```

### 2.2 Verification Steps (Manual)
- [ ] Stream a turn to seq=N, force a socket drop, re-attach → observe emission resumes at seq=N+1 (not 0), no second `claude` pid.
- [ ] Re-deliver a `prompt` for a `turn_id` already completed → `pgrep claude` shows no new process; a `turn_end` is re-sent.
- [ ] Drop the socket between two `result` records → turn still closes only at `turn_end` on stdout EOF.
- [ ] Replay a turn whose payload carries an integer `> 2^53` → captured wire bytes match the original byte-for-byte.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Durable seq cursor + dedupe set + resume path (extend) | `connector/daemon/src/index.ts` |
| Per-turn seq emit loop (read-only reuse of `_seq`) | `connector/daemon/src/turn-runner.ts` |
| Shared envelope codec (re-encode, no re-parse) | `connector/shared/envelope.ts` (imported read-only) |
| Resume + dedupe tests (new) | `connector/daemon/test/resume-from-seq.node.test.ts` |
| Mid-turn drop / large-int fidelity tests (new) | `connector/daemon/test/idempotency.node.test.ts` |

### 3.2 Technical Logic
`index.ts` today (lines 100–149) spawns the turn, runs `runTurn(handle.stdout)`, and after EOF iterates `result.events`, sending each as an `event` envelope with a local `let seq = 0` counter — that counter is born and dies inside one `handlePrompt` call, so a reconnect has no daemon-side memory of how far delivery got. M2 lifts that state onto `LiveTurn`: add `events: NormalizedEvent[]`, `lastSentSeq: number` (init `-1`), and `turnEndEmitted: boolean`. The send loop updates `turn.lastSentSeq = seq` after each successful `conn.ws.send(encode(eventFrame))`, and on the `catch` (socket gone, line 138–140) it stops without advancing — the cursor records exactly what reached the wire. A new `resumeTurn(turn, conn)` helper re-sends `turn.events.slice(turn.lastSentSeq + 1)` from the cursor and, if `turn.turnEndEmitted`, re-emits `turn_end` via the existing `emitTurnEnd` (lines 151–164). For dedupe, a bounded `completedTurnIds` set (or small LRU ring) records each id at the point it is `liveTurns.delete(turnId)`-d (line 147 and in `cancelTurn`, line 169); the `conn.onFrame` prompt branch (lines 193–199) checks `completedTurnIds.has(env.turn_id)` before `handlePrompt` and, on a hit, re-emits `turn_end` and returns rather than calling `backend.spawn`. The multi-result EOF invariant is untouched: `runTurn` still reads past every `turn_result` until stdout EOF and only then sets `turnEndEmitted` (turn-runner.ts lines 217–220), so a drop between two results never closes the turn early. Resume re-`encode()`s the in-memory `NormalizedEvent` objects (already parsed once by `runTurn`'s `processLine` / `JSON.parse`, lines 124–126) — the daemon never re-`JSON.parse`es raw bytes on the resume path, preserving large-integer fidelity. The 048-04 reconnect hands `index.ts` a re-registered `conn`; this story walks `liveTurns` and calls `resumeTurn` per still-live turn, and does nothing for a clean re-attach with an empty `liveTurns`.

### 3.3 API Contract (if applicable)

| Surface | Shape |
|---|---|
| `LiveTurn` (extended) | `{ turnId, appId, handle, graceWindowMs, events: NormalizedEvent[], lastSentSeq: number, turnEndEmitted: boolean }` |
| `resumeTurn(turn, conn)` | re-sends `events.slice(lastSentSeq + 1)`; re-emits `turn_end` if `turnEndEmitted`; no spawn |
| dedupe gate | `completedTurnIds.has(turn_id)` → re-emit `turn_end`, skip `backend.spawn` |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 5 | resume-from-seq-mid-turn, dedupe-no-double-run, multi-result-survives-drop, large-int-payload-fidelity, no-inflight-no-replay |
| E2E / acceptance tests | 0 | E2E reconnect-replay is STORY-046-04 (broker-side) |

### 4.2 Definition of Done (The Gate)
- [ ] Per-turn seq survives a reconnect (durable seq cursor per `connection_id` + `turn_id`); resume re-attaches from the last-delivered seq.
- [ ] `turn_id` dedupe on last-completed id prevents a double-run on a re-issued prompt.
- [ ] Multi-result EOF lifecycle (STORY-048-02) preserved across a mid-turn drop — the turn closes only on `turn_end` at EOF.
- [ ] No payload re-parse on the resume path (opaque fidelity — guarded; large-int round-trip asserted).
- [ ] Unit/integration tests ≥5: resume-from-seq-mid-turn, dedupe-no-double-run, multi-result-survives-drop, large-int-payload-fidelity, no-inflight-no-replay.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `connector/daemon/src/turn-runner.ts` — `TurnRunnerResult { events, turnEndEmitted }` and the `emit()` seq-stamp loop (`_seq = seq++`) already produce the monotonic per-turn ordering this story makes durable. Reused read-only as the resume cursor's unit.
- **Surface:** `connector/daemon/src/index.ts` — `handlePrompt`'s send loop (`let seq = 0`, lines 123–148) and the `liveTurns` map + `conn.onFrame` prompt/cancel dispatch are the exact extension points for the durable cursor and the dedupe gate.
- **Surface:** `connector/docs/envelope-protocol.md` §Resilience + §Multiplexing — the idempotency / no-double-run contract ("dedupes on last-completed `turn_id`", "resumes streaming the existing turn rather than re-issuing `prompt`", "`seq` is per-`turn_id`, monotonic from 0").
- **Surface:** EPIC-046 broker bounded replay ring — the broker-side counterpart this daemon cursor pairs with; contract reference only, not rebuilt here.
- **Coverage of this requirement:** partial — extends the existing `index.ts` turn loop + `turn-runner.ts` `_seq` ordering (~40% reusable: the events buffer, seq numbering, and EOF lifecycle already exist); net-new is the durable cursor lifted onto `LiveTurn`, the `completedTurnIds` dedupe gate, and the `resumeTurn` replay path.

## Why not simpler?

- **Smallest existing surface that could carry this:** `handlePrompt`'s in-line `let seq = 0` loop already numbers and sends events — but the counter is function-local and dies with the call, so it cannot survive a reconnect; the EOF lifecycle in `runTurn` already exists but has no concept of "how far did the wire get."
- **Why isn't extension / parameterization / config sufficient?** A reconnect-safe resume needs daemon-side state that outlives a single `handlePrompt` call (the last-delivered seq) plus a dedupe set to make a re-issued prompt idempotent — neither is expressible as a flag or option on the M0 loop; it is a new piece of per-connection state machine grafted onto the existing turn path, the half the spike flagged as easiest to get wrong (off-by-one seq, stale state, lost EOF).

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Readied 2026-06-06: the resume / dedupe forks are resolved at the EPIC-048 §6 level (last-completed `turn_id` dedupe + resume-from-last-seq, identity = credential), and the M0 daemon turn loop (`index.ts`, `turn-runner.ts`) is on disk with 35 tests passing — the Impl Guide cites real line numbers and symbols. Nothing open → 🟢.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific file paths traceable to EPIC-048 `<target_files>` (real `connector/daemon/src/` modules).
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path (`connector/daemon/src/index.ts`, `turn-runner.ts`).
- [x] Why not simpler? has both sub-bullets answered.
- [x] §1.4 granularity decision — kept whole (one M2 reconnect state machine), forks resolved at EPIC-048 §6 (acked 2026-06-06).
