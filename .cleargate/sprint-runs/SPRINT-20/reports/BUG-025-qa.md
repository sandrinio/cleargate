QA: PASS | ACCEPTANCE_COVERAGE: 5 of 5 scenarios | MISSING: none | REGRESSIONS: none | flashcards_flagged: []

# BUG-025 QA Report

**Story:** BUG-025 PostToolUse Stamp Hook Duplicates `parent_cleargate_id`
**Agent:** qa
**Date:** 2026-05-02
**Commit:** 87be520
**Branch:** story/BUG-025
**Mode:** LIGHT (test re-run skipped per orchestrator instruction)

## Root-Cause Verification

Developer claim: defect in `.cleargate/scripts/backfill_hierarchy.mjs::spliceKeys()`, not the TS stamp-tokens handler named in the SDR.

**Verified CORRECT.** `git show 87be520 --name-only` shows zero TS source files modified (`cleargate-cli/src/**` untouched). The fix is entirely in `backfill_hierarchy.mjs`. SDR §2.3 audit-surface paragraph pointed at TS handlers as suspects but the bisection finding (script was the writer) is sound and the TS handlers required no change.

## spliceKeys() Two-Phase Logic

Read `.cleargate/scripts/backfill_hierarchy.mjs` (full). Phase 1 (lines 164–173): scans existing frontmatter lines; for each line matching `^parent_cleargate_id:` or `^sprint_cleargate_id:`, replaces in-place and sets `updatedParent`/`updatedSprint` flag. Phase 2 (lines 176–208): only inserts new lines for keys where the flag was NOT set (key was completely absent). Logic is correct. N invocations on a file with `parent_cleargate_id: null` will replace in-place each time — no duplicate is ever produced.

## Acceptance Criteria Coverage

**Scenario 1 — Producer-side fix (N=3 idempotency, single key, YAML clean):** Covered by `push-hierarchy.test.ts` line 481 ("BUG-025: Backfill idempotency — N=3 invocations"). Asserts `matches.length === 1` and `parseFrontmatter(afterContent)` does not throw.

**Scenario 2 — Corpus dedupe: duplicate removed (last wins):** Covered by `dedupe-frontmatter.test.ts` line 52.

**Scenario 3 — Corpus dedupe: N=3 stable (idempotent):** Covered by `dedupe-frontmatter.test.ts` line 78.

**Scenario 4 — Corpus dedupe: no-dup file byte-identical:** Covered by `dedupe-frontmatter.test.ts` line 112.

**Scenario 5 — Corpus dedupe: --dry-run prints without writing + multi-line dedup:** Covered by `dedupe-frontmatter.test.ts` lines 133 and 158.

## Corpus Pass Verification

Diff confirms exactly 4 files touched (CR-023, EPIC-024, BUG-024, SPRINT-17). Each shows removal of exactly one duplicate `parent_cleargate_id: null` or `sprint_cleargate_id: null` line and no other changes. BUG-025 itself has 4 grep hits for `^parent_cleargate_id:` but lines 84-86 are inside a fenced code block in §3.1 (intentional documentation of the bug) — only line 4 is actual frontmatter. All corpus files clean.

Non-corpus delivery files (BUG-025, CR-026, CR-029) show in-place null→sniffed-value replacements consistent with the producer fix running correctly during the commit.

## Order-of-Merge Invariant

Single commit (87be520). Producer fix and corpus dedupe are atomic — no risk that re-stamping could reintroduce dupes before dedupe ran.

## Mirror Parity

`cleargate-planning/.cleargate/scripts/dedupe_frontmatter.mjs`: EXISTS, `diff` confirms byte-identical to source. `cleargate-planning/.cleargate/scripts/backfill_hierarchy.mjs`: NOT present (correct — this script is repo-specific, not scaffold canon; bug spec does not require its mirroring).

## Off-Surface Check

13 files changed per `git show --stat`. All within scope: 2 scripts (`.cleargate/scripts/`), 2 test files (`cleargate-cli/test/`), 1 mirror (`cleargate-planning/`), 1 dev report (`.cleargate/sprint-runs/`), 7 delivery files (corpus dedupe + metadata). No TS src edits. No consumer-side changes. Scope matches bug spec §3.1 constraints.

## Typecheck / Tests

Trusted per LIGHT mode per orchestrator instruction. Developer reports: `npm run typecheck` clean; `VITEST_MAX_FORKS=1 vitest run` on affected suites: 18 passed, 0 failed. Pre-existing failures (bootstrap-root, doctor, hotfix-new) noted as unrelated to BUG-025.

## Verdict

SHIP IT. Root cause correctly identified and fixed in `backfill_hierarchy.mjs::spliceKeys()`. Two-phase replace-then-insert logic prevents duplicate frontmatter keys on N invocations. Corpus dedupe ran atomically in the same commit. All 5 acceptance scenarios have matching tests. Mirror parity confirmed. No off-surface edits. SDR §2.3 named the wrong suspect (TS handlers) but the developer's bisection reached the correct producer — the fix is sound regardless.
