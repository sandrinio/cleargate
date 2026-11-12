# STORY-063-07 Dev report

role: developer

STATUS: done
COMMIT: 1c5bb1c on story/STORY-063-07 (cleargate-cli). No dry-run fixes were needed, so no second commit.
TYPECHECK: pass
TESTS: full `npm test` 4098 tests, 4096 pass, 0 fail, 2 skipped. Integration file clean-room-ingest-loop.red: 100/100 pass. Baseline clean-room-claude-baseline.red integration (after commit): 13/13 pass.

## Files
- new scripts/clean-room/session.mjs (runClaudeSession + ledger helpers moved verbatim; adds maxTurns=4, maxBudgetUsd=1, timeoutMs=300000 defaults, so baseline argv/timeout are unchanged)
- new scripts/clean-room/ingest-loop.mjs, new scripts/clean-room/fixtures/ingest-loop/ (8 seed files)
- scripts/clean-room/claude-baseline.mjs: import line added, four functions and SESSION_TIMEOUT_MS removed, nothing else
- scripts/clean-room/evidence.mjs: INGEST_LOOP_CHECKS added, GATING_CHECKS untouched
- outer repo (NOT committed): .cleargate/knowledge/clean-room-verification.md §5.1
- outer repo (NOT committed): .cleargate/sprint-runs/_off-sprint/EPIC-063/evidence/ingest-loop-evidence.md (dry-run evidence, D8 path)

## Dry run (1 run of the 2 allowed)
`run --ref story/STORY-063-07 --container /Users/ssuladze/Documents/Dev/cg-cleanroom-d7-ingest`; `check` exit 0. Cost ~$0.44 total (0.196 + 0.181 + 0.068), 115 s. cleargate resolved to <container>/tools/bin/cleargate (installArtifact identity gate). claude 2.1.322, model claude-sonnet-5-5.
All nine PASS (pointers in the evidence file). Positive and negative sessions took 6 turns each, shell 2.
Observation: the real sonnet streams each had ONE result (resultCount 1), not the two seen in the haiku probe, so the contradict dispatch ran to completion inside one segment. The parser handles both shapes (pinned by tests). No retry was needed, so the attempt-2 path was not exercised live. Transcripts remain in <container>/evidence/ (not committed, privacy).

## Notes
- Seeds are template-substitution only (objective, rule, metric, prior-work), each anchor required exactly once; `cleargate gate check` on each seed, refusal = exit 2.
- A session error never retries-skips: attempt 2 runs iff attempt 1's finding is not PASS (literal D3.8).

## Arch bounce 1
- F1: `run` resolves the evidence path first; a `refuse(reason)` helper appends nine FAIL rows (`run refused (exit 2): <reason>`) when `--evidence` was given or the file exists. Routed: missing tool, refused container, seed refusal. One new spawn test (decision 18) added to the integration file: 9-PASS file, refused `run` exits 2, `check` then exits 1. Existing test cases untouched.
- F2a-d: §5.1 rewritten (one or two results; observed $0.44 with $9/$12 ceiling; max-turns reset stated as unproven, 20 = margin; full exit-2 list incl. seed drift and non-unique edit text, refusal still appends FAIL; `--label` in usage). Outer file, uncommitted.
- N1: multi-attempt finding pointers shorten transcript paths to basenames.
- N3: dispatch needs >=1 SubagentStop with exit 0 (unrelated non-zero stops tolerated).
- N4: room commit passes `-c commit.gpgsign=false`.
- N5: `resetRoomForRetry({room, ref})` resets to the recorded seed SHA (default HEAD, so the A7 test still passes).
- N6: parseSessionStream docstring fixed. NOT done: the test-file header LIMITS wording (lines 37-38), since existing test content is immutable for me; QA-Red/orchestrator may fix it.
