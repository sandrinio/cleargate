---
report_type: dev
story_id: CR-081
sprint_id: SPRINT-34
status: done
commit: pending
generated_at: 2026-06-04T00:00:00Z
---

# CR-081 Developer Report — QA-loop hardening: qa_red_lint + red-now-green DoD

## Summary

Implemented all five items from the M3 plan CR-081 blueprint:

- **A. qa_red_lint.mjs** (live + canonical mirror, byte-identical) — R-enum + R-query rules; scoped to red test files only (NOT `*.red.sh` harnesses). Exit 0 = clean; non-zero = flags to stderr.
- **B. pre_gate_runner.sh wiring** (live + canonical mirror, byte-identical) — check #5 in `run_arch()`, gated by `arch.qa_red_lint` config key (default true). Uses absolute paths + `grep -q` per flashcard guidance on cwd-leak + grep-count hazards.
- **C. gate-checks.json** (both copies) — `"qa_red_lint": true` added to `arch` block. CR-077 typecheck/test command differences intentionally preserved.
- **D. qa.md red-now-green clause** (canonical `cleargate-planning/.claude/agents/qa.md` only) — added to Workflow step 4 + coverage check in runtime lane. Canonical-only; live `/.claude/agents/qa.md` re-sync deferred to Gate-4 per Class-2 policy.
- **E. architect.md TPV note** (canonical only) — added note after "You DO NOT verify test logic correctness" line.
- **F. SKILL.md §C.3.5 qa_red_lint documentation** (canonical only) — documents that the lint runs as part of `pre_gate_runner.sh arch` and flags route back to QA-Red via `arch_bounces`.

## Verification

### Harness run: cr081_qa_red_lint.red.sh

```
bash .cleargate/scripts/test/cr081_qa_red_lint.red.sh
6 passed, 0 failed — exit 0
```

All 6 scenarios pass:
1. R-enum positive: exit non-zero + R-enum message names 'dark'
2. R-query positive: exit non-zero + R-query recommendation (queryAllByText/getByTestId)
3. Negative (no false positive): exit 0 on clean fixture
4. Negative NON-APPLICABLE (CRITICAL): exit 0 on plain node:test file
5. Wiring grep: 'qa_red_lint' found in pre_gate_runner.sh
6. qa.md red-now-green clause found

### Live-on-merge self-flag check: pre_gate scan exit 0

```
bash .cleargate/scripts/pre_gate_runner.sh arch . sprint/S-34
EXIT: 0
[PASS] qa_red_lint: no semantic fixture issues
```

CRITICAL verified: qa_red_lint does NOT scan `*.red.sh` bash harnesses. The CR-081 harness (`cr081_qa_red_lint.red.sh`) was NOT self-flagged. Exit 0 confirmed.

### Mirror diff

- `qa_red_lint.mjs`: IDENTICAL (live vs canonical)
- `pre_gate_runner.sh`: IDENTICAL (live vs canonical)
- `gate-checks.json`: only CR-077 typecheck/test command differences; `qa_red_lint: true` present in BOTH copies

### Class-2 deferred

- Live `/.claude/agents/qa.md` — NOT edited (Gate-4 deferred per Class-2 policy)
- Live `/.claude/agents/architect.md` — NOT edited (Gate-4 deferred)
- Live `/.claude/skills/sprint-execution/SKILL.md` — NOT edited (Gate-4 deferred)
- `npm run prebuild` mirror to `cleargate-cli/templates/` — deferred to Gate-4

## Files changed

| File | Class | Change |
|---|---|---|
| `.cleargate/scripts/qa_red_lint.mjs` | 3 (NEW) | R-enum + R-query rule engine |
| `cleargate-planning/.cleargate/scripts/qa_red_lint.mjs` | 3 (NEW, mirror) | byte-identical canonical mirror |
| `.cleargate/scripts/pre_gate_runner.sh` | 3 | check #5 qa_red_lint in run_arch() |
| `cleargate-planning/.cleargate/scripts/pre_gate_runner.sh` | 3 (mirror) | byte-identical canonical mirror |
| `.cleargate/scripts/gate-checks.json` | 3 | `arch.qa_red_lint: true` added |
| `cleargate-planning/.cleargate/scripts/gate-checks.json` | 3 (mirror) | `arch.qa_red_lint: true` added |
| `cleargate-planning/.claude/agents/qa.md` | 2 (canonical) | red-now-green clause + coverage note |
| `cleargate-planning/.claude/agents/architect.md` | 2 (canonical) | TPV note re: qa_red_lint |
| `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` | 2 (canonical) | §C.3.5 qa_red_lint documentation |
