# STORY-064-01 r2 QA-Verify
VERDICT: PASS. Typecheck pass. r2 red 5/5, sprint-metrics.red 66/66, red.integration 5/5, subagent-ledger.red 32/32, no-inline-id-regex 7/7.
- Diff scope: red file unchanged b2456f6..7458176; 6ad41e8..7458176 touches only sprint_metrics.mjs and the r2 red file.
- SC-5: readDispatches gets `window ?? report.window ?? null` for every source. Null sprint window behaves as before: report.window is only set on the fallback path, null otherwise.
- SC-6: itemPasses = distinct passOf across reds+builds; no "pass N" gives 1, same as before. Verify reruns and C2 keys unchanged.
- Probes: (a) pass 1/2 reds + one Build -> dev_reruns 0. (b) reader filter is inclusive at both ends (skips ms<ws || ms>we), consistent with sprintWindow's ISO bounds. (c) Active window end = now; Completed end = latest event.
- Scratch dir removed.
