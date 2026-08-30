# DevOps Blockers — CR-111

## Failure-Step
Step 3 (outer-repo merge) failed: `git merge story/CR-111 --no-ff -m "merge(CR-111): declare test layers at planning"`
in `/Users/ssuladze/Documents/Dev/ClearGate` aborted with exit code 2 — git refused because the
working tree on `sprint/S-39` carries **pre-existing, uncommitted local modifications** to
`.cleargate/delivery/pending-sync/CR-111_Declare_Test_Layers_At_Planning.md`, a file the merge also
needs to update. This is not a merge conflict (no conflict markers were produced — git aborted
before starting the merge) and it is not caused by anything DevOps did; the dirty state predates
this dispatch.

Exact git error:
```
error: Your local changes to the following files would be overwritten by merge:
	.cleargate/delivery/pending-sync/CR-111_Declare_Test_Layers_At_Planning.md
Please commit your changes or stash them before you merge.
Aborting
Merge with strategy ort failed.
```

## Conflict-Files
- `.cleargate/delivery/pending-sync/CR-111_Declare_Test_Layers_At_Planning.md` — the only file git
  named as blocking. Its uncommitted local diff includes what reads as an **orchestrator TPV
  amendment** ("ORCHESTRATOR AMENDMENT (2026-08-30, CR-111 TPV §4 ruling)" — an absence-passes
  ruling for `test-layers-declared`) plus checked-off Task Breakdown boxes and gate-check
  re-stamping (`cached_gate_result`, `draft_tokens`). This looks like real authored content, not
  hook noise — DevOps has **not** touched, stashed, or discarded it.

Also present in the working tree (not blocking the merge directly, but part of the same
uncommitted state and worth flagging since it touches SPRINT-39 orchestration artifacts):
`.cleargate/FLASHCARD.md`, seven other `.cleargate/delivery/pending-sync/*.md` files, `.session-totals.json`,
`GATE-4-PREFLIGHT.md` (259 new lines — looks like a Gate-4 preflight already run), `events.jsonl`,
`state.json`, `token-ledger.jsonl`, `cleargate-planning/MANIFEST.json` — plus untracked
`.qa-logs/`, `CR-108-devops.md`, `CR-111-tpv.md` (the three CR-111 report files — dev/qa/arch-postflight
— were separately verified identical to the worktree's untracked copies and are NOT part of this
blocker).

## Diagnostics

Full `git status` on `sprint/S-39` at time of halt:
```
On branch sprint/S-39
Changes not staged for commit:
	modified:   .cleargate/FLASHCARD.md
	modified:   .cleargate/delivery/pending-sync/BUG-047_Gate_Cache_Stamp_Deadlock.md
	modified:   .cleargate/delivery/pending-sync/BUG-048_Id_Prefix_In_Prose_Mints_Phantom_Item.md
	modified:   .cleargate/delivery/pending-sync/BUG-049_Collision_Surface_Only_Reads_Story_Template.md
	modified:   .cleargate/delivery/pending-sync/BUG-050_Declared_Item_Counter_Scores_Bare_Labels.md
	modified:   .cleargate/delivery/pending-sync/BUG-062_Collision_Extractor_Blind_Edges_And_Prose.md
	modified:   .cleargate/delivery/pending-sync/CR-109_Frontmatter_Machine_Field_Sidecar.md
	modified:   .cleargate/delivery/pending-sync/CR-111_Declare_Test_Layers_At_Planning.md
	modified:   .cleargate/delivery/pending-sync/EPIC-055_Parallel_Wave_Scheduling.md
	modified:   .cleargate/delivery/pending-sync/EPIC-057_Multi_Repo_Story_Execution.md
	modified:   .cleargate/sprint-runs/SPRINT-39/.session-totals.json
	modified:   .cleargate/sprint-runs/SPRINT-39/GATE-4-PREFLIGHT.md
	modified:   .cleargate/sprint-runs/SPRINT-39/events.jsonl
	modified:   .cleargate/sprint-runs/SPRINT-39/state.json
	modified:   .cleargate/sprint-runs/SPRINT-39/token-ledger.jsonl
	modified:   cleargate-planning/MANIFEST.json

Untracked files:
	.cleargate/sprint-runs/SPRINT-39/.qa-logs/
	.cleargate/sprint-runs/SPRINT-39/CR-108-devops.md
	.cleargate/sprint-runs/SPRINT-39/CR-111-arch-postflight.md
	.cleargate/sprint-runs/SPRINT-39/CR-111-dev.md
	.cleargate/sprint-runs/SPRINT-39/CR-111-qa.md
	.cleargate/sprint-runs/SPRINT-39/CR-111-tpv.md
```

Relevant excerpt of the blocking file's uncommitted diff (`git diff -- .cleargate/delivery/pending-sync/CR-111_Declare_Test_Layers_At_Planning.md`):
```diff
@@ -105,7 +105,7 @@ last_synced_body_sha: null
-- [ ] Add the Integration row to story.md §4.1 (both trees) and the **Test layers.** block to CR.md §4 / Bug.md §5 (both trees) — NO ## heading
+- [ ] Add the Integration row to story.md §4.1 (both trees) and the test-layer declaration block to CR.md §4 / Bug.md §5 (both trees) — NO ## heading
@@ -139,7 +139,21 @@ last_synced_body_sha: null
-1. **The failing case.** A story file with no Integration row fails `test-layers-declared`. **Must fail against the current tree** — the criterion does not exist.
+1. **The failing case.** A file that *carries* a test-layer declaration but omits the Integration row fails `test-layers-declared`. **Must fail against the current tree** — the criterion does not exist.
+
+   > **ORCHESTRATOR AMENDMENT (2026-08-30, CR-111 TPV §4 ruling).** ... absence-passes ruling ...
```
This overlaps in the same hunks as `story/CR-111`'s own edits to the Task Breakdown checkboxes and
the "failing case" paragraph in the same file, so it is not a disjoint no-op — a naive stash/pop or
discard risks losing the amendment content or silently reordering the TPV ruling relative to the
branch's own copy.

**DevOps took no corrective action.** Per role boundary, DevOps does not stash, discard, or commit
another agent's/the orchestrator's uncommitted work, and does not resolve conflicts. No `git stash`,
`git checkout --`, or `git commit` was run against these files.

## Partial completion (independent repo #1 — cli)
The **cli-repo** half of this cross-repo merge completed successfully and cleanly, BEFORE the outer
merge was attempted (repos are independent per the dispatch topology):
- Repo: `/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli`
- `git checkout main` → `git merge story/CR-111 --no-ff -m "merge(CR-111): declare test layers at planning"`
- Result: clean, no conflicts (`ort` strategy, 3 files changed, 1055 insertions(+), 2 deletions(-))
- Merge commit SHA: `0d2ceb3926caa71cfd2a5d397b613bb9c591c36a`
- `main` now points at this merge commit; `story/CR-111` branch left intact per instructions (not deleted).

The **outer-repo** half (`sprint/S-39` ← `story/CR-111`) is what is blocked. No merge commit was
created in the outer repo. The outer repo remains checked out on `sprint/S-39` at its pre-merge
commit `c3e9f02b33c995a65737a6a7ed4ae4245b845a86`, with the pre-existing uncommitted changes above
still present, untouched.

Steps 4-9 (prebuild-conditional, mirror parity, post-merge tests, worktree remove, branch delete,
state transition) were **not attempted** for the outer repo since they depend on the outer merge
landing. The worktree `.worktrees/CR-111` was left in place (not removed) so its reports remain
available if a second recovery attempt needs to re-verify them; the three reports (`CR-111-dev.md`,
`CR-111-qa.md`, `CR-111-arch-postflight.md`) were already confirmed present and byte-identical in
the main checkout at `.cleargate/sprint-runs/SPRINT-39/` before this halt (verified via `diff -q`,
all three empty-diff/clean).

## Recommended next step (for orchestrator/human — not executed by DevOps)
Someone with authority over the orchestrator's own uncommitted SPRINT-39 state needs to either (a)
commit that in-progress work (the TPV amendment + GATE-4 preflight + state/manifest updates) as its
own commit on `sprint/S-39` before the CR-111 merge retries, or (b) explicitly instruct how to
reconcile the amendment text with `story/CR-111`'s own edits to the same paragraph. Once
`git status` is clean on `sprint/S-39`, re-run: `git merge story/CR-111 --no-ff -m "merge(CR-111): declare test layers at planning"`.

STATUS=blocked

---

# UPDATE 2026-08-30 — Blocker #1 resolved by coordinator; Blocker #2 (real merge conflict) hit on retry

Coordinator committed the dirty `sprint/S-39` working tree as three commits
(`116e5762`, `038ee1b7`, `28035ebc`) — `sprint/S-39` now clean at `28035ebc`. DevOps verified
`git status --porcelain` was empty before retrying, per coordinator's message.

## Failure-Step
Step 3 (outer-repo merge), retry: `git merge story/CR-111 --no-ff -m "merge(CR-111): declare test
layers at planning"` in `/Users/ssuladze/Documents/Dev/ClearGate` returned exit 1 with an actual
content conflict this time (not the working-tree-would-be-overwritten guard from before).

```
Auto-merging .cleargate/delivery/pending-sync/CR-111_Declare_Test_Layers_At_Planning.md
CONFLICT (content): Merge conflict in .cleargate/delivery/pending-sync/CR-111_Declare_Test_Layers_At_Planning.md
Automatic merge failed; fix conflicts and then commit the result.
```

## Conflict-Files
- `.cleargate/delivery/pending-sync/CR-111_Declare_Test_Layers_At_Planning.md` — the ONLY conflicting
  file. All other 15 files in the merge (`.cleargate/knowledge/readiness-gates.md`,
  `.cleargate/templates/{story,CR,Bug}.md` + their `cleargate-planning/` mirrors,
  `cleargate-planning/.claude/agents/{developer,qa}.md`,
  `cleargate-planning/.claude/skills/sprint-execution/SKILL.md`, the wiki files, and the new
  `CR-111-qa-red.md`) staged clean with no conflict — `git status` shows them all under
  "Changes to be committed".

## Diagnostics

Exactly one conflict hunk, in the Task Breakdown section. Both sides carry the **same reworded
prose** ("test-layer declaration block" — the coordinator's 038ee1b7 amendment and the story
branch's own independent rewording converged on identical text), so the conflict is **purely over
checkbox state and the two "— CORRECTION:" annotations**, not content:

```diff
<<<<<<< HEAD (sprint/S-39 @ 28035ebc — coordinator's docs commit 038ee1b7)
- [ ] Cut story/CR-111 from sprint/S-39 after CR-108 and CR-110 merge; branch the cli half from cli main
- [ ] Re-measure story.md's §4.1 table position and developer.md's DB-rule line AFTER all predecessors land (N7)
- [ ] Add predicate #11 test-layers-declared to readiness-predicates.ts as a SIBLING of evalTaskBreakdownComplete; do not touch evalSection
- [ ] QA-Red: author T1-T11; T8 asserts the criterion FAILS on the shipped story.md/CR.md/Bug.md
- [ ] Add the Integration row to story.md §4.1 (both trees) and the test-layer declaration block to CR.md §4 / Bug.md §5 (both trees) — NO ## heading
- [ ] Register test-layers-declared in readiness-gates.md story/cr/bug blocks (both trees); bump :9's "exactly 10" to 11
- [ ] cleargate-planning/.claude/agents/developer.md + qa.md + skills/sprint-execution/SKILL.md §C.3: all three naming forms, incl. the hyphen case
- [ ] Run gate-section-index-pinning (expect 18/18/0/0); run typecheck + full cli suite; record all numbers
- [ ] Verify git diff on readiness-predicates.ts touches zero lines inside :640-690 and adds no export
=======  (story/CR-111 @ 248c9ff0 — Developer's checked-off copy)
- [x] Cut story/CR-111 from sprint/S-39 after CR-108 and CR-110 merge; branch the cli half from cli main
- [x] Re-measure story.md's §4.1 table position and developer.md's DB-rule line AFTER all predecessors land (N7)
- [x] Add predicate #11 test-layers-declared to readiness-predicates.ts as a SIBLING of evalTaskBreakdownComplete; do not touch evalSection
- [x] QA-Red: author T1-T11; T8 asserts the criterion FAILS on the shipped story.md/CR.md/Bug.md
- [x] Add the Integration row to story.md §4.1 (both trees) and the test-layer declaration block to CR.md §4 / Bug.md §5 (both trees) — NO ## heading
- [x] Register test-layers-declared in readiness-gates.md story/cr/bug blocks (both trees); bump :9's "exactly 10" to 11
- [x] cleargate-planning/.claude/agents/developer.md + qa.md + skills/sprint-execution/SKILL.md §C.3: all three naming forms, incl. the hyphen case
- [x] Run gate-section-index-pinning (expect 18/18/0/0); run typecheck + full cli suite; record all numbers — CORRECTION: the row's "18/18/0/0" target is stale (QA-Red independently reconfirmed the real, unaffected-by-CR-111 number is `14/14/0/0` — "18" is S1a's/S6's criteria-count string inside a test TITLE, not a test-count, the same homonym class already flagged in FLASHCARD 2026-08-27). Ran it unmodified: `14/14/0/0`, unchanged. Typecheck: clean, exit 0. Full cli suite: 2676 tests, 2657 pass (unredirected), 18 fail — itemised in the dev report (3 inherited + 15 not-yet-merged-dependent, all confirmed 0/0 under `CLEARGATE_META_ROOT` redirection to this worktree).
- [x] Verify git diff on readiness-predicates.ts touches zero lines inside :640-690 and adds no export — confirmed via `git diff --unified=0`: hunks at lines 3, 24, 139-141, 190-197, 1177+ only; no `export` added anywhere in the file.
>>>>>>> story/CR-111
```

Both sides are deliberate per the coordinator's own framing: HEAD's unchecked boxes are the
orchestrator's amendment commit (which only touched the prose, not the checkmarks), and
story/CR-111's checked boxes carry the Developer's completion record plus two substantive
"— CORRECTION:" notes (the `18/18/0/0` → `14/14/0/0` homonym clarification, and the
`readiness-predicates.ts` export-boundary verification). Taking HEAD as-is would silently drop the
Developer's completion evidence; taking story/CR-111 as-is would silently drop nothing here since
the prose is already identical — but DevOps is not authorized to make that call. **DevOps did not
resolve this conflict.**

## Merge state left as-is (not aborted)
The outer repo is currently **mid-merge**: `MERGE_HEAD` is set, `git status` shows one unmerged path
(`.cleargate/delivery/pending-sync/CR-111_Declare_Test_Layers_At_Planning.md`, "both modified") and
15 other files already staged clean under "Changes to be committed". DevOps did **not** run
`git merge --abort`, `git commit`, or edit the conflicted file — the state is exactly as git left it
after the failed auto-merge, ready for a human/coordinator to resolve the one hunk and run
`git add` + `git commit` to complete the merge that was already in progress. `sprint/S-39`'s last
committed ancestor is still `28035ebc`.

## Not attempted (contingent on this merge landing)
Per the halt contract, steps after the outer merge were **not attempted**: worktree removal
(`.worktrees/CR-111`), `state.json` CR-111 → Done transition, MIRROR_PARITY audit, post-merge test
verification. All are pending the merge conflict's resolution.

## Unchanged / already true
- cli-repo merge remains complete and untouched: `main` @ `0d2ceb3926caa71cfd2a5d397b613bb9c591c36a`.
- No branches deleted (`story/CR-111` intact in both repos).
- `close_sprint.mjs` not run.
- Full test suite not run.

STATUS=halted
