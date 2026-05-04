---
role: qa
story_id: CR-056
sprint_id: SPRINT-25
authored_at: 2026-05-04
phase: final
verdict: PASS
---

# QA Report — CR-056 Skill Candidate Heuristic Investigation + Fix

## Commit Inspected

`508e943` — `feat(SPRINT-25): CR-056 skill-candidate heuristic — session-shared filter + cross-sprint dedup + threshold raise`

## Acceptance Trace (§4 items 1–6)

### Item 1: findings report exists, ≤300 words, diagnoses CR-045 × architect
PASS. File present at `.cleargate/sprint-runs/SPRINT-25/skill-candidate-heuristic-findings.md`.
Word count: 218. Diagnoses "CR-045 × architect" as false-positive with evidence (17 entries, 1 session UUID).

### Item 2: heuristic has session-shared filter + cross-sprint dedup + threshold raise (live + canonical)
PASS. Commit adds `isSessionShared()`, cross-sprint aggregation via `CLEARGATE_SPRINT_RUNS_DIR`, `hashAlreadySeen()` scanning current + prior suggestions files, and threshold raised to ≥3× across ≥2 distinct sprints AND not session-shared. Both `.cleargate/scripts/suggest_improvements.mjs` and `cleargate-planning/.cleargate/scripts/suggest_improvements.mjs` updated in the same commit.

### Item 3: 3 Red scenarios GREEN post-Dev
PASS. Verified live: 3 scenarios all PASS in full test run.
  - Scenario 1: session-shared attribution NOT flagged
  - Scenario 2: cross-sprint distinct-session pattern IS flagged
  - Scenario 3: cross-sprint dedup suppresses already-seen candidate

### Item 4: SPRINT-25 improvement-suggestions.md will be clean post-fix (proxy: Red scenarios as stated)
PASS (by proxy). Red scenarios use synthetic fixtures that match the false-positive class exactly. Scenario 1 and 3 directly cover the CR-045×architect suppression path. No direct Gate-4 re-run executed (within scope as stated in task brief).

### Item 5: mirror parity
PASS. `diff .worktrees/CR-056/.cleargate/scripts/suggest_improvements.mjs .worktrees/CR-056/cleargate-planning/.cleargate/scripts/suggest_improvements.mjs` returns empty.

### Item 6: typecheck + tests pass
PASS. `npm run typecheck` exits 0, `npm test` exits 0.

## Red Test File Immutability

PASS. `cleargate-cli/test/lib/suggest-improvements-heuristic.red.node.test.ts` has a single commit: `83fa4a2` (QA-Red). NOT present in Dev commit `508e943` — not modified post-`83fa4a2`.

## Typecheck

pass

## Tests

122 passed, 0 failed, 0 skipped (full suite)

## Regressions

none
