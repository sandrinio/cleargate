---
story_id: STORY-010-03
parent_epic_ref: EPIC-010
status: Draft
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-007_Multi_Participant_MCP_Sync.md
actor: cleargate sync driver
created_at: 2026-04-19T19:30:00Z
updated_at: 2026-04-19T19:30:00Z
created_at_version: post-SPRINT-05
updated_at_version: post-SPRINT-05
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-19T20:50:12Z
stamp_error: no ledger rows for work_item_id STORY-010-03
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-19T20:05:23Z
  sessions: []
---

# STORY-010-03: Conflict Detector + Three-Way Merge Helper

**Complexity:** L2 — two pure libraries exercising the PROP-007 §2.3 matrix. Unit-test heavy.

## 1. The Spec

### 1.1 User Story
As the sync driver, I want a pure library that classifies a local-vs-remote diff into one of seven conflict states, plus a merge-helper that renders and prompts through content conflicts, so that `cleargate sync` is a thin orchestrator over testable logic.

### 1.2 Detailed Requirements

**`mcp/src/lib/conflict-detector.ts`** (shared lib — importable from CLI via workspace):
- `classify(local, remote, sinceLastSync): ConflictState`
- `ConflictState` enum: `"no-change" | "local-only" | "remote-only" | "content-content" | "content-status" | "status-status" | "local-delete-remote-edit" | "remote-delete-local-edit"`.
- Inputs: `local = { updated_at, body_sha, status, deleted }`, `remote = { updated_at, body_sha, status, deleted }`, `sinceLastSync = { last_pushed_at, last_pulled_at, last_remote_update }`.
- Decision table matches PROP-007 §2.3 exactly — also returns `resolution` metadata: `"push" | "pull" | "merge" | "merge-silent" | "remote-wins" | "refuse"`.
- Pure function; no I/O.

**`cleargate-cli/src/lib/merge-helper.ts`**:
- `promptThreeWayMerge({ local, remote, base, itemId }): Promise<MergeResult>`
- Renders a unified diff (reuse `diff` npm package or roll a minimal patch renderer — prefer `diff` since EPIC-009 already pins it).
- Prompts `[k]eep mine / [t]ake theirs / [e]dit in $EDITOR / [a]bort`.
- `"edit"` spawns `$EDITOR` (default `vi`) on a temp file pre-populated with git-merge-marker style `<<<<<<< local / ======= / >>>>>>> remote`.
- Returns `{ resolution: "keep" | "take" | "edited" | "aborted"; body: string }`.
- Never writes to disk; caller applies the result.

### 1.3 Out of Scope
Wiring into `cleargate sync` (STORY-010-04). Remote-state fetching (STORY-010-02). Sync-log writes (STORY-010-01).

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: conflict detector + merge helper

  Scenario: classify no-change
    Given local and remote body_sha equal and same updated_at as last sync
    When classify()
    Then state is "no-change" and resolution is "pull" (no-op)

  Scenario: classify local-only content edit
    Given local.updated_at > last_pushed_at, remote unchanged
    When classify()
    Then state is "local-only" and resolution is "push"

  Scenario: classify remote-only status change
    Given remote.status differs from local.status, local.body_sha == last snapshot
    When classify()
    Then state is "remote-only" and resolution is "pull"

  Scenario: classify content-content conflict
    Given both local and remote body_sha differ from last snapshot
    When classify()
    Then state is "content-content" and resolution is "merge"

  Scenario: classify content-status silent merge
    Given local.body changed, remote.status changed, bodies otherwise aligned
    When classify()
    Then state is "content-status" and resolution is "merge-silent"

  Scenario: classify status-status remote-wins
    Given both local.status and remote.status changed since last sync
    When classify()
    Then state is "status-status" and resolution is "remote-wins"

  Scenario: classify local-delete + remote-edit refused
    Given local.deleted is true and remote.updated_at > last_pulled_at
    When classify()
    Then state is "local-delete-remote-edit" and resolution is "refuse"

  Scenario: classify remote-delete + local-edit refused
    Given remote.deleted is true and local.updated_at > last_pushed_at
    When classify()
    Then state is "remote-delete-local-edit" and resolution is "refuse"

  Scenario: merge helper keep-mine
    Given a content-content conflict on STORY-042-01
    When user picks [k]eep mine
    Then result.resolution is "keep" and result.body equals local

  Scenario: merge helper take-theirs
    When user picks [t]ake theirs
    Then result.body equals remote

  Scenario: merge helper edit
    When user picks [e]dit
    Then $EDITOR is spawned with merge markers
    And result.body equals whatever the user saved

  Scenario: merge helper abort
    When user picks [a]bort
    Then result.resolution is "aborted" and no changes are written
```

### 2.2 Verification Steps
- [ ] Run merge helper manually against a fixture; confirm diff renders readable in an 80-column terminal.

## 3. Implementation

**Files touched:**

- `mcp/src/lib/conflict-detector.ts` — **new** — pure `classify()` over the 8-state PROP-007 §2.3 matrix + `resolution` metadata.
- `cleargate-cli/src/lib/merge-helper.ts` — **new** — `promptThreeWayMerge()` with `[k]eep / [t]ake / [e]dit / [a]bort` UX.

| Item | Value |
|---|---|
| Deps | `diff` (pin from EPIC-009), `node:child_process` for $EDITOR, no new npm deps |

## 4. Quality Gates

| Test Type | Min | Notes |
|---|---|---|
| Unit — classify | 8 | One per ConflictState |
| Unit — merge helper | 4 | keep / take / edit / abort (stub $EDITOR + stdin) |
| Fixture — diff render | 1 | 80-col readable snapshot for a 5-line conflict |

### 4.2 Definition of Done
- [ ] conflict-detector is pure (no I/O) — asserted by unit tests that never touch fs.
- [ ] merge-helper exits cleanly when user hits Ctrl-C (treat as abort).
- [ ] `npm run typecheck` + `npm test` green in both `mcp/` and `cleargate-cli/`.

## Ambiguity Gate
🟢.
