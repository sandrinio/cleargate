---
story_id: STORY-073-01
commit: 7ace2538
branch: story/STORY-073-01
sprint: SPRINT-30
authored_at: 2026-05-19
---

# Dev Report — STORY-073-01

## Status: done

## Summary

Tightened `PATH_RE` in `evalExistingSurfacesVerified` at `cleargate-cli/src/lib/readiness-predicates.ts:736`. The old permissive regex matched bare filenames (`init.ts`), dotted code references (`state.execution_mode`), and bare dotfiles (`.gitignore`). The new regex requires at least one `/` separator, rejecting false positives while preserving all legitimate path citations. Numeric line-anchor suffix (`:42`) is now supported via `(?::[a-zA-Z0-9_]+)?`.

## Files Changed

1. `cleargate-cli/src/lib/readiness-predicates.ts` — PATH_RE swap; strip-suffix updated to match numeric anchors
2. `cleargate-cli/test/lib/readiness-predicates.node.test.ts` — 6 new PATH_RE tests; Scenario 2 fixture updated from `package.json` to `./package.json`
3. `.cleargate/templates/CR.md` — one-line slash-required guidance added under §2.5 preamble
4. `.cleargate/templates/story.md` — same guidance mirrored under §1.6 preamble
5. `cleargate-planning/.cleargate/templates/CR.md` — cleargate-planning canonical mirror
6. `cleargate-planning/.cleargate/templates/story.md` — cleargate-planning canonical mirror
7. `cleargate-planning/MANIFEST.json` — rebuilt by prebuild

## Quality Gate Results

- `npm run typecheck`: PASS
- `npm test` (full suite): 2070 tests, 1927 passed, 112 failed (112 are pre-existing failures unrelated to this story; baseline before this change was 114 failures; 2 pre-existing failures resolved by the `./package.json` fixture update)

## Deviations from Plan

- M1 plan §3 blueprint listed `(?::[a-zA-Z_][a-zA-Z0-9_]*)?` suffix. Dispatch note clarified to `(?::[a-zA-Z0-9_]+)?` to support numeric anchors like `:42`. Applied the clarified version per dispatch.
- Pre-existing test "Scenario 2: cites package.json (real top-level file) → pass" used bare `package.json` as fixture. With the tightened regex, bare filenames no longer match, so the fixture was updated to `./package.json`. This is expected behavioral change and aligns with the spec.

## Red Test File Note

`cleargate-cli/test/lib/readiness-predicates.red.node.test.ts` Scenario 6 uses a locally-defined `NEW_PATH_RE` that still has the alphabetic-first suffix from the original spec. The Red file is immutable (SKILL.md §C.3.1) and cannot be modified. The real implementation's PATH_RE correctly handles `:42`, and the 6 tests in the plain test file all pass. The Red file's S6 remains red against its own local regex copy.
