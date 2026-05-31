---
story_id: STORY-043-01
parent_epic_ref: EPIC-043
parent_cleargate_id: EPIC-043
sprint_cleargate_id: SPRINT-33
carry_over: false
area: hooks,sprint-execution,gates
status: Draft
approved: true
ambiguity: 🟢 Low
complexity_label: L2
parallel_eligible: n
context_source: |
  EPIC-043 WS8(a). The flashcard sentinel hook reads the retired state.json
  .execution_mode (CR-070/STORY-070-01 stripped it), so EXEC_MODE always defaults
  to "v1" and the gate only WARNS — it never exits non-zero. Prior work:
  STORY-014-03 built the gate; BUG-034 restored its exception-safety. This story
  makes it fail closed. Duplicate check: cleargate-wiki-query → none found for
  "flashcard sentinel fail closed"; grep of archive + FLASHCARD surfaced only the
  STORY-014-03 origin and BUG-034. Sequences after CR-070.
created_at: 2026-06-01T12:00:00Z
updated_at: 2026-05-31T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-31T21:39:17Z
source: local-authored
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-043-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-31T21:39:17Z
  sessions: []
---

# STORY-043-01: Make the Flashcard Sentinel Gate Fail Closed

## 1. The Spec (The Contract)

### 1.1 User Story

As the sprint-execution orchestrator, I want the flashcard sentinel hook to actually block the next agent dispatch when unprocessed flagged flashcards exist, so the WS8(a) "gate that does not gate" is repaired and the flashcard-processing discipline is enforced again instead of merely warned about.

### 1.2 Detailed Requirements

- **Drop the retired `execution_mode` read.** `.claude/hooks/pending-task-sentinel.sh` currently reads `state.json .execution_mode` (lines ~54-58) and defaults `EXEC_MODE="v1"`. Since CR-070/STORY-070-01 stripped `execution_mode` from `state.json`, that read now *always* yields the v1 default, so the gate is permanently inert. Remove the `EXEC_MODE` variable and its `jq` read entirely.
- **Always enforce (fail closed).** When `${#UNPROCESSED_CARDS[@]} -gt 0`, the hook MUST print the `FLASHCARD GATE BLOCKED` diagnostic to real stderr and `exit 1` to block the Task spawn. The previous `if [[ "${EXEC_MODE}" == "v2" ]]` branch that gated blocking is removed; blocking is now the unconditional default path.
- **`CLEARGATE_ADVISORY=1` is the SOLE downgrade.** When the environment variable `CLEARGATE_ADVISORY` equals `1`, the hook prints the existing `FLASHCARD GATE WARNING` diagnostic and continues (no `exit 1`). This replaces the old v1-advisory branch. No other condition may downgrade enforcement.
- **Preserve the existing log/stderr content.** Keep the per-card `card:` and `mark processed: touch …/.processed-<hash>` hint lines, the `[timestamp] flashcard-gate: N unprocessed card(s) found` log line (drop the now-meaningless `(mode=%s)` suffix), and the existing `SKIP_FLASHCARD_GATE=1` early bypass and `_off-sprint` short-circuit.
- **Sequence after CR-070.** This story must land after CR-070's `execution_mode` strip merges; it must not re-edit the same `state.schema.json` / inert-mode lines CR-070 owns. It only removes the *consumer* read in this one hook.
- **Mirror all three copies.** Apply the identical change to canonical (`cleargate-planning/.claude/hooks/pending-task-sentinel.sh`), the npm payload (`cleargate-cli/templates/cleargate-planning/.claude/hooks/pending-task-sentinel.sh`), and the live instance (`.claude/hooks/pending-task-sentinel.sh`). The three files are byte-identical today and must remain so.
- **Update the test harness** `.cleargate/scripts/test/test_flashcard_enforcement.sh` so its scenarios assert the new fail-closed semantics (block by default; warn-and-continue only under `CLEARGATE_ADVISORY=1`) rather than the retired v1/v2 `execution_mode` matrix.

### 1.3 Out of Scope

- The `execution_mode` strip itself (CR-070 / STORY-070-01) — this story consumes the post-strip world, it does not perform the strip.
- The sentinel/token-ledger attribution logic (RUN_ID keying, turn_index, parallel-wave fallback — EPIC-033). The block below the flashcard gate (`{ … } 2>> "${HOOK_LOG}"`) is untouched.
- The other WS8 gate repairs (b)-(f): CR/Bug `context_source`, Bug repro steps, `hotfix` type registration, `close_sprint.mjs` fail-open, `reporter.md` v2 re-sync. Those are sibling stories.
- The `flashcards_flagged` parsing loop (YAML + markdown block formats) — left exactly as-is; only the enforcement decision changes.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Flashcard sentinel gate fails closed

  Scenario: Unprocessed flagged card blocks the next Task spawn
    Given an active sprint whose state.json no longer carries execution_mode
    And a STORY-*-dev.md report listing one unprocessed flagged flashcard
    When the orchestrator dispatches a Task and the pending-task-sentinel hook runs
    Then the hook prints "FLASHCARD GATE BLOCKED" to stderr naming the card and its .processed-<hash> hint
    And the hook exits 1 so the Task spawn is blocked

  Scenario: Processed card lets the Task spawn proceed
    Given an active sprint with one flagged flashcard whose .processed-<hash> marker exists
    When the pending-task-sentinel hook runs
    Then no gate diagnostic is emitted
    And the hook exits 0 and writes its dispatch sentinel file

  Scenario: CLEARGATE_ADVISORY downgrades the block to a warning
    Given an active sprint with one unprocessed flagged flashcard
    And the environment variable CLEARGATE_ADVISORY is set to 1
    When the pending-task-sentinel hook runs
    Then the hook prints "FLASHCARD GATE WARNING" to stderr naming the card
    And the hook exits 0 (advisory, not blocked)

  Scenario: Retired execution_mode no longer downgrades enforcement Error path
    Given a stale state.json that still contains "execution_mode":"v1"
    And one unprocessed flagged flashcard
    When the pending-task-sentinel hook runs without CLEARGATE_ADVISORY
    Then the presence of execution_mode is ignored entirely
    And the hook still exits 1 (blocked) — no v1 advisory Error path remains
```

### 2.2 Verification Steps (Manual)

- [ ] Run `bash .cleargate/scripts/test/test_flashcard_enforcement.sh` and confirm it prints `Results: N passed, 0 failed` and exits 0.
- [ ] Confirm the three hook copies are byte-identical: `diff .claude/hooks/pending-task-sentinel.sh cleargate-planning/.claude/hooks/pending-task-sentinel.sh` and the same against `cleargate-cli/templates/cleargate-planning/.claude/hooks/pending-task-sentinel.sh` both print nothing.
- [ ] Grep the canonical hook for `execution_mode` and `EXEC_MODE` — confirm zero matches remain.
- [ ] Pipe a `Task` dispatch JSON with one unprocessed card into the hook with no env override; confirm `exit 1` and `FLASHCARD GATE BLOCKED` on stderr.
- [ ] Repeat the previous step with `CLEARGATE_ADVISORY=1`; confirm `exit 0` and `FLASHCARD GATE WARNING` on stderr.

## 3. The Implementation Guide

### 3.1 Context & Files

- `.claude/hooks/pending-task-sentinel.sh` — live instance; the file Claude Code actually executes in this repo. Edit lines ~53-159 (the flashcard-gate block): remove the `EXEC_MODE` read at ~54-59 and the `v2`/`v1` branch at ~136-157, replacing with always-block / `CLEARGATE_ADVISORY=1`-warns logic.
- `cleargate-planning/.claude/hooks/pending-task-sentinel.sh` — canonical (tracked) source of truth; apply the identical edit.
- `cleargate-cli/templates/cleargate-planning/.claude/hooks/pending-task-sentinel.sh` — npm payload mirror; normally regenerated by `npm run prebuild`, but apply the identical edit directly to keep all three byte-identical within this story's diff.
- `.cleargate/scripts/test/test_flashcard_enforcement.sh` — the test harness; rework Scenario 1 (block by default, no `execution_mode`), Scenario 3 (advisory via `CLEARGATE_ADVISORY=1` instead of v1 state), and `mk_sprint` so it no longer writes `execution_mode` into the synthetic `state.json`.

### 3.2 Technical Logic

In each hook copy, inside the `if [[ "${TOOL_NAME_EARLY}" == "Task" && … ]]` block:

1. Delete the `EXEC_MODE="v1"` initialization and the `jq -r '.execution_mode // "v1"'` read (lines ~54-59).
2. In the `if [[ "${#UNPROCESSED_CARDS[@]}" -gt 0 ]]` body, drop the `(mode=%s)` argument from the log line.
3. Replace the `if [[ "${EXEC_MODE}" == "v2" ]] … else …` construct with: `if [[ "${CLEARGATE_ADVISORY:-0}" == "1" ]]` → print the `WARNING` lines and fall through (continue to sentinel write); `else` → print the `BLOCKED` lines and `exit 1`. The per-card `card:` / `mark processed:` loop is shared by both branches (factor or duplicate; behavior identical to today's two loops).

The bypass precedence is therefore: `SKIP_FLASHCARD_GATE=1` (skip entirely, unchanged) > `_off-sprint` (skip, unchanged) > `CLEARGATE_ADVISORY=1` (warn, continue) > default (block, exit 1).

In `test_flashcard_enforcement.sh`: `mk_sprint` drops the `execution_mode` field from the emitted `state.json`. `invoke_hook` gains an optional advisory flag (or a sibling `invoke_hook_advisory` that exports `CLEARGATE_ADVISORY=1`). Scenario 1 asserts `exit 1` + `BLOCKED` with a plain (no-`execution_mode`) state; Scenario 3 asserts `exit 0` + `WARNING` under `CLEARGATE_ADVISORY=1`; Scenarios 2 and 4 are unchanged in intent (processed marker → proceed; empty list → no-op).

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test | Type | Asserts |
|---|---|---|
| `test_flashcard_enforcement.sh` S1 (block by default) | shell integration | unprocessed card → `exit 1` + `FLASHCARD GATE BLOCKED` on stderr, no `execution_mode` in state |
| `test_flashcard_enforcement.sh` S2 (processed marker) | shell integration | `.processed-<hash>` present → `exit 0` + sentinel written |
| `test_flashcard_enforcement.sh` S3 (advisory) | shell integration | `CLEARGATE_ADVISORY=1` + unprocessed card → `exit 0` + `FLASHCARD GATE WARNING` |
| `test_flashcard_enforcement.sh` S4 (empty list) | shell integration | `flashcards_flagged: []` → `exit 0`, no gate output |
| three-copy byte-diff | manual / CI grep | live == canonical == payload, zero `execution_mode` matches |

### 4.2 Definition of Done

- [ ] `EXEC_MODE` / `.execution_mode` read removed from all three hook copies.
- [ ] Default path blocks (`exit 1`) when unprocessed flagged cards exist; `CLEARGATE_ADVISORY=1` is the only downgrade.
- [ ] `SKIP_FLASHCARD_GATE=1` and `_off-sprint` early skips preserved unchanged.
- [ ] `test_flashcard_enforcement.sh` updated to the fail-closed semantics and prints `0 failed`.
- [ ] Live, canonical, and payload hooks are byte-identical (`diff` clean).
- [ ] Story sequenced after CR-070 merge; no `state.schema.json` edit in this diff.
- [ ] One commit per repo touched: outer repo (live + canonical + test) and `cleargate-cli` (payload).

## Existing Surfaces

> L1 reuse audit. All paths grep/read-verified 2026-06-01.

- **Surface:** `.claude/hooks/pending-task-sentinel.sh:54-59` — the `EXEC_MODE="v1"` init + `jq -r '.execution_mode // "v1"'` read; now always returns the v1 default because CR-070 stripped the field. This is the inert read this story removes.
- **Surface:** `.claude/hooks/pending-task-sentinel.sh:133-158` — the `if [[ "${EXEC_MODE}" == "v2" ]] … else (v1 advisory) …` branch. The `else` (advisory) arm is the only path ever taken today, so the gate never blocks. This story makes the block the default and the warn arm conditional on `CLEARGATE_ADVISORY=1`.
- **Surface:** `cleargate-planning/.claude/hooks/pending-task-sentinel.sh` and `cleargate-cli/templates/cleargate-planning/.claude/hooks/pending-task-sentinel.sh` — byte-identical mirrors of the live hook (verified via `diff -q` 2026-06-01); both receive the identical edit.
- **Surface:** `.cleargate/scripts/test/test_flashcard_enforcement.sh:75-84,128-138,143-197` — `mk_sprint` writes `execution_mode` into the synthetic `state.json`, and Scenarios 1/3 are keyed on `v2`/`v1`. These are rewritten to the fail-closed / advisory matrix.
- **Reuse note:** no net-new abstraction — this is removal of a dead read plus inversion of an existing two-arm branch; the flashcard-parsing loop and all stderr/log formatting are reused verbatim.

## Why not simpler?

- **Smallest existing surface:** the `EXEC_MODE` read and the two-arm `v2`/`v1` branch already inside `pending-task-sentinel.sh` (lines 54-59 and 133-158). The fix lives entirely within that existing block — no new file, function, or config key.
- **Why isn't extension/config sufficient?** It is, in the deletion direction — and that is the point. The bug is an *extra* condition (the `execution_mode` gate) sitting in front of an already-built block. Removing that condition and keeping the single `CLEARGATE_ADVISORY=1` escape hatch is strictly simpler than any added parameterization. A new env flag or config surface would re-introduce exactly the kind of dead toggle this WS8(a) repair exists to delete.

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟢 Low**

*Each box evaluated against its literal text.*

- [x] Parent epic (EPIC-043) is approved (`approved: true`) — the parent-approved predicate is satisfied.
- [x] §3.1 cites only this story's real, grep-verified file paths.
- [x] §2.1 has a `Feature:` and ≥2 `Scenario:` blocks, including a named Error path scenario.
- [x] §Existing Surfaces cites at least one source path with file:line.
- [x] §Why not simpler? answers both sub-bullets.
- [x] 0 TBDs remain; all requirements are concrete and verifiable.
