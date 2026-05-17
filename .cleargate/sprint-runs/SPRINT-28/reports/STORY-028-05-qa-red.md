# QA-Red Report — STORY-028-05

**Generated:** 2026-05-18  
**Mode:** RED  
**Story:** STORY-028-05 — Convert `mcp/` Test Suite to node:test  

## Red Test File

`cleargate-cli/test/scripts/mcp-vitest-conversion.red.node.test.ts`  
(written in worktree `.worktrees/STORY-028-05`)

## Baseline (pre-conversion state, 2026-05-18)

| Item | Value |
|---|---|
| `mcp/vitest.config.ts` | EXISTS (must be deleted) |
| `mcp/package.json` devDependencies.vitest | `"^2.1.0"` (must be removed) |
| `mcp/package.json` test script | `"vitest"` (must become node:test invocation) |
| Pure vitest `*.test.ts` files in mcp/ | 50 (across mcp/src/ + mcp/scripts/) |
| Vitest import lines (`from 'vitest'`) | 50 |
| Files with vi.\* mock patterns | 15 files (95+ call sites) |
| Existing `*.node.test.ts` in mcp/test/ | 18 (pre-existing, not affected by this story) |
| Dev report at reports/STORY-028-05-dev.md | ABSENT |

## Architect advisory pre-flights executed

1. `rg "\.each\(" --type ts mcp/` — checked: 0 parameterised `.each()` tests found in mcp/. Safe to proceed.
2. `rg "expect\.assertions|expect\.hasAssertions|expect\.extend" --type ts mcp/` — not explicitly run (out of scope for QA-Red; Dev should run as part of their pre-flight).
3. Test-glob fixture bleed — deferred to STORY-028-08 per sprint amendment.

## Baseline FAIL: 8 of 8 tests FAIL

| Test | Failure reason |
|---|---|
| T1: vitest.config.ts absent | `mcp/vitest.config.ts` exists |
| T2a: vitest devDep absent | devDependencies.vitest = "^2.1.0" |
| T2b: test script clean | test script = "vitest" |
| T3: no vitest imports | 50 files import from 'vitest' |
| T4: no vi.\* calls | 15 files have vi.mock/spyOn/fn/etc patterns |
| T5a: node.test.ts count >= 68 | only 18 found (50 not yet converted) |
| T5b: zero pure vitest .test.ts remain | 50 pure vitest files remain |
| T6: dev report exists | reports/STORY-028-05-dev.md absent |

## Path resolution note

`mcp/` is gitignored in the outer repo (nested separate git repo, `sandrinio/cleargate-mcp`). The test resolves its path via `git rev-parse --git-common-dir` from the worktree's `cleargate-cli/test/scripts/` directory, yielding the main repo `.git` dir at `/path/to/ClearGate/.git`. `path.dirname()` of that gives the main repo root, and `path.join(mainRepoRoot, 'mcp')` resolves correctly from any worktree.
