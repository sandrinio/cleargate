# STORY-066-16 QA-Verify (role: qa, runtime lane) — integrated tree a8dc6a3

STORY: STORY-066-16
QA: PASS
TYPECHECK: pass (exit 0)
TESTS: scoped run, one file per call. 24 plan-Command-5/2 files + 2 shell tests. 23 of 24 node files fully green (0 fail, 0 skip). One red name, baseline (below). Shell: test_assert_story_files.sh 15/15; cr078_init.test.sh 26 PASS / 13 FAIL, names equal the plan's 13.
ACCEPTANCE_COVERAGE: 5 of 5 Gherkin scenarios have matching, passing tests
MISSING: none
REGRESSIONS: none
DEFECT_IN: n/a (PASS)

## Non-green names
- `close-sprint-reconcile.integration` "exits 0 when all stories are Done and Step 2.6 finds no drift": baseline (in `baseline-integration-failures-f846d9a.txt`; also failing in `suite-after-STORY-066-19.txt`, before this story). Not caused by 066-16.
- `cr078_init.test.sh` FAIL names = G1b, G1c, G2c-red-canonical-advisory, G4b, G4d, G5a, G5b, G5d, G6a, G6b, G6c, RULE1-init-script-parity, SAFETY VIOLATION: identical to the plan's 13 (run-from-scaffold/core path artefacts; RULE1 is also the rule-11 live-vs-canonical init_sprint.mjs drift). Live `.cleargate/sprint-runs/.active` = SPRINT-46 (sha fabc1d8d...) before and after.
- No rule-18 known red hit by this scoped set.

## Diff review
- `bf21e96..e5c8dd6` --stat: 5 non-test files (init_sprint.mjs, assign_lane.mjs, lifecycle-reconcile.ts, claude SKILL.md, core .agents SKILL.md) + 3 red files = §3.1 only.
- Seal e88d31b: exactly the three red files. Developer e5c8dd6: no test file.
- Integration a8dc6a3: `git diff 4da4927 a8dc6a3` = the story's own 8 files, 421+/15-; no file touched by the merge that main did not itself change.
- assign_lane.mjs: hunks only in header and the `assign` region (new export + delegating `assign`); `computeSignals`, `laneFor`, `surfaceOf` byte-unchanged (D-4/D-6).
- init_sprint.mjs: hunks = header, 2 imports, `findItemFile`, compute block placed before `if (!laneSourceFound)`, comment, `Lanes:` line. The raise-never-lower block and `--preserve-bounces` carry (`carry.lane ?? resolvedLane`) have no hunk.
- lifecycle-reconcile.ts matches plan R4 (LANE_NAMES, readFrontmatterLane, guarded rewrite before the archive move, widened cast at the :881 site only, JSDoc line).
- SKILL: A.3 `.active` paragraph and :166-:173 untouched. D-12 note text is exactly the specified replacement. A.4 tail paragraph last before `### A.5`. Core .agents SKILL carries the same text (U2 passes; codex render + prebuild-check tests green).

## Proof (evidence/STORY-066-16/kickoff-lanes.txt, run with bash on the canonical scripts from the worktree)
- P1: exit 0; `Lanes: STORY-901-01 fast (assign-lane-script), STORY-901-02 standard (...), STORY-901-03 runtime (...), STORY-901-04 standard (...)`; assign_lane cross-check identical; events.jsonl 4 lines.
- P2: `Updated STORY-901-02: lane="runtime", lane_assigned_by="human-override"`; events 5 lines; .active SPRINT-01.
- P3: second init exits 1 "state.json already exists ...; pass --force to overwrite"; state unchanged.
- P4: waves.json present: `STORY-901-01 runtime (sdr-lane-audit)`, others `standard (migration-default)`; nothing computed.
- No command in the transcript carries `--force`.
- B11 dist probe (worktree `dist/lib/lifecycle-reconcile.js`, built after the merge): `lane: "standard"`+state runtime -> `lane: "runtime"`; no-key story gains no key; `lane: "hotfix"` kept; bare `lane: fast` + state standard -> `lane: "standard"`.

## Adversarial probes (scratch only, removed)
- Id with no item file (STORY-901-77) and near-collision id STORY-901-1 vs file STORY-901-10: both `standard / migration-default`, exit 0, no new output (matchesId does not prefix-match).
- Computation throws (scratch copy of assign_lane.mjs patched to throw): `WARN: could not compute the lane of STORY-901-03: boom`, exit 0, item falls back to standard/migration-default, sibling still computed.
- §2.4 row below floor: `WARN: STORY-901-02 lane lowered to fast refused; computed standard`, `... STORY-901-03 lane lowered to standard refused; computed runtime`; floors stay. Row `turbo` (invalid): ignored, floor stays, no crash.
- Unreadable waves.json (D-1): treated as present, no computation, today's fallback + WARN, exit 0.
- Item only in archive/: found, computed `fast`.
- assign_lane.mjs CLI no args and missing path: exit 2, Usage on stderr, empty stdout.
- Story without `lane:` at close: no key added (dist probe, STORY-906-06).

## Gherkin -> code/tests
1. Init computes lanes without waves.json: init_sprint.mjs compute block; I1 (+I2 export) pass.
2. waves.json wins: `!fs.existsSync(wavesJsonPath)` gate; I3 + P4 pass.
3. §2.4 judged vs floor, 3 Examples rows: existing raise block; I4 pass; WARN only on the lowered row.
4. Archived story records the lane: L1/L2 + dist probe pass.
5. Playbook + Codex text: U1/U2 pass.

## Advisory
- Task Breakdown rows are unticked in the item file (detached host; orchestrator ticks at merge, rule 20). No bounce.
- Close 2.6d lane rewrite reaches live only after the Gate 4 dist rebuild (plan Risk); live `init_sprint.mjs`/`assign_lane.mjs` drift is a rule-11 known red starting at this merge.

## Script Incidents
none

flashcards_flagged:
  - "2026-11-15 · #qa #test-harness · init throw-path probe: patch the scratch copy of assign_lane.mjs computeSignals to throw; never edit the worktree"
