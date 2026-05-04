---
role: architect
cr_id: CR-056
sprint_id: SPRINT-25
authored_at: 2026-05-04
phase: post-flight
verdict: PASS
---

# Architect Post-Flight — CR-056 Skill Candidate Heuristic Investigation + Fix

## Commits Inspected

- Dev: `508e943` (feat: CR-056 skill-candidate heuristic — session-shared filter + cross-sprint dedup + threshold raise)
- QA-Red: `83fa4a2` (qa-red: 3 Red scenarios)

## 1. M1 File-Surface Adherence

**PASS.** Surface set matches the M1 blueprint exactly:

| Expected | Actual (commit) |
|----------|-----------------|
| Live heuristic — `.cleargate/scripts/suggest_improvements.mjs` | 508e943 ✓ |
| Canonical mirror — `cleargate-planning/.cleargate/scripts/suggest_improvements.mjs` | 508e943 ✓ |
| Manifest regen — `cleargate-planning/MANIFEST.json` | 508e943 ✓ (sha256 + generated_at delta) |
| Red test — `cleargate-cli/test/lib/suggest-improvements-heuristic.red.node.test.ts` | 83fa4a2 ✓ (432 lines, 3 scenarios) |
| Findings report — `.cleargate/sprint-runs/SPRINT-25/skill-candidate-heuristic-findings.md` | 508e943 ✓ (33 lines / 218 words, ≤300 budget) |

Plus `.cleargate/sprint-runs/SPRINT-25/reports/CR-056-dev.md` co-staged in 508e943. No out-of-scope edits.

## 2. Mirror Parity

**clean.** `diff` between `.cleargate/scripts/suggest_improvements.mjs` and `cleargate-planning/.cleargate/scripts/suggest_improvements.mjs` in the worktree returns empty. Both files updated lockstep in the same commit.

## 3. MANIFEST.json Regen

**staged.** `cleargate-planning/MANIFEST.json` is part of `508e943`. The diff shows the canonical heuristic's sha256 advancing from `7d5853bf…` → `62e71e7b…` and `generated_at` rolled forward. Regen produced via `npm run prebuild` (per Dev commit message); 65 files re-emitted. No manual hand-edit.

## 4. 3-Fix Architectural Soundness

**PASS — coherent, not stub, not half-built.** All three fixes are necessary and orthogonal:

1. **Session-shared filter (`isSessionShared`)** — addresses the *attribution* root cause: 17 SPRINT-23 ledger rows for `CR-045 × architect` all share `session_id 48aa90c9-…`. Filter is applied per-bucket pre-threshold. Without this, threshold raise alone would not suppress the false-positive (the 17 rows do span SPRINT-23 + SPRINT-24, so they pass the "≥2 distinct sprints" gate via re-bucketing).
2. **Cross-sprint aggregation (`CLEARGATE_SPRINT_RUNS_DIR`)** — required for the threshold to be evaluated at all; without prior-sprint ledgers the bucket can never see ≥2 sprints. Implementation reads sibling sprint dirs, skips the current, swallows read errors per sprint dir (won't fail the close pipeline on a stale sibling).
3. **Cross-sprint dedup (`hashAlreadySeen`)** — last-mile guard: even if a real pattern survives filters 1+2, surfacing it twice in two consecutive sprints is noise. Dedup checks current + all prior `improvement-suggestions.md` for the `<!-- hash:XXX -->` marker.

The three combine multiplicatively — any single fix alone leaves a class of false-positives reachable. No half-measure.

## 5. `isSessionShared` Rule Formulation

**PASS, with one doc-drift flag (non-blocking).**

Dev's implementation (line 183): `distinctSessions.size === 1` — i.e., *exactly one distinct session UUID across all bucket entries*. This is correct and matches the false-positive evidence: the CR-045 × architect bucket has 17 rows / 1 session UUID, so `distinctSessions.size === 1` triggers the filter.

The M1 blueprint phrasing was looser: "≥2 of ≥3 share same session". Dev's tighter rule is a defensible refinement: it ensures the filter only fires when the *entire* bucket collapses to one session (genuine artifact), not when a sub-cluster happens to share a session within a multi-session bucket (which could be real signal). I endorse the refinement.

**Doc-drift flag:** the JSDoc on `scanSkillCandidates` lines 190–191 still describes the looser blueprint phrasing ("≥2 of ≥3 entries for a bucket share the same session_id") which contradicts the implementation at line 183 one paragraph below. Not a correctness issue; flag for a future tidy-up. Captured as flashcard candidate (#6 below).

## 6. Findings Report Scope Discipline

**PASS.** 218 words, well under the 300-word cap. Diagnoses cleanly: 17 entries / 1 session UUID → false-positive. Names three gaps in the pre-CR-056 heuristic. Lists three fixes 1:1 with what the code shipped. Closes with "No Real Pattern Found" — explicitly declines to design a skill, honouring CR §3 Out of scope. Zero overflow into skill design / FLASHCARD cleanup / unrelated heuristic categories.

## flashcards_flagged

- `2026-05-04 · #heuristic #suggest-improvements · session-shared filter must be exact (distinctSessions.size===1), not loose ≥2-of-≥3; the latter risks suppressing real multi-session signal.`
- `2026-05-04 · #docs #suggest-improvements · scanSkillCandidates JSDoc lines 190–191 still describe pre-CR-056 looser rule; tidy in next CR that touches this file.`
- `2026-05-04 · #heuristic #close-pipeline · skill-candidate threshold needs all three filters (session-shared + cross-sprint count + cross-sprint dedup) to suppress attribution artifacts; any one alone leaks.`

## Verdict

```
ARCHITECT: PASS
M1_ADHERENCE: 5 expected files all present (live + canonical heuristic, MANIFEST.json, Red test, findings report) plus dev report; no out-of-scope edits.
MIRROR_PARITY: clean
MANIFEST_REGEN: staged
flashcards_flagged: [#heuristic, #suggest-improvements, #docs, #close-pipeline]
```
