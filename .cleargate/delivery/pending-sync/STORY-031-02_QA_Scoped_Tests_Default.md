---
story_id: STORY-031-02
parent_epic_ref: EPIC-031
parent_cleargate_id: EPIC-031
sprint_cleargate_id: SPRINT-31
carry_over: false
area: protocol,qa-agent,sprint-execution,dx
status: Draft
approved: false
ambiguity: 🟢 Low
complexity_label: L1
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
context_source: |
  EPIC-031 §4 rows 3+4. Pure prompt + template edits. Codifies an existing
  flashcard-implied policy ("Dev's run was clean; policy allows skip" — visible
  in SPRINT-30 STORY-073-01 QA report) that two SPRINT-30 QA runs (STORY-070-01,
  STORY-071-01) violated by running full suite when they didn't need to.
created_at: 2026-05-24T00:00:00Z
updated_at: 2026-05-24T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
stamp_error: no ledger rows for work_item_id STORY-031-02
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-24T18:15:50Z
  sessions: []
cached_gate_result:
  pass: false
  failing_criteria:
    - id: gherkin-present
      detail: "'Scenario:' not found in body"
    - id: reuse-audit-recorded
      detail: "'## Existing Surfaces' not found in body"
    - id: simplest-form-justified
      detail: "'## Why not simpler?' not found in body"
  last_gate_check: 2026-05-24T18:15:51Z
---

# STORY-031-02: QA-Verify Defaults to Scoped Tests + Sprint Cross-Cutting Rule

**Complexity:** L1 — two markdown edits in canonical scaffold (`cleargate-planning/.claude/agents/qa.md`, `cleargate-planning/.cleargate/templates/sprint_context.md`) + live re-sync in DoD. ~30min Dev wall time.

## 1. The Spec

### 1.1 User Story

As the sprint-execution orchestrator, I want QA-Verify to run scoped tests by default so the per-story QA dispatch stops re-running 2000 tests when 5 are touched.

### 1.2 Detailed Requirements

1. **Edit `cleargate-planning/.claude/agents/qa.md`.** Add a section `## Test scope policy (Verify mode)` near `## Lane-Aware Playbook`. Required wording:

   ```
   ## Test scope policy (Verify mode)

   **Default: scoped.** Run `npm run test:file -- <touched test files>` only.
   Touched files = the test files that exist for the source files the Dev
   commit modified (derive from `git diff --name-only <dev-sha>~1 <dev-sha>`
   and the canonical adjacent-test mapping in the QA Context Pack).

   **Opt into full suite ONLY when ANY of the following holds:**
   - The story's §3.1 file surface touches `cleargate-cli/package.json`,
     `.cleargate/scripts/`, `gate-checks.json`, or any test-harness
     infrastructure file.
   - The Dev report's TESTS line shows fewer than the expected scoped count
     (signal that Dev did not run tests cleanly).
   - The story is in `lane: runtime` (full suite is part of runtime-lane DoD).

   **When you opt into full suite, the QA report MUST cite which trigger
   condition fired in its `## Notes` section.** No silent full-suite runs.
   ```

2. **Edit `cleargate-planning/.cleargate/templates/sprint_context.md`.** Add one bullet to `## Cross-Cutting Rules` that the sprint-init script populates verbatim into each sprint's `sprint-context.md`:

   ```
   - Test scope: QA-Verify defaults to scoped (`npm run test:file -- <paths>`).
     Full `npm test` is opt-in per qa.md §"Test scope policy (Verify mode)".
   ```

3. **Live re-sync.** After the canonical edits land, the operator MUST re-sync `/.claude/agents/qa.md` from canonical (via `cleargate init` or hand-port) so the next sprint's QA dispatches read the new policy. This is documented in DoD; Dev does not execute the re-sync — the operator does at sprint close.

4. **Backfill the sprint-context.md cross-cutting rule for SPRINT-31 itself.** Add the bullet to `.cleargate/sprint-runs/SPRINT-31/sprint-context.md` after `init_sprint.mjs` runs at SPRINT-31 kickoff so STORY-031-01 and -02 themselves benefit from the new policy.

### 1.3 Out of Scope

- Editing Developer agent prompt — Dev still runs full suite at commit (separate concern).
- Editing Architect / DevOps prompts.
- Changing `prep_qa_context.mjs` script logic — it already emits adjacent-test paths; QA just needs to use them.
- Templating any new sprint-context.md rows beyond the single bullet.

### 1.4 Open Questions

None.

### 1.5 Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| QA misses a regression that scoped tests don't catch | Low | The opt-in triggers (test-harness surface, low TEST count, runtime lane) cover the realistic miss vectors; orchestrator can override per-dispatch with explicit prompt text |
| Live re-sync forgotten → next sprint reads old qa.md | Med | DoD requires the operator to confirm re-sync at story close; Reporter's Gate-4 doc-refresh checklist already enforces this |

## 2. The Truth

### 2.1 Gherkin

```gherkin
Scenario S1: qa.md has the new Test scope policy section
  Given cleargate-planning/.claude/agents/qa.md
  When read after this story merges
  Then it contains a "## Test scope policy (Verify mode)" heading exactly once
  And the heading is followed by the four bullet triggers verbatim

Scenario S2: sprint_context template carries the cross-cutting bullet
  Given cleargate-planning/.cleargate/templates/sprint_context.md
  When read after this story merges
  Then "## Cross-Cutting Rules" contains a bullet starting with "Test scope:"
  And the bullet references qa.md §"Test scope policy (Verify mode)"

Scenario S3: SPRINT-31 sprint-context.md backfilled
  Given SPRINT-31 is in flight when this story merges
  When `.cleargate/sprint-runs/SPRINT-31/sprint-context.md` is read
  Then it contains the "Test scope:" cross-cutting bullet

Scenario S4: Opt-in citation enforcement
  Given a QA dispatch where the agent runs `npm test` (full suite)
  When the QA report is written
  Then the report's "## Notes" section names which trigger condition fired
```

### 2.2 Manual verification

```bash
grep -c "## Test scope policy (Verify mode)" cleargate-planning/.claude/agents/qa.md   # → 1
grep -c "Test scope:" cleargate-planning/.cleargate/templates/sprint_context.md         # → 1
grep -c "Test scope:" .cleargate/sprint-runs/SPRINT-31/sprint-context.md                # → 1 after backfill
```

## 3. Implementation Guide

### 3.1 Context & Files

| Path | Operation |
|---|---|
| `cleargate-planning/.claude/agents/qa.md` | Modify: insert `## Test scope policy (Verify mode)` section |
| `cleargate-planning/.cleargate/templates/sprint_context.md` | Modify: append one bullet to `## Cross-Cutting Rules` |
| `.cleargate/sprint-runs/SPRINT-31/sprint-context.md` | Modify: backfill same bullet |

### 3.2 Technical Logic

Three text edits. No code changes. No script changes.

### 3.3 API Contract

The QA agent's behavioral contract is amended by this prompt change. Effect: scoped tests by default in Verify mode; full suite requires citing a trigger.

## 4. Quality Gates

### 4.1 Test expectations

- A node:test file at `cleargate-cli/test/lib/qa-test-scope-policy.node.test.ts` asserts S1, S2, S3 (file-content greps).
- No code under test — all assertions are doc-shape.

### 4.2 Definition of Done

- [ ] One commit with subject `feat(EPIC-031): STORY-031-02 QA scoped-tests default + cross-cutting rule`.
- [ ] qa.md contains the new section with exact wording per §1.2.
- [ ] sprint_context.md template contains the new bullet.
- [ ] SPRINT-31 sprint-context.md backfilled.
- [ ] Doc-shape test added and passing.
- [ ] DoD checklist item: operator re-syncs live `/.claude/agents/qa.md` from canonical at Gate-4 doc refresh (tracked, not executed by Dev).

---

**Ambiguity Gate**

- [x] §1.2 has exact insertion wording
- [x] §2.1 has 4 Gherkin scenarios
- [x] §3.1 file surface is 3 files
- [x] No code execution, only doc edits + one doc-shape test
- [x] Live re-sync ownership is explicit (operator at Gate 4, not Dev)
