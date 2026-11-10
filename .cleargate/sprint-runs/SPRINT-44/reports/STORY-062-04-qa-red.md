# STORY-062-04 QA-Red report (role: qa)

QA-RED: WRITTEN

Files (cleargate-cli/test/dashboard/, in worktree .worktrees/STORY-062-04/cleargate-cli, uncommitted):
- plan.red.node.test.ts — 9 tests (A1-A5); fail ERR_MODULE_NOT_FOUND src/dashboard/plan.js
- plan-endpoint.red.node.test.ts — 24 tests (B1-B6, every Outline row + 4 extra guard rows + positive controls); fail "GET / must embed the 64-hex token" (no token/route yet)
- plan-roundtrip.red.node.test.ts — 2 tests (C1, C2); real handler, no seam; red vs C3 stub; expected to stay red until integrated with 02+03
- plan-tab.red.node.test.ts — 14 tests (D1-D7); fail "client function cgPlan* must exist" / missing plan-root skeleton

Baseline: 49 failing, 0 passing. Typecheck clean (test files are outside tsc).
Notes: plan.ts imported dynamically per test; unit sandbox uses vm with JSON-normalised comparisons (cross-realm). Run with TMPDIR=/tmp/cg44q4.

## Re-dispatch 1

role: qa

- Written: `test/dashboard/plan-stale-claims.red.node.test.ts` (E1 Abandoned excluded; E2 stale/open claim rows, exact warnings and order; E3 re-read per call; E4 parity with the real `sprintScopeHandler`).
- Re-scoped: `test/dashboard/plan.red.node.test.ts` test A4 — added `sprintFile(d, 'SPRINT-42');` after the SPRINT-43 fixture line so BUG-052/BUG-060 are claimed by an open sprint. No assertion changed (M2 §A4.1, CR-124 step 6).
- Baseline at 39a513c: plan-stale-claims.red 0 pass / 4 fail (behavioural; E4 additionally red on the C3 stub until integration); plan.red 9/9 pass; `tsc --noEmit` exit 0.
- Not committed; orchestrator commits.
