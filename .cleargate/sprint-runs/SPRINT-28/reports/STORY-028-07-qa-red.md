# STORY-028-07 QA-Red Report

**Story:** STORY-028-07 — Convert `admin/` Test Suite to node:test + Verify Svelte Compat
**QA Phase:** RED
**Date:** 2026-05-18
**Agent:** QA (role: qa)
**Worktree:** `.worktrees/STORY-028-07` on branch `story/STORY-028-07`

## Red Test File Written

`cleargate-cli/test/scripts/admin-vitest-conversion.red.node.test.ts`

## Baseline Counts (captured 2026-05-18 before conversion)

| Metric | Value |
|---|---|
| Pure vitest `*.test.ts` files in `admin/tests/unit/` | 34 |
| Existing `*.node.test.ts` files in `admin/` | 0 |
| Files with `from 'vitest'` import | 34 |
| Files with `vi.*` mock patterns (incl. hoisted, .svelte) | 21 |
| `admin/vitest.config.ts` | EXISTS |
| `test` script | `vitest run --config vitest.config.ts` |
| `@testing-library/svelte` | `^5.2.7` (present, must be retained) |

## Baseline Run Result

Runner: `bash .cleargate/scripts/run_script.sh npx tsx --test cleargate-cli/test/scripts/admin-vitest-conversion.red.node.test.ts`

```
tests 10
pass 1
fail 9
```

## Per-Test Fail Status

| Test | Status | Reason |
|---|---|---|
| T1: vitest.config.ts absent | FAIL | `admin/vitest.config.ts` exists (954 bytes) |
| T2a: vitest devDep absent | FAIL | `"vitest": "^2.1.0"` present in devDeps |
| T2b: test script no vitest (part 1) | FAIL | Script is `vitest run --config vitest.config.ts` |
| T2b: test script node:test (part 2) | FAIL | Script contains neither `--test` nor `tsx` |
| T2c: @testing-library/svelte retained | **PASS** (vacuous) | Library IS present today — retention guard |
| T3: no vitest imports | FAIL | 34 files import from `'vitest'` |
| T4: no vi.* patterns | FAIL | 21 files contain `vi.*` mock patterns |
| T5a: *.node.test.ts count >= 34 | FAIL | 0 node.test.ts files found (need >= 34) |
| T5b: zero pure vitest *.test.ts remain | FAIL | 34 pure vitest files remain |
| T6: dev report exists | FAIL | `STORY-028-07-dev.md` does not exist |

**BASELINE_FAIL: 9 of 10 tests fail. T2c vacuous-passes (documented in test comment).**

## Notes

1. **T2c vacuous-pass documented:** The test asserts `@testing-library/svelte` must be RETAINED post-conversion. It passes today because the library IS present. It is a regression guard — if the Developer accidentally removes it during `npm install` cleanup, T2c will flip to FAIL. This is the intended behavior per story §1.2 step 5.

2. **vi.* count discrepancy:** Initial grep (`.ts` only, without `hoisted`) returned 18 files. Final test grep (`.ts` + `.svelte` + `hoisted` pattern) returns 21 files. The test uses the broader pattern — Developers must clear all 21 files.

3. **Test directory is `admin/tests/` (plural):** The story spec refers to `admin/test/` and `admin/src/` but the actual directory is `admin/tests/unit/`. The test searches the full `admin/` tree to handle both.

4. **`TokenIssuedModal.cr061.red.test.ts`:** This is a vitest-format Red test file from an earlier CR. It ends in `.red.test.ts` (not `.node.test.ts`) and will count as a residual vitest file for T5b until the Developer handles it (convert or retire).

5. **T2b split into two sub-tests:** Both must pass post-conversion. The test verifies the script does NOT contain `vitest` AND DOES contain a node:test invocation pattern.

## Gherkin Coverage

| Scenario (§2.1) | Test(s) |
|---|---|
| vitest.config.ts deleted, package.json clean, npm test green | T1, T2a, T2b, T2c |
| All 34 files converted (no vitest imports remaining) | T3 |
| All 34 files converted (no vi.* calls remaining) | T4 |
| All 34 files converted (file count >= 34) | T5a, T5b |
| Dev report attached | T6 |

Note: The "PREFLIGHT compat check" scenarios (Gherkin scenarios 1 and 2) are procedural — they test Developer behavior at preflight time, not repo state post-commit. These are not assertable via Red tests against repo state; they are covered by the Developer's manual escalation protocol and the dev report (T6 asserts the report exists, which implicitly confirms preflight ran).

## Wiring Soundness

- Imports: `node:test`, `node:assert/strict`, `node:fs`, `node:path`, `node:child_process`, `node:url` — all resolve.
- Path resolution: worktree-relative (`WORKTREE_ROOT = path.resolve(__dirname, '..', '..', '..')`) — verified against actual tree.
- `admin/` is in outer monorepo (NOT nested git repo) — resolved via worktree path, not git-common-dir.
- Dev report path resolves to main repo root via `git rev-parse --git-common-dir` — correct.
- No self-reference: test file lives in `cleargate-cli/test/scripts/`, grep scope is `admin/` — no exclusion needed for the grep, but `grep -v .red.node.test.ts` is applied defensively.
