# STORY-062-01 — TPV (Test Pattern Validation)

role: architect

**Verdict: TPV: BLOCKED-WIRING-GAP — `cr101.node.test.ts` `startServer()` (:88–102) now serves on `port: 0` but still returns `{ port: h.port }` synchronously, before `listening`, so it always hands back 0 and three tests (:117, :143, :183) cannot pass under any implementation.**

QA-Red commit `fa39ae8` on `story/STORY-062-01` (base `contract/S-44-shell` e06cac8). Worktree `OUTER/.worktrees/STORY-062-01/cleargate-cli`, read-only.

**Why TPV was dispatched.** The pre-gate scan flagged `typecheck: exit code 254`. This is the known false fail (BUG-087). `tsconfig.json` includes `src/**/*` and excludes `**/*.test.ts`, so tsc never compiles test files. The flag says nothing about test wiring.

## The gap (route back to QA-Red)

`test/dashboard/cr101.node.test.ts:88–102`:

```ts
const h = serve({ cwd: root, port: 0, ... });
closers.push(h.close);
return { port: h.port, close: h.close };
```

`ServeHandle.port` is a getter over `boundPort` (`serve.ts:268–275`). The header comment there says the bound port "is not known until the listen succeeds, which is after this returns". `server.listen` is asynchronous, so at return `boundPort` still holds the requested value, 0. The callers destructure at call time (`const { port } = startServer(root)`), so a getter alone would not fix this either.

I checked this against the worktree serve.ts. Capturing at return yields `0`. The server actually bound 63147.

Consequences. Each test below fails no matter what the Developer does, and the Developer cannot edit tests (M1 ground rule 2):

| Line | Test | Failing step |
|---|---|---|
| :117 | answers service, root, sprintId and pid | `probeHealthz(0)` returns null, so `assert.ok(body)` fails |
| :143 | is written by the server on listen, and removed on close | `rec.port` (real port) never equals 0 |
| :183 | adopts a live matching daemon without spawning a second | `res.port` (real port) never equals 0 |

Before the edit, the fixed port came back unchanged, so this only broke when the port moved to 0. The M1 plan's test shape item 1 (`plans/M1.md:155`) already asks for this: "Return the bound port after `listening`."

**Required fix (QA-Red).** Make `startServer` async. After `closers.push(h.close)`, add `await new Promise<void>((r) => (h.server.listening ? r() : h.server.once('listening', () => r())))` and return `{ port: (h.server.address() as net.AddressInfo).port, close: h.close }`. Change the three callers to `await startServer(root)`. `net` is already imported (:22).

## 1. Imports resolve

| File | Import | Target | Result |
|---|---|---|---|
| lifecycle.red | `* as daemon` from `../../src/dashboard/daemon.js` | exists. It is a namespace import, so the missing `legacyRecordPath` fails only its own test (M1 ground rule 3) | OK |
| lifecycle.red, cr101 | `serve` from `../../src/dashboard/serve.js` | `serve.ts:101` | OK |
| lifecycle.red, cr101 | `sprintDashboardHandler` from `../../src/commands/sprint.js` | `sprint.ts:173` | OK |
| lifecycle.red | `CLI_ROOT` from `../helpers/scaffold-roots.js` | `scaffold-roots.ts:21` | OK |
| tab-shell.red | `render`, `type SprintDashboardData` | `render.ts:796`, `collect.ts:70` | OK |
| cr101 | `readRecord, writeRecord, removeRecord, recordPath, isAlive, isOurs, probeHealthz, ensureDaemon, stopDaemon, spawnDaemon, SERVICE_ID, HealthzBody` | all exported from `daemon.ts`. The plan keeps every name (`removeRecord(cwd)` included; it was already unused before this commit) | OK |

## 2. Signatures match the plan

- `recordPath(root)` and `readRecord(root)` (one argument) match the target signatures in `M1.md:54,57`. Today they throw `ERR_INVALID_ARG_TYPE` or return null. That is the intended red condition.
- `legacyRecordPath(root, id)` matches `M1.md:55`. `writeRecord(root, rec)` keeps its signature (`M1.md:58`).
- `ensureDaemon({ cwd, spawnFn, probeFn, startupTimeoutMs })` and `stopDaemon({ cwd, killFn })` match `EnsureOptions` and the stop opts in `daemon.ts`. `StopResult.reason` values asserted are `stopped | not-running | already-dead`, which match the narrowed union in `M1.md:71`.
- The `sprintDashboardHandler(opts, cli)` seams `ensureFn`, `stopFn`, `openFn` and `exit` exist on `DashboardCliOptions` (`sprint.ts:104–122`).
- The `serve()` keys `cwd, port, stdout, exitFn, idleMs, writeRecordFile, autoPort` exist on `ServeOptions`. `sentinelIntervalMs` is passed only through `...({} as object)` in S3, so it survives the option's removal.
- The `spawnCli` tsx recipe matches `test/hooks/hook-signal-codex.red.node.test.ts:22–41`.
- The tab-shell fixture omits `diagnostics`. That is safe, because `renderDiagnostics(d ?? [])` (`render.ts:99–100`) and the client `data.diagnostics || []` both handle it. The vm harness selectors `'section[data-tab]'` and `'.tab-bar a'` match the C1 client script and the plan's `cgShowTab` exactly.

## 3. Mocked methods

There are no `t.mock.method` or `mock.module` calls. All substitution goes through existing seams (`spawnFn`, `probeFn`, `killFn`, `ensureFn`, `stopFn`, `openFn`, `exit`). The vm sandbox stubs every global the client script touches (`document.getElementById/querySelector/querySelectorAll/addEventListener/body`, `window.addEventListener`, `location.hash/reload`, `fetch`, `setInterval`). The `[wiring anchor]` case passes on the C1 tree.

## 4. Setup / teardown

- Both lifecycle.red and cr101 have a file-level `afterEach` that runs every `closers` entry and `rmSync`s every tmp dir. Every `serve()` call, in-process spawns included, pushes `h.close`, and the cr101 squatter is pushed too.
- Every `stopDaemon` call whose record names `process.pid` passes a capturing `killFn`. The only default-kill path is the R2 test, a bare root with no record, which returns `not-running` before signalling anything.
- No `process.env` mutation in the red files. cr101's `CLEARGATE_NO_DASHBOARD` test restores it in `finally`.
- tab-shell.red is pure (vm only).

## 5. Naming

`dashboard-lifecycle.red.node.test.ts` and `tab-shell.red.node.test.ts` follow `*.red.node.test.ts` (sprint-context §Test Stack; M1 decision 5). `cr101.node.test.ts` is an existing file, edited in place as decision 5 allows. All three are listed in story §3.1 Test Files.

## Run evidence (C1 tree, before the Developer)

`TMPDIR=/tmp/cg44t1 npm run test:file -- <file>`. Every file loads and none hangs.

- `tab-shell.red`: 8 pass, 5 fail. All five failures are behavioural assertions (default tab, reload on sprint change, R8 copy).
- `dashboard-lifecycle.red`: 5 pass, 14 fail. The failures are the planned one-argument `recordPath` throw, the `legacyRecordPath must be exported` assertion, or behavioural assertions. Two S4 variants and S5 already pass as regression anchors.
- `cr101`: 15 pass, 9 fail. Today all nine fail on the one-argument signature. After the Developer's change, :117, :143 and :183 would still fail on the port-0 capture above.

## Re-check (after QA-Red fix 2c1cf6a)

**Verdict: TPV: APPROVED**

Fix commit `2c1cf6a` on `story/STORY-062-01` (parent `fa39ae8`). It changes only `test/dashboard/cr101.node.test.ts` (+7/−5). `dashboard-lifecycle.red` and `tab-shell.red` are byte-identical to the first check. Worktree `git status --porcelain` is clean.

**The gap is closed.**
- `startServer` (:88–102) is now `async`. It pushes `h.close` to `closers` before awaiting, so teardown is still registered even if the wait were to stall. It waits on `h.server.once('listening')` unless the server is already listening, then returns `(h.server.address() as net.AddressInfo).port`. `server` is a `ServeHandle` field (`serve.ts:81`), and the same `http.Server` instance is reused across autoPort retries (`serve.ts:182`), so the one `listening` listener is enough. `net` is imported (:22).
- All three callers await the helper: :121, :147, :187. No other caller exists (`grep startServer` returns 4 hits: the definition plus those three).
- Empirical probe against the worktree `serve.ts`, using the helper's exact pattern: the synchronous `h.port` read returns `0`, and the awaited `address().port` read returns `63404`.
- The three tests that could not pass before now get past `await startServer(root)` and fail only at the planned one-argument `recordPath(root)` red (`daemon.ts:63`, `ERR_INVALID_ARG_TYPE`), at :122, :148 and :188. The Developer's signature change unblocks them. They are no longer pinned to 0.

**No wiring regression.** Each file was run with `TMPDIR=/tmp/cg44t1b npm run test:file -- <file>`, one at a time:

| File | Pass | Fail | Cancelled | First check |
|---|---|---|---|---|
| `cr101.node.test.ts` | 15 | 9 | 0 | 15 / 9 |
| `dashboard-lifecycle.red.node.test.ts` | 5 | 14 | 0 | 5 / 14 |
| `tab-shell.red.node.test.ts` | 8 | 5 | 0 | 8 / 5 |

Every file loads, none hangs, and the failure sets match the first check. Checks 1 (imports), 3 (mocks), 4 (teardown) and 5 (naming) were confirmed unchanged by the diff and not redone in depth.

**Non-blocking note.** If `listen` ever emitted `error` instead of `listening`, the wait would never resolve, and node:test has no default per-test timeout. On `127.0.0.1:0` this cannot happen in practice: EADDRINUSE is impossible on an OS-assigned port. No action is required.
