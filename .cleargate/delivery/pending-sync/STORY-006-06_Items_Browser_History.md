---
story_id: "STORY-006-06"
parent_epic_ref: "EPIC-006"
status: "Draft"
ambiguity: "🟢 Low"
complexity_label: "L2"
context_source: "PROPOSAL-003_MCP_Adapter.md, EPIC-006, STORY-003-03, STORY-003-04, STORY-003-05"
design_guide_ref: "../../knowledge/design-guide.md"
sprint_id: "SPRINT-04"
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-18T18:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
depends_on: ["STORY-006-02", "STORY-003-04", "STORY-003-05"]
---

# STORY-006-06: Items Browser + Version History

**Complexity:** L2 — two routes, cursor pagination, a collapsible timeline. No mutations.

## 1. The Spec

Two routes for inspecting synced items:

**`/projects/[id]/items`** — paginated list (50 per page, cursor-based per STORY-003-05). Filters: `type` (multi-select over known types: `epic` / `story` / `sprint` / `roadmap`; empty = all) and a free-text search on `clid` (client-side filter of the current page only, v1). Columns: `CLID` · `Type` · `Title` · `Version` · `Updated by` · `Updated at`.

**`/projects/[id]/items/[clid]`** — item detail: current payload rendered in a monospace code block (JSON, collapsed sections for long fields), plus a vertical timeline showing the last 10 versions (STORY-003-03 enforces 10-deep pruning). Each timeline entry: version number, author (`member_email`), timestamp, diff-summary line ("changed: status, assignee"), expand → full payload.

### Detailed Requirements — list

- Load: `GET /admin-api/v1/projects/:id/items?cursor=&limit=50&type=epic,story` (STORY-003-05 supports keyset cursor + optional type filter — confirm at M2 architect plan).
- Cursor pagination: "Next" button at page bottom. Disabled when response has no `next_cursor`. No "Previous" in v1 (keyset paginations are one-way; store cursor stack for back-nav as v1.1).
- Row click → `/projects/:id/items/:clid` navigation.
- Empty state: Design Guide §6.9 — "No items synced yet. Items appear here as agents call push_item."
- Type chips: each type renders as a neutral tag (§6.2) with predefined color accent (epic = primary-soft, story = secondary-soft, sprint = base-200, roadmap = base-300).

### Detailed Requirements — detail

- Load: `GET /admin-api/v1/projects/:id/items/:clid` (current payload) + `GET /admin-api/v1/projects/:id/items/:clid/versions` (last 10 versions). Parallel fetch.
- Current payload renderer: split long string fields (`description`, `rationale`) into collapsible sections; show first 240 chars + "Show more."
- Timeline component (new `<Timeline />` in shared lib): vertical rail with dots, labeled "v12 · alice@ · 3h ago," expand/collapse per entry. Most recent on top.
- Diff summary: for each version (except v1), compute a shallow "changed fields" list client-side (compare version N payload to version N-1 on the keys present in both). Only field names — never field values (avoids leaking sensitive payload content in collapsed headers).
- No-history case: single version → timeline hides the "past versions" section, shows "Only one version exists."
- 404: item not found → inline "Item <CLID> not found in this project" + back link to items list.

### Data shapes

`GET /projects/:id/items` response (STORY-003-05):
```ts
{
  items: Array<{ clid: string, type: string, title: string, current_version: number, updated_by: string, updated_at: string }>,
  next_cursor: string | null
}
```

`GET /projects/:id/items/:clid/versions` (assumed shape; architect confirms against STORY-003-03 schema at M2):
```ts
{
  versions: Array<{ version: number, payload: Record<string, unknown>, author_email: string, created_at: string }>
}
```

## 2. Acceptance

```gherkin
Scenario: Browse 120 items with cursor pagination
  Given project P has 120 items
  When I visit /projects/<P>/items
  Then rows 1-50 render with CLID/type/title columns
  And a "Next" button shows page 2 (rows 51-100) when clicked
  And clicking Next again loads rows 101-120
  And Next disables at the last page

Scenario: Filter by type
  Given project P has 30 epics and 90 stories
  When I check the "Story" type filter
  Then only story rows render
  And cursor pagination respects the filter (next page is also stories)

Scenario: Client-side CLID search
  Given the current page has 50 items
  When I type "EPIC-042" in the search input
  Then only rows matching "EPIC-042" in CLID are visible
  And no network request is made (client-side filter)

Scenario: Item detail renders current + history
  Given item EPIC-042 has 7 versions
  When I visit /projects/<P>/items/EPIC-042
  Then the current payload is rendered collapsibly
  And the timeline shows 7 entries, newest first
  And each entry shows "v7 · author · 3h ago"
  And v1 has no diff-summary; v2-v7 show "changed: <fields>"

Scenario: Last-10 pruning reflected in UI
  Given item EPIC-099 has been pushed 15 times
  When I view its detail page
  Then the timeline shows exactly 10 entries (pruning from STORY-003-03)
  And a meta line reads "Showing last 10 versions"

Scenario: No version history (single version)
  Given item EPIC-001 has version 1 only
  When I view its detail page
  Then the timeline section shows "Only one version exists"
  And no expand/collapse widgets render

Scenario: Item not found
  When I visit /projects/<P>/items/DOES-NOT-EXIST
  Then a 404 inline message shows
  And a back link routes to /projects/<P>/items

Scenario: Empty items list
  Given project P has zero items
  When I visit /projects/<P>/items
  Then EmptyState reads "No items synced yet"

Scenario: Expanding a version shows full payload
  Given timeline entry v5 is collapsed
  When I click its header
  Then the full payload JSON expands inline
  And collapsing re-hides it

Scenario: Diff summary never leaks values
  Given v4 changed field "status" from "draft" to "approved"
  When I look at v4's collapsed header
  Then it reads "changed: status"
  And the value "approved" is NOT in the header text

Scenario: Mobile layout
  Given viewport 390 px
  When I visit the items list
  Then the table collapses to stacked cards with CLID + type chip + title
  And the detail page's timeline stacks vertically at full width
```

## 3. Implementation

- `admin/src/routes/projects/[id]/items/+page.server.ts` + `+page.svelte`
- `admin/src/routes/projects/[id]/items/[clid]/+page.server.ts` + `+page.svelte`
- `admin/src/lib/components/Timeline.svelte` + unit test — reusable (STORY-006-07 may borrow patterns but not the component itself)
- `admin/src/lib/components/PayloadViewer.svelte` — collapsible JSON renderer + unit test
- `admin/src/lib/utils/diff-fields.ts` — shallow field-diff helper (top-level keys only) + unit test
- `admin/src/lib/mcp-client.ts` — `listItems`, `getItem`, `listItemVersions`

## 4. Quality Gates

- All eleven acceptance scenarios pass.
- Diff-field helper is pure + unit-tested (10+ test cases): missing keys, added keys, changed values, null vs undefined, array length difference.
- Timeline component a11y: keyboard navigation between entries, Enter to expand.
- `PayloadViewer` does not render payload fields named `password`, `secret`, `token`, `api_key` — redacted to "•••••" (defense-in-depth; STORY-003-03 should already strip these server-side, but UI double-gates).
- Lighthouse on detail page ≥ 85 (slightly lower acceptance because of JSON rendering; dashboard stays ≥ 90).

## 5. Open questions

1. **Type filter endpoint support.** STORY-003-05 shipped `list_items` with keyset cursor; type filter may or may not be supported. If not, architect M2 either adds it (small MCP addition) or implements client-side filter of the full page only. Default: architect adds server-side filter if straightforward, otherwise client-side + a flashcard note.
2. **Payload field redaction.** Double-gate redaction list is defense-in-depth. Make it configurable via env or code constant? Default: hardcoded shortlist; document for future.
3. **Item-level search (server-side fuzzy match).** Out of scope. CLID exact-prefix client filter is v1 UX. Full-text search lands when the items table grows (v1.1 + Postgres FTS).

## Ambiguity Gate

🟢 — STORY-003-03/04/05 own the data shape; only type-filter endpoint support is unclear and has a safe fallback.
