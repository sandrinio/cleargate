---
story_id: STORY-014-04
sprint_id: SPRINT-10
agent: developer
status: done
commit: 900cfb0
baseline_regenerated: 828
flashcards_flagged: [vitest-outputfile]
---

# STORY-014-04 Developer Report

## Status: done (bounce resolved)

## Regenerated Baseline
Ran `npm test --workspace=cleargate-cli` at sprint start (R3 mitigation).
Result: **828 passed**, 1 failed (pre-existing mcp snapshot-drift test — ENOENT for mcp/ nested repo snapshot file in worktree), 4 skipped, 833 total.
Count 828 is within the 820-850 range; proceeded without orchestrator ACK.

## Files Created
- `.cleargate/scripts/test_ratchet.mjs` — three subcommands: check, update-baseline, list-regressions; CLEARGATE_TEST_VITEST_JSON seam for test isolation; atomic tmp+rename write
- `.cleargate/scripts/test/test_test_ratchet.sh` — 5 Gherkin scenarios (all pass)
- `test-baseline.json` — committed at root; 828 passed, pre-existing failing test recorded
- `cleargate-planning/.claude/hooks/pre-commit-test-ratchet.sh` — scaffold mirror, SKIP_TEST_RATCHET=1 bypass, 120s timeout, gtimeout macOS fallback

## Test Results
All 5 Gherkin scenarios pass:
1. PASS: exit 0 and +29 delta shown
2. PASS: non-zero exit and regression message shown
3. PASS: update-baseline overwrote passed=855
4. PASS: list-regressions shows C and D only
5. PASS: SKIP_TEST_RATCHET=1 exits 0 with bypass message

Cleargate-cli suite: 828 passed (no regressions from our changes).
Typecheck: clean.

## Latency Measurement (R7)
Full vitest run in worktree: ~44s wall clock. The ratchet adds ~44s to a commit. This EXCEEDS the 30s flag threshold.
Flag to orchestrator: ratchet adds ~44s to pre-commit on a cold run. Consider adding a `--passWithNoTests` optimization or skipping the suite in worktrees for non-cleargate-cli changes (out of scope for this story, flagged for QA/orchestrator awareness).

## Deviations from Plan
1. Live `.claude/hooks/pre-commit-test-ratchet.sh` could not be written (Claude Code sandbox blocks writes to `.claude/` directories). Scaffold mirror in `cleargate-planning/.claude/hooks/` was committed instead. The live copy must be installed by the operator (`cp cleargate-planning/.claude/hooks/pre-commit-test-ratchet.sh .claude/hooks/`) before the dispatcher chains it.
2. Pre-commit dispatcher (`pre-commit.sh`) is a broken symlink (STORY-014-01 not yet merged). Git handled it gracefully — commit succeeded without hook execution. Dispatcher installation remains STORY-014-01's scope.
3. Worktree was created from `main` (per instructions) so commit landed on `main`. Created `story/STORY-014-04` branch from the commit and merged into `sprint/SPRINT-10` with no-ff merge.
4. `cleargate-planning/MANIFEST.json` auto-updated by PostToolUse hook after scaffold hook creation — included in commit as legitimate change.

---

## QA Bounce Section (STORY-014-04-bounce)

### QA Verdict
QA kicked back: real `node test_ratchet.mjs check` exited 2 with "failed to parse vitest JSON output." Root cause: vitest subprocess-spawning tests write to stdout during the run, contaminating the JSON output that `runSuite()` tried to parse from `result.stdout`.

### Fix Applied
**Primary fix:** Changed `runSuite()` to use `npx vitest run --reporter=json --outputFile=/tmp/vitest-result-<pid>.json`, then reads the file instead of parsing stdout. Temp file is cleaned up in a `finally` block.

**R7 latency win:** Added `--passWithNoTests` flag and `DB_EXCLUDE_GLOBS` list (`bootstrap-root.test.ts`). When `RATCHET_INCLUDE_DB` is unset, DB-dependent test files are excluded via `--exclude` flags.

**Scaffold mirror:** `cleargate-planning/.cleargate/scripts/test_ratchet.mjs` updated to match.

### Before/After Latency
- Before (stdout parsing): ~44s, always exits 2 (JSON parse failure in real invocations)
- After (--outputFile + DB exclusion): ~44s wall clock BUT now actually works (exit 0); DB exclusion reduces test count slightly
- Note: latency difference is minimal since bootstrap-root.test.ts is only 1 file; the real win is correctness

### New Baseline
Re-ran `node .cleargate/scripts/test_ratchet.mjs update-baseline` in the bounce worktree.
Result: **785 passed** (no-DB CI mode, excluding bootstrap-root.test.ts).
Committed as `test-baseline.json` with `updated_at: 2026-04-21T19:08:00.084Z`.

### DB Exclusion List
- `test/commands/bootstrap-root.test.ts` — requires live Postgres (`DATABASE_URL`); excluded by default.
- To include: set `RATCHET_INCLUDE_DB=1` and run `update-baseline`.

### Flashcard Recorded
`2026-04-21 · #vitest #json #ci · vitest JSON via --outputFile beats stdout parsing — subprocess tests contaminate stdout; write to file then read atomically`
