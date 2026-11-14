# BUG-134 dev report
Commit: see story/BUG-134 head. Added mergeUpstreamSettings (src/init/merge-settings.ts), used by mergeSurgeryTarget in hosts/claude.ts and hosts/codex.ts. upgrade.ts, mergeSettings, install paths untouched.
Tests: both red files green (16 + 3); claude-merge-surgery-settings, codex-adapter, host-adapter-contract, commandless-hooks, upgrade-user-hooks green. Typecheck clean.
Plan deviations (needed to satisfy the immutable reds):
1. Event placement: plan said "before first later shared event, else append". Red 4 (user-only Stop first stays first, ours order Stop,SessionStart,...) and 5/5b need: no shared predecessor -> leading; no shared successor -> trailing; else before first shared successor.
2. Groups: red 3 needs ALL ours groups with the same matcher key to fold their user hooks into the matched upstream group (plan: first unconsumed only).

## Integration
Merged cli main cd54e93 into story/BUG-134: merge commit e4a4094, no conflicts. gen:codex left no diff; prebuild and typecheck clean; dist rebuilt in worktree. The seven named test files: 69 passed, 0 failed.

## Rework (post-flight)

- Fix commit 26384c7 (only `src/init/merge-settings.ts`; the hosts adapters call `mergeUpstreamSettings` and needed no change). Integrated merge: f72138f (main 169480e, no conflicts).
- PF-2: a theirs group pairs with the first unconsumed same-key group holding a ClearGate hook (or a command equal to one in the theirs group); otherwise it is emitted alone. User-only groups sharing the key go to the tail. Folding removed.
- PF-3: ours hook dropped only when its `command` is a string already in the list; command-less hooks always survive.
- PF-1 unchanged.
- Verification: prebuild, typecheck, build clean. Red file + merge-settings importers + install/upgrade parity + upgrade-field-path + init-host-parity + upgrade-output*: 124 tests, 123 pass, 0 fail, 1 skipped (pre- and post-merge).
- Dispenser simulation (scratch copies, mergeUpstreamSettings against the worktree payload settings.json): HEAD gives no diff; 234e09f^ changes only by adding the ClearGate `PostToolUse` `Bash` group (post-shell-ingest.sh) after the existing `Edit|Write` group; event order in the old output is checked in the final message.

## Re-integration

- Merged main 681cb7c (CR-120) into story/BUG-134 as 84f046c, no conflicts, worktree clean before and after. `gen:codex` left no diff; prebuild, typecheck, build clean. Same test files plus `hooks-snapshots.node.test.ts`: 141 tests, 140 pass, 0 fail, 1 skipped.
