# Architect Post-Flight Review — STORY-043-03

**role: architect**
**Date:** 2026-06-01
**Sprint:** SPRINT-33 · **Story:** STORY-043-03 — Template / Gate Correctness
**Worktree:** /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-043-03 (branch story/STORY-043-03)
**Commits reviewed:** 849afe34 (impl) + 00515a59 (sealed test correction)
**Mode:** POST-FLIGHT structural review (read-only, positional-predicate-sensitive)

---

ARCH-POSTFLIGHT: PASS

ISSUES: none (2 informational notes below — neither is a defect or a scope miss)

flashcards_flagged: ["2026-06-01 · #gate #template · evalSection splits body on `^## ` only; H3 (`### `) headings do NOT create a section index — demoting a leading heading to H3 is the correct way to fix a section(N) off-by-one without moving content"]

---

## Verdict basis (the six dispatch checks)

### 1. story.md positional invariant — HOLDS
Body H2 walk (frontmatter stripped, after the template preamble): `[1] ## 1. The Spec` · `[2] ## 2. The Truth` · `[3] ## 3. The Implementation Guide` · `[4] ## 4. Quality Gates` · `[5] ## Existing Surfaces` · `[6] ## Why not simpler?` · `[7] ## Ambiguity Gate`.
- `implementation-files-declared = section(3)` → resolves to `## 3. The Implementation Guide`. Intact.
- `dod-declared = section(4)` → resolves to `## 4. Quality Gates`. Intact.
- The two relocated headings now sit at positions 5/6, strictly AFTER §4 — they do not occupy or shift the 3/4 ordinals. Relocation is correct.
- No other positional predicate keys off story.md sections (only `implementation-files-declared`=§3 and `dod-declared`=§4 per the registry at `.cleargate/knowledge/readiness-gates.md:116-138`). Unaffected.
- `evalSection` (`cleargate-cli/src/lib/readiness-predicates.ts:532-582`) splits on `^(?=## )` only; the relocation introduces no stray `## ` between §1 and §4.

### 2. Bug.md positional invariant — HOLDS
Body H2 walk: `[1] ## 1. The Anomaly` · `[2] ## 2. Reproduction Protocol` · `[3] ## 3. Evidence` · `[4] ## 4. Execution Sandbox` · `[5] ## 5. Verification` · `[6] ## Context Source` · `[7] ## Ambiguity Gate`.
- `repro-steps-deterministic = section(2) has ≥3 declared-item` (registry `readiness-gates.md:160-165`) → resolves to `## 2. Reproduction Protocol`. Intact.
- The pre-change leading `## 0.5 Open Questions` was H2 → was section(1), pushing Anomaly→2 / Reproduction→3 (the BUG-034 mis-index). Demoting it to `### Open Questions` (H3) removes it from the `^## ` split entirely; it now folds into the preamble (rawParts[0]) and offsets nothing.
- The repro list IS the section(2) content `countDeclaredItems` scores: three `- ` bullets (`- Go to...` / `- Click...` / `- Observe...`) at Bug.md:84-86 → 3 declared-items ≥ 3. Passes. No intervening H2 between `## 2.` and `## 3.`.
- No other H2 between frontmatter and Reproduction now mis-indexes section(2). Confirmed.

### 3. De-numbering side-effects — CLEAN
- Targeted de-numbered cross-refs that MUST be gone (`§3.5`, `§3.6`, `§1.6`, `§1.7`, `§2.5`): grep returns ZERO in all four templates. All gate-box and prose references to the relocated/de-numbered headings were updated to unnumbered form.
- Surviving `§N` references in prose (epic handoff list `§1/§2/§3...§6`, story granularity-rubric `§1.2/§2.1/§3.1`, story DoD `§4.1/§2.1`, CR/Bug handoff lists, `§0.5 Open Questions` in the Bug handoff list) all point at sections that still exist at those numbers — none of them referenced a de-numbered heading. No dangling refs.
- Note: the Bug handoff index line (`- Open Questions ← §0.5 Open Questions`, Bug.md:17) is descriptive prose mapping the Brief field to its source; it is not a gate predicate input and is not affected by the H3 demotion. Cosmetically it still reads `§0.5` while the heading is now unnumbered H3 — purely informational, not in this story's §1.2 edit list, and inconsequential to any gate.

### 4. Proposal purge — COMPLETE (within literal scope)
- epic.md + story.md: the story's acceptance grep pattern (`PROPOSAL-\{ID\}\.md|approved proposal\.md|from the approved proposal`, §2.2 / Scenario 6) returns ZERO matches (exit 1). Default `context_source` updated to `"approved Epic / verified codebase grounding + recorded direct approval"` in both, byte-identical across all four edited templates.
- CR.md + Bug.md: zero `proposal` substrings at all.

### 5. Mirror discipline + scope — CLEAN
- `diff -q` on all four canonical pairs (`.cleargate/templates/<t>` ↔ `cleargate-planning/.cleargate/templates/<t>`): byte-identical for epic, story, CR, Bug.
- Total diff scope across both commits = exactly the 4×2 templates + the sealed test `.cleargate/scripts/test/test_template_gate_correctness.red.sh`. No source edits, no §1.3 out-of-scope edits (no acceptance-prose rewrites, no new/removed sections beyond the four heading moves + the two `## Context Source` footer boxes that §1.2 explicitly mandates). Sealed test ends in `.red.sh` (shell sealed-test naming for a markdown-only fast-lane story; CR-043 `*.red.node.test.ts` naming applies to node:test files, not applicable here).

### 6. Cross-story (043-02 / 043-03 split) — NO CONFLICT
- STORY-043-02 (heading-text anchoring) IS merged to `cleargate-cli` main (`1002e90` / merge `a7e19cd`) but its `headingTitleOf` is NOT yet in the shipped `dist/cli.js` (grep count = 0) — the dist has not been rebuilt/republished.
- The de-numbered headings satisfy BOTH predicate variants:
  - **Old shipped-dist literal-substring** (`body.indexOf('## Existing Surfaces')`): the unnumbered heading is a literal match.
  - **043-02 heading-anchored src** (`headingTitleOf(line) === 'Existing Surfaces'`, readiness-predicates.ts:359-367 / 380-418): also matches.
- The literal predicate is the STRICTER of the two for this change (a numbered heading fails it; an unnumbered one passes). QA verified against the shipped dist, i.e. against the stricter literal predicate — the conservative and correct choice. Whether or not the dist is later rebuilt to include 043-02, the templates pass. The two stories are complementary, not in conflict.

---

## Informational notes (not defects, not scope misses)

- **story.md:10** retains `Document Hierarchy Position: LEVEL 2 (Proposal → Epic → Story)`. This is a factual hierarchy-level statement ("Proposal" as an upstream tier in the nesting diagram), not a retired-Proposal *reference* in the CR-025 sense. It is outside the story's literal §1.2 purge list (which targets the `context_source` default, the two prose strings, and the gate-box cross-refs) AND outside the acceptance grep pattern. Leaving it is correct per the story's literal scope. Flag only if a future story wants the hierarchy diagram itself reworded post-CR-025.
- **epic `parent-approved-proposal` predicate** (`frontmatter(context_source).approved == true`, registry line 72): the new prose default trips the `looksLikeProse` branch (readiness-predicates.ts:200-226), so a template-derived Epic now takes the prose-waiver path rather than the file-dereference path. This is net-neutral — the OLD `"PROPOSAL-{ID}.md"` default also failed this predicate (it dereferenced to a non-existent file). A template-derived Epic never passes the full `ready-for-decomposition` gate regardless (it is full of placeholders/TBDs). This predicate is not in the story's §1.2 target set; no regression introduced.

---

## Summary

Implementation is structurally correct on every positional-predicate-sensitive axis. The two H2-ordinal invariants that this change risks (story.md §3/§4, Bug.md section(2)) both hold under the actual `evalSection` split-on-`^## ` mechanics — the relocation lands the moved headings strictly after §4, and the H3 demotion correctly removes the Bug Open-Questions heading from the section walk. De-numbered cross-refs fully updated, proposal purge complete within literal scope, all four mirrors byte-identical, diff scope tight, and the de-numbering satisfies both the old literal and the new 043-02 heading-anchored predicate. Concur with QA-Verify PASS. No kick-back.
