# STORY-066-22 QA-Verify (role: qa, lane runtime)
result: PASS
defect_in: none
defects: none (Scenarios 1-4 all met)

## commands_run
- npm run typecheck: exit 0 (no output)
- 3 red files, one per call: r-volume-added-tests 2/2, wave-runner-flagged-seal 1/1, flag-is-not-a-block 1/1
- 18 pin files, one per call, all green: seal-red 7, qa-red-lint-volume 3, qa-red-seal-content 1, seal-red-expected-red 3, expected-red.integration 5, sprint-root-outputs 3, expected-red-not-a-flag 1, wave-runner.red 7, wave-runner.red.integration 2, sandbox-fixes 7, item-rerun 2, codex-render 3, codex-codegen 30, conditional-architect 18, three-paths 9, d5-qa-red-files 2, subagent-ledger 32, pre-gate-any-stack 8. No flakes, no reruns.
- node scripts/build-codex-payload.mjs --check: exit 0
- Full suite not run (per dispatch).

## Behaviour checks beyond the reds (diff 71b57d9..d61eaed read against code)
- (a) No CLEARGATE_RED_BASE: rVolume uses `baseText ?? ''`, so the count equals the whole file; main() pushes `{name,text}` only; flag has no suffix. seal-red Sc1/Sc2/Sc4 and qa-red-lint-volume still pass.
- (b) Cap still applies to added tests in an inherited file (T-V2: 12 whole-file -> 7 counted, flagged `limit 6`, suffix `; counted: tests added since <7hex>`). Floor at 0 verified by rVolume case in T-V2.
- (c) Backstop `lintOnly` = BLOCKED && sealed_sha && scan_exit===1 && non-empty flags all 'qa_red_lint'. Otherwise the original spec-contradiction return is kept (T-R1 Part 2: 4 variants halt after 1 call). On backstop: lastRed=res, qaSha=sealed_sha, `st.issue=''` (D-6), next stage; spec_gap not forwarded.
- (d) qa.md :49/:50/:64, SKILL §C.3 paragraph, runner prompt line :65 match plan prose verbatim. qa.toml and Codex SKILL carry the same text (regenerated; `--check` clean). `until the seal is clean` count: 0 in qa.md and qa.toml.
- Diff limited to §3.1: only new export is readBaseText; countTests/countScenarios/classifyExpectedRed/scanFlagged/red schema untouched; no stash.

## cr081 finding
scaffold/core/.cleargate/scripts/test/cr081_qa_red_lint.red.sh: 5 passed, 1 failed in the story tree AND in a detached scratch worktree of 71b57d9 (identical result). Scenario 6 reads scaffold/core/cleargate-planning/.claude/agents/qa.md, a path that does not exist at 71b57d9. PRE-EXISTING, not a regression. No scaffold/core/.cleargate/sprint-runs/ left in either tree; scratch worktree removed.

## Replays (replay.sh saved verbatim from plan at evidence/STORY-066-22/replay.sh, copy at before/replay.sh)
Story tree (evidence/STORY-066-22/):
1. MET. A1 `{"sealed_sha":"b839eda...","scan_exit":0,"flags":[],"tests":3,"scenarios":3}` + `exit 0`; A2 empty; A3 `"mode":"seal","item":"STORY-001-04","exit":0,...` and `28:[PASS] qa_red_lint: no semantic fixture issues`, no R-volume line.
2. MET. B1 `"scan_exit":0,"flags":[],"tests":3` + `exit 0`; B2 empty; B3 same shape as A3 (`[PASS] qa_red_lint`).
3. MET. C1 `exit 0`; calls in order QA-Red, Build, `QA-Red ... pass 2`, `log: wave_runner: STORY-001-04 QA-Red returned BLOCKED on a seal flagged only by qa_red_lint; routed as a flagged seal`, Wiring, `Build ... pass 2`, Verify, Post-flight. Verdict GREEN, qaSha b842a61aee477ff73ceda5692ee87c63c2793462, defects_in ["red-test"], stages_run [qa-red,developer,qa-red,architect-tpv,developer,qa-verify,architect-review].
Before (cli main 71b57d9, evidence/STORY-066-22/before/), defect reproduced:
- A1 `"flags":["qa_red_lint"],"tests":9` + `exit 1`; A3 `[FAIL] qa_red_lint: R-volume: 9 tests for 3 scenarios (limit 6)`.
- B1 `"tests":8` + `exit 1`; B3 `R-volume: 8 tests for 3 scenarios (limit 6)`.
- C1 verdict BLOCKED, blocker.type spec-contradiction, 3 agent calls then halt.
(Before A2/B2 hold one untracked `_off-sprint/.script-incidents/*.json` from the failing seal: expected side effect of exit 1 under run_script.sh.)
Scratch dirs $W removed. Sandboxes only cloned.

## proof verdict
PASS: all 3 numbered pass conditions MET on the story tree; `before` reproduces 5a (9 tests) and run 6 (8 tests, BLOCKED/spec-contradiction).

## tree state
Story worktree `git status --porcelain` empty; cli main clean at 71b57d9. Note: `git status` in /Users/ssuladze/Documents/Dev/cg-sandbox-s46 shows untracked `.claude/worktrees/` and `.cleargate/sprint-runs/_off-sprint/`; I only cloned from it, so that is not from this pass.
Task Breakdown rows are unticked in the story file (orchestrator ticks at merge, advisory).
