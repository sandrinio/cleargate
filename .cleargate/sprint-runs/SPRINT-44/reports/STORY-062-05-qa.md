# STORY-062-05 QA-Verify (role: qa)
QA: PASS | tree story/STORY-062-05 @ a4ddda5 | lane standard

TYPECHECK: pass (clean). TMPDIR=/tmp/cg44q5, one file per invocation, 0 fail / 0 skipped everywhere:
ticket-view.red 24, host-guard.red 27, plan-endpoint.red 24, plan-roundtrip.red 2, plan-tab.red 14, plan-stale-claims.red 4, plan.red 9, plan 9,
backlog.red 18, backlog-tab.red 13, backlog 5, dashboard-lifecycle.red 19, tab-shell.red 13, cr097 13, cr101 24, cr102 21, serve 2, render 31,
collect 19, commands/sprint-scope.red 31.

## Mapping (red-now-green) - 5 of 5
- S1 read in modal: ticket-view.red A1, A2 (no bodies in /data or /), B1 (one fetch, Loading..., html)
- S2 child + Plan rows: ticket-view.red B2, B3a, B3b (no epic toggle, no tick), B7
- S3 only backlog ids (outline): ticket-view.red A5 (4 rows), A6a, A6b, A9
- S4 foreign Host on every route: host-guard.red GET /, /data, /doc, /healthz, POST /plan, 404 fallthrough, loopback allow rows, other-port Host, planGuard other checks, H5 probe, H6 oversize
- S5 failed load: ticket-view.red A7 (server), B4 (client message)
Red files unchanged: `git diff 7299d64 a4ddda5 --stat` = collect.ts, render.ts, serve.ts only (94+/9-).

## Rule checks (literal)
- R1: 200 {ok,id,title,html}; html = renderMarkdown(capDoc(raw)); capDoc/MAX_DOC_CHARS exported from collect.ts and readDeliveryDoc/readExecutionLog now use capDoc (identical bytes, same 40000 + suffix).
- R2: lookup is `collectBacklogFn(cwd).items.find(i => i.id === id)` exact match; path = path.join(cwd, item.file); readDeliveryDoc not used; empty/unknown -> 404 "unknown id"; GET only (POST /doc -> 404); read failure 500 "cannot read <file>", thrown -> 500 "internal error: <msg>" (per amendment).
- R3: view buttons in cgBacklogRow (covers top-level and child rows) and cgPlanRowsHtml (appended after the row content, not in a label); both delegated click handlers return early on `.doc-btn`.
- R4: cgOpenItem: title = id, "Loading..." body, one fetch per click, error = body.error else `HTTP <status>` else `server unreachable`; cgModalSeq discards stale responses; cgFindDoc null for item:; no bodies in /data or DATA (A2).
- R5: hostGuard first in the http handler, before lastRequestAt and any collector, for every route incl. /healthz and the 404 fallthrough; planGuard calls hostGuard then its unchanged Origin / content-type / token / size checks (diff vs 8f71c87 shows only the Host lines moved; 403 strings identical).
- CR-102: one CSS line (`.bl-row .doc-btn, .plan-row .doc-btn { margin-top:0 }`); no new colour, shadow or radius. No dependency change (package.json untouched). SprintDashboardData unchanged (collect.ts diff is only the cap export).

## Manual (temp copy /tmp/cg44q5/scratch5 of delivery + sprint-runs, no .active; tsx serve() port 0 -> 53869; stopped, pgrep empty)
- /doc?id=BUG-106 200 rendered; SPRINT-44, ../../etc/passwd, empty id: 404 "unknown id".
- Host evil.example on /data, /healthz, /, /nope: 403 "forbidden: bad host". 127.0.0.1:P and localhost:P on /, /data, /healthz: 200.
- GET / carries `data-doc-key="item:` twice, both inside the client script (rows render client-side; button literals present). /data has none.
- `git status --porcelain .cleargate/delivery` identical before and after (the pre-existing SPRINT-44 modified + STORY-062-05 untracked only).

## Observations (non-blocking)
- Task Breakdown rows (4) unchecked in story file: orchestrator ticks at merge (rule 15; advisory).
- The 2.2 manual step (browser clicks) not driven in a real browser; covered by vm-context client tests B1-B6.

REGRESSIONS: none. MISSING: none.
