# CR-120 QA-Verify (SPRINT-45) — PASS

Worktree .worktrees/CR-120/cleargate-cli, tip a6f3bc7 (red 5980b01, dev 2e0d9bb, merge of cd54e93).

1. Acceptance mapping: all six CR section 4 assertions map to passing tests in subagent-ledger.red.node.test.ts (32/32): per-dispatch rows incl. workflow runs (run_id, workflow_phase); duplicate message.id counted once and meta-only copy skipped; interrupted -> completed:false; missing subagents/ -> warning, exit 0, "not measured"; discoverSessions via ledger transcript and via window fallback; token-ledger rows carry measures. Also covered: ledger-digest label, pre-gate.jsonl lines (exit-preserving), whitelist rows, SKILL.md paragraph incl. Codex copy.
2. `git diff 5980b01 2e0d9bb -- '*red*' test/fixtures/subagent-ledger` is empty. No red weakened. (hooks-snapshots and serial-pointers edits are in the red commit itself, per C-1; Dev did not touch tests.)
3. C1: discoverSessions(sprintDir, opts={}) and readDispatches(sessionDirs, opts={}) are synchronous, same names/params as e1e8ad0; row shape matches the frozen typedef (verified on emitted row). One additive export, writeSubagentLedger — no rename or retype.
4. Typecheck pass. Targeted files: subagent-ledger.red 32, hooks-snapshots 17, skill-md-serial-pointers.red 3, no-inline-id-regex 7, codex-sprint-execution-render.red 3, test_prep_reporter_context 2, skill-md-conditional-architect.red 18, portable-skills.red 6, file-surface-gate-e2e 19, reporter-content 14 = 121 pass, 0 fail, 0 skip. hooks-snapshots and Test 20 pass. Known reds (parity 5d, mirror :216-246) not run.
5. Diff cd54e93..a6f3bc7 stays within the CR surface plus the three whitelist rows and the codex copies. `npm run gen:codex` leaves `git status --porcelain` empty. Hook change is one jq-object field (`measures`) in the row constructor; computation untouched, no new exit path. pre_gate_runner block wrapped in `{ ... } || true`, uses `${flagged[@]+...}` (set -u safe), and the guard test confirms scan exit is unchanged.
6. Manual run (synthetic fixtures copied to scratchpad/cr120-qa, CLEARGATE_SPRINT_DIR pointed there): `count_tokens.mjs SPRINT-X --json` exit 0; output keeps old keys, adds "measures":"orchestrator-window" and subagent{status:"measured", sessions:2, dispatches:6, interrupted:2, tokens total 513 (in 52/out 32/cr 359/cc 70)}; subagent-ledger.jsonl 6 rows. No real sprint-runs dir written.
7. DoD: Task Breakdown rows are unticked in the item file; per rule 19 the orchestrator ticks them at merge (advisory). Edits are canonical only, no live-copy changes.

Findings: none blocking.
