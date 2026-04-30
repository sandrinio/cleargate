---
story_id: STORY-022-05
parent_epic_ref: EPIC-022
status: Completed
ambiguity: 🟢 Low
context_source: EPIC-022_Sprint_Lane_Classifier_And_Hotfix_Path.md
actor: developer agent
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: med
sprint: SPRINT-14
milestone: M4
approved: true
approved_at: 2026-04-27T00:00:00Z
approved_by: sandrinio
created_at: 2026-04-27T00:00:00Z
updated_at: 2026-04-27T00:00:00Z
created_at_version: cleargate@0.5.0
updated_at_version: cleargate@0.5.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-26T20:49:36Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-022-05
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-26T20:49:36Z
  sessions: []
---

# STORY-022-05: Developer Agent Lane-Aware Execution + Demotion Handler
**Complexity:** L2 — agent contract documentation update + a small read of state.json to detect lane, then conditionally skip the architect-plan-citation block.

## 1. The Spec (The Contract)

### 1.1 User Story

As a Developer agent, I want to read `lane` from `state.json` on spawn and skip the architect-plan-citation block when lane=fast (no plan exists for fast-lane stories), and surface a graceful demotion handler if the orchestrator routes back to me after a pre-gate failure caused state.json to flip lane=standard mid-execution.

### 1.2 Detailed Requirements

Two synchronised surfaces land:

1. **`cleargate-planning/.claude/agents/developer.md`** — append §"Lane-Aware Execution" with:
   - On spawn: read `state.json` for the current sprint, look up the story's `lane` field. If absent or `"standard"`, follow the existing four-agent contract verbatim. If `"fast"`, skip writing the architect-plan-citation block (no plan exists; the orchestrator dispatched without a plan because lane=fast).
   - The pre-gate scanner is NEVER skipped on lane=fast (that's pre_gate_runner.sh's contract per STORY-022-04). The Developer's commit MUST still pass typecheck + tests. Single-commit rule preserved.
   - Demotion handler: if state.json lane field flips from `"fast"` to `"standard"` mid-sprint (a `lane_demoted_at` timestamp is populated), the orchestrator will re-dispatch the story with the architect plan. The Developer treats the new dispatch as a fresh spawn and follows the standard contract — no special demotion logic on the Developer side.
   - First-line marker: the Developer's first response line still emits `STORY=NNN-NN` / `CR=NNN` etc. per BUG-010's detector contract. Lane is NOT part of the first-line marker.
   
2. **Live mirror at `.claude/agents/developer.md`** — `cp` from scaffold post-edit. The live file is gitignored per `/.gitignore` `/.claude/`; the scaffold is the canonical source.

### 1.3 Out of Scope

- Architect rubric (STORY-022-01 shipped at `112a799`).
- state.json schema bump + migration (STORY-022-02 shipped at `cf8198e`).
- Templates carrying lane fields (STORY-022-03 shipped at `86bf9af`).
- pre_gate_runner.sh demotion mechanics (STORY-022-04 owns).
- Hotfix lane (STORY-022-06 owns).
- Reporter contract (STORY-022-07 owns).
- QA agent contract change. QA does NOT spawn on lane=fast successful runs (per pre_gate_runner.sh routing) — no change to qa.md needed.

## 2. The Truth (Executable Tests)

### 2.1 Gherkin Acceptance Criteria

```gherkin
Feature: Developer agent lane-aware execution

  Scenario: developer.md documents lane-aware spawn behavior
    Given the file `cleargate-planning/.claude/agents/developer.md`
    When a reader greps for "Lane-Aware Execution"
    Then a section exists describing the lane=fast vs lane=standard branch
    And the section explicitly states pre-gate scanner is never skipped
    And the section documents the demotion-handler delegation to orchestrator re-dispatch

  Scenario: live developer.md is byte-identical to scaffold
    Given `.claude/agents/developer.md` and `cleargate-planning/.claude/agents/developer.md`
    When `diff` is run between the two files
    Then the diff is empty

  Scenario: First-line marker contract preserved
    Given the developer.md spawn instructions
    When a reader navigates to the response-format section
    Then the first-line marker is unchanged: `STORY=NNN-NN` (or CR/BUG/EPIC/PROPOSAL/PROP equivalents per BUG-010)
    And lane is NOT part of the first-line marker
```

### 2.2 Manual Verification

- Read `cleargate-planning/.claude/agents/developer.md` post-edit. Confirm the new §"Lane-Aware Execution" section.
- `diff .claude/agents/developer.md cleargate-planning/.claude/agents/developer.md` produces zero output.
- Cross-reference §"Lane-Aware Execution" against PROPOSAL-013 §2.4 demotion mechanics — should not contradict.

## 3. Implementation Guide

### 3.1 Files To Modify

- `cleargate-planning/.claude/agents/developer.md` (scaffold canonical, tracked).
- `.claude/agents/developer.md` (live, gitignored — `cp` from scaffold post-edit so the running orchestrator session sees the new contract).
- (optional) `cleargate-cli/test/lib/agent-developer-section.test.ts` if a section-presence test pattern exists for agent files. Mirror the `protocol-section-N.test.ts` convention if found.

### 3.2 Technical Logic

Documentation-as-contract. No code paths change in this story.

The Developer's behavior is driven by what's written in `developer.md` — agents read their own definition file at spawn. The new §"Lane-Aware Execution" instructs the agent to:
1. Skip writing the architect-plan-citation block when lane=fast (saves tokens by not pretending a plan exists).
2. Treat demotion as a fresh re-dispatch (no continuation logic).
3. Preserve the first-line marker contract (BUG-010's detector seam).

### 3.3 API / CLI Contract

No CLI surface change.

## 4. Quality Gates

### 4.1 Test Expectations

- Three Gherkin scenarios pass.
- Live + scaffold byte-equality assertion (existing or new test).
- No regression in existing developer-agent tests (if any).

### 4.2 Definition of Done

- [ ] §"Lane-Aware Execution" added to `cleargate-planning/.claude/agents/developer.md`.
- [ ] Live `.claude/agents/developer.md` byte-identical to scaffold.
- [ ] Section explicitly states pre-gate scanner is never skipped, regardless of lane.
- [ ] Demotion handler explicitly delegated to orchestrator re-dispatch (no Developer-side state machine).
- [ ] First-line marker contract reaffirmed.
- [ ] `npm run typecheck` clean.
- [ ] `npm test` green.
- [ ] Commit message: `feat(STORY-022-05): SPRINT-14 M4 — Developer agent lane-aware execution + demotion delegation`.
- [ ] One commit. NEVER `--no-verify`.
