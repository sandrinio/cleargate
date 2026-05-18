# QA Report — STORY-028-05

**Role:** qa  
**Story:** STORY-028-05 — Convert `mcp/` Test Suite to node:test  
**Sprint:** SPRINT-28  
**Generated:** 2026-05-18  
**Mode:** VERIFY  

---

## Verification Results

| Check | Result |
|-------|--------|
| T1: `mcp/vitest.config.ts` absent | PASS |
| T2a: `vitest` devDep removed from `mcp/package.json` | PASS |
| T2b: test script invokes node:test | PASS |
| T3: zero `from 'vitest'` imports in mcp/ | PASS (0 matches) |
| T4: zero `vi.fn/mock/spyOn/stubGlobal/useFakeTimers` live calls | PASS (0 matches) |
| T5: `*.node.test.ts` count ≥ 68 | PASS (68 exactly: 5 scripts/ + 45 src/ + 18 test/) |
| T6: dev report exists | PASS |
| T8: 1 skipped = live SMTP gate | PASS (`skip: !process.env.CLEARGATE_RESEND_LIVE`) |

## Gherkin Scenario Coverage

| Scenario | Matched |
|----------|---------|
| All 50 files renamed and converted (vitest imports = 0, vi.* = 0, count ≥ 50) | PASS |
| vitest.config.ts deleted | PASS |
| package.json clean | PASS |
| npm test green (Dev report: 505 pass, 0 fail, 1 skip; exit 0) | PASS (artifact diff) |
| Atomic commit (68 files in single inner commit b14e23e) | PASS |

## Notes

- Inner mcp/ commit: `b14e23e` — 68 files changed in one atomic commit (package.json + vitest.config.ts deletion + 50 renames/conversions). Matches §2.1 Atomic commit scenario.
- Outer commit `0ba97261` carries only the dev report — acceptable; mcp/ is a nested git repo.
- Commit subject `feat(SPRINT-28): STORY-028-05 — mcp/ vitest → node:test (50 files, vitest dep removed)` matches §1.2 step 6 exactly.
- One comment in `push-item.node.test.ts` line 9 references `vi.mocked()` in a prose comment explaining the pattern being replaced. Not a live call; T4 regex grep returns 0.
- `linear-adapter.ts` production file: grep for `vi.` returns 0 matches (flashcard reference text in comment removed as dispatched).
- Orchestrator-confirmed deviations (--test-concurrency=1, AdminApiError.kind fix, onRequest destroySoon patch) are all observed in place; each is a net improvement over pre-conversion state.
- WARN: QA context pack absent at expected path (`.cleargate/sprint-runs/SPRINT-28/.qa-context-STORY-028-05.md`). Proceeded via source-file fallback. Pack-absent does not affect verdict for this story type (structural verification + diff inspection).

---

STORY: STORY-028-05  
QA: PASS  
TYPECHECK: pass (Dev report: tsc --noEmit, no errors)  
TESTS: 505 passed, 0 failed, 1 skipped (full suite per Dev report; per memory feedback_qa_skip_test_rerun.md, skipping fresh-shell npm test)  
ACCEPTANCE_COVERAGE: 5 of 5 Gherkin scenarios have matching tests  
MISSING: none  
REGRESSIONS: none  
VERDICT: All acceptance criteria met. vitest fully eliminated from mcp/: config deleted, dep removed, 50 files converted to *.node.test.ts, zero vitest import or vi.* call residue. File count 68 matches baseline. Single atomic inner commit. One pre-existing SMTP skip unchanged. Ship it.

flashcards_flagged:
  - "2026-05-18 · #vitest #node-test #mcp · mcp/ is a nested git repo; QA must verify inner commit SHA (b14e23e), not outer — outer carries only dev report"
