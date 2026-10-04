role: qa

STORY-058-13

QA-RED: WRITTEN

cli commit: `1111659f8c6633b7a1e8c3a7fcdeb235ba5de72f` (branch `story/STORY-058-13`, cut from `contract/S-41-loop` fast-forwarded to `9a94ff2` per F6.1).

## Per-file table

| # | File | New/Amend | Tier | Tests | Pass | Fail | Red reason |
|---|---|---|---|---|---|---|---|
| 1 | `test/commands/verify-install-codex-shape.red.node.test.ts` | new | default | 20 | 1 | 19 | `codexVerifier.checks()` returns only 1 of the 8 pinned ids today; `VerifyCtx`/`VerifyInstallOptions` have no `splitViewRoot` field |
| 2 | `test/commands/verify-install-codex-cli.red.integration.node.test.ts` | new | integration | 2 | 0 | 2 | same (spawned CLI reports 1 codex id, not 8; missing `codex.live.loop-transport`) |
| 3 | `test/scripts/codex-loop-evidence.red.node.test.ts` | new | default | 43 | 0 | 43 | `scripts/clean-room/loop-evidence.mjs` does not exist (`ERR_MODULE_NOT_FOUND`, dynamic import per test) |
| 4 | `test/scripts/codex-loop-harness.red.node.test.ts` | new | default | 21 | 0 | 21 | `loop-script.mjs` absent; `runLoopTurn`/`listProjectHooks`/`readCodexRegistrations`/the 12 codex-hooks leaf exports absent from `mock-responses.mjs`/`codex-appserver.mjs`/`codex-hooks.mjs` |
| 5 | `test/e2e/codex-loop.red.integration.node.test.ts` | new | integration | 2 | 1 | 1 | Part A: only 1 of 8 codex ids reported. Part B: skipped (`t.diagnostic`, no `CLEARGATE_CODEX_BIN`) — counted as PASS, not red, per the -12 "deliberate skip" convention |
| 6 | `test/commands/verify-install-codex.red.node.test.ts` | amend | default | 9 (unchanged) | 8 | 1 | the null-snapshot case now expects 8 ids `skip` in pinned order; today only 1 `skip`s |

Totals: **default tier +84** (20+43+21), **integration tier +4** (2+2). Matches F8 exactly.

## Anchors

- **A-11** (`verify-install-codex-shape.red.node.test.ts`, "Test 11: read-only census"): green today — `runVerifyInstall` is already read-only end to end (pre-`-13` invariant), so the census-before/after and isolated-`TMPDIR` checks hold regardless of the codex-id count.
- **The amended -10 file's 8 untouched cases**: green — the 5 `codex.features-hooks` scenarios, the e2e install, the `report.live` 6-id check, and the no-`codex.no-verifier` check are all unaffected by the null-snapshot amendment.
- **Part B of the e2e file**: a deliberate skip (no `CLEARGATE_CODEX_BIN`), not an anchor and not a red — matches the "record 87" path the dispatch offered.

**Expected red at the seal: 87.** Measured: 19+2+43+21+1+1 = **87**. Confirmed by re-running all 6 files together in two batches (the 5 default/integration files: 95 tests, 86 fail/9 pass, exactly `19+2+43+21+1(amend-fail)` fail and `1+8` pass; the e2e file standalone: 2 tests, 1 fail/1 pass) — no cross-file interference.

I did **not** set `CLEARGATE_CODEX_BIN` (optional per dispatch); Part B is the diagnostic-skip path, so the total stays 87, not 88.

## Right-reason evidence

- **Shape file**: every one of the 19 reds is a clean `AssertionError` (wrong id list / wrong status / wrong detail string) against the REAL `HOST_VERIFIERS.codex` and `runVerifyInstall` (both already exist, imported statically) — spot-checked the full log for `TypeError`/`ReferenceError`/`SyntaxError`/`ENOENT`: zero hits outside the 19 intended `AssertionError`s. Test 9 initially vacuous-passed (comparing an empty "other ids" array to itself); fixed to assert the full 7-id list before checking status, so it now reds for the right reason (missing ids), matching F8's "19 red; 11 is an anchor."
- **CLI integration file**: Test 12 reds on a missing `codex.live.loop-transport` string in the `NOT CHECKED` section; Test 13 reds because `codex.hooks-wiring`/`codex.roles` never appear in stdout (only `codex.features-hooks` does) — both are `AssertionError`s, not spawn/parse failures.
- **Loop evidence file**: all 43 reds are `ERR_MODULE_NOT_FOUND` for `scripts/clean-room/loop-evidence.mjs` (86 occurrences in the log = 2 per failing test, from the dynamic-import call site plus node:test's own trace). Verified zero `TypeError`/`ReferenceError`/`SyntaxError` outside that class.
- **Loop harness file**: `ERR_MODULE_NOT_FOUND` for `loop-script.mjs` (tests 20a-21d), `TypeError: runLoopTurn is not a function` (21e-21f, the accepted "calling a method on a real module's `undefined` export" class per the -10 flashcard precedent), clean `AssertionError`s for 21g-21j (configWrites, `listProjectHooks`/`readCodexRegistrations`/leaf-export existence checks). One genuine hang was found and fixed during authoring: test 19f (`routes`+`respond` mutual exclusivity) left a real, listening mock HTTP server open when today's implementation silently ignores the unknown `routes` key and resolves instead of rejecting — the whole `node --test` process never exited. Fixed with an explicit close in a `finally`; re-verified solo (fast, clean fail) and in the full 21-test run (466ms total, no hang). Also fixed test 20d, which as first written asserted only against a hand-built verdict object and vacuously passed (`-12`'s `validateVerdicts` already works) — rewritten to pull the JSON literal out of `buildLoopRoutes`'s own generated record-pipeline exec step, so it now reds via `ERR_MODULE_NOT_FOUND` like its siblings.
- **e2e file**: Test 22 (Part A) runs a REAL `npm run build` + `npm pack` + install-shim cycle (the `clean-room-claude-baseline` e2e recipe, verbatim) against a disposable clone in `/private/tmp/claude-501/`; every assertion passes except the final "8 codex ids, all pass" check, which reds cleanly (`deepStrictEqual` on `['codex.features-hooks']` vs the 8-id list). `after()` confirms `CLI_ROOT`'s `git status` is unchanged before/after, and the tmp room is removed.
- **Amendment**: the null-snapshot sub-test reds with a clean `deepStrictEqual` (1 skip vs 8 expected); the two real-install sub-tests still pass with `splitViewRoot` threaded through via the `as unknown as X` double-assertion idiom (an unknown extra option key is a runtime no-op today).

## Anchors and build-phase anchors re-verified solo (measured green)

verify-install.red 42/42 · verify-install-codex.red 9/9 (8 green + 1 red, the amendment) · verify-install-cli.red.integration 5/5 · codex-hooks-harness.red 91/91 · clean-room-evidence.red 60/60 · clean-room-baseline-coexistence.red 24/24 · dispatch-verdict-modes.red 5/5 + dispatch-serial.red 8/8 + dispatch-serial-cli.red 7/7 + flashcard-gate-parity.red 14/14 (34/34 combined, the -12 contract group) · init-codex.red 6/6 · codex-adapter.red 16/16 · lifecycle-codex.red 6/6 · host-lifecycle.red 17/17 · codex-payload.red 14/14 · init-codex-sprint-execution.red 3/3 · M2 pair (`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, compare-only) 5/5 + 15/15 · `npm run typecheck` clean (exit 0, no output) · `node scripts/build-codex-payload.mjs --check` exit 0 · `node scripts/check-no-inline-id-regex.mjs` exit 0 ("no inline work-item-id regexes").

Not re-run: the rule-16 `CLEARGATE_META_ROOT` file list and `clean-room-verification-doc.red` — rule 16 applies only "when an item edits outer canonical docs, templates, knowledge or agents," and this dispatch touched none (test-only, cli-only, no `scaffold/**` edit, no outer worktree edit — confirmed by `git status --porcelain` on both `<ow>` and `<cw>` before/after). `sprint-execution-mirror.integration` stays a pre-existing named build-phase red until RS-5, unrelated to this story (F8's "Named build-phase red (all phases)" line).

## F8 rows I could not seal exactly as specified (for the TPV)

1. **Test 4b's fixture registry** ("a complete fake adapter from `test/helpers/host-fixtures.ts` owning `.fakehost`", M6:884/891): `test/helpers/host-fixtures.ts` exports no such adapter today (`makeFakeCodex` owns `.codex`, `makeFakeCopilot` owns `.copilot-fake` — checked by reading the file). I used a **local** `makeFakeAdapter(name, ownedRoots)` instead, byte-identical in shape to the one `test/commands/verify-install.red.node.test.ts:227` already defines locally for the exact same claude-side scenario (`.fakehost`, never touching `host-fixtures.ts`). The fixture's *behavior* (a truly-fake host owning `.fakehost`) is unchanged; only its literal source location differs from the plan's prose. Flagged in the shape file's own header comment.
2. **`buildLoopRoutes`'s and `authorLoopStory`'s exact JS shapes** (harness file, tests 20a-21d): the plan pins marker names, `fork_turns:"none"`, prompt prefixes, spawn ordering and `authorLoopStory`'s literal body (F6.4/F6.5) — but not the surrounding route/step object's field names (`marker`/`steps`/`name`/`input` in my rendering) or the `fixtures` parameter's internal shape. I built these consistently with M6:709's own pseudocode (`buildLoopRoutes({ roomRealpath, sprintId, storyId, fixtures })`) and the X1/X4 "code-mode exec" shape already measured in `codex-hooks.mjs`. Flagged in the harness file's header, mirroring the -12 QA-Red precedent for `dispatchSerial`'s seam shapes.
3. **`codexLoopVerdicts`'s internal input shapes** (evidence file: `loop.notifications`, `loop.commands`, `pathIdentity`, `roomLedgers`, `metaRepoAppended`): only the PASS-iff prose (M6's "Verdicts" table) and the raw-input key list (F6.6) are pinned — not the JS shapes carrying them. I modeled dispatch lifecycle as `subAgentActivity started/completed` pairs bracketing a `subagentStart`/`subagentStop` hook run (consistent with -10's own measured Test-44 shapes), and commands/ledgers/pathIdentity as flat records. Flagged in the evidence file's header; a different, equally defensible rendering is possible, and the Developer's Pass B implementation is the tie-breaker.
4. **Two of the 30 mutation rows** ("verify-install exits 1 → result FAIL…", "human posture with configWrites:1 → result FAIL") have no single named verdict id to target — `verifyInstallExit`/`configWrites` feed the *composite* `result` rule directly (F6.6), not a per-id verdict. I gave both a sentinel `id: 'result'` and special-cased the row runner to assert `result === 'FAIL'` **and** every other named verdict stays `PASS` (so the row still proves the composite rule in isolation, not just "something failed somewhere"). This was caught and fixed during authoring — the first draft pointed these two rows at an unrelated named id (`codex.loop.dispatches` / `codex.loop.trust-posture`), which would have reded for the wrong reason once the module exists; re-verified solo after the fix (43/43 red, no wiring errors).
5. **Test 21g** constructs `CodexAppServer` directly from the fake app-server child (`new CodexAppServer(child)`), skipping the real `.start()` `initialize` handshake — sufficient for the one thing under test (`configWrites` increments on `config/batchWrite`), but not a full client lifecycle. Noted for completeness; no other test in this file takes this shortcut.

None of these are scope changes or invented behavior beyond what the plan already specifies at the level it specifies it — each is a literal-text gap (a fixture's stated home, an unset field-naming convention, or a row whose "id" column doesn't map to a real per-id verdict) rather than an ambiguity about *what* the row must prove.

## `git show --stat` (post-amend)

```
commit 1111659f8c6633b7a1e8c3a7fcdeb235ba5de72f (HEAD -> story/STORY-058-13)
qa-red(STORY-058-13): verify-install codex shape (20t/19r) + CLI integ (2t/2r) + loop evidence (43t/43r) + loop harness (21t/21r) + e2e (2t/1r) + -10 amend (9t/1r) — 87 red / 2 anchors (A-11, -10's 8 untouched cases)

 test/commands/verify-install-codex-cli.red.integration.node.test.ts | 123 ++++
 test/commands/verify-install-codex-shape.red.node.test.ts           | 555 +++++++++++++
 test/commands/verify-install-codex.red.node.test.ts                 |  78 ++-
 test/e2e/codex-loop.red.integration.node.test.ts                    | 239 ++++++
 test/scripts/codex-loop-evidence.red.node.test.ts                   | 652 +++++++++++++
 test/scripts/codex-loop-harness.red.node.test.ts                    | 513 ++++++++++++
 6 files changed, 2141 insertions(+), 19 deletions(-)
```

## Script Incidents

None. No `run_script.sh` invocation was needed for this dispatch (all work was `npm run test:file`, `npx tsc`, and plain `node scripts/*.mjs --check` runs inside the cli worktree).

## Constraints honored

- No `src/`/`scaffold/`/script edits — confirmed by `git status --porcelain` in `<cw>` showing only the 6 test files.
- No `test/helpers/init-fixture.ts` rows (F5: none) — untouched.
- No edit in `<ow>`; no commit in `<ow>` — confirmed `git -C <ow> status --porcelain` is empty before and after.
- No bare `cleargate`; every CLI exercise went through `spawnSync('cleargate', …)` against a scrubbed-env PATH shim pointed at a real packed artifact (e2e) or `npm run test:file` in `<cw>` (unit/integration).
- No `CODEX_HOME`/`~/.codex`/`codex login status` touched; `CLEARGATE_CODEX_BIN` was not set.
- No writing smoke ran outside a `(cd /literal/tmp && …)`-equivalent pattern; all mutation fixtures live under `os.tmpdir()`/`/private/tmp/claude-501` and are cleaned up in `after()`/per-test.
- Git: no stash, no reset --hard, no push. One local commit, amended once (before any report or handoff) to fix a defect I found in my own not-yet-shared work — still exactly one commit, per the dispatch's "commit once."

```yaml
flashcards_flagged:
  - "2026-09-27 · #qa-red #test-harness #danger · An unknown option key silently ignored by an existing fn resolves instead of rejecting — close the server in finally, or it hangs the whole process."
  - "2026-09-27 · #qa-red #test-harness · A row asserting only a hand-built object against an already-correct library fn vacuously passes; pull the literal from the new code's own output."
  - "2026-09-27 · #qa-red · A composite-result mutation row has no per-id verdict to target; use a sentinel id and assert every other id stays PASS, not just 'something failed'."
```
