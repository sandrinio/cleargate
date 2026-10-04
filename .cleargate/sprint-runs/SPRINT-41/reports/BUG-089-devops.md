# DevOps Report — BUG-089

Two-repo item (outer meta-repo + `cleargate-cli`), standard lane, two dispatch rounds: the first round's merges (`ebd70b09` outer / `19a8a0f` cli) hit a post-merge test regression (see `BUG-089-devops-blockers.md`); this round merges the rework fix and completes the pipeline to Done.

## Merge Result

### Round 1 (already landed — not redone, not reverted)
- Outer: `sprint/S-41` ← `story/BUG-089` — merge commit `ebd70b09`. One conflict in `.cleargate/wiki/log.md` (both sides appended at EOF), resolved keeping both blocks, sprint side first then story side.
- CLI: `main` ← `story/BUG-089` — merge commit `19a8a0f`. No conflicts, `ort` strategy, 9 files / 830 insertions(+) / 12 deletions(-).
- Post-merge full suite regressed (2694 pass / 1 fail — `test/docs/pin-placeholder-coverage.node.test.ts`, `.claude/hooks/pending-task-sentinel.sh` carried `__CLEARGATE_VERSION__` without a matching `pin-aware` manifest rule). Halted per contract; routed back to Dev/Architect.

### Round 2 (rework — this report)
- Outer: `sprint/S-41` ← `story/BUG-089` — merge commit **`a568864b`** — "merge(story/BUG-089): rework 1 reports and §4 amendment". Clean auto-merge, no conflicts (git resolved `.cleargate/wiki/log.md` itself this round — no manual intervention needed). 6 files changed, 188 insertions(+), 9 deletions(-).
- CLI: `main` ← `story/BUG-089-r1` — merge commit **`a2694e4`** — "merge(story/BUG-089-r1): pin-aware manifest rule for pending-task-sentinel.sh". Clean, `ort` strategy, 1 file changed (`scripts/build-manifest.ts`), 14 insertions(+).
- MANIFEST regeneration commit on `sprint/S-41`: **`cb711e54`** — "chore(BUG-089): regenerate canonical MANIFEST after merge" (`cleargate-planning/MANIFEST.json`, 6 insertions/6 deletions — `pending-task-sentinel.sh` sha256 + `overwrite_policy` flips from `always` to `pin-aware`, plus the two other BUG-089-touched files' sha256 refresh for `pre-edit-gate.sh` and `settings.json`).

## Post-Merge Tests

- Command: `cd cleargate-cli && npm test` (plain, not through `run_script.sh` — its `RUN_SCRIPT_ACTIVE` reentrancy would trip 17 wrapper tests).
- Test files run: full suite (939 suites).
- Result: **2698 tests, 2695 pass, 0 fail, 3 skipped** — matches the expected baseline exactly (Sprint Context Rule 14 baseline: 2683 + BUG-089's new tests = 2698/2695/0/3). `test/docs/pin-placeholder-coverage.node.test.ts` now passes (confirms the round-1 regression is fixed).
- Duration: ~207.8s (~3m28s) — verified live via `ps` CPU sampling mid-run (16-20% CPU on the active `node --test` child), not a hang.
- Exit code: 0.

## Dist Rebuild (boundary BD)

- `cd cleargate-cli && npm run build` (runs `prebuild` internally) — succeeded (ESM/CJS/DTS all built, `dist/MANIFEST.json` copied).
- Dist built from cli `main` at **`a2694e4`** (confirmed via `git -C cleargate-cli rev-parse --short HEAD` immediately after build).
- Signal checks:
  - `node cleargate-cli/dist/cli.js hook signal block --host claude` → exit **2** ✓
  - `node cleargate-cli/dist/cli.js hook signal allow --host claude` → exit **0** ✓

## Rule-14 Cleanup

Two full-suite/build runs each wrote timestamp/back-sync noise into the outer main checkout:
- After `npm test`: reverted `.cleargate/delivery/**` (29 pending-sync files touched by back-sync) and `cleargate-planning/MANIFEST.json` (only `generated_at` differed from the `cb711e54` commit — verified via `git diff` before reverting, no content/policy divergence) via `git checkout -- .cleargate/delivery cleargate-planning/MANIFEST.json`.
- After `npm run build` (which re-ran `prebuild`): `cleargate-planning/MANIFEST.json` again showed only a `generated_at` timestamp diff against `cb711e54` — reverted the same way.
- Remaining modified files in the outer checkout throughout: `.cleargate/sprint-runs/SPRINT-41/.session-totals.json` and `token-ledger.jsonl` (hook-written ledger files, expected, committed with this report).

## Mirror Parity Audit

Canonical vs live `/.claude/` (drift expected — live re-sync happens at orchestrator barrier B0, not performed by DevOps):
- `.claude/hooks/pending-task-sentinel.sh` — **drift detected**; live carries the pre-BUG-089 signal handling (bare `exit 1`, `TOOL_NAME == "Task"` only, no `--host` parsing, no BUG-068 Task|Agent matcher fix). Live re-sync needed via orchestrator B0 (not `cleargate init` — sprint-context Rule 10 routes live re-sync through boundary steps, not ad hoc `cleargate init`).
- `.claude/hooks/pre-edit-gate.sh` — **drift detected**; live still has bare `exit 1` and a hardcoded `HOOK_PIN="0.20.0"` (expected — live pins are version-substituted at install time, canonical carries the `__CLEARGATE_VERSION__` placeholder). Live re-sync needed via orchestrator B0.
- `.claude/settings.json` — **drift detected**; live matcher is `"Task"` (canonical: `"Task|Agent"`) and live hook commands lack the `--host claude` argument BUG-089 added. Live re-sync needed via orchestrator B0.
- `.cleargate/knowledge/cleargate-enforcement.md` vs `cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md` — `cmp` exit 0, **identical, clean**.

No auto-fix applied to any live file (out of DevOps scope; per dispatch, orchestrator handles B0 re-sync).

## State Transition

- Story state: `Done` (confirmed via `.cleargate/sprint-runs/SPRINT-41/state.json` → `stories.BUG-089.state === "Done"`, `updated_at: 2026-09-25T03:44:58.782Z`).
- Transitioned at: 2026-09-25T03:44:58.782Z (via `CLEARGATE_STATE_FILE=... bash .cleargate/scripts/run_script.sh node .cleargate/scripts/update_state.mjs BUG-089 Done`).

## Cleanup

- Worktree `.worktrees/BUG-089`: removed (`git worktree remove .worktrees/BUG-089`, confirmed absent from `git worktree list`).
- Branch `story/BUG-089` (outer): deleted.
- Branch `story/BUG-089` (cli): deleted.
- Branch `story/BUG-089-r1` (cli): deleted.

## Script Incidents

None from this DevOps round. (An unrelated stale incident file from an earlier targeted QA-rework test run — `cleargate-cli/.cleargate/sprint-runs/_off-sprint/.script-incidents/20260925T033553Z-9e4642d9e223.json`, capturing the same pin-placeholder failure pre-fix — was left untouched; it predates this dispatch and is not part of the DevOps merge/teardown surface.)
