# BUG-134 QA-Red (SPRINT-45)

Worktree: .worktrees/BUG-134/cleargate-cli (story/BUG-134 @ dbccc79). Uncommitted, 2 new files; typecheck clean.

## test/init/merge-settings-order.red.node.test.ts (unit; 15 cases: 13 red, 1 GUARD, 1 red codex)
Dynamic import of `mergeUpstreamSettings`, `typeof === 'function'` asserted per case ("not yet implemented").
- 1a no user hooks -> upstream bytes; 1a2 same with stale ClearGate cmd; 1b guard.sh in Edit|Write -> [gate, guard], upstream group order; 1c user Bash group after upstream groups: RED
- 2 idempotent; 3 user hooks under Pre/Post/SessionStart kept; 4 user-only Stop first stays first; 5 user-only event stays before the ClearGate event it preceded; 5b after all -> appended; 6 user groups after upstream in original relative order + user hooks after ClearGate hooks; 7 user-only-event group untouched; 8 no mutation, top-level key order; 9 dup command not repeated: all RED
- 10 codex adapter mergeSurgeryTarget (.codex/hooks.json): ClearGate hooks first then user hook, upstream group order, user Bash group after: RED
- 11 codex idempotent + user Stop first + Bash group last: RED
- GUARD: mergeSettings (install path) still puts a user group before upstream groups: PASSES (pins "mergeSettings unchanged").
Result: 14 fail, 1 pass.

## test/commands/upgrade-settings-order.red.integration.node.test.ts (in-process upgradeHandler --yes --only cli-config)
Fixture: init, then settings = upstream minus PostToolUse Bash group (ClearGate-side edit forces take path; no fake hash), + guard.sh in Edit|Write, user Bash group, user Stop event first.
- 1 event/group/hook order: RED (PreToolUse before SubagentStop; Bash group before AskUserQuestion)
- 2 PostToolUse Bash restored + no user hook lost: PASSES (GUARD; proves the take path really ran)
- 3 second upgrade byte-identical, with non-vacuous layout check: RED
Result: 2 fail, 1 pass.

## Totals
BASELINE_FAIL 16, guards passing 2 (plus none vacuous).

## Existing tests run (stay green)
claude-merge-surgery-settings.red (7/7), codex-adapter.red (16/16). upgrade-user-hooks.red.integration (BUG-093) spawns dist/cli.js, which is absent in this worktree (no dist build by rule 16): it fails for that reason at baseline; QA-Verify must run it against a built cli. host-adapter-contract.red and claude-merge-surgery-commandless-hooks not run here; no edits to any existing test.

Notes for Developer: unit test 10/11 use composeCanonicalView(dst,['codex']) and createCodexAdapter(); ours passed to mergeUpstreamSettings contains ClearGate hooks (function strips them itself).

## Re-scope (post-flight)

File: `cleargate-cli/test/init/merge-settings-order.red.node.test.ts` (worktree BUG-134, base e4a4094). Added a group-aware `groupCmds()` helper; `cmds()` left as is for the other reds.

- Red 3: SessionStart assertion now `groupCmds(out,'SessionStart','')` deep-equals `[[START],[NOTIFY]]` (every matcher-less group, not `.find`'s first).
- 3b (new): user matcher-less group before and after the ClearGate group, ours `[{NOTIFY},{START}]` and reverse, both give `[[START],[NOTIFY]]`.
- 3c (new): ours PostToolUse `[Edit|Write, Bash[lint]]` + upstream Bash[INGEST] gives matchers `[Edit|Write, Bash, Bash]`, Bash groups `[[INGEST],[lint]]`; second merge byte-identical.
- 9b (new): ClearGate Edit|Write group `[GATE, prompt1, prompt2]` keeps both prompt hooks (`type:"prompt"`, no command).

Run against e4a4094 (`npx tsx --test`): 15 pass, 4 fail. FAIL: 3, 3b, 3c, 9b. All others pass (1a, 1a2, 1b, 1c, 2, 4, 5, 5b, 6, 7, 8, 9, GUARD, 10, 11). Matches expectation; no deviations.
