---
story_id: STORY-014-04
parent_epic_ref: EPIC-014
parent_cleargate_id: EPIC-014
sprint_cleargate_id: SPRINT-05
status: Completed
ambiguity: 🟢 Low
context_source: EPIC-014 §2 IN-SCOPE B4 + SPRINT-09 close retrospective (24 failures rode 3 sprints before fix)
actor: Developer Agent
complexity_label: L2
milestone: M1
parallel_eligible: y
expected_bounce_exposure: low
approved: true
approved_at: 2026-04-21T12:00:00Z
approved_by: sandro
stamp_error: no ledger rows for work_item_id STORY-014-04
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-21T12:42:36Z
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-30T11:01:46Z
---

# STORY-014-04: Pre-existing test-failure ratchet
**Complexity:** L2 — new .mjs script + pre-commit hook wire + baseline JSON snapshot.

## 1. The Spec

### 1.1 User Story
As an orchestrator, I want a pre-commit gate that refuses commits when the passing-test count regresses below a recorded baseline, so pre-existing test failures don't accumulate silently (the 24-failure drift across SPRINT-05→08 that surfaced during SPRINT-09 close).

### 1.2 Detailed Requirements
- New script `.cleargate/scripts/test_ratchet.mjs` — three modes:
  - `update-baseline` — run the current test suite (`npm test --workspace=cleargate-cli`), parse vitest JSON output, write `{ total, passed, failed, skipped, updated_at }` to `test-baseline.json` at repo root.
  - `check` (default) — re-run suite, compare passed-count to baseline. Exit non-zero if current < baseline. Print a delta summary.
  - `list-regressions` — diff current failing-tests list against baseline's failing list, emit newly-failing tests.
- Baseline file committed to repo root (not gitignored). Regenerate via `update-baseline` only when explicitly run; do NOT auto-update on ratchet check.
- Pre-commit hook wrapper: `.claude/hooks/pre-commit-test-ratchet.sh` — invokes script with `check` mode. Bypass via `SKIP_TEST_RATCHET=1` env (documented, discouraged).
- Scope: cleargate-cli test suite only in this story (largest surface). MCP and admin follow-up in a separate story if signal is good.
- Three-surface landing: script + hook + mirror.

### 1.3 Out of Scope
- Running tests on every commit (too slow) — the hook runs, but fast-fails via a 60s timeout. Alternative: only gate on `cleargate-cli` and rely on CI for others.
- Per-file ratchet (we're ratcheting pass-count, not individual test names).
- Auto-update on successful runs — dangerous. Explicit `update-baseline` only.

## 2. The Truth

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Test-failure ratchet

  Scenario: Commit allowed when pass-count matches or exceeds baseline
    Given test-baseline.json records passed=800
    And current suite reports passed=829
    When the ratchet check runs
    Then exit code is 0
    And the delta summary shows "+29 tests passing"

  Scenario: Commit blocked on regression
    Given test-baseline.json records passed=829
    And current suite reports passed=820
    When the ratchet check runs
    Then exit code is non-zero
    And stderr says "regression: -9 tests"

  Scenario: update-baseline mode overwrites
    Given an existing test-baseline.json with passed=800
    When `node .cleargate/scripts/test_ratchet.mjs update-baseline` is run
    Then test-baseline.json is overwritten with the current suite's count

  Scenario: list-regressions emits newly failing tests
    Given baseline's failing set is {A, B}
    And current failing set is {A, B, C, D}
    When I run `test_ratchet.mjs list-regressions`
    Then stdout lists C and D only (not A, B)

  Scenario: SKIP_TEST_RATCHET bypass
    Given SKIP_TEST_RATCHET=1 env is set
    When the pre-commit hook runs
    Then it prints a bypass warning and exits 0 without running tests
```

### 2.2 Verification Steps (Manual)
- [ ] Run each mode locally.
- [ ] Verify `test-baseline.json` format is stable across runs (no drift in JSON key order).
- [ ] `diff` script + hook mirrors.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| New script | `.cleargate/scripts/test_ratchet.mjs` |
| New hook | `.claude/hooks/pre-commit-test-ratchet.sh` (gitignored live; commit scaffold mirror) |
| New baseline | `test-baseline.json` at repo root |
| Mirrors | `cleargate-planning/` for script + hook |

### 3.2 Technical Logic
Spawn `npx vitest run --reporter=json` (vitest 2.x supports), parse stdout, extract `numPassedTests` / `numFailedTests`. Compare to baseline. Atomic write via M1 tmp+rename. Fast timeout: 120s max (long enough for current cleargate-cli suite ~40s, fails visibly on runaway).

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Gherkin bash | 5 | All §2.1 |
| Three-surface diff | 2 | script + hook |

### 4.2 Definition of Done
- [ ] All 5 scenarios pass.
- [ ] Initial baseline committed at 829 passed (current state of cleargate-cli).
- [ ] Pre-commit hook fires on ClearGate repo commits.
- [ ] Commit: `feat(EPIC-014): STORY-014-04 test-failure ratchet`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low**
