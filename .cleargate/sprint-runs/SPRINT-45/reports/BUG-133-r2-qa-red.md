# BUG-133 r2 QA-Red (SC-7)

File: cleargate-cli/test/commands/upgrade-gate-checks-output.red.node.test.ts (worktree .worktrees/BUG-133-r2). 7 tests, 4 fail at baseline, 3 pass (guards). Typecheck clean.

Fixture: package = shipped scaffold gate-checks.json; snapshot records the package sha; disk = JSON.stringify(obj,null,2)+"\n" (user-modified). Extra always files: derived-1.md (same) and cleargate-protocol.md (upstream-changed), so tallies are meaningful.

## Failing at baseline
- SC7-1 dry: gate-checks.json is listed: `[dry-run] .cleargate/scripts/gate-checks.json  action=overwrite  state=user-modified → overwritten, local edits lost`; expected no action line and `[dry-run] 2 unchanged (not listed)`.
- SC7-1 real: `[always] overwritten (local edits replaced): <path>` printed; expected no [always] line naming it and `[always] 2 unchanged, 1 updated (0 had local edits)`.
- SC7-2 dry: label is "overwritten, local edits lost"; expected "→ updated, no local edits lost".
- SC7-2 real: line is "(local edits replaced)"; expected `[always] overwritten: <path>` and `[always] 1 unchanged, 2 updated (0 had local edits)`.

## Guards (pass at baseline)
- precondition: shipped file != its re-serialisation.
- SC7-3 dry and real (debug_patterns edit): baseline already prints the lost/replaced lines; these pin that the fix keeps them (real summary `1 unchanged, 2 updated (1 had local edits)`). SC7-3 cannot red at baseline: the buggy behaviour and the correct one coincide.
- Note: SC7-1 "byte-identical afterwards" is asserted in the failing real test but holds at baseline too.

## Seams assumed
Output only (upgradeHandler stdout via opts.stdout) and files on disk. Summary/unchanged line wording taken from the spec and the existing upgrade-output red. SC7-2 repo detection: package.json with test/typecheck scripts (no vitest) -> `npm test`. SC7-1 repo has no stack; non-empty values are kept. Gate-line filter: lines naming the path with `action=` (dry) or `[always]` (real), so the `kept ... (detected)` line is not caught.

## Re-scope

Spec SC-7 scenario 2 contradicted itself (required `→ updated, no local edits lost` while forbidding `local edits lost`). Spec now forbids only `overwritten, local edits lost`. Changed in `cleargate-cli/test/commands/upgrade-gate-checks-output.red.node.test.ts`: the negative assertion at line 187 (scenario 2, dry run) now matches `overwritten, local edits lost`; test title at line 181 updated to match. Nothing else changed; not committed. Run against the Developer's working tree: 7/7 pass.
