---
epic_id: EPIC-062
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-44
carry_over: false
area: cleargate-cli,dashboard,sprint-planning
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-11-10T00:00:00Z
ambiguity: 🟢 Low
context_source: |
  Direct user direction 2026-11-10. User first asked for a Claude Code mod: "visualizes work
  items i'm working on with cleargate? also to be able to pick items for next sprint and track
  sprint progress in the same mod". After a mod design was sketched (terminal pane + band), the
  user redirected: "some things are too much for the terminal. what if we make a page for all
  that just like we have sprint dashboard instead?" The orchestrator proposed growing the shipped
  sprint dashboard (CR-084/097/101/102) into a three-tab local page (Backlog / Plan / Sprint) with
  a `cleargate sprint add|remove` command as the single write path; user: "go ahead please".
  Proposal gate waived: direct request with sharp intent, grounded in an in-session read of
  cleargate-cli/src/dashboard/** and the sprint/gate/wiki-ingest commands (see §4).
proposal_gate_waiver: true
owner: sandrinio
target_date: null
created_at: 2026-11-10T00:00:00Z
updated_at: 2026-11-10T00:00:00Z
created_at_version: 0.27.0
updated_at_version: 0.27.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-10T05:54:36Z
  transition: ready-for-decomposition
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-062
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-10T05:55:59Z
  sessions: []
---

# EPIC-062: Dashboard Backlog Board and Sprint Planner

## 0. AI Coding Agent Handoff
*(This section is strictly for downstream AI execution agents. It contains zero business fluff.)*

```xml
<agent_context>
  <objective>Grow the shipped sprint dashboard into a sprint-independent, three-tab local page (Backlog / Plan / Sprint) whose only write path is a new `cleargate sprint add|remove` command that edits a non-active sprint's item lists and each item's `sprint_cleargate_id`, then re-stamps, gate-checks and wiki-ingests every touched file.</objective>
  <architecture_rules>
    <rule>Extend `cleargate-cli/src/dashboard/**`; do not create a second server, port or daemon.</rule>
    <rule>The Sprint tab renders today's `collect()` output unchanged; `SprintDashboardData` stays backward-compatible (it is also the `/data` contract and the snapshot input).</rule>
    <rule>The page never writes a file itself. `POST /plan` calls the same handler as the `cleargate sprint add|remove` CLI command, in-process.</rule>
    <rule>`sprint add|remove` refuses any sprint that is Active (named by `.cleargate/sprint-runs/.active` or has a `state.json`) or Completed, and refuses a write whose precondition hash no longer matches the file on disk.</rule>
    <rule>Edit frontmatter only through `cleargate-cli/src/lib/frontmatter-locator.ts` (`locateFrontmatter` / `withFrontmatterYaml`); never regex-rewrite YAML.</rule>
    <rule>Every source degrades to an empty panel plus a visible diagnostics entry, never a throw and never a silent blank (FLASHCARD 2026-08-01 #ux #danger, CR-097).</rule>
    <rule>Server stays bound to `LOOPBACK` (`127.0.0.1`). Every POST must carry the per-launch token embedded in the served HTML and an `Origin`/`Host` matching the bound loopback address; anything else gets 403.</rule>
    <rule>No new runtime dependency; zero-network, self-contained HTML as today.</rule>
    <rule>Tests are `*.node.test.ts` under node:test; new server tests take an ephemeral port (FLASHCARD 2026-09-26 #test-harness #ports).</rule>
  </architecture_rules>
  <target_files>
    <file path="cleargate-cli/src/dashboard/serve.ts" action="modify" />
    <file path="cleargate-cli/src/dashboard/daemon.ts" action="modify" />
    <file path="cleargate-cli/src/dashboard/render.ts" action="modify" />
    <file path="cleargate-cli/src/dashboard/backlog.ts" action="create" />
    <file path="cleargate-cli/src/commands/sprint.ts" action="modify" />
    <file path="cleargate-cli/src/commands/sprint-scope.ts" action="create" />
    <file path="cleargate-cli/src/cli.ts" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-dashboard/SKILL.md" action="modify" />
    <file path="cleargate-cli/test/dashboard/backlog.node.test.ts" action="create" />
    <file path="cleargate-cli/test/dashboard/serve.node.test.ts" action="modify" />
    <file path="cleargate-cli/test/commands/sprint-scope.node.test.ts" action="create" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
ClearGate's planning state lives in ~137 markdown files under `.cleargate/delivery/pending-sync/`. The only visual surface, the sprint dashboard, shows one active sprint and shuts itself down when no sprint is active. Seeing what is open, what is 🟢 and gate-passing, and what belongs in the next sprint means grepping frontmatter or asking the agent. Assembling a sprint means hand-editing four frontmatter lists in the sprint file plus `sprint_cleargate_id` on every item, and no command exists for that today (nothing in `cleargate-cli/src` writes `sprint_cleargate_id`). It is error-prone and invisible until `cleargate sprint preflight` fails.

**What we're building:**
One local page, `cleargate dashboard --open`, with three tabs:
- **Backlog:** every open work item grouped by status, filterable by type, area and epic. Epics expand into their stories. Each row shows approval, the cached gate result with failing criteria, its sprint and the carry-over flag.
- **Plan:** pick a non-active sprint, tick items in or out, and see warnings before committing (unapproved, gate failing, epic with none of its stories in the sprint, item already in another sprint). A "blocker scheduled in a later sprint" warning was dropped at decomposition: work items carry no dependency field to read it from.. Commit calls the new `cleargate sprint add|remove`.
- **Sprint:** today's dashboard, unchanged.

The page is a CLI feature, so it works the same under the Claude Code and Codex hosts.

**Success Metrics (North Star):**
- A sprint's item lists can be assembled without hand-editing YAML: `sprint add|remove` is the documented path in the sprint-dashboard skill. Measured by the skill text and by the command existing in `cleargate --help`.
- The sprint file's lists and every listed item's `sprint_cleargate_id` agree after any add or remove. Measured by `sprint-scope.node.test.ts`.
- The dashboard runs, and the Backlog and Plan tabs render, with no active sprint. Measured by a `serve.node.test.ts` case with no `.active` sentinel.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**
- [ ] Sprint-independent lifecycle: new top-level `cleargate dashboard [--open|--serve|--stop|--port]`, with `cleargate sprint dashboard` kept as an alias. The daemon record moves from `sprint-runs/<id>/.dashboard.json` to a sprint-independent path. The `.active`-sentinel exit valve is removed (the Sprint tab re-resolves the active sprint on every collect) and the idle valve stays. `sprint init` still auto-opens it.
- [ ] Tab shell in `render.ts` (Backlog / Plan / Sprint) on the CR-102 visual system. The Sprint tab is today's view, and the `/data` poller keeps patching in place.
- [ ] `collectBacklog()` in a new `dashboard/backlog.ts`: reads `pending-sync/*.md` frontmatter through `frontmatter-locator.ts`. It covers type, id, title, status, approved, ambiguity, `cached_gate_result` (pass and failing criteria), area, `sprint_cleargate_id`, `carry_over`, and parent (`parent_epic_ref` / `parent_ref` / `parent_cleargate_id`). Unparseable files become diagnostics entries.
- [ ] `cleargate sprint add <sprint-id> <ids…>` and `cleargate sprint remove <sprint-id> <ids…>` in a new `commands/sprint-scope.ts`. Each one:
  - routes every id to its list (`epics` / `stories` / `bugs` / `crs` / `proposals`)
  - sets or clears each item's `sprint_cleargate_id`
  - refuses Active/Completed sprints and unknown ids
  - accepts an optional `--expect <sha>` precondition
  - stamps the touched files, then runs the gate check and wiki ingest on them
  - supports `--json` output
- [ ] Plan tab: candidate pool (approved or 🟢, not in another sprint, plus `carry_over: true` items), per-item warnings, a dirty-state diff and a Commit button. A `POST /plan` endpoint calls the `sprint-scope` handler in-process, guarded by a per-launch token and an `Origin`/`Host` check.
- [ ] Sprint-dashboard skill (canonical scaffold) documents the tabs, `cleargate dashboard`, and `sprint add|remove` as the way to assemble a sprint.

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- Creating a new sprint file from the page. It stays `cleargate new sprint` or the agent.
- Rewriting the sprint plan body: §1 Consolidated Deliverables, the Sprint Design Review, `waves.json`. The agent and Architect regenerate those, and Gate 2 approval is unchanged.
- Starting, running or closing a sprint from the page: no `sprint init`, preflight, close or `--assume-ack` buttons.
- Editing any other field from the page (status, approval, priority, body text). Read-only apart from the Plan commit.
- AI grooming and ranking ([[EPIC-030]]'s `sprint groom`). The Plan tab may surface that ranking later and does not compute one.
- Archived/Completed items in the Backlog tab.
- Remote/MCP data and the admin console ([[PROPOSAL-009]] targeted the admin UI). This page is local files only.
- A Claude Code mod or terminal pane (rejected in-session as too dense for the terminal).
- Multi-repo or multi-project views.

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Security | The server is already bound to `127.0.0.1` (`serve.ts` `LOOPBACK`), but a browser page on any site can still POST to it (CSRF). Every state-changing request requires the per-launch token rendered into the served HTML and an `Origin`/`Host` of the bound loopback address; otherwise 403 and no file touched. GET routes stay token-free. |
| Data integrity | The agent may edit the same sprint file while the page is open. Each Plan commit carries the sprint file's content hash from the last `/data`; a mismatch is refused with "sprint file changed — reload". Writes go through `withFrontmatterYaml` so the body is byte-identical. |
| Gates | `sprint add|remove` does not replace any gate. Gate 2 approval and the Gate 3 `sprint preflight` checks still apply; the Plan tab warns but does not block picking an unapproved or gate-failing item (see §6). |
| Hooks parity | The PostToolUse ingest and gate hooks fire only on agent Write/Edit. The command must therefore run stamp, `gate check` and `wiki ingest` itself on every touched file, or the wiki and `cached_gate_result` go stale. |
| Compatibility | `SprintDashboardData`, `/data`, `/healthz` (`service`, `root`, `sprintId`, `pid`) and the `dashboard.html` snapshot keep their current shape. CR-097/CR-101 adoption (`isOurs`) must still recognise a dashboard started by the previous CLI version during upgrade. |

## Existing Surfaces

- **Surface:** `cleargate-cli/src/dashboard/serve.ts:124` — the http server. Routes `/` (line 128), `/healthz` (136) and `/data` (141), read-only. It binds `LOOPBACK` (line 49). The CR-101 sentinel exit valve (lines 213-227) stops the server when `.active` stops naming its sprint, and the idle valve follows it.
- **Surface:** `cleargate-cli/src/dashboard/daemon.ts:62` — `recordPath()` keys the daemon record on `sprint-runs/<sprintId>/.dashboard.json`. Also `probeHealthz` (117), `isOurs` (149), `findPort` (176) and `spawnDaemon` (218).
- **Surface:** `cleargate-cli/src/dashboard/collect.ts:588` — `collect()` builds `SprintDashboardData` from `.active`, `state.json`, the sprint plan and `token-ledger.jsonl`. `findDeliveryFileById` (line 200) already resolves a work-item id to its file in pending-sync then archive.
- **Surface:** `cleargate-cli/src/dashboard/render.ts:768` — `render()` emits the self-contained HTML; `renderDataBodies` (537) pre-renders Markdown for `/data`.
- **Surface:** `cleargate-cli/src/commands/sprint.ts:173` — `sprintDashboardHandler` (the `--open/--serve/--stop` modes); `sprintInitHandler` (283) auto-opens the dashboard.
- **Surface:** `cleargate-cli/src/cli.ts:444` — `sprint dashboard` registration; `sprint init` (383) with `--stories` and `--no-dashboard`.
- **Surface:** `cleargate-cli/src/lib/frontmatter-locator.ts:69` — `locateFrontmatter`, plus `withFrontmatterYaml` (144) for body-preserving rewrites (SPRINT-41).
- **Surface:** `cleargate-cli/src/lib/stamp-frontmatter.ts:33` — `stampFrontmatter`.
- **Surface:** `cleargate-cli/src/commands/gate.ts:152` — `gateCheckHandler`.
- **Surface:** `cleargate-cli/src/commands/wiki-ingest.ts:83` — `wikiIngestHandler`.
- **Surface:** `cleargate-cli/src/commands/sprint-file-locate.ts:53` — `findSprintPlanFile`, plus `resolveActiveSprint` (101).
- **Coverage of this epic's scope:** partial, roughly 50%. The server, daemon, port adoption, live polling, visual system, Sprint view, frontmatter editing, stamping, gate check and ingest all exist and are reused. Net-new: the backlog collector, the tab shell, the Plan view, the `sprint add|remove` command (no writer of `sprint_cleargate_id` exists in `cleargate-cli/src`), the POST route and its CSRF guard, and sprint-independent lifecycle.

## Prior work

- [[CR-084]] — shipped the sprint dashboard as a CLI subcommand, auto-opened by `sprint init`. This is the base being extended.
- [[CR-097]] — dashboard truthfulness (diagnostics) and single-tab adoption. Its lesson, "show diagnostics, never silently blank", carries into the Backlog collector.
- [[CR-101]] — live background daemon, `/data` polling, sentinel and idle exit valves. This epic removes the sentinel valve.
- [[CR-102]] — editorial visual system. The new tabs reuse it.
- [[PROPOSAL-009]] — Planning Visibility UX for the admin console (Draft, never approved). Same backlog and epic-tree idea, but remote. This epic delivers it locally and does not depend on it.
- [[EPIC-030]] — AI-driven sprint planning (Draft). It explicitly excludes a UI. Its future `sprint groom` ranking is a later input to the Plan tab, with no overlap in this epic.

## Why not simpler?

- **Smallest existing surface that could carry this epic:** `cleargate-cli/src/dashboard/serve.ts` + `collect.ts` + `render.ts`, the shipped sprint dashboard, extended in place.
- **Why isn't extension / parameterization / config sufficient?** This epic is the extension: same server, daemon, port and visual system. No flag can supply the three missing pieces. (1) The dashboard is structurally tied to one active sprint: its record path, its exit valve and its collector all key on `.active`. (2) No collector reads the backlog. (3) No command writes sprint membership, so a page alone would have nothing safe to call. A read-only page with a "copy this prompt to the agent" button was considered and rejected: it would leave membership edits as hand-edited YAML. A Claude Code mod was rejected by the user as too dense for the terminal, and it would not serve the Codex host.

## 4. Technical Grounding (The "Shadow Spec")
*(AI Planning Engine: Populate this strictly from the approved Epic and verified codebase grounding.)*

**Affected Files:**
- `cleargate-cli/src/dashboard/serve.ts` — remove the sentinel exit valve; add `POST /plan` with token and Origin checks; embed the per-launch token; add the `backlog` payload to `/data`.
- `cleargate-cli/src/dashboard/daemon.ts` — make the record path sprint-independent (e.g. `.cleargate/.dashboard.json`); keep `isOurs` adoption working across the move.
- `cleargate-cli/src/dashboard/render.ts` — tab shell; Backlog and Plan views; client-side diff and commit; the Sprint view unchanged.
- `cleargate-cli/src/dashboard/backlog.ts` (new) — `collectBacklog(cwd)` and the `BacklogData` type: items, epic→children map, diagnostics.
- `cleargate-cli/src/commands/sprint-scope.ts` (new) — `sprintScopeHandler({ op, sprintId, ids, expectSha })`, used by both the CLI and `POST /plan`.
- `cleargate-cli/src/commands/sprint.ts` — `sprintDashboardHandler` no longer requires an active sprint; it stays the target of the alias.
- `cleargate-cli/src/cli.ts` — register top-level `dashboard`, `sprint add`, `sprint remove`; keep `sprint dashboard`.
- `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-dashboard/SKILL.md` — document the tabs, the new command and the lifecycle change. The live `/.claude/` copy is re-synced at Gate 4 per the dogfood split.
- `cleargate-cli/test/dashboard/backlog.node.test.ts`, `cleargate-cli/test/dashboard/serve.node.test.ts`, `cleargate-cli/test/commands/sprint-scope.node.test.ts` — new and extended node:test coverage.

**Data Changes:**
- Sprint file frontmatter: `epics` / `stories` / `bugs` / `crs` / `proposals` lists gain a programmatic writer. No new keys.
- Work-item frontmatter: `sprint_cleargate_id` gains a programmatic writer. No new keys.
- Daemon record: moves from `.cleargate/sprint-runs/<id>/.dashboard.json` to a sprint-independent path (gitignored like today's).
- `/data` JSON: gains a top-level `backlog` object. Existing keys are unchanged.

**Decomposition (2026-11-10):**
1. STORY-062-01 — Sprint-independent lifecycle + top-level `cleargate dashboard` + tab shell, with the Sprint tab unchanged.
2. STORY-062-02 — `collectBacklog()` + the Backlog tab.
3. STORY-062-03 — `cleargate sprint add|remove` (`sprint-scope.ts`), CLI only.
4. STORY-062-04 — The Plan tab (`plan.ts`) + `POST /plan` + CSRF guard + skill docs. Depends on STORY-062-02 and STORY-062-03.

## 5. Acceptance Criteria

```gherkin
Feature: Dashboard Backlog Board and Sprint Planner

  Scenario: Dashboard runs with no active sprint
    Given no .cleargate/sprint-runs/.active sentinel exists
    When the user runs `cleargate dashboard --open`
    Then a dashboard server starts on 127.0.0.1 and the browser opens it
    And the Backlog and Plan tabs render
    And the Sprint tab says no sprint is active instead of erroring

  Scenario: Backlog shows gate state for open items
    Given pending-sync holds BUG-106 with cached_gate_result.pass false and failing criterion "repro-steps-deterministic"
    When the user opens the Backlog tab
    Then BUG-106 is listed under its status with a failing-gate badge naming "repro-steps-deterministic"

  Scenario: Epics expand into their stories
    Given EPIC-031 and stories STORY-031-03 and STORY-031-04 with parent_epic_ref EPIC-031
    When the user expands EPIC-031 in the Backlog tab
    Then both stories are listed beneath it

  Scenario: Adding items to a draft sprint keeps lists and items consistent
    Given SPRINT-43 has status Draft and is not named by .active
    When the user runs `cleargate sprint add SPRINT-43 BUG-086 CR-120 EPIC-031`
    Then SPRINT-43's bugs list contains BUG-086, crs contains CR-120 and epics contains EPIC-031
    And each of those three files has sprint_cleargate_id SPRINT-43
    And each touched file's cached_gate_result and wiki page are refreshed
    And the sprint file body below the frontmatter is byte-identical

  Scenario: Plan tab commits a selection
    Given the dashboard is open on the Plan tab with SPRINT-43 selected
    When the user ticks BUG-087 and clicks Commit
    Then BUG-087 is added to SPRINT-43 exactly as `cleargate sprint add` would add it
    And the Plan tab shows the updated membership on the next poll

  Scenario: Plan tab warns about items that would fail preflight
    Given BUG-106 fails its readiness gate
    When the user ticks BUG-106 in the Plan tab
    Then a warning names BUG-106 and its failing criterion before Commit

  Scenario: Writing to an active sprint is refused
    Given SPRINT-42 is named by .cleargate/sprint-runs/.active
    When the user runs `cleargate sprint add SPRINT-42 BUG-086`
    Then the command exits non-zero with "SPRINT-42 is active — scope changes go through the mid-sprint triage rubric"
    And no file is modified

  Scenario: Unknown id is refused atomically
    When the user runs `cleargate sprint add SPRINT-43 BUG-086 BUG-999`
    Then the command exits non-zero naming BUG-999
    And no file is modified

  Scenario: Stale page write is refused
    Given the Plan tab loaded SPRINT-43 and the agent then edited SPRINT-43's frontmatter
    When the user clicks Commit
    Then the server responds 409 with "sprint file changed — reload"
    And no file is modified

  Scenario: Cross-origin write is rejected
    Given the dashboard is running
    When a request to POST /plan arrives without the per-launch token or with a foreign Origin
    Then the server responds 403
    And no file is modified

  Scenario: Item already in another sprint
    Given BUG-052 has sprint_cleargate_id SPRINT-42
    When the user runs `cleargate sprint add SPRINT-43 BUG-052`
    Then the command exits non-zero naming SPRINT-42 and suggesting `cleargate sprint remove SPRINT-42 BUG-052` first
```

## 6. AI Interrogation Loop (Human Input Required)
*(AI Planning Engine: List edge cases, contradictions, or missing details found while drafting. The Epic stays 🔴 until the Human answers all of these.)*

All questions resolved 2026-11-10. Owner: "agree with your recommendations." Answers are integrated into §2–§5:

- **Q1, §1 table:** `sprint add|remove` edits frontmatter lists only. The Plan tab shows "plan body out of date — ask the agent to refresh §1 and the Sprint Design Review" whenever the frontmatter lists and the §1 table disagree. The CLI never edits prose the Architect owns.
- **Q2, unready items:** warn only. The Plan tab warns on unapproved or gate-failing picks, and `sprint add` accepts them; Gate 3 `sprint preflight` remains the hard block.
- **Q3, moving between sprints:** refuse in v1. `sprint add` exits non-zero for an item already in another sprint and suggests `sprint remove` first; there is no `--move` flag.
- **§4 literal check:** the owner accepted planned `action="create"` paths (parent directories verified) as satisfying "real, verified file paths". Every `action="modify"` path exists on disk.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Coding Agent):
- [x] `approved: true` is set in the YAML frontmatter.
- [x] The `<agent_context>` block is complete and validated.
- [x] §4 Technical Grounding contains 100% real, verified file paths.
- [x] §6 AI Interrogation Loop is empty (all human answers integrated into the spec).
- [x] 0 "TBDs" exist in the document.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered.
