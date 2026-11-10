---
story_id: STORY-062-06
parent_epic_ref: EPIC-062
parent_cleargate_id: EPIC-062
sprint_cleargate_id: SPRINT-44
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-11-10T17:45:00Z
ambiguity: 🟢 Low
area: cleargate-cli,dashboard
context_source: "Walkthrough feedback on SPRINT-44 (owner 2026-11-10, with a screenshot of the Backlog tab: 'filter by statuses please? by default it shouldn't show done items'). Added mid-sprint as a scope change on the owner's direct request, same route as STORY-062-05. R4 folds in the queued STORY-062-05 post-flight follow-up (the 2 s whole-list redraw can drop a view click), because it is the same function. Grounded 2026-11-10 against cleargate-cli/src/dashboard/render.ts (cgBacklogState :985, cgBacklogMatches :986, cgRenderBacklogList, cgRenderBacklog) and the live /data backlog (statuses: Draft 75, Completed 32, Triaged 24, Approved, Abandoned, In Review, In Triage, Ready) at chore/S-44-consolidate 09a69d2."
actor: ClearGate owner planning work in a browser
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-11-10T17:45:00Z
updated_at: 2026-11-10T17:45:00Z
created_at_version: 0.27.0
updated_at_version: 0.27.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-10T17:44:13Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-062-06
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-10T17:44:09Z
  sessions: []
---

# STORY-062-06: Backlog Status Filter
**Complexity:** L2 — one new client-side filter in the Backlog tab, a done-hiding default, and a redraw that leaves an unchanged list alone.

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate owner, I want the Backlog tab to hide finished items by default and let me filter by status, so that I see the work that is still open without scrolling past completed items.

### 1.2 Detailed Requirements
- R1: The Backlog filter bar gains a status select, `<select data-bl-filter="status" aria-label="statuses">`, placed before the type select. Its options, in order:
  - `Not done` (value `open`), selected by default.
  - `All statuses` (value empty).
  - One option per distinct status in the backlog items, sorted, rebuilt the same way as the type, area and epic options.
- R2: The done statuses are `Completed` and `Abandoned`, compared case-insensitively. Each value filters the rows like this:
  - `open` shows every item whose status is not a done status, including items with no status.
  - Empty shows every item.
  - Any other value shows only items with exactly that status.
  - The status filter combines with the type, area, epic and search filters.
- R3: When an epic is expanded, its child rows follow the status filter too. An epic gets the expand button only when at least one child passes the status filter.
- R4: The status selection is kept in `cgBacklogState.f.status` and survives every 2-second poll, as the other filters do. When the option list is rebuilt, `open` and empty are always present and the current value is kept. `cgRenderBacklogList` does not rewrite `#backlog-list` when the HTML it would write equals the HTML it last wrote. A poll with unchanged data therefore leaves the row nodes in place, so a click, focus or text selection is not lost.

### 1.3 Out of Scope
- Saving filter choices across page reloads (no localStorage, no URL hash).
- Server-side filtering; `/data` and `collectBacklog` are unchanged and still return every pending-sync item.
- The Plan tab's candidate list and the Sprint tab.
- Any new colour token, shadow or radius (CR-102).

### 1.4 Open Questions

- **Question:** Which statuses count as "done"?
- **Recommended:** `Completed` and `Abandoned`. `Completed` is the only terminal delivery status (status vocabulary unified 2026-05-17), and `Abandoned` is closed too.
- **Human decision:** Pending owner confirmation at the walkthrough. The request was "by default it shouldn't show done items".
- **Question:** Should the filter be one select or multi-select chips?
- **Recommended:** One select, matching the three existing filters, with a `Not done` default.
- **Human decision:** Pending owner confirmation at the walkthrough. A select is the smallest change consistent with the existing bar.

### 1.5 Risks

- **Risk:** Existing Backlog tests may assume a Completed item renders by default.
- **Mitigation:** QA-Red greps `test/dashboard/*backlog*` and `ticket-view.red` for Completed/Abandoned fixtures rendered without a status choice. Any such assertion is changed by QA-Red, never the Developer. `ticket-view.red` uses a Completed item only as an archived `/doc` fixture.
- **Risk:** Skipping identical redraws could leave a stale expand arrow or count.
- **Mitigation:** The comparison is on the full generated HTML, which includes arrows, counts and child rows. Any change in data, filter or expand state changes the string and redraws.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Three views of the same list: the default (not done), one chosen status, and all statuses. |
| Interfaces | F | One surface, the Backlog tab; `/data` is unchanged. |
| Data | F | Status is a plain string on every item; item type does not change the behaviour. |
| Rules | T | Done items are hidden by default; child rows follow the filter; the choice survives polls without rewriting an unchanged list. |

```gherkin
Feature: Backlog status filter

  @rules
  Scenario: Done items are hidden by default
    Given the backlog has BUG-1 with status Draft, BUG-2 with status Completed and BUG-3 with status Abandoned
    When the page loads
    Then the status filter shows "Not done"
    And the list shows BUG-1
    And the list shows neither BUG-2 nor BUG-3, and no Completed or Abandoned group

  @paths
  Scenario: Pick one status, or all statuses
    Given the same backlog
    When the user picks "Completed" in the status filter
    Then the list shows only BUG-2
    When the user picks "All statuses"
    Then the list shows BUG-1, BUG-2 and BUG-3

  @rules
  Scenario: An expanded epic's children follow the status filter
    Given EPIC-9 has status Draft and children STORY-9-01 with status Draft and STORY-9-02 with status Completed
    And EPIC-8 has status Draft and its only child STORY-8-01 has status Completed
    When the user expands EPIC-9 with the default filter
    Then STORY-9-01 shows under EPIC-9 and STORY-9-02 does not
    And EPIC-8 has no expand button

  @rules
  Scenario: The choice survives polls and an unchanged poll does not rewrite the list
    Given the user has picked "Completed" in the status filter
    When a poll delivers the same backlog data
    Then the status filter still shows "Completed"
    And the rows in the list are the same DOM nodes as before the poll
    When a poll delivers data where BUG-1's status is now Completed
    Then the list re-renders and shows BUG-1 and BUG-2
```

### 2.2 Verification Steps (Manual)
- [ ] Open the dashboard in this repo. The Backlog shows no Completed or Abandoned group. Pick "All statuses" and the Completed group (32 items today) appears.
- [ ] Hover over a view button for several seconds, then click it. The modal opens on the first click.

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/dashboard/render.ts` |
| Test Files | `cleargate-cli/test/dashboard/backlog-status-filter.red.node.test.ts` |
| New Files Needed | Yes — the red test file above (QA-Red) |

### 3.2 Technical Logic
- `render.ts` (server-side bar markup, near `sel('type', 'types')`): emit the status select first. Its options are `Not done` (`open`, selected) and `All statuses` (empty). Add `status: 'open'` to the initial `cgBacklogState.f`.
- `cgBacklogMatches`: add a status clause per R2, with a small `cgBacklogIsDone(status)` helper that matches `completed` and `abandoned` after lowercasing.
- `cgRenderBacklog`: add statuses to the option rebuild and its `optsKey`. The status select keeps its two fixed options first, then the distinct sorted statuses, then sets `sel.value = cgBacklogState.f.status`.
- `cgRenderBacklogList`: filter `kids` through the status clause only, both for the expand decision and for the child rows. Keep the last written HTML in `cgBacklogState.html` and skip the `innerHTML` assignment when it is unchanged. The `No matching items.` path goes through the same check.

## Task Breakdown

- [ ] `render.ts`: status select in the bar, `status: 'open'` default, option rebuild -> R1, R4
- [ ] `render.ts`: status clause in `cgBacklogMatches` with the done set; child rows and expand button follow it -> R2, R3
- [ ] `render.ts`: skip the list rewrite when the HTML is unchanged -> R4

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 2 | `cgBacklogMatches` status clause (open, empty, exact, case) in a vm context; option rebuild keeps the selection. |
| Integration tests | 1 | The rendered page's client script driven in a vm/DOM harness: default view, pick, poll with same and changed data. |
| E2E / acceptance tests | 4 | One per Gherkin scenario in §2.1. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] `npm run typecheck` clean and the dashboard test files green in `cleargate-cli/`.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/dashboard/render.ts:985` — `cgBacklogState`, which holds the filter values that survive polls.
- **Surface:** `cleargate-cli/src/dashboard/render.ts:986` — `cgBacklogMatches`, the type/area/epic/search filter that gains the status clause.
- **Surface:** `cleargate-cli/src/dashboard/render.ts:1161` — the filter bar's `sel()` markup, where the status select is added.
- **Coverage of this requirement:** partial. The filter bar, the per-poll state and the status-grouped list exist. The status filter, the done default and the steady redraw are new.

## Prior work

- [[EPIC-062]] — parent epic; the Backlog tab's filters come from its Backlog requirement.
- [[STORY-062-02]] — built the Backlog tab, its filter bar and the status grouping this story filters.
- [[STORY-062-05]] — added the view buttons; its post-flight queued the 2 s redraw follow-up that R4 closes.

## Why not simpler?

- **Smallest existing surface that could carry this:** `cleargate-cli/src/dashboard/backlog.ts`, by dropping Completed and Abandoned items from `collectBacklog` on the server.
- **Why isn't extension / parameterization / config sufficient?** Dropping them on the server would remove them from the page entirely, so the owner could never show them. The Plan tab and `/doc` also read the same item list. A client-side filter with a default is the existing pattern of the three filters already in the bar.

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
