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
