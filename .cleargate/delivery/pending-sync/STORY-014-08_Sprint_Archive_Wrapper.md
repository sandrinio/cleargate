---
story_id: STORY-014-08
parent_epic_ref: EPIC-014
status: Ready
ambiguity: 🟢 Low
context_source: EPIC-014 §2 IN-SCOPE A5 + manual archive bash block run twice in SPRINT-09 + CG_TEST
actor: Developer Agent
complexity_label: L2
milestone: M2
parallel_eligible: n
expected_bounce_exposure: low
approved: true
approved_at: 2026-04-21T12:00:00Z
approved_by: sandro
stamp_error: no ledger rows for work_item_id STORY-014-08
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-21T12:44:19Z
  sessions: []
cached_gate_result:
  pass: false
  failing_criteria:
    - id: implementation-files-declared
      detail: section 3 has 0 listed-item (≥1 required)
  last_gate_check: 2026-04-21T12:44:19Z
---

# STORY-014-08: `cleargate sprint archive` wrapper
**Complexity:** L2 — one new CLI subcommand + handler; reuses script primitives from 013-07.

## 1. The Spec

### 1.1 User Story
As an orchestrator closing a v2 sprint, I want `cleargate sprint archive <SPRINT-ID>` to do the final cleanup: move pending-sync files to archive, stamp status/completed_at, clear `.active`, merge the sprint branch to main, delete the sprint branch — so the 10+ line bash block we hand-ran for SPRINT-09 and CG_TEST SPRINT-01 becomes one command.

### 1.2 Detailed Requirements
- New subcommand `cleargate sprint archive <SPRINT-ID>`:
  - Refuse if `state.json.sprint_status != "Completed"` (assertion that close_sprint already ran with --assume-ack).
  - Move `SPRINT-<ID>_*.md` + `EPIC-*` + `STORY-*` + `PROPOSAL-*` files related to this sprint from `pending-sync/` → `archive/`. Which files? Resolve via sprint's `epics: [...]` frontmatter + the epic's stories + the epic's `context_source` proposal.
  - Stamp each moved file: `status: Done|Completed|Approved` (type-appropriate) + `completed_at: <now-ISO>`.
  - Clear `.cleargate/sprint-runs/.active` (truncate to empty).
  - Checkout `main`, `git merge --no-ff sprint/<ID> -m "merge: sprint/<ID> → main"`.
  - `git branch -d sprint/<ID>`.
  - Emit a summary: files moved, commits merged, branch deleted.
- Under v1, inert.
- Dry-run flag `--dry-run` that prints the plan without executing.
- Three-surface landing: CLI only, but MANIFEST regenerates.

### 1.3 Out of Scope
- Pushing to remote (explicit user step).
- Cleaning up `.cleargate/sprint-runs/<id>/` tree (that stays as the audit artifact).
- Handling merge conflicts (assumes sprint branch is fast-forwardable after close; if not, diagnose and abort).

## 2. The Truth

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: cleargate sprint archive

  Scenario: archive completes the close-out
    Given state.json sprint_status is "Completed"
    And SPRINT-XX.md, EPIC-0YY.md, STORY-0YY-NN.md, PROPOSAL-ZZ.md are in pending-sync/
    When I run `cleargate sprint archive SPRINT-XX`
    Then all four files are moved to archive/
    And each has status/completed_at stamped appropriately
    And .cleargate/sprint-runs/.active is empty
    And main contains a merge commit `merge: sprint/SPRINT-XX → main`
    And branch sprint/SPRINT-XX is deleted

  Scenario: archive refuses when sprint not yet Completed
    Given state.json sprint_status is "Active"
    When I run archive
    Then exit code is non-zero
    And stderr says "sprint not closed — run `cleargate sprint close SPRINT-XX --assume-ack` first"

  Scenario: --dry-run prints plan only
    Given a completed sprint
    When I run archive with --dry-run
    Then stdout lists every file move + each stamp + the merge command
    And no filesystem changes occur

  Scenario: v1 inert
    Given execution_mode: v1
    When I run archive
    Then inert message, no changes
```

### 2.2 Verification Steps (Manual)
- [ ] Smoke against a throwaway completed sprint in CG_TEST.
- [ ] `npm run typecheck` + `npm test --workspace=cleargate-cli` green.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Modified | `cleargate-cli/src/commands/sprint.ts` (add `archive` subcommand) |
| Modified | `cleargate-cli/src/cli.ts` if needed for wiring |
| New | `cleargate-cli/test/commands/sprint-archive.test.ts` |

### 3.2 Technical Logic
Resolve the set of files via frontmatter traversal. Stamp via `readSprintFrontmatter` + in-place YAML mutation (reuse the M1 atomic write pattern). Use `spawnSync('git', ...)` for checkout/merge/branch-d.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | §2.1 |
| CG_TEST smoke | 1 | Manual run in CG_TEST after M1 lands |

### 4.2 Definition of Done
- [ ] All 4 scenarios pass.
- [ ] --dry-run works and prints every step.
- [ ] Commit: `feat(EPIC-014): STORY-014-08 sprint archive wrapper`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low**
