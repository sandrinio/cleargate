# STORY-064-02 QA-Red report
QA-RED: WRITTEN
Files (worktree .worktrees/STORY-064-02/cleargate-cli, uncommitted):
- test/scripts/prep-reporter-measured-metrics.red.node.test.ts (10 tests, all fail on baseline: no `## Measured Metrics`, old digest heading; exit-0 asserts pass first, so failures are the right reason)
- test/agents/reporter-measured-metrics.red.node.test.ts (5 tests: 4 fail; 1 guard passes — requiredMetricRows still in template, rows extracted from close_sprint.mjs source)
Coverage: Sc1-Sc4, Disagreements none line, R2 (fail/garbage/missing script), Case N with items, 50-item budget (row count asserted), template rows, reporter.md step 2/6.
Notes: Sc3 real-script test is vacuous on rows against the C2 stub (items {}); QA-Verify must see rows with `not measured` cells on the integrated tree. Case N test assumes `git: 2` where rework.total == git sum == 2 (fixture chosen so either reading matches). Satisfiability not proven with a throwaway impl.
