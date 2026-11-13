# BUG-122 F1 dev (REL-0.30.1, u2)
STATUS: done
COMMIT: e698105 (worktree cg-wt/u2, branch story/REL-0301-upgrade)
FILES: src/commands/upgrade.ts
Change: updateSnapshotEntry inserts `{...packageEntry, sha256: newSha}` (all fields incl. owner). restampSnapshotVersion now takes the package files and reorders `files` like init (package-manifest order; path sort when the snapshot holds entries the package lacks). Existing entries' fields untouched.
Tests:
- typecheck clean
- default tier (upgrade*, init*, install-state*, gate-commands-kept, test/hosts/*): 345 tests, 332 pass, 2 skipped, 6 fail suites; all failures need dist/cli.js (no CLEARGATE_BUILT_CLI in that run). Re-run of the affected ones with the scratch build: 66 tests, 61 pass, 0 fail.
- install-state-new-entry.red: 2/2 green
- upgrade-field-path.red.integration with CLEARGATE_BUILT_CLI=/tmp/cgb.7rAi/dist/cli.js: 6/6 green
flashcards_flagged: []
