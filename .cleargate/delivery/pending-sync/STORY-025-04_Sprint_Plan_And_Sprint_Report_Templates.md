---
story_id: STORY-025-04
parent_epic_ref: EPIC-025
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-18
carry_over: false
status: Approved
ambiguity: 🟢 Low
context_source: EPIC-025 + CR-021 §3.2.1 (Sprint Plan reframe spec) + CR-021 §3.2.2 (Sprint Report §4 Observe + skip-pattern + renumber spec). M4 of CR-021's milestone plan — parallel-developable with M1/M2/M3.
actor: Orchestrator (drafting Sprint Plans) + Reporter (writing Sprint Reports)
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
created_at: 2026-05-01T20:30:00Z
updated_at: 2026-05-01T20:30:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-01T11:16:23Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-025-04
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-01T11:16:23Z
  sessions: []
---

# STORY-025-04: Sprint Plan + Sprint Report Template Reframe
**Complexity:** L2 — two templates × two mirrors (live + canonical) = 4 file edits. No code; doc-only edits with structural changes.

## 1. The Spec (The Contract)

### 1.1 User Story
As the **Orchestrator drafting a Sprint Plan** (Prepare phase) and as the **Reporter writing a Sprint Report** (Close phase), I want both templates to **carry the universal `<instructions>` block + Brief presentation pattern from CR-020** and to **surface Observe-phase findings as a dedicated report section**, so that Sprint Plans become actively-authored dual-audience documents and Sprint Reports include UR:bug + UR:review-feedback rollups instead of leaving them stranded in sprint plan §4 Execution Log.

### 1.2 Detailed Requirements

**Sprint Plan Template (`.cleargate/templates/Sprint Plan Template.md` + canonical mirror):**

- **R1 — Replace `<instructions>` block.** Today's says "READ artifact, written by `cleargate_pull_initiative`. Do NOT draft this file manually." Replace with the actively-authored block from CR-021 §3.2.1 (verbatim shape). Structure: WHAT TO GATHER / HOW TO GATHER / ANALYSIS REQUIRED / WHERE TO WRITE / POST-WRITE BRIEF (six bullets) / DUAL-AUDIENCE STRUCTURE.
- **R2 — Add §0 Stakeholder Brief** — top-of-body section (~10 lines) above current §1 Consolidated Deliverables. Contains: Sprint Goal (1 sentence), Business Outcome, Risks/Mitigations summary table, Metrics. Sponsor-readable; intentionally distinct from the AI-execution-detail of §1+§2.
- **R3 — POST-WRITE BRIEF six bullets** (per CR-021 §3.2.1):
  1. Sprint Goal (1 sentence)
  2. Selected items table (id / type / lane / milestone / parallel? / bounce-exposure)
  3. Recommended priority changes (one-line rationale per change)
  4. Open questions for human (with recommended answers)
  5. Risks (with mitigations)
  6. Current ambiguity + Gate 2 readiness checklist (decomposed? all 🟢? SDR §2 written?)

**Sprint Report Template (`.cleargate/templates/sprint_report.md` + canonical mirror):**

- **R4 — Update `<instructions>` `output_location`** from `.../REPORT.md` → `.../SPRINT-<#>_REPORT.md`. (The actual file naming in `close_sprint.mjs` ships under STORY-025-03; this story updates only the template's reference to match.)
- **R5 — Insert new §4 Observe Phase Findings** between current §3 Execution Metrics and current §4 Lessons. Verbatim shape from CR-021 §3.2.2:
  ```markdown
  ## 4. Observe Phase Findings

  > Populated from sprint plan §4 Execution Log entries dated within the Observe window
  > [last-story-merge-timestamp, sprint-close-timestamp]. Reporter date-filters and groups by event type.
  >
  > SKIP THIS SECTION ENTIRELY (no header, no body) if all three subsections are empty.
  > Output a single line in its place: "Observe phase: no findings."

  ### 4.1 Bugs Found (UR:bug)
  | Date | Description | Resolution | Commit |

  ### 4.2 Hotfixes Triggered
  | ID | Trigger | Resolution | Commit |

  ### 4.3 Review Feedback (UR:review-feedback)
  | Date | Description | Status (folded / deferred) | Deferred to / Rationale |
  ```
- **R6 — Renumber existing sections.** Current §4 Lessons → §5; current §5 Retrospective → §6. Update any cross-references inside the template body.
- **R7 — Promote skip-if-empty to template-wide convention.** Each section's `<instructions>` block declares its skip condition. Sections without findings collapse to a one-liner instead of empty boilerplate. Already used in §4 Observe; now applied consistently across §1 / §2 / §3 / §5 / §6 where applicable (e.g., "Lane Audit empty when no fast-lane stories" already exists).

**Mirror parity:**

- **R8 — Live + canonical edits in lockstep.** Each of the two templates has two surfaces (`.cleargate/templates/` and `cleargate-planning/.cleargate/templates/`); all four files edited in the same commit; mirror diff returns empty post-edit.

### 1.3 Out of Scope
- Renaming the template files themselves — only their `<instructions>` blocks + body skeleton change.
- Touching `close_sprint.mjs` REPORT.md naming code — STORY-025-03's job (this story only edits the template's `output_location` doc reference).
- Touching `reporter.md` agent definition — STORY-025-05's job.
- Reformatting unrelated template prose. Edits scoped strictly to R1-R7 above.

### 1.4 Open Questions

- **Question:** Sprint Plan Template's existing "Execution Guidelines (Local Annotation — Not Pushed)" section at the bottom — keep, drop, or relocate?
  **Recommended:** **Keep** as-is. CR-021 §3.2.1 doesn't mandate its removal, and it serves a distinct purpose (sponsor-facing fields are pushed; local annotations aren't). The dual-audience requirement (R2) adds the Stakeholder Brief at the top; the bottom Execution Guidelines stay for orchestrator local notes.
  **Human decision:** _accept recommended_

- **Question:** §4 Observe header naming — "Observe Phase Findings" or "Observe Phase" or "Observe Findings"?
  **Recommended:** **"Observe Phase Findings"** — matches CR-021 §3.2.2 verbatim and parallels §3 Execution Metrics naming (phase + content type).
  **Human decision:** _accept recommended_

- **Question:** Skip-pattern application — declare skip-condition in `<instructions>` block, or inline as a `>` blockquote at top of each section?
  **Recommended:** **Inline blockquote** (matches the §4 Observe pattern from CR-021). Keeps the skip rule visible to a human reading the rendered template, not just to the AI parsing `<instructions>`.
  **Human decision:** _accept recommended_

### 1.5 Risks

- **Risk:** Sprint Plan Template is currently shared between `cleargate_pull_initiative` (sync from PM tool) and any local drafting. Reframing to "actively authored" may break the pull-initiative tool's expectation that body is pre-shaped on its end.
  **Mitigation:** `cleargate_pull_initiative` populates §1 Consolidated Deliverables from the remote PM tool's items list; the new top §0 Stakeholder Brief and the §2 Execution Strategy (SDR-written) are fields the orchestrator/Architect populate locally. The pull tool's contract narrows: it lays down §1 stub + frontmatter, then the orchestrator drafts §0/§2/§3/etc. Confirm by reading `cleargate_pull_initiative` MCP tool behavior — if it currently writes body sections beyond §1, those writes need to relocate. (This is a research item; if it surfaces during implementation, escalate as a CR scope-clarification event.)

- **Risk:** Renumbering §4 → §5, §5 → §6 in `sprint_report.md` may break any code/tests/scripts that grep for "## 4. Lessons" or "## 5. Retrospective".
  **Mitigation:** Pre-implementation grep across `.cleargate/scripts/`, `cleargate-cli/test/`, `.claude/agents/` for those literal strings. List hits in the M4 Architect plan; update each in lockstep.

- **Risk:** Pre-existing template-stubs.test.ts failure (`Sprint Plan Template.md: live === mirror` mismatch) means today's mirrors are already drifted. This story's edits must end with live=canonical even if the starting state is drifted.
  **Mitigation:** Diff live vs canonical for both templates first; reconcile pre-existing drift as part of this story's commit. Coordinate with CR-023 cleanup — if CR-023 reconciles first, this story builds on a clean baseline.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Sprint Plan + Sprint Report templates reframed

  Scenario: Sprint Plan Template declares actively-authored
    Given STORY-025-04 has shipped
    When .cleargate/templates/Sprint Plan Template.md is read
    Then the <instructions> block contains "actively authored during the Prepare phase"
    And it does NOT contain "READ artifact" or "Do NOT draft this file manually"

  Scenario: Sprint Plan Template has POST-WRITE BRIEF six bullets
    When the template is read
    Then the <instructions> block contains a "POST-WRITE BRIEF" section
    And the section enumerates: Sprint Goal, Selected items, Recommended priority changes, Open questions, Risks, Ambiguity + Gate 2 readiness

  Scenario: Sprint Plan Template has §0 Stakeholder Brief
    When the template is read
    Then the body contains a "## 0. Stakeholder Brief" heading above current §1 Consolidated Deliverables

  Scenario: Sprint Plan Template DUAL-AUDIENCE STRUCTURE clause
    When the template is read
    Then the <instructions> block declares "DUAL-AUDIENCE STRUCTURE"
    And the clause states top-of-body = stakeholder/sponsor view; bottom-of-body = AI-execution view

  Scenario: Sprint Report Template has §4 Observe Phase Findings
    Given STORY-025-04 has shipped
    When .cleargate/templates/sprint_report.md is read
    Then the body contains a "## 4. Observe Phase Findings" heading
    And §4 contains "SKIP THIS SECTION ENTIRELY" pattern in its blockquote
    And §4 has three subsections: 4.1 Bugs Found, 4.2 Hotfixes Triggered, 4.3 Review Feedback

  Scenario: Sprint Report Template renumbered §5 Lessons + §6 Retrospective
    When the template is read
    Then current §5 heading is "## 5. Lessons" (formerly §4)
    And current §6 heading is "## 6. Retrospective" (formerly §5)

  Scenario: Sprint Report Template output_location updated
    When the template's <instructions> block is read
    Then output_location reads ".cleargate/sprint-runs/<sprint-id>/SPRINT-<#>_REPORT.md"
    And it does NOT read ".../REPORT.md"

  Scenario: Mirror parity for both templates
    When `diff .cleargate/templates/Sprint\ Plan\ Template.md cleargate-planning/.cleargate/templates/Sprint\ Plan\ Template.md` runs
    Then the diff is empty
    And the same applies to sprint_report.md
```

### 2.2 Verification Steps (Manual)
- [ ] Read each updated template — confirm structural changes match R1-R7 above.
- [ ] Run `diff` on each live/canonical pair — confirm empty.
- [ ] Spot-check `cleargate-cli/test/scripts/template-stubs.test.ts` — verify the live=mirror assertion now passes for both templates (CR-023 may also need to land first to clear pre-existing drift; coordinate at sprint-execution time).

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `.cleargate/templates/Sprint Plan Template.md` (modify) |
| Primary File 2 | `.cleargate/templates/sprint_report.md` (modify) |
| Mirror Files | `cleargate-planning/.cleargate/templates/Sprint Plan Template.md`, `cleargate-planning/.cleargate/templates/sprint_report.md` (identical edits) |
| New Files Needed | No |

### 3.2 Technical Logic

Doc-only edits. Approach:

1. **Sprint Plan Template — `<instructions>` block.** Replace lines 1-15 (current READ-only declaration) with the verbatim block from CR-021 §3.2.1 (WHAT TO GATHER / HOW TO GATHER / ANALYSIS REQUIRED / WHERE TO WRITE / POST-WRITE BRIEF / DUAL-AUDIENCE STRUCTURE).
2. **Sprint Plan Template — body.** Insert new "## 0. Stakeholder Brief" section above current "## 1. Consolidated Deliverables". Sub-skeleton:
   ```markdown
   ## 0. Stakeholder Brief
   *(Sponsor-readable summary. Pushed to PM tool. Pair with §3 Risks below.)*

   - **Sprint Goal:** {1 sentence}
   - **Business Outcome:** {what the user / sponsor gets}
   - **Risks (top 3):** {bullet list, see §3 for full table}
   - **Metrics:** {expected impact / KPIs}
   ```
3. **Sprint Report Template — `<instructions>` `output_location`.** One-line edit.
4. **Sprint Report Template — body.** Insert §4 Observe Phase Findings (verbatim from CR-021 §3.2.2). Renumber existing §4 Lessons → §5, §5 Retrospective → §6 (search/replace `## 4. Lessons` → `## 5. Lessons`, etc.).
5. **Mirror lockstep.** Apply each edit to canonical mirror in the same commit.
6. **Post-edit grep.** Search the repo for any `## 4. Lessons` / `## 5. Retrospective` / `REPORT.md` references that need updating in tandem.

### 3.3 API Contract — none (doc-only).

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Template lint tests | 8 | One per Gherkin scenario in §2.1. Implement as cleargate-cli vitest cases under `test/scripts/template-content.test.ts` (NEW) or extend existing `template-stubs.test.ts`. |
| Manual verification | 3 | Per §2.2. |

### 4.2 Definition of Done
- [ ] All 8 Gherkin scenarios pass.
- [ ] Mirror diff empty for both templates.
- [ ] No regression: `template-stubs.test.ts` exits 0 (after this story + CR-023's pre-existing drift fix both land — coordinate landing order at sprint-execution time).
- [ ] No grep hits remain for `## 4. Lessons` / `## 5. Retrospective` outside this story's edits (any external references updated in tandem).
- [ ] Commit message: `feat(EPIC-025): STORY-025-04 Sprint Plan + Sprint Report template reframe`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green:
- [x] Gherkin scenarios cover both templates' structural changes + mirror parity.
- [x] Implementation §3 references real file paths and verbatim CR-021 source sections.
- [x] §1.5 acknowledges pre-existing template-stubs.test.ts failure as coordination risk with CR-023.
- [x] No "TBDs" remain.
