role: architect

# STORY-058-13 Architect post-flight DELTA RE-CHECK (B1 fix)

```
VERDICT: PASS
REVIEWED: cli story/STORY-058-13 fix commit f33cc4a (parent 5594a41, the INTEGRATE merge of cli main f0c33f7);
          outer .worktrees/STORY-058-13 @ d6c5264e (unchanged by this re-check, read only)
BLOCKING FINDINGS: none
```

**Scope.** Per §8 of `reports/STORY-058-13-arch.md`, this re-check covers only the delta introduced by the Developer's B1
fix commit `f33cc4a`. Everything else in that report (conformance, goal-condition integrity, deviation rulings, Claude-path
untouched, F10 step-L readiness) stays valid and is not re-litigated here.

**Method.** Read-only on `<cw>` (`git show`/`diff`/`log`); the concurrent QA-Verify lane was left untouched — no build, no
`npm` script, no test ran inside `<cw>`. All execution (build, typecheck, sealed tests, the re-grade probe) ran in a
`--no-hardlinks` clone at `/private/tmp/cg-s41-pf13b-20260927T002717Z/cli`, checked out to `f33cc4a`, with `node_modules`
symlinked from the cli main checkout. Deleted by exact path at the end; nothing else was created (no clean-room container,
no codex binary, no harness run).

## 1. `git show f33cc4a --stat` — file scope and hunk content

`f33cc4a --stat` touches exactly one file: `scripts/clean-room/loop-evidence.mjs`, `+18/-4`. `git diff 7a7bfa6 f33cc4a`
(build tip → fix tip) is the merge of main's BUG-098/BUG-099 delta (24 files, unchanged from the INTEGRATE) plus this same
one-file hunk — matches the item-1 preamble exactly.

The hunks implement PF13-A1 precisely:
- **`mergeVerdict`**: a new guard `if (typeof loop.rootThreadId !== 'string' || loop.rootThreadId === '') return fail('no
  root thread id: the orchestrator-forbidden patterns cannot be checked');` is inserted immediately before the
  `ROOT_FORBIDDEN` scan (`git merge` / `worktree remove` / `branch -d` — unchanged, still scanned after the guard).
- **`terminalStateVerdict`**: the old unconditional-root-`update_state.mjs` ban is replaced. A `rootThreadId` guard mirrors
  the merge one (`'no root thread id: the orchestrator-forbidden Done transition cannot be checked'`). Root `update_state.mjs`
  commands are collected into `rootStateCmds`; only the subset matching `isDoneStateCommand` (the same helper the
  devops-thread check already used) FAILs, via `rootDone`. Any other root `update_state.mjs` command (non-empty
  `rootStateCmds`) is appended to the PASS detail as `; orchestrator update_state (recorded, playbook-prescribed): <n>` —
  never FAILed. The devops-thread `Done` requirement is untouched.
- **`renderLoopRunSection`**: a local `trimmed = (x) => (typeof x === 'string' ? x.trim() : x)` helper is applied only to
  `pathIdentity.hookSide`/`roleShell` inside the `- cleargate resolved:` render line. Verdict inputs are not touched
  (confirmed structurally — the trim call sits only inside the string-building `lines.push(...)`, nothing upstream of it
  in the verdict functions was touched).

This is functionally identical to the arch §6 reference patch (the trim is implemented as one shared helper applied twice
rather than two inline ternaries — a stylistic, not semantic, difference).

## 2. Numstat equivalence and no test-file drift

- `git -C <cw> merge-base --is-ancestor f0c33f7 f33cc4a` → yes; cli `main` is unmoved at `f0c33f7`.
- `git diff --numstat f0c33f7 f33cc4a` (sorted) vs `git diff --numstat 9a94ff2 7a7bfa6` (sorted, the reviewed build delta):
  **25 rows each, identical except one**: `scripts/clean-room/loop-evidence.mjs` is `948→0` (new file, build-only) in the
  build list and `962→0` in the tip list. `962 = 948 + 18 - 4`, exactly the fix commit's own numstat. Every other row
  (test files, fixtures, `codex-appserver.mjs`, `codex-hooks.mjs`, `mock-responses.mjs`, `verify-install.ts`, etc.)
  matches byte-for-byte between the two lists.
- `git diff --name-only f0c33f7 f33cc4a -- test` lists the 6 build-owned test files (`verify-install-codex-{cli,shape}`,
  `verify-install-codex.red`, `codex-loop.red.integration`, `codex-loop-evidence.red`, `codex-loop-harness.red`) — the same
  set present in the original build delta. No new or modified test file.
- `git diff --name-only 5594a41 f33cc4a` (INTEGRATE tip → fix tip) returns exactly one path:
  `scripts/clean-room/loop-evidence.mjs`. `git diff --name-only 5594a41 f33cc4a -- test` is empty.

Both numstat checks and the file-list check hold exactly as PF13-A3 specifies.

## 3. Re-grade probe (scratch clone's own `loop-evidence.mjs` at `f33cc4a`)

Fed the Run 2 `inputs.json` (`/Users/ssuladze/Documents/Dev/cg-cleanroom-20260927T001250Z-13run2/evidence/inputs.json`,
read only) through the fixed clone's `codexLoopVerdicts`:

| Case | Result |
|---|---|
| As recorded | `loop_transport PASS · enforcement_parity PASS · result PASS` (reproduces `summary.json`) |
| + root `update_state.mjs STORY-001-01 'QA Passed'` | **PASS**, terminal-state detail gains `; orchestrator update_state (recorded, playbook-prescribed): 1` |
| + root `update_state.mjs STORY-001-01 Done` | **terminal-state FAIL** → `loop_transport FAIL` → `result FAIL`, detail `the orchestrator (root thread) ran the DevOps-owned Done transition: …` |
| `rootThreadId` deleted | **`codex.loop.merge` FAIL** (`no root thread id: the orchestrator-forbidden patterns cannot be checked`) and **`codex.loop.terminal-state` FAIL** (`no root thread id: the orchestrator-forbidden Done transition cannot be checked`) |

All four match the §8 probe spec exactly, and match the Developer's own PF13-A1 fix report (`STORY-058-13-dev-b1.md`)
row-for-row on this same Run 2 input.

**§2.2 rows 5, 6, 12, 13, 14 — no-regression re-run.** I built a side-by-side pre-fix/fixed comparison: the pre-fix module
is `git show 5594a41:scripts/clean-room/loop-evidence.mjs` (the INTEGRATE tip, before the B1 commit), placed alongside the
fixed file in the same scratch directory so its two relative imports (`./evidence.mjs`,
`../../scaffold/core/.cleargate/scripts/launch_wave.mjs`) resolve unchanged. A whole-file `diff` of pre-fix vs fixed shows
**exactly the three hunks in §1 above and nothing else** — `controlVerdicts`, `dispatchesVerdict`, `codexHookVerdicts`
(imported from `evidence.mjs`, itself untouched per `git show f33cc4a --stat`), `worktreeVerdict`'s non-merge logic, and
every other verdict function are byte-identical. That is a structural proof that rows 5, 6 and the non-merge/non-terminal-
state parts of rows 12–14 cannot regress. I then reproduced the specific mutations behaviourally on both modules:

| Row | Mutation (on Run 1's real `inputs.json`) | Pre-fix | Fixed | Match |
|---|---|---|---|---|
| 5 | `controls.turns.C3` preToolUse hook-run notifications stripped, `controls.c3.probeExists=false` | `codex.live.edit-deny` INCONCLUSIVE → `enforcement_parity` INCONCLUSIVE → `result` FAIL | identical | yes |
| 6 | `controls.turns.C5` preToolUse hook-run + `subAgentActivity` notifications stripped | `codex.live.dispatch-deny` INCONCLUSIVE → `result` FAIL | identical | yes |
| 12 | devops identity line + its `subAgentActivity` notifications + rollout removed (devops dispatch fully absent) | `dispatches` FAIL (`… lacks the ordered … devops`), `merge` FAIL (`no git merge ran on the devops thread`), `terminal-state` FAIL (no devops `Done`), `loop_transport` FAIL | identical | yes |
| 13 | the devops merge command's `threadId` rewritten to `rootThreadId` | `merge` FAIL (`the orchestrator (root thread) ran git merge: …` — caught by the still-intact `ROOT_FORBIDDEN` scan before the "no git merge on devops" branch is even reached) | identical | yes |
| 14 | `loop.mergeCommit = {}` | `merge` FAIL (`no merge commit on sprint/S-01`) | identical | yes |

Zero rows differ between pre-fix and fixed on any of the 17 gating ids, `loop_transport`, `enforcement_parity`, or
`result`, across all five mutations plus the unmutated Run 1 baseline. No regression.

## 4. Sealed suite (scratch clone, solo `npm run test:file`, counted from `ℹ` lines)

- `test/scripts/codex-loop-evidence.red.node.test.ts`: **43/43** (`tests 43 · pass 43 · fail 0`). Notably Test 15.12
  (`update_state ... Done ran on the root thread, not devops -> codex.loop.terminal-state FAIL`) and Tests 15.25/15.26
  (the two INCONCLUSIVE overlays) already sit in the sealed suite and pass unchanged against the new code — consistent
  with the §3 re-grade above.
- `test/scripts/codex-loop-harness.red.node.test.ts`: **21/21** (`tests 21 · pass 21 · fail 0`), run for extra assurance
  though not strictly required by item 4 — it exercises `codex-loop.mjs` and `codex-hooks.mjs`, neither touched by the fix.
- `npm run typecheck` (`tsc --noEmit`): exit 0, no output.

Both counts match D4's unchanged 3653/3651/0/2 (no test added or removed by the fix commit).

## 5. `scripts/clean-room/**` is outside `ARTIFACT_INPUT_PATHS`

`scripts/clean-room/evidence.mjs:48-57` defines `ARTIFACT_INPUT_PATHS = ['src', 'scaffold', 'package.json',
'tsup.config.ts', 'tsconfig.json', 'scripts/copy-planning-payload.mjs', 'scripts/build-manifest.ts',
'scripts/build-codex-payload.mjs']`. `scripts/clean-room/**` (where the fix commit's only file lives) is not in this list
and is not a subpath of any listed entry. `computeArtifactInputs` (`evidence.mjs:679`) hashes only these paths, so the fix
commit does not move `artifactInputs`. Run 2's recorded `990c4bd5…` stays current, and `codex-loop.mjs check` on the fix
tip is expected to report only "needs a live human-trust PASS run on the final artifact inputs" (already confirmed by the
Developer's own post-commit `check` output in `STORY-058-13-dev-b1.md`, which this re-check did not need to reproduce
since it makes no artifact-input claim of its own).

Step L readiness: READY (pending QA-Verify PASS, OD1, RS-4L).

## Script Incidents

None. `run_script.sh` was not invoked.

## Cleanup

- Scratch clone `/private/tmp/cg-s41-pf13b-20260927T002717Z` (the fix-tip clone, the pre-fix comparison file, and the
  three probe scripts) deleted by exact path.
- No clean-room container was created. Run 1 (`cg-cleanroom-20260926T232955Z-13run1`) and Run 2
  (`cg-cleanroom-20260927T001250Z-13run2`) were only read (`evidence/inputs.json`, `evidence/summary.json`).
- `<cw>` (`.worktrees/STORY-058-13/cleargate-cli`): read-only; ends clean at `f33cc4a` (untouched by me).
- `<ow>` (`.worktrees/STORY-058-13`): read-only; ends at `d6c5264e` with the same 2 pre-existing uncommitted files
  (`clean-room-verification.md` M, `codex-loop-evidence.md` ??), untouched by me.
- No `git stash`, `reset`, commit, or ref move. `plans/M6.md` was not edited.

```yaml
flashcards_flagged: []
```
