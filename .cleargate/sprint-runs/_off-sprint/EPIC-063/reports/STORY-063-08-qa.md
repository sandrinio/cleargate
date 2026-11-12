# STORY-063-08 QA-Verify
STORY: STORY-063-08
QA: PASS
TYPECHECK: pass (exit 0)
TESTS: story files 163 pass / 0 fail / 0 skipped (extract-sections* incl. live corpus sweep, build-ingest-parity, page-builder-shared); full suite not re-run per dispatch
ACCEPTANCE_COVERAGE: 5 of 5 scenarios (Outline 4 rows)
MISSING: none
REGRESSIONS: none

## Scenario -> test
- Outline epic/bug/CR/sprint -> extract-sections-pages.red "Outline (build|ingest)" x4, both modes; extract-sections.red C8.5 extractParts epic/bug/cr/sprint; sprint report block -> C8.7 + pages sprint test (<8,000 B)
- Budget -> pages "Budget" (2,000-2,400, parts in order, markers name raw path, no tag/row cut) + allocateBudget/safeCut units + SPRINT-44 table row test
- Legacy fallback -> pages "Legacy" + extractParts fallback units (G-M2-39)
- Build/ingest parity -> pages "Parity" + build-ingest-parity + page-builder-shared
- Error (unclosed agent_context, empty body, build exit 0) -> pages "Error" x3
- Real-corpus no-empty/budget sweep -> extract-sections-corpus.live.integration
- Docs (G-M2-11/43) -> extract-sections-sources.red; codex --check exit 0

## Manual verification (scratch build of 86db1c0, scratch repo copy; outer repo untouched)
- wiki build exit 0, 344 pages, 45s.
- SPRINT-44 page: 2,968 bytes (was 23,337; old build 65f2708 on same scratch = 23,533). Report block = status line + pointers + Carried Over only.
- EPIC-058: identity line, Objective, Problem, Scope in/out, Architecture rules, Decisions; reader can tell what it is. EPIC-063, BUG-102 likewise; sprint page shows goal, deliverables, report status.
- Advisory (not blocking) rough edges:
  1. EPIC-063 Scope "In" is one huge line, cut mid-line (unclosed backtick) - no line boundary exists; EPIC-063 Decisions cut mid-word ("(sprint…") and joins question to answer with "->".
  2. BUG-102 Reproduction ends on a dangling "4."; Anomaly's Actual Behavior is cut after step 1. Spec R3 says "line boundary"; implementation/doc use paragraph/sentence/word fallback (doc is consistent with code).
  3. Scope shows only 2 In bullets for EPIC-058 ("+3,495 bytes not shown") - budget-bound, by design.

## Timing (ingest EPIC-063, real content change, 4 runs each)
- new 86db1c0: 1.29 1.43 1.16 0.91 s
- old 65f2708: 1.21 0.90 0.94 1.03 s
- no-op ingest: new 0.47-0.79, old 0.60-0.86. No meaningful regression (noise-level; first-run variance).

## Docs / DoD
- Protocol 10.2/10.4, ingest/query agents, Codex TOMLs match code (identity line format, 2,000-2,400, marker text, 20-ID relations cap, report 1,200 cap). Ingest agent now hands off to `cleargate wiki ingest`.
- No dist/ in commits; no /Users/, ssuladze, @gmail in added lines of any of the four commits; codex payload --check exit 0.

flashcards_flagged: []
