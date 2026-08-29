---
story_id: CR-107
sprint_id: SPRINT-39
mode: QA-Verify
wave: 11
milestone: M4
generated_by: qa agent
generated_at: 2026-08-29
baseline_commit_qa_red_round2: dbb6da6c
developer_commit: 83bd7db6
---

# CR-107 QA-Verify — sprint→main merge goes through a pull request

role: qa

## Verdict

**QA: PASS**

## Independent re-run (three times, redirected per N10)

`bash .cleargate/scripts/test/test_close_pipeline.sh`, run from `.worktrees/CR-107` (branch
`story/CR-107` @ `83bd7db6`), output redirected to files, read from the completed files:

| Run | Result line | Exit |
|---|---|---|
| 1 | `=== Results: 33 passed, 10 failed ===` | 1 |
| 2 | `=== Results: 33 passed, 10 failed ===` | 1 |
| 3 | `=== Results: 33 passed, 10 failed ===` | 1 |

`diff` of the sorted `^PASS:|^FAIL:` line sets across all three runs: **empty** (run1==run2==run3).
Fully deterministic. This matches TPV's own forward projection exactly ("Assuming T1/T2/T3 land ...
give 33 passed, 10 failed in the worktree") and the Developer's five independently-reported runs.

**Failing set, exact match to the expected pre-existing list (10 items, none the Developer's):**
`Scenario 1b · 1c · 2a · 4a · 4b · 4c · 5a · 6a · CR-036 Scenario B · Mirror check: reporter.md`.
Verified byte-for-byte against the dispatch's named list — no member differs, nothing extra,
nothing missing.

All 21 CR-107-scoped assertions PASS in every run: `P1a P1b P2a P2b P3a P3b P4 P5a P5b P6 P9
P10a P10b P7 P7c eviction-a eviction-b doctrine(live-strip/live-base/canon-strip/canon-base)`,
plus all 4 `Mirror check:` rows for `sprint_report.md`, `prefill_report.mjs`, `close_sprint.mjs`,
`suggest_improvements.mjs`.

## No test file modified (verified independently)

`git diff dbb6da6c 83bd7db6 -- .cleargate/scripts/test/test_close_pipeline.sh` → **empty**. The
Developer's commit touches exactly the 9 non-test files the M4 Task Breakdown names (`close_sprint.mjs`
×2 trees, `SKILL.md` canonical only, `cleargate-enforcement.md` ×2 trees, `config.yml` ×2,
`config.example.yml` ×2). Confirmed via `git diff --stat`.

## One commit, amended once

`git log story/CR-107` shows exactly one Developer commit (`83bd7db6`) stacked on QA-Red round 2
(`dbb6da6c`). Matches the Developer's own "amended once pre-review" claim (nothing to independently
verify about the amendment itself — only the final state is checkable, and it is correct: live
`config.yml` reads `false`, matching the orchestrator ruling below).

## The orchestrator ruling — verified, not re-litigated

`vcs.sprint_pr: false` in **both** `config.yml` files — confirmed by direct `git diff` read (below).
`config.example.yml` in both trees documents the key with a `false` default and prose explaining the
`gh` + `origin` requirement (the "merge-commit strategy" phrase from the ruling is not quoted verbatim
in the example comments, but the squash-note string inside `close_sprint.mjs` itself carries that
detail — advisory gap only, not a defect). **No parity check exists between any of the four files**
(grepped the harness — F4 honoured) and **no `diff` was run or asserted between any pair** — confirmed
by reading `cs_write_vcs_config` and the P1-P10 fixtures, none of which touches the real repo's config
files.

```
$ git diff dbb6da6c 83bd7db6 -- .cleargate/config.yml cleargate-planning/.cleargate/config.yml
+vcs:
+  ...
+  sprint_pr: false          (live, 37→45 lines, gates:/worktree: blocks intact)
+vcs:
+  ...
+  sprint_pr: false          (canonical, 19→27 lines)
```

## Fourteen constraints — verified by reading the code myself

1. **Fail-CLOSED on absent `gh`/`origin`, `process.exit(1)` both branches.** CONFIRMED —
   `close_sprint.mjs:778-791` (`isGhOnPath()` false → write error + `process.exit(1)` at :783;
   `hasOriginRemote()` false → write error + `process.exit(1)` at :790). The helpers (`:164-185`)
   wrap their git probes in the same try/catch-boolean shape as the pre-existing fail-open block
   at `:843-850` (unchanged, still commented "fail-open" — kept for the git-unavailable case, a
   different failure mode); the new gh/origin gate reuses that shape and inverts the outcome to
   `exit(1)`. Test evidence: P2a/P3a assert the exit code itself (not just stderr text), both PASS.
2. **`vcs` gate sits BEFORE `sprintNumMatch`.** CONFIRMED — gate block `:774-792`, `sprintNumMatch`
   test at `:794`. P9's fixture (`SPRINT-TEST`, non-numeric) still hits the gate and PASSES.
3. **`refs/heads/main` first, `refs/remotes/origin/main` fallback only, never replacement; message
   names whichever ref matched.** CONFIRMED — `mainRef` initialized `'refs/heads/main'` (`:799`),
   first `--is-ancestor` check against it (`:812-816`), fallback only inside the `exitStatus===1`
   catch branch (`:820-841`) and only `if (vcsSprintPr && hasOriginRemote(...))`, `mainRef`
   reassigned to `originRef` **only on fallback success** (`:835`). Success message at `:857` uses
   the (possibly-reassigned) `mainRef` variable. P4 (real local merge) still prints the exact
   pre-existing string with `refs/heads/main`; P6 (stale local, merged on origin) resolves via
   the fallback. Not a `git fetch`-only fix — no `fetch` call exists in the diff.
4. **`--is-ancestor` retained, not replaced by a PR-state query.** CONFIRMED — both call sites
   (`:814`, `:831`) use `git merge-base --is-ancestor`. No `gh pr view`/`gh pr list` call anywhere
   in the diff.
5. **Squash detection is a real probe, silent on never-merged.** CONFIRMED — `isSquashMerged`
   (`:200-222`): `git merge-base` → `git rev-parse ^{tree}` → `git commit-tree` → `git cherry`,
   returns true only if a cherry line starts with `-`. No hardcoded string. Test evidence: P5b
   (squash fixture) names squash; P10b (never-merged fixture) does NOT name squash — both PASS,
   which is exactly the discriminating pair TPV's T1/T2 rulings demanded. Read the scenario source
   myself (`test_close_pipeline.sh:973-1017`, `:1097-1128`) — P5a/P10a assert the Step 2.8 verdict
   *line*, not `$?`, closing the exact hole TPV found in the pre-ruling harness.
6. **Config read from `REPO_ROOT`.** CONFIRMED — `readVcsSprintPr(REPO_ROOT)` called at `:776`;
   `REPO_ROOT` (`:110-112`) is the file's existing, already-used constant (test-seam-overridable via
   `CLEARGATE_REPO_ROOT`), not a fresh `path.resolve(__dirname, '..', '..')` computed inline for
   this feature. P1a/P1b (regression guards) and mutant M11's kill-by-P1a/P1b (per TPV) both rest
   on this; nothing in the diff introduces a second root-resolution path.
7. **Absent `vcs:`/`sprint_pr` ⇒ `false`.** CONFIRMED — `readVcsSprintPr` (`:126-155`) returns
   `false` on file-read failure (`:132`), and falls through to the final `return false` (`:154`) if
   the block or key is never found. P1a's fixture (no `vcs:` block at all) confirms this at runtime.
8. **No YAML dependency.** CONFIRMED — imports at `:77-84` are `fs`, `path`, `url`,
   `child_process`, `./constants.mjs`, `./validate_state.mjs`, `./_migrate-schema-v3.mjs`,
   `./lib/report-filename.mjs`. No `js-yaml` or any YAML package. `readVcsSprintPr` is a manual
   line/indent scan.
9. **No parity check between config files, neither overwrites the other.** CONFIRMED — read all
   four diffs directly (below); each carries its own distinct surrounding content and its own
   prose; no test harness assertion cross-compares them (confirmed by reading every P1-P10 fixture
   helper — none touches the real `.cleargate/config.yml`/`config.example.yml` files).
10. **Every `SKILL.md` edit located by heading text, landed in the right section.** CONFIRMED —
    `> 🎯 **Goal check.**` occurs at canonical `:210, :229, :621, :702` (4 of the claimed 7 shown;
    remaining occurrences elsewhere in file, count not exhaustively re-verified but irrelevant to
    placement) and `## 6. Phase D — Sprint Walkthrough` occurs once, at `:608`. The new PR paragraph
    lands at `:623` (between the `:621` Goal-check line and `## 6.5 Phase D.5` at `:627`) — inside
    Phase D, not §A.4. `### E.5 Sprint→main merge` (`:719`) contains the new `vcs.sprint_pr: true`
    branch, before `## 8. Rework Counter Quick Reference` (`:740`). Both landed correctly.
11. **Only canonical `SKILL.md` edited.** CONFIRMED — `git diff dbb6da6c 83bd7db6 --name-only`
    lists exactly `cleargate-planning/.claude/skills/sprint-execution/SKILL.md`, no live-tree path.
    `git ls-files .claude/` returns empty (live untracked, CR-099).
12. **`cleargate-enforcement.md`: only the "which strips gitignored…and" clause deleted, "cuts off
    the wrong base" kept, both trees, `diff` empty.** CONFIRMED — ran the diff myself, not the
    Developer's: `diff .cleargate/knowledge/cleargate-enforcement.md
    cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md` → **identical, no output**.
    Per-tree diffs against QA-Red baseline show the exact single-clause deletion in both files,
    byte-for-byte the same edit. Heading counts unchanged in both trees: `## 16→16`, `### 51→51`.
13. **§E.5 retains a `vcs.sprint_pr: false` branch carrying the local merge.** CONFIRMED — the
    `git merge sprint/S-NN --no-ff` block is untouched and unconditional within its own
    `**vcs.sprint_pr: false (default — the only path available to any install without a GitHub
    remote):**` sub-heading; the new `vcs.sprint_pr: true` branch is additive alongside it, not a
    replacement. `eviction-a`/`eviction-b` (added by QA-Red T3, both PASS) mechanically confirm
    this at test time.
14. **`--assume-ack` untouched.** CONFIRMED — the only `assume-ack` hit in the full commit diff is
    unmodified context inside `usage()`; grepped the diff myself, no `+`/`-` line touches it.

## Also verified

- **Cross-Cutting Rule 4 (no heading moved).** `SKILL.md` canonical `## 14→14`, `### 30→30`;
  `cleargate-enforcement.md` both trees `## 16→16`, `### 51→51`. `gate-section-index-pinning`
  registry is untouched by this CR (no gated type's template edited) — `18 = 16 pinnable + 2
  known-unpinnable` is not engaged by anything in this diff.
- **`close_sprint.mjs` byte-identical across trees, verified myself:** `diff
  .cleargate/scripts/close_sprint.mjs cleargate-planning/.cleargate/scripts/close_sprint.mjs` →
  identical, both 1423 lines. Matches N7's reported total and the `Mirror check: close_sprint.mjs`
  PASS row.
- **Must-stay-green, all confirmed PASS in all 3 runs:** `P1a P1b P4 P5a doctrine(live-base,
  canon-base)` plus 4 mirror rows (excl. `reporter.md`, the known worktree artefact).
- **No test file modified** — confirmed above (empty diff).
- **Single amended commit, final state correct** — confirmed above.
- **Acceptance Gherkin/DoD (CR §4 Verification Protocol):** all 5 required cases exercised by
  P1/P2/P3/P4-P6/P7c respectively, plus the eviction check (now eviction-a/b) — all green. The CR
  item has no separate Gherkin block (CR template uses §4 Verification Protocol in place of Story
  Gherkin); that protocol's command and required cases are what the harness implements.

## Prebuild / payload-parity finding (reported, not fixed — per dispatch)

Checked whether the four touched `cleargate-planning/` files have a payload counterpart under
`cleargate-cli/templates/cleargate-planning/` (main checkout, since `cleargate-cli/` does not exist
inside the worktree). **All four do** (`SKILL.md`, `close_sprint.mjs`, `cleargate-enforcement.md`,
`config.yml`/`config.example.yml`).

However, only **one** of them has an active byte-parity test in the `cleargate-cli` suite:
`cleargate-cli/test/scaffold/skill-md-conditional-architect.red.node.test.ts` **S5** asserts
canonical `SKILL.md` == payload `SKILL.md` (byte-identical), skipping only if the payload file is
absent. Ran it independently from the main checkout (still on `sprint/S-39`, CR-107 not yet
merged): **currently 18/18 passing, S5 green** — canonical and payload are in sync *today*, because
CR-107's edit hasn't landed on `sprint/S-39` yet.

**Consequence once `story/CR-107` merges to `sprint/S-39`:** canonical `SKILL.md` will carry CR-107's
new paragraph while the gitignored npm payload will not (nothing regenerates it automatically) — S5
**will go red** until `npm --prefix cleargate-cli run prebuild` runs. `close_sprint.mjs`,
`cleargate-enforcement.md`, and the two `config*.yml` files have payload counterparts too but **no
test in the cleargate-cli suite asserts canonical↔payload byte-parity for them** (only
live↔canonical parity tests exist for `close_sprint.mjs`, unaffected here, and one unrelated
Step-7.4 anchor-string check on the payload copy). So the blast radius of the un-prebuilt state is
narrower than "the whole suite is red" — it is specifically S5, and it is exactly the situation
Cross-Cutting Rule 2 already anticipates ("npm payload regeneration is a Gate-4/close step, not
per-story"). **Not a defect in this commit; a Gate-4 obligation already on record.** Flag for
whoever runs the Gate-4 doc/prebuild refresh: run `npm --prefix cleargate-cli run prebuild` after
`sprint/S-39` carries CR-107 (and STORY-054-03's outstanding re-sync) before trusting S5 again.

## Task Breakdown (advisory, EPIC-054 WS7)

`CR-107_Sprint_Merge_Requires_PR.md`'s `## Task Breakdown` still shows all 9 rows as `- [ ]`. Per
the Developer's report and M4 plan §N8, the item file is outside the dispatch's Execution Sandbox,
so the Developer correctly did not edit it. Cross-checked all 9 rows against the actual commit and
test evidence above — all 9 are substantively complete. Reporting per dispatch instruction;
**advisory only, not a kick-back criterion.**

## Script Incidents

None from my own invocations. `run_script.sh` incident JSONs produced by the harness's own
deliberately-failing sub-scenarios land under
`.cleargate/sprint-runs/**/.script-incidents/` inside the worktree and are gitignored — confirmed
`git status --porcelain` in the worktree is clean after all three runs.

## flashcards_flagged

[]

STATUS=done
