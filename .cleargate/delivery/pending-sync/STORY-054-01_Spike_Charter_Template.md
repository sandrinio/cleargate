---
story_id: STORY-054-01
parent_epic_ref: EPIC-054
parent_cleargate_id: "EPIC-054"
sprint_cleargate_id: "SPRINT-39"
carry_over: false
area: planning-layer
status: Draft
approved: true
ambiguity: 🟢 Low
context_source: EPIC-054 (approved Gate 1 2026-08-25, ambiguity 🟢, gate epic.ready-for-decomposition ✅ 12 criteria), workstream WS1. Decomposed 2026-08-25 for SPRINT-39. Granularity Rubric run at decomposition time — see §1.5.
actor: ClearGate maintainer
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-08-25T12:00:00Z
updated_at: 2026-08-25T19:12:57Z
created_at_version: cleargate@0.24.2
updated_at_version: dff83bd3-dirty
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-25T19:12:57Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# STORY-054-01: Spike charter template
**Complexity:** L2 — two new files (template + mirror), no code, no gate wiring

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate maintainer, I want a spike charter template, so that bounded discovery has a document shape that does not demand a spec it cannot have.

### 1.2 Detailed Requirements
- Requirement 1: Create `.cleargate/templates/spike.md` with sections in order — §1 The Question, §2 Timebox & Kill Criteria, §3 Decision Unblocked, §4 Decision Log, §5 Outcome & Spawned Items.
- Requirement 2: Frontmatter carries `spike_id`, `timebox`, `kill_criteria`, `spawned_items: []`, `concluded_at`, plus the standard sync-attribution block copied from `initiative.md`.
- Requirement 3: §4 Decision Log is append-only and explicitly documented as growing *during* the spike, one entry per discovery round.
- Requirement 4: The template's own ambiguity gate states the inversion in its body text — 🟢 means the question is sharp, the timebox is set, and the kill criteria are falsifiable; it does not mean the answer is known.
- Requirement 5: §5 records `spawned_items` and instructs the author to move the file to `archive/` on conclusion, mirroring the Initiative lifecycle.
- Requirement 6: Byte-identical mirror at `cleargate-planning/.cleargate/templates/spike.md`.

### 1.3 Out of Scope
Type registration, gate blocks, KNOWN_TYPES, and the wiki bucket — those are STORY-054-02 and STORY-054-04. This story ships the document shape only; a spike drafted from it will not yet pass a `cleargate gate check` because no `work_item_type: spike` block exists until 02.

### 1.4 Open Questions

- **Question:** Should the charter carry a `POST-WRITE BRIEF` block like every other template?
- **Recommended:** Yes — same shape, but the Ambiguity line reports question-sharpness rather than answer-completeness.
- **Human decision:** Accepted 2026-08-25 as part of EPIC-054 Gate 1.

### 1.5 Risks

- **Risk:** The inverted ambiguity semantics get read as ordinary semantics by a future author, who then blocks a spike waiting for an answer.
- **Mitigation:** State the inversion twice — in the `<instructions>` block and in the rendered gate block — because instructions are stripped from instances (EPIC-054 architecture rule).
- **Risk:** Granularity Rubric — candidate is a single new file plus its mirror, one goal, no subsystem span. No split signal trips; L2 confirmed.
- **Mitigation:** None needed; recorded for audit.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Spike charter template

  Scenario: Authoring a charter before the answer is known
    Given a maintainer needs to investigate an unknown
    When they draft from .cleargate/templates/spike.md
    Then the document has The Question, Timebox and Kill Criteria, Decision Unblocked, Decision Log, and Outcome
    And no section requires acceptance Gherkin or a files-to-touch list

  Scenario: The ambiguity inversion is stated in the instance
    Given a charter rendered from the template
    When a reader opens the rendered file with the instructions block stripped
    Then the ambiguity gate text still explains that green means a sharp question, not a known answer

  Scenario: Conclusion hands off to an Epic
    Given a charter whose Decision Log is populated
    When the spike concludes
    Then section 5 records spawned_items with at least one work-item id
    And the template instructs the author to move the file to the archive directory

  Scenario: Error - canonical and live drift
    Given the template exists in the live tree
    When the canonical mirror is compared byte-for-byte
    Then the two files are identical
```

### 2.2 Verification Steps (Manual)
- [ ] `diff .cleargate/templates/spike.md cleargate-planning/.cleargate/templates/spike.md` returns no output.
- [ ] The rendered template contains no literal placeholder braces left unfilled in its instruction text.
- [ ] Section order matches §1.2 Requirement 1 exactly.

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit.

| Item | Value |
|---|---|
| Primary File | `.cleargate/templates/spike.md` |
| Related Files | `cleargate-planning/.cleargate/templates/spike.md` |
| Reference (read-only) | `.cleargate/templates/initiative.md`, `.cleargate/templates/hotfix.md` |
| New Files Needed | Yes — both paths above are new |

### 3.2 Technical Logic
Copy the frontmatter sync-attribution block from `.cleargate/templates/initiative.md` verbatim so the stamp engine and conflict detector behave identically for spikes. Take the lightweight body proportions from `.cleargate/templates/hotfix.md` — a charter is closer to a hotfix in length than to an epic. The `<instructions>` block follows the house pattern and ends with `Do NOT output these instructions.`

### 3.3 API Contract (if applicable)
Not applicable — no runtime surface.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 0 | No code ships in this story |
| Structural assertion | 1 | Canonical/live byte-parity check for the new template |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Canonical mirror is byte-identical to the live file.
- [ ] Peer/Architect Review passed.


## Existing Surfaces

> L1 reuse audit. List source-tree implementations the request could extend. Cite file:line.

- **Surface:** `.cleargate/templates/initiative.md` — the lifecycle a spike reuses verbatim: unknown endpoint, concludes by stamping `spawned_items`, moves to archive. Copy its frontmatter sync block.
- **Surface:** `.cleargate/templates/hotfix.md` — the shape reference for a short, single-purpose template with a scoped instructions block.
- **Surface:** `.cleargate/templates/epic.md` — the target the spike hands off to; §5 Outcome names an epic id.
- **Coverage of this story's scope:** partial — the lifecycle and frontmatter are copied from existing templates; the section set itself is net-new because no template models a document whose answer is unknown at draft time.

## Prior work

- [[EPIC-054]] — parent epic, WS1.
- [[BUG-041]] — put `SPIKE` in `TYPE_PREFIXES`, so the id grammar already parses what this template emits.
- No prior item defines a spike charter template. `cleargate wiki query` returned no matches; archive grep found only spikes *performed*, never a spike type.

## Why not simpler?

- **Smallest existing surface that could carry this story:** `.cleargate/templates/initiative.md` — closest lifecycle match, but it is the stakeholder-input artifact and is never pushed, whereas a spike is agent-authored evidence that is.
- **Why isn't extension / parameterization / config sufficient?** Every shipped template is a spec-before-execution contract: it asks for acceptance criteria, a file surface, or a definition of done, and its ambiguity gate must reach green before work starts. A spike inverts all three — the deliverable is the resolution of the ambiguity. Parameterizing an existing template to skip its own gate would produce a document that looks like a Story but silently means the opposite, which is worse than a new file.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path (all confirmed on disk 2026-08-25).
- [x] Why not simpler? has both sub-bullets answered.
