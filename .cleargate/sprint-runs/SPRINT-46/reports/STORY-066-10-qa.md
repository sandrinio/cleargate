# STORY-066-10 QA-Verify report (transcribed by the orchestrator from the agent's return; the agent did not write the file)

QA: PASS
ACCEPTANCE_COVERAGE: 5 of 5 scenarios
MISSING: none
REGRESSIONS: none
flashcards_flagged: []

- Typecheck exit 0; `npm run prebuild` passes.
- test_update_state.integration 22/25 (3 baseline: Scenario 2 "every story has lane…", "no other pre-existing field…", Scenario 5 "byte-equal"); sprint-metrics.red 70/70; sprint-metrics.red.integration 5/5; sprint-metrics.r2.red 5/5; prep-reporter-measured-metrics.red 10/10.
- Scenario trace: S1 U1; S2 U3, U4; S3 U5, U6; S4 M1, M1b; S5 M2, M3.
- Real run in a throwaway sprint dir (deleted): `--defect-in code` → "returns to the Developer"; `red-test` → "returns to QA-Red"; bare `--qa-bounce` → `defect_in=unknown`; `spec` → Escalated, qa_bounces 1, "halts for the owner"; bad value / missing value / extra arg → exit 2 with state.json and events.jsonl byte-identical (cmp). sprint_metrics on the fixture: per-item by_defect_in and totals.rework_by_defect_in {code 2, red-test 2, spec 1, unknown 2}; lane and by_lane present; unmeasured shows `not measured`. On SPRINT-45: old rework fields unchanged; by_lane fast 1 item / 3 dispatches, standard 5 items / 26 dispatches.
- Surface: f846d9a..0880cf5 = three scripts + QA-Red files from 91ccb77; Developer commit touched only update_state.mjs, state-events.mjs, sprint_metrics.mjs.
- Targeted files re-run after the merge lane integrates main (upstream 066-05).
