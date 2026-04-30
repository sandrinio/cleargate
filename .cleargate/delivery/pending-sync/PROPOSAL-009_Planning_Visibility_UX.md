---
proposal_id: PROP-009
status: Draft
author: AI Agent (Opus 4.7) + Vibe Coder (sandro.suladze@gmail.com)
approved: false
created_at: 2026-04-21T00:00:00Z
updated_at: 2026-04-21T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-21T00:00:01Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id PROP-009
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-20T21:13:10Z
  sessions: []
sprint_cleargate_id: SPRINT-06
---

# PROPOSAL-009: Planning Visibility UX — Sprints, Epic Hierarchy, Activity

## 1. Initiative & Context

### 1.1 Objective

Turn the admin UI from a flat item browser into a **planning dashboard** that mirrors how work actually runs in ClearGate: a sprint-centric timeline (shipped → active → planned), epics as expandable containers over their child stories, orphan items surfaced side-by-side, and an activity chart that shows created-vs-completed over time. Builds on the work already planned in EPIC-006 (Admin UI) but replaces the implicit "one flat items table" mental model.

### 1.2 The "Why"

1. **Stakeholder read.** The repo already knows what's planned (`EPIC-012`), in flight (`SPRINT-06`), and shipped (SPRINT-01…05). There is no non-grep way to see that shape — a PM or the Vibe Coder cannot glance at a browser and answer "what did we ship, what's next." A sprint timeline + active-sprint panel closes that gap without new data.
2. **Hierarchy is the primary mental model.** ClearGate work is structurally Epic → Story (with Sprint as the delivery vessel), but the current items browser is a flat table that obscures that shape. Users want to see "this epic has 11 stories, 9 shipped, 2 Draft" at a glance, not click through 11 individual rows.
3. **Activity chart is a retrospective + forecasting tool.** Created-vs-completed over time is a cheap-to-compute, high-signal view: shows burn-down during a sprint, shows draft backlog growth, makes "are we accumulating debt" visible. Free with the `created_at` / `resolved_at` / `updated_at` fields we already stamp.
4. **Orphans must not hide.** Proposals, CRs, Bugs, and ad-hoc items have no parent. A pure tree view would hide them. The UX must surface "unparented items" as a first-class column — otherwise the admin UI is less useful than the current flat list.

### 1.3 Scope anchor

This Proposal sits **above EPIC-006**. EPIC-006 stories 006-03 (Dashboard), 006-06 (Items Browser), 006-08 (Stats) are Draft today — this Proposal reshapes them and adds a new Sprints route. If approved, EPIC-006 stories are rewritten (not a separate epic) unless decomposition tips into L4 at which point a sibling epic is cut.

## 2. Technical Architecture & Constraints

### 2.1 Dependencies

- **Admin API (EPIC-004):** must expose parent/sprint linkage in item list responses — today `ItemSummary` (`cleargate-cli/src/admin-api/responses.ts:97`) has no `parent_id`, `sprint_id`, `created_at`, or `resolved_at`. Either (a) extend the schema with two nullable `string` IDs + two timestamps, or (b) derive from `current_payload` client-side. **Recommendation: (a)** — typed API beats fragile frontmatter-key sniffing and keeps the UI query simple.
- **MCP schema (mcp/src/db):** requires columns `parent_cleargate_id TEXT NULL` and `sprint_cleargate_id TEXT NULL` on `items` (or a join table), plus indexes for the tree query. `created_at` already exists; `resolved_at` is new (nullable, set when `status` transitions into a completed terminal state).
- **Push flow:** `cleargate push` must extract `epic_id` / `sprint_id` from frontmatter and send them in the push payload. Already unstructured in frontmatter today (e.g., `STORY-004-07` frontmatter references its parent epic in body text only) — formalise as two top-level keys: `parent_cleargate_id:` and `sprint_cleargate_id:`.
- **Charting:** Chart.js (already chosen in EPIC-006 Q2 2026-04-17).
- **No new runtime infra.** No queue, no background job, no cache layer — everything is a SELECT + one aggregation on the admin API.

### 2.2 System Constraints

| Constraint | Details |
|---|---|
| Source of truth | Admin API is the only read path for the UI. No direct DB access, no local-file reads. Parent/sprint links are derived from pushed items, not from `.cleargate/delivery/*.md` on the Admin UI server. |
| Orphans | Items with `parent_cleargate_id = null` render in an "Unparented" group alongside epics; they are never hidden. |
| Sprint status | Derived from `status`: `Completed` → shipped lane, `Active` → active lane, `Planned` / `Draft` → upcoming lane. No new status vocabulary introduced. |
| Active sprint rule | At most one sprint is `Active` at a time (enforced by protocol, not DB constraint in v1). UI shows the first one it finds in `Active`; logs a console warning if more than one. |
| Performance | Epic-tree fetch for a project ≤ 500ms p95 at 200 items. Activity chart aggregates in-memory over `items` list — no per-day SQL rollup in v1. |
| Completeness | "Completed" detection: `status ∈ {Completed, Shipped, Done, Approved-and-Archived}`. Configurable per project later — hardcoded list in v1. |
| Timezone | Activity chart bucketed by UTC day. No per-user timezone in v1. |
| Accessibility | Expand/collapse must be keyboard-navigable (Enter/Space toggles, arrow keys navigate siblings). Chart has a text-table fallback toggled by a "view as data" button. |
| No kanban | Swim-lanes on the sprint page are **informational** (Shipped / Active / Upcoming) — no drag-and-drop, no inline status edit in v1. |

### 2.3 Data flow (new)

```
Admin UI                Admin API                     DB
--------                ---------                     --
/sprints          -->   GET /admin-api/v1/projects   items WHERE type='sprint'
                        /:id/sprints                  ORDER BY created_at DESC
                                                     (lane = derived from status)

/ (dashboard)     -->   GET .../sprints?lane=active  + GET .../items/activity
                                                       ?window=30d
                                                       (returns {day, created,
                                                        completed}[])

/epics            -->   GET .../epics               LEFT JOIN items child
                                                     ON child.parent_cleargate_id
                                                     = epic.cleargate_id
                                                     (returns tree {epic,
                                                      children[], counts})

/items            -->   GET .../items (existing)    unchanged — remains the
                                                     flat fallback / filter view
```

### 2.4 Out of scope (explicit)

- Gantt chart / dependency graph between stories
- In-UI editing of sprint/epic membership (push-only still; raw MD is authoritative)
- Drag-and-drop lane transitions
- Per-user timezone in activity chart
- Velocity / burn-down projections (just raw counts in v1)
- Mobile-first refinement beyond "doesn't break"
- Real-time updates (polling / SSE) — page reload is the refresh mechanism

## 3. Scope Impact (Touched Files & Data)

### 3.1 Known Files

- `cleargate-cli/src/admin-api/responses.ts` — extend `ItemSummarySchema` with `parent_cleargate_id`, `sprint_cleargate_id`, `resolved_at`; add `SprintSummarySchema`, `EpicTreeNodeSchema`, `ActivityPointSchema`.
- `mcp/src/db/schema.ts` (or equivalent) — add columns, migration.
- `mcp/src/routes/admin-api/items.ts` (or equivalent) — include new fields in list response.
- `mcp/src/routes/admin-api/` — new endpoints `GET /projects/:id/sprints`, `GET /projects/:id/epics`, `GET /projects/:id/items/activity`.
- `cleargate-cli/src/commands/push.ts` — pick up `parent_cleargate_id` / `sprint_cleargate_id` from frontmatter, stamp on push payload.
- `.cleargate/templates/epic.md`, `story.md`, `sprint.md` (if missing `parent_cleargate_id:` / `sprint_cleargate_id:` top-level keys) — add them.
- `admin/src/routes/+page.svelte` — dashboard adds active-sprint card + activity chart.
- `admin/src/routes/projects/[id]/items/+page.svelte` — demote to secondary/flat view (kept; unchanged in v1).
- `.cleargate/delivery/pending-sync/EPIC-006_Admin_UI.md` — if approved, restructure stories 006-03, 006-06, 006-08 + add Sprints + Epics routes.

### 3.2 Expected New Entities

- `admin/src/routes/projects/[id]/sprints/+page.svelte` — Sprints timeline with three lanes (Shipped / Active / Upcoming). Active card is pinned at top with its child-story progress bar.
- `admin/src/routes/projects/[id]/sprints/[sid]/+page.svelte` — single sprint detail: header + child story list + milestone ticks.
- `admin/src/routes/projects/[id]/epics/+page.svelte` — epics list; each row expandable to reveal child stories (tree). Orphan items (`parent_id = null`, type ≠ epic/sprint) surfaced in an "Unparented" accordion at the bottom.
- `admin/src/lib/components/ActivityChart.svelte` — Chart.js wrapper. Props: `points: { day: string; created: number; completed: number }[]`, `window: '7d' | '30d' | '90d'`.
- `admin/src/lib/components/SprintLane.svelte` — lane column component.
- `admin/src/lib/components/EpicRow.svelte` — expand/collapse row with child list.
- `mcp/migrations/00XX_item_parent_sprint_links.sql` — add two columns + indexes + backfill from existing `current_payload` JSON.
- `mcp/migrations/00XY_item_resolved_at.sql` — add `resolved_at`, backfilled `NOW()` where status ∈ completed set and `resolved_at IS NULL` (one-shot).

### 3.3 Migration / backfill plan

1. Add columns nullable.
2. One-shot backfill: parse `current_payload->>'parent_epic_id'` / `parent_id` / `sprint_id` from frontmatter for existing rows. Log unresolved rows; accept that archived items pushed before this change will have nulls until re-pushed.
3. `cleargate push` starts stamping the two keys going forward.
4. No downtime; feature-flag the UI routes behind an env var until ≥ 80% of items have linkage populated.

## 🔒 Approval Gate

Key things for the Vibe Coder to sign off on before decomposition:

1. **Schema additions.** OK to add `parent_cleargate_id`, `sprint_cleargate_id`, `resolved_at` to items? (vs. deriving from `current_payload` client-side — faster to ship, slower to query, no indexes.)
2. **Scope target.** Reshape EPIC-006 stories (rewrite 006-03 / 006-06 / 006-08, add 006-0A Sprints + 006-0B Epics), or cut a sibling **EPIC-013 Planning Visibility** that ships after EPIC-006's baseline?
3. **Active-sprint rule.** OK with the "status-derived, at-most-one-active, warn if >1" approach, or do we want an explicit `is_active: true` flag on sprint frontmatter?
4. **Orphan placement.** Accordion at bottom of `/epics` — acceptable, or do orphans deserve their own route (`/backlog`)?
5. **Completed-status vocabulary.** Hardcoded `{Completed, Shipped, Done, Approved-and-Archived}` — right list? Missing any? (e.g., `Ready` for epics that are scoped but not yet in a sprint.)

When the architecture above is correct, flip `approved: false` → `approved: true` in the frontmatter. Only then will I decompose into Epic/Story.
