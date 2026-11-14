role: qa
# STORY-066-08 QA-Verify (integrated tree 2c46f17)
QA: PASS
- typecheck pass; prebuild ok; gen:codex leaves no diff (git status clean).
- merge-story.red.node 2/2 + merge-story.red.integration 8/8 (T4, T10 green). 82/82 across autonomy-contract, devops-registration (red+live), codex-agents-codegen, codex-sprint-execution-render, no-inline-id-regex. check-no-inline-id-regex clean.
- Surface: a68a056..b9be6b6 = gate-checks.json, merge_story.mjs, devops.md, devops.toml + the two sealed red files (d804f34). Developer commit b9be6b6 touches no test file. SKILL.md / dispatch-serial untouched.
- No `stash` in script. R2 switch set at spawn (merge_story.mjs:252); scan wrote no state (fast item stayed QA Passed, only one demotion).
- Usage and exit table match M2/§C.7 (0/2/3/4/5), stdout always one JSON line, usage -> exit 2 id null.

## Real fixture runs (throwaway repos, deleted)
| Case | Result |
|---|---|
| clean + dirty wiki/ledger/untracked wiki + reports residue in worktree | exit 0 step done, 1 merge commit, worktree+branch gone, state Done, dirt preserved, stash list unchanged |
| conflict on src/a.txt | exit 4 step merge, conflict_files [src/a.txt], no MERGE_HEAD, sprint SHA unchanged, worktree+branch kept, state unchanged, wiki edit kept |
| post-merge fail, not in baseline | exit 5, merge in place (1 merge), worktree kept, state not Done |
| baseline lists TestA, branch fails only TestA | exit 0, post_merge_test excused, Done |
| same plus TestB | exit 3 pre-merge, sprint SHA unchanged |
| authored dirt (pending-sync tracked edit) | exit 2 precondition, file untouched, worktree kept |
| real dirt in worktree (cmd.go) | exit 2 naming it, worktree intact |
| fast item, test fails | exit 3, tail has `[FAIL] test` + output, lane -> standard, reason "pre-merge check failed: test", counters 0 |

## UNNAMED_BASELINE_FAILURE
Test command fails with no parseable names (Makefile guard `make: *** [check] Error 2`, exit 2), baseline.json has failing [] and exit_code 2: judgeTestFailure returns reason `unparsed`, excused=false. Pre-merge: exit 3 (step pre-merge, tail = the guard line); a fast item is also demoted to standard with reason "pre-merge check failed: test" for a failure it did not cause. Post-merge (if pre-merge somehow passed) would be exit 5. So a repo whose baseline is a red unnamed guard can never merge through the script. Matches the spec (Open Question 1: unrecognised output counts as new) and extractFailing's documented fail-safe, but bears on Goal check (d) / dispenser: the sandbox fixture and dispenser need a baseline whose failures print names (--- FAIL / not ok / FAIL\tpkg), or the owner must accept the refusal.

## Notes (not defects)
- Task Breakdown rows unticked (rule 20: orchestrator ticks at merge).
- Fixture without `.active` makes update_state create `_off-sprint/`; fixture artefact only.
- Fast-lane demotion writes no LD line (M2 C-5).

## Amendment A verification

role: qa. STORY=066-08. Tree: story/STORY-066-08 at b9af943 (bb27b30 QA-Red, b9af943 Developer, on 2c46f17). Main not merged (merge lane integrates later).

QA: PASS

- Surface: `bb27b30..b9af943` = `scaffold/core/.cleargate/scripts/merge_story.mjs` only; `2c46f17..bb27b30` = the two new amend-a red files only. Worktree `git status --porcelain` empty after prebuild + gen:codex (no diff).
- typecheck clean. Amend-a unit + integration, sealed merge-story red unit + integration, pre-gate-any-stack.red.integration: 22/22 pass. devops-agent-registration (red+live), autonomy-contract, codex-agents-codegen, codex-sprint-execution-render, no-inline-id-regex: 82/82. prebuild exit 0; gen:codex wrote files, no diff.
- R10 trace (merge_story.mjs): changed files via `git diff --name-only -z --diff-filter=d <sprint>...<story>` (three-dot); extension filter .js/.ts/.mjs/.cjs; empty path list returns before `git grep` (guard present); `git grep -n -I -G -e`; git diff/grep failure keeps the scan entry and appends `changed-file check could not run:`; no hits drops the entry, hits replace it (first 10, `path:line:text`); refusal, demotion names and tail derive from `remaining`; a scan whose only fail was dropped merges with no demotion. Tests: A7 (I1, untouched file, fast stays fast, no lane-demote event), A8 (I2, only changed file named, demoted for debug_patterns).
- R11 trace: `judgeTestFailure(..., { extract, exitCode })`, reason `baseline-unnamed` only when baseline.failing empty, integer non-zero baseline exit_code equals run exitCode, trim-only non-empty last line equal; exitCode passed at both stages; `NOT TESTED (<stage>)` notice appended by the `fail` closure so the 40-line cut keeps it; `post_merge_test` stays `excused`; absent baseline -> no-baseline, exit_code 0/missing -> unparsed, named path unchanged. Tests: A1-A6 unit; A9-A11 integration (A10 guard text changed -> exit 3, demoted for test only; A11 exit code changed -> exit 3).
- Original five scenarios still hold (sealed red files green; S5 baseline excuse green).
- Dispenser-shaped real run (throwaway repo with the real scripts tracked, `make check` $(error) guard, real record_baseline.mjs: failing [], exit 2; no merge.* keys). Deleted afterwards. Evidence: evidence/STORY-066-08/amendment-a-dispenser-shaped.txt.
  - (a) Go/text item: exit 0, post_merge_test excused, NOT TESTED pre-merge and post-merge tail lines, worktree torn down, state Done.
  - (b) item adding console.log in tools/new.mjs: exit 3; debug_patterns entry names only tools/new.mjs (installed scripts under .cleargate/scripts are not named).
  - (c) guard text changed: exit 3, judgement `unparsed`.
  - (d) fast item shaped like (a): merged, excused, lane stays fast, no demotion.
  - Note: fixtures (a)-(c) used standard lane so demotion is covered by integration A8/A10, not by this run; (d) is the fast case.
- Task Breakdown rows for Amendment A: orchestrator ticks at merge (rule 20), advisory.
- Residual risks (from plan, unchanged): excused unnamed failure merges with no test run; only the NOT TESTED lines and `post_merge_test: excused` signal it.
