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

## Amendment A verification

Mode: VERIFY. Worktree story/STORY-066-05 at 7fa70a3 (QA-Red cb5d98a, base 4d1fbb2).

- typecheck: pass (exit 0). prebuild: pass (exit 0).
- Targeted files (amend-a red, assign-lane red, init-sprint red integration, dogfood lane fast): 16 pass, 0 fail, 0 skipped.
- Surface: `git diff --name-only 4d1fbb2 7fa70a3` = `scaffold/core/.cleargate/scripts/assign_lane.mjs` + `test/scripts/assign-lane-amend-a.red.node.test.ts` only. Developer commit touches no test.
- Rule 4 trace: `laneFor` adds `if (s.scenarios === 0) return standard` after the three runtime checks (ui_surface, subsystems >= 2, proof_tier container|live) and before the `scenarios > 2` and `subsystems === 0` rules. Rule order unchanged; runtime still first; `subsystems == 0` rule intact. Header comment updated.
- Real run over Goal check (c) lists SPRINT-43..46 (script from this worktree, stdin closed), compared to evidence/goal-check-c/cg_SPRINT-4*.json: only BUG-088 and CR-120 changed (fast -> standard, scenarios 0). BUG-117 stays fast (2 scenarios). CR-121/CR-122 (0 scenarios, subsystems 2) stay runtime. All other items unchanged; item counts match (6/6/6/10).

Verdict: PASS.
