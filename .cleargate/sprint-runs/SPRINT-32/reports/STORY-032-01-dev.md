---
story: STORY-032-01
role: developer
sprint: SPRINT-32
status: done
commit: b7b7b547
qa_bounces: 0
arch_bounces: 0
---

# STORY-032-01 Dev Report

## What Built

Two net-new TypeScript modules under `cleargate-cli/src/wiki/code-map/`:

**`scan-source.ts`** — Package and source-file discovery:
- `discoverPackages(repoRoot)`: recursive walk skipping `node_modules`, `dist`, `.cleargate`; discovers tsconfig.json roots; handles nested-tsconfig folding (nested without own package.json folds into parent per M1.md §1.4); package.json fallback for dirs without tsconfig.
- `walkSources(pkg)`: returns `.ts`/`.tsx` files honoring tsconfig `include`/`exclude` via `ts.parseJsonConfigFileContent`; drops `.d.ts`, `.svelte`, `.js`.

**`extract-skeleton.ts`** — Raw TypeScript Compiler API skeleton extractor:
- `extractSkeleton(pkg)`: builds one `ts.Program` per package (performance budget), then two passes: (1) discover pgTable symbols across all files; (2) per-file extract exports (functions with body-stripped signatures, class declarations with member visibility, interfaces, type aliases, enums, named re-exports), import edges, and db_writes.
- `db_writes`: drizzle path (pgTable symbol discovery via type checker, `.insert/.update/.delete/.onConflictDoUpdate` resolution with `<dynamic>` fallback for unresolvable aliases), raw-SQL path (`pool.query(...)` string-literal regex for `INSERT INTO/UPDATE/DELETE FROM`, template literals → `<dynamic>` sentinel), `schema_ddl: true` for pgTable-defining modules and migration-path files.
- Error isolation: `getSyntacticDiagnostics()` detects broken files; logs to stderr and skips; returns partial result; never calls `process.exit`.

## FILES_CHANGED

- `cleargate-cli/src/wiki/code-map/scan-source.ts` (new, 167 lines)
- `cleargate-cli/src/wiki/code-map/extract-skeleton.ts` (new, 344 lines)

## Plan Deviations

None. Blueprint followed exactly. Test files placed at `cleargate-cli/test/wiki/code-map/` per M1.md correction (not src/). No ts-morph, no deriveRepo(), no hardcoded package names, no new dependency.

## Script Incidents

None. Scripts invoked directly via `tsx --test`; no `run_script.sh` invocations failed.

## Flashcards

- `2026-05-29 · #typescript-compiler-api #error-isolation · ts.getSyntacticDiagnostics(sf) is the correct way to detect broken files; Program.getSourceFile() returns a file even with syntax errors (diagnostics only, no throw).`
