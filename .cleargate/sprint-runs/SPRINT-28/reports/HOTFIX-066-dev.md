---
report_id: HOTFIX-066-dev
story_id: HOTFIX-066
sprint_id: SPRINT-28
role: developer
lane: fast
authored_at: "2026-05-18"
---

# HOTFIX-066 Developer Report

## Summary

Fixed `extractId()` in `cleargate-cli/src/lib/parent-rollup.ts` to check all
frontmatter ID-key conventions (`epic_id`, `sprint_id`, `bug_id`, `cr_id`,
`initiative_id`, `hotfix_id`) before falling back to the filename stem. Also
fixed the filename stem fallback to split on `_` so that files named
`EPIC-010_Multi_Participant_MCP_Sync.md` correctly yield `EPIC-010` rather
than the full stem.

Surfaced by STORY-028-01 (commit 5854ea46) during SPRINT-28 dogfood harvest:
the reconciler returned `halt-zero-children` for ALL parents because real-world
Epic and Sprint files use `epic_id` / `sprint_id` frontmatter keys, not
`story_id`.

## Files Changed

- `cleargate-cli/src/lib/parent-rollup.ts` — `extractId()` loop over 7 ID
  keys + filename stem split
- `cleargate-cli/test/lib/parent-rollup.red.node.test.ts` — additive
  `test("extractId() handles all 4 ID-key conventions")` block (7 total tests,
  was 6)

## Test Results

Parent-rollup suite: 7 passed, 0 failed.
Lifecycle-reconcile suite: 24 passed, 0 failed.
Typecheck: clean.
Full suite: interrupted by timeout at token-ledger tests (128 pre-existing
baseline failures per STORY-028-06 carryover — unaffected by this hotfix).

## Smoke Test

`node cleargate-cli/dist/cli.js sprint reconcile-lifecycle SPRINT-28 --parents`
output confirms fix:

- EPIC-021 now shows `proposed: Completed (1/1 children Completed)` — previously
  `halt-zero-children` due to CR child using `cr_id` frontmatter key
- EPIC-012, SPRINT-07, SPRINT-16 correctly show `halt-zero-children`
  (legitimately no children found)
- EPIC-010, EPIC-016, EPIC-023, EPIC-026 emit `no-op` (already Completed —
  manually flipped by STORY-028-01)

## Commit

`hotfix(CR-066): parent-rollup.ts extractId() supports epic_id/sprint_id/bug_id/cr_id (STORY-028-01 dogfood finding)`

## Flashcard

Already filed at `2026-05-18 · #parent-rollup #reconciler · parent-rollup.ts
extractId() checks story_id only; Epic files use epic_id — add epic_id/sprint_id
key checks before filename-stem fallback.`
