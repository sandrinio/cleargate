## Failure-Step
Merge-lane step 4: post-merge unit suite (tip tree at cli main 0b5854e) shows one new failure that is in no baseline or rule-18 list.

## Failing test
test/cli.node.test.ts, "dist/cli.js does not contain direct node .cleargate/scripts invocations" (Scenario 4). Unit: 5661 tests, 5658 pass, 1 fail, 2 skipped. Fails when run alone too (deterministic, not a load flake). It passed in evidence/suite-after-STORY-066-17.txt.

## Cause
STORY-066-18 added the preflight stop hint "Run node .cleargate/scripts/record_baseline.mjs --probe to see why." (built into dist/cli.js line 16251), which matches /node\s+\.cleargate\/scripts\//.

## State
Merge 0b5854e left in place on cli main. Integration leg NOT run, no teardown, state not set to Done, no devops report, Task Breakdown not ticked. Targeted 13 files all green on 4368a53. Evidence: evidence/suite-after-STORY-066-18.txt (unit leg only).
