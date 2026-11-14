# STORY-064-01 r2 dev report (SC-5, SC-6)
Commit 7458176 on story/STORY-064-01-r2. Only sprint_metrics.mjs changed.
- SC-5: readDispatches now gets `window ?? report.window ?? null` for every source.
- SC-6: computeRework counts distinct passes over reds and builds together; unused surplus() removed.
- gen:codex no diff; prebuild, typecheck, build clean. 115/115 pass (r2 red, sprint-metrics.red, .red.integration, subagent-ledger.red, no-inline-id-regex).
Smoke (scratch copies, removed):
- SPRINT-44: 52 dispatches, rework 3, 98153410 tokens, unattributed 0; rework 062-01=1, 062-04=2, rest 0.
- dispM SPRINT-01: 128, rework 4, 113870074 tokens, unattributed 0; 001-08=2, 001-11=2, rest 0.
- dispM SPRINT-02: 168, rework 8, 226534211 tokens, unattributed 4 dispatches / 16905277 tokens (7.5%); 002-03=1, 002-07=2, 002-09=2, 002-10=2, 002-11=1, rest 0.
