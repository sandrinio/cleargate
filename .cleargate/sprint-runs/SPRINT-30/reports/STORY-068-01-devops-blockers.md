## Failure-Step

Step 6 (post-merge test verification) failed: 1 of 2 test scenarios in `cleargate-cli/test/commands/init-no-dep0190.node.test.ts` did not pass — the DEP0190 deprecation warning is still present in the `cleargate init` transcript after merge.

## Conflict-Files

N/A — merge itself succeeded cleanly (no git conflicts).

## Diagnostics

### Test command run
```
bash .cleargate/scripts/run_script.sh npx tsx --test cleargate-cli/test/commands/init-no-dep0190.node.test.ts
```

### Test result summary
```
▶ STORY-068-01: no DEP0190 + grep-gate npm script
  ✖ Scenario 1: fresh init produces clean transcript — no DEP0190 or DeprecationWarning (565ms)
  ✔ Scenario 2: check:no-shell-true-in-init npm script exists and exits 0 (374ms)
✖ STORY-068-01: no DEP0190 + grep-gate npm script
✖ failing tests:
✖ Scenario 1: fresh init produces clean transcript — no DEP0190 or DeprecationWarning
```

### Root cause

The DEP0190 warning fires AFTER the "[cleargate init] 🟢 cleargate CLI resolved via PATH (global install)" line in the transcript. This means the remaining `shell:true` spawn is in the PATH-probe / `which` resolution block of `init.ts` — either:

1. The `init.ts` fix in `3a151a89` patched one `spawnSync` call but a second `shell:true` site remains in the same file, OR
2. The globally-installed `cleargate` binary (used by the test via `spawnSync('cleargate', ['init'], ...)`) is an older pre-fix version that still uses `shell:true`. The test invokes the binary on `$PATH`, not the local compiled version.

The warning appears after the identity-probe line ("Participant identity: ..."), which is the `cleargate doctor --session-start` or identity-resolution spawn inside `init.ts`. This spawns the `cleargate` binary via `shell:true`.

### Evidence from test assertion
```
AssertionError [ERR_ASSERTION]: Expected no DEP0190 in transcript but found:
[cleargate init] 🟢 cleargate CLI resolved via PATH (global install)
[cleargate init] Participant identity: sandrinio@users.noreply.github.com (inferred)
[cleargate init] Done. ...
(node:20066) [DEP0190] DeprecationWarning: Passing args to a child process with shell:true ...
```

The warning arrives on stderr after the "Done." log line — the spawn that triggers it is the one resolving the CLI path or running post-init commands, NOT the initial init execution.

### Merge state
- Merge commit `6195edfa` was created successfully on `sprint/S-30`.
- 4 files changed, 164 insertions(+), 3 deletions(-).
- The merge commit exists on `sprint/S-30` and MUST be reverted by the orchestrator before re-dispatching Developer to fix the root cause.

### Required action by orchestrator / human
1. Revert or reset the merge commit `6195edfa` from `sprint/S-30` (use `git revert 6195edfa` — do NOT force-push or `--hard` reset without explicit approval).
2. Re-dispatch Developer on `story/STORY-068-01` (branch still exists) to identify and fix the remaining `shell:true` spawn site (likely the identity-probe / post-init spawn in `init.ts`, not the PATH-probe that was already fixed).
3. Re-run QA, then re-dispatch DevOps for a fresh merge cycle.

### Worktree and branch state
- Worktree `.worktrees/STORY-068-01`: NOT removed (halted at Step 6, before Step 7).
- Branch `story/STORY-068-01`: NOT deleted (halted at Step 6, before Step 8).
- State transition: NOT performed (halted at Step 6, before Step 9).
