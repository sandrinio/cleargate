# STORY-064-01 QA-Red report (role: qa)

QA-RED: WRITTEN. Baseline = cli worktree .worktrees/STORY-064-01/cleargate-cli @ 4720d79 (C2 stub). Nothing committed. No implementation file read; no existing test edited. Holdout not read.

Files (worktree-relative, all new):
- test/scripts/sprint-metrics.red.node.test.ts — 55 tests: 53 fail, 2 pass ([guard])
- test/scripts/sprint-metrics.red.integration.node.test.ts — 5 tests: 5 fail (stays red until CR-120 integrates; real C1 reader returns [] on the stub)
- test/fixtures/sprint-metrics/builders.ts — shared builders (temp project, git repos built at test time, DispatchRow factory, synthetic transcript writer). Not matched by npm test glob.

Failure reasons (baseline): 50 in-process tests fail on `sprint_metrics.mjs must export <fn>() — not yet implemented` (typeof asserts: matchItem 12, runSprintMetrics 11, computeRework 11, classifyCommits 6, sprintWindow 3, readGitCommits 3, roundKind 2, readRepoList 2). 3 CLI tests in the unit file fail on stub output (items empty, no metrics.json/table line, no warning). 5 integration tests fail because the stub reads no dispatches.
Passing guards (2, labelled): usage exit 2 / empty stdout (no args, `--json` first); exit 0 on a fully degraded source.

Coverage: Gherkin 1 (seam: 4 rows -> 1/0/0/1; integration: 60 transcripts, <10 s), outline 2 (5 rows + C-2 two-items, short-form boundaries, "001", sprint-level keywords), outline 3 (5 rows via computeRework and end to end), Gherkin 4 (pure classify + git fixture + dup subject in release repo counts once + disagrees true/false), Gherkin 5 (C2 shape, metrics.json == stdout, privacy marker), Gherkin 6 (CLI + integration, "not measured" w/ git total). R5 classification, R6 repo list/skip/plain subdir/"git data: not measured", R7 window, R8 disagreement, R9 throwing reader / missing state / missing sprint dir, interrupted + post_merge counts, SC-3 totals/share/sprint_level/unattributed/repos.

Assumed shapes (not frozen by C2; Developer may need these confirmed or the tests amended via QA-Red):
- Roster arg to matchItem = string[]; phase may be '' or null.
- computeRework `mergedAt` = ISO string | null; classifyCommits commit `date` = ISO string; window = {start,end} | null.
- sprintWindow `now` = Date; runSprintMetrics `now` = Date. Returns start/end compared via Date.parse.
- runSprintMetrics writes <sprintDir>/metrics.json (tests read that file, fall back to return value / return.doc).
- readRepoList returns entries as written, "." first. readGitCommits -> {commits:{date,subject,repo}[], repos, warnings}; skip warning must contain the skipped path text.
- computeRework result has no `dispatches` count; "dispatches" bucket of outline 3 is asserted via metrics.json dispatches.total.
- Verify post-integration drop is pinned with Build, Verify, Integrate, Verify (reads R4 as written). Two verifies both after the same Integrate-after-build are not pinned (rule is ambiguous there).
- Git fixture repos: `git init -b main`, empty commits dated via GIT_AUTHOR/COMMITTER_DATE, GIT_* stripped from env.

## SC-4 rows

Added to `test/scripts/sprint-metrics.red.node.test.ts` (immutable-Red file amended per SC-4; no production code touched).

Outline rows added (R3 outline): `Developer contract step C0 | Contract`, `Architect amend M2 for stale claims | ""`, `QA consolidation full-suite run | ""` -> sprint-level. (The file previously had 5 rows; it did not yet contain the R3 additions, so these three are new.)

New describe "R3 SC-4" (each title contains "SC-4"):
- walkthrough + contradiction keywords (FAIL at baseline)
- cleanup / simplify / wiki / consolidation / contract / M<N> keywords (FAIL)
- own sprint ID: `QA-Verify SPRINT-09 rerun`; matchItem has no sprint-id input, so pinned via `runSprintMetrics('SPRINT-09', ...)` on a synthetic fixture; asserts sprint_level {1, 650} and unattributed.dispatches 0 (FAIL)
- agent type cleargate-wiki-query + "Prior-work query: dashboard board" (FAIL)
- agent type code-simplifier:code-simplifier + "Cleanup pass on sprint diff" (FAIL)
- agent type alone, description "Pass on diff": code-simplifier (bare and prefixed), cleargate-wiki-contradict, cleargate-wiki-query, architect-reader, architect-synth, reporter, someplugin:reporter (FAIL)
- [guard] architect-reader + "SDR reader STORY-003-01" -> item STORY-003-01 (passes at baseline by design)
- [guard] developer + "Generate sample week" -> unattributed (passes at baseline by design)

Assumed seam shape: `matchItem(description, phase, roster, agentType?)`, agentType a string, optional 4th arg; sprint own ID only reachable via runSprintMetrics(sprintId, ...) (no matchItem input). Note: "Prior-work query" / "dashboard board" are matched by no current keyword; "M1 plan" already passes via `plan`.
