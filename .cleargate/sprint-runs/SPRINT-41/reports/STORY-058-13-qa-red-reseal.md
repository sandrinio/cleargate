role: qa

# STORY-058-13 QA-Red RE-SEAL report

```
QA-RED: WRITTEN
RESEAL_APPLIED: cc65720bc57c6e2a5a9e943c2e7d855a89f9c7475ef843d55690fabd0e70c8f7
CLI_COMMIT: b91c39d
BASELINE_FAIL: 87 red (unchanged from sealed commit 1111659)
flashcards_flagged:
  - "2026-09-27 · #qa-red #test-harness #tmp · A $TMPDIR leak check needs a before/after delta on YOUR run — concurrent lanes leave same-prefix orphans."
```

## 3-point gate (all passed)

(a) `shasum -a 256 reports/STORY-058-13-tpv-reseal.patch` = `cc65720bc57c6e2a5a9e943c2e7d855a89f9c7475ef843d55690fabd0e70c8f7` — matches.

(b) `<cw>` (`.worktrees/STORY-058-13/cleargate-cli`) HEAD = `1111659` (full `1111659f8c6633b7a1e8c3a7fcdeb235ba5de72f`), branch `story/STORY-058-13`, `git status --porcelain` empty. `git apply --check` on the patch: clean.

(c) After `git apply` + staging exactly the patch's 3 paths, `git diff --cached --name-only` listed exactly 3 files, all under `test/`:
- `test/commands/verify-install-codex-shape.red.node.test.ts`
- `test/scripts/codex-loop-evidence.red.node.test.ts`
- `test/scripts/codex-loop-harness.red.node.test.ts`

Diff stat: `3 files changed, 294 insertions(+), 59 deletions(-)` — exact match to the TPV's `RESEAL_SCOPE` (+294/-59).

## Re-measurement at re-sealed tree (before commit)

**The 6 -13 files, run solo via `npm run test:file`:**

| File (TPV column) | Path | tests | pass | fail |
|---|---|---|---|---|
| shape | test/commands/verify-install-codex-shape.red.node.test.ts | 20 | 1 | 19 |
| CLI (int) | test/commands/verify-install-codex-cli.red.integration.node.test.ts | 2 | 0 | 2 |
| evidence | test/scripts/codex-loop-evidence.red.node.test.ts | 43 | 0 | 43 |
| harness | test/scripts/codex-loop-harness.red.node.test.ts | 21 | 0 | 21 |
| e2e (int) | test/e2e/codex-loop.red.integration.node.test.ts | 2 | 1 | 1 |
| -10 amend | test/commands/verify-install-codex.red.node.test.ts | 9 | 8 | 1 |

Totals: 97 tests, 10 pass, **87 fail** — matches TPV's `COUNTS_AFTER_RESEAL` exactly (default tier 20/43/21 = 84, +2 CLI-int +2 e2e-int(1 red, 1 diagnostic-skip pass) +1 red in the -10 amend's untouched-count-unchanged file = 87 red; anchors A-11 (shape Test 11, "the census … no temp dir is created") and the 8 untouched cases of the amended -10 file both stayed green, as did e2e's Part B diagnostic skip run without `CLEARGATE_CODEX_BIN`).

**Re-run of shape and harness a second time (methodology cross-check, same counts):** shape 20/1/19, harness 21/0/21 — identical to the first pass, confirming stability (no flake).

Every red confirmed **wiring-sound**: every import in all 6 files resolves against the real (pre-implementation) source tree; no `SyntaxError`, no "not a constructor", no missing-mock-method class of failure. All failures are the expected shape:

## Red reasons (verified against TPV's "Red reasons after the re-seal")

- **shape** — 19 `AssertionError`s against the real `HOST_VERIFIERS.codex` (today: 1 check, `codex.features-hooks`, instead of the eventual 8; `VerifyCtx`/`VerifyInstallOptions` lack `splitViewRoot`). Test 11 (the census anchor) and no other test passes. Matches.
- **CLI (int)** — Test 12 fails on `NOT CHECKED` listing `codex.live.loop-transport` (missing id) and the exit-code path; Test 13 fails on the two id-naming assertions (`hooks-wiring`, `roles`) not yet present. Matches "missing ids and the exit code".
- **evidence** — all 43 tests throw `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../scripts/clean-room/loop-evidence.mjs'` (module does not exist pre-implementation). Matches "43 × ERR_MODULE_NOT_FOUND".
- **harness** — a mix of `Error [ERR_MODULE_NOT_FOUND]` (`loop-script.mjs` absent), `TypeError: runLoopTurn is not a function`, and `AssertionError`s on `served` being undefined / missing exports. Matches "9 × ERR_MODULE_NOT_FOUND … runLoopTurn is not a function, and served undefined".
- **e2e (int)** — Test 22 (Part A) fails: the packed `--host codex` install's `verify-install --json` report does not yet list the 8 codex ids. Test 23 (Part B) is a `NOT RUN` diagnostic pass, since `CLEARGATE_CODEX_BIN` was intentionally left unset (no harness run, per the dispatch's Codex-credential constraints). Matches.
- **-10 amend** — the sole new failure is `[TPV R-VI2] a null snapshot skips all 8 codex ids, in pinned order` (a `deepStrictEqual` against a null-snapshot skip list the current handler doesn't yet produce). The other 8 pre-existing -10 cases (including Test 41, `codex.features-hooks`) stayed green, unchanged. Matches "the null-snapshot deepStrictEqual".

No wiring or syntax error was found in any of the 6 files; every failure is attributable to missing STORY-058-13 pass-A/pass-B implementation, consistent with the TPV's satisfiability finding (11 of the original 87 sealed assertions were unsatisfiable pre-reseal; all 11 are now re-sealed to measured shapes and fail for implementation-absence reasons like the rest).

## Leak check ($TMPDIR `cg-s41-13-*`)

The re-seal's `shape` and `harness` files each gained a file-scoped `TMP_DIRS`/`after()` cleanup pair (confirmed by reading the applied diff and the file source: `test/commands/verify-install-codex-shape.red.node.test.ts:104-113`, `test/scripts/codex-loop-harness.red.node.test.ts` equivalent).

An **absolute** count of `find $TMPDIR -maxdepth 1 -name 'cg-s41-13-*'` was non-zero throughout (10 dirs) — but these are stable, pre-existing orphans (unchanged mtimes/inodes across every run in this session), not new leaks: 4 `cg-s41-13-shape-*`, 4 `cg-s41-13-harness-*`, 2 `cg-s41-13-cli-payload-*` (the last from the un-patched CLI-integration file, out of this patch's scope). These predate this dispatch — most plausibly from a concurrent build/harness lane elsewhere on this shared machine running an unpatched or independent copy of these test files (consistent with the existing `#test-harness #concurrency` flashcards about `ps aux` cross-contamination on a busy box). This QA-Red dispatch created none of them (never touched `<cw>` before the gate checks) and did not delete them (exact-path-only deletion rule; these are not this dispatch's files to delete).

**Delta check (the methodology that actually answers "does the patch leak"):** ran each file a second time, comparing `find … | wc -l` immediately before vs. immediately after:
- shape: before = 4, after = 4, same 4 names/inodes/mtimes unchanged — **delta 0**.
- harness: before = 10 (all `cg-s41-13-*`), after = 10, the 4 `cg-s41-13-harness-*` names unchanged — **delta 0**.

Both files create-and-remove their own fresh temp dirs within a single process run without residue. The re-seal's cleanup fix is confirmed working; the 10 standing orphans are pre-existing background noise, not a regression from this patch.

## F8 anchor re-run (all match F8's cited counts)

| Anchor | Result |
|---|---|
| `test/commands/verify-install.red.node.test.ts` | 42/42 |
| `test/commands/verify-install-codex.red.node.test.ts` (the -10 amend, tabulated above) | 9/9 (8 green + 1 red) |
| `test/commands/verify-install-cli.red.integration.node.test.ts` | 5/5 |
| `test/scripts/codex-hooks-harness.red.node.test.ts` | 91/91 |
| `test/scripts/clean-room-evidence.red.node.test.ts` | 60/60 |
| `test/scripts/clean-room-baseline-coexistence.red.node.test.ts` | 24/24 |
| `test/scripts/dispatch-verdict-modes.red.node.test.ts` (-12 contract) | 5/5 |
| `test/scripts/dispatch-serial.red.node.test.ts` (-12 contract) | 8/8 |
| `test/scripts/dispatch-serial-cli.red.node.test.ts` (-12 contract) | 7/7 |
| `test/scripts/flashcard-gate-parity.red.node.test.ts` (-12 contract) | 14/14 |
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (M2 pair, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, compare-only) | 5/5 |
| `test/commands/init-host-parity.red.integration.node.test.ts` (M2 pair, same baseline) | 15/15 |

`npm run typecheck` exits 0 with the re-seal applied (tests are outside `tsconfig` `include`, so the re-seal's casts are not type-checked — matches the TPV's own note).

## Commit

`git -C <cw> commit` on `story/STORY-058-13`, new sha **`b91c39d`** (short; full `b91c39df4243e7a16ac9ebe2ef146dbab3f7eda3`) — 3 files changed, 294 insertions, 59 deletions. `cleargate-cli` has no pre-commit hook (rule 12); `--no-verify` was not used. `<ow>` (`.worktrees/STORY-058-13`) was untouched throughout — `git status --porcelain` empty before and after.

## Script Incidents

None. No `run_script.sh` invocation — all commands were direct `npm run test:file` / `git` / `shasum` calls inside `<cw>`, per the dispatch's own test-runner instructions. No Codex binary, `CODEX_HOME`, or harness script was invoked.

```yaml
flashcards_flagged:
  - "2026-09-27 · #qa-red #test-harness #tmp · A $TMPDIR leak check needs a before/after delta on YOUR run — concurrent lanes leave same-prefix orphans."
```
