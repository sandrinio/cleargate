# QA-Red Report: STORY-069-01

**Date:** 2026-05-19
**QA Agent:** role: qa
**Mode:** RED

## Summary

Three failing red tests written covering the three §2.1 Gherkin scenarios for STORY-069-01 (emit a prominent stderr restart banner at end of `cleargate init` when `.mcp.json` was created or changed).

## Red Test File

`cleargate-cli/test/commands/init-restart-banner.red.node.test.ts`

## Baseline Failure Confirmation

All 3 test cases fail against the clean baseline (no implementation, no dist/cli.js). Failure mode: the `before()` guard asserts `fs.existsSync(DIST_CLI_PATH)` and throws `AssertionError: dist/cli.js not found — Run 'npm run build' in cleargate-cli/ first.` Each suite's inner test case is then cancelled by the runner.

Exit code: 1
Tests: 3 failed, 0 passed, 0 skipped

## Scenario Coverage

| Gherkin Scenario | Test Case | Assertions |
|---|---|---|
| Scenario 1: fresh init emits banner on stderr | `fresh init — stderr contains "Restart Claude Code" and "/mcp" after "Done."` | `assert.match(stderr, /Restart Claude Code/)`, `assert.match(stderr, /\/mcp/)`, string-index ordering check `bannerIndex > doneIndex` |
| Scenario 2: idempotent re-init does NOT emit banner | `idempotent re-init (unchanged .mcp.json) — stderr does NOT contain "Restart Claude Code"` | `assert.doesNotMatch(stderr, /Restart Claude Code/)` |
| Scenario 3: re-init with .mcp.json change re-emits banner | `re-init with changed .mcp.json (mcpServers.cleargate.command tampered) — stderr contains "Restart Claude Code"` | `assert.match(stderr, /Restart Claude Code/)` |

## Harness Requirement (flagged for Dev)

Tests depend on built `dist/cli.js`. The `before()` guard at each `describe` block catches the absence and emits:
> `dist/cli.js not found at <path>. Run 'npm run build' in cleargate-cli/ first.`

Dev must run `npm run build` inside `cleargate-cli/` before executing the test suite. This is the same pattern used by `init-no-dep0190.node.test.ts` (STORY-068-01).

## Wiring Soundness

- Imports: `node:test`, `node:assert/strict`, `node:child_process`, `node:fs`, `node:path`, `node:os`, `node:url` — all stdlib, no implementation source imports (RED-mode constraint honoured).
- Constructor signatures: `spawnSync` called with `(process.execPath, [DIST_CLI_PATH, 'init'], { cwd, encoding, timeout })` — matches Node.js stdlib.
- After-hooks present: all 3 `describe` blocks have `after(() => fs.rmSync(tmpDir, { recursive: true, force: true }))`.
- File naming: `*.red.node.test.ts` — correct.
- DIST_CLI_PATH derived via `url.fileURLToPath(import.meta.url)` — same pattern as `init-no-dep0190.node.test.ts`.

## Deletion Reminder

Dev's commit MUST include deletion of this `.red.` file at merge time (dispatch lesson #2 from prior red dispatches in this sprint).
