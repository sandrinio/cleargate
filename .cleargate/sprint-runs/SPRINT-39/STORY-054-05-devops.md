# DevOps Report — STORY-054-05

role: devops

## Execution route (cross-repo, NOT a worktree)

`cleargate-cli/` is its own git repository (`sandrinio/cleargate-cli`), gitignored in the
outer meta-repo with zero tracked files. It does not exist inside `.worktrees/*`. This story
was executed directly on a branch (`story/STORY-054-05`) in the `cleargate-cli` checkout at
`/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli`. There is no worktree to tear down and
no `sprint/S-39` branch inside that repo — the merge target is **that repo's own `main`**, per
explicit dispatch override. This is the documented cross-repo execution case (BUG-046 /
`#worktree #collision-surface #danger`), not improvised.

## Preflight verification

Confirmed, before any git operation, exactly as the dispatch asserted:
- `git rev-parse --abbrev-ref HEAD` → `story/STORY-054-05`
- Two commits ahead of `main`: `7778722` (QA-Red) then `c79f615` (Developer)
- `git diff main..HEAD -- src/` → **empty** (Cross-Cutting Rule 3 — `evalSection` frozen — held)
- Only untracked file: `cleargate-0.23.1.tgz` (pre-existing)
- Exactly two new files: `test/docs/gate-section-index-pinning.node.test.ts`,
  `test/fixtures/gate-section-index/expected-headings.ts`

QA-Verify (`STORY-054-05-qa.md`) = PASS. Architect post-flight (`STORY-054-05-arch-postflight.md`)
= PASS ("cleared for DevOps merge"; the post-flight doc's literal text names `sprint/S-39` as the
merge target, but the dispatch's explicit cross-repo override — repo has no `sprint/S-39` branch —
supersedes that phrasing. Followed the dispatch, not the doc's wording.).

## Merge Result

- Repo: `/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli`
- Target branch: `main` (cleargate-cli's own — NOT `sprint/S-39`, which does not exist in this repo)
- Story branch: `story/STORY-054-05`
- `git checkout main` → clean, no conflicts pre-merge
- `git merge --no-ff story/STORY-054-05 -m "Merge STORY-054-05: pin every gated section index to the heading it names"` → **clean merge, zero conflicts**
- Merge commit SHA: `db13a0325852a0dfde60f2667562d051e9c637c9` (short `db13a03`)
- Diff stat: `2 files changed, 721 insertions(+)`
  - `create mode 100644 test/docs/gate-section-index-pinning.node.test.ts`
  - `create mode 100644 test/fixtures/gate-section-index/expected-headings.ts`
- Post-merge `git status --short` in `cleargate-cli`: only the pre-existing untracked
  `cleargate-0.23.1.tgz` — no stray changes.
- `main` is 3 commits ahead of `origin/main` after this merge (2 story commits + 1 merge commit);
  **not pushed** — publishing is the human's call, per hard constraints.
- Story branch `story/STORY-054-05` left in place (not deleted) — branch cleanup deferred to a
  human-approved close-time decision.

## Post-Merge Tests

**Correction, recorded for the sprint report / framework backlog:** the dispatched command
`npm --prefix cleargate-cli test -- test/docs/gate-section-index-pinning.node.test.ts` does
**not** filter to the named file. `cleargate-cli/package.json`'s `test` script invokes
`scripts/run-default-tests.mjs`, which hardcodes its own glob
(`test/**/*.node.test.ts` minus integration/fixtures) via `tinyglobby` and never reads
`process.argv` — any trailing args after `--` are silently ignored. Running it launched the
**full 2493-test suite** in the background; caught mid-run (874 suites in, ~57s), killed via
`pkill` before completion rather than let it run the ~8 minutes to conclusion, since the
dispatch explicitly forbids a full-suite run here. That aborted run is **not** used as evidence
for anything below.

Re-ran correctly, mirroring exactly how QA invoked it (`npx tsx --test`, bypassing the
non-filtering `npm test` wrapper):

```
cd /Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli
npx tsx --test --test-reporter=spec test/docs/gate-section-index-pinning.node.test.ts
```

Result:
```
ℹ tests 14
ℹ suites 2
ℹ pass 14
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```
Exit code: **0**. All 14 named cases pass (R8 sanity, S1a/S1b/S1c, S2a/S2b/S2c, S3a/S3b, S4,
S5a/S5b, S6, S7) — matches QA's re-run figures exactly. `git status --short` after the run:
only the pre-existing untracked tarball — the run left no residue.

**Flag for the Orchestrator/framework backlog:** `npm --prefix cleargate-cli test -- <file>`
is not a working "run only this file" invocation today; any future dispatch instruction that
assumes it will silently run the full suite instead. `npx tsx --test <file>` (as QA and I both
used) is the correct targeted-run form for this repo.

## Mirror Parity Audit

Cross-Cutting Rule 1 scope: `.cleargate/knowledge/**` / `.cleargate/templates/**` ↔
`cleargate-planning/.cleargate/**`, byte-identical in the same commit.

- **STORY-054-05 itself touched neither tree.** Confirmed via
  `git diff main..HEAD --stat -- <this story's two commits>` — the only files touched are
  `cleargate-cli/test/docs/gate-section-index-pinning.node.test.ts` and
  `cleargate-cli/test/fixtures/gate-section-index/expected-headings.ts`, neither of which has
  a canonical mirror (they are test-repo artifacts, not scaffold content). **Nothing to audit
  for this story — clean by scope, not by omission.**
- **BUG-042's earlier mirror, re-verified for completeness per dispatch instruction:**
  `diff .cleargate/knowledge/readiness-gates.md cleargate-planning/.cleargate/knowledge/readiness-gates.md`
  → **no output (clean, still in sync)**.
- No `npm run prebuild` was required (no canonical scaffold file touched by this story;
  payload regeneration is a Gate-4/close step per sprint-context.md, not per-story, and would
  not apply here regardless).

## State Transition

- Script: `.cleargate/scripts/update_state.mjs` (canonical path — no lower-level alternative
  needed), invoked through the mandatory wrapper:
  ```
  CLEARGATE_STATE_FILE=.cleargate/sprint-runs/SPRINT-39/state.json \
    AGENT_TYPE=devops WORK_ITEM_ID=STORY-054-05 \
    bash .cleargate/scripts/run_script.sh node .cleargate/scripts/update_state.mjs STORY-054-05 Done
  ```
  Output: `Updated STORY-054-05: state="Done"`. Exit 0 — no incident JSON written.
- Confirmed in `state.json`: `stories["STORY-054-05"].state == "Done"`,
  `worktree == null` (auto-reset by the script on the `Done` transition — expected, since this
  story was never a real ClearGate-managed worktree), `updated_at` refreshed to
  `2026-08-27T13:44:32.120Z`. `last_action: "transition STORY-054-05 → Done"`.
- No other story's entry in `state.json` was touched (spot-checked: all 17 story entries;
  only `STORY-054-05` and the previously-Done `BUG-042` show `Done`; every other story remains
  `Ready to Bounce`, i.e. no story is currently `Bouncing`).
- **Outer-repo commit:** per the dispatch's explicit exception ("do not commit anything in the
  OUTER repo except the state.json transition"), committed just this one file on `sprint/S-39`:
  commit `1e817efa1fe332e300048255ef2e09552eacd112`, `1 file changed, 5 insertions(+), 5 deletions(-)`,
  message `chore(SPRINT-39): STORY-054-05 state transition to Done`. Pre-commit hooks ran
  normally (vitest-residue checks, inline-id-regex gate) and passed cleanly — **no
  `SKIP_SURFACE_GATE` bypass was needed**, since no story is currently `Bouncing` (the
  documented collision condition in Mid-Sprint Amendments did not apply at commit time). No
  `--no-verify` used. Confirmed no other pending file was swept into the commit
  (`git show --stat` on the commit shows exactly one file).

## Cleanup

- **Worktree: n/a.** This story never had a ClearGate-managed worktree — `cleargate-cli/` is a
  separate, fully-gitignored repo and does not materialize under `.worktrees/*` (BUG-046). No
  `git worktree remove` was run, per explicit dispatch instruction.
- **Branch: NOT deleted, by design.** `story/STORY-054-05` remains in the `cleargate-cli`
  checkout, pointing at `c79f615`. Branch cleanup is deferred to an explicit human-approved
  close-time decision, per dispatch instruction 4 (which overrides the standard
  §3.1-contract "git branch -d" step for this cross-repo case).
- **Push: none.** No `git push` was run against any remote, for either repo. `cleargate-cli`'s
  local `main` is now 3 commits ahead of `origin/main`; publishing is the human's call.

## Notes for the Orchestrator

1. **This story did NOT merge into `sprint/S-39`.** It merged into `cleargate-cli`'s own
   `main`, per the dispatch's explicit cross-repo override. The Architect post-flight report's
   header line ("cleared for DevOps merge into `sprint/S-39`") is stale boilerplate for this
   story shape — followed the dispatch instead, flagging the discrepancy rather than silently
   reconciling it.
2. **`npm --prefix cleargate-cli test -- <file>` does not filter.** See §Post-Merge Tests —
   this is a latent framework gap (the `test` script ignores trailing argv) that will bite any
   future DevOps dispatch that assumes file-scoped `npm test` works in this repo. Worth a
   follow-on CR or a Test Stack table correction in `sprint-context.md` (`npx tsx --test <file>`
   is the actual targeted-run form).
3. **`cleargate-cli/main` is unpublished and 3 commits ahead of `origin/main`.** No push
   attempted, per hard constraint. Orchestrator/human to decide when to push.
4. STORY-054-05's post-flight carries several M2 obligations for STORY-054-06 (zero-shift
   heading placement in `CR.md`/`Bug.md`, `story.md` index bump) — already recorded in
   `sprint-context.md` §Mid-Sprint Amendments by the Architect; no action needed from DevOps,
   noted here only for continuity.
