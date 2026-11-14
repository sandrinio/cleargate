# STORY-066-05 QA-Verify
role: qa
QA: PASS
TYPECHECK: pass. prebuild (codex --check): pass.
TESTS: 6 sealed/named files 28/28 pass (assign-lane.red, assign-lane-init-sprint.red.integration, test_dogfood_lane_fast, no-inline-id-regex, init-sprint-waves-v2.red.integration, waves-json-v2.red). init-sprint-context.red + test_update_state.integration + tpv-architect.red: 29 pass, 3 fail, all 3 identical on f846d9a base and in baseline-integration-failures.
ACCEPTANCE: 5 of 5 scenarios (fast path, Outline, --write, raise-not-lower init_sprint, bad input exit 2 + --lane bogus) map to passing red tests; the Developer commit does not touch the red files.
Real run: assign_lane.mjs on 066-05 -> standard (scenarios 5>2), 066-06 -> runtime (2 subsystems), 066-10 -> standard; shape matches 1.2. Missing file -> exit 2 + usage, no stdout; no args -> exit 2.
Surface: diff f846d9a..5712818 = §3.1 files + the red files from 71530d1 only. Claude/Codex architect rubric text identical; architect-synth untouched. Headings kept (C-8).
Task Breakdown rows: unticked (detached host, rule 20; orchestrator ticks).
Note: a scoped glob mistake ran the whole suite briefly; killed; nothing written to the tree.
