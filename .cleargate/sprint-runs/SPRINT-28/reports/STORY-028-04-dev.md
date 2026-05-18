# STORY-028-04 Developer Report (qa-bounce fix)

**Story:** STORY-028-04 — Vitest → node:test Codemod Tool
**qa_bounces:** 1
**Commit:** 452d2717
**Branch:** story/STORY-028-04

## Summary

QA-Verify failed on 4/6 Gherkin §2.1 scenarios because the existing Red test Scenario 4 tested import rewrite (not `.spec.ts` rename) and the Red test had no assertion for Scenario 6 (target collision). The prior dev commit `27db506e` had correct impl for both cases.

This qa-bounce commit adds:
1. `scenario-04b-spec-rename/` fixture (input.spec.ts + expected.node.test.ts)
2. `scenario-06b-collision/` fixture (input.test.ts + input.node.test.ts pre-existing)
3. Two new `describe` blocks appended to the Red test (additive, no existing block modified)

SKIP_RED_GATE=1 used — authorized by orchestrator via qa-bounce re-dispatch.

## Test Results

35 passed, 0 failed (29 prior + 6 new)

## Typecheck

Clean (`tsc --noEmit` in cleargate-cli/)

## Files Changed

- `cleargate-cli/test/scripts/codemod-vitest-to-node-test.red.node.test.ts` — 2 new describe blocks appended
- `cleargate-cli/test/fixtures/codemod-vitest/scenario-04b-spec-rename/input.spec.ts` — NEW
- `cleargate-cli/test/fixtures/codemod-vitest/scenario-04b-spec-rename/expected.node.test.ts` — NEW
- `cleargate-cli/test/fixtures/codemod-vitest/scenario-06b-collision/input.test.ts` — NEW
- `cleargate-cli/test/fixtures/codemod-vitest/scenario-06b-collision/input.node.test.ts` — NEW

## SKIP_RED_GATE Bypass Log

Authorized by orchestrator dispatch (qa_bounces=1 re-dispatch instruction). The Red test file was modified additively — no existing describe/it block was changed or removed.
