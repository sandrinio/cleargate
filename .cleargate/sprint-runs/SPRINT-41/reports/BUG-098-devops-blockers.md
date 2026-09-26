role: devops

# BUG-098 — DevOps blockers report

## Failure-Step

Step 1 (Outer twin commit): the outer pre-commit surface gate (`file_surface_diff.sh`, invoked from `<ow>`'s pre-commit hook) refused `git -C <ow> commit` for the twin scripts `.cleargate/scripts/prep_reporter_context.mjs` and `.cleargate/scripts/dedupe_frontmatter.mjs` on `story/BUG-098`, because the dispatch's precondition step (`update_state.mjs BUG-098 "Architect Passed"`) was a true no-op — BUG-098 was already in that exact state, so `updated_at` did not refresh, and the gate's active-item fallback resolved to `STORY-058-11` instead (the most recently updated item overall, at `2026-09-26T19:20:34.262Z` vs BUG-098's `2026-09-26T18:12:48.694Z`), whose §3.1 does not declare either script path. Per the dispatch's own explicit contingency ("No SKIP_SURFACE_GATE on the story branch. If the surface gate refuses, report its output verbatim and halt."), I stopped here without merging, without setting `SKIP_SURFACE_GATE`, and without editing any delivery file's §3.1.

No merges were attempted (steps 2–9 of the dispatch never ran). `OUTER` main checkout and `CLI` main checkout are untouched (only the 4 sprint ledger files in OUTER and the pre-existing untracked `cleargate-0.25.0.tgz` in CLI). `<ow>` (`/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-098`) still has both twin files staged (`git add` succeeded before the commit hook rejected); HEAD is unchanged at `2e4d6fe4`. `<cw>` is clean at `ff29236`.

## Root-cause detail

`update_state.mjs`'s state-transition path is a documented true no-op when `story.state === newState` (zero-write, no event appended, no `updated_at` bump — see the function comment "Idempotent: if new state equals current ... exit 0 without appending an event"). BUG-098's state.json entry was already `"Architect Passed"` before this dispatch ran, so:

```
$ CLEARGATE_STATE_FILE=$PWD/.cleargate/sprint-runs/SPRINT-41/state.json node .cleargate/scripts/update_state.mjs BUG-098 "Architect Passed"
No-op: BUG-098 is already in state "Architect Passed"
```

`file_surface_diff.sh`'s `resolve_story_file()` (1) looks for any story in state `('In Progress','Ready','In Review')` — none matched literally (current states are `Bouncing`, `Ready to Bounce`, `Architect Passed`, `Done`, etc.) — then (2) falls back to the single item with the max `updated_at` across **all** entries in `state.stories`, not just STORY-prefixed ones. At commit time that was `STORY-058-11` (`2026-09-26T19:20:34.262Z`), not `BUG-098` (`2026-09-26T18:12:48.694Z`). Because the resolved id happened to be STORY-shaped, `find_story_file` successfully located `STORY-058-11`'s item file and matched its §3.1 against staged files — which does not declare the two BUG-098 script paths — producing a real block rather than the "no active story file found → skip" path the dispatch's comment describes. (That skip path is only reached when the resolved-most-recent id is NOT STORY-shaped, e.g. `BUG-098` itself — which requires BUG-098 to actually be the most-recently-updated item, which the no-op prevented.)

## Conflict-Files

Not a git merge conflict — a surface-gate policy block. Gate output, verbatim:

```
[surface-gate] BLOCKED: staged files outside declared §3.1 surface:
  off-surface: .cleargate/scripts/dedupe_frontmatter.mjs
  off-surface: .cleargate/scripts/prep_reporter_context.mjs
[surface-gate] Commit blocked. Declare these files in §3.1 or open a CR:scope-change.
[surface-gate] Set SKIP_SURFACE_GATE=1 to bypass.
```

## Diagnostics

Full commit attempt output:

```
$ git -C <ow> add .cleargate/scripts/prep_reporter_context.mjs .cleargate/scripts/dedupe_frontmatter.mjs
$ git -C <ow> commit -m "chore(BUG-098): live mirror twins — prep_reporter_context.mjs + dedupe_frontmatter.mjs (byte-copy of canonical)"

> cleargate@0.26.1 check:no-vitest
> node -e "..."
no vitest residue
no inline work-item-id regexes
[surface-gate] BLOCKED: staged files outside declared §3.1 surface:
  off-surface: .cleargate/scripts/dedupe_frontmatter.mjs
  off-surface: .cleargate/scripts/prep_reporter_context.mjs
[surface-gate] Commit blocked. Declare these files in §3.1 or open a CR:scope-change.
[surface-gate] Set SKIP_SURFACE_GATE=1 to bypass.

exit code 1
```

`state.json` snapshot at time of failure (all items, `state` / `updated_at`), showing STORY-058-11 as the max:

```
BUG-067        Done              2026-09-25T05:27:12.336Z
STORY-058-01   Done              2026-09-25T09:42:33.122Z
STORY-058-02   Done              2026-09-25T14:06:28.763Z
STORY-058-03   Done              2026-09-25T15:27:48.405Z
STORY-058-04   Done              2026-09-25T17:43:53.650Z
STORY-058-05   Done              2026-09-25T21:24:14.492Z
STORY-058-06   Done              2026-09-25T19:50:19.316Z
STORY-058-07   Done              2026-09-26T00:18:31.372Z
STORY-058-08   Done              2026-09-26T05:15:03.686Z
STORY-058-09   Done              2026-09-26T07:21:41.563Z
STORY-058-10   Done              2026-09-26T15:13:20.288Z
STORY-058-11   Done              2026-09-26T19:20:34.262Z   <-- max, resolved as "active"
BUG-085        Done              2026-09-26T02:50:25.860Z
STORY-058-12   Bouncing          2026-09-26T19:15:23.408Z
STORY-058-13   Ready to Bounce   2026-09-11T22:19:09Z
BUG-089        Done              2026-09-25T03:44:58.782Z
CR-123         Done              2026-09-25T07:19:21.440Z
BUG-090        Done              2026-09-26T16:48:02.087Z
BUG-096        Done              2026-09-26T15:50:31.772Z
BUG-097        Done              2026-09-26T16:17:33.882Z
BUG-098        Architect Passed  2026-09-26T18:12:48.694Z   <-- unchanged by the no-op call
CR-124         Done              2026-09-26T18:15:18.915Z
```

Twin verification completed successfully before the blocked commit (recorded here so it does not need to be re-run on retry):

- `cmp` of both twins (`<ow>/.cleargate/scripts/{prep_reporter_context,dedupe_frontmatter}.mjs` vs `<cw>/scaffold/core/.cleargate/scripts/…`): **identical**, both.
- Modes (`stat -f %Lp`): `prep_reporter_context.mjs` = 644/644 (live/canonical); `dedupe_frontmatter.mjs` = 755/755. Matches sha256 recorded by Dev/QA (`6b3cf683…36a2`, `831b7c27…3fed`).
- Pre-merge payload snapshot taken and left in place for reuse on retry: `/private/tmp/cg-s41-fw-payload-pre-098` (84 files).

## What did NOT happen (scope containment)

- No `git merge` was attempted in OUTER or CLI (steps 2–3 never ran).
- No `npm test`, no BD, no witnesses, no worktree/branch teardown, no `update_state.mjs BUG-098 Done`.
- `SKIP_SURFACE_GATE` was never set.
- No delivery-item file (BUG-098's §3.1 or otherwise) was edited.
- `<ow>` currently has the two twin files staged but uncommitted (`git status --short` shows ` M` for both, `git diff --cached --name-only` lists both). HEAD unchanged (`2e4d6fe4`). Left as-is for inspection rather than unstaged, since no destructive git operation is authorized under this dispatch's failure path.

## Suggested remediation (for orchestrator/human — not performed)

One of, chosen by whoever owns the fix:

1. Declare `.cleargate/scripts/prep_reporter_context.mjs` and `.cleargate/scripts/dedupe_frontmatter.mjs` in BUG-098's own §3.1 file-surface table (they are arguably already implied by the item's scope, but the gate parses §3.1 literally per CLAUDE.md's "Ambiguity Gate criteria are evaluated literally" convention) — then the gate would resolve/accept them directly once BUG-098 is the active item.
2. Transition BUG-098 through a genuinely different state and back (not the no-op call in the dispatch) so `updated_at` actually refreshes past STORY-058-11's, making BUG-098 the fallback's most-recent pick — which the gate's hardcoded `STORY-` prefix lookup would then fail to match, producing the intended skip. This changes dispatch text, so it needs explicit sign-off before a retry attempts it.
3. Authorize a one-time, logged `SKIP_SURFACE_GATE=1` for this specific commit (mirroring the standing bypass pattern rule 17 documents for orchestrator/DevOps chore commits on `sprint/S-41`) — but the dispatch explicitly forbids this on a story branch, so this needs an explicit human/orchestrator override, not a DevOps-initiated one.

STATUS=blocked
