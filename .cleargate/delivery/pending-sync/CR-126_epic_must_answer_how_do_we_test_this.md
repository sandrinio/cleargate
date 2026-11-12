---
cr_id: CR-126
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-11-12T00:00:00Z
context_source: "Direct owner direction 2026-11-12 while reviewing EPIC-063: 'we should have testing strategy also considered when we're working with epics — it has to answer, how do we test this?' Grounded against cleargate-cli main (templates, readiness-gates.md, readiness-predicates.ts) on 2026-11-12."
area: templates,readiness-gates
created_at: 2026-11-12T00:00:00Z
updated_at: 2026-11-12T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-11T23:57:40Z
  transition: ready-to-apply
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-126
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-11T23:12:50Z
  sessions: []
---

# CR-126: Every Epic Must Answer "How Do We Test This?"

## 0.5 Open Questions

- **Question:** Should the requirement apply to the 14 open Draft epics as well as new ones? They will start failing the new criterion on their next edit.
- **Recommended:** Yes. No open epic has been decomposed against a testing strategy, and making them answer before decomposition is the point. Completed epics are never re-gated, so the archive is unaffected.
- **Human decision:** Agreed 2026-11-12: apply to open epics. See Q3 for how this lands on the 7 that already have stories.

- **Question:** Should CRs get the same `Real-host proof` row? The CR template's §4 already declares unit, integration and E2E counts, but nothing about proof in the real host.
- **Recommended:** Not in this CR. Epics first, as asked; a follow-up CR can extend CRs and bugs once the epic format has been used on EPIC-063.
- **Human decision:** Agreed 2026-11-12: not in this CR; a follow-up CR extends the real-host row to CRs and bugs.

- **Question (Q3, found after approval):** 7 of the 14 open epics already have stories (EPIC-031, 047, 048, 058, 059, 060, 061). EPIC-059's stories are in planned SPRINT-42. The new criterion sits on `ready-for-decomposition`, which those 7 have already passed, but `gate check` still evaluates that transition on every edit. How should they be treated, and when are the undecomposed ones reverted to 🔴?
- **Recommended:** The predicate passes, with the detail "decomposed before CR-126", for an epic that already has at least one story file, so SPRINT-42 is not disturbed. The 5 undecomposed epics that are 🟢/🟡 today (EPIC-052, 053, 055, 056, 057) are reverted to 🔴 in the same commit that registers the predicate, not before. EPIC-030 and EPIC-050 are already 🔴.
- **Human decision:** Owner delegated the call on 2026-11-12 ("you make decisions"). Decided as recommended: epics with at least one story file are exempt. EPIC-052, 053, 055, 056 and 057 were reverted to 🔴 the same day rather than at the predicate's commit, so this CR's gate box is literally met now.

- **Question (Q4, owner suggestion 2026-11-12):** "shouldn't we also be capturing journeys in the epic? would help with testing strategy and end to end tests."
- **Recommended:** Yes. Add a `### User journeys` table inside `## Testing Strategy`. Each journey names its actor, its path and its observable end state, plus the end-to-end test or eval that walks it. A journey is what an end-to-end test walks; without one, every story can pass while the flow between them is broken. It is a `###` subsection, not a new `##` section, so the gate's positional `section(n)` indices do not move.
- **Human decision:** Owner raised it on 2026-11-12, and the call was delegated ("make decisions on your own"). Decided as recommended.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- An epic is ready for decomposition without saying how it will be tested. Today the epic template (`cleargate-cli/scaffold/core/.cleargate/templates/epic.md`) has no testing section, and no epic gate criterion asks for one.
- "Tests pass" stands in for "it works". The `test-layers-declared` criterion (CR-111) counts unit, integration and E2E tests on stories, CRs and bugs. It has no row for proof in the real host. It also passes when no layers are declared at all.

**New Logic (The New Truth):**
- Every epic carries a `## Testing Strategy` section, placed after `## 5. Acceptance Criteria` and before `## 6. AI Interrogation Loop`. It answers "how do we test this?":
  - **What "working" means:** the observable outcome in the real host or user flow, never "tests pass".
  - **User journeys table (`### User journeys`):** one row per journey, with columns Journey, Actor, Path (trigger → steps → end), Observable end state and Walked by.
    - *Walked by* names the real-host end-to-end test or eval that walks the whole path.
    - At least one row is required.
    - A single row reading `n/a — <reason>` is valid only for an epic that changes no user- or agent-facing flow, such as a pure internal refactor.
    - The Real-host end-to-end row must cover every journey.
  - **Test levels table:** one row each for Unit, Contract, Integration, Real-host end-to-end and Eval. Each row says what that level proves, where the tests live, and who runs them when. `n/a — <reason>` is a valid answer; an empty cell is not.
  - **Oracle:** how correctness is judged independently of the code under test.
  - **Known-positive / known-negative cases.**
  - **Baseline:** what is measured before work starts, for each success metric.
  - **Release gate:** which levels must pass before release, and who runs any manual step.
  - **Regression guard:** what catches it if this breaks again later.
- A new named predicate, `testing-strategy-complete`, on the epic `ready-for-decomposition` transition (severity enforcing, like the rest of that gate). It fails when:
  - the section is absent;
  - any labelled line is empty or still holds a `{…}` template placeholder;
  - any level row has no "what it proves" cell and no `n/a — <reason>`;
  - the `### User journeys` table is absent or has no row;
  - a journey row has an empty cell or a `{…}` placeholder, unless the whole table is one `n/a — <reason>` row.
  It must fail on the unedited shipped template (BUG-054's rule). Per §0.5 Q3: it passes, with the detail "decomposed before CR-126", for an epic that already has at least one story file.
- The epic Brief gains a `Testing Strategy` line, and the epic Ambiguity Gate gains the checkbox "Testing Strategy answers how we test this, including real-host proof or why it isn't needed".
- At decomposition, each story's `Test layers` table names the epic Testing Strategy level or levels it covers, and the journey step or steps it implements. A journey step that no story implements is a decomposition gap, and it should be raised in the epic Brief. This is template instruction text only, not a new story predicate.

## 2. Blast Radius & Invalidation

- [x] Invalidate/Update Epic: of the 14 open epics, 7 are undecomposed and must answer the new section before decomposition: EPIC-030, 050 (already 🔴), 052, 053, 055, 056, 057 (reverted to 🔴 on 2026-11-12, per Q3). 7 are already decomposed and exempt per Q3: EPIC-031, 047, 048, 058, 059 (in SPRINT-42), 060, 061. [[EPIC-063]] is reshaped into the new section as the first worked example.
- [x] Invalidate/Update Story: none directly. Story templates are unchanged apart from one instruction line.
- [x] Database schema impacts? No.
- [x] Positional gate checks: the epic gate uses `section(3)` (§2 Scope) and `section(8)` (§4 Technical Grounding). Both come before the new section, so their indices are unchanged. `cleargate-cli/test/docs/gate-section-index-pinning.node.test.ts` and its `.live.integration` twin pin template section indices and must be updated deliberately, not loosened.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/core/.cleargate/templates/epic.md:158` (`## 5. Acceptance Criteria`) and `:173` (`## 6. AI Interrogation Loop`). The new section goes between them. `:15` is the POST-WRITE BRIEF list that gains a line.
- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts:26`, `:143-145` and `:204`. Where named predicates are declared, parsed and evaluated (`test-layers-declared` is the model to follow).
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/knowledge/readiness-gates.md`. The predicate vocabulary (entry 11 documents `test-layers-declared`) and the epic `ready-for-decomposition` gate definition that registers the new criterion.
- **Surface:** `cleargate-cli/test/docs/gate-section-index-pinning.node.test.ts`. Pins template section positions.
- **Why this CR extends rather than rebuilds:** the gate engine, the named-predicate pattern and the template-placeholder convention already exist. This adds one section, one predicate following CR-111's shape, and one gate registration. It does not touch `test-layers-declared` itself, so stories, CRs and bugs keep their current rules.

## Prior work

- [[CR-111]] — Declare Test Layers At Planning (archived). Added `test-layers-declared` for story, CR and bug (Unit / Integration / E2E counts, opt-in). This CR adds the epic-level layer above it, with the real-host and eval levels CR-111 lacks.
- [[BUG-054]] — Nine of twelve gate criteria pass on their unedited template (Draft). The new predicate must fail on its own template, and its test proves that.
- [[BUG-066]] — `test_close_pipeline.sh` reports PASS for scenarios that never run (Draft). A concrete "tests pass, behaviour unexercised" case; it motivates the Oracle and Real-host rows.
- [[BUG-113]] — Nothing checks QA-Red's sealed tests against the Test Layers minimums (Triaged). Adjacent: enforcement of declared layers at execution time, out of scope here.
- [[EPIC-056]] — CI verification layer (Draft). Makes tests run independently of the environment, not whether the feature works in the host. Complementary.
- [[EPIC-060]] — Fresh-context review before approval (Draft). A review step; a reviewer would read this section, but it is not a substitute.
- [[EPIC-063]] — Wiki pipeline + awareness layer (Draft). The first epic written with a full verification plan, and the worked example for the new section.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/scaffold/core/.cleargate/templates/epic.md`: add `## Testing Strategy` between §5 and §6, add the Brief line, and add the Ambiguity Gate checkbox and the decomposition instruction.
- `cleargate-cli/scaffold/core/.cleargate/templates/story.md`: one instruction line in the `Test layers` guidance: "name the epic Testing Strategy level(s) this story covers and the journey step(s) it implements".
- `cleargate-cli/src/lib/readiness-predicates.ts`: the `testing-strategy-complete` kind, its parser and its evaluator.
- `cleargate-cli/scaffold/core/.cleargate/knowledge/readiness-gates.md`: vocabulary entry for the predicate, and its registration on the epic `ready-for-decomposition` gate.
- `cleargate-cli/test/docs/gate-section-index-pinning.node.test.ts` (and the `.live.integration` twin if it pins epic indices): updated pins.
- New tests: `cleargate-cli/test/lib/testing-strategy-complete.node.test.ts`.

**Live re-sync after release (meta-repo):** `.cleargate/templates/epic.md`, `.cleargate/templates/story.md`, `.cleargate/knowledge/readiness-gates.md`. Then `cleargate doctor` must exit 0.

## Task Breakdown

- [ ] Write red tests for `testing-strategy-complete`:
  - absent section fails;
  - unedited template fails;
  - a level row with an empty cell fails;
  - `n/a — <reason>` passes;
  - no journey rows fails;
  - a journey row with no "Walked by" fails;
  - a fully filled fixture passes.
- [ ] Implement the predicate kind, parser and evaluator in `readiness-predicates.ts`.
- [ ] Add the section, Brief line, gate checkbox and decomposition instruction to `epic.md`; add the instruction line to `story.md`.
- [ ] Register the criterion in `readiness-gates.md` and document it as a vocabulary entry.
- [ ] Update the section-index pins; run `cleargate gate check` on every current epic before and after, and diff the results.
- [ ] Clean-room run from the packed tarball (required for `scaffold/**` changes): `cleargate new epic` shows the section, and `gate check` fails until it is filled.
- [ ] Reshape EPIC-063's §5 verification plan into the new section as the worked example; confirm it passes.

## 4. Verification Protocol

**Command/Test:** `npm --prefix cleargate-cli test` (node:test, all suites), then `npm --prefix cleargate-cli run typecheck`, then the clean-room run in `.cleargate/knowledge/clean-room-verification.md`.

**How we test this CR (its own testing strategy):**
- **What "working" means:** an agent running `cleargate new epic` in a fresh install gets a template that asks "how do we test this?". The epic cannot pass `ready-for-decomposition` until the section is truly filled in.
- **Unit:** the predicate's seven cases above.
- **Contract:** `gate check` on fixture epics writes `testing-strategy-complete` into `cached_gate_result.failing_criteria` exactly when expected.
- **Regression:** before/after `gate check` over all 52 epics. The only change allowed is the new criterion appearing on open epics; `scope-in-populated` and `affected-files-declared` results are identical.
- **Real host:** the clean-room install from the packed tarball shows the new template and enforces the criterion.
- **Regression guard:** the "fails on its own shipped template" test stays in `npm test` permanently.

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Section absent, section unedited, section partly filled, section complete with `n/a` rows: different routes to pass or fail. |
| Interfaces | T | Two surfaces: `cleargate gate check` (CLI) and the PostToolUse hook that runs it on every edit. |
| Data | F | Behaviour does not vary by data type or volume; the predicate reads one markdown section. |
| Rules | T | Placeholder rule, empty-cell rule, `n/a — <reason>` rule, section-position rule. |

```gherkin
Feature: Every epic must answer "how do we test this?"

  @paths
  Scenario: An epic without a Testing Strategy cannot be decomposed
    Given an epic with no "## Testing Strategy" section
    When `cleargate gate check` runs on it
    Then failing_criteria contains testing-strategy-complete

  @rules
  Scenario: The unedited template fails its own criterion
    Given a fresh epic created by `cleargate new epic` with no edits
    When `cleargate gate check` runs on it
    Then failing_criteria contains testing-strategy-complete

  @rules
  Scenario: An empty level row fails, an explained n/a passes
    Given an epic whose Eval row is empty
    When `cleargate gate check` runs
    Then failing_criteria contains testing-strategy-complete
    And when the Eval row reads "n/a — no agent behaviour changes", the criterion passes

  @rules
  Scenario: Journeys must exist and each must name what walks it
    Given an epic whose Testing Strategy has no "### User journeys" rows
    When `cleargate gate check` runs
    Then failing_criteria contains testing-strategy-complete
    And when a journey row's "Walked by" cell is empty, the criterion still fails
    And when every journey row names its actor, path, end state and walking test, the criterion passes

  @paths
  Scenario: A complete Testing Strategy passes
    Given an epic whose Testing Strategy fills every labelled line and every level row
    When `cleargate gate check` runs
    Then testing-strategy-complete is not among failing_criteria

  @interfaces
  Scenario: The hook path reports the same result
    Given an epic without the section
    When the agent edits it and the PostToolUse hook runs the gate
    Then the epic's cached_gate_result lists testing-strategy-complete

  @rules
  Scenario: Existing positional checks are unaffected
    Given the 52 epics on disk
    When gate check runs before and after this change
    Then scope-in-populated and affected-files-declared results are identical
```

**Test layers.** Declare all three below. `0` is a valid, explicit answer and must carry a reason in the Notes column; an absent row is not a decision.

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 7 | One per predicate case: absent, unedited template, empty row, `n/a — <reason>`, complete, no journey rows, journey without "Walked by". |
| Integration tests | 2 | `gate check` on fixture epics writing `cached_gate_result`; the before/after sweep over all epics. |
| E2E / acceptance tests | 1 | Clean-room install from the packed tarball (`.cleargate/knowledge/clean-room-verification.md`). |

---

## Context Source

**context_source:** Direct owner direction 2026-11-12 during the EPIC-063 review ("it has to answer, how do we test this?"). Grounded in `epic.md`, `readiness-gates.md`, `readiness-predicates.ts` and the section-index pinning tests on cleargate-cli main, 2026-11-12. Duplicate check: `cleargate-wiki-query` found no epic-level testing requirement.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.
