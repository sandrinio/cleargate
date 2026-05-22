# STORY-071-01 QA-Red Report

**Role:** role: qa
**Sprint:** SPRINT-30
**Story:** STORY-071-01 — Anchor Sprint Execution Autonomy contract in protocol doc + propagate to all loop agents + soft PreToolUse hook
**Mode:** RED — write failing tests against §2 acceptance Gherkin
**Timestamp:** 2026-05-22

---

## Red Test Files

| File | Scenarios Covered | Baseline Fails | Baseline Passes |
|---|---|---|---|
| `cleargate-cli/test/hooks/pre-tool-use-autonomy.red.node.test.ts` | Scenarios (a)–(e): hook logs on AskUserQuestion/Active sprint; silent on no-sentinel; silent on Completed sprint; silent on wrong tool; always exits 0 | **14** | 0 |
| `cleargate-cli/test/docs/autonomy-contract.red.node.test.ts` | Protocol doc §22 heading + 5 blocker cases; 5 agent files Autonomy Contract; reporter.md autonomy-warnings; SKILL.md cross-reference; settings.json PreToolUse wiring | **21** | 9 |

**Total baseline failures: 35 of 44 tests**

---

## Baseline Fail Evidence

### Hook test (pre-tool-use-autonomy.red.node.test.ts)
All 14 tests fail. Root cause: `cleargate-planning/.claude/hooks/pre-tool-use-autonomy.sh` does not exist.
`assertHookExists()` guard fails in every test (`fs.existsSync` returns false). `spawnSync('bash', [HOOK_PATH])` returns exit code 127.

```
ℹ tests 14 | pass 0 | fail 14 | skipped 0
```

Failing tests (all 14):
- t0: hook script exists at canonical path
- t1–t3: Scenario (a) AskUserQuestion + Active sprint
- t4–t5: Scenario (b) no sentinel
- t6–t7: Scenario (c) Completed sprint
- t8–t9: Scenario (d) wrong tool_name
- t10–t13: Scenario (e) soft-mode exit-0 contract

### Doc test (autonomy-contract.red.node.test.ts)
21 tests fail, 9 pass. Passing tests are file-existence and valid-JSON checks (baseline files exist and parse). Content-check assertions all fail.

```
ℹ tests 30 | pass 9 | fail 21 | skipped 0
```

Passing (9): protocol doc exists, 5 × agent file exists, SKILL.md exists, settings.json exists, settings.json parses as JSON.

Failing (21):
- p2–p7: Protocol doc §22 Sprint Execution Autonomy section absent
- a2/a3 (×5): Agent files lack Autonomy Contract heading + MUST NOT/AskUserQuestion assertion text
- a4: reporter.md lacks autonomy-warnings reference
- s2: SKILL.md lacks "Sprint Execution Autonomy" (only "Sprint execution is autonomous." at line 640)
- s3: Combined assertion (cleargate-protocol.md && Sprint Execution Autonomy) fails — "Sprint Execution Autonomy" absent from SKILL.md
- j3–j4: settings.json PreToolUse lacks pre-tool-use-autonomy.sh entry

---

## Wiring Soundness (TPV Checklist)

| Check | Status | Notes |
|---|---|---|
| Imports resolve | PASS | `node:test`, `node:assert/strict`, `node:fs`, `node:path`, `node:os`, `node:child_process` (spawnSync), `node:url` — all stdlib, no external deps |
| Constructor signatures match | PASS | No custom class constructors; `spawnSync`, `mkdtempSync`, `writeFileSync`, `rmSync` — all stdlib |
| Mocked methods | N/A | No mocks — real infra (spawnSync + real tmpdir per Cross-Cutting Rule #4) |
| After-hooks present | PASS | `try/finally { cleanupFixture(fix) }` in every behavioral test |
| File naming `*.red.node.test.ts` | PASS | Both files end in `.red.node.test.ts` |
| `assertHookExists()` guard in every hook test | PASS | Called at top of all 14 hook tests |
| Vacuous-pass prevention | PASS | Guard throws before log-file absence assertions reach execution |
| SKILL.md false-pass prevention | PASS | Assertion s3 uses `&&` combining `cleargate-protocol.md` (already present) with `Sprint Execution Autonomy` (absent on baseline) — combined assertion fails |
| Path resolution | PASS | `REPO_ROOT` computed from `__dirname` via `fileURLToPath(import.meta.url)` — absolute paths only |
| `CLAUDE_PROJECT_DIR` routing | PASS | `runHook` passes `CLAUDE_PROJECT_DIR: fixture.tmpDir` to spawnSync env — hook reads fixture files, not live repo |
| node:test only | PASS | No vitest imports; `describe`/`test`/`it` from `node:test` exclusively |
| Files sealed per CR-043 | PASS | Naming `*.red.node.test.ts` — immutable post-Red |

---

## Gherkin Coverage Map

| STORY-071-01 §2.1 Gherkin Scenario | Red Test Coverage | Baseline Status |
|---|---|---|
| Protocol doc carries the section and 5 enumerated cases | `autonomy-contract.red.node.test.ts` p2–p7 | FAIL (§22 absent) |
| Each loop agent carries the contract | `autonomy-contract.red.node.test.ts` a2/a3 (×5) + a4 | FAIL (subsections absent) |
| SKILL.md is cross-referenced | `autonomy-contract.red.node.test.ts` s2–s3 | FAIL (cross-ref absent) |
| Soft hook logs when AskUserQuestion fires during active sprint | `pre-tool-use-autonomy.red.node.test.ts` t1–t3 | FAIL (hook absent) |
| Hook is silent without active sprint | `pre-tool-use-autonomy.red.node.test.ts` t4–t5 | FAIL (hook absent) |
| Settings.json wires the hook into PreToolUse | `autonomy-contract.red.node.test.ts` j3–j4 | FAIL (entry absent) |

All 6 Gherkin scenarios: covered.

---

## Commit

```
c5fd850b qa-red(STORY-071-01): write failing tests (autonomy contract — 2 files, 35 baseline fails)
Branch: story/STORY-071-01
Worktree: /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-071-01
```
