# BUG-122 Dev (role: developer) — REL-0.30.1 U2 commit 1

STATUS: done
COMMIT: 7844e56 fix(upgrade): BUG-122 init and upgrade record the same install state (on 6e0fdde red). Worktree /Users/ssuladze/Documents/Dev/cg-wt/u2, branch story/REL-0301-upgrade.
TYPECHECK: pass

FILES_CHANGED (cleargate-cli): src/lib/settings-json-surgery.ts (CLAUDE_SETTINGS_PATH, clearGateHooksProjection), src/lib/manifest.ts (computeCurrentSha projection, effectiveInstallSha, withUpgradedAt, ManifestFile.upgraded_at), src/lib/manifest-builder.ts (walkDir projection hash), src/commands/upgrade.ts (effectiveInstallSha in step 3, post-write hash via computeCurrentSha in take+edit, restamp generated_at + upgraded_at, copyPackageMode on always/pin-aware/take with .sh 0755 floor), src/commands/init.ts (installed_at never rewritten; upgraded_at via withUpgradedAt when a prior snapshot exists). doctor.ts untouched.

TESTS
- install-state-parity.red.node.test.ts: 23/23 pass.
- Default-tier set (106 files importing manifest/manifest-builder/surgery or commands init/upgrade/doctor/uninstall/verify-install or hosts/*, non-integration): 1622 tests, 1609 pass, 5 fail, 8 cancelled under concurrency 4. The failing/cancelled files (cr076-package-trim, scaffold-layout, init-no-dep0190, init-from-source, doctor-retired-field, doctor-drift-guard, readme-qa-doc-truth) re-run on base (stash) and on my change: identical, 62 tests / 50 pass / 4 fail / 8 cancelled both ways. They need a built dist/cli.js or a rebuilt payload which a worktree lacks (environmental, pre-existing). The 5th fail in the concurrent run did not reproduce solo (same file set); flagged, not investigated further.
- Integration red upgrade-field-path.red.integration.node.test.ts against scratch build /tmp/cgb.B1jt (git archive of 7844e56): 1/1 pass.
- Scratch payload MANIFEST.json .claude/settings.json sha256 = 82fcd1ed... vs raw hash of scaffold settings.json 639fefc1... : differ (G-R-3 shipped).

PLAN DEVIATIONS: none. init's copy-payload.ts left alone (G-R-7 modes applied in upgrade's copies; init already propagates exec bits).
Red tests untouched. No new flashcards.
