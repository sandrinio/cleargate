---
story_id: STORY-006-07
parent_epic_ref: EPIC-006
status: Draft
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-003_MCP_Adapter.md, EPIC-006, STORY-004-05
design_guide_ref: ../../knowledge/design-guide.md
sprint_id: SPRINT-04
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-18T18:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
depends_on:
  - STORY-006-02
  - STORY-004-05
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-20T08:29:34Z
---

# STORY-006-07: Audit Log Viewer

**Complexity:** L2 — date-range picker, two filter selects, URL-synced state, cursor pagination against STORY-004-05's base64url cursor.

## 1. The Spec

`/projects/[id]/audit` — filterable audit log table. Default window: last 7 days (matches STORY-004-05 default). Filters: date range (from/to), actor (member email multiselect), tool (select over the known tools: `push_item` · `pull_item` · `list_items` · `sync_status` · `join` · `auth.exchange` · `auth.device_login`). Cursor pagination ("Load more"). Filter state is synced to URL query params so admins can share links to specific queries.

### Detailed Requirements

- **Date-range picker** (new `<DateRangePicker />` reusable component):
  - Two inputs `from` / `to` with calendar popover.
  - Presets: "Today", "Last 24h", "Last 7d" (default), "Last 30d", "Custom."
  - Hard upper bound: 30 days window (STORY-004-05 cap). Picking > 30d shows an inline warning "Audit queries are capped at 30 days; narrowing to the most recent 30d."
  - Timezone: browser local; query params serialize ISO UTC. Display in local.
- **Actor filter**: multiselect over the project's `members.email`. Fetched via STORY-004-03 `/members` on initial load. "All" default.
- **Tool filter**: single-select with "All" default. Known tool list hardcoded (no MCP introspection; v1.1 may add).
- **Pagination**: STORY-004-05 returns base64url JSON cursor `{ts,id}`. UI passes opaque cursor back. 50 rows per page (matches server default). "Load more" button appends rows; "Reset" button clears filters + resets cursor.
- **URL sync**: `?from=2026-04-11T00:00:00Z&to=2026-04-18T23:59:59Z&actor=alice@example.com,bob@example.com&tool=push_item&cursor=<opaque>`. SSR reads query and passes to initial load.
- **Loading** during filter change: skeleton rows (8 placeholder lines, `animate-pulse`). Don't clear the table during in-flight fetches — show stale rows with a translucent overlay.
- **Empty state**: "No audit events in this window." Not alarming, informational.
- **Row shape**: `Timestamp` (local, "YYYY-MM-DD HH:mm:ss.SSS" — STORY-004-05 returns millisecond precision) · `Actor` (email) · `Tool` · `Target` (item CLID or project id, rendered as a link if resolvable) · `Result` (success pill / error pill with error_code).

### Data shape

`GET /admin-api/v1/projects/:id/audit?from=&to=&actor=&tool=&cursor=` (STORY-004-05):
```ts
{
  rows: Array<{
    id: string,
    timestamp: string,            // ISO with ms
    actor_email: string | null,   // null for anonymous (join, exchange)
    tool_name: string,
    target_id: string | null,     // CLID or project_id
    target_type: "item" | "project" | null,
    result: "success" | "error",
    error_code: string | null
  }>,
  next_cursor: string | null
}
```

## 2. Acceptance

```gherkin
Scenario: Default 7-day window
  Given project P has 500 audit rows across the last 30 days
  When I visit /projects/<P>/audit (no query params)
  Then the from/to inputs show "7 days ago" and "now"
  And 50 rows render from that window, sorted newest-first
  And "Load more" is visible because more rows exist

Scenario: Narrow to last 24h
  When I click the "Last 24h" preset
  Then the URL updates to ?from=<24h ago>&to=<now>
  And the rows re-fetch and render
  And the skeleton overlay appears briefly, then resolves

Scenario: Filter by tool + actor
  When I select tool=push_item and actor=alice@example.com
  Then URL updates with ?tool=push_item&actor=alice@example.com
  And only rows matching both filters render
  And cursor pagination preserves the filters

Scenario: Share a filtered link
  Given I have tool=push_item, actor=alice, from=2026-04-11
  When I copy the URL and open in an incognito window (after re-login)
  Then the same filters apply on page load
  And rows match the same query

Scenario: Load more
  Given the current page has 50 rows and next_cursor is present
  When I click Load more
  Then 50 more rows append (not replace)
  And Load more disables when next_cursor is null

Scenario: Empty state
  Given no rows match the current filter
  When the response arrives
  Then "No audit events in this window." renders
  And the filter inputs remain populated

Scenario: > 30d window warning
  When I pick from=60 days ago, to=now
  Then an inline warning shows about the 30-day cap
  And from auto-adjusts to 30 days ago
  And the query uses the adjusted range

Scenario: Error result pill + error_code
  Given a row has result=error, error_code=invite_expired
  When it renders
  Then a red pill shows "error: invite_expired"

Scenario: Click target → navigate
  Given a row with target_type=item, target_id=EPIC-042
  When I click the target cell
  Then the route changes to /projects/<P>/items/EPIC-042

Scenario: Reset filters
  Given filters are set (tool, actor, custom range)
  When I click Reset
  Then URL drops all query params
  And the default 7-day window + "All" filters restore

Scenario: Timezone display
  Given a row with timestamp 2026-04-18T14:05:03.123Z
  And my browser is in Europe/Tbilisi (UTC+4)
  When the row renders
  Then the cell shows "2026-04-18 18:05:03.123" (local)
  And a tooltip on hover shows the UTC original

Scenario: Mobile layout
  Given viewport 390 px
  When I visit /audit
  Then the table collapses to stacked rows (one row per card)
  And filter controls stack vertically
  And the date range picker renders as a full-screen sheet
```

## 3. Implementation

- `admin/src/routes/projects/[id]/audit/+page.server.ts` + `+page.svelte`
- `admin/src/lib/components/DateRangePicker.svelte` + unit test — reusable (STORY-006-08 stats page borrows for window selector, possibly)
- `admin/src/lib/components/MultiSelect.svelte` + unit test — reusable for actor filter
- `admin/src/lib/utils/url-state.ts` — reads/writes filter state to URL search params. Unit test.
- `admin/src/lib/mcp-client.ts` — `listAuditRows(projectId, filters, cursor)`

## 4. Quality Gates

- All twelve acceptance scenarios pass.
- URL-state roundtrip test: serialize → parse → equals original, covering all filter shapes (0 filters, all filters, cursor present, cursor absent).
- DateRangePicker a11y: calendar navigable with arrow keys + Enter to select; Esc closes.
- No layout shift during in-flight loads (translucent overlay, not re-render).
- Cursor pagination preserves filter params (regression: "Load more" without the filter params would return wrong data).

## 5. Open questions

1. **Timestamp rendering precision.** STORY-004-05 returns ms; many admins don't care. Default: show ms, a small v1.1 setting to hide.
2. **Tool list hardcoding.** New MCP tools added in future (EPIC-001 `stamp`? EPIC-002 wiki tools?) will need this list updated. Add a flashcard: "tool filter list requires manual update when MCP adds new audit tool_name values."
3. **Cursor-stack back-nav.** STORY-004-05's cursor is one-way. v1 offers only "Load more" (append); "Previous page" requires cursor-stack. Defer to v1.1.

## Ambiguity Gate

🟢 — STORY-004-05 locks cursor + filter params + 30-day cap. Only tool-list hygiene is open, with a mitigation flashcard.
