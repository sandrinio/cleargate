# BUG-089 Test Pattern Validation

role: architect

TPV: BLOCKED-WIRING-GAP — the missing-CLI fixture removes Node, so pre-edit-gate cannot parse its JSON input and exits before reaching the intended resolver boundary.

Reviewed CLI worktree `/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/stories/BUG-089/meta/cleargate-cli`, QA-Red HEAD `f9645e6e45448d6e13c0cf6d60296dac3f790b68`. Sealed `test/hooks/hook-signal.red.node.test.ts` SHA-256 matches `13fe03b68870c99d08c917856c9db4066e4cd0f3f1c36ddf26e7ecead4ea3730`.

## Wiring findings

The fixture's `noCliPath()` retains only system utility directories. Read-only diagnostic through the required wrapper confirms Node is unavailable in that PATH; the normal Node is `/opt/homebrew/bin/node`. The paired canonical `pre-edit-gate.sh:25-48` requires Node for JSON parsing and returns 0 on an empty parsed file. This is a missing test runtime dependency, not the intended missing-ClearGate condition. QA must preserve a working Node in its fixture bin while excluding the CLI and controlling its fallback, without network package resolution.

Built-in imports resolve; the planned `../../src/hooks/hook-signal.ts` dynamic import matches the approved new module and is intentionally absent at Red. The resolver signature matches the bootstrap plan. No custom constructor or mock-method wiring exists. Fixture roots are allocated per test and removed in `finally`; the name matches the context's `*.red.node.test.ts` convention. Paired canonical settings and both hook paths exist.

## Pre-gate typecheck flag

The flag is configuration/cwd wiring: paired `.cleargate/scripts/gate-checks.json` sets `arch.typecheck` to `npm --prefix cleargate-cli run typecheck`, while `pre_gate_runner.sh:206-214` first changes cwd into the CLI worktree. That points npm at an extra nonexistent nested `cleargate-cli`. The scanner reads its own gate-checks JSON (`:50-55`), not the sprint context's correct owning-package command. A targeted wrapped `npm run typecheck` from the actual CLI worktree completed with exit 0. This does not retroactively turn the original exit-254 scan green; parent must correct dispatch/config routing and rerun the gate.

## Parent-requested fixture concerns for QA triage

These are not additional TPV semantic verdicts, but concrete observations requested by the parent; route to QA rather than alter production behavior to satisfy them:

- The claimed enforce-mode edit fixture never sets `CLEARGATE_PLANNING_GATE_MODE=enforce`; canonical `pre-edit-gate.sh:14` defaults to warn. Explicitly configure the intended branch and clear inherited bypass variables.
- The pending-flashcard fixture creates state/sentinel only, not a dev/QA report with an unprocessed card. Canonical `pending-task-sentinel.sh:64-76` reads those reports. QA should establish the intended pending condition explicitly.
- `settingsText()` regex assertions span the whole document and demand inline `hook signal` text after each hook filename. The approved contract requires explicit host selection at the boundary and shared resolution; it does not prescribe that exact settings string. Parse the actual matching command entry and exercise its wiring without requiring an unrelated command or accidental cross-entry match.

## Result and scope

Return to QA for fixture repair; keep the seal until the parent authorizes that QA amendment and records the replacement SHA. No production/test/state changes were made. Only this report was written. Diagnostics were read-only and wrapped; both completed exit 0. Script incidents: none. No acceptance, host-denial, or implementation correctness claim is made by TPV.

## Superseding revalidation — 2026-09-12

TPV: APPROVED

Verified actual worktree HEAD `1ee88a51506d761630c6d1c29da4d5bf1c2be13b`, with no tracked test changes, and sealed test SHA-256 `92d8fa3e47f6e6811a88759f307000b0ce0be65d06ed1b3acc4427e4efa637eb`, matching the updated QA report and assigned final hash.

The fixture now copies the hook directory to the installed location used by registered settings commands; preserves Node via `process.execPath`; supplies an offline npx stub; selects enforce mode and clears inherited bypass/skip/advisory variables; and creates an actual unprocessed flashcard report. Settings are parsed by matching command entry instead of a whole-document regex requiring inline resolver syntax. Per-case roots have finally cleanup. Planned dynamic resolver import, signature and red-test naming remain valid. The previous missing-runtime/config/path wiring issues are resolved.

This supersedes the earlier BLOCKED-WIRING-GAP for this seal only. The historical exit-1 reproduction is diagnostic evidence, not a permanent acceptance expectation. TPV does not approve acceptance completeness, production behavior or actual host denial. Original scan correction remains the parent's gate responsibility. No test/source/state edits or additional test runs occurred in this revalidation.
