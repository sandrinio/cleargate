# C0 contract dev report (SPRINT-44 / EPIC-062)

| Contract | Branch | SHA | Files |
|---|---|---|---|
| C1 | contract/S-44-shell | e06cac8 | src/dashboard/render.ts |
| C2 | contract/S-44-backlog | 343c989 | src/dashboard/backlog.ts (new), src/dashboard/serve.ts, src/dashboard/render.ts |
| C3 | contract/S-44-scope | 1cdd65d | src/commands/sprint-scope.ts (new) |
| C4 | contract/S-44-plan | d6c74ac (merge, no conflicts) | sprint-scope.ts via merge |

Typecheck: pass on all four branches.
Tests (test/dashboard/*.node.test.ts, one file at a time): all green on all four branches
(collect 19, cr097 13, cr101 25, cr102 21, markdown 16, render 31, serve 2; 0 fail).

Deviations from the frozen table: none. Notes:
- Backlog/plan `<section>`s carry the `hidden` attribute in SSR (no-JS safe); sprint section visible by default; client `cgShowTab()` toggles on hash, default `#sprint`.
- Tab bar is a `<nav class="tab-bar">` above `<main>`; no CSS added (STORY-062-01 owns styling).
- `/data` = `{ ...renderDataBodies(collectFn), backlog }`; `renderDataBodies` itself unchanged.
- Commit subjects follow the dispatch brief (differ slightly from waves.json `created_by` text).
- Worktree left on contract/S-44-plan, clean.
