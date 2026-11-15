# STORY-066-18 Architect post-flight (runtime lane) — role: architect

Tree: `.worktrees/STORY-066-18/cleargate-cli`, `story/STORY-066-18`. Reviewed `git diff bf21e96..ec9981b`: seals d60aa94 and 35479be, then the Developer commit ec9981b (11 files). Reviewed against `plans/STORY-066-18.md` (D-1..D-16, with OD-1 ratified in sprint-context Mid-Sprint Amendments line 127) and the QA-Verify report (PASS, pre-integration).

STORY: STORY-066-18
VERDICT: PASS
BLOCKING FINDINGS: none

## Plan conformance (each item checked against code)

| Item | Where | Result |
|---|---|---|
| R2/R4 probe, cache, kickoff reuse, `testsRan`/`lastLine`, imports `node:*` only, `extractFailing` byte-unchanged | `record_baseline.mjs:32-35,75-262` | Matches the plan's code block. Kickoff skip texts are byte-unchanged. `source: "preflight"` is written only on reuse. |
| D-2 cache at `<git-common-dir>/cleargate/test-probe.json`, toplevel guard, HEAD guard, atomic write | `record_baseline.mjs:108-142` | Matches. Checked in scratch repos: a worktree's probe lands in the main `.git/cleargate/` and the main checkout reuses it (`cached: true`). The kickoff reuses it (the command does not run again). A nested fixture inside another repo writes no cache. A non-git root writes nothing. |
| D-3 cached stop without a waiver is probed again | `record_baseline.mjs:201` | `hit && (testsRan(hit) \|\| cfg.waiver)`, as specified. |
| P11 output and entry shapes | `record_baseline.mjs:196-209` | `{command, exit_code, failing:number, ran, last_line, cached}` / `{skipped}`. The entry has exactly the six keys. |
| D-12 strips `NODE_TEST_CONTEXT` | `record_baseline.mjs:159` | Present. It applies to both the probe and the kickoff. |
| R3 gate after checks 1–5, progress line, outputs | `sprint.ts:1942-2025,2105-2110` | The pinned strings match verbatim. `1/6` arithmetic and the fixed `all five checks pass` summary are unchanged. |
| D-5 two-line hint | `sprint.ts:2022-2024` + `emitPunchList` | Line 1 is R3's hint verbatim. Line 2 is `    No qa.test_waiver is recorded, …`. |
| D-7 skips, plus no-JSON fails | `sprint.ts:1983-2004` | `CLEARGATE_NO_BASELINE`, not installed, skew sniff `'--probe'` (absent from bf21e96's script, present at :248/:275), and `{skipped}` all pass with one line. Unparsable output fails. |
| D-8 route and bounds | `sprint.ts:1989-1995` | The route is `run_script.sh node <script> --probe`, with `CLEARGATE_REPO_ROOT=cwd` and timeout 1 260 000. The inner timeout is 1 200 000. |
| D-14 merges: waiver at both call sites, refusal tail | `merge_story.mjs:370-371,418-425,482-491` | Texts are verbatim. Pre-merge refusal exits 3 and post-merge exits 5. No new export, no `stash`. `judgeTestFailure`/`MERGE_EXIT`/`USAGE`/`buildResult` are untouched. |
| R6/D-11 report line forms (Passed/Ran/WAIVED/STOPPED/No baseline) | `prep_reporter_context.mjs:195-231,768` | Matches, including order after State.json Summary. The waiver is read from `__dirname/gate-checks.json`. |
| reporter.md step 6 + reporter.toml | `reporter.md:143-146` | The text is in Workflow step 6, not in Post-Output Brief, so live parity stays green (D-11). |
| R7 SKILL §A.1 item 7 + resolution + "all 7", §A.5, §C.7 rows 3/5 (D-10) | Claude + Codex SKILL | Verbatim. Row 3 has no `DevOps`. The A3 serial-barrier line is untouched. The Codex render is regenerated (QA ran prebuild `--check`). |
| enforcement §13 | `cleargate-enforcement.md:501,519-543,551` | Verbatim. The OD-1 sentence is in its ratified form. |
| D-9/OD-1 upgrade keeps the waiver | `detect-test-stack.ts:189-221,287,295`; `upgrade.ts:65-66,787-788,1263-1264` | Matches. `readTestWaiver` runs before the overwrite. The restore runs after the BUG-037 try/catch, so it runs even if detection throws. `test_waiver` is stripped from the local-edit comparison. Dry run gets no restore. `init --force` never touches `.cleargate/scripts/**` (`copy-payload.ts:89-93,205-213`). |
| D-15 "not changed" list | — | Shipped `gate-checks.json`, `cli.ts`, `qa.md`, `developer.md` and `devops.md` are not in the diff. |
| Rule 16 | 35479be | The sealed I3 edit is only in the `qa-red(` commit. ec9981b touches no `*.red.*` file. |

Re-run here, at tip ec9981b, with a private TMPDIR. `sprint-preflight-test-gate.red` 3/3, `record-baseline-probe.red.integration` 2/2, `upgrade-keeps-test-waiver.red` 1/1.

## The dispatch's specific questions

- **Writes outside the git common dir.** `--probe` writes only `probeCacheFile()` and its `.tmp.<pid>` sibling. On git ≥ 2.31 that is always inside `<common-dir>/cleargate/`. One exception exists only on git < 2.31 (F3).
- **Hang past 20 minutes.** The inner `spawnSync` timeout kills `bash -c` and closes the stdio pipes, so a grandchild holding a pipe does not hang it. The outer 21-minute timeout kills `run_script.sh`, which traps only EXIT, so bash dies on SIGTERM. Preflight therefore returns within about 21 minutes in the worst case, with a "gave no result" failure. One residual case predates this story: a direct child that ignores SIGTERM keeps the inner `spawnSync` waiting, which is the same exposure the 066-04 kickoff baseline already has. The outer bound still holds in that case.
- **Waiver read from the wrong file or key.** All five readers use `qa.test_waiver` from the same repo's `.cleargate/scripts/gate-checks.json`: preflight `<cwd>`, probe `<root>`, `merge_story` `scriptDir`, `prep_reporter_context` `__dirname`, upgrade `gateChecksPathOf(cwd)`. Every reader except the upgrade path trims. Upgrade keeps the value verbatim, as planned.
- **Repo with no `qa.test`.** The probe returns `{skipped:'qa.test and qa.baseline_command are empty'}` and preflight prints `test gate: skipped — …` and passes. A missing or unparsable `gate-checks.json` skips the same way, with `gate-checks.json not found` (as D-7 specifies).
- **Skew.** If the installed `record_baseline.mjs` predates this story, the gate skips with a line telling the user to run upgrade. No `sprint-runs/--probe/` is created. `cleargate upgrade` overwrites all of `.cleargate/scripts/**` together. `init` on an existing repo creates only the scripts that are absent, so new `record_baseline.mjs` plus old `run_script.sh` is possible. `run_script.sh`'s `<cmd> [args...]` interface is the same one the kickoff route already depends on, and 066-20's change on `main` touches only the incident path. See F7 for the one new import-skew hazard.
- **Goal check (d) run 3.** Nothing in this diff breaks it:
  - Setup: if the waiver is committed before the RC upgrade, D-9 keeps it, and the dry run says `updated, no local edits lost`, not `local edits lost`.
  - Preflight: `make check` stops at the guard (exit 2, no `--- FAIL:`/`FAIL\t` named), so it prints `WAIVED` and passes, in both layouts. In 3a the cache goes to the shared common dir.
  - Kickoff: it reuses the probe and writes `baseline.json` with the guard failure (pass criterion 3).
  - Merges: fast 001-01 is excused under the waiver and is not demoted. Tails still carry `NOT TESTED (pre-merge|post-merge)` (criterion 8), now ending `excused under waiver "…"`.
  - Report: the `## Test Gate` row says WAIVED.

## Findings (none block the merge)

**F1 — Medium, non-blocking (plan miss in D-8/D-12): `RUN_SCRIPT_ACTIVE=1` leaks into the probed test command.**
- **Cause.** `run_script.sh` exports `RUN_SCRIPT_ACTIVE=1` before running the probe. `record_baseline.mjs:157-162` strips only `NODE_TEST_CONTEXT`.
- **Evidence.** `test/scripts/run-script-wrapper.red.node.test.ts` gives 10 failures with the variable inherited and 18/18 passing without it (flashcard 2026-06-04 `#run_script`).
- **Effect.** It applies only to the meta repo's own preflight (OD-4, `qa.test = npm --prefix cleargate-cli test`):
  - The probe names those false failures, so the gate passes as `ran (exit 1, N failing tests named; they become the sprint baseline)`.
  - The baseline records them, and merges run through the wrapper then excuse them.
  - As a result, regressions in `run_script.sh`'s incident path are masked for the whole sprint.
- **Scope.** Neither the sandbox (Go) nor dispenser is affected. The same leak predates this story on the kickoff route (`sprint.ts:111-131`) and on merges launched through the wrapper.
- **Fix: must be symmetric.** Strip it in `record_baseline.mjs` `runCommand`, in `merge_story.mjs:188-190` `shell()`, and in the `pre_gate_runner.sh` test child. Stripping only the baseline would make merges run through the wrapper see failures the baseline lacks, and they would be refused with exit 5.
- **Route.** Intake or a hotfix before the SPRINT-47 preflight.

**F2 — Low, non-blocking: `CLEARGATE_REPO_ROOT=<cwd>` (`sprint.ts:1994`) also reaches the user's test command.**
- **Cause.** `runCommand` spreads `process.env`.
- **Effect.** For a target repo's suite this does nothing. For the cli suite in the meta repo, an ambient value redirects any test that runs `init_sprint`/`assign_lane`/`close_sprint`/`assert_story_files`/`file_surface_diff`/`collision_surface` without pinning it.
- **Spot check.** I ran 8 candidate unit files with the variable pointed at a scratch root: all passed and none wrote to it. That does not prove the full suite is safe, and I did not run the full suite (forbidden here).
- **Fix.** Fold it into F1's follow-up: `runCommand` also deletes `CLEARGATE_REPO_ROOT`, which describes the script's root, not the command's.

**F3 — Low, non-blocking: git < 2.31 (`record_baseline.mjs:115`).**
- **Cause.** `git rev-parse` echoes unknown flags (verified: `git rev-parse --bogus-flag=x --git-common-dir` prints the flag, then `.git`). On older git, `common` therefore becomes a two-line relative string.
- **Effect.** `writeCache` would create a directory named `--path-format=absolute\n.git/` inside the work tree, which dirties `main` for the next check 4.
- **Context.** `file_surface_diff.sh:44-45` already assumes git ≥ 2.31, and flashcard 2026-11-12 records the same floor. This machine runs 2.50.1.
- **Hardening.** Add `if (!path.isAbsolute(common) || common.includes('\n')) return null;`.

**F4 — Low, informational (the plan's D-9 "Result" bullet stated this): with a waiver, `cleargate upgrade` is never a no-op for `gate-checks.json`.**
- **Cause.** `fileOutcome` compares the disk file with `projectGateChecks(pkg, plan)` (`upgrade.ts:345`, `detect-test-stack.ts:261-272`). That projection carries the three commands but not the waiver.
- **Effect.** Every dry run lists the file as `updated, no local edits lost`, and every real run prints `[always] overwritten:` and then `kept qa.test_waiver …`. The final bytes are identical: the waiver is put back as the last `qa` key, which matches the shipped key order.
- **Route.** Intake: project the waiver in `projectGateChecks`, so an upgrade to the same version is quiet.

**F5 — Low, non-blocking: `merge_story.mjs:435`.**
- **Cause.** When the fast-lane demotion itself fails, a `lane demotion failed …` line is appended after the `not excused` line.
- **Effect.** §C.7 row 3's condition "the tail ends `not excused: …`" no longer matches, so the item would be routed to the Developer.
- **Likelihood.** It needs an `update_state.mjs` failure, which is rare.
- **Fix.** A SKILL wording change from "ends" to "contains a `not excused:` line" closes it. Intake.

**F6 — Medium, non-blocking for this merge; should land before the 0.31.0 publish or the SPRINT-47 preflight, whichever comes first (plan miss): the SKILL does not say that preflight can now block for up to 20 minutes.**
- **Where.** A.1 shows `cleargate sprint preflight <sprint-id>` as a plain command. On a cache miss, A.3's `sprint init` can run the suite again.
- **The limit.** Claude Code's foreground Bash call defaults to 120 s, with a maximum of 600 s.
- **Effect.** The meta repo's measured 945 s suite (OD-4) cannot finish in a foreground call. The orchestrator sees a tool timeout instead of a verdict, and any target repo whose suite runs longer than 2 minutes hits the same wall. Run 3 is unaffected, because the guard stops at once.
- **Fix: doc-only.** Add one sentence to A.1 (and to A.3) telling the orchestrator to run the command in the background or with a timeout above 20 minutes. The Codex render is regenerated, so the sentence must avoid `CODEX_SKILL_BANNED` tokens. This needs the orchestrator's call: a small amendment to this story before merge, or a pre-release hotfix.

**F7 — Low, Gate 4 note: `prep_reporter_context.mjs:55` now statically imports `./record_baseline.mjs`.**
- **Effect.** A copy of the new `prep_reporter_context.mjs` without `record_baseline.mjs` beside it makes the whole Reporter bundle fail with `ERR_MODULE_NOT_FOUND`.
- **Normal paths.** Upgrade and fresh init install both files.
- **Gate 4 re-sync (OD-5).** The meta repo's re-sync must put `record_baseline.mjs` into the live `.cleargate/scripts/` together with (or before) any byte-copy of `prep_reporter_context.mjs`.

**Planned and accepted (not findings):**
- A fast item refused for a missing waiver is demoted before the halt, and after the waiver is recorded its merge reruns as `standard` (plan §Risks).
- The progress line says "reused for the same HEAD and command" even when D-3 re-probes a cached stop.

## Notes for the post-integration re-verify (after 066-16 and 066-17 merge)

- On cli `main` so far: 066-20 (`run_script.sh` incident-path only, SKILL §C.0.1/D.5) and 066-19 (`seal_red.mjs`). Neither touches this story's regions or the probe route. Integrate `main` as the plan specifies:
  - Never hand-merge the generated Codex SKILL. Regenerate it with `gen:codex`, then run prebuild `--check`.
  - Re-run `loop-spec-three-paths.red`, `sprint-skill-a3-a4-lanes.red` and `skill-md-d5-qa-red-files.red`.
  - Confirm §C.7 rows 3/5 survive the merge byte-for-byte, and that row 3 still has no `DevOps`.
- Check that 066-16's A.3 kickoff command runs `defaultBaselineStep`, so that A.1 item 7's "the kickoff baseline (A.3) reuses it" holds in the merged text.
- Check that 066-17's close path does not regenerate or overwrite `gate-checks.json`. If it does, `qa.test_waiver` must survive it.
- Re-run the probe proof step 3 (kickoff reuse) on the integrated tree. If 066-16 changed kickoff ordering so that something is committed between preflight and baseline, the cache misses. That costs a second suite run, not a wrong result, but it makes "the suite runs once per kickoff" false.
- F1, F2 and F6 should be decided (hotfix or intake) before the SPRINT-47 preflight. F6 should be decided before the 0.31.0 publish.

## Script Incidents

None. No wrapper-invoked script failed during this review. Scratch repos were under a private `/tmp/cga18` and have been removed.

flashcards_flagged:
  - "2026-11-15 · #run_script #baseline · test cmd spawned under run_script.sh inherits RUN_SCRIPT_ACTIVE=1 + CLEARGATE_REPO_ROOT; strip in record_baseline AND merge_story shell together or merges refuse"
  - "2026-11-15 · #preflight #orchestrator · preflight/sprint init may run the suite ≤20 min; Claude Bash foreground caps 600 s (default 120 s) — run them in background"
  - "2026-11-15 · #git · rev-parse echoes unknown flags: on git <2.31 --path-format=absolute output is 2 lines; check path.isAbsolute before writing"
