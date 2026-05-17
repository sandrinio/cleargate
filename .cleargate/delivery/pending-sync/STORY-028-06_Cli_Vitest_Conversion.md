---
story_id: STORY-028-06
parent_epic_ref: EPIC-028
parent_cleargate_id: EPIC-028
sprint_cleargate_id: SPRINT-28
carry_over: false
area: cli,tests,codemod
status: Draft
approved: false
ambiguity: 🟢 Low
complexity_label: L3
parallel_eligible: n
expected_bounce_exposure: high
lane: standard
context_source: |
  EPIC-028 §7 Batch 2: cleargate-cli/ second because largest (138 files) AND
  mostly DI-style — codemod auto-converts most. Per CR-029 §1 analysis cited
  in EPIC-028: only 1 real vi.mock site in cleargate-cli/test/, so manual-fix
  burden is low.

  Depends on STORY-028-04 (codemod tool) AND STORY-028-05 (mcp/ first batch
  flushes mock patterns + validates codemod against real-world test files).
  Same atomic-commit-per-package rule.
created_at: 2026-05-17T16:40:00Z
updated_at: 2026-05-17T16:40:00Z
created_at_version: cleargate@0.12.0
updated_at_version: cleargate@0.12.0
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-17T19:19:13Z
stamp_error: no ledger rows for work_item_id STORY-028-06
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-17T19:19:13Z
  sessions: []
---

# STORY-028-06: Convert `cleargate-cli/` Test Suite to node:test

**Complexity:** L3 — 138 file conversions (largest batch) + vitest.config delete + package.json cleanup. Single atomic commit. DI-style means manual-fix loop is small (~1 site per CR-029 §1 analysis).

## 1. The Spec

### 1.1 User Story

As the SPRINT-28 release operator, I want every test file under `cleargate-cli/test/**/*.{test,spec}.ts` converted to `*.node.test.ts`, `cleargate-cli/vitest.config.ts` deleted, and `vitest` removed from `cleargate-cli/package.json` — all in one atomic commit — so that `cleargate-cli/` runs the single node:test runner.

### 1.2 Detailed Requirements

Identical workflow to STORY-028-05 with the following deltas:

1. **Preflight** counts: `cd cleargate-cli && rg "from 'vitest'|from \"vitest\"" test/ -l | wc -l` ≥ 138.
2. **Codemod root**: `--root cleargate-cli/test`.
3. **Both extensions**: `.test.ts` AND `.spec.ts` files are in scope per EPIC-028 §6 Q5 resolution. Codemod handles both; output is always `*.node.test.ts`.
4. **Examples directory exempt**: `cleargate-cli/examples/` (per FLASHCARD 2026-05-04 `#fixtures #sprint-22`) contains intentionally-failing Red examples and is NOT in scope. The codemod's `--root cleargate-cli/test` excludes it naturally; do not widen.
5. **CR-066 + CR-067 tests must already exist when this story runs**: STORY-066-01 ships `parent-rollup.node.test.ts` and STORY-067-01 ships `migrate-status-to-completed.node.test.ts` — both are node:test from birth, so they pass through the codemod walk as already-converted (idempotent no-op).
6. **Validation gates within the story commit** — same set as STORY-028-05 but scoped to `cleargate-cli/`:
   - `cd cleargate-cli && rg "from 'vitest'|from \"vitest\"" .` → 0 matches.
   - `cd cleargate-cli && rg "vi\\.(mock|fn|spyOn|stubGlobal|useFakeTimers|hoisted)" .` → 0 matches.
   - `cd cleargate-cli && rg "vitest" package.json` → 0 matches.
   - `find cleargate-cli -name 'vitest.config.*' -not -path '*/node_modules/*'` → 0 files.
   - `cd cleargate-cli && npm install && npm test` exits 0.
7. **Commit format**: `feat(SPRINT-28): STORY-028-06 — cleargate-cli/ vitest → node:test (138 files, vitest dep removed)`.

### 1.3 Out of Scope

Same as STORY-028-05. Plus: `cleargate-cli/examples/` (intentionally-failing Red examples; excluded by codemod root).

### 1.4 Open Questions

None — pattern fully established by STORY-028-05.

### 1.5 Risks

| Risk | Mitigation |
|---|---|
| 138 files exceed a single Dev wall-time budget | If manual-fix count is low (per CR-029 §1 — ~1 site), codemod auto-converts in <2 min wall time. If preflight finds more, surface to Architect for split. |
| `vi.hoisted()` in svelte-style mocks (FLASHCARD 2026-04-19) | cleargate-cli/test/ has no svelte tests (admin/ owns those); zero risk here |
| Conversion changes test discovery (different glob pattern) | Verify post-conversion `npm test` runs the same number of tests as pre-conversion baseline |
| Race with CR-066/-067 commits if those land same-sprint and touch `cleargate-cli/test/` | This story runs in Wave 2 after STORY-066-01 + STORY-067-01 commit; CR-066/-067 test files are already `.node.test.ts` from birth |

### 1.6 Existing Surfaces

- **Surface:** `cleargate-cli/test/**/*.{test,spec}.ts` — 138 files per EPIC-028 §4.
- **Surface:** `cleargate-cli/vitest.config.ts` — config to delete.
- **Surface:** `cleargate-cli/package.json` — vitest devDep.
- **Surface:** `cleargate-cli/examples/` — Red examples directory; OUT of scope (per FLASHCARD `#fixtures #sprint-22`).
- **Coverage of this story's scope:** ~70% — codemod handles vast majority of cleargate-cli/test/ given DI-style dominance.

### 1.7 Why not simpler?

Same as STORY-028-05.

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: cleargate-cli/ vitest elimination

  Scenario: All 138 files converted
    Given STORY-028-04 + STORY-028-05 have merged
    When STORY-028-06 commit lands
    Then `rg "from 'vitest'" cleargate-cli/` returns 0 matches
    And `find cleargate-cli/test -name '*.node.test.ts' | wc -l` >= 138
    And cleargate-cli/examples/ is unchanged

  Scenario: vitest.config.ts deleted, package.json clean, npm test green
    Given STORY-028-06 commit
    When the validation gates run
    Then all four (vitest.config absent, package.json clean, vi.* zero, npm test green) pass

  Scenario: Atomic commit
    Given STORY-028-06 commit
    When `git show --stat <sha>` runs
    Then the commit contains: 138 test file renames+mods, vitest.config.ts deletion, package.json edit
```

### 2.2 Verification Steps (Manual)

- [ ] Random-sample 5 converted files; idiomatic check.
- [ ] `cleargate-cli/examples/` directory untouched (`git diff --stat` shows zero changes there).
- [ ] Run `npm test` twice; second run green.

## 3. Implementation Guide

Same as STORY-028-05 with the substitutions above. See §3.2 of STORY-028-05 for the step-by-step workflow.

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary Files | `cleargate-cli/test/**/*.{test,spec}.ts` (138 files → renamed `*.node.test.ts`) |
| Config Delete | `cleargate-cli/vitest.config.ts` |
| Package.json Edit | `cleargate-cli/package.json` |
| Codemod Tool | `cleargate-cli/scripts/codemod-vitest-to-node-test.mjs` (invoke) |
| Exempt | `cleargate-cli/examples/**` (do NOT codemod) |
| New Files Needed | No |

### 3.2 Technical Logic

See STORY-028-05 §3.2. Substitute `mcp/` → `cleargate-cli/`. Add `--exclude examples/` semantics (the `--root cleargate-cli/test` argument excludes naturally; no flag needed).

### 3.3 API Contract

N/A.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Test count preservation | 1 | total tests ≥ pre-conversion baseline |
| Full suite green | 1 | `npm test` exits 0 |
| Vitest-residue grep | 4 | Same as STORY-028-05 |

### 4.2 Definition of Done

- [ ] 138 files renamed; zero `*.test.ts` references vitest.
- [ ] vitest.config.ts deleted.
- [ ] package.json clean.
- [ ] `npm test` green.
- [ ] Single atomic commit.
- [ ] `cleargate-cli/examples/` untouched.

## Existing Surfaces

- **Surface:** `cleargate-cli/test/` — 138 `*.{test,spec}.ts` files per EPIC-028 §4 (codemod target).
- **Surface:** `cleargate-cli/vitest.config.ts` — config to delete.
- **Surface:** `cleargate-cli/package.json` — vitest devDep to remove.
- **Surface:** `cleargate-cli/examples/` — Red examples directory; OUT of scope (per FLASHCARD `#fixtures #sprint-22`).
- **Coverage of this story's scope:** ~70% — codemod handles vast majority of cleargate-cli/test/ given DI-style dominance.

## Why not simpler?

> See §1.7.

## Ambiguity Gate
🟢 Low.
