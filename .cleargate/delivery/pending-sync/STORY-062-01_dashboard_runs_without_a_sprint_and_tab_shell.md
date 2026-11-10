---
story_id: STORY-062-01
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
context_source: "Decomposed from approved EPIC-062 (owner 2026-11-10: 'agree with your recommendations. please plan the sprint'). Grounded 2026-11-10 against cleargate-cli/src/dashboard/serve.ts, daemon.ts, render.ts, src/commands/sprint.ts:173 and src/cli.ts:444."
actor: ClearGate owner planning work in a browser
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-11-10T00:00:00Z
updated_at: 2026-11-10T06:56:35Z
created_at_version: 0.27.0
updated_at_version: 7f42e33a-dirty
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-10T06:56:35Z
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
  last_stamp: 2026-11-10T06:49:48Z
  sessions:
    - session: 11d4cf54-bf8f-48fe-b10c-fadb7867e924
      model: claude-opus-5-5
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-11-10T05:57:01Z
---

# STORY-062-01: Dashboard Runs Without a Sprint, With a Tab Shell
**Complexity:** L2 — lifecycle change across the existing server, daemon and CLI wiring, plus a three-tab page shell.

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate owner, I want `cleargate dashboard --open` to work whether or not a sprint is running, so that the page can host backlog and planning views between sprints.

### 1.2 Detailed Requirements
- R1: New top-level `cleargate dashboard [--open|--serve|--stop|--port <n>]`, registered in `src/cli.ts`, calling `sprintDashboardHandler`. `cleargate sprint dashboard` stays as an alias with identical behaviour.
- R2: `--open`, `--serve` and `--stop` no longer require an active sprint. `ensureDaemon` stops returning null for "no active sprint", and `stopDaemon` drops its `no-active-sprint` reason.
- R3: The daemon record moves from `.cleargate/sprint-runs/<id>/.dashboard.json` to `.cleargate/.dashboard.json`. That path is gitignored in the outer repo's `.gitignore` and in `cleargate-cli/scaffold/core/.gitignore`. *(Clarified 2026-11-10, M1 plan decision 2: installed repos get their `.cleargate/.gitignore` from `cleargate init` (`src/commands/init.ts:480–497`), so that generated list also gains `/.dashboard.json`, keeping the legacy `/sprint-runs/*/.dashboard.json` line.)*
- R4: Upgrade compatibility. `ensureDaemon` and `stopDaemon` also read a legacy per-sprint record for the currently active sprint. A live, matching legacy daemon (`isOurs`) is adopted or stopped, never duplicated, and the legacy record is removed once handled.
- R5: The CR-101 sentinel exit valve in `serve.ts` is removed. The server keeps running when `.active` changes or disappears, and the Sprint view re-resolves the active sprint on every collect. The idle exit valve is unchanged.
- R6: `/healthz` keeps its keys (`service`, `root`, `sprintId`, `pid`). `sprintId` is `''` when no sprint is active.
- R7: `render.ts` emits a tab bar: Backlog, Plan, Sprint. The Sprint tab holds today's dashboard markup unchanged, and the `/data` poller still patches it in place. Backlog and Plan render a labelled empty panel ("Backlog — STORY-062-02", "Plan — STORY-062-04") that later stories fill. The selected tab is kept in the URL hash (`#backlog`, `#plan`, `#sprint`). The default is Sprint when a sprint is active, else Backlog.
- R8: With no active sprint, the Sprint tab shows "No sprint is active", not an error or a blank panel.
- R9: Plain `cleargate sprint dashboard` (no flags, the snapshot and CI path) is unchanged: it still writes `sprint-runs/<id>/dashboard.html` and exits 1 with no active sprint.

### 1.3 Out of Scope
- Backlog data and view (STORY-062-02), Plan view and POST route (STORY-062-04), the `sprint add|remove` command (STORY-062-03).
- Changes to `collect()`, `SprintDashboardData`, or the snapshot written by `sprint init` and the SubagentStop hook.
- Sprint-dashboard skill documentation (STORY-062-04 documents the whole epic once).

### 1.4 Open Questions

- **Question:** Should `sprint init` still auto-open the dashboard now that it no longer belongs to one sprint?
- **Recommended:** Yes, unchanged. `--no-dashboard` and `CLEARGATE_NO_DASHBOARD=1` keep working. If a sprint-independent daemon is already running, `ensureDaemon` adopts it, so no second tab opens.
- **Human decision:** Accepted with the EPIC-062 recommendations (owner 2026-11-10).

### 1.5 Risks

- **Risk:** Existing CR-101 tests assert the sentinel exit valve.
- **Mitigation:** `test/dashboard/cr101.node.test.ts` is in this story's surface. QA-Red rewrites those assertions to the new rule (the server keeps running and the Sprint view follows `.active`). The idle-exit assertions stay.
- **Risk:** A dashboard started by the previous CLI keeps running with a per-sprint record during upgrade, and a second server opens a second tab.
- **Mitigation:** R4 legacy adoption, covered by a scenario.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Starts with and without an active sprint. |
| Interfaces | T | `cleargate dashboard` and the `cleargate sprint dashboard` alias. |
| Data | F | No data-shape variation: this story changes lifecycle and page chrome only, and `collect()` output is untouched. |
| Rules | T | Sentinel valve removed, idle valve kept, legacy record adopted, snapshot path unchanged. |

```gherkin
Feature: Dashboard runs without a sprint, with a tab shell

  @paths
  Scenario: Dashboard opens with no active sprint
    Given no .cleargate/sprint-runs/.active sentinel exists
    When the user runs `cleargate dashboard --open`
    Then a server bound to 127.0.0.1 starts and the record .cleargate/.dashboard.json names its pid and port
    And GET / returns a page with Backlog, Plan and Sprint tabs, with Backlog selected
    And the Sprint tab reads "No sprint is active"

  @interfaces
  Scenario: The sprint-scoped command is an alias
    Given a dashboard started by `cleargate dashboard --open` is running
    When the user runs `cleargate sprint dashboard --open`
    Then it prints "Dashboard already running" with the same URL and starts no second server
    And `cleargate sprint dashboard --stop` stops it and removes .cleargate/.dashboard.json

  @rules
  Scenario: The server survives a sprint change
    Given a dashboard is running while SPRINT-43 is active
    When .active is rewritten to name SPRINT-44 and 3 sentinel intervals pass
    Then the server is still listening
    And GET /data reports sprintId SPRINT-44

  @rules
  Scenario: A legacy per-sprint daemon is adopted during upgrade
    Given a live dashboard whose record is .cleargate/sprint-runs/SPRINT-43/.dashboard.json and SPRINT-43 is active
    When the user runs `cleargate dashboard --open`
    Then the running daemon is reused and no second server starts
    And `cleargate dashboard --stop` stops that daemon and removes the legacy record

  @rules
  Scenario: The snapshot path still requires a sprint
    Given no .cleargate/sprint-runs/.active sentinel exists
    When the user runs `cleargate sprint dashboard` with no flags
    Then it exits 1 with "no active sprint" and writes no dashboard.html
```

### 2.2 Verification Steps (Manual)
- [ ] With no sprint active, `node cleargate-cli/dist/cli.js dashboard --open` opens the page with the Backlog tab selected; switching tabs updates the URL hash.
- [ ] `node cleargate-cli/dist/cli.js dashboard --stop` prints the stopped pid and port.

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/dashboard/daemon.ts` |
| Related Files | `cleargate-cli/src/dashboard/serve.ts`, `cleargate-cli/src/dashboard/render.ts`, `cleargate-cli/src/commands/sprint.ts`, `cleargate-cli/src/cli.ts`, `cleargate-cli/scaffold/core/.gitignore`, `cleargate-cli/src/commands/init.ts` |
| Test Files | `cleargate-cli/test/dashboard/serve.node.test.ts`, `cleargate-cli/test/dashboard/cr101.node.test.ts`, `cleargate-cli/test/dashboard/render.node.test.ts`, `cleargate-cli/test/dashboard/dashboard-lifecycle.red.node.test.ts`, `cleargate-cli/test/dashboard/tab-shell.red.node.test.ts` |
| Outer repo | `.gitignore` (meta-repo; committed to the outer repo, not cleargate-cli) |
| New Files Needed | No |

### 3.2 Technical Logic
- `daemon.ts`: `recordPath(cwd)` returns `.cleargate/.dashboard.json`. Add `legacyRecordPath(cwd, sprintId)` for the old location. `DaemonRecord.sprintId` stays a field, informational only. `ensureDaemon` and `stopDaemon` check the new record first, then the legacy record for `resolveActiveSprint(cwd)?.sprintId`, reusing `liveRecord`'s alive + `isOurs` checks.
- `serve.ts`: delete the sentinel `setInterval` block (lines 213-227) and its teardown branch. Keep `DEFAULT_SENTINEL_INTERVAL_MS` and the `sentinelIntervalMs` option only if tests still need them; otherwise remove both. The record write on `listen` uses the new path.
- `sprint.ts` `sprintDashboardHandler`: remove the `no-active-sprint` branch for `--stop`, and change the `--open` failure text to "could not start the dashboard". User-facing hints say `cleargate dashboard`.
- `cli.ts`: register `program.command('dashboard')` with the same options as `sprint dashboard` (including the hidden `--foreground`), both calling `sprintDashboardHandler`. The detached child keeps re-executing the `sprint dashboard --foreground` form, so older argv stays valid.
- `render.ts`: wrap today's body in `<section data-tab="sprint">`. Add `<nav>` tab buttons and two empty `<section data-tab="backlog|plan">` panels. A small script toggles `hidden` from `location.hash`. Styles reuse the CR-102 tokens. The `/data` poller only touches the sprint section.

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `/healthz` | GET | None | none | `{ service, root, sprintId: string /* '' when none */, pid }` |

## Task Breakdown

- [ ] Move the daemon record to `.cleargate/.dashboard.json`, with legacy-record adoption and stop -> R3
- [ ] Remove the sentinel exit valve from `serve.ts`, keeping the idle valve -> R5
- [ ] Relax `ensureDaemon`/`stopDaemon`/`sprintDashboardHandler` so they work with no active sprint -> R2
- [ ] Register top-level `cleargate dashboard` in `cli.ts`, keeping the alias -> R1
- [ ] Tab shell and empty Backlog and Plan panels in `render.ts`; "No sprint is active" Sprint state -> R7, R8
- [ ] Gitignore `.cleargate/.dashboard.json` in the outer `.gitignore` and `scaffold/core/.gitignore` -> R3

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 3 | `recordPath`/legacy lookup in daemon.ts; tab markup and hash default in render.ts; alias registration. |
| Integration tests | 3 | serve/daemon against a temp project dir on an ephemeral port: no-sprint start, sprint change survives, legacy adoption. |
| E2E / acceptance tests | 5 | One per Gherkin scenario in §2.1. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] `npm run typecheck` clean and the dashboard test files green in `cleargate-cli/`.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/dashboard/daemon.ts:62` — `recordPath()` keys the record on the sprint; `ensureDaemon` (279) and `stopDaemon` (322) both start from `resolveActiveSprint`.
- **Surface:** `cleargate-cli/src/dashboard/serve.ts:213` — the CR-101 sentinel exit valve this story removes.
- **Surface:** `cleargate-cli/src/commands/sprint.ts:173` — `sprintDashboardHandler`, the `--open/--serve/--stop` dispatcher.
- **Surface:** `cleargate-cli/src/cli.ts:444` — `sprint dashboard` registration.
- **Surface:** `cleargate-cli/src/dashboard/render.ts:768` — `render()` page shell.
- **Coverage of this requirement:** ≥80% extension. All lifecycle machinery exists and is re-keyed; the tab shell is new markup only.

## Prior work

- [[CR-101]] — introduced the daemon, its per-sprint record and the sentinel valve this story re-keys and removes.
- [[CR-097]] — single-tab adoption (`isOurs`), preserved across the record move.
- [[CR-084]] — original `sprint dashboard` command, kept as an alias.

## Why not simpler?

- **Smallest existing surface that could carry this:** `cleargate-cli/src/dashboard/daemon.ts` + `serve.ts`, edited in place.
- **Why isn't extension / parameterization / config sufficient?** This is the extension: there is no flag that keeps the server alive without a sprint, because the record path, the exit valve and the `--open` guard all key on `.active`. Keeping a per-sprint record and only adding a "no sprint" special case would leave two record locations and two adoption paths for the same server.

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
