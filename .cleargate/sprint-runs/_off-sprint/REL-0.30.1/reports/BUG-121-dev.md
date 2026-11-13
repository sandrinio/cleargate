role: developer
# BUG-121 dev report — DONE

Commit 350b27e `fix(upgrade): BUG-121 the repo's gate commands survive upgrade and init` on top of 1d49861 (re-scoped --force red).
Files: src/init/detect-test-stack.ts, src/commands/init.ts, src/commands/upgrade.ts. The unreachable Overwritten branch was removed.

- typecheck clean; check:no-shell-true-in-init clean.
- gate-commands-kept.red: 22/22. 37 related default-tier files: 455 tests, 449 pass; the only failures are dist-dependent
  (DEP0190, Restart-banner, CR-076 pack) and fail identically with the change stashed.
- Scratch build /tmp/cgb.Ie4f of 350b27e; upgrade-field-path.red.integration (BUG-122/120/121): 4/4 pass.
- Dispenser smoke (qa.test=make check, qa.typecheck=make lint preset):
  - upgrade --yes: `[upgrade] gate-checks.json: kept qa.test "make check"; kept qa.typecheck "make lint"; arch.typecheck "" → "go vet ./..." (detected)` -> ["make check","make lint","go vet ./..."]
  - init: `[cleargate init] Skipped (exists) .cleargate/scripts/gate-checks.json` (nothing changed) -> values unchanged.
Plan deviation: --force reports like plain init (copy-payload FIRST_INSTALL_ONLY), confirmed by coordinator.
