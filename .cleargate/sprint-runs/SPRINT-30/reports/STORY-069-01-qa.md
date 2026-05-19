---
story_id: STORY-069-01
sprint_id: SPRINT-30
agent: qa
mode: VERIFY
qa_round: 1
commit: bedc3774
timestamp: 2026-05-19T00:00:00Z
verdict: PASS
---

# QA-Verify Report: STORY-069-01

**Date:** 2026-05-19
**QA Agent:** role: qa
**Mode:** VERIFY
**Commit:** bedc3774

## Summary

All three §2.1 Gherkin scenarios implemented and passing. `banners.ts` helper
matches blueprint exactly. `init.ts` wiring is correct: pre/post capture in
place, banner conditional on `extractSessionLoadDelta` boolean return,
positioned after `Done.` log line. Inline bullet no longer mentions restart.
Red file deleted. Typecheck clean.

## Checklist

### 1. banners.ts

- NEW file `cleargate-cli/src/lib/banners.ts` created.
- Exports `emitMcpRestartBanner(): void`.
- 5-line stderr block: leading newline + top rule (67 × `─`) + 3 body lines + bottom rule.
- Matches M1 §3 blueprint and story §3.2 sketch exactly.
- Plaintext only — no chalk/color import.

### 2. init.ts wiring

- `import { extractSessionLoadDelta } from '../lib/session-load-delta.js'` — present (line 26).
- `import { emitMcpRestartBanner } from '../lib/banners.js'` — present (line 27).
- `preMutationMcpJson` captured at line 377 BEFORE `injectMcpJson()` call.
- `postMutationMcpJson` captured at line 394 AFTER the try/catch block.
- Banner call at lines 554-556, AFTER `Done.` log line (line 547). Conditional on
  `extractSessionLoadDelta('.mcp.json', preMutationMcpJson, postMutationMcpJson)`.
- Inline log bullet (lines 382, 386, 389): no `— restart Claude Code to load it` segment. PASS.

### 3. extractSessionLoadDelta signature

Signature: `(filePath: string, oldContent: string, newContent: string): boolean`
Dev's call: `extractSessionLoadDelta('.mcp.json', preMutationMcpJson, postMutationMcpJson)`
Match: exact. Conservative: parse failure returns `true` (banner fires). Pre-existence
absence: `preMutationMcpJson = ''` when file absent; `JSON.parse('')` throws → returns `true`
(fresh install always fires). PASS.

### 4. Test file

- `cleargate-cli/test/commands/init-restart-banner.node.test.ts` — 3 `describe` blocks, 3 tests.
- `.red.` file deleted. PASS.
- Real-process `spawnSync` against `dist/cli.js`. No mocked fs/spawn.
- All three Gherkin scenarios covered 1:1.
- `after()` cleanup hooks present in all three blocks.
- Ordering assertion in Scenario 1: concatenates `result.stdout + result.stderr`; `Done.`
  index in stdout portion is always < `Restart Claude Code` index in stderr portion.
  Ordering guarantee is structural (string concatenation) rather than stream-interleave;
  adequate given `Done.` and banner are on different streams — no defect.

### 5. Test re-run (scoped)

```
npx tsx --test test/commands/init-restart-banner.node.test.ts
tests 3, pass 3, fail 0, skipped 0
```
All 3 pass. Duration ~2.8 s.

### 6. Typecheck

```
npx tsc --noEmit → TypeScript: No errors found
```

## Pack Status

QA context pack (`.qa-context-STORY-069-01.md`) not found — orchestrator skipped `prep_qa_context.mjs`.
WARN: dev handoff incomplete — context limited (SCHEMA_INCOMPLETE). Verification proceeded
from source files; no reduction in coverage.

Dev report written to worktree path only (not copied to main `.cleargate/sprint-runs/SPRINT-30/reports/`).
DevOps should copy or note at merge time.

## Acceptance Coverage

| Gherkin Scenario | Test | Result |
|---|---|---|
| Scenario 1: fresh init emits banner on stderr | `fresh init — stderr contains "Restart Claude Code" and "/mcp" after "Done."` | PASS |
| Scenario 2: idempotent re-init does NOT emit banner | `idempotent re-init (unchanged .mcp.json) — stderr does NOT contain "Restart Claude Code"` | PASS |
| Scenario 3: re-init with .mcp.json change re-emits banner | `re-init with changed .mcp.json (mcpServers.cleargate.command tampered) — stderr contains "Restart Claude Code"` | PASS |

## Regressions

None detected in scoped run. Dev reports 1926 pass / 134 fail in full suite; 134 failures
are pre-existing (unrelated to STORY-069-01 scope) and were present before this story.
