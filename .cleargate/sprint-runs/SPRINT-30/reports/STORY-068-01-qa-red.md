---
story_id: STORY-068-01
phase: qa-red
sprint_id: SPRINT-30
created_at: 2026-05-19
agent: qa
---

# QA-Red Report: STORY-068-01

## Verdict

QA-RED: WRITTEN

## Tests Written

- `cleargate-cli/test/commands/init-no-dep0190.red.node.test.ts`
  - 2 scenarios, 2 test cases
  - Both FAIL on baseline (init.ts:452 still has `shell: true`)

## Baseline Failure Evidence

**Scenario 1** — real-process `cleargate init` in a fresh tmpdir produces DEP0190 in stderr:
```
(node:90523) [DEP0190] DeprecationWarning: Passing args to a child process with shell option true can lead to security vulnerabilities...
```
AssertionError: `doesNotMatch(combined, /DEP0190/)` fails.

**Scenario 2** — `package.json` missing `check:no-shell-true-in-init` script:
```
AssertionError: package.json missing script "check:no-shell-true-in-init"
```

## Wiring Notes

- No implementation source imports — stdlib only. DEP0190 is a Node.js runtime signal that can only be observed via real subprocess; the `spawnSyncFn` DI seam in `initHandler` bypasses the real spawn.
- Scenario 1 drives via `spawnSync(process.execPath, [DIST_CLI_PATH, 'init'], ...)` in a `mkdtempSync` + `git init -b main` fixture.
- Scenario 2 checks `package.json` script existence, exact body (`! grep -n 'shell: true' src/commands/init.ts`), and exit code via `npm run check:no-shell-true-in-init`.
- Both tests use `describe`/`test`/`before`/`after` from node:test. File naming: `*.red.node.test.ts`.
- Worker note: `dist/cli.js` must be present (built in the worktree). The test fails with a clear assertion error if dist is absent (not a silent vacuous pass).

## Acceptance Trace

| Gherkin Scenario | Test | Expected baseline result |
|---|---|---|
| fresh init produces clean transcript | Scenario 1 | FAIL — DEP0190 present in stderr |
| grep-gate npm script catches regression | Scenario 2 | FAIL — script missing from package.json |

## Architect Prescription Applied

Per M1.md §3 STORY-068-01 blueprint: `command -v` → `which` substitution noted. Tests assert absence of DEP0190 + DeprecationWarning (not which-specific behavior) — correct, because the test should pass after the `which` swap too.
