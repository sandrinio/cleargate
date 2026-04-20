---
story_id: STORY-013-01_Worktree_Branch_Hierarchy
parent_epic_ref: EPIC-013
status: Ready
ambiguity: 🟢 Low
context_source: EPIC-013_Execution_Phase_v2.md §4.2 row 'Worktree per story' + V-Bounce Engine `skills/agent-team/SKILL.md` §§ 'Git Worktree Strategy' + 'Worktree Commands'
actor: Developer Agent
complexity_label: L3
approved: true
approved_at: 2026-04-21T00:00:00Z
approved_by: sandro
milestone: M1
created_at: 2026-04-21T00:00:00Z
updated_at: 2026-04-21T00:00:00Z
created_at_version: post-SPRINT-08
updated_at_version: post-SPRINT-08
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-20T22:27:01Z
stamp_error: no ledger rows for work_item_id STORY-013-01_Worktree_Branch_Hierarchy
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-20T22:26:39Z
  sessions: []
pushed_by: sandro.suladze@gmail.com
pushed_at: 2026-04-20T22:27:10.693Z
push_version: 1
---

# STORY-013-01: Git Worktree + Branch Hierarchy
**Complexity:** L3 — scaffold-wide rule change (protocol §10 + developer.md + .gitignore + cleargate-planning mirror).

## 1. The Spec (The Contract)

### 1.1 User Story
As a Developer Agent executing under `execution_mode: v2`, I want each story to run inside its own isolated `.worktrees/STORY-NNN-NN/` directory on a dedicated `story/STORY-NNN-NN` branch cut from the active `sprint/S-XX` branch, so that parallel Developers cannot contaminate each other's working tree and every story has a clean rollback path.

### 1.2 Detailed Requirements
- Establish the branch hierarchy `main → sprint/S-XX → story/STORY-NNN-NN`. Sprint branch cut at sprint start; story branches cut when story transitions Ready→Bouncing.
- Create `.worktrees/` as the root for per-story working trees; ensure it is gitignored.
- Extend `.claude/agents/developer.md` (+ `cleargate-planning/` mirror) with a new § "Worktree Contract" that tells the Developer to: check its `cwd` equals the assigned worktree path before any edit; never mix stories in one worktree; never run `git worktree add` inside `mcp/` (nested repo — EPIC-013 Q3).
- Append `.cleargate/knowledge/cleargate-protocol.md` §10 "Worktree Lifecycle" — one section covering init / bouncing / merge / removal commands, gated behind `execution_mode: v2`. Under v1 the rules are informational; under v2 they are mandatory.
- Story branches are deleted with `git branch -d` only AFTER merge into sprint; worktree removed with `git worktree remove` AFTER branch merge.
- Record flashcard `#worktree #mcp` with the rule "never `git worktree add` inside nested `mcp/`" at the top of `FLASHCARD.md`.

### 1.3 Out of Scope
- `state.json` / bounce counters (STORY-013-02).
- CLI wrappers (`cleargate story start|complete`) — those are STORY-013-08.
- Parallel-execution orchestration rules — the hierarchy enables parallelism but the orchestrator's parallel spawn logic is STORY-013-05.
- MCP-repo worktree support — explicitly ruled out (Q3).

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Worktree + branch hierarchy

  Scenario: Sprint branch cut from main
    Given SPRINT-09 is being initialised on a clean main
    When the orchestrator runs "git checkout -b sprint/S-09 main"
    Then sprint/S-09 exists
    And HEAD is at sprint/S-09 commit parity with main

  Scenario: Story worktree creation
    Given sprint/S-09 is the active sprint branch
    And STORY-013-FAKE is in state "Ready to Bounce"
    When the orchestrator runs "git worktree add .worktrees/STORY-013-FAKE -b story/STORY-013-FAKE sprint/S-09"
    Then .worktrees/STORY-013-FAKE/ exists on disk
    And `git worktree list` includes .worktrees/STORY-013-FAKE
    And the worktree's HEAD is story/STORY-013-FAKE
    And story/STORY-013-FAKE's parent is sprint/S-09's tip

  Scenario: .worktrees/ is gitignored
    Given a populated .worktrees/STORY-013-FAKE/ with committed and uncommitted files
    When I run "git status" at repo root
    Then no files under .worktrees/ appear in the output

  Scenario: Story merges back and worktree is removed
    Given story/STORY-013-FAKE has one commit beyond sprint/S-09
    When the orchestrator runs "git checkout sprint/S-09" then "git merge story/STORY-013-FAKE --no-ff"
    And then runs "git worktree remove .worktrees/STORY-013-FAKE"
    And then "git branch -d story/STORY-013-FAKE"
    Then .worktrees/STORY-013-FAKE/ no longer exists
    And git branch -a does not list story/STORY-013-FAKE
    And sprint/S-09 contains the merge commit

  Scenario: Worktree inside nested mcp/ is refused by developer agent
    Given the Developer Agent is about to start work on a story that edits mcp/
    When reading the worktree contract from developer.md
    Then the instructions require "edit mcp/ from inside the outer worktree, never `git worktree add` inside mcp/"
    And FLASHCARD.md #worktree #mcp entry is present
```

### 2.2 Verification Steps (Manual)
- [ ] Dry-run: create `.worktrees/FAKE` via the commands in protocol §10, verify `git status` stays clean.
- [ ] Grep `developer.md` for § "Worktree Contract" and confirm the three rules are present.
- [ ] Grep `.gitignore` at repo root for `.worktrees/`.
- [ ] Confirm `cleargate-planning/.claude/agents/developer.md`, `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md`, `cleargate-planning/.gitignore` all mirror the changes (three-surface landing — SPRINT-09 R9).

## 3. The Implementation Guide

**Files to touch:**

- `.cleargate/knowledge/cleargate-protocol.md` — append new § "Worktree Lifecycle"
- `.claude/agents/developer.md` — append § "Worktree Contract"
- `.gitignore` (repo root) — append `.worktrees/`
- `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` — scaffold mirror
- `cleargate-planning/.claude/agents/developer.md` — scaffold mirror
- `cleargate-planning/.gitignore` — scaffold mirror
- `.cleargate/FLASHCARD.md` — one new line (`#worktree #mcp`)

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File (protocol) | `.cleargate/knowledge/cleargate-protocol.md` — append new §10 |
| Primary File (agent spec) | `.claude/agents/developer.md` — append § "Worktree Contract" |
| Primary File (ignore) | `.gitignore` at repo root — add `.worktrees/` |
| Scaffold mirrors | `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md`, `cleargate-planning/.claude/agents/developer.md`, `cleargate-planning/.gitignore` |
| Flashcard | `.cleargate/FLASHCARD.md` — one new line at top |
| New Files Needed | No |

### 3.2 Technical Logic
Port worktree commands verbatim from V-Bounce's `skills/agent-team/SKILL.md` § "Worktree Commands", rename `vbounce` → `cleargate`, and gate behavior behind `execution_mode: v2` (under v1 the rules are documented but do not apply). All commands in protocol §10 are recipes, not scripts — the corresponding `cleargate-cli` wrappers are authored in STORY-013-08.

### 3.3 API Contract (if applicable)
N/A — this is documentation + `.gitignore` + flashcard. No code surface.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Gherkin scenarios (manual walk-through) | 5 | All §2.1 scenarios executed against a throwaway `STORY-013-FAKE` worktree |
| Grep-based documentation checks | 3 | developer.md, protocol §10, .gitignore presence |

### 4.2 Definition of Done
- [ ] All five §2.1 scenarios pass in a manual walk-through.
- [ ] Three-surface landing: `.cleargate/...` + `cleargate-planning/...` + repo root `.gitignore` all updated.
- [ ] `FLASHCARD.md` #worktree #mcp entry added with date.
- [ ] Architect-authored M1 plan at `.cleargate/sprint-runs/S-09/plans/M1.md` has been consulted.
- [ ] `npm run typecheck` in `cleargate-cli` still green (even though this story doesn't touch CLI code).
- [ ] Commit message: `feat(EPIC-013): STORY-013-01 worktree + branch hierarchy`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity (Ready for Execution)**

- [x] Gherkin scenarios cover all §1.2 requirements.
- [x] Implementation Guide maps to verified file paths (existing files cited; new appends described).
- [x] 0 unresolved placeholders.
- [x] Flashcard pre-condition captured (#worktree #mcp).
