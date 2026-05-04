---
role: qa
story_id: CR-056
sprint_id: SPRINT-25
authored_at: 2026-05-04
phase: red
---

# QA-Red Report — CR-056 Skill Candidate Heuristic Investigation

## Summary

3 Red scenarios written and confirmed failing on the current baseline.
Worktree: `.worktrees/CR-056/` · Branch: `story/CR-056`

## Red Test File

`cleargate-cli/test/lib/suggest-improvements-heuristic.red.node.test.ts`

## Baseline Failure Evidence

Run command:
```
cd .worktrees/CR-056 && node_modules/.bin/tsx --test --test-reporter=spec 'cleargate-cli/test/lib/suggest-improvements-heuristic.red.node.test.ts'
```

Exit code: 1 — 3 fail, 0 pass, 0 skip

### Scenario 1: session-shared filtered out

**Fail reason:** Current heuristic has no session-shared filter. 3 entries with the
same `session_id` (`48aa90c9-...`) all in the same bucket `CR-045|architect` produce
a count of 3 ≥ 3 → heuristic flags it. Test asserts NOT flagged → FAILS.

Observed output line: `CR-045 × architect repeated ≥3× in token-ledger`

### Scenario 2: real pattern (cross-sprint, distinct sessions) still flagged

**Fail reason:** Current heuristic reads only `CLEARGATE_SPRINT_DIR/token-ledger.jsonl`
(current sprint, 2 entries). The prior sprint's ledger (1 entry) is not read.
Total 2 < 3 threshold → "No candidates detected this sprint." Test asserts IS flagged → FAILS.

Observed output: `_No candidates detected this sprint._`

### Scenario 3: cross-sprint dedup prevents re-surfacing

**Fail reason:** Current heuristic's dedup only checks the current sprint's
`improvement-suggestions.md` via `existingContent.includes('<!-- hash:6b1802 -->')`.
The prior sprint's suggestions file (which contains `<!-- hash:6b1802 -->`) is not
scanned. So the hash is re-surfaced. Test asserts NOT re-surfaced → FAILS.

Observed output: `<!-- hash:6b1802 -->` present in current sprint suggestions.

## Fixture Design Notes

- All 3 scenarios use synthetic tmpdir fixtures (not real SPRINT-23/24 data) for
  isolation and repeatability.
- `CLEARGATE_SPRINT_DIR` env override routes the script to the synthetic sprint dir.
- `CLEARGATE_SPRINT_RUNS_DIR` env override routes sibling sprint lookups to the
  synthetic sprints root (used in Scenarios 2 and 3).
- `CLEARGATE_FLASHCARD_PATH` env override points at an empty FLASHCARD.md to prevent
  false-positive "also do" pattern matches from polluting the skill-candidate output.
- `NODE_TEST_CONTEXT` scrubbed per FLASHCARD 2026-05-04 #node-test #child-process.
- hash:6b1802 confirmed via `createHash('sha256').update('skill|CR-045|architect').digest('hex').slice(0,6)`.

## Key Heuristic Facts Confirmed (READ-ONLY, no heuristic body read per RED mode constraint)

- Bucket key: `${work_item_id}|${agent_type}` (line 156 of suggest_improvements.mjs)
- Session field in token-ledger entries: `session_id` (UUID string)
- Env overrides supported: `CLEARGATE_SPRINT_DIR`, `CLEARGATE_SPRINT_RUNS_DIR`,
  `CLEARGATE_FLASHCARD_PATH`
- Cross-sprint sibling lookback uses `CLEARGATE_SPRINT_RUNS_DIR` for the root
- Current intra-sprint dedup: `existingContent.includes('<!-- hash:${hash} -->')` at L191
- Threshold: ≥3 (no cross-sprint aggregation, no session filter on baseline)

## Constraints Honoured

- WRITE access used only for: test file + this report
- NO read of `scanSkillCandidates` heuristic body (only interface grep: argv, env vars,
  bucket key line 156)
- No implementation edits
- No commit
