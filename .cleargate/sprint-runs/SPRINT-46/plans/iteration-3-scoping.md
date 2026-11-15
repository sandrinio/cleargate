# SPRINT-46 iteration 3: scoping (Goal check (d) sandbox run 3)

role: architect · 2026-11-15 · code read at cli `main` bf21e96 (`.worktrees/S46-tip/cleargate-cli`, read only).
Inputs: sprint-context rules 12–21 and Mid-Sprint Amendments; sandbox ORCHESTRATOR_FINDINGS §A–D (run 1);
field-trials log S1–S28 (run 1 and run 2); coordinator notes S7 (run 2), S21, S23–S28.

Bar (owner, section C): same four stories, kickoff to close, in BOTH layouts (plain main checkout; Claude-managed
worktree `.claude/worktrees/<name>` holding `sprint/S-NN` while `main` is checked out in the parent checkout):
0 hand-dispatched stages, 0 hand teardowns, 0 hand edits to `.active`, 0 `--force` re-inits, no `node_modules`
link, no pack-missing QA bounce, the test gate runs tests or stops the sprint at preflight with a named waiver,
halts only at plan confirmation, walkthrough and Gate 4. Coordinator addition: close runs with no hand git step.

Not re-scoped (merged): A1, A2, A3 (066-13, -14), A4 CLI resolution (BUG-114), B1 (066-14 R4), report lanes (066-15).

---

## 1. B2 / S18 lanes at kickoff (+ S19, B11)

**Root cause.**
- Order: SKILL `scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:157-163` (A.3 init) runs before
  `:175-219` (A.4, the SDR that writes `plans/waves.json`). `init_sprint.mjs:196-243` reads lanes only from
  `waves.json` or the §2.4 table; neither exists at A.3, so `:239-243` warns and `:273` stamps `standard`
  (`lane_assigned_by: migration-default`).
- The stamp sticks: `segment_stages.mjs:95-101` `laneOf` returns the state lane before the plan lane, so the later
  `waves.json` never reaches the runner. Orchestrators re-ran `init_sprint.mjs --force` (run 1 08:04:46, run 2
  10:54:49). `laneOf` precedence is pinned by the sealed `test/scripts/segment-stages.red.node.test.ts:81`
  ("state wins"), so the fix is not there.
- S19: SKILL `:160` shows `node .cleargate/scripts/init_sprint.mjs SPRINT-NN`; `init_sprint.mjs:132-133` exits 2
  without `--stories`; `cli.ts:398` makes `--stories` required for `cleargate sprint init`.
- B11: `templates/story.md:82` ships `lane: "standard"`; nothing reads a story's frontmatter `lane` (grep of `src/`
  and `scaffold/core/.cleargate/scripts/`: every lane reader uses `state.json`); close 2.6d
  (`src/lib/lifecycle-reconcile.ts:921-925`) sets `status`/`approved` and archives, so the archived record keeps
  the template's `standard` (run 1 STORY-001-03 ran `runtime`).

**Smallest fix.**
1. `init_sprint.mjs`: when `plans/waves.json` is absent (and only then), compute each id's lane with
   `assign_lane.mjs` from its item file in `.cleargate/delivery/{pending-sync,archive}` (`matchesId` from
   `lib/work-item-id.mjs`, as `seal_red.mjs:56-65` does). Stamp `lane_assigned_by: 'assign-lane-script'`. A §2.4
   table lane for the same id is judged against that floor with the existing raise-never-lower block (`:256-272`,
   same WARN text). No item file found: today's behaviour (table lane or `standard`/`migration-default`).
   `waves.json` present: unchanged (still preferred). `--preserve-bounces` carry still wins.
2. `assign_lane.mjs`: additive export `assignLaneForFile(file) -> { id, lane, signals, reason } | null` that never
   calls `process.exit`; `assign()` (`:155-168`) delegates to it. No change to `computeSignals`/`laneFor`.
3. SKILL A.3: the command becomes `cleargate sprint init SPRINT-NN --stories <the §1 work-item ids, comma-separated>`
   (the CLI path also runs the decomposition gate and the kickoff baseline); the lane paragraph says init computes
   lanes when no `waves.json` exists. A.4 tail (after the existing "Verify before leaving A.4"): "If §2.4 raises a
   lane above its `lane_signals` floor, record it with
   `CLEARGATE_STATE_FILE=<sprintDir>/state.json node .cleargate/scripts/update_state.mjs <ID> --lane <lane>`. Never
   re-run init with `--force`." Do not reorder A.3/A.4: the SDR agents read `sprint-context.md` first and the
   ledger hook needs `.active`, both written by init.
4. B11: in `reconcileCurrentSprintStories`, when it flips a story and the file's frontmatter already has a `lane:`
   key and `state.json` holds a valid lane, set `lane: "<state lane>"` (never add the key). Archived records then
   show the lane that ran, including demotions.

**Files.** `scaffold/core/.cleargate/scripts/init_sprint.mjs`, `scaffold/core/.cleargate/scripts/assign_lane.mjs`,
`src/lib/lifecycle-reconcile.ts`, `scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md` (A.3, A.4),
regenerated `scaffold/core/.agents/skills/sprint-execution/SKILL.md` (`npm run gen:codex`).

**Tests pinning today.** `scaffold/core/.cleargate/scripts/test/cr078_init.test.sh` assertions 3c/3d/4c (fixtures
have no item files, so they stay green; QA-Red confirms). `test/scripts/assign-lane-init-sprint.red.integration`,
`test/scripts/init-sprint-waves-v2.red.integration` (both have `waves.json`; unchanged). `test/scripts/assign-lane.red`
(exports unchanged). `test/lib/close-sprint-backsync.node.test.ts` (lane `standard` fixtures; check whether its
story files carry `lane:`). No sealed red needs re-scope.

**Risk.** An Architect raise is stamped `human-override` by `update_state --lane` (fold `state-events.mjs:254-259`);
cosmetic. A raise the orchestrator forgets runs at the floor (never lower than computed; today's failure mode is
all-`standard`). `collision_surface.sh` prose parsing inflates subsystem counts (intake), so some items compute
`runtime` too eagerly; unchanged by this fix.

**Size.** M.

## 2. A4 close from a worktree session (S23–S28) — one close sequence for both layouts

**Root cause.**
- S25: `close_sprint.mjs:484-546` Step 2.5 exits 1 when any item is `fast` and the report does not exist yet
  (`:509-514`), before Step 3.5 builds the Reporter bundle. With EPIC-066 most sprints have a fast item, so the
  first no-flag run always fails, though SKILL E.1 says close prepares the Reporter step.
- S23: Step 2.8 (`:970-1106`) requires `sprint/S-NN` already merged in every pass, so the no-flag pass cannot reach
  the Gate 4 prompt (`:1434-1451`) until someone merges, while SKILL E.5 (`SKILL.md:706-723`), enforcement §2 and
  CR-107 put the merge after sign-off. The worktree session could not merge (`main` checked out in the parent);
  the owner ran `git merge` there by hand.
- S26a: after the merge it demands, the ack pass writes tracked files: Step 5 `state.json` (`:1454-1461`), Step 6
  `improvement-suggestions.md`, Step 7.5 wiki pages (`:1597-1625`). A second sprint→main merge is always needed.
- S26b: `close_sprint.mjs` never clears `.active` (only reads it, comment `:606`). `cleargate sprint archive` clears
  it (`src/commands/sprint.ts:1214-1219`) but then runs `git checkout main` / `merge` / `branch -d` in cwd
  (`:1221-1250`), which fails when `main` is checked out in another worktree and the sprint branch is checked out
  here. SKILL `:167` says `cleargate sprint close` (`sprint.ts`) clears it; `sprintCloseHandler`
  (`sprint.ts:592-637`) only spawns close and stops the dashboard. Target repos track `.active` (run 1 committed it
  in e0a9eae); this meta-repo ignores it (`.gitignore:28`).
- S24: 2.6d/2.6c archive and flip statuses (`:600-787`) before the read-only checks 2.7/2.8 (`:910-1106`), so a close
  that cannot proceed still leaves moved files; the orchestrator committed them by hand.

**The close sequence (both layouts).** One order, stated in SKILL §E:

| Step | Who | What |
|---|---|---|
| E.1 | orchestrator | `node .cleargate/scripts/close_sprint.mjs <id>` (no flags). Pre-checks 1–2, 2.7, 2.8 (read-only, now ahead of the writers), then 2.5 (report checked only if it exists), 2.6d/2.6c/2.6/2.6b, 2.9, 3, 3.5, Step 4: "spawn the Reporter", exit 0. |
| E.2 | orchestrator | Reporter writes `SPRINT-<#>_REPORT.md`; re-run E.1. Step 2.5 now validates the report; the prompt prints the **finish plan** (below). |
| E.3 | orchestrator | Surface the Brief and the finish plan verbatim. **HALT (Gate 4).** |
| E.4 | orchestrator, after the ack | Apply or punt the doc-refresh items (edits stay uncommitted; the finish commits them). |
| E.5 | orchestrator, after the ack | `CLEARGATE_CI_ACK=1 node .cleargate/scripts/close_sprint.mjs <id> --assume-ack`. Steps as today through 7.5, then **Step 7.8 finish**: commit, merge, verify, delete or keep the branch. No hand git step. |

**Smallest fix (all in `close_sprint.mjs` plus one new lib).**
1. Step 2.5: report absent and no `--assume-ack` → `Step 2.5 deferred: <report> not written yet — the Reporter
   writes it at Step 4; it is validated before the ack prompt.` and continue. Ack pass: unchanged (absent → exit 1).
   A present report is validated in both passes as today.
2. Step 2.7 and Step 2.8 move ahead of the dist assertion and 2.6d (both read-only; BUG-077's writer-before-judge
   order among 2.6d/2.6c/2.6/2.6b is untouched). New 2.8 meaning: "`sprint/S-NN` is merged to `main` or merges
   cleanly, and the checkout that will receive it is clean". Checks, in order: already an ancestor
   (`git merge-base --is-ancestor`) → pass; else `git merge-tree --write-tree refs/heads/main refs/heads/sprint/S-NN`
   exit 0 → pass, exit 1 → fail naming the conflicting paths, unsupported (git < 2.38) → warn and continue (as
   today's exit-128 fail-open); then the receiving checkout (below) must have no tracked changes
   (`git -C <W> status --porcelain --untracked-files=no` empty) → else fail naming `<W>`. Test seams keep their
   exact behaviour and text: `CLEARGATE_SKIP_MERGE_CHECK=1` skips 2.8 and Step 7.8; `CLEARGATE_FORCE_MERGE_STATUS=
   merged|unmerged` injects the 2.8 verdict, keeps today's `Step 2.8 failed: sprint/S-NN not merged to main` and
   `Resolve: merge …` lines for `unmerged`, and skips Step 7.8. `vcs.sprint_pr: true`: 2.8 and the finish behave
   exactly as today (PR merged by `gh pr merge` before E.5; Step 7.8 prints `skipped: vcs.sprint_pr`).
3. Step 5 (ack pass): after the flip, if `<REPO_ROOT>/.cleargate/sprint-runs/.active` (trimmed) equals the sprint id,
   write it empty (atomic, never create it); print `Step 5: .active cleared (was <id>)`; a different value is left
   alone with a note. `REPO_ROOT` is the tree close runs in (the session worktree in the worktree layout).
4. New Step 7.8 "finish" (ack pass, after 7.5, before Step 8; nothing after it writes tracked files: Steps 7/7.4
   only push to MCP), implemented in new `scaffold/core/.cleargate/scripts/lib/sprint-finish.mjs`
   (exports `listWorktrees(root)`, `planFinish({ root, sprintBranch })`, `runFinish(plan, { sprintId })`; git via
   `spawnSync` argv arrays):
   a. Commit: in `REPO_ROOT`, `git add -A -- .cleargate` and `git add -u` (tracked edits such as doc-refresh
      changes); commit `chore(<id>): close — sprint_status Completed, close artefacts` if anything is staged.
      Untracked files outside `.cleargate/` are left and listed as a warning. Detached HEAD → exit 1. A pre-commit
      hook failure → exit 1 with its output; never `--no-verify`.
   b. Merge, by where `main` is checked out (`git worktree list --porcelain`, entry `branch refs/heads/main`):
      - nowhere (plain layout, session on `sprint/S-NN`): `git checkout main` in `REPO_ROOT`, then
        `git merge --no-ff -m "merge: sprint/S-NN → main" sprint/S-NN` there;
      - in `REPO_ROOT`: merge there;
      - in another worktree `<W>` (Claude-managed layout): `git -C <W> merge --no-ff -m … sprint/S-NN`; nothing is
        checked out in `REPO_ROOT`.
      Already up to date → no commit, pass. A conflict → `merge --abort` in that tree, exit 1 naming the files
      (2.8 should have caught it).
   c. Verify (the old 2.8 assertion, now after the merge): `sprint/S-NN` is an ancestor of `main` → `Step 7.8:
      sprint/S-NN merged to main at <sha> (in <path>)`, else exit 1.
   d. Branch: checked out in any worktree → `Step 7.8: sprint/S-NN kept — checked out at <path>. After leaving it:
      git branch -d sprint/S-NN`, exit 0; else `git branch -d sprint/S-NN`.
5. Finish plan (no-flag pass, printed with the existing "Review the report…" prompt, from `planFinish`):
   `On --assume-ack close will: commit close artefacts on <branch> in <REPO_ROOT>; merge sprint/S-NN into main in
   <W | REPO_ROOT after git checkout main>; clear .active (reads <id>); <delete | keep (checked out at <path>)>
   sprint/S-NN.`
6. Step 8 handoff: add item 7 `Finish: done at Step 7.8` or the kept-branch command (items 5 and 6 keep their text,
   pinned at `test_close_sprint_v21.integration.node.test.ts:1898-1900`).
7. Docs: SKILL A.3 `.active` sentence ("`close_sprint.mjs` Step 5 clears it; `cleargate sprint close` runs it");
   SKILL §E rewritten to the table above (E.5 no longer shows `git checkout main`; manual archive dropped);
   enforcement §12.2 and §14.2 to the new 2.8/7.8 meaning; canonical CLAUDE.md block clause "2.8 (sprint branch
   merged to main)" → "2.8 (sprint branch merges cleanly into main; the ack pass merges it)" (OD-3).

**Is touching the parent checkout acceptable?** Yes, under three conditions, and it is the only way to meet "no hand
git step": (i) the Gate 4 prompt names `<W>` before the ack, so the owner's ack covers it; (ii) 2.8 refuses a `<W>`
with tracked changes and a sprint branch that does not merge cleanly, in both passes, before any ack-pass write;
(iii) the merge is a `--no-ff` merge of a branch the owner just walked through, nothing else in `<W>` changes. The
alternative (print the command for the human) is a halt outside the three gates.

**S24 decision.** Keep 2.6d/2.6c writing in the no-flag pass: they are idempotent, derived from `state.json`
`Done`, and the finish commits them. Moving 2.7/2.8 ahead of them means a close that cannot proceed writes nothing.
Moving the writers to the ack pass would need the judges (2.6, 2.6b) moved too (BUG-077) → later.

**`cleargate sprint archive`.** Off the Gate 4 path after this change; its cwd `git checkout main` stays → later
(intake line, OD-5). Not edited, so `test/commands/sprint-archive.node.test.ts:270-300,521,631` stay as they are.

**Files.** `scaffold/core/.cleargate/scripts/close_sprint.mjs`, new `scaffold/core/.cleargate/scripts/lib/sprint-finish.mjs`,
SKILL.md (A.3 sentence, §E), regenerated Codex SKILL, `scaffold/core/.cleargate/knowledge/cleargate-enforcement.md`
(§12.2, §14.2), `scaffold/hosts/claude/CLAUDE.md` (one clause). The live twin follows at the Gate 4 re-sync (rule 11).

**Tests pinning today.** `test/scripts/test_close_sprint_v21.integration.node.test.ts` Scenarios 13, 15–20 and the
Step 8 items (`:1898-1926`): kept green by the seam rules in fix 2 (QA-Red confirms the Scenario 17, 19, 20
assertions "no Step 3:" and state `Active` at `:1103,1109,1269,1361,1367`). `test/lib/close-sprint-backsync.node.test.ts` (uses
`CLEARGATE_SKIP_MERGE_CHECK=1` → no finish). `close-sprint-*.red` files (043-05 hardening, 2.6c, 7.4, fence,
cli-resolution): QA-Red greps them for step-order assertions after the 2.7/2.8 move. `.live.integration` parity
reds for `close_sprint.mjs` are already known (rule 18, BUG-114 entry). Every no-flag test that expects exit 1 at
2.5 with a fast lane and no report: none found (`grep "v2.1 validation requires" test/` is empty).

**Risk.** (a) The finish commits for the user; a pre-commit hook in a target can block it (exit 1, re-runnable:
Step 5 and 7.8 are idempotent). (b) A failure in 7.8 leaves `sprint_status: Completed` with an unmerged branch;
re-running the ack pass finishes it; 2.8's mergeability pre-check makes this rare. (c) `git merge-tree --write-tree`
needs git ≥ 2.38 (local 2.50.1); older git skips the pre-check with a warning. (d) Staging `.cleargate/` also stages
tracked `.script-incidents/` in targets (S13, intake). (e) Hooks in the worktree layout still log to the parent's
`_off-sprint` (S20, later). (f) SPRINT-46's own Gate 4 close runs the old live script (rule 11).

**Size.** L (complexity L3; one script, one lib, docs).

## 3. A4 doc-refresh checklist (S26c)

**Root cause.** Nothing runs `prep_doc_refresh.mjs`: its only mentions are SKILL `:704`, CLAUDE.md block `:65`,
`sprint-closeout-checklist.md:7` and the Codex SKILL `:681`; `close_sprint.mjs` never calls it. CLAUDE.md and SKILL
E.4 tell the orchestrator to read a file nobody writes. Also `prep_doc_refresh.mjs:223-240` Strategy 1 (`:226`) looks for
`refs/heads/sprint/<sprint-id>` (`sprint/SPRINT-01`); the branch is `sprint/S-01`, so it always falls to the
`start_date` strategy. `:28` takes `REPO_ROOT` from its own location with no env override, so close tests that set
`CLEARGATE_SPRINT_DIR` would make it exit 1 (`:364`).

**Smallest fix.** Close owns it: new Step 3.6 in `close_sprint.mjs` (both passes) runs
`node <scripts>/prep_doc_refresh.mjs <id>` only when `<sprintDir>/.doc-refresh-checklist.md` is absent (never
overwrites, since the orchestrator ticks it), non-fatal (`Step 3.6 warning:`), seam `CLEARGATE_SKIP_DOC_REFRESH=1`;
the Gate 4 prompt adds `Doc-refresh checklist: <path>`. `prep_doc_refresh.mjs`: Strategy 1 uses `sprint/S-<NN>`
(same derivation as `close_sprint.mjs` 2.8); honour `CLEARGATE_REPO_ROOT` and `CLEARGATE_SPRINT_DIR`. The file is
committed by Step 7.8. SKILL E.4 keeps its sentence ("generated by `prep_doc_refresh.mjs`" stays true); story 17's
§E rewrite says close writes it.

**Files.** `scaffold/core/.cleargate/scripts/close_sprint.mjs` (Step 3.6 + one prompt line),
`scaffold/core/.cleargate/scripts/prep_doc_refresh.mjs`.

**Tests pinning today.** No direct `prep_doc_refresh` test. Close tests that list a sprint dir's files exactly: QA-Red
greps `test/scripts/*close*`, `test/lib/close-sprint-backsync.node.test.ts`.

**Risk.** The categories are meta-repo-specific (`cleargate-cli/`, `mcp/`, `admin/`, `cleargate-planning/`); in a
target repo most rows read "no changes detected". Content generalisation → later.

**Size.** S.

## 4. A5 named test waiver

**Root cause.** `record_baseline.mjs:98-146` records a command that stops before any test (exit 2, `failing: []`) as
an ordinary baseline. `merge_story.mjs:122-133` `judgeTestFailure` returns `baseline-unnamed` and the two call sites
(`:405-414` pre-merge, `:470-475` post-merge) excuse it with `NOT TESTED … excused as baseline-unnamed` whatever the
repo says. Preflight (`sprint.ts:1983-2037`) has five checks and never runs a test; the kickoff baseline
(`sprint.ts:111-131`) is best-effort and can never change init's exit. Net: four merges and a sprint→main merge with
the configured gate never running a test (run 1 A5).

**Design.**
- **Where the waiver lives:** `.cleargate/scripts/gate-checks.json` `qa.test_waiver: "<reason>"` (string; non-empty
  after trim = a waiver). Beside the command it waives; repo-level, set once, tracked; `cleargate upgrade`/`init
  --force` never overwrite `gate-checks.json` (FIRST_INSTALL_ONLY, flashcard 2026-11-13 `#init`). Not the sprint
  plan: that would be per sprint, and the bar says once. One source: preflight, merges and the Reporter all read it
  live; `baseline.json` gains no key for it.
- **How preflight detects "cannot run tests" cheaply and honestly:** a new preflight check "Test gate", run only
  after checks 1–5 pass (a slow test is never run to report a dirty `main`; `2/5 checks failed` at
  `test/commands/sprint-preflight.node.test.ts:405` keeps its count). It calls
  `node .cleargate/scripts/record_baseline.mjs --probe` (new mode, same command pick `qa.baseline_command` else
  `qa.test`, same 20-minute timeout and `extractFailing`). "Ran" = exit 0, or exit ≠ 0 with at least one failing
  test named. Not ran = exit ≠ 0 with no test named (the baseline-unnamed class), timeout (124), not found (127).
  This is the same evidence the merge judgement uses; the probe claims only "no failing test could be named".
- **Bound and reuse:** the probe writes `<git-common-dir>/cleargate/test-probe.json` = `{ head_sha, command,
  exit_code, failing, tail, recorded_at }` (inside `.git`, so it never dirties the tree, shared by all worktrees,
  per machine like the environment it describes). A preflight re-run on the same HEAD + command reuses it
  (`"cached": true`). Kickoff's `record_baseline.mjs <sprint-id>` reuses it when HEAD and command match (the sprint
  branch is cut from that same `main` commit at A.2) and writes `baseline.json` with additive key
  `source: "preflight"` (C2: keys may be added). So the suite runs once per kickoff. `CLEARGATE_NO_BASELINE=1`
  skips the probe with `test gate: skipped (CLEARGATE_NO_BASELINE=1) — not a waiver`.
- **What preflight prints:**
  - ran: `test gate: "make check" ran (exit 0)` or `test gate: "npm test" ran (exit 1, 3 failing tests named; they
    become the sprint baseline)`; pass.
  - not ran, waiver: `test gate: WAIVED — "make check" stopped before running any test (exit 2: "make: *** [test]
    Error 2"); waiver: "no PostgreSQL on this machine"`; pass.
  - not ran, no waiver: punch-list line `✗ Test gate: "make check" stopped before running any test (exit 2: "make:
    *** [test] Error 2")` and hint `Make it run here, or record why it cannot: add "test_waiver": "<reason>" under
    "qa" in .cleargate/scripts/gate-checks.json and commit it.`; exit 1 (`CLEARGATE_ADVISORY=1` softens, as today).
  The test-gate line prints before the summary line, so `all five checks pass` and the last line
  `→ Load skill: sprint-execution` (`sprint-preflight.node.test.ts:291-300,474`) stay.
- **Merges** (`merge_story.mjs`, both call sites; `judgeTestFailure` unchanged, so sealed A1–A6 stay green):
  `baseline-unnamed` is excused only when `qa.test_waiver` is set: `NOT TESTED (pre-merge): "make check" stopped
  before running any test (exit 2; exit code and last line match baseline.json); excused under waiver "<reason>"`
  (same prefix the sealed I3 regex reads). No waiver: refused, tail `not excused: "make check" stopped before running
  any test and no qa.test_waiver is recorded in gate-checks.json` (pre-merge exit 3; post-merge exit 5). STORY-066-08
  amendment A stays: the dispenser DB guard is still excusable, now only under a named waiver.
- **Reporter:** `prep_reporter_context.mjs` adds `## Test Gate` after `## State.json Summary`, one line from
  `baseline.json` + the live waiver: passed / ran with N named failures / `WAIVED — "<cmd>" stopped before running any
  test at kickoff (exit N: "<last line>"). Waiver: "<reason>". Merges whose test stopped the same way were recorded
  NOT TESTED.` / no baseline. `reporter.md`: copy that line into §3 as a "Test gate" row; when it says WAIVED, the
  Brief's second line names the waiver. Template unchanged.
- **SKILL:** A.1 gains check 7 "Test gate" (code-enforced; `devops` stays check 6). A.5 paragraph keeps its pinned
  phrases (`baseline.json`, `not a blocker`, `never propose changing the configured test command`, sealed U6 at
  `test/scripts/wave-runner-sandbox-fixes.red.node.test.ts:181`) and adds that preflight already required the test
  to run or a named waiver, which Gate 2 quotes. Enforcement §13 documents the check and the key.
- **What dispenser_adapter's owner does once:** add `"test_waiver": "<why make check cannot reach its tests here,
  e.g. no PostgreSQL on this machine>"` under `"qa"` in `.cleargate/scripts/gate-checks.json`, commit it on `main`
  before the next preflight. (Separately, after 0.31.0: delete the hand-made `node_modules/cleargate` link, BUG-114.)

**Files.** Preflight half: `scaffold/core/.cleargate/scripts/record_baseline.mjs`, `src/commands/sprint.ts`
(preflight only), SKILL A.1/A.5, Codex SKILL regen, `cleargate-enforcement.md` §13. Merge/report half:
`scaffold/core/.cleargate/scripts/merge_story.mjs`, `scaffold/core/.cleargate/scripts/prep_reporter_context.mjs`,
`scaffold/hosts/claude/.claude/agents/reporter.md`, Codex `reporter.toml` (gen:codex).

**Tests pinning today.** `test/scripts/merge-story-amend-a.red.integration.node.test.ts` I3 A9 (`:179-230`): its
fixture has no waiver, so A9 must gain `test_waiver` in the fixture's `gate-checks.json` (`buildFixture`, `:67`) —
**rule 16: QA-Red re-scopes it in its own commit** and adds the no-waiver refusal. `merge-story-amend-a.red.node`
A1–A6: unchanged. `test/scripts/record-baseline.red.node.test.ts`, `test/sprint-kickoff-baseline.red.integration`:
no cache in their fixtures → unchanged (QA-Red confirms; a stale probe cache in the real `.git` of the cli repo must
not leak into a fixture: fixtures are their own git repos). `test/commands/sprint-preflight.node.test.ts`: fixtures
have no `record_baseline.mjs`/`gate-checks.json` → check skips. `prep-reporter-measured-metrics.red`,
`prep-reporter-lanes.red`, `agents/reporter-measured-metrics.red`: QA-Red checks for section-order or reporter.md
literal pins.

**Risk.** A runner whose failures `extractFailing` cannot name (pytest, jest summaries) reads as "not ran" and needs
a waiver or a parser; the waiver text says why. The meta-repo's own SPRINT-47 preflight will run
`npm --prefix cleargate-cli test` once (minutes; never alongside another full suite, fixed ports). A test command that
writes tracked files dirties the tree before the next preflight's check 4 (same exposure as today's kickoff
baseline). A fast item refused for a missing waiver is demoted (`merge_story.mjs:418-425`), as for any refusal.

**Size.** Preflight half M; merge/report half M.

## 5. Small B items (all S, all in)

| Item | Root cause | Smallest fix | Tests | Size |
|---|---|---|---|---|
| **B6** `SKIP_FLASHCARD_GATE` not settable from a Claude Code session (recurs run 2) | SKILL `:271`/`:273` tell the orchestrator to set/unset an env var; the hook reads only its own process env (`hosts/claude/.claude/hooks/pending-task-sentinel.sh:105`) | Hook also skips the gate when `${SPRINT_DIR}/.wave-open` exists. SKILL §C.0.1 step 2: `touch .cleargate/sprint-runs/<SPRINT-ID>/.wave-open` before the launch; step 4: `rm -f` it as the first barrier step, before any merge. Codex render strips §C.0.1 (banned tokens) → no Codex text change beyond regen | `test/docs/loop-spec-three-paths.red.node.test.ts:203-210` pins `SKIP_FLASHCARD_GATE=1` then `unset SKIP_FLASHCARD_GATE` before `merge_story.mjs` → **rule 16 re-scope by QA-Red** to the marker tokens; `wave-execution-barrier.red:391` needs only the string `SKIP_FLASHCARD_GATE` (keep one mention: "the hook treats the marker like `SKIP_FLASHCARD_GATE=1`"); `test/hooks/pending-task-sentinel-cards.red` additive | S |
| **B7** D.5 immutability check misses Go reds | SKILL `:627` greps `\.red\.node\.test\.ts` | D.5.1: the forbidden set is the files of the sprint's `qa-red(` commits: `git log --format= --name-only --grep '^qa-red(' main..sprint/S-NN \| sort -u > <sprintDir>/.red-files` then `git show --name-only --format= <consolidation-sha> \| grep -Fxf <sprintDir>/.red-files` must be empty | `test/scaffold/skill-md-consolidation-d5.red.node.test.ts:244-292` regexes are loose (`red.*test.*immutab`, `verify.*commit.*red`): keep those words | S |
| **B10** `seal_red.mjs --worktree` resolved against cwd | `seal_red.mjs:72` `path.resolve(worktree)` | Absolute: as given. Relative: cwd-resolved if it exists, else resolved against the main checkout (`git rev-parse --path-format=absolute --git-common-dir`, parent when the basename is `.git`, flashcard 2026-09-27 `#worktree #scripts`); neither → exit 2 naming both | `test/scripts/seal-red.integration.node.test.ts` (066-07 sealed name): additive scenario only | S |
| **B4 tabs** invalid incident JSON | `run_script.sh:214-221` `_json_str` escapes `\` `"` `\n` `\r` only (args `:186-189` the same); Go output has raw TAB (`FAIL\tpkg`, `--- FAIL:\t`) | Escape `\t`, `\f`, `\b`, ESC as `\u001b`; delete remaining C0 controls (`tr -d '\000-\010\013\016-\037'` before escaping); use `_json_str` for args and the two ID fields too | `test/scripts/run-script-wrapper.red`, `run-script-utf8-truncation.red`: additive TAB case; `cr080_wrapper.test.sh` | S |
| **S21** `--validate` needs the bare array | `wave_runner_args.mjs:305-306` takes an array or `.verdicts`; the Workflow returns the runner's `{verdicts, waiting}` (`wave_runner.js:209`) wrapped as `{result: …}` | `parsed?.verdicts ?? parsed?.result?.verdicts`; usage text `:35` names the three shapes | `test/integration/wave-runner.red.integration` (`--validate` cases): additive | S |

## 6. S7: Go/TS red tests that name not-yet-written symbols trigger Architect passes (coordinator addition)

**Root cause.** QA-Red's seal runs `pre_gate_runner.sh arch` (`seal_red.mjs:118-121`), whose typecheck step fails on
any non-zero exit (`pre_gate_runner.sh:188-194`, `pre_gate_common.sh:100-107`). In Go, a red test that calls a symbol
the item will create fails `go vet` (`vet: internal/tally/top_test.go:13:12: undefined: Pair`, run 2
`STORY-001-02-pre-arch-scan.txt`). `seal_red.mjs:126-131` turns the `[FAIL] typecheck` line into `flags:
["typecheck"]`, `scan_exit: 1`; `wave_runner.js:48` `scanFlagged` is true, and `:112` runs every `scan-flagged`
stage: `architect-tpv` and, on standard, `architect-review` (M3 C-4). Run 2: 001-02 standard 5 dispatches instead of
3; 001-03 runtime 6 instead of 5. On dispenser almost every standard item would pay two extra Architect dispatches.

**Smallest fix (in `seal_red.mjs` only; the shared scan and the runner are untouched).** After the scan, if the
report's only `[FAIL]` is `typecheck`, classify its `  | ` block as expected-red when all of these hold:
1. fewer than 40 `  | ` lines (the scan keeps `tail -n 40`; a full block may be truncated → keep the flag);
2. at least one diagnostic line, where a diagnostic is `<path>:<line>:<col>: <msg>` (Go, optional `vet: ` prefix
   stripped) or `<path>(<line>,<col>): error TS<n>: <msg>` / `<path>:<line>:<col> - error TS<n>: <msg>` (tsc);
3. every diagnostic's path, normalised against the worktree, is one of the sealed files passed after `--`;
4. every diagnostic message is an undefined-symbol message: Go `undefined: <ident>` or `<x>.<Y> undefined (type …
   has no field or method <Y>)`; tsc TS2304 (cannot find name), TS2305/TS2724 (module has no exported member),
   TS2307 (cannot find module), TS2339 (property does not exist), TS2552 (cannot find name, did you mean);
5. every other non-blank line is noise from an allow-list: `# <pkg>` / `# [<pkg>]`, `> <npm script line>`,
   `npm (ERR!|error|warn) …`, `make(\[\d+\])?: \*\*\* …`, `exit status \d+`, `Found \d+ errors?…`, tsc's
   per-file summary table.
Then the seal JSON carries `scan_exit: 0`, `flags` without `typecheck`, and additive `expected_red: ["<diagnostic>",
…]` plus `scan_exit_raw: 1`; seal_red exits 0. Any other typecheck error (a redeclaration such as run 1's S5 `run`,
an error in a non-red file, a syntax error, `too many errors`) keeps today's flag. The report file still shows the
raw `[FAIL]`. Run 3 would then show 1 / 3 / 5 / 3.

**Files.** `scaffold/core/.cleargate/scripts/seal_red.mjs` (classifier as an exported pure function behind the
existing flow; B10 lands in the same file).

**Tests.** `test/scripts/seal-red.integration.node.test.ts` uses `arch.typecheck: ''` (`:63-64`) → unchanged;
`test/integration/wave-runner.red.integration` reads seal fields only. New red: unit cases for the classifier (Go
and tsc shapes, red-file vs non-red path, mixed error, 40-line block) and one integration seal on a fixture whose
`arch.typecheck` prints a Go undefined error.

**Risk.** A misspelt reference to an existing symbol also reads `undefined:` and now skips TPV; the Developer's
`Red-Test` block routes it back to QA-Red (066-13), costing one Developer pass instead of one TPV. That is the
trade the coordinator proposed. QA-Red's agent must copy `scan_exit`/`flags` from the seal JSON as today
(`wave_runner.js:65`); no prompt change.

**Size.** M (S–M). **Belongs in iteration 3: yes** — isolated to one script, no sealed red changes, and without it
run 3 cannot show EPIC-066's dispatch counts on a Go repo.

## 7. Later (not in iteration 3)

| Item | Existing ID |
|---|---|
| B3 tracked run files, permanently dirty tree, bookkeeping commits | BUG-074, BUG-086 (run 2 again: four `chore(SPRINT-01)` commits) |
| B4 incidents written inside story worktrees; expected reds recorded as incidents | BUG-109 |
| B5 `update_state.mjs` needs `CLEARGATE_STATE_FILE` | BUG-110 (dup BUG-039) |
| B8 / S15 token attribution, `metering: unavailable` | none — intake (S15) |
| B9 goal text copied from the §0 bullet | BUG-127 |
| B12 Step 8 lists "push to MCP" for a pre-member repo | none — new intake line |
| S13 `.script-incidents/` tracked in targets | intake (2026-11-15 S13; `src/init/root-gitignore.ts`) |
| S20 hooks resolve `.active` in the parent checkout in a worktree session | none — intake (S20) |
| S22 `sprint-context.md` §Test Stack stub for non-Node repos | none — new intake line (fill rows from `gate-checks.json` at init, S) |
| S8 opus override; S9 incidents in qa.md; S10 cross-item sealed red edits; S17 phase "(none)" | intake |
| X-2 preflight Step 0 dirties the tree it checks | intake |
| Re-seal after a Developer commit; re-running an ESCALATED item | intake (066-13 post-flight) |
| `cleargate sprint archive` from a worktree session (off the Gate 4 path after §2) | none — new intake line |
| S24 writers in the no-flag pass (move 2.6d/2.6c with their judges to the ack pass) | none — new intake line |
| `prep_doc_refresh.mjs` categories are meta-repo specific | none — new intake line |
| `print_summary` `0\n0` cosmetic; collision_surface prose cells | intake |

---

## 8. Proposed split for iteration 3

All base cli `main` bf21e96 (or `main` at cut time). Lanes are what `assign_lane.mjs` should compute from the
surfaces below (its subsystem key is the first two path segments, so a story touching `scaffold/core` and
`scaffold/hosts` counts two); the Architect may raise, never lower.

| ID | Title | Subsystem / surface | Scenarios | Size | Lane (computed guess) | Upstream |
|---|---|---|---|---|---|---|
| STORY-066-16 | Kickoff assigns lanes without a re-init | `init_sprint.mjs`, `assign_lane.mjs` (export), `src/lib/lifecycle-reconcile.ts` (B11), SKILL A.3/A.4 | 5: computed floor without `waves.json`; `waves.json` still preferred; §2.4 lane below/above floor; archived story records its state lane; SKILL A.3 command with `--stories`, raise via `update_state --lane`, no `--force` | M | runtime (3 subsystems) | — |
| STORY-066-17 | Close finishes the sprint from either layout with no hand git step | `close_sprint.mjs`, new `lib/sprint-finish.mjs`, SKILL A.3 sentence + §E, enforcement §12.2/§14.2, CLAUDE.md clause | 5: no-flag pass without report reaches the Reporter step; no-flag pass prints the finish plan, merges nothing; ack pass plain layout commits, merges, clears `.active`, deletes branch; ack pass worktree layout merges in the parent checkout, keeps the branch with a printed command; not-mergeable or dirty parent refused before any ack-pass write | L | runtime (2) | 066-16 (SKILL A.3 paragraphs adjacent) |
| STORY-066-18 | Close writes the doc-refresh checklist | `close_sprint.mjs` Step 3.6, `prep_doc_refresh.mjs` | 2: written once when absent, path in the Gate 4 prompt, `sprint/S-NN` diff; never overwritten | S | fast (1 subsystem, 2 scenarios) | 066-17 (same file) |
| STORY-066-19 | Preflight stops a sprint whose test gate cannot run unless a named waiver is recorded | `record_baseline.mjs` (`--probe`, reuse), `src/commands/sprint.ts` (preflight), SKILL A.1/A.5, enforcement §13 | 4: no waiver → exit 1 with the hint; waiver → WAIVED line, pass; tests ran → pass; kickoff baseline reuses the probe for the same HEAD (command runs once) | M | runtime (3) | 066-17 (SKILL, enforcement serial merge) |
| STORY-066-20 | Merges and the sprint report name the test waiver | `merge_story.mjs`, `prep_reporter_context.mjs`, `reporter.md` (+ Codex regen) | 3: unnamed stop excused only under a waiver, tail names it; no waiver → refused, tail names the key; bundle `## Test Gate` line | M | runtime (2) | none to build (pinned key P8); merge after 066-19 |
| STORY-066-21 | Red tests that only name not-yet-written symbols do not trigger Architect passes; seal resolves `--worktree` | `seal_red.mjs` | 4: Go undefined-only in red files → clean seal with `expected_red`; tsc TS2304/TS2307 same; any other typecheck error or truncated block still flags; relative `--worktree` from inside the worktree | M | standard (1 subsystem, 4 scenarios) | — |
| STORY-066-22 | Barrier scripts accept what the loop produces | `wave_runner_args.mjs` (S21), `run_script.sh` (B4 tabs) | 2: `--validate` takes `{result:{verdicts}}`; incident JSON valid with tabs/ESC | S | fast | — |
| STORY-066-23 | Wave and consolidation steps work from a Claude Code session | `pending-task-sentinel.sh` (B6), SKILL §C.0.1 steps 2/4 and D.5.1 (B7) | 2: `.wave-open` marker opens the gate window; D.5 check uses the `qa-red(` commits' files | S | runtime (2: hooks + regenerated Codex SKILL) | 066-19 (SKILL serial merge) |

**Pinned no-branch interfaces (add to `waves.json` `pinned_interfaces`).** P8 `gate-checks.json` `qa.test_waiver`:
string, non-empty after trim = waiver; read live by preflight, `merge_story.mjs`, `prep_reporter_context.mjs`.
P9 seal JSON additive keys `expected_red: string[]`, `scan_exit_raw: number` (066-21 only). P10
`lib/sprint-finish.mjs` exports `listWorktrees`, `planFinish`, `runFinish` (066-17 only). P11 `record_baseline.mjs
--probe` stdout: one JSON line `{ command, exit_code, failing: number, ran: boolean, last_line, cached: boolean }` or
`{ skipped: "<reason>" }`; cache file `<git-common-dir>/cleargate/test-probe.json` (066-19 only).

**Parallelism.** All eight build at once within rule 13's 5 build lanes (two batches: 16, 17, 19, 21, 22 first; 18,
20, 23 next). No contracts needed: P8 is the only cross-story value and it is a key name. Merges serial.
Suggested merge order: 22, 21, 16, 17, 18, 19, 20, 23. SKILL.md editors (16, 17, 19, 23) and the Codex SKILL they
regenerate integrate `main` before merging (rule 15: owner region wins, `npm run gen:codex`, prebuild `--check`);
`close_sprint.mjs` editors 17 then 18; enforcement.md editors 17 then 19.

**Cross-story risks.**
- 066-17 rewrites SKILL §E; 066-18 must not edit §E (it only adds the prompt line in `close_sprint.mjs`).
- 066-16 and 066-17 both edit SKILL A.3 (16 the command and lane paragraph, 17 the `.active` paragraph at `:167`):
  adjacent paragraphs; 17 integrates after 16.
- 066-19's preflight check and 066-20's merge refusal together change what a waiver-less Go repo sees: without
  066-19 merged, a waiver-less run would stop at the first merge instead of preflight. Release only with both.
- 066-20's I3 re-scope is QA-Red's (rule 16), in 066-20's QA-Red commit.
- 066-23's loop-spec-three-paths re-scope is QA-Red's (rule 16).
- Every canonical script/agent/skill/knowledge edit extends rule-18 known reds (live parity) until the Gate 4
  re-sync; each story's QA-Verify logs the new names in sprint §6.

**Proof (rule 8), per story:** unit/integration reds green on the merged `main`; then **sandbox run 3** on an RC
from `main` after all eight merge, both layouts: run 3a in a Claude-managed worktree (as runs 1–2), run 3b in the
plain main checkout. Pass when: lanes fast/standard/runtime/standard with no `--force` (16); dispatches 1/3/5/3
(21); `--validate` on the raw Workflow return (22); preflight WAIVED line from the fixture waiver, merges' tails
name it, report row present (19, 20); close: no-flag pass reaches the Reporter step, Gate 4 prompt shows the finish
plan and checklist, ack pass leaves `main` containing the close commit, `.active` empty, no hand git (17, 18); the
no-waiver preflight stop proven in a scratch copy, not in run 3.

---

## 9. Open decisions for the orchestrator

1. **OD-1 Merge into the parent checkout on the ack** (`git -C <W> merge --no-ff`) vs print the command for the
   human. Recommend: merge it — the Gate 4 prompt names `<W>`, 2.8 refuses a dirty `<W>` or a conflicting merge
   before any write, and printing the command is a halt outside the three gates.
2. **OD-2 Close commits the close artefacts itself** (`.cleargate/` + tracked edits) at Step 7.8. Recommend: yes;
   otherwise a hand git step remains and S26a's second merge stays manual.
3. **OD-3 2.8 meaning changes** ("merges cleanly; merged at the ack") and the canonical CLAUDE.md block clause is
   edited to match. Recommend: edit the clause; log the extra parity reds under rule 18.
4. **OD-4 S24:** keep 2.6d/2.6c writes in the no-flag pass, move 2.7/2.8 ahead of them. Recommend: yes; writers
   to the ack pass later.
5. **OD-5 `cleargate sprint archive`** stays off the Gate 4 path and unedited this iteration. Recommend: yes; intake.
6. **OD-6 Waiver home** `gate-checks.json` `qa.test_waiver`. Recommend: yes (set once, survives upgrade); not the
   sprint plan.
7. **OD-7 Preflight runs the configured test** (≤20 min, cached in the git common dir, reused by the kickoff
   baseline). Recommend: yes; note the meta-repo's SPRINT-47 preflight will run the cli unit suite once.
8. **OD-8 No waiver at merge = refuse** (strict). Recommend: strict; preflight makes it reachable only when the
   environment changes mid-sprint or `CLEARGATE_ADVISORY=1` was used.
9. **OD-9 Sandbox run 3 fixture** commits `qa.test_waiver` during setup (dispenser's once-only step); the
   preflight stop without it is proven in a scratch repo. Recommend: yes — otherwise run 3 halts at preflight,
   outside the three gates.
10. **OD-10 S7 in iteration 3.** Recommend: yes (§6).
11. **OD-11 Run 3 in both layouts** (3a worktree, 3b plain). Recommend: yes; the bar names both, and run 2 only
    exercised the worktree layout.
12. **OD-12 Roster/intake:** these eight items enter SPRINT-46 under the owner's `/goal` delegation as 066-13..15 and
    BUG-114 did; record one scope line per story in sprint-context Mid-Sprint Amendments before drafting.

Version check skipped: no dependency is added or changed (rule 5; Node built-ins and git only).
