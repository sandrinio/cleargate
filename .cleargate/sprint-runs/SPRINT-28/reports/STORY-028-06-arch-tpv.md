---
role: architect
mode: TPV
story_id: STORY-028-06
sprint_id: SPRINT-28
date: 2026-05-18
verdict: APPROVED
---

# TPV Report — STORY-028-06 cli-vitest-conversion.red.node.test.ts

**Verdict:** `TPV: APPROVED`

## Scope of verification

TPV is wiring-only (per `.claude/agents/architect.md` Mode: TPV). Verified the five
required checks on `cleargate-cli/test/scripts/cli-vitest-conversion.red.node.test.ts`
in worktree `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-028-06/`.

## Five-point check

### 1. Imports resolve — stdlib only ✅
All six imports are Node stdlib + tsx-loaded TypeScript:
- `node:test` (`describe`, `it`)
- `node:assert/strict` (default export `assert`)
- `node:fs` (`* as fs`)
- `node:path` (`* as path`)
- `node:child_process` (`spawnSync`)
- `node:url` (`fileURLToPath`)

No third-party imports, no project-relative imports. No resolution risk.

### 2. Grep / spawn invocation shapes ✅
Three patterns used; all sound for cleargate-cli/ scope with the two new exclusions.

**Path resolution.** `CLI_ROOT = path.resolve(__dirname, '..', '..')` — given file
lives at `cleargate-cli/test/scripts/`, this resolves to `<worktree>/cleargate-cli/`.
Verified by `ls` — `cleargate-cli/examples/` and `cleargate-cli/test/fixtures/` both
exist where expected.

**Main repo root.** `git rev-parse --git-common-dir` from `__dirname` correctly returns
`/Users/ssuladze/Documents/Dev/ClearGate/.git` (worktrees share `.git` via common-dir).
`MAIN_REPO_ROOT = path.dirname(gitCommonDir)` → `/Users/ssuladze/Documents/Dev/ClearGate`.
Dev-report path resolves to `…/sprint-runs/SPRINT-28/reports/STORY-028-06-dev.md`.
Confirmed by execution: T6's error message prints the absolute path correctly.

**T3 grep — `from 'vitest'` exclusion shape.**
```
grep -r --include="*.ts" -l "from 'vitest'|from \"vitest\"" src test scripts
  | grep -v "/examples/"
  | grep -v "/test/fixtures/"
  | wc -l
```
Verified empirically: 151 unfiltered → 141 after exclusions. `/examples/` contributes
0 hits (examples are Red CODEMOD INPUT for the manual-fix flow, not vitest tests
themselves); `/test/fixtures/` contributes 10 hits (codemod scenario `input.vitest.test.ts`
files). Both exclusions land correctly.

**T4 grep — `vi.*` mock pattern exclusion shape.**
Same shell-pipeline shape with `-E` regex. Verified: 22 hits in scope after exclusions
(matches the test docstring baseline of 22 exactly), 4 hits in fixtures correctly excluded.

**T5 find — `*.node.test.ts` counts.**
```
find "$testDir" -name "*.node.test.ts" | grep -v "fixtures" | wc -l
```
Verified: 41 pre-existing `*.node.test.ts` in `cleargate-cli/test/` (excl fixtures).
Threshold `>= 187` correctly demands 138 additional files post-conversion.
T5-zero-pure-vitest counts: `*.test.ts` total = 178, `*.node.test.ts` = 41 →
pure vitest remaining = 137, `*.spec.ts` = 0. Matches T5 docstring numbers.

**T1 / T2a / T2b / T6.** Synchronous filesystem checks via `fs.existsSync` and
`JSON.parse(fs.readFileSync(...))`. Path joins all use `CLI_ROOT` or
`MAIN_REPO_ROOT` — no relative-path traps. T2b correctly asserts three
sub-conditions (`--test-concurrency=1`, `--experimental-test-module-mocks`, no
`vitest` substring) — inherits STORY-028-05's baseline test-script shape.

### 3. Mocked methods — N/A ✅
No `t.mock.method()` / `mock.module()` calls. Tests are pure repo-state assertions
over filesystem + grep output.

### 4. After-hooks — N/A ✅
No `before`/`after` hooks. All tests are read-only assertions; no state mutation
in setup/teardown. `delete env['NODE_TEST_CONTEXT']` is local to each spawn call
(operates on a copy of `process.env`), not a global mutation.

### 5. File naming `*.red.node.test.ts` ✅
Filename: `cli-vitest-conversion.red.node.test.ts`. Matches CR-043 immutability
naming. Header docstring includes `IMMUTABILITY: sealed post-Red per CR-043` notice.

## Baseline execution proof

Executed `npx tsx --test test/scripts/cli-vitest-conversion.red.node.test.ts` in the
worktree's `cleargate-cli/` directory:

```
ℹ tests 8
ℹ suites 6
ℹ pass 0
ℹ fail 8
```

Matches the dispatched RED contract of 8/0 baseline. Each fail produces a useful
assertion message naming the file/path/count that triggered the failure.

## Exclusion-pattern soundness assessment

The dispatch asked specifically: confirm `examples/` and `test/fixtures/` exclusions
are sound, and confirm `cleargate-cli/test/fixtures/codemod-vitest/scenario-NN/input.vitest.test.ts`
files do NOT contribute to T3/T4/T5 counts.

**Empirical verification.**

| Check | Without exclusions | With exclusions | Excluded by examples/ | Excluded by fixtures/ |
|---|---|---|---|---|
| T3 (`from 'vitest'`) | 151 | 141 | 0 | 10 |
| T4 (`vi.*` patterns) | 26 | 22 | 0 | 4 |
| T5 (`*.test.ts` find) | (uses `grep -v fixtures` inline) | 178 | n/a | included in inline filter |

The 10 fixture files excluded from T3 and 4 from T4 are exactly the codemod-vitest
scenario `input.vitest.test.ts` + similar fixture-pair inputs. T5's `find … | grep -v
fixtures` shape filters them inline. Examples/ contributes 0 hits in either grep — they
are Red CODEMOD INPUTS that demonstrate what vitest looks like (no actual `from 'vitest'`
import in the listed examples I inspected; if any were to be added later they'd be
filtered by the exclusion regardless).

**Risk: `examples/` exclusion is silently a no-op today.** If a future story adds a
vitest-importing example file under `cleargate-cli/examples/`, this Red would
continue to ignore it. That is consistent with STORY-028-05's pattern (examples are
intentionally outside scope of conversion) and matches the docstring exclusion
rationale. No change requested.

**Minor docstring drift (not a wiring issue):** The header says "Total BASELINE_FAIL:
7 tests" but actual baseline = 8 fails (T5 contains two `it` blocks). The dispatch
says 8/0 and that is what runs. Docstring is comment-only; no impact on TPV.

## Conclusion

All five wiring checks pass. Exclusion patterns for `examples/` and `test/fixtures/`
are correctly shaped and empirically verified to filter the intended files. Baseline
execution matches the dispatched 8/0 RED contract. No wiring gaps.

`TPV: APPROVED`
