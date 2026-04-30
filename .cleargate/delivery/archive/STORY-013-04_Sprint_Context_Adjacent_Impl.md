---
story_id: STORY-013-04_Sprint_Context_Adjacent_Impl
parent_epic_ref: EPIC-013
parent_cleargate_id: "EPIC-013"
sprint_cleargate_id: "SPRINT-09"
status: Done
ambiguity: 🟢 Low
context_source: EPIC-013_Execution_Phase_v2.md §4.2 rows 'Sprint context file' + 'Adjacent implementation check' + V-Bounce Engine `skills/agent-team/SKILL.md` Step 7 + `templates/sprint_context.md`
actor: Architect + Orchestrator
complexity_label: L2
approved: true
approved_at: 2026-04-21T00:00:00Z
completed_at: "2026-04-21T08:30:00Z"
approved_by: sandro
milestone: M1
created_at: 2026-04-21T00:00:00Z
updated_at: 2026-04-21T00:00:00Z
created_at_version: post-SPRINT-08
updated_at_version: post-SPRINT-08
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-20T22:27:02Z
stamp_error: no ledger rows for work_item_id STORY-013-04_Sprint_Context_Adjacent_Impl
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-20T22:26:55Z
  sessions: []
pushed_by: sandro.suladze@gmail.com
pushed_at: 2026-04-20T22:27:13.525Z
push_version: 1
---

# STORY-013-04: Sprint Context File + Adjacent-Implementation Check in Architect
**Complexity:** L2 — one new template + per-sprint instance + `architect.md` patch.

## 1. The Spec (The Contract)

### 1.1 User Story
As the Architect, I want a single per-sprint `sprint-context.md` listing locked deps + cross-cutting design tokens + active FLASHCARD tags, auto-injected into every agent task brief, so that every Developer, QA, and Architect pass starts from the same baseline without re-discovering conventions; and when I draft a story's implementation plan I scan already-merged stories in this sprint for reusable modules so parallel Developers don't re-implement the same helper twice.

### 1.2 Detailed Requirements
- **Template at `.cleargate/templates/sprint_context.md`** — fixed sections:
  - `## Locked Versions` — frozen dep versions for the sprint (Node, TS, Fastify, Drizzle, etc.); orchestrator populates from `package.json` snapshots at sprint init.
  - `## Cross-Cutting Rules` — UI tokens, shared API patterns, sprint-wide decisions.
  - `## Active FLASHCARD Tags` — auto-populated by grepping `.cleargate/FLASHCARD.md` for tags that appear in any story's `<agent_context>` (`#schema`, `#auth`, `#test-harness`, `#worktree`, `#mcp`).
  - `## Adjacent Implementations (Reuse First)` — filled by Architect as stories merge; lists exported helpers per earlier-merged story.
- **Per-sprint instance at `.cleargate/sprint-runs/<sprint-id>/sprint-context.md`** — populated at sprint init (M1 planning) and re-touched after each story merges. The file is always referenced from the task brief passed to Developer/QA/Architect subagent spawns.
- **Patch to `.claude/agents/architect.md`** — append a new subsection "Adjacent Implementation Check" to the Workflow:
  - Before writing per-story blueprint in the plan, the Architect greps merged stories in the current sprint (`git log sprint/S-XX --name-only | grep -E "^src/"` or similar) and lists any new exported helpers as "Reuse these existing modules" in the Per-story blueprint §.
  - If a module listed would be duplicated by the new story, Architect flags it in "Cross-story risks".
- Three-surface landing: template in `.cleargate/templates/` + `cleargate-planning/.cleargate/templates/`; `architect.md` patch in `.claude/agents/` + `cleargate-planning/.claude/agents/`.

### 1.3 Out of Scope
- Auto-injection machinery into agent task briefs (the orchestrator-side logic) — that's covered by STORY-013-08's `execution_mode: v2` routing. This story provides the TEMPLATE + the Architect rule; wiring is STORY-013-08.
- The FLASHCARD tag grep script — Architect does this inline during plan writing (no new script in this story).

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Sprint context file + adjacent-implementation check

  Scenario: Template has all four fixed sections
    Given the template .cleargate/templates/sprint_context.md exists
    When I read it
    Then it contains headings "Locked Versions", "Cross-Cutting Rules", "Active FLASHCARD Tags", "Adjacent Implementations (Reuse First)"
    And each section has a one-sentence purpose description

  Scenario: Per-sprint instance created at M1 planning
    Given SPRINT-09 is initialising M1
    When the Architect writes plans/M1.md
    Then .cleargate/sprint-runs/S-09/sprint-context.md also exists
    And the "Locked Versions" section reflects the current package.json versions
    And the "Active FLASHCARD Tags" section lists at least #worktree and #mcp (present in FLASHCARD.md after STORY-013-01)

  Scenario: Architect flags a reusable helper for a later story
    Given STORY-013-02 has merged and exported a function "atomicWriteJson"
    When Architect writes M2's plan and STORY-013-07 (sprint close) would need atomic JSON writes
    Then the STORY-013-07 blueprint has a "Reuse these existing modules" list containing "atomicWriteJson from .cleargate/scripts/constants.mjs"

  Scenario: architect.md has the new subsection
    Given I read .claude/agents/architect.md
    Then the "Workflow" section contains a subsection titled "Adjacent Implementation Check"
    And the rule "grep merged stories for exported helpers" is present

  Scenario: Scaffold mirror is in sync
    Given the story is complete
    When I diff .cleargate/templates/sprint_context.md vs cleargate-planning/.cleargate/templates/sprint_context.md
    Then the files are identical
    And the same is true for .claude/agents/architect.md vs cleargate-planning/.claude/agents/architect.md
```

### 2.2 Verification Steps (Manual)
- [ ] Read the template aloud — every section heading has a one-sentence purpose.
- [ ] Walk through the `sprint-09` instance manually to confirm section completion.
- [ ] Grep `architect.md` for "Adjacent Implementation Check" — present in both live and planning mirror.

## 3. The Implementation Guide

**Files to touch:**

- `.cleargate/templates/sprint_context.md` (new) — template with four fixed sections
- `.claude/agents/architect.md` — append § "Adjacent Implementation Check"
- `.cleargate/sprint-runs/S-09/sprint-context.md` (new) — first live instance for SPRINT-09
- `cleargate-planning/.cleargate/templates/sprint_context.md` — scaffold mirror
- `cleargate-planning/.claude/agents/architect.md` — scaffold mirror

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `.cleargate/templates/sprint_context.md` (new) |
| Primary File | `.claude/agents/architect.md` (patch — append subsection) |
| Per-sprint instance | `.cleargate/sprint-runs/S-09/sprint-context.md` (created during Architect M1 plan) |
| Scaffold mirrors | `cleargate-planning/.cleargate/templates/sprint_context.md` + `cleargate-planning/.claude/agents/architect.md` |
| New Files Needed | Yes — template, per-sprint instance |

### 3.2 Technical Logic
Port V-Bounce's `templates/sprint_context.md` almost verbatim; strip `vbounce` references. Architect patch: 10-line subsection with the grep recipe + example. No new scripts.

### 3.3 API Contract (if applicable)
N/A.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Grep-based doc checks | 4 | Template sections, architect.md subsection, both scaffold mirrors |
| Gherkin scenarios | 5 | All §2.1 scenarios manually walked |

### 4.2 Definition of Done
- [ ] All five §2.1 scenarios pass.
- [ ] `.cleargate/sprint-runs/S-09/sprint-context.md` created and populated during this story's implementation (the story writes the template AND the first live instance — both are acceptance targets).
- [ ] Three-surface landing confirmed.
- [ ] Architect M1 plan consulted.
- [ ] Commit: `feat(EPIC-013): STORY-013-04 sprint context file + adjacent-impl check`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity (Ready for Execution)**

- [x] Gherkin covers §1.2.
- [x] Paths verified.
- [x] 0 unresolved placeholders.
- [x] Sprint-09 instance is the story's first live artefact — creates the chicken-and-egg case with Architect cleanly.
