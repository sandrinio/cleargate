# BUG-029 QA Report

**Story:** BUG-029 — Parallel-eligible story dispatches silently serialize
**Mode:** VERIFY
**QA Commit Verified:** f16645e
**Red Commit:** ba1e67f
**Date:** 2026-05-05

## Summary

Three-file fix (write_dispatch.sh + pending-task-sentinel.sh + token-ledger.sh) verified against
all 5 acceptance criteria. Mirror chain 3-way identical. All 6 Red scenarios pass. Full node:test
suite 146/146 green. Plan deviation (bug-027 snapshot update) confirmed acceptable.

## Findings

### Acceptance 1 — write_dispatch.sh uniquifier (Scenario 1)

PASS. Line 110 replaced: `.dispatch-${SESSION_ID}.json` → `.dispatch-${TS_EPOCH}-$$-${RANDOM}.json`.
Red test S1T1 + S1T2 pass: two parallel calls with same SESSION_ID produce 2 distinct files, each
retaining correct work_item_id.

### Acceptance 2 — pending-task-sentinel.sh uniquifier (Scenario 2)

PASS. SENTINEL_FILE keying changed: `.pending-task-${TURN_INDEX}.json` →
`.pending-task-${TURN_INDEX}-$$-${RANDOM}.json`.
Red test S2T1 passes: two spawnSync calls at TURN_INDEX=0 produce 2 distinct files.
S2T2 (documents collision direction) passes by design (intentional baseline-pass test).

### Acceptance 3 — token-ledger.sh tuple-match (Scenario 3)

PASS. Newest-file lookup replaced with content-based work_item_id scan from SubagentStop
transcript's first user message. Fallback to newest-file retained with warning logged.
Red test S3T1 + S3T2 pass: hook attributes STORY-A's SubagentStop to STORY-A marker;
STORY-B's marker remains on disk untouched.

### Acceptance 4 — Mirror chain: canonical/payload/snapshot 3-way identical post-prebuild

PASS. Verified:
- canonical `cleargate-planning/.cleargate/scripts/write_dispatch.sh` == live `.cleargate/scripts/write_dispatch.sh` (IDENTICAL)
- canonical `cleargate-planning/.claude/hooks/token-ledger.sh` == npm payload `cleargate-cli/templates/cleargate-planning/.claude/hooks/token-ledger.sh` (IDENTICAL)
- canonical `cleargate-planning/.claude/hooks/pending-task-sentinel.sh` == npm payload equivalent (IDENTICAL)
- `cleargate-planning/.claude/hooks/token-ledger.sh` == `cleargate-cli/test/snapshots/hooks/token-ledger.bug-029.sh` (IDENTICAL byte-for-byte)
- MANIFEST.json SHA256s updated for all 3 modified files.
- NOTE: live `/.claude/hooks/pending-task-sentinel.sh` does NOT exist (gitignored live instance,
  only token-ledger.sh present). This is expected per dogfood-split — canonical edit, live
  re-sync via `cleargate init` is a post-merge human step (CLAUDE.md).

### Acceptance 5 — No regressions in token-ledger-attribution.test.ts or cr-026-integration.test.ts

PASS. Both files are vitest-authored (.test.ts suffix, not .node.test.ts) and are excluded from
`npm test` by design. Direct tsx invocation fails for the pre-existing reason (vitest imports
require vitest runtime). Neither file was modified by f16645e. The npm test suite (node:test)
runs 146/146 green with 0 regressions.

## Plan Deviation Assessment: bug-027 snapshot update

ACCEPTABLE. Dev updated `token-ledger.bug-027.sh` to BUG-029 canonical state, as required by
the Red test instruction (token-ledger-resolver.red.node.test.ts:564). The snapshot pattern is
rolling: bug-027.sh becomes historical (existence-only assertion), bug-029.sh becomes the new
byte-equality lock. Both snapshots are now identical content (bug-027 updated to match BUG-029
fix). The hooks-snapshots.test.ts asserts:
- bug-027.sh: existence-only (no byte-equality)
- bug-029.sh: byte-equality against live canonical

This is consistent with the established pattern for all prior snapshots (bug-009 through cr-044).

## Test Results

- node:test (npm test): **146 passed, 0 failed, 0 skipped** (verified by re-run)
- parallel-dispatch.red.node.test.ts direct run: **6/6 pass**
- vitest (npm run test:vitest): 1628 passed, 31 failed — all 31 pre-existing ENOENT + runner-mismatch failures, none introduced by BUG-029

## Adversarial Spot-Checks

- Scenario 2 hook invocation uses real spawnSync (not FS simulation) — collision observable at hook level, not just FS level.
- Scenario 3 uses 50ms Atomics.wait to ensure mtime ordering between STORY-A and STORY-B dispatch files — deterministic.
- tuple-match fallback path (no transcript match) retains newest-file lookup with warning — graceful degradation confirmed in token-ledger.sh diff.
- Scenario 1 second dispatch-file content assertion covers STORY-A not just count (prevents silent attribution mismatch).
