# CR-120 Developer report (SPRINT-45)

role: developer. Commit `2e0d9bb` on `story/CR-120` (cli worktree). Typecheck pass; `prebuild` (Codex --check) pass.

## Tests (npm run test:file)
- subagent-ledger.red: 32 pass / 0 fail
- hooks-snapshots: 17/0; skill-md-serial-pointers.red: 3/0; no-inline-id-regex: 7/0; codex-sprint-execution-render.red: 3/0
- test_prep_reporter_context: 2/0; skill-md-conditional-architect.red: 18/0; portable-skills.red: 6/0; file-surface-gate-e2e: 19/0; reporter-content: 14/0
- No full suite (per dispatch). Known reds (rule 17) not run/touched.

## Changes
subagent-ledger.mjs (both C1 bodies + additive writeSubagentLedger), count_tokens.mjs (`measures`, `subagent`, human lines, warnings to stderr), ledger-digest.mjs (`LEDGER_MEASURES`), token-ledger.sh (`measures`), three whitelist rows, pre_gate_runner.sh (`pre-gate.jsonl`, `|| true`), SKILL.md paragraph verbatim, snapshot `token-ledger.cr-120.sh` by cp, `gen:codex` (changed only the two generated Codex files). No ID regex written.

## Real-run smoke (SPRINT-44, ledger source)
subagent.status measured, source ledger, sessions 1, dispatches 60, interrupted 0, warnings none; tokens total 104,243,371.
by_agent_type dispatches: architect 19, qa 15, devops 9, developer 8, architect-reader 4, cleargate-wiki-query 2, architect-synth 1, code-simplifier:code-simplifier 1, reporter 1. measures = orchestrator-window. The written subagent-ledger.jsonl was deleted; `git status --porcelain` for SPRINT-44 is empty.

## Notes
- Window applied by consumers to fallback only (per plan); ledger sessions read whole.
- Task Breakdown rows not ticked (rule 19).

## Integration
Merged cli main cd54e93 into story/CR-120 with no conflicts: merge commit `a6f3bc7` (brought in src/lib/pricing.ts, test/lib/pricing.node.test.ts). Worktree was clean first. `gen:codex` left no diff; prebuild, typecheck and build pass; `git status` clean after. Targeted files (the ten plus test/lib/pricing.node.test.ts): 135 pass, 0 fail.

### Re-integration
Merged cli main 169480e (BUG-133) into story/CR-120, no conflicts: merge commit `d2682b5`. `gen:codex` left no diff; prebuild, typecheck, build pass; tree clean. Targeted files plus upgrade-output red files and pricing: 164 pass, 0 fail. `portable-skills.red` failed 1 test once on the first run and then passed 6/6 on two reruns with no change (flaky, cause not found).
