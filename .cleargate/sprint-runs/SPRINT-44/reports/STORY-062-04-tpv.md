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

---

## Re-check — QA-Red re-dispatch 1 (commit `1624636`, M2 Amendment §A4)

**Verdict: TPV: APPROVED**

Scope: `1624636` on `story/STORY-062-04` (parent `39a513c`). The commit touches only `test/dashboard/plan-stale-claims.red.node.test.ts` (new, 226 lines) and adds one line to `test/dashboard/plan.red.node.test.ts`. HEAD = `1624636`, and `git status --porcelain` is clean.

**Why TPV was dispatched.** The pre-gate flagged only the BUG-087 typecheck false fail. That flag says nothing about test wiring: tests are excluded from `tsconfig.json`.

### 1. Imports resolve

| Import | Branch target | cli `main` `0e60fbd` | Result |
|---|---|---|---|
| `../../src/dashboard/plan.js` → `collectPlan` | `plan.ts:199` `collectPlan(cwd: string, backlog: BacklogData): PlanData` | not on main (04's own file) | OK |
| `../../src/commands/sprint-scope.js` → `sprintScopeHandler` | C3 stub `sprint-scope.ts:36` `(opts: SprintScopeOptions, cli?: SprintScopeCli)` | real handler `sprint-scope.ts:319`, same name, path and arity | OK; E4 red until §A3 integration, as designed |
| `../helpers/host-fixtures.js` → `mkTmp` | `host-fixtures.ts:47` | — | OK |

### 2. Signatures match

- E4 calls `sprintScopeHandler({ op:'add', sprintId, ids }, { cwd, stdout, stderr })`. Every key exists on `SprintScopeOptions` and `SprintScopeCli`, on the stub and on main (`0e60fbd:sprint-scope.ts:32-54`). `expectSha` is optional on both, so omitting it is valid.
- E4 reads `r.code`, `r.errors` and `r.warnings`, all fields of the frozen `SprintScopeResult`.
- Every literal E4 matches against exists verbatim on main: `was claimed by X (no sprint file|completed|archived) — reassigned` (`:440/449/451`) and `is already in X` (`:453`).
- `findSprintPlanFile` resolves the fixture's `<ID>_x.md` names (prefix `${id}_` in pending-sync, then archive). That is the same naming `plan-roundtrip.red` already uses with the real handler.
- The hand-built `Item` and `Backlog` shapes are copied unchanged from `plan.red`, which was TPV-approved against `BacklogItem` and `BacklogData`.
- A4 re-scope: `sprintFile(d, 'SPRINT-42')` uses `plan.red`'s own writer (`:33`), whose options argument defaults to `{}` (Draft, empty lists). This is the one line §A4.1 specifies, and it changes no assertions.

### 3. Mocked methods

There are no `t.mock` or `mock.module` calls. E4 calls the real handler with no seams, so its stamp, gate and ingest steps run against the temp tree. Failures in those steps come back as `warnings`, and E4 filters for `' was claimed by '`.

### 4. Setup / teardown

- `plan-stale-claims.red`: every `tmp()` dir goes into `tmps`, and a file-level `after()` runs `rmSync` on each one. E4's handler writes, including any `.cleargate/wiki`, land only under `cwd: d`, the temp dir.
- No server is started, no sentinel is written, and nothing is module-level beyond `tmps`.
- `plan.red`: the existing `after()` is unchanged.

### 5. Naming

The new file is `test/dashboard/plan-stale-claims.red.node.test.ts`: the `*.red.node.test.ts` pattern, and not `*.integration.*`, so `npm test` picks it up.

### Empirical run (`TMPDIR=/tmp/cg44t4b`, `npm run test:file`, one file at a time)

- **`plan-stale-claims.red`: 4 tests, 0 pass, 4 fail, 0 cancelled, no hook failure.**
  - E1 fails on `AssertionError` deepEqual: the Abandoned sprints are listed.
  - E2 fails on `AssertionError`: the actual ids are `[BUG-086, BUG-052, BUG-053]`, because the stale rows are missing.
  - E3 fails on `AssertionError` `true !== false`: BUG-052 is still disabled after the rewrite.
  - E4 fails on `TypeError: Cannot read properties of undefined (reading 'disabled')` at `:196`. This is missing behaviour, not miswiring: `c('BUG-102')` is `undefined` because pre-fix `plan.ts` drops non-carry-over stale rows (the same defect E2 asserts). E4 fails before it reaches the handler.
- **`plan.red`: 9/9 pass** after the A4 re-scope. Adding SPRINT-42 makes it an open Draft claim, so the pre-fix and post-fix `plan.ts` agree on A4.

### Notes for Dev (not blocking)

- E4 dereferences `cs.find(...)!` without checking it first. If §A1 is only half applied, E4 fails with a `TypeError` rather than an assertion message. Read E2's output first; it names the missing ids.
- Once `plan.ts` is fixed but **before** `git merge --no-ff main`, E4 still fails: the C3 stub returns `code 1` with no `is already in` error. Follow the §A5 order (merge first, then the fix), and judge E4 only on the integrated tree.

### Script Incidents

The wrapper exits non-zero by design on a red run:
- `.cleargate/sprint-runs/SPRINT-44/.script-incidents/20261110T082020Z-2fbb9f4ac9a4.json` and `20261110T082029Z-2fbb9f4ac9a4.json`: two identical `plan-stale-claims.red` runs (a full log, then a summary grep). Exit 1 = 4 expected red failures.
- The `plan.red` run exited 0, so it produced no incident.
