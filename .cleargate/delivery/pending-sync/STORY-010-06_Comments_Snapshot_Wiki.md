---
story_id: STORY-010-06
parent_epic_ref: EPIC-010
status: Draft
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-007_Multi_Participant_MCP_Sync.md
actor: Vibe Coder
created_at: 2026-04-19T19:30:00Z
updated_at: 2026-04-19T19:30:00Z
created_at_version: post-SPRINT-05
updated_at_version: post-SPRINT-05
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-19T23:07:12Z
stamp_error: no ledger rows for work_item_id STORY-010-06
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-19T20:05:57Z
  sessions: []
---

# STORY-010-06: Comments-as-Snapshot + Wiki Integration

**Complexity:** L2 — extends sync driver with comment pull loop and the wiki-ingest subagent to render `## Remote comments`.

## 1. The Spec

### 1.1 User Story
As a Vibe Coder, I want stakeholder comments from the PM tool rendered as a read-only section on the relevant wiki page, so that I see the discussion context at triage without context-switching to Linear.

### 1.2 Detailed Requirements

**Sync driver extension** (`cleargate-cli/src/commands/sync.ts`):
After successful pulls, for each item meeting the "active" criteria, call `cleargate_pull_comments({ remote_id })` and cache results in `.cleargate/.comments-cache/<remote_id>.json`.
- **Active criteria**: (item belongs to current active sprint) OR (item's `last_remote_update` within 30 days).
- On rate-limit or failure: skip comments silently, log to sync-log with `op="pull-comments", result="skipped-rate-limit"`. Do NOT fail the sync.

**Targeted pull integration** (extends `cleargate pull <ID>` from 010-04):
- `cleargate pull <ID> --comments` always pulls comments for that item regardless of active criteria (manual escape hatch).

**Wiki ingest extension** (`cleargate-cli/src/lib/wiki-ingest.ts` or the wiki-ingest subagent):
- After pulls complete, for each cached comment file, append/replace a `## Remote comments` section on the corresponding wiki page (`.cleargate/wiki/<type>/<id>.md`).
- Section shape:
  ```markdown
  ## Remote comments

  _Read-only snapshot. Comments live in the PM tool — reply there, not here._

  ### <author_name> (<author_email>) · <created_at>
  > <body>

  ### ...
  ```
- Re-runs replace the section in-place (delimited by `<!-- cleargate:comments:start -->` / `<!-- cleargate:comments:end -->`).
- If no comments exist, remove the section entirely.

**Back-cache cleanup**: `.cleargate/.comments-cache/` is gitignored; re-building wiki re-reads from cache.

### 1.3 Out of Scope
Pushing comments back to the PM tool (never — read-only). Threaded replies / reactions. Comment editing.

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: Comments snapshot + wiki integration

  Scenario: Active-sprint item gets comments pulled
    Given STORY-042-01 is in the active sprint
    And LIN-1042 has 3 comments
    When cleargate sync
    Then .cleargate/.comments-cache/LIN-1042.json contains 3 entries
    And .cleargate/wiki/stories/STORY-042-01.md has a "## Remote comments" section with 3 comments

  Scenario: Stale item comments NOT pulled
    Given STORY-033-04 has last_remote_update 90 days ago
    And is not in the active sprint
    When cleargate sync
    Then no pull_comments call is made for STORY-033-04
    And the existing cache (if any) is NOT re-rendered

  Scenario: --comments overrides active criteria
    Given STORY-033-04 is stale (90 days)
    When cleargate pull STORY-033-04 --comments
    Then pull_comments is called
    And STORY-033-04's wiki page gains the section

  Scenario: Rate-limit skip is silent
    Given pull_comments returns 429
    When cleargate sync
    Then sync continues to completion
    And sync-log has an entry "pull-comments result=skipped-rate-limit"
    And no wiki page is modified for that item

  Scenario: Section replaces in place
    Given wiki page has an existing "## Remote comments" with 3 comments
    And remote now has 5 comments
    When wiki-ingest re-runs
    Then the section contains exactly 5 comments (no duplicates, no leftovers)

  Scenario: Section removed when no comments
    Given wiki page has 3 rendered comments
    And remote now has 0 comments
    When wiki-ingest re-runs
    Then the "## Remote comments" section is fully removed (no empty header)

  Scenario: Read-only banner present
    When the section renders
    Then it includes "_Read-only snapshot. Comments live in the PM tool — reply there, not here._"
```

### 2.2 Verification Steps
- [ ] Open `.cleargate/wiki/stories/STORY-042-01.md` after sync; verify comments render correctly.
- [ ] Add a comment on Linear sandbox, re-sync, verify wiki page updates.

## 3. Implementation

**Files touched:**

- `cleargate-cli/src/commands/sync.ts` — **modified** — comment-pull loop for active items; 429 → silent skip.
- `cleargate-cli/src/commands/pull.ts` — **modified** — add `--comments` manual flag.
- `cleargate-cli/src/lib/wiki-ingest.ts` — **modified** — render `## Remote comments` section with exact delimiters (`<!-- cleargate:comments:start -->` / `end`).
- `.cleargate/.comments-cache/` — **new** — runtime-created, gitignored comment cache dir.
- `.gitignore` — **modified** — add `.cleargate/.comments-cache/`.

**Consumes:** `pull_comments` MCP tool (010-02), sync-log (010-01).

## 4. Quality Gates

| Test Type | Min | Notes |
|---|---|---|
| Unit — active criteria | 3 | in-sprint / within-30-days / neither |
| Unit — section render | 3 | insert new / replace existing / remove empty |
| Unit — rate-limit handling | 1 | 429 does not fail sync |
| Integration — cache-to-wiki | 1 | seed cache, run wiki-ingest, assert section |

### 4.2 Definition of Done
- [ ] `.cleargate/.comments-cache/` is in `.gitignore`.
- [ ] `npm run typecheck` + `npm test` green in `cleargate-cli/`.
- [ ] Manual verification against a Linear sandbox issue with 2+ comments.

## Ambiguity Gate
🟢.
