# DevOps Report — CR-120 (SPRINT-45)

## Merge Result
- cli main: 169480e -> 681cb7c (clean and at the expected tip before merge)
- story/CR-120 (d2682b5) merged `--no-ff`, local only, no push.
- Diff stat: 31 files changed, 1740 insertions(+), 37 deletions(-)

## Post-Merge Verification
Throwaway detached worktree at 681cb7c (node_modules symlinked): prebuild, typecheck and build all exit 0. TMPDIR=/private/tmp/s45t-cr120.
Full `npm test` (default runner; it excludes `*.integration.node.test.ts`): 5450 tests, 5447 pass, 1 fail, 2 skipped.
- The one failure: `missing expectSha => 422 and zero handler calls` (test/dashboard/plan-endpoint.red.node.test.ts), `connect EADDRNOTAVAIL 127.0.0.1` (ephemeral-port exhaustion). 24/24 pass alone. FLAKE, not a CR-120 defect.
- The BUG-133 flake (init-fixture-cleanup.red ENOTEMPTY) did not recur. No baseline-list failures appeared either.
- hooks-snapshots: 17/17 pass. skill-md-serial-pointers.red (test/scaffold/): 3/3 pass, including Test 20. subagent-ledger.red: 32/32 pass. portable-skills.red: 6/6 pass (no flake).
- Known reds (rule 17) live in integration files, which the default suite skips. I ran them directly in the throwaway tree, where "live" paths do not resolve to the meta-repo live files, so their results there do not reflect real live-vs-canonical drift:
  - canonical-live-parity.red.integration: 5 fail / 6 pass (5a, 5b and three script-parity cases); not the 5d the brief named.
  - sprint-execution-mirror.integration: 1 fail (Scenario 7 / the diff-against-canonical-copy check), the expected :216-246 known red.
  Treat these as indicative only. I did not run them in the meta-repo tree.
Failure list: evidence/suite-after-CR-120.txt
NEW_FAILURES: 1 flake, 0 regressions.

## Mirror Parity
Changed canonical files vs live mirror (live NOT touched, rule 9):
- scaffold/core/.cleargate/scripts/count_tokens.mjs: live differs
- scaffold/core/.cleargate/scripts/lib/ledger-digest.mjs: live differs
- scaffold/core/.cleargate/scripts/pre_gate_runner.sh: live differs
- scaffold/core/.cleargate/scripts/surface-whitelist.txt: live differs
- scaffold/core/.cleargate/scripts/subagent-ledger.mjs: new, no live copy
- scaffold/hosts/claude/.claude/hooks/token-ledger.sh: live differs
- scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md: live differs
- scaffold/core/.agents/skills/sprint-execution/SKILL.md and scaffold/hosts/codex/.codex/hooks/token-ledger.sh: generated codex companions, no live mirror
Live re-sync deferred to after the dispenser_adapter verdict (rule 9).

## State Transition
Architect Passed -> Sprint Review -> Done, confirmed in state.json (qa_bounces 0, arch_bounces 0).

## Cleanup
- Throwaway verify worktree: node_modules unlinked, removed; TMPDIR removed.
- Item cli worktree and outer host: both `git status --porcelain` empty; symlinks removed; both worktrees removed.
- Branch story/CR-120 deleted (was d2682b5). contract/S-45-ledger kept.
- cli main checkout clean at 681cb7c. No dist rebuild, no push.

## Script Incidents
None.
