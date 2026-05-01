---
story_id: STORY-015-05
parent_epic_ref: SPRINT-15
parent_cleargate_id: SPRINT-15
sprint_cleargate_id: SPRINT-15
status: Done
approved: true
approved_at: 2026-04-29T00:00:00Z
approved_by: sandrinio
ambiguity: 🟢 Low
context_source: PROPOSAL-009_Planning_Visibility_UX.md §2.1, §2.2 (schema half only — UI half deferred). SPRINT-15 §1 row STORY-015-05.
actor: Vibe Coder authoring work items
complexity_label: L1
parallel_eligible: y
expected_bounce_exposure: low
lane: fast
created_at: 2026-04-28T00:00:00Z
updated_at: 2026-04-28T00:00:00Z
created_at_version: cleargate@0.8.2
updated_at_version: cleargate@0.8.2
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-30T12:18:53Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-015-05
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-30T12:18:52Z
  sessions: []
---

# STORY-015-05: Hierarchy Frontmatter Keys in Templates
**Complexity:** L1 — six template files, top-level YAML key additions, deterministic verify.

## 1. The Spec (The Contract)

### 1.1 User Story
As a Vibe Coder authoring a new work item, I want `parent_cleargate_id:` and `sprint_cleargate_id:` to be first-class top-level frontmatter keys in every template, so that wiki, ledger, and Reporter can traverse the work-item hierarchy without sniffing prose `parent_ref:` strings or grepping body text.

### 1.2 Detailed Requirements
- Add `parent_cleargate_id: null` and `sprint_cleargate_id: null` as top-level YAML keys to each of the six work-item templates listed in §3.1.
- Position the keys directly after the existing `parent_epic_ref` / `parent_ref` line where one exists, otherwise immediately below the primary ID line (`epic_id:`, `story_id:`, etc.).
- Preserve existing `parent_ref:` keys verbatim — this story is **additive only**. Deprecation of the prose key happens in a future sprint after backfill (§1.3).
- Each new key carries a one-line YAML comment describing its role: `# canonical cleargate-id of parent work item; null for top-level`.
- Templates shipped via `cleargate init` reflect the change — verified by `cleargate doctor --check-scaffold` reporting clean against the canonical scaffold.

### 1.3 Out of Scope
- Backfilling existing pending-sync items with the new keys (covered by STORY-015-02's one-shot backfill).
- Removing or renaming the existing `parent_ref:` prose key (deprecation deferred).
- Schema validation in the gate detector (the gate continues to ignore these keys until STORY-015-02 wires them up).
- Any changes outside `.cleargate/templates/`.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Hierarchy frontmatter keys in templates

  Scenario: Story template carries both keys
    Given the file .cleargate/templates/story.md
    When grep -E "^(parent_cleargate_id|sprint_cleargate_id):" reads its frontmatter
    Then both keys appear exactly once in the YAML block
    And both default to null

  Scenario: All six templates updated
    Given the templates epic.md, story.md, Sprint Plan Template.md, CR.md, Bug.md, hotfix.md
    When each is parsed as YAML frontmatter
    Then each contains both parent_cleargate_id and sprint_cleargate_id top-level keys

  Scenario: Existing parent_ref preserved
    Given Bug.md previously contained parent_ref: <bug-id>
    When the new keys are added
    Then parent_ref still appears verbatim in Bug.md
```

### 2.2 Verification Steps (Manual)
- [ ] `for f in .cleargate/templates/{epic,story,Sprint\ Plan\ Template,CR,Bug,hotfix}.md; do grep -c parent_cleargate_id "$f"; done` — every line prints `1`.
- [ ] Same loop for `sprint_cleargate_id` — every line prints `1`.
- [ ] Diff against current `parent_ref` occurrences — count unchanged.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `.cleargate/templates/story.md` |
| Related Files | `.cleargate/templates/epic.md`, `.cleargate/templates/Sprint Plan Template.md`, `.cleargate/templates/CR.md`, `.cleargate/templates/Bug.md`, `.cleargate/templates/hotfix.md` |
| New Files Needed | No |

**Files declared (gate-detector bullet list — parser counts `^- ` lines, not table rows):**
- `.cleargate/templates/story.md` (modify — add hierarchy keys)
- `.cleargate/templates/epic.md` (modify)
- `.cleargate/templates/Sprint Plan Template.md` (modify)
- `.cleargate/templates/CR.md` (modify)
- `.cleargate/templates/Bug.md` (modify)
- `.cleargate/templates/hotfix.md` (modify)

### 3.2 Technical Logic
Six identical edits. Each template's frontmatter block gains two adjacent lines:

```yaml
parent_cleargate_id: null  # canonical cleargate-id of parent work item; null for top-level
sprint_cleargate_id: null  # canonical cleargate-id of owning sprint; null for off-sprint items
```

For Sprint Plan Template.md, only `parent_cleargate_id` is meaningful (a sprint may belong to an initiative); `sprint_cleargate_id` is also added but always null in sprint files (sprints are not nested under sprints).

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 0 | Pure doc edit; covered by §2.2 grep verification. |
| E2E / acceptance tests | 1 | One bash test in `.cleargate/scripts/` or equivalent that loops the six templates and asserts both keys present. |

### 4.2 Definition of Done (The Gate)
- [x] Six templates updated with both keys.
- [x] Existing `parent_ref` keys preserved.
- [x] §2.1 grep scenarios all pass.
- [ ] Peer/Architect Review passed (fast-lane: skipped — single-surface doc edit per protocol §9).

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity (Ready for Execution)**

- [x] Gherkin scenarios cover all detailed requirements in §1.2.
- [x] Implementation Guide maps to specific verified file paths.
- [x] No TBDs.
- [x] Lane = fast, justified per protocol §9 rubric: single-subsystem (templates), doc-only, no schema, no auth, deterministic verify, low bounce exposure.
