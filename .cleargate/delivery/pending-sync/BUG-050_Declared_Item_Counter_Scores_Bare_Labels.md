---
bug_id: BUG-050
parent_ref: EPIC-043
parent_cleargate_id: EPIC-043
sprint_cleargate_id: null
carry_over: false
area: gates,readiness-predicates
status: Draft
severity: P1-High
reporter: sandrinio
approved: false
ambiguity: 🟡 Medium
context_source: QA-Red evidence capture on BUG-042 (SPRINT-39 M0 wave1, 2026-08-27) + Orchestrator verification against the corrected-registry probe; verified codebase grounding at readiness-predicates.ts:712-763
complexity_label: L2
parallel_eligible: n
created_at: 2026-08-27T00:00:00Z
updated_at: 2026-08-27T00:00:00Z
created_at_version: 0.24.2
updated_at_version: 0.24.2
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-27T08:45:18Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# BUG-050: `countDeclaredItems` scores a bare `**Label:**` line as a declared item, so every `≥1` section criterion is fail-open

### Open Questions

- **Question:** Should the fix change `countDeclaredItems` (stop counting a definition-list term that has no content beneath it), raise the affected thresholds, or add a new label-scoped predicate kind (`section(N) under "Affected Files" has ≥1 declared-item`)?
- **Recommended:** **Change `countDeclaredItems`.** A definition-list term is a *label for* declared items, not a declared item. Thresholds do not work — `epic.md` §4 ships two labels, so an empty-but-labeled section already counts 2 and would survive `≥2`. A new predicate kind is the most precise but is a much larger surface (parser, vocabulary doc, every affected criterion rewritten) for a defect that a counter correction closes.
- **Risk of the recommended route:** `countDeclaredItems` is shared by every `has ≥N declared-item` criterion across all six gated types. Changing it re-evaluates the entire corpus. The change must be measured against `.cleargate/delivery/**` before it lands, and any criterion that flips ❌ is a finding to triage, not a reason to soften the counter.
- **Human decision:** _pending_

---

## 1. The Anomaly (Expected vs. Actual)

**Expected:** `section(N) has ≥1 declared-item` fails when the gated section declares nothing. That is the criterion's entire purpose — it is the readiness gate's only defense against a work item that names a section and leaves it empty.

**Actual:** The criterion **passes** when the section contains nothing but its own boilerplate subsection label. `countDeclaredItems` (`cleargate-cli/src/lib/readiness-predicates.ts:712-763`) ends with a definition-list-term branch:

```ts
if (/^(\*{1,2}|_{1,2})?[A-Z][^|*\n]*(\*{1,2}|_{1,2})?:/.test(line.trim())) {
  count++;
  continue;
}
```

A bare label line matches it: `**Affected Files:**` is bold, starts uppercase, contains no pipe or asterisk internally, and ends in a colon. It is counted as **1 declared item** regardless of whether anything is declared beneath it.

Because the shipped templates seed these sections *with* their labels, the realistic authoring failure — writing the heading, keeping the label, never filling in the list — is exactly the case the gate cannot see. The gate reports green.

**Severity rationale (P1).** This is a fail-open in an `enforcing` gate that presents as a **pass**, so it reads as "checked and fine" rather than "not checked". It is the same symptom class as [[BUG-042]] with a different mechanism, and it survives BUG-042's fix.

---

## 2. Reproduction Protocol

- **Setup.** Use the archived corrected-registry probe from BUG-042's QA-Red run: `.cleargate/sprint-runs/SPRINT-39/BUG-042-qa-red-fixtures/post-fix-probe/readiness-gates.corrected.md`. Copy it to `<scratch>/.cleargate/knowledge/readiness-gates.md` and copy `.cleargate/config.yml` alongside it. (The defect also reproduces against the *uncorrected* registry; the corrected one is used here to prove BUG-042's fix does not close it.)
- **CR case — build the label-bearing fixture.** Take `BUG-042-qa-red-fixtures/pre-fix/cr-s1-empty-sandbox.md` and restore the template's own label so `## 3. Execution Sandbox` reads exactly: the heading, the italic guidance line, then `**Modify:**`, and no paths beneath it.
- **CR case — observe.** `node cleargate-cli/dist/cli.js gate check <scratch>/cr-s1d-label-only.md -v` → **`✅ cr.ready-to-apply passed (8 criteria)`**. The Execution Sandbox declares zero paths and the enforcing gate passes.
- **CR case — control.** Delete the `**Modify:**` label as well, leaving the section genuinely bare, and re-run → **`❌ sandbox-paths-declared: section 6 has 0 declared-item (≥1 required)`**. The only difference between pass and fail is the presence of a label that declares nothing.
- **Epic case — observe.** `BUG-042-qa-red-fixtures/post-fix-probe/epic-s4d-label-only.md` has `## 4. Technical Grounding` containing only the bare line `**Affected Files:**` → gate check passes **12/12**. `epic-s4b-empty-both.md` (both labels present, zero content anywhere) also passes. `epic-s4c-diagnostic-no-labels.md` (labels deleted too) **fails** with `section 8 has 0 declared-item`.
- **Counter-level isolation (no CLI needed).** Run the `countDeclaredItems` body against three strings: `'**Affected Files:**'` → **1**; `'**Affected Files:**\n- a.ts\n- b.ts'` → **3**; `''` → **0**. The first result is the defect in one line.

---

## 3. Evidence & Context

Verbatim, from the Orchestrator's verification run on 2026-08-27 against the corrected registry (`sandbox-paths-declared` → `section(6)`, `blast-radius-populated` → `section(3)`, `affected-files-declared` → `section(8)`):

```
=== BARE `## 3. Execution Sandbox` (label deleted too) ===
Gate: cr.ready-to-apply (enforcing)
❌ sandbox-paths-declared: section 6 has 0 declared-item (≥1 required)
  [pass] blast-radius-populated: section 3 has 3 declared-item (≥1 required)
  [fail] sandbox-paths-declared: section 6 has 0 declared-item (≥1 required)

=== `## 3. Execution Sandbox` + `**Modify:**` + zero paths (realistic) ===
Gate: cr.ready-to-apply (enforcing)
✅ cr.ready-to-apply passed (8 criteria)
```

Template bodies that seed the labels:

```markdown
# .cleargate/templates/CR.md — `## 3. Execution Sandbox`  (one label → empty counts 1)
**Modify:**
- `src/...`

# .cleargate/templates/epic.md — `## 4. Technical Grounding`  (two labels → empty counts 2)
**Affected Files:**
- `path/to/file.ext` — {Why it changes}

**Data Changes:**
- Table/Entity: {New column/field}
```

**Why a threshold bump is not the fix.** `epic.md` §4 ships two labels, so an empty-but-labeled section already scores 2 and would pass `≥2`. Any threshold high enough to catch it would reject legitimately short sections.

**Discovery path.** Surfaced by QA-Red during BUG-042's evidence capture (SPRINT-39 M0 wave1), which found the epic case. The Orchestrator verified it and found the CR case as well — QA-Red's CR fixture had deleted the `**Modify:**` label along with the paths, so it tested the bare shape and concluded the CR side closed cleanly. It does not.

**Relationship to BUG-042.** Distinct and independent. BUG-042 is an *index* defect — criteria pointing at the wrong section. Its fix is correct, necessary, and unaffected by this bug: it moves both criteria onto the sections they name. But the fail-open BUG-042 was filed to close survives on both the epic and CR sides, because the criteria land on label-shaped sections. **BUG-042 must not be widened to cover this** — the fix here is in `readiness-predicates.ts`, frozen for all of SPRINT-39.

---

### 3.1 Scope is WIDER than "bare bold labels" — measured 2026-08-27

This bug was filed against the shape `**Modify:**` — a bold subsection label with nothing beneath it. That
framing understates it. The regex is

```
/^(\*{1,2}|_{1,2})?[A-Z][^|*\n]*(\*{1,2}|_{1,2})?:/
```

The emphasis markers are **optional**. What it actually matches is *any* line that begins with a capital
letter and reaches a colon without crossing a `|` or `*` — which ordinary guidance prose does constantly.

Measured against `.cleargate/templates/spike.md` as authored by STORY-054-01, by executing the real
exported `evaluate()` (not by inspection):

| Section | `declared-item` score | Lines responsible |
|---|---|---|
| §1 The Question | **1** | `...must be falsifiable: a reader...` |
| §2 Timebox & Kill Criteria | **2** | `**Timebox:**` and `**Kill criteria:**` |
| §4 Decision Log | 0 | table — header + separator + zero data rows |
| §5 Outcome & Spawned Items | **1** | `State the concluding verdict here: the answer...` |

§1 and §5 carry **no bold label at all**. They are plain instructional sentences, and they score. So the
fail-open reaches every prose section in every template, not merely sections that happen to ship a label.

**Consequence for gate authoring, while this bug is open and `readiness-predicates.ts` is frozen:** a
presence gate over a *prose* section must use `listed-item` (`/^\s*- /gm`) paired with a template that ships
zero bullets there; `declared-item` is safe only over a *table* section. STORY-054-02's Requirement 4 was
amended on this basis — it originally specified `declared-item` for three prose sections, which would have
shipped a brand-new gate already fail-open on the day it landed.

**Discovery credit:** surfaced by QA-Verify on STORY-054-01, which measured the sections by execution rather
than by eye. The orchestrator's own mechanical check missed it because it tested the `listed-item` shape.

## 4. Execution Sandbox (Suspected Blast Radius)

**Modify:**
- `cleargate-cli/src/lib/readiness-predicates.ts` — `countDeclaredItems` at `:712-763`, definition-list-term branch at `:757-760`.
- `.cleargate/knowledge/readiness-gates.md` — Predicate Vocabulary, the `declared-item` entry; must state what does and does not count as declared.
- `cleargate-planning/.cleargate/knowledge/readiness-gates.md` — canonical mirror, byte-identical, same commit.

**Investigate (read-only):**
- `.cleargate/templates/epic.md`, `.cleargate/templates/CR.md`, `.cleargate/templates/Bug.md` — the label-shaped sections that make the defect reachable.
- `.cleargate/delivery/pending-sync/`, `.cleargate/delivery/archive/` — corpus impact measurement before the counter change lands.

**Do NOT modify:**
- `cleargate-cli/src/lib/readiness-predicates.ts` `evalSection` at `:632-657` — a different function; not implicated.
- `cleargate-cli/templates/cleargate-planning/**` — generated payload, regenerated by `prebuild`.
- Any file under `.cleargate/delivery/archive/**` — no bulk re-gating.

**Blast radius.** `countDeclaredItems` backs **every** `has ≥N declared-item` criterion across all six gated work-item types. A correction re-evaluates the whole corpus at once. Items currently green solely because of a counted label will flip ❌ — which is the point, but the count must be measured and reported before the change merges, not discovered afterward. Expect the same "right for the template, drifts on the corpus" split that BUG-042 hit.

---

## 5. Verification Protocol (The Failing Test)

**Red test** — `cleargate-cli/test/lib/declared-item-label-counting.red.node.test.ts`, node:test via tsx, `*.red.node.test.ts` naming:

- **Unit, the defect itself.** `countDeclaredItems('**Affected Files:**')` must return **0**, not 1. A bare definition-list term with no content beneath it declares nothing. Same for `'**Modify:**'` and `'**Data Changes:**'`.
- **Unit, the capability preserved.** `countDeclaredItems('**Affected Files:**\n- a.ts\n- b.ts')` must still return the bullet count. Labels must not start *subtracting*; a label with content beneath it is not itself an item. Pin the expected number explicitly so a future edit cannot drift it silently.
- **Unit, genuine definition lists still count.** A real definition-list section (`**Term:** value` on one line, several of them) must still score. This branch exists for a reason — the fix must distinguish "label with nothing under it" from "term with its value inline". Pin at least one such case or the fix will over-correct.
- **Integration, CR.** A CR fixture whose `## 3. Execution Sandbox` contains only `**Modify:**` must **fail** `cr.ready-to-apply` on `sandbox-paths-declared`. This is the exact fixture in §2 that passes today.
- **Integration, epic.** An epic fixture whose `## 4. Technical Grounding` contains only `**Affected Files:**` and `**Data Changes:**` must **fail** `epic.ready-for-decomposition` on `affected-files-declared`.
- **Corpus regression report.** Re-gate every item under `.cleargate/delivery/pending-sync/` before and after; assert the set of newly-failing items is exactly the recorded expected set. A flip that is not in the set fails the test and demands triage.

**Fix is proven when:** the six cases above go green, `npm --prefix cleargate-cli test` is green, `npm --prefix cleargate-cli run typecheck` is clean, and the corpus delta is recorded in the work item.

---

## Prior work

- [[STORY-043-03]] — Template Gate Correctness (EPIC-043, SPRINT-33, Completed). Adjacent and instructive: it fixed `countDeclaredItems` scoring ordered-list items as **0** by converting the Bug template's repro sample to bullets, and de-numbered headings that shifted positional indices. It treated the counter as fixed and moved the templates to suit it.
- [[CR-100]] — taught `countDeclaredItems` to count ordered-list items (`1.` / `2)`), the source-level fix for the same under-counting STORY-043-03 worked around. Cited in the function's own header comment.
- [[BUG-042]] — Gate `section(N)` indices are positional (SPRINT-39 M0). Same symptom class — an enforcing gate that fail-opens green — different mechanism. This bug was discovered during BUG-042's QA-Red and survives its fix.

**Both prior items corrected *under*-counting: content that existed and scored 0. This is the mirror defect — nothing exists and it scores 1.** No prior item addresses over-counting; `command grep -rl "countDeclaredItems"` over `.cleargate/wiki/`, `delivery/archive/` and `delivery/pending-sync/` returns only the three above.

## Context Source

> Discovery audit. Populated from verified codebase grounding and recorded direct approval.

**context_source:** QA-Red evidence capture on BUG-042 (SPRINT-39 M0 wave1, 2026-08-27), extended by Orchestrator verification against the archived corrected-registry probe; verified codebase grounding at `cleargate-cli/src/lib/readiness-predicates.ts:712-763`; template grounding at `.cleargate/templates/{epic,CR}.md`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [ ] `approved: true` is set in the YAML frontmatter.

**Blocking on:** human approval, and the Open Question above (counter fix vs. threshold vs. new predicate kind — recommendation recorded, decision not yet made). Quarantined out of SPRINT-39 by Orchestrator decision: the fix edits `readiness-predicates.ts`, which cross-cutting rule 3 freezes for the whole sprint and which both M0 items' DoD asserts has zero diff.
