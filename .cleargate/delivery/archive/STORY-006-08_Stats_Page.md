---
story_id: STORY-006-08
parent_epic_ref: EPIC-006
parent_cleargate_id: "EPIC-006"
sprint_cleargate_id: "SPRINT-04"
status: Done
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-003_MCP_Adapter.md, EPIC-006 §6 Q2 (Chart.js override), STORY-004-06
design_guide_ref: ../../knowledge/design-guide.md
sprint_id: SPRINT-04
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-18T18:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
depends_on:
  - STORY-006-02
  - STORY-004-06
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:45:46.483Z
push_version: 2
---

# STORY-006-08: Stats Page (Chart.js, Lazy-Loaded)

**Complexity:** L2 — one route, one chart, one stat block. Key discipline: keep Chart.js out of the main bundle.

## 1. The Spec

`/projects/[id]/stats` — basic usage stats for the selected window (7d / 30d / 90d). Three sections:

1. **Summary row** — three value chips (Design Guide §6.3): "Requests" · "Error rate" · "Unique actors". Each rendered as `rounded-full bg-accent text-accent-content text-3xl font-bold px-4 py-2 tabular-nums`.
2. **Requests/day bar chart** (Chart.js) — one bar per day in the window. Primary series uses Design-Guide terracotta (`--color-primary` = `#E85C2F`). X-axis: dates (day-level); Y-axis: request count. Zero-filled days (via STORY-004-06's `generate_series` output) render as small bars, not gaps.
3. **Top 10 items** — ordered list of the most-pushed items in the window. Each row: CLID (link to item detail) · push count · last_push_at. Design Guide §6.7 table pattern.

### Detailed Requirements

- **Window selector**: segmented control (7d / 30d / 90d) at top-right. URL-synced via `?window=30d` (SSR-aware, like STORY-006-07). Default 30d per EPIC-006 acceptance example.
- **Data source**: `GET /admin-api/v1/projects/:id/stats?window=30d` (STORY-004-06). Response shape:
  ```ts
  {
    requests_per_day: Array<{ date: string, count: number, error_count: number }>,
    error_rate: number,         // 0..1
    unique_actors: number,
    top_items: Array<{ clid: string, push_count: number, last_push_at: string }>
  }
  ```
- **Chart.js lazy-load**: `import('chart.js')` inside an `onMount` client-only effect. Do not import at module top-level. The dashboard route (`/`) must not pay for this bundle.
- **Bundle assertion** (CI gate): the `/` route's compiled output does not include `chart.js` chunk. Verified via Playwright network inspection + Vite build output grep.
- **No third-party CDN**: Chart.js served from the bundle; no `<script src="https://cdn.jsdelivr.net/...">` tags.
- **Chart config**: minimal, Design-Guide aligned — bars `bg-primary`, axis text `--cg-muted`, grid lines `--cg-line` (very low contrast), no legend (single series). Tooltip enabled, formatted "<date>: <count> requests (<error_count> errors)".
- **Empty / sparse**: if the window has < 3 days of non-zero activity, show a soft hint "Not much activity yet — stats fill in as your team uses ClearGate." Chart still renders.
- **Error state**: 5xx from stats endpoint → inline retry banner (same pattern as STORY-006-03).
- **Mobile**: chart fills width; summary row wraps to two rows of chips; top-items list stacks.

## 2. Acceptance

```gherkin
Scenario: Render 30-day stats
  Given project P has 30 days of audit data
  When I visit /projects/<P>/stats (default window)
  Then the summary row shows three value chips with Requests / Error rate / Unique actors
  And the Chart.js bar chart renders within 1 second of page interactivity
  And the top-10 items list shows up to 10 rows

Scenario: Window selector switches data
  Given I am on /stats?window=30d
  When I click "7d"
  Then URL updates to ?window=7d
  And the chart re-renders with 7 bars
  And summary chips update

Scenario: Chart.js is lazy
  When I load the dashboard route `/`
  Then the network tab shows NO chart.js chunk requested
  When I navigate to /projects/<P>/stats
  Then a chart.js chunk is fetched exactly once

Scenario: Zero-filled days render as small bars
  Given a 30d window where days 1-5 have zero requests
  When the chart renders
  Then days 1-5 are present with count=0 bars
  And no gaps exist in the x-axis

Scenario: Sparse activity hint
  Given the 30d window has <3 active days
  When stats page renders
  Then a subtle hint "Not much activity yet..." renders below the chart
  And the chart still renders with the sparse data

Scenario: Top items clickable
  Given the top-10 includes EPIC-042
  When I click its CLID
  Then the route changes to /projects/<P>/items/EPIC-042

Scenario: Design-Guide color compliance
  When I inspect the chart bars
  Then the fill color resolves to #E85C2F (--color-primary)
  And axis text color resolves to --cg-muted

Scenario: Empty project (zero audit rows)
  Given a freshly-created project with no activity
  When I visit /stats
  Then summary chips show "0 requests", "—" error rate, "0 actors"
  And the chart renders empty with "No activity in this window" overlay

Scenario: Stats endpoint error
  Given the stats API returns 503
  When I visit /stats
  Then an inline retry banner shows
  And the previously-rendered data (if any) stays visible

Scenario: Lighthouse performance acceptable
  When I run Lighthouse against /projects/<P>/stats (prod build)
  Then performance score ≥ 80
  (Lower than / and /projects/<id>'s ≥ 90 target because of Chart.js cost)

Scenario: Mobile
  Given viewport 390 px
  When I visit /stats
  Then chart fills width, summary wraps, top-items stacks
  And no horizontal scroll
```

## 3. Implementation

- `admin/src/routes/projects/[id]/stats/+page.server.ts` + `+page.svelte`
- `admin/src/lib/components/RequestsChart.svelte` — Chart.js wrapper, lazy-imports `chart.js/auto` inside `onMount`. Unit test (mounts a mock canvas).
- `admin/src/lib/components/ValueChip.svelte` — Design Guide §6.3 dark stat chip. Unit test.
- `admin/src/lib/components/WindowSelector.svelte` — segmented control for 7d/30d/90d. Unit test.
- `admin/src/lib/mcp-client.ts` — `getStats(projectId, window)`
- `admin/scripts/check-bundle.ts` — CI gate asserting `/` build output has no `chart` chunk reference.

## 4. Quality Gates

- All eleven acceptance scenarios pass.
- **Bundle assertion**: grep the Vite prod build manifest — `admin/build/client/_app/` chunks for `/` route do not include `chart`. Playwright network check on `/` dashboard route: zero requests matching `chart*.js`.
- **Lazy-import verified**: Chart.js only loaded on `/stats` (Playwright).
- Chart color grep test: confirm `--color-primary` used (not hardcoded `#E85C2F` duplicated in JS).
- Lighthouse on `/stats` ≥ 80.

## 5. Open questions

1. **Chart type variety in v1?** Just bar chart in v1. Line chart variant for errors-over-time is a v1.1 ask.
2. **Top-items tie-breaking.** STORY-004-06 orders by push_count desc; ties tie-break by last_push_at desc. Architect confirms at M2.
3. **Window beyond 90d.** Not supported in v1 (STORY-004-06 caps at 90d). If ops demands 365d, pre-compute rolls in a v1.1 sprint (schedule TBD).

## Ambiguity Gate

🟢 — Chart.js override locked by EPIC-006 Q2; stats shape locked by STORY-004-06; Design Guide provides all the colors and chip styles.
