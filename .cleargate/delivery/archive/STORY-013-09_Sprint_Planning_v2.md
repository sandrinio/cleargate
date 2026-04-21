---
story_id: STORY-013-09_Sprint_Planning_v2
parent_epic_ref: EPIC-013
status: Done
ambiguity: 🟢 Low
context_source: "EPIC-013_Execution_Phase_v2.md §2 bullet 'Sprint Planning v2' + §6 Q8 revised answer (2026-04-21, 9-story cut); V-Bounce Engine skills/agent-team/SKILL.md § 'Architect Sprint Design Review' + § 'Step 0.5: Discovery Check' at HEAD 2b8477ab"
actor: Architect Agent (contract writer) + Developer Agent (implementer)
complexity_label: L2
approved: true
approved_at: 2026-04-21T00:00:00Z
completed_at: "2026-04-21T08:30:00Z"
approved_by: sandro
milestone: M2
parallel_eligible: n
expected_bounce_exposure: low
created_at: 2026-04-21T00:00:00Z
updated_at: 2026-04-21T00:00:00Z
created_at_version: post-SPRINT-08
updated_at_version: post-SPRINT-08
stamp_error: no ledger rows for work_item_id STORY-013-09_Sprint_Planning_v2
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-21T05:54:07Z
  sessions: []
cached_gate_result:
  pass: false
  failing_criteria:
    - id: implementation-files-declared
      detail: section 3 has 0 listed-item (≥1 required)
  last_gate_check: 2026-04-21T05:54:08Z
---

# STORY-013-09: Sprint Planning v2 (Architect Sprint Design Review + decomposition signals + enforcing Gate 2)
**Complexity:** L2 — template + agent-spec edits + protocol §2 amendment; no scripts. Risk concentrated in R7 (no live v2 test target inside SPRINT-09) — mitigated by a dry-run DoD.

## 1. The Spec (The Contract)

### 1.1 User Story
As a Sprint Planner preparing a v2 sprint, I want the Architect to produce an Execution Strategy (§2 of the Sprint Plan) covering phase plan, merge ordering from shared-file surface analysis, shared-surface warnings, and ADR-conflict flags, AND I want the story template to carry per-story parallel/bounce signals, so that decomposition hands Developer agents a plan that explicitly reasons about parallelism and risk concentration.

### 1.2 Detailed Requirements
- **Architect contract** (`.claude/agents/architect.md`): append `## Sprint Design Review` subsection after `## Blockers Triage` (STORY-013-05). Contract: before human confirms a v2 Sprint Plan, Architect writes Sprint Plan §2 "Execution Strategy" — (a) phase plan (parallel vs sequential story groups), (b) merge ordering from shared-file surface analysis (grep each story's "Files to modify" for overlaps), (c) shared-surface warnings, (d) ADR-conflict flags.
- **Story template** (`.cleargate/templates/story.md`): append two frontmatter fields after `complexity_label` — `parallel_eligible: "y"` (default) and `expected_bounce_exposure: "low"` (default). Add §0.1 instructions blurb explaining the fields.
- **Sprint Plan template** (`.cleargate/templates/Sprint Plan Template.md`): insert new `## 2. Execution Strategy` section after the existing "Consolidated Deliverables" section. §1 story table gains two columns — `Parallel?` and `Bounce Exposure`. Add `execution_mode: "v1"` to frontmatter (already present in SPRINT-09 line 20 as precedent).
- **Protocol §2 amendment** (`.cleargate/knowledge/cleargate-protocol.md`): Gate 2 sub-rule — for `execution_mode: v2` sprints, 🔴 High-ambiguity epics BLOCK bounce start unless sprint frontmatter has `human_override: true` + reason in §0 Readiness Gate. Under v1, advisory only.
- **R7 dry-run DoD**: Architect generates SPRINT-10's §2 Execution Strategy using this story's contract as the final scenario. Output at `.cleargate/sprint-runs/S-09/sprint-10-design-review-dryrun.md`. **Not auto-promoted.** User reviews.
- **Three-surface landing (R9)** on all four touched files (architect.md + story.md + Sprint Plan Template + protocol.md + mirrors).

### 1.3 Out of Scope
- Retroactive backfill of `parallel_eligible` + `expected_bounce_exposure` on existing stories 01–08. Defaults apply. SPRINT-09 is v1 anyway.
- Ambiguity Score numerical formula — frontmatter already ships 🟢/🟡/🔴 emoji; formal numeric score is a separate future epic (EPIC-013 §2 OUT-OF-SCOPE bullet 3).
- Auto-promotion of the dry-run file to the real SPRINT-10 plan. User reviews manually.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Sprint Planning v2 contract + decomposition signals

  Scenario: Story template carries new fields
    Given the story.md template on both live and cleargate-planning/ surfaces
    When I grep frontmatter
    Then parallel_eligible and expected_bounce_exposure fields are present
    And defaults are "y" and "low"

  Scenario: Sprint Plan Template §2 exists with new columns
    Given the Sprint Plan Template on both surfaces
    When I grep for `## 2. Execution Strategy`
    Then the section exists
    And §1 story table has Parallel? and Bounce Exposure columns

  Scenario: Gate 2 enforcing path for v2 🔴 epic
    Given a synthetic Sprint Plan frontmatter has execution_mode: "v2"
    And its parent Epic has ambiguity: "🔴 High"
    And the Sprint Plan §0 Readiness Gate does NOT contain human_override: true
    When orchestrator runs Gate 2 check
    Then Gate 2 refuses bounce start
    And the refusal message cites protocol §2 v2 rule

  Scenario: Gate 2 override path for v2 🔴 epic
    Given the same synthetic inputs
    And sprint frontmatter has human_override: true + reason
    When orchestrator runs Gate 2 check
    Then Gate 2 passes
    And the override + reason is recorded in sprint §0

  Scenario: Architect Sprint Design Review dry-run for SPRINT-10
    Given Architect has the new `## Sprint Design Review` contract
    When Architect generates sprint-10-design-review-dryrun.md
    Then the file exists at .cleargate/sprint-runs/S-09/sprint-10-design-review-dryrun.md
    And it contains §2 subsections: phase plan, merge ordering, shared-surface warnings, ADR-conflict flags
    And the file is NOT committed as the real SPRINT-10 plan
```

### 2.2 Verification Steps (Manual)
- [ ] Grep both templates + protocol.md for the new content on both surfaces.
- [ ] `diff` live vs mirror empty for each file.
- [ ] Dry-run file reviewed by user; contents reflect plausible SPRINT-10 scope.

## 3. The Implementation Guide

See **M2 plan §STORY-013-09** at `.cleargate/sprint-runs/S-09/plans/M2.md` (lines 95–128). Plan specifies: append site in architect.md (after `## Blockers Triage` from 013-05), story.md field position (after `complexity_label` line 38), Sprint Plan Template §2 placement, protocol §2 Gate-2 amendment (in place, no renumbering), and dry-run filepath.

### 3.1 Context & Files

| Item | Value |
|---|---|
| Agent spec | `.claude/agents/architect.md` — append `## Sprint Design Review` |
| Template | `.cleargate/templates/story.md` — 2 frontmatter fields + §0.1 blurb |
| Template | `.cleargate/templates/Sprint Plan Template.md` — new §2 + 2 columns + `execution_mode` |
| Protocol | `.cleargate/knowledge/cleargate-protocol.md` — §2 Gate 2 sub-rule amendment |
| Mirrors | `cleargate-planning/` copies of all four |
| Dry-run output | `.cleargate/sprint-runs/S-09/sprint-10-design-review-dryrun.md` |

### 3.2 Technical Logic
No code. Prose + template edits + agent-spec contract + one protocol amendment + one dry-run markdown file. SPRINT-09 itself runs v1, so Gate 2 v2 enforcement is inert until SPRINT-10.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Gherkin grep-based tests | 5 | All §2.1 scenarios |
| Three-surface diff | 4 | architect.md, story.md, Sprint Plan Template, protocol.md |
| Dry-run file review | 1 | R7 mitigation (user ack, not auto-promote) |

### 4.2 Definition of Done
- [ ] All five §2.1 scenarios pass (scenarios 3/4 via manual walkthrough against protocol §2 prose; 5 via file existence + grep).
- [ ] Dry-run file exists and is reviewed by user.
- [ ] Three-surface diff clean.
- [ ] MANIFEST regenerated (story.md + Sprint Plan Template SHAs bump).
- [ ] Commit: `feat(EPIC-013): STORY-013-09 sprint planning v2`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity (Ready for Execution)**

- [x] Gherkin scenarios cover §1.2 requirements.
- [x] R7 mitigation explicit (dry-run DoD + file path).
- [x] Protocol §2 amendment scope clear (in-place, no renumbering).
- [x] Story template field defaults prevent retroactive breakage.
