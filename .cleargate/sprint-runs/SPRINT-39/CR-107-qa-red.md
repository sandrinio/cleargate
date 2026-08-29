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

---

## Round 2 (TPV rulings applied)

role: qa

TPV verdict: `RULINGS-REQUIRED` (8 rulings, 3 blocking). Wiring was sound —
`arch_bounces` did not increment. All edits below are **test-file only**;
`close_sprint.mjs` (live/canonical), `config.yml` (live/canonical/examples),
and `cleargate-enforcement.md` remain byte-unchanged in the worktree.

### T1 (BLOCKING) — repaired

`scenario_cr107_p5_squash_merge_detected`'s P5a now asserts the Step 2.8
**verdict line itself** (`Step 2.8 failed: sprint/S-97 not merged to main.`),
not `$ec`. Measured cause of the original defect confirmed exactly as TPV
described: P5's fixture omits `CLEARGATE_SKIP_BUNDLE_CHECK=1` (P2/P3/P9 set
it, P5 never did), so the non-zero exit the old assertion relied on came
from Step 3.5's bundle hard-block, not Step 2.8. Did **not** add
`CLEARGATE_SKIP_BUNDLE_CHECK=1` as a shortcut — assert the step's own text,
per the ruling.

### T2 (BLOCKING) — added

New scenario `scenario_cr107_p10_never_merged_negative_control` (P10a/P10b),
registered in the run-all section immediately after P9. Fixture: `cs_reset_repo`
+ `cs_make_sprint_branch 97` + `cs_write_vcs_config "$CS_WORK" true`, **no
merge of any kind**. P10a asserts the generic not-merged verdict; P10b
asserts the output does NOT match `squash`.

### T3 (BLOCKING) — split into eviction-a / eviction-b

The single eviction check inside `scenario_cr107_p7_pr_body_and_eviction`
is now two assertions over the §E.5 slice:
- **eviction-a (retention):** `grep -qE 'git merge[^|]*sprint/'` (loose match,
  survives a reword) AND a `vcs.sprint_pr` mention anywhere in §E.5.
- **eviction-b (gating):** both literal `vcs.sprint_pr: true` and
  `vcs.sprint_pr: false` present in §E.5, i.e. the section must name BOTH
  branches, not just the key once.

### T4 (advisory) — applied, stub preferred over skip

Added `cs_make_gh_stub_path()` (a directory holding one executable no-op
`gh` script) and prepended it to `PATH` (not `env -i` — preserves the rest
of the ambient environment) in P4, P5, P6, and P10. Rationale measured, not
assumed: these four scenarios exercise `vcs.sprint_pr:true`'s git-only
ancestor/squash logic, which needs a `gh` binary to satisfy the presence
gate but — per the validated squash-probe recipe (merge-base / commit-tree /
cherry) — never actually invokes it. Chose the stub over a named skip per
the ruling's own preference ("a skip that fires on the grader's machine is
a silent hole").

### T5/T6/T7/T8 — not QA-Red's to apply

T5 (local-first, origin-fallback binding + message naming the matched ref)
is a **Developer** dispatch constraint — no test change requested, and none
made; P4's exact-string assertion (`...is merged to refs/heads/main.`) was
left untouched, confirmed still a legitimate regression guard by the mutant
run below. T6 (`cleargate-enforcement.md` two-tree `diff`) and T7 (config
key in all four files) are Developer obligations with no witness in this
harness by design (T7 is F4-required — no parity check exists or should
exist). T8 (pre-existing vacuity) is out of scope; none of the 10
pre-existing scenario functions were touched.

### Baseline re-measurement (worktree, test-only diff, no production change)

Redirected to log files, read after completion (N10). Run twice:

```
$ bash .cleargate/scripts/test/test_close_pipeline.sh > run1.log 2>&1; echo $?
1
$ tail -1 run1.log
=== Results: 20 passed, 23 failed ===

$ bash .cleargate/scripts/test/test_close_pipeline.sh > run2.log 2>&1; echo $?
1
$ tail -1 run2.log
=== Results: 20 passed, 23 failed ===

$ diff <(grep -E "^PASS:|^FAIL:" run1.log) <(grep -E "^PASS:|^FAIL:" run2.log); echo $?
0   (deterministic — identical across two runs)
```

20/23 = the prior 18/22 baseline, **plus 3 net new assertions** (P10a, P10b;
eviction split 1→2, net +1) — 18+2=20 passed, 22+1=23 failed. Every row that
was green stayed green; every row that was red stayed red; P5a flipped
identity (still green at baseline, now for the *correct* reason — see the
per-case table).

### Per-case RED/GREEN table (this round's rows only; measured, not predicted)

| Case | Baseline (this commit) | Notes |
|---|---|---|
| P5a (T1, rewritten) | **PASS (green)** | Baseline's Step 2.8 message is already the generic `not merged to main.` string even pre-feature — legitimate green, no longer an accidental one (see mutant proof below: this is what changes under M2b). |
| P5b | FAIL (red, unchanged) | No squash detection yet. |
| P10a (T2, new) | **PASS (green)** | The generic not-merged message already fires for a never-merged sprint today — regression guard, like P1/P4. |
| P10b (T2, new) | **PASS (green)** | Nothing mentions "squash" today — negative control holds trivially pre-feature; its value is entirely in what it catches post-feature (see M8 below). |
| eviction-a (T3) | FAIL (red) | No `vcs.sprint_pr` mention in §E.5 today. |
| eviction-b (T3) | FAIL (red) | Same. |
| P4, P6 (T4 shim added) | PASS / FAIL (unchanged) | Adding the `gh` stub to PATH did not change baseline pass/fail status for either — confirmed by direct measurement, not assumption. |

### Mutation proof — the three survivors, built and measured out-of-tree

Per the dispatch's "measure every red/green" instruction, and following the
same out-of-tree methodology TPV used: a `tar` copy of `.worktrees/CR-107`
excluding `.git` (source md5 verified equal to the worktree,
`8eabeddb79ce78713eba706bd4874ac0`), built in the scratchpad. **The worktree
itself was never touched by any of this** — confirmed `git status --porcelain`
empty and `HEAD` unchanged (`20efc39e`) both before and after.

**Reference implementation** (out-of-tree only, never committed): `vcs.sprint_pr`
read via a dependency-free line scan of `config.yml`; fail-closed `gh`/origin
gate placed before the `sprintNumMatch` test; `--is-ancestor` against
`refs/heads/main` first, `refs/remotes/origin/main` as fallback (message
names whichever ref matched); real squash detection via
`merge-base`/`commit-tree`/`cherry`; canonical `SKILL.md` §6 + §E.5 edited
with both `vcs.sprint_pr: true` and `vcs.sprint_pr: false` branches named;
`cleargate-enforcement.md` doctrine clause removed in both trees (byte-identical).

```
=== Results: 33 passed, 10 failed ===   exit 1
```

The 10 remaining failures are **exactly** the pre-existing legitimately-remaining
set TPV named: `Scenario 1b, 1c, 2a, 4a, 4b, 4c, 5a, 6a`, `CR-036 Scenario B`,
`Mirror check: reporter.md` (worktree-only, `.claude/` untracked). **Every
single CR-107 assertion (P1–P10, P7/P7c, eviction-a/b, doctrine ×4) is
green** — 23 of 23. This matches TPV's predicted `33 passed, 10 failed`
number pair exactly.

**Mutant M2b** (loosened `refs/remotes/origin/main` *fallback* only — local
`--is-ancestor` kept as the primary path, matching TPV's own characterization
that P4 stays green — replaced by "the branch merely exists on origin";
static squash string, no real probe):

```
=== Results: 30 passed, 13 failed ===   exit 1
```
Killed by: **P5a, P5b, P10a**. Stayed green: P1a, P1b, P2a, P2b, P3a, P3b,
**P4** (as TPV's table predicts — real local merge-commit still resolves via
the untouched local `--is-ancestor` path), **P6** (still "passed", for the
wrong reason — not required to kill), P9, P10b, eviction-a, eviction-b,
P7/P7c. **T1+T2 kill this mutant. Confirmed.**

**Mutant M8** (correct `--is-ancestor` + real origin fallback, kept
byte-identical to the reference; squash detection replaced by a hardcoded
boolean, no probe):

```
=== Results: 32 passed, 11 failed ===   exit 1
```
Killed by: **P10b only** — exactly matching TPV's own table row
(`M8 → PASS/KILL`). Everything else, including P5a and P5b, stays green
(P5b passes because the hardcoded string still happens to say "squash" for
the one fixture that IS a real squash — the danger was never P5, it was
always the false-positive on a never-merged sprint, which only P10b can see).
**T2 kills this mutant on its own. Confirmed.**

**Mutant M9** (§E.5's local-merge branch deleted entirely, unconditional
`gh pr merge --merge --delete-branch=false`, canonical tree only — mirroring
the live tree was skipped since this is a throwaway measurement, not a
commit):

```
=== Results: 31 passed, 12 failed ===   exit 1
```
Killed by: **eviction-a AND eviction-b** (both fire — eviction-a fails
because no `git merge...sprint/` substring survives the deletion).

**Mutant M9b** (local merge left **unconditional**, reworded to
`git merge "sprint/S-${NN}" --no-ff ...`, no `vcs.sprint_pr` mention anywhere
in §E.5):

```
=== Results: 31 passed, 12 failed ===   exit 1
```
Killed by: **eviction-a AND eviction-b** (eviction-a fails on the missing
`vcs.sprint_pr` mention despite the loose merge-regex still matching the
reworded line — proving the loose match alone does not create a false
green). **T3 kills both eviction mutants. Confirmed.**

### Summary: all three TPV survivors now die; reference implementation survives all four mutant runs plus its own clean run

| Implementation | Result | P5a | P5b | P10a | P10b | eviction-a | eviction-b |
|---|---|---|---|---|---|---|---|
| Reference | 33/10 | PASS | PASS | PASS | PASS | PASS | PASS |
| M2b (fail-open ancestor) | 30/13 | **KILL** | KILL | **KILL** | pass | pass | pass |
| M8 (hardcoded squash string) | 32/11 | pass | pass | pass | **KILL** | pass | pass |
| M9 (local merge deleted) | 31/12 | pass | pass | pass | pass | **KILL** | **KILL** |
| M9b (local merge reworded, ungated) | 31/12 | pass | pass | pass | pass | **KILL** | **KILL** |

No mutant scores identically to the reference implementation. Every
previously-surviving mutant is now killed by at least one of the four new/
repaired assertions, and the reference implementation is green on every one
of the 23 CR-107-scoped assertions across all five runs (its own plus the
four mutant deltas confirm nothing else broke).

### Not applied (with reason)

Nothing from the blocking or advisory-applied set was left unapplied. T5,
T6, T7, T8 are explicitly not QA-Red's to apply per the dispatch's own
"Not for you" section, and are recorded above for the Developer/orchestrator.

### Commands run, with exit codes read from completed logs (N10 compliance)

All logs redirected to files; read only after the command completed —
matches Round 1's N10 discipline.

```
$ bash -n .cleargate/scripts/test/test_close_pipeline.sh; echo $?
0

$ git status --porcelain            # before AND after every out-of-tree run
(empty, both times)

$ git rev-parse HEAD                # before AND after
20efc39eaee1bfa417c7d55d42a1d62b3b01bdf6   (unchanged throughout)
```

### flashcards_flagged

- "2026-08-29 · #test-harness #danger · A `gh`-gated feature makes every downstream green depend on the host PATH — pin a stub `gh` binary via PATH-prepend rather than trusting the ambient environment to have one."
- "2026-08-29 · #test-harness #mutation · An eviction check split into retention + gating halves catches both 'deleted entirely' and 'left unconditional, reworded' mutants; a single grep-for-the-old-literal catches neither."

STATUS=done
