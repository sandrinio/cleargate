# STORY-062-01 QA-Verify (integrated tree e5e3a5f)
QA: PASS | typecheck exit 0 | 9 files green one-per-invocation (lifecycle.red 19, tab-shell.red 13, cr101 24, serve 2, render 31, cr097 13, cr102 21, collect 19, sprint.dashboard 9; 0 fail/skip)

## Gherkin -> test (dashboard-lifecycle.red unless noted)
- S1 @paths no-sprint open: "S1 @paths ... starts a loopback server, records pid+port, serves the tab shell with Backlog selected" + "binds 127.0.0.1 only"; tab-shell.red inactive-data test
- S2 @interfaces alias: "S2 ... a running dashboard is reused by --open ... --stop removes the record" + help-parity test
- S3 @rules survives sprint change: "S3 ... keeps listening and /healthz + /data follow .active" (+ no-sentinel-remnants); cr101 rewritten
- S4 @rules legacy adoption: "S4 ... ensureDaemon reuses legacy daemon, migrates record, stopDaemon stops it" (+ legacy-only stop, dead legacy)
- S5 @rules snapshot needs sprint: "S5 ... plain sprint dashboard with no .active exits 1, no dashboard.html"
- R3 gitignore: scaffold/core/.gitignore test. R1 top-level registration test. R6 healthz keys. R7 hash/default/poller tests in tab-shell.red.

## R1-R9 / freeze
R1 ok (duplicate registration block, accepted deviation, noted). R2 ok (no-active-sprint reason dropped, text "could not start the dashboard"). R3 ok: record at .cleargate/.dashboard.json; scaffold/core/.gitignore and init.ts gain line, legacy `/sprint-runs/*/.dashboard.json` kept. Outer: `check-ignore -v .cleargate/.dashboard.json` -> .gitignore:33. R4 ok (adopt+migrate legacy; stop covers both). R5 ok (sentinel valve and DEFAULT_SENTINEL_INTERVAL_MS removed; idle valve kept). R6 ok. R7 ok. R8 ok. R9 ok (manual: exit 1 "no active sprint").
Freeze: render() signature unchanged; renderBacklogPanel/renderPlanPanel and cgRenderBacklog/cgRenderPlan stubs untouched (context lines only); boundPort not renamed. sprint close still calls stopDaemon (sprint.ts:581).
Notes (non-blocking): pid-guarded teardown and poller location.reload on sprint change are extras, both tested. Task Breakdown rows all checked.

## Manual 2.2 (temp project, port 0, real repo untouched)
`dashboard --serve --port 0`: record pid/port written, sprintId ""; / shows Backlog active, Plan/Sprint hidden, "No sprint is active"; `sprint dashboard` exit 1; `dashboard --stop` printed "Stopped ... (pid, port)", record removed, process gone. Browser hash switching covered by vm-harness tests, not by eye.

## DoD 4.2
Tests met (>=3 unit, >=3 integration, 5 acceptance); all scenarios covered; typecheck and dashboard files green. Peer/Architect review pending (orchestrator).
