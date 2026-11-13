# BUG-122 QA-Red (role: qa) — REL-0.30.1 U2

QA-RED: WRITTEN
BASELINE_FAIL: 22 of 23 in install-state-parity.red.node.test.ts; 1 of 1 in the integration file (base b9fe36a)

Files (worktree-relative, uncommitted, /Users/ssuladze/Documents/Dev/cg-wt/u2):
- A test/commands/install-state-parity.red.node.test.ts (23 tests)
- A test/commands/upgrade-field-path.red.integration.node.test.ts (`describe('BUG-122')`, 1 test; run with CLEARGATE_BUILT_CLI=<main dist/cli.js>)
- M test/helpers/init-fixture.ts (the single install-manifest SANCTIONED_BASELINE_DELTAS row: `m3Story06SnapshotHash(scenario)`; `reinit` adds `upgraded_at` after `installed_at`; `currentHash: (scenario) => ...`)

Red cases and why (base):
- Sc1 upgrade --yes + user Stop hook -> dry run `upstream-changed` (expected clean): upgrade records hashNormalized(merged).
- Sc1 init + user Stop hook -> `user-modified` (expected clean): init records the package raw sha.
- Sc2 edited ClearGate hook: `clearGateHooksProjection` missing (the `user-modified` label itself already holds on base).
- Sc3: fresh init anchor (withUpgradedAt missing); upgrade: generated_at not restamped; re-init: installed_at rewritten; withUpgradedAt missing.
- Sc4 0644 dedupe_frontmatter.mjs stays 0644 (420 !== 493) after upgrade --yes.
- Units: CLAUDE_SETTINGS_PATH/clearGateHooksProjection missing (6); builder hash; computeCurrentSha ignores user hooks (raw hash returned); G-R-4 effectiveInstallSha missing; legacy raw-equal + pkg unchanged -> `upstream-changed` not `clean`; G-R-5 recorded sha after take != package sha.
- Integration: after `upgrade --yes` snapshot settings sha 2553442e... != package 639fefc1....

Passing on base (controls, not red): "no user hooks -> clean" (after upgrade --yes and re-init); the dry-run state labels in the two G-R-4 legacy cases (package changed -> upstream-changed; raw differs -> both-changed). Those two cases carry an `effectiveInstallSha` existence anchor so they still fail for a missing export.

Shape edits: init-fixture row is red on `reinit` only (probe: fresh/user-content/malformed/force still MATCH; force and user-content seed no snapshot, malformed reads a null prior). The parity tests that consume it skip without CLEARGATE_INIT_BASELINE, and /private/tmp/cg-s41-m2-init-baseline no longer exists, so the row is verified by direct probe, not by the compare. init.node.test.ts :486/:628 are fresh-init pins, unchanged. No test compares a settings snapshot hash with the raw file hash (grepped test/commands/upgrade*, test/hosts).

Existing set run (19 files: init*, upgrade*, uninstall-reinit, host-lifecycle, build-manifest, doctor, init parity/snapshot): 197 tests, 195 pass, 0 fail, 2 skipped (baseline env). Nothing existing is red now.
