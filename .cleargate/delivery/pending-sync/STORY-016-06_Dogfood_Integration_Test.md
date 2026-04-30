---
story_id: STORY-016-06
parent_epic_ref: EPIC-016
parent_cleargate_id: "EPIC-016"
status: Draft
approved: true
approved_at: 2026-04-30T00:00:00Z
approved_by: sandrinio
ambiguity: 🟢 Low
context_source: "EPIC-016_Upgrade_UX.md §5 Scenario 6 (closing assertion: doctor --check-scaffold reports clean for all tiered files). Depends on STORY-016-05 init --from-source."
actor: CI / framework maintainer running regression
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
created_at: 2026-04-28T00:00:00Z
updated_at: 2026-04-28T00:00:00Z
created_at_version: cleargate@0.8.2
updated_at_version: cleargate@0.8.2
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-28T14:02:31Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-016-06
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-28T14:02:31Z
  sessions: []
---

# STORY-016-06: E2E Integration Test — Dogfood Install → doctor Clean
**Complexity:** L2 — single-test E2E exercising init → doctor → upgrade dry-run end-to-end against the meta-repo's own scaffold.

## 1. The Spec (The Contract)

### 1.1 User Story
As CI (and a framework maintainer pre-release), I want a single end-to-end test that installs the scaffold via `cleargate init --from-source`, runs `cleargate doctor --check-scaffold` over the result, and asserts a clean report, so that every release is exercised through the same install path downstream users hit.

### 1.2 Detailed Requirements
- New test file `cleargate-cli/test/e2e/dogfood-install.test.ts` (or `.spec.ts`, matching repo convention).
- Test orchestrates:
  1. Create a fresh `os.tmpdir()` directory.
  2. Spawn `cleargate init --from-source <repo-root>/cleargate-planning --non-interactive` (with whatever non-interactive flag/env exists; if none, supply expected stdin lines).
  3. Spawn `cleargate doctor --check-scaffold` in that directory; assert stdout contains a "clean" marker and exit code 0.
  4. Spawn `cleargate upgrade --dry-run` in that directory; assert it completes with exit code 0 and prints the "no upgrade needed" path (versions match).
- Test cleans up the tmpdir on teardown (success or failure).
- Runs in the existing test runner (Vitest per repo convention) — added to the default `npm test` invocation.
- CI-friendly: no network calls (registry-check stubbed via `CLEARGATE_NO_UPDATE_CHECK=1` in the test env); runtime budget ≤ 30 seconds.

### 1.3 Out of Scope
- Re-testing init's prompt flow (covered by STORY-016-05's unit tests).
- Re-testing CHANGELOG slicing (covered by STORY-016-04's unit tests).
- Multi-version upgrade simulation (would require pre-built fixture scaffolds; defer).
- Running this test against the published npm package — meta-repo path only.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Dogfood install end-to-end

  Scenario: Install + doctor + upgrade-dry-run all clean
    Given a fresh tmpdir
    And the meta-repo's cleargate-planning/ exists
    When `cleargate init --from-source <repo>/cleargate-planning` runs
    And then `cleargate doctor --check-scaffold` runs in tmpdir
    And then `cleargate upgrade --dry-run` runs in tmpdir
    Then init exits 0
    And doctor exits 0 with stdout containing the clean marker
    And upgrade --dry-run exits 0

  Scenario: Test cleans up on failure
    Given a fresh tmpdir
    And the test fails at the doctor step (simulated)
    When the test teardown runs
    Then the tmpdir is removed
```

### 2.2 Verification Steps (Manual)
- [ ] `npm test -- dogfood-install` — passes locally.
- [ ] Confirm tmpdir is gone after a forced failure (`set TEST_FORCE_FAIL=1`).

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/test/e2e/dogfood-install.test.ts` |
| Related Files | `cleargate-cli/src/commands/init.ts` (consumed via spawn), `cleargate-cli/src/commands/doctor.ts` (consumed via spawn) |
| New Files Needed | Yes — the E2E test file (and possibly `test/e2e/` directory if it doesn't exist). |

### 3.2 Technical Logic
- Use Node's `child_process.spawnSync` with the locally built CLI entry (`dist/cli.js` per the project's existing test pattern — confirm by reading the existing test setup).
- Set `env: { ...process.env, CLEARGATE_NO_UPDATE_CHECK: '1' }` to suppress STORY-016-01's network call.
- Tmpdir lifecycle uses `fs.mkdtempSync(path.join(os.tmpdir(), 'cleargate-dogfood-'))` and a `try/finally` removing the dir.
- "Clean marker" for doctor stdout: re-use whatever sentinel `cleargate doctor --check-scaffold` already prints on success (read doctor.ts to confirm; expected to be a single line like `cleargate doctor: scaffold clean`).

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 0 | This story IS the test. |
| E2E / acceptance tests | 1 | The dogfood-install.test.ts itself. |

### 4.2 Definition of Done (The Gate)
- [ ] Test passes locally and in CI.
- [ ] Test cleans up tmpdir on success and failure.
- [ ] Test runtime ≤ 30 seconds.
- [ ] No network calls (asserted by env var).
- [ ] Architect Review passed.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity (Ready for Execution)**

- [x] Gherkin covers §1.2.
- [x] Files declared.
- [x] No TBDs.
- [x] Lane = standard. E2E shell-out + tmpdir lifecycle has subtle failure modes (path resolution, CI permissions); standard lane gives QA a chance to catch them.
