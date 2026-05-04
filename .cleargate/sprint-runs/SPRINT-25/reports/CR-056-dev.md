---
report_type: dev
cr_id: CR-056
sprint_id: SPRINT-25
authored_at: 2026-05-04
---

# CR-056 Dev Report — Skill Candidate Heuristic Fix

## Phase 1: Investigation Outcome

**Verdict:** False-positive confirmed. All 17 "CR-045 × architect" entries in SPRINT-23 share session_id `48aa90c9-f20f-4899-ba85-1079373f3d8e` — a single long session where multiple Architect dispatches were attributed to the first-merged work item. No real recurring pattern found. No SPRINT-26 skill follow-up queued. Full findings: `.cleargate/sprint-runs/SPRINT-25/skill-candidate-heuristic-findings.md`.

## Phase 2: Heuristic Fix

Three improvements applied to `scanSkillCandidates` in `suggest_improvements.mjs`:

1. **Session-shared filter** (`isSessionShared`): new function returning `true` when all entries for a bucket share exactly one distinct `session_id`. Scenario 1 of Red test.
2. **Cross-sprint aggregation**: reads all prior sprint `token-ledger.jsonl` files via `CLEARGATE_SPRINT_RUNS_DIR`. Threshold now applied across combined multi-sprint entries. Scenario 2 of Red test.
3. **Cross-sprint dedup**: `hashAlreadySeen()` checks current sprint's suggestions AND all prior sprints'. Scenario 3 of Red test.
4. **Threshold raised**: ≥3× across ≥2 distinct sprints AND not session-shared.

## Test Results

3/3 Red scenarios GREEN. Full suite: 122 passed, 0 failed.

## Mirror Parity

`diff .cleargate/scripts/suggest_improvements.mjs cleargate-planning/.cleargate/scripts/suggest_improvements.mjs` → empty. Both updated in same commit.

## MANIFEST Regen

`npm run prebuild` from `cleargate-cli/` regenerated `cleargate-planning/MANIFEST.json` (65 files indexed). Staged in same commit.

## Typecheck

`npm run typecheck` → clean (exit 0).
