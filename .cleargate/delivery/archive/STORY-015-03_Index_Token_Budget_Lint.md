---
story_id: STORY-015-03
parent_epic_ref: EPIC-015
parent_cleargate_id: EPIC-015
status: Completed
ambiguity: 🟢 Low
context_source: EPIC-015_Wiki_Index_Hygiene_And_Scale.md
actor: Pre-push gate (human operator running `cleargate wiki lint`)
complexity_label: L1
parallel_eligible: n
expected_bounce_exposure: low
created_at: 2026-04-24T00:00:00Z
updated_at: 2026-04-24T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-24T00:00:01Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-015-03
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-24T08:12:38Z
  sessions: []
---

# STORY-015-03: Index Token-Budget Lint
**Complexity:** L1 — single-check addition to wiki-lint with clear pass/fail.

**Depends on:** STORY-015-01 (hierarchical rendering must land first so the ceiling is measured against the reshaped index, not the flat one).

## 1. The Spec (The Contract)

### 1.1 User Story
As the human operator running `cleargate wiki lint` before a push (Gate 3), I want the lint to fail if `.cleargate/wiki/index.md` exceeds a configurable token ceiling, so that index bloat is caught before it erodes every agent's session-start budget.

### 1.2 Detailed Requirements
- `cleargate wiki lint` gains a new check: measure `.cleargate/wiki/index.md` size in approximate tokens (chars ÷ 4) and compare against `wiki.index_token_ceiling` from `.cleargate/config.yml`.
- Default ceiling: `8000`. Applied when the config key is absent.
- On exceed: exit non-zero with message `wiki/index.md exceeds token ceiling: <actual> > <ceiling>. Shard or prune (see EPIC-015).`
- Within ceiling: no output from this check (other lint checks still run).
- `--suggest` advisory mode: never exits non-zero; prints current size and headroom as `index token usage: 3872 / 8000 (48%)`.

### 1.3 Out of Scope
- Real tokenizer (tiktoken) — chars/4 heuristic is sufficient; recommended in epic §6.
- Per-page size limits for individual wiki pages.
- Auto-sharding — handled by a future epic when we cross the flat-index regime.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Index Token-Budget Lint

  Scenario: Within ceiling passes silently
    Given wiki/index.md is 3000 tokens and ceiling is 8000
    When I run `cleargate wiki lint`
    Then the index-budget check produces no output
    And if no other lint errors exist, exit code is 0

  Scenario: Over ceiling fails
    Given wiki/index.md is 9000 tokens and ceiling is 8000
    When I run `cleargate wiki lint`
    Then exit code is non-zero
    And stderr contains "wiki/index.md exceeds token ceiling: 9000 > 8000"

  Scenario: Custom ceiling from config
    Given `.cleargate/config.yml` sets `wiki.index_token_ceiling: 4000`
    And wiki/index.md is 5000 tokens
    When I run `cleargate wiki lint`
    Then exit code is non-zero
    And stderr references the 4000 ceiling

  Scenario: --suggest never fails
    Given wiki/index.md is 9000 tokens and ceiling is 8000
    When I run `cleargate wiki lint --suggest`
    Then exit code is 0
    And stdout contains "index token usage: 9000 / 8000 (113%)"
```

### 2.2 Verification Steps (Manual)
- [ ] Against the current repo post-STORY-015-01, confirm `cleargate wiki lint` passes (expected ≤ 4k tokens).
- [ ] Temporarily lower the config ceiling to 1000 and confirm the lint fails with the right message.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/commands/wiki-lint.ts` |
| Related Files | `cleargate-cli/src/lib/config.ts` (or wherever config is loaded), `cleargate-cli/test/commands/wiki-lint.test.ts` |
| New Files Needed | No |

### 3.2 Technical Logic
- Read `.cleargate/wiki/index.md` byte length, divide by 4, round.
- Load config; if `wiki.index_token_ceiling` absent, default to `8000`.
- Compare; accumulate into the existing lint error collector.
- In `--suggest` mode, always emit the usage line regardless of pass/fail.

### 3.3 API Contract
CLI only. No new flags beyond what `wiki-lint` already exposes.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | One per Gherkin scenario |
| E2E / acceptance tests | 0 | Covered by unit tests over temp-dir fixtures |

### 4.2 Definition of Done
- [ ] Minimum test expectations met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Typecheck + tests pass; commit `feat(EPIC-015): STORY-015-03 index token-budget lint`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

All requirements map to specific files and behaviors; no TBDs.
