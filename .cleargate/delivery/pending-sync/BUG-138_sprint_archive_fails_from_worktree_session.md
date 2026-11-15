---
bug_id: BUG-138
parent_ref: EPIC-066
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: sprint-execution,worktree-lifecycle
status: Draft
severity: P2-Medium
reporter: orchestrator (SPRINT-46 Goal check d)
approved: false
context_source: SPRINT-46 Goal check (d) sandbox runs 1 and 2, finding A4 (ORCHESTRATOR_FINDINGS.md), S2, S27 (.cleargate/field-trials/2026-11-sandbox-s46.md); iteration-3-scoping.md §7 ('cleargate sprint archive from a worktree session (off the Gate 4 path after §2) ... none') and OD-5; STORY-066-17 §1.3 leaves it unedited; filed under the owner's /goal delegation 2026-11-15
created_at: 2026-11-15T11:36:28.649Z
updated_at: 2026-11-15T11:36:28.649Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-15T11:37:59Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# BUG-138: `cleargate sprint archive` run from a worktree session fails at `git checkout main` / `git branch -d` and leaves the sprint half-archived

### Open Questions

- **Question:** Should `sprint archive` detect the layout (main checked out in another worktree, or the sprint branch checked out here) and merge with `git -C <main worktree>` and skip `branch -d`, or refuse with one actionable message before writing anything?
- **Recommended:** Detect and refuse before any write when it cannot finish, naming the checkout that holds `main`; where it can finish, reuse `planFinish`/`runFinish` from STORY-066-17's `lib/sprint-finish.mjs` instead of a second implementation. Sequence after STORY-066-17 merges.
- **Human decision:** _open_
- **Question:** Does the command stay at all once close performs the finish (STORY-066-17 Step 7.8)? 
- **Recommended:** Keep it as the manual/legacy entry point (file moves + `.active`), but make it layout-safe; deleting it is a separate CR.
- **Human decision:** _open_

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** `cleargate sprint archive <id>` archives the sprint's files, clears `.active`, merges `sprint/S-NN` into `main` and removes the branch from any checkout layout, or refuses before changing anything.

**Actual Behavior:** The handler runs `git checkout main`, `git merge --no-ff` and `git branch -d` in cwd. In a Claude-managed worktree session (`.claude/worktrees/<name>`, branch `worktree-<name>`) `sprint/S-NN` is checked out in the worktree and `main` is checked out in the parent checkout. `git checkout main` therefore fails ("'main' is already checked out at ...") and `git branch -d sprint/S-NN` would fail the same way. The failure comes after the file moves and the `.active` truncation (Steps 1-6), so the sprint is left partly archived with no merge.

## 2. Reproduction Protocol
1. Create a fixture repo with a closed sprint `SPRINT-99` on `sprint/S-99` (state `sprint_status: Completed`).
2. `git worktree add .claude/worktrees/s99 sprint/S-99` and leave `main` checked out in the parent.
3. In the worktree run `node <cleargate dist> sprint archive SPRINT-99`.
4. Observe: files moved into `delivery/archive/`, `.cleargate/sprint-runs/.active` truncated, then `[cleargate sprint archive] git checkout main failed` and a non-zero exit; `main` has no merge commit and the branch is not deleted.

Edge conditions: plain single-checkout layout (must keep working, `test/commands/sprint-archive.node.test.ts`); `--dry-run` (prints the git steps as if they will work); dirty parent checkout.

## 3. Evidence & Context
Run 1 (08:55-08:57 UTC): "`cleargate sprint archive` could not run from the Claude-managed worktree (it checks out `main`), so the orchestrator emptied `.active` by hand (S2, driver artifact)."
ORCHESTRATOR_FINDINGS.md A4: "`cleargate sprint archive` runs `git checkout main` and deletes the sprint branch; neither is possible when the sprint branch lives in a secondary worktree and `main` is checked out elsewhere."
Run 2 (11:12-11:17): "merging `sprint/S-01` into `main` cannot happen from this worktree, because `main` is checked out in the parent checkout"; S27: `.active` still `SPRINT-01` after a completed close, "only `cleargate sprint archive` does [clear it], and that cannot run from a worktree session".

Source (read 2026-11-15):
```
cleargate-cli/src/commands/sprint.ts:1214-1219  Step 6: Truncate .active
cleargate-cli/src/commands/sprint.ts:1221-1228  Step 7: git checkout main   (cwd; exit on failure)
cleargate-cli/src/commands/sprint.ts:1230-1241  Step 8: git merge --no-ff
cleargate-cli/src/commands/sprint.ts:1243-1250  Step 9: git branch -d <sprint branch>
cleargate-cli/src/commands/sprint.ts:1155-1159  --dry-run prints the same git steps unconditionally
```
After STORY-066-17 the close script clears `.active` and finishes the merge itself, so this command is off the Gate 4 path (iteration-3-scoping OD-5) but it stays reachable, documented and broken.

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/src/commands/sprint.ts` (archive handler, `:1130-1260`)
- `cleargate-cli/scaffold/core/.cleargate/scripts/lib/sprint-finish.mjs` (new in STORY-066-17; reuse `listWorktrees`, `planFinish`, `runFinish`; this file may not exist until that story merges)
- `cleargate-cli/test/commands/sprint-archive.node.test.ts`, `cleargate-cli/test/commands/sprint-archive-stamp.integration.node.test.ts`

## Task Breakdown

- [ ] Red test with a real two-worktree fixture (main in parent, sprint branch in worktree) -> Scenario 1
- [ ] Pre-check the layout before Step 1's writes; refuse naming the holder of `main`, or merge via `git -C` and skip `branch -d` -> Scenario 1, 2
- [ ] Make `--dry-run` print the layout-correct plan -> Scenario 3
- [ ] Keep the single-checkout path and existing tests unchanged -> Scenario 4
- [ ] Update the `sprint archive` mention in the sprint-execution skill if the behaviour changes

## 5. Verification Protocol (The Failing Test)

**Command:** `cd cleargate-cli && npx tsx --test test/commands/sprint-archive.node.test.ts` plus a new `*.integration.node.test.ts` with a real `git worktree` fixture

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Single checkout and worktree layout are different successful ways through. |
| Interfaces | T | Real run and `--dry-run` print the plan. |
| Data | F | No behaviour differs by data shape. |
| Rules | T | A layout that cannot finish must be refused before any write. |

```gherkin
Feature: sprint archive works from either layout

  @paths
  Scenario: Worktree layout finishes without a hand step
    Given main is checked out in the parent and sprint/S-99 in .claude/worktrees/s99
    When cleargate sprint archive SPRINT-99 runs in the worktree
    Then the files are archived, .active is empty and main contains the merge
    And the branch is kept with a printed "git branch -d" hint

  @rules
  Scenario: A layout that cannot finish writes nothing
    Given main's checkout has tracked changes
    When the command runs
    Then it exits non-zero naming that checkout and moves no file

  @interfaces
  Scenario: dry-run shows the real plan
    When the command runs with --dry-run in the worktree layout
    Then the printed git steps name the checkout that receives the merge

  @paths
  Scenario: Single checkout is unchanged
    Given a plain checkout
    When the command runs
    Then behaviour and output are as before
```

**Test layers.**

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 1 | layout detection |
| Integration tests | 2 | real git worktrees, no mocks |
| E2E / acceptance tests | 0 | Covered by Goal check (d) run 3a if the close path still calls it; otherwise manual |

---

## Prior work

- [[STORY-066-17]] (close finishes from either layout; §1.3 leaves `sprint archive` unedited and logs it as intake), [[STORY-014-08]] (archive wrapper, shipped), [[CR-022]] (Gate 4 close hardening). No existing item fixes the worktree layout for `sprint archive`.

## Context Source

**context_source:** SPRINT-46 Goal check (d), A4, S2, S27; iteration-3-scoping.md §7 and OD-5.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
- [ ] Open Question 1 (refuse vs merge via git -C) has a human decision.
