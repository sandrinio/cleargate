---
story_id: STORY-032-01
parent_epic_ref: EPIC-032
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-32
carry_over: false
status: Draft
approved: true
ambiguity: 🟡 Medium
context_source: |
  EPIC-032 decomposition at SPRINT-32 kickoff 2026-05-29. EPIC-032 §6 answers
  (all 9 questions resolved 2026-05-29 — raw Compiler API per Q4, .ts/.tsx-only
  per Q2, discovered package + schema vocabulary per Q1/Q9) and the STORY-033-01
  workflow-capability spike (fail-safe-serialize-on-unknown for db_writes) are the
  governing inputs for this net-new core extractor.
actor: cleargate wiki build
complexity_label: L3
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
area: wiki
created_at: 2026-05-29T00:00:00Z
updated_at: 2026-05-29T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-29T08:04:27Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-032-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-29T08:04:43Z
  sessions: []
---

# STORY-032-01: TypeScript Skeleton Extractor + db_writes

**Complexity:** L3 — net-new core: a source-tree scanner plus a raw TypeScript Compiler API skeleton extractor that also emits a per-module DB write-set. Cross-cutting (feeds both the EPIC-032 code-map page and the EPIC-033 wave planner), no existing surface emits AST-derived structure.

## 1. The Spec (The Contract)

> Prior work: [[EPIC-032]] + [[STORY-033-01]] (spike) — decomposition pre-authorized at epic level.

### 1.1 User Story
As a `cleargate wiki build` invocation, I want to discover each TypeScript package in the repo and extract a token-cheap structural skeleton (exports, signatures, class members, type/interface declarations, import edges) plus a per-module DB write-set without reading function bodies, so that downstream code-map page rendering (STORY-032-02) and the EPIC-033 wave planner have a deterministic, dependency-free structural index of the source tree.

### 1.2 Detailed Requirements
- **Package discovery (`scan-source.ts`):** Walk the repo for `tsconfig.json` roots; for any directory with a `tsconfig.json`, treat it as a package root. Fallback: if a candidate directory has a `package.json` but no `tsconfig.json`, treat the `package.json` directory as a package root. NEVER hardcode the `cleargate-cli` / `mcp` / `admin` layout — discovery is the only source of package identity (EPIC-032 §6 Q1).
- **Source-file walk:** For each discovered package, enumerate `src/**/*.{ts,tsx}` honoring the package's `tsconfig.json` `include` / `exclude` globs. Skip `.svelte`, `.vue`, `.js`, `.d.ts`, and any path matched by `exclude` (EPIC-032 §6 Q2 — `.ts`/`.tsx` only for v1).
- **Skeleton extraction (`extract-skeleton.ts`):** Use the raw TypeScript Compiler API (`ts.createProgram`) — `ts-morph` is REJECTED (EPIC-032 §6 Q4). Per module, extract: (a) top-level `export` names, (b) exported function signatures (name + params + return type, no body), (c) exported class declarations with member names + visibility (`public`/`protected`/`private`), (d) exported `type` / `interface` declarations, (e) top-level `import` edges (the imported module specifier + bound symbol names). Function and method **bodies are never emitted**.
- **Per-module `db_writes` extraction:** For each module emit `db_writes: { tables: string[]; schema_ddl: boolean }`.
  - **Drizzle path (exact):** Discover the DB-schema vocabulary LIVE by scanning all modules for ones that define `pgTable(...)`; record each `pgTable` symbol name → table. Then detect `.insert(...)` / `.update(...)` / `.delete(...)` / `.onConflictDoUpdate(...)` calls whose receiver resolves to an imported `pgTable` symbol, and add that table to `tables`. NEVER hardcode a table list or a schema-file path (EPIC-032 §6 Q1/Q9).
  - **Raw-SQL path (heuristic):** Scan string-literal arguments to `pg.Pool` / `pool.query(...)` calls for `INSERT INTO <t>` / `UPDATE <t>` / `DELETE FROM <t>` and add the matched table name. This is heuristic and accepted with the EPIC-033 fail-safe-serialize-on-unknown contract (a module whose writes can't be resolved is serialized, never parallelized) per STORY-033-01 decision (EPIC-032 §6 Q9).
  - **`schema_ddl`:** `true` when the module is itself a schema module (defines `pgTable(...)`) or a migration file (path under a `migrations/` / `drizzle/` directory or matching `*.migration.ts`); `false` otherwise.
- **Error isolation:** A source file that fails to parse (syntax error, unresolved Compiler-API node) MUST log an `Error` to stderr, skip the offending symbol/file, and continue. The extractor returns a partial result; the overall process exits `0`. The build NEVER fails on un-parseable source (EPIC-032 §3 Reliability constraint).
- **Pure data output:** Both modules return plain serializable data structures (no markdown rendering, no file writes). Page rendering and frontmatter are STORY-032-02's responsibility.
- **Tests:** `node:test` only — `*.node.test.ts` run via `tsx --test`. Vitest is forbidden (repo CLAUDE.md).

### 1.3 Out of Scope
- Markdown page rendering, token-budget truncation, `source_shas` frontmatter, and `.cleargate/wiki/code/<package>.md` emission (STORY-032-02 / compile-page.ts + page-schema.ts).
- Registering the pass in `cleargate wiki build` and the `--code-map` flag (STORY-032-02 / wiki-build.ts).
- Synthesis-index linking and the Architect agent description edit (later EPIC-032 stories).
- Non-TypeScript languages, `.svelte` `<script>` blocks, runtime call graphs, semantic/embedding search.
- The per-STORY `db_write_set` frontmatter field and the Architect SDR DB axis — owned by EPIC-033.

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** When package discovery finds nested `tsconfig.json` roots (e.g. a `tsconfig.json` inside a subfolder that is itself under a parent package's `tsconfig.json`), is the nested config its own package or part of the parent?
- **Recommended:** Treat the outermost `tsconfig.json` in a directory chain as the package root; nested `tsconfig.json` files that only narrow build options (no distinct `package.json`) are folded into the parent. A nested directory with its own `package.json` is a distinct package.
- **Human decision:** _(populated during Brief review)_

- **Question:** For the raw-SQL heuristic, should a dynamically-built table name (template literal / variable interpolation) record nothing, or record a sentinel like `"<dynamic>"` so STORY-033 can detect the unresolved case?
- **Recommended:** Record the sentinel `"<dynamic>"` in `tables` so the EPIC-033 wave planner can apply fail-safe-serialize-on-unknown deterministically rather than mistaking "no writes detected" for "safe to parallelize."
- **Human decision:** _(populated during Brief review)_

### 1.5 Risks

> Risks specific to this Story (cross-story risks belong in the milestone plan).

- **Risk:** `ts.createProgram` over a large package is slow and could blow the EPIC-032 ≤500ms incremental / ≤10s full-rebuild budget.
- **Mitigation:** Create one `Program` per package (not per file), reuse the parsed `tsconfig` via `ts.parseJsonConfigFileContent`, and benchmark on `cleargate-cli/` in a test; surface a timing warning rather than failing if a package exceeds budget (budget enforcement is STORY-032-02).

- **Risk:** The drizzle import-symbol resolution misattributes a `.insert(...)` to the wrong table when a module re-exports or aliases `pgTable` symbols.
- **Mitigation:** Resolve via the Compiler API symbol/type checker (`program.getTypeChecker()`), following the import binding to its declaration, rather than matching identifier text. Unresolvable cases fall through to the `"<dynamic>"` sentinel (fail-safe).

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: TypeScript Skeleton Extractor + db_writes

  Scenario: Discover packages by tsconfig roots
    Given a repo fixture with two directories each containing a tsconfig.json
    When scan-source discovers packages
    Then both directories are returned as package roots
    And no package layout is hardcoded in the result

  Scenario: Extract exported signatures without bodies
    Given a module exporting a function, a class with public and private members, and an interface
    When extract-skeleton runs over the module
    Then the result lists the function signature, the class with member visibility, and the interface
    And no function or method body text appears anywhere in the result

  Scenario: Detect drizzle writes against discovered pgTable vocabulary
    Given a schema module that defines users via pgTable and a writer module that calls db.insert(users)
    When extract-skeleton computes db_writes for the writer module
    Then db_writes.tables for the writer module contains "users"
    And the schema module has schema_ddl true

  Scenario: Raw-SQL heuristic captures a literal table name
    Given a module that calls pool.query("INSERT INTO sessions (id) VALUES ($1)")
    When extract-skeleton computes db_writes
    Then db_writes.tables contains "sessions"
    And a dynamically-built table name records the sentinel "<dynamic>"

  Scenario: A file with a syntax error is skipped and the build does not fail
    Given a package whose src contains one file with a TypeScript syntax error
    When extract-skeleton runs over the package
    Then an Error is logged to stderr naming the offending file
    And the offending symbol is skipped while other modules still produce skeletons
    And the process exit code is 0
```

### 2.2 Verification Steps (Manual)
- [ ] Run `tsx --test cleargate-cli/src/wiki/code-map/*.node.test.ts` and confirm all skeleton + db_writes tests pass.
- [ ] Point `scan-source.ts` at this meta-repo and confirm it discovers `cleargate-cli`, `mcp`, and `admin` (whatever discovery finds) with no hardcoded names.
- [ ] Run `extract-skeleton.ts` over `cleargate-cli/` and grep the JSON result for any function-body text — confirm none present.
- [ ] Confirm a deliberately broken fixture file logs an Error to stderr and the call still returns a partial result with exit 0.
- [ ] Run `npm run typecheck` in `cleargate-cli/` clean (no `ts-morph` import anywhere in the new files).

## 3. The Implementation Guide

### 3.1 Context & Files

> **v2 gate input:** under v2 execution mode, this table is a pre-commit gate input (cleargate-enforcement.md §6). Every file staged in this story's commit must appear in the Value column.

| Item | Value |
|---|---|
| Primary File (new) | `cleargate-cli/src/wiki/code-map/extract-skeleton.ts` — raw `ts.createProgram` skeleton + `db_writes` extractor |
| Primary File (new) | `cleargate-cli/src/wiki/code-map/scan-source.ts` — package + source-file discovery walker |
| Related File (reuse) | `cleargate-cli/src/wiki/scan.ts` — wiki scanner + git-SHA drift mechanic pattern to mirror |
| Related File (reuse) | `cleargate-cli/src/wiki/git-sha.ts` — `getGitSha()` helper for per-file SHA capture (used by 032-02) |
| Related File (reuse) | `cleargate-cli/src/wiki/derive-repo.ts` — `deriveRepo()` `repo:` tag derivation |
| New Test Files | Yes — `cleargate-cli/src/wiki/code-map/scan-source.node.test.ts`, `cleargate-cli/src/wiki/code-map/extract-skeleton.node.test.ts` |

### 3.2 Technical Logic
1. **`scan-source.ts`** exports `discoverPackages(repoRoot): PackageRoot[]` and `walkSources(pkg): string[]`. `discoverPackages` walks the tree (skipping `node_modules`, `dist`, `.cleargate`) collecting directories with a `tsconfig.json` (fallback `package.json`). For each, `walkSources` parses the tsconfig via `ts.parseJsonConfigFileContent` to honor `include`/`exclude`, then returns absolute `.ts`/`.tsx` paths only (drop `.d.ts`, `.svelte`).
2. **`extract-skeleton.ts`** exports `extractSkeleton(pkg): ModuleSkeleton[]`. It builds one `ts.createProgram(files, compilerOptions)` per package, grabs `program.getTypeChecker()`, and visits each `SourceFile`'s top-level statements. For each exported declaration it records the signature (via `checker.typeToString` / printer with bodies stripped) — never the body. Import edges come from `ImportDeclaration` nodes.
3. **db_writes pass (same program):** First sweep all modules to build `pgTableSymbols: Set<Symbol>` (any `CallExpression` to `pgTable`). Then per module, walk `CallExpression` nodes: if the method name is `insert/update/delete/onConflictDoUpdate` and the first argument's symbol (resolved by the checker) is in `pgTableSymbols`, push the table; for `pool.query`/`pg.Pool` string-literal args, regex-match `INSERT INTO|UPDATE|DELETE FROM <name>`, pushing `"<dynamic>"` when the table token is not a literal. Set `schema_ddl` when the module defines `pgTable` or sits under a migrations directory.
4. **Error isolation:** wrap each per-file visit in try/catch; on throw, `console.error(new Error(...))` with the file path and continue. Return whatever was collected; the caller (032-02) decides rendering. The functions never call `process.exit` with a nonzero code.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 6 | `discoverPackages` (tsconfig + package.json fallback), `walkSources` include/exclude, signature-without-body, class member visibility, drizzle db_writes, raw-SQL + `<dynamic>` heuristic |
| Acceptance tests | 5 | 1 per Gherkin scenario in §2.1, including the syntax-error edge scenario |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met via `node:test` (`*.node.test.ts`, run with `tsx --test`); no vitest.
- [ ] All Gherkin scenarios from §2.1 covered, including the syntax-error / exit-0 edge case.
- [ ] No `ts-morph` import in either new file; only the raw `typescript` Compiler API is used.
- [ ] No hardcoded package list and no hardcoded schema-file path — discovery drives both package and `pgTable` vocabulary.
- [ ] `npm run typecheck` clean in `cleargate-cli/`.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

> L1 reuse audit. Wiki pipeline surfaces are reused; the source-extraction layer is net-new.

- **Surface:** `cleargate-cli/src/wiki/scan.ts:1` — wiki page scanner with git-SHA drift detection; the canonical drift-detection mechanic (ADR 2026-04-19) this extractor's caller mirrors for per-source-file SHAs.
- **Surface:** `cleargate-cli/src/wiki/git-sha.ts:10` — `getGitSha(rawPath, runner?)` helper, reused by STORY-032-02 to stamp `source_shas` per file; the same git-SHA-not-content-hash contract applies to code-map drift.
- **Surface:** `cleargate-cli/src/wiki/derive-repo.ts:7` — `deriveRepo(rawPath)` `repo:` tag derivation; code-map pages get the same `repo:` tag in the rendering story.
- **Coverage of this requirement:** partial — ~80% of the EPIC-032 pipeline (drift detection, repo tagging, page emission, index linking) is reused from these wiki surfaces; the genuinely net-new ≈20% is precisely this story's TypeScript source scanner + AST skeleton/db_writes extractor, which has no existing surface.

## Why not simpler?

- **Smallest existing surface that could carry this:** `cleargate-cli/src/wiki/scan.ts` — the wiki scanner that already walks files and computes git-SHA drift. It is the nearest analogue but it consumes already-ingested markdown frontmatter, not source ASTs.
- **Why isn't extension / parameterization / config sufficient?** `scan.ts` reads markdown pages and aggregates frontmatter; its input shape is `(path, frontmatter)`. This story's input shape is the TypeScript AST produced by `ts.createProgram`, and its output is structural symbols + a resolver-derived `db_writes` set. There is no parameter on the markdown scanner that turns it into a TS Compiler-API program builder — the parse, the type-checker symbol resolution for drizzle `pgTable` attribution, and the body-stripping signature extraction are all logic that does not exist anywhere in the codebase. A config flag cannot synthesize an AST visitor; the extractor must be net-new code. Everything downstream (SHA stamping, repo tagging, page rendering, index linking) genuinely is extension/config on the existing wiki surfaces and is therefore left to STORY-032-02 rather than rebuilt here.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity** (EPIC-032 §6 resolved 2026-05-29; remaining open items are the two §1.4 decomposition-edge questions, kickoff-resolvable)

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved epic (§3.1; new files declared, reuse files verified on disk).
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one verified source-tree path (scan.ts, git-sha.ts, derive-repo.ts — all confirmed on disk).
- [x] Why not simpler? has both sub-bullets answered.
