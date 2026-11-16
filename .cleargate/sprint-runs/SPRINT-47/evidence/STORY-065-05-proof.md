# STORY-065-05 proof (rule 7, hand-applied)

- Proof column: Unit + integration — view and count reds; `seal_red.mjs --amendment` on real git.
- QA-Verify (2026-11-16): PASS, DEFECT_IN none. 13 files by name, 77/77, three identical runs; `npm run typecheck` 0; `build-codex-payload.mjs --check` 0. The amendment tests run `seal_red.mjs` against a real temp git repo. Scenario behaviour observed directly, plus boundary probes (holdout among other tags, holdout Outline, holdout outside a gherkin fence).
- Commits: qa-red f744333, dev 08dfd17, merge 61317b3 (cli main).
