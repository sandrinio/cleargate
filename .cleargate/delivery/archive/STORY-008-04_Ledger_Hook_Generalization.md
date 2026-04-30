---
story_id: STORY-008-04
parent_epic_ref: EPIC-008
parent_cleargate_id: "EPIC-008"
sprint_cleargate_id: "SPRINT-04"
status: "Abandoned"
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-005_Token_Cost_And_Readiness_Gates.md
created_at: 2026-04-19T00:00:00Z
updated_at: 2026-04-19T00:00:00Z
created_at_version: post-SPRINT-04
updated_at_version: post-SPRINT-04
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:43:02.645Z
push_version: 3
---

# STORY-008-04: Token-Ledger Hook Generalization + Sprint-Routing Fix + Ledger-Reader Library

**Complexity:** L2 — bash hook edit + TS library; depends on resolving FLASHCARD 2026-04-19 routing bug.

## 1. The Spec

### 1.1 User Story
As the Reporter, I want the token ledger to tag every row with a correct `work_item_id` (any work-item type) and route every row to the active sprint's directory, so that per-work-item cost attribution works and cross-sprint leakage stops.

### 1.2 Detailed Requirements
- **Generalize work-item detection** in `.claude/hooks/token-ledger.sh`:
  - Replace `STORY_ID` regex (currently `STORY-[0-9]+-[0-9]+`) with `(STORY|PROPOSAL|EPIC|CR|BUG)[-=]?[0-9]+(-[0-9]+)?`.
  - Add `work_item_id` column to ledger rows; keep `story_id` column populated only when the match is a STORY (backward compat).
- **Sprint-routing fix** (per FLASHCARD 2026-04-19: SPRINT-04 rows landed in SPRINT-03):
  - Target sprint = the one whose raw file (`.cleargate/delivery/pending-sync/SPRINT-*.md` OR `archive/SPRINT-*.md`) has `status: "Active"` in frontmatter.
  - Fall back to `ls -td sprint-runs/*/` ONLY if zero sprints have `status: "Active"` (startup edge case).
  - Create `sprint-runs/<active-id>/` if missing.
  - Log routing decision to `.cleargate/hook-log/token-ledger.log` for each append.
- **Per-prompt first-match trap:** current hook tags row with the FIRST `STORY-NNN-NN` grep in the orchestrator transcript; for multi-turn sessions this mis-attributes. Fix: tag row with the work-item ID that appears in the *current turn's* prompt (last `user:` message before the assistant turn), not the earliest match in the whole transcript.
- **`cleargate-cli/src/lib/ledger-reader.ts`**:
  - Exports `readLedgerForWorkItem(workItemId: string, opts?: {since?: string}): LedgerRow[]`.
  - Scans all `sprint-runs/*/token-ledger.jsonl` files (not just the active one — cross-session items may span sprints).
  - Groups rows by session ID for per-session breakdown.

### 1.3 Out of Scope
`stamp-tokens` CLI (STORY-008-05). Hook chaining (STORY-008-06). Reporter USD computation (pricing lib — unchanged).

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: Ledger hook + reader

  Scenario: Proposal edits tagged as work_item_id
    Given an orchestrator turn edits PROPOSAL-042.md
    When SubagentStop fires
    Then the new ledger row has work_item_id="PROPOSAL-042"
    And story_id is empty for that row

  Scenario: Story edits retain story_id backward-compat
    Given an orchestrator turn edits STORY-003-13.md
    When SubagentStop fires
    Then the row has work_item_id="STORY-003-13" AND story_id="STORY-003-13"

  Scenario: Active-sprint routing
    Given SPRINT-05 is status:"Active" in pending-sync/
    And sprint-runs/SPRINT-03/ exists (older)
    When a row is appended
    Then it lands in sprint-runs/SPRINT-05/token-ledger.jsonl

  Scenario: No active sprint fallback
    Given no SPRINT-*.md has status:"Active"
    When a row is appended
    Then it falls back to `ls -td sprint-runs/*/` newest directory
    And logs a fallback warning to hook-log

  Scenario: Per-turn prompt wins, not transcript-first
    Given a transcript where turn 1 mentions STORY-003-13 and turn 5 mentions STORY-008-04
    When the turn-5 assistant finishes
    Then the row for that turn has work_item_id="STORY-008-04"

  Scenario: Reader groups by session
    Given ledger rows exist for EPIC-008 across 2 sessions
    When readLedgerForWorkItem("EPIC-008")
    Then the result groups rows into 2 session buckets with aggregated totals
```

### 2.2 Verification Steps
- [ ] Manually backfill-check: replay SPRINT-04 transcripts and confirm rows would now land in SPRINT-04, not SPRINT-03.
- [ ] Bash-strict-mode test passes (`set -euo pipefail` at top of hook).

## 3. Implementation

| Item | Value |
|---|---|
| Primary Files | `.claude/hooks/token-ledger.sh`, `cleargate-planning/.claude/hooks/token-ledger.sh` (mirror), `cleargate-cli/src/lib/ledger-reader.ts` |
| Related | `.cleargate/hook-log/` (logging target) |
| New Files | `cleargate-cli/src/lib/ledger-reader.ts`, `.cleargate/hook-log/token-ledger.log` (first-write creates) |

## 4. Quality Gates

| Test Type | Min | Notes |
|---|---|---|
| Hook shell tests | 4 | work_item detection × 4 types (STORY/PROPOSAL/EPIC/CR-or-BUG); routing happy + fallback |
| Reader unit tests | 3 | Single-sprint read, multi-sprint scan, session grouping |
| Regression fixture | 1 | Freeze the SPRINT-04 transcript that triggered FLASHCARD 2026-04-19 as a fixture; assert it routes to SPRINT-04 |

## Ambiguity Gate
🟢 — EPIC-008 §6 Q3 resolved 2026-04-19: routing-regression fix lands in this Story.

## Notes

FLASHCARD 2026-04-19 `#reporting #hooks #ledger` is the authoritative bug record. This Story's regression test MUST freeze that scenario.
