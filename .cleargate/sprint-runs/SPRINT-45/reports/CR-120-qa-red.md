# CR-120 QA-Red report (SPRINT-45)

role: qa · Mode: RED · worktree `.worktrees/CR-120/cleargate-cli` (branch story/CR-120 @ e1e8ad0). Nothing committed.

## Files
- NEW `test/scripts/subagent-ledger.red.node.test.ts` (32 tests)
- NEW fixtures `test/fixtures/subagent-ledger/transcripts/{sess-a,sess-b,sess-c}/` (18 static files, synthetic, each transcript carries PRIVATE-MARKER-7f3a)
- EDIT `test/snapshots/hooks-snapshots.node.test.ts`: story-058-11 case demoted to existence-only; new `token-ledger.sh matches the CR-120 snapshot byte-for-byte` against `hooks/token-ledger.cr-120.sh` (Developer creates by `cp` of edited hook; NOT created).
- EDIT `test/scaffold/skill-md-serial-pointers.red.node.test.ts`: Test 20 re-scoped to P1/P2 verbatim directly after anchor + one blank line (fixture sha pin kept; line-count and byte-reproduction asserts dropped). Tests 21/22 untouched.

## Fixture (expected over sess-a+sess-b = 6 dispatches)
t1 developer (msg_1 duplicated; turns 2, tool_uses 3, usage 11/7/103/24), t2 qa (interrupt text block, <synthetic> msg), wf_fixture w1 QA-Red (tool_result quoting the interrupt words -> must stay completed:true), w2 Build, w3 Verify, journal.jsonl; sess-b: meta-only t1 copy, b1 (hook_cancelled), full copy of t2 (same toolUseId -> once); sess-c c1 outside window (fallback only, 7th row if unwindowed). Token totals over the 6: in 52, out 32, cache_read 359, cache_creation 70.

## Baseline (npm run test:file; typecheck clean)
- subagent-ledger.red: 32 tests, 28 fail, 4 pass. Passing = guards: CLI 4c (exit 1 missing ledger / exit 2 no id), pre-gate "bad mode -> exit 2, no line", pre-gate "scan exit stays 1", live/canonical path guard.
- hooks-snapshots: 16 pass, 1 fail (CR-120 snapshot file missing: correct reason, Developer `cp`).
- skill-md-serial-pointers: 3 pass (Test 20 is a guard at baseline, by design of the re-scope; it stays green after the new paragraph is added).
- Reasons verified: hook case fails with `measures` undefined (row is written, so the failure is the field, not wiring); pre-gate fails "pre-gate.jsonl was not written" after the scan correctly exits 1; unit/CLI fail on stub [] / missing `subagent` key.

## Notes / vacuity
- Unit cases 3, 4, 6 assert specific values (turns, usage, `completed`) so they cannot pass vacuously on [].
- Unit case 5 expects 5 rows from sess-a alone (t1,t2,w1,w2,w3).
- Case 3b (agent:<id> dedupe for workflow agents) and 6d (ledger dirs gone -> fallthrough) go beyond the M1 list but follow its design text.
- Asserted-by-design details the Developer must match: warning text `<session-id>: no subagents directory`, `no ledger sessions and no sprint window`; `report.window` `{start,end}` strings equal the events.jsonl ts; sessions returned as absolute dirs; `writeSubagentLedger` returns path or null; CLI human lines `Per-agent breakdown (orchestrator window):` and `Subagent dispatches (from transcripts): 6 across 2 sessions`; `subagent.tokens.total` = sum of four; `subagent.interrupted` = 2.
- Hook test runs the canonical hook by canonical path with ORCHESTRATOR_PROJECT_DIR; Codex copy asserted to contain `measures` and equal canonical (guards gen:codex).
- Rule 17 note: the live token-ledger.sh and live SKILL.md are never touched by these tests.
