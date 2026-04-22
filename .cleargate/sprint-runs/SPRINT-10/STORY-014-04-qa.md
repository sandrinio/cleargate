---
story_id: "STORY-014-04"
sprint_id: "SPRINT-10"
role: "qa"
verdict: "kicked-back"
checked_at: "2026-04-21"
commit: "900cfb0"
qa_bounces: "0"
arch_bounces: "0"
---

# QA Report: STORY-014-04 Test-Failure Ratchet

## Typecheck
PASS — cleargate-cli: 0 errors.

## Test Results
Gherkin test (test_test_ratchet.sh): 5/5 passed, 0 failed (all via CLEARGATE_TEST_VITEST_JSON seam).

## Acceptance Coverage: 5 of 5 Gherkin scenarios covered (via test seam only)

## Critical Bug: Real invocation fails
`node .cleargate/scripts/test_ratchet.mjs check` run without the test seam outputs:
  "test_ratchet: failed to parse vitest JSON output."
  
Root cause: vitest stdout is contaminated with non-JSON lines from test suites that invoke
bash subprocesses (init_sprint, assert_story_files, etc.). These tests write to stdout,
which appears before the JSON blob. `JSON.parse(result.stdout)` fails immediately.

Verified:
  cd cleargate-cli && npx vitest run --reporter=json 2>/dev/null | head -1
  → "v1 mode active — command inert. Set execution_mode: v2 in sprint frontmatter to enable."
  (Non-JSON, before the JSON object)

The pre-commit hook `pre-commit-test-ratchet.sh` calls `node test_ratchet.mjs check` which
will always exit 2 (parse failure) instead of 0 or 1. The ratchet gate is broken at the
real integration level.

Required fix: In `runSuite()`, extract the last JSON object from stdout (or use `--outputFile` 
flag to write JSON to a temp file, or strip non-JSON prefix lines).

## Additional Flags
1. Pre-commit hooks not live (`.claude/hooks/pre-commit-test-ratchet.sh` missing).
2. Baseline 828 was generated with Postgres running; current environment shows 806 passed.
   Ratchet check would block M2 commits as false regressions even if JSON parsing were fixed.
3. R7 latency: ~44s confirmed.

## Verdict: KICKED BACK
Real `test_ratchet.mjs check` invocation fails with JSON parse error. Fix runSuite() to
handle non-JSON stdout prefix before JSON.parse().
