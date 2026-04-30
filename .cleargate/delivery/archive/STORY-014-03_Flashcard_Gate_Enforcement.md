---
story_id: STORY-014-03
parent_epic_ref: EPIC-014
parent_cleargate_id: "EPIC-014"
sprint_cleargate_id: "SPRINT-09"
status: Completed
ambiguity: 🟢 Low
context_source: EPIC-014 §2 IN-SCOPE B3 + SPRINT-09 REPORT.md §5 Skills 🟡 + protocol §18 (Immediate Flashcard Gate)
actor: Developer Agent
complexity_label: L2
milestone: M1
parallel_eligible: y
expected_bounce_exposure: med
approved: true
approved_at: 2026-04-21T12:00:00Z
approved_by: sandro
stamp_error: no ledger rows for work_item_id STORY-014-03
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-21T12:42:10Z
  sessions: []
cached_gate_result:
  pass: false
  failing_criteria:
    - id: implementation-files-declared
      detail: section 3 has 0 listed-item (≥1 required)
  last_gate_check: 2026-04-21T12:42:10Z
---

# STORY-014-03: PreToolUse flashcard gate enforcement
**Complexity:** L2 — extends existing `pending-task-sentinel.sh` hook with a flashcard-gate check, no new scripts.

## 1. The Spec

### 1.1 User Story
As an orchestrator, I want the PreToolUse hook on `Task` (subagent dispatch) to refuse the spawn when the prior story's dev/qa reports have unprocessed `flashcards_flagged` entries, so protocol §18 (Immediate Flashcard Gate) is enforced automatically instead of relying on orchestrator discipline.

### 1.2 Detailed Requirements
- Extend `.claude/hooks/pending-task-sentinel.sh` (from SPRINT-09): before writing the new sentinel, scan the active sprint's `reports/` dir for the most recent dev + qa reports' `flashcards_flagged` YAML list.
- For each flagged card, check if a `.processed-<card-hash>` marker file exists in the sprint dir. If any card is unprocessed, exit non-zero under v2 (blocks Task spawn). Under v1, log a warning and exit 0.
- Emit diagnostic to stderr naming each unprocessed card + the processing command: `touch .cleargate/sprint-runs/<id>/.processed-<hash>` OR record via `cleargate flashcard process <hash>` (if added later).
- Card hash: SHA-1 of the card string (first 12 chars).
- Update `cleargate-protocol.md` §18 with the enforcement details + hash-marker convention.
- Three-surface landing: hook + mirror + protocol + mirror.

### 1.3 Out of Scope
- Building the `cleargate flashcard process` CLI (just use `touch` for now — CLI wrapper can come later).
- Automatically approving cards (human decision always).

## 2. The Truth

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: PreToolUse flashcard gate

  Scenario: v2 Task spawn blocked on unprocessed flashcard
    Given STORY-XX-01-dev.md has flashcards_flagged: ["2026-04-22 · #test · example"]
    And no .processed-<hash> marker exists
    When orchestrator invokes Task for STORY-XX-02
    Then the PreToolUse hook exits non-zero
    And stderr names the unprocessed card + the touch-command hint

  Scenario: v2 Task spawn proceeds after processing
    Given the same card but a .processed-<hash> marker exists
    When orchestrator invokes Task for STORY-XX-02
    Then the hook exits 0 and writes the normal pending-task sentinel

  Scenario: v1 is advisory
    Given execution_mode: v1 and an unprocessed flagged card
    When orchestrator invokes Task
    Then the hook prints a warning to stderr but exits 0

  Scenario: Empty flashcards_flagged is a no-op
    Given STORY-XX-01-dev.md has flashcards_flagged: []
    When orchestrator invokes Task for STORY-XX-02
    Then the hook exits 0 normally
```

### 2.2 Verification Steps (Manual)
- [ ] Bash test simulates PreToolUse payloads + pre-seeded dev/qa reports.
- [ ] `diff` hook + protocol mirrors.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Modified hook | `.claude/hooks/pending-task-sentinel.sh` |
| Modified protocol | `.cleargate/knowledge/cleargate-protocol.md` §18 |
| Mirrors | `cleargate-planning/.claude/hooks/pending-task-sentinel.sh` + protocol mirror |
| Test | `.cleargate/scripts/test/test_flashcard_enforcement.sh` |

### 3.2 Technical Logic
After resolving sprint dir (existing logic), glob `reports/STORY-*-dev.md` + `STORY-*-qa.md`, take most recent by mtime, parse `flashcards_flagged:` YAML list (use existing jq + yaml-via-node pattern from sentinel writer). For each card, compute SHA-1 via `openssl sha1` (BSD/macOS-compatible) or `shasum -a 1`, first 12 chars. Check `.processed-<hash>`. Under v1, print warning and continue.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Gherkin bash | 4 | All §2.1 |
| Three-surface diff | 2 | hook + protocol |

### 4.2 Definition of Done
- [ ] All 4 scenarios pass.
- [ ] v1-advisory path verified.
- [ ] Hash stability: same card string → same hash across runs.
- [ ] Three-surface landing.
- [ ] Commit: `feat(EPIC-014): STORY-014-03 flashcard gate enforcement`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low**
