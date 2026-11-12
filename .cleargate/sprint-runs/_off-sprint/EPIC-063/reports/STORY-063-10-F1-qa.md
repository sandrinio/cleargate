STORY: STORY-063-10-F1
QA: PASS
TYPECHECK: pass
TESTS: decisions-*.node.test.ts 196 pass / 0 fail; live integration (f1.live + corpus.live) 2 pass / 0 fail (corpus: 8 hits -> 1, EPIC-063 -> EPIC-020 only); build-codex-payload --check exit 0. Full npm test not re-run (decision 11).
ACCEPTANCE_COVERAGE: F1-1..F1-5 all covered
MISSING: none
REGRESSIONS: none
- F1-1: decisions.ts supersessions() matches G-M2-57 1-4 (table row, odd backticks, odd quotes, first token starts-with ID after stripping leading [[ " ' `); not/never, by guard, self-drop, dedup kept; fences not stripped.
- F1-2 body-offset sort; F1-3 [...d.supersedes]; F1-4 header in template; F1-5 sentence in claude .md and codex .toml (check passes).
- Test integrity: d9ab935..40196f2 touches only the two authorized lines; F1 red files unchanged.
- Delivery status porcelain identical before/after. Privacy grep of diff clean.
- Note (non-blocking): the verb-at-line-end case is skipped (token must be on the same line), as the orchestrator left unpinned.
flashcards_flagged: []
