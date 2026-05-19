---
story_id: STORY-072-01
report_type: qa-red
sprint_id: SPRINT-30
created_at: 2026-05-19T00:00:00Z
agent: qa
---

# QA-Red Report — STORY-072-01

## Summary

Red test file written at `cleargate-cli/test/commands/init-gitignore-expansion.red.node.test.ts`.

Five scenarios from §2.1 Gherkin. Baseline run: **4 failing, 1 passing**.

## Test File

`cleargate-cli/test/commands/init-gitignore-expansion.red.node.test.ts`

## Scenario Analysis

| # | Scenario | Red? | Baseline Result | Notes |
|---|---|---|---|---|
| 1 | `.env` is gitignored | YES | FAIL | Template has no `.env` line — `git check-ignore` exits 1 |
| 2 | `.env.example` NOT gitignored | YES | FAIL | Precondition (`.env` must be ignored) fails — template lacks `.env.*` block |
| 3 | Python + Node markers present | YES | FAIL | `__pycache__/`, `*.pyc`, `.venv/`, `.pytest_cache/`, `node_modules/`, `.DS_Store` all absent from current 15-line template |
| 4 | ClearGate blocks preserved | YES | FAIL | `/.cleargate/hook-log/` is in the Gherkin spec but NOT in current template — expansion must add it |
| 5 | re-init preserves user customization | NO | PASS | `FIRST_INSTALL_ONLY` in `copy-payload.ts` already skips `.gitignore` on re-init; user lines survive |

## Canonical Path Audit (M1 §6 Open Decision 5)

Both `cleargate-planning/.gitignore` and `cleargate-cli/templates/cleargate-planning/.gitignore` have identical 15-line content. `initHandler` in tests receives `META_ROOT_PLANNING = cleargate-planning/` as `payloadDir`. Dev must update BOTH paths per Cross-Cutting Rule #2 (three-site mirror) and run `npm run prebuild` to regenerate the npm payload dist copy.

## Wiring Notes

- Imports resolve: `../../src/commands/init.js` (relative ESM, `.js` extension) — correct for TS+ESM convention.
- `initHandler` signature used matches existing `init.node.test.ts` pattern (`cwd`, `payloadDir`, `stdout`, `stderr`).
- `execFileSync` from `node:child_process` used for `git check-ignore` — no mocks, real process per Cross-Cutting Rule #4.
- `gitInit(dir)` runs `git init -b main` before init so `git check-ignore` resolves correctly.
- `afterEach` cleanup via `fs.rmSync` with `recursive: true` — no tmpdir leaks.
- File naming: `*.red.node.test.ts` — correct per SKILL.md §C.3.
