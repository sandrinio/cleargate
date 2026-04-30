---
story_id: STORY-022-03
parent_epic_ref: EPIC-022
parent_cleargate_id: "EPIC-022"
sprint_cleargate_id: "SPRINT-14"
status: Completed
ambiguity: 🟢 Low
context_source: EPIC-022_Sprint_Lane_Classifier_And_Hotfix_Path.md
actor: Sprint Plan / Story / Sprint Report templates
complexity_label: L1
parallel_eligible: n
expected_bounce_exposure: low
sprint: SPRINT-14
milestone: M3
approved: true
approved_at: 2026-04-26T00:00:00Z
approved_by: sandrinio
created_at: 2026-04-26T00:00:00Z
updated_at: 2026-04-26T00:00:00Z
created_at_version: cleargate@0.5.0
updated_at_version: cleargate@0.5.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-26T17:23:10Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-022-03
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-26T17:23:10Z
  sessions: []
---

# STORY-022-03: Templates — Sprint Plan + Story + Sprint Report Lane Fields
**Complexity:** L1 — three template files + scaffold mirrors. Documentation/skeleton only.

## 1. The Spec (The Contract)

### 1.1 User Story

As a Sprint Plan / Story / Sprint Report author (human or agent), I want the templates to carry placeholder lane fields so that fresh drafts are lane-aware by default, and so that STORY-022-07's reporter validation has section skeletons to assert against.

### 1.2 Detailed Requirements

Three template files modified, each mirrored at the scaffold path:

1. **`.cleargate/templates/Sprint Plan Template.md`** + scaffold mirror at `cleargate-planning/.cleargate/templates/Sprint Plan Template.md`:
   - §1 "Consolidated Deliverables" story table gains a `Lane` column (between `Title` and `Milestone`, or at end — pick one and document in the template instructions block).
   - New §2.4 "Lane Audit" subsection skeleton: a table with columns `Story | Lane | Rationale (≤80 chars)` for the Architect to fill during Sprint Design Review. Empty by default; rows added only for non-`standard` lanes.

2. **`.cleargate/templates/story.md`** + scaffold mirror at `cleargate-planning/.cleargate/templates/story.md`:
   - Frontmatter gains `lane: "standard"` (default value documented). Additive field; absent means `standard` per STORY-022-02's migration default.

3. **`.cleargate/templates/sprint_report.md`** + scaffold mirror at `cleargate-planning/.cleargate/templates/sprint_report.md`:
   - §3 Execution Metrics table gains five new metric rows (placeholders, values filled by Reporter):
     - `Fast-Track Ratio | N%`
     - `Fast-Track Demotion Rate | N%`
     - `Hotfix Count (sprint window) | N`
     - `Hotfix-to-Story Ratio | N`
     - `Hotfix Cap Breaches | N`
     - `LD events | N` (alongside existing CR:* / UR:* tally rows)
   - §5 Process subsection gains two new tables (skeletons only — Reporter at sprint close populates rows):
     - **Lane Audit** with columns `Story | Files touched | LOC | Demoted? | In retrospect, was fast correct? (y/n) | Notes` (one row per fast-lane story)
     - **Hotfix Audit** with columns `Hotfix ID | Originating signal | Files touched | LOC | Resolved-by SHA | Could this have been a sprint story? (y/n) | If y — why was it missed at planning?` (one row per hotfix merged during the sprint window)
   - §5 Process gains a one-paragraph **Hotfix Trend** narrative placeholder (rolling 4-sprint hotfix count + monotonic-increase flag).
   - Bump `template_version: 1 → 2` in the frontmatter.
   - Header comment: extend the locked vocabulary block to include `LD: lane-demotion`.

All three template files have scaffold mirrors at `cleargate-planning/.cleargate/templates/<filename>`. **Live file and scaffold mirror MUST stay byte-identical** — verify by `diff` post-edit. (BUG-008 + STORY-014-01 round 2 demonstrated this drift surface; same lesson applies here.)

### 1.3 Out of Scope

- Reporter validation enforcing the new sections (STORY-022-07 owns).
- `close_sprint.mjs` activation logic (STORY-022-07 owns).
- Architect actually emitting Lane Audit rows (STORY-022-01 owns the agent contract).
- Filling demonstration data in the templates — empty skeletons only.
- Hotfix template (STORY-022-06 owns the new `hotfix.md` template).

## 2. The Truth (Executable Tests)

### 2.1 Gherkin Acceptance Criteria

```gherkin
Feature: Templates carry lane fields

  Scenario: Sprint Plan Template has Lane column in §1 + §2.4 Lane Audit skeleton
    Given the file `.cleargate/templates/Sprint Plan Template.md`
    When parsed
    Then §1 Consolidated Deliverables table headers include "Lane"
    And §2.4 "Lane Audit" subsection exists with the documented column headers

  Scenario: story.md frontmatter declares lane field
    Given the file `.cleargate/templates/story.md`
    When parsed for the frontmatter block
    Then a `lane: "standard"` line is present (with default value)
    And the templates instructions block notes that absent = standard per migration

  Scenario: sprint_report.md gains §3 metrics + §5 Process tables + Hotfix Trend + version bump
    Given the file `.cleargate/templates/sprint_report.md`
    When parsed
    Then `template_version: 2` is set in frontmatter
    And §3 Execution Metrics table contains the six new metric rows
    And §5 Process contains a "Lane Audit" table skeleton
    And §5 Process contains a "Hotfix Audit" table skeleton
    And §5 Process contains a "Hotfix Trend" narrative placeholder
    And the header comment vocabulary block includes "LD: lane-demotion"

  Scenario: Scaffold mirror byte-equality
    Given each of the three templates and its scaffold mirror
    When `diff` is run between live and mirror
    Then the diff is empty for all three files
```

### 2.2 Manual Verification

- Read each template file. Confirm the new sections.
- `diff .cleargate/templates/<file> cleargate-planning/.cleargate/templates/<file>` for all three — must produce zero output.
- Run any existing template-mirror byte-equality test if present.

## 3. Implementation Guide

### 3.1 Files To Modify

- `.cleargate/templates/Sprint Plan Template.md` (live) + `cleargate-planning/.cleargate/templates/Sprint Plan Template.md` (mirror).
- `.cleargate/templates/story.md` (live) + `cleargate-planning/.cleargate/templates/story.md` (mirror).
- `.cleargate/templates/sprint_report.md` (live) + `cleargate-planning/.cleargate/templates/sprint_report.md` (mirror).
- Test surface: if a template-mirror byte-equality test exists in `cleargate-cli/test/`, ensure it still passes; otherwise add one (small vitest file, three `diff` assertions).

### 3.2 Technical Logic

Pure markdown edits. No code changes.

The Reporter at sprint close (STORY-022-07) reads `template_version` from the frontmatter — bump to 2 enables the new validation paths. STORY-022-07's validator activates ONLY when state.json `schema_version >= 2` AND at least one story had `lane: fast`, so SPRINT-14's own close report (which has all `lane: standard` stories) is not affected by SPRINT-14 itself.

### 3.3 API / CLI Contract

No CLI surface change. The templates are read by `cleargate story new`, `cleargate sprint plan`, etc. — those commands either read the template and pass through (most cases) or (for some scaffolding paths) substitute placeholders. No substitution patterns change.

## 4. Quality Gates

### 4.1 Test Expectations

- Four Gherkin scenarios pass.
- Template-mirror byte-equality test passes for all three template pairs.
- No regression in existing template tests.

### 4.2 Definition of Done

- [ ] All three templates updated per §1.2.
- [ ] All three scaffold mirrors byte-identical to live files.
- [ ] `template_version: 2` set in sprint_report.md.
- [ ] LD event added to header vocabulary block in sprint_report.md.
- [ ] `npm run typecheck` clean.
- [ ] `npm test` green.
- [ ] Commit message: `feat(STORY-022-03): SPRINT-14 M3 — templates lane fields (Sprint Plan + story + sprint report v2)`.
- [ ] One commit. NEVER `--no-verify`.
