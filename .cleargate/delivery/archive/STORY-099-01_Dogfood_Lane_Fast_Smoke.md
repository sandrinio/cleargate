---
story_id: STORY-099-01
parent_epic_ref: EPIC-022
parent_cleargate_id: "EPIC-022"
sprint_cleargate_id: "SPRINT-14"
status: Completed
lane: fast
expected_bounce_exposure: low
complexity_label: L1
sprint: SPRINT-14
milestone: M5
approved: true
approved_at: 2026-04-27T00:00:00Z
approved_by: orchestrator (synthetic dogfood story)
created_at: 2026-04-27T00:00:00Z
updated_at: 2026-04-27T00:00:00Z
created_at_version: cleargate@0.6.0
updated_at_version: cleargate@0.6.0
source: local-authored
stamp_error: no ledger rows for work_item_id STORY-099-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-27T01:03:59Z
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-27T01:03:59Z
---

# STORY-099-01: Dogfood Smoke — Fast Lane Single-File Comment

**Complexity:** L1 — add a 1-LOC comment to `cleargate-cli/src/cli.ts` near the top of the file; no logic change, no test surface.

## 1. The Spec (The Contract)

### 1.1 User Story

As the ClearGate orchestrator exercising the fast-lane path end-to-end, I want to verify that a known-trivial L1 story can be committed and pass the pre-gate scanner without spawning QA, so that the lane=fast happy path is validated in the live dogfood repo.

### 1.2 Detailed Requirements

Add a single-line comment to `cleargate-cli/src/cli.ts` near the top (line 1, before any imports):

```
// SPRINT-14 M5 dogfood smoke — STORY-099-01
```

This change must:
- Be comment-only (no logic, no imports, no test surface changes).
- Pass `npm run typecheck` in `cleargate-cli/`.
- Not require QA review (lane=fast, single-file, comment-only).

### 1.3 Out of Scope

- Any logic change to cli.ts.
- Any test additions for this 1-LOC comment.
- Modifying any other file.

## 2. The Truth (Executable Tests)

### 2.1 Gherkin Acceptance Criteria

```gherkin
Feature: Fast-lane dogfood smoke — 1-LOC comment on cli.ts

  Scenario: Lane=fast happy path commit lands
    Given cli.ts does not start with the dogfood comment
    When Developer adds "// SPRINT-14 M5 dogfood smoke — STORY-099-01" at line 1
    Then the file compiles cleanly under `npm run typecheck`
    And the pre-gate scanner passes (comment-only diff)
    And QA is NOT spawned (lane=fast skip)
    And state.json STORY-099-01 advances to "Architect Passed"
```

## 3. Implementation Guide

### 3.1 Files To Modify / Create

**Modify:**
- `cleargate-cli/src/cli.ts` — insert `// SPRINT-14 M5 dogfood smoke — STORY-099-01` at line 1 (prepend before the first `import` statement).

### 3.2 Technical Logic

Single-line comment prepend. No logic change.

Target file: `cleargate-cli/src/cli.ts`
Target location: line 1 (before `import { Command } from 'commander';`)

## 4. Quality Gates

### 4.1 Test Expectations

- `npm run typecheck` passes in `cleargate-cli/`.
- Pre-gate scanner passes (comment-only diff).

### 4.2 Definition of Done

- [ ] `// SPRINT-14 M5 dogfood smoke — STORY-099-01` present at line 1 of `cleargate-cli/src/cli.ts`.
- [ ] `npm run typecheck` clean.
- [ ] Commit message: `feat(EPIC-022): STORY-099-01 M5 dogfood smoke — add comment to cli.ts`.
- [ ] One commit. NEVER `--no-verify`.
