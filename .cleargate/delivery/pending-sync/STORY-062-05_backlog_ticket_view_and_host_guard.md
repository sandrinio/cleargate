---
story_id: STORY-062-05
parent_epic_ref: EPIC-062
parent_cleargate_id: EPIC-062
sprint_cleargate_id: SPRINT-44
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-11-10T00:00:00Z
ambiguity: 🟢 Low
area: cleargate-cli,dashboard
context_source: "Walkthrough feedback on SPRINT-44 (owner 2026-11-10: 'need to be able to read those tickets just like in sprint dashboard'); added mid-sprint as a scope change by explicit owner choice ('This sprint', and 'Yes, all routes' for the Host guard, which closes the STORY-062-04 post-flight finding). Grounded 2026-11-10 against cleargate-cli/src/dashboard/serve.ts, render.ts, collect.ts, backlog.ts and markdown.ts at cli main 8f71c87."
actor: ClearGate owner planning work in a browser
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-11-10T00:00:00Z
updated_at: 2026-11-10T00:00:00Z
created_at_version: 0.27.0
updated_at_version: 0.27.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-10T09:16:40Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
draft_tokens:
  input: 0
  output: 0
  cache_creation: 0
  cache_read: 0
  model: claude-opus-5-5
  last_stamp: 2026-11-10T09:31:15Z
  sessions:
    - session: 11d4cf54-bf8f-48fe-b10c-fadb7867e924
      model: claude-opus-5-5
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-11-10T09:30:48Z
---

# STORY-062-05: Backlog Ticket View and Host Guard
**Complexity:** L2 — one read-only route, one shared guard, and a view button wired to the existing modal.

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate owner, I want to open any Backlog or Plan item and read its full text in the same modal the Sprint tab uses, so that I can judge an item while planning without leaving the page.

### 1.2 Detailed Requirements
- R1: New route `GET /doc?id=<ID>` returns `200 { ok: true, id, title, html }`. `html` is the item's delivery file rendered with `renderMarkdown` from `src/dashboard/markdown.ts`, capped exactly as Sprint-tab bodies are: `MAX_DOC_CHARS` with the `… (truncated)` suffix, as in `readDeliveryDoc`. `title` is the backlog item's title.
- R2: `/doc` serves only ids listed in `collectBacklog(cwd).items`, reading the item's own `file`. Any other id returns `404 { ok: false, error: "unknown id" }`. This includes sprint ids, archived ids, malformed ids and path-like values. The route never builds a filesystem path from the query string.
- R3: Each Backlog row has a `view` button: `.doc-btn` with `data-doc-key="item:<ID>"`. This covers top-level rows and an expanded epic's child rows. Each Plan-tab candidate row has the same button. Clicking it never expands or collapses an epic and never ticks or unticks a Plan row.
- R4: For an `item:` key the modal shows the id as its title and "Loading…" as its body. It fetches `/doc?id=<ID>` on that click only, then shows `html`. If the fetch fails, or returns a non-200, the modal shows `<ID> could not be loaded: <error>` instead of staying blank. `<error>` is the response's `error` string, else `HTTP <status>`, else `server unreachable` when the request never completes (M3 clarification). Item bodies are never added to `/data` or to the embedded `DATA` blob.
- R5: Every route rejects a request whose `Host` header is not `127.0.0.1:<port>` or `localhost:<port>` on the live port. The response is `403` with `forbidden: bad host` before any collector runs. The routes are `/`, `/data`, `/doc`, `/healthz`, `POST /plan` and the 404 fallthrough. `planGuard`'s Host check becomes this shared guard. Its Origin, content-type, token and size checks are unchanged.

### 1.3 Out of Scope
- Editing an item from the page (EPIC-062 keeps the page read-only apart from the Plan commit).
- Archived items and `SPRINT-*` files in `/doc`.
- Changes to the Sprint tab's existing story, epic and timeline modals, or to `collect()` and the snapshot path.
- Any new colour token, shadow or radius (CR-102).

### 1.4 Open Questions

- **Question:** Should item bodies be inlined into `/data` like the Sprint tab's story bodies?
- **Recommended:** No. The 135 pending-sync files total about 1.7 MB, which would go out on every 2-second poll. Load one body per click from `/doc`.
- **Human decision:** Accepted. The owner chose this story as offered ("bodies load on demand from a new local read-only endpoint").
- **Question:** Should the Host guard cover only the new route, or every route?
- **Recommended:** Every route, through one shared guard.
- **Human decision:** "Yes, all routes" (owner 2026-11-10).

### 1.5 Risks

- **Risk:** The view button sits inside clickable rows: the epic expand button and Plan row checkboxes or labels. A click could also toggle the row.
- **Mitigation:** The delegated click handler checks `.doc-btn` first and returns. The Plan row's button sits outside any `<label>`. Each case gets a test.
- **Risk:** The Host guard on `/healthz` could break the daemon's port-reuse probe or existing tests.
- **Mitigation:** The probe connects to `127.0.0.1:<port>`, so Node sends that Host, which passes. QA-Red runs `cr101` and `dashboard-lifecycle.red` against the guard.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Three ways to the same modal: a Backlog row, an expanded epic's child row, and a Plan row. |
| Interfaces | F | One surface, the page; `/doc` is the page's own transport, not a second consumer. |
| Data | F | Every item is a markdown file rendered by the same renderer and cap; type does not change the behaviour. |
| Rules | T | Only backlog-listed ids are served; foreign Hosts are refused on every route; a failed load shows a message. |

```gherkin
Feature: Backlog ticket view and Host guard

  @paths
  Scenario: Read a backlog item in the modal
    Given the Backlog tab lists BUG-106
    When the user clicks view on the BUG-106 row
    Then the page requests GET /doc?id=BUG-106 once
    And the modal shows the title BUG-106 and BUG-106's rendered body
    And GET /data contains no item bodies

  @paths
  Scenario: Read from an epic's child row and from a Plan row
    Given EPIC-062 is expanded in the Backlog tab and SPRINT-43 is selected in the Plan tab
    When the user clicks view on the STORY-062-01 child row and then on a Plan candidate row
    Then each opens the modal with that item's body
    And EPIC-062 stays expanded and the Plan row's tick state is unchanged

  @rules
  Scenario Outline: Only backlog-listed ids are served
    When GET /doc?id=<id> is requested
    Then the response is 404 with error "unknown id"

    Examples:
      | id                 |
      | SPRINT-44          |
      | NOPE-1             |
      | ../../etc/passwd   |
      | (empty)            |

  @rules
  Scenario Outline: A foreign Host is refused on every route
    Given the dashboard listens on port P
    When <method> <route> is requested with Host "evil.example:P"
    Then the response is 403 "forbidden: bad host"
    And the same request with Host "127.0.0.1:P" or "localhost:P" is not refused for its Host

    Examples:
      | method | route          |
      | GET    | /              |
      | GET    | /data          |
      | GET    | /doc?id=BUG-106 |
      | GET    | /healthz       |
      | POST   | /plan          |

  @rules
  Scenario: A failed load shows a message, not a blank modal
    Given the Backlog tab lists BUG-106
    And BUG-106 is removed from pending-sync before the next poll
    When the user clicks view on the BUG-106 row
    Then the modal shows "BUG-106 could not be loaded: unknown id"
```

### 2.2 Verification Steps (Manual)
- [ ] In this repo, open the dashboard. Click view on a Backlog row, then on an expanded EPIC-062 child, then on a SPRINT-43 Plan row. Each shows the full ticket, and nothing expands, collapses or ticks.
- [ ] `curl -s -o /dev/null -w '%{http_code}' -H 'Host: evil.example' http://127.0.0.1:<port>/data` prints 403.

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/dashboard/serve.ts` |
| Related Files | `cleargate-cli/src/dashboard/render.ts`, `cleargate-cli/src/dashboard/collect.ts` |
| Test Files | `cleargate-cli/test/dashboard/ticket-view.red.node.test.ts`, `cleargate-cli/test/dashboard/host-guard.red.node.test.ts` |
| New Files Needed | Yes — the two red test files above (QA-Red) |

### 3.2 Technical Logic
- `serve.ts`: add `hostGuard(req, port): string | null`, the Host half of `planGuard`, using the same allowlist and `livePort(server, boundPort)`. Call it first in the request handler for every route. `planGuard` keeps its Origin, content-type, token and size checks.
- `serve.ts`: the `/doc` route parses `id` with `new URL(req.url, 'http://x').searchParams`. It looks the id up in `collectBacklogFn(cwd).items`, which is cached by mtime. It reads `path.join(cwd, item.file)` with the same cap as `readDeliveryDoc`. Export `MAX_DOC_CHARS`, or a small `capDoc` helper, from `collect.ts` rather than copying the constant. It responds `{ ok, id, title, html: renderMarkdown(capped) }`.
- `render.ts`: `cgBacklogRow` and `cgPlanRowsHtml` emit `<button class="doc-btn" data-doc-key="item:<ID>">view</button>`. The Plan row's button goes outside the `<label>`. `cgFindDoc` returns null for `item:` keys. `cgOpenModal` gets an `item:` branch: it shows "Loading…", then `fetch('/doc?id=' + encodeURIComponent(id))`, and fills `html` or the error line. The existing document click handler already routes `.doc-btn` before other handlers. Confirm the Backlog and Plan delegated handlers do not also act on the same click.

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `/doc` | GET | Loopback Host | `?id=<ID>` | `200 { ok: true, id, title, html }` · `404 { ok: false, error: "unknown id" }` · `403 { ok: false, error: "forbidden: bad host" }` |
| every route | any | Loopback Host | — | `403 { ok: false, error: "forbidden: bad host" }` for a foreign Host |

## Task Breakdown

- [x] `serve.ts`: shared `hostGuard` on every route; `planGuard` keeps its other checks -> R5
- [x] `serve.ts`: `GET /doc` over `collectBacklog` items with the shared doc cap and `renderMarkdown`; 404 for anything else -> R1, R2
- [x] `collect.ts`: export the doc cap for reuse -> R1
- [x] `render.ts`: view buttons on Backlog, child and Plan rows; `item:` branch in `cgOpenModal` with loading and error text -> R3, R4

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 2 | `/doc` id lookup (listed, unlisted, path-like) and the client `item:` branch in a vm context (loading, success, error). |
| Integration tests | 2 | Real server on port 0: `/doc` 200/404, and a foreign Host refused on each route. |
| E2E / acceptance tests | 5 | One per Gherkin scenario in §2.1; each outline counts once. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] `npm run typecheck` clean and the dashboard test files green in `cleargate-cli/`.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/dashboard/serve.ts:125` — `planGuard`, whose Host allowlist becomes the shared guard.
- **Surface:** `cleargate-cli/src/dashboard/serve.ts:289` — the request handler's route chain that gains `/doc` and the guard.
- **Surface:** `cleargate-cli/src/dashboard/collect.ts:222` — `MAX_DOC_CHARS` and `readDeliveryDoc` (225), the cap Sprint-tab bodies use.
- **Surface:** `cleargate-cli/src/dashboard/render.ts:846` — `cgFindDoc` / `cgOpenModal`, the modal the view button reuses.
- **Surface:** `cleargate-cli/src/dashboard/backlog.ts:131` — `collectBacklog`, whose `items[].file` bounds what `/doc` may read.
- **Coverage of this requirement:** partial. The modal, renderer, cap and Host allowlist exist; the route, the shared guard and the buttons are new.

## Prior work

- [[EPIC-062]] — parent epic; its rules keep everything in `src/dashboard/**` with no second server.
- [[CR-084]] — the Sprint tab's embedded-docs modal this story reuses.
- [[CR-101]] — the live server and 2-second poller that rule out inlining 1.7 MB of bodies.
- [[CR-102]] — the visual system; the button reuses `.doc-btn`.
- [[STORY-062-04]] — its post-flight found the GET routes unguarded against DNS rebinding; R5 closes that.

## Why not simpler?

- **Smallest existing surface that could carry this:** `cleargate-cli/src/dashboard/collect.ts`, by inlining every backlog body into `/data` as the Sprint tab does for its stories.
- **Why isn't extension / parameterization / config sufficient?** Inlining would send about 1.7 MB on every 2-second poll and re-render every body each tick. One small read-only route reuses the same renderer, cap and modal while sending one body per click. The Host guard is the existing `planGuard` check, lifted to run first for every route rather than a new mechanism.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered (no "TBD" / no "{}").
