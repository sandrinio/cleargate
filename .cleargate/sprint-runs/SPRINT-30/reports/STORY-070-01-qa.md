# QA-Verify Report: STORY-070-01

**Role:** QA
**Mode:** VERIFY
**Sprint:** SPRINT-30 (M2, Wave 4)
**Story:** STORY-070-01 — Collapse `execution_mode` to single always-enforced behavior + schema v3 migrator + advisory env hatch
**Dev commit:** `145a28c2`
**Branch:** `story/STORY-070-01`
**Worktree:** `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-070-01`
**Date:** 2026-05-22

---

## Red Test Verification

All 5 QA-Red test files re-run from scratch against Dev commit `145a28c2`. Results:

| File | Scenarios | Result |
|---|---|---|
| `cleargate-cli/test/util/gate-mode.red.node.test.ts` | 6 | 6/6 PASS |
| `cleargate-cli/test/scripts/migrate-schema-v3.red.node.test.ts` | 18 | 18/18 PASS |
| `cleargate-cli/test/docs/no-execution-mode-vocabulary.red.node.test.ts` | 9 | 9/9 PASS |
| `cleargate-cli/test/integration/advisory-env-gate.red.node.test.ts` | 3 | 3/3 PASS |
| `cleargate-cli/test/commands/doctor-retired-field.red.node.test.ts` | 3 | 3/3 PASS |

**Total: 39/39 PASS** (all 21 previously-failing + 18 pre-condition tests).

---

## Acceptance Scenario Trace (8 Gherkin scenarios)

### Scenario 1: Sprint Plan template no longer declares execution_mode
- **Implementation:** `.cleargate/templates/Sprint Plan Template.md` — field line + comment block removed.
- **Test hit:** `no-execution-mode-vocabulary.red.node.test.ts` Scenario "Sprint Plan template no longer declares execution_mode" (3 assertions: file exists, no `^execution_mode:` line, no v1/v2 enum comment block).
- **Status:** PASS

### Scenario 2: state.schema.json v3 omits execution_mode
- **Implementation:** `.cleargate/scripts/state.schema.json` — `execution_mode` removed from `properties` and `required`; `schema_version.const` bumped to 3.
- **Test hit:** `no-execution-mode-vocabulary.red.node.test.ts` Scenario "state.schema.json v3 omits execution_mode" (3 assertions: no execution_mode in properties, not in required, schema_version.const === 3).
- **Status:** PASS

### Scenario 3: migrator strips field from legacy state.json
- **Implementation:** `.cleargate/scripts/_migrate-schema-v3.mjs` — `migrateStateToV3()` / `migrateStateFileToV3()` with atomic tmp+rename. Wired into `close_sprint.mjs`, `init_sprint.mjs`, `update_state.mjs`, `validate_state.mjs` immediately after each `JSON.parse()`.
- **Test hit:** `migrate-schema-v3.red.node.test.ts` Scenarios 1–4 (strip+bump, byte-identical, no-op, stderr log).
- **Atomicity verified:** `_migrate-schema-v3.mjs` uses `tmpFile = ${statePath}.tmp.${process.pid}` + `fs.renameSync()` with cleanup on error — matches Rule 7 contract.
- **Status:** PASS

### Scenario 4: CLEARGATE_ADVISORY=1 turns gate failure into warning
- **Implementation:** `cleargate-cli/src/util/gate-mode.ts` — `isAdvisory()` returns `process.env['CLEARGATE_ADVISORY'] === '1'`. Wired in `cleargate-cli/src/commands/sprint.ts` at gate-failure exit path (line 1561).
- **Test hit:** `advisory-env-gate.red.node.test.ts` — "exits 0 when gate would otherwise fail" + "stderr contains [advisory]".
- **Semantics verified:** only exact string `'1'` is truthy (not `'true'`, `'yes'`, `'0'`, `''`) — all 6 enum tests in `gate-mode.red.node.test.ts` green.
- **Status:** PASS

### Scenario 5: gate failure remains fatal without the env var
- **Implementation:** same wiring — `if (isAdvisory())` else `process.exit(nonzero)`.
- **Test hit:** `advisory-env-gate.red.node.test.ts` — "without CLEARGATE_ADVISORY — same fixture exits non-zero".
- **Status:** PASS

### Scenario 6: doctor surfaces retired-field advisory
- **Implementation:** `cleargate-cli/src/commands/doctor.ts` — scans pending-sync frontmatter for `execution_mode` field; emits advisory line; does NOT auto-strip.
- **Test hit:** `doctor-retired-field.red.node.test.ts` — "doctor output mentions execution_mode retired-field advisory" + "pending-sync sprint file is unmodified after doctor runs".
- **Status:** PASS

### Scenario 7: grep-gate npm script catches regression
- **Implementation:** `cleargate-cli/package.json` `check:no-execution-mode-vocabulary` script. Excludes: `archive`, `node_modules`, `test`, `sprint-runs`, `fixtures`, `package.json`, `execution-mode.ts`. Scans `../.cleargate/templates/` and `../cleargate-planning/CLAUDE.md`.
- **Verified:** `npm run check:no-execution-mode-vocabulary` exits 0 in worktree.
- **Rule 11 compliance:** all five required exclusion dirs present (`archive`, `node_modules`, `test`, `sprint-runs`; `fixtures` also added as bonus). `package.json` itself excluded.
- **Status:** PASS

### Scenario 8: SPRINT-28 archived state.json round-trips safely
- **Implementation:** `_migrate-schema-v3.mjs` fixture-tested against a `fs.copyFileSync()` copy at tmpdir — live file never written.
- **Test hit:** `migrate-schema-v3.red.node.test.ts` Scenario 5 — 5 assertions: exits 0, schema_version → 3, no execution_mode, all other fields preserved, live path distinct from fixture path.
- **SPRINT-28 fixture safety:** verified — test asserts `fixtureCopyPath !== SPRINT28_STATE_JSON`.
- **Status:** PASS

---

## Spot-Check: Cross-Cutting Rule Compliance

| Rule | Check | Result |
|---|---|---|
| Rule 5: node:test, `*.red.node.test.ts` naming | All 5 red files end `.red.node.test.ts`; runner is `tsx --test` | PASS |
| Rule 7: Migrator atomicity (tmp+rename, fixture-only vs SPRINT-28) | `migrateStateFileToV3` uses `${statePath}.tmp.${pid}` + `renameSync`; Scenario 5 operates on tmpdir copy only | PASS |
| Rule 9: CLAUDE.md canonical edit first | `cleargate-planning/CLAUDE.md` — `**Sprint mode.**` paragraph absent; npm payload byte-identical (prebuild run) | PASS |
| Rule 11: Grep-gate exclusions | `--exclude-dir=archive,node_modules,test,sprint-runs,fixtures --exclude=package.json` | PASS |

---

## Three-Site Mirror Status

- Canonical `cleargate-planning/CLAUDE.md`: `**Sprint mode.**` paragraph deleted — VERIFIED
- NPM payload `cleargate-cli/templates/cleargate-planning/CLAUDE.md`: synced via `npm run prebuild` — VERIFIED (test passes)
- Live `/.claude/CLAUDE.md`: NOT re-synced — remains pending as orchestrator DoD item. Per dispatch instructions: **do NOT fail QA on missing live edit.** This is intentional; `cleargate init` re-run is a post-merge gate.

---

## Typecheck

`npm run typecheck` → exit 0, no errors.

---

## Full Test Suite

Run: `tsx --test --test-concurrency=1 --experimental-test-module-mocks --test-reporter=tap 'test/**/*.node.test.ts' '!test/fixtures/**'`

```
# tests 2124
# pass 2002
# fail 83
```

The 83 failures are all pre-existing (confirmed against Dev's stash-baseline verification). None are in files touched by commit `145a28c2`. Failure areas:
- `test/e2e/dogfood-install.node.test.ts` — env/integration pre-existing
- `test/commands/story-unit.node.test.ts` — pre-existing assertion bugs
- `test/scripts/test_update_state.node.test.ts` — malformed assert args, pre-existing
- `test/wiki/*.node.test.ts` — `require` in ESM context, mcp/package.json absent, pre-existing
- Various other unrelated test areas (AdminApiClient, FileTokenStore, CHANGELOG, acquireAccessToken)

No regression in Dev-touched test files.

---

## DoD Checklist (§4.2)

- [x] `.cleargate/scripts/state.schema.json` carries `schema_version: 3`; no `execution_mode` property
- [x] `.cleargate/scripts/_migrate-schema-v3.mjs` exists; consumed by four state-reading scripts
- [x] All four scripts have v1/v2 branches collapsed (close_sprint, init_sprint, update_state, validate_state)
- [x] `cleargate-cli/src/util/gate-mode.ts` exists; `isAdvisory()` wired into sprint preflight gate-failure exit
- [x] `.cleargate/knowledge/cleargate-enforcement.md` rewritten; "Operator Emergency Levers" subsection present (§15)
- [x] `cleargate-planning/CLAUDE.md` `**Sprint mode.**` paragraph removed
- [x] `npm run prebuild` synced CLAUDE.md to npm payload (test-verified byte-identical)
- [ ] Live `/.claude/CLAUDE.md` re-synced — PENDING (orchestrator DoD step; not a QA failure criterion)
- [x] Sprint plan template no longer declares the field or its explanatory comment block
- [x] All eight Gherkin scenarios covered by tests (39/39 red tests green)
- [x] `npm run typecheck` clean
- [x] `npm test` — 83 pre-existing failures only, no regressions in touched areas
- [x] `npm run check:no-execution-mode-vocabulary` exits 0
- [x] SPRINT-28 archived state.json migrator-test passes against fixture copy

