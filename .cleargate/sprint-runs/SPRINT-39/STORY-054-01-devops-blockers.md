## Failure-Step

Step 9 (of the general devops contract) / dispatch step "Update sprint state" +
"Refresh MANIFEST.json" commit — the pre-commit `surface-gate` hook BLOCKED the
second devops commit (state.json transition + MANIFEST.json refresh + this
story's own devops report), reporting the devops report file itself as
off-surface for STORY-054-01. Note: the merge commit (`827a77e1`, step 2-3 of
the dispatch) landed cleanly with no gate complaint — this is a distinct,
later commit attempt, not a merge conflict.

## Conflict-Files

N/A — not a git merge conflict. The blocking file per the hook's own output:

- `.cleargate/sprint-runs/SPRINT-39/STORY-054-01-devops.md` (this dispatch's
  own required deliverable, per §"Output"/"Deliverable" of the DevOps
  contract) — flagged "off-surface" because it is not a backtick-quoted path
  in STORY-054-01's own §3.1 table.

## Diagnostics

Exact hook output from `git commit`:

```
[surface-gate] BLOCKED: staged files outside declared §3.1 surface:
  off-surface: .cleargate/sprint-runs/SPRINT-39/STORY-054-01-devops.md
[surface-gate] Commit blocked. Declare these files in §3.1 or open a CR:scope-change.
[surface-gate] Set SKIP_SURFACE_GATE=1 to bypass.
```
Exit code: 1. Commit did NOT land — `git log -1` still shows `827a77e1
Merge STORY-054-01: spike charter template` as HEAD. The three intended files
remain **staged** (not committed, not lost): `.cleargate/sprint-runs/SPRINT-39/state.json`,
`cleargate-planning/MANIFEST.json`, `.cleargate/sprint-runs/SPRINT-39/STORY-054-01-devops.md`.

**Root cause (traced, matches an already-filed, already-quarantined defect —
BUG-052, `approved: false`, not mine to fix):**

`.cleargate/scripts/file_surface_diff.sh:resolve_story_file()` looks for the
first story whose `state.json` entry is `state in ('In Progress','Ready','In
Review')` — none of this sprint's actual vocabulary (`Bouncing`, `Ready to
Bounce`, `Done`, etc.) is ever one of those three literals, so that lookup
always misses and the script falls back to `max(stories.items(),
key=updated_at)` with **no terminal-state filter** (`file_surface_diff.sh:126-134`).
Task 6 of this dispatch (`update_state.mjs STORY-054-01 Done`) necessarily
gives STORY-054-01 the freshest `updated_at` in the whole sprint — so the very
act of completing this story makes it the gate's "active story" for the
*next* commit, and the gate then checks that commit's staged files against
STORY-054-01's own §3.1 table (written by the Developer before this report
existed, so it declares only `spike.md` x2). The devops report is a required
deliverable of every DevOps dispatch and by construction can never be
pre-declared in the story's own §3.1.

This is the same mechanism already recorded in `sprint-context.md`'s
Mid-Sprint Amendments (`M0/wave2 GATE BYPASS LOGGED`, `M1/decision-4 R16
FILED`, `M1/decision-5 STILL OPEN`) and filed as **BUG-052**
(`Surface_Gate_Resolves_Wrong_Story`) — but this is a **new manifestation**:
prior occurrences blocked *orchestrator* commits touching other work-items'
planning markdown; this one blocks a **DevOps agent's own mandated
report-file commit for the very story the gate resolved as active**, which is
arguably a sharper case for the open question already parked on BUG-052
("should the gate exempt `.cleargate/sprint-runs/**` when the committing
branch is the sprint branch"). Recommend appending this occurrence to
BUG-052's evidence rather than filing a new bug.

**Per this dispatch's own Hard Constraints — "do not set SKIP_SURFACE_GATE=1;
that decision is the orchestrator's" — no bypass was attempted.** Halting here
per contract.

**State of the tree at halt (nothing lost, nothing partially committed):**

- HEAD: `827a77e1` (merge only — spike.md x2, both trees, byte-identical, 7
  headings, already verified clean — see the completed portions of
  `STORY-054-01-devops.md` for that evidence).
- Staged (index), not committed: `.cleargate/sprint-runs/SPRINT-39/state.json`
  (STORY-054-01 → `Done`, worktree still `null`), `cleargate-planning/MANIFEST.json`
  (refreshed via `build-manifest.ts`, adds the `spike.md` entry + corrects a
  stale `readiness-gates.md` sha256), `.cleargate/sprint-runs/SPRINT-39/STORY-054-01-devops.md`
  (this story's completed devops report, content already verified accurate).
- `.worktrees/STORY-054-01` and `story/STORY-054-01` untouched, per dispatch
  instruction (wave-3 teardown deferred regardless of this halt).
- No `git push` attempted.
- `.cleargate/delivery/**` untouched (nothing staged, nothing checked out).

**Orchestrator decision needed:** either (a) authorize `SKIP_SURFACE_GATE=1`
for this one commit (mirrors the two prior orchestrator-authorized bypasses
logged in `sprint-context.md`), or (b) add a backtick-quoted §3.1 row for
`.cleargate/sprint-runs/SPRINT-39/STORY-054-01-devops.md` (and, likely,
`STORY-054-01-devops-blockers.md`) to the `STORY-054-01` work-item file before
re-running the commit, or (c) direct devops to commit state.json + MANIFEST.json
+ report as three separate commits split across whichever story the gate
would resolve as active at each moment (fragile, timing-dependent, not
recommended). This report takes no position beyond flagging the tradeoffs —
the bypass authority is explicitly not mine.
