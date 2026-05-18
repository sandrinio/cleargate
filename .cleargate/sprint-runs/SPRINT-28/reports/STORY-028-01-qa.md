# STORY-028-01 QA Report — Reconciliation Harvest Pass (Retry)

**QA Agent:** role: qa  
**Story:** STORY-028-01  
**Branch:** story/STORY-028-01  
**Commits inspected:** 5854ea46 (harvest auto-flips) + f6867cd8 (dev report + audit log) + db1cd824 (qa-bounce fix: wiki rebuild + idempotency)  
**Lane:** fast  
**Date:** 2026-05-18  
**qa_bounces:** 1 (this is the retry verdict)

---

## Verdict

**QA: PASS**

All 5 dispatch verification criteria met. Prior FAIL gaps (wiki rebuild + idempotency §10) resolved in db1cd824.

---

## Verification Checklist (dispatch criteria)

| # | Criterion | Result | Evidence |
|---|-----------|--------|---------|
| 1 | wiki/index.md Active section does NOT list EPIC-010, EPIC-016, EPIC-023, EPIC-026 | PASS | Active section verified: none of the 4 epics present. Only EPIC-012, EPIC-021, EPIC-027, EPIC-028 remain active epics. |
| 2 | Same 4 epics appear in Archive/Completed count (22 Completed) | PASS | Archive line: `Epics: 22 Completed · 2 Abandoned` — dev report confirms was 18 before story; 4 auto-flips = 22. |
| 3 | `.cleargate/.harvest-reaudit.log` exists; halt-list = EPIC-012, EPIC-021, SPRINT-07, SPRINT-16 only; no new flips | PASS | File present in worktree at `.cleargate/.harvest-reaudit.log`. Parent rollup section lists exactly those 4. EPIC-010/016/023/026 absent from parent-rollup halt-list (only appear in lifecycle DRIFT section re: file location, not new flip candidates). |
| 4 | Dev report has §10 Idempotency section | PASS | `STORY-028-01-dev.md` §10 documents re-audit command, same halt-list, confirms zero new flip candidates. |
| 5 | Original 4 epic frontmatter flips (5854ea46) unchanged by db1cd824 | PASS | `git diff 5854ea46 db1cd824` against all 4 epic files: zero diff. All 4 confirm `status: Completed` in worktree. |

---

## Per-Epic Verification Table

### Flipped (4 of 4) — status: Completed confirmed, unchanged after db1cd824

| Epic | New Status | Children | All Completed? |
|------|-----------|---------|---------------|
| EPIC-010 | Completed | STORY-010-01..08 (8) | YES |
| EPIC-016 | Completed | STORY-016-01..06 (6) | YES |
| EPIC-023 | Completed | STORY-023-01..04 (4) | YES |
| EPIC-026 | Completed | STORY-026-01..02 (2) | YES |

### Halt-list (unchanged between audits)

| Item | Reason | Correct? |
|------|--------|---------|
| EPIC-012 | halt-zero-children (0 stories ever drafted) | YES |
| EPIC-021 | halt-zero-children (extractId bug; 1 partial child) | YES |
| SPRINT-07 | halt-zero-children (archival sprint) | YES |
| SPRINT-16 | halt-zero-children (archival sprint) | YES |

---

## Gherkin Scenario Coverage

| Scenario | Result | Notes |
|----------|--------|-------|
| 1. Dry-run produces expected proposed-flip list | PARTIAL (accepted) | extractId() bug meant reconciler output was halt-zero-children; manual audit substituted. Documented in dev report §3. Story acknowledged this as dogfood finding. |
| 2. Apply commits the auto-flips | PASS | Commit 5854ea46: 4 epic frontmatter flips, clean diff. |
| 3. Wiki rebuild reflects the harvest | PASS | db1cd824: `cleargate wiki build` run; 326 pages regenerated; Active section updated correctly. |
| 4. Error — unexpected halt exits non-zero | N/A | No new test code per story §4.1. |

**ACCEPTANCE_COVERAGE: 2 of 3 actionable scenarios fully met; Scenario 1 partial-accepted (known reconciler limitation, documented).**

---

## DoD Checklist (§4.2)

| Item | Status | Notes |
|------|--------|-------|
| 1. Dry-run executed; output captured | PASS | `.cleargate/.harvest-audit.log` present |
| 2. Human acked proposed-flip list before apply | PASS | Orchestrator dispatch confirms |
| 3. Apply commit with expected frontmatter diff | PASS | 5854ea46 clean diff |
| 4. Idempotency verified | PASS | Dev report §10 + `.harvest-reaudit.log` confirms zero new candidates |
| 5. Wiki rebuilt; Active section shrunk | PASS | db1cd824: 326 pages, 4 epics removed from Active |
| 6. Halt-list summarized with next-sprint owners | PASS | Dev report §6: EPIC-012 + EPIC-021 assigned SPRINT-29 |

---

## Regression Check

- cleargate-cli/ source: NOT touched by any of the 3 commits.
- Pre-existing failures (3): fixture-glob bleed (STORY-028-04 scope) + CR-043 red test. None introduced by this story.
- REGRESSIONS: none

---

## TYPECHECK / TESTS

Per `feedback_qa_skip_test_rerun.md`: fresh-shell npm test skipped (Dev's run was clean at 388/391 with pre-existing failures only). No source code changed — no regression risk.

TYPECHECK: not re-run (no source code changes)
TESTS: 391 total, 388 pass, 3 fail (all pre-existing per dev report §8)

---

## flashcards_flagged

[]
