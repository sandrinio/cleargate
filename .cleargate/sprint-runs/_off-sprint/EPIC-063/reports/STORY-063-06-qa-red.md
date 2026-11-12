# STORY-063-06 QA-Red report (role: qa)

QA-RED: WRITTEN
Branch: story/STORY-063-06 (cleargate-cli). No production code, no commits. Nothing under src/ is touched (`git status` shows only the three new test paths).

## Files (all under /Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli/)
| File | Tests | Red | Why red |
|---|---|---|---|
| test/lib/wiki/unchecked-drafts.red.node.test.ts | 36 | 36 | 31 via `ERR_MODULE_NOT_FOUND` for `src/lib/wiki/unchecked-drafts.js` (dynamic import per test, so each fails alone); 5 R6 source-grep tests via ENOENT on the same file |
| test/commands/doctor-contradiction-alarm.red.node.test.ts | 14 | 13 | the alarm line is never printed by `runSessionStart` (`0 !== 1`, "alarm line must print", "alarm -1 must precede stale") |
| test/commands/doctor-contradiction-alarm.red.integration.node.test.ts | 1 | 0 (skipped) | gated budget test, see below |

Total 51 tests: 49 red, 1 green anchor, 1 gated skip.

The one green doctor test is "a broken config.yml does not take the banner down". It is a guard that the implementation must not throw on malformed config. It has no positive control because the spec does not say whether the alarm should degrade or skip. I accept it as an anchor.

## Satisfiability check
I temporarily added a throwaway reference implementation (`unchecked-drafts.ts` plus a 2-line doctor.ts hook), ran both files and got 50/50 green. Together with the 14 existing `doctor*.node.test.ts` and `sprint-sentinel-validation` suites it ran clean. I then deleted the module and ran `git checkout -- src/commands/doctor.ts`. The tests are satisfiable, and the existing suites do not regress. Two fixture bugs were found and fixed this way: a missing `exit(0)` expectation in the contradict-commit handler, and a drift fixture.

## Coverage vs the story
- Gherkin 1 (nothing unchecked): doctor "Nothing unchecked prints nothing" has a positive control, and the unit file has the checked cases.
- Gherkin 2 and 3 (missing stamp, stale stamp): doctor tests plus unit tests.
- Gherkin 4 (window/filter): unit window test covering 2h, 23h59m59s, 24h, 24h+1s, 7d-1s, 7d, 7d+1s and 10d. Also approved, Completed, Active, Abandoned, a story (config omits `stories`), a narrower bucket list, a non-bucket filename, a non-.md file, archive/, and a future `updated_at`.
- Gherkin 5 (cap at five, oldest first): the unit file has the 7-candidate case (count 7, ids lists all seven), and the doctor file has the exact five-oldest line.
- Gherkin 6 (missing or malformed page): unit and doctor tests. The doctor test asserts outcome unchanged and exit codes without 1 or 2.
- Gherkin 7 (budget): gated file.
- R2 and R3 reuse: R6 greps assert `phase4SkipReason` and `contradictContentHash` are used, with no `createHash` and no restated status list. A test also covers an `<instructions>` preamble draft stamped with `contradictContentHash`.
- R4: the unit file pins the story's example string exactly, byte for byte, including `⚠️`. It also covers 1 id, exactly 5 ids and 7 ids, and checks the line has no newline.
- R5: order tests (drift < alarm < stale sentinel, alarm == drift+1) and an order test without drift. Also: the alarm is after the state and resolver lines, outcome is `{false,false}`, exit codes match a stamped twin, and plain `doctor` prints no alarm.
- R6: no `child_process`, no spawn/exec, no fetch/http, all as source-level greps.
- Plan 8 (SPIKE): a page at the spikes bucket with a matching hash, plus an end-to-end test that runs `wikiContradictCommitHandler` (stdin `[]`) on a SPIKE draft and asserts the spikes page is stamped and the alarm clears.
- Frozen clock: NOW = 2031-03-05T09:00Z and every fixture date derives from it. One doctor test proves the injected `now` drives the window by moving `now` 30 days later.

## Budget test decision (plan 7)
Written as `test/commands/doctor-contradiction-alarm.red.integration.node.test.ts`, gated in-file (`{skip: reason}`) behind `CLEARGATE_PERF=1` plus `CG_PERF_BASELINE_CLI` and `CG_PERF_AFTER_CLI` (paths to two scratch `dist/cli.js` builds, built with `tsup --out-dir`, never `npm run build` in the checkout). This follows decision 12 from 03.
- It also skips under the `test:integration` glob unless all three env vars are set.
- The default tree is a synthetic 150-draft fixture with 12 in-window candidates. `CG_PERF_CWD` points it at a real repo instead.
- It runs 20 timed runs per side after a warm-up, using hrtime around spawnSync. It asserts p95 delta <= 100 ms. It also checks the baseline prints no alarm and the after-build does.
- Deviation: a subprocess cannot take an injected `now`, so this file alone uses real-clock-relative dates for the synthetic tree. This is documented in the file header.
- The Dev still has to run it once and record the numbers in the dev report (Task Breakdown row 4).

## Plan scenario 9 — existing doctor fixtures vs the real clock
No existing `test/commands/doctor*.node.test.ts`, `sprint-sentinel-validation`, `test/hooks/session-start.node.test.ts`, `init-pre-member-isolation` or `test/scripts/*harness*` fixture contains `updated_at` at all. The only `Date.now()` and `new Date()` uses are ledger and membership timestamps (doctor.node.test.ts:384-544, doctor-membership-banner:84-156), unrelated to the delivery-frontmatter window. Under the temporary reference implementation those suites stayed green. No fixture would emit the alarm and nothing needs listing.

## Ambiguities and decisions for Dev/Architect
1. Window boundaries: the task text says "exclude <24h and >=7d". The story says "more than 24 hours and less than 7 days", so exactly 24h is also excluded and exactly 7d is excluded. Tests pin that: 24h+1s is in, 24h is out, 7d-1s is in, 7d is out.
2. A future-dated `updated_at` (clock skew) is not named. This follows from `age > 24h`. It is one test and easy to drop if the Architect disagrees.
3. R3 reads the page's stamp only. A stamp mirrored on the raw file but absent from the page is NOT tested either way. 04's G1 makes the raw mirror the first source on `wiki build`, but R3 and the plan name the page.
4. Malformed `config.yml`: the spec is silent. The anchor test only requires no throw and no blocker. Reference behaviour was to treat the config as undefined (all buckets ingestable).
5. Only `pending-sync/` is scanned. The archive/ test pins this (plan approach step 2).
6. Task Breakdown row 1 names `doctor-contradiction-alarm.node.test.ts`. Per the dispatch the red files carry `.red` in the name. The Dev may keep or rename them, and the orchestrator decides.
7. Story §3.1 says to implement in doctor.ts or `src/lib/wiki/`. The plan fixes `src/lib/wiki/unchecked-drafts.ts` (C6), and the tests import that path.

## Flashcard candidates
- "2026-11-12 · #test-harness #qa-red · contradict-commit's success path calls exit(0); a red exit seam that treats any exit as failure misfires — assert code 0."
- "2026-11-12 · #test-harness #qa-red · Dynamic-import a not-yet-existing module inside each test so every case reds separately, not one file-load error."
- "2026-11-12 · #doctor #test-harness · runSessionStart tests need a stub cleargate-cli/dist/cli.js, cleargateHome tmp, and checkLatestVersion opt-out; drift fixture needs scaffold/hosts/claude + a differing live qa.md."
flashcards_flagged: the three above.
