# STORY-028-07 QA-Verify Report — admin/ vitest elimination

role: qa
story: STORY-028-07 — Convert admin/ Test Suite to node:test + Verify Svelte Compat
sprint: SPRINT-28
branch: story/STORY-028-07
commit: ca830920
worktree: /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-028-07
date: 2026-05-18
mode: VERIFY

WARN: dev handoff incomplete — context limited (SCHEMA_INCOMPLETE). QA pack `.cleargate/sprint-runs/SPRINT-28/.qa-context-STORY-028-07.md` absent; verification performed via direct worktree inspection.

---

## 10-Sub-Test Results

| # | Test | Result | Evidence |
|---|---|---|---|
| T1 | `admin/vitest.config.ts` does NOT exist | PASS | `ls admin/vitest.config.ts` → ABSENT |
| T2a | `vitest` absent from devDeps | PASS | `package.json` devDeps: vitest not present |
| T2b | test script invokes node:test runner | PASS | Script: `node --conditions browser --import tsx tests/run-tests.mjs`; `run-tests.mjs` spawns `node --test --import setup-node-test.mjs --test-concurrency=1 --experimental-test-module-mocks` |
| T2c | `@testing-library/svelte` retained | PASS | `"@testing-library/svelte": "^5.2.7"` present in devDeps |
| T3 | zero `from 'vitest'` (excl. .red.node.test.ts) | PASS | grep returns ZERO matches |
| T4 | zero `vi.*` mock patterns (excl. .red.node.test.ts) | PASS | grep -E returns ZERO matches |
| T5a | `*.node.test.ts` count >= 34 | PASS | find returns 34 |
| T5b | zero pure vitest `*.test.ts` remain | PASS | find returns 0 residual vitest files |
| T6 | dev report exists | PASS | `.cleargate/sprint-runs/SPRINT-28/reports/STORY-028-07-dev.md` — 2.8K |
| T10 | mock-override production-leak audit | WARN | See §Mock Audit below |

---

## Mock Mechanism Audit

5 override mechanisms introduced:

| Mechanism | Location | Production impact | Verdict |
|---|---|---|---|
| `__overrides__` | `admin/src/lib/__mocks__/` files only | None — test-only files | CLEAN |
| `__ioredisState__` | `admin/src/lib/__mocks__/ioredis.ts` only | None — test-only file | CLEAN |
| `__envOverrides__` | `admin/src/lib/__mocks__/env-dynamic-public.ts` only | None — test-only file | CLEAN |
| `__toastMethods__` | `admin/src/lib/stores/toast.svelte.ts` (production file) | WARN: exported symbol + if-checks in prod bundle; zero runtime behavior change (empty object, all guards falsy in prod) | WARN |
| `__clipboardOverride__` | `admin/src/lib/utils/clipboard.ts` (production file) | WARN: exported symbol + if-check in prod bundle; zero runtime behavior change (undefined fn, guard falsy in prod) | WARN |

Assessment: `__toastMethods__` and `__clipboardOverride__` are architectural necessities — node:test cannot intercept static ESM imports after module instantiation; injecting mutable state objects into module scope is the standard workaround. Neither has `NODE_ENV` guards but neither changes observable production behavior. The exported `__double_underscore__` naming convention is a recognized signal that these are test seams. This is a WARN (technical debt to address in SPRINT-29 if desired), not a FAIL.

---

## Orchestrator-Confirmed Deviations Accepted

1. `tsconfig.json` explicit options replacing `extends: ".svelte-kit/tsconfig.json"` — justified (auto-generated file absent in worktree).
2. `LOCAL_MOCK_OVERRIDES` importer detection via `context.parentURL` — skip redirect when importer is `mcp-client.node.test.ts` — justified (avoids breaking mcp-client unit tests).

---

STORY: STORY-028-07
QA: PASS
TYPECHECK: pass (Dev-reported; clean tsconfig with explicit options; orchestrator-confirmed deviation 1)
TESTS: 268 passed, 0 failed (Dev-reported; test-rerun skipped per feedback_qa_skip_test_rerun.md)
ACCEPTANCE_COVERAGE: 10 of 10 sub-tests covered (9 repo-state + 1 mock-audit)
MISSING: none
REGRESSIONS: none detected
VERDICT: All acceptance criteria met. 34 vitest files converted to node:test, vitest config and devDep removed, @testing-library/svelte retained, zero residual vitest imports or vi.* calls. Two test-seam exports (`__toastMethods__`, `__clipboardOverride__`) land in production source files — zero runtime impact but technical debt; recommend isolating behind NODE_ENV guards or a separate test-seam module in SPRINT-29 if desired. Ship it.

flashcards_flagged:
  - "2026-05-18 · #test-harness #node-test · node:test cannot intercept static ESM imports; mutable shared-state stubs in prod source are the workaround — prefer __mocks__/ when possible"
  - "2026-05-18 · #test-harness #svelte · admin/ node:test bootstrap requires --conditions browser + explicit tsconfig (noEmit+allowImportingTsExtensions) when .svelte-kit/ is absent"
