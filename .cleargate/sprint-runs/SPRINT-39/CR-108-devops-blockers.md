## Failure-Step

**Step 1 (outer merge) failed before it could run.** From the outer main checkout, on
confirmed branch `sprint/S-39` (HEAD `f670c6aa`), `git merge --no-ff story/CR-108 -m
"merge(CR-108): universal work-item scaffolder — templates and CLAUDE.md"` exited 2 with:

```
error: Your local changes to the following files would be overwritten by merge:
	.cleargate/wiki/index.md
	.cleargate/wiki/log.md
	.cleargate/wiki/product-state.md
Please commit your changes or stash them before you merge.
Aborting
Merge with strategy ort failed.
```

This is not a textual merge conflict (`git merge-tree` against the same three refs
independently confirms **0 conflicts** — no `CONFLICT` marker anywhere in its output). It is
a pre-existing dirty working tree that overlaps the same three files CR-108 also touches
(`.cleargate/wiki/index.md`, `.cleargate/wiki/log.md`, `.cleargate/wiki/product-state.md`),
so git refuses to risk silently blending an uncommitted local edit with the incoming merge
diff. Per the DevOps boundary ("No conflict resolution... escalated to human") and this
dispatch's own "HALT immediately. Do NOT auto-resolve," I did not stash, commit, or discard
these local changes to force the merge through.

Git aborted cleanly on its own — verified no `MERGE_HEAD`, no `.git/MERGE_MSG`, HEAD still
`f670c6aa`, branch still `sprint/S-39`. No files were touched by the failed attempt. **Step 2
(cli half) was never run** — order is load-bearing and Step 1 did not complete.

## Conflict-Files

Not a git conflict (no conflict markers). The three files whose *local, uncommitted*
modifications collide with CR-108's incoming changes:

- `.cleargate/wiki/index.md`
- `.cleargate/wiki/log.md`
- `.cleargate/wiki/product-state.md`

## Diagnostics

**Root cause, traced:** these three files are dirty in the working tree from an *unrelated,
uncommitted* wiki-ingest event — `.cleargate/wiki/log.md`'s own diff shows the actor:

```
- timestamp: "2026-08-27T17:13:58Z"
  actor: "cleargate-wiki-ingest"
  action: "update"
  target: "EPIC-058"
  path: ".cleargate/delivery/pending-sync/EPIC-058_Additive_Multi_Host_Execution_Adapters.md"
```

i.e. the `cleargate-wiki-ingest` PostToolUse hook ran against a freshly-drafted
`EPIC-058_Additive_Multi_Host_Execution_Adapters.md` (currently untracked — present in `git
status` as `??`) and rewrote `wiki/index.md` / `wiki/log.md` / `wiki/product-state.md`
in-place, but that work was never committed. This has nothing to do with CR-108; CR-108's own
diff to these three files is a *different* hunk in each (adding `CR.md` citation rows /
CR-108-specific product-state deltas), not the EPIC-058 rows. The two edits are on different
lines within the same files, which is exactly the situation `git merge` refuses to blend
automatically rather than risk it.

Full `git status` at time of halt:

```
On branch sprint/S-39
Changes not staged for commit:
	modified:   .cleargate/delivery/pending-sync/BUG-047_Gate_Cache_Stamp_Deadlock.md
	modified:   .cleargate/delivery/pending-sync/BUG-048_Id_Prefix_In_Prose_Mints_Phantom_Item.md
	modified:   .cleargate/delivery/pending-sync/BUG-049_Collision_Surface_Only_Reads_Story_Template.md
	modified:   .cleargate/delivery/pending-sync/BUG-050_Declared_Item_Counter_Scores_Bare_Labels.md
	modified:   .cleargate/delivery/pending-sync/BUG-062_Collision_Extractor_Blind_Edges_And_Prose.md
	modified:   .cleargate/delivery/pending-sync/BUG-067_Stamp_Corrupts_Frontmatter_Behind_Instructions.md
	modified:   .cleargate/delivery/pending-sync/CR-109_Frontmatter_Machine_Field_Sidecar.md
	modified:   .cleargate/delivery/pending-sync/EPIC-055_Parallel_Wave_Scheduling.md
	modified:   .cleargate/delivery/pending-sync/EPIC-057_Multi_Repo_Story_Execution.md
	modified:   .cleargate/sprint-runs/SPRINT-39/.session-totals.json
	modified:   .cleargate/sprint-runs/SPRINT-39/CR-106-arch-postflight.md
	modified:   .cleargate/sprint-runs/SPRINT-39/CR-106-dev.md
	modified:   .cleargate/sprint-runs/SPRINT-39/CR-106-qa.md
	modified:   .cleargate/sprint-runs/SPRINT-39/GATE-4-PREFLIGHT.md
	modified:   .cleargate/sprint-runs/SPRINT-39/state.json
	modified:   .cleargate/sprint-runs/SPRINT-39/token-ledger.jsonl
	modified:   .cleargate/wiki/index.md
	modified:   .cleargate/wiki/log.md
	modified:   .cleargate/wiki/product-state.md
	modified:   .cleargate/wiki/roadmap.md
	modified:   cleargate-planning/MANIFEST.json

Untracked files:
	.cleargate/delivery/pending-sync/EPIC-058_Additive_Multi_Host_Execution_Adapters.md
	.cleargate/sprint-runs/SPRINT-39/.session-totals.json.tmp.G5Ptvh
	.cleargate/sprint-runs/SPRINT-39/CR-106-devops.md
	.cleargate/sprint-runs/SPRINT-39/CR-108-arch-postflight.md
	.cleargate/sprint-runs/SPRINT-39/CR-110-devops.md
	.cleargate/sprint-runs/SPRINT-39/CR-110-tpv.md
	.cleargate/sprint-runs/SPRINT-39/events.jsonl
	.cleargate/wiki/epics/EPIC-058.md
```

`git merge-tree $(git merge-base sprint/S-39 story/CR-108) sprint/S-39 story/CR-108` —
independent confirmation of 0 textual conflicts between the two branches (only the three
wiki files above are blocked, and only by the *working tree*, not by history):

```
$ git merge-tree <merge-base> sprint/S-39 story/CR-108 | grep -c CONFLICT
0
```

**Note on scope of the dirty tree:** the other ~17 modified/untracked files
(`BUG-047/048/049/050/062/067`, `CR-109`, `EPIC-055/057/058`, `state.json`, `token-ledger.jsonl`,
`.session-totals.json`, `GATE-4-PREFLIGHT.md`, `MANIFEST.json`, prior `CR-106-*`/`CR-110-*`
reports) do **not** overlap CR-108's file set and were not implicated in the merge failure —
listed here only for completeness of the halt-time snapshot.

**What is needed to unblock, for the human/orchestrator to decide (I did not act on any of
these):**
1. Commit (or explicitly discard) the pending EPIC-058 wiki-ingest state on
   `sprint/S-39` so the working tree is clean on those three files, then re-dispatch DevOps
   for CR-108; or
2. Direct the orchestrator to stash/commit that work under its own authorship before re-running
   this dispatch.

I did not stash, commit, discard, or otherwise touch any of the above files. `cleargate-cli`
(the second repo in this cross-repo merge) was not touched at all — `story/CR-108` @
`b4ae1976` there is untouched, still checked out, unmerged. No teardown (worktree remove /
branch delete / state transition) was performed for CR-108.
