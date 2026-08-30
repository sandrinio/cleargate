---
story_id: STORY-048-02
parent_epic_ref: EPIC-048
parent_cleargate_id: "EPIC-048"
sprint_cleargate_id: null
carry_over: false
status: Completed
ambiguity: 🟢 Low
context_source: EPIC-048 (INITIATIVE-001 direct-approval) + connector/docs/{event-contract,spike-findings-claude-2.1.161}.md + connector/harness/spike captures + verified codebase grounding
actor: Connector daemon (on the user's machine)
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
db_write_set: []
dep_predecessors:
  - STORY-048-01
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
      detail: "cited paths do not exist on disk: connector/docs/event-contract.md, connector/docs/spike-findings-claude-2.1.161.md, connector/harness/spike/captures-2.1.162/00-baseline.ndjso"
  last_gate_check: 2026-06-04T08:34:41Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-048-02
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-04T08:34:41Z
  sessions: []
---

# STORY-048-02: Connector M0 — stream normalizer + multi-result EOF turn lifecycle
**Complexity:** L2 — allowlist-map a minimal `claude` record set to events and run the EOF-driven turn lifecycle; fixture-grounded by the existing spike captures.

## 1. The Spec (The Contract)

### 1.1 User Story
As the Connector daemon, I want to normalize `claude`'s `stream-json` into the minimal event contract and hold the turn open until stdout EOF, so that the app renders a clean, stable event stream — never raw `stream-json` — and a background task's second `result` is not mistaken for the end of the turn.

### 1.2 Detailed Requirements
- **`normalize.ts` — allowlist map** of known `claude` records → the M0 event set:
  - `turn_start` ← `system/init` (echoes `session_id`, `model`)
  - `text_delta` ← `content_block_delta` type `text_delta` — **the only source of rendered text**
  - `tool_use` ← assistant `{name,id,input}` + `input_json_delta` accumulation between `content_block_start[tool_use]`→`stop` (tool names are PascalCase)
  - `tool_result` ← **user** record keyed by `tool_use_id` (`is_error` **null** = success; one event per block on parallel tools)
  - `turn_result` ← `result` event — **NOT terminal**; error iff `is_error: true`
  - `error` ← `result` with `is_error: true`, **or** an out-of-band spawn failure
  - `stream_end` ← **stdout EOF** (the true terminus)
  - **Skip `signature_delta` by name** (non-displayable crypto). **LOG any unmapped record type** on a `drift` channel; **never forward raw `stream-json`.**
- **`turn-runner.ts` — EOF-driven lifecycle** consuming STORY-048-01's `ChildHandle.stdout`: emit normalized `event` frames with a monotonic per-turn `seq`; **hold the turn open past the first `result`** (multi-result: background tasks emit ≥2 — spike finding A.1); a same-session **second `system/init` is a continuation, not a new `turn_start`**; on stdout EOF emit the `stream_end` payload event **and** the `turn_end` envelope control frame.
- **Two error classes:** in-band `is_error: true` → `turn_result` flagged error (recoverable); out-of-band spawn failure (bad binary / `ENOENT` → no parseable stream) → a **distinct fatal `error`**, never a turn left hanging on an EOF that already happened.
- **Wire `turn-runner` into `index.ts`** (edit), replacing STORY-048-01's raw-forward stub so prompts now produce normalized event frames.
- **M0 verbosity fixed = `tools`** (`text_delta` + tool I/O + `turn_result`/`error`); `full`/`thinking_delta` + agent sub-streams deferred.
- **Fixtures (explicit prerequisite — provision them, do not assume they exist):** the connector repo currently holds only `connector/harness/spike/captures-2.1.162/00-baseline.ndjson`. **Re-capture `02-background` (two-result background task) and `10-tooluse` on the installed `claude` 2.1.162** into `connector/harness/spike/captures-2.1.162/`, using the prior-effort 2.1.161 captures at the external path `/Users/ssuladze/Documents/Dev/connector/harness/spike/captures/{02-background,10-tooluse}.ndjson` as the expected-shape reference. The normalizer tests replay the `captures-2.1.162/` fixtures.

### 1.3 Out of Scope
Process spawn + staged teardown (STORY-048-01). Metrics derivation (`modelUsage`/`context_pct`). Sessions / `--resume`. `thinking_delta`/`full` verbosity, `agent_*` subagent attribution. Tool-I/O size-cap + redaction. CI-fixture snapshotting harness beyond what these tests need.

### 1.4 Open Questions

- **Question:** Fix M0 verbosity at `tools`, or make it configurable now?
- **Recommended:** Fix at `tools` for the walking skeleton (text + tool I/O + result/error); configurable verbosity (`text`/`full`) is an EPIC-048 follow-up. No blocking ambiguity.
- **Human decision:** {default-accept}

### 1.5 Risks

- **Risk:** Closing the turn on the first `result` (the intuitive-but-wrong behaviour) breaks background tasks.
- **Mitigation:** EOF is the only terminus; a fixture replay of `02-background` asserts the turn stays open through the second `result`.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Stream normalizer + EOF turn lifecycle

  Scenario: Normalize a turn to EOF
    Given the daemon reads a claude stream-json turn to stdout EOF
    When it normalizes the records
    Then it emits the mapped events plus a final stream_end and turn_end(T)
    And it never forwards raw stream-json

  Scenario: Multiple results in one turn (background task)
    Given a stream that emits two result events before EOF (capture 02-background)
    When the runner processes it
    Then it does not close the turn on the first result
    And it closes only at stdout EOF

  Scenario: Signature delta is skipped
    Given a content_block_delta of type signature_delta
    When it is normalized
    Then no event is emitted for it

  Scenario: Unmapped record type is logged, not forwarded
    Given a record type not in the allowlist
    When it is encountered
    Then it is logged on the drift channel and no raw record is forwarded

  Scenario: Spawn failure is a fatal error, not a hang
    Given the backend fails to spawn (no parseable stream)
    When the runner waits for output
    Then it emits a distinct fatal error and does not hang waiting for EOF

  Scenario: Text is rendered from text_delta only
    Given a turn with both text_delta frames and an assembled assistant message
    When events are emitted
    Then visible text comes only from text_delta (no double-count)

  Scenario: A same-session second system/init is a continuation
    Given a turn already started by a system/init
    When a second system/init arrives in the same session before EOF
    Then it is treated as a continuation, not a new turn_start

  Scenario: In-band is_error is a recoverable turn_result
    Given a result record with is_error true
    When it is normalized
    Then it produces a turn_result flagged as error (not the fatal spawn-failure error)
    And the turn still closes only at stdout EOF

  Scenario: tool_use and tool_result are accumulated and paired
    Given a tool_use whose input arrives as input_json_delta fragments
    And a later user record keyed by the same tool_use_id
    When the runner normalizes the turn
    Then it emits one tool_use with the fully accumulated input (PascalCase name)
    And one tool_result per block (is_error null = success)
```

### 2.2 Verification Steps (Manual)
- [ ] Replay `connector/harness/spike/captures-2.1.162/02-background.ndjson` → two `turn_result`s, turn closes at EOF.
- [ ] Replay `connector/harness/spike/captures-2.1.162/10-tooluse.ndjson` → `tool_use` with accumulated input + `tool_result`.
- [ ] Inject an unknown record type → drift log fires, nothing raw forwarded.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Record→event normalizer (new) | `connector/daemon/src/normalize.ts` |
| EOF-driven turn lifecycle (new) | `connector/daemon/src/turn-runner.ts` |
| Normalizer tests (new) | `connector/daemon/test/normalize.node.test.ts` |
| Daemon entry wiring (edit) | `connector/daemon/src/index.ts` |

### 3.2 Technical Logic
`normalize.ts` is a pure function over parsed `stream-json` records → zero-or-one event (allowlist; `signature_delta` returns nothing; unknown types call the drift logger). `turn-runner.ts` consumes the `ChildHandle.stdout` from STORY-048-01's Backend, line-parses JSON records, feeds `normalize`, stamps a monotonic `seq`, and runs the state machine: open on first `system/init`, treat further `system/init` as continuation, keep reading past every `result`, and emit `stream_end` + `turn_end` only at stdout EOF. The out-of-band spawn-failure path (handle errors / immediate close with no records) emits a fatal `error`. `index.ts` is edited to route prompts through `turn-runner` instead of STORY-048-01's raw-forward stub (the only file shared with 048-01, which merges first). **Fixtures are re-captured on the installed `claude` 2.1.162** into `connector/harness/spike/captures-2.1.162/` (the repo ships only `00-baseline.ndjson` today); the prior-effort 2.1.161 captures at the external `/Users/ssuladze/Documents/Dev/connector/harness/spike/captures/` are the expected-shape reference, not the test inputs.

### 3.3 API Contract (if applicable)

| Surface | Shape |
|---|---|
| `normalize(record)` | `→ Event | null` (null = skipped, e.g. signature_delta / unmapped→drift) |
| Event payload set | `turn_start, text_delta, tool_use, tool_result, turn_result, error, stream_end` (rides inside the envelope `payload`) |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 9 | normalize-to-EOF, two-results-not-terminal, skip-signature_delta, unmapped→drift, spawn-failure-fatal, text_delta-only, continuation-init, in-band-error-recoverable, tool_use/tool_result-accumulation |
| E2E / acceptance tests | 0 | E2E is STORY-046-04 |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] No raw `stream-json` is ever forwarded (allowlist enforced; test).
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `connector/docs/event-contract.md` §v0.1 event set / §Design principles + `connector/docs/spike-findings-claude-2.1.161.md` — the literal mapping rules and the EOF/multi-result/`is_error` findings this story implements.
- **Surface:** `connector/harness/spike/captures-2.1.162/00-baseline.ndjson` — the only fixture currently in the connector repo; `02-background`/`10-tooluse` are re-captured here by this story (§1.2). The prior-effort 2.1.161 set at the external `/Users/ssuladze/Documents/Dev/connector/harness/spike/captures/` is the expected-shape reference.
- **Coverage of this requirement:** partial — the mapping rules + reference captures are reusable inputs (~40%); the normalizer + lifecycle code (and the re-captured 2.1.162 fixtures) are net-new.

## Why not simpler?

- **Smallest existing surface that could carry this:** none — there is no existing `stream-json` normalizer; the mapping rules live only in the design doc.
- **Why isn't extension / parameterization / config sufficient?** The multi-result EOF lifecycle and the allowlist mapping are bespoke logic the spike proved subtle (first-`result`-is-not-terminal, `text_delta`-only rendering); there is nothing to parameterize.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific file paths traceable to EPIC-048 `<target_files>`.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered.
