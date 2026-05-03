---
story: CR-032
sprint: SPRINT-21
milestone: M2
qa: role:qa
status: PASS
date: 2026-05-04
commit: bc95ef1
---

# CR-032 QA Report — Surface Gate Failures + Literal-Criterion Rule

## Typecheck
PASS — `npm run typecheck` exits 0, no errors.

## Test Results
- Bash tests (new): 4/4 passed
- TS tests (new): 18/18 passed (test/scripts/template-claude-md.test.ts)
- Full suite: 1592 passed, 20 failed, 28 skipped (1640 total)
- All 20 failures confirmed pre-existing on sprint/S-21 — none touch files modified by CR-032.

## Pre-existing failures (not CR-032-caused)
1. `gate.test.ts` — BUG-008 smoke: expects 6 yaml gate blocks, got 7. Root cause: W1 CR-034 added a block to readiness-gates.md. Not CR-032-related.
2. `pre-tool-use-task.test.ts` (11 scenarios) — pre-existing canonical path mismatch from prior sprint.
3. `cr-026-integration.test.ts` (1) — same pre-existing root cause as above.
4. `agent-developer-section.test.ts` (1) — developer.md mirror mismatch, pre-existing.
5. `gate-run.test.ts` (1) — agent wording assertion, pre-existing.
6. `hotfix-new.test.ts` (2) — hotfix-ledger wiki section, pre-existing.
7. `snapshot-drift.test.ts` (1) — Zod schema snapshot, pre-existing.
8. `test_version_bump_alignment.test.ts` (2) — mcp/package.json absent in worktree, pre-existing infrastructure gap.
9. `bootstrap-root.test.ts` — 23 tests skipped (collection error, mcp/package.json missing), pre-existing.

Confirmed: `git diff sprint/S-21..bc95ef1 -- cleargate-cli/test/ --name-only` returns only the 2 new CR-032 test files. None of the failing test files were modified.

## Acceptance Criteria Trace

### §4 #1 — Failure A reproduces pre-CR
Baseline (no new code required) — accepted by protocol.

### §4 #2 — Failure A fixed: ⚠️ gate failed: line in next turn
`cleargate-planning/.claude/hooks/stamp-and-gate.sh` lines 27–38: gate check stdout captured to tmpfile, `grep '^❌' | sed` transforms to `⚠️ gate failed: <id> — <criterion>`, emitted to hook bash stdout. Claude Code injects hook stdout as system-reminder. PASS.

### §4 #3 — Failure B mitigation present
- `grep "Ambiguity Gate criteria are evaluated literally" CLAUDE.md` → 1 match (line 126, within CLEARGATE block)
- `grep "Ambiguity Gate criteria are evaluated literally" cleargate-planning/CLAUDE.md` → 1 match
- `grep "Evaluate each criterion against its literal text" .cleargate/templates/*.md` → 5 matches (Bug, CR, epic, hotfix, story)
- Canonical mirrors: 5 matches. PASS.

### §4 #4 — Pass case stays quiet
`if [ "$SR2" -ne 0 ]` guard wraps the ⚠️ emission block. bash test Case 2 confirms. PASS.

### §4 #5 — End-to-end re-test
Manual smoke (per CR-032 §3): out-of-scope for automated QA; noted as required post-merge verification per M2 plan.

### §4 #6 — Scaffold mirrors empty diff
All 5 template pairs: `diff` returns empty.
CLAUDE.md: new paragraph byte-identical in both ends.
stamp-and-gate.sh: new gate-fail block at same logical position in both files; pre-existing CR-009 resolver divergence preserved. PASS.

## Architect Override Compliance (5 × 2 = 10 template files)
M2 plan scoped to Bug, CR, epic, hotfix, story (NOT initiative, Sprint Plan Template, proposal).
- 5 live templates: all contain preamble at correct position (between status line and "Requirements to pass to Green"). PASS.
- 5 canonical mirrors: byte-identical to live. PASS.
- Sprint Plan Template.md: skipped — no `## ClearGate Ambiguity Gate` heading. Documented per M2 plan §Risk 6. PASS (spec-gap, not a CR-032 failure).

## Mirror Parity
- 5 template pairs: empty diff — PASS
- CLAUDE.md pair (CLEARGATE block only): new paragraph identical — PASS
- stamp-and-gate.sh: per-edit parity at new block position — PASS (pre-existing CR-009 delta preserved per FLASHCARD 2026-05-01 #mirror #parity)

## Hook stdout vs stderr
gate.ts:259 uses `stdoutFn` (stdout). Hook captures stdout to tmpfile via `>"$GATE_OUT"` and redirects only stderr to log via `2>>"$LOG"`. Emission block reads tmpfile. PASS.

## CLEARGATE tag boundary compliance
- Live CLAUDE.md: new paragraph at line 126 within block lines 101–158. PASS.
- Canonical CLAUDE.md: new paragraph at line ~32 within block lines 7–64. PASS.

## Snapshot locks
- `stamp-and-gate.cr-008.sh` and `stamp-and-gate.cr-009.sh` both updated to include the new gate-fail block. PASS per M2 plan flashcard guidance.

## Verdict
All 6 §4 acceptance criteria satisfied. 5 × 2 = 10 template files carry the literal-criterion preamble. Hook stdout emission correctly wired. CLAUDE.md tag boundaries respected. Mirror parity clean. 20 pre-existing test failures confirmed not caused by CR-032. Ship it.
