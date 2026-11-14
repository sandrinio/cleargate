# BUG-133 QA-Red (role: qa)

Worktree: .worktrees/BUG-133/cleargate-cli (branch story/BUG-133, uncommitted). Typecheck clean.

## Files
- NEW test/commands/upgrade-output.red.node.test.ts: 23 tests, 17 fail / 6 guards pass.
- NEW test/commands/upgrade-output.red.integration.node.test.ts: 6 tests (real init install aged to 0.27.0, package 0.30.1, 3-section CHANGELOG, local edits on 2 always files + pin-aware hook), 5 fail / 1 guard passes.
- EDIT test/commands/upgrade-changelog.node.test.ts: fixture sections carry `### Upgrade notes`; "delta before plan" inverted to "plan first, notes after"; new case: bodies never printed + last line `Full release notes: ... CHANGELOG.md`. 2 fail / 6 pass.
- EDIT test/commands/upgrade-state-parity.red.node.test.ts: Test 1b becomes "sha-clean CRLF merge-3way file gets no line in either run" + `[dry-run] 1 unchanged (not listed)`. 1 fail / 3 pass.
- Unchanged, still green: install-state-parity (23), upgrade-mcp-refresh (21), upgrade.node (14). upgrade-field-path.red.integration needs dist; not run (no edit).

## Per-test baseline (unit red)
Fail: Sc1 x2 (all always lines printed, no summary); Sc2 always/pin-aware/merge-3way user-modified/both-changed/--yes labels (all read `→ clean`); Sc3 `(local edits replaced)`; mode-only tally; --only tally; C-3 unchanged-not-listed; CRLF clean merge-3way listed; hasLocalEdits not exported; extractUpgradeNotes x4 not exported.
Guards (pass): merge-3way upstream-changed keeps `→ clean`; plain `[always] overwritten:` line; mode-only listed in dry run; both-changed listed; no zero-unchanged line; sliceChangelog export.

## Integration baseline
Fail: plan-first + notes-only; edited files labelled; unchanged omitted + `(not listed)` line directly before `files planned`; --yes names edits + tally invariants (N == overwritten lines, L == local-edit lines); notes after `[upgrade] complete.`.
Guard: settings.json surgery-target `state=clean` line stays in the dry run.

## Notes for Dev / TPV
- Surgery-target line covered in the integration file (real claude install); a synthetic unit install has no adapter, so not asserted there.
- No install hashes faked; edits are real file edits on a real install.
- The `N files planned` count is asserted in the unit file only (`1 files planned` with one listed line).
- Notes block format assumed: `---`, `## [x.y.z] — date`, subsection verbatim, then `Full release notes: <pkgRoot>/CHANGELOG.md`; extractUpgradeNotes fixtures avoid a trailing `---` in the section body.
- Mode-only case sets package file 0o755 vs disk 0o644 and asserts disk becomes 0o755.
