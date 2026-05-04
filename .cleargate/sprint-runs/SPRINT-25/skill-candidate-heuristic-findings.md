# Skill Candidate Heuristic — Investigation Findings

**Author:** Developer (CR-056)
**Date:** 2026-05-04
**Sprint:** SPRINT-25

## Diagnosis

**Verdict: False-positive confirmed.** The "CR-045 × architect" candidate is a token-attribution artifact.

## Evidence

SPRINT-23 `token-ledger.jsonl` contains 17 entries for `work_item_id: CR-045, agent_type: architect`. All 17 share the same `session_id: 48aa90c9-f20f-4899-ba85-1079373f3d8e`. This is a single Claude Code session that ran multiple Architect dispatches across SPRINT-23 — the token-ledger.sh hook attributed all rows to CR-045 (the first-merged work item of that session).

SPRINT-24 `improvement-suggestions.md` reproduces the same candidate hash (`<!-- hash:6b1802 -->`), confirming the heuristic fires every sprint against the same stale data.

## Root Cause

The pre-CR-056 heuristic had three gaps:
1. **No session-shared filter** — counts all tuple occurrences, even 17 rows from one session.
2. **Single-sprint ledger only** — reads only the current sprint's `token-ledger.jsonl`, so cross-sprint aggregation was unavailable.
3. **Intra-sprint dedup only** — checked current sprint's `improvement-suggestions.md` but not prior sprints'.

## Fix Applied (Phase 2)

- `isSessionShared()`: filter any bucket where all entries share one distinct `session_id`.
- Cross-sprint aggregation: reads all prior sprints' ledgers under `CLEARGATE_SPRINT_RUNS_DIR`.
- Cross-sprint dedup: scans prior sprints' `improvement-suggestions.md` for the hash marker.
- Threshold raised to ≥3× across ≥2 distinct sprints AND not session-shared.

## No Real Pattern Found

No genuine recurring Architect sub-flow was identified. No SPRINT-26 skill follow-up queued.
