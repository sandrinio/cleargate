role: qa

# BUG-096 — QA-Red report

```
QA-RED: WRITTEN
RED_TESTS: test/helpers/init-fixture-cleanup.red.node.test.ts
BASELINE_FAIL: 3
```

## Commit

- cli `story/BUG-096` in `<cw>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-096/cleargate-cli`
- SHA `1619fad` — `qa-red(BUG-096): init-fixture-cleanup.red.node.test.ts — 3/3 red`
- Base: `35580b0` (STORY-058-09 merge, per Rule 19/CR-124: cli-only item, no upstream).
- One file added: `test/helpers/init-fixture-cleanup.red.node.test.ts`. No `src/**`, `scaffold/**`, `scripts/**`, or `init-fixture.ts` touched.

## Per-test red/anchor table

Measured solo: `npm run test:file -- test/helpers/init-fixture-cleanup.red.node.test.ts`
`ℹ tests 3 / ℹ pass 0 / ℹ fail 3 / ℹ skipped 0` — matches blueprint's "Red at the red commit: 3/3. Anchors: none."

| # | Test | Gherkin scenario | Result | Reason |
|---|------|-------------------|--------|--------|
| B1 | "removes the scenario and payload dirs when the child exits normally" | "Scenario and payload dirs are removed when the test process exits" | RED | Child throws `TypeError: trackedTmpDirs is not a function` before printing the `CG_DIRS=` marker; first failing assert is `status === 0` (`1 !== 0`). |
| B2 | "cleans up even when the child throws after the scenario runs" | "Cleanup also runs when the test process fails" | RED | Same `TypeError` fires before the intended `throw new Error('cg-bug096-boom')` line is ever reached, so `stderr` never contains `cg-bug096-boom` — assertion fails on that check (status-nonzero check trivially passes either way, which is expected and harmless). |
| B3 | "never tracks a captured baseline dir for cleanup, and the baseline survives" | "A captured baseline survives cleanup" | RED | Same `TypeError` fires after `runInitScenario`/`captureOrCompare` already ran (so the baseline files are actually written to disk) but before the `CG_DIRS=` marker prints; `parseMarker` asserts the marker is present and fails first. |

All three fail for the single right reason stated by the blueprint: `trackedTmpDirs` is not yet exported from `test/helpers/init-fixture.ts`. None failed on wiring (`runInitScenario`, `captureOrCompare`, `CLI_ROOT`, the spawn shape and the marker regex all resolved and behaved as pinned in `plans/M5-fixwave.md` §BUG-096).

## No-leak proof (test must not itself leak, including in the red state)

```
before = 341   ls -d /tmp/cg-s41-fix-* /tmp/cg-s41-payload-* | wc -l   (pre-existing, other lanes' runs — untouched)
after  = 341   same command, immediately after the solo run above
```

Each `it()` snapshots `/tmp`'s `cg-s41-(fix-fresh-|payload-)*` entries before spawning its child and removes anything new in a `finally` (runs regardless of assertion pass/fail/throw). At the red commit the child does create real scenario/payload dirs via `runInitScenario('fresh')` before it crashes on the missing export; the test's own `finally` block is what actually reclaims them since the production exit-hook doesn't exist yet. B3's own `os.tmpdir()/cg-bug096-base-*` scratch dir is removed the same way in its own `finally`. Net `/tmp` leak-prefix count is unchanged across the run: 341 → 341.

`npm run typecheck` — clean (test files are excluded from `tsc --noEmit` by `tsconfig.json`'s `exclude: ["**/*.test.ts"]`, so this only confirms no collateral damage).

## Git status

```
$ git -C <cw> status --porcelain
(clean)

$ git -C /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-096 status --porcelain
(clean)

$ git -C /Users/ssuladze/Documents/Dev/ClearGate status --porcelain
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
?? .cleargate/sprint-runs/SPRINT-41/reports/STORY-058-10-dev-passD.md
```
The outer main-repo diffs are pre-existing orchestrator/ledger writes from concurrent lanes (STORY-058-10 dev pass, token-ledger), not caused by this dispatch. No back-sync from QA-Red into the outer worktree or main checkout.

## Design notes for the Developer / TPV

- Harness matches the pinned shape verbatim: `spawnSync(process.execPath, ['--import','tsx/esm','--input-type=module','-e', SCRIPT], { cwd: CLI_ROOT, encoding:'utf8', timeout:120_000, env })`, `env` = `process.env` minus `CLEARGATE_INIT_BASELINE`/`CLEARGATE_INIT_BASELINE_CAPTURE` plus what each scenario sets.
- `CLI_ROOT` imported from `./scaffold-roots.js` (same directory), matching the existing `test/helpers/scaffold-roots.ts` export used elsewhere.
- Child imports `test/helpers/init-fixture.ts` via an absolute `file://` URL (matching the codebase's established spawned-child import convention, e.g. `init-host-cli.red.integration.node.test.ts`), rather than a cwd-relative specifier — functionally equivalent, more robust.
- Marker extraction: `/^CG_DIRS=(.*)$/m`, exactly as pinned (tolerates `initHandler`'s restart-banner noise on stdout).
- B3's env vars are exactly `CLEARGATE_INIT_BASELINE_CAPTURE=1` + `CG_BUG096_BASELINE=<baselineDir>` (a QA-owned var name distinct from `CLEARGATE_INIT_BASELINE`, since that name is stripped from the child env by default); `captureOrCompare(baselineDir, 'fresh', r, r.dir)` is called with the QA var's value as the first positional arg.
- `SHORT_TMP_ROOT = '/tmp'` (literal) is used only for the test's own leak-probe/self-cleanup scan — sourced from BUG-096 §3's evidence paths (`/private/tmp/cg-s41-fix-fresh-*`), not from reading `init-fixture.ts` (out of scope for QA-Red mode).

## Spec-Gap

None — the blueprint's pinned change shape, harness shape, and per-scenario assertions were fully specified and unambiguous.

## flashcards_flagged

```yaml
flashcards_flagged:
  - "2026-09-26 · #qa-red #test-harness #tmp · A child crashing on one missing export can starve a later assert in the same script of its own distinct failure text."
  - "2026-09-26 · #qa-red #test-harness #tmp · Snapshot-diff self-cleanup around a spawned child catches red-state leaks a not-yet-built exit hook can't."
```
