---
cr_id: CR-112
parent_ref: EPIC-054
parent_cleargate_id: EPIC-054
sprint_cleargate_id: SPRINT-39
carry_over: true
area: planning-layer
status: Draft
approved: false
ambiguity: 🟡 Medium
context_source: verified codebase grounding — the corpus measurement was executed during the STORY-054-06 post-flight (SPRINT-39 wave6) with the real exported `evaluate()` over all 231 authored STORY-*.md in pending-sync + archive, against both the pre- and post-054-06 registries; the registry-wide vacuity census was executed during the STORY-054-01 post-flight. Filed per the STORY-054-07 post-flight dispatch's Part A3 instruction, which converts M2 plan §Open decisions
created_at: 2026-08-28T00:00:00Z
updated_at: 2026-08-28T00:00:00Z
created_at_version: a1250ad0
updated_at_version: a1250ad0
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
  last_gate_check: 2026-08-28T10:04:02Z
  transition: ready-to-apply
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# CR-112: Heading-anchored predicates replace positional `section(N)`

## 0.5 Open Questions

- **Question:** Convert all twelve pinnable `section(N)` criteria in one pass, or only the nine already measured vacuous?
- **Recommended:** All twelve. The three non-vacuous ones (`initiative.user-flow-populated`, `hotfix.anomaly-populated`, `hotfix.verification-steps-nonempty`) carry the same positional fragility; leaving them behind keeps `evalSection` alive and keeps two vocabularies in the registry, which is the BUG-041 shape.
- **Human decision:** _pending Gate 1._

- **Question:** Does the anchored predicate match on heading text exactly, or on a normalised form?
- **Recommended:** Reuse `headingTitleOf` unchanged. It is already the locator for the three existing heading-anchored predicates and it already strips numeric prefixes, which is what makes `## 3.5 Task Breakdown` and `## 9. Task Breakdown` both resolve. Introducing a second normalisation would reintroduce the divergent-parser problem this CR exists to remove.
- **Human decision:** _pending Gate 1._

- **Question:** Does a criterion whose anchor heading is absent pass or fail?
- **Recommended:** Fail, with the heading named in the detail string. This differs deliberately from `task-breakdown-complete`, which passes on absence because the section is optional by complexity. `## 4. Quality Gates` is not optional in a Story, and a Story that has deleted it should not be certified.
- **Human decision:** _pending Gate 1._

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- Forget that `section(N)` is a durable way to name a section. It names a **position**, and positions move whenever a `## ` heading is inserted above them or deleted from above them.
- Forget the mitigation that has been applied twice already — "recompute the index and update the pinning fixture in the same commit." It is correct and it is not sufficient: it restores correctness against the **template** and does nothing for the corpus of documents already authored against the old layout.
- Forget that the pinning test closes this. `cleargate-cli/test/docs/gate-section-index-pinning.node.test.ts` asserts each criterion resolves to the heading its id names **in the template**. Every assertion in it can be green while the same criterion reads the wrong section in 230 of 231 authored items.

**New Logic (The New Truth):**
- A criterion names the **heading it means**, not the slot that heading currently occupies. The predicate locates its section with `headingTitleOf` over `body.split(/^(?=## )/m)` — the shape three predicates in the registry already use — and counts inside the located section.
- Correctness stops being a function of document age. A Story authored in SPRINT-04 and a Story authored tomorrow both resolve `dod-declared` to `## 4. Quality Gates`, whatever else has been inserted around it.
- Inserting a `## ` heading into a gated template stops being a registry-wide arithmetic exercise. Cross-Cutting Rule 4 of the SPRINT-39 context — recompute every index below the insertion, correct the registry, update the fixture — becomes unnecessary rather than merely easier to get right.

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update Bug: [[BUG-042]] — its fix corrected three `section(N)` indices. Those three criteria are converted by this CR; the corrected integers stop existing. BUG-042 stays shipped and correct for its own window.
- [ ] Invalidate/Update Bug: [[BUG-050]] — `countDeclaredItems` scores a bare bold label as a declared item. This CR does **not** fix that; a converted criterion counting `declared-item` inside the right section is still fail-open on a label-only section. BUG-050 remains open and its scope is unchanged.
- [ ] Invalidate/Update Bug: [[BUG-054]] — nine of twelve pinnable criteria pass against their own unedited template. This CR fixes the *locator*, not the *counter*, so BUG-054 survives it. Recorded so the two are not conflated at scheduling.
- [ ] Invalidate/Update Story: [[STORY-054-05]] — its twelve-row fixture is keyed on heading text, not on indices, so the fixture survives. But `enumerateSectionCriteria` filters on `kind === 'section'`, so as criteria convert, `S1a`'s hardcoded totals and `S6`'s count fall toward zero and `KNOWN_UNPINNABLE`'s two `proposal.*` rows lose their meaning. The pinning test is rewritten or retired by this CR, and that decision must be explicit rather than incidental.
- [ ] Invalidate/Update Epic: [[EPIC-054]] — no scope change. This CR is the durable form of the defect EPIC-054's stories worked around three times.
- [ ] Downstream repos: every installed repo receives the new `readiness-gates.md` and the new predicate code together in one published version. A repo on an older `cleargate` reading a newer registry gets `predicate error: unsupported predicate shape` on every gated item — the exact failure measured on the global 0.24.2 binary after STORY-054-06. Publish and reinstall in the same operation.
- [ ] Database schema impacts? No — no runtime or persistence surface.
- [ ] `evalSection` (`cleargate-cli/src/lib/readiness-predicates.ts:632-657`) becomes dead code once the last `section(N)` criterion converts. Deleting it is in scope; leaving it is a silent invitation to reintroduce the shape.

## Existing Surfaces

> L1 reuse audit. List source-tree implementations this CR extends or modifies. Cite file:line.

- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts` — `evalPriorWorkRecorded`, `evalExistingSurfacesVerified` and `evalAmbiguityGateResolved` already locate a section by heading and are the exact shape this CR generalises. `evalSection` is the positional locator being retired. `headingTitleOf` is the reusable helper.
- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts` — `evalTaskBreakdownComplete`, added by STORY-054-06, is the newest and cleanest instance of the target shape: heading-anchored locator, count inside the located section, explicit absence semantics.
- **Surface:** `.cleargate/knowledge/readiness-gates.md` — the registry holding all fourteen `section(N)` criteria and the Predicate Vocabulary entry that documents the shape. Both trees, byte-identical.
- **Surface:** `cleargate-cli/test/docs/gate-section-index-pinning.node.test.ts` — the enumerating pinning test whose entire subject is `section(N)`. It is rewritten or retired, not merely adjusted.
- **Surface:** `cleargate-cli/test/fixtures/gate-section-index/expected-headings.ts` — twelve rows already keyed on heading **text**. This is the mapping the converted criteria encode directly, so the fixture is close to being the specification rather than the check.
- **Why this CR extends rather than rebuilds:** the target predicate shape already exists four times over in the same file, the heading-to-criterion mapping already exists as a fixture, and the locator helper is already exported. Nothing new is designed; a positional locator is replaced by the heading-anchored one beside it.

## Prior work

- [[BUG-042]] — corrected three positional indices. The first time the class was named.
- [[BUG-050]] — the counter half of the same family, deliberately not in scope here.
- [[BUG-054]] — the vacuity census: nine of twelve criteria pass against their own unedited template.
- [[STORY-054-05]] — built the pinning test that turns index drift into a build break, and whose subject this CR removes.
- [[STORY-054-06]] — moved `story.dod-declared` from `section(4)` to `section(5)` and produced the corpus measurement in §1.
- [[EPIC-054]] — parent epic; this CR is the durable fix for the defect three of its stories worked around.
- No prior item proposes replacing positional `section(N)` with heading-anchored predicates. `.cleargate/delivery/archive/` and `.cleargate/FLASHCARD.md` were grepped for `section(N)`, `positional` and `readiness-gates`; the hits are the four cards recording the defect, none proposing this fix.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/src/lib/readiness-predicates.ts` — add the heading-anchored predicate shape to `ParsedPredicate`, the `parsePredicate` branch, the `evaluate` switch, and the evaluator function. Retire `evalSection` once the last `section(N)` criterion converts.
- `.cleargate/knowledge/readiness-gates.md` — convert the criteria, add the vocabulary entry, remove or supersede vocabulary entry 3. Two-tree edit; the `cleargate-planning/` mirror must be byte-identical in the same commit.
- `cleargate-planning/.cleargate/knowledge/readiness-gates.md` — the mirror.
- `cleargate-cli/test/docs/gate-section-index-pinning.node.test.ts` — rewrite against the new shape or retire with a named replacement.
- `cleargate-cli/test/fixtures/gate-section-index/expected-headings.ts` — becomes the conversion table, or is folded into the registry and deleted.
- `cleargate-cli/test/lib/readiness-predicates.node.test.ts` — the per-criterion parse census asserts a count that changes.
- New `*.node.test.ts` under `cleargate-cli/test/` — a corpus-level assertion that each converted criterion resolves to its named heading across `.cleargate/delivery/**`, not only in the template. That assertion is the one thing the current pinning test structurally cannot make.

**Do NOT modify:**
- `cleargate-cli/src/lib/readiness-predicates.ts` — the `countDeclaredItems` / `countListedItems` counters. [[BUG-050]] and [[BUG-054]] own those; changing a locator and a counter in one CR makes neither reviewable.
- `.cleargate/templates/**` — no template heading moves. This CR exists so that they can move safely later, not so that they move now.
- The three `hotfix` criteria's printed-ordinal-versus-index mismatch — it is correct today and the conversion removes the question rather than answering it.

## Task Breakdown

> **Required at L3 and above. Optional at L2. Omit the whole section at L1.**
> An absent section passes the gate; a section that is present but carries no task rows does not.
> Write one row per executable step, in execution order:
> `- [ ] <action>` with an optional trailing `-> <requirement-id>`. The requirement reference is
> reserved for grounding ids and is not interpreted today.

- [ ] Settle all three Open Questions at Gate 1 — scope, normalisation, absence semantics
- [ ] Add the heading-anchored predicate to the union, `parsePredicate`, the `evaluate` switch and the evaluator function
- [ ] Convert the twelve pinnable criteria in `readiness-gates.md`, both trees byte-identical
- [ ] Decide and execute the `proposal.*` pair — two criteria on a registered type with no template on disk
- [ ] Rewrite or retire `gate-section-index-pinning.node.test.ts` and fold `expected-headings.ts` into whatever replaces it
- [ ] Add the corpus-level assertion over `.cleargate/delivery/**` that the current pinning test cannot express
- [ ] Delete `evalSection` and confirm nothing imports it
- [ ] Re-measure the corpus resolution rate and record the before and after numbers
- [ ] Publish `cleargate` and reinstall globally in the same operation, so no install reads a newer registry with an older parser

## 4. Verification Protocol

**Command/Test:** `npm --prefix cleargate-cli test`

New logic proven:
- For each converted criterion, a document whose named heading has moved to a different position still resolves to that heading. Construct the mutation by inserting one `## ` heading above the anchor; the criterion's verdict must not change.
- `story.dod-declared` resolves to `## 4. Quality Gates` across the authored corpus. The measured baseline to beat is **1 of 231**; the target is every item that has the heading at all.
- A document missing the anchor heading entirely fails with the heading named in the detail string, per the Gate-1 decision on absence.
- The registry contains zero `section(N)` criteria and `evalSection` has no importer.

Old logic evicted:
- Assert no criterion in `readiness-gates.md` parses to `kind === 'section'`. This is the eviction check and it must be a single enumerating assertion, not a per-criterion list, so a reintroduced positional criterion cannot slip in beside a passing suite.
- Assert `evalSection` is absent from the module rather than merely unreferenced.

---

## Context Source

> Discovery audit. Populated from the approved Epic, verified codebase grounding, and recorded direct approval.

**context_source:** The measurements in §1 and §2 were executed, not reasoned, during the SPRINT-39 STORY-054-06 and STORY-054-01 post-flight reviews, using the real exported `evaluate()` against both registries and the full authored corpus. This CR is filed per the STORY-054-07 post-flight dispatch's Part A3 instruction, which converts M2 plan §Open decisions #4 from a sprint-report candidate into a tracked item.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.

**Held at 🟡 deliberately.** Five of six criteria are met literally. The fifth is unchecked because it is literally false — `approved: false` — and three Open Questions carry no human decision. The second criterion is checked on the literal reading that the impacted items are *identified*; none is reverted to 🔴 because none is in flight. That substitution is stated here rather than absorbed silently.
