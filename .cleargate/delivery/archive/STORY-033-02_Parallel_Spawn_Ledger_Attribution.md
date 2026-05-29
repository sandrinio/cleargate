---
story_id: STORY-033-02
parent_epic_ref: EPIC-033
parent_cleargate_id: "EPIC-033"
sprint_cleargate_id: SPRINT-32
carry_over: false
status: Completed
approved: true
ambiguity: 🟡 Medium
context_source: |
  EPIC-033 decomposition at SPRINT-32 kickoff 2026-05-29; the EPIC-033 §6 AI
  Interrogation answers (all 4 resolved 2026-05-29) and the STORY-033-01
  Workflow Capability Spike result (.cleargate/sprint-runs/_off-sprint/STORY-033-01-spike-result.md,
  Verdict GO) are the binding inputs. The spike settled the ledger-writer choice:
  attribution is a BARRIER-WRITER keyed by RUN_ID, written from each segment's
  returned verdict.tokens; the SubagentStop/auto-marker path is abandoned under
  workflows because both fail (Q1/Q2). This story implements that decision.
actor: ClearGate Orchestrator
complexity_label: L3
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
area: sprint-execution,orchestration,workflows
created_at: 2026-05-29T00:00:00Z
updated_at: 2026-05-29T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-29T08:04:36Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-033-02-Parallel-Spawn-Ledger-Attribution
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-29T08:04:36Z
  sessions: []
---

# STORY-033-02: Parallel-Spawn Ledger Attribution (RUN_ID barrier-writer)
**Complexity:** L3 — Cross-cutting fix across two hooks + the dispatch-marker writer; corrects a live-confirmed mis-attribution race under sub-agent fan-out.

## 1. The Spec (The Contract)

> Prior work: [[EPIC-033]] + [[STORY-033-01]] (spike) — decomposition pre-authorized at epic level.

### 1.1 User Story
As a ClearGate Orchestrator, I want each parallel story segment's token cost written as exactly one ledger row keyed by a stable per-thunk RUN_ID, so that a concurrent wave reports deterministic per-story attribution instead of silently tagging every story's cost onto the prior ledger row.

### 1.2 Detailed Requirements
- The wave barrier writes **exactly one** ledger row per segment, sourced from that segment's returned `verdict.tokens` object (`{ input, output, cache_creation, cache_read, model }`), keyed by a stable per-thunk RUN_ID minted upstream by the launcher.
- Each barrier-written row preserves the existing ledger schema (`ts`, `sprint_id`, `story_id`, `work_item_id`, `agent_type`, `model`, `delta`, `session_total`) and adds a `run_id` field; the `delta` for a barrier row equals the segment's `verdict.tokens` (no cross-row subtraction).
- Re-key `.cleargate/sprint-runs/<id>/.session-totals.json` by RUN_ID (today it is keyed by `session_id`) so concurrent barrier writes for different segments never collide on one key, and no segment's delta is computed against another segment's baseline.
- `.claude/hooks/token-ledger.sh` becomes a **no-op** (clean `exit 0`, logged) when a RUN_ID-keyed barrier row already exists for that segment — so a late `SubagentStop` cannot append a second, mis-attributed row for a story the barrier already accounted for.
- `.cleargate/scripts/write_dispatch.sh` embeds the RUN_ID in the dispatch-marker JSON (`run_id` field) alongside the existing `work_item_id` / `agent_type` / `session_id`, so any marker-consuming code can key by `work_item_id + run_id`.
- `.claude/hooks/pending-task-sentinel.sh` keys its sentinel file by RUN_ID when present (`.pending-task-${RUN_ID}.json`), falling back to `TURN_INDEX` only when RUN_ID is absent (serial path) — applying the unapplied BUG-029 item-2.
- When a RUN_ID is absent (today's serial five-dispatch loop), every surface falls back to its current behavior with zero observable change (back-compat guarantee).
- A segment whose verdict carries no `tokens` object is recorded as `ESCALATED` by the barrier and **no ledger row is written** for it (fail-closed; never a garbage/zero row).

### 1.3 Out of Scope
- The `launch_wave.mjs` launcher, the `parallel()` barrier mechanics, and the schema-typed verdict definition itself — those are STORY-033-04. This story consumes the RUN_ID and `verdict.tokens` that STORY-033-04 produces, and defines the contract they must satisfy; it does not build the launcher.
- The Architect planning workflow / wave scheduling — STORY-033-03.
- Resurrecting `.claude/hooks/pre-tool-use-task.sh` (the auto dispatch-marker writer). The spike proved it never fires under workflows; that path is explicitly abandoned, not revived.
- Any `mcp/` or `admin/` source change — EPIC-033 is planning-layer only.
- Migrating already-written historical `.session-totals.json` keys — stale `session_id` keys age out naturally; no backfill.

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** Should the barrier-write be idempotent on RUN_ID (re-running the barrier for an already-written segment is a no-op) or append-and-dedupe-on-read?
- **Recommended:** Idempotent on RUN_ID — the barrier checks for an existing `run_id` row before writing and skips if present. This is also what makes `token-ledger.sh`'s no-op check (a RUN_ID-keyed row already exists) well-defined, and it survives `resumeFromRunId` replays (spike Q4: completed segments re-emit cached verdicts).
- **Human decision:** _(populated during Brief review)_

- **Question:** Where is the per-segment RUN_ID surfaced to `token-ledger.sh` so it can detect "barrier row already exists" — environment variable inherited from the orchestrator, or read back from the dispatch marker on disk?
- **Recommended:** Read back from the dispatch marker on disk (the marker now carries `run_id` per this story); the hook greps the ledger for a row matching `work_item_id + run_id` and exits 0 if found. This avoids depending on per-thunk env, which the spike (Q5) proved is not settable.
- **Human decision:** _(populated during Brief review)_

### 1.5 Risks

> Risks specific to this Story (cross-story risks belong in the milestone plan).

- **Risk:** A late `SubagentStop` fires AFTER the barrier already wrote the row, racing the no-op check and producing a duplicate row.
- **Mitigation:** The no-op check reads the ledger for an existing `run_id` row immediately before append; an atomic check-then-append (lock or `flock` on the ledger, matching the existing append discipline) closes the window. A duplicate is detectable in tests (Scenario: exactly one row per `(storyId, agent_type)`).

- **Risk:** The serial fallback regresses — keying by RUN_ID-when-present silently breaks today's serial loop where RUN_ID is unset.
- **Mitigation:** The back-compat Gherkin scenario asserts the serial path (no RUN_ID) produces byte-identical sentinel/ledger behavior; the fallback branch is explicit, not implicit.

- **Risk:** `.session-totals.json` re-key collides with the live SPRINT-32 file already keyed by `session_id`.
- **Mitigation:** New RUN_ID keys coexist with stale `session_id` keys in the same object (different namespaces); the delta model reads only the RUN_ID key for barrier writes. Stale keys age out, no migration.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Parallel-Spawn Ledger Attribution (RUN_ID barrier-writer)

  Scenario: Deterministic attribution under genuine concurrency
    Given a genuinely concurrent 2-agent wave for two distinct stories completes
    And each segment returned a verdict carrying a tokens object and a stable runId
    When the barrier writes the ledger
    Then .session-totals.json contains at least 2 distinct RUN_ID keys
    And token-ledger.jsonl has exactly one row per (storyId, agent_type)
    And no story's delta is computed against another story's baseline

  Scenario: token-ledger.sh is a no-op when a barrier row already exists
    Given the barrier has written a RUN_ID-keyed row for a segment
    When a late SubagentStop fires referencing that segment's work_item_id and run_id
    Then token-ledger.sh detects the existing run_id row
    And exits 0 without appending a second row
    And logs the skip to the hook log

  Scenario: dispatch marker carries the RUN_ID
    Given write_dispatch.sh runs with a RUN_ID in the environment
    When it writes the dispatch-marker JSON
    Then the marker contains a run_id field equal to that RUN_ID
    And it still contains work_item_id, agent_type, and session_id

  Scenario: sentinel is keyed by RUN_ID, not TURN_INDEX alone
    Given two concurrent Task dispatches share one orchestrator session and one TURN_INDEX
    And each carries a distinct RUN_ID
    When pending-task-sentinel.sh writes its sentinel files
    Then two distinct sentinel files exist keyed by their RUN_IDs
    And neither overwrites the other

  Scenario: segment verdict missing tokens records ESCALATED and writes no row
    Given a story segment returns a verdict with no tokens object
    When the barrier consolidates the wave
    Then it marks that segment ESCALATED
    And it writes no ledger row for that segment
    And the other segments' rows are written normally

  Scenario: serial fallback when RUN_ID is absent
    Given the orchestrator runs today's serial five-dispatch loop with no RUN_ID set
    When a story is dispatched and SubagentStop fires
    Then the sentinel falls back to keying by TURN_INDEX
    And token-ledger.sh appends a row exactly as it does today
    And no behavior changes from the pre-RUN_ID baseline
```

### 2.2 Verification Steps (Manual)
- [ ] Run a genuinely concurrent 2-agent dispatch and confirm `.session-totals.json` has ≥2 distinct RUN_ID keys.
- [ ] Confirm `token-ledger.jsonl` has exactly one row per `(storyId, agent_type)` after the wave, each carrying a `run_id` field.
- [ ] Inject a synthetic late `SubagentStop` for an already-written `run_id` and confirm `token-ledger.sh` appends nothing and logs the skip.
- [ ] Inspect a dispatch marker written via `write_dispatch.sh` and confirm the `run_id` field is present and correct.
- [ ] With two concurrent dispatches sharing one TURN_INDEX, confirm two distinct `.pending-task-${RUN_ID}.json` sentinel files exist.
- [ ] Run a serial (no-RUN_ID) dispatch and diff sentinel + ledger output against the pre-change baseline — confirm zero behavior change.
- [ ] Confirm a tokens-less verdict yields ESCALATED with no ledger row, while sibling GREEN segments still write their rows.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `.claude/hooks/token-ledger.sh` — add the RUN_ID-row-exists no-op guard before append (around the SubagentStop numerator at line 74) |
| Related File | `.cleargate/scripts/write_dispatch.sh` — embed `run_id` in the marker JSON (extend the writer near line 116) |
| Related File | `.claude/hooks/pending-task-sentinel.sh` — key the sentinel by RUN_ID when present, fall back to TURN_INDEX (line 186) |
| Reference | `.cleargate/sprint-runs/SPRINT-30/token-ledger.jsonl` — canonical ledger row schema the barrier row must match |
| Reference | `.cleargate/delivery/archive/BUG-029_Parallel_Dispatches_Serialize_Silently.md` — root cause + the unapplied item-2 (sentinel uniquify) this story applies |
| Reference | `.cleargate/sprint-runs/_off-sprint/STORY-033-01-spike-result.md` — spike decision #1 (barrier-writer; SubagentStop dead) |
| New Files Needed | No — all three code changes are modifications of existing surfaces. |
| Mirrors | every `.claude/**` edit mirrors to `cleargate-planning/.claude/**` + `npm run prebuild` (close-time barrier step, not a per-story blocker) |

### 3.2 Technical Logic
The barrier (owned by STORY-033-04's `launch_wave.mjs`) is the single writer of per-segment attribution. This story makes the three on-disk surfaces RUN_ID-aware so the barrier's writes are collision-free and a stray `SubagentStop` cannot double-count.

1. **`write_dispatch.sh`** — read `RUN_ID` from the environment (the launcher mints it per thunk). When set, add a `run_id` field to the `DISPATCH_JSON` object built around line 116, alongside the existing `work_item_id` / `agent_type` / `session_id`. When unset, omit the field (serial-path back-compat).
2. **`.session-totals.json` re-key** — the barrier writes the per-segment delta under the RUN_ID key instead of the `session_id` key. Because RUN_ID is unique per thunk, two concurrent barrier writes touch different keys and never collide, and each segment's delta is computed against its own RUN_ID baseline (zero baseline for a fresh segment) rather than the previous ledger row. Stale `session_id` keys remain in the object and age out.
3. **`token-ledger.sh` no-op guard** — near the SubagentStop numerator (line 74), after resolving `work_item_id` and reading `run_id` from the on-disk dispatch marker for that segment, grep the active sprint's `token-ledger.jsonl` for a row matching `work_item_id + run_id`. If found, log "barrier row already present — skip" and `exit 0` without appending. This neutralizes the live-confirmed race where every parallel `SubagentStop` mis-attributed to the prior row.
4. **`pending-task-sentinel.sh` RUN_ID key** — at line 186, set `SENTINEL_FILE="${SPRINT_DIR}/.pending-task-${RUN_ID}.json"` when `RUN_ID` is non-empty, else keep `.pending-task-${TURN_INDEX}.json`. This applies BUG-029 item-2: two concurrent Task dispatches sharing one session + one TURN_INDEX no longer overwrite each other's sentinel.
5. **Fail-closed on missing tokens** — the barrier (per the contract this story defines) treats a verdict with no `tokens` object as ESCALATED and writes no row; this is asserted in §2.1 and is the boundary the no-op guard and re-key both respect.

Note: every `.claude/**` edit above must be mirrored to `cleargate-planning/.claude/**` and re-built via `npm run prebuild`; this is a close-time barrier step per the dogfood split, not a per-story blocker.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit / hook tests | 4 | RUN_ID marker embed; sentinel RUN_ID keying + TURN_INDEX fallback; ledger no-op-when-row-exists; serial back-compat. |
| Integration / acceptance tests | 6 | 1 per Gherkin scenario in §2.1, including the missing-tokens ESCALATED edge case and the concurrent-attribution proof. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered, including the deterministic-attribution proof (≥2 distinct RUN_ID keys, exactly one row per `(storyId, agent_type)`, no cross-baseline delta) and the missing-tokens ESCALATED edge case.
- [ ] Serial fallback (no RUN_ID) verified byte-identical to the pre-change baseline.
- [ ] `.claude/**` edits mirrored to `cleargate-planning/.claude/**` and `npm run prebuild` run (close-time).
- [ ] Peer/Architect Review passed.

## Existing Surfaces

> L2/L3 reuse audit. These are the action="modify" targets and their real reference files, all confirmed on disk.

- **Surface:** `.claude/hooks/token-ledger.sh:74` — the SubagentStop numerator (`TRANSCRIPT_PATH` parse); the no-op guard is inserted on this path before the ledger append.
- **Surface:** `.cleargate/scripts/write_dispatch.sh:116` — the dispatch-marker writer (BUG-029 already uniquified the filename); extended here to embed `run_id` in the marker JSON.
- **Surface:** `.claude/hooks/pending-task-sentinel.sh:186` — the sentinel file name keyed by `TURN_INDEX` alone (`.pending-task-${TURN_INDEX}.json`); re-keyed by RUN_ID when present, applying BUG-029 item-2.
- **Surface:** `.cleargate/sprint-runs/SPRINT-30/token-ledger.jsonl:1` — the canonical ledger row schema (`ts`/`work_item_id`/`agent_type`/`delta`/`session_total`) the barrier row must extend with `run_id`.
- **Surface:** `.cleargate/delivery/archive/BUG-029_Parallel_Dispatches_Serialize_Silently.md` — documents the root cause and the 3-item fix; item-2 (sentinel uniquify) was never applied and is applied here.
- **Surface:** `.cleargate/sprint-runs/_off-sprint/STORY-033-01-spike-result.md` — spike decision #1 selects the barrier-writer and abandons the SubagentStop/auto-marker path; the binding input for this story's design.
- **Coverage of this requirement:** partial — the three on-disk surfaces all exist and are extended, but RUN_ID awareness is net-new logic on each (the marker has no `run_id` field today, the sentinel keys by TURN_INDEX, and the ledger has no barrier-row no-op guard).

## Why not simpler?

- **Smallest existing surface that could carry this:** the existing `token-ledger.sh` SubagentStop path plus the BUG-029 dispatch-marker uniquify. They already write ledger rows and already uniquify the marker filename — but the spike (decision #1) proved that under workflows `SubagentStop` reports the orchestrator's transcript and the auto-marker never fires, so the SubagentStop path cannot attribute per-agent no matter how it is tuned.
- **Why isn't extension / parameterization / config sufficient?** A config flag cannot fix a numerator that reads the wrong transcript. The attribution must move to the barrier and be written from each segment's returned `verdict.tokens`, which requires a stable per-thunk key (RUN_ID) threaded through three surfaces: the marker (so a key exists on disk), the `.session-totals.json` delta model (so concurrent writes don't collide on one `session_id`), and the sentinel (so two same-session/same-TURN_INDEX dispatches don't clobber each other — BUG-029 item-2). Each is structural, not a parameter; together they are the minimum change that makes deterministic per-story attribution possible under fan-out while leaving the serial loop byte-identical.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity** (spike-resolved barrier-writer; remaining open items are the two §1.4 mechanics questions — RUN_ID surfacing to the hook + barrier idempotency — recommended answers pending Brief ack)

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the parent epic / spike result.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path (all six confirmed on disk).
- [x] Why not simpler? has both sub-bullets answered (no "TBD" / no "{}").
- [ ] §1.4 Open Questions resolved (two mechanics questions: RUN_ID-to-hook surfacing + barrier idempotency) — recommended answers stand pending human ack in the Brief.
