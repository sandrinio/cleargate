# STORY-028-08 Dev Report

STORY: STORY-028-08
STATUS: done
COMMIT: (post-commit)
TYPECHECK: pass
TESTS: pass (check:no-vitest exits 0 for all 3 packages; fixture-glob exclusion verified)
FILES_CHANGED:
  - CLAUDE.md
  - cleargate-planning/CLAUDE.md
  - cleargate-planning/.claude/agents/developer.md
  - .cleargate/FLASHCARD.md
  - cleargate-cli/package.json
  - admin/package.json
  - mcp/package.json (inner repo — staged and committed inside mcp/ git)
  - cleargate-planning/.claude/hooks/pre-commit-surface-gate.sh
  - admin/TESTING.md (new)
  - admin/tests/setup-node-test-hooks.mjs
  - cleargate-planning/MANIFEST.json (prebuild-regenerated)

## Summary

All 4 Architect directives addressed:

1. **__overrides__ pattern documented** — in `admin/TESTING.md` (new file) with full pattern description, why it exists, and table of affected modules. Also mentioned in `cleargate-planning/.claude/agents/developer.md`.
2. **--conditions browser flag documented** — in `CLAUDE.md`, `cleargate-planning/CLAUDE.md`, and `admin/TESTING.md`.
3. **check:no-vitest guard uses explicit token allowlist** — regex matches `\b(vitest|vi\.fn|vi\.mock|vi\.spyOn|vi\.stubGlobal|vi\.useFakeTimers|vi\.useRealTimers|vi\.advanceTimersByTime|vi\.hoisted)\b`. No `__\w+__` wildcard. cleargate-cli variant adds `--exclude-dir=test/fixtures` to skip codemod fixture pairs.
4. **setup-node-test-hooks.mjs auto-create documented** — added comment block at the auto-create guard explaining behavior and noting that `app-environment.ts` is committed to the repo (the guard is a safety net for fresh checkouts).

## Deviations from dispatch

- `mcp/package.json` edited directly in the main repo (not worktree path) because `mcp/` is a nested gitignored repo that doesn't appear in the worktree. The inner commit must be made from the main repo's `mcp/` directory.
- The live `.claude/hooks/pre-commit-surface-gate.sh` (gitignored) was NOT updated — only the canonical was updated. Human must run `cleargate init` post-merge to propagate to live. This matches the dogfood-split contract.

## Fixture-glob fix

`cleargate-cli/package.json` test script changed from:
  `'test/**/*.node.test.ts'`
to:
  `'test/**/*.node.test.ts' '!test/fixtures/**'`

Verified: before fix, `test/fixtures/codemod-vitest/**/*.node.test.ts` files cause "Vitest failed to access its internal state" failures. After fix, fixture files are excluded and those errors are gone.

## check:no-vitest verification

All three packages exit 0:
- `cleargate-cli/`: no vitest residue (fixtures excluded via --exclude-dir=test/fixtures)
- `admin/`: no vitest residue
- `mcp/`: no vitest residue
