# STORY-067-03 Developer Report

## Summary

Tightened `ARTIFACT_TERMINAL_STATUSES` from 8 elements to 4, extracted
`ARTIFACT_GATE_EXPECTED` constant, updated all callsites, updated tests and
parent-rollup fixtures, and appended the Status Vocabulary Mapping section to
`mcp/src/adapters/README.md`.

## Keep/Remove Decisions

| Status     | Decision | Reason |
|------------|----------|--------|
| Completed  | KEEP     | Sole canonical terminal post-CR-067 |
| Abandoned  | KEEP     | Explicit non-completion terminal; cleargate_id audit |
| Closed     | KEEP     | Issue-specific terminal; not subject to CR-067 |
| Resolved   | KEEP     | Bug-specific terminal; not subject to CR-067 |
| Done       | REMOVE   | CR-067 vocab unification; all artifacts migrated to Completed |
| Verified   | REMOVE   | CR-067 vocab unification; all artifacts migrated to Completed |
| Escalated  | REMOVE   | state.json story-state (TERMINAL_STATE_JSON), not artifact status |
| Parking Lot| REMOVE   | state.json story-state (TERMINAL_STATE_JSON), not artifact status |

## Files Changed (Outer Commit 1a3234d0)

- `cleargate-cli/src/lib/lifecycle-reconcile.ts` — 4-element set, ARTIFACT_GATE_EXPECTED const, updated 4 callsites
- `cleargate-cli/test/lib/lifecycle-reconcile.test.ts` — 4 assertions updated
- `cleargate-cli/test/fixtures/parent-rollup/FX2/archive/STORY-FX2-{01..07}.md` — 7 fixtures status: Done → Completed

## Files Changed (mcp/ Inner Commit 4aedec6)

- `mcp/src/adapters/README.md` — Status Vocabulary Mapping (CR-067) section appended (renamed §4 → §5 for existing "Adding a New Adapter")

## Test Results

- `npm run typecheck`: PASS (0 errors)
- `npm test`: 30 failures — all pre-existing QA-Red tests for STORY-066-02 (sprint-reconcile-lifecycle-parents.red.node.test.ts, close-sprint-step-2-6c.red.node.test.ts), CR-043 examples, and EPIC-028 codemod fixtures. Baseline stash verified: same 30 failures exist without my changes.
- `lifecycle-reconcile.test.ts` (vitest): 24/24 PASS
- `lifecycle-reconciler-orphan.red.node.test.ts` (node:test): 8/8 PASS

## Notes

The reconciler smoke test against SPRINT-27 exits 1 (20 drift items). This is
pre-existing — SPRINT-27 has actual drift unrelated to this story. The smoke test
exercises read-paths (reconciler runs without crash) which passes.

The MANIFEST.json in cleargate-planning/ was modified by the prebuild step during a
build attempt; reverted before commit.

The `Escalated` and `Parking Lot` elements in the original 8-element set were
state.json story-state vocab that had leaked into the artifact terminal set.
Their removal is a correctness fix (they were semantically wrong there).
