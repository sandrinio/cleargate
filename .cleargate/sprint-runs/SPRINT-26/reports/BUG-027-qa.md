---
story: BUG-027
sprint: SPRINT-26
authored_by: qa
authored_at: 2026-05-05
commit_verified: 12f4b8b
---

STORY: BUG-027
QA: PASS
TYPECHECK: pass
TESTS: 131 passed, 0 failed, 0 skipped (node:test full suite) + 8 passed, 0 failed (vitest snapshot suite)
ACCEPTANCE_COVERAGE: 4 of 4 Gherkin scenarios have matching tests

## Scenario Trace

| M1 Scenario | Red Test | Assertion | Result |
|-------------|----------|-----------|--------|
| S1 — Sentinel-first: prior ledger row overrides transcript grep | token-ledger-resolver.red.node.test.ts (Scenario 1, 2 tests) | row['work_item_id'] === 'EPIC-002'; no 'fallback grep' in hook log | PASS |
| S2 — Multi-epic transcript: dispatch-marker overrides lexical-first | token-ledger-resolver.red.node.test.ts (Scenario 2, 2 tests) | EPIC-002 from prior ledger row wins over EPIC-001 first in transcript | PASS |
| S3 — No-sentinel fallback: dispatch-marker log, not transcript grep | token-ledger-resolver.red.node.test.ts (Scenario 3, 2 tests) | EPIC-002 from dispatch-marker log; _off-sprint bucket row written | PASS |
| S4 — Snapshot-lock supersede: bug-027.sh baseline + cr-044 demoted | token-ledger-resolver.red.node.test.ts (Scenario 4, 3 tests) + hooks-snapshots.test.ts | bug-027.sh exists; live == bug-027.sh byte-for-byte; cr-044 existence-only | PASS |

## Mirror Chain

- canonical (`cleargate-planning/.claude/hooks/token-ledger.sh`) vs npm-payload mirror (`cleargate-cli/templates/cleargate-planning/.claude/hooks/token-ledger.sh`): IDENTICAL
- canonical vs worktree live (`.claude/hooks/token-ledger.sh`, force-tracked on story/BUG-027): IDENTICAL
- canonical vs snapshot (`cleargate-cli/test/snapshots/hooks/token-ledger.bug-027.sh`): IDENTICAL (488 lines)

## Plan Deviation Assessment

Dev synced `.claude/hooks/token-ledger.sh` in the worktree (force-tracked on story/BUG-027). The `canonical-live-parity.red.node.test.ts` (Scenario 5d) checks `.claude/hooks/token-ledger.sh` vs canonical but skips when the worktree `.git` is a file. In this worktree the live hook IS present and force-tracked, so the parity check would run and pass. Dev's sync is consistent with the red-test requirements and is NOT a smell — it prevents the Scenario 5d assertion from becoming a false failure post-merge. No concern.

## Snapshot Test Assertion

`hooks-snapshots.test.ts` line 155: byte-equality asserts live == `token-ledger.bug-027.sh`. Line 142-153: cr-044 demoted to existence-only (file still present). Both verified.

MISSING: none
REGRESSIONS: none

VERDICT: All 4 acceptance scenarios verified by direct test execution (9 node:test assertions, all pass). Typecheck clean. Full suite 131/131 + 8/8 vitest. Mirror chain 3-way identical. Snapshot supersede pattern correct. Plan deviation (force-tracked live hook) is consistent with canonical-live-parity test requirements, not a smell. Ship it.

flashcards_flagged:
  - "2026-05-05 · #snapshot #hooks #worktree · The story/BUG-027 branch force-tracks .claude/hooks/token-ledger.sh; canonical-live-parity Red test checks this — must sync on every hook edit."
