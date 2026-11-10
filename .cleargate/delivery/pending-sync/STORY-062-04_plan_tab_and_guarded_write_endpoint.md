---
story_id: STORY-062-04
parent_epic_ref: EPIC-062
parent_cleargate_id: EPIC-062
sprint_cleargate_id: SPRINT-44
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-11-10T00:00:00Z
ambiguity: 🟢 Low
area: cleargate-cli,dashboard,sprint-planning
context_source: "Decomposed from approved EPIC-062 (owner 2026-11-10: 'agree with your recommendations. please plan the sprint'; Q1 frontmatter-only with an out-of-date banner, Q2 warn-not-block). Grounded 2026-11-10 against cleargate-cli/src/dashboard/serve.ts (routes :124-150, LOOPBACK :49), render.ts and scaffold/hosts/claude/.claude/skills/sprint-dashboard/SKILL.md."
actor: ClearGate owner planning the next sprint in a browser
complexity_label: L3
parallel_eligible: n
expected_bounce_exposure: med
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
  last_gate_check: 2026-11-10T05:54:16Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-062-04
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-10T05:56:08Z
  sessions: []
---

# STORY-062-04: Plan Tab and Guarded Write Endpoint
**Complexity:** L3 — the page's first write path: plan data, a protected POST route, and an interactive view; depends on STORY-062-02 and STORY-062-03.

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate owner, I want to tick items into a draft sprint on the Plan tab and commit them, so that I assemble the next sprint without editing YAML and see readiness problems before preflight does.

### 1.2 Detailed Requirements
- R1: New `collectPlan(cwd, backlog): PlanData` in `src/dashboard/plan.ts`. It returns the sprints in pending-sync that are not Active or Completed, each with `id`, `title`, `status`, its `epics`/`stories`/`bugs`/`crs`/`proposals` lists, `sha` (sha256 of file bytes) and `bodyOutOfDate`. `bodyOutOfDate` is true when the set of ids in the frontmatter lists differs from the ids in the §1 Consolidated Deliverables table.
- R2: Candidates are backlog items (from STORY-062-02's `BacklogData`) whose `sprint` is null or the selected sprint, plus items with `carryOver: true`. Each candidate carries warnings:
  - not approved
  - gate failing, naming the criteria
  - an epic in the sprint with none of its stories in the sprint
  - in another sprint, shown disabled with that sprint's id
- R3: `/data` gains a top-level `plan` key. Existing keys are unchanged.
- R4: The Plan tab offers a sprint picker, then a list of candidates with checkboxes (current members pre-ticked) and their warnings. A pending-change summary reads "+3 −1". Commit is enabled only when the summary is non-empty. Ticking an epic offers to tick its children; nothing is auto-ticked.
- R5: Commit sends `POST /plan` with `{ sprintId, add: string[], remove: string[], expectSha }`. The server calls STORY-062-03's `sprintScopeHandler` in-process: first `remove`, then `add`, the second call with the sha the first returned. It responds `{ ok, changed, warnings, sha }`, and the page shows the warnings and refreshes on the next poll.
- R6: CSRF guard. At startup the server creates a random 32-byte hex token and embeds it in the served HTML (never in `/data`). `POST /plan` returns 403 and writes nothing unless:
  - header `X-ClearGate-Token` equals the token
  - `Origin` (when present) and `Host` match `http://127.0.0.1:<port>` or `http://localhost:<port>`
  - `Content-Type` is `application/json`
  - the body is at most 64 KiB

  Every other method or path stays as today (GET-only, 404 otherwise).
- R7: A stale `expectSha` (handler code 3) returns 409 `{ ok:false, error:"sprint file changed — reload" }`. Handler code 1 returns 422 with its errors. Nothing is written in either case.
- R8: When the selected sprint's `bodyOutOfDate` is true, the tab shows a banner: "plan body out of date — ask the agent to refresh §1 and the Sprint Design Review".
- R9: The canonical sprint-dashboard skill documents the whole epic: `cleargate dashboard`, the three tabs, sprint-independent lifecycle (sentinel valve gone, idle valve kept), and `cleargate sprint add|remove` as the way to assemble a sprint.

### 1.3 Out of Scope
- Creating sprints, editing plan bodies, starting or closing sprints.
- Any POST other than `/plan`.
- The live `/.claude/skills/sprint-dashboard/SKILL.md` copy (re-synced at Gate 4 per the dogfood split).

### 1.4 Open Questions

- **Question:** Should the epic-with-no-stories warning also fire when only some of an epic's stories are in the sprint?
- **Recommended:** No. Partial epics are normal (stories span sprints), so only the zero-story case is a mistake signal.
- **Human decision:** Accepted with the EPIC-062 recommendations (owner 2026-11-10).

### 1.5 Risks

- **Risk:** CSRF. Any site in the user's browser can POST to 127.0.0.1.
- **Mitigation:** R6 token + Origin/Host + JSON-only, each covered by a test that asserts a 403 and an unchanged file tree.
- **Risk:** The agent edits the sprint file while the tab is open.
- **Mitigation:** the `expectSha` precondition → 409, and the page reloads plan data.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Commit with additions and removals together. |
| Interfaces | F | One surface, the page; the CLI interface to the same handler is STORY-062-03's. |
| Data | F | Per-type routing is owned and tested by STORY-062-03's handler; this story passes ids through unchanged. |
| Rules | T | Readiness warnings, CSRF guard, stale precondition, body-out-of-date banner. |

```gherkin
Feature: Plan tab and guarded write endpoint

  @paths
  Scenario: Committing a selection updates sprint membership
    Given the Plan tab shows SPRINT-43 with BUG-086 ticked as a member
    When the user ticks CR-120, unticks BUG-086 and clicks Commit
    Then POST /plan carries add ["CR-120"], remove ["BUG-086"] and the sha from the last /data
    And SPRINT-43's crs list contains CR-120 and its bugs list no longer contains BUG-086
    And the next /data shows the new membership and sha

  @rules
  Scenario: Unready picks are warned, not blocked
    Given BUG-106 is not approved and fails repro-steps-deterministic
    When the user ticks BUG-106
    Then the row shows "not approved" and "fails repro-steps-deterministic"
    And Commit stays enabled

  @rules
  Scenario Outline: Unguarded writes are rejected
    Given the dashboard is running on port <port>
    When a POST /plan arrives with <defect>
    Then the server responds 403
    And no file under .cleargate/delivery is modified

    Examples:
      | defect                                  |
      | no X-ClearGate-Token header             |
      | a wrong X-ClearGate-Token               |
      | Origin https://evil.example             |
      | Content-Type text/plain                 |

  @rules
  Scenario: A stale sprint file is not overwritten
    Given the Plan tab loaded SPRINT-43 at sha S1
    And SPRINT-43 was edited afterwards so its sha is S2
    When the user clicks Commit
    Then the server responds 409 with "sprint file changed — reload"
    And SPRINT-43 is unchanged

  @rules
  Scenario: The out-of-date plan body is flagged
    Given SPRINT-43's frontmatter lists CR-120 but its §1 Consolidated Deliverables table does not
    When the user selects SPRINT-43 on the Plan tab
    Then a banner reads "plan body out of date — ask the agent to refresh §1 and the Sprint Design Review"
```

### 2.2 Verification Steps (Manual)
- [ ] In this repo, select SPRINT-43, tick one item, Commit; `git diff` shows only the frontmatter lists, `sprint_cleargate_id` and stamps.
- [ ] `curl -X POST http://127.0.0.1:<port>/plan -H 'Content-Type: application/json' -d '{}'` returns 403.

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/dashboard/plan.ts` |
| Related Files | `cleargate-cli/src/dashboard/serve.ts`, `cleargate-cli/src/dashboard/render.ts`, `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-dashboard/SKILL.md` |
| Test Files | `cleargate-cli/test/dashboard/plan.node.test.ts`, `cleargate-cli/test/dashboard/serve.node.test.ts`, `cleargate-cli/test/dashboard/render.node.test.ts` |
| New Files Needed | Yes — `cleargate-cli/src/dashboard/plan.ts`, `cleargate-cli/test/dashboard/plan.node.test.ts` |

### 3.2 Technical Logic
- `plan.ts`: list `pending-sync/SPRINT-*.md` and skip any whose status is Completed or that `resolveActiveSprint` names or that has a `state.json`. Parse the lists, compute sha256 of the bytes, and parse the §1 table by header name (FLASHCARD 2026-07-14 #cli #parse #dashboard: columns vary; split cells respecting `\|`, FLASHCARD 2026-09-25). Candidates and warnings come from the `BacklogData` passed in.
- `serve.ts`: generate `const token = crypto.randomBytes(32).toString('hex')` once per `serve()` and pass it to `render` for embedding. Add the `POST /plan` branch before the 404: check method, path, headers and size, read JSON, call `sprintScopeHandler` with a captured `cli` seam, and map codes to 200/409/422. GET routes are unchanged.
- `render.ts`: fill the `data-tab="plan"` panel. Selection state lives client-side and survives polls; a poll that changes the selected sprint's `sha` while there are uncommitted ticks shows "sprint changed on disk — your selection was kept; Commit will be refused until you reload".
- `SKILL.md` (canonical scaffold): update the mode table, the lifecycle section and add a "Planning a sprint" section.

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `/plan` | POST | `X-ClearGate-Token` + same-origin | `{ sprintId: string, add: string[], remove: string[], expectSha: string }` | 200 `{ ok: true, changed, warnings, sha }` · 403 `{ ok:false, error }` · 409 `{ ok:false, error:"sprint file changed — reload" }` · 422 `{ ok:false, errors }` |
| `/data` | GET | None | none | `SprintDashboardData & { backlog: BacklogData, plan: PlanData }` |

## Task Breakdown

- [ ] `collectPlan`: non-active sprints, lists, sha, §1-vs-frontmatter comparison -> R1
- [ ] Candidate pool and per-candidate warnings from `BacklogData` -> R2
- [ ] Add `plan` to `/data` -> R3
- [ ] Per-launch token, `POST /plan` guard and handler call with 200/403/409/422 mapping -> R5, R6, R7
- [ ] Plan tab UI: picker, checkboxes, diff summary, Commit, warnings, out-of-date banner -> R4, R8
- [ ] Update canonical sprint-dashboard SKILL.md for the whole epic -> R9

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | collectPlan sprint filtering, sha, §1 comparison with escaped pipes, warning derivation. |
| Integration tests | 3 | Real server on an ephemeral port over a temp project tree: guarded POST round-trip, 403 matrix, 409 stale sha. |
| E2E / acceptance tests | 5 | One per Gherkin scenario in §2.1 (outline rows each asserted). |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] `npm run typecheck` clean and the dashboard test files green in `cleargate-cli/`.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/dashboard/serve.ts:124` — request router (GET `/`, `/healthz`, `/data`; 404 otherwise) that gains the guarded POST branch; `LOOPBACK` at line 49.
- **Surface:** `cleargate-cli/src/dashboard/render.ts:768` — page render that embeds the token and gets the Plan panel.
- **Surface:** `cleargate-cli/src/commands/sprint-file-locate.ts:101` — `resolveActiveSprint`, used to exclude the active sprint.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-dashboard/SKILL.md` — canonical skill doc updated for the epic.
- **Coverage of this requirement:** partial. Server, render and active-sprint resolution exist; plan data, the POST route, its guard and the view are new.

## Prior work

- [[EPIC-030]] — AI sprint planning (Draft); its future grooming ranking is a later input to this tab.
- [[CR-101]] — the live server and `/data` poller this tab rides on.
- [[PROPOSAL-009]] — earlier admin-console take on planning visibility (Draft, never approved).

## Why not simpler?

- **Smallest existing surface that could carry this:** `cleargate-cli/src/dashboard/serve.ts` + `render.ts`, with the plan logic inline.
- **Why isn't extension / parameterization / config sufficient?** The page needs a write path, and a read-only "copy this prompt to the agent" button was rejected at epic level because it leaves membership as hand-edited YAML. Plan derivation is separated into `plan.ts` so it is unit-testable without a server, and the write itself is delegated to STORY-062-03's handler, so the page has no second writer.

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
