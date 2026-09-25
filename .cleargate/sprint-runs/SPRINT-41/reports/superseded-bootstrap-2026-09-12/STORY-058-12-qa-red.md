# STORY-058-12 QA-RED

role: qa

STORY: STORY-058-12
QA-RED: WRITTEN

## Contract API

- `runWave(plan, { dispatch, gates, journal, git, clock }) -> Promise<RunSummary>`
  is the deterministic engine seam. `plan` declares `runId`, immutable plan/config
  hashes, ordered waves, and `maxParallelism`; each dispatch returns a verdict,
  actual commit SHA for GREEN, and metering state.
- `CodexTransport` accepts injected `{ command, args, env, timeoutMs }`, provides
  `connect()`, `request(method, params)`, `close()`, and exposes
  `approvalsGranted`. JSON-RPC calls must correlate response IDs and fail closed.

## RED_TESTS

- `/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/stories/STORY-058-12/cleargate-cli/test/workflow/engine.red.node.test.ts`
- `/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/stories/STORY-058-12/cleargate-cli/test/workflow/transport.red.node.test.ts`
- `/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/stories/STORY-058-12/cleargate-cli/test/fixtures/workflow/fake-codex.mjs`

SHA-256: `engine.red.node.test.ts` `7d136d6ab4ab02d88f904db5f5d916f825e918782aff83e9922adcc4b68f54cb`; `transport.red.node.test.ts` `77746ef763effcfcebd82ee5b15bef8400816fa759a6bc8afa27a513d6810da2`; `fake-codex.mjs` `723f6c991f4c24220f84993fb8595d7353bf77477f86ea1f9bf87e531292081a`.

## Coverage

17 sealed behavioral scenarios: max-two overlap; serial role phases; conditional
TPV/post-flight; BLOCKED drain/no-next-wave/serialized GREEN merge; admission denial;
resume without duplicate phase; lost acknowledgement; duplicate merge reconciliation;
corrupt-complete versus truncated journal record; lock contention; plan hash drift;
missing GREEN SHA; unavailable usage with no invented zero row; correlated JSONL RPC;
malformed JSON; server death; RPC error; and approval denial without auto-approval.

## Baseline

Command (through the required sprint wrapper):

```text
ORCHESTRATOR_PROJECT_DIR=/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/workspace \
bash /Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/workspace/.cleargate/scripts/run_script.sh \
npm run test:file -- test/workflow/engine.red.node.test.ts test/workflow/transport.red.node.test.ts
```

Working directory: `/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/stories/STORY-058-12/cleargate-cli`.

Exit status: `1` — 17 tests failed, 0 passed, 0 skipped. All failures are the
expected absent-module baseline: `src/workflow/engine.js` and
`src/workflow/codex-transport.js` do not exist. The test bodies contain concrete
post-implementation assertions; the dynamic imports preserve a countable failure
for each scenario until the production modules are supplied.

## Worktree Placement

The three sealed files were moved unchanged from the integration CLI checkout to
the assigned STORY-058-12 CLI worktree before the baseline was rerun. The
integration checkout is clean. The original placement was an operational error,
not a production test incident. QA then repaired the BLOCKED-drain harness override
to record each dispatch before asserting that the admitted sibling drains. The other
overridden seams were audited: none are asserted through omitted harness bookkeeping.

## TPV amendment and reseal

Per `STORY-058-12-tpv.md` BLOCKED-WIRING-GAP, every transport client now registers
an idempotent `t.after` cleanup immediately after construction and before `connect()`.
The local fixture now gives `initialize` a schema-shaped success response, accepts the
client `initialized` notification, and limits scenario faults to the named business
request. Its approval path is an actual JSON-RPC server request with an ID plus
`itemId`, `threadId`, and `turnId`; denial and interrupt traffic are consumed without
recursive fault injection. No acceptance assertion was removed or weakened.

Fixture-only protocol audit: a direct local JSONL peer exercised normal, malformed
JSON, process death, RPC error, and approval scenarios after the handshake; all five
observed the expected fixture path. No production transport module was read or run.

Reseal command exit status: `1` — 17 tests failed, 0 passed, 0 skipped, solely from
the intentional absent `src/workflow/engine.js` and `src/workflow/codex-transport.js`
baseline.

## Script Incidents

- `/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/workspace/.cleargate/sprint-runs/SPRINT-41/.script-incidents/20260911T235907Z-9887cfa475e4.json`

flashcards_flagged: []
