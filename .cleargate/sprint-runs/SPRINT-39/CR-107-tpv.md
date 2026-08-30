---
story_id: CR-107
sprint_id: SPRINT-39
mode: TPV
wave: 11
milestone: M4
generated_by: architect
generated_at: 2026-08-29
baseline_commit: 20efc39e
verdict: RULINGS-REQUIRED
arch_bounces_increment: false
---

# CR-107 TPV — mutation gate on the QA-Red baseline

role: architect

## Verdict

**`TPV: RULINGS-REQUIRED`** — 8 rulings, **3 BLOCKING**.

**Wiring is sound. `arch_bounces` MUST NOT increment.** Every seam the baseline uses exists
(`close_sprint.mjs:47-76`, `:110`, `:654`, `:666-673`); every invocation resolves to a real file;
setup/teardown is complete; the `local var` / `var="$(...)"` / `ec=$?` exit-code idiom is written
correctly in all eight new scenarios (the classic `local x="$(...)"` masking bug is **absent**).
This is a **coverage** ruling plus **two measured harness defects**, not a wiring rejection.

The rejection reason is single and specific: **three mutants score identically to a correct
reference implementation (30 passed / 10 failed), and one of the three fails open on `main`.**

## What was run, and where

Everything ran **out of tree**, in a byte-identical non-git copy of `.worktrees/CR-107`
(`tar` copy, `.git` excluded, source md5 `8eabeddb79ce78713eba706bd4874ac0` verified equal).
`.worktrees/CR-107` was never written to. Confirmed at exit: `git status --porcelain` empty,
`HEAD` still `20efc39e`, branch still `story/CR-107`, test-file md5 unchanged. No commit, no
merge, no branch switch, no `dist/` rebuild, no `cleargate init`, and `close_sprint.mjs` was
never run against the real sprint (`SPRINT-39`). All fixtures use `SPRINT-97` / `SPRINT-TEST`
against throwaway git repos under the scratchpad.

## Determinism — CONFIRMED, 4 runs

| Run | Result | Exit |
|---|---|---|
| 1 | `18 passed, 22 failed` | 1 |
| 2 | `18 passed, 22 failed` | 1 |
| 3 | `18 passed, 22 failed` | 1 |
| 4 | `18 passed, 22 failed` | 1 |

`diff` of the full `^PASS:|^FAIL:` set: **identical across all four**. QA-Red's measurement
reproduces exactly, including out of a git repository — the harness shells out to `git` but
depends on no ambient repo state. **One environment dependency does exist and is not
pinned — see T4.**

---

## Finding 1 — the vacuous-PASS mechanism: quantified, and CONFINED to the pre-existing cases

### Measurement method

Built a tree (`vac/`) in which the **only** change is the invocation style: every
`bash "$RUN_SCRIPT" <name>.mjs` in the pre-existing scenarios rewritten to
`bash "$RUN_SCRIPT" node "${SCRIPTS_DIR}/<name>.mjs"`. Zero production-code change.

```
baseline : 18 passed, 22 failed
repaired : 27 passed, 17 failed     (9 assertions became reachable for the first time)
```

### The count

Of the **12 pre-existing passes**, **zero exercise `close_sprint.mjs`**:

| Class | Count | Rows |
|---|---|---|
| **Vacuous** — assertion satisfied without the code under test running | **4** | `Scenario 1a`, `Scenario 1d`, `CR-036 Scenario A`, `CR-036 Scenario C` |
| **Non-executing decoration** — greps a heredoc the test itself just wrote; touches no production code and would pass on an empty repo | **4** | `Scenario 3a`, `3b`, `3c`, `3d` |
| **Genuine** — real `diff` of two real files | **4** | the four `Mirror check:` rows |

Mechanism, confirmed verbatim from the run log: `run_script.sh: line 125: close_sprint.mjs:
command not found` (exit 127). `.cleargate/scripts/` is not on `PATH` and `close_sprint.mjs`
is `-rw-r--r--`. Scenario 1a asserts "exits non-zero" and 127 satisfies it. `CR-036 A` and
`CR-036 C` are worse — they pass on **`else`-branch fall-through** against empty output
(`test_close_pipeline.sh:562-566`, `:646-652`).

Of the **10 pre-existing failures**, **8 are caused solely by the bare-filename defect** —
proven: all eight flip green in the repaired tree (`1b, 1c, 2a, 4a, 4b, 4c, 5a, CR-036 B`).
The other two are:

- `Scenario 6a` — the fixture `.cleargate/sprint-runs/S-09/fixtures/sprint-08-shaped` is
  **absent from the main checkout too** (verified). Real, permanent, unrelated to worktrees.
- `Mirror check: reporter.md` — **QA-Red's diagnosis is wrong.** The two files are
  **byte-identical in the main checkout** (`diff` empty, verified). `.claude/` is untracked
  (N1 / CR-099) and therefore does not exist inside `.worktrees/CR-107` at all, so `diff`
  fails on a **missing file**, not a divergence. This row is a pure worktree artefact and is
  the entire delta between the worktree number and the main-checkout number.

**Bonus defect the vacuity was hiding:** in the repaired tree `CR-036 Scenario C` flips to a
**real FAIL** (`unexpected Step 3.5 failure mode for v1`). The vacuous pass was concealing a
live v1-advisory-path defect. Worth filing.

### Does the defect reach CR-107's 12 reds? — NO. Verified two ways.

1. **Mechanically.** All **8** invocations inside the CR-107 scenario block route through
   `bash "$RUN_SCRIPT" node "${SCRIPTS_DIR}/close_sprint.mjs"`. Grep of lines 655-1130 returns
   zero bare-filename invocations. QA-Red's claim is **true as stated**.
2. **By mutation — the stronger proof.** Under the reference implementation **all 12 reds flip
   green**. A vacuous red cannot flip on an implementation change; it flips on noise. All 12 are
   genuine feature-absence signals.

**Ruling: the vacuity is confined to the pre-existing cases. It is a follow-on defect, not
CR-107's, and CR-107's Developer must not be asked to fix it.** See T8.

---

## Finding 2 — P5a is itself vacuous, and F2a (squash detection) has NO WITNESS

This is the highest-severity finding available, and it is worse than QA-Red reported.

### 2a — P5a does not measure Step 2.8 at all

QA-Red labels P5a an "accidental green" that fires "via the generic not-merged path." Measured
directly: **P5a's non-zero exit does not come from Step 2.8.** It comes from **Step 3.5**.

P5 does not set `CLEARGATE_SKIP_BUNDLE_CHECK=1` (P2/P3/P9 do). With no `token-ledger.jsonl` in
the fixture state dir, Step 3.5 hard-blocks:

```
Step 2.8 passed: refs/heads/sprint/S-97 is merged to refs/heads/main.      <- Step 2.8 said MERGED
...
close_sprint: Step 3.5 FAILED: ... Cannot dispatch Reporter without bundle.
EXIT=1
```

That transcript is from mutant **M2b**, run against P5's exact fixture. Step 2.8 declared a
**squash-merged sprint MERGED**, and `P5a` still reported **PASS**. P5a is an `exit != 0`
assertion in a fixture class where the process exits non-zero regardless of Step 2.8's verdict.
It is structurally incapable of failing for a Step-2.8 reason.

(By contrast **P2a and P3a are sound**: they set `CLEARGATE_SKIP_BUNDLE_CHECK=1` and measured
exit **0** at baseline, which is what makes them real exit-code gates. Keep them exactly as
written.)

### 2b — the discriminating mutant, built and measured

Two mutants, both scoring **30 passed / 10 failed — byte-identical to the reference
implementation**:

- **M8** — `vcs:` config + fetch/origin fallback + a **hardcoded string** appended to every
  Step-2.8 failure when `vcs.sprint_pr` is on: *"If you squash-merged the PR, that strategy is
  unsupported."* No detection whatsoever.
- **M2b** — the same static string **plus** `--is-ancestor` **replaced** by "the branch exists
  on origin" (the stand-in for *"a PR exists and is closed"*). This is the exact fail-open the
  CR §"Existing Surfaces" amendment, M4 F2, and this dispatch all forbid.

Negative-control probe (`vcs.sprint_pr: true`, `gh` present, `origin` present, sprint pushed but
**never merged by any strategy**):

| Implementation | Step 2.8 verdict | names squash? |
|---|---|---|
| Reference | `failed: ... not merged to main.` | **no** (correct) |
| **M8** static string | `failed: ... not merged to main.` | **yes** — a false squash accusation |
| **M2b** loosened + string | **`passed`** | yes |

**M2b prints `Step 2.8 passed` for a sprint that was never merged at all.** That is the
terminal-boundary fail-open on `main`, and the entire baseline scores it perfect.

**Ruling: F2a has no witness. P5b measures only whether the string `squash` appears anywhere in
the output.** A closed-unmerged PR satisfying the gate is likewise unwitnessed — there is no
scenario in the file with `vcs.sprint_pr: true` + `gh` + `origin` + a genuinely-unmerged sprint.

### 2c — the repair, built and validated against every mutant

Two assertions close both holes. Both were measured, not proposed:

| Implementation | P5a **repaired** (squash fixture: assert `Step 2.8 failed:` on OUTPUT, not `$?`) | **P10** (never-merged fixture: `Step 2.8 failed:` AND output does NOT match `-i squash`) |
|---|---|---|
| Reference | PASS | PASS |
| M8 static string | PASS | **KILL** |
| M2b loosened + string | **KILL** | **KILL** |
| M2 loosened, no string | KILL | KILL |
| M12 no squash handling | KILL | PASS |
| M3b origin-only | KILL | PASS |

Every surviving mutant dies. The reference implementation survives both. See **T1** and **T2**.

---

## Finding 3 — P7 / P7c are a real floor; the eviction check is not

### P7 / P7c — diagnostic, narrowly, and they caught a real error during this TPV

The `sed` extraction is **section-scoped**, and that scoping earned its keep. My first reference
attempt anchored the Phase-D prose on `> 🎯 **Goal check.**` — which occurs **seven times** in
canonical `SKILL.md` (`:210, :229, :585, :621, :700, :739`, plus the E-phase one). A
first-occurrence string replace landed the whole paragraph at **`:210`**, inside §A.4, and **P7
went red**. Text added to the wrong section does **not** satisfy P7. That is a genuine check, not
decoration.

Its ceiling is low, though, and the Developer should know it:

- Today `sprint goal` **already matches** inside Phase D (the pre-existing 🎯 callout), so P7c
  really tests only two tokens: `DoD|Definition of Done` and `REPORT`.
- **One added sentence containing "PR", "DoD" and "report" satisfies P7 and P7c together.**
- The "no network" half of P7 is a negative grep for the literal `gh pr view` only. `gh pr
  create` (required) and `gh api` both pass.

**Ruling: keep P7/P7c as a floor. They change value between a correct and an incorrect edit and
they are section-scoped. Do not treat them as evidence the prose is right — QA-Verify still reads
the diff.** Advisory.

### The eviction check IS decoration-adjacent — two survivors

The check is `grep -q 'git merge sprint/S-NN --no-ff'` AND `! grep -qi 'vcs.sprint_pr'` over the
§E.5 slice. It fires only on the exact current literal. Two mutants, both **30/10, tied with the
reference**:

- **M9** — §E.5's local merge **deleted entirely** and replaced with an unconditional
  `gh pr merge --merge`. This **breaks every `vcs.sprint_pr: false` install — i.e. the default,
  and every ClearGate target repo without a GitHub remote** — and the check passes.
- **M9b** — the local merge left **unconditional**, merely reworded to
  `git merge "sprint/S-${NN}" --no-ff …`. The literal no longer matches, so the check passes
  while the exact thing it exists to forbid is still there.

**Ruling: the eviction check asserts the presence of one string, not the conditionality of the
merge. Its kill set is a single mutant — "leave the literal byte-identical and mention
`vcs.sprint_pr` nowhere" — which is the least likely Developer error.** See **T3**.

---

## Full mutant matrix

Reference implementation = `vcs.sprint_pr` read dependency-free from `REPO_ROOT/.cleargate/config.yml`;
fail-**closed** `gh`/remote gate placed **before** the `sprintNumMatch` test; `--is-ancestor` against
`refs/heads/main` **first**, `refs/remotes/origin/main` as a **fallback**; real squash detection via
`git commit-tree` + `git cherry`; `SKILL.md` §6 + §E.5 edits; doctrine clause removed in both trees;
`vcs.sprint_pr` in both `config.yml` files with different surrounding content.

| # | Mutant | Result | Killed by | Verdict |
|---|---|---|---|---|
| **REF** | reference implementation | **30 / 10** | — (18/18 CR-107 green) | baseline is **SATISFIABLE** |
| M1 | **the fail-open copy** — `close_sprint.mjs:686-692`'s warn-and-continue shape reused for absent `gh` | 27 / 13 | **P2a**, P3a, P9 | **KILLED on EXIT CODE** ✔ |
| M2 | loosened ancestor (`--is-ancestor` → "PR exists and is closed"), no squash string | 29 / 11 | P5b only | killed, but only by the string check |
| **M2b** | **loosened ancestor + static squash string** | **30 / 10** | **nothing** | **SURVIVES — fail-open on `main`** |
| M3a | F2b variant: `git fetch` then still read `refs/heads/main` | 29 / 11 | **P6** | KILLED ✔ |
| M3b | F2b variant: read `refs/remotes/origin/main` **instead of** local | 28 / 12 | **P4**, P5b | **correct-per-amendment impl BOUNCED** — see T5 |
| M3c | neither fetch nor origin ref | 29 / 11 | **P6** | KILLED ✔ |
| M4b | `vcs` gate placed **inside** the numeric branch (reachable only past the `:659` skip) | 29 / 11 | **P9** | KILLED ✔ |
| M5 | `vcs.sprint_pr` added to the **live** `config.yml` only | **30 / 10** | nothing | **correct** — no parity check exists (F4 honoured); see T7 |
| M6a | doctrine: delete the **whole** clause incl. the base clause | 28 / 12 | doctrine live-base **and** canon-base | KILLED ✔, both trees |
| M6b | doctrine: fix the **live** tree only | 29 / 11 | doctrine canon-strip | KILLED ✔ |
| M7 | absent `vcs:` block defaults to **`true`** | 29 / 11 | **P1a** | KILLED ✔ — regression guard works |
| **M8** | squash "detection" = **hardcoded string** | **30 / 10** | **nothing** | **SURVIVES — F2a unwitnessed** |
| **M9** | eviction: §E.5 local merge **deleted**, unconditional `gh pr merge` | **30 / 10** | **nothing** | **SURVIVES — breaks the default install** |
| **M9b** | eviction: local merge left **unconditional**, reworded | **30 / 10** | **nothing** | **SURVIVES** |
| M11 | config read from `__dirname/../..` instead of `REPO_ROOT` | 28 / 12 | **P1a**, **P1b** | KILLED ✔ |
| M12 | no squash handling at all | 29 / 11 | **P5b** | KILLED ✔ |
| VAC | *(harness probe)* pre-existing invocations repaired, zero production change | 27 / 17 | — | vacuity measurement |

**Answers to the four mutants the dispatch named explicitly:**

- **The fail-open copy → KILLED by P2a on EXIT CODE.** P2a asserts `[[ $ec -ne 0 ]]`, and P2's
  fixture sets `CLEARGATE_SKIP_BUNDLE_CHECK=1` so nothing downstream masks the exit code. F3's
  requirement is met. **P2b (the message check) is a soft signal only and must stay soft.**
- **The loosened ancestor check → SURVIVES (M2b).** A closed-unmerged PR satisfying the gate has
  no witness. **T1/T2 required.**
- **Stale-local-`main` (F2b) → P6 kills the fetch-only and the do-nothing variants, correctly.
  But it does NOT accept both valid routes** — the origin-only route is bounced by **P4**, not
  by P6. **T5 required.**
- **The `:659` bypass → KILLED by P9** (M4b). P9 works as designed. Note P9's assertion is
  negative (`fail if the bare skip message appears`), so it also passes on a crash — acceptable
  as written, no change requested.
- **Config mutants → M5 survives, and that is CORRECT.** Nothing in the file asserts parity
  between the two `config.yml` files or the two `config.example.yml` files. F4 is honoured; the
  hazard of a Developer "fixing" parity and deleting this repo's `gates:`/`worktree:` blocks is
  **not** created by this harness. Confirmed by direct read of every scenario.
- **Doctrine mutants → both correctly handled.** M6a (delete both clauses) dies on the base-clause
  assertion in **both** trees; M6b (live only) dies on the canonical assertion. The two clauses
  live on the **same line** (`cleargate-enforcement.md:101` in both trees, `diff` empty), and both
  phrases are **single-site** in the file, so the whole-file greps are section-scoped by accident.
  **See T6 for the one gap.**
- **Regression mutant → KILLED by P1a (M7) and by P1a+P1b (M11).** P1a/P1b are the guard the
  blast-radius story rests on, and they hold. Every install without a GitHub remote is protected.

---

## Is the baseline satisfiable? — YES. Measured, not asserted.

A reference implementation reaches **all 18 CR-107 assertions green**.

| Where the harness is run | Expected post-fix line | Exit |
|---|---|---|
| **`.worktrees/CR-107`** (the Developer's tree) | **`=== Results: 30 passed, 10 failed ===`** | **1** |
| main checkout (`.claude/` present) | `=== Results: 31 passed, 9 failed ===` | 1 |

The one-row delta is `Mirror check: reporter.md`, which is red **only** because `.claude/` does
not exist inside a worktree. Both numbers were measured.

**The harness still exits 1 after a complete, correct fix.** Acceptance is the **number pair**,
never the exit code. Anyone who "makes the suite green" has touched the 10 pre-existing failures
and must be kicked back.

---

## Cross-Cutting Rule 4 / `gate-section-index-pinning` — NOT ENGAGED. Verified.

- `TEMPLATE_FOR` (`cleargate-cli/test/docs/gate-section-index-pinning.node.test.ts:111-118`) has
  **seven** entries: `epic, story, cr, bug, initiative, hotfix, spike`. `cleargate-enforcement.md`
  appears **0** times in that test file and is not a gated type.
- Under the reference implementation, heading **counts and ORDER** are unchanged in every file
  CR-107 touches: `cleargate-enforcement.md` (both trees) `## 16 → 16`, `### 51 → 51`, `diff` of
  the heading list empty; canonical `SKILL.md` `## 14 → 14`, `### 30 → 30`, heading list `diff`
  empty. The doctrine fix is a **clause deletion inside line 101** — no `## ` moves.
- **`18 = 16 pinnable + 2 known-unpinnable` is unaffected** (`:433` `18`, `:435` `16`, `:645`
  `16`). **No M4 Developer opens `expected-headings.ts`** (N6). CR-107 gives no reason to.
- The reference implementation's two `cleargate-enforcement.md` copies are **byte-identical**
  (Cross-Cutting Rule 1 satisfiable).

---

## The canonical-ships-untested limit — CONFIRMED, and restated

- Live `.cleargate/scripts/test/` — **23** files.
- Canonical `cleargate-planning/.cleargate/scripts/test/` — **10** files:
  `cr077_eviction.red.sh, cr078_init.test.sh, cr079_provision.red.sh, cr080_wrapper.test.sh,
  cr081_qa_red_lint.red.sh, test_assert_story_files.sh, test_collision_surface.sh,
  test_file_surface.sh, test_flashcard_gate.sh, test_prep_qa_context.sh`.
- **`test_close_pipeline.sh` is ABSENT from canonical.**

**Consequence, restated for the dispatch:** the canonical `close_sprint.mjs` — the copy that
`cleargate init` installs into every target repo — **ships to every install with zero automated
coverage**. This harness proves nothing about it beyond byte-identity to the live copy (the one
`Mirror check: close_sprint.mjs` row). That is exactly why F2a/F2b's fix must stay conservative:
**keep `--is-ancestor`, add the origin fallback and the squash probe, change nothing else in
Step 2.8, and touch no other step.** A regression in the shipped copy has no detector.

---

## Rulings

### T1 — BLOCKING → **QA-Red**. Repair P5a: assert the Step-2.8 verdict, not the process exit code.

`scenario_cr107_p5_squash_merge_detected` (`test_close_pipeline.sh:965-972`) asserts
`[[ $ec -ne 0 ]]`. Measured: that exit code is produced by **Step 3.5's** bundle hard-block, not
by Step 2.8. Mutant **M2b** makes Step 2.8 print `Step 2.8 passed` on a squash-merged sprint and
P5a still reports **PASS**.

**Change:** replace the exit-code assertion with an assertion on the output, e.g.
`echo "$out" | grep -q "Step 2.8 failed: sprint/S-97 not merged to main."`.
Do **not** simply add `CLEARGATE_SKIP_BUNDLE_CHECK=1` to the fixture — the exit code would still
be an indirect proxy; assert the step's own verdict line. Measured effect: kills **M2b**;
reference implementation still passes.

### T2 — BLOCKING → **QA-Red**. Add **P10**, the never-merged negative control. This is F2a's only possible witness.

There is no scenario in the file with `vcs.sprint_pr: true` + `gh` present + `origin` present +
a sprint that was **never merged by any strategy**. Without it, a hardcoded string is
indistinguishable from real squash detection (**M8**, 30/10), and a loosened ancestry check is
indistinguishable from a correct one (**M2b**, 30/10).

**New scenario, fixture = `cs_reset_repo` + `cs_make_sprint_branch 97` + `cs_write_vcs_config
"$CS_WORK" true` and NO merge of any kind:**

- **P10a** — output contains `Step 2.8 failed: sprint/S-97 not merged to main.`
- **P10b** — output does **NOT** match `grep -qi 'squash'`.

Measured kill matrix for T1+T2 together: REF PASS/PASS · M8 PASS/**KILL** · M2b **KILL**/**KILL**
· M2 KILL/KILL · M12 KILL/PASS · M3b KILL/PASS. **All three survivors die; the reference
implementation survives both.**

### T3 — BLOCKING → **QA-Red**. The eviction check must assert conditionality, not one literal.

**M9** (delete the local merge, replace with an unconditional `gh pr merge`) and **M9b** (keep the
merge unconditional, reword it) both score **30/10**. M9 is the dangerous one: it breaks the
`vcs.sprint_pr: false` path — the **default**, and the only path available to every ClearGate
install without a GitHub remote.

**Change: split into two assertions over the §E.5 slice.**

- **eviction-a (retention)** — §E.5 still contains a local `git merge` **and** a
  `vcs.sprint_pr` mention. Match the merge loosely (`grep -qE 'git merge[^|]*sprint/'`) so a
  reword does not create a false green.
- **eviction-b (gating)** — §E.5 mentions `vcs.sprint_pr` **and** distinguishes the two branches
  (e.g. matches both `sprint_pr: true` and `sprint_pr: false`).

Rationale: the CR's own §4 eviction wording — *"the local merge is reachable only on the
`vcs.sprint_pr: false` branch"* — has two halves, and the shipped check tests neither. It tests
"the old literal is gone."

### T4 — advisory → **QA-Red**. Three post-fix greens silently depend on `gh` being on the host PATH.

Measured: with a correct implementation and a `gh`-free PATH, P4's fixture yields
`Step 2.8 failed: vcs.sprint_pr is enabled but the gh CLI is not on PATH.` — so **P4, P5b and P6
go RED on any machine without `gh`**, against a correct implementation. The baseline is
`gh`-independent only because no `gh` check exists yet; the dependency appears the moment the
feature lands. QA-Red built `cs_make_no_gh_path` for the negative direction and no positive
counterpart.

**Change (one of):** (a) add a `cs_make_gh_stub_path` helper that puts an executable `gh` stub on
PATH for P4/P5/P6/P10, or (b) have those scenarios `skip` with a named reason when
`command -v gh` is empty. **Do not leave it implicit.** Not blocking today — `gh` is present at
`/opt/homebrew/bin/gh` on this machine — but it makes the acceptance number machine-dependent.

### T5 — BLOCKING (as a **dispatch constraint**, no QA-Red edit) → **Developer**. P4 pins the local ref. Do not replace it.

`CR-107 §2 AMENDMENT` and M4 **F2b** both say: *"Fetch first, or consult
`refs/remotes/origin/main`."* Read literally, the second option is a **replacement**, and a
Developer who implements it that way is **bounced**. Measured (**M3b**, 28/12): killed by **P4**
and P5b.

Cause: P4's fixture (`cs_reset_repo` + merge into **local** main, never pushed) leaves
`refs/remotes/origin/main` at the seed commit, and P4 asserts the message string
`Step 2.8 passed: refs/heads/sprint/S-97 is merged to refs/heads/main.` **verbatim, including the
ref name**, with `vcs.sprint_pr: true`.

**Binding constraint for the Developer, proven necessary by measurement:**
**check `refs/heads/main` FIRST; consult `refs/remotes/origin/main` ONLY as a fallback when the
local check fails; and keep the `Step 2.8 passed: <sprint> is merged to <ref>` message naming
whichever ref actually satisfied it.** That ordering — and only that ordering — satisfies P4 and
P6 simultaneously. QA-Red's own fixture note ("both named fixes reduce to the same observable
requirement") is **wrong**: they do not, and P4 is where the difference bites.

**No QA-Red change requested.** P4 is a legitimate regression guard for F2's "this already works
today"; the amendment's wording is what is ambiguous, and this ruling resolves it.

### T6 — advisory → **Developer**. `cleargate-enforcement.md` two-tree parity has no witness.

The doctrine scenario runs two independent greps per tree. A Developer who edits **both** trees
but with **different wording** passes all four assertions while the trees diverge — a
Cross-Cutting Rule 1 violation with no detector. `scenario_mirrors` covers `sprint_report.md`,
`prefill_report.mjs`, `close_sprint.mjs`, `suggest_improvements.mjs` and `reporter.md` —
**not** `cleargate-enforcement.md`.

**Developer obligation:** run `diff .cleargate/knowledge/cleargate-enforcement.md
cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md` before committing and report
"empty". Not asked of QA-Red — adding a fifth mirror row is a scope decision, and the `diff` is
free.

### T7 — advisory → **Developer**. The canonical `config.yml` edit has no witness. Do it anyway.

**M5** (add `vcs.sprint_pr` to the live file only) scores **30/10**. That is *correct* — F4
forbids a parity check and none exists, so this harness cannot see the canonical config at all.
The CR requires the key in **all four** files. Since the default when the key is absent is
`false`, omitting it is behaviourally harmless but leaves the shipped seed undocumented.

**Restated so it cannot be misread:** add `vcs.sprint_pr` to `.cleargate/config.yml` (37 lines,
carries this repo's `gates:` + `worktree:`) and to `cleargate-planning/.cleargate/config.yml`
(19 lines, the first-install seed), **with different surrounding content**, and to both
`config.example.yml` files. **Diff none of them. Do not add a parity check.**

### T8 — advisory → **orchestrator**. The pre-existing vacuity is a follow-on defect. File it; do not hand it to CR-107.

4 vacuous passes + 4 non-executing self-assertions + 8 of the 10 pre-existing failures all trace
to one line-level defect: bare filenames passed to `run_script.sh`. Repairing the invocation
style alone (zero production change) moves the file from `18/22` to `27/17` and **exposes a real
latent failure in `CR-036 Scenario C`**.

`test_close_pipeline.sh` has been in this state since before `2deaf216`, so scenarios 1/2/4/5/6
and CR-036 B have not exercised `close_sprint.mjs` for many sprints. **Out of scope for CR-107**
(the Developer must not touch those scenario functions, and must not be judged on their 10 reds),
but it should be filed. QA-Red's flashcard on this is correct and worth recording.

---

## § Numbers for the Developer's dispatch

### Expected post-fix line

```
=== Results: 30 passed, 10 failed ===        # run from .worktrees/CR-107 — exit 1
```

Exit code stays **1**. **Acceptance is the number pair, not the exit code.** (From the main
checkout the same fix reads `31 passed, 9 failed`; the extra pass is the `reporter.md` mirror row,
which is red in a worktree only because `.claude/` is untracked.)

Assuming T1/T2/T3 land, add the new assertions to the pass column: **P10a, P10b** and the split
eviction check give `33 passed, 10 failed` in the worktree. Re-measure after the QA-Red patch —
do not carry this number forward blind.

### Red → green (12 today; all must flip)

`P2a` · `P2b` · `P3a` · `P3b` · `P5b` · `P6` · `P9` · `P7` · `P7c` · `eviction` ·
`doctrine live-strip` · `doctrine canon-strip`

### Must-stay-green (6 today; a break here is a kick-back on its own)

`P1a` · `P1b` · `P4` · `P5a` · `doctrine live-base` · `doctrine canon-base`

Plus the four `Mirror check:` rows for `sprint_report.md`, `prefill_report.mjs`,
`close_sprint.mjs`, `suggest_improvements.mjs` — **`close_sprint.mjs` must stay byte-identical
across the two trees.**

### Pre-existing failures that legitimately remain — **10** (worktree) / **9** (main checkout)

`Scenario 1b` · `1c` · `2a` · `4a` · `4b` · `4c` · `5a` · `6a` · `CR-036 Scenario B` ·
`Mirror check: reporter.md` *(worktree-only)*

**None of these is the Developer's to fix.** Eight are the bare-filename defect, one is a deleted
fixture, one is a worktree artefact. Touching `scenario_1/2/4/5/6` or `scenario_cr036_*` is a
kick-back.

### Implementation constraints every mutant proved necessary

1. **Fail-CLOSED on absent `gh` and on absent `origin`: write the error AND `process.exit(1)`.**
   Copying `close_sprint.mjs:686-692`'s `mergeCheckAvailable = false` + warning + continue
   (commented *"fail-open"* at `:694-695`) is mutant **M1** — killed by P2a/P3a/P9. Reuse the
   `try/catch` **shape** from `:604-631`; invert the **outcome**.
2. **Place the `vcs` gate BEFORE the `sprintNumMatch` test** (`close_sprint.mjs:658`). Inside the
   numeric branch it is mutant **M4b**, killed by P9.
3. **`refs/heads/main` FIRST, `refs/remotes/origin/main` as FALLBACK. Never a replacement.** The
   replacement is mutant **M3b**, killed by P4. Print the ref that actually satisfied the check.
   `git fetch` alone is mutant **M3a**, killed by P6 — fetch never advances a local branch.
4. **Keep `--is-ancestor`.** Replacing it with any PR-state query is mutant **M2/M2b** — a
   closed-unmerged PR then satisfies the only gate protecting `main`.
5. **Squash detection must be a real probe, not a string.** A static hint is mutant **M8**. The
   validated dependency-free recipe (measured working on the fixture and on a never-merged
   control):
   ```
   mb=$(git merge-base <mainRef> <sprintRef>)
   probe=$(git commit-tree $(git rev-parse <sprintRef>^{tree}) -p $mb -m probe)
   git cherry <mainRef> $probe        #  '- <sha>' => already in main (squashed)
   ```
   It must stay silent on a never-merged sprint (T2/P10b).
6. **Read the config from `REPO_ROOT`**, i.e. `path.join(REPO_ROOT, '.cleargate', 'config.yml')`.
   Reading from `path.resolve(__dirname, '..', '..')` is mutant **M11**, killed by P1a+P1b.
7. **Absent `vcs:` block, or absent `sprint_pr` key, MUST mean `false`.** Defaulting to `true` is
   mutant **M7**, killed by P1a.
8. **No YAML dependency.** `close_sprint.mjs` imports no YAML parser today, and `js-yaml` lives in
   the meta-repo root `node_modules/` which **does not exist inside a worktree** and does not
   exist in a target install. Use a line scan. Precedent: `pre_gate_common.sh:193
   read_provision_config` (awk, *"keeps it dependency-light and avoids a full YAML parse"*).
9. **Do not add a parity check for `config.yml` or `config.example.yml`,** and do not overwrite
   either with the other (F4 / STORY-054-04 R22 — that deletes this repo's `gates:` and
   `worktree:` blocks).
10. **Locate every `SKILL.md` edit by heading text, and verify you hit the right section.**
    `> 🎯 **Goal check.**` occurs **seven** times (`:210, :229, :585, :621, :700, :739`, +1);
    `## 6. Phase D — Sprint Walkthrough` occurs **once** (`:608`). This TPV's own first attempt
    landed the Phase-D paragraph at `:210` and P7 caught it.
11. **Edit only `cleargate-planning/.claude/skills/sprint-execution/SKILL.md`** (N1). The live
    copy is untracked; a commit containing only live-tree edits contains nothing. (Live is
    byte-identical at 787 lines as of R8, so the Gate-4 re-sync is a straight copy.)
12. **`cleargate-enforcement.md`: delete only the `which strips gitignored ... and` clause; keep
    `cuts off the wrong base`; both trees, same commit, `diff` empty.** Deleting both clauses is
    mutant **M6a**; live-only is **M6b**. Move no heading (`## ` count and order are pinned).
13. **§E.5 must retain a `vcs.sprint_pr: false` branch carrying the local merge.** Deleting it is
    mutant **M9** — it breaks the default install and today's eviction check does not notice.
14. **`--assume-ack` is untouched.** Nothing in CR-107 goes near `close_sprint.mjs`'s ack path,
    and the CI-token rule stands.

---

## Wiring verification (the five TPV checks)

| # | Check | Result |
|---|---|---|
| 1 | Invocations resolve to real modules at cited paths | **PASS** — `RUN_SCRIPT` / `SCRIPTS_DIR` resolve; all 8 CR-107 calls target the real `close_sprint.mjs`; zero bare-filename calls in new code |
| 2 | Signatures match the real surface | **PASS** — every env seam used exists: `CLEARGATE_FORCE_MERGE_STATUS` (`:49`, `:666-673`), `CLEARGATE_REPO_ROOT` (`:52`, `:110`), `CLEARGATE_SKIP_{MERGE,WORKTREE,LIFECYCLE,BUNDLE,DEFERRED_VERIFY,SPRINT_TRENDS,SKILL_CANDIDATES,FLASHCARD_CLEANUP}_CHECK` — all documented at `:38-76`. **No fourth seam added** (M4 "Reuse" honoured) |
| 3 | Mocked methods exist on the mocked object | **N/A** — shell harness, real subprocesses, no mocks |
| 4 | Setup/teardown leaves no orphan state | **PASS** — every scenario `rm -rf`s its `mktemp` dirs, `CS_ROOT` and the PATH shim. `run_script.sh` writes incident JSON on every non-zero child exit, but `.cleargate/sprint-runs/**/.script-incidents/` is gitignored (`.gitignore:75-76`), so a suite run does not dirty `git status`. **Verified: worktree porcelain empty.** |
| 5 | Naming follows `sprint_context.md` §Test Stack | **PASS** — §Test Stack's `*.red.node.test.ts` governs the `node:test` suite; CR-107's verification command is the shell harness named in the CR §4 and in the M4 plan's test table. Correct harness |

One positive note worth carrying: every CR-107 scenario pre-declares `local … out ec` and then
assigns `out="$(…)"` on its own line before `ec=$?`. The `local x="$(cmd)"` exit-code-masking
pitfall — which would have made **every** exit-code assertion vacuous — is **absent**.

---

## Script Incidents

None. No `run_script.sh` invocation of mine failed. Incident JSONs produced by the scenarios'
own deliberately-failing sub-invocations landed inside the scratchpad sandbox
(`…/scratchpad/base/.cleargate/sprint-runs/**/.script-incidents/`), never in the repo, and are
gitignored regardless.

---

## flashcards_flagged

- `2026-08-29 · #test-harness #danger · An "exits non-zero" assertion is not a gate when a LATER pipeline step also exits non-zero — assert the step's own verdict line, not $?.`
- `2026-08-29 · #test-harness #mutation · A string-presence check for a DETECTED condition needs a negative-control fixture, or a hardcoded string scores identically to real detection.`
- `2026-08-29 · #test-harness #danger · An eviction check that greps for the old literal passes on deletion AND on rewording — assert the new conditionality, not the old string's absence.`
- `2026-08-29 · #dogfood-split #skill · "> 🎯 **Goal check.**" occurs 7× in SKILL.md; a first-occurrence string replace lands in §A.4, not Phase D. Anchor on the unique "## N. Phase X" heading.`
- `2026-08-29 · #worktree #test-harness · A mirror check against a .claude/** path is always RED inside a worktree — .claude/ is untracked, so diff fails on a missing file, not a divergence.`

STATUS=done
