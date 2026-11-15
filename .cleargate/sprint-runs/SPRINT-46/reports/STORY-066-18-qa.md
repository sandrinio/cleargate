# STORY-066-18 QA-Verify (pre-integration, runtime lane) — role: qa

Tree: `.worktrees/STORY-066-18/cleargate-cli`, `story/STORY-066-18`, tip ec9981b (seals d60aa94, 35479be). Main lacks 066-16/066-17.

STORY: STORY-066-18
QA: PASS
TYPECHECK: pass (`npm run typecheck`, exit 0)
TESTS: command 2 (six files) 13 pass / 0 fail; command 3 (29 files, one per call) all exit 0, 0 fail, 0 skipped; command 5 (dist-spawning, after `npm run build` in this worktree) enforcement-section-13 6 pass, advisory-env-gate 3 pass. `npm run prebuild` (includes `build-codex-payload.mjs --check`) exit 0, worktree clean after.
ACCEPTANCE_COVERAGE: 5 of 5 Gherkin scenarios (plus the OD-1 upgrade case) have matching passing tests: Sc1 -> sprint-preflight-test-gate T1; Sc2 outline -> T2/T3; Sc3 -> record-baseline-probe P1/P2; Sc4 outline -> merge-story-test-waiver W1/W2 (+ re-scoped I3 A9); Sc5 -> prep-reporter-test-gate R1/R2; D-9 -> upgrade-keeps-test-waiver U1. 10 new tests, 3 in the sealed I3 file; all red-now-green.
MISSING: none
REGRESSIONS: none
DEFECT_IN: n/a (PASS)

## (a) Diff review
- Surface: all 11 files of ec9981b are in story §3.1 (incl. the three OD-1 rows `detect-test-stack.ts`, `upgrade.ts`, and the new upgrade red). No file outside.
- `extractFailing` unchanged (not in the diff hunks). `record_baseline.mjs` imports only `node:fs|path|child_process|url` (lines 32-35).
- `merge_story.mjs`: no new export, no `stash` (grep empty). `judgeTestFailure`, `MERGE_EXIT`, `USAGE` untouched.
- A3 `**Serial barrier merge.**` line: zero hits in the diff of both Claude and Codex SKILL.md.
- Sealed I3 edit: only commit 35479be (`qa-red(`), 7 additions / 3 deletions, waiver-only (header note, `Commands.waiver`, `buildFixture`, I3 call). ec9981b touches no `*.red.*` file.
- Plan text vs code: sprint.ts, record_baseline.mjs, merge_story.mjs, prep_reporter_context.mjs, upgrade/detect-test-stack, SKILL rows 3/5/A.1/A.5, enforcement §13 and reporter.md step 6 match the plan's pinned strings verbatim. No disagreement found.

## (b) Proof (CLI = story worktree, pre-integration tree; evidence `evidence/STORY-066-18/pre-integration-*`)
1. No waiver: exit 1; stderr has `1/6 checks failed`, the `✗ Test gate: "sh guard.sh" stopped before running any test (exit 2: "Makefile:22: …")` line, the hint and the `No qa.test_waiver is recorded…` line. PASS.
2. Waiver: both runs exit 0, `test gate: WAIVED — …; waiver: "no PostgreSQL on this machine"`, last line `→ Load skill: sprint-execution`; runs=2 (one per HEAD; second preflight reused). PASS.
3. Kickoff: `baseline: reused the preflight probe of 6a5a424`, `"source": "preflight"`, runs=2 (no extra run). PASS.
4. Merge: exit 0, step done, tail holds both `NOT TESTED (pre-merge|post-merge) … excused under waiver "no PostgreSQL on this machine"`, `post_merge_test: excused`. PASS.
5. Report: `WAIVED — "sh guard.sh" stopped before running any test at kickoff (exit 2: "…"). Waiver: "…". Merges whose test stopped the same way were recorded NOT TESTED.` PASS.
Scratch dirs removed. Note: the plan's script omitted nothing; I only added `mkdir -p .cleargate/sprint-runs/SPRINT-01` before step 3 (harmless).

## Adversarial probes (beyond Gherkin)
- `NODE_TEST_CONTEXT=child-v8` inherited, qa.test = `node --test t.test.mjs`: probe reports `ran: true, exit 0` (D-12 holds).
- Whitespace-only waiver + `sh nope.sh` (exit 127): `ran: false`, no waiver read (trim) -> would fail preflight.
- `testsRan`: 124/127 with failing named -> false; exit 1 with failing -> true; exit 0 -> true; exit 2 no failing -> false. `lastLine` trims and skips blanks.

## Notes for the integrated re-verify
- Regions expected to merge cleanly per plan: SKILL :131/:138/:146/:147/:237/§C.7 rows, enforcement :501/:517/:524. After merging main, regenerate Codex SKILL (`gen:codex`, never hand-merge), run prebuild, then 066-16's `sprint-skill-a3-a4-lanes.red`, 066-20's `skill-md-d5-qa-red-files.red`, and the re-scoped `loop-spec-three-paths.red`.
- A.1 item 7 says the kickoff baseline (A.3) reuses the probe; true in the CLI path only once 066-16's A.3 command is on main (plan notes this).
- Task Breakdown rows in the story are unchecked: advisory only; the orchestrator ticks at merge (rule 20).
- Not run (by rule): full `npm test` / `test:integration`; known-red rule-18 list not exercised.

flashcards_flagged:
  - "2026-11-15 · #qa #proof-run · plan proof scripts heredoc-quote fine in bash but run them as a file via `bash script`, not pasted into zsh"

## Integrated re-verify (4368a53, incl. Amendment B)

Tree: `.worktrees/STORY-066-18/cleargate-cli`, HEAD 4368a53 (bf21e96, seals d60aa94/35479be, Dev ec9981b, seal 3 1d64e2d, Amendment B cb96317, merge of main fd3c471 = 20+19+16+17). Role: qa, VERIFY, runtime lane. Short TMPDIR `/private/tmp/q18b.OQMr`, one test file per call; removed at the end. Worktree clean after every run (including `gen:codex` + `prebuild`).

STORY: STORY-066-18
QA: PASS
TYPECHECK: pass (`npm run typecheck`, exit 0)
TESTS: command 2 (9 files) 19 pass / 0 fail / 0 skip; upstream SKILL reds `sprint-skill-a3-a4-lanes` 2/2, `skill-md-d5-qa-red-files` 2/2, `loop-spec-three-paths` 9/9; 066-17 close reds `close-sprint-finish` 6/6, `close-sprint-finish-restore` 5/5; command 3 (28 files) all exit 0, 0 fail, 0 skip; command 4 `gen:codex && prebuild` exit 0, no diff; `npm run build` exit 0; command 5 enforcement-section-13 6/6, advisory-env-gate 3/3. Full suite not run (S46-tip lane).
ACCEPTANCE_COVERAGE: 5 of 5 Gherkin scenarios (+ OD-1 upgrade) and 4 of 4 amendment B items, all red-now-green.
MISSING: none
REGRESSIONS: none
DEFECT_IN: n/a

### Diff review (`git diff fd3c471..HEAD --stat`)
- 21 files, all in §3.1 (11 from ec9981b, plus `pre_gate_runner.sh`, the Claude/Codex SKILL pair, and the three seal-3 files). No file outside §3.1.
- 1d64e2d (seal 3): three `A` (added) files only: `test-gate-amend-b.red`, `record-baseline-cache-guard.red.integration`, `test-command-env.red.integration`. cb96317 touches five non-test files (merge_story, pre_gate_runner, record_baseline, two SKILLs), zero tests.
- B-1: `COMMAND_ENV_DROP` (frozen, 3 names) and `commandEnv()` are exported from `record_baseline.mjs` and used by `runCommand` (probe + kickoff) and `merge_story.mjs shell()` (pre-merge rerun, prebuild, post-merge test). `record_baseline.mjs` still imports only `node:*`; `extractFailing` is not in the diff. Caveat (matches the plan): `pre_gate_runner.sh` cannot import a JS constant, so it carries a second literal list (`unset NODE_TEST_CONTEXT RUN_SCRIPT_ACTIVE CLEARGATE_REPO_ROOT`) in a subshell, with a comment pointing at the constant. The three places agree today; nothing pins the shell literal to the constant (only E2/E3 behaviour does).
- B-2: `probeCacheFile` returns null unless `common` is single-line and `path.isAbsolute`; G1 passes.
- B-3/B-4: §C.7 rows 3 and 5 are byte-identical in the Claude and Codex SKILL (`When a tail line starts \`not excused:\``, row 3 has no `DevOps`, no `tail ends` left); the A.1 sentence is present once in each SKILL. 066-16's A.3 `cleargate sprint init SPRINT-NN --stories …` text and 066-17 text survived (the three upstream SKILL reds are green).
- 066-17 close path: no `gate-checks` reference in `close_sprint.mjs`, `lib/sprint-finish.mjs` or `prep_doc_refresh.mjs`, so close never rewrites `qa.test_waiver`.
- A.1 item 7 "the kickoff baseline (A.3) reuses it" is now true in the CLI path (proof 3).

### Proof (integrated, evidence `evidence/STORY-066-18/integrated-1..6-*.txt`, header 4368a53; `env -u ORCHESTRATOR_PROJECT_DIR -u CLAUDE_PROJECT_DIR -u CLEARGATE_STATE_FILE -u CLEARGATE_NO_BASELINE -u CLEARGATE_ADVISORY`; CLI = built dist of this worktree)
1. No waiver: preflight exit 1, `✗ Test gate: "sh guard.sh" stopped before running any test (exit 2: "Makefile:22: …")`, `test_waiver` hint and the "No qa.test_waiver is recorded" line, runs=1. PASS.
2. Waiver: both runs exit 0, `test gate: WAIVED — …; waiver: "no PostgreSQL on this machine"`, last line `→ Load skill: sprint-execution`, runs=2 (second run reused the probe). PASS.
3. Kickoff through 066-16's A.3 path, `cleargate sprint init SPRINT-01 --stories STORY-001-01 --allow-drift --no-dashboard`: exit 0, `Lanes:` line, `baseline: reused the preflight probe of be235f4`, baseline.json `"source": "preflight"`, runs=2 (the command was not run again); a direct `record_baseline.mjs` re-run also reused (runs=2). PASS.
4. Merge: exit 0, step `done`, tail has both `NOT TESTED (pre-merge|post-merge) … excused under waiver "no PostgreSQL on this machine"`, `post_merge_test: excused`. PASS.
5. Report: `WAIVED — "sh guard.sh" stopped before running any test at kickoff (exit 2: "…"). Waiver: "…". Merges whose test stopped the same way were recorded NOT TESTED.` PASS.
6. Amendment B leak check (test = `envcheck.sh`, before = ec9981b scripts, after = HEAD scripts). Probe through `run_script.sh` with `CLEARGATE_REPO_ROOT` and `NODE_TEST_CONTEXT` set: before `exit_code 1, failing 2, "not ok 2 - CLEARGATE_REPO_ROOT reached the test command"`; after `exit_code 0, failing 0, ran true, "ok 1 - clean env"`. Merge with leaked `RUN_SCRIPT_ACTIVE=1 CLEARGATE_REPO_ROOT NODE_TEST_CONTEXT`, no baseline: before exit 3 at `pre-merge` with all three `not ok` lines; after exit 0, step `done`, `post_merge_test: "pass"`. PASS.
- Proof-script deviations (setup only, not the code under test): the sprint file needed a `## 1. Consolidated Deliverables` section plus an approved stub story with a `##` heading for `sprint init`'s gates; for step 4 `events.jsonl` was removed before the hand-written `state.json` (the fold-drift refusal says to). Scratch repos and `.count` files removed.

### Gherkin and B-n trace
Sc1 -> sprint-preflight-test-gate T1; Sc2 outline -> T2/T3; Sc3 -> record-baseline-probe P1/P2 + proof 3; Sc4 outline -> merge-story-test-waiver W1/W2 (+ re-scoped I3 A9); Sc5 -> prep-reporter-test-gate R1/R2; OD-1/D-9 -> upgrade-keeps-test-waiver U1. B-1 -> test-command-env E1/E2/E3 (+ proof 6); B-2 -> record-baseline-cache-guard G1; B-3 -> test-gate-amend-b D1; B-4 -> D2.

### Notes
- Task Breakdown rows in the story remain unchecked (advisory; orchestrator ticks at merge, rule 20).
- New rule-18 names to log at merge: no new known-red TEST names found (the integrated command 2/3 files all pass). The live twins `.cleargate/scripts/{record_baseline.mjs,merge_story.mjs,prep_reporter_context.mjs,pre_gate_runner.sh}` already differ byte-wise from main fd3c471, so doctor drift lines for them (plus the SKILL/enforcement/reporter/codex files) are expected until the Gate 4 re-sync. That is from a byte comparison; I did not run the full suite or the live-parity tests.
- Gate 4 re-sync: copy `pre_gate_runner.sh`, `record_baseline.mjs`, `merge_story.mjs` (init skips existing scripts); `record_baseline.mjs` must travel with `prep_reporter_context.mjs`.

flashcards_flagged:
  - "2026-11-15 · #qa #proof-run · sprint init proof fixture needs a `## 1. Consolidated Deliverables` section and a stub story with a `##` heading, plus rm events.jsonl before hand-writing state.json"
