# STORY-062-02 — Architect TPV

role: architect · mode: TPV · SPRINT-44
Worktree: `.worktrees/STORY-062-02/cleargate-cli` · branch `story/STORY-062-02` · QA-Red commit `52989fa` on base `contract/S-44-backlog` `343c989`
Dispatch reason: pre-gate flagged `typecheck: exit code 254` (known false fail BUG-087; `npm run typecheck` exits 0 in the worktree). Live TPV runs because the safeguard requires it.

**Verdict: TPV: APPROVED**

## Red files
- `test/dashboard/backlog.red.node.test.ts` (18 tests, 2 suites)
- `test/dashboard/backlog-tab.red.node.test.ts` (13 tests, 1 suite)

## Check 1: imports resolve
| Import | Source | Result |
|---|---|---|
| `collectBacklog`, `BacklogItem`, `BacklogData` | `src/dashboard/backlog.ts` (C2 frozen exports) | resolve |
| `serve`, `ServeHandle` | `src/dashboard/serve.ts:83,101` | resolve |
| `render` | `src/dashboard/render.ts:797`, signature `SprintDashboardData & { backlog?: BacklogData }` | resolve |
| `SprintDashboardData` (type) | `src/dashboard/collect.ts:70` | resolve |

Run with `TMPDIR=/tmp/cg44t2 npm run test:file -- <file>`: 31/31 tests fail on `AssertionError` with "not yet implemented" messages. No `ERR_MODULE_NOT_FOUND`, `TypeError` or `ReferenceError`.

## Check 2: call signatures
- `serve({ cwd, port: 0, writeRecordFile: false, idleMs: 0, exitFn, stdout })`: every key exists on `ServeOptions` (`serve.ts:52-81`). `h.server.address()` and `h.close()` match `ServeHandle` (`serve.ts:83-89`).
- `collectBacklog(root)` matches `(cwd: string) => BacklogData`.
- The `item()` fixture builds every field of the frozen `BacklogItem`.
- `sprintData()` in `backlog-tab.red` leaves out `diagnostics`, which `SprintDashboardData` requires. This is a type-only gap and does not affect runtime: `tsconfig.json` excludes `**/*.test.ts`, `renderDiagnostics` falls back with `?? []` (`render.ts:100-101`), and the existing `render.node.test.ts` fixtures use the same pattern. It is not a blocker.

## Check 3: stubs and mocks
- There are no `t.mock.method` or `mock.module` calls.
- The `vm` DOM stub provides `getElementById`, `querySelector`, `querySelectorAll`, `addEventListener`, `createElement`, `closest`, `getAttribute`, `setAttribute`, select `value` and `innerHTML`. The current client script boots without throwing (`requireFn('cgRenderBacklog')` passes against the stub at `render.ts:735`).
- The client names the tests reach (`cgBacklogGroups`, `cgBacklogGateBadge`, `cgRenderBacklog`, `DATA`, `data-bl-filter`, `#backlog-list`, `#backlog-diagnostics`, `bl-child`, `data-bl-epic`, `cg-diagnostics`) match the M1 plan, lines 508-533.

## Check 4: setup and teardown
- Both `describe` blocks in `backlog.red` pair `before(buildFixture)` with `after(rmSync)`.
- The ad-hoc `mkdtemp` roots (missing-dir and cache tests) are cleaned up in `try/finally`.
- Each server is closed in `finally`. Teardown clears both timers, which are also `unref`'d (`serve.ts:230,246,259`). `writeRecordFile: false` means no `.dashboard.json` is written.
- `backlog-tab.red` writes no filesystem state.

## Check 5: naming
Both files follow `*.red.node.test.ts` (sprint-context Test Stack; M1 decision 5). The story's §3.1 Test Files row lists both.

## Script Incidents
None. Tests were run with `npm run test:file` in the worktree. No wrapper scripts were invoked.
