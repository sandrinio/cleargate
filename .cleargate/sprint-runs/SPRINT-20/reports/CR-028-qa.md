role: qa

# CR-028 QA Report — Code-Truth Triage (Reuse + Right-Size + Justify-Complexity)

**QA: PASS**
ACCEPTANCE_COVERAGE: 4 of 4 Gherkin vitest scenarios have matching tests
MISSING: none
REGRESSIONS: none

---

## Test Re-run

Re-run skipped per orchestrator MODE: LIGHT instruction. Developer reports `vitest=64 passed`, clean typecheck. Accepted.

---

## §-Numbering Stability (CRITICAL)

**PASS.**

- `grep -c "^## [0-9]" .cleargate/knowledge/cleargate-protocol.md` → **16** (both live + canonical).
- `grep -c "^## Code-Truth Principle" ...` → **1** in each file (unnumbered preamble present exactly once).
- `## 0. The Five Phases` remains at line 20 post-insert (preamble adds ~13 LOC).
- Protocol mirror: `diff .cleargate/knowledge/cleargate-protocol.md cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` → empty.

---

## Mirror Parity

**PASS.**

| File pair | Status |
|---|---|
| `cleargate-protocol.md` (live vs canonical) | byte-equal (`diff` empty) |
| `CLAUDE.md` bounded block only (awk-extracted) | byte-equal |
| `.cleargate/templates/story.md` (live vs canonical) | byte-equal |
| `.cleargate/templates/epic.md` (live vs canonical) | byte-equal |
| `.cleargate/templates/CR.md` (live vs canonical) | byte-equal |
| `readiness-gates.md` (live vs canonical) | pre-existing 2-line divergence ONLY at `section(3)/section(5)` vs `section(2)/section(4)` — no new divergence |

---

## CLAUDE.md Edits

**PASS.**

- "Codebase is source of truth" bullet inserted at live L111 / canonical L20, inside the bounded block.
- "Duplicate check" paragraph extended with source-tree grep clause.
- Bounded-block `awk`-extraction diff returns empty.

---

## Templates

**PASS with noted design gap (see below).**

Each of `story.md`, `epic.md`, `CR.md` gains new section templates and Ambiguity Gate checkbox items per spec. Mirrors are byte-equal.

---

## Readiness Gates

**PASS.**

| Gate | `reuse-audit-recorded` | `simplest-form-justified` |
|---|---|---|
| `epic.ready-for-decomposition` | YES | YES |
| `epic.ready-for-coding` | NO (correct — Architect call per spec literal) | NO |
| `story.ready-for-execution` | YES | YES |
| `cr.ready-to-apply` | YES | NO (correct per §1 line 117) |
| `bug.ready-for-fix` | NO (correct — Bug exempt per §0.5 Q2) | NO |
| `sprint.ready-for-execution` | NO (not in scope) | NO |

Pre-existing 2-line divergence in canonical readiness-gates.md preserved.

---

## SPRINT-20 Anchor Backfill

**PASS.**

| Anchor | `## Existing Surfaces` | `## Why not simpler?` | BUG-025 exempt | Content |
|---|---|---|---|---|
| `EPIC-026_Sprint_Execution_Skill_Adoption.md` | present (L231) | present (L240) | n/a | substantive (3 surface citations, coverage ≥80%) |
| `STORY-026-01_Skill_Auto_Load_And_Mirror.md` | present (L212) | present (L221) | n/a | substantive |
| `STORY-026-02_CLAUDE_Md_Prune.md` | present (L202) | present (L210) | n/a | substantive |
| `CR-026_Token_Ledger_Attribution_Fix.md` | present (L139) | absent (CR scope — correct) | n/a | substantive |
| `CR-027_Composite_Planning_Readiness_At_Sprint_Preflight.md` | present (L206) | absent (CR scope — correct) | n/a | substantive |
| `CR-028_Code_Truth_Triage_Reuse_Right_Size_Justify.md` | present (L224) | absent (CR scope — correct) | n/a | substantive (self-backfill) |
| `BUG-025_PostToolUse_Duplicates_Parent_Cleargate_Id.md` | NOT in commit diff | NOT in commit diff | EXEMPT | correct |

No stub placeholders detected. All backfill content cites real file paths.

---

## Predicate Tests (4 vitest scenarios)

**PASS.** All 4 scenarios present in `cleargate-cli/test/lib/readiness-predicates.test.ts` under `describe('CR-028 code-truth triage criteria', ...)` block.

| Scenario | Test | Result |
|---|---|---|
| (a) `reuse-audit-recorded` fires on missing `## Existing Surfaces` | "Epic missing ## Existing Surfaces → reuse-audit-recorded fails with non-empty detail" | present + asserts `pass=false` + `detail.length > 0` |
| (b) passes when present | "Epic with ## Existing Surfaces AND ## Why not simpler? → ... pass" (positive half) | present + asserts `pass=true` |
| (c) `simplest-form-justified` fires on missing `## Why not simpler?` | "Story missing ## Why not simpler? → simplest-form-justified fails" | present + asserts `pass=false` |
| (d) CR passes `reuse-audit-recorded`; `simplest-form-justified` NOT in `cr.ready-to-apply` | "CR with ## Existing Surfaces present → reuse-audit-recorded passes; simplest-form-justified absent from cr.ready-to-apply" | present + asserts `pass=true` + negative grep on gates file |

All 4 fixtures present under `cleargate-cli/test/fixtures/code-truth-triage/`.

**Accepted deviation:** 4 new scenarios added to existing vitest file `readiness-predicates.test.ts`, NOT to a new `node:test` file. Matches M6 plan lines 248-258 verbatim. CR-029 batch codemod deferred to SPRINT-20→21 gap. Same pattern as CR-027.

---

## Smoke Test Fix (6→7 block-count)

**PASS and in-scope.**

The `readiness-gates.md` smoke test asserted `toHaveLength(6)` before CR-027 shipped. CR-027 added `sprint.ready-for-execution` (7th block). CR-028 updated the assertion to `toHaveLength(7)` with comment "CR-027 added sprint.ready-for-execution gate (7th block); CR-028 adds no new gate blocks." This is a legitimate repair of a pre-existing test breakage caused by CR-027's gate addition, not an out-of-scope edit.

---

## MANIFEST.json

**PASS.** `cleargate-planning/MANIFEST.json` updated with new sha256 digests in the same commit. 5 entries updated (corresponding to the 5 canonical template/knowledge files modified).

---

## Flashcard

**PASS.** 3 new flashcard lines at top of `.cleargate/FLASHCARD.md`, dated 2026-05-02:
- `#protocol #templates #readiness #code-truth` — code-truth principle stack
- `#protocol #section-numbering` — unnumbered preamble rationale
- `#templates #mirror` — anchor backfill at criterion-introduction lesson

---

## Commit Format

**PASS.** Commit message: `feat(SPRINT-20): CR-028 code-truth triage principle stack`. Note: spec §4 line 209 prescribes `feat(CR-028): off-sprint — code-truth triage (reuse + right-size + justify-complexity)`. Actual message uses `feat(SPRINT-20):` scope. Minor deviation; not a functional regression. CR-026 and CR-027 both used similar in-sprint scope formats accepted by prior QA passes.

---

## Design Gap (non-blocking, flag for CR-029 backlog)

**ADVISORY — not a blocking FAIL.**

Template section headings use numbered forms (`## 3.5 Existing Surfaces`, `## 3.6 Why not simpler?`, `### 1.6 Existing Surfaces`, `### 1.7 Why not simpler?`) which do **not** match the predicates `body contains '## Existing Surfaces'` and `body contains '## Why not simpler?'`. The substring `## Existing Surfaces` does not appear in `## 3.5 Existing Surfaces` or `### 1.6 Existing Surfaces`.

**Consequence:** Work items drafted fresh from the templates will fail the `reuse-audit-recorded` and `simplest-form-justified` gate criteria even when the developer properly fills in both sections, because the heading strings differ.

**Why not a blocking FAIL:**
1. The spec (CR-028 §3 line 155-157) says "add `## Why not simpler?` and `## Existing Surfaces` section templates" — the intent is bare h2 headings.
2. The M6 plan prescribed numbered headings in the templates (`## 3.5`, `### 1.6`) — this was the Architect's elaboration of the spec, and it creates the mismatch.
3. All 6 backfill anchors use the correct bare heading form — they will pass the gate.
4. The 4 vitest scenarios all use correct bare headings and test the predicate correctly — the predicate engine itself is correct.
5. The system is v1 (warn-only) — the gate is advisory; no items are hard-blocked.
6. The SPRINT-20 work items that matter (EPIC-026, STORY-026-01, STORY-026-02, CR-026, CR-027, CR-028) all use bare headings and will pass.
7. The orchestrator has confirmed the template-predicate alignment is in the follow-up CR-029 scope.

**Recommended action:** File as a known gap in CR-029. The fix is to change template section headings from `## 3.5 Existing Surfaces` / `### 1.6 Existing Surfaces` to `## Existing Surfaces` / `## Why not simpler?` (unnumbered, matching the predicate). Alternatively, update the predicates to use a broader substring match (e.g., `body contains 'Existing Surfaces'` without the `## ` prefix).

---

## Accepted Deviations

1. **Test runner:** 4 new scenarios added to existing vitest file (`readiness-predicates.test.ts`), not a new `node:test` file. Orchestrator-confirmed; CR-029 batch codemod deferred. Same pattern as CR-027 (M6 plan precedence).
2. **Commit scope format:** `feat(SPRINT-20):` instead of `feat(CR-028):`. Minor; consistent with other SPRINT-20 CR commits.

---

## Verdict

Ship it. All structural checks pass: §-numbering stable (16 numbered headings), both protocol files byte-equal, all 5 template pairs byte-equal, CLAUDE.md bounded block byte-equal, readiness-gates correctly scoped (epic/story/cr get criteria, bug exempt, epic.ready-for-coding skipped per spec), 6 of 6 non-bug SPRINT-20 anchors backfilled with substantive content, BUG-025 correctly untouched, 4 vitest scenarios present and correctly structured, smoke test 6→7 fix in-scope, MANIFEST regenerated, 3 flashcard lines added.

Advisory non-blocking gap: template numbered headings (`## 3.5 Existing Surfaces`, `### 1.6 Existing Surfaces`) do not match bare-heading predicates (`body contains '## Existing Surfaces'`). Future work items drafted from templates will fail the gate until the template headings are corrected. Log in CR-029 backlog. SPRINT-20 in-flight items are unaffected (all use bare headings).

