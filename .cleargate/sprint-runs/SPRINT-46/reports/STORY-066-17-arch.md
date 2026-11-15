# STORY-066-17 architect-review (role: architect, post-flight, runtime lane)

STORY: STORY-066-17
VERDICT: PASS
TREE: integrated acd3e14 (main ff4f258 merged into story/STORY-066-17). History bf21e96 → seal 4b225db → Dev 41a86ee → seal 2 1f32eb7 → rework a8c59ae → acd3e14. Net change on main: `git diff ff4f258..HEAD` = 11 files (7 source/doc + 4 new red files).
BLOCKING FINDINGS: none. Five advisories (F1–F5), all non-blocking for the merge. F1 and F2 matter for Goal check (d) run 3a.

## 1. §9 checklist (plan `plans/STORY-066-17.md` §9, D-1..D-22)

| Check | Result | Evidence |
|---|---|---|
| Step order per D-1 | PASS | `close_sprint.mjs` markers: 1 `:452`, 2 `:488`, 2.7 `:506`, 2.8 `:566`, 2.5 `:736`, dist WS8e `:809`, 2.6d `:861`, 2.6c `:922`, 2.6 `:1050`, 2.6b `:1111`, 2.9 `:1172`, 3 `:1391`, 3.5 `:1403`, 3.6 `:1461`, 4 `:1485`, prompt `:1535-1549`, 5 `:1551`, 6 `:1580`, 6.5–6.7, 7 `:1633`, 7.4 `:1656`, 7.5 `:1715`, 7.8 `:1745`, 8 `:1773`. |
| BUG-077 markers in order | PASS | `── Step 2.6d:` `:861` < `2.6c:` `:922` < `2.6:` `:1050` < `2.6b:` `:1111`. Main's 2.6d…2.9 region vs the new one: only deletions (the moved 2.7/2.8), 0 added lines. |
| 2.7 moved verbatim | PASS | bf21e96 `:910-968` vs new `:506-564`: byte-identical (59 lines). |
| Forced/PR 2.8 branch byte-equal to bf21e96 | PASS | bf21e96 `:1018-1103` vs new `:619-704`: byte-identical after removing exactly two leading spaces (86 lines). PR fail-closed gate bf21e96 `:988-1006` vs new `:586-604`: byte-identical. Seam strings unchanged (`Step 2.8 skipped: CLEARGATE_SKIP_MERGE_CHECK=1 …`, `…no numeric portion.`, `Step 2.8: verifying …`). |
| `planFinish` check order | PASS | `lib/sprint-finish.mjs` is byte-identical to the amended §2.2 block (diffed). Order: toplevel `:127-130` → both refs `:131-133` → worktree list → ancestry → `merge-tree` `:155` (conflict only on an OID line) → dirt check only for a receiver ≠ root `:173-187` (D-2) → detached / third branch `:190-203` (D-3). |
| `closeOwnsRepo` gates exactly Step 5 and the plan | PASS | Defined `:437-446`; read only at `:563` (Step 5) and `:728-729` (plan assignment). Step 5 `:1551` precedes 7.8 `:1745` (D-9). |
| `runFinish` | PASS | No `--no-verify` flag anywhere (it appears only in comments and messages). On a merge failure, `MERGE_HEAD` is checked, the merge is aborted, and `failBack` runs (`:324`). A failed `branch -d` only adds a warning and still sets `ok` (`:347-353`). Every path returns a result; nothing throws: spawnSync never throws, and `real`/`readActive` are wrapped in try. Amendment A is in place: `shq`, `restoreBranch` `:239`, `failBack` `:311`, and every failure after the checkout goes through `failBack`. |
| Step 3.6 never overwrites | PASS | `close_sprint.mjs:1461-1483`: an existing checklist is reported `… already written (kept).`. `invokeScript` passes `CLEARGATE_REPO_ROOT` and `CLEARGATE_SPRINT_DIR`. The `prep_doc_refresh.mjs` diff matches §2.3 exactly. |
| Docs match code | PASS | SKILL A.3 sentence and §7 (E.1–E.5), enforcement §12.2/§14.2 (with the Amendment A sentence)/§14.4, and CLAUDE.md `:38` match §2.4–§2.6 and the code paths above. A.3 says "`cleargate sprint close` runs it", which holds: `sprint.ts:605` runs `close_sprint.mjs` through `run_script.sh`. |
| Codex SKILL regenerated | PASS | `node scripts/build-codex-payload.mjs --check` exit 0 on acd3e14. |
| No test edits / no `console.*` / outer twin untouched | PASS | The only test changes are four new files (A), all from QA-Red commits 4b225db and 1f32eb7. No `+…console.` line in the diff. Outer live `close_sprint.mjs` sha256 `0f837a9a…` has no `sprint-finish` and no `Step 7.8`. Live `lib/` has no `sprint-finish.mjs`. Live SKILL still says "single place it is CLEARED". `git status` on the outer `.cleargate/{scripts,knowledge,templates}` is clean, and the host `.worktrees/STORY-066-17` is clean. |

**Tests re-run singly** (private TMPDIR, `npm run test:file`), on acd3e14:
- reds: `sprint-finish.red` 2/2, `close-sprint-finish.red.integration` 6/6, `close-sprint-finish-restore.red.integration` 5/5, `prep-doc-refresh.red` 1/1;
- witnesses: `close-sprint-backsync` 11/11, `lifecycle-reconcile-lane.red` (066-16) 2/2, `close-sprint-hardening-043-05.red` 16/16.

The worktree was clean afterwards. QA's evidence headers read acd3e14, and `proof-recovery.txt` shows every A.6 exit code.

## 2. What QA would not catch

### 2.1 066-16 interplay

- **The reconciler still loads from dist.** 2.6d is unchanged apart from its new position. It loads `lifecycle-reconcile.js` through `localCliDist(scriptRoot) ?? resolveCliBin(REPO_ROOT) ?? …` (`:874-883`), so it reads dist, never src. The worktree dist was built at 17:06 after the integration, and its chunk `chunk-5BIBS2Q6.js` contains 066-16's `LANE_NAMES`/`readFrontmatterLane`.
- **The lane rewrite holds.** I ran a scratch close on the integrated scripts with a `node_modules/cleargate` link to that dist: story file `lane: "standard"`, `state.json` lane `runtime`. `git show main:…/archive/STORY-001-01_x.md` gives `lane: "runtime"` in both layouts. The rewrite happens at 2.6d in the no-flag pass, and Step 7.8 commits it to `main`.
- **Effect of the reorder.** Because 2.8 now precedes 2.6d, a refused close also rewrites no lanes. That is what D-1 intends.
- **For run 3.** The rewrite reaches a sandbox only through its installed CLI's dist, so the run-3 RC must be built from a cli `main` that holds 066-16 (and 066-17).

### 2.2 Scratch trace of both layouts

Script: `/private/tmp/claude-501/-Users-ssuladze-Documents-Dev-ClearGate/5ceeac69-149c-4c13-bbec-09ab2d997749/scratchpad/arch17/layouts.sh`; output `…/arch17/layouts.out`. It runs real git with an empty HOME and an unreachable MCP, under `/private/tmp/a17l.*`, which it removes. All four cases ran on the integrated scripts:
- **3b plain checkout:**
  - Both no-flag passes exit 0 and print the plan `… after git checkout main; clear .active (reads SPRINT-01); delete sprint/S-01.`
  - The ack exits 0. `main` holds `merge: sprint/S-01 → main` over `chore(SPRINT-01): close — …`; HEAD is `main`; branch deleted; `.active` `''`; tracked status clean.
- **3a Claude-managed worktree:**
  - Topology: the worktree is created on `worktree-run`, then A.2's `git checkout -b sprint/S-01 main` runs inside it.
  - The no-flag pass prints `merge sprint/S-01 into main in <P>; … keep (checked out at <W>) sprint/S-01.`
  - The ack exits 0 with `(in <P>)`. P is on `main` and clean. W stays on `sprint/S-01`. Branches after close: `main`, `sprint/S-01`, `worktree-run`. Both `.active` are `''`.
- **D-3 case:** see §3.

### 2.3 Sandbox run 3: trace by layout

Both sandboxes are Go repos with tracked `.active`, a global or prefix CLI (BUG-114 PATH dist), and no git hooks (`cg-sandbox-s46/.git/hooks` has no active hook).

**3a: session in `<repo>/.claude/worktrees/<name>`.** `main` is checked out in the parent checkout P (the repo root). The session worktree W holds `sprint/S-01` (see §3).
- **No-flag pass in W.** REPO_ROOT is W, because the script is W's tracked copy.
  - Read-only checks first: Steps 1–2 read W's `state.json`. 2.7 lists P, W and any `.worktrees/STORY-*` (`.claude/worktrees/*` is not matched).
  - 2.8 `planFinish(root=W)`: mainAt = P, mergeIn = P, keepAt = W. It checks mergeability and P's tracked status (`--untracked-files=no`). W must be on `sprint/S-01`.
  - Then the writers, all in W: 2.5, the dist assertion, 2.6d (lane rewrite, archive moves), 2.6c, 2.6/2.6b, 2.9, 3, 3.5, 3.6 (checklist in W).
  - Then Step 4 or the prompt. Nothing is written in P, and nothing is committed or checked out anywhere.
- **Ack pass in W.**
  - The same read-only checks run again, so P's dirt and main's movement are re-checked before Step 5.
  - Step 5 flips W's `state.json` and clears W's `.active`. Steps 6–6.7 run. Steps 7/7.4 warn because the repo is pre-member.
  - 7.5 runs `cleargate wiki ingest` on W's report and writes **W's** `.cleargate/wiki/*` (`resolveProjectRootForFile`). That matches run 2's c59dcc1, which added nine wiki pages.
  - 7.8 commits in W: `git add -A -- .cleargate` plus `git add -u`, so the wiki, archive moves, report, checklist and every tracked edit go in. It then runs `git -C P merge --no-ff`, verifies, and keeps `sprint/S-01` (W holds it). Item 7 prints `git branch -d sprint/S-01` for after leaving W.
  - P is never checked out or committed in, only merged into. That is what the Gate 4 line names.
- **After the ack:** see F2. P's PostToolUse hook re-ingests the merged delivery changes into P's now-tracked wiki.

**3b: session in the plain checkout.** `main` is checked out nowhere: the root is on `sprint/S-01`, and story worktrees hold story branches and are torn down by `merge_story.mjs`.
- **No-flag pass.** 2.8 gives `checkoutMain: true`, `keepAt: null`. The writers write files only; there is no commit and no branch switch. So nothing in this pass should make Claude Code pause.
- **Ack pass.** Step 7.8 commits on `sprint/S-01`, runs `git checkout main` in the root, merges, verifies and runs `git branch -d sprint/S-01`. The root is left on `main` (R4(b)).
- **Where a pause can happen.** The commit and the branch switch happen inside a single `node` call. If Claude Code pauses before it commits or switches branches, the pause is on the ack command itself, right after the human's Gate 4 ack. The Gate 4 line names both writes (`commit … on sprint/S-01 in <repo>; merge … in <repo> after git checkout main; … delete sprint/S-01`), so one answer covers both. This is not a halt outside the three gates.
- **Outside this story.** Branch switches and commits during execution (A.2, `merge_story.mjs`, bookkeeping) are not this story's scope, but they are where a 3b session is more likely to pause.

## 3. Worktree layout: the branch question

**Answer: D-3 does not stop the close in the run-2 layout. The orchestrator needs to do nothing beyond the two passes.**

**Run 2's actual state** (read-only on `/Users/ssuladze/Documents/Dev/cg-sandbox-s46`):
- `git worktree list` shows `cg-sandbox-s46 484c48d [main]` and `.claude/worktrees/sprint-01-run c59dcc1 [sprint/S-01] locked`.
- The branch `worktree-sprint-01-run` sits at `3660a1b` (the fixture base, "chore: fixture timestamps…") and is checked out nowhere.

The session **started** on `worktree-sprint-01-run`, the branch Claude Code creates for its worktree. SKILL A.2 `git checkout -b sprint/S-NN main` (`SKILL.md:152`), run in the session's checkout, moved that worktree onto `sprint/S-01`. Even without A.2, `merge_story.mjs:440-443` checks `sprint/S-NN` out in its root before the first story merge. So by close the session worktree is on `sprint/S-NN` and D-3 passes. `main` cannot be checked out in W, because P holds it.

**How the two branches relate.** `worktree-<name>` is an unused pointer at the base. Close never reads or moves it, and it survives the close; Claude Code's worktree cleanup owns it. `sprint/S-01` is kept while W holds it, and item 7 prints its delete command. My scratch shows the same: branches after close are `main`, `sprint/S-01`, `worktree-run`.

**When D-3 would stop it:** only if the session checkout is switched back to `worktree-<name>` (or detached) before close. Two cases:
- **That branch is still at the base.** There is no sprint dir on it, so close exits 1 at Step 1: `Error: state.json not found at <W>/…/SPRINT-01/state.json`. Nothing is written.
- **That branch carries the sprint commits.** 2.8 refuses before any write: `Step 2.8 failed: <W> is on worktree-run; the finish commits the close artefacts on sprint/S-01 or main` and `Resolve: check out sprint/S-01 in <W>, then re-run close_sprint.mjs.`

In both cases the orchestrator runs `git -C <W> checkout sprint/S-01`, which works because no other checkout holds it, then re-runs E.1. That is one hand git step, and it arises only off the playbook.

D-3 is correct as built. A close commit on `worktree-*` would never reach `main` through the `sprint/S-01` merge.

## 4. This meta-repo's own Gate 4 (OD-4)

**Layout.** The meta-repo is in the plain layout:
- `OUTER` is on `sprint/S-46`.
- The outer worktrees (`S46-base`, `S46-tip`, `STORY-066-17`, `STORY-066-18`) are all detached, so `main` is checked out nowhere.
- `.active` is gitignored (`.gitignore:28`).

**Under OD-4, SPRINT-46 closes on the OLD live `close_sprint.mjs`.** That script has no Step 7.8, does not clear `.active`, and has no BUG-114 resolver; the cli `dist` is local here, so that does not matter. It runs 2.6d `:530` before 2.7 `:839` and 2.8. The old procedure therefore still applies:
- **Teardown first.** Every `.worktrees/STORY-*` host must be torn down before Step 2.7 passes. `S46-*` hosts do not match its regex.
- **Hand merge before the prompt.** Old 2.8 exits 1 until `sprint/S-46` is an ancestor of `main`, so the hand merge comes **before** the no-flag pass can print the prompt (S23).
- **Commit after the ack.** The ack pass's writes (`state.json`, `improvement-suggestions.md`, wiki ingest) stay uncommitted, so a second commit and merge follow (S26).
- **Clear `.active` by hand.** `.active` stays set until `cleargate sprint archive` or a hand edit (S27).

Expected; OD-4 accepts it.

**Old 2.6d and the lane rewrite.** Old 2.6d loads `OUTER/cleargate-cli/dist/lib/lifecycle-reconcile.js`, which is not rebuilt during the sprint (rule 17). So 066-16's lane rewrite does not apply to SPRINT-46's own items. That is cosmetic.

**Why the order matters.** If the re-sync ran first, the new close would see a plain layout in the meta-repo root:
- 7.8 would sweep every tracked modification (the ~50 in `git status`) and every untracked `.cleargate/**` file (the `pending-sync/BUG-137…`, `BUG-138…` drafts) into one close commit;
- it would then run `git checkout main` in the root.

This confirms OD-4's order: close first, then re-sync.

**After the re-sync,** the D-4 guard keeps the live-twin tests (tmp `CLEARGATE_SPRINT_DIR`) from committing in the meta-repo. A grep of `test/` found no live spawn that acks without a sprint-dir or merge seam.

**Link check after the re-sync.** `cleargate init` does not update existing live scripts (066-18 OD-5), and `close_sprint.mjs` statically imports `./lib/sprint-finish.mjs`. Running `node .cleargate/scripts/close_sprint.mjs` with no arguments must exit 2 with `Usage: …`. `ERR_MODULE_NOT_FOUND` means the lib did not reach live. The command only prints usage; verified exit 2 on canonical.

## 5. Findings

| ID | File:line | Severity | Blocks merge | Finding |
|---|---|---|---|---|
| F1 | `scaffold/core/.cleargate/scripts/lib/sprint-finish.mjs:177`; plan `STORY-066-17.md:1226` (R-6) | medium (Goal (d) 3a) | no | R-6's "Low" rationale misses the wiki (details below). |
| F2 | `scaffold/hosts/claude/.claude/hooks/post-shell-ingest.sh:17` with `hooks/lib/harness.sh:46-48` (not this story's code) | medium (Goal (d), next-sprint preflight) | no | Predicted, not reproduced, because it needs the live hook: `main` dirty right after a successful close (details below). |
| F3 | `scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:654` | low | no | §7 says "a Claude-managed worktree on `sprint/S-NN`" but does not say the session starts on `worktree-<name>` and that A.2 moves it. Add one sentence at the next SKILL edit: "In a Claude-managed worktree, A.2 moves the session off its `worktree-<name>` branch; keep it on `sprint/S-NN` until close." |
| F4 | `lib/sprint-finish.mjs:220` (`finishText`), `:282-286` | low | no | The Gate 4 line says "commit close artefacts", but `git add -u` plus `git add -A -- .cleargate` commit every tracked edit and every untracked `.cleargate/**` file. That is documented in SKILL E.5 item 1 and §14.2. The prompt understates it, most visibly in this meta-repo's root. Intake: the finish line counts tracked edits outside `.cleargate/` and untracked `.cleargate/**` files. |
| F5 | `lib/sprint-finish.mjs:324` | low | no | In the worktree layout, a failed `git -C P merge --abort` leaves P mid-merge. `restoreBranch` handles only the closing checkout, so P gets no recovery line (only git's output). `merge --abort` rarely fails. Intake with A4. |

**F1 detail.** Step 2.8 ignores untracked files in the receiving checkout. Run-2 evidence shows that the parent checkout of a worktree session does gather untracked files at exactly the paths the close commit adds:
- P has untracked `.cleargate/wiki/{active-sprint,brief,decisions,index,log,open-gates,product-state,roadmap}.md`, `sprints/SPRINT-01.md` and `epics/EPIC-001.md`.
- P's `wiki/log.md` first entry is 11:17:15Z, 22 s after P's HEAD moved (hand merge 484c48d at 11:16:53Z). That is P's own PostToolUse `post-shell-ingest.sh`, which resolves CLAUDE_PROJECT_DIR = P (BUG-137).
- W's close commit c59dcc1 adds those same wiki paths.

Under 066-17, P's HEAD does not move before Step 7.8, so a fresh 3a fixture should not collide. But any HEAD move in P during the session, or a reused P, fails 7.8 after `Completed`. Recovery is to remove P's files and re-run the ack (prototype case W), which is a hand step. → Raise intake A4's priority, and add the pre-ack check in §6.

**F2 detail.** After the ack's Bash call, the receiving checkout's `post-shell-ingest.sh` sees HEAD moved. It re-ingests the merged delivery paths (epic and sprint archive moves) into the wiki. Those wiki pages are now **tracked**, because 7.5's pages were committed at 7.8. The ingest's idempotence key `last_ingest_commit` changed to the close commit, so the pages are updated. Result: `main` shows tracked wiki modifications (and possibly a new untracked `epics/EPIC-001.md`).
- 3a: P. 3b: likely the root too.
- Next sprint's preflight check 4 ("`main` clean") then fails. In 3a, the next close's 2.8 dirt check on P refuses.
- Mechanism evidenced by run 2 (P's wiki written 22 s after its HEAD moved). → Intake. For run 3, see the observation step in §6.

## 6. Recommendations for the orchestrator

- Merge per rule 17. Log the two rule-18 names QA listed (doctor drift for `lib/sprint-finish.mjs` missing live, and for `prep_doc_refresh.mjs` content) at the merge (OD-3).
- **Run 3a, before the ack:** run `git -C <P> status --porcelain --untracked-files=all -- .cleargate`. It must list nothing the close commit will add (F1). If it lists wiki pages, record them as a finding before acking, not as a 066-17 defect.
- **Run 3a/3b, right after the ack:**
  - record `git -C <main checkout> status --porcelain` from the ack command's own transcript, then again after the next Bash call;
  - dirt that appears only in the second reading belongs to F2 (the hook), not to Step 7.8.
- Run 3a passes D-3 as long as nobody switches the session checkout off `sprint/S-01` after the last merge (§3).
- Gate 4: OD-4 order, then the link check (§4) after the re-sync.
- Intake lines: F1 (raise A4), F2, F3, F4, F5.

flashcards_flagged:
  - "2026-11-15 · #close #worktree · Claude worktree sessions start on worktree-<name>; A.2/merge_story move them to sprint/S-NN, so close D-3 passes"
  - "2026-11-15 · #close #worktree #wiki · parent's post-shell-ingest writes .cleargate/wiki/* after its HEAD moves; untracked → 7.8 merge collides"
  - "2026-11-15 · #close #git · Step 7.8 commits every tracked edit + untracked .cleargate/** (add -u, add -A); review git status before the ack"
