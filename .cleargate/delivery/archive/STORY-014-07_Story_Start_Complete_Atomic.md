---
story_id: STORY-014-07
parent_epic_ref: EPIC-014
parent_cleargate_id: "EPIC-014"
status: Completed
ambiguity: 🟢 Low
context_source: EPIC-014 §2 IN-SCOPE A3+A4 + manual bash choreography observed across SPRINT-09 + CG_TEST SPRINT-01
actor: Developer Agent
complexity_label: L3
milestone: M2
parallel_eligible: n
expected_bounce_exposure: med
approved: true
approved_at: 2026-04-21T12:00:00Z
approved_by: sandro
stamp_error: no ledger rows for work_item_id STORY-014-07
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-21T12:43:55Z
  sessions: []
cached_gate_result:
  pass: false
  failing_criteria:
    - id: implementation-files-declared
      detail: section 3 has 0 listed-item (≥1 required)
  last_gate_check: 2026-04-21T12:43:55Z
---

# STORY-014-07: `cleargate story start` + `story complete` atomic operations
**Complexity:** L3 — rewrites two CLI handlers to orchestrate worktree + state + merge + cleanup; only L3 in this epic.

## 1. The Spec

### 1.1 User Story
As an orchestrator, I want `cleargate story start <STORY-ID>` to create the worktree, cut the branch, and transition state in one call, and `cleargate story complete <STORY-ID>` to merge, remove the worktree, delete the branch, and transition state to Done — so I can stop typing the 6-step bash sequence that accompanies every v2 story.

### 1.2 Detailed Requirements
- `cleargate-cli/src/commands/story.ts` — rewrite `startHandler`:
  - Resolve active sprint from `.active` (or `--sprint` override).
  - Read state.json to find `sprint_branch` (or derive from sprint-id convention `sprint/S-NN`).
  - Run `git worktree add .worktrees/<STORY-ID> -b story/<STORY-ID> <sprint-branch>` via spawn.
  - Invoke `update_state.mjs <STORY-ID> Bouncing` via `run_script.sh`.
  - Update state.json story entry's `worktree: ".worktrees/<STORY-ID>"`.
- `completeHandler`:
  - Checkout sprint branch (main worktree cwd).
  - `git merge story/<STORY-ID> --no-ff -m "merge: story/<STORY-ID> → <sprint-branch>"`.
  - `git worktree remove .worktrees/<STORY-ID>`.
  - `git branch -d story/<STORY-ID>`.
  - Invoke `update_state.mjs <STORY-ID> Done`.
- Both handlers: under v1, print inert message and exit 0 (unchanged).
- Unit tests: mock `child_process.spawn`, assert the spawn sequence + order.
- Reuse the `readSprintExecutionMode` sentinel-fallback from STORY-014-06 (depends on 06 landing first).

### 1.3 Out of Scope
- Conflict resolution during merge (if merge fails, emit diagnostic and leave branch state alone; user resolves manually).
- Parallel story start (serial per-call; parallelism is orchestrator-driven via multiple invocations).
- Auto-PR creation or any remote push.

## 2. The Truth

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: cleargate story start / complete atomic

  Scenario: story start creates worktree + branch + state
    Given sprint/S-XX exists and STORY-XX-01 is in Ready to Bounce
    When I run `cleargate story start STORY-XX-01`
    Then .worktrees/STORY-XX-01 exists on story/STORY-XX-01 branch
    And state.json's STORY-XX-01.state is "Bouncing"
    And state.json's STORY-XX-01.worktree is ".worktrees/STORY-XX-01"

  Scenario: story complete merges + cleans up
    Given STORY-XX-01 is in Bouncing with a commit on story/STORY-XX-01
    When I run `cleargate story complete STORY-XX-01`
    Then the commit is merged into sprint/S-XX (--no-ff)
    And .worktrees/STORY-XX-01 no longer exists
    And story/STORY-XX-01 branch is deleted
    And state.json's STORY-XX-01.state is "Done"

  Scenario: complete refuses when branch has no commits
    Given story/STORY-XX-01 is at the same commit as sprint/S-XX
    When I run `cleargate story complete STORY-XX-01`
    Then exit code is non-zero
    And stderr says "no commits on story branch — nothing to merge"

  Scenario: v1 mode inert for both
    Given the sprint is execution_mode: v1
    When I run either `cleargate story start` or `story complete`
    Then stdout contains "v1 mode active — command inert"
    And no git state changes

  Scenario: merge conflict surfaces cleanly
    Given a merge conflict between story/STORY-XX-01 and sprint/S-XX
    When I run `cleargate story complete`
    Then the script aborts with a diagnostic
    And suggests `git merge --abort` and re-run after resolution
```

### 2.2 Verification Steps (Manual)
- [ ] Smoke in CG_TEST on a throwaway story.
- [ ] `npm run typecheck` + `npm test --workspace=cleargate-cli` green.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Modified | `cleargate-cli/src/commands/story.ts` |
| Modified | `cleargate-cli/test/commands/story.test.ts` |
| Depends on | STORY-014-06 for sentinel-fallback helper |

### 3.2 Technical Logic
Spawn git + run_script.sh in sequence with proper error handling (any non-zero exit aborts the sequence and reports partial state). Use `spawnSync` for synchronous orchestration; surface exit codes.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 5 | All §2.1 via mock-spawn |

### 4.2 Definition of Done
- [ ] All 5 scenarios pass.
- [ ] CG_TEST smoke-run documents the new flow.
- [ ] Commit: `feat(EPIC-014): STORY-014-07 story start/complete atomic`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low**
