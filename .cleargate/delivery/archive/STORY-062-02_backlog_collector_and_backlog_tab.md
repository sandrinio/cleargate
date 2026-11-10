---
story_id: STORY-062-02
parent_epic_ref: EPIC-062
parent_cleargate_id: EPIC-062
sprint_cleargate_id: SPRINT-44
carry_over: false
status: "Completed"
approved: true
approved_by: sandrinio
approved_at: 2026-11-10T00:00:00Z
ambiguity: 🟢 Low
area: cleargate-cli,dashboard
context_source: "Decomposed from approved EPIC-062 (owner 2026-11-10: 'agree with your recommendations. please plan the sprint'). Grounded 2026-11-10 against cleargate-cli/src/dashboard/collect.ts, render.ts, serve.ts, src/wiki/parse-frontmatter.ts and src/lib/work-item-type.ts."
actor: ClearGate owner planning work in a browser
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-11-10T00:00:00Z
updated_at: 2026-11-10T06:56:36Z
created_at_version: 0.27.0
updated_at_version: 7f42e33a-dirty
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-10T06:56:36Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-062-02
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-10T05:56:04Z
  sessions: []
---

# STORY-062-02: Backlog Collector and Backlog Tab
**Complexity:** L2 — one new read-only collector plus one view in the existing page.

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate owner, I want a Backlog tab listing every open work item with its status, approval and gate result, so that I can see what is ready without grepping frontmatter.

### 1.2 Detailed Requirements
- R1: New `collectBacklog(cwd): BacklogData` in `src/dashboard/backlog.ts`. It reads every `.cleargate/delivery/pending-sync/*.md` except `SPRINT-*` files, parsing frontmatter with `parseFrontmatter` and typing each file with `detectWorkItemTypeFromFm`.
- R2: Each item carries: `id`, `type`, `title` (from the first `# ` heading after the id and colon, else ''), `status`, `approved` (boolean), `ambiguity`, `gate` (`{ pass: boolean|null, failing: string[] }` from `cached_gate_result`), `area` (string[] split on `,`), `sprint` (`sprint_cleargate_id` or null), `carryOver`, `parent` (`parent_epic_ref` ?? `parent_ref` ?? `parent_cleargate_id`, or null) and `file` (repo-relative path).
- R3: `BacklogData` = `{ items, children: Record<epicId, childIds[]>, diagnostics: string[] }`. A file whose frontmatter cannot be located or parsed adds one diagnostics line naming the file and is skipped; it never throws (CR-097 rule).
- R4: `GET /data` and the embedded page data gain a top-level `backlog` key from `collectBacklog`. All existing `SprintDashboardData` keys are unchanged.
- R5: The Backlog tab groups items by `status` in a fixed order (Draft, Triaged, Ready, In Review, Active, then any other status alphabetically). Each row shows id, title, type, approval, a gate badge (pass ✓, fail ⚠ with the failing criteria ids, never-checked ·), sprint and carry-over.
- R6: Client-side filters by type, area and epic, plus a text search on id and title, narrow the list without a request. An epic row expands to list its children from `children`.
- R7: Diagnostics render in a visible strip at the top of the tab, as in the Sprint tab.

### 1.3 Out of Scope
- Archived items, and `SPRINT-*` files (those belong to the Plan tab's sprint picker).
- Any write action, sorting by priority, or AI ranking ([[EPIC-030]]).
- Changes to the Sprint tab or `collect()`.

### 1.4 Open Questions

- **Question:** Should Backlog read the wiki (`.cleargate/wiki/**`) instead of raw files, since it is already compiled?
- **Recommended:** No. Raw files are the source of truth, and the wiki excludes stories by default (`wiki.ingest_buckets`). Raw frontmatter of ~140 files parses in well under a poll interval.
- **Human decision:** Accepted with the EPIC-062 recommendations (owner 2026-11-10).

### 1.5 Risks

- **Risk:** Frontmatter keys differ by type (`story_id`, `bug_id`, `cr_id`, `epic_id`), and older files carry non-standard shapes.
- **Mitigation:** Type comes from `detectWorkItemTypeFromFm` and the id from the filename prefix; unknown shapes become diagnostics, not crashes. Fixtures include one malformed file.
- **Risk:** The 2s poller re-parses ~140 files on every tick.
- **Mitigation:** Cache parsed items by path and mtime inside `backlog.ts`.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Browse everything, or narrow by filter and search. |
| Interfaces | F | One surface, the page; `/data` is the page's own transport, not a second consumer. |
| Data | T | Different work-item types and frontmatter shapes, including malformed files. |
| Rules | T | Malformed files degrade to diagnostics; sprint files are excluded. |

```gherkin
Feature: Backlog collector and Backlog tab

  @data
  Scenario Outline: Each work-item type is collected with its gate state
    Given pending-sync holds <file> with cached_gate_result pass <pass> and failing criteria <failing>
    When collectBacklog runs
    Then the item <id> has type <type> and gate { pass: <pass>, failing: <failing> }

    Examples:
      | file                         | id           | type  | pass  | failing                       |
      | BUG-106_live_codex_proof.md  | BUG-106      | bug   | false | [repro-steps-deterministic]   |
      | CR-120_ledger.md             | CR-120       | cr    | true  | []                            |
      | EPIC-031_loop.md             | EPIC-031     | epic  | true  | []                            |
      | STORY-031-03_runner.md       | STORY-031-03 | story | null  | []                            |

  Scenario: Epics expand into their stories
    Given STORY-031-03 and STORY-031-04 have parent_epic_ref EPIC-031
    When collectBacklog runs
    Then children["EPIC-031"] lists STORY-031-03 and STORY-031-04
    And the Backlog tab shows both beneath EPIC-031 when it is expanded

  @paths
  Scenario: Filters narrow the list client-side
    Given the Backlog tab shows items of types epic, story, cr and bug
    When the user selects type "bug" and searches "codex"
    Then only bugs whose id or title contains "codex" remain visible
    And no new request is made

  @rules
  Scenario: A malformed file becomes a diagnostic, not a crash
    Given pending-sync holds BUG-900_broken.md whose frontmatter does not parse
    When GET /data is requested
    Then the response includes every other item
    And backlog.diagnostics contains a line naming BUG-900_broken.md

  @rules
  Scenario: Sprint files are not backlog items
    Given pending-sync holds SPRINT-43_execution_loop.md
    When collectBacklog runs
    Then no item has id SPRINT-43
```

### 2.2 Verification Steps (Manual)
- [ ] Open the dashboard in this repo; the Backlog tab lists the pending-sync items, and BUG-106 shows ⚠ with its failing criterion.
- [ ] Expand EPIC-062; its four stories are listed.

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/dashboard/backlog.ts` |
| Related Files | `cleargate-cli/src/dashboard/serve.ts`, `cleargate-cli/src/dashboard/render.ts` |
| Test Files | `cleargate-cli/test/dashboard/backlog.node.test.ts`, `cleargate-cli/test/dashboard/render.node.test.ts`, `cleargate-cli/test/dashboard/backlog.red.node.test.ts`, `cleargate-cli/test/dashboard/backlog-tab.red.node.test.ts` |
| New Files Needed | Yes — `cleargate-cli/src/dashboard/backlog.ts`, `cleargate-cli/test/dashboard/backlog.node.test.ts` |

### 3.2 Technical Logic
- `backlog.ts` exports `BacklogItem`, `BacklogData`, `collectBacklog(cwd)`. It lists pending-sync with `fs.readdirSync`, skips `SPRINT-*`, and parses each file with `parseFrontmatter` (`src/wiki/parse-frontmatter.ts:24`). The id comes from the filename prefix (`/^([A-Z]+-\d+(?:-\d+)?)/`). A module-level `Map<path, { mtimeMs, item }>` cache avoids re-parsing unchanged files.
- `serve.ts`: the `/` and `/data` handlers merge `{ ...collectFn({ cwd }), backlog: collectBacklog(cwd) }`. A `collectBacklogFn` option is injectable for tests, as `collectFn` is today.
- `render.ts`: fill the `data-tab="backlog"` panel from STORY-062-01. Rows are generated client-side from `DATA.backlog`, so the poller re-renders the list without a reload. Filters keep their state across polls.

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `/data` | GET | None | none | `SprintDashboardData & { backlog: BacklogData }` |

## Task Breakdown

- [x] `collectBacklog` with id/type/title/gate/parent extraction and an mtime cache -> R1, R2
- [x] Epic→children map and diagnostics for unparseable files -> R3
- [x] Add `backlog` to `/data` and the embedded page data -> R4
- [x] Backlog tab: status groups, gate badges, epic expansion -> R5
- [x] Client-side type/area/epic filters and search; diagnostics strip -> R6, R7

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | collectBacklog over a fixture tree: type/gate extraction, children map, malformed file, SPRINT exclusion. |
| Integration tests | 1 | GET /data on an ephemeral port returns the `backlog` key next to the unchanged sprint keys. |
| E2E / acceptance tests | 5 | One per Gherkin scenario in §2.1 (the outline counts once); the filter scenario asserts on the rendered client script's behaviour in render.node.test.ts. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] `npm run typecheck` clean and the dashboard test files green in `cleargate-cli/`.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/wiki/parse-frontmatter.ts:24` — `parseFrontmatter`, reused for every file.
- **Surface:** `cleargate-cli/src/lib/work-item-type.ts:45` — `detectWorkItemTypeFromFm`, reused for typing.
- **Surface:** `cleargate-cli/src/dashboard/collect.ts:200` — `findDeliveryFileById`, the id-delimiter rule reused for filename ids.
- **Surface:** `cleargate-cli/src/dashboard/serve.ts:141` — the `/data` route that gains the `backlog` key.
- **Coverage of this requirement:** partial. Parsing, typing and transport exist; the backlog collector and view are new.

## Prior work

- [[PROPOSAL-009]] — Planning Visibility UX (Draft, never approved): the same backlog and epic-tree idea, aimed at the admin console.
- [[CR-097]] — the diagnostics-not-blank rule this collector follows.
- [[CR-102]] — the visual system the tab reuses.

## Why not simpler?

- **Smallest existing surface that could carry this:** `cleargate-cli/src/dashboard/collect.ts`, by adding backlog fields to `collect()`.
- **Why isn't extension / parameterization / config sufficient?** `collect()` is scoped to one sprint and feeds the snapshot written by `sprint init` and the SubagentStop hook. Adding a whole-backlog scan there would slow every snapshot and couple two unrelated views. A separate collector merged only at the `/data` boundary keeps the snapshot path unchanged.

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
