# BUG-134 QA-Verify (post-rework) — SPRINT-45
role: qa · worktree .worktrees/BUG-134/cleargate-cli @ f72138f

VERDICT: PASS

1. Scenarios: 5/5 (3 Examples rows -> reds 1a/1b/1c + integration 1; idempotent -> 2, integration 3; no-drop -> 3, 3b, 3c, 9b, integration 2). All reds pass: 1a,1a2,1b,1c,2,3,3b,3c,4,5,5b,6,7,8,9,9b,GUARD,10,11 + integration 1-3.
2. Red files untouched: `git diff 5d74393 4e6631a -- '*red*'` and `git diff ab0ffa6 26384c7 -- '*red*'` empty (also 4e6631a..f72138f stat empty).
3. typecheck pass. 15 files (both reds, commandless-hooks, host-adapter-contract, uninstall-per-host, upgrade-output x2, install/upgrade-state-parity, upgrade-field-path, init-host-parity, upgrade-user-hooks): 128 tests, 127 pass, 0 fail, 1 skip (init-host-parity scenario 14, env CLEARGATE_INIT_BASELINE unset).
4. Code review: PF-2 pairs only with same-key group holding a ClearGate hook or command equal to a theirs command; other ours groups go to the tail (user-only groups stripped of CG hooks only). PF-3 dedupe only for string commands. PF-1 event placement unchanged. Pure/deep-cloned, idempotent. Only claude.ts/codex.ts mergeSurgeryTarget call it; mergeSettings/install untouched (GUARD green).
5. Probes (scratchpad bug134-qa/probe.ts), all idempotent:
 a. SessionStart [user pre][CG][user post] -> [CG][pre][post] (user groups kept separate, after upstream; matches decision text/red 3b)
 b. user PostToolUse Bash[lint] + upstream Bash -> Edit|Write, Bash[ingest], Bash[lint] (not folded)
 c. CG Edit|Write [gate, prompt, prompt] -> both prompts kept
 d. user guard.sh inside CG group -> [gate, guard.sh] in place
 e. Stop first -> Stop stays first
6. Dispenser (scratch copies): HEAD 189bae7 -> no diff; 234e09f^ -> only added PostToolUse Bash group (post-shell-ingest.sh); event order Stop,SubagentStop,PreToolUse,PostToolUse,SessionStart; both idempotent.

Observation (not a defect): probe a moves a user group that preceded the ClearGate group to after it, per the bug's "user groups after upstream's groups" decision.
