# DevOps Report — BUG-117

role: devops · lane: fast (no arch.md by design) · QA report: PASS 8/8

## Merge Result
- Repo: cleargate-cli main checkout (local only, no push, no dist rebuild)
- Story branch: story/BUG-117 (af7d639) -> main (was dbccc79)
- Merge commit SHA: cd54e93
- Diff stat: 2 files changed, 46 insertions(+), 36 deletions(-) (src/lib/pricing.ts, test/lib/pricing.node.test.ts)

## Post-Merge Verification (throwaway cli worktree at cd54e93)
- `npm run prebuild` + `npm run typecheck`: exit 0.
- Full suite `npm test` (private TMPDIR), run 1, no dist in the throwaway tree (rule 16 forbids building dist in CLI main):
  tests 5393, pass 5334, fail 37, cancelled 20, skipped 2, duration 703s (~11.7 min).
  The failures were ~79 distinct test names that spawn `dist/cli.js` or scan `dist/` (ENOENT on dist). Environmental, not caused by the merge.
- Follow-up: `npm run build` inside the THROWAWAY worktree only, then re-ran all 95 test files that reference `dist` (test:file):
  tests 1712, pass 1628, fail 80, cancelled 0, skipped 4, 396s. All 79 names from run 1 are in this set and every one now passes or is in the baseline set below.
- Baseline at dbccc79 (second throwaway worktree, prebuild + build, same 95 files): tests 1712, pass 1628, fail 80, skipped 4. The failing-test-name set is IDENTICAL to the merged tip (diff empty). So all 80 failures are pre-existing, none new after the merge. They include the "Scenario N" close_sprint tests, BUG-067 chain, fixtures A/B, procedure-doc D1/D2 and similar; full names in the temp logs /tmp/s45-rerun.log and /tmp/s45-base.log.
- pricing tests (test/lib/pricing.node.test.ts): no failure in any run.
- Caveat: files not referencing `dist` were covered only by run 1 (no failures outside the dist set). The rule 17 known reds (canonical-live-parity 5d etc.) are not yet applicable (CR-120 not merged).
- Throwaway worktrees S45-verify-BUG-117 and S45-base-BUG-117: removed (node_modules symlinks removed first).

## Mirror Parity
n/a — BUG-117 touches no canonical scaffold.

## State Transition
- BUG-117: Architect Passed -> Sprint Review -> Done (confirmed in state.json; updated_at 2026-11-14T08:46:56Z)

## Cleanup
- Item cli worktree and outer host: `git status --porcelain` empty before teardown.
- node_modules and .claude symlinks removed; cli worktree .worktrees/BUG-117/cleargate-cli removed, then outer host .worktrees/BUG-117 removed.
- Branch story/BUG-117: deleted (was af7d639).
- cli main checkout: clean.

## Script Incidents
none
