---
story_id: STORY-013-06_Immediate_Flashcard_Gate
parent_epic_ref: EPIC-013
parent_cleargate_id: EPIC-013
status: Done
ambiguity: 🟢 Low
context_source: "EPIC-013_Execution_Phase_v2.md §4.2 row 'Immediate flashcard gate'; V-Bounce Engine skills/agent-team/SKILL.md § 'Step 5.5: Immediate Flashcard Recording (Hard Gate)' at HEAD 2b8477ab"
actor: Developer Agent + QA Agent + Orchestrator
complexity_label: L2
approved: true
approved_at: 2026-04-21T00:00:00Z
completed_at: 2026-04-21T08:30:00Z
approved_by: sandro
milestone: M2
parallel_eligible: n
expected_bounce_exposure: low
created_at: 2026-04-21T00:00:00Z
updated_at: 2026-04-21T00:00:00Z
created_at_version: post-SPRINT-08
updated_at_version: post-SPRINT-08
stamp_error: no ledger rows for work_item_id STORY-013-06_Immediate_Flashcard_Gate
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-21T05:54:48Z
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-21T00:00:01Z
---

# STORY-013-06: Immediate Flashcard Hard-Gate Between Stories
**Complexity:** L2 — smallest M2 delta; one frontmatter field on two agent specs + one new protocol section.

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate orchestrator, I want to be blocked from creating the next story's worktree until every `flashcards_flagged` entry from the prior story's Dev + QA reports has been approved (recorded to `FLASHCARD.md`) or explicitly rejected, so that context-decay does not swallow hard-won gotchas before the agents carrying them move to the next story.

### 1.2 Detailed Requirements
- **Output-shape field** on `.claude/agents/developer.md`: add `flashcards_flagged:` (YAML list of strings) to the Developer report frontmatter contract. Default `[]`. When non-empty, each string matches `YYYY-MM-DD · #tag1 #tag2 · lesson` per `.claude/skills/flashcard/SKILL.md`.
- **Output-shape field** on `.claude/agents/qa.md`: same `flashcards_flagged:` field. QA's list is additive to Developer's.
- **Protocol §18 "Immediate Flashcard Gate (v2)"** (next free section after STORY-013-05's §§16–17): rule — after story N merges into `sprint/S-XX`, orchestrator MUST process all `flashcards_flagged` entries from story N's dev + qa reports (approve → append to `.cleargate/FLASHCARD.md`; reject → discard with reason in sprint §4 Execution Log) BEFORE creating story N+1's worktree. Informational under v1, enforcing under v2.
- **Three-surface landing** on all three files.

### 1.3 Out of Scope
- Parallel-execution async flashcard window (EPIC-013 §6 Q4 answered 2026-04-21: sequential-by-design, accept the bottleneck).
- Automated approval (requires a human — the skill already mandates this).
- Skill-vocabulary expansion in `.claude/skills/flashcard/SKILL.md` (out of scope per M1 plan cross-story risk #10).

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Immediate flashcard hard-gate between stories

  Scenario: Gate blocks next worktree creation until flashcards processed
    Given STORY-014-05 has just merged into sprint/S-XX
    And STORY-014-05-dev.md has flashcards_flagged: ["2026-04-22 · #test-harness · vitest fake-timers conflict with worker.spawn"]
    When the orchestrator attempts to create .worktrees/STORY-014-06/
    Then the gate presents each flagged flashcard to the user for approval
    And upon approval each card is appended to .cleargate/FLASHCARD.md in the SKILL.md format
    And only then does worktree creation proceed
```

### 2.2 Verification Steps (Manual)
- [ ] Grep `.claude/agents/developer.md` + `.claude/agents/qa.md` for `flashcards_flagged:` in the Output-shape block.
- [ ] Grep `.cleargate/knowledge/cleargate-protocol.md` for `## 18. Immediate Flashcard Gate (v2)`.
- [ ] `diff` live vs mirror empty for all three files.
- [ ] Bash mock-orchestrator test `.cleargate/scripts/test/test_flashcard_gate.sh` drives the §2.1 scenario via a fake dev-report frontmatter + a mock worktree-creation step.

## 3. The Implementation Guide

See **M2 plan §STORY-013-06** at `.cleargate/sprint-runs/S-09/plans/M2.md` (lines 130–156). Plan specifies: protocol §18 numbering (NOT §11 as story text said — that number is occupied), field shape (YAML list of strings, flat), reuse of SKILL.md format, and dogfood note (flashcards processed manually between 013-06 merge and 013-08 start).

### 3.1 Context & Files

| Item | Value |
|---|---|
| Agent spec | `.claude/agents/developer.md` — add `flashcards_flagged:` to Output-shape block |
| Agent spec | `.claude/agents/qa.md` — add same field |
| Protocol | `.cleargate/knowledge/cleargate-protocol.md` — append `## 18. Immediate Flashcard Gate (v2)` |
| Mirrors | `cleargate-planning/` copies of all three |
| Test | `.cleargate/scripts/test/test_flashcard_gate.sh` |

### 3.2 Technical Logic
No code. YAML frontmatter field + protocol rule + mock test. Orchestrator enforcement is out-of-band (same pattern as STORY-013-05's 50-tool-call heuristic).

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Gherkin scenarios (bash) | 1 | §2.1 scenario via `test_flashcard_gate.sh` |
| Three-surface diff | 3 | developer.md, qa.md, protocol.md |

### 4.2 Definition of Done
- [ ] §2.1 scenario passes.
- [ ] Three-surface diff clean.
- [ ] `npm run typecheck` green.
- [ ] Commit: `feat(EPIC-013): STORY-013-06 immediate flashcard hard-gate`.
- [ ] From this story onwards (dogfood check per sprint DoD line 121): orchestrator manually processes any flashcards flagged in dev+qa reports before spawning the next Developer.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity (Ready for Execution)**

- [x] Gherkin scenario covers §1.2 requirements.
- [x] Protocol § numbering explicit (§18, not §11).
- [x] Field shape explicit (flat YAML list of strings).
- [x] Dogfood handoff to orchestrator documented.
