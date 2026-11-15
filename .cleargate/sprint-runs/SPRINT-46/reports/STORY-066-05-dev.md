# STORY-066-05 dev report
role: developer
Commit on story/STORY-066-05: feat(EPIC-066): STORY-066-05 computed lanes
Typecheck pass. Targeted tests 55/55 pass (assign-lane.red, assign-lane-init-sprint.red.integration, test_dogfood_lane_fast, init-sprint-waves-v2.red.integration, waves-json-v2.red, no-inline-id-regex, codex-payload.red, gate-section-index-pinning). prebuild (codex --check) passes; only architect.toml regenerated.
cr078_init.test.sh: 26 pass / 13 fail, all live-vs-canonical parity or pre-existing template checks (G1/G2/G4/G5/G6, RULE1 parity, .active safety probe expecting SPRINT-34); real .active still SPRINT-46.
Notes: laneFor(signals, surface?) returns {lane, reason}; optional surface only enriches the reason.

## Post-merge fix

`scripts/clean-room/probe-items.mjs` `FAST_LANE_ROW` re-anchored to the new Sprint Plan Template §2.4 row (`| \`STORY-NNN-NN\` | fast | scenarios 1, subsystems 1 | — |`, em dash U+2014). Behaviour unchanged. Reds green: contract-first-dag-text + clean-room-evidence + sprint-init-fresh-install (72/72); assign-lane set 13/13; typecheck and prebuild clean. Remaining `one-line rationale` hit is unrelated template line 26 (Recommended priority changes), not the lane row.

## Amendment A (2026-11-15)

- Change: `assign_lane.mjs` only. New rule 4: `fast` needs `scenarios >= 1`; zero parsed scenarios returns `standard` with reason `scenarios: 0 (none parsed; never fast)` (runtime rules 1-3 still win first). Header comment updated.
- Tests (all green): assign-lane-amend-a.red 3/3, assign-lane.red 5/5, assign-lane-init-sprint.red.integration 3/3, test_dogfood_lane_fast 5/5. typecheck and prebuild clean.
- Real run: CR-120 -> standard (`scenarios: 0 (none parsed; never fast)`); BUG-117 -> fast (`fast: 2 scenarios, one subsystem (cleargate-cli/src), no risk signal`).
