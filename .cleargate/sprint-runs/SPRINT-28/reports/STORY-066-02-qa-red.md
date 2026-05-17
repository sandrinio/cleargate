# QA-Red Report — STORY-066-02

role: qa

**Mode:** RED  
**Story:** STORY-066-02 — Sprint-Close Step 2.6c + --parents CLI Flag  
**Sprint:** SPRINT-28  
**Date:** 2026-05-18  
**Agent:** QA (claude-sonnet-4-6)

---

## Result

```
QA-RED: WRITTEN
RED_TESTS:
  - cleargate-cli/test/scripts/close-sprint-step-2-6c.red.node.test.ts
  - cleargate-cli/test/commands/sprint-reconcile-lifecycle-parents.red.node.test.ts
FIXTURES:
  - cleargate-cli/test/fixtures/close-sprint-step-2-6c/auto-flip/        (EPIC-FXTRA + 3/3 Completed children)
  - cleargate-cli/test/fixtures/close-sprint-step-2-6c/halt-partial/     (EPIC-FXTRB + 2/3 Completed, 1 Approved)
  - cleargate-cli/test/fixtures/close-sprint-step-2-6c/halt-zero-children/ (EPIC-FXTRC + 0 children)
BASELINE_FAIL: 6  (out of 15 individual tests across 8 describe-blocks)
flashcards_flagged: []
```

## Baseline run summary

```
# tests 15  
# suites 8  
# pass   3  (mirror-parity scenario + 2 mirror sub-tests — intentional, see note)  
# fail   6  
# cancelled 6  (sub-tests inside assertCliBinExists-failed describe blocks)
```

### Passing at baseline (expected / intentional)

- **Scenario 5 — Mirror parity**: both `close_sprint.mjs` copies currently lack Step 2.6c → they match byte-for-byte → passes. This is a REGRESSION guard: diverges (fails) once Dev edits only one mirror during implementation. Same rationale as `close-sprint-step-7-4.red.node.test.ts` §Scenario 3.

### Failing at baseline

| # | Test | Fail reason |
|---|------|-------------|
| 1 | Scenario 1 — auto-flip: EPIC-FXTRA status rewritten | Step 2.6c absent → walkActiveParents not called → status stays Draft |
| 2 | Scenario 2 — auto-flip stdout log line | Step 2.6c absent → "Step 2.6c: EPIC-FXTRA…" never emitted |
| 3 | Scenario 2 — exit 0 on auto-flip | close_sprint exits non-zero for unrelated reason (missing REPORT.md naming) when 2.6c absent |
| 4 | Scenario 3 — halt-partial exit 1 | Step 2.6c absent → EPIC-FXTRB partial coverage undetected → exit 0 |
| 5 | Scenario 4 — halt-zero-children exit 1 | Step 2.6c absent → EPIC-FXTRC zero-children undetected → exit 0 |
| 6 | Scenario 4 — halt-zero-children output | Step 2.6c absent → no "halt-zero-children" in output |

CLI tests (all 3 describe blocks cancelled via assertCliBinExists guard):
- Scenario 1: `dist/cli.js` not built in worktree → `assertCliBinExists()` guard fires → FAIL
- Scenario 2: same guard fires, all 4 sub-tests cancelled
- Scenario 3: same guard fires

## Wiring soundness notes (TPV)

- Imports: node:test, node:assert/strict, node:fs, node:path, node:os, node:child_process — all stdlib, no missing modules
- Constructor signatures: `buildCloseSprintFixture(verdictFixture, sprintId)`, `buildCombinedFixture()`, `runCloseSprint(...)`, `runReconcileLifecycleParents(...)` — no external deps beyond stdlib
- After-hooks: `after(() => fs.rmSync(repoRoot, ...))` present in all `before`/`after` pairs
- Mocked methods: none — pure spawnSync against real scripts
- Naming: both files end `.red.node.test.ts` (immutable per CR-043)
- NODE_TEST_CONTEXT deleted in all child env spawns (FLASHCARD #node-test #child-process)

## Dev implementation notes

Step 2.6c test seam: `CLEARGATE_SKIP_LIFECYCLE_CHECK=1` skips Steps 2.6 and 2.6b but NOT 2.6c. The new step must NOT be gated by this env var. Step 2.6c should have its own skip seam only if isolation is needed in legacy test fixtures.

The auto-flip test (Scenario 2 exit-0 check) currently fails because close_sprint exits non-zero for an unrelated reason (missing REPORT.md). Dev should note: the `SPRINT-FX2_REPORT.md` is written by the fixture builder. If close_sprint reads the REPORT.md at a step that runs before 2.6c, the test may need adjustment — but the primary acceptance target (Scenario 1: frontmatter rewritten) is the authoritative check.
