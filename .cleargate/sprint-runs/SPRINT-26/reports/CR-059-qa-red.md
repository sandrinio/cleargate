# CR-059 QA-RED Report

**Story:** CR-059 — Smarter session-load restart warning  
**Mode:** RED  
**Date:** 2026-05-05  
**QA Agent:** claude-sonnet-4-6

## Output

```
QA-RED: WRITTEN
RED_TESTS: cleargate-cli/test/commands/upgrade-restart-warning.red.node.test.ts
BASELINE_FAIL: 2 of 4 scenarios failing
flashcards_flagged: []
```

## Baseline Run

```
tests 4
pass 2
fail 2
```

**Failing (RED — pre-fix):**
- Test 1: cosmetic settings.json key-order rewrite suppressed (FAILS — false positive warning fires)
- Test 3a: cosmetic .mcp.json server-key reorder suppressed (FAILS — false positive warning fires)

**Passing (GREEN baseline — regression-preservation):**
- Test 2: real hook command change triggers warning (correct — passes pre-fix too)
- Test 3b: real mcpServers.cleargate.args change triggers warning (correct — passes pre-fix too)

## Wiring Soundness

- Imports: `upgradeHandler`, `UpgradeCliOptions` from `../../src/commands/upgrade.js` — verified exported
- `hashNormalized` from `../../src/lib/sha256.js` — verified exported
- `ManifestFile`, `ManifestEntry` from `../../src/lib/manifest.js` — verified types exported
- Constructor signatures: `makeCliOpts` matches `UpgradeCliOptions` interface shape (cwd, stdout, stderr, now, packageRoot, promptMergeChoice)
- After-hook present: `after(async () => { ... })` cleans up `tmpDirs`
- File naming: `*.red.node.test.ts` (red before node infix, per flashcard 2026-05-04 #naming #red-green)
- Runner: `tsx --test` via worktree root `node_modules/.bin/tsx`

## Fixture Design Notes

Tests 1 and 2 use `overwrite_policy: 'always'` for `.claude/settings.json` to force `applyAlwaysOverwrite` (raw overwrite path). The `merge-3way` surgery path normalizes JSON as a side effect, which would mask the CR-059 bug for settings.json. The `always` path correctly exposes `postSha !== currentSha` on cosmetic key-order changes.

Tests 3a and 3b use `overwrite_policy: 'always'` for `.mcp.json` — consistent with the real bug surface (no surgery path exists for .mcp.json).

## Commit

Branch: `story/CR-059`  
SHA: `799724d`  
Message: `qa-red(CR-059): write failing tests`

## File Path

`/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/CR-059/cleargate-cli/test/commands/upgrade-restart-warning.red.node.test.ts`
