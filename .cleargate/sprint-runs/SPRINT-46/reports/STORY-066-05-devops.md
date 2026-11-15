# DevOps Report — STORY-066-05 (BLOCKED at merge-lane step 4)

role: devops

## Merge Result
- cli main before: b7aa7e7. Integration (story wt, `merge --no-ff main`): 107e0ef, clean, no conflicts.
- After integration: `gen:codex` left no diff; prebuild OK; typecheck clean.
- Merge into cli main: 18cbdd4 (`merge(story/STORY-066-05): STORY-066-05 computed lanes`). LEFT IN PLACE (local only, no push, no dist build in cli main).

## Targeted tests (story wt, integrated tree) — 38/41 pass
- assign-lane.red, assign-lane-init-sprint.red.integration, test_dogfood_lane_fast, init-sprint-context.red, init-sprint-waves-v2.red.integration, seal-red.integration (07, green), test_update_state.integration.
- 3 failures, all in test_update_state.integration Scenarios 2 and 5 (swapped assert args): listed in baseline-integration-failures-f846d9a.txt -> baseline, not regression.

## Post-merge suite (tip tree at 18cbdd4) — evidence/suite-after-STORY-066-05.txt
- Unit: 5570/5575 pass, 3 fail. Integration: 756/880 pass, 82 fail (125 unique failing names incl. parents).
- Integration failures not in baseline: 5a, 5b, "Capability Surface + Pack-First Ingest + Lane-Aware Playbook ... live vs canonical" (rule-11 parity, architect/skill live copy; treated as known red class, owner to confirm), S1c, Sprint Plan Template live===mirror, template story.md live===mirror / preamble, T4, T5 (parity), Test 27, enforcement.md byte-identical x4, canonical twin vs outer live. All known reds (rule 11/18).

## REGRESSIONS (not in baseline, not in rule-18 lists)
1. test/docs/contract-first-dag-text.red.node.test.ts "T5b (anchor): the three declareProbeSprint template anchors survive" (unit; fails alone too).
2. test/scripts/clean-room-evidence.red.node.test.ts "E5-5" and "E5-6 (TPV R-E5)" (unit; fail alone).
3. test/e2e/sprint-init-fresh-install.red.integration.node.test.ts "I1 [red]" and "I2 [red]": `probe-items: anchor not found: fast-lane row`.
Root cause: 05 changed the Sprint Plan Template fast-lane row from
`| \`STORY-NNN-NN\` | fast | <one-line rationale> |` to `| \`STORY-NNN-NN\` | fast | scenarios 1, subsystems 1 | — |`.
`scripts/clean-room/probe-items.mjs` `declareProbeSprint` (line ~118) and the sealed reds above pin the old anchor. Per sprint-context rule 16, sealed earlier-sprint reds are edited in a QA-Red commit, not the Developer's; probe-items.mjs is a script that needs a Developer/orchestrator decision (re-anchor to the new row text, or keep the old row text in the template).

## Not done (blocked)
- Teardown, `update_state Done`: NOT run. Story worktrees and branch story/STORY-066-05 remain. 
- Tip tree clean (porcelain empty).

## Proof
- Sprint plan §1 proof ("real run assign_lane.mjs over SPRINT-43..46 and dispenser_adapter SPRINT-04"): QA-Verify's real run on 066 items is in reports/STORY-066-05-qa.md. The full run over past sprints is Goal check (c), done by the orchestrator after the tenth merge.

## Script Incidents
none

## Second pass (post-merge fix re-merge) — DONE

role: devops

- Fix commits on story/STORY-066-05: QA-Red e3b89c9 (two sealed literals re-anchored, rule 16), Developer f2ebd41 (`scripts/clean-room/probe-items.mjs` FAST_LANE_ROW re-anchored).
- Integration (main 18cbdd4 was not an ancestor): story-wt merge 9880fec, clean, no new content; gen:codex left no diff, prebuild OK, typecheck clean.
- Targeted (6 files: contract-first-dag-text.red, clean-room-evidence.red, sprint-init-fresh-install.red.integration, assign-lane.red, assign-lane-init-sprint.red.integration, test_dogfood_lane_fast): 85/85 pass.
- Merge into cli main: 00848ec (`merge(story/STORY-066-05): STORY-066-05 post-merge fix — re-anchor probe-items fast-lane row`). Local only, no push, no dist build in cli main.
- Suite (tip tree at 00848ec, evidence/suite-after-STORY-066-05-fix.txt): unit 5573/5575 pass (2 skipped, 0 fail); integration 758/880 pass, 80 fail.
- Classification: diff of failing names vs first-pass suite: fixed = T5b, E5-5, E5-6, I1, I2 (plus parents E5, BUG-090 (b) e2e); new failures = none. Every remaining failure was already present in the first pass (baseline lists or rule-18 known reds: canonical-live parity 5a/5b/S1c, template-stubs, T4/T5, Test 27, enforcement.md byte-identical, qa-content Capability Surface + CR-024 S2 Scenario 6). No regressions. Note: the first unit/integration run was split because the `====` separator broke the shell; unit result is in the file's first part, integration after `#### INTEGRATION ####`.
- Tip tree residue (moved delivery files) cleaned with checkout/clean in the tip tree only.
- Teardown: both porcelains empty; cli worktree and outer host removed; `.claude` symlink removed; branch story/STORY-066-05 deleted (was 9880fec). cli main porcelain empty.
- State: STORY-066-05 = Done (state.json confirmed).
- Proof: reports/STORY-066-05-qa.md real run; full past-sprint run is Goal check (c) after the tenth merge.

## Script Incidents
none

## Third pass — Amendment A (zero parsed scenarios is never `fast`)

- Integration: cli main had moved to 75fe664 (11 merged); `merge(main)` into story/STORY-066-05 = 33f62a2, clean (5 files, wave_runner additions only). `gen:codex` left no diff; prebuild + typecheck clean.
- Targeted (post-integration, all pass): assign-lane-amend-a.red 3/3, assign-lane.red 5/5, assign-lane-init-sprint.red.integration 3/3, test_dogfood_lane_fast 5/5, wave-runner.red 7/7.
- Merge SHA on cli main: e006598 (`merge(story/STORY-066-05): STORY-066-05 amendment A — zero parsed scenarios is never fast`; 2 files, +86/-2: assign_lane.mjs, amend-a red test). Local only; no push, no dist build in main.
- Tip-tree suite (evidence/suite-after-STORY-066-05-amend-a.txt): unit 5606/5608 pass, 0 fail (post-11 tip: 5603/5605, 0 fail; +3 = new amend-a tests); integration 771/899 pass, 86 fail, identical to post-11 tip (771/899/86). Failing-name diff vs suite-after-STORY-066-11.txt: no new names. Regressions: none. Load flakes: none.
- Teardown: story cli wt, outer host and tip tree porcelain empty; cli wt removed, `.claude` symlink removed, outer host removed, branch story/STORY-066-05 deleted (was 33f62a2).
- State: STORY-066-05 was already Done; `update_state.mjs ... Done` returned "No-op: already in state Done" (rc 0). Still Done.
- Proof: QA's real-run evidence (QA report "## Amendment A verification": PASS) shows only BUG-088 and CR-120 change lane under the amended rule.
