# STORY-062-02 QA-Verify (role: qa)
QA: PASS | tree story/STORY-062-02 @ a9ab8f8 | lane standard

TYPECHECK: pass (clean). Fresh shell, TMPDIR=/tmp/cg44v2, one file per invocation, 0 fail / 0 skipped:
backlog.red 18, backlog-tab.red 13, backlog 5, tab-shell.red 13, render 31, serve 2, cr097 13, cr102 21, collect 19.

## Mapping (red-now-green)
- @data outline x4 (BUG-106/CR-120/EPIC-031/STORY-031-03): backlog.red "@data outline: <file> -> <id>..." (4 rows) + "missing cached_gate_result"
- Epics expand: collector -> backlog.red "children map"; view -> backlog-tab.red "click on data-bl-epic shows bl-child rows, no request"
- @paths filters: backlog-tab.red "type bug + search codex, no request, stable across a poll" (+ id/case, area, epic filters)
- @rules malformed: backlog.red "GET /data ... diagnostics name BUG-900_broken.md" + malformed-YAML / unterminated-fence unit tests
- @rules sprint files: backlog.red "Sprint files are not backlog items"
- R5/R7: grouping order, badge, rows, diagnostics render + clear; SSR containers and hint; GET / embeds backlog.
Coverage 5 of 5 scenarios (outline counts once).

## R1-R7 and freeze rules
- R1-R3: all met (readdir, SPRINT-* excluded, id regex, parseFrontmatter + detectWorkItemTypeFromFm w/ id fallback, children for EPIC- parents, diagnostics, never throws, mtime+size cache with prune).
- R4: serve.ts diff vs C2 is 0 lines; /data and DATA blob carry backlog (tests + manual).
- C2 frozen names/types (BacklogItem, BacklogData, collectBacklog signature, renderBacklogPanel signature) unchanged.
- render.ts edits only: the backlog stub line replaced by the block, and renderBacklogPanel body (incl. backlog-scoped .bl-* CSS). cgRenderPlan stub untouched.
- Exactly one `function cgRenderBacklog(` in the integrated render.ts; no stub redeclaration.
- No filter-chip / doc-btn in added lines; no <script> added in panel markup (only <style>).
- Task Breakdown: 5 rows unchecked in the story file; Dev reports all done, orchestrator ticks at merge (rule 15). Advisory.

## Manual 2.2 (temp project copy of pending-sync, port 0; real repo untouched, process stopped)
- GET /data: backlog.items 135, diagnostics 0, no SPRINT-* items; children[EPIC-062] = STORY-062-01..04. GET / contains data-tab="backlog".
- NOTE: BUG-106's cached gate in the real file is currently pass:true (gate re-run since the story was written), so the "BUG-106 shows warning" step cannot be observed on real data; the collector faithfully mirrors the file, and the failing path is covered by the fixture test. Not a defect. Visual browser check of expand/filters not performed (headless); covered by vm tests.

## DoD 4.2
Min tests met (unit >=4, integration >=1 via GET /data, 5 scenarios), typecheck clean, dashboard tests green. Architect review is outside QA.

REGRESSIONS: none. MISSING: none.
Adversarial note (non-blocking): a title heading equal to id with no colon yields '' title; fine.
