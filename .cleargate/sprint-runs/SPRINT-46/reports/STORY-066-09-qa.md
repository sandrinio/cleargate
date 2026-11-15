role: qa
STORY: STORY-066-09
QA: PASS
TYPECHECK: pass (exit 0)
TESTS: red files 8/8 pass; test_prep_qa_context.sh 6/6; qa-content + gate-run integration 28/30 (2 fails = known reds); prebuild exit 0; gen:codex leaves no diff
ACCEPTANCE_COVERAGE: 5 of 5
MISSING: none
REGRESSIONS: none (qa-content slice parity = rule-18 known red; config.yml gates.precommit = baseline integration failure)
COMMANDS_RUN: typecheck 0; test:file reds 0; test_prep_qa_context.sh 0; integration files 1 (2 known reds only); prebuild 0
Real exercise: prep_qa_context.mjs on STORY-066-09 (no proof) -> commands.proof nulls; on a throwaway copy with proof_tier container + "## Proof" "make e2e" -> tier container, command "make e2e" (first line only). commands.typecheck/test null because canonical gate-checks.json qa.* are "" (spec: empty -> null), source gate-checks.json. Prose headings: ... Lane | Commands | Dev Handoff. lane.source default/state.json; no heuristic text in pack.
Surface: f846d9a..d23e62f = prep_qa_context.mjs, test_prep_qa_context.sh, qa.md, qa.toml, two red files. Dev commit d23e62f touches only prep_qa_context.mjs, qa.md, qa.toml (sealed reds untouched). qa.md edits confined to Mode: VERIFY, Pack-First Ingest, Playbook, Workflow, Output shape, Guardrails; Mode: RED untouched.
NOTES: none blocking. Task Breakdown rows unticked (detached host, rule 20).
