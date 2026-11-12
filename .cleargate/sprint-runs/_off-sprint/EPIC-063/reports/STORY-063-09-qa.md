# STORY-063-09 QA-Verify (role: qa, off-sprint EPIC-063 M2)

STORY: STORY-063-09
QA: PASS
TYPECHECK: pass (`npm run typecheck`, exit 0)
TESTS: 201 passed, 0 failed, 0 skipped (fresh-shell targeted run of the 8 listed globs; full suite not re-run per dispatch). Live `index-open-ids.live.integration` with CLEARGATE_META_ROOT: 1/1 pass, open=91, index=3,582 tokens, tier 1. Outer `git status --porcelain .cleargate/delivery` md5 identical before and after.
ACCEPTANCE_COVERAGE: 5 of 5 Gherkin scenarios (Outline 2 rows) have matching, non-vacuous tests
MISSING: none
REGRESSIONS: none

## Scenario map
- S1 (open items once, with digest, under epic; ingest leaves index byte-identical): `index-handlers.red` Gherkin 1 (4 tests; ingest test overwrites index with junk first, so byte-identity is not vacuous), `index-rows.red` R1/R2, `build-ingest-parity` (R8).
- Outline 1x / 2x: `index-tiers.red` in-memory (tier 1 at 1x, tier 3 at 2x) and through `wiki build` (token count, every ID, header text); ladder, boundary and floor tests pin first-fit selection.
- S3 (lint warn vs ceiling): `index-lint-config.red` Gherkin 3 (4,500 warns, 0 findings, exit 0; 8,500 fails with the old message; 8,000 passes; suggest mode).
- S4 (state pages, Gate 1, "gate not run"): `state-pages-open-work.red` R6/R7 (15 non-Active epics -> 15 open; BUG-9 with repro-steps-deterministic; null and pass:null -> "gate not run"; all 8 types; ordering).
- S5 (error: Unparented, no trailing " — "): `index-handlers.red` Gherkin 5, `index-rows.red`.
- A1 / G-M2-4 / G-M2-53: `sprint-partition.red`, `sprint-pages-agree`, `state-pages` Scenario 7 (TPV fix 2 applied: gate-pass seed plus body-identical precondition, so the stamp-only path is really exercised).
- TPV fix 1 (blank-line filter at tier 3) applied at index-tiers:155.

## Shape-change edits (5 files + golden)
All match G-M2-54: hierarchical (rollup `stories (n): [[…]] — breakdown`; "no story row" kept as "no STORY line parses as a row" plus "each wikilink appears once"; 2b flipped to `stories (`), golden (Sprints / Epics / Proposals lines exactly as G-M2-54 lists, PROPOSAL digest present, no By area or Unparented), page-builder-shared (rows, inverted title rule, " - " round trip, drift form), build-ingest-parity:123, bucket-registry-parity:211 regex. Each carries a "superseded by STORY-063-09" note. Nothing guarded before was lost.

## Manual verification (scratch build of 2c40864 + scratch copy of the outer .cleargate, .active removed)
- `wiki build`: 344 pages; index.md 14,328 bytes = 3,582 tokens, tier 1, so no `warn: index-budget-target` (0 warn lines).
- Header line is exactly G-M2-49's tier 1 text, at line index 3 directly under the auto-generated note. Tier 2/3 strings in source match G-M2-49 verbatim (page-schema.ts:407-409).
- Reader view: index lists 5 open sprints, 15 epics (EPIC-063 with CR-127/129/130 nested; EPIC-058 with BUG-103/105/110/114/115/116), 7 proposals/initiatives, 22 area groups; BUG-102..116 all present once. Epic/sprint/proposal digests are kept, CR/bug digests dropped (tier 1). A session-start reader learns what is open and under which epic; CR/bug lines carry only a title at this tier, which is adequate for duplicate checks.
- product-state: Total | Open | Shipped (epics 52/15/36, bugs 106/48/46); "Open Epics" lists the 15.
- open-gates: 55 Gate 1 rows across epic/sprint/CR/bug etc., each with `fail: a, b`, `pass` or `gate not run`.
- roadmap and active-sprint with empty `.active`: both state "none in flight" (G3d), planned and shipped lists agree.
- `wiki lint`: `lint: FAIL (345 pages checked, 61 findings)`: 55 gate-stale, 4 gate-failure, 1 broken-backlink (CR-015 -> SPRINT-001, the known true one), 1 orphan. None index-related; no index-budget finding or warn. These are pre-existing corpus findings, not caused by 09.
- G-M2-4: flipped `approved: false -> true` on EPIC-031 (gate pass), `wiki ingest` on it only. open-gates.md changed (EPIC-031 removed, 55 -> 54 rows), index.md and product-state.md bytes unchanged (correct). No rebuild needed.

## Docs / DoD
- Protocol §10.1 index line and §21.1 target sentence + yaml, and config.example.yml `index_token_target: 4000`, match the code (wiki-config.ts default imported from page-schema `DEFAULT_INDEX_TOKEN_TARGET`).
- No dist/ files in the commit; added lines contain no `/Users/`, `ssuladze`, `@gmail`; `node scripts/build-codex-payload.mjs --check` exit 0; cli checkout status clean (scratch build only).
- Task Breakdown rows in the story file are unticked (advisory, as the Dev noted; orchestrator to tick).

## Advisory (no bounce)
1. Sprint rows render their own id as the sprint field (`[[SPRINT-31]] — Draft · SPRINT-31 — …`) because the rule reads `sprint_cleargate_id`; redundant noise, spec-literal. Candidate follow-up.
2. `roadmap.md` still has an `## Active Epics` section driven by `isActiveStatus` (roadmap.ts:62); out of scope per story §1.3 / decision 6, same lie class as the one fixed in product-state.
3. Stamp-only ingest timing was measured by the Dev only under load; the manual flip ingest here was subjectively fast but not timed.

## Script Incidents
None.

flashcards_flagged:
  - "2026-11-12 · #wiki #index · Sprint rows show their own id in the sprint field (sprint_cleargate_id self-ref); redundant, drop for bucket sprints."
  - "2026-11-12 · #qa #wiki · Scratch real-corpus `wiki lint` FAILs on 55 gate-stale findings regardless of the story; judge by index-budget lines only."
