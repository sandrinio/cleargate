# STORY-062-01 QA-Red
Worktree: .worktrees/STORY-062-01/cleargate-cli (not committed). Typecheck clean. TMPDIR=/tmp/cg44q1.

## New files
- test/dashboard/dashboard-lifecycle.red.node.test.ts (19 tests; 14 fail, 5 pass at baseline). R1, R2, R3, R4, R5, R6, S1..S5, pid guard, scaffold/core/.gitignore. `daemon` imported as a namespace (legacyRecordPath is new). All servers port 0.
- test/dashboard/tab-shell.red.node.test.ts (13 tests; 5 fail, 8 pass). SSR tab shell plus node:vm client harness (default tab, hash, hashchange, poller reload on sprint flip).
  The 13 passing tests are baseline anchors (C1 behaviour or already-correct legacy behaviour): wiring proof, not red.

## Edited existing: test/dashboard/cr101.node.test.ts (9 fail, 15 pass at baseline)
- All `recordPath(root,'SPRINT-42')` / `readRecord(root,'SPRINT-42')` -> one-arg form (record moves, R3).
- startServer: fixed hrtime port -> `port: 0`, dropped `sentinelIntervalMs` (valve removed, R5); returns `h.port` (bound port).
- "returns null when there is no active sprint" -> "spawns a daemon with no active sprint" (R2); in-process spawn, expects reused=false, sprintId ''.
- Port-scan test: squatter on port 0, serve at its port with autoPort; asserts rec.port !== base and h.port === rec.port (no +1).
- Removed "exits when the .active sentinel stops naming its sprint" (R5); replaced by S3 in the lifecycle file.
- Idle tests: ports 43812/43813 -> 0; dropped sentinelIntervalMs.
- Gitignore test: keeps the legacy `/sprint-runs/*/.dashboard.json` assertion and adds `src.includes("'/.dashboard.json'")` (R3 init.ts line).
- serve.node.test.ts and render.node.test.ts untouched (33 pass).

## Notes
- Lifecycle tests that pass at baseline: legacy-only stop, dead legacy pid, S5 snapshot exit 1, 127.0.0.1 bind, /healthz keys (R6 already true when sprintId resolves per request).
- Outer .gitignore line is not tested (outside the cli repo); verify manually in QA-Verify.
