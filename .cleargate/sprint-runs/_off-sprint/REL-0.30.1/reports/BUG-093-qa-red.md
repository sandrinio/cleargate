role: qa
QA-RED: WRITTEN
BUG-093, unit U1, worktree cg-wt/u1 (uncommitted).

Files created (worktree-relative):
- test/hosts/claude-merge-surgery-settings.red.node.test.ts (7 cases, in-process, real claudeAdapter)
- test/commands/upgrade-user-hooks.red.integration.node.test.ts (1 case, built CLI)

Red on base (fails for the bug's reason: take-theirs spread drops user hooks under ClearGate events):
- unit 1: user Bash PreToolUse hook count 0, expected 1
- unit 2: user command missing from the Edit|Write PreToolUse group
- integration: user Bash hook count 0 after `upgrade --yes` (also proved by hand that the Edit|Write one is dropped)

Pass on base (pinning): unit 3 Notification survives, 4 no-hooks theirs (no empty hooks:{}), 5 malformed returns theirs,
6 stale pre-edit-gate.sh replaced not duplicated, 7 ours' permissions kept / theirs' extra key not imported.

BASELINE_FAIL: 3 (2 unit + 1 integration)
Typecheck (tsc --noEmit) clean. flashcards_flagged: []
