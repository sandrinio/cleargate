---
story_id: STORY-028-04
parent_epic_ref: EPIC-028
parent_cleargate_id: EPIC-028
sprint_cleargate_id: SPRINT-28
carry_over: false
area: cli,scripts,tests,codemod
status: Completed
approved: false
ambiguity: 🟢 Low
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
context_source: |
  First story of EPIC-028 — codemod tool that the three per-package conversion
  stories will invoke. ts-morph based per EPIC-028 §6 Q1. Golden-fixture tests
  validate auto-conversion + manual-fix detection. No per-package conversion in
  this story; that's STORY-028-05/-06/-07.

  Decomposed at SPRINT-28 SDR 2026-05-17. Parallel with CR-066 and CR-067
  foundation libs (disjoint surfaces: codemod tool vs reconciler vs migration).
created_at: 2026-05-17T16:40:00Z
updated_at: 2026-05-17T16:40:00Z
created_at_version: cleargate@0.12.0
updated_at_version: cleargate@0.12.0
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-17T19:20:46Z
stamp_error: no ledger rows for work_item_id STORY-028-04
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-17T19:20:46Z
  sessions: []
---

# STORY-028-04: Vitest → node:test Codemod Tool

**Complexity:** L2 — ~250-400 LOC ts-morph script + golden-fixture tests.

## 1. The Spec

### 1.1 User Story

As STORY-028-05/-06/-07 (per-package conversion stories), I want a codemod tool that transforms vitest test files to node:test test files in-place — handling the mechanical 80% of API mappings, renaming `*.test.ts`/`*.spec.ts` → `*.node.test.ts`, and emitting a manual-fix report for files containing `vi.*` API calls — so each per-package story can run the codemod over its directory and ship a single commit.

### 1.2 Detailed Requirements

1. **`cleargate-cli/scripts/codemod-vitest-to-node-test.mjs`** (new), invoked as:
   ```
   node codemod-vitest-to-node-test.mjs --root <dir> [--dry-run|--apply] [--report <path>]
   ```
2. Walks `<root>/**/*.{test,spec}.ts` recursively (skip `node_modules` + `dist`).
3. For each file, parse via `ts-morph`. Classify as one of:
   - **AUTO-CONVERTIBLE**: no occurrences of `vi.mock`, `vi.fn`, `vi.spyOn`, `vi.useFakeTimers`, `vi.stubGlobal`, `vi.hoisted`.
   - **MANUAL-FIX-REQUIRED**: at least one such occurrence.
4. **AUTO-CONVERTIBLE path** — apply these mechanical transforms (per EPIC-028 §4 table):
   - Replace `import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'` (any subset) with two imports:
     - `import { describe, test, before, after, beforeEach, afterEach } from 'node:test'`
     - `import assert from 'node:assert/strict'`
     (Only emit `before`/`after`/`beforeEach`/`afterEach` if used.)
   - Rename `it(` → `test(` (call expressions only; not strings).
   - Rename `beforeAll(` → `before(` and `afterAll(` → `after(`.
   - Replace `expect(x).toBe(y)` → `assert.strictEqual(x, y)`.
   - Replace `expect(x).toEqual(y)` → `assert.deepStrictEqual(x, y)`.
   - Replace `expect(x).toThrow(...)` → `assert.throws(() => x, ...)` (if `x` is an arrow fn call site — codemod inspects AST and re-wraps when target is a function literal; for non-trivial throw assertions, classify as MANUAL-FIX-REQUIRED).
   - Replace `expect(x).toBeUndefined()` → `assert.strictEqual(x, undefined)`.
   - Replace `expect(x).toBeNull()` → `assert.strictEqual(x, null)`.
   - Replace `expect(x).toBeTruthy()` → `assert.ok(x)`.
   - Replace `expect(x).toBeFalsy()` → `assert.ok(!x)`.
   - For any unrecognized `expect(...).<matcher>(...)` call, fall back to MANUAL-FIX-REQUIRED (don't half-convert; emit the line to the report).
5. **Rename**: source file `foo.test.ts` or `foo.spec.ts` → `foo.node.test.ts` (use `fs.renameSync`). The codemod refuses to overwrite an existing `foo.node.test.ts`; classifies as MANUAL-FIX-REQUIRED with reason "target file already exists".
6. **MANUAL-FIX-REQUIRED path** — do NOT rewrite the file. Append a row to the report at `--report` (defaults to `<root>/.codemod-manual-fix-report.md`): `| <relative-path> | <api-list> | <line-numbers> |`.
7. **Tests** at `cleargate-cli/scripts/codemod-vitest-to-node-test.node.test.ts`:
   - Golden-fixture pairs under `cleargate-cli/test/fixtures/codemod-vitest/`: each fixture has `input.test.ts` + `expected.node.test.ts`. Test runs codemod against tmpdir copy of input, asserts byte-equal to expected.
   - Six fixture pairs covering: (1) plain describe/it, (2) all 8 matchers, (3) before/after hooks, (4) async test, (5) `.spec.ts` rename path, (6) `vi.mock` flagged for manual fix.
8. **Idempotency**: running the codemod twice against the same already-converted file is a no-op (no `vitest` imports remain).
9. **Exit code**: 0 if zero MANUAL-FIX-REQUIRED files; 1 if any MANUAL-FIX-REQUIRED files present (signals downstream per-package stories to halt at preflight per EPIC-028 §5 error-path scenario).

### 1.3 Out of Scope

- Running the codemod against any real package (STORY-028-05/-06/-07).
- Coverage tooling migration (EPIC-028 §6 Q4 — explicit OOS).
- `@testing-library/svelte` compat verification (STORY-028-07).
- CI pre-commit hook that fails on vitest reappearance (EPIC-028 §5 scenario 8; covered by STORY-028-08 docs story OR a separate follow-up if it requires more than docs).
- DOM mocking shim if any test relies on vitest's jsdom env (STORY-028-07 problem).

### 1.4 Open Questions

- **Question:** EPIC-028 §5 Gherkin scenario 8 ("CI pre-commit hook fails with clear Error message when vitest reappears") — does the hook live in this story or in the docs story (STORY-028-08)?
- **Recommended:** Docs story (STORY-028-08). The hook is repo-policy enforcement, not codemod logic. STORY-028-08 owns CLAUDE.md + developer.md + FLASHCARD, and adding a `check:no-vitest` npm script + pre-commit invocation fits there.
- **Human decision:** Confirm at orchestrator dispatch.

### 1.5 Risks

| Risk | Mitigation |
|---|---|
| ts-morph AST transformation produces unexpected formatting (trailing-comma drift, quote-style drift) | Run prettier on the output before write; lock prettier config to repo defaults |
| Golden fixture format mismatches actual ts-morph output bytes | Tests use `assert.strictEqual(actual, expected)` AFTER prettier-format both sides; not raw byte equality |
| `vi.hoisted()` pattern in svelte tests (FLASHCARD 2026-04-19 `#vitest #vi-mock #sveltekit-endpoint`) | Codemod classifies as MANUAL-FIX-REQUIRED; STORY-028-07 handles svelte cases inline |
| `toThrow` with a regex argument or error class | Codemod handles only no-arg / arg-string forms; everything else flagged for manual fix |

### 1.6 Existing Surfaces

- **Surface:** `cleargate-cli/scripts/` — sibling `.mjs` scripts; codemod follows the same shape (top-level argv parsing, no exports).
- **Surface:** `cleargate-cli/package.json` devDeps — `ts-morph` is NOT currently present (Architect grep verified 2026-05-17). Adding it is a one-pkg change.
- **Surface:** `cleargate-cli/test/` — existing `*.node.test.ts` files (53 already converted per EPIC-028 context) provide reference output shapes.
- **Surface:** ~53 already-converted `*.node.test.ts` files in the repo — use them as natural golden-output references when authoring fixtures.
- **Coverage of this story's scope:** ~40% — new script + new dep, but reuses scripts-directory convention.

### 1.7 Why not simpler?

- **Smallest existing surface that could carry this:** plain regex sed.
- **Why isn't extension sufficient?** Regex sed misses async function bodies, breaks on multi-line `expect(...).toBe(...)` calls, and corrupts files with vi.mock factories. ts-morph parses TypeScript so it understands call expressions structurally. 222 files of regex risk is high; ts-morph cost is ~1 day.

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: Codemod vitest → node:test

  Scenario: AUTO-CONVERTIBLE file with describe/it/expect
    Given fixture input.test.ts uses only describe/it/expect/beforeAll
    When the codemod runs against the fixture tmpdir
    Then output is byte-identical (after prettier) to expected.node.test.ts
    And input.test.ts is renamed input.node.test.ts (no input.test.ts remains)
    And exit code is 0

  Scenario: All 8 matchers map correctly
    Given a fixture using toBe, toEqual, toThrow, toBeUndefined, toBeNull, toBeTruthy, toBeFalsy in any combination
    When the codemod runs
    Then each matcher converts to the documented assert.* call

  Scenario: vi.mock flags for manual fix
    Given fixture containing `vi.mock('./dep')`
    When the codemod runs
    Then the file is NOT renamed and bytes are unchanged
    And the manual-fix report contains the file path with "vi.mock" listed
    And exit code is 1

  Scenario: .spec.ts files convert and rename to .node.test.ts
    Given input.spec.ts uses describe/it
    When the codemod runs
    Then output is input.node.test.ts (input.spec.ts removed)

  Scenario: Idempotency on already-converted file
    Given a file already named foo.node.test.ts using only node:test API
    When the codemod runs over its directory
    Then the file is unchanged and not double-renamed

  Scenario: Target collision
    Given input.test.ts AND input.node.test.ts both exist
    When the codemod runs
    Then input.test.ts is left alone
    And manual-fix report lists "target file already exists"
    And exit code is 1
```

### 2.2 Verification Steps (Manual)

- [ ] Run the codemod against a tmpdir copy of `cleargate-cli/test/lib/` (small slice). Diff before/after; spot-check 3 random files for sane output.
- [ ] Run twice; second run is a no-op.

## 3. Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scripts/codemod-vitest-to-node-test.mjs` (NEW) |
| Test File | `cleargate-cli/scripts/codemod-vitest-to-node-test.node.test.ts` (NEW) |
| Fixtures | `cleargate-cli/test/fixtures/codemod-vitest/{plain,matchers,hooks,async,spec-rename,vi-mock-flag}/{input.test.ts,expected.node.test.ts}` (12 fixture files total) |
| Dep edit | `cleargate-cli/package.json` — add `ts-morph` to devDependencies (verify version via `npm view ts-morph version` first) |
| New Files Needed | Yes — 1 script + 1 test + 12 fixture files + 1 package.json edit |

### 3.2 Technical Logic

1. Parse argv: `--root`, `--dry-run`, `--apply` (default), `--report`.
2. Glob input files (`**/*.{test,spec}.ts`, skip `node_modules` + `dist` + `*.node.test.ts`).
3. For each file: load via `Project.addSourceFileAtPath(file)`. Walk AST:
   - Locate `import` declarations from `'vitest'`; record imported names.
   - Find any `CallExpression` with property access `vi.*`. If found, mark MANUAL-FIX-REQUIRED with the api-list.
4. If AUTO-CONVERTIBLE:
   - Rewrite the vitest import to the two node:test imports (only emit names actually used in body).
   - Rewrite `it(` call sites to `test(` via `Identifier.replaceWithText`.
   - For each `expect(arg).matcher(args)`, dispatch on `matcher` name; rewrite per §1.2 table. Use ts-morph `CallExpression.replaceWithText(newCode)`.
   - Save file: `sourceFile.saveSync()`; then prettier format; then rename `.test.ts` / `.spec.ts` → `.node.test.ts`.
5. If MANUAL-FIX-REQUIRED: append report row; leave file alone.
6. Exit 0 if `manualFixCount === 0`, else 1.

### 3.3 API Contract

CLI only.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Golden-fixture tests | 6 | One per scenario in §2.1 |
| Idempotency | 1 | Re-run produces no diff |
| Exit code | 2 | 0 on all-auto, 1 on any-manual |

### 4.2 Definition of Done

- [ ] Script + test merged.
- [ ] All 6 golden-fixture pairs pass.
- [ ] `ts-morph` added to cleargate-cli/package.json devDeps with correct version (verified via `npm view ts-morph version`).
- [ ] `npm run typecheck` + `npm test` green in cleargate-cli/.
- [ ] Smoke-run against a real cleargate-cli/test/ subdir produces expected diff.

## Existing Surfaces

- **Surface:** `cleargate-cli/scripts/backfill-sprint-reports.mjs` — sibling `.mjs` script; codemod follows the same shape (top-level argv parsing, no exports).
- **Surface:** `cleargate-cli/scripts/copy-planning-payload.mjs` — sibling `.mjs` script convention reference.
- **Surface:** `cleargate-cli/package.json` — devDeps; `ts-morph` is NOT currently present (Architect grep verified 2026-05-17). Adding it is a one-pkg change.
- **Surface:** `cleargate-cli/test/lib/lifecycle-reconciler-orphan.red.node.test.ts` — existing node:test file; reference output shape for the codemod.
- **Coverage of this story's scope:** ~40% — new script + new dep, but reuses scripts-directory convention.

## Why not simpler?

> See §1.7.

## Ambiguity Gate
🟢 Low — one open question on CI hook ownership; defaulted to STORY-028-08.
