# QA-Red Report: STORY-032-02

**Mode:** RED
**Story:** STORY-032-02 — Code-map page schema + git-SHA drift + 2k token budget
**Sprint:** SPRINT-32
**Worktree:** `.worktrees/STORY-032-02`

## Test Files Written

1. `cleargate-cli/test/wiki/code-map/page-schema.red.node.test.ts` (11 `it()` assertions)
2. `cleargate-cli/test/wiki/code-map/compile-page.red.node.test.ts` (17 `it()` assertions)

**Total: 28 test assertions across 2 files.**

## Baseline Fail Confirmation

Both files fail immediately at module resolution (ERR_MODULE_NOT_FOUND) because `page-schema.ts` and `compile-page.ts` do not exist yet. 2 test suite files fail = 2 baseline failures at file level.

## Coverage Map

| Gherkin Scenario (§2.1) | Test file | Test description |
|---|---|---|
| 1. Serialize skeleton → kind:code-map + source_shas + signatures | compile-page + page-schema | 4 assertions in Scenario 1 describe block |
| 2. Page within budget → no footer, no warning | compile-page | 2 assertions in Scenario 2 describe block |
| 3. Module Graph present, counted against budget | compile-page | 2 assertions in Scenario 3 describe block |
| 4. Drift: only changed package stale | page-schema | 3 drift assertions + 2 cross-checked in compile-page Scenario 4 |
| 5. Over-budget → footer + warning + exit 0 + no silent drops | compile-page | 5 assertions in Scenario 5 describe block |
| LANDMINE A: admin/ no deriveRepo() | compile-page | 1 dedicated describe block |
| LANDMINE B: source_shas keys are repo-relative | both files | 2 dedicated assertions (one per file) |
| Unit: serialize/parse round-trip | page-schema | 4 assertions in round-trip describe block |
| Unit: drift stale-vs-unchanged via injected GitRunner | page-schema | 4 assertions in drift describe block |
| Unit: estimateTokens determinism (chars/4) | page-schema | 2 assertions in estimateTokens describe block |
| Unit: TRUNCATION_PRIORITY_ORDER is exported | compile-page | 1 assertion in Scenario 5 |

All 5 §2.1 Gherkin scenarios covered. Both landmines have dedicated regression tests. Minimum counts from §4.1 met (5 unit + 5 acceptance).

---

## QA-VERIFY

**Mode:** VERIFY
**Dev commit:** b4a82153
**Worktree:** `.worktrees/STORY-032-02`
**QA run date:** 2026-05-29

### Scoped test run

Command: `tsx --test test/wiki/code-map/page-schema.red.node.test.ts test/wiki/code-map/compile-page.red.node.test.ts`

Result: 28 passed, 0 failed, 0 skipped, 0 cancelled. Exit 0.

### Typecheck

`npm run typecheck` — exit 0, no errors.

### Full suite

`npm test` — 2238 tests total; 2048 passed, 134 failed, 56 cancelled.

Pre-existing failures confirmed unrelated to this commit (AdminApiClient, snapshot-drift, acquireAccessToken, FileTokenStore, CHANGELOG.md format, --help commands). Commit b4a82153 adds ONLY `compile-page.ts` and `page-schema.ts`; no touched file overlaps with any failing suite.

Zero failures in code-map tests.

### Gherkin scenario coverage

| Scenario | Tests covering it | Result |
|---|---|---|
| 1. Serialize skeleton → kind:code-map + source_shas + signatures | compile-page.red Scenario 1 (4 assertions) | PASS |
| 2. In-budget render: no footer, no warning | compile-page.red Scenario 2 (2 assertions) | PASS |
| 3. Module Graph in body, counted against 2k budget | compile-page.red Scenario 3 (2 assertions) | PASS |
| 4. Drift rebuilds only changed package | page-schema.red driftCheck (3 assertions) + compile-page.red Scenario 4 (2 assertions) | PASS |
| 5. Over-budget: footer + warning + exit 0 + no silent drops | compile-page.red Scenario 5 (5 assertions) | PASS |

### DoD checklist

- [x] source_shas populated exclusively via getGitSha (compile-page.ts:84 — `getGitSha(relPath, runner) ?? ''`; no content hash)
- [x] Hard 2k budget enforced: footer appended, console.warn emitted, no throw (enforceTokenBudget never calls process.exit)
- [x] LANDMINE A: no deriveRepo() call in compile-page.ts (grep confirms no import)
- [x] LANDMINE B: path.relative(repoRoot, modulePath) applied at compile-page.ts:83 before getGitSha and source_shas key assignment
- [x] TRUNCATION_PRIORITY_ORDER exported as auditable ReadonlyArray constant
- [x] estimateTokens uses Math.floor(text.length / 4) — deterministic, chars/4

STORY: STORY-032-02
QA: PASS
TYPECHECK: pass
TESTS: 28 passed, 0 failed, 0 skipped (scoped — red test files); 2048 passed, 134 failed, 56 cancelled (full suite — pre-existing baseline)
ACCEPTANCE_COVERAGE: 5 of 5 Gherkin scenarios have matching tests
MISSING: none
REGRESSIONS: none (134 full-suite failures are pre-existing; zero overlap with this commit's touched files)
VERDICT: All 5 §2.1 acceptance scenarios pass. Both M2 landmines (LANDMINE A: no deriveRepo(), LANDMINE B: path.relative before getGitSha) have dedicated passing regression tests. Typecheck clean. Full-suite failures are pre-existing and unrelated. Ship it.
flashcards_flagged: []
