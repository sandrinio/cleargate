# BUG-093 F1 QA-Red (REL-0.30.1, unit U1, base 19b7fa5)

QA-RED: WRITTEN
RED_TESTS: test/hosts/claude-merge-surgery-commandless-hooks.red.node.test.ts (worktree /Users/ssuladze/Documents/Dev/cg-wt/u1, uncommitted)
BASELINE_FAIL: 5 of 7

Red on 19b7fa5 (cause: isClearGateCommand reads `.includes` on undefined; surgery catch returns theirs):
1. prompt + ./u.sh under PreToolUse/Bash survive, upstream present (exact F1 input)
2. http hook under PostToolUse survives, permissions kept
3. agent hook under PostToolUse survives
4. isClearGateCommand(undefined) does not throw, returns false
5. removeClearGateHooks keeps command-less hooks, still removes ClearGate ones

Already pass (pins, init path does not reach the throwing code):
6. mergeSettings keeps a command-less user hook (dedups on `command`, undefined never equals a string)
7. supersedeHookCommands keeps it (guards `typeof h.command !== 'string'` before isClearGateCommand)

Note: hasClearGateHooks also calls isClearGateCommand(h.command); the fix in isClearGateCommand covers it.
flashcards_flagged: []
