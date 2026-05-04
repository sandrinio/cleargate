# Red/Green TDD Example — ClearGate Calculator Fixture

This directory is a pedagogical fixture for the ClearGate Red/Green TDD workflow introduced in CR-043 (SPRINT-22). It lives **outside** `test/**` so `npm test` does NOT auto-run it.

## The Pattern

```
Architect → QA-Red → Developer → QA-Verify → Architect post-flight
```

1. **QA-Red dispatch** (SKILL.md §C.3): QA writes `*.red.node.test.ts` files against the story's §4 acceptance Gherkin — no implementation exists yet. Tests must FAIL at this point.
2. **Developer dispatch** (SKILL.md §C.4): Developer writes the implementation to make Red tests pass, then adds additional edge-case tests (`*.node.test.ts`). Developer is **forbidden from modifying** `*.red.node.test.ts` files.
3. **QA-Verify dispatch** (SKILL.md §C.5): QA confirms all tests pass and acceptance criteria are met.

## File Roles

| File | Author | Immutable? |
|---|---|---|
| `calculator.red.node.test.ts` | QA-Red | Yes — pre-commit hook rejects Dev edits |
| `calculator.node.test.ts` | Developer | No |
| `calculator.ts` | Developer | No |

## Running

```bash
# Red phase — run BEFORE implementation to see it FAIL
npx tsx --test cleargate-cli/examples/red-green-example/calculator.red.node.test.ts

# Green phase — run AFTER implementation; both should PASS
npx tsx --test cleargate-cli/examples/red-green-example/calculator.node.test.ts

# Run the entire example directory (both Red + Green)
npx tsx --test 'cleargate-cli/examples/red-green-example/*.node.test.ts'
```

## Pre-commit Enforcement

The pre-commit hook (`cleargate-planning/.claude/hooks/pre-commit-surface-gate.sh`) rejects any Developer commit on a story branch that stages modifications to `*.red.test.ts` or `*.red.node.test.ts` files, provided a `qa-red(STORY-NNN-NN):` commit already exists on the branch.

Bypass (with explicit human approval only): `SKIP_RED_GATE=1 git commit -m "..."`

## Reference

- `cleargate-planning/.claude/agents/qa.md` §Mode Dispatch — dispatch-text-driven RED vs VERIFY mode
- `cleargate-planning/.claude/agents/developer.md` §Forbidden Surfaces — immutability rule
- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` §C.3–§C.5 — full dispatch sequence
- `cleargate-cli/test/_node-test-runner.md` §Red/Green naming convention
