# BUG-133 r2 Developer — done

Changed (src only):
- src/init/detect-test-stack.ts: GATE_CHECKS_REL; renderGateChecks (shared by applyTestStack and the projection, so write and projection cannot drift); projectGateChecks (package text + plan, package bytes when plan changes nothing); gateChecksHasLocalEdits (parsed JSON minus the three gate-command fields).
- src/commands/upgrade.ts: one gatePlan from priorGate + detectTestStack, computed in try/catch (undefined on throw -> raw-package behaviour, dry-run gate line prints nothing); fileOutcome/applyAlwaysOverwrite take it; entryHasLocalEdits; dry-run label `→ updated, no local edits lost` for gate-checks changes without local edits. Real run prints `[always] overwritten:`. BUG-037 block unchanged.

Tests (pass/fail): red file 7/0 (after QA-Red e89a249); upgrade-changelog 8/0, claude-md 4/0, mcp-refresh 21/0, no-tty 12/0, output.red.integration 6/0, output.red 23/0, payload-root 3/0, per-host 6/0, pin-and-prune 11/0, preserves-gate-commands 4/0, registers-new-files 4/0, restart-warning 4/0, settings-order 3/0, state-parity 4/0, upgrade 14/0, init-test-stack-detect 14/0, gate-commands-kept 22/0, install-state-parity 23/0. Baseline failures unchanged: upgrade-field-path.red.integration 0/6, upgrade-user-hooks.red.integration 0/1.
Note: I used `git stash` + `pop` once earlier for a baseline check (restored cleanly); no further stashing.
