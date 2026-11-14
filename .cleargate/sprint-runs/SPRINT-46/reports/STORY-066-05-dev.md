# STORY-066-05 dev report
role: developer
Commit on story/STORY-066-05: feat(EPIC-066): STORY-066-05 computed lanes
Typecheck pass. Targeted tests 55/55 pass (assign-lane.red, assign-lane-init-sprint.red.integration, test_dogfood_lane_fast, init-sprint-waves-v2.red.integration, waves-json-v2.red, no-inline-id-regex, codex-payload.red, gate-section-index-pinning). prebuild (codex --check) passes; only architect.toml regenerated.
cr078_init.test.sh: 26 pass / 13 fail, all live-vs-canonical parity or pre-existing template checks (G1/G2/G4/G5/G6, RULE1 parity, .active safety probe expecting SPRINT-34); real .active still SPRINT-46.
Notes: laneFor(signals, surface?) returns {lane, reason}; optional surface only enriches the reason.
