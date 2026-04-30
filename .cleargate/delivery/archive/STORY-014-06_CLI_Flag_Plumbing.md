---
story_id: STORY-014-06
parent_epic_ref: EPIC-014
status: Completed
ambiguity: 🟢 Low
context_source: "EPIC-014 §2 IN-SCOPE A1+A2 + FLASHCARD.md 2026-04-21 `#cli #sprint-close #assume-ack` + `#cli #state-update #execution-mode`"
actor: Developer Agent
complexity_label: L2
milestone: M2
parallel_eligible: n
expected_bounce_exposure: low
approved: true
approved_at: 2026-04-21T12:00:00Z
approved_by: sandro
stamp_error: no ledger rows for work_item_id STORY-014-06
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-21T12:43:28Z
  sessions: []
cached_gate_result:
  pass: false
  failing_criteria:
    - id: implementation-files-declared
      detail: section 3 has 0 listed-item (≥1 required)
  last_gate_check: 2026-04-21T12:43:29Z
---

# STORY-014-06: CLI flag plumbing — `sprint close --assume-ack` + `state update` sentinel fallback
**Complexity:** L2 — three handler edits + unit tests; first M2 story (unblocks 07/08).

## 1. The Spec

### 1.1 User Story
As an orchestrator, I want `cleargate sprint close SPRINT-XX --assume-ack` to pass the flag through to `close_sprint.mjs` and `cleargate state update <STORY> <state>` to read `.active` when no `--sprint` is given, so the CLI covers the same ground `run_script.sh` does and I never need to invoke scripts directly.

### 1.2 Detailed Requirements
- `cleargate-cli/src/commands/sprint.ts` — add `.option('--assume-ack')` to the `close` subcommand. Handler passes `--assume-ack` to the spawned `run_script.sh close_sprint.mjs` call when set.
- `cleargate-cli/src/commands/state.ts` — add `.option('--sprint <id>')` to `update` and `validate` subcommands. When not provided, read `.cleargate/sprint-runs/.active` for the sprint ID. Fall through to v1-inert only when neither is available.
- `cleargate-cli/src/commands/execution-mode.ts` — extend `readSprintExecutionMode` to accept a `{ sentinelFallback: boolean }` option that reads `.active` when no explicit sprint-id is given.
- Unit tests: extend `test/commands/sprint.test.ts` + `test/commands/state.test.ts` — mock spawn, assert `--assume-ack` propagates; mock fs to simulate `.active` presence/absence for state update.
- Three-surface landing: CLI is single-surface (cleargate-cli/). Rebuild regenerates dist + MANIFEST.

### 1.3 Out of Scope
- Closing other CLI gaps (story start/complete is STORY-014-07; sprint archive is STORY-014-08).
- Changes to the underlying .mjs scripts — they already accept `--assume-ack`.

## 2. The Truth

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: CLI flag plumbing

  Scenario: sprint close --assume-ack propagates
    Given a v2 sprint with all stories terminal
    When I run `cleargate sprint close SPRINT-XX --assume-ack`
    Then run_script.sh close_sprint.mjs is spawned with --assume-ack as the last arg
    And sprint_status flips to Completed
    And improvement-suggestions.md is written

  Scenario: state update reads .active when no --sprint flag
    Given .cleargate/sprint-runs/.active contains "SPRINT-XX"
    And the sprint frontmatter has execution_mode: v2
    When I run `cleargate state update STORY-XX-01 Done`
    Then the handler routes to v2 (spawns update_state.mjs) using SPRINT-XX

  Scenario: state update --sprint flag overrides sentinel
    Given .active contains "SPRINT-OLD" but I pass --sprint SPRINT-NEW
    When I run `cleargate state update STORY-NEW-01 Done --sprint SPRINT-NEW`
    Then the handler uses SPRINT-NEW for execution-mode lookup

  Scenario: state update falls to v1-inert when no sprint context exists
    Given .active is empty and no --sprint flag is given
    When I run `cleargate state update STORY-XX-01 Done`
    Then the handler prints "v1 mode active — command inert" and exits 0
```

### 2.2 Verification Steps (Manual)
- [ ] Smoke: run the CLI against CG_TEST's shipped SPRINT-01 (fresh re-init).
- [ ] `npm run typecheck` + `npm test --workspace=cleargate-cli` green.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Modified | `cleargate-cli/src/commands/sprint.ts` |
| Modified | `cleargate-cli/src/commands/state.ts` |
| Modified | `cleargate-cli/src/commands/execution-mode.ts` |
| Modified | `cleargate-cli/test/commands/sprint.test.ts` |
| Modified | `cleargate-cli/test/commands/state.test.ts` |

### 3.2 Technical Logic
Commander `.option('--assume-ack')` adds a boolean flag. Handler: if set, include in the args array passed to `spawn`. For state, `readSprintExecutionMode` with sentinel-fallback flag reads `.active`, trims whitespace, and substitutes for the `sprintId` param.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | Each Gherkin scenario gets a mock-spawn assertion |

### 4.2 Definition of Done
- [ ] All 4 scenarios green.
- [ ] Full cleargate-cli suite still 829+ passed (no regressions).
- [ ] MANIFEST regenerated.
- [ ] Commit: `feat(EPIC-014): STORY-014-06 CLI flag plumbing`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low**
