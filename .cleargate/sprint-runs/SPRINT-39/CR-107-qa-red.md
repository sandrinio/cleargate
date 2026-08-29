---
story_id: CR-107
sprint_id: SPRINT-39
mode: QA-RED
generated_by: qa agent
generated_at: 2026-08-29
---

# CR-107 QA-Red baseline — sprint→main merge goes through a pull request

## QA-RED: WRITTEN

## Commit

Commit SHA: see `git log -1` on `story/CR-107` for this file's own commit (this report is
committed in the SAME commit as the test additions, per dispatch instructions). Branch cut
from `sprint/S-39` @ `a9304776`.

## Files touched

- `.cleargate/scripts/test/test_close_pipeline.sh` — **509 insertions, 0 deletions**, purely
  additive. `git diff --stat` confirms no other file changed.
- No production code touched: `close_sprint.mjs` (live or canonical), `config.yml` (live or
  canonical), `config.example.yml` (either) are byte-unchanged.

## RED_TESTS

`.cleargate/scripts/test/test_close_pipeline.sh` — 10 new scenario functions appended
(`scenario_cr107_*`), wired into the run-all section immediately before the existing
"Mirror checks" block:

- `scenario_cr107_p1_vcs_off_regression` (P1a, P1b)
- `scenario_cr107_p2_gh_absent_refuses` (P2a, P2b)
- `scenario_cr107_p3_no_remote_refuses` (P3a, P3b)
- `scenario_cr107_p4_merge_commit_regression` (P4)
- `scenario_cr107_p5_squash_merge_detected` (P5a, P5b)
- `scenario_cr107_p6_stale_local_main` (P6)
- `scenario_cr107_p9_nonnumeric_sprint_id_not_a_bypass` (P9)
- `scenario_cr107_p7_pr_body_and_eviction` (P7, P7c, eviction check)
- `scenario_cr107_doctrine_strips_gitignored` (doctrine ×2 trees ×2 clauses)

Plus seven fixture helpers: `cs_write_vcs_config`, `cs_make_state_dir`, `cs_reset_repo`,
`cs_reset_repo_no_remote`, `cs_make_sprint_branch`, `cs_simulate_stale_local_main`,
`cs_make_no_gh_path`.

## Verification command

```
bash .cleargate/scripts/test/test_close_pipeline.sh
```

Run twice back-to-back on the unmodified baseline (`5a33eae5` tree + this commit's test-only
diff) to confirm determinism — identical pass/fail set both times (`diff` of the `PASS:`/`FAIL:`
lines empty).

## Measured baseline (this commit, no `close_sprint.mjs`/config changes)

```
=== Results: 18 passed, 22 failed ===
```
exit code: 1 (as expected — a QA-Red baseline with red tests must exit non-zero).

**This total is the WHOLE file, not just my additions** — the file already carried 12
pre-existing pass / 10 pre-existing fail *before* I touched it (measured on a clean checkout
of this same commit range, before adding anything). My 18 new assertions split **6 pass / 12
fail**. See "Pre-existing defects found, not fixed" below — the 10 pre-existing failures are
NOT caused by CR-107 and I did not touch those scenario functions.

## Per-scenario RED/GREEN table

Every row is measured (`bash .cleargate/scripts/test/test_close_pipeline.sh`), not predicted,
per the dispatch's explicit instruction.

| # | Scenario | Measured | Mutant it kills | Notes |
|---|---|---|---|---|
| P1a | `vcs` block absent + `FORCE_MERGE_STATUS=merged` → Step 2.8 passes, message unchanged | **PASS (green at baseline)** | defaulting to `true` on a missing key | Regression guard. No git repo needed — `FORCE_MERGE_STATUS` short-circuits before any `execSync('git ...')` call, so the vcs feature genuinely cannot touch this path either before or after implementation. |
| P1b | `vcs.sprint_pr: false` explicit + `FORCE_MERGE_STATUS=unmerged` → today's generic refusal, unchanged | **PASS (green at baseline)** | treating an explicit `false` as an error, or as `true` | Regression guard, same reasoning as P1a. |
| P2a | `vcs.sprint_pr: true`, `gh` absent from PATH, **real merge-commit ancestor (=true)** → non-zero exit | **FAIL (red)** | routing into the existing `mergeCheckAvailable = false` fail-open at `close_sprint.mjs:686-692`, or simply never checking `gh` at all | **The load-bearing case.** Measured today: exit **0**, pipeline reaches Step 4 ("Waiting for Reporter…") cleanly — proves the silent-fallthrough danger is real, not hypothetical. Asserts the **exit code**, per dispatch instruction, not message text. |
| P2b (soft) | Same fixture — refusal message names `gh` | **FAIL (red)** | — | Secondary/soft signal, word-boundary grep for `gh`. Necessarily red today since no refusal fires at all. |
| P3a | `vcs.sprint_pr: true`, **no `origin` remote**, real local ancestor (=true) → non-zero exit | **FAIL (red)** | falling back to the local merge silently when no remote exists | Measured: exit **0**, same clean fallthrough to Step 4. |
| P3b (soft) | Same fixture — refusal message names the missing remote | **FAIL (red)** | — | Soft signal. |
| P4 | `vcs.sprint_pr: true`, **real merge-commit** PR, local `main` already advanced → Step 2.8 recognises merged | **PASS (green at baseline)** | — (this already works today; a "fix" that breaks it is the mutant) | Regression guard per F2 — `--is-ancestor` already reports `true` for a genuine merge commit, with zero code change needed. Confirms the CR's own §2 framing is overstated for this path. |
| P5a | `vcs.sprint_pr: true`, **squash-merged** PR → non-zero exit | **PASS (green at baseline, ACCIDENTAL — see below)** | — | `git merge --squash` + commit is, by construction, not an ancestor relationship, so `--is-ancestor` already reports "not merged" and exits 1 **today, for the wrong reason** (generic "not merged", not "squash detected"). This green is real but does **not** measure F2a. |
| P5b | Same fixture — failure message **names squash** specifically | **FAIL (red)** | loosening `--is-ancestor` to "a PR exists and is closed" (which would also silently accept a closed-unmerged PR) | **This is the real F2a signal.** Measured message today: `Step 2.8 failed: sprint/S-97 not merged to main.` — generic, no mention of squash. |
| P6 | `vcs.sprint_pr: true`, sprint merged **on origin** (merge commit, simulated PR merge), local `refs/heads/main` stale, `refs/remotes/origin/main` updated by an ambient `git fetch` (simulating a background/IDE fetch, not a `close_sprint.mjs`-internal one) → Step 2.8 recognises the merge | **FAIL (red)** | using `refs/heads/main` unconditionally (`close_sprint.mjs:662`) | Measured: `Step 2.8 failed: sprint/S-97 not merged to main.` — exactly the F2b defect, reproduced with a fixture that is implementation-agnostic between F2b's two named fixes (see fixture note below). |
| P9 | Non-numeric sprint id (`SPRINT-TEST`), `vcs.sprint_pr: true`, real ancestor=true → vcs gate still applies (does not silently take the `:659` skip branch) | **FAIL (red)** | a vcs-gated refusal implemented only inside the `sprintNumMatch` branch, unreachable for non-numeric sprint ids | Measured today: `Step 2.8 skipped: sprint-id "SPRINT-TEST" has no numeric portion.`, exit 0. Dispatch item 6 / Gotchas list. |
| P7 | Canonical `SKILL.md` §6 Phase D references the PR, without building the body via `gh pr view` | **FAIL (red)** | shelling out to `gh pr view` to build the body | Phase D today contains no PR mention at all (measured `grep`). Doc-truth check — see "Could not author as a code test" below. |
| P7c | Same section — PR-body recipe names sprint goal + DoD + report as its inputs | **FAIL (red)** | embedding a fresh timestamp / building the body from something other than existing artifacts | Today's Phase D mentions "sprint goal" (pre-existing "🎯 Goal check" callout) but not DoD or REPORT — compound `AND` fails. |
| eviction | Canonical `SKILL.md` §E.5 contains no unconditional `git merge sprint/S-NN --no-ff` | **FAIL (red)** | leaving the merge unconditional after adding PR support elsewhere | Measured: the bare command IS present, section does not mention `vcs.sprint_pr` at all. This is the CR's own §4 "Eviction check," reused verbatim. |
| doctrine-live-strip | Live `cleargate-enforcement.md` §1.6 no longer claims "strips gitignored" | **FAIL (red)** | not making the BUG-046-post-flight-carried doc fix | Clause still present (`:101`), verified. |
| doctrine-live-base | Live §1.6 "cuts off the wrong base" clause retained | **PASS (green at baseline)** | deleting BOTH clauses instead of just the false one | Regression guard — the true clause must survive the edit. |
| doctrine-canon-strip | Canonical mirror, same as doctrine-live-strip | **FAIL (red)** | same | Both trees identical today (`diff` empty on this line). |
| doctrine-canon-base | Canonical mirror, same as doctrine-live-base | **PASS (green at baseline)** | same | |

**Tally:** 18 new assertions — **6 green-at-baseline (regression guards, all intentional)**,
**12 red-at-baseline (the real feature-absence signals)**.

## Fixture design note — P6 is deliberately implementation-agnostic

F2b names two acceptable fixes: "fetch before the check" or "fall back to
`refs/remotes/origin/main`." A naive close-reading of the first ("fetch, then still check
`refs/heads/main`") would not actually work — `git fetch` never advances a local branch, only
the remote-tracking ref — so **both** named fixes reduce to the same observable requirement:
`refs/remotes/origin/main` must be consulted, one way or another. P6's fixture runs the
"ambient fetch" itself (as test setup, standing in for either close_sprint.mjs's own internal
fetch, or a fetch that happened via some other means before the human runs `close_sprint.mjs`)
and only checks the OUTCOME (`Step 2.8 passed` appears). This is intentional and is not overfit
to either implementation choice.

## Commands run, with exit codes read from completed logs (N10 compliance)

All logs redirected to files and read after completion — never piped through `tail`/`head` on
a live run.

```
$ bash .cleargate/scripts/test/test_close_pipeline.sh > /tmp/qa-red-full-run.log 2>&1; echo $?
1
$ tail -1 /tmp/qa-red-full-run.log
=== Results: 18 passed, 22 failed ===

$ bash -n .cleargate/scripts/test/test_close_pipeline.sh; echo $?
0   (syntax check clean)

$ bash .cleargate/scripts/test/test_close_pipeline.sh > /tmp/qa-red-run-1.log 2>&1; echo $?
1
$ bash .cleargate/scripts/test/test_close_pipeline.sh > /tmp/qa-red-run-2.log 2>&1; echo $?
1
$ diff <(grep -E "^PASS:|^FAIL:" /tmp/qa-red-run-1.log) <(grep -E "^PASS:|^FAIL:" /tmp/qa-red-run-2.log); echo $?
0   (deterministic — identical pass/fail set across two independent runs)

$ git -C .worktrees/CR-107 diff --stat
 .cleargate/scripts/test/test_close_pipeline.sh | 509 +++++++++++++++++++++++++
 1 file changed, 509 insertions(+)
```

No `run_script.sh` invocation of MINE failed (all my `bash "$RUN_SCRIPT" node ...` calls inside
the new scenarios complete and are captured by the scenario's own `out=$(...)` — that's the
scenario under test, not a script-incident-worthy failure of my own tooling). No
`.cleargate/sprint-runs/<id>/.script-incidents/*.json` was produced by any command I ran
directly (outside the scenarios under test); the `_off-sprint/.script-incidents/` entries
produced incidentally by the SCENARIOS' OWN failing sub-invocations (that's expected —
`run_script.sh` writes an incident on every non-zero exit, including test fixtures that are
*supposed* to fail) were git-ignored and removed before commit.

## Script Incidents

None applicable to my own invocations (see above) — no incident JSON needs to be cited in this
report.

## Pre-existing defects found, not fixed (out of scope for this dispatch)

These are **not** CR-107 regressions — measured identically on the file *before* I added
anything, and I did not touch any of these six scenario functions.

1. **`test_close_pipeline.sh` scenarios 1, 2, 4, 5 invoke `close_sprint.mjs` / `update_state.mjs`
   / `init_sprint.mjs` / `suggest_improvements.mjs` as a BARE filename** passed to
   `run_script.sh` (e.g. `bash "$RUN_SCRIPT" close_sprint.mjs S-XX`), not `node <path>` as
   `run_script.sh`'s own usage docs specify. `.cleargate/scripts/` is not on `PATH` and
   `close_sprint.mjs` has no `+x` bit (`-rw-r--r--`), so every one of these resolves
   `command not found` (exit 127). **Some of these still register as `PASS`** because the
   assertion is "exits non-zero" and `command not found` IS non-zero — a vacuous pass for the
   wrong reason (Scenario 1a). This means `test_close_pipeline.sh`'s own scenarios 1/2/4/5 have
   likely not exercised real `close_sprint.mjs` behaviour since before `2deaf216`
   (`git log` shows the file untouched since SPRINT-21). All new CR-107 scenarios route through
   `node "${SCRIPTS_DIR}/close_sprint.mjs"` explicitly to avoid this trap.
2. **Scenario 6** — fixture dir `.cleargate/sprint-runs/S-09/fixtures/sprint-08-shaped` does not
   exist in this worktree (or the sprint tree generally, as far as I checked). All of Scenario
   6's sub-checks fail for that one reason.
3. **CR-036 Scenario B** — same bare-filename defect as #1 (invokes `close_sprint.mjs` without
   `node`), so it measures `exit_code=127` rather than the intended v2 hard-block behaviour.
4. **Mirror check: `reporter.md`** — live and canonical `reporter.md` already diverge on this
   commit, unrelated to CR-107 (I have not touched `reporter.md`).

I did **not** fix any of these — they are a different defect from CR-107's, "author tests only"
forecloses production-code fixes, and fixing scenario 1/2/4/5/6's invocation style is itself a
non-trivial scope decision (touches shared, pre-existing scenario functions) that belongs to
whoever owns that regression, not to a QA-Red dispatch scoped to CR-107. Flagging for the
orchestrator to file as a follow-on bug if not already tracked.

## Could not author as a code test (and why)

**P7 (PR body determinism) and the eviction check are doc-truth assertions against canonical
`SKILL.md`, not unit tests against a named function or script.** The M4 plan's "Corrected file
surface" table for CR-107 lists no new script for PR-body generation — the only Modify-list
entries are `SKILL.md` (both trees), `close_sprint.mjs` (Step 2.8 only), the four config files,
and `cleargate-enforcement.md` (both trees). "PR body generation is deterministic… no network
call required" is therefore prose the Developer will write into `SKILL.md`'s Phase D, executed
by a human/orchestrator at dispatch time — not code. Inventing a fictitious script path or
function name to assert against would fail TPV wiring-soundness (an import that resolves to
nothing is not "the feature is absent," it's "the test is malformed") and would commit the
Developer to a guessed contract nobody asked for. I wrote `scenario_cr107_p7_pr_body_and_eviction`
as a heading-anchored `sed` extraction of canonical `SKILL.md` §6 Phase D and §E.5, asserting on
their TEXT CONTENT (mentions the PR; does not shell out to `gh pr view`; names sprint goal + DoD
+ report as inputs). This is the same class of check the dispatch itself asks for in the
"Scope addition" doctrine case, just applied to a different file. **Limitation, stated plainly:**
these are heuristic/coarse — a Developer could satisfy the literal grep without the prose being
genuinely correct (e.g., mentioning "PR" once in an unrelated sentence). QA-Verify should still
read the actual SKILL.md diff by eye; these checks are a floor, not a substitute for that read.

## Not asserted, deliberately (per dispatch)

- **No config-parity check** between `.cleargate/config.yml` and
  `cleargate-planning/.cleargate/config.yml` (or the two `config.example.yml` files). Confirmed
  by direct read: live is 37 lines carrying `gates:`/`worktree:`; canonical is 19 lines,
  `wiki.ingest_buckets` only. Adding `vcs.sprint_pr` to both with different surrounding content
  and diffing nothing is correct per F4 — I did not write a scenario that diffs these files.
- **§1.6 heading position / `gate-section-index-pinning` fixture** — not re-verified by this
  harness. `cleargate-enforcement.md` is a knowledge doc, not a gated template (`TEMPLATE_FOR`
  has no entry for it), so no `section(N)` predicate targets it and there is no fixture coupling
  to protect here. Confirmed by inspection, not asserted mechanically (out of this test file's
  reach — that fixture lives in `cleargate-cli/test/docs/gate-section-index-pinning.node.test.ts`,
  a different repo).

## Caveat carried forward from the item itself (F5)

`.cleargate/scripts/test/test_close_pipeline.sh` is **live-only** — no counterpart exists under
`cleargate-planning/.cleargate/scripts/test/` (canonical ships 10 of the live 23 test scripts).
So this whole verification command, including everything I added, is **meta-repo-only**: the
canonical `close_sprint.mjs` change the Developer makes will ship to every `cleargate init`
install completely untested by this harness. Mirroring the test script is out of scope for
CR-107 (per the item's own amendment) and out of scope for this QA-Red dispatch. This is the
reason F2a/F2b's implementation must stay conservative (keep `--is-ancestor`, add the
fetch/origin fallback and squash detection, nothing else) — there is no automated safety net
for the shipped-to-everyone half of this change.

## flashcards_flagged

- "2026-08-29 · #test-harness #danger · test_close_pipeline.sh scenarios pass bare filenames to run_script.sh (no `node`, no path) — PATH lacks .cleargate/scripts and the file has no +x, so every one resolves 'command not found' (exit 127), and an 'exits non-zero' assertion reads that as PASS. Route through `node <path>` explicitly."

STATUS=done
