# BUG-029 QA-Red Report

**Date:** 2026-05-05
**Sprint:** SPRINT-26
**Story:** BUG-029 — Parallel-eligible story dispatches silently serialize
**Mode:** RED
**Status:** QA-RED: WRITTEN

## Red Test File

`cleargate-cli/test/scripts/parallel-dispatch.red.node.test.ts`
(commit `50695a9` on `story/BUG-029`)

## Baseline Failure Count

5 of 6 tests FAIL on the clean baseline. 1 sub-test passes by design (documents the collision behaviour, does not assert the fix).

```
tests 6 | pass 1 | fail 5 | skipped 0
```

## Scenario Coverage

| Test | Scenario | Status on baseline |
|------|----------|--------------------|
| Scenario 1 — it: two parallel write_dispatch.sh calls with same SESSION_ID produce two distinct dispatch files | write_dispatch.sh:110 single-filename collision | FAIL (1 file, expected 2) |
| Scenario 1 — it: each dispatch file contains the correct work_item_id for its story | STORY-A attribution lost after overwrite | FAIL (only STORY-B survives) |
| Scenario 2 — it: two sentinel writes at the same TURN_INDEX produce two distinct files | pending-task-sentinel:186 TURN_INDEX keying collision | FAIL (1 file, expected 2) |
| Scenario 2 — it: surviving sentinel after collision contains STORY-B | DOCUMENTS overwrite direction | PASS (intentional) |
| Scenario 3 — it: hook attributes the ledger row to STORY-A, not STORY-B | token-ledger:121 newest-file mis-attribution | FAIL (got 'STORY-B', expected 'STORY-A') |
| Scenario 3 — it: STORY-B dispatch marker remains on disk after STORY-A consumes only its own | Wrong marker consumed, STORY-B marker gone | FAIL (STORY-A survives, should be STORY-B) |

## Wiring Soundness (TPV Checklist)

- [x] Imports resolve — only Node built-ins (`node:test`, `node:assert/strict`, `node:fs`, `node:path`, `node:os`, `node:child_process`, `node:url`)
- [x] Constructor signatures match — no external class constructors used
- [x] Mocked methods — none; tests invoke real bash scripts via `spawnSync`
- [x] After-hooks present — every `describe` has `after(() => cleanupFixture(env))`
- [x] File naming — `parallel-dispatch.red.node.test.ts` (red BEFORE node infix, per flashcard 2026-05-04 #naming #red-green)
- [x] No implementation files read (Mode: RED contract upheld)

## Root Cause Confirmed by Tests

1. `write_dispatch.sh:110` — `DISPATCH_TARGET="${SPRINT_DIR}/.dispatch-${SESSION_ID}.json"` — single filename per session; second `mv` overwrites first.
2. `pending-task-sentinel.sh:186` — `SENTINEL_FILE="${SPRINT_DIR}/.pending-task-${TURN_INDEX}.json"` — two parallel Agent calls share same TURN_INDEX; second write collides.
3. `token-ledger.sh:121` — `ls -t .dispatch-*.json | head -1` newest-file lookup; when two markers exist, newer mtime (STORY-B, written last) is consumed regardless of which SubagentStop fires.

## Flashcards Flagged

- `2026-05-05 · #qa-red #dispatch-collision · BUG-029: write_dispatch.sh uses SESSION_ID-keyed filename → parallel Task() overwrites; fix needs uniquifier (ts+pid+rand).`
- `2026-05-05 · #qa-red #sentinel-collision · pending-task-sentinel.sh:186 TURN_INDEX-keyed filename collides for parallel Agent calls in same assistant turn; add pid+rand suffix.`
- `2026-05-05 · #qa-red #token-ledger #mis-attribution · token-ledger.sh:121 newest-file lookup mis-attributes parallel SubagentStop; must match by (work_item_id, agent_type) from transcript.`

## Round 2 Amend

**Date:** 2026-05-05
**Commit:** `ba1e67f` on `story/BUG-029`
**Override:** CR-043 Red-test immutability overridden per orchestrator dispatch (structural-error case).

### Problem Fixed

Scenario 2 Test 1 ("two sentinel writes at the same TURN_INDEX produce two distinct files") was structurally untestable: it wrote both sentinels via `fs.writeFileSync` to the identical path, so the hook fix could never be observed — direct FS writes bypass the hook entirely.

### Fix Applied (Option A)

Replaced `fs.writeFileSync` simulation with two real `spawnSync('bash', [SENTINEL_SCRIPT], ...)` invocations — one for STORY-A, one for STORY-B — each receiving a JSON payload with `tool_name: 'Task'` and the same `transcript_path` (0 assistant turns → `TURN_INDEX=0` for both). The hook now runs for real:

- **Pre-fix:** second invocation's `mv` overwrites `.pending-task-0.json` → 1 file survives → assertion fails (expected 2).
- **Post-fix:** hook adds uniquifier suffix → 2 distinct files → assertion passes.

Added `SENTINEL_SCRIPT` constant and `SKIP_FLASHCARD_GATE=1` env to bypass the flashcard gate in the fixture. All other scenarios unchanged.

### Baseline-Fail Confirmed

```
tests 141 (full suite) | pass 136 | fail 5
Parallel-dispatch Red tests: 5 FAIL (all Scenario 1 + Scenario 2 Test 1 + Scenario 3 Tests 1+2)
Scenario 2 Test 2 (documents collision direction): PASS (intentional, unchanged)
```

Scenario 2 Test 1 error message:
```
Expected 2 distinct sentinel files for two parallel Task() dispatches at TURN_INDEX=0,
but found 1. [...] Fix: add uniquifier suffix (e.g. ${TURN_INDEX}-$$-${RANDOM}) to the sentinel filename.
1 !== 2
```
