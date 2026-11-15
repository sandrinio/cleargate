---
story_id: STORY-066-17
parent_epic_ref: EPIC-066
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: sprint-execution,scripts,docs
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-11-15T11:31:07Z
ambiguity: 🟢 Low
context_source: "SPRINT-46 Goal check (d) sandbox runs 1 and 2, findings A4 (ORCHESTRATOR_FINDINGS.md), S23, S24, S25, S26, S27, S28 (.cleargate/field-trials/2026-11-sandbox-s46.md); design source .cleargate/sprint-runs/SPRINT-46/plans/iteration-3-scoping.md §2, §3, §8; owner /goal 2026-11-15: 'file any findings and fix them. run e2e tests until we achieve the goal. then ship npm and github. make decisions yourself' (decisions delegated; OD-1..OD-12 ratified in sprint-context Mid-Sprint Amendments, 'Iteration 3')"
actor: Orchestrator closing a sprint from a Claude Code session in either checkout layout
complexity_label: L3
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-11-15T11:31:07Z
updated_at: 2026-11-15T11:31:07Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-15T11:31:08Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  sessions: []
---

# STORY-066-17: Close finishes the sprint from either layout with no hand git step
**Complexity:** L3 — one close script reordered and extended, one new lib, the doc-refresh generator, and the §E playbook, enforcement text and CLAUDE.md clause that describe the order.

## 1. The Spec (The Contract)

### 1.1 User Story
As the Orchestrator closing a sprint from a plain checkout or from a Claude-managed worktree session, I want one close sequence that prepares the Reporter step, prints what the ack will do, and on the ack commits, merges, clears `.active` and removes the branch, so that the close needs no hand `git` step and no hand edit of `.active`.

### 1.2 Detailed Requirements
- Requirement 1 (finding S25): Step 2.5 with a `fast` item and no report yet, and no `--assume-ack`, prints `Step 2.5 deferred: <report> not written yet — the Reporter writes it at Step 4; it is validated before the ack prompt.` and continues to Step 3.5 and Step 4 (exit 0). The ack pass still exits 1 on an absent report. A present report is validated in both passes as today.
- Requirement 2 (finding S23, S24): Step 2.7 and Step 2.8 move ahead of the dist assertion and of Step 2.6d. Both are read-only. The order among 2.6d, 2.6c, 2.6 and 2.6b is unchanged (BUG-077). New 2.8 meaning: `sprint/S-NN` is already an ancestor of `main`, or `git merge-tree --write-tree refs/heads/main refs/heads/sprint/S-NN` exits 0 (exit 1 fails naming the conflicting paths; git older than 2.38 warns and continues), and the checkout that will receive the merge has no tracked changes (`git -C <W> status --porcelain --untracked-files=no` empty, else fail naming `<W>`). A close that cannot proceed therefore writes nothing. The test seams keep their exact behaviour and text: `CLEARGATE_SKIP_MERGE_CHECK=1` skips 2.8 and Step 7.8; `CLEARGATE_FORCE_MERGE_STATUS=merged|unmerged` injects the verdict, keeps today's `Step 2.8 failed: sprint/S-NN not merged to main` and `Resolve: merge …` lines for `unmerged`, and skips Step 7.8. With `vcs.sprint_pr: true` the check and the finish behave as today and Step 7.8 prints `skipped: vcs.sprint_pr`.
- Requirement 3 (finding S27): Step 5 in the ack pass, after the state flip, writes `<REPO_ROOT>/.cleargate/sprint-runs/.active` empty when its trimmed value equals the sprint id (atomic; never creates the file) and prints `Step 5: .active cleared (was <id>)`. A different value is left alone with a note.
- Requirement 4 (findings S23, S26): new Step 7.8 "finish" in the ack pass, after Step 7.5 and before Step 8, implemented in new `scaffold/core/.cleargate/scripts/lib/sprint-finish.mjs` (exports `listWorktrees(root)`, `planFinish({ root, sprintBranch })`, `runFinish(plan, { sprintId })`; git through `spawnSync` argv arrays). (a) Commit: in `REPO_ROOT`, `git add -A -- .cleargate` and `git add -u`; commit `chore(<id>): close — sprint_status Completed, close artefacts` when something is staged; untracked files outside `.cleargate/` are left and listed as a warning; a detached HEAD or a failing pre-commit hook exits 1 (never `--no-verify`). (b) Merge `sprint/S-NN` into `main` with `--no-ff -m "merge: sprint/S-NN → main"` in the checkout that has `main` (from `git worktree list --porcelain`): nowhere → `git checkout main` in `REPO_ROOT` first; in `REPO_ROOT` → there; in another worktree `<W>` → `git -C <W> merge …`. Already up to date passes with no commit. A conflict runs `merge --abort` in that tree and exits 1 naming the files. (c) Verify `sprint/S-NN` is an ancestor of `main`, print `Step 7.8: sprint/S-NN merged to main at <sha> (in <path>)`, else exit 1. (d) Branch: checked out in any worktree → print `Step 7.8: sprint/S-NN kept — checked out at <path>. After leaving it: git branch -d sprint/S-NN` and exit 0; otherwise `git branch -d sprint/S-NN`. Step 8 handoff gains item 7: `Finish: done at Step 7.8`, or the kept-branch command; items 5 and 6 keep their text.
- Requirement 5 (finding S23): the no-flag pass prints the finish plan with the existing "Review the report…" prompt: `On --assume-ack close will: commit close artefacts on <branch> in <REPO_ROOT>; merge sprint/S-NN into main in <W | REPO_ROOT after git checkout main>; clear .active (reads <id>); <delete | keep (checked out at <path>)> sprint/S-NN.` It merges nothing.
- Requirement 6 (finding S28, scoping §3): new Step 3.6, both passes, runs `node <scripts>/prep_doc_refresh.mjs <id>` only when `<sprintDir>/.doc-refresh-checklist.md` is absent (never overwritten, since the orchestrator ticks it). It is non-fatal (`Step 3.6 warning:`), has the seam `CLEARGATE_SKIP_DOC_REFRESH=1`, and the Gate 4 prompt adds `Doc-refresh checklist: <path>`. In `prep_doc_refresh.mjs`, Strategy 1 uses `sprint/S-<NN>` (today `:226` looks for `sprint/<sprint-id>`, so it always falls to the `start_date` strategy), and the script honours `CLEARGATE_REPO_ROOT` and `CLEARGATE_SPRINT_DIR`. Step 7.8 commits the file.
- Requirement 7 (docs): SKILL A.3 `.active` sentence reads "`close_sprint.mjs` Step 5 clears it; `cleargate sprint close` runs it". SKILL §E is rewritten to the table in §3.2 (E.5 no longer shows `git checkout main`; the manual archive is dropped). `cleargate-enforcement.md` §12.2 and §14.2 take the new 2.8 and 7.8 meaning. The canonical CLAUDE.md block clause "2.8 (sprint branch merged to main)" becomes "2.8 (sprint branch merges cleanly into main; the ack pass merges it)". The Codex SKILL is regenerated.

### 1.3 Out of Scope
- `cleargate sprint archive` from a worktree session (`src/commands/sprint.ts:1214-1250`): off the Gate 4 path after this story, not edited, so `test/commands/sprint-archive.node.test.ts` stays as it is. Intake line.
- Moving the 2.6d/2.6c writers (and their judges 2.6, 2.6b) to the ack pass: later. They stay in the no-flag pass; they are idempotent and the finish commits them.
- Generalising the `prep_doc_refresh.mjs` categories beyond the meta-repo's (`cleargate-cli/`, `mcp/`, `admin/`, `cleargate-planning/`): later.
- Tracked `.script-incidents/` being staged by `git add -A -- .cleargate` in target repos (S13) and hooks logging to the parent's `_off-sprint` in a worktree session (S20): intake.
- Live `.claude/` and `.cleargate/` copies: re-synced at SPRINT-46 Gate 4. SPRINT-46's own close runs the old live script.

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** Merge into the parent checkout on the ack (`git -C <W> merge --no-ff`), or print the command for the human?
- **Recommended:** Merge it. The Gate 4 prompt names `<W>` before the ack, 2.8 refuses a dirty `<W>` or a conflicting merge before any write, and printing the command is a halt outside the three gates (scoping OD-1).
- **Human decision:** Resolved by the orchestrator under the owner's delegation (/goal, 2026-11-15) per the recommendation.
- **Question:** Does close commit its own artefacts?
- **Recommended:** Yes (`.cleargate/` plus tracked edits). Otherwise a hand git step stays and the second sprint→main merge stays manual (OD-2).
- **Human decision:** Resolved by the orchestrator under the owner's delegation per the recommendation.
- **Question:** Does the 2.8 meaning change, and the CLAUDE.md clause with it?
- **Recommended:** Yes; the extra live-parity reds are logged under rule 18 (OD-3). 2.7/2.8 move ahead of the writers (OD-4); `sprint archive` stays unedited (OD-5).
- **Human decision:** Resolved by the orchestrator under the owner's delegation per the recommendation.

### 1.5 Risks

- **Risk:** the finish commits for the user, and a target's pre-commit hook can block it.
- **Mitigation:** exit 1 with the hook output, never `--no-verify`; Step 5 and Step 7.8 are idempotent, so the ack pass re-runs.
- **Risk:** a failure in 7.8 leaves `sprint_status: Completed` with an unmerged branch.
- **Mitigation:** re-running the ack pass finishes it; the 2.8 mergeability pre-check makes the failure rare.
- **Risk:** `git merge-tree --write-tree` needs git 2.38 or newer.
- **Mitigation:** older git warns and skips the pre-check (as today's exit-128 fail-open); the merge itself still aborts on conflict.
- **Risk:** writing into the parent checkout surprises the owner.
- **Mitigation:** the Gate 4 prompt names `<W>`; a dirty `<W>` is refused; the merge is a `--no-ff` merge of a branch the owner just walked through and changes nothing else in `<W>`.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | No-flag pass, plain-layout ack pass and worktree-layout ack pass are different successful ways through. |
| Interfaces | T | The Gate 4 prompt and the checklist file, besides the script's exit codes. |
| Data | F | No behaviour differs by data shape; the layout is covered under Paths. |
| Rules | T | A sprint branch that does not merge, or a dirty `main` checkout, is refused before any write. |

```gherkin
Feature: Close finishes the sprint from either layout with no hand git step

  @paths
  Scenario: The no-flag pass without a report reaches the Reporter step
    Given a fixture sprint SPRINT-99 on branch sprint/S-99 with a fast-lane item STORY-907-01 and no SPRINT-99_REPORT.md
    When close_sprint.mjs SPRINT-99 runs with no flags
    Then it prints "Step 2.5 deferred:" and reaches the Step 4 Reporter message
    And it exits 0, not 1

  @interfaces
  Scenario: The no-flag pass prints the finish plan and the checklist path, and merges nothing
    Given the same fixture with SPRINT-99_REPORT.md written and no .doc-refresh-checklist.md
    When close_sprint.mjs SPRINT-99 runs with no flags
    Then the Gate 4 prompt names the checkout that will receive the merge, the branch to keep or delete, and "Doc-refresh checklist: <path>"
    And .doc-refresh-checklist.md exists once, and a second run leaves its contents unchanged
    And main has no new commit and .active still reads SPRINT-99

  @paths
  Scenario: The ack pass in the plain layout finishes the sprint
    Given a plain checkout on sprint/S-99 with main not checked out in any worktree
    When close_sprint.mjs SPRINT-99 --assume-ack runs (CLEARGATE_CI_ACK=1)
    Then the close artefacts are committed on sprint/S-99 and main holds that commit through one merge commit "merge: sprint/S-99 → main"
    And .active is empty and sprint/S-99 is deleted

  @paths
  Scenario: The ack pass in the worktree layout merges in the parent checkout
    Given main is checked out in the parent checkout and sprint/S-99 is checked out in .claude/worktrees/s99
    When close_sprint.mjs SPRINT-99 --assume-ack runs in the worktree (CLEARGATE_CI_ACK=1)
    Then the merge runs in the parent checkout through git -C and main contains the close commit
    And .active is empty, sprint/S-99 still exists, and the output prints "git branch -d sprint/S-99"

  @rules
  Scenario: A branch that does not merge, or a dirty main checkout, is refused before any write
    Given sprint/S-99 conflicts with main, or the checkout that has main has a tracked change
    When close_sprint.mjs SPRINT-99 runs with no flags
    Then it exits 1 naming the conflicting paths or the dirty checkout
    And no file was moved, flipped or written under .cleargate/ and state.json is unchanged
```

### 2.2 Verification Steps (Manual)
- [x] Goal check (d) run 3a (Claude-managed worktree) and 3b (plain checkout): the no-flag pass reaches the Reporter step, the Gate 4 prompt shows the finish plan and the checklist path, and the ack pass leaves `main` containing the close commit, `.active` empty, with no hand git.

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/core/.cleargate/scripts/close_sprint.mjs` |
| Related Files | `cleargate-cli/scaffold/core/.cleargate/scripts/lib/sprint-finish.mjs`, `cleargate-cli/scaffold/core/.cleargate/scripts/prep_doc_refresh.mjs`, `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md`, `cleargate-cli/scaffold/core/.agents/skills/sprint-execution/SKILL.md`, `cleargate-cli/scaffold/core/.cleargate/knowledge/cleargate-enforcement.md`, `cleargate-cli/scaffold/hosts/claude/CLAUDE.md`, `cleargate-cli/test/scripts/close-sprint-finish.red.integration.node.test.ts`, `cleargate-cli/test/scripts/sprint-finish.red.node.test.ts`, `cleargate-cli/test/scripts/prep-doc-refresh.red.node.test.ts`, `cleargate-cli/test/scripts/close-sprint-finish-restore.red.integration.node.test.ts` |
| New Files Needed | Yes — `lib/sprint-finish.mjs` and the three red test files |

### 3.2 Technical Logic

**The close sequence (both layouts), written into SKILL §E:**

| Step | Who | What |
|---|---|---|
| E.1 | orchestrator | `node .cleargate/scripts/close_sprint.mjs <id>` (no flags). Pre-checks 1–2, 2.7, 2.8 (read-only, now ahead of the writers), then 2.5 (report checked only if it exists), 2.6d/2.6c/2.6/2.6b, 2.9, 3, 3.5, 3.6, Step 4 "spawn the Reporter", exit 0. |
| E.2 | orchestrator | The Reporter writes `SPRINT-<#>_REPORT.md`; re-run E.1. Step 2.5 validates the report; the prompt prints the finish plan. |
| E.3 | orchestrator | Surface the Brief and the finish plan verbatim. HALT (Gate 4). |
| E.4 | orchestrator, after the ack | Apply or punt the doc-refresh items; edits stay uncommitted, the finish commits them. |
| E.5 | orchestrator, after the ack | `CLEARGATE_CI_ACK=1 node .cleargate/scripts/close_sprint.mjs <id> --assume-ack`. Steps as today through 7.5, then Step 7.8 finish. No hand git step. |

1. **Step 2.5 (`close_sprint.mjs:484-546`).** The exit at `:509-514` (fast item, no report) is the S25 failure; it runs before Step 3.5 builds the Reporter bundle. Defer it in the no-flag pass only.
2. **Order (`:970-1106` Step 2.8, `:910-1106` 2.7/2.8, `:600-787` 2.6d/2.6c).** Move 2.7 and 2.8 ahead of the dist assertion and 2.6d. Replace the "already merged" requirement by the ancestor / `merge-tree` / clean-receiver checks of Requirement 2. The receiving checkout comes from `listWorktrees`.
3. **Step 5 (`:1454-1461`).** Add the `.active` clear. Today `close_sprint.mjs` only reads `.active` (comment `:606`); `cleargate sprint archive` clears it (`src/commands/sprint.ts:1214-1219`) but then runs `git checkout main` / `merge` / `branch -d` in cwd (`:1221-1250`), which fails when `main` is checked out in another worktree. Target repos track `.active` (run 1 committed it in e0a9eae); this meta-repo ignores it (`.gitignore:28`).
4. **Step 7.8 and the plan.** Implement `planFinish` (used by the Gate 4 prompt at `:1434-1451`) and `runFinish` in `sprint-finish.mjs`. Nothing after Step 7.8 writes tracked files (Steps 7 and 7.4 only push to MCP). Step 8 handoff items 5 and 6 are pinned at `test_close_sprint_v21.integration.node.test.ts:1898-1900`.
5. **Step 3.6.** Call `prep_doc_refresh.mjs`; fix its Strategy 1 (`prep_doc_refresh.mjs:223-240`, `:226`) and its repo-root derivation (`:28`, no env override today, so tests that set `CLEARGATE_SPRINT_DIR` exit 1 at `:364`).
6. **Docs.** SKILL A.3 `.active` sentence (`SKILL.md:167` says `cleargate sprint close` clears it; `sprintCloseHandler`, `src/commands/sprint.ts:592-637`, only spawns close and stops the dashboard) and §E (`:706-723`); enforcement §12.2, §14.2; the CLAUDE.md clause. `npm run gen:codex`, `npm run prebuild`.
7. **Merge order and base.** Base cli `main` bf21e96. This story integrates `main` after STORY-066-16 (adjacent SKILL A.3 paragraphs) and before any other `close_sprint.mjs` editor; the enforcement.md edits come before STORY-066-18's (rule 15: owner region wins, regenerate the Codex SKILL). Every canonical script, skill and knowledge edit adds live-parity reds (rule 18) until the Gate 4 re-sync; QA-Verify logs the new names in sprint §6.

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `close_sprint.mjs <SPRINT-ID> [--assume-ack]` (stdout) | CLI | `CLEARGATE_CI_ACK=1` for `--assume-ack` | unchanged | no-flag: exit 0 with the finish plan; ack: `Step 5: .active cleared`, `Step 7.8: … merged to main at <sha> (in <path>)`, Step 8 item 7 |
| `lib/sprint-finish.mjs` | module | None | `listWorktrees(root)`, `planFinish({ root, sprintBranch })`, `runFinish(plan, { sprintId })` | P10 in the sprint's pinned interfaces; `planFinish` returns the text for the prompt |

## Task Breakdown

> **Binding plan:** `.cleargate/sprint-runs/SPRINT-46/plans/STORY-066-17.md` (D-1..D-19 ratified 2026-11-15; the plan governs where it narrows this file: D-2, D-3, D-4).

- [x] QA-Red, one seal (4b225db, scan clean): `test/scripts/close-sprint-finish.red.integration.node.test.ts` I1–I5b, `test/scripts/sprint-finish.red.node.test.ts` U1–U2, `test/scripts/prep-doc-refresh.red.node.test.ts` P1 (9 tests, all red at bf21e96) -> Scenarios 1–5
- [x] New `scaffold/core/.cleargate/scripts/lib/sprint-finish.mjs` (`listWorktrees`, `planFinish`, `runFinish`) per plan §2.2 -> Scenarios 2–5
- [x] `close_sprint.mjs`: import, `closeOwnsRepo`, Step 2.7 moved and Step 2.8 rewritten ahead of 2.5/the dist gate/2.6d (forced and PR paths verbatim) -> Scenario 5
- [x] `close_sprint.mjs`: Step 2.5 deferral in the no-flag pass -> Scenario 1
- [x] `close_sprint.mjs`: Step 3.6 and the two prompt lines (finish plan, checklist path) -> Scenario 2
- [x] `close_sprint.mjs`: Step 5 `.active` clear, Step 7.8 finish, Step 8 item 7, header docblock -> Scenarios 3, 4
- [x] `prep_doc_refresh.mjs`: `CLEARGATE_REPO_ROOT`, `CLEARGATE_SPRINT_DIR`, Strategy 1 on `sprint/S-NN` -> Scenario 2
- [x] SKILL A.3 sentence and §7; enforcement §12.2, §14.2, §14.4; CLAUDE.md clause; `npm run gen:codex` + `npm run prebuild` -> Scenarios 2–4
- [x] Typecheck, `node --check`, build in the worktree, the reds, the witness list, the canonical shell test
- [x] Integrate cli `main` after 066-20/066-19/066-16 merge (rule 15), regenerate Codex, re-run reds and witnesses
- [x] QA-Verify: witnesses, v21 overlay, proof in both layouts → `evidence/STORY-066-17/`, rule-18 names logged
- [x] **[Amendment A]** QA-Red, seal 2 (1f32eb7, by hand under waiver; scan clean): `test/scripts/close-sprint-finish-restore.red.integration.node.test.ts` R1–R5 (5 tests, red at 41a86ee) per plan Amendment A §A.5 -> Scenarios 3, 5
- [x] **[Amendment A]** Developer: `lib/sprint-finish.mjs` `shq`, `restoreBranch` and `failBack` in steps (b)/(c), plus the enforcement §14.2 Step 7.8 sentence, per Amendment A §A.2 (one commit) -> Scenario 3
- [x] **[Amendment A]** Developer: `node --check`, typecheck, prebuild, build, the four red files, the §7 witness list, `bug076_077_close_path.red.sh`
- [x] **[Amendment A]** QA-Verify re-run (PASS on acd3e14): reds (I1–I5b, U1–U2, P1, R1–R5), witnesses, v21 overlay, recovery proof → `evidence/STORY-066-17/proof-recovery.txt`; F1 closed

## 4. Quality Gates

### 4.1 Minimum Test Expectations

> Epic Testing Strategy levels: Integration (`close_sprint.mjs` on a real git fixture, plain and worktree layouts), Unit (`sprint-finish.mjs`, `prep_doc_refresh.mjs`), Release gate (Goal check (d) runs 3a and 3b).

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 3 | `planFinish` and `listWorktrees` for both layouts; `prep_doc_refresh.mjs` Strategy 1 uses `sprint/S-<NN>`; never overwrites. |
| Integration tests | 5 | `*.red.integration.node.test.ts` on a real git fixture: report-absent no-flag pass; finish plan and checklist; plain ack pass; worktree ack pass; refusal before any write. |
| E2E / acceptance tests | 5 | One per Gherkin scenario. |

### 4.2 Definition of Done (The Gate)
- [x] Minimum test expectations (§4.1) met.
- [x] All Gherkin scenarios from §2.1 covered.
- [x] `test_close_sprint_v21.integration` Scenarios 13 and 15–20 and the Step 8 items stay green (QA-Red confirms the Scenario 17, 19, 20 "no Step 3:" and state `Active` assertions); `close-sprint-*.red` step-order assertions checked after the 2.7/2.8 move; `build-codex-payload.mjs --check` passes.
- [x] New live-parity reds logged in sprint §6 (rule 18).
- [x] Goal check (d) runs 3a and 3b pass on an RC that includes this story.
- [x] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/close_sprint.mjs:484-546` — Step 2.5; `:509-514` the exit when a fast item has no report.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/close_sprint.mjs:910-1106` — Steps 2.7 and 2.8 (`:970-1106`), read-only, after the writers today.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/close_sprint.mjs:1434-1461` — the Gate 4 prompt and Step 5.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/prep_doc_refresh.mjs:223-240` — Strategy 1 looks for `sprint/<sprint-id>`; `:28` repo root with no env override.
- **Surface:** `cleargate-cli/src/commands/sprint.ts:592-637` — `sprintCloseHandler`; `:1214-1250` `cleargate sprint archive` (clears `.active`, then `git checkout main` in cwd).
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:167`, `:704`, `:706-723` — the `.active` sentence, the `prep_doc_refresh.mjs` mention and §E.5.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/knowledge/cleargate-enforcement.md` §12.2, §14.2; `cleargate-cli/scaffold/hosts/claude/CLAUDE.md:65`.
- **Surface:** `cleargate-cli/test/scripts/test_close_sprint_v21.integration.node.test.ts`, `cleargate-cli/test/lib/close-sprint-backsync.node.test.ts`, `cleargate-cli/test/scripts/close-sprint-hardening-043-05.red.node.test.ts`, `cleargate-cli/test/scripts/close-sprint-step-2-6c.red.node.test.ts`, `cleargate-cli/test/scripts/close-sprint-step-7-4.red.node.test.ts`, `cleargate-cli/test/scripts/close-sprint-fence.red.node.test.ts`, `cleargate-cli/test/scripts/close-sprint-cli-resolution.red.node.test.ts`, `cleargate-cli/test/commands/sprint-archive.node.test.ts` — tests that pin today's close behaviour. `grep "v2.1 validation requires" test/` is empty, so no test expects exit 1 at 2.5.
- **Coverage of this requirement:** partial. `close_sprint.mjs` has every check and write step; the work reorders the read-only ones, defers one, and adds the finish and the checklist call. `prep_doc_refresh.mjs` exists but nothing runs it.

## Prior work

- [[EPIC-066]] — parent; Goal check (d) is its release gate.
- [[BUG-114]] — close cannot find the CLI from a global install; fixed `close_sprint.mjs` resolution, and this story edits the same file after it.
- [[BUG-107]] — worktree residue at teardown; adjacent.
- [[BUG-086]] — close blocked by the orchestrator's own bookkeeping dirt; adjacent (the finish commits close artefacts).
- [[CR-078]] — close and lane model; adjacent.
- [[STORY-024-04]] — created `prep_doc_refresh.mjs` and deferred wiring it into close; this story wires it.
- Sandbox findings A4 (run 1), S23–S28 (run 2): the close order, the report exit, the missing merge, `.active`, the checklist.
- cleargate-wiki-query 2026-11-15: no prior item merges the sprint branch from close or clears `.active` there.

## Why not simpler?

- **Smallest existing surface that could carry this:** `close_sprint.mjs` plus one lib; every step it needs already exists or is a git call.
- **Why isn't extension / parameterization / config sufficient?** Printing the merge command for the human is a halt outside the three gates, and `cleargate sprint archive` runs `git checkout main` in the current checkout, which fails in the worktree layout. No flag reaches either; the finish has to know where `main` is checked out.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered (no "TBD" / no "{}").
