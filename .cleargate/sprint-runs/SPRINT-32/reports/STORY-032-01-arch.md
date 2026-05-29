---
story: STORY-032-01
role: architect
sprint: SPRINT-32
tpv: APPROVED
postflight: PASS
---

# STORY-032-01 — Architect Post-Flight Review

role: architect

Reviewed Dev commit `b7b7b547` (2 new files, +711 LOC) against the STORY-032-01 §3.2 spec and the M1.md blueprint. This is an architectural-soundness pass, not a re-run of QA's 5/5 acceptance trace.

## Verdict: ARCH: PASS

## 1. Blueprint conformance — PASS

**`scan-source.ts`:**
- `discoverPackages(repoRoot): PackageRoot[]` and `walkSources(pkg): string[]` exported with the exact signatures from M1.md §schema-changes (`scan-source.ts:35`, `:121`).
- tsconfig-root discovery + package.json fallback implemented (`scan-source.ts:52-88`). The fallback branch (`hasPackageJson && !parentHasTsconfig`, `:80`) returns `tsconfigPath: null` and is correctly NOT folded under a tsconfig parent.
- Outermost-root / nested-fold rule per §1.4 default: a nested `tsconfig.json` WITHOUT its own `package.json` is folded into the parent (not added as a root) while still recursing; a nested dir WITH its own `package.json` is a distinct root (`scan-source.ts:61-79`). Matches the recommended answer verbatim.
- Exclusions `node_modules` / `dist` / `.cleargate` via `SKIP_DIRS` (`scan-source.ts:13`), applied on every recursion branch (`:69`, `:77`, `:86`, `:93`, `:109`, `:171`).
- `walkSources` honors tsconfig `include`/`exclude` via the pre-parsed `ts.parseJsonConfigFileContent` `fileNames` (`scan-source.ts:124`, parsed at `:143`), filters to `.ts`/`.tsx` dropping `.d.ts` (`isIncludedSource`, `:154-158`). Fallback FS walk for package.json-only roots (`:129-132`).

**`extract-skeleton.ts`:**
- Raw `ts.createProgram(files, opts)`, ONE program per package (`extract-skeleton.ts:81`), `program.getTypeChecker()` grabbed once (`:92`). No `ts-morph` import anywhere (grep clean — only comment mentions at `scan-source.ts:6`, `extract-skeleton.ts:5`, and the test file's CRITICAL note).
- Signatures with no body: `getFunctionSignature` rebuilds a body-less `FunctionDeclaration` via `ts.factory.createFunctionDeclaration(..., undefined /* no body */)` and prints it (`:493-520`). Bodies are structurally impossible to emit — this is the right approach (stronger than string-stripping).
- Class members + visibility (`extractClassDecl` + `getMemberVisibility`/`getMemberKind`, `:445-487`); interfaces/types/enums/variables/re-exports captured (`:208-243`); import edges with default + namespace + named bindings (`extractImportEdge`, `:417-443`).
- `db_writes`: two-pass design — Pass 1 builds `pgTableSymbols: Map<ts.Symbol, string>` by scanning all files for `const X = pgTable('name', ...)` (`collectPgTableDeclarations`, `:153-180`); Pass 2 resolves `.insert/.update/.delete/.onConflictDoUpdate` receivers via `checker.getSymbolAtLocation` + `getAliasedSymbol` against that set (`resolvePgTableArg`, `:371-394`). This is the type-checker symbol resolution the story §1.5 mitigation mandated, NOT identifier-text matching. Unresolvable → `"<dynamic>"` sentinel (`:390`). The raw-SQL heuristic matches `INSERT INTO|UPDATE|DELETE FROM <name>` literals and records `"<dynamic>"` for template-literal table names (`:312-344`). `schema_ddl` true on `pgTable` definition OR migrations/drizzle/`.migration.ts` path (`:282-293`, `isSchemaOrMigrationPath` `:526-533`).
- Error isolation: per-file try/catch (`:110-139`), syntax-diagnostic gate that logs `new Error(...)` to stderr naming the file and `continue`s (`:118-132`), per-statement/per-member/per-node inner catches (`:209`, `:244`, `:345`, `:463`), program-creation guarded (`:87-90`). No `process.exit` with nonzero anywhere. Returns partial result. Exit-0-always contract honored.

## 2. General-purpose design — PASS (no hardcoded paths)

Grepped the two source files for any `cli`/`mcp`/`admin` literal layout, fixed schema-file path, or hardcoded table list: none found. Package identity comes only from on-disk `tsconfig.json`/`package.json` discovery (`scan-source.ts:52-53`); the drizzle table vocabulary is discovered LIVE from `pgTable(...)` declarations (`:96-105`), never a hardcoded list. `schema_ddl` path detection is pattern-based (`/migrations/`, `/drizzle/`, `*.migration.ts`), not a fixed schema path. This satisfies EPIC-032 §6 Q1/Q9 and memory `project_codemap_general_purpose` — the extractor ships to any consuming repo.

## 3. Forward-compatibility with STORY-032-02 (M2) — PASS

The emitted `ModuleSkeleton` (`:49-55`) carries `modulePath`, `exports`, `classes?`, `imports`, `db_writes` — sufficient for 032-02's page schema + git-SHA drift:
- **Pure data, no repo tag.** Confirmed no `deriveRepo`/`RepoTag`/`source_shas`/`getGitSha` reference in either file (grep clean). 032-01 does NOT pre-constrain 032-02 — correct, because `deriveRepo()` (`derive-repo.ts:11`) THROWS on any path not under cli/mcp/.cleargate/cleargate-planning, and `RepoTag` (`page-schema.ts:8`) has no `'admin'` member. By emitting no tag, 032-01 leaves the admin-rendering decision (extend `RepoTag` with `'admin'` or use a code-map-specific derivation) entirely to 032-02 — exactly the M1.md Cross-story-risk #2 boundary.
- **SHA-stamping input.** `modulePath` is the file path 032-02 will pass to `getGitSha` (`git-sha.ts:10`) for per-file drift. NOTE for 032-02 (not an M1 defect): `modulePath` is the ABSOLUTE path (`sf.fileName`), while both `getGitSha` and `deriveRepo` expect a repo-RELATIVE path. 032-02 must `path.relative(repoRoot, modulePath)` before stamping/tagging. Absolute is the correct neutral choice for a pure-data layer; the conversion belongs in the rendering layer.
- **db_writes contract stable.** `{ tables: string[]; schema_ddl: boolean }` with the `"<dynamic>"` sentinel matches EPIC-032 §6 Q9 verbatim — consumed by both 032-02 (rendering) and EPIC-033's coarse DB axis (via 033-03). Field name and sentinel value unchanged from spec.

## 4. ADR / boundary compliance — PASS

- No new dependency: `import ts from 'typescript'` only; `typescript ^5.8.0` already a devDep. `ts-morph` rejected and absent (DoD §4.2 satisfied).
- EPIC-027 boundary: no PM-tool SDK import (both files import only `node:fs`, `node:path`, `typescript`, and the sibling `scan-source.js`).
- node:test only: tests at `test/wiki/code-map/{scan-source,extract-skeleton}.red.node.test.ts` (correct location per the M1.md hard correction — the story §3.1 `src/`-colocation error did NOT ship). `*.red.node.test.ts` naming honors CR-043 immutability.
- `npm run typecheck` clean in the worktree (`tsc --noEmit`, exit 0).

## Minor observations (non-blocking, no rework required)

1. **Template-literal `<dynamic>` branch is convoluted** (`extract-skeleton.ts:325-340`): the `else` reconstruction at `:336` (`'${...}' + s.literal.text` join) is harder to read than necessary, but it functionally records `"<dynamic>"` for SQL-like template heads. QA verified Scenario 4. Acceptable.
2. **`modulePath` absolute-vs-relative** — flagged above for 032-02's plan. Logged here so M2's Architect dispatch accounts for the `path.relative` step; not an M1 change.

No flashcard recorded — the two governing gotchas (`#test-glob` test location, `RepoTag` no-admin landmine) are already in FLASHCARD.md (lines 10, 19) and M1.md Cross-story risks. No new surprise surfaced.

## Script Incidents

None — no `.cleargate/scripts/` invocations this dispatch.
