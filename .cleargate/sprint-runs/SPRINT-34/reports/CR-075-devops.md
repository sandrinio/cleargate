# DevOps Report — CR-075

## Merge Result
- Sprint branch: N/A (CLI-repo local merge — outer repo has no CR-075 changes)
- Story branch: story/CR-075 (cleargate-cli repo)
- Merge target: cleargate-cli `main`
- Merge commit SHA: `dcd5ecd`
- Diff stat: 36 files changed, 206 insertions(+), 7 deletions(-)
- New files: `.nvmrc`, `scripts/run-default-tests.mjs`, `test/cr075-standalone-contract.node.test.ts`
- Renames: 32 integration-tier test files renamed from `*.node.test.ts` → `*.integration.node.test.ts`

## Post-Merge Tests
- Test files run: `test/cr075-standalone-contract.node.test.ts`
- Result: 6 passed, 0 failed
- Exit code: 0
- Workspace grep: `grep -rn "workspace=cleargate-cli" cleargate-cli/test` — zero production hits (only hits are within the contract test file itself, self-excluded by `--exclude=${THIS_FILE}`; confirmed by Scenario 1 pass)
- Contract scenarios verified:
  - Scenario 1: No workspace=cleargate-cli shells in test/ PASS
  - Scenario 2: test:integration script exists in package.json PASS
  - Scenario 3: Default test script excludes integration tier via negation glob PASS
  - Scenario 4: .nvmrc pins Node 24 PASS
  - Scenario 5: changelog-format uses in-package npm pack (no --workspace= flag) PASS
  - Scenario 6: At least one integration-tier file tagged @cleargate-tier: integration exists PASS

## Mirror Parity Audit
- CR-075 is a CLI-repo-only story. All changed files are inside `cleargate-cli/` (a gitignored own-repo path). No canonical↔npm-payload mirror surfaces were touched by this story. Mirror parity check: N/A — no cleargate-planning mirror files in scope.

## Gate-4 Carry-Overs (noted for owner)
1. **dist rebuild deferred:** `npm run build` was NOT run per dispatch instruction ("dist rebuild DEFERRED to Gate-4"). The dist/ output reflects pre-CR-075 state until Gate-4 triggers a full build.
2. **22 class-P residual failures:** QA documented 22 pre-existing class-P test failures (protocol-section-*, template-*, version-bump-alignment, etc.) in `CR-075-qa.md`. These are not introduced by CR-075; they were present before this story and are tracked as a follow-up CR for the EPIC-043 owner. They do NOT block this merge.

## Script Incidents
- Incident file: `.cleargate/sprint-runs/SPRINT-34/.script-incidents/20260604T021356Z-e8b567d657e2.json`
- Cause: `run_script.sh` invoked `update_state.mjs` without the `CLEARGATE_STATE_FILE` env var in scope (wrapper strips shell environment). Exit code 1.
- Recovery: Direct invocation with explicit `CLEARGATE_STATE_FILE=...` prefix succeeded immediately after. State transition confirmed Done in `state.json`.
- Note for EPIC-043 / ClearGate hygiene: `run_script.sh` should forward env vars (or accept `KEY=VAL` prefixes) to avoid this class of failure. Recommend a follow-up CR.

## State Transition
- Story state: Done (confirmed via state.json — `stories.CR-075.state === "Done"`)
- Transitioned at: 2026-06-04T02:13:56Z

## Cleanup
- Worktree: N/A — CR-075 used main cli checkout branch (no worktree to remove)
- Branch story/CR-075: deleted (`git -C cleargate-cli branch -d story/CR-075` — was 880de75)
