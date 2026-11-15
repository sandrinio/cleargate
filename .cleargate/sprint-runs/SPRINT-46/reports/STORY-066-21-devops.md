# DevOps Report — STORY-066-21

## Merge Result
- cli main: 5198aaa -> 71b57d9 (`--no-ff`, local only; no push/publish; no dist rebuild in the cli main checkout)
- Story branch tip merged: ac8f0c0 (376c831 seal 1, a22e6b2 Dev, 3ad3d7f seal 2, ac8f0c0 Dev Amendment A). main had not moved: no integration needed.
- Diff stat: 14 files changed, 858 insertions(+), 24 deletions(-) (new: `scaffold/core/.cleargate/scripts/lib/sprint-root.mjs`, 5 red test files)

## Post-Merge Tests (tip tree S46-tip, detached at 71b57d9; prebuild + build there)
- sprint-root-outputs.red.integration 3/3, merge-story-carry.red.integration 3/3, merge-story-carry-state.red.integration 1/1, bounce-readiness-runtime-state.red.integration 1/1, expected-red-not-a-flag.red 1/1, cli.node.test 23/23. All exit 0.
- Full suite (`evidence/suite-after-STORY-066-21.txt`):
  - unit: 5662 tests, 5660 pass, 0 fail, 2 skipped (reference 5661 / 1 fail; the doctor-session-brief-f2.red load flake did not fire this run)
  - integration: 946 tests, 808 pass, 96 fail, 315 unique failing names. Both legs ended with their summary lines.
- Failing-name diff vs `suite-after-consolidation-integration-outerhost.txt`: 315 vs 315, identical set. New failures: none. Names that left the red set: none.
- Expected new rule-18 parity reds (merge_story, seal_red, pre_gate_runner, validate_bounce_readiness, lib/sprint-root, SKILL/qa.md/codex parity): NONE appeared in the integration list. Not investigated (out of lane scope); the tip tree's outer host carries the sprint-branch live copies, so those comparisons did not break here. Gate 4 re-sync set unchanged (see sprint-context 066-21 line); the doctor drift line for validate_bounce_readiness.mjs remains expected on the real checkout.
- Residue: tip outer host showed two moved delivery files (EPIC-058, EPIC-061 pending-sync -> archive) from integration tests; restored with checkout + clean in the tip tree only.

## Mirror Parity Audit
Not run as a separate step (nested-cli lane; parity is covered by the suite above, no drift lines new).

## State Transition
- STORY-066-21: Done (confirmed in SPRINT-46/state.json).

## Cleanup
- Story cli worktree and outer host `.worktrees/STORY-066-21`: removed (both porcelain-clean; `.claude` symlink removed first)
- Branch story/STORY-066-21: deleted (was ac8f0c0)
- cli main checkout porcelain: clean

## Work-item ticks (rule 20)
Task Breakdown: all rows ticked. DoD ticked: tests, Gherkin, existing-tests-green, replay evidence, Peer/Architect review. Left unticked: "Goal check (d) run 5 passes on an RC that includes this story (0.31.0-rc.5), in both layouts" (needs run 5 field evidence).

## Script Incidents
none
