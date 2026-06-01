# STORY-043-02 Developer Report

**Story:** STORY-043-02 — Readiness Predicate Heading-Text Anchoring
**Sprint:** SPRINT-33
**Branch:** story/STORY-043-02 (in cleargate-cli/.worktrees/STORY-043-02/)
**Commit:** 1002e90

## Status

STATUS: done
COMMIT: 1002e90
TYPECHECK: pass
TESTS: red test 5/5 passed + full suite 1432 passed, 738 failed (738 pre-existing, baseline 741 fail — net improvement +3 fixes from red tests going green)
FILES_CHANGED:
  - cleargate-cli/src/lib/readiness-predicates.ts
  - cleargate-cli/test/lib/readiness-predicates.node.test.ts

## Implementation Summary

Added `headingTitleOf(line: string): string | null` as an exported helper that:
1. Returns `null` if the line doesn't start with `#`
2. Strips the leading `#`+ run and spaces
3. Strips an optional numeric prefix (`N`, `N.`, `N.N`, `N.N.N`) + whitespace
4. Returns the remaining text trimmed

Reworked `evalBodyContains` to detect heading needles via `headingTitleOf(needle)`. When non-null, scans body lines by their title rather than literal substring — making `## 3.5 Existing Surfaces` match the needle `## Existing Surfaces`. Non-heading needles fall through to the unchanged literal `indexOf` path.

Reworked `evalExistingSurfacesVerified` to replace `part.startsWith("## Existing Surfaces")` with `headingTitleOf(firstLine) === 'Existing Surfaces'`, making the locator tolerant of numbered/releveled headings.

Extended `test/lib/readiness-predicates.node.test.ts` with 4 new cases per §4.1:
1. Numbered heading match (`## 3.5 Existing Surfaces`)
2. Releveled heading match (`### Why not simpler?`)
3. Plain-substring-unchanged (non-heading needle stays literal)
4. Numbered-section `existing-surfaces-verified` locator

## r_coverage
- { r_id: "R1", covered: true, deferred: false, clarified: false }  — headingTitleOf helper added, reused by both evaluators
- { r_id: "R2", covered: true, deferred: false, clarified: false }  — evalBodyContains uses heading-title anchoring for heading needles
- { r_id: "R3", covered: true, deferred: false, clarified: false }  — H-level independent (### and ## both match)
- { r_id: "R4", covered: true, deferred: false, clarified: false }  — plain needles unchanged (literal substring)
- { r_id: "R5", covered: true, deferred: false, clarified: false }  — evalExistingSurfacesVerified uses headingTitleOf
- { r_id: "R6", covered: true, deferred: false, clarified: false }  — single shared headingTitleOf reused by both
- { r_id: "R7", covered: true, deferred: false, clarified: false }  — numeric prefix forms covered: N, N., N.N, N.N.N
- { r_id: "R8", covered: true, deferred: false, clarified: false }  — 4 new unit tests per §4.1

## plan_deviations
[]

## adjacent_files
- cleargate-cli/src/lib/readiness-predicates.ts (edited)
- cleargate-cli/test/lib/readiness-predicates.node.test.ts (edited)

## flashcards_flagged
[]

## Notes

Pre-existing failures (738) are entirely unrelated to this story — they cover agent-developer-section, wiki mirror parity, snapshot drift, and other stories not yet implemented in SPRINT-33. Baseline was 741 failures; my change reduced to 738 (3 red tests now green). The 4 new canonical test cases all pass. `headingTitleOf` is exported so QA-Verify can import and unit-test it directly if needed.
