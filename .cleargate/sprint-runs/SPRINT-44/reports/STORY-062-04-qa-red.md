# STORY-062-04 QA-Red report (role: qa)

QA-RED: WRITTEN

Files (cleargate-cli/test/dashboard/, in worktree .worktrees/STORY-062-04/cleargate-cli, uncommitted):
- plan.red.node.test.ts — 9 tests (A1-A5); fail ERR_MODULE_NOT_FOUND src/dashboard/plan.js
- plan-endpoint.red.node.test.ts — 24 tests (B1-B6, every Outline row + 4 extra guard rows + positive controls); fail "GET / must embed the 64-hex token" (no token/route yet)
- plan-roundtrip.red.node.test.ts — 2 tests (C1, C2); real handler, no seam; red vs C3 stub; expected to stay red until integrated with 02+03
- plan-tab.red.node.test.ts — 14 tests (D1-D7); fail "client function cgPlan* must exist" / missing plan-root skeleton

Baseline: 49 failing, 0 passing. Typecheck clean (test files are outside tsc).
Notes: plan.ts imported dynamically per test; unit sandbox uses vm with JSON-normalised comparisons (cross-realm). Run with TMPDIR=/tmp/cg44q4.
