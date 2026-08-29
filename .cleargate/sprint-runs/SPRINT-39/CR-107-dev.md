---
story_id: CR-107
sprint_id: SPRINT-39
mode: DEV
generated_by: developer agent
generated_at: 2026-08-29
---

# CR-107 Developer report — sprint→main merge goes through a pull request

role: developer

## Commit

`83bd7db68ccefba46d0c52f6d51ed1d441309080` on `story/CR-107`, cut from `sprint/S-39` @ `dbb6da6c`
(after both QA-Red rounds landed). One commit, amended once pre-review to fix a self-caught
config-value error (see NOTES) — no second commit, no push, no merge.

## What changed (Step 2.8 gate)

`close_sprint.mjs` Step 2.8 now reads `vcs.sprint_pr` from `REPO_ROOT/.cleargate/config.yml` via a
dependency-free line scan (`readVcsSprintPr`, no YAML import — `js-yaml` is a meta-repo-root-only
dependency, absent inside a worktree and in target installs). Absent `vcs:` block or absent
`sprint_pr` key means `false`.

When `vcs.sprint_pr: true`, a fail-**CLOSED** gate runs **before** the `sprintNumMatch` numeric-id
test (so a non-numeric sprint id cannot bypass it — mutant M4b / P9):
- absent `gh` on PATH → named error, `process.exit(1)`.
- absent `origin` remote → named error, `process.exit(1)`.

`--is-ancestor` stays the merge check. `refs/heads/main` is tried **first**; `refs/remotes/origin/main`
is consulted **only as a fallback** when the local check reports "not an ancestor" (never a
replacement — mutant M3b / P4). The success message names whichever ref actually satisfied the
check (`mainRef`, reassigned only on a successful fallback), so a genuine local merge commit still
prints the exact pre-existing string `Step 2.8 passed: refs/heads/sprint/S-97 is merged to
refs/heads/main.` that P4 pins verbatim.

Squash/rebase-merge detection (F2a) is a real probe (`isSquashMerged`): `git merge-base` between
main and the sprint branch, a throwaway `git commit-tree` carrying the sprint tip's tree on that
merge-base, then `git cherry <mainRef> <probe>` — a `-`-prefixed line means the diff is already
reachable from main with no ancestor commit (squashed). Runs only when `vcs.sprint_pr` is enabled
and no `CLEARGATE_FORCE_MERGE_STATUS` short-circuited the real check; stays silent on a never-merged
sprint (verified against both fixtures — P5b/P10b). The base "not merged" message is unchanged; the
squash note is additive, appended only when the probe fires.

`vcs.sprint_pr: false` (default) takes none of the above branches — Step 2.8 is byte-identical to
pre-CR-107 behaviour (P1a/P1b).

## SKILL.md (canonical only)

`cleargate-planning/.claude/skills/sprint-execution/SKILL.md` §6 Phase D gained one paragraph (PR
opened via `gh pr create` when `vcs.sprint_pr: true`, body built from sprint goal + DoD + report,
no network round-trip, no `gh pr view` lookup). §E.5 gained a `vcs.sprint_pr: true` branch
(`gh pr merge --merge`) alongside the retained, unconditional-within-its-own-branch
`vcs.sprint_pr: false` local-merge path (constraint 13 — the only path available to installs
without a GitHub remote). No `## `/`### ` heading added or moved (`## 14→14`, `### 30→30`,
confirmed by direct count both before and after). Live `.claude/skills/...` is untracked (CR-099)
and was not touched — nothing to commit there; it is a Gate-4 re-sync obligation per N1/N2, and N2
also applies: canonical grew by another +10 lines (787→797) on top of STORY-054-03's prior
un-synced +10, so the live↔canonical offset table in `sprint-context.md`/M4.md is further stale
below my edit points — flagged for whoever re-syncs live next (see N7 below).

## cleargate-enforcement.md (both trees, byte-identical)

§1.6: deleted only the "which strips gitignored `/.claude/` + `/mcp/` and" clause; "cuts off the
wrong base" (the real differentiator, per BUG-046 post-flight D4) survives untouched. §2: added one
`>` blockquote paragraph naming the PR as the walkthrough gate's external artefact when
`vcs.sprint_pr: true` — no heading added (TPV's own reference-implementation measurement pinned
`## 16→16`, `### 51→51`; confirmed identically here). `diff` between the two trees is empty
(T6 obligation — see below).

## Config files (all four, deliberately NOT diffed against each other)

Added `vcs.sprint_pr` to `.cleargate/config.yml` (live, 37→45 lines, kept its own `gates:`/
`worktree:` blocks), `cleargate-planning/.cleargate/config.yml` (canonical, 19→27 lines), and both
`config.example.yml` files (commented `# vcs: / #   sprint_pr: false` block, matching each file's
own existing documentation style). No parity check added (F4). Live value is `false` — see NOTES
for why this isn't `true` despite the CR item's own "enabled in this repo" Open-Question decision.

## Verification

`bash .cleargate/scripts/test/test_close_pipeline.sh`, run five times across the session (three
back-to-back immediately post-implementation, one after a config-value fix, one final post-amend):

```
=== Results: 33 passed, 10 failed ===   exit 1, all five runs
```

`diff` of the full `^PASS:|^FAIL:` line set was empty across every pair of runs — fully
deterministic. All 23 CR-107-scoped assertions pass:

```
PASS: CR-107 P1a / P1b / P2a / P2b / P3a / P3b / P4 / P5a / P5b / P6 / P9 / P10a / P10b /
      P7 / P7c / eviction-a / eviction-b / doctrine live-strip / live-base / canon-strip / canon-base
```

The 10 remaining failures are exactly TPV's/QA-Red's named pre-existing set — none touched, none
mine: `Scenario 1b, 1c, 2a, 4a, 4b, 4c, 5a, 6a`, `CR-036 Scenario B`, `Mirror check: reporter.md`
(worktree-only artefact — `.claude/` is untracked, so the mirror-check `diff` fails on a missing
file, not a divergence; confirmed unrelated by TPV's own measurement).

The four required `Mirror check:` rows all pass: `sprint_report.md`, `prefill_report.mjs`,
`close_sprint.mjs`, `suggest_improvements.mjs`. `close_sprint.mjs` is byte-identical across trees
(`diff` empty, checked directly, not just via the harness row).

### Mutation verification (out-of-tree, worktree never touched)

Built the four TPV-named survivor mutants (M2b, M8, M9, M9b) in throwaway `tar`-copied trees
(`.git` excluded) under the scratchpad, ran the full suite against each, deleted the copies
afterward. `git status --porcelain` on the real worktree was empty and `HEAD` unchanged throughout.

| Mutant | Result | Killed by |
|---|---|---|
| M2b (loosened origin fallback = "branch exists", static squash string) | 29 passed / 14 failed | P5a, P5b, P10a |
| M8 (hardcoded squash string, correct ancestor logic otherwise) | 31 passed / 12 failed | P10b only |
| M9 (§E.5 local merge deleted, unconditional `gh pr merge`) | 31 passed / 12 failed | eviction-a AND eviction-b |
| M9b (local merge left unconditional, reworded) | 31 passed / 12 failed | eviction-a AND eviction-b |

No mutant reproduces the reference's 33/10. All four TPV-flagged survivors are dead against this
implementation.

## N7 — line citations this commit invalidates (re-measured)

`close_sprint.mjs` grew by the four new helper functions (+109 lines) inserted before `usage()`,
plus additional lines inside the Step 2.8 body itself. Every subsequent line number in the file
shifted. Corrected, as of `83bd7db6`:

- `readVcsSprintPr` / `isGhOnPath` / `hasOriginRemote` / `isSquashMerged`: `:126`, `:164`, `:178`, `:200`.
- Step 2.7 preflight block: now `:696-753` (was `:587-645`); `git worktree list --porcelain` at `:718` (was `:609`).
- Step 2.8 block: now opens `:756` (was `:647`); vcs gate at `:774-793`; `sprintNumMatch` test at `:795`;
  non-numeric skip message at `:796` (was `:659`); local-ref check at `:799-816`; origin fallback at
  `:822-841`; pre-existing git-unavailable fail-open (`mergeCheckAvailable = false`) at `:845` (was `:687`);
  squash-note block at `:869-881`; failure message at `:882-887`.
- File total: 1423 lines (was 953 pre-commit). Byte-identical to the canonical mirror.

`cleargate-planning/.claude/skills/sprint-execution/SKILL.md`: 787 → 797 lines. `## 6. Phase D`
heading stays `:608` (edit appended after existing content); `## 6.5 Phase D.5` `:625→:627`;
`## 7. Phase E` `:664→:666`; `### E.5 Sprint→main merge` `:717→:719`; `## 8. Rework Counter`
`:730→:740`. **This further invalidates N2's canonical-vs-live offset table below line 608** — any
future dispatch (CR-110/CR-111, both named as later `SKILL.md` touchers in the M4 plan's chain)
must re-measure before trusting a canonical line-number citation into this region; I have not
re-synced live, so live is now three edits behind canonical (STORY-054-03's un-synced +10, plus
this commit's own +10) rather than one.

## T6 obligation (explicit)

```
$ diff .cleargate/knowledge/cleargate-enforcement.md cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md
(empty)
```

## Typecheck / cleargate-cli suite

Not run. `cleargate-cli/` has zero tracked files in the outer repo and does not exist inside
`.worktrees/CR-107` (confirmed: `ls cleargate-cli` → No such file or directory) — this is the
FLASHCARD `#worktree #collision-surface #danger` (BUG-046) condition, and CR-107's own M4 blueprint
states "Do NOT modify... `cleargate-cli/**`" with "therefore no CHANGELOG entry." Nothing in this
commit is TypeScript; `node --check` is clean on both `close_sprint.mjs` copies (syntax-verified
above). **Did not run `npm --prefix cleargate-cli run prebuild`** — same reason, `cleargate-cli/`
is physically absent from this worktree; that step is explicitly a Gate-4/close-time action (Rule
2) done from the main checkout, not a per-story worktree action, and I have no `cleargate-cli`
checkout reachable from here to run it against. Flagging explicitly per the dispatch's "Also"
instruction rather than silently skipping.

## Task Breakdown — not applied to the CR-107 item file, per M4 plan N8

`.cleargate/delivery/pending-sync/CR-107_Sprint_Merge_Requires_PR.md` carries a `## Task Breakdown`
section with 9 unchecked rows. I did **not** tick them. M4 plan §N8 rules explicitly on this exact
tension: *"This dispatch forbids editing item files. Task rows are therefore written in this plan...
not the item files."* The CR-107 item file is outside my dispatch's `## 3. Execution Sandbox`
(9 named paths, none of them the item file), so editing it would be scope bleed under my own
guardrails. All 9 rows are nonetheless complete as of this commit:

- Cut story/CR-107 from sprint/S-39 after BUG-046 merges — done (branch cut confirmed at dispatch time)
- Verify canonical SKILL.md offsets before editing (N2) — done, matched TPV's citation-repair table
- QA-Red: author P1-P7 ... — done (QA-Red's own commits, both rounds, pre-existing on this branch)
- close_sprint.mjs Step 2.8: fetch-or-origin/main fallback + squash detection + vcs gate; keep --is-ancestor — done, this commit
- Mirror close_sprint.mjs byte-identically into cleargate-planning/ — done, `diff` verified empty
- Add vcs.sprint_pr to BOTH config.yml files and BOTH config.example.yml files; DO NOT diff them — done
- cleargate-planning SKILL.md: §6 Phase D opens PR; §E.5 merges it (locate by heading) — done
- cleargate-enforcement.md §2 + canonical mirror: name PR as gate's artefact, byte-identical — done
- Run eviction check on §E.5; run test_close_pipeline.sh; record all numbers — done, five runs, all reported

Orchestrator: if the item file's own checkboxes need ticking for downstream tooling, that is an
orchestrator/DevOps action per N8, not mine.

## NOTES on deviations

**config.yml live value: `false`, not `true`, despite the CR item's own recorded Open-Question
decision ("Config-gated, default off, enabled in this repo — recorded 2026-08-26").** I initially
set it to `true` (following that decision literally), caught the conflict against the M4 plan's own
"Corrected file surface" table — which pins **both** `.cleargate/config.yml` and
`cleargate-planning/.cleargate/config.yml` to `vcs.sprint_pr: false` explicitly, in the Role column
— and amended the commit to `false` before finalizing, since the dispatch instructs following the
Architect's blueprint over re-deriving from the item text. This is a real, unresolved tension
between two Gate-1/plan-authored artifacts (not my call to adjudicate silently): the CR item's
human-approved decision says "enabled here"; the Architect's own corrected file-surface table for
this exact dispatch says `false`. I followed the more specific, more recent, dispatch-scoped
artifact (the M4 plan section written specifically to correct CR-107's Execution Sandbox), and
flagged it in `plan_deviations` below with `orchestrator_confirmed: false` — this needs an explicit
orchestrator/human ruling before the sprint closes, since flipping it to `true` is a one-line
follow-up that changes real close-pipeline behaviour (this repo does have `gh` + a GitHub `origin`,
so `true` is mechanically satisfiable today).

No other deviations. Message text for the new refusal/squash-note strings is not literally pinned
by the CR/TPV/plan beyond the specific substrings the test harness asserts (`gh`, `remote`/`origin`,
`squash`, the exact `Step 2.8 passed:`/`Step 2.8 failed:` prefixes) — I wrote fuller prose around
those pinned substrings; verified against the harness, not against any additional unstated spec.

## flashcards_flagged

- 2026-08-29 · #git #test-harness · `git push` auto-updates the local `refs/remotes/<remote>/<branch>` tracking ref on success (git ≥1.8.4) — no separate `git fetch` needed in a same-process push-then-check fixture.
- 2026-08-29 · #git #merge-detection · Squash/rebase-merge detection without `gh`: `git merge-base` + `git commit-tree <tip-tree> -p <merge-base>` + `git cherry <main> <probe>` — a `-`-prefixed cherry line means the diff is already in main with no ancestor commit; stays silent on a genuinely unmerged branch.
- 2026-08-29 · #doc-truth #test-harness · Writing "it never does X" in doc prose for a grep-based doc-truth test can accidentally embed the literal forbidden substring X — phrase the negative without quoting the banned string verbatim.

STATUS=done
