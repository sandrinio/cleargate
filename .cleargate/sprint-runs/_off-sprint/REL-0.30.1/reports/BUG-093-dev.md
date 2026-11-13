# BUG-093 dev report (U1)
STATUS: done. Commit: 19b7fa5 (on top of red eab49da), branch story/BUG-093.
Files: src/hosts/claude.ts (settings.json branch of mergeSurgeryTarget only).
Change: mergeSettings(removeClearGateHooks(ours), theirs) via deps; theirs with no/empty hooks -> removeClearGateHooks(ours) serialized; malformed either side -> return theirs.
Tests (all green, 0 fail): npm run typecheck; npm run test:file -- <f> for each of test/hosts/*.node.test.ts (9 files incl. claude-merge-surgery-settings.red, 7 pass) and test/commands/upgrade*.node.test.ts (10 files), non-integration.
Integration: scratch build of HEAD in /tmp/cgb.8Irt; CLEARGATE_BUILT_CLI=/tmp/cgb.8Irt/dist/cli.js npm run test:file -- test/commands/upgrade-user-hooks.red.integration.node.test.ts -> pass 1, fail 0.
Red tests not edited. No flashcards.
