---
story_id: STORY-043-02
parent_epic_ref: EPIC-043
parent_cleargate_id: EPIC-043
sprint_cleargate_id: SPRINT-33
carry_over: false
area: cli,gates,predicates
status: Draft
approved: true
ambiguity: 🟢 Low
complexity_label: L3
parallel_eligible: y
context_source: |
  EPIC-043 §2 WS6 — "Template/gate heading reconciliation (recurring self-inflicted
  bug)." The readiness predicates in cleargate-cli/src/lib/readiness-predicates.ts
  match the Existing-Surfaces / Why-not-simpler headings by LITERAL substring
  ("## Existing Surfaces") and by POSITIONAL ## count, so any numbered or differently
  leveled heading silently fails the gate. Flashcarded 2026-05-02 and 2026-05-29
  (FLASHCARD entry 41); it has bitten EPIC-030/031/032/033, STORY-033-01, and
  EPIC-043 itself. This story is the durable predicate-side fix: anchor on heading
  TEXT regardless of leading number or H-level.
created_at: 2026-06-01T12:00:00Z
updated_at: 2026-05-31T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-31T21:38:52Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-043-02
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-31T21:38:51Z
  sessions: []
---

# STORY-043-02: Readiness Predicate Heading-Text Anchoring

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate author drafting an Epic, Story, CR, or Bug from a shipped template, I want the readiness predicates to recognize the reuse-audit and right-size sections by their heading TEXT — regardless of a leading number (`## 3.5 Existing Surfaces`) or H-level — so that template numbering can never silently fail `cleargate gate check` and force a hand-fix on every single document.

### 1.2 Detailed Requirements
- In `cleargate-cli/src/lib/readiness-predicates.ts`, stop matching the Existing-Surfaces / Why-not-simpler headings by literal substring and stop counting `##` positionally where heading identity is what matters. Anchor on heading TEXT.
- `evalBodyContains` (the evaluator behind `reuse-audit-recorded` = `body contains '## Existing Surfaces'` and `simplest-form-justified` = `body contains '## Why not simpler?'`) must treat the needle as a HEADING TITLE when it begins with `## ` followed by a known section title. A heading line matches when, after stripping any leading `#` run and any leading numeric prefix (e.g. `3.5 `, `1. `), its remaining text equals the target title. Recognized titles: `Existing Surfaces`, `Why not simpler?`, `Technical Grounding`, `Reproduction Protocol`.
- A heading title match is independent of H-level: `## Existing Surfaces`, `### Existing Surfaces`, and `## 3.5 Existing Surfaces` all match the `body contains '## Existing Surfaces'` needle.
- Plain (non-heading) needles — anything whose first non-space characters are not `#` — keep the existing literal substring behaviour unchanged (no regression to `body contains 'STORY-'`, `body contains 'Scenario:'`, etc.).
- The `existing-surfaces-verified` locator inside `evalExistingSurfacesVerified` must stop using `part.startsWith("## Existing Surfaces")` and instead select the section whose heading TEXT (after stripping `#` run + numeric prefix) equals `Existing Surfaces`, so a numbered/releveled heading still routes the path-existence audit to the right section.
- Anchoring uses a single shared helper (e.g. `headingTitleOf(line)` returning the normalized title or `null`) reused by both `evalBodyContains` and `evalExistingSurfacesVerified` — one definition, not two divergent regexes.
- Numeric-prefix tolerance covers the forms the templates actually ship: `N `, `N. `, `N.N `, `N.N.N ` (e.g. `0.5`, `3.5`, `3.6`).
- Extend the predicate unit tests in `cleargate-cli/test/lib/readiness-predicates.node.test.ts` to cover: numbered heading matches, releveled (`###`) heading matches, plain-substring needles still literal, and the `existing-surfaces-verified` locator finding a numbered `## 3.5 Existing Surfaces` section.

### 1.3 Out of Scope
- De-numbering the epic/story/CR/Bug templates themselves — the durable fix is predicate-side anchoring (WS6 explicitly picks one approach; this story picks the predicate side). Template edits, if any, are a separate WS8(c) Bug-template concern.
- Adding new predicate SHAPES to the closed set (still exactly 7). This story changes how two existing evaluators *resolve a heading*, not the parser grammar.
- The positional `section(N)` numeric-index semantics for `implementation-files-declared`/`dod-declared`/`blast-radius-populated` — those remain positional by design; this story only fixes the TEXT-anchored heading locators, not the positional counters.
- Any change to `mcp/` or `admin/`.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Readiness predicate heading-text anchoring

  Scenario: Numbered Existing-Surfaces heading passes the reuse audit
    Given a document whose body contains the heading "## 3.5 Existing Surfaces"
    When the predicate "body contains '## Existing Surfaces'" is evaluated
    Then it passes because the heading title matches after stripping the numeric prefix

  Scenario: Releveled Why-not-simpler heading passes
    Given a document whose body contains the heading "### Why not simpler?"
    When the predicate "body contains '## Why not simpler?'" is evaluated
    Then it passes because the heading title matches regardless of H-level

  Scenario: existing-surfaces-verified routes to a numbered section
    Given a document whose only reuse section is "## 3.5 Existing Surfaces" citing a real path
    When the predicate "existing-surfaces-verified" is evaluated
    Then the locator selects that numbered section and verifies its cited paths

  Scenario: Plain substring needle stays literal and Errors are avoided
    Given a document body containing the bare string "Existing Surfaces" inside a prose paragraph but no matching heading
    When the predicate "body contains '## Existing Surfaces'" is evaluated
    Then it fails because heading-title anchoring requires a real heading line, not prose, and no false positive Error is suppressed

  Scenario: Non-heading needle Error path is unchanged
    Given the predicate "body contains 'Scenario:'" whose needle does not start with "##"
    When it is evaluated against a body lacking that string
    Then it fails with the existing literal-substring behaviour and no heading-anchoring logic runs
```

### 2.2 Verification Steps (Manual)
- [ ] Author an Epic from `templates/epic.md` keeping the numbered `## 3.5 Existing Surfaces` / `## 3.6 Why not simpler?` headings; run `cleargate gate check` and confirm `reuse-audit-recorded` + `simplest-form-justified` + `existing-surfaces-verified` all pass with no hand-fix.
- [ ] Run `node --test --import tsx/esm cleargate-cli/test/lib/readiness-predicates.node.test.ts` and confirm the new cases are green.
- [ ] Confirm an existing 🟢 Epic with un-numbered headings (e.g. EPIC-043 itself) still passes the gate (no regression on the plain-heading path).
- [ ] Confirm a plain non-heading needle (`body contains 'STORY-'`) still resolves by literal substring (no behaviour change).

## 3. The Implementation Guide

### 3.1 Context & Files

- `cleargate-cli/src/lib/readiness-predicates.ts` — the single source file this story changes. Add a shared `headingTitleOf(line)` helper; rework `evalBodyContains` (around L345) to use heading-title anchoring when the needle is a heading; rework the locator loop in `evalExistingSurfacesVerified` (the `part.startsWith("## Existing Surfaces")` check around L720) to match by normalized heading text.
- `cleargate-cli/test/lib/readiness-predicates.node.test.ts` — extend with the new heading-anchoring cases (numbered, releveled, plain-substring-unchanged, numbered-section locator).

### 3.2 Technical Logic
1. Add `headingTitleOf(line: string): string | null`: trim the line; if it does not start with `#`, return `null`; strip the leading `#`+ run and following spaces; strip an optional leading numeric prefix matching `^\d+(\.\d+)*\.?\s+`; return the remaining text trimmed (so `## 3.5 Existing Surfaces` → `Existing Surfaces`, `### Why not simpler?` → `Why not simpler?`).
2. In `evalBodyContains`: detect a heading needle by testing the needle with `headingTitleOf`. If the needle is itself a heading (e.g. `## Existing Surfaces` → title `Existing Surfaces`), scan body lines, computing `headingTitleOf` per line, and count a match when a line's title equals the needle's title. Present/absent then feeds the existing negated/positive branch and the same `detail` shape (occurrence count + `§` section context). If the needle is NOT a heading, fall through to today's literal `indexOf` substring scan untouched.
3. In `evalExistingSurfacesVerified`: replace the `part.startsWith("## Existing Surfaces")` test in the `for (const part of rawParts)` loop with a check that the part's first line's `headingTitleOf` equals `"Existing Surfaces"`. Everything downstream (PATH_RE extraction, sandbox + existence check, sentinel handling) is unchanged.
4. Keep the closed-set parser (`parsePredicate`) and the 7 predicate shapes intact — no grammar change; only the two evaluators' heading resolution changes.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests (new) | 4 | numbered-heading match, releveled-heading match, plain-substring-unchanged, numbered-section `existing-surfaces-verified` locator |
| Regression tests (existing) | all green | full `readiness-predicates.node.test.ts` suite stays passing |
| Gate parity check | 1 | a template-authored Epic with numbered headings passes `gate check` with zero hand-fixes |

### 4.2 Definition of Done (The Gate)
- [ ] `headingTitleOf` helper added and reused by both `evalBodyContains` and `evalExistingSurfacesVerified` (one definition).
- [ ] `evalBodyContains` matches heading needles by normalized title (number/level tolerant); plain needles stay literal.
- [ ] `evalExistingSurfacesVerified` locator selects the Existing-Surfaces section by heading text, not `startsWith`.
- [ ] New unit tests for numbered, releveled, plain-substring-unchanged, and numbered-section-locator cases pass.
- [ ] Full `cleargate-cli` test suite green; `npm run typecheck` clean.
- [ ] An Epic authored from the numbered template passes `cleargate gate check` with no hand-fix (retires FLASHCARD entry 41).

## Existing Surfaces

> L1 reuse audit. All paths verified by read on 2026-06-01.

- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts` — `evalBodyContains` (function at L345) does a literal `body.indexOf(needle)` scan, so a numbered `## 3.5 Existing Surfaces` heading never satisfies the `body contains '## Existing Surfaces'` needle used by `reuse-audit-recorded` / `simplest-form-justified`. This is the primary surface this story reworks.
- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts` — `evalExistingSurfacesVerified` locator uses `part.startsWith("## Existing Surfaces")` (the loop in the `existing-surfaces-verified` evaluator), so a numbered/releveled heading routes the path-existence audit to the wrong (absent) section. Reworked to match by heading text.
- **Surface:** `cleargate-cli/test/lib/readiness-predicates.node.test.ts` — existing predicate unit test file; extended with heading-anchoring cases (no new test harness introduced).
- **Coverage of this story's scope by existing surfaces:** ~100% — the fix is an in-place rework of two evaluators in one existing module plus its existing test file. No net-new module, command, or predicate shape.

## Why not simpler?

- **Smallest existing surface:** the two heading-resolving evaluators already living in `cleargate-cli/src/lib/readiness-predicates.ts` (`evalBodyContains` + `evalExistingSurfacesVerified`). Both are edited in place; no new file is created beyond test additions.
- **Why isn't extension/config sufficient?** The bug is a hardcoded literal/positional assumption inside the evaluators — there is no config knob for "tolerate a numeric heading prefix," and the templates legitimately ship numbered headings. A config flag would just move the fragility; the durable fix is to make the matcher anchor on heading text once, in the shared helper, so neither numbering nor H-level can ever break the gate again.

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low**

*Evaluate each criterion against its literal text.*

Requirements met to reach Green (Ready for Execution):
- [x] Gherkin scenarios cover §1.2 (heading match numbered, releveled, locator, plain-substring-unchanged, Error path).
- [x] §3 Implementation Guide maps to specific, verified file paths (one source file + its test file).
- [x] No "TBDs" exist anywhere in the specification.
- [x] §Existing Surfaces cites real source-tree paths verified on disk.
- [x] §Why not simpler? both sub-bullets answered.
- [x] Story is scoped to WS6 only — touches no other story's files.
