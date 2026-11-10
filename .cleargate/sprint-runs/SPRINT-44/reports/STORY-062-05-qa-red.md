# STORY-062-05 QA-Red report (role: qa)

QA-RED: WRITTEN

Commit: see `git log -1` on story/STORY-062-05 in .worktrees/STORY-062-05/cleargate-cli (`qa-red(STORY-062-05): ticket view and host guard red tests`). Base 8f71c87.

Files (cleargate-cli/test/dashboard/):
- ticket-view.red.node.test.ts — 24 tests: 22 red, 2 green (UNCHANGED-labelled: A2 no bodies in /data or GET /; A9 POST /doc -> 404).
- host-guard.red.node.test.ts — 27 tests: 9 red, 18 green (UNCHANGED/positive controls).

No existing test file edited (M3 verdict confirmed). Run with TMPDIR=/tmp/cg44r5.

## ticket-view — per test
| Test | Status | Reason at baseline |
|---|---|---|
| A1 200 shape, html===renderMarkdown | red | /doc 404 "not found" |
| A2 no bodies in /data and GET / | green (unchanged) | regression guard |
| A3 cap 40000 + suffix | red | /doc 404 |
| A4 capDoc/MAX_DOC_CHARS exported | red | capDoc not exported |
| A5 x7 (SPRINT-44, NOPE-1, ../../etc/passwd, encoded, empty, missing, archived) | red | body is text "not found", not `{ok:false,error:"unknown id"}` |
| A6a serves item.file not id path | red | /doc 404 |
| A6b unlisted id on disk -> 404 unknown id | red | text body, not JSON |
| A7 listed 200 then 404 after unlink | red | first /doc 404 |
| A8 throwing collector -> 500 + survives | red | 404, not 500 |
| A9 POST /doc -> 404 | green (unchanged) | |
| B1 button, one fetch, Loading…, html | red | no view button in Backlog row |
| B2 child row + Plan buttons, modal, no toggle/tick | red | no data-doc-key="item:STORY-062-01" in child row |
| B3a view click in [data-bl-epic] does not toggle | red | expand handler toggles (no .doc-btn guard) |
| B3b view click in [data-plan-children] does not tick | red | plan handler ticks children (no .doc-btn guard) |
| B4 error field / HTTP status / unreachable text | red | no item: branch, no fetch |
| B5 stale response ignored | red | no item: branch |
| B6 poll does not clobber modal | red | view click does not fetch /doc |
| B7 cgFindDoc('item:…') === null | red | falls through to sprint story body |

## host-guard — per test
| Test | Status | Reason |
|---|---|---|
| H0 hostGuard exported + allow/refuse table | red | serve.ts does not export hostGuard |
| H1 setup (token readable) | green | |
| H1 GET / , /data, /healthz | red | 200 instead of 403 |
| H1 GET /doc?id=BUG-106 , GET /nope | red | 404 instead of 403 |
| H1 POST /plan evil host | green (unchanged) | planGuard already refuses; counters/tree asserted unchanged |
| H2 GET / /data /healthz /nope x {127.0.0.1,localhost} (8) | green (unchanged) | |
| H2 GET /doc?id=BUG-106 x2 | red | route missing (404) |
| H2 POST /plan x2 (200 valid; token 403 not Host) | green (unchanged) | |
| H3 Host port+1 on /data -> 403 | red | 200 |
| H4 bad origin / content-type / token / oversize (4) | green (unchanged) | pins planGuard strings |
| H5 probeHealthz identifies server | green (unchanged) | daemon probe risk |
| H6 refused POST with 65 537-byte body drained | green (unchanged) | |

## Scenario mapping (5/5)
- S1 Read a backlog item: A1, A2, B1 (+A3, A4)
- S2 Child row + Plan row: B2, B3a, B3b, B7
- S3 Only listed ids (outline, 4 rows + 3 extras): A5, A6a, A6b
- S4 Foreign Host (outline, 5 rows + fallthrough): H0, H1 per route, H2 per route/host, H3 (+H4-H6)
- S5 Failed load message: A7 (server), B4 (client)
Beyond Gherkin (M3 additions): A8 (500 + survives), A9 (GET only), B5, B6.

## Neighbour runs (all green, unchanged)
plan-endpoint.red 24/24, backlog-tab.red 13/13, plan-tab.red 14/14, cr101 24/24, dashboard-lifecycle.red 19/19, render 31/31, cr102 21/21.

## Spec notes
- B2/B3b plan-tick assertions only become reachable once the earlier backlog assertions pass; B3a/B3b were split so each reds on its own.
- Harness `El` gained a `parent` pointer so `closest()` walks up; the client checks are on innerHTML only (title via textContent) per M3.
- H2 `/doc` rows are red until the route exists, by design.
