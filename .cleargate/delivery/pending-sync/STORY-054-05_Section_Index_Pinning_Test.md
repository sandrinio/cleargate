---
story_id: STORY-054-05
parent_epic_ref: EPIC-054
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: planning-layer
status: Draft
approved: true
ambiguity: 🟢 Low
context_source: EPIC-054 (approved Gate 1 2026-08-25, ambiguity 🟢, gate epic.ready-for-decomposition ✅ 12 criteria), workstream WS5. Decomposed 2026-08-25 for SPRINT-39. Granularity Rubric run at decomposition time — see §1.5.
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

# STORY-054-05: Pin every gated section index to the heading it names
**Complexity:** L3 — one test that reimplements the parser's split and pins twelve criteria

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate maintainer, I want every `section(N)` gate criterion pinned to the heading it actually resolves to, so that adding a template heading breaks the build instead of silently redirecting a gate.

### 1.2 Detailed Requirements
- Requirement 1: Add a `*.node.test.ts` under `cleargate-cli/test/` that, for every `{work_item_type, transition}` gate in `readiness-gates.md` using a `section(N)` predicate, resolves the heading at index N in the corresponding template and asserts it matches an expected fixture string.
- Requirement 2: The test must split headings using the same rule as the evaluator — `body.split(/^(?=## )/m)` with the preamble adjustment at `cleargate-cli/src/lib/readiness-predicates.ts:640-650` — so the test cannot drift from the implementation it guards.
- Requirement 3: Failure output must name the criterion id, the expected heading, and the heading actually resolved.
- Requirement 4: The test must pass against the corrected indices delivered by BUG-042, and must fail if any of those three corrections is reverted.
- Requirement 5: `cleargate-cli/src/lib/readiness-predicates.ts` must not be modified. The evaluator's positional semantics are correct and the `story` and `bug` gates depend on them.

### 1.3 Out of Scope
Correcting the drifted indices — that is BUG-042, a hard predecessor. Re-evaluating archived `cached_gate_result` values, which the recorded decision defers to lazy re-check on reopen.

### 1.4 Open Questions

- **Question:** Should the expected headings be a hand-written fixture, or derived?
- **Recommended:** Hand-written fixture. A derived expectation would re-derive the same wrong answer the gate already produces; the whole point is an independent statement of intent.
- **Human decision:** Accepted 2026-08-25 as part of EPIC-054 Gate 1.

### 1.5 Risks

- **Risk:** Authored before BUG-042 merges, the test fails on three criteria and looks broken.
- **Mitigation:** BUG-042 merges first per the SPRINT-39 M0 order. If authored earlier, mark the three as expected failures and flip them in the same commit that lands BUG-042.
- **Risk:** Granularity Rubric — L3 with medium exposure, one goal, one new file plus fixtures. Does not trip the L3-plus-high split signal.
- **Mitigation:** None needed; recorded for audit.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Section-index pinning

  Scenario: Every gated index resolves to its named heading
    Given the shipped templates and readiness-gates.md
    When the pinning test runs
    Then every section predicate resolves to the heading its criterion id names

  Scenario: A reverted correction is caught
    Given the cr sandbox-paths-declared criterion is reverted to section 3
    When the pinning test runs
    Then it fails naming sandbox-paths-declared, the expected heading, and the heading resolved

  Scenario: A new heading is caught
    Given a new "##" heading is inserted above a gated section in any template
    When the pinning test runs
    Then it fails and names every criterion whose resolved heading changed

  Scenario: Error - the test drifts from the evaluator
    Given the evaluator's preamble rule
    When the test computes its own split
    Then it uses the same split expression and preamble adjustment as readiness-predicates.ts
```

### 2.2 Verification Steps (Manual)
- [ ] `npm --prefix cleargate-cli test` green.
- [ ] Temporarily revert one BUG-042 index and confirm the test fails with a named criterion.
- [ ] `git diff cleargate-cli/src/lib/readiness-predicates.ts` is empty.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | New `*.node.test.ts` under `cleargate-cli/test/` |
| Related Files | `.cleargate/knowledge/readiness-gates.md` |
| Reference (read-only, do not edit) | `cleargate-cli/src/lib/readiness-predicates.ts` |
| Templates read | `.cleargate/templates/story.md`, `.cleargate/templates/CR.md`, `.cleargate/templates/Bug.md`, `.cleargate/templates/epic.md`, `.cleargate/templates/initiative.md`, `.cleargate/templates/hotfix.md` |
| New Files Needed | Yes — the test file and its expected-heading fixture |

### 3.2 Technical Logic
Parse the YAML gate blocks out of `readiness-gates.md`, collect every criterion whose check matches `section(<N>)`, then for each one load the matching template, strip its `<instructions>` block and frontmatter to get the body the evaluator sees, split on `/^(?=## )/m`, apply the preamble adjustment, and compare the heading at index N against the fixture. Run via `tsx --test` per the single-runner rule; file named `*.node.test.ts`.

### 3.3 API Contract (if applicable)
Not applicable — test-only.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 1 | The pinning test itself, covering every section criterion in the gate registry |
| Negative tests | 2 | Reverted correction is caught; inserted heading is caught |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] `readiness-predicates.ts` unmodified.
- [ ] Test green against BUG-042's corrected indices.
- [ ] Peer/Architect Review passed.


## Existing Surfaces

> L1 reuse audit. List source-tree implementations the request could extend. Cite file:line.

- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts` — `evalSection` and its preamble handling define the exact semantics this test must reproduce. Read-only.
- **Surface:** `.cleargate/knowledge/readiness-gates.md` — the gate registry the test enumerates.
- **Surface:** `.cleargate/templates/story.md`, `.cleargate/templates/CR.md`, `.cleargate/templates/Bug.md`, `.cleargate/templates/epic.md` — the templates whose headings are pinned.
- **Coverage of this story's scope:** partial — the evaluator and registry exist and are read, but no test asserts the relationship between them today. The test is net-new.

## Prior work

- [[BUG-042]] — hard predecessor. It supplies the three index corrections this test pins; the two items are two halves of one deliverable.
- [[EPIC-054]] — parent epic, WS5.
- [[BUG-041]] — same failure class: a check that is correct for the one case it was written against and silently wrong elsewhere, failing green.
- [[EPIC-052]] — will add a `## Grounding` heading to five templates and re-shift indices; this test is the permanent guard.

## Why not simpler?

- **Smallest existing surface that could carry this story:** none — net-new abstraction required. No existing test asserts any relationship between the gate registry and the templates it indexes into.
- **Why isn't extension / parameterization / config sufficient?** A comment in `readiness-gates.md` warning authors to recount headings is the config-shaped alternative, and it is exactly what failed: the two drifted criteria were written by authors who believed they were counting correctly. The defect is silent and green, so only an executing check catches it. Parameterizing the evaluator to resolve by printed ordinal was the considered alternative and was rejected in BUG-042 — it would break the story and bug gates, which are correct today precisely because they are positional.

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
