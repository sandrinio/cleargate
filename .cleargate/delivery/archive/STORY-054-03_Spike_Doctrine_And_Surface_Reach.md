---
story_id: STORY-054-03
parent_epic_ref: EPIC-054
parent_cleargate_id: "EPIC-054"
sprint_cleargate_id: "SPRINT-39"
carry_over: false
area: planning-layer
status: Completed
approved: true
ambiguity: 🟢 Low
context_source: EPIC-054 (approved Gate 1 2026-08-25, ambiguity 🟢, gate epic.ready-for-decomposition ✅ 12 criteria), workstream WS3. Decomposed 2026-08-25 for SPRINT-39. Granularity Rubric run at decomposition time — see §1.5.
actor: ClearGate maintainer
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-08-25T12:00:00Z
updated_at: 2026-08-25T19:12:58Z
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
  last_gate_check: 2026-08-25T19:12:58Z
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

# STORY-054-03: Spike doctrine — pre-sprint, never merges, and where guidance reaches
**Complexity:** L2 — prose across four surfaces plus mirrors; no code

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate maintainer, I want spike routing to live on the always-on surface, so that triage can choose a spike before any template is opened.

### 1.2 Detailed Requirements
- Requirement 1: Fix `.cleargate/templates/story.md:27` — the L4 split guidance routes to a SPIKE rather than to "its own story".
- Requirement 2: Add Spike to the triage classification list in `CLAUDE.md:140` and its canonical mirror. This list is load-bearing: triage runs before template selection, so a type absent here is unreachable regardless of template quality.
- Requirement 3: Add a Spike clause to `.claude/skills/sprint-execution/SKILL.md` and mirror, stating that spikes run before sprint kickoff, take no `state.json` slot, get no worktree from the sprint loop, and that prototype code lives on a throwaway `spike/SPIKE-NNN` branch that is discarded and never merged.
- Requirement 4: Add a **Guidance Surface Reach** subsection to `.cleargate/knowledge/cleargate-protocol.md` and mirror, stating which surface reaches which agent at which moment — template `<instructions>` reaches only the drafting agent and is stripped from instances; an agent's own `.md` reaches that executing agent; always-on `CLAUDE.md` reaches pre-template decisions.

### 1.3 Out of Scope
The template (STORY-054-01), type registration (STORY-054-02), and the Task Breakdown rules those surfaces will later carry (STORY-054-06, STORY-054-07).

### 1.4 Open Questions

- **Question:** Should the Guidance Surface Reach subsection live in the protocol or in the enforcement doc?
- **Recommended:** The protocol. It is a delivery rule about authoring surfaces, not a hook-enforced mechanic, and `cleargate-enforcement.md` is documented as the place to read only when a CLI hook surfaces an error.
- **Human decision:** Accepted 2026-08-25 as part of EPIC-054 Gate 1.

### 1.5 Risks

- **Risk:** This story edits `story.md`, which STORY-054-06 also edits.
- **Mitigation:** Merge order is 03 before 06, so 06 rebases on the corrected rubric line. Recorded in the SPRINT-39 merge table.
- **Risk:** `CLAUDE.md` is loaded every session, so added prose has a standing token cost.
- **Mitigation:** Requirement 2 adds one word to an existing list, not a new paragraph. The detail lives in the protocol per Requirement 4.
- **Risk:** Granularity Rubric — four surfaces but one goal (make spike routing reachable), no subsystem span, four scenarios. No split signal trips.
- **Mitigation:** None needed; recorded for audit.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Spike doctrine

  Scenario: Triage can reach the spike type
    Given a request that describes discovery with an unknown endpoint
    When the agent classifies it against the CLAUDE.md triage list
    Then Spike is one of the available classifications

  Scenario: The story rubric routes L4 to a spike
    Given a candidate story whose complexity lands at L4
    When the Granularity Rubric in story.md is applied
    Then the guidance names a SPIKE rather than another story

  Scenario: Spikes stay out of the sprint loop
    Given the sprint-execution skill is loaded
    When a reader asks where a spike runs
    Then the skill states pre-sprint, no state.json slot, no worktree, and prototype code discarded

  Scenario: Error - a rule placed only in a template instructions block
    Given a rule an executing agent needs
    When an author places it solely in a template instructions block
    Then the Guidance Surface Reach subsection identifies that the rule will not reach that agent
```

### 2.2 Verification Steps (Manual)
- [ ] `grep -n "Spike" CLAUDE.md` shows it in the triage classification list.
- [ ] `story.md:27` no longer contains the phrase "as its own story".
- [ ] All four canonical mirrors carry the identical edits.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `.cleargate/knowledge/cleargate-protocol.md` |
| Related Files | `.cleargate/templates/story.md`, `.claude/skills/sprint-execution/SKILL.md`, `CLAUDE.md` |
| Mirrors | `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md`, `cleargate-planning/.cleargate/templates/story.md`, `cleargate-planning/.claude/skills/sprint-execution/SKILL.md`, `cleargate-planning/CLAUDE.md` |
| New Files Needed | No |

### 3.2 Technical Logic
`CLAUDE.md` edits land inside the bounded CLEARGATE block, and the canonical copy is the source the block is injected from — edit canonical, then re-inject or hand-port the live root file, per the dogfood-split rule. The protocol subsection is unnumbered, matching the `## Existing Surfaces` convention EPIC-043 settled, so it does not disturb any `section(N)` index.

### 3.3 API Contract (if applicable)
Not applicable — documentation only.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 0 | Documentation-only story |
| Grep assertions | 3 | Spike present in triage list; story.md:27 rerouted; protocol subsection present |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] All four canonical mirrors updated and parity-diffed.
- [ ] Peer/Architect Review passed.


## Existing Surfaces

> L1 reuse audit. List source-tree implementations the request could extend. Cite file:line.

- **Surface:** `CLAUDE.md` — the triage classification list is the only surface reachable before a template is chosen.
- **Surface:** `.cleargate/templates/story.md` — the Granularity Rubric currently routes L4 splits to "a spike as its own story", the line this story corrects.
- **Surface:** `.claude/skills/sprint-execution/SKILL.md` — the canonical sprint-loop spec, and the right home for the never-merges rule.
- **Surface:** `.cleargate/knowledge/cleargate-protocol.md` — the delivery protocol, and the durable home for Guidance Surface Reach.
- **Surface:** `.cleargate/knowledge/cleargate-enforcement.md` — considered and rejected as the home; it is scoped to hook-enforced mechanics.
- **Coverage of this story's scope:** high — all five surfaces exist and are edited in place. Nothing net-new.

## Prior work

- [[EPIC-054]] — parent epic, WS3.
- [[STORY-054-01]] and [[STORY-054-02]] — supply the template and the type this doctrine points at.
- [[EPIC-043]] — settled the unnumbered-trailing-section convention this story's protocol subsection follows.
- No prior item documents guidance-surface reach or spike routing.

## Why not simpler?

- **Smallest existing surface that could carry this story:** `.cleargate/knowledge/cleargate-protocol.md` — the protocol already carries delivery rules of exactly this kind, so the subsection is an addition to an existing document rather than a new surface.
- **Why isn't extension / parameterization / config sufficient?** Config cannot express it: the constraint is about *where prose is placed so an agent actually reads it*, which no flag or parameter can encode. It also cannot be collapsed into a single location — that is the finding itself. Template instructions are stripped from instances, so a rule needed at both draft and execution time must be written in two places deliberately; a single canonical home would silently fail to reach one of the two audiences.

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
