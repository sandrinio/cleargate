# BUG-122 F1 QA-Red (REL-0.30.1, u2)
QA-RED: WRITTEN
RED_TESTS: test/commands/install-state-new-entry.red.node.test.ts (worktree cg-wt/u2, uncommitted)
BASELINE_FAIL: 2 of 2
- Case 1 (re-added entry fields + init order): RED, owner undefined (expected 'claude'); also appended at end.
- Case 2 (parity: files deep-equal after upgrade then init): RED, entry lacks owner and sits last (.claude/hooks/lib/harness.sh) vs init's sorted position.
Fixture: removes a .claude/hooks/*.sh entry with owner (not last in manifest) from snapshot and disk, then `upgrade --yes`.
Expected order = package manifest order (init writes pkgManifest.files verbatim); asserted against a fresh init's files[].path.
flashcards_flagged: []
