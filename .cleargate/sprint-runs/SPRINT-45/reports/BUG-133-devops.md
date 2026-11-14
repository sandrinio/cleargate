# DevOps Report — BUG-133 (SPRINT-45)

## Merge Result
- cli main: cd54e93 -> 169480e (clean before merge, tip as expected)
- Branch: story/BUG-133 (be392bd) merged `--no-ff`, local only
- Diff stat: 6 files changed, 927 insertions(+), 74 deletions(-)
  (src/commands/upgrade.ts, src/lib/changelog.ts, 4 test files)

## Post-Merge Verification
Throwaway detached worktree at 169480e (node_modules symlinked), prebuild + typecheck + build all exit 0.
Full `npm test`, TMPDIR=/private/tmp/s45t (a longer TMPDIR broke tsx's IPC socket, EINVAL): 5417 tests, 5414 pass, 1 fail, 2 skipped.
Baseline comparison against evidence/baseline-failures-dbccc79.txt: 1 failure NOT in the baseline:
- `cleans up even when the child throws after the scenario runs` (test/helpers/init-fixture-cleanup.red.node.test.ts, BUG-096) — ENOTEMPTY on rmSync of a /tmp/cg-s41-fix-fresh-* dir.
  Does not touch upgrade/changelog; no test/helpers diff in the merge; passes 3/3 when rerun alone. Looks like a flaky shared-/tmp race, not a regression. Reported, not fixed.
Failure list: evidence/suite-after-BUG-133.txt

## Mirror Parity
n/a. `git diff --stat cd54e93 169480e` has no `scaffold/` paths (src/ and test/ only).

## State Transition
Architect Passed -> Sprint Review -> Done, confirmed in state.json (qa_bounces 0, arch_bounces 0).

## Cleanup
- Throwaway verify worktree: node_modules unlinked, removed.
- Item cli worktree and outer host: both `git status --porcelain` empty; node_modules symlink removed, both worktrees removed.
- Branch story/BUG-133: deleted (was be392bd).
- cli main checkout: clean at 169480e. No dist rebuild, no push.

## Script Incidents
None. (First suite attempt failed on the over-long TMPDIR; an environment issue, not a script incident.)
