---
story: "STORY-033-02"
role: "qa"
sprint: "SPRINT-32"
verdict: "PASS"
qa_bounces: "0"
arch_bounces: "0"
story_id: "STORY-033-02"
sprint_id: "SPRINT-32"
---

# STORY-033-02 — QA Report

## QA-RED (commit 41d56164)
- Wrote `cleargate-cli/test/hooks/run-id-ledger-attribution.red.node.test.ts`.
- BASELINE_FAIL: 8 scenarios (+ 2 intentional back-compat regression guards that pass on baseline).
- TPV: APPROVED (Architect wiring validation).

## QA-VERIFY (against dev commit b2503794)
**QA: PASS**
**ACCEPTANCE_COVERAGE: 6 of 6 Gherkin scenarios**

| Scenario | Result |
|---|---|
| Sc1 Deterministic attribution (run_id in row + session-totals) | PASS |
| Sc2 token-ledger no-op when barrier row exists | PASS |
| Sc3 dispatch marker carries RUN_ID | PASS |
| Sc4 sentinel keyed by RUN_ID not TURN_INDEX | PASS |
| Sc5 missing tokens → ESCALATED, no row | PASS |
| Sc6 serial fallback byte-identical | PASS |

- TESTS: 20 passed, 0 failed (scoped story suite + snapshot lock).
- TYPECHECK: pass.
- Dogfood parity: token-ledger.sh + write_dispatch.sh live↔canonical↔payload byte-identical; sentinel canonical↔payload byte-identical (live gitignored by design).

**MISSING:** none
**REGRESSIONS:** none introduced by b2503794. Pre-existing failures (lint-index-budget, bug-027 superseded red, protocol-mirror, etc.) pre-date this commit; zero overlap with the 8 changed files.

## flashcards_flagged
- "2026-05-29 · #qa #snapshot #red-test · prior-story red snapshot tests stay failing after the hook advances; verify against the new active snapshot test, not the superseded red"
- "2026-05-29 · #mirror #parity · live /.claude/ is gitignored; hook tests must point to cleargate-planning/.claude/ (canonical), not /.claude/ (per-machine)"
- "2026-05-29 · #qa-red #bash-hook #env-injection · Hook tests: sed-patch REPO_ROOT line, inject RUN_ID via execFileSync extraEnv; sentinel needs SKIP_FLASHCARD_GATE=1; write_dispatch needs ORCHESTRATOR_PROJECT_DIR via spawnSync"
