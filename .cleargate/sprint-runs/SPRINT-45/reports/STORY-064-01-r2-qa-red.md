# STORY-064-01 r2 QA-Red (SC-5, SC-6)

File (new): cleargate-cli/test/scripts/sprint-metrics.r2.red.node.test.ts (worktree .worktrees/STORY-064-01-r2). No production code touched.

Failing at 6ad41e8 (4):
- SC-6 primary (computeRework): got dev_reruns 1 / total 1, expected 0.
- SC-5 Completed-sprint window (runSprintMetrics, real reader, ledger-sourced session): 2 dispatches counted, expected 1.
- SC-5 non-Completed `now` exclusion: same, 2 vs 1.
- SC-6 guard "third Developer dispatch -> dev_reruns 1": baseline gives 2 (three Build rows all default pass 1). The brief expected this guard to pass at baseline; it does not. Fix must give 1 here: Build c2 is the only rerun, the pass-1/no-pass Builds are the planned pair.

Passing: SC-6 guard "no pass N, two Builds -> 1" (new); all 66 in sprint-metrics.red.node.test.ts and 5 in the integration file still pass.

Assumed seams: runSprintMetrics called with the DEFAULT reader (no `ledger` opt), CLEARGATE_TRANSCRIPTS_ROOT set to a temp dir, projectRoot temp (non-git); window from events.jsonl (08:00-18:00); 650 tokens per agent via writeAgent defaults; no fix location is assumed (reader window or post-filter both satisfy).
