# STORY-062-05 — TPV (Test Pattern Validation)

role: architect

**Verdict: TPV: APPROVED**

QA-Red commit `7299d64` on `story/STORY-062-05`, base cli `main` `8f71c87`. Worktree `OUTER/.worktrees/STORY-062-05/cleargate-cli`, read-only. HEAD is `7299d64`, and `git status --porcelain` is clean. The commit touches only the two new red files: `git diff --stat 8f71c87 7299d64 -- src/` is empty.

**Why TPV was dispatched.** The pre-gate scan flagged only `typecheck: exit code 254`. I ran `npm run typecheck` (`tsc --noEmit`) directly in the worktree, and it exits 0. That makes the flag the known BUG-087 false fail. It also tells us nothing about test wiring, because `tsconfig.json:24-25` includes only `src/**/*` and excludes `**/*.test.ts`.

## 1. Imports resolve

| Red file | Import | Target at `7299d64` | Result |
|---|---|---|---|
| both | `../../src/dashboard/serve.js` → `serve`, `type ServeHandle` | `serve.ts:249`, `:92` | OK |
| host-guard | `* as serveMod` from `serve.js` → `serveMod['hostGuard']` | absent by design. M3 step 2 exports `hostGuard(req: Pick<IncomingMessage,'headers'>, port: number): string \| null` from **serve.ts**. The name and module path match exactly. | OK (expected missing) |
| ticket-view | `* as collectMod` from `collect.js` → `collectMod['capDoc']`, `collectMod['MAX_DOC_CHARS']` | absent by design. Today `collect.ts:222` has a non-exported `const MAX_DOC_CHARS = 40000`. M3 step 1 exports both `MAX_DOC_CHARS` and `capDoc(raw)` from **collect.ts**. The names and module path match exactly. | OK (expected missing) |
| both | `type SprintDashboardData` from `collect.js` | `collect.ts:70` (type-only, erased) | OK |
| ticket-view | `render` from `render.js` | `render.ts:1167` | OK |
| ticket-view | `renderMarkdown` from `markdown.js` | `markdown.ts:133` | OK |
| ticket-view | `type BacklogData, BacklogItem` from `backlog.js` | `backlog.ts:14`, `:29` (type-only) | OK |
| host-guard | `collectBacklog` from `backlog.js` | `backlog.ts:131` | OK |
| host-guard | `probeHealthz`, `SERVICE_ID` from `daemon.js` | `daemon.ts:148`, `:43` | OK |
| both | `mkTmp` (and `listTree` in host-guard) from `../helpers/host-fixtures.js` | `host-fixtures.ts:47`, `:251` | OK |

**Missing exports red per test, not per file.** The package is `"type": "module"`. Both not-yet-existing exports are reached through **namespace** imports and bracket access, per the M3 "Red-test shape". In ESM an absent namespace member is `undefined` and causes no link error, so the file loads and only H0 and A4 fail. Every named import binds an export that already exists. The empirical run confirms this: there is no `SyntaxError` and no `ERR_MODULE_NOT_FOUND`.

## 2. Signatures match

- **`serve({...})`.** These keys all exist on `ServeOptions` (`serve.ts:56-90`): `cwd`, `port: 0`, `stdout`, `idleMs: 0`, `writeRecordFile: false`, `exitFn`, `collectFn`, `collectBacklogFn`, `collectPlanFn` and `scopeHandlerFn`. The options object is cast `as any`.
  - `collectFn: () => sampleData()` matches `(opts: CollectOptions) => SprintDashboardData`. Extra parameters are ignored.
  - `collectBacklogFn: (cwd) => collectBacklog(cwd)` matches `(cwd: string) => BacklogData`.
  - `collectPlanFn: () => ({ sprints: [], diagnostics: [] })` matches `PlanData` (`plan.ts:48-51`).
- **`sampleData()`.** In both files its keys are the `SprintDashboardData` shape that `plan-endpoint.red` already uses, which TPV approved for 04.
- **`scopeHandlerFn` stub.** It is `async (opts) => ({ ok, code, sprintId, op, changed, unchanged, warnings, errors, sha })`, which matches `SprintScopeResult` (`commands/sprint-scope.ts:56+`) field for field. `handlePlanPost` calls it as `(opts, cli)` (`serve.ts:226-233`), and the stub ignores `cli`.
- **The `A6` backlog seam.** `baseItem` and the Part B `item()` builder fill all 12 `BacklogItem` fields (`backlog.ts:14-27`). `{ items, children, diagnostics }` matches `BacklogData` (`:29-33`).
- **The Plan fixture.** `plan()` sprints carry every `PlanSprint` field (`plan.ts:31-46`). `cand()` carries every `PlanCandidate` field (`:19-29`).
- **`render(data, { token })`.** This matches `render(data, opts: RenderOptions = {})` with `RenderOptions { token?: string }` (`render.ts:1163-1170`). `boot()` takes the first `<script>`, and `buildClientScript` emits that script with no attributes.
- **`hostGuard` call shape.** The test calls `g({ headers: { host } }, P)` and `g({ headers: {} }, P)`. Both satisfy M3's `Pick<IncomingMessage,'headers'>, port`, and the test expects a `null` or `'forbidden: bad host'` return, as M3 pins.
- **`capDoc` / `MAX_DOC_CHARS` checks.** The test pins `40000` and the suffix by value, never with a `?? default` fallback. `MARK = '\n\n… (truncated)'` uses U+2026 (bytes `e2 80 a6`), which is byte-identical to the suffix at `collect.ts:230`/`:241` that M3 moves into `capDoc`.
- **`probeHealthz(port)`.** The test uses the signature `(port, timeoutMs = 800) → HealthzBody | null` and reads `.service`/`.root`, which are `HealthzBody` fields (`daemon.ts:54-59`).
- **Client globals the vm harness reads.** `cgBacklogState` (`var`, `render.ts:962`), `cgPlan`, `cgPlanLatest` (`var`, `:576`), `cgPlanRowsHtml(s, ticked, children)` (`:610`) and `cgFindDoc(key)` (`:845`) are all reachable. `cgLatestData` is a top-level `let` (`:834`). B7's `h.run('cgLatestData = …')` writes through the realm's shared script-scope binding, which `cgFindDoc` reads. The run proves the write is visible: B7 fails on a returned `{ title, body }`, not `null`.

## 3. Mocked / stubbed methods

There are no `t.mock` and no `mock.module` calls. Substitution goes only through `serve()` seams that exist today.

The vm sandbox stubs exactly the DOM surface the client script touches at boot, on click and in the poll. I checked it against `render.ts:575-776` (`PLAN_CLIENT`) and `:778-1112` (`lines`):

| Stub | Covers |
|---|---|
| `document.addEventListener` | click, change, input, keydown |
| `document.getElementById` | auto-registers missing ids |
| `document.querySelector` / `querySelectorAll` | returns arrays, so `.forEach` works |
| `document.createElement`, `document.body.style` | |
| `window.addEventListener` | `hashchange` |
| `location.hash` / `location.reload` | |
| `setInterval` | captures the poll callback |
| `setTimeout`, `clearInterval` | |
| `fetch` | deferred `{ status, ok, json }` |
| `console` | |

The `El` class carries the members the client reads:
- attribute access: `getAttribute`, `setAttribute`;
- tree access: `closest` (now walks `parent`), `querySelector*`;
- content and state: `innerHTML`, `textContent`, `hidden`, `checked`, `disabled`, `value`;
- `classList.toggle`.

The run produced no `TypeError` and no `ReferenceError`, so boot does not throw in the harness.

## 4. Setup / teardown

- **host-guard.** The file-level `before` writes the `mkTmp` tree and starts one server. The paired `after` (`:107-110`) runs `handle?.close()` and `fs.rmSync(tmp, { recursive, force })`.
- **ticket-view Part A, suite 1.** `before`/`after` (`:106-114`) build the tree and start the server, then close it and `rmSync` the tree.
- **ticket-view A6 suite.** `before`/`after` (`:186-199`) follow the same pattern.
- **ticket-view A7 and A8.** Each builds its own root and server inside `try { … } finally { h.close(); rmSync }`.
- **ticket-view Part B.** It is pure vm: no socket, no files. Its timers are stubs, so no real interval is left armed.
- **No `.dashboard.json`.** Every server sets `writeRecordFile: false` and `idleMs: 0`, so there is no record file and no idle timer.
- **Empirical.** After the run, the private `TMPDIR` held no `cg-ticket-*` or `cg-hostguard-*` directory, and the process exited without hanging.

## 5. Naming

Both files match the sprint-context §Test Stack red naming, `*.red.node.test.ts`:
- `test/dashboard/ticket-view.red.node.test.ts`
- `test/dashboard/host-guard.red.node.test.ts`

Neither is `*.integration.*`, so `npm test`'s `run-default-tests.mjs` glob (`test/**/*.node.test.ts`) picks both up.

## Empirical load check

Command: `npm run test:file -- test/dashboard/ticket-view.red.node.test.ts test/dashboard/host-guard.red.node.test.ts`, run through `run_script.sh` with `TMPDIR=/tmp/cg44tpv5`.

**Result: 51 tests, 20 pass, 31 fail, 0 cancelled, 0 skipped.** The split matches the QA-Red report: ticket-view 22 red and 2 green, host-guard 9 red and 18 green.

- **All 31 failures are `AssertionError [ERR_ASSERTION]`.** There are 0 of each of `TypeError`, `ReferenceError`, `SyntaxError`, `ERR_MODULE_NOT_FOUND`, `ECONNRESET`/`EPIPE`, request timeout, and hook failure.
- **The failures name missing behaviour.** Examples:
  - `serve.ts must export hostGuard`
  - `capDoc must be exported from collect.ts`
  - `Backlog row must carry the view button`
  - `Backlog expand handler must ignore .doc-btn clicks`
  - `Plan click handler must ignore .doc-btn clicks`
  - `view click must fetch /doc`
  - B7 returning the sprint story instead of `null`
  - the 404 `not found` text body on `/doc`
- **The 20 greens are the regression pins M3 lists.** A2 and A9; H1 `POST /plan`; H2 `/`, `/data`, `/healthz`, `/nope` and both `POST /plan` rows; H4 ×4; H5; H6. They show that the harness talks to the real server correctly.

## Notes for Dev (not blocking)

- **`sentinelIntervalMs: 0` is a stale key.** It appears in both new files' `serve()` options and also in `plan-endpoint.red` and `plan-roundtrip.red`. It is not on `ServeOptions`, and the `as any` cast lets it through, so it is ignored at runtime. **Do not add it to `ServeOptions`**: `dashboard-lifecycle.red.node.test.ts:408-413` asserts that `serve.ts` does not contain the string `sentinelIntervalMs`.
- **B2 and B3b check the plan only after the backlog part passes.** B2 reaches its Plan assertions only after its Backlog child-row assertion passes, as QA-Red noted. Read B2's later failures only after R3's Backlog button lands.
- **H6 already passes.** `planGuard` already drains a refused POST through `req.resume()` (`serve.ts:157-160`). The new outer `hostGuard` branch must keep the `req.resume()` that M3 specifies. Without it, H6 can regress to `ECONNRESET`.
- **`cgModalSeq` placement.** B4, B5 and B6 depend on M3's rule that `var cgModalSeq = 0;` sits right after `let cgLatestData = DATA;`, before the first top-level call. A later `var` is hoisted as `undefined`, and `++` on it gives `NaN`.

## Script Incidents

The wrapper exits non-zero by design on a red run:
- `.cleargate/sprint-runs/SPRINT-44/.script-incidents/20261110T093853Z-9d46c08a3fa9.json` is my run of the two red files. Exit 1 means 31 expected red failures. The earlier `20261110T093659Z-c9d056115a54.json` predates this TPV and is not mine.
- The direct `npm run typecheck` exited 0, so it produced no incident. This is the BUG-087 confirmation.
