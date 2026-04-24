---
epic_id: EPIC-017
status: Draft
ambiguity: 🟢 Low
context_source: "Direct-epic waiver (2026-04-24 conversation). No separate PROPOSAL filed. Inline references: (a) .cleargate/wiki/ today holds 6 synthesis pages (index.md 176 L, log.md 792 L, roadmap.md, active-sprint.md, open-gates.md, product-state.md) + topics/ + per-item mirrors across {epics,stories,proposals,sprints,crs,bugs}/; (b) EPIC-012 (Full-Stack Sync Coverage, approved:true) already covers sprint reports + architect plans + FLASHCARD riding on existing push_item — this epic explicitly does NOT overlap; it targets the synthesis + topic + backlink-graph layer that has no work-item identity; (c) PROPOSAL-009 (Planning Visibility UX) reshapes EPIC-006 admin UI into sprint/epic/orphan dashboards from structured item data — this epic is complementary, rendering wiki markdown as-is; (d) EPIC-006 (Admin UI, approved:true) provides the SvelteKit shell + marked+DOMPurify renderer (STORY-011-06) this epic reuses; (e) EPIC-015 (Wiki Index Hygiene, approved:true) fixes local index shape and is soft prerequisite for syncing a clean index; (f) human confirmed 2026-04-24: wiki is auto-generated; no human edits on remote ever — remote is strict read-only mirror keyed by git SHA; (g) five-question interrogation resolved 2026-04-24 — dedicated wiki_pages table, full graph-view scope, separate push-wiki command, all 6 synthesis + topics with collapsible log, soft dependency on EPIC-015; (h) branch-guardrail decision 2026-04-24 — push-wiki only from configured integration branch (default main) because synthesis pages are branch-sensitive aggregations that would clobber each other across parallel developer branches."
owner: Vibe Coder (sandro.suladze@gmail.com)
target_date: null
created_at: 2026-04-24T00:00:00Z
updated_at: 2026-04-24T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: proposal-approved
      detail: "linked file not found: Direct-epic waiver (2026-04-24 conversation). No separate PROPOSAL filed. Inline references: (a) .cleargate/wiki/ today holds 6 synthesis pages (index.md 176 L, log.md 792 L, roadmap.md, active-sprint.md, open-gates.md, product-state.md) + topics/ + per-item mirrors across {epics,stories,proposals,sprints,crs,bugs}/; (b) EPIC-012 (Full-Stack Sync Coverage, approved:true) already covers sprint reports + architect plans + FLASHCARD riding on existing push_item — this epic explicitly does NOT overlap; it targets the synthesis + topic + backlink-graph layer that has no work-item identity; (c) PROPOSAL-009 (Planning Visibility UX) reshapes EPIC-006 admin UI into sprint/epic/orphan dashboards from structured item data — this epic is complementary, rendering wiki markdown as-is; (d) EPIC-006 (Admin UI, approved:true) provides the SvelteKit shell + marked+DOMPurify renderer (STORY-011-06) this epic reuses; (e) EPIC-015 (Wiki Index Hygiene, approved:true) fixes local index shape and is soft prerequisite for syncing a clean index; (f) human confirmed 2026-04-24: wiki is auto-generated; no human edits on remote ever — remote is strict read-only mirror keyed by git SHA; (g) five-question interrogation resolved 2026-04-24 — dedicated wiki_pages table, full graph-view scope, separate push-wiki command, all 6 synthesis + topics with collapsible log, soft dependency on EPIC-015; (h) branch-guardrail decision 2026-04-24 — push-wiki only from configured integration branch (default main) because synthesis pages are branch-sensitive aggregations that would clobber each other across parallel developer branches."
    - id: no-tbds
      detail: 1 occurrence at §9
    - id: affected-files-declared
      detail: section 4 has 0 listed-item (≥1 required)
  last_gate_check: 2026-04-24T09:04:51Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
approved: false
stamp_error: no ledger rows for work_item_id EPIC-017
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-24T09:04:51Z
  sessions: []
---

# EPIC-017: Wiki Sync & Visualization

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Sync the compiled awareness layer (.cleargate/wiki/ synthesis pages, topic pages, and [[ID]] backlink graph) from the local repo to the MCP server, and render it on the admin UI — including a force-directed graph view — so stakeholders see the same dashboard AI agents see, without cloning the repo or reading raw markdown. Remote is strict read-only mirror; pushes are idempotent by git SHA; pushes only originate from the configured integration branch.</objective>
  <architecture_rules>
    <rule>Remote wiki is READ-ONLY. No write-back, no annotations, no edits on the admin UI. Every push can clobber.</rule>
    <rule>Do NOT sync per-item wiki pages (wiki/epics/*, wiki/stories/*, wiki/proposals/*, wiki/sprints/*, wiki/crs/*, wiki/bugs/*). They are compiled mirrors of raw delivery files already covered by push_item (EPIC-003) + sprint artifacts (EPIC-012). Only synthesis + topics + graph edges get a new path.</rule>
    <rule>Wiki pages live in a dedicated `wiki_pages` table — NOT in `items` via the ITEM_TYPES enum. Wiki is not a work item and must not collide on cleargate_id.</rule>
    <rule>Drift detection is by git SHA (EPIC-002 convention), not content hash. A page with an unchanged SHA is a no-op push.</rule>
    <rule>`cleargate push-wiki` refuses to run from any branch other than the configured integration branch (default: `main`; override via `.cleargate/config.json` key `integration_branch`). Synthesis pages are branch-sensitive aggregations — pushing from a feature branch would overwrite main's view with a partial snapshot. Exit non-zero with a message naming the current branch and the expected integration branch.</rule>
    <rule>Reuse the existing markdown renderer — marked + DOMPurify via STORY-011-06 component. No new rendering deps in admin/ for markdown.</rule>
    <rule>[[ID]] links in rendered HTML MUST resolve to existing admin-UI item routes (/projects/[id]/items/[clid]). A link to an unknown ID renders as plain text with a tooltip, not a 404.</rule>
    <rule>Backlink graph edges are derived at push time from the wiki pages themselves (parse [[ID]] tokens) — do NOT require a separate graph-builder service.</rule>
    <rule>log.md renders with a collapsible "older events" section (most-recent-first, first N events open, rest behind a `<details>` — no virtualization dep).</rule>
    <rule>No new runtime deps in mcp/. Admin UI adds exactly ONE graph-rendering dep — Cytoscape preferred (static-rendering default, works with server-loaded nodes/edges). Architect may substitute D3 with a one-line justification in the milestone plan.</rule>
    <rule>Auth + audit path: MCP exposes the new surface via the same admin-JWT path as push_item; every wiki push writes to audit_log.</rule>
    <rule>Separate CLI command (`cleargate push-wiki`) — not a flag on `cleargate push`. Keeps work-item push audit clean and decouples cadence (wiki can push at sprint close only, items push on approval).</rule>
  </architecture_rules>
  <target_files>
    <file path="mcp/src/db/schema.ts" action="modify" />
    <file path="mcp/src/db/migrations/" action="create" />
    <file path="mcp/src/tools/push-wiki.ts" action="create" />
    <file path="mcp/src/tools/push-wiki.test.ts" action="create" />
    <file path="mcp/src/tools/list-wiki.ts" action="create" />
    <file path="mcp/src/tools/list-wiki.test.ts" action="create" />
    <file path="mcp/src/mcp/register-tools.ts" action="modify" />
    <file path="mcp/src/admin-api/wiki.ts" action="create" />
    <file path="mcp/src/admin-api/openapi.ts" action="modify" />
    <file path="cleargate-cli/src/commands/push-wiki.ts" action="create" />
    <file path="cleargate-cli/src/commands/push-wiki.test.ts" action="create" />
    <file path="cleargate-cli/src/wiki/scan.ts" action="modify" />
    <file path="cleargate-cli/src/config.ts" action="modify" />
    <file path="cleargate-cli/src/cli.ts" action="modify" />
    <file path="admin/src/routes/projects/[id]/wiki/+page.svelte" action="create" />
    <file path="admin/src/routes/projects/[id]/wiki/[...slug]/+page.svelte" action="create" />
    <file path="admin/src/routes/projects/[id]/graph/+page.svelte" action="create" />
    <file path="admin/src/lib/components/WikiPage.svelte" action="create" />
    <file path="admin/src/lib/components/WikiGraph.svelte" action="create" />
    <file path="admin/src/lib/mcp-client.ts" action="modify" />
    <file path="admin/package.json" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**

Stakeholders today have no non-grep way to see the compiled awareness layer that AI agents see at session start. `.cleargate/wiki/index.md`, `roadmap.md`, `active-sprint.md`, `open-gates.md`, `product-state.md`, and `topics/*.md` are first-class synthesis artifacts — they exist precisely because a flat ticket list doesn't answer "what's shipping, what's blocked, what did we decide about X." A PM or the Vibe Coder opening the admin UI should see the same dashboard agents see, with `[[ID]]` backlinks resolving to live item routes and the cross-item graph rendered as a navigable map, without pulling the repo. EPIC-012 closes the work-item-artifact gap (reports, plans, flashcards); this epic closes the awareness-layer + graph gap.

**Success Metrics (North Star):**
- A stakeholder with browser-only access can answer "what ships this sprint, what's blocked at gates, what was our decision on wiki drift detection" inside 60 seconds via the admin UI.
- 0 bytes of synthesis-page content live outside the git repo — wiki remote is a pure read-only mirror keyed by git SHA.
- `cleargate push-wiki` on an unchanged integration branch is a no-op: zero rows written, one audit entry recording the short-circuit.
- Backlink graph renders ≥95% of edges within 2s for the current 150-page corpus.
- Push attempts from non-integration branches are refused 100% of the time with a clear error naming the current + expected branch.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**
- [ ] New `wiki_pages` table in MCP Postgres (path, git_sha, body, bucket, backlinks JSONB, pushed_at, pushed_by — one row per synthesis/topic page, per project).
- [ ] New MCP tools `push_wiki_pages` (batched) + `list_wiki_pages` (reader for admin UI) wired through `register-tools.ts` with the same admin-JWT + audit path as push_item.
- [ ] CLI `cleargate push-wiki` as a **separate** top-level command. It: (a) runs `cleargate wiki build` if stale, (b) checks the current branch matches `integration_branch` config (default `main`) and refuses otherwise, (c) scans synthesis + topics dirs, (d) computes git SHA per page, (e) pushes only pages whose SHA changed since last sync.
- [ ] Branch-guardrail logic: read `integration_branch` from `.cleargate/config.json` (new optional key; default `main`); shell out to `git rev-parse --abbrev-ref HEAD`; fail fast with exit code 2 and a message naming both branches if they diverge.
- [ ] Admin UI routes: `/projects/[id]/wiki` (index landing — reuses synthesis index.md), `/projects/[id]/wiki/[...slug]` (any synthesis or topic page), `/projects/[id]/graph` (backlink graph view).
- [ ] `[[ID]]` link resolver in `WikiPage.svelte`: rewrites `[[EPIC-014]]` → `<a href="/projects/[id]/items/EPIC-014">` when the item exists, plain text with tooltip when not.
- [ ] `log.md` rendering: most-recent events open; older events collapsed behind a `<details>` element. No JS virtualization library.
- [ ] Force-directed graph view: `WikiGraph.svelte` renders nodes (one per synced page) + edges (extracted backlinks). Cytoscape dep added to `admin/package.json` (architect may swap to D3 with a one-liner in M1 plan).
- [ ] Backlink-graph extractor: at push time, parse `[[ID]]` tokens from each synthesis/topic page body; emit edges into the `backlinks` JSONB column. No separate graph-builder service.
- [ ] Auth: wiki push requires the same admin JWT as push_item; wiki read on admin UI piggybacks on the existing session.
- [ ] Audit: every wiki push writes one `audit_log` row with tool=`push_wiki_pages`, target=project, and a count of pages written/skipped.

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- Per-item wiki pages (`wiki/epics/*`, `wiki/stories/*`, `wiki/proposals/*`, `wiki/sprints/*`, `wiki/crs/*`, `wiki/bugs/*`). Raw items already synced via EPIC-003 push_item; sprint-attached artifacts via EPIC-012.
- Any form of human edit on the remote wiki — no annotations, no comments, no inline notes. Comments belong on the work item (existing flow).
- Wiki push from feature branches. Explicitly refused by guardrail. If a use case emerges (e.g. preview deploys), that's a separate epic with its own ambiguity gate.
- Search indexing (BM25 / vector). Remote wiki is rendered markdown, not a search surface. Separate epic if ever needed.
- Mobile-optimized graph view. Desktop-first; graph may be a static list on narrow viewports.
- Wiki write-back (human → wiki). Covered by the architecture rule; restated here because it's the most likely scope-creep ask.
- Realtime push on every local `cleargate wiki build`. Push is explicit via CLI; no file-watcher or git-hook.
- Virtualized / infinite-scroll log rendering. `log.md` uses plain HTML `<details>` only.

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Performance | Admin-UI wiki page load ≤ 500ms p95 on current 150-page corpus. Graph view ≤ 2s initial render for all edges. |
| Security | Admin JWT + project scope required for read. No public-shareable wiki URLs in v1 (EPIC-007 territory if ever). |
| Drift | Git SHA is the identity key. A wiki file with an unchanged SHA is a no-op push — do not rewrite the row. |
| Idempotency | Re-running `cleargate push-wiki` on the same commit MUST produce zero writes. |
| Branch discipline | Push refused from non-integration branch (default `main`). Configurable per project via `.cleargate/config.json` → `integration_branch`. |
| Schema footprint | One new table (`wiki_pages`). No columns added to existing tables. No changes to `items`. |
| Rendering | Reuse marked + DOMPurify from STORY-011-06. No new markdown parser. |
| Graph rendering | Cytoscape is the default dep; architect may swap to D3 in M1 plan with one-line justification. No other viz libs. |
| Backlink format | `[[ID]]` tokens match `/\[\[([A-Z]+-\d+(?:-\d+)?)\]\]/g` per existing wiki conventions. Graph edges are (source_path, target_id) pairs. |
| Dep budget | 0 new deps in mcp/. Exactly 1 new dep in admin/ for graph rendering. |
| Prereq | EPIC-015 (wiki hygiene) ships before EPIC-017 goes to production, but dev work may parallelize once EPIC-015's M1 (hierarchical index + status-audit CLI) lands. |

## 4. Technical Grounding (The "Shadow Spec")

**Affected Files (verified paths, 2026-04-24):**

- `mcp/src/db/schema.ts` — add `wiki_pages` pgTable. Columns: `id uuid pk`, `project_id uuid fk projects`, `path text` (e.g. `active-sprint.md`, `topics/sales-pitch-ai-sdlc.md`), `bucket text` (`synthesis` | `topic`), `git_sha text`, `body text`, `backlinks jsonb` (array of `{target_id: string, occurrences: number}`), `pushed_by text`, `pushed_at timestamptz`. Unique index on `(project_id, path)`.
- `mcp/src/db/migrations/` — add one SQL migration for the new table + indexes.
- `mcp/src/tools/push-wiki.ts` — new tool. Input: `{ pages: Array<{path, git_sha, body, bucket, backlinks}> }`. Idempotent by `(project_id, path, git_sha)`: skip rows whose stored `git_sha` matches incoming. Returns `{ written: number, skipped: number }`.
- `mcp/src/tools/push-wiki.test.ts` — new. Covers: write new page, skip unchanged SHA, overwrite on SHA change, audit row written.
- `mcp/src/tools/list-wiki.ts` — new reader. Input: `{ path?: string, bucket?: 'synthesis'|'topic' }`. Returns page bodies + backlinks for admin UI.
- `mcp/src/tools/list-wiki.test.ts` — new. Covers: list all, filter by bucket, fetch by exact path, 404 when missing.
- `mcp/src/mcp/register-tools.ts` — register `push_wiki_pages` + `list_wiki_pages` via `mcp.registerTool` following the existing pattern (line 1-40 in this file).
- `mcp/src/admin-api/wiki.ts` — new. HTTP surface for admin UI: `GET /projects/:id/wiki` (list) and `GET /projects/:id/wiki/*path` (single page).
- `mcp/src/admin-api/openapi.ts` — declare the two new admin-API endpoints.
- `cleargate-cli/src/commands/push-wiki.ts` — new command. Scans `.cleargate/wiki/{index,roadmap,active-sprint,open-gates,product-state,log}.md` + `.cleargate/wiki/topics/*.md`, enforces branch guardrail, computes git SHA per file, extracts `[[ID]]` backlinks, batches into one `push_wiki_pages` call.
- `cleargate-cli/src/commands/push-wiki.test.ts` — new. Covers: synthesis pages detected, topics detected, per-item pages excluded, no-op on unchanged SHAs, branch guardrail refuses non-integration branch, branch guardrail respects config override.
- `cleargate-cli/src/wiki/scan.ts` — extend to emit `bucket: 'synthesis'` for top-level wiki/*.md and `bucket: 'topic'` for topics/*.md. Existing bucket logic (line 60 via `deriveBucket`) handles item buckets; add a sibling case for synthesis/topic.
- `cleargate-cli/src/config.ts` — extend config schema with optional `integration_branch: string` (default `main`). Loader already exists; add one Zod field.
- `cleargate-cli/src/cli.ts` — register the new `push-wiki` command in the Commander entry point.
- `admin/package.json` — add `cytoscape` (or architect-approved substitute) to dependencies.
- `admin/src/lib/components/WikiPage.svelte` — new. Takes a page body string, renders via the marked+DOMPurify helper from STORY-011-06, post-processes HTML to rewrite `[[ID]]` anchors to admin routes. Handles log.md specially with `<details>` collapse.
- `admin/src/lib/components/WikiGraph.svelte` — new. Takes `{ nodes: Array<{id, path, bucket}>, edges: Array<{source, target}> }`, renders a force-directed graph via Cytoscape.
- `admin/src/routes/projects/[id]/wiki/+page.svelte` — new. Landing page, renders `index.md` as the entry.
- `admin/src/routes/projects/[id]/wiki/[...slug]/+page.svelte` — new. Dynamic route for any wiki page path.
- `admin/src/routes/projects/[id]/graph/+page.svelte` — new. Hosts `WikiGraph.svelte`, loads nodes+edges from `list_wiki_pages`.
- `admin/src/lib/mcp-client.ts` — add `listWikiPages()` + `getWikiPage(path)` methods.

**Data Changes:**
- New table `wiki_pages` (see schema above). No changes to `items`, `item_versions`, `audit_log` (audit rows go through the existing writer with a new `tool` value `push_wiki_pages`).

## 5. Acceptance Criteria

```gherkin
Feature: Wiki Sync & Visualization

  Scenario: First push from main uploads all synthesis + topic pages
    Given a fresh MCP with zero wiki_pages rows for project P
    And the local repo has 6 synthesis pages and 1 topic page at wiki/topics/sales-pitch-ai-sdlc.md
    And the current branch is main
    When the user runs `cleargate push-wiki`
    Then 7 wiki_pages rows exist for project P
    And each row's git_sha matches `git hash-object` of the source file
    And audit_log contains one row with tool=push_wiki_pages, target=P, written=7, skipped=0
    And 0 rows exist for any wiki/epics/* or wiki/stories/* path

  Scenario: Re-pushing unchanged wiki is a no-op
    Given project P has wiki_pages synced at commit SHA X
    And the working tree is at commit SHA X with no modifications
    And the current branch is main
    When the user runs `cleargate push-wiki`
    Then 0 rows are updated in wiki_pages
    And audit_log contains one row with written=0, skipped=7

  Scenario: Edited synthesis page overwrites on next push
    Given project P has `active-sprint.md` synced at git_sha A
    And a local edit changes the file so its git_sha becomes B
    And the current branch is main
    When the user runs `cleargate push-wiki`
    Then the active-sprint.md row's git_sha becomes B
    And body matches the new file contents
    And 6 other rows are unchanged

  Scenario: Push from a feature branch is refused
    Given project P has configured integration_branch=main (default)
    And the current branch is feature/foo
    When the user runs `cleargate push-wiki`
    Then the command exits with code 2
    And stderr contains both "feature/foo" and "main"
    And 0 writes occur against MCP

  Scenario: Push respects integration_branch override
    Given project P has .cleargate/config.json with integration_branch="release"
    And the current branch is release
    When the user runs `cleargate push-wiki`
    Then the command proceeds normally
    And the branch guardrail does not block

  Scenario: Stakeholder views active sprint on admin UI
    Given project P has synced wiki_pages
    When an authenticated admin opens /projects/P/wiki/active-sprint.md
    Then the rendered HTML contains the same content as the source markdown
    And `[[EPIC-014]]` is rendered as an anchor tag pointing to /projects/P/items/EPIC-014
    And `[[BOGUS-999]]` is rendered as plain text with a "not found" tooltip

  Scenario: log.md renders with collapsible older events
    Given project P has a 792-line log.md synced
    When an authenticated admin opens /projects/P/wiki/log.md
    Then the most recent events are rendered open
    And older events are nested inside a `<details>` element
    And no JS virtualization library is loaded on the page

  Scenario: Graph view renders backlink edges
    Given project P has synced wiki_pages with backlinks extracted
    When an authenticated admin opens /projects/P/graph
    Then the graph renders ≥1 node per synced page
    And edges exist from each page to every [[ID]] referenced in its body
    And the graph completes initial paint inside 2 seconds on the current corpus size

  Scenario: Per-item pages are explicitly excluded
    Given the local repo has wiki/stories/STORY-014-09.md
    And the current branch is main
    When the user runs `cleargate push-wiki`
    Then no wiki_pages row is created for stories/STORY-014-09.md
    And the CLI exit code is 0

  Scenario: Wiki remote stays read-only
    Given project P has synced wiki_pages
    When any non-MCP client attempts to PATCH /projects/P/wiki/active-sprint.md
    Then the request returns 405 Method Not Allowed
    And no wiki_pages row is mutated
```

## 6. AI Interrogation Loop (Human Input Required)

*All five questions resolved 2026-04-24 — answers integrated into §0, §2, §3, §4, §5 above. This section intentionally empty for gate compliance.*

**Resolutions (for audit trail):**
1. Storage → dedicated `wiki_pages` table (not ITEM_TYPES enum).
2. Graph view → in-scope for this epic (no EPIC-018 split).
3. CLI surface → separate `cleargate push-wiki` command.
4. Synthesis pages → all 6 + topics; `log.md` uses `<details>` collapse, no virtualization.
5. EPIC-015 dependency → soft (parallel dev OK; EPIC-015 ships before EPIC-017 reaches production).

**Post-interrogation addition:** branch guardrail — `push-wiki` refuses to run from non-integration branches — added to architecture rules, §2 IN-SCOPE, §3 constraints, §5 acceptance. Motivated by multi-developer concurrency question (2026-04-24).

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — awaiting human approval sign-off**

Requirements to pass to Green (Ready for Coding Agent):
- [ ] Proposal gate waived via direct-epic request (see `context_source`); human signs off on waiver at approval time by flipping `approved: true`.
- [x] The `<agent_context>` block is complete and validated.
- [x] §4 Technical Grounding contains 100% real, verified file paths (audited 2026-04-24 against mcp/src/, cleargate-cli/src/, admin/src/).
- [x] §6 AI Interrogation Loop is empty (all 5 human answers integrated into the spec).
- [x] 0 "TBDs" exist in the document.
