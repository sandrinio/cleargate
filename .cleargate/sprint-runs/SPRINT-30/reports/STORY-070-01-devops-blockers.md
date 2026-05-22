# DevOps Blockers Report — STORY-070-01

## Failure-Step

Step 6 (Post-Merge Test Verification) failed: 3 of 39 scenarios failed due to a stale `dist/cli.js` build artifact — the integration and doctor test files spawn against the built CLI binary (`cleargate-cli/dist/cli.js`) which was last compiled 2026-05-20T00:05:36 UTC, predating the dev commit (2026-05-22T17:29:05 UTC) by approximately 52 hours. The merged TypeScript changes are in source but not yet compiled into `dist/`.

## Conflict-Files

N/A — merge succeeded cleanly (no conflicts). Failures are post-merge test failures only.

## Diagnostics

### Failed tests (3 of 39)

**File: `cleargate-cli/test/commands/doctor-retired-field.red.node.test.ts`**

```
✖ doctor output mentions execution_mode retired-field advisory (150.614041ms)
  AssertionError: Expected doctor output to contain execution_mode retired-field advisory.
  Got stdout: [doctor] No .claude/settings.json found — hook config unavailable.
  stderr: (empty)
```

Root cause: `cleargate-cli/src/commands/doctor.ts` was updated by dev commit `145a28c2` to emit the retired-field advisory scan, but `dist/cli.js` (last built 2026-05-20T00:05:36) does not contain this change. The test spawns `dist/cli.js` and gets the old doctor output.

---

**File: `cleargate-cli/test/integration/advisory-env-gate.red.node.test.ts`**

```
✖ Scenario: CLEARGATE_ADVISORY=1 — exits 0 when gate would otherwise fail (153.086417ms)
  AssertionError: Expected exit 0 with CLEARGATE_ADVISORY=1, got 2.
  stdout: (empty)
  stderr: Usage: cleargate sprint preflight <sprint-id>
    <sprint-id> must match SPRINT-NN or SPRINT-NNN (e.g. SPRINT-18)

✖ Scenario: CLEARGATE_ADVISORY=1 — stderr contains "[advisory]" (168.562667ms)
  AssertionError: Expected stderr to contain "[advisory]", got:
  Usage: cleargate sprint preflight <sprint-id>
    <sprint-id> must match SPRINT-NN or SPRINT-NNN (e.g. SPRINT-18)
```

Root cause: The stale `dist/cli.js` has the old sprint-id validation regex (numeric-only, rejects `SPRINT-FX9`) and does not contain the `isAdvisory()` wiring into sprint preflight. The source code in `sprint.ts` (post-merge) has regex `/^SPRINT-[A-Z0-9]{2,6}$/` which accepts fixture IDs like `SPRINT-FX9`, and wires `isAdvisory()` for CLEARGATE_ADVISORY=1 handling. Neither change is compiled into `dist/cli.js` yet.

### `dist/cli.js` staleness evidence

```
dist/cli.js last modified: 2026-05-20T00:05:36 UTC
Dev commit (145a28c2) date:  2026-05-22T17:29:05 UTC
Gap:                         ~52 hours
```

The dev report (`STORY-070-01-dev.md`) documents 39 scenarios passing — those passes were against the story worktree where `dist/cli.js` was freshly built before the test run. Post-merge on the sprint branch, `dist/cli.js` in `cleargate-cli/` has not been rebuilt.

### Script incident file

`.cleargate/sprint-runs/SPRINT-30/.script-incidents/20260522T175742Z-4ac743d41b08.json`

Exit code: 1 | 36 passed, 3 failed

## Required Resolution

Before re-dispatching DevOps step 6, the Developer or operator must run:

```bash
cd cleargate-cli && npm run build
```

This compiles the merged TypeScript into `dist/cli.js`. After `npm run build` completes, re-run the 5 Red test files:

```bash
bash .cleargate/scripts/run_script.sh node --test --import tsx/esm \
  cleargate-cli/test/util/gate-mode.red.node.test.ts \
  cleargate-cli/test/scripts/migrate-schema-v3.red.node.test.ts \
  cleargate-cli/test/docs/no-execution-mode-vocabulary.red.node.test.ts \
  cleargate-cli/test/integration/advisory-env-gate.red.node.test.ts \
  cleargate-cli/test/commands/doctor-retired-field.red.node.test.ts
```

Expected result: 39/39 pass.

## STATUS

`STATUS=resolved` — Orchestrator ran `cd cleargate-cli && npm run build` (ESM + DTS, 93ms + 1998ms). Re-run on 2026-05-22 produced 39/39 pass. Steps 6-9 completed. STORY-070-01 is Done.
