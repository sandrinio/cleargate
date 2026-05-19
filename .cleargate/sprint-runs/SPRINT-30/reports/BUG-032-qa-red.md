# QA-Red Report — BUG-032

**role: qa**
**sprint:** SPRINT-30
**story:** BUG-032
**date:** 2026-05-19
**mode:** RED

## Result

QA-RED: WRITTEN
RED_TESTS: cleargate-cli/test/lib/close-sprint-backsync.red.node.test.ts
BASELINE_FAIL: 6 (out of 11 test cases across 4 test groups)
RECONCILE_SUBCOMMAND_EXISTS: no (the `reconcile-lifecycle` subcommand exists, but `--retroactive` flag is absent)

## Baseline Run Output

```
11 tests, 5 pass, 6 fail

FAILING:
  Test 1 (3 failing): story file not moved to archive, frontmatter status not Completed, approved not set to true
  Test 2 (2 failing): story file not moved to archive, frontmatter status not Completed
  Test 4 (1 failing): --retroactive not present in sprint.ts reconcileLifecycleCliHandler

PASSING (regression guards, already working):
  Test 3 (3 passing): close exits 1 on non-terminal story, stderr names STORY-TEST-01, file unchanged in pending-sync
  Test 1/Test 2 exit-0 checks (2 passing): close exits 0 when all stories are Done
```

## Root Cause Notes (for Dev dispatch)

Two distinct failure modes confirmed during Red authoring:

**Case A (Test 1):** `status: Draft, approved: false` stories are never flipped.
Step 2.6b only detects cross-sprint orphans (items done in OTHER closed sprints).
No step flips same-sprint story frontmatter for the sprint being closed.

**Case B (Test 2):** `status: Approved, approved: true` stories also not flipped.
Same root cause as Case A — close_sprint.mjs has no same-sprint story backsync step at all.
The SPRINT-02 regression (commit aa70962) is confirmed as a separate manifestation of the
same missing step, not a distinct predicate bug.

**Case A and Case B are the SAME root cause:** `close_sprint.mjs` has no Step 2.6b logic
that auto-flips individual STORY frontmatter for the sprint being closed.
`reconcileCrossSprintOrphans` in lifecycle-reconcile.ts explicitly EXCLUDES the active sprint
(reads `.active` sentinel and skips matching sprint dirs). So the "approved predicate filter"
hypothesis was partially correct (Case A) but the real issue is deeper: even approved items
in the CURRENT sprint get zero backsync (Case B).

## Test 4 Disposition (BLOCKED)

`cleargate sprint reconcile-lifecycle --retroactive` does not exist.
`cleargate-cli/src/commands/sprint.ts` `reconcileLifecycleCliHandler` accepts
`{ sprintId, since, until, parents }` — no `retroactive` field.
Test 4 is a sentinel fail: it reads sprint.ts and asserts `/retroactive/` matches.
Dev must add `--retroactive` to the handler before this test can be un-blocked.

## Wiring Soundness Checklist (§C.3.5)

- [x] Imports resolve: `node:test`, `node:assert/strict`, `node:fs`, `node:path`, `node:os`, `node:child_process`, `node:url` — all stdlib
- [x] No implementation source files imported (fixture-drive pattern only)
- [x] `spawnSync` drives `close_sprint.mjs` via `node` binary (not shell string)
- [x] `mkdtempSync` fixture with `afterEach` cleanup
- [x] File naming: `close-sprint-backsync.red.node.test.ts` matches `*.red.node.test.ts` pattern
- [x] `--assume-ack` use confined to test fixture (per CLAUDE.md)
- [x] All env seams set: CLEARGATE_REPO_ROOT, CLEARGATE_SPRINT_DIR, CLEARGATE_STATE_FILE, CLEARGATE_SKIP_LIFECYCLE_CHECK=1, CLEARGATE_SKIP_WORKTREE_CHECK=1, CLEARGATE_SKIP_MERGE_CHECK=1, CLEARGATE_SKIP_BUNDLE_CHECK=1
