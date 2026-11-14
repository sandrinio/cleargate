# BUG-133 Developer (role: developer)
Commit on story/BUG-133 (see git log). Files: src/commands/upgrade.ts, src/lib/changelog.ts.
- Exports: hasLocalEdits, fileOutcome, expectedMode (upgrade.ts); extractUpgradeNotes (changelog.ts, additive).
- Real run: always entries print only when changed; local-edit label; `[always] U unchanged, N updated (L had local edits)` before complete.
- Dry run: shared fileOutcome; unchanged omitted except surgery targets; `[dry-run] U unchanged (not listed)`; local-edit labels.
- Release notes: Upgrade-notes subsections only, after plan (dry run) / after complete+hint+prune (real run).
- Typecheck pass; all test/commands/upgrade* (154) + install-state-parity + related lifecycle/gate tests green; dist built in worktree.

## Integration
Merged main cd54e93 into story/BUG-133: merge commit be392bd, no conflicts. gen:codex left no diff; prebuild, typecheck, build clean. 7 files re-run: 84 passed, 0 failed.
