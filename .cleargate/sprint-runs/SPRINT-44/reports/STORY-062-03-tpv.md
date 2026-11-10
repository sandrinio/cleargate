# STORY-062-03 — TPV (Test Pattern Validation)

role: architect

**Verdict: TPV: APPROVED**

QA-Red commit `8f89633` on `story/STORY-062-03` (base `contract/S-44-scope` 1cdd65d). Worktree `OUTER/.worktrees/STORY-062-03/cleargate-cli`, read-only. `git status --porcelain` is clean. Red file: `test/commands/sprint-scope.red.node.test.ts`, 541 lines and the only file in the commit.

**Why TPV was dispatched.** The pre-gate scan flagged `typecheck: exit code 254`. `npm run typecheck` exits 0 in the worktree, so this is the known false fail (BUG-087). `tsconfig.json:24-25` has `"include": ["src/**/*"]` and excludes `**/*.test.ts`, so typecheck never compiles the red file anyway. The flag is not a test-wiring signal.

## 1. Imports resolve

| Import | Target | Result |
|---|---|---|
| `../../src/commands/sprint-scope.js` → `sprintScopeHandler`, `type SprintScopeCli`, `type SprintScopeOptions`, `type SprintScopeResult` | C3 `sprint-scope.ts:9`, `:17`, `:23`, `:36` | OK |
| `../../src/wiki/parse-frontmatter.js` → `parseFrontmatter(raw).fm` | `parse-frontmatter.ts:24`, returns `{ fm, body }` | OK |
| `../../src/lib/frontmatter-locator.js` → `locateFrontmatter`, and `span.end` | `frontmatter-locator.ts:69` (`FrontmatterSpan` at `:21`) | OK |
| `../helpers/scaffold-roots.js` → `canonicalPath`, `CLI_ROOT` | `scaffold-roots.ts:36`, `:21` | OK |
| `canonicalPath('.cleargate/knowledge/readiness-gates.md')` (fixture copy) | `scaffold/core/.cleargate/knowledge/readiness-gates.md` exists | OK |
| `import.meta.resolve('tsx/esm')` (CLI spawn) | `node_modules/tsx` is the symlinked cli install; the spawn ran `src/cli.ts` and printed sprint usage | OK |
| `node:test`, `node:assert/strict`, `node:crypto`, `node:fs`, `node:os`, `node:path`, `node:child_process` | built-ins | OK |

## 2. Signatures match

- `sprintScopeHandler(opts, cli)` matches the frozen `(opts: SprintScopeOptions, cli?: SprintScopeCli): Promise<SprintScopeResult>` (`sprint-scope.ts:36-39`).
- Every options literal uses only `op`, `sprintId`, `ids`, `expectSha` and `json` (`:9-15`).
- The result reads `code`, `ok`, `changed`, `unchanged`, `warnings`, `errors` and `sha`, all of them fields of `SprintScopeResult` (`:23-33`).
- `cli` passes `cwd`, `stdout` and `stderr`, which are on the frozen `SprintScopeCli` (`:17-21`), plus the seams below through `as SprintScopeCli`.

**Seams passed through the cast.** C3 freeze rule M1 §Rules 1 allows optional seam fields on `SprintScopeCli`.

| Seam | Used by the red file? | M1 plan pin (`plans/M1.md:286-289`) | Assessment |
|---|---|---|---|
| `stampFn` | yes, as a no-op in `NOOP_SEAMS` | `(absPath: string) => Promise<void>`; a throw means the step failed | Name and shape match. `async () => {}` is assignable. |
| `gateFn` | yes, as a no-op | same | Matches. |
| `ingestFn` | yes, as a no-op, and as `async () => { throw new Error('boom') }` in R7 and the purity test | same | Matches. A throw maps to the `wiki ingest … boom` warning (plan step 6). |
| `now` | **no**, named only in the header comment | `() => Date` | A reasonable name, but the red file never sets it. |
| `getVersion` | **no**, named only in the header comment | `() => CodebaseVersion` (`src/lib/codebase-version.ts:5`) | A reasonable name, but the red file never sets it. |

I also checked that the cast stays valid after the Developer adds the five seams. I ran `tsc --strict --exactOptionalPropertyTypes --noUncheckedIndexedAccess` on a scratch copy of the `run()` cast, with `SprintScopeCli` extended by all five pinned seam types. The spread `Record<string, unknown>` → `as SprintScopeCli` compiles (exit 0). Adding the seams cannot break the immutable red file.

## 3. Mocked methods

There is one mock: `t.mock.method(process, 'exit', …)` in the purity test. `process.exit` exists. The mock belongs to the test context `t`, so node:test restores it when that test ends. There are no `mock.module` calls.

## 4. Setup / teardown

- **Suite 1:** each test calls `mk()`, which pushes the realpath'd `mkdtemp` root to `roots`. The suite `after()` runs `rmSync` on every root with `recursive` and `force`. The `.active` and `sprint-runs/SPRINT-43/state.json` writes all land inside these tmp roots.
- **Suite 2 (CLI):** `before()` creates `tmp` and `after()` removes it.
- **Real-pipeline tests:** these are @data, @interfaces and R9, which run with no stamp, gate or ingest seams. They resolve paths from `cli.cwd` = the tmp root. `gate.ts` and `wiki-ingest.ts` have no `os.homedir` writes. The real `getCodebaseVersion({ cwd })` runs `git` in a non-repo tmp dir and falls back to a `package.json` walk-up (`codebase-version.ts:54-90`). No state escapes the tmp root.
- After the run, `/tmp/cg44t3` held no leftover `cg-sprint-scope-*` directories.

## 5. Naming

The file is `test/commands/sprint-scope.red.node.test.ts`, which matches the `*.red.node.test.ts` naming in sprint-context §Test Stack and Mid-Sprint Amendment decision 5. It is not an `*.integration.*` file, so it runs in the default tier.

## Empirical load check

I ran `TMPDIR=/tmp/cg44t3 npm run test:file -- test/commands/sprint-scope.red.node.test.ts` in the worktree. Result: 31 tests, 0 pass, 31 fail, 0 cancelled, and the process exited without hanging.

- 28 handler tests fail with `AssertionError`. Most messages are `contract C3 stub — STORY-062-03 not integrated`, `1 !== 0`, or `expected "<msg>" in: contract C3 stub …`.
- 3 CLI tests fail with `AssertionError`: `missing <ids...> in: Usage: cleargate sprint …`, twice, and `error: unknown command 'add'`.
- 0 failures are `ERR_MODULE_NOT_FOUND`, `TypeError`, `ReferenceError` or `SyntaxError`, and no before/after hook failed.

Every failure comes from missing behaviour, not from miswiring.

## Notes for Dev (not blocking)

- **Add all five seams.** Put `now`, `getVersion`, `stampFn`, `gateFn` and `ingestFn` on `SprintScopeCli` as M1 pins them. The red file exercises only the last three. The real-pipeline reds (@data, @interfaces, R9) therefore run with the real clock and the real `getCodebaseVersion({ cwd })` in a non-git tmp dir. The defaults must not throw there.
- **Run both test files in the lane.** The M1 lane command (`plans/M1.md`, "Lane test command") names `sprint-scope.node.test.ts`, which is the Developer's own unit-test file per story §3.1. Add `test/commands/sprint-scope.red.node.test.ts` to the lane run.
- **Expect normalized frontmatter.** The red fixture is not a yaml.dump fixed point: `sprint_goal: |`, unquoted `last_gate_check`, and `[]` lists. On the real-pipeline tests, the stamp and gate steps will re-dump the whole block (M1 Gotchas, Open decision 4). The red asserts only parsed values, `raw.slice(span.end)` tails and raw-byte sha, so that is fine.
