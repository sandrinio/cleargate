role: architect

# CR-059 Architect Post-Flight Review

**Story:** CR-059 — Smarter session-load restart warning  
**Mode:** POST-FLIGHT REVIEW  
**Date:** 2026-05-05  
**Reviewer:** architect (claude-opus-4-7)

## Inputs Audited

- Worktree: `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/CR-059/`
- Branch: `story/CR-059`
- Commits: `799724d` (Red) → `7896ad6` (Impl) → `c84cd66` (Round-2 test additions)
- M1 plan: `/Users/ssuladze/Documents/Dev/ClearGate/.cleargate/sprint-runs/SPRINT-26/plans/M1.md`
- Story: `/Users/ssuladze/Documents/Dev/ClearGate/.cleargate/delivery/pending-sync/CR-059_Smarter_Session_Load_Restart_Warning.md`
- Dev report: `/Users/ssuladze/Documents/Dev/ClearGate/.cleargate/sprint-runs/SPRINT-26/reports/CR-059-dev.md`
- QA report: `/Users/ssuladze/Documents/Dev/ClearGate/.cleargate/sprint-runs/SPRINT-26/reports/CR-059-qa.md`
- Pre-gate scan: `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/CR-059/.cleargate/reports/pre-arch-scan.txt`

## Verification Results

### 1. M1 blueprint + SDR-locked scope alignment

PASS. `extractSessionLoadDelta` in `cleargate-cli/src/lib/session-load-delta.ts` enforces the SDR-locked scope verbatim:

- `.claude/settings.json` → only `hooks.{PreToolUse,PostToolUse,SessionStart,SubagentStop}` arrays compared (line 39 `HOOK_EVENTS` const + line 49 loop in `extractSettingsHooksBlock`).
- `.mcp.json` → only `mcpServers.cleargate` entry compared (line 61 `extractMcpCleargateEntry`).
- All other paths → `return true` (line 112).

### 2. New helper typing + conservative-on-parse-failure

PASS. `session-load-delta.ts:77-113`:
- Public signature `extractSessionLoadDelta(filePath: string, oldContent: string, newContent: string): boolean` matches M1 spec exactly.
- Both extraction blocks wrap `JSON.parse` in `try/catch` and `return true` on failure (lines 92-95, 105-108). Comment explicitly says "Conservative: warn".
- TypeScript compiles clean (`npx tsc --noEmit` exits 0). Types: `SettingsJson`/`McpJson` aliased to `Record<string, unknown>`; no `any`.
- `canonicalize` recursive function preserves array order (line 26-28) — correct: hook execution order IS schema-meaningful.

### 3. `upgrade.ts` symbol-reference adherence (M1 mandate)

PASS. Located the modification by symbol `SESSION_LOAD_PATHS.has(entry.path)` — present at line 501 (pre-mutation capture) and line 555 (post-mutation check). No line-number citations leaked into code comments. The replaced byte-check (`postSha !== currentSha`) was symbol-located, not line-located, in the dispatch.

BUG-028 territory preserved: `computeCurrentSha`/`postSha` recompute at line 541 untouched; `classify` call at 543 untouched; drift map population 542-548 untouched. CR-059 only added the pre-mutation read (498-509) and replaced the conditional guard at 555-567. Surgical diff, no cross-contamination.

### 4. `init.ts` line-329-equivalent suppression

PASS. `init.ts:325-340`:
- `mergedSettings` computed (line 326) — unchanged behavior.
- `existingSettingsContent` derived from `existingSettings ?? null → '{}'` fallback (line 329-331) — correct: when `existingSettings` is null (parse failure or absent file), comparison against `'{}'` will detect any new hooks block and fire warning (conservative).
- `writeAtomic` call preserved (line 332) — unchanged.
- Restart message wrapped in `extractSessionLoadDelta(...)` conditional (line 335) — when true, original message; when false, quieter `unchanged (hooks block already current)` line. Both messages preserve the `[cleargate init]` prefix and `settings.json` substring (Scenario 5 test depends on this).

### 5. No off-surface edits

PASS. `git diff 218439a..HEAD --name-only` (CR-059's three commits) shows exactly five files:

```
cleargate-cli/src/commands/init.ts
cleargate-cli/src/commands/upgrade.ts
cleargate-cli/src/lib/session-load-delta.ts
cleargate-cli/test/commands/init.test.ts
cleargate-cli/test/commands/upgrade-restart-warning.red.node.test.ts
```

All within the M1 blueprint's declared surfaces. No mirror-chain touches (no edits to `cleargate-planning/`, `cleargate-cli/templates/`, no settings.json, no hook scripts).

### 6. BUG-028 territory `SESSION_LOAD_PATHS`/`sessionRestartFiles` refinement vs rewrite

PASS. The `SESSION_LOAD_PATHS` set declaration (line 492) and `sessionRestartFiles` array (line 493) are exactly the BUG-028-preserved declarations. CR-059 did not touch them. Only the conditional guard on line 555 was replaced; the warning emission tail (around line 580+) is untouched.

### 7. Seven scenarios coverage

PASS — 7 of 7.

| # | Scenario | Test File | Test Name | Status |
|---|----------|-----------|-----------|--------|
| 1 | Suppression on cosmetic settings.json rewrite | `upgrade-restart-warning.red.node.test.ts` | Test 1 | Pass |
| 2 | Warning on real hooks-block change | `upgrade-restart-warning.red.node.test.ts` | Test 2 | Pass |
| 3 | Suppression on cosmetic .mcp.json rewrite | `upgrade-restart-warning.red.node.test.ts` | Test 3a | Pass |
| 4 | Warning on `mcpServers.cleargate.args` change | `upgrade-restart-warning.red.node.test.ts` | Test 3b | Pass |
| 5 | `init.ts` parallel suppression (idempotent) | `init.test.ts:883` | scenario 5 | Pass |
| 6 | `init.ts` warning on real hooks change | `init.test.ts:943` | scenario 6 | Pass |
| 7 | (bonus) Parse-failure conservative fallback | `init.test.ts:988` | scenario 7 | Pass |

Round-2 test additions (commit `c84cd66`) closed the QA-flagged gap on Scenarios 5 + 6. Scenario 7 (parse failure) was bonus coverage of the conservative branch — not strictly required by M1 but exercises the documented "when in doubt, warn" contract.

### Test file naming

PASS. Net-new test file `upgrade-restart-warning.red.node.test.ts` matches `*.red.node.test.ts` immutability convention. `init.test.ts` is a pre-existing vitest file extended in-place — acceptable per M1 footer "extending them in-place is acceptable; net-new test files for these stories use node:test".

### Sprint Context

`sprint-context.md` is unchanged from M1 init. No `## Mid-Sprint Amendments` append needed for CR-059 — no scope-change/approach-change CR was raised during execution. Round-1 kickback was a coverage gap (Scenarios 5+6 missing tests), not a scope change.

## Findings

```
ARCH: PASS
findings:
  - M1 blueprint adherence: full — helper signature, file location, scope all match plan §CR-059 verbatim.
  - SDR-locked scope respected: hooks block only for settings.json; mcpServers.cleargate only for .mcp.json; all other paths conservative warn.
  - Surgical diff vs BUG-028: 5 files, no cross-contamination, postSha/classify/drift-map flow untouched.
  - Symbol-reference mandate honored: changes located via SESSION_LOAD_PATHS / sessionRestartFiles.push, not line numbers.
  - Coverage 7/7 scenarios; QA Round-1 kickback resolved cleanly in c84cd66.
  - Conservative-on-parse-failure contract verified by Scenario 7 test (bonus).
  - Typecheck clean; no `any` types in new helper.
flashcards_flagged: []
```

No flashcards needed — this CR followed the established pattern (helper module + conditional guard replacement) cleanly. Existing flashcards on naming convention, pre-mutation capture, and conservative-default were applied correctly.
