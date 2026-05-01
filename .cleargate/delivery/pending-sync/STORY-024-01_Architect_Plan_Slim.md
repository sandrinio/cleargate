---
story_id: STORY-024-01-Architect_Plan_Slim
parent_epic_ref: EPIC-024
parent_cleargate_id: EPIC-024
sprint_cleargate_id: null
carry_over: false
status: Approved
approved: true
approved_at: 2026-05-01T00:00:00Z
approved_by: sandrinio
ambiguity: 🟢 Low
context_source: "EPIC-024_AI_Orientation_Surface_Slim.md (Workstream A — §0 XML target_files for architect.md, §2 IN-SCOPE Workstream A, §3 Reality Check 'Architect plan size: no cap; reform is to remove §3.1 duplication', §5 Acceptance scenario 'Architect milestone plan drops §3.1 duplication'). Parent epic Gate 1 waived per its proposal_gate_waiver frontmatter; this story inherits the waiver."
actor: Architect agent (author of per-milestone plan); ClearGate orchestrator + Developer agents (downstream consumers of the plan)
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
created_at: 2026-04-30T18:30:00Z
updated_at: 2026-04-30T18:30:00Z
created_at_version: cleargate@0.9.0
updated_at_version: cleargate@0.9.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-01T06:05:26Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-024-01-Architect_Plan_Slim
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-01T06:04:45Z
  sessions: []
---

# STORY-024-01: Architect Plan Slim
**Complexity:** L2 — agent-prompt edit (one section of `architect.md`) with mirror-parity invariant.

## 1. The Spec (The Contract)

### 1.1 User Story

As the **Architect agent** authoring per-milestone plans, I want my Workflow step 4 plan template to focus exclusively on the unique-value layer (cross-story coupling, code-anchored gotchas, executable test scenarios, reuse map) and to drop the per-story Files-to-create / Files-to-modify subsections that duplicate Story §3.1, so that downstream Developer agents read each piece of information exactly once and the plan stops growing through duplication rather than through scope.

### 1.2 Detailed Requirements

- Edit `.claude/agents/architect.md` Workflow step 4 (currently a markdown code-fence block at lines 20–42). Replace the per-story plan-template subsections.
- **Remove** the following per-story subsections from the template:
  - `- Files to create: <list>`
  - `- Files to modify: <list with specific functions/lines>`
- **Retain** these per-story subsections (rename freely for clarity, but keep semantic):
  - Schema changes (verbatim, if any) — schema deltas are sometimes load-bearing and aren't always in Story §3.
  - Test scenarios (from Gherkin) — numbered list.
  - Reuse (no duplication) — existing helpers/modules to call.
  - Gotchas surfaced from code inspection — non-obvious stuff with **file:line citations only**.
- **Add** one new per-story subsection: `Cross-story coupling: <which other stories' surfaces does this touch?>` — surfaces that no individual Story file expresses.
- Retain at the milestone level: `Order`, `Cross-story risks`, `Open decisions for orchestrator`.
- Add a one-line note immediately above the template fence: *"Plan length is scope-driven — there is no line cap. The reform from EPIC-024 is to drop §3.1 duplication, not to compress."*
- Apply the identical edit to `cleargate-planning/.claude/agents/architect.md` (canonical mirror, FLASHCARD 2026-04-19 #wiki #protocol #mirror).
- Post-edit `diff .claude/agents/architect.md cleargate-planning/.claude/agents/architect.md` returns empty.
- All other sections of `architect.md` (Adjacent Implementation Check, Blockers Triage, Sprint Design Review, Protocol Numbering Resolver, Lane Classification, Guardrails, "What you are NOT") are byte-identical pre/post.

### 1.3 Out of Scope

- Removing the `Schema changes` per-story subsection (kept).
- Changing the Architect's agent definition outside Workflow step 4.
- Citation rewrites of moved §§ in `architect.md` — that's STORY-024-02's scope; this story leaves §-citations untouched.
- Changing the Sprint Design Review section, Lane Classification rubric, or Protocol Numbering Resolver subsection.
- Adding any output line-cap or `--allow-extended` override — explicitly rejected by EPIC-024 §6 Q4.
- Renaming the file or its frontmatter `name:` field.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Architect milestone plan template slim

  Scenario: Plan template no longer contains §3.1-duplicating subsections
    Given STORY-024-01 has merged
    When grep "^- Files to create:" runs against .claude/agents/architect.md
    Then it returns zero matches inside the Workflow step 4 template-fence region
    And the same grep against "^- Files to modify:" returns zero matches in the same region

  Scenario: Plan template retains the unique-value subsections
    Given STORY-024-01 has merged
    When the Workflow step 4 template-fence region of .claude/agents/architect.md is read
    Then it contains a "Cross-story coupling:" line per-story
    And it contains a "Test scenarios" subsection per-story
    And it contains a "Reuse" subsection per-story
    And it contains a "Gotchas" subsection per-story
    And it contains a "Schema changes" subsection per-story
    And it contains milestone-level "Order", "Cross-story risks", and "Open decisions" sections

  Scenario: Mirror parity preserved
    Given STORY-024-01 has merged
    When `diff .claude/agents/architect.md cleargate-planning/.claude/agents/architect.md` runs
    Then the diff is empty

  Scenario: No drift in non-targeted sections
    Given STORY-024-01 has merged
    When `git diff <pre-merge-sha> HEAD -- .claude/agents/architect.md` is examined
    Then every changed line falls within the Workflow step 4 region OR adds the one-line "Plan length is scope-driven" note immediately above it
    And the Adjacent Implementation Check, Blockers Triage, Sprint Design Review, Protocol Numbering Resolver, Lane Classification, and Guardrails sections show zero diff hunks
```

### 2.2 Verification Steps (Manual)

- [ ] Read `.claude/agents/architect.md` Workflow step 4 — confirm the new template shape (Order / Per-story blueprint with Cross-story coupling, Schema changes, Tests, Reuse, Gotchas / Cross-story risks / Open decisions).
- [ ] Confirm the "Plan length is scope-driven" note appears immediately above the template fence.
- [ ] Run `grep -c "Files to create:" .claude/agents/architect.md` and `grep -c "Files to modify:" .claude/agents/architect.md` — both report 0.
- [ ] Run `diff .claude/agents/architect.md cleargate-planning/.claude/agents/architect.md` — empty output.
- [ ] Spot-check by reading SPRINT-15/plans/M1.md against the new template: confirm the new shape would have produced a meaningfully shorter plan (the file-surface duplication subsections drop) without losing Cross-story risks, Gotchas, Tests, Reuse, or Schema deltas.

## 3. The Implementation Guide

### 3.1 Context & Files

> **v2 gate input:** every file staged in this story's commit must appear below.

| Item | Value |
|---|---|
| Primary File | `.claude/agents/architect.md` |
| Mirror File | `cleargate-planning/.claude/agents/architect.md` |
| New Files Needed | No |
| Mirrors | Yes — both architect.md paths must diverge by zero bytes post-edit (FLASHCARD 2026-04-19 #wiki #protocol #mirror) |

### 3.2 Technical Logic

1. **Locate the edit region.** In `.claude/agents/architect.md`, the Workflow section begins at "## Workflow" (line 13). Step 4 contains a markdown code-fence block (lines 20–42 as of 2026-04-30) that defines the per-milestone plan template.
2. **Replace the template-fence contents** with the slim template below. Numbering of bullets is illustrative; agents copy the structural shape, not literal text.

   ```markdown
   # Milestone: <name>
   ## Stories: STORY-XXX-YY, STORY-XXX-ZZ
   ## Wave: W<N> (parallel / sequential)

   ## Order
   Strict ordering if any (A must land before B). Flag parallelizable pairs explicitly.

   ## Per-story blueprint
   ### STORY-XXX-YY
   - Cross-story coupling: <which other stories' surfaces does this touch?>
   - Schema changes (verbatim, if any): <migration or frontmatter delta>
   - Test scenarios (from Gherkin): <numbered list — agent must cover all>
   - Reuse (no duplication): <existing helpers/modules to call>
   - Gotchas surfaced from code inspection: <file:line citations only — non-obvious stuff>

   ## Cross-story risks
   Things a Developer working only on their story might miss
   (e.g. "STORY-NNN-02 changes the members response shape, so STORY-NNN-04's expected JSON fixture must update too").

   ## Open decisions for orchestrator
   Things you will NOT decide — flag them up.
   ```

3. **Insert the scope-driven note** as a single line immediately above the template fence (between the "Produce the plan with this structure:" line and the opening fence):

   > Plan length is scope-driven — there is no line cap. The reform from EPIC-024 is to drop §3.1 duplication, not to compress.

4. **Mirror to canonical.** Apply the byte-identical edit to `cleargate-planning/.claude/agents/architect.md`.

5. **Verify mirror parity.** Run `diff .claude/agents/architect.md cleargate-planning/.claude/agents/architect.md` — output must be empty.

### 3.3 API Contract

N/A — agent-prompt edit, no runtime API surface.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Acceptance grep checks | 4 | One per Gherkin scenario in §2.1; automatable as bash one-liners |
| Mirror-diff check | 1 | Empty diff between live and canonical architect.md |
| Pre-commit typecheck | n/a | No code change; pre-commit hooks run unchanged |

### 4.2 Definition of Done (The Gate)

- [ ] All §2.1 Gherkin scenarios pass.
- [ ] `diff .claude/agents/architect.md cleargate-planning/.claude/agents/architect.md` is empty.
- [ ] Non-targeted sections of `architect.md` (Adjacent Implementation Check, Blockers Triage, Sprint Design Review, Protocol Numbering Resolver, Lane Classification, Guardrails, "What you are NOT") show zero diff hunks against the pre-merge SHA.
- [ ] Commit message: `feat(EPIC-024): STORY-024-01 Architect plan slim — drop §3.1 duplication`.
- [ ] Architect (gate review) approves.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths (parent EPIC-024 §0 XML target_files confirmed; both architect.md paths exist in the repo today).
- [x] No "TBDs" exist anywhere in the specification or technical logic.
