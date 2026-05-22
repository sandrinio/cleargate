# QA-Red Report: STORY-070-01

**Role:** QA  
**Mode:** RED  
**Sprint:** SPRINT-30  
**Story:** STORY-070-01 — Collapse execution_mode vocabulary + schema v3 migrator + advisory env hatch  
**Date:** 2026-05-20  

## Red Test Files Written

| File | Scenarios | Baseline Fail |
|---|---|---|
| `cleargate-cli/test/util/gate-mode.red.node.test.ts` | 6 (isAdvisory() enum — only '1' truthy) | 6 |
| `cleargate-cli/test/scripts/migrate-schema-v3.red.node.test.ts` | 18 (migrator strip + SPRINT-28 fixture) | 10 |
| `cleargate-cli/test/docs/no-execution-mode-vocabulary.red.node.test.ts` | 9 (template + schema + CLAUDE.md) | 7 |
| `cleargate-cli/test/integration/advisory-env-gate.red.node.test.ts` | 3 (CLEARGATE_ADVISORY=1 vs absent) | 2 |
| `cleargate-cli/test/commands/doctor-retired-field.red.node.test.ts` | 3 (retired-field advisory + no-strip) | 1 |

**Total:** 34 tests, 13 pass (pre-condition/existence checks), 21 fail (implementation-absent scenarios)

## SPRINT-28 Fixture Safety

The `migrate-schema-v3.red.node.test.ts` Scenario 5 uses `fs.copyFileSync` to copy
`.cleargate/sprint-runs/SPRINT-28/state.json` to a tmpdir before running the migrator.
The live file is NEVER passed to the migrator — only the copy. A dedicated assertion
verifies the fixture copy path differs from the live path.

## Baseline Failure Explanation

- `gate-mode.red.node.test.ts`: fails with ERR_MODULE_NOT_FOUND — `cleargate-cli/src/util/gate-mode.ts` does not exist.
- `migrate-schema-v3.red.node.test.ts`: migrator script `.cleargate/scripts/_migrate-schema-v3.mjs` does not exist — spawnSync exits with ENOENT/non-zero. Schema-preservation scenarios pass because no file is modified (vacuously preserved).
- `no-execution-mode-vocabulary.red.node.test.ts`: Sprint Plan Template.md still has `execution_mode: "v1"` on line 48; state.schema.json still has `properties.execution_mode` and `schema_version.const: 2`; cleargate-planning/CLAUDE.md still has "**Sprint mode.**" paragraph.
- `advisory-env-gate.red.node.test.ts`: CLI has no isAdvisory() wiring — gate failures exit non-zero regardless of CLEARGATE_ADVISORY=1; "[advisory]" never emitted.
- `doctor-retired-field.red.node.test.ts`: doctor.ts has no execution_mode scan in pending-sync — advisory line never emitted.

## Wiring Soundness (TPV Checklist)

- [x] All imports resolve at baseline (gate-mode fails correctly with ERR_MODULE_NOT_FOUND — module absent)
- [x] Constructor signatures match existing test patterns (spawnSync, fs.mkdtempSync, node:test hooks)
- [x] Mocked methods: none — real infra only per cross-cutting rule #4
- [x] After-hooks present in all describe blocks that create tmpDirs (fs.rmSync recursive)
- [x] File naming: all files end `.red.node.test.ts` per cross-cutting rule #5
- [x] SPRINT-28 fixture: copy-before-run enforced (SCHEMA_MIGRATOR_FIXTURE_USES_SPRINT28_COPY: yes)
