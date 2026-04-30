---
story_id: STORY-015-04
parent_epic_ref: EPIC-015
parent_cleargate_id: "EPIC-015"
sprint_cleargate_id: "SPRINT-11"
status: Completed
ambiguity: 🟢 Low
context_source: EPIC-015_Wiki_Index_Hygiene_And_Scale.md
actor: Protocol + sprint-archive wrapper
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: med
created_at: 2026-04-24T00:00:00Z
updated_at: 2026-04-24T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-24T09:45:32Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-015-04
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-24T09:45:32Z
  sessions: []
---

# STORY-015-04: Abandoned Status + Sprint-Close Stamp
**Complexity:** L2 — protocol edit + modification to the sprint-archive wrapper.

**Depends on:** STORY-015-02 (audit command already uses `Abandoned` as a literal; this story retroactively blesses it in the protocol and ensures future sprint closes don't reintroduce drift).

## 1. The Spec (The Contract)

### 1.1 User Story
As the protocol maintainer, I want `Abandoned` to be a first-class status literal and sprint closes to automatically stamp `status: Completed` + `completed_at` on the sprint file, so that the audit-status drift we just fixed stays fixed when SPRINT-11, SPRINT-12, ... close.

### 1.2 Detailed Requirements
- Add `Abandoned` to the status vocabulary section of **both** protocol files:
  - `.cleargate/knowledge/cleargate-protocol.md` (live dogfood copy)
  - `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` (canonical scaffold copy)
- Definition: `Abandoned — work deliberately stopped without shipping. The artifact stays in archive/ for historical record. Not eligible for the Active index.`
- Update the sprint-archive wrapper (STORY-014-08's `cleargate sprint-archive` command — file `cleargate-cli/src/lib/sprint-archive.ts` or similar):
  - Before running `wiki build`, open the target sprint file's frontmatter.
  - Set `status: "Completed"` and `completed_at: <ISO timestamp>` if not already set.
  - If `wiki build` or `wiki lint` fails after the stamp, **revert** the frontmatter change and exit non-zero (atomicity).
- Sprint-archive aborts if the sprint branch is not yet merged into main (existing behavior; confirm).

### 1.3 Out of Scope
- Re-flowing all existing sprint files to add `completed_at` retroactively — STORY-015-02 `--fix` already stamps `status`, and retroactive timestamps would be inaccurate anyway.
- Adding `replaced_by:` frontmatter pointer (deferred to a CR if the need surfaces).
- UI surface for the Abandoned status.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Abandoned Status + Sprint-Close Stamp

  Scenario: Protocol lists Abandoned
    Given I grep for "Abandoned" in `.cleargate/knowledge/cleargate-protocol.md`
    Then the status vocabulary section contains "Abandoned — work deliberately stopped without shipping"
    And the same section exists in `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md`

  Scenario: Sprint-archive stamps frontmatter
    Given SPRINT-11 with status="Planned" and its branch merged to main
    When I run `cleargate sprint-archive SPRINT-11`
    Then the sprint file frontmatter has status="Completed" and completed_at set to an ISO timestamp
    And `wiki build` ran successfully after the stamp

  Scenario: Sprint-archive rolls back on wiki-lint failure
    Given SPRINT-11 stamp succeeds but subsequent `wiki lint` fails (e.g. token-budget exceeded)
    When I run `cleargate sprint-archive SPRINT-11`
    Then the sprint file frontmatter is reverted to status="Planned"
    And the command exits non-zero
    And git working tree has no sprint-file changes

  Scenario: Not-yet-closed sprint rejected
    Given SPRINT-11 state.json has sprint_status != "Completed" (sprint close not yet run)
    When I run `cleargate sprint-archive SPRINT-11`
    Then the command exits non-zero with "sprint not closed"
    And no frontmatter changes
    Note: Gherkin text corrected from "sprint branch not merged" — actual guard
    is state.sprint_status !== "Completed"; no branch-merge check exists in code.
```

### 2.2 Verification Steps (Manual)
- [ ] Against the current repo, run `cleargate sprint-archive SPRINT-10` and verify it stamps `status: Completed` + `completed_at` (backfill for the real drift case). Expected: STORY-015-02 --fix already corrected status, so this run is a no-op for status but should still write `completed_at` if absent.
- [ ] Grep both protocol files for `Abandoned` and confirm the definition.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/lib/sprint-archive.ts` |
| Related Files | `.cleargate/knowledge/cleargate-protocol.md`, `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md`, `cleargate-cli/test/lib/sprint-archive.test.ts` |
| New Files Needed | No |

### 3.2 Technical Logic
- Add a helper `stampSprintClose(sprintPath, now)` that:
  1. Reads the file, parses frontmatter.
  2. If `status` already terminal, skip status stamp; else set `status: "Completed"`.
  3. Set `completed_at` if absent.
  4. Writes back.
  5. Returns the original frontmatter snapshot for rollback.
- Call order in `sprint-archive`: `stampSprintClose` → `wiki build` → `wiki lint`. On failure of either, restore from the snapshot and re-exit.
- Use atomic-write (tmpfile + rename) to avoid half-written frontmatter.

### 3.3 API Contract
CLI only.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | One per Gherkin scenario; rollback path critical |
| E2E / acceptance tests | 1 | End-to-end sprint-archive against a fixture sprint |

### 4.2 Definition of Done
- [ ] Minimum test expectations met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Both protocol files updated with the `Abandoned` definition.
- [ ] Typecheck + tests pass; commit `feat(EPIC-015): STORY-015-04 abandoned status + sprint-close stamp`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green:
- [ ] Confirm the exact file name/location of the sprint-archive wrapper from STORY-014-08 (this draft assumes `cleargate-cli/src/lib/sprint-archive.ts`; verify against landed code).
- [ ] Confirm rollback-on-lint-failure vs. land-and-warn (epic §6 Q4 — recommended rollback).
