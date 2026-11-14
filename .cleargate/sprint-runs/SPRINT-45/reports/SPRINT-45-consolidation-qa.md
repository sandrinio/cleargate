# SPRINT-45 consolidation QA (Mode: CONSOLIDATION, read-only)

Tree: cli worktree `.worktrees/S-45-consolidation/cleargate-cli`, branch `consolidation/S-45`, HEAD 7d93c52 on cli main 8de3d7c.

## Verdict
QA: PASS. 7d93c52 introduced no failure. The set of failing tests is byte-identical at 8de3d7c and 7d93c52 for both the full suite (0 failures at both) and all 104 integration files (111 failures at both).

## Runs
- `npm run typecheck`: exit 0. `npm run build`: exit 0.
- `npm test` (TMPDIR=/private/tmp/s45k): 5562 tests, 5560 pass, 0 fail, 2 skipped. Same as 8de3d7c.
- Integration (104 files, `npm run test:file`, one batch, sequential): 860 tests, 751 pass, 67 fail-lines at suite level, 7 skipped. Leaf failures listed in the node summary: 111.
  - Same 104 files run at a detached 8de3d7c tree (nested under the host so ../ paths resolve; node_modules symlinked; prebuild + build): 860 / 751 / 67 / 7, and the sorted (file, test) failure list `diff`s identical to 7d93c52's (111 = 111). Throwaway tree removed.
  - Note: `npm test` skips `*.integration.node.test.ts`, so `baseline-failures-dbccc79.txt` (built from `npm test`) covers only the 2 test_close_sprint_v21 entries below.
- 7d93c52 file list: `scaffold/core/.cleargate/scripts/prep_reporter_context.mjs`, `scaffold/core/.cleargate/scripts/subagent-ledger.mjs`, `src/commands/upgrade.ts`, `src/init/detect-test-stack.ts`. No test file, no `*.red.node.test.ts` or `*.red.integration.node.test.ts`, no snapshot.

## Failures (all 111 integration leaves; 0 in the full suite)
Caused by 7d93c52: none (identical set at 8de3d7c).

K (rule 17), 4 tests:
- canonical-live-parity.red.integration: 5a `.cleargate/templates/*.md canonical = live`; 5d `.claude/hooks/token-ledger.sh canonical = live`. (5c passes here.)
- sprint-execution-mirror.integration: `diff command on live vs canonical returns empty output`.
- template-stubs.integration: `sprint_report.md: live === mirror`.
Doctor scaffold-drift lines are not a test failure here.

B (baseline list, `npm test`-built): test_close_sprint_v21.integration `stderr contains "Step 3.5 FAILED"…` and `improvement-suggestions.md contains CAND-SPRINT-TEST-S entry`.

N, pre-existing, not from 7d93c52 (107 incl. the two B above counted separately; 105 further):
- Re-run at dbccc79 (pre-sprint) and also failing there, so NOT from a sprint merge (23 failing tests in 9 files): test_close_sprint_v21 (4), token-ledger-resolver.red (5), gate-v2 (3), gate-run (1), token-ledger-delta (1), test_update_state (3), template-sync-fields (4), agent-developer-section (1), close-sprint-reconcile (1). These are environment/live-copy drift in the outer repo, not sprint code.
- Not re-run at dbccc79, identical at 8de3d7c, subject untouched by the sprint's src/scaffold diff (`git diff --name-only dbccc79 8de3d7c`): codemod-vitest-to-node-test.red (27), bootstrap-root (25, needs Postgres), admin-vitest-conversion.red (6), readme-qa-doc-truth-043-06.live (5), mcp-vitest-conversion.red (4), cli-vitest-conversion.red (4), protocol-section-24 (3), test_version_bump_alignment (2), foreign-repo (2), hotfix-new (2), decisions-corpus.live (1), dogfood-install (1), snapshot-drift (1). Origin: not established to a merge; none of their subjects were touched by the sprint.

Flakes (F): none seen.

## test_close_sprint_v21 Scenario 10: consolidation agent's claim REFUTED
Claim: "pipeline exits 1 / sprint_status stays Active when Step 3.5 fails" newly fails because STORY-064-02 SC-1 turned a missing token-ledger.jsonl from exit 1 into warning + exit 0.
- Failing assertions: `test/scripts/test_close_sprint_v21.integration.node.test.ts:707` `assert.strictEqual(result.status, 1)` ("0 !== 1"), and the Active check in the next test (`:710-714`, `assert.strictEqual(state.sprint_status, 'Active')`). The premise is the comment at :668 ("No token-ledger.jsonl -> prep_reporter_context.mjs exits 1 (hard error per R4)").
- Premise is stale, but not because of STORY-064-02: at detached dbccc79 the same file fails the same assertion (`0 !== 1` at :707), plus the `Step 3.5 FAILED` stderr test and CAND-SPRINT-TEST-S. BUG-081's "absent ledger is recoverable, WARN and continue" block already exists in `prep_reporter_context.mjs` (`BUG-081` comment at ~:450; introduced by 66ed73a EPIC-058 / earlier). STORY-064-02 (a694218) only restated it in the header. Origin merge: none from SPRINT-45 (pre-existing at dbccc79). Stale-test fix is QA-Red territory and is out of scope here.
- Note: the header comment at prep_reporter_context.mjs:32 still says "1 - token-ledger.jsonl missing (hard error per story R4)" at dbccc79; STORY-064-02 corrected it.

## Hygiene
Throwaway worktrees at dbccc79/8de3d7c removed; consolidation worktree `git status --porcelain` is empty. No implementation, test or scaffold file edited.
