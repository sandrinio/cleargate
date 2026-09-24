# BUG-089 QA-Red — re-sealed, split into unit + integration layers

role: qa

## Mode

RED — write failing tests against §5 Verification Protocol + §1 Expected
Behavior + Task Breakdown. No implementation was read or edited beyond the
BUG report's own §2/§3 (Reproduction Protocol / Evidence, which already
quotes the current exit-1 behavior and settings.json matcher wiring) and the
QA-owned shell test suites named in the dispatch. `src/hooks/hook-signal.ts`,
`src/commands/hook.ts`, `cleargate-planning/.claude/hooks/pre-edit-gate.sh`,
`cleargate-planning/.claude/hooks/pending-task-sentinel.sh`, and
`cleargate-planning/.claude/settings.json` were not directly opened this
session. `refs/cgtest/BUG-089` commit `a0d5898` (the Developer's
implementation) was never shown or diffed.

## Starting point

Sealed Codex-session red test on `refs/cgtest/BUG-089` (commits
`f9645e6`/`80d0d2b`/`1ee88a5`), fetched via
`git -C cleargate-cli show refs/cgtest/BUG-089:test/hooks/hook-signal.red.node.test.ts`.
Adopted as base per dispatch, with the two named layout defects repaired:

1. `FIXTURE_PARENT` — was `path.resolve(META_ROOT,'..','..','..','fixtures','BUG-089')`,
   resolving to `/Users/fixtures/...` in this repo. Now
   `fs.mkdtempSync(path.join(os.tmpdir(), 'bug089-'))`, cleaned up in a
   top-level `after()` hook (each case dir is also removed eagerly in a
   `finally`).
2. `META_ROOT` — was hardcoded `path.resolve(CLI_ROOT, '..')`. Now honours
   `CLEARGATE_META_ROOT` first (CLI_ROOT/META_ROOT/CANON idiom, matching
   `test/lib/readiness-predicates-test-layers-declared.red.node.test.ts:136-138`),
   falling back to the old default when unset.

A third, unrequested-but-necessary fix: the sealed test's dynamic import used
`'../../src/hooks/hook-signal.ts'`. This repo's convention (`moduleResolution:
Bundler`, confirmed against ~10 existing dynamic imports, e.g.
`test/auth/factory.node.test.ts`) is a `.js` specifier even for `.ts` source.
Changed to `'../../src/hooks/hook-signal.js'`.

## Layer split (beyond the two named defects)

The sealed file mixed unit-level resolver assertions with integration-level
settings.json wiring assertions in one `test/hooks/hook-signal.red.node.test.ts`.
This repo's own CR-111 test-layer convention (confirmed live:
`test/scaffold/canonical-live-parity.red.integration.node.test.ts`,
`test/hooks/red-gate.integration.node.test.ts`, and four more
`*.red.integration.node.test.ts` files already in the tree) requires
integration-layer reds to be named `*.red.integration.node.test.ts`, not
folded into a `*.red.node.test.ts` file. Split into two files so each is
wiring-sound for TPV under its own naming:

- `test/hooks/hook-signal.red.node.test.ts` — unit layer. Every hook script
  invocation here calls the script directly by its known canonical path with
  an explicit `--host claude` argument supplied by the test; it never reads
  `cleargate-planning/.claude/settings.json`.
- `test/hooks/hook-signal.red.integration.node.test.ts` — integration layer.
  Parses `cleargate-planning/.claude/settings.json`, extracts the literal
  registered command for each blocking matcher, asserts it explicitly selects
  Claude (`--host claude`), and invokes that exact string end to end.

## RED_TESTS

- `cleargate-cli/test/hooks/hook-signal.red.node.test.ts` (unit, 16 assertions across 14 `test()`/sub-`test()` entries)
- `cleargate-cli/test/hooks/hook-signal.red.integration.node.test.ts` (integration, 3 tests)
- `cleargate-cli/test/scripts/test_pre_edit_gate.sh` — Cases 4 and 7 (the two enforce-mode blocking assertions) bumped from expected exit `1` to exit `2`. All 9 other assertions unchanged.
- `.cleargate/scripts/test/test_flashcard_enforcement.sh` (outer worktree) — Scenario 1's blocking assertion bumped from expected exit `1` to exit `2`, plus the matching header-comment line. Scenarios 2/3/4 and the hash-stability check unchanged.
- `.cleargate/scripts/test/bug068_dispatch_tool_name.red.sh` — checked, NOT modified. Its one exit-code assertion on a blocking branch (`Sc2`) already asserts `assert_ne ... "0"` (non-zero), not a specific code, so it is unaffected by the exit-1-to-2 shift. Confirmed by running it: 10/10 pass at baseline (BUG-068 itself already shipped; unrelated to BUG-089).

## BASELINE_FAIL

Command: `cd cleargate-cli && CLEARGATE_META_ROOT=<worktree> bash .cleargate/scripts/run_script.sh npm run test:file -- <file>`

- `test/hooks/hook-signal.red.node.test.ts`: **10 / 14 fail** (2 pass suites collapse to 4 pass at leaf level: U13-U16 controls). Failures: U1-U2 and U3-U4 fail with `ERR_MODULE_NOT_FOUND: Cannot find module '.../src/hooks/hook-signal.js'` (module doesn't exist yet); all 8 sub-tests under "direct script invocation fails closed" fail with `1 !== 2` (scripts currently exit 1, not 2) — i.e., every failure is either the missing-module reason or the exact fail-open reason the bug describes, none are harness errors. U13-U16 (warn/bypass/advisory/skip controls) already pass at baseline, as expected — they were never blocking.
- `test/hooks/hook-signal.red.integration.node.test.ts`: **3 / 3 fail**. All three fail on `assert.match(command, /--host\s+claude\b/)` — settings.json's registered commands don't yet carry `--host claude` — before any process is even spawned. Confirms the JSON parse + matcher lookup succeed (wiring-sound) and only the actual fix is missing.
- `test/scripts/test_pre_edit_gate.sh`: **2 / 11 fail** (Cases 4, 7 — both "expected exit 2, got 1"). Cases 1-3, 5, 6, 8-11 pass unchanged.
- `.cleargate/scripts/test/test_flashcard_enforcement.sh`: **1 / 12 assertions fail** (Scenario 1's exit-code assertion — "expected=2 actual=1"). All other assertions (S1's three stderr checks, S2, S3, S4, hash stability) pass unchanged.
- `.cleargate/scripts/test/bug068_dispatch_tool_name.red.sh`: **0 / 10 fail** (unaffected, unmodified, confirmed green already for unrelated reasons — BUG-068 shipped).

`npm run typecheck` (cleargate-cli): clean, exit 0.

## Script Incidents

Every non-zero-exit invocation below is the run_script.sh wrapper logging an
*expected* RED-mode test failure (the whole point of this dispatch), not an
infrastructure fault. Included per the QA report contract:

- `cleargate-cli/.cleargate/sprint-runs/_off-sprint/.script-incidents/20260924T234618Z-932a737a44d6.json` (unit file, first run)
- `cleargate-cli/.cleargate/sprint-runs/_off-sprint/.script-incidents/20260924T234634Z-932a737a44d6.json` (unit file, summarized re-run)
- `cleargate-cli/.cleargate/sprint-runs/_off-sprint/.script-incidents/20260924T234702Z-379741b0e173.json` (integration file)
- `cleargate-cli/.cleargate/sprint-runs/_off-sprint/.script-incidents/20260924T234736Z-641ec85e39cf.json` (test_pre_edit_gate.sh)
- `cleargate-cli/.cleargate/sprint-runs/_off-sprint/.script-incidents/20260924T234745Z-15c4edd6e667.json` (test_flashcard_enforcement.sh)

## Required implementation outcome (unchanged from prior sealed report)

Implement `resolveHookSignal({host:'claude', decision})` in
`cleargate-cli/src/hooks/hook-signal.ts` with block -> exitCode 2, allow ->
exitCode 0; reject invalid host/decision. Register `cleargate hook signal
<block|allow> --host claude` (`src/commands/hook.ts` + `src/cli.ts`). Update
both `pre-edit-gate.sh` and `pending-task-sentinel.sh` to accept a `--host`
argument (default `claude` for backward compat with callers that omit it —
Cross-Cutting Rule 2 requires the no-flag path to stay byte-compatible), call
the resolver via the `cleargate` CLI on their blocking branch, and fail closed
(exit 2) if that CLI is missing, exits non-zero, or exits with any status
other than the resolver's own 0/2 contract. Update
`cleargate-planning/.claude/settings.json` so both registered commands
explicitly carry `--host claude`. Leave warn mode, active-sprint bypass,
`CLEARGATE_ADVISORY=1`, and `SKIP_FLASHCARD_GATE=1` semantics untouched.

## Not mine

E2E (real Claude session denial, BUG-089 §5 row 3) is out of scope per
dispatch — orchestrator proves it at barrier B0.
