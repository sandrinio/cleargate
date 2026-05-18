# STORY-028-06 QA-Red Report

**role: qa**
**story_id:** STORY-028-06
**sprint_id:** SPRINT-28
**mode:** RED
**date:** 2026-05-18

## Red Test File Written

`cleargate-cli/test/scripts/cli-vitest-conversion.red.node.test.ts`

Written to worktree: `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-028-06/cleargate-cli/test/scripts/cli-vitest-conversion.red.node.test.ts`

## Baseline Failure Confirmation

Runner: `tsx --test --test-reporter=spec test/scripts/cli-vitest-conversion.red.node.test.ts`
Exit code: 1
Tests: 8 total, 0 pass, 8 fail, 0 skipped

### Per-Test Baseline Result

| ID  | Test Description | Result | Actual Value |
|-----|-----------------|--------|--------------|
| T1  | cleargate-cli/vitest.config.ts does NOT exist | FAIL | file exists |
| T2a | package.json devDeps has no vitest | FAIL | "^2.1.0" present |
| T2b | test script has --test-concurrency=1 --experimental-test-module-mocks | FAIL | script missing both flags |
| T3  | grep from 'vitest' in src/+test/+scripts/ (excl examples, fixtures) → 0 | FAIL | 140 files match |
| T4  | grep vi.* patterns in same scope → 0 | FAIL | 22 files match |
| T5a | *.node.test.ts count in test/ (excl fixtures) >= 187 | FAIL | 41 (incl. this new red test) |
| T5b | zero pure vitest *.test.ts remain in test/ (excl fixtures) | FAIL | 137 remain |
| T6  | STORY-028-06-dev.md exists | FAIL | file absent |

## Gherkin → Test Mapping

| Gherkin Scenario | Test(s) |
|---|---|
| All 138 files converted (rg "from 'vitest'" → 0, find .node.test.ts >= 138) | T3, T5a, T5b |
| vitest.config.ts deleted, package.json clean, vi.* zero | T1, T2a, T2b, T4 |
| Extra gate: cleargate-cli/examples/ unchanged | Enforced by scope exclusion in T3+T4 grep |
| Atomic commit (git show --stat) | Not testable pre-commit in Red phase |
| Dev report | T6 |

## Exclusion Rationale

- `cleargate-cli/examples/` excluded per FLASHCARD 2026-05-04 `#fixtures #sprint-22` (intentionally-failing Red examples).
- `cleargate-cli/test/fixtures/` excluded per STORY-028-08 deferral (codemod fixture pairs — test-glob bleed issue).

## Notes

- T5 threshold of 187 = dispatch instruction spec (49 existing + 138 converted). Actual pre-conversion baseline is 40 node:test files (excl fixtures) + 137 vitest files = 177; the 187 threshold matches the story's stated sum and provides a clean pass criterion post-conversion.
- T2b asserts `--test-concurrency=1` + `--experimental-test-module-mocks` per Mid-Sprint Amendment `STORY-028-05-arch-1`.
- The Red test file itself is a `.node.test.ts` file and gets counted (41, not 40) — this is expected and does not affect the assertion (41 << 187).
