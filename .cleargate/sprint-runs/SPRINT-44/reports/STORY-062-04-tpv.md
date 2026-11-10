# STORY-062-04 — TPV (Test Pattern Validation)

role: architect

**Verdict: TPV: APPROVED**

QA-Red commit `a41bc6b` on `story/STORY-062-04` (base `contract/S-44-plan` d6c74ac). Worktree `OUTER/.worktrees/STORY-062-04/cleargate-cli`, read-only. `git status --porcelain` is clean.

**Why TPV was dispatched.** The pre-gate scan flagged `typecheck: exit code 254`. This is the known false fail (BUG-087). `tsconfig.json` has `"include": ["src/**/*"]` and `"exclude": [..., "**/*.test.ts"]`, so `npm run typecheck` never compiles the red files. The flag is not a test-wiring signal.

## 1. Imports resolve

| Red file | Import | Target in C4 | Result |
|---|---|---|---|
| all four | `../helpers/host-fixtures.js` → `mkTmp`, `listTree` | `test/helpers/host-fixtures.ts:47` `mkTmp(prefix)`, `:251` `listTree(dir, excludeRel?)` | OK |
| endpoint, roundtrip | `../../src/dashboard/serve.js` → `serve`, `type ServeHandle` | `serve.ts:101`, `:83` | OK |
| endpoint, roundtrip, tab | `../../src/dashboard/collect.js` → `type SprintDashboardData` | `collect.ts:70` | OK |
| tab | `../../src/dashboard/render.js` → `render` | `render.ts:797` | OK |
| roundtrip | `../../src/wiki/parse-frontmatter.js` → `parseFrontmatter(raw).fm` | `parse-frontmatter.ts:24`, returns `{ fm, body }` | OK |
| plan | dynamic `await import('../../src/dashboard/plan.js')` → `collectPlan(cwd, backlog)`, inside each test | absent by design (M2 §1 creates it), and matches the M2-pinned `collectPlan(cwd: string, backlog: BacklogData): PlanData` | OK (expected missing) |

## 2. Signatures match

- `serve({...})`: the keys `cwd, port, stdout, idleMs, sentinelIntervalMs, writeRecordFile, collectFn, collectBacklogFn` all exist on `ServeOptions` (`serve.ts:52-81`). `idleMs: 0` and `sentinelIntervalMs: 0` both mean disabled (`:63-66`). `scopeHandlerFn` is the M2-pinned new seam; the options object is cast `as any`. Its absence in C4 is the red condition.
- The stub `scopeHandlerFn(opts, cli)` returns `{ ok, code, sprintId, op, changed, unchanged, warnings, errors, sha }`. This matches the frozen `SprintScopeResult` field for field (`commands/sprint-scope.ts:23-33`). The recorded `opts.op/ids/expectSha/sprintId` and `cli.cwd` match `SprintScopeOptions`/`SprintScopeCli` (`:9-21`).
- The fixture `sampleData()` keys match `SprintDashboardData` exactly. The backlog stub `{ items, children, diagnostics }` matches `BacklogData` (`backlog.ts:26-30`), and the plan-unit `Item` mirrors `BacklogItem` (`backlog.ts:11-24`).
- `render(data, { token })` targets the M2-pinned `render(data, opts: RenderOptions = {})`. The 1-arg C4 signature is not type-checked here (tests are excluded from tsc), and the extra argument is ignored at runtime. This is the red condition, not a wiring gap.
- `ServeHandle.server` / `.close()` exist (`serve.ts:83-89`, `:256-259`).
- Harness regexes target real markup: `<script>${buildClientScript(data)}</script>` has no attributes (`render.ts:874`), and `` `const DATA = ${dataBlob};` `` is its own line (`render.ts:564`). The client function names `cgPlanToken/Initial/Members/Pick/Diff/Summary/CanCommit/Body/Reconcile/RowsHtml/BannerHtml/NoticeHtml/ResultHtml` are the ones the M2 plan's table pins.

## 3. Mocked methods

The red files make no `t.mock.method` or `mock.module` calls. All substitution goes through constructor seams: `collectFn` and `collectBacklogFn` exist today, and `scopeHandlerFn` is pinned in M2. The vm sandbox stubs `document`, `window`, `location`, `history`, the timers and `fetch`.

## 4. Setup / teardown

- `plan.red`: `after()` deletes every `mkTmp` dir pushed to `tmps`, including the missing-pending-sync case.
- `plan-endpoint.red`: the file-level `before` (tmp tree plus server) is paired with an `after` that runs `handle.close()` and `rmSync`. Every extra `startServer` / `withStub` server is closed in `finally`.
- `plan-roundtrip.red`: the `before`/`after` pair is the same. The C2 test rewrites the fixture to reset state, and the tmp tree is removed in `after`.
- `plan-tab.red`: pure, writes no state.
- Every server sets `writeRecordFile: false`, so no `.dashboard.json` is written.

## 5. Naming

All four files are `test/dashboard/*.red.node.test.ts`, matching the sprint-context §Test Stack naming. They are matched by `run-default-tests.mjs`'s `test/**/*.node.test.ts` glob and are not excluded as integration tests.

## Empirical load check

I ran `npm run test:file -- <4 files>` in the worktree with a short private TMPDIR: 49 tests, 0 pass, 49 fail, 0 cancelled, and the process exited without hanging.
- 9 fail with `ERR_MODULE_NOT_FOUND .../src/dashboard/plan.js`, the expected per-test dynamic-import misses (all 9 `plan.red` tests).
- 40 fail with `AssertionError`. Examples: "GET / must embed the 64-hex token via function cgPlanToken()", "client function cgPlan* must exist", and "/data must carry plan".
- 0 fail with `TypeError`, `ReferenceError` or `SyntaxError`, and no before/after hook failed.

Every failure is missing behaviour, not miswiring.

## Notes for Dev (not blocking)

- `plan-roundtrip.red.node.test.ts` stays red until 02 and 03 are integrated: the C3 stub returns code 1. This matches M2 Order §4, and the Dev report must name it as the one expected red.
- Do not open real sockets in the tab tests: `plan-tab.red` runs the client in `vm` with a never-resolving `fetch`.

## Script Incidents

The wrapper exits non-zero by design on a red run:
- `.cleargate/sprint-runs/SPRINT-44/.script-incidents/20261110T065252Z-6f3d000beb79.json` and `20261110T065300Z-6f3d000beb79.json`: the first run used the long scratchpad TMPDIR, and tsx's IPC pipe path hit `EINVAL` (unix-socket path too long). I re-ran with a short `/tmp` dir, per the sprint-context `TMPDIR` rule.
- `.cleargate/sprint-runs/SPRINT-44/.script-incidents/20261110T065311Z-6f3d000beb79.json`: the valid red run, exit 1 = 49 expected red failures.
