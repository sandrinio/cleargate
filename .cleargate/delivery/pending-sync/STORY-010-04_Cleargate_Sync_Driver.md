---
story_id: STORY-010-04
parent_epic_ref: EPIC-010
parent_cleargate_id: "EPIC-010"
status: Draft
ambiguity: 🟢 Low
complexity_label: L3
context_source: PROPOSAL-007_Multi_Participant_MCP_Sync.md
actor: Vibe Coder
created_at: 2026-04-19T19:30:00Z
updated_at: 2026-04-19T19:30:00Z
created_at_version: post-SPRINT-05
updated_at_version: post-SPRINT-05
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-19T22:23:32Z
stamp_error: no ledger rows for work_item_id STORY-010-04
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-19T20:05:35Z
  sessions: []
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:44:45.502Z
push_version: 2
---

# STORY-010-04: `cleargate sync` / `pull` / `conflicts` / `sync-log` Commands + Frontmatter Merge Helper

**Complexity:** L3 — the central driver; composes libs from 010-01 / 010-02 / 010-03. Must enforce pull→detect→resolve→push ordering; must be idempotent.

## 1. The Spec

### 1.1 User Story
As a Vibe Coder, I want a single `cleargate sync` command that pulls remote updates, surfaces conflicts interactively, and pushes my approved changes, so that I can keep the team backlog aligned without running four separate commands.

### 1.2 Detailed Requirements

**`cleargate-cli/src/commands/sync.ts`** (new — the driver):
Sequence (NEVER reordered):
1. Resolve identity + active sprint (from 010-01).
2. Call `cleargate_list_remote_updates({ since: wiki.last_remote_sync })`. For each `remote_id` returned, call `cleargate_pull_item`. Accumulate `RemoteItem[]`.
3. For each local tracked item + paired remote item: call `conflict-detector.classify()` (from 010-03). Partition into `no-op | pull | push | merge | merge-silent | remote-wins | refuse`.
4. Interactive resolution loop: for each `merge` item, call `promptThreeWayMerge()`. For `remote-wins`, log to sync-log + stdout one-liner. For `refuse`, halt and write to `.cleargate/.conflicts.json` (read later by `cleargate conflicts`).
5. Apply pulls (write frontmatter updates + body replacements). Apply pushes for items still with `approved: true` AND no remote_id change mid-sync.
6. Update `last_remote_sync` in wiki meta + append one summary line to sync-log.

**`cleargate-cli/src/commands/pull.ts`** (new — targeted single-item pull):
- `cleargate pull <ID-or-remote_id>` — calls `pull_item`, writes frontmatter + body; appends sync-log entry.
- `--comments` flag: also calls `pull_comments` (integrates with 010-06).

**`cleargate-cli/src/commands/conflicts.ts`** (new):
- Reads `.cleargate/.conflicts.json`; prints unresolved items with one-line resolution hint.
- No mutation. Clearing a conflict requires re-running `cleargate sync`.

**`cleargate-cli/src/commands/sync-log.ts`** (new):
- Thin CLI wrapper over `sync-log.ts` lib from 010-01.
- Flags: `--actor`, `--op`, `--target`, `--limit N` (default 50).

**`cleargate-cli/src/lib/frontmatter-merge.ts`** (new — small utility for git-merge conflicts on dynamic fields):
- `mergeFrontmatterConflict(localYaml: string, remoteYaml: string): string` — for ISO-8601 timestamp fields (`pushed_at`, `last_pulled_at`, `updated_at`), takes the newer (textually latest). For other conflicting scalars, returns a marker and expects human to resolve. Used by `cleargate sync` post-git-pull; exported for future git-merge-driver integration.

**`--dry-run` flag on `sync`**: runs steps 1–3 only; prints the plan ("Would pull N, push M, conflicts K"); no fs writes; no sync-log entries.

**Push ordering rule** (hard-coded): the driver MUST NOT push before all pulls complete. Enforced by ordering the loop and by a unit test that mocks the adapter and asserts call order.

### 1.3 Out of Scope
Stakeholder-authored proposal intake (STORY-010-05). Comment pulling (STORY-010-06). Push-gate + revert (STORY-010-07). SessionStart hook (STORY-010-08).

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: cleargate sync + pull + conflicts + sync-log

  Scenario: sync pulls before pushing
    Given 2 remote updates and 1 local push-ready item
    When cleargate sync
    Then both pulls complete before the push starts (mock call-order assertion)
    And sync-log has 3 new entries in that order

  Scenario: sync --dry-run mutates nothing
    Given 2 pending pulls, 1 pending push, 1 conflict
    When cleargate sync --dry-run
    Then stdout prints "Would pull: 2, push: 1, conflicts: 1"
    And no file changes; no sync-log entries

  Scenario: Targeted pull updates frontmatter
    Given remote LIN-1042 has status "in-progress"
    When cleargate pull LIN-1042
    Then STORY-042-01.md frontmatter gains last_pulled_at + last_remote_update
    And status field becomes "in-progress"

  Scenario: Targeted pull is idempotent
    Given remote LIN-1042 is unchanged since last pull
    When cleargate pull LIN-1042 runs twice back-to-back
    Then the second invocation writes nothing to disk
    And sync-log op is "pull" result "no-op"

  Scenario: Conflict halts sync and writes .conflicts.json
    Given 1 local-delete + remote-edit situation
    When cleargate sync
    Then .cleargate/.conflicts.json contains that item
    And remaining pulls/pushes after the conflict item still execute

  Scenario: conflicts command lists unresolved
    Given .cleargate/.conflicts.json has 2 items
    When cleargate conflicts
    Then stdout lists both with hint text ("remote-delete: resurrect or delete remote?")
    And no files are modified

  Scenario: sync-log filters work end-to-end
    Given sync-log has 20 entries
    When cleargate sync-log --op push --limit 5
    Then at most 5 push entries print, newest first

  Scenario: Frontmatter merge helper prefers newer timestamp
    Given git merge conflict on pushed_at ("2026-04-19T14:00:00Z" vs "2026-04-19T15:00:00Z")
    When mergeFrontmatterConflict is called
    Then the result contains "2026-04-19T15:00:00Z"

  Scenario: Content-content conflict invokes merge helper
    Given local and remote both edited STORY-042-01 body
    When cleargate sync
    Then the merge prompt appears
    And the user's choice is applied to the local file
```

### 2.2 Verification Steps
- [ ] Two-terminal E2E: two dev machines share a scratch MCP project; each drafts + pushes different stories; each runs sync; both see each other's items.

## 3. Implementation

**Files touched:**

- `cleargate-cli/src/commands/sync.ts` — **new** — driver; enforces pull→detect→resolve→push ordering + `--dry-run`.
- `cleargate-cli/src/commands/pull.ts` — **new** — targeted single-item pull.
- `cleargate-cli/src/commands/conflicts.ts` — **new** — reads `.cleargate/.conflicts.json` and prints unresolved items.
- `cleargate-cli/src/commands/sync-log.ts` — **new** — filter/print wrapper over `sync-log` lib.
- `cleargate-cli/src/lib/frontmatter-merge.ts` — **new** — ISO-8601-newer-wins for dynamic timestamp fields.
- `cleargate-cli/src/bin/cleargate.ts` — **modified** — register 4 new commands in the CLI router.

**Consumes:** `identity.ts` + `sync-log.ts` (010-01), MCP tools (010-02), `conflict-detector` + `merge-helper` (010-03).

## 4. Quality Gates

| Test Type | Min | Notes |
|---|---|---|
| Unit — sync ordering | 1 | mock adapter; assert pull-then-push call order |
| Unit — sync dry-run | 1 | asserts zero fs + sync-log writes |
| Unit — pull idempotency | 1 | second call is no-op |
| Unit — conflicts write/read | 2 | halt writes .conflicts.json; `conflicts` reads it |
| Unit — sync-log CLI filters | 2 | actor / op filter |
| Unit — frontmatter merge | 2 | timestamp win + non-timestamp marker |
| Integration — full loop | 1 | recorded MCP fixtures; 2 pulls + 1 push + 1 conflict; assertions on fs + sync-log |

### 4.2 Definition of Done
- [ ] `npm run typecheck` + `npm test` green in `cleargate-cli/`.
- [ ] `cleargate --help` lists 4 new commands with one-line descriptions.
- [ ] Two-terminal E2E verified once by hand against the deployed MCP.

## Ambiguity Gate
🟢.
