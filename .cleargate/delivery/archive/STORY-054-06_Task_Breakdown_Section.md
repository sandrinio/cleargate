---
story_id: STORY-054-06
parent_epic_ref: EPIC-054
parent_cleargate_id: "EPIC-054"
sprint_cleargate_id: "SPRINT-39"
carry_over: false
area: planning-layer
status: Completed
approved: true
ambiguity: 🟢 Low
context_source: EPIC-054 (approved Gate 1 2026-08-25, ambiguity 🟢, gate epic.ready-for-decomposition ✅ 12 criteria), workstream WS6. Decomposed 2026-08-25 for SPRINT-39. Granularity Rubric run at decomposition time — see §1.5.
actor: ClearGate maintainer
complexity_label: L3
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

# STORY-054-06: Task Breakdown section in Story, CR and Bug
**Complexity:** L3 — one section into three templates and three mirrors, plus one gate criterion and its index update

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate maintainer, I want an L3 work item to carry its execution sequence in the item itself, so that the breakdown survives the sprint instead of dying with the milestone plan.

### 1.2 Detailed Requirements
- Requirement 1: Add a `## Task Breakdown` section to `.cleargate/templates/story.md`, `.cleargate/templates/CR.md` and `.cleargate/templates/Bug.md`, plus all three `cleargate-planning/` mirrors.
- Requirement 2: Row shape is `- [ ] <action>` with an optional trailing `-> <requirement-id>` reference. The requirement reference is reserved-but-empty: it ships now so that landing EPIC-052 WS1 does not force a second pass over these six files.
- Requirement 3: The section is **required at L3 and above, optional at L2, omitted at L1.** This preserves the Granularity Rubric's bias toward splitting rather than legitimising fat stories, and the rule is stated in each template's `<instructions>` block.
- Requirement 4: Placement is semantic — in `story.md`, directly after §3 The Implementation Guide — and every `section(N)` index in `readiness-gates.md` that shifts as a result is updated in the same commit.
- Requirement 5: Add a `task-breakdown-complete` gate criterion that passes on absence. Every existing Story, CR and Bug lacks the section, so absence must not fail, matching how `existing-surfaces-verified` treats a missing section.
- Requirement 6: STORY-054-05's pinning test must be green after this story's index updates.

### 1.3 Out of Scope
Making the Architect write the rows or QA check them — that is STORY-054-07. Any `task` work-item type, id, or push. Retrofitting the section into archived items.

### 1.4 Open Questions

- **Question:** Semantic placement shifts gate indices; would appending at the end of the body be safer?
- **Recommended:** Semantic placement plus same-commit index updates. Appending would put an execution checklist below the ambiguity gate where no author would look, and STORY-054-05's test makes the index update safe.
- **Human decision:** Accepted 2026-08-25 as part of EPIC-054 Gate 1.

### 1.5 Risks

- **Risk:** This story shifts `section(N)` indices in three gated templates at once.
- **Mitigation:** STORY-054-05 and BUG-042 are hard predecessors; the pinning test adjudicates every shift and names any criterion that moved. **This is why the exposure below is `med` and not `high`.**
- **Risk:** Granularity Rubric — L3, three templates, six files. The rubric's L3-plus-high split signal was evaluated and **does not trip**, because sequencing behind STORY-054-05 converts the index risk into a build break. Splitting into a `story.md` half and a `CR/Bug` half was considered and rejected: the two halves would touch the same `readiness-gates.md` and carry overlapping scenarios, which is the rubric's explicit *merge* signal.
- **Mitigation:** Recorded for audit; revisit only if STORY-054-05 slips out of the sprint.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Task Breakdown section

  Scenario: An L3 story carries its sequence
    Given a story whose complexity label is L3
    When it is drafted from the template
    Then it contains a Task Breakdown section with at least one unchecked task row

  Scenario: An L1 story omits the section
    Given a story whose complexity label is L1
    When it is drafted from the template
    Then the Task Breakdown section is absent and the gate still passes

  Scenario: A legacy item passes on absence
    Given an archived story written before this story shipped
    When its readiness gate is evaluated
    Then the task-breakdown criterion passes on absence
    And no previously recorded gate result changes

  Scenario: The reserved requirement reference is accepted
    Given a task row carrying a trailing requirement reference
    When the item is gate-checked
    Then the row is accepted and the reference is not otherwise interpreted

  Scenario: Error - a shifted index is not updated
    Given the new heading shifts a gated section index
    When the pinning test from STORY-054-05 runs
    Then it fails and names the criterion whose resolved heading changed
```

### 2.2 Verification Steps (Manual)
- [ ] `cleargate gate check` on an archived Story, CR and Bug each still passes.
- [ ] All three mirrors parity-diff clean.
- [ ] `npm --prefix cleargate-cli test` green, including STORY-054-05's pinning test.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `.cleargate/templates/story.md` |
| Related Files | `.cleargate/templates/CR.md`, `.cleargate/templates/Bug.md`, `.cleargate/knowledge/readiness-gates.md` |
| Mirrors | `cleargate-planning/.cleargate/templates/story.md`, `cleargate-planning/.cleargate/templates/CR.md`, `cleargate-planning/.cleargate/templates/Bug.md`, `cleargate-planning/.cleargate/knowledge/readiness-gates.md` |
| cleargate-cli (added 2026-08-28, M2 plan) | `cleargate-cli/src/lib/readiness-predicates.ts`, `cleargate-cli/test/lib/readiness-predicates-prior-work-ambiguity.node.test.ts` |
| New Files Needed | Yes — `cleargate-cli/test/lib/readiness-predicates-task-breakdown.red.node.test.ts` (§4.1 asks for 2 unit tests; none is authorable in the outer repo) |

**§3.1 AMENDMENT (orchestrator, 2026-08-28 — M2 plan finding).** The eight outer paths above
were correct and complete for the surface-gated commit. **The entire `cleargate-cli` half was
missing**, and Requirement 5 is unimplementable without it:

| # | Site | Why it is not optional |
|---|---|---|
| 1 | `cleargate-cli/src/lib/readiness-predicates.ts` | `task-breakdown-complete` must be a **named** predicate. R5's "passes on absence" is inexpressible as `section(N)` — `evalSection` returns a hard *"section N not found"* — and a `section(N)` form would require editing `evalSection`, which **Cross-Cutting Rule 3 freezes sprint-wide**. Model on `evalPriorWorkRecorded` (`:995-1044`), one of three existing named predicates that pass on absence. Also add the vocabulary entry. |
| 2 | `cleargate-cli/test/lib/readiness-predicates-task-breakdown.red.node.test.ts` (NEW) | §4.1 demands 2 unit tests. QA-Red authors it; `evaluate('task-breakdown-complete', …)` throws `unsupported predicate shape` from `parsePredicate:135` — a genuine non-vacuous red at the assertion line. |
| 3 | `cleargate-cli/test/lib/readiness-predicates-prior-work-ambiguity.node.test.ts` | **Four stale sites** that go *stale-green*, not red — it builds its bodies as in-test string arrays (`:220-262`, `:363-385`) so it can never fail. `:214-219` comment, `:274` title, `:356` title, and `:390-393`'s "documents nine shapes" (becomes ten). `:275`/`:388` evaluate `section(4) has >=1 listed-item` — the exact check `dod-declared` carries today — against a synthetic body that reads neither template nor registry, so it **impersonates a witness it never was**. Retitle both to name the synthetic body; point at S1b as the real witness. |

**Not in §3.1 by design:** `cleargate-planning/MANIFEST.json` (4 rows: `:202`, `:426`, `:433`, `:489`)
is regenerated and staged by **DevOps post-merge**, whitelisted at `surface-whitelist.txt:12`.

**Execution route:** MAIN CHECKOUT on `sprint/S-39`. A worktree is impossible — `cleargate-cli`
is its own git repo with **zero tracked files** in the outer repo (BUG-046), so it does not
materialise in one. Two commits, **cli first, outer second**.

**Registry value that moves: exactly one.** `story.dod-declared` `section(4)`→`section(5)` at
`readiness-gates.md:149`, both trees. Forgetting it reds **three** tests — S1b, S3a **and** S3b
(S3a/S3b assert an exact finding *count* and break on pollution with a message that reads like a
`CR.md` problem) — plus the manual `test_template_gate_correctness.red.sh` T2-D outside the suite.

### 3.2 Technical Logic
Insert the section, then recompute the affected `section(N)` indices using the same split rule the evaluator uses and update `readiness-gates.md` in the same commit. In `story.md` the insertion after §3 moves `## 4. Quality Gates` from index 4 to index 5, so `dod-declared` must move with it. Re-run STORY-054-05's pinning test as the adjudicator rather than recounting by eye — recounting by eye is how the two drifted criteria in BUG-042 were born. The new criterion passes on absence, so it is a presence-conditional check, not a required-section check.

### 3.3 API Contract (if applicable)
Not applicable — template and gate-registry surface only.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 2 | Criterion passes on absence; criterion evaluates rows when present |
| Regression tests | 1 | STORY-054-05's pinning test green after the index updates |
| Acceptance tests | 3 | L3 requires, L1 omits, legacy passes |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Pinning test green; no archived item's gate outcome changed.
- [ ] All three template mirrors parity-diffed clean.
- [ ] Peer/Architect Review passed.


## Existing Surfaces

> L1 reuse audit. List source-tree implementations the request could extend. Cite file:line.

- **Surface:** `.cleargate/templates/story.md` — the `## Existing Surfaces` and `## Prior work` sections establish the unnumbered-trailing-section convention this section follows.
- **Surface:** `.cleargate/templates/CR.md` and `.cleargate/templates/Bug.md` — the other two gated templates receiving the section.
- **Surface:** `.cleargate/knowledge/readiness-gates.md` — the gate registry gaining one criterion and losing three stale indices.
- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts` — the closed-set predicate evaluator; the new criterion reuses the existing `unchecked-checkbox` and `section` predicate kinds unchanged.
- **Coverage of this story's scope:** high — roughly 80% extension. The section convention, the predicate vocabulary and the gate registry all exist; only the section text and one criterion are new.

## Prior work

- [[EPIC-054]] — parent epic, WS6.
- [[STORY-054-05]] and [[BUG-042]] — hard predecessors. This story shifts indices; those two make the shift safe.
- [[EPIC-052]] — adds `## Grounding` with stable `R` ids to the same six template files. The reserved requirement reference here is what lets the two compose instead of colliding. The two must not run in overlapping sprints.
- [[STORY-054-03]] — also edits `story.md`; merges first so this story rebases on the corrected rubric line.

## Why not simpler?

- **Smallest existing surface that could carry this story:** `.cleargate/templates/story.md` — the template already carries unnumbered trailing sections with gate criteria attached, so this is one more of an established kind.
- **Why isn't extension / parameterization / config sufficient?** A work-item type was the alternative and was rejected on evidence: `state.json` keys execution on `stories` alone, so a second unit would have to grow through worktree cutting, dispatch markers, ledger attribution, the lane rubric and the wave planner — an epic's worth of change for a checklist. Config cannot express it either, because the artifact does not exist yet; there is no section for a flag to toggle. A template section is the smallest form that makes the sequence durable and machine-checkable.

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
