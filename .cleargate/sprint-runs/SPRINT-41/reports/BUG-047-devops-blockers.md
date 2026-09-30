role: devops

# BUG-047 DevOps boundary hold

STATUS: historical hold resolved by authorized corrected launch verification. All three affected solo files pass 29/29; corrected full suite actually passes 3674 tests / 3672 pass / 0 fail / 2 skip, exit 0. See BUG-047-devops.md for final boundary evidence. The chronology below describes the temporary hold, not a current blocker.

## Failure-Step

CLI main merged cleanly at `c6d665656d886810faf31b8feb11f8ce2600ae79`, then the full suite actually completed exit 1: 3674 tests / 3655 pass / 17 fail / 2 skip, duration 435096.028375 ms. Failures are incident capture assertions in `test/helpers/wrap-script.red.node.test.ts`, `test/scripts/run-script-utf8-truncation.red.node.test.ts`, and `test/scripts/run-script-wrapper.red.node.test.ts`. The last file reran alone, actually exit 1: 18 tests / 8 pass / 10 fail.

## Launch diagnosis

The DevOps runner was invoked through the mandatory script wrapper. The runner unset ORCHESTRATOR_PROJECT_DIR, CLAUDE_PROJECT_DIR and CLEARGATE_REPO_ROOT before npm, but omitted RUN_SCRIPT_ACTIVE. The wrapper exports RUN_SCRIPT_ACTIVE=1 to children; its self-exemption guard executes nested commands without incident capture. These tests spread process.env into their fixture wrapper invocation. Both the full run and the solo rerun inherited that flag. This explains all observed missing incident assertions and is a DevOps launch error, not verified evidence of a source regression. BUG-047's four-file change contains no wrapper source.

Exact invocation: `ORCHESTRATOR_PROJECT_DIR=/Users/ssuladze/Documents/Dev/ClearGate bash /Users/ssuladze/Documents/Dev/ClearGate/.cleargate/scripts/run_script.sh bash /private/tmp/cg-s41-devops047-suite-20260930.sh`. Retained session 31385 reached terminal exit 1. Solo used `/private/tmp/cg-s41-devops047-solo-20260930.sh`, session 39399 reached terminal exit 1. No early yield was counted as completion.

## Preserved state

Wrapped QA Passed and Architect Passed transitions completed. State remains Architect Passed. No Rule-14 restoration, BD, Done transition, teardown, source/test edit, push, install, publish or close occurred. Both worktrees and branches remain. Outer back-sync writes are retained pending recovery. Preclean delivery and MANIFEST were proven before the run; unrelated state/events modifications, integration logs, BUG-102 report and CLI untracked `cleargate-0.25.0.tgz` preserved. Both template views were copied before merge.

## Evidence

Durable evidence: `/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/devops-BUG-047-20260930/`, including suite.log, suite.exit, suite.started, suite.completed, failing-file-solo.log and failing-file-solo.exit. Manual enforcement only; usage metering unavailable. The failed wrapped runs create genuine wrapper incident records, to be enumerated in the final recovery report.
