---
report_id: HOTFIX-066-qa
story_id: HOTFIX-066
sprint_id: SPRINT-28
role: qa
lane: fast
authored_at: "2026-05-18"
---

# HOTFIX-066 QA Report

## Verdict Summary

STORY: HOTFIX-066
QA: PASS
TYPECHECK: pass
TESTS: 7 passed, 0 failed, 0 skipped (parent-rollup suite); 24 passed, 0 failed, 0 skipped (lifecycle-reconcile suite)
ACCEPTANCE_COVERAGE: 1 of 1 acceptance scenario has a matching test (all 4 ID-key conventions tested via 4-case loop)
MISSING: none
REGRESSIONS: none (6 existing parent-rollup scenarios all pass; 24 lifecycle-reconcile scenarios unaffected)

## Verification Checklist

### 1. Fix Correctness (parent-rollup.ts extractId())
- PASS. Loop over 7 keys: `story_id`, `epic_id`, `sprint_id`, `bug_id`, `cr_id`, `initiative_id`, `hotfix_id` in priority order before stem fallback.
- PASS. Stem fallback corrected: `stem.split('_')[0] ?? stem` — `EPIC-010_Multi_Participant_MCP_Sync.md` yields `EPIC-010`, not `EPIC-010_Multi_Participant_MCP_Sync`.
- Confirmed at `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/HOTFIX-parent-rollup-extractid/cleargate-cli/src/lib/parent-rollup.ts` lines 65-81.

### 2. Additive Test
- PASS. `test("extractId() handles all 4 ID-key conventions")` block added at line 165.
- Covers `epic_id`, `sprint_id`, `bug_id`, `cr_id` via 4-case loop against `rollUpParentStatus()` public surface.
- Assertions: `result.parent_id === value` (ID-key read correctly) + `result.verdict === 'no-op'` (already-terminal short-circuit).
- All 6 original scenario blocks (lines 65-271) are UNTOUCHED. `import` line updated from `{ describe, it, before, after }` to `{ describe, it, test, before, after }` — additive only.

### 3. Smoke Test
- ADVISORY: No `.hotfix-smoke.log` file exists on disk (neither in worktree nor in main repo). Dev report contains the smoke output inline as prose (HOTFIX-066-dev.md §Smoke Test). The dispatch check criterion was "smoke log exists at `.cleargate/.hotfix-smoke.log` (or wherever Dev wrote it)."
- The inline report is auditable evidence the smoke ran. QA confirms EPIC-021 uses `epic_id` key (verified via grep), making the reported `halt-zero-children` → `halt-partial 1/1` outcome semantically plausible and consistent with the fix. Treating as ADVISORY-only — not a FAIL.

### 4. Commit Scope — 3 files exactly
- PASS. Commit 77ece291 touches exactly:
  1. `.cleargate/sprint-runs/SPRINT-28/reports/HOTFIX-066-dev.md`
  2. `cleargate-cli/src/lib/parent-rollup.ts`
  3. `cleargate-cli/test/lib/parent-rollup.red.node.test.ts`
- No MANIFEST.json, no EPIC-021, no archive patches in commit.

### 5. Regression Check
- PASS. 6 original parent-rollup scenarios: all pass (Scenario 1–6, 6/6 assertions clean).
- PASS. 24 lifecycle-reconcile scenarios: all pass (unaffected by extractId() change).
- Typecheck: exit 0.

### 6. Bug Semantically Resolved
- PASS. EPIC-021 uses `epic_id: EPIC-021` frontmatter (confirmed via grep of live pending-sync). Pre-fix, extractId() returned the full filename stem; post-fix, it returns `EPIC-021`. The reconciler can now enumerate EPIC-021's CR children correctly, resolving the `halt-zero-children` regression from STORY-028-01 dogfood.

## VERDICT

Ship it. The extractId() loop correctly covers all 7 ID-key conventions in template-defined priority order, the stem-split fallback fix is correct, the additive test covers all 4 newly-supported keys without touching the 6 existing QA-Red scenarios, typecheck is clean, both touched test suites are 100% green, and commit scope is exactly the 3 declared files with no side-effect changes included. One advisory: smoke output is in the dev report prose rather than a dedicated log file — not a blocking issue.

## flashcards_flagged
- "2026-05-18 · #qa #hotfix-verify · Hotfix smoke logs should be written to a file path cited in dev report, not only as inline prose — enables future audit trail."
