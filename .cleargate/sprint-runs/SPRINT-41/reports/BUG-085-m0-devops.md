# DevOps Report — BUG-085 M0 Follow-Up

cli-only merge. BUG-085 itself stays open for its M3 wave — **no state transition performed** for BUG-085 (per dispatch instruction).

## M0 follow-up merge

- Repo: `cleargate-cli`, `main` ← `story/BUG-085-m0`.
- Merge commit: **`515dd3e`** — "merge(story/BUG-085-m0): hook tests target canonical hooks and the BUG-068/069 contracts". Clean, `ort` strategy, no conflicts. 3 files changed, 140 insertions(+), 69 deletions(-): `test/hooks/pre-tool-use-task.node.test.ts`, `test/hooks/token-ledger-attribution.node.test.ts`, `test/hooks/token-ledger-regression.node.test.ts` — test-only, repointed from live `.claude/` to canonical hooks and updated to the BUG-068/069 contracts.
- Prior `main` head: `a2694e4` (BUG-089 rework merge).

## Post-Merge Tests

- Command: `cd cleargate-cli && npm test` (plain, not through `run_script.sh`).
- Result: **2700 tests, 2697 pass, 0 fail, 3 skipped** — matches expected exactly (baseline 2698/2695/0/3 + 2 new tests from this test-only change).
- Duration: ~251.1s (~4m11s).
- Exit code: 0.

## Dist Rebuild (boundary BD)

- `cd cleargate-cli && npm run build` — succeeded.
- Dist built from cli `main` at **`515dd3e`** (confirmed via `git -C cleargate-cli rev-parse --short HEAD`).
- Signal check: `node cleargate-cli/dist/cli.js hook signal block --host claude` → exit **2** ✓

## Rule-14 Cleanup

Both the full-suite run and the build's internal `prebuild` step wrote `.cleargate/delivery/**` back-sync noise and a `generated_at` timestamp bump into `cleargate-planning/MANIFEST.json` in the outer main checkout. Verified via `git diff` each time that the MANIFEST diff was timestamp-only (no content/policy change — consistent with this merge being test-only) before reverting with `git checkout -- .cleargate/delivery cleargate-planning/MANIFEST.json`. Only `.cleargate/sprint-runs/SPRINT-41/.session-totals.json` and `token-ledger.jsonl` (hook-written ledger files) remain modified, committed with this report.

## Cleanup

- Branch `story/BUG-085-m0` (cli): deleted (`git branch -d`, was `86e339b`).
- cli checkout returned to the parked `story/BUG-067` branch after this report (per dispatch step 7).

## State Transition

None. BUG-085 remains open for its M3 wave; this dispatch covers only the M0 test-repoint follow-up merge.
