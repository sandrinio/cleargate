# BUG-133 r2 QA-Verify (SPRINT-45)
QA: PASS
- Red immutability: `git diff 60bd3a1 17c6c54 -- test/` = e89a249's 2-line re-scope only; 17c6c54 touches src/commands/upgrade.ts and src/init/detect-test-stack.ts only.
- typecheck: exit 0. dist built in the worktree.
- Tests (dist built): 200 pass / 0 fail across upgrade*, gate-commands-kept, install-state-parity, init-test-stack-detect (incl. upgrade-field-path and upgrade-user-hooks integration, which pass with dist built; so baseline cause = missing dist, no regression). Red file 6/6 pass.
- Diff: one fileOutcome would-change check shared by dry and real run (gatePlan param); renderGateChecks is the single serialiser for applyTestStack and projectGateChecks; plan computed in try/catch, fallback undefined = raw package comparison; writes to gate-checks.json and snapshot unchanged; label changes gated on GATE_CHECKS_REL, other files' labels unchanged.
- Hand run (scratch fixture, removed): Run 1 dry: no gate-checks line, "79 unchanged (not listed)"; --yes: "[always] 58 unchanged, 0 updated", file byte-identical (cmp). Run 2 (debug_patterns edit): dry "state=user-modified → overwritten, local edits lost"; --yes "[always] overwritten (local edits replaced): .cleargate/scripts/gate-checks.json".
- Note: init records the on-disk sha, not the package sha, in the snapshot; fixture set the package sha manually as instructed. Snapshot re-hash is out of scope (SC-7).
