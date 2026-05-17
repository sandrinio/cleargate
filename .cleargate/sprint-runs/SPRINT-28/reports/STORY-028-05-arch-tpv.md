---
role: architect
mode: TPV
story_id: STORY-028-05
sprint_id: SPRINT-28
qa_red_branch: story/STORY-028-05
qa_red_commit: 4117c8f7
red_test_file: cleargate-cli/test/scripts/mcp-vitest-conversion.red.node.test.ts
verdict: APPROVED
created_at: 2026-05-18
---

# TPV Report — STORY-028-05 (mcp/ vitest → node:test conversion)

role: architect

## Verdict

**TPV: APPROVED**

Wiring is sound. Developer may proceed.

## Wiring Checks (verbatim against TPV rubric)

### 1. Imports resolve to real modules

All imports are Node stdlib (no third-party packages, no project source imports):

| Import | Resolves to | Status |
|---|---|---|
| `node:test` | Node 24 LTS built-in (`describe`, `it`) | ✅ |
| `node:assert/strict` | Node 24 LTS built-in | ✅ |
| `node:fs` | Node 24 LTS built-in | ✅ |
| `node:path` | Node 24 LTS built-in | ✅ |
| `node:child_process` | Node 24 LTS built-in (`spawnSync`) | ✅ |
| `node:url` | Node 24 LTS built-in (`fileURLToPath`) | ✅ |

No third-party imports → no path-resolution risk via `node_modules`. Test does not need the worktree to have `npm install`'d; tsx runtime + Node stdlib is sufficient.

### 2. mcp/ path resolution via `git rev-parse --git-common-dir`

This is the critical wiring check. Verified empirically from inside the linked worktree:

```
$ cd /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-028-05/cleargate-cli/test/scripts
$ git rev-parse --git-common-dir
/Users/ssuladze/Documents/Dev/ClearGate/.git
$ git rev-parse --git-dir
/Users/ssuladze/Documents/Dev/ClearGate/.git/worktrees/STORY-028-05
```

Key observation: `--git-common-dir` returns the OUTER repo's common `.git` directory (not the per-worktree git dir). `path.dirname('/Users/ssuladze/Documents/Dev/ClearGate/.git')` yields `/Users/ssuladze/Documents/Dev/ClearGate` — the outer repo root. `path.join(outerRoot, 'mcp')` yields `/Users/ssuladze/Documents/Dev/ClearGate/mcp` — verified to exist on disk with both target files:

```
/Users/ssuladze/Documents/Dev/ClearGate/mcp/vitest.config.ts  (445B)  ← test 1 target
/Users/ssuladze/Documents/Dev/ClearGate/mcp/package.json     (1.6K)  ← tests 2 target
```

The nested-separate-repo nature of `mcp/` (its own `.git/`) does not interfere because the test treats `mcp/` as a pure filesystem path (fs.existsSync, fs.readFileSync, find/grep over its tree) — it never executes git commands inside mcp/, never queries mcp's git state. The outer repo's git is used only to locate the main-repo root once.

`SPRINT_REPORTS_DIR` derivation likewise resolves to `/Users/ssuladze/Documents/Dev/ClearGate/.cleargate/sprint-runs/SPRINT-28/reports/`, which exists and contains the sibling reports already.

### 3. Mocked methods

N/A — test uses real `fs.existsSync` / `fs.readFileSync` and real shell `grep` / `find` via `spawnSync`. No `t.mock.method()`, no `mock.fn()`. Nothing to verify.

### 4. After-hooks for orphan state

N/A — test is purely read-only. No tmpdir creation, no fs writes, no env mutation beyond a local `const env = { ...process.env }; delete env['NODE_TEST_CONTEXT']` per spawn (correct per FLASHCARD `#node-test #child-process` 2026-05-04 — prevents silent-skip in spawned grep/find children). No before-hooks → no after-hooks required.

### 5. File naming `*.red.node.test.ts`

✅ File path: `cleargate-cli/test/scripts/mcp-vitest-conversion.red.node.test.ts` — matches the CR-043 immutability naming contract.

## Non-Blocking Observations

These are style/efficiency notes, NOT wiring gaps. Do not act on these.

- `SPRINT_REPORTS_DIR` computes `getMcpRoot()` twice (once directly, once inside `path.dirname(getMcpRoot())`), re-spawning `git rev-parse`. Cheap (~5ms) and not a correctness issue; mentioned only for completeness.
- Tests 3-5 shell out to `bash -c` for the grep/find pipelines with `--exclude-dir=node_modules`. Portable on darwin (verified `bash` at `/bin/bash`) and standard CI Linux. No wiring risk.

## What This TPV Did NOT Verify

Per TPV scope rules, the following remain Developer's responsibility:

- Whether the 6 tests collectively cover all 5 Gherkin scenarios in §2.1.
- Whether the "≥ 68" assertion in Test 5 is the right floor given the 18 pre-existing + 50 conversion baseline.
- Whether the codemod from STORY-028-04 actually produces output that satisfies these assertions.
- Whether `npm test` green (Scenario "npm test green") has a corresponding Red test — it appears to NOT (the test file asserts repo state, not suite green). This is a coverage question for QA-Green, not a wiring question for TPV.

## Decision

Wiring resolves. Developer is unblocked to begin GREEN implementation against this Red harness.

**TPV: APPROVED**
