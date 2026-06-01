# QA Report — STORY-043-02

**Role:** qa
**Sprint:** SPRINT-33
**Story:** STORY-043-02 Readiness Predicate Heading-Text Anchoring
**Commit:** 1002e90 on branch story/STORY-043-02
**Date:** 2026-06-01
**Mode:** VERIFY

---

## Result

```
STORY: STORY-043-02
QA: PASS
TYPECHECK: pass
TESTS: 2297 total — 2172 passed, 86 failed (full cleargate-cli suite); 0 failures attributable to STORY-043-02
ACCEPTANCE_COVERAGE: 5 of 5 Gherkin scenarios (+ 4 canonical §4.1 cases)
MISSING: none
REGRESSIONS: none
VERDICT: ship it — all 5 sealed-red scenarios and all 4 canonical extension cases green; headingTitleOf is a single shared exported helper reused by both evalBodyContains and evalExistingSurfacesVerified; plain non-heading needles fall through to unmodified literal indexOf; the 7 predicate parser shapes and grammar are intact; typecheck is clean; the 86 full-suite failures are all pre-existing (credential/token-store, admin-api, CLI v1-inert wrappers, wiki protocol-mirror, STORY-028 codemod, handle-validation) — none touch readiness-predicates or any file changed in this commit.
flashcards_flagged: []
```

---

## Verification Detail

### Diff Scope
Commit 1002e90 touches exactly 2 files:
- `cleargate-cli/src/lib/readiness-predicates.ts` (+77, -3)
- `cleargate-cli/test/lib/readiness-predicates.node.test.ts` (+121, +0)

No `mcp/` or `admin/` changes. Sealed red test `test/lib/readiness-predicates-heading-anchor.red.node.test.ts` was committed in the prior QA-Red commit (3ffb4e6) and is unchanged.

### Typecheck
`npm run typecheck` → exit 0, zero errors.

### Sealed Red Test Run (5/5)
`npx tsx --test test/lib/readiness-predicates-heading-anchor.red.node.test.ts` → 5 pass, 0 fail:
- S1: numbered heading "## 3.5 Existing Surfaces" passes body-contains ✔
- S2: numbered heading "## 3.6 Why not simpler?" passes body-contains ✔
- S3: existing-surfaces-verified locates numbered section + no "not-applicable" ✔
- S4: bare prose "Existing Surfaces" (no heading) fails body-contains (no false positive) ✔
- S5: non-heading needle "body contains 'Scenario:'" stays literal ✔

### Canonical Extension Test Run (102/102)
`npx tsx --test test/lib/readiness-predicates.node.test.ts` → 102 pass, 0 fail, 0 skip.
4 new §4.1 cases (numbered-heading match, releveled-heading match, plain-substring-unchanged, numbered-section locator) are all green.

### Gherkin-to-Test Map
| Scenario | Test Coverage |
|---|---|
| S1 Numbered Existing-Surfaces heading passes the reuse audit | S1 sealed-red + canonical Case 1 |
| S2 Releveled Why-not-simpler heading passes | S2 sealed-red + canonical Case 2 |
| S3 existing-surfaces-verified routes to a numbered section | S3 sealed-red + canonical Case 4 |
| S4 Plain substring needle stays literal and Errors are avoided | S4 sealed-red |
| S5 Non-heading needle Error path is unchanged | S5 sealed-red + canonical Case 3 |

### Code Review
- `headingTitleOf` defined once at L359 (`export function headingTitleOf`), used at L380 + L394 in `evalBodyContains` and at L791 in `evalExistingSurfacesVerified`.
- `evalBodyContains` non-heading fallback uses unchanged literal `body.indexOf(needle, pos)` at L427.
- `part.startsWith('## Existing Surfaces')` replaced by `headingTitleOf(firstLine) === 'Existing Surfaces'` at L791.
- Parser (`parsePredicate`) and 7 predicate shapes are intact (no grammar change verified).

### Full Suite
2297 tests run; 2172 pass, 86 fail. All 86 failures are pre-existing unrelated categories (no readiness-predicates entries). Baseline variance is within expected range per FLASHCARD `#qa #regression #baseline-variance` (count can vary ~15 across env). The test-baseline.json was deleted from main repo (git status shows `D test-baseline.json`) — this is pre-existing, not caused by this story.

