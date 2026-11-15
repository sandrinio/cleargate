# STORY-066-11 QA-Verify (role: qa) — integrated tree 07b8578

QA: PASS. Typecheck pass. prebuild ok, gen:codex no diff, worktree porcelain empty.
Tests (by file): wave-runner.red 7/7, wave-runner.red.integration 2/2 (I1 whole), segment-stages 8/8, merge-story 2/2, no-inline-id-regex 7/7, no-execution-mode-vocabulary 9/9, wiki-config-brief 5/5, index-lint-config 16/16, upgrade-mcp-refresh 21/21.

Scenario trace (5 of 5):
1 runs unedited, per-lane stages, waiting, envelope -> U1 (+I1)
2 outline fast/standard/runtime -> U3, I1
3 shipped default model (runtime qa-verify opus) -> U4, I1 step 3
4 last retry tier-up (3 rows) -> U5
5 spec defect BLOCKED -> U6 (U7 covers red-test rework)

Adapters (read in merged code):
- seal_red.mjs:146 stdout { id, sealed_sha, scan_exit, flags, tests, scenarios } = runner schema/scanFlagged.
- qa.md: `QA: PASS | PASS-PENDING-SMOKE | FAIL`, `DEFECT_IN: none | code | red-test | spec` = runner verify schema/defectIn.
- update_state.mjs: DEFECT_IN_VALUES validated for --qa-bounce --defect-in code|red-test|spec = runner defects_in values.
- merge_story.mjs: one JSON line { id, step, exit, tail, ... }; wave_runner.js never reads it (barrier-script stage breaks the walk, line 103; only args.merged). No mismatch.

Goal check (a): I1 already does exactly this (cited evidence/goal-check-a-I1.txt, lines 6-7 pass). It builds three-wave waves.json (fast/standard/runtime), runs shipped wave_runner_args.mjs then shipped wave_runner.js read as-is from scaffold/core into vm with stub agent in dispenser call shape; asserts counts [1,3,5], stages_run == stagesFor(lane) always-stages, wave gating (wave2 waits on 01), runtime qa-verify=opus, --validate, metrics matchItem/roundKind. Runner file only read; fixture writes are return JSON in a temp root. No extra fixture needed; I re-ran I1 fresh: pass.

Surface (git diff --name-only 4d1fbb2 07b8578): config.example.yml, wave_runner.js, wave_runner_args.mjs, plus the two red files (QA-Red). All within §3.1 plus red files (.red infix per C-7). Developer commits 046e0e0 and 07b8578 touch no test file (3 scaffold files; 1 file).
Local normaliseLane removed; imported from segment_stages.mjs (confirmed line 18).

Notes: no import/require/stage list in runner (U2). Task Breakdown rows unticked: advisory (rule 20, orchestrator ticks at merge). Dev's U3 mismatch resolved by QA-Red pass 2; U3 passes.
No regressions found. Not run: full suite (per instruction).
