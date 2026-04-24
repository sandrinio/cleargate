---
story_id: STORY-008-05
parent_epic_ref: EPIC-008
status: "Abandoned"
ambiguity: 🟢 Low
complexity_label: L1
context_source: PROPOSAL-005_Token_Cost_And_Readiness_Gates.md
created_at: 2026-04-19T00:00:00Z
updated_at: 2026-04-19T00:00:00Z
created_at_version: post-SPRINT-04
updated_at_version: post-SPRINT-04
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:43:33.736Z
push_version: 3
---

# STORY-008-05: `cleargate stamp-tokens <file>` CLI

**Complexity:** L1 — wires ledger-reader into a Commander subcommand that stamps `draft_tokens` frontmatter.

## 1. The Spec

### 1.1 User Story
As the PostToolUse hook, I want `cleargate stamp-tokens <file>` to read the ledger for the file's `work_item_id`, aggregate per-session, and write `draft_tokens:` into the file's frontmatter so that every work item carries its own cost stamp.

### 1.2 Detailed Requirements
- Extract `work_item_id` from the file's frontmatter ID field (`proposal_id`, `epic_id`, `story_id`, etc.) or filename regex fallback.
- Call `ledger-reader.readLedgerForWorkItem(id)`.
- Aggregate across sessions: `input = sum(s.input)`, same for `output`/`cache_read`/`cache_creation`.
- `model:` top-level = comma-joined unique models across sessions (PROP-005 Q3).
- `sessions:` = array of `{session, model, input, output, cache_read, cache_creation, ts}` per session.
- **Idempotent:** if no new ledger rows since `last_stamp` (tracked via a `draft_tokens.last_stamp:` field), write nothing.
- **Missing ledger:** write `draft_tokens: {input: null, ...}` + `stamp_error: "no ledger rows for work_item_id X"` (PROP-005 §2.5).
- **Archive rule:** if file path contains `/archive/`, the command is a no-op (freeze).
- `--dry-run` flag prints intended diff without writing.

### 1.3 Out of Scope
Hook chaining (STORY-008-06). Pricing / USD (Reporter-side, unchanged).

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: cleargate stamp-tokens

  Scenario: First stamp populates draft_tokens
    Given EPIC-008.md with no draft_tokens and ledger rows exist
    When cleargate stamp-tokens .cleargate/delivery/pending-sync/EPIC-008.md
    Then frontmatter draft_tokens.input > 0
    And sessions[] has ≥1 entry

  Scenario: Re-stamp with no new rows is a no-op
    Given EPIC-008.md already stamped; no new ledger rows
    When cleargate stamp-tokens EPIC-008.md
    Then file bytes are unchanged (exit 0)

  Scenario: Missing ledger produces stamp_error
    Given EPIC-999.md with no ledger rows
    When cleargate stamp-tokens
    Then draft_tokens.input is null
    And stamp_error names the missing work_item_id

  Scenario: Archive freeze
    Given file is under .cleargate/delivery/archive/
    When cleargate stamp-tokens
    Then file is unchanged and exit 0

  Scenario: Dry-run
    When cleargate stamp-tokens file --dry-run
    Then stdout prints the planned draft_tokens diff
    And file is unchanged
```

### 2.2 Verification Steps
- [ ] `cleargate stamp-tokens --help` shows flags.

## 3. Implementation

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/commands/stamp-tokens.ts` |
| Related | `cleargate-cli/src/lib/ledger-reader.ts` (STORY-008-04), `cleargate-cli/src/lib/frontmatter.ts` |
| Deps | EPIC-001 STORY-001-04 (stamp-frontmatter helper) |

## 4. Quality Gates

| Test Type | Min | Notes |
|---|---|---|
| CLI tests | 5 | 1 per Gherkin scenario |
| Unit tests | 2 | Aggregation correctness, session-grouping |

## Ambiguity Gate
🟢.
