# CR-043 — Developer Report

**Commit:** 8a98bbd  
**Status:** done  
**Tests:** 8 passed, 0 failed  
**Wall-clock:** ~12.7 min

## Files Changed

- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` — inserted §C.3 Spawn QA-Red block at L214; renumbered §C.3..§C.9 → §C.4..§C.10; updated cross-refs at L184/L241/L259 area; documented fast-lane skip rule for QA-Red
- `cleargate-planning/.claude/agents/qa.md` — generic prompt covers BOTH RED and VERIFY modes; explicit mode-dispatch contract; informal tool-permission split (no separate qa-red.md file per §0.5 Q8)
- `cleargate-planning/.claude/agents/developer.md` — added "Forbidden Surfaces" section listing `**/*.red.test.ts` + `**/*.red.node.test.ts` as immutable
- `cleargate-planning/.claude/hooks/pre-commit-surface-gate.sh` — extended 11-line stub with Red-immutability check BEFORE the exec line; `SKIP_RED_GATE=1` bypass with audit log
- `cleargate-cli/test/_node-test-runner.md` — added `*.red.node.test.ts` naming convention + Dev-immutability rule
- `cleargate-planning/MANIFEST.json` — auto-regenerated via prebuild
- `cleargate-cli/test/hooks/red-gate.node.test.ts` (NEW) — 4 scenarios: Dev rejection on `*.red.test.ts` diff, Dev untouched-passes, SKIP_RED_GATE bypass, QA-Red allowed
- `cleargate-cli/test/examples/red-green-example.node.test.ts` (NEW) — 2 scenarios sanity-checking the example fixture
- `cleargate-cli/examples/red-green-example/calculator.red.node.test.ts` (NEW) — sample Red test
- `cleargate-cli/examples/red-green-example/calculator.node.test.ts` (NEW) — sample Green test
- `cleargate-cli/examples/red-green-example/calculator.ts` (NEW) — sample impl
- `cleargate-cli/examples/red-green-example/README.md` (NEW) — pedagogical explanation referenced by Architect M-plans

## Notes

One deviation from M1 plan: when running `tsx --test` from inside another node:test runner process, Node 24 sets `NODE_TEST_CONTEXT=child-v8` which causes the child process to skip running tests (exits 0 regardless). The red-green-example test explicitly deletes this env var before spawning child tsx processes — this is the correct workaround.

CR-043 §4 acceptance text cites `test/fixtures/` but Architect M1 overrides to `examples/`; fixture landed at `cleargate-cli/examples/red-green-example/` per M1 ruling.

All §C cross-refs updated by literal string match (not line numbers, which shifted after the §C.3 insertion).

## Flashcards Flagged

- `2026-05-04 · #node-test #child-process · NODE_TEST_CONTEXT=child-v8 causes nested tsx --test invocations to skip silently (exit 0); delete env var in child process env to get real pass/fail.`
