
## Post-merge fix

Commit e780ad7 on story/STORY-066-18: src/commands/sprint.ts:2007 probe hint now reads "Run bash .cleargate/scripts/run_script.sh record_baseline.mjs --probe to see why." (cli.node.test Scenario 4 regression).
Typecheck clean; dist grep for "node .cleargate/scripts/" = 0.
- test/cli.node.test.ts: 23 pass, 0 fail
- test/commands/sprint-preflight-test-gate.red.node.test.ts: 3 pass, 0 fail
- test/commands/sprint-preflight.node.test.ts: 27 pass, 0 fail
