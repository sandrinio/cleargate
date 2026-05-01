---
story_id: STORY-016-02
parent_epic_ref: EPIC-016
parent_cleargate_id: "EPIC-016"
status: Done
approved: true
approved_at: 2026-04-30T00:00:00Z
approved_by: sandrinio
ambiguity: 🟢 Low
context_source: EPIC-016_Upgrade_UX.md §5 Scenario 1+2+3+4 (registry-check surfaces / opt-out / offline silent / 24h throttle). Depends on STORY-016-01 lib.
actor: ClearGate user starting a Claude Code session
complexity_label: L1
parallel_eligible: n
expected_bounce_exposure: low
lane: standard
created_at: 2026-04-28T00:00:00Z
updated_at: 2026-04-28T00:00:00Z
created_at_version: cleargate@0.8.2
updated_at_version: cleargate@0.8.2
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-28T14:00:28Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-016-02
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-28T14:00:27Z
  sessions: []
---

# STORY-016-02: `cleargate doctor --session-start` Surfaces Update Notifier
**Complexity:** L1 — single-file integration of STORY-016-01's library; one new line on stdout.

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate user opening a Claude Code session, I want to see a one-line "cleargate X.Y.Z available — run `cleargate upgrade`" notice when the installed CLI is behind the latest published version, so that I learn about releases without having to remember to run `npm outdated`.

### 1.2 Detailed Requirements
- `cleargate doctor --session-start` calls `checkLatestVersion()` from STORY-016-01 after the existing blocked-items summary completes.
- When `latest > installed`, print exactly one line to stdout:
  `cleargate <latest> available (current: <installed>) — run \`cleargate upgrade\` or see CHANGELOG`.
- When `latest <= installed`, `latest === null`, or `from === 'opt-out'`, print nothing.
- Notifier never affects the doctor exit code (preserves STORY-014-01's `0/1/2` semantics).
- Network/cache concerns are entirely delegated to the library — no env-var handling, no path logic in `doctor.ts`.

### 1.3 Out of Scope
- Wiring into other commands (`init`, `push`, etc.) — `doctor --session-start` is the single surface per EPIC-016 §6 Q1.
- Coloring / decorating the notice (plain text only; respects pipe-friendly output).
- Recommending a specific version policy (just "available" — user decides).

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: doctor session-start surfaces update notifier

  Scenario: Notifier prints when latest > installed
    Given installed version is "0.8.2"
    And checkLatestVersion returns { latest: "0.9.0", from: "network" }
    When `cleargate doctor --session-start` runs
    Then stdout contains "cleargate 0.9.0 available (current: 0.8.2)"

  Scenario: No notifier when up to date
    Given installed version is "0.9.0"
    And checkLatestVersion returns { latest: "0.9.0", from: "cache" }
    When `cleargate doctor --session-start` runs
    Then stdout does NOT contain "available"

  Scenario: No notifier on opt-out
    Given checkLatestVersion returns { latest: null, from: "opt-out" }
    When `cleargate doctor --session-start` runs
    Then stdout does NOT contain "available"

  Scenario: Notifier does not change exit code
    Given there are 0 blocked items
    And checkLatestVersion returns { latest: "0.9.0", from: "network" }
    When `cleargate doctor --session-start` runs
    Then the exit code is 0
```

### 2.2 Verification Steps (Manual)
- [ ] Pin a fake older version in `package.json`; run `cleargate doctor --session-start`; observe the line.
- [ ] Run with `CLEARGATE_NO_UPDATE_CHECK=1`; observe silence.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/commands/doctor.ts` |
| Related Files | `cleargate-cli/src/lib/registry-check.ts` (consumed), `cleargate-cli/test/commands/doctor-notifier.test.ts` (new) |
| New Files Needed | Yes — the test file. |

### 3.2 Technical Logic
- Append a small async block at the tail of `runSessionStart()` (or its equivalent dispatch in `doctor.ts`).
- Read installed version from `package.json` (already imported elsewhere in the codebase — reuse).
- Use `semver.gt(latest, installed)` (semver is already a transitive dep) to decide whether to print.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | One per Gherkin scenario; mock `checkLatestVersion`. |
| E2E / acceptance tests | 0 | Library-edge integration; no full E2E needed. |

### 4.2 Definition of Done (The Gate)
- [ ] All 4 scenarios covered.
- [ ] doctor exit code semantics from STORY-014-01 unchanged (proven by Scenario 4).
- [ ] `npm run typecheck && npm test -- doctor` green.
- [ ] Architect Review passed.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity (Ready for Execution)**

- [x] All scenarios cover §1.2.
- [x] File path declared.
- [x] No TBDs.
- [x] Lane = standard. Depends on 016-01 contract; if that lib's API shifts, 016-02 bounces. Standard is the safe default per protocol §9.
