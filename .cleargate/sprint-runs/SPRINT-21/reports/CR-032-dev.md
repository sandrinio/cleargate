---
story: CR-032
sprint: SPRINT-21
milestone: M2
developer: role:developer
status: done
date: 2026-05-03
---

# CR-032 Developer Report — Surface Gate Failures + Literal-Criterion Rule

## Summary

Implemented all CR-032 changes per M2 plan blueprint. The stamp-and-gate hook now emits `⚠️ gate failed: <id> — <criterion>` lines to stdout (injected as system-reminders by Claude Code) when `cleargate gate check` exits non-zero. CLAUDE.md received the literal-rule paragraph forbidding interpretive substitution at the Ambiguity Gate. All 5 templates with an Ambiguity Gate footer received the literal-criterion preamble.

## Changes

### Hook (stamp-and-gate.sh)
- `cleargate-planning/.claude/hooks/stamp-and-gate.sh` — added CR-032 gate-fail emission block. Gate check now captures stdout to a tmpfile; on non-zero exit, each `❌` line is transformed to `⚠️ gate failed: <id> — <criterion>` and emitted to bash stdout. Uses portable `grep '^❌' | sed` pattern (BSD awk workaround per M2 plan §Risk 3).
- Pre-existing live↔canonical resolver divergence (CR-009 three-branch on canonical, two-branch on live) preserved per M2 plan; only the new gate-fail block was added at the same logical position in both.

### CLAUDE.md
- Both `CLAUDE.md` (live) and `cleargate-planning/CLAUDE.md` (canonical) received the **Ambiguity Gate criteria are evaluated literally** paragraph inserted before `**Brief is the universal pre-push handshake.**`.

### Templates (5 × 2 mirrors)
- `Bug.md`, `CR.md`, `epic.md`, `hotfix.md`, `story.md` in both `.cleargate/templates/` and `cleargate-planning/.cleargate/templates/` — each received the `*Evaluate each criterion against its literal text...*` preamble inserted between the status line and `Requirements to pass to Green`.
- `Sprint Plan Template.md` skipped — no `## ClearGate Ambiguity Gate` heading in body per M2 plan §Risk 6.

### Snapshot locks updated
- `cleargate-cli/test/snapshots/hooks/stamp-and-gate.cr-009.sh` — updated to include new gate-fail block (per M2 plan Flashcard guidance on snapshot locks).
- `cleargate-cli/test/snapshots/hooks/stamp-and-gate.cr-008.sh` — updated to match cr-009 (test asserts byte-identity).

### New tests
- `cleargate-cli/test/scripts/test_stamp_and_gate.sh` — 4 bash scenarios: failing gate emits ⚠️ lines, pass case stays quiet, detail preservation, ID extraction.
- `cleargate-cli/test/scripts/template-claude-md.test.ts` — 18 TS scenarios: literal-rule presence in both CLAUDE.md ends, preamble in 5 live + 5 canonical templates, CLAUDE.md mirror parity, and 5-template live/canonical byte-identity.

## Test Results

- Bash tests: 4/4 passed
- TypeScript tests (new): 18/18 passed
- init.test.ts (snapshot): 23/23 passed (previously failing snapshot fixed)
- Pre-existing failures (20): unrelated to CR-032 — gate.test.ts:638 expects 6 yaml blocks in readiness-gates.md but file has 7 (updated in W1); pre-tool-use-task.test.ts failures are pre-existing from canonical path mismatch.

## Mirror parity

- All 5 template pairs: `diff` returns empty — verified.
- CLAUDE.md new paragraph: byte-identical in live and canonical — verified.
- stamp-and-gate.sh new block: same logical position in both files — verified.

## Sprint Plan Template

Skipped — no `## ClearGate Ambiguity Gate` heading found. Surface as Spec-Gap if needed.
