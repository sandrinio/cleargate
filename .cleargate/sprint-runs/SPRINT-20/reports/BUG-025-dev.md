# BUG-025 Dev Report

**Story:** BUG-025 PostToolUse Stamp Hook Duplicates `parent_cleargate_id`
**Agent:** developer
**Date:** 2026-05-02

## Root Cause

The defect lives in `.cleargate/scripts/backfill_hierarchy.mjs`, specifically the `spliceKeys()` function. The idempotency check skipped a file only when BOTH `parent_cleargate_id` and `sprint_cleargate_id` were non-null. When `parent_cleargate_id: null` was present (from a prior template stamp), the script treated the key as "unset" and sniffed a value from `parent_ref`. The `spliceKeys()` function then **inserted** a new line after the `parent_ref:` anchor rather than **replacing** the existing null line, producing a duplicate:

```yaml
parent_ref: "SPRINT-19 close pipeline..."
parent_cleargate_id: "SPRINT-19 close pipeline..."   ← INSERTED
parent_cleargate_id: null                             ← EXISTING (not removed)
```

This caused `parseFrontmatter` (js-yaml CORE_SCHEMA) to throw `duplicated mapping key` on any subsequent consumer call, including the lifecycle reconciler and gate predicates.

## Fix Applied

**File 1: `.cleargate/scripts/backfill_hierarchy.mjs`**
- Rewrote `spliceKeys()` as a two-phase function:
  - Phase 1: In-place replacement — scan for existing `parent_cleargate_id:` and `sprint_cleargate_id:` lines and replace them with the new value.
  - Phase 2: Insert-new — only insert a new line if the key was completely absent (not found in Phase 1).
- This ensures N invocations on a file with `parent_cleargate_id: null` will replace in place (no duplicates).

**File 2: `.cleargate/scripts/dedupe_frontmatter.mjs` (NEW)**
- One-shot corpus dedupe script: scans `.cleargate/delivery/{pending-sync,archive}/`, finds duplicate top-level YAML frontmatter keys, keeps the LAST occurrence (most recent stamp), rewrites.
- Idempotent: second run produces 0 rewrites.
- Mirrored to `cleargate-planning/.cleargate/scripts/dedupe_frontmatter.mjs`.
- Applied once: fixed 4 files (BUG-024, SPRINT-17, CR-023, EPIC-024).

## Tests Added

- `cleargate-cli/test/commands/push-hierarchy.test.ts` — BUG-025 regression test:
  - Fixture file with `parent_cleargate_id: null` + `parent_ref` value
  - Runs `backfill_hierarchy.mjs` 3 times
  - Asserts exactly 1 `parent_cleargate_id:` line + YAML parses cleanly

- `cleargate-cli/test/scripts/dedupe-frontmatter.test.ts` (NEW) — 5 tests:
  - File with duplicate `parent_cleargate_id` is deduped (last wins)
  - N=3 invocations produce stable result
  - File without duplicates is byte-identical
  - `--dry-run` prints without writing
  - Multi-line value continuation lines are dropped with the earlier occurrence

## Typecheck / Tests

- `npm run typecheck`: clean
- `VITEST_MAX_FORKS=1 vitest run` on affected suites: 18 passed, 0 failed
- Pre-existing failures (bootstrap-root, doctor, hotfix-new): unrelated to BUG-025
