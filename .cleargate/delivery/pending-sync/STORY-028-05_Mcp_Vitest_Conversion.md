---
story_id: STORY-028-05
parent_epic_ref: EPIC-028
parent_cleargate_id: EPIC-028
sprint_cleargate_id: SPRINT-28
carry_over: false
area: mcp,tests,codemod
status: Draft
approved: false
ambiguity: 🟢 Low
complexity_label: L3
parallel_eligible: n
expected_bounce_exposure: high
lane: standard
context_source: |
  EPIC-028 §7 Batch 1: mcp/ first because smallest (50 files) AND integration-
  heavy — flushes out mock patterns early per EPIC-028 §0 Q2 resolution. Single
  atomic commit per EPIC-028 §3 "Atomic conversion per package" rule.

  Depends on STORY-028-04 (codemod tool). Sequential within EPIC-028 thread.

  Per EPIC-028 §0 architecture rule: "Each batch ships as one story with one
  commit. Story = one package conversion." Per §3 reality table: mid-state
  (some files converted, vitest still in deps) is forbidden.
created_at: 2026-05-17T16:40:00Z
updated_at: 2026-05-17T16:40:00Z
created_at_version: cleargate@0.12.0
updated_at_version: cleargate@0.12.0
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-17T19:21:16Z
stamp_error: no ledger rows for work_item_id STORY-028-05
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-17T19:21:15Z
  sessions: []
---

# STORY-028-05: Convert `mcp/` Test Suite to node:test

**Complexity:** L3 — 50 file conversions + manual-fix loop for vi.mock sites (DB layer) + vitest.config delete + package.json cleanup. All in one commit.

## 1. The Spec

### 1.1 User Story

As the SPRINT-28 release operator, I want every test file under `mcp/test/**/*.test.ts` converted to node:test (`*.node.test.ts`), `mcp/vitest.config.ts` deleted, and the `vitest` dependency removed from `mcp/package.json` — all in one atomic commit — so that `mcp/` runs the single `node:test` runner with no two-runner residue.

### 1.2 Detailed Requirements

1. **Preflight (within this story's worktree)**:
   - `cd mcp && rg "from 'vitest'|from \"vitest\"" test/ -l | wc -l` ≥ 50 (confirms expected baseline).
   - Run the codemod (STORY-028-04) against `mcp/test/` in dry-run mode: `node ../cleargate-cli/scripts/codemod-vitest-to-node-test.mjs --root mcp/test --dry-run --report /tmp/mcp-manual-fix.md`.
   - Inspect the manual-fix report. If >20 files require manual fix, escalate to human (per EPIC-028 §"Risks & Dependencies" — Architect/Reporter escalation).
2. **Auto-conversion**:
   - Run the codemod in apply mode: `node ../cleargate-cli/scripts/codemod-vitest-to-node-test.mjs --root mcp/test --apply --report /tmp/mcp-manual-fix.md`.
   - Codemod renames `mcp/test/**/*.test.ts` → `mcp/test/**/*.node.test.ts` for auto-convertible files.
3. **Manual fix loop** — for each file in the manual-fix report:
   - Prefer DI refactor (extract the mocked module into a constructor/parameter; tests inject a fake).
   - If DB-layer mock (vi.mock for postgres client / drizzle): use real Postgres via existing docker-compose harness (FLASHCARD `#mocked-tests`).
   - If `vi.spyOn`: replace with assignment + restore-in-afterEach.
   - If `vi.useFakeTimers`: prefer real-time-with-short-timeout (1-50ms).
   - Rename the file from `*.test.ts` to `*.node.test.ts` once manual fix completes.
4. **Config + package.json cleanup** (same commit as conversions):
   - DELETE `mcp/vitest.config.ts`.
   - In `mcp/package.json`:
     - Remove `vitest` from `devDependencies` (and any `@vitest/*` entries).
     - Remove `test:vitest` script if present; ensure `test` script invokes `node --test --import tsx test/` (or equivalent — match existing 53 `*.node.test.ts` convention).
5. **Validation gates within the story commit**:
   - `cd mcp && rg "from 'vitest'|from \"vitest\"" .` → 0 matches (excluding node_modules).
   - `cd mcp && rg "vi\\.(mock|fn|spyOn|stubGlobal|useFakeTimers|hoisted)" .` → 0 matches.
   - `cd mcp && rg "vitest" package.json` → 0 matches.
   - `find mcp -name 'vitest.config.*' -not -path '*/node_modules/*'` → 0 files.
   - `cd mcp && npm install && npm test` exits 0.
6. **Commit format**: `feat(SPRINT-28): STORY-028-05 — mcp/ vitest → node:test (50 files, vitest dep removed)`.

### 1.3 Out of Scope

- `cleargate-cli/` conversion (STORY-028-06).
- `admin/` conversion (STORY-028-07).
- Codemod tool itself (STORY-028-04).
- Docs / agent prompt / FLASHCARD updates (STORY-028-08).
- Coverage tooling replacement (deferred per EPIC-028 §6 Q4).

### 1.4 Open Questions

- **Question:** If a vi.mock site cannot be DI-refactored without rewriting production code (e.g., a hard-wired singleton), do we still convert in this story?
- **Recommended:** Yes — but the DI refactor counts as part of the story; if the refactor spans >2 production-source files OR introduces an API contract change, escalate to a separate follow-up CR and either ship a temporary node:test-friendly stub in this story OR leave that single test in an `.skip` state with an inline TODO + flashcard entry.
- **Human decision:** Developer's call per file; escalate only when the refactor touches PMAdapter / DB-driver interfaces.

### 1.5 Risks

| Risk | Mitigation |
|---|---|
| >20 vi.mock sites surface in mcp/ — burns the story budget | Preflight dry-run; if count exceeds 20, escalate at story preflight (Architect bounce) before committing to the conversion |
| DB-layer mock conversion accidentally hits real prod DB | All mcp/ tests already use docker-compose Postgres per project convention; verify CLEARGATE_DB_URL is the test-DB connection string before running |
| Removing `@vitest/*` peer deps breaks an indirectly-used utility | `npm install` after the package.json edit + run full test suite catches this immediately |
| Test naming `*.node.test.ts` collides with an existing same-name file | Codemod refuses to overwrite (per STORY-028-04 §1.2 step 5); manual-fix list surfaces collisions |

### 1.6 Existing Surfaces

- **Surface:** `mcp/test/**/*.test.ts` — 50 files per EPIC-028 §4.
- **Surface:** `mcp/vitest.config.ts` — root config to delete.
- **Surface:** `mcp/package.json` — `vitest: ^2.1.0` (verified 2026-05-17).
- **Surface:** `cleargate-cli/scripts/codemod-vitest-to-node-test.mjs` (from STORY-028-04) — codemod runner.
- **Surface:** existing `*.node.test.ts` files in mcp/ (if any) — naming + import-pattern reference.
- **Surface:** docker-compose harness in mcp/ — real-infra test execution per FLASHCARD `#mocked-tests`.
- **Coverage of this story's scope:** ~50% — codemod handles auto path; manual fixes are net-new test-code edits.

### 1.7 Why not simpler?

- **Smallest existing surface that could carry this:** convert mcp/ one directory at a time across multiple commits.
- **Why isn't extension sufficient?** EPIC-028 §3 "Atomic conversion per package" rule — mid-state (some files converted while vitest still in deps) leaves npm test in an indeterminate state. One atomic commit per package is non-negotiable.

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: mcp/ vitest elimination

  Scenario: All 50 files renamed and converted
    Given STORY-028-04 has merged and the codemod is available
    When STORY-028-05 commit lands
    Then `rg "from 'vitest'" mcp/` returns 0 matches
    And `rg "vi\\.(mock|fn|spyOn|stubGlobal|useFakeTimers|hoisted)" mcp/` returns 0 matches
    And `find mcp -name '*.node.test.ts' -not -path '*/node_modules/*' | wc -l` >= 50

  Scenario: vitest.config.ts deleted
    Given STORY-028-05 commit
    When ls mcp/vitest.config.ts runs
    Then it returns non-zero (file does not exist)

  Scenario: package.json clean
    Given STORY-028-05 commit
    When `grep -i vitest mcp/package.json` runs
    Then 0 matches

  Scenario: npm test green
    Given STORY-028-05 commit and `npm install` complete
    When `cd mcp && npm test` runs
    Then exit code is 0
    And the suite reports >0 passing tests
    And no skipped tests beyond pre-existing skip set

  Scenario: Atomic commit
    Given STORY-028-05 commit
    When `git show --stat <sha>` runs
    Then the same commit contains: 50 test file renames+modifications, vitest.config.ts deletion, package.json edit
```

### 2.2 Verification Steps (Manual)

- [ ] Random-sample 5 converted files; eyeball-check that imports + assertions look idiomatic.
- [ ] Run `npm test` twice in a row; second run still green (no orphan state).
- [ ] Verify `package-lock.json` shrunk (vitest tree removed).

## 3. Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary Files | `mcp/test/**/*.test.ts` (50 files → renamed `*.node.test.ts`) |
| Config Delete | `mcp/vitest.config.ts` |
| Package.json Edit | `mcp/package.json` (remove vitest entries) |
| Codemod Tool | `cleargate-cli/scripts/codemod-vitest-to-node-test.mjs` (invoke; not edit) |
| New Files Needed | No (file moves count as renames, not new files) |

### 3.2 Technical Logic

1. Preflight dry-run; check manual-fix count.
2. If ≤20: proceed. Apply codemod.
3. Manually fix each flagged file per §1.2 step 3.
4. Delete vitest.config.ts.
5. Edit package.json: remove vitest devDep entry, remove any test:vitest script, ensure test script runs node:test via tsx.
6. `npm install` in mcp/.
7. `npm test`; iterate until green.
8. Stage everything; one commit per §1.2 step 6.

### 3.3 API Contract

N/A.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Test count preservation | 1 | Total tests in mcp/ ≥ count before conversion (no test deleted as side effect) |
| Full suite green | 1 | `npm test` exits 0 |
| Vitest-residue grep | 4 | Per §2.1 scenarios for vitest references / configs |

### 4.2 Definition of Done

- [ ] 50 files renamed `*.node.test.ts`; zero `*.test.ts` files reference vitest.
- [ ] vitest.config.ts deleted.
- [ ] package.json clean.
- [ ] `npm test` green.
- [ ] Single atomic commit.
- [ ] Manual-fix report attached to PR description.

## Existing Surfaces

- **Surface:** `mcp/test/` (50 vitest files per EPIC-028 §4) — codemod target directory.
- **Surface:** `mcp/vitest.config.ts` — root config to delete.
- **Surface:** `mcp/package.json` — `vitest: ^2.1.0` devDep (verified 2026-05-17).
- **Surface:** `cleargate-cli/scripts/backfill-sprint-reports.mjs` — sibling script reference; the codemod runner from STORY-028-04 lands in this directory.
- **Surface:** `mcp/docker-compose.yml` — real-infra test execution per FLASHCARD `#mocked-tests`.
- **Coverage of this story's scope:** ~50% — codemod handles auto path; manual fixes are net-new test-code edits.

## Why not simpler?

> See §1.7.

## Ambiguity Gate
🟢 Low — one open question on hard-wired-singleton DI; defaulted to per-file Dev call.
