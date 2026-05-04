# CR-050 QA Report

**Date:** 2026-05-04  
**QA Agent:** claude-sonnet-4-6  
**Dev SHA:** 7078663  
**Worktree:** .worktrees/CR-050  
**Mode:** VERIFY (skip-test-rerun; trust Dev artifact 110 passed, 0 failed)

---

## Acceptance Trace (§4 — 7 criteria)

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | All 8 production callers updated; no bare `<script>.{mjs,sh}` as first run_script.sh arg | PASS | Grep of sprint/state/gate/story.ts: every run_script.sh spawnFn call passes `'node'` or `'bash'` as args[1] + absolute path via `resolveCleargateScript` as args[2]. The one `assert_story_files.mjs` at sprint.ts:1156 uses `execFn` (not run_script.sh), out of scope. |
| 2 | Back-compat shim block removed from run_script.sh (~15 LOC) | PASS | Diff removes 17 LOC block (comment + SCRIPT_DIR + _ARG1 + 2 if/elif branches). Live file drops from 222→205 lines. No `_ARG1`, `SCRIPT_DIR`, `*.mjs && -f`, `*.sh && -f` remain. |
| 3 | CLI smoke: callers exit non-127 | PASS | Dev SMOKE_CLI=pass; 8 callers no longer 127 (per dispatch note). Interface verified by diff inspection. |
| 4 | 4 caller test files use capture-mock; assert `node`/`bash` as arg[1] + absolute path as arg[2]; no spawnMock for run_script.sh | PASS | sprint.node.test.ts (4 tests), state.node.test.ts (2 tests), gate.node.test.ts (2 tests), story.node.test.ts (2 tests) — all assert args[1]='node'/'bash' and args[2]=absolute path ending in script name. All use capture pattern, no vitest spawnMock. |
| 5 | `run-script-wrapper-backcompat.node.test.ts` deleted | PASS | File absent from .worktrees/CR-050/cleargate-cli/test/scripts/. Confirmed via ls. |
| 6 | Mirror parity: live == canonical for run_script.sh | PASS | `diff .cleargate/scripts/run_script.sh cleargate-planning/.cleargate/scripts/run_script.sh` returns empty. Both 205 lines. |
| 7 | typecheck + npm test exit 0 | PASS (trusted) | Dev reports 110 passed, 0 failed; typecheck clean. Skip-rerun mode per QA memory note. |

---

## Spot-Checks

### 8 Caller Migrations

| File | Caller | Old arg-1 | New arg-1 | New arg-2 |
|------|--------|-----------|-----------|-----------|
| sprint.ts | init | `'init_sprint.mjs'` | `'node'` | `resolveCleargateScript({cwd}, 'init_sprint.mjs')` |
| sprint.ts | close | `'close_sprint.mjs'` | `'node'` | `resolveCleargateScript({cwd}, 'close_sprint.mjs')` |
| state.ts | update | `'update_state.mjs'` | `'node'` | `resolveCleargateScript({cwd}, 'update_state.mjs')` |
| state.ts | validate | `'validate_state.mjs'` | `'node'` | `resolveCleargateScript({cwd}, 'validate_state.mjs')` |
| gate.ts | qa | `'pre_gate_runner.sh'` | `'bash'` | `resolveCleargateScript({cwd}, 'pre_gate_runner.sh')` |
| gate.ts | arch | `'pre_gate_runner.sh'` | `'bash'` | `resolveCleargateScript({cwd}, 'pre_gate_runner.sh')` |
| story.ts | start (step 2) | `'update_state.mjs'` | `'node'` | `resolveCleargateScript({cwd}, 'update_state.mjs')` |
| story.ts | complete (step 6) | `'update_state.mjs'` | `'node'` | `resolveCleargateScript({cwd}, 'update_state.mjs')` |

All 8 pass. Zero bare-name patterns remain in spawnFn calls.

### Shim Block Deletion

- Removed: 17 LOC block (comment header + `SCRIPT_DIR` + `_ARG1` + `*.mjs` if-branch + `*.sh` elif-branch + closing comment).
- CR-050 §2 said ~15 LOC — actual 17, within tolerance.
- Both `.cleargate/scripts/run_script.sh` and `cleargate-planning/.cleargate/scripts/run_script.sh` updated lockstep.

### Companion Test Deletion

- `run-script-wrapper-backcompat.node.test.ts` (210 LOC) — deleted. Confirmed absent from worktree.

### New Test Files

- `test/commands/sprint.node.test.ts` — 4 tests
- `test/commands/state.node.test.ts` — 2 tests
- `test/commands/gate.node.test.ts` — 2 tests
- `test/commands/story.node.test.ts` — 2 tests
- All node:test format; no test.skip; no vitest.

### Mirror Parity

- `diff` of both run_script.sh copies returns empty.

### Red-Test Naming

- `run-script-shim-removal.red.node.test.ts` — present with `.red.` infix before `.node.`. Correct per FLASHCARD `#naming #red-green`.

---

## Scope Drift

`src/lib/script-paths.ts` (`resolveCleargateScript` helper) added — not in M1 scope per §3 "Add: none". Justified: eliminates 8 inline `path.join(cwd, '.cleargate', 'scripts', name)` repetitions; zero blast-radius outside this CR; trivially typechecks. Out-of-M1-but-justified.

---

## Result

**QA: PASS**  
**ACCEPTANCE_COVERAGE: 7 of 7**  
**SCOPE_DRIFT: new-helper-out-of-M1-but-justified**  
**REGRESSIONS: none**

