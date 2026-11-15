# DevOps Report — STORY-066-18

## Merge Result
- cli main merge 1: 0b5854e `merge(story/STORY-066-18)` (integration 4368a53 merged main into the story branch first).
- Post-merge regression: `test/cli.node.test.ts` Scenario 4 failed (dist/cli.js contained `node .cleargate/scripts/record_baseline.mjs --probe`, the preflight hint at `src/commands/sprint.ts:2007`). Deterministic, not a flake; in no baseline or rule-18 list.
- Fix: e780ad7 on `story/STORY-066-18`, one line, hint now `bash .cleargate/scripts/run_script.sh record_baseline.mjs --probe`.
- cli main merge 2: c15d105 `merge(story/STORY-066-18): ... post-merge fix` (--no-ff; 1 file, 1 insertion, 1 deletion). Precedent 066-05 00848ec.

## Targeted tests (tip tree at c15d105, prebuild + build)
- test/cli.node.test.ts 23/0
- test/commands/sprint-preflight-test-gate.red.node.test.ts 3/0
- test/commands/sprint-preflight.node.test.ts 27/0

## Post-merge full suite (evidence/suite-after-STORY-066-18.txt, both legs end with summary lines)
- Unit: 5661 tests, 5659 pass, 0 fail, 2 skipped.
- Integration: 938 tests, 800 pass, 96 fail, 7 skipped; 315 unique failing names.
- vs suite-after-STORY-066-17: failing-name set IDENTICAL. New rule-18 names: none. Names that left the red set: none.
- Regressions: none. (Expected parity reds for record_baseline/merge_story/prep_reporter_context/pre_gate_runner were already in the 315 set.)
- Tip tree residue: none found; restore run anyway (tip tree only).

## Mirror Parity
Live-vs-canonical drift is rule 11 / rule 18; not auto-fixed; Gate 4 re-sync carries it.

## State Transition
STORY-066-18 = Done (confirmed in state.json).

## Cleanup
- Story cli worktree and outer host `.worktrees/STORY-066-18`: removed (.claude symlink removed first).
- Branch story/STORY-066-18: deleted (was e780ad7).

## Task Breakdown (rule 20)
Ticked the nine remaining rows (record_baseline through the integrate/QA-Verify row). Left unticked: Goal check (d) run 3 (Gate/DoD boxes at the story's end and the run-3 Gherkin row) and the DoD boxes (Minimum tests, all scenarios, I3/regression list, gen:codex --check, Architect review) which QA/Architect/orchestrator own.
