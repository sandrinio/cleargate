---
story: STORY-032-01
role: qa
sprint: SPRINT-32
verdict: QA-RED WRITTEN
mode: RED
created_at: 2026-05-29
---

# QA-Red Report — STORY-032-01: TypeScript Skeleton Extractor + db_writes

## RED Tests Written

Two test files placed at the correct test-glob path
(`cleargate-cli/test/wiki/code-map/` — per M1.md Gotcha and FLASHCARD #test-glob #cli #wiki).
Tests are named `*.red.node.test.ts` (immutable post-Red).

### Files

1. `.worktrees/STORY-032-01/cleargate-cli/test/wiki/code-map/scan-source.red.node.test.ts`
2. `.worktrees/STORY-032-01/cleargate-cli/test/wiki/code-map/extract-skeleton.red.node.test.ts`

## Test Inventory (Scenario Count)

### scan-source.red.node.test.ts — 6 scenarios

| # | Scenario | Maps to |
|---|----------|---------|
| Unit-1 | discoverPackages returns dirs with tsconfig.json as package roots | §4.1 Unit |
| Unit-2 | discoverPackages falls back to package.json when no tsconfig.json | §4.1 Unit |
| Unit-3 | discoverPackages skips node_modules, dist, .cleargate | §4.1 Unit |
| Unit-4 | walkSources returns only .ts/.tsx, excludes .d.ts/.svelte/.js | §4.1 Unit |
| Unit-5 | walkSources honours tsconfig include/exclude globs | §4.1 Unit |
| Acc-1 | §2.1 Scenario 1 — discover packages by tsconfig roots, no hardcoded layout | §2.1 Scenario 1 |

### extract-skeleton.red.node.test.ts — 10 scenarios

| # | Scenario | Maps to |
|---|----------|---------|
| Unit-1 | Exported function signature present; body text absent | §4.1 Unit |
| Unit-2 | Exported class with public/private member visibility | §4.1 Unit |
| Unit-3 | Exported interface/type declarations listed | §4.1 Unit |
| Unit-4 | Import edges emitted (specifier + bound symbol names) | §4.1 Unit |
| Unit-5 | pgTable-defining module has schema_ddl: true | §4.1 Unit |
| Unit-6 | pool.query literal -> "sessions"; template literal -> "<dynamic>" | §4.1 Unit |
| Acc-2 | §2.1 Scenario 2 — signatures without bodies (fn + class + interface) | §2.1 Scenario 2 |
| Acc-3 | §2.1 Scenario 3 — drizzle db.insert(users) -> tables["users"]; schema_ddl: true | §2.1 Scenario 3 |
| Acc-4 | §2.1 Scenario 4 — raw-SQL literal "sessions" + "<dynamic>" sentinel | §2.1 Scenario 4 |
| Acc-5 | §2.1 Scenario 5 — syntax-error file skipped; stderr logs error; sibling skeletons intact; exit 0 | §2.1 Scenario 5 |

**Total: 16 scenarios across both files (6 unit + 5 acceptance overlap + 5 additional unit).**
Per §4.1: minimum 6 unit + 5 acceptance = 11 minimum; actual inventory = 16.

## Baseline Fail Confirmation

Both files were executed against the clean worktree baseline (no implementation — `src/wiki/code-map/` does not exist):

```
scan-source.red.node.test.ts:
  ✖ scan-source (RED — STORY-032-01) (0.374125ms)
  Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../src/wiki/code-map/scan-source.js'

extract-skeleton.red.node.test.ts:
  ✖ extract-skeleton (RED — STORY-032-01) (0.3595ms)
  Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../src/wiki/code-map/extract-skeleton.js'
```

Runner reports 1 failing suite per file (ERR_MODULE_NOT_FOUND collapses all it() blocks).
Per FLASHCARD `2026-05-18 · #qa-red #red-test`: count from test inventory, not runner output.

**BASELINE_FAIL: 16** (6 from scan-source + 10 from extract-skeleton)

## Wiring Soundness (TPV checklist — §C.3.5)

- [x] Imports resolve structurally: `type` imports only for absent modules; dynamic `await import(...)` inside `describe` so ERR_MODULE_NOT_FOUND is the failure, not a parse error
- [x] Constructor signatures match: `PackageRoot` used as opaque `{ dir: string }` shape via type-only import; no instantiation before impl lands
- [x] Mocked methods: N/A (no mocks — real `fs`/`os` tmpdir fixtures; stderr monkey-patch in Acc-5 is in-test)
- [x] After-hooks present: both files have `after(() => fs.rmSync(tmpDir, { recursive: true, force: true }))` to clean up temp fixtures
- [x] File naming: `*.red.node.test.ts` (immutable post-Red per rules)
- [x] No `ts-morph` import in either test file; no `deriveRepo` call; no RepoTag expectation from extractor
- [x] Tests placed at `cleargate-cli/test/wiki/code-map/` — correct glob path (not `src/`)

## Gherkin Coverage

| §2.1 Scenario | Covered in red test |
|---|---|
| Scenario 1: Discover packages by tsconfig roots | scan-source Acc-1 |
| Scenario 2: Extract exported signatures without bodies | extract-skeleton Acc-2 |
| Scenario 3: Detect drizzle writes against pgTable vocabulary | extract-skeleton Acc-3 |
| Scenario 4: Raw-SQL heuristic captures literal table name | extract-skeleton Acc-4 |
| Scenario 5: Syntax error file skipped, build does not fail | extract-skeleton Acc-5 |

All 5 Gherkin scenarios from §2.1 are covered. 5 of 5.

## Flashcards

```yaml
flashcards_flagged:
  - "2026-05-29 · #qa-red #type-import · Type-only imports for absent modules allow ERR_MODULE_NOT_FOUND rather than TS parse failure; use `import type` + dynamic `await import()` inside describe for RED tests."
```

---

## QA-VERIFY

```
role: qa
story: STORY-032-01
sprint: SPRINT-32
mode: VERIFY
commit: b7b7b547
verdict: QA: PASS
date: 2026-05-29
```

### 1. Commit Inspection

Commit b7b7b547 introduces exactly two files:
- `cleargate-cli/src/wiki/code-map/extract-skeleton.ts` (533 lines)
- `cleargate-cli/src/wiki/code-map/scan-source.ts` (178 lines)

No `package.json` changes. Zero existing files modified.

### 2. Scoped Test Run (16 scenarios)

Command (via run_script.sh wrapper):
```
tsx --test cleargate-cli/test/wiki/code-map/scan-source.red.node.test.ts \
            cleargate-cli/test/wiki/code-map/extract-skeleton.red.node.test.ts
```

Result:
```
ℹ tests 16
ℹ pass 16
ℹ fail 0
ℹ skipped 0
EXIT_CODE: 0
```

All 16 scenarios green. Dev claim verified.

### 3. Gherkin Acceptance Coverage

| §2.1 Scenario | Test | Result |
|---|---|---|
| Scenario 1: Discover packages by tsconfig roots | scan-source Acc-1 | PASS |
| Scenario 2: Extract exported signatures without bodies | extract-skeleton Acc-2 | PASS |
| Scenario 3: Detect drizzle writes against discovered pgTable vocabulary | extract-skeleton Acc-3 | PASS |
| Scenario 4: Raw-SQL heuristic captures literal table name + `<dynamic>` sentinel | extract-skeleton Acc-4 | PASS |
| Scenario 5: Syntax error file skipped, build does not fail | extract-skeleton Acc-5 | PASS |

5 of 5 Gherkin scenarios have passing tests.

### 4. DoD Verification

| DoD Criterion | Result |
|---|---|
| `node:test` only; `*.node.test.ts`; `tsx --test` | PASS — confirmed |
| All 5 Gherkin scenarios covered, including syntax-error edge case | PASS |
| No `ts-morph` import in either new file | PASS — only `import ts from 'typescript'` and `node:` built-ins |
| No hardcoded package list; no hardcoded schema-file path | PASS — no `cleargate-cli`/`mcp`/`admin` literals in logic; discovery-driven |
| `npm run typecheck` clean | PASS — exit 0 |
| No `deriveRepo()` call | PASS — comment-only reference; no call site |
| `<dynamic>` sentinel present for raw-SQL unresolvable table names | PASS — lines 332, 338, 390, 392 of extract-skeleton.ts |
| `schema_ddl: true` for pgTable-defining modules | PASS — visit() sets `schema_ddl = true` on pgTable call detection |
| Error isolation: `getSyntacticDiagnostics()` → stderr log, skip, exit 0 | PASS — Acc-5 passes; implementation at extract-skeleton.ts:118-131 |
| One `ts.createProgram` per package (not per file) | PASS — extractSkeleton() creates program once at lines 80-86 |

### 5. General-Purpose Correctness

- `discoverPackages()` uses recursive walk with SKIP_DIRS (`node_modules`, `dist`, `.cleargate`); no package names hardcoded in logic.
- `walkSources()` uses `ts.parseJsonConfigFileContent` to honour tsconfig `include`/`exclude`; falls back to direct `src/` walk when no tsconfig.
- `pgTable` vocabulary discovered live via two-pass program sweep; no hardcoded table list or schema-file path.
- `resolvePgTableArg()` uses `checker.getSymbolAtLocation()` + `checker.getAliasedSymbol()` for alias/re-export resolution; falls through to `<dynamic>` on failure.
- Raw-SQL heuristic covers string literals and template expressions (head text match); template with SQL keyword but dynamic table → `<dynamic>`.

### 6. Regression Analysis

Full `npm test` run in worktree: 2195 tests, 1998 passed, 141 failed, 56 cancelled.

Pre-existing baseline failures confirmed NOT caused by this story:
- `ingest.node.test.ts` — `require is not defined` at test:513 (zero diff on this file in b7b7b547).
- `lint-index-budget.node.test.ts` — assertion failure on stdout content (zero diff on this file in b7b7b547).
- `build.node.test.ts` — `wiki page has all 9 frontmatter fields` (zero diff on this file in b7b7b547).
- CLI exec failures (15+ scenarios) — pre-existing; require built dist or live process, unrelated to code-map.

No failure references `scan-source.ts` or `extract-skeleton.ts` in the error stack (only the expected Acc-5 stderr output from `extractSkeleton()` itself, which is intentional and the test passes).

The new code-map tests (16/16) add zero regressions.

### 7. Script Incidents

None. All `run_script.sh` invocations completed exit 0.
