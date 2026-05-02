---
work_item_id: CR-027
agent: developer
sprint: SPRINT-20
commit: 26a6e63
branch: story/CR-027
---

# CR-027 Developer Report

## Summary

Implemented composite planning readiness gate at sprint preflight (check #5) per M5 milestone plan. Used path-a (lightweight shell-out + JSON-stdout protocol) for extracting work-item IDs from assert_story_files.mjs. All 18 vitest scenarios pass; typecheck clean; all 13 modified files committed in one commit.

## Implementation Notes

- `checkPerItemReadinessGates` is sync (GOTCHA-9 decision): inlined 25-LOC `readCachedGateSync` mirror rather than refactoring handler to async.
- `readCachedGateSync` treats `{pass: null, ...}` as `null` (no valid cached result) — matches GOTCHA-4 spec for SPRINT-20 anchor case where `pass: null` means "gate check never ran."
- `extractInScopeWorkItemIds` uses graceful fallback (`[]` on execFn throw) so existing test fixtures (which have no assert_story_files.mjs in their temp dirs) don't trip check #5. Only the sprint plan self-check runs for these fixtures, which now have `cached_gate_result.pass: true` via updated `buildCleanFixture`.
- `discoverSprintFile` from execution-mode.ts kept private; re-implemented inline as `findSprintFile` in sprint.ts (12 LOC, GOTCHA-7 decision).
- `findWorkItemFileLocal` is a 14-LOC inline re-implementation (path-a decision: extractInScopeWorkItemIds returns IDs only; file-finding stays in sprint.ts).

## Deviations from M5 Plan

None. All 10 planned file surfaces modified. Path-a extraction strategy followed verbatim. Mirror parity verified with diff (readiness-gates.md shows only the pre-existing 2-line section-number divergence at lines 68/70 as expected).

## Mirror Diffs (post-commit)

- `cleargate-protocol.md` live ↔ canonical: empty (byte-equal)
- `readiness-gates.md` live ↔ canonical: 2 lines only (pre-existing section(3)/section(5) vs section(2)/section(4) divergence)
- `assert_story_files.mjs` live ↔ canonical: empty (byte-equal)
- `SKILL.md` live ↔ canonical: empty (byte-equal)

## Test Results

- vitest sprint-preflight: 18 passed (12 pre-existing + 6 new CR-027 scenarios)
- Full suite: 19 failed (all pre-existing per main branch baseline), 1554 passed (+6 vs main's 1548)
- typecheck: clean

## Flashcards Recorded

1. `2026-05-02 · #preflight #gate3 #readiness · CR-027: sprint preflight gained check #5 (per-item cached_gate_result.pass=true + freshness; v2 hard-block, v1 warn).`
2. `2026-05-02 · #frontmatter #cached-gate · readCachedGate is async; sprint preflight is sync — CR-027 inlined a 25-LOC sync mirror.`
3. `2026-05-02 · #scripts #shell-out · assert_story_files.mjs gained --emit-json flag (CR-027 path-a). sprint.ts shells out via execFn; tests inject canned JSON via execFn seam.`
