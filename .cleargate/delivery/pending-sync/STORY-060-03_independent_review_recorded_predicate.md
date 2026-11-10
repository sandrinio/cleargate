---
story_id: STORY-060-03
parent_epic_ref: EPIC-060
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-10-28T00:00:00Z
ambiguity: 🟢 Low
context_source: "EPIC-060 §2 (machine check). Modelled on prior-work-recorded (STORY-051-07): evaluator cleargate-cli/src/lib/readiness-predicates.ts:1075, dispatch case :198, vocabulary entry 8 in readiness-gates.md. Gotchas from FLASHCARD.md 2026-09-25 #gate #worktree (predicate registered in a worktree poisons delivery edits until merge + BD), #readiness-gates (two epic yaml blocks; key on transition), #test-harness #gate (gate.ts turns a predicate throw into a failing criterion). EPIC-060 §6 Q1 (the item types the predicate is registered for) answered by the owner 2026-10-28."
actor: cleargate gate check (and the stamp-and-gate hook)
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: low
lane: standard
area: readiness-gates
db_write_set: []
deferred_verification: []
created_at: 2026-10-28T00:00:00Z
updated_at: 2026-10-28T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-10-28T06:59:15Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-060-03
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-10-28T10:56:57Z
  sessions: []
---

# STORY-060-03: `independent-review-recorded` Readiness Predicate
**Complexity:** L2 — one closed-set predicate modelled on an existing one, two gate registrations, one vocabulary entry, one test file.

## 1. The Spec (The Contract)

### 1.1 User Story
As the owner approving an epic or CR, I want the gate to fail when the draft's `## Independent review` section was never filled in, so that the Gate-1 review is checked by the tool and not by trust.

### 1.2 Detailed Requirements
**Prerequisite:** STORY-060-02 is merged. Its requirement 4 adds the `## Independent review` placeholder to `CR.md`, which scenario 3 scaffolds and which requirement 2 must reject. The owner accepted the answer to EPIC-060 §6 Q1 (epic and CR gates) on 2026-10-28; requirement 3 follows it.

1. **Predicate.** Add the closed-set predicate `independent-review-recorded` (no parameters) to `cleargate-cli/src/lib/readiness-predicates.ts`: a union member, a parse case, a dispatch case and an `evalIndependentReviewRecorded(doc)` evaluator next to `evalPriorWorkRecorded`.
2. **Semantics.** Locate the section whose heading title is `Independent review` (via `headingTitleOf`, so numbering is tolerated).
   - Section absent → **pass**: grace for items written before the template had the section.
   - Section present → **pass** if it holds at least one *reviewer line*, `^- [a-z0-9-]+: \S`, or one *waiver line*, `^- waived by owner: [^<\s]`.
   - Otherwise → **fail**, detail: `'## Independent review' records no reviewer result and no owner waiver`.
   - Both regexes are anchored at column 0. Indented sub-bullets, such as STORY-060-02's `  - contested: … — evidence: …` lines, are neither required nor counted.
   - The exact placeholder line from STORY-060-02 requirement 4 must fail: it starts with `- <`, and its waiver text is not at the start of a bullet.
3. **Registration.** In `cleargate-cli/scaffold/core/.cleargate/knowledge/readiness-gates.md`, add `- id: independent-review-recorded / check: "independent-review-recorded"` to the `epic / ready-for-decomposition` block and the `cr / ready-to-apply` block. No other item type.
4. **Vocabulary.** Document it as the next numbered Predicate Vocabulary entry, in the same shape as entry 8 (`prior-work-recorded`).

### 1.3 Out of Scope
- Checking that the recorded counts are true, or that the reviewers really ran. The token ledger is the evidence for that.
- Registering the predicate for stories, bugs or any other type.
- Changing `prior-work-recorded` or the section-locating helper.

### 1.4 Open Questions

- **Question:** Which item types is it registered for? (EPIC-060 §6 Q1)
- **Recommended:** epic `ready-for-decomposition` and CR `ready-to-apply`, matching the types STORY-060-02 reviews. §1.2 is written to this answer.
- **Human decision:** Accepted 2026-10-28 (owner) at the EPIC-060 Brief.

### 1.5 Risks

- **Risk:** An author can skip the check by deleting the section (absent passes), the same weakness `prior-work-recorded` accepts.
- **Mitigation:** The template ships the section, so a fresh draft fails until it is filled. Removing a template section is visible in review.
- **Risk:** `readiness-gates.md` has two `epic` blocks; a match on `work_item_type` alone edits the wrong one (FLASHCARD 2026-09-25 `#readiness-gates`).
- **Mitigation:** Register under the block whose `transition` is `ready-for-decomposition`; scenario 5 asserts which transition carries it.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Three passing paths: section absent, reviewer line, waiver line. |
| Interfaces | F | One surface: the predicate evaluator, reached through `gate check`. |
| Data | T | Line shapes vary (reviewer, waiver, placeholder); a Scenario Outline covers them. |
| Rules | T | The rule that a template placeholder never passes. |

```gherkin
Feature: independent-review-recorded readiness predicate

  @paths
  Scenario: A document without the section passes
    Given an epic body with no ## Independent review section
    When independent-review-recorded is evaluated
    Then it passes

  @data
  Scenario Outline: Section content decides the result
    Given an epic body whose ## Independent review section contains "<line>"
    When independent-review-recorded is evaluated
    Then the result is <result>

    Examples:
      | line                                                         | result |
      | - cleargate-review-simplicity: 2 findings — 2 fixed          | pass   |
      | - cleargate-review-clarity: no findings                      | pass   |
      | - waived by owner: one-line CR, reviewed in chat             | pass   |
      | - <one line per reviewer: "<agent>: no findings"; or "waived by owner: <reason>"> | fail |

  @data
  Scenario: An indented sub-bullet alone does not count
    Given an epic body whose ## Independent review section's only line is a contested sub-bullet indented by two spaces
    When independent-review-recorded is evaluated
    Then it fails

  @rules
  Scenario: Error — the untouched template placeholder fails with a named detail
    Given a CR scaffolded by cleargate new with its ## Independent review placeholder untouched
    When cleargate gate check runs on it
    Then independent-review-recorded fails
    And the detail reads "'## Independent review' records no reviewer result and no owner waiver"

  @paths
  Scenario: The predicate is registered only on the epic and CR gates
    Given the canonical readiness-gates.md
    When its yaml gate blocks are parsed
    Then independent-review-recorded appears in epic ready-for-decomposition and cr ready-to-apply
    And it appears in no other block
    And the Predicate Vocabulary has a numbered entry for it
```

### 2.2 Verification Steps (Manual)
- [ ] After merge and `dist` rebuild, run `node cleargate-cli/dist/cli.js gate check` on one existing pending-sync epic without the section (expect pass) and one scratch epic with the placeholder (expect fail).

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/lib/readiness-predicates.ts` |
| Related Files | `cleargate-cli/scaffold/core/.cleargate/knowledge/readiness-gates.md`, `cleargate-cli/test/lib/readiness-predicates-independent-review.node.test.ts` |
| New Files Needed | Yes — `cleargate-cli/test/lib/readiness-predicates-independent-review.node.test.ts` |

### 3.2 Technical Logic
Copy the `prior-work-recorded` structure exactly: union member (line 23), parse branch (lines 128–130), dispatch case (line 198), evaluator next to `evalPriorWorkRecorded` (line 1075), using the same `body.split(/^(?=## )/m)` plus `headingTitleOf` section locator. Match the two line regexes line by line inside the section, with the `m` flag. The test follows `test/lib/readiness-predicates-prior-work-ambiguity.node.test.ts`. Assert pass or fail, not only the criterion id: `gate.ts` turns a throw into a failing criterion, so an id-only assertion passes even with the evaluator missing (FLASHCARD 2026-09-25 `#test-harness #gate`).

### 3.3 API Contract (if applicable)
Not applicable.

## Task Breakdown

- [ ] Add the union member, parse branch, dispatch case and evaluator to `readiness-predicates.ts`.
- [ ] Write `test/lib/readiness-predicates-independent-review.node.test.ts` covering scenarios 1–4.
- [ ] Register the predicate in the two canonical `readiness-gates.md` blocks and add the vocabulary entry.
- [ ] Add the registration test for scenario 5.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 8 | Scenario 1, four Outline rows, the indented sub-bullet scenario, the placeholder error scenario and the registration scenario. |
| Integration tests | 0 | No database or Redis involved. |
| E2E / acceptance tests | 0 | Scenario 3 runs `gate check` against a temp fixture inside the unit file; the post-merge check is manual (§2.2). |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.
- [ ] `npm run typecheck` clean and `npm test` green in `cleargate-cli/`.
- [ ] Live `.cleargate/knowledge/readiness-gates.md` updated only after the evaluator is merged and `dist` is rebuilt. Registering it earlier makes every delivery edit fail on an unknown predicate (FLASHCARD 2026-09-25 `#gate #worktree`).

## Existing Surfaces

- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts:1075` — `evalPriorWorkRecorded`, the model evaluator.
- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts:198` — the predicate dispatch switch.
- **Surface:** `cleargate-cli/test/lib/readiness-predicates-prior-work-ambiguity.node.test.ts` — the model test file.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/knowledge/readiness-gates.md` — gate blocks and Predicate Vocabulary.
- **Coverage of this requirement:** ≥80% extension. Same structure as `prior-work-recorded`, with a different section and different line patterns.

## Prior work

- [[CR-033]] — the Reuse Audit predicates; the same pattern of turning a template section into a machine check.
- [[EPIC-008]] — the readiness gate engine this predicate plugs into.
- A predicate on independent review: none found.

## Why not simpler?

- **Smallest existing surface that could carry this:** a generic `body contains '## Independent review'` criterion, which the vocabulary already supports.
- **Why isn't extension / parameterization / config sufficient?** A section-exists check passes on the untouched template placeholder, so it proves nothing. Telling a filled section from the placeholder needs the line patterns, which the generic vocabulary cannot express. `prior-work-recorded` is a dedicated predicate for the same reason.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered (no "TBD" / no "{}").
