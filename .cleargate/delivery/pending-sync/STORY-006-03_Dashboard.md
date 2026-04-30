---
story_id: STORY-006-03
parent_epic_ref: EPIC-006
parent_cleargate_id: "EPIC-006"
sprint_cleargate_id: "SPRINT-04"
status: Draft
ambiguity: 🟢 Low
complexity_label: L1
context_source: PROPOSAL-003_MCP_Adapter.md, EPIC-006, design-guide.md
design_guide_ref: ../../knowledge/design-guide.md
sprint_id: SPRINT-04
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-18T18:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
depends_on:
  - STORY-006-02
  - STORY-004-02
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:45:38.768Z
push_version: 2
---

# STORY-006-03: Dashboard (Projects List)

**Complexity:** L1 — one route, one list call, one empty state. Exercises the shell + typed client for the first time.

## 1. The Spec

Replace STORY-006-01's placeholder on `/` with a projects dashboard. Fetches `GET /admin-api/v1/projects` via the typed mcp-client (STORY-006-02) and renders each project as a Design-Guide **Card** (§6.1) with: project name (hero), member count + last activity timestamp (meta chips), and a row-action icon button menu (view / delete). Top of page: heading "Projects" + primary "New project" CTA pill routing to `/projects/new` (the new-project page is **out of scope** for this story — link is a no-op until a later milestone or v1.1; acceptable because "Create project" is reachable from the empty state and from the project-detail flow in STORY-006-04; if stakeholders need the dedicated page in SPRINT-04, file a scope adjustment in the retro).

### Detailed Requirements

- SSR load function (`+page.server.ts`) calls `GET /admin-api/v1/projects` server-side with the admin JWT — leverages SvelteKit's server-only load for zero client-side auth state handling.
- Client-side re-fetch on focus via a `onMount` hook only if last fetch > 30 s ago (soft revalidation).
- Sort: most recent activity first (server-side; STORY-004-02 response already includes `last_activity_at`).
- Pagination: **not in scope**. `GET /admin-api/v1/projects` returns all projects the admin owns (admin scope in v1 is a single tenant). If > 50 projects per admin exists (unlikely in alpha), render a "showing first 50" banner and a TODO link. Revisit at STORY-006-03 v1.1.
- Loading skeleton: three skeleton cards (`bg-base-200 rounded-3xl animate-pulse`) while the SSR load is in flight (for client-side re-fetch).
- Error state (5xx): inline banner "Couldn't load projects" + "Retry" button. Preserves previously-rendered list if stale.
- Empty state: per Design Guide §6.9 — 48 px subtle `folder-open` lucide icon, headline "No projects yet", body "Create your first project to start syncing items", primary CTA "Create your first project →" opening the same flow as `/projects/new`. Actionable copy, not passive.
- Mobile (< 640 px): cards stack full-width; meta chips wrap.

### Data shape consumed

From `GET /admin-api/v1/projects` (STORY-004-02):
```ts
{
  id: string,           // uuid
  name: string,
  created_at: string,   // ISO
  last_activity_at: string | null,
  member_count: number,
  item_count: number
}
```
`last_activity_at` can be null on a newly-created project with zero audit rows. Render "no activity yet" in that case.

## 2. Acceptance

```gherkin
Scenario: List 3 projects
  Given admin_users contains my handle
  And I own 3 projects with varying activity timestamps
  When I visit /
  Then 3 Cards render sorted by last_activity_at descending
  And each Card shows name, member_count, "Last activity N hours/days ago"
  And the primary CTA "New project" is visible in the page header

Scenario: Project with no activity
  Given a project with last_activity_at = null
  When I view its card on /
  Then the meta chip reads "No activity yet" (not "Last activity N ago")

Scenario: Empty state (no projects)
  Given I own zero projects
  When I visit /
  Then the EmptyState component renders
  And the headline is "No projects yet"
  And the CTA "Create your first project →" routes to /projects/new

Scenario: Server error on load
  Given the admin API returns 503 on GET /projects
  When I visit /
  Then an inline banner shows "Couldn't load projects — Retry"
  And clicking Retry re-fetches

Scenario: Silent JWT refresh mid-render
  Given my admin JWT expires in 30 seconds
  When I navigate to /
  Then the typed client refreshes the JWT silently
  And the page renders without a flash or a 401 toast

Scenario: Design-Guide compliance
  When I inspect a project Card in DevTools
  Then it has classes matching `bg-base-100 rounded-3xl shadow-card p-6`
  And the primary CTA has `btn btn-primary rounded-full`
  And the page background is `--color-base-300` (#F4F1EC)

Scenario: Mobile layout
  Given viewport width 390 px
  When I visit /
  Then project Cards stack full-width with 16 px gutter
  And no horizontal scroll appears
```

## 3. Implementation

- `admin/src/routes/+page.server.ts` — SSR load hitting `GET /admin-api/v1/projects` via a server-side variant of the typed client (reads JWT from session-derived context).
- `admin/src/routes/+page.svelte` — replaces STORY-006-01 placeholder. Composes `<Card>`, `<EmptyState>`, `<IconButton>` from the shared components.
- `admin/src/lib/components/ProjectCard.svelte` — specific to this page; wraps `<Card>` with project-specific meta chips. Unit test.
- `admin/src/lib/utils/time-ago.ts` — small helper ("5 min ago", "2 days ago"). Unit test.
- `admin/src/lib/mcp-client.ts` — add typed `listProjects()` helper (delegates to workspace `@cleargate/cli`'s client + schemas).

## 4. Quality Gates

- All seven acceptance scenarios pass (unit + Playwright).
- Lighthouse performance ≥ 90 on `/` (carries forward STORY-006-01 gate).
- No localStorage writes by this route.
- Loading skeleton does not cause CLS > 0.05 (layout shift).
- `svelte-check` + `tsc --noEmit` clean.

## 5. Open questions

1. **/projects/new dedicated page.** Not in the 10-story decomposition. If stakeholders want a dedicated creation page before SPRINT-04 ships, add as scope adjustment; otherwise creation surfaces from the empty state + STORY-006-04's "add member" flow chain.
2. **Revalidation on focus.** 30 s soft TTL is a default guess. Adjust if Playwright E2E shows staleness in token-rotation flows (STORY-006-05 → STORY-006-03 chain).
3. **Admin multi-tenancy.** v1 assumes one admin sees only projects they `created_by`. Future shared-project model is a v1.1 schema change; do not design for it here.

## Ambiguity Gate

🟢 — data shape fixed by STORY-004-02; UI primitives fixed by STORY-006-01; only the dedicated `/projects/new` page decision is open and has a safe default (omit).
