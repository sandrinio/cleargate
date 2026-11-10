---
story_id: STORY-062-03
parent_epic_ref: EPIC-062
parent_cleargate_id: EPIC-062
sprint_cleargate_id: SPRINT-44
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-11-10T00:00:00Z
ambiguity: 🟢 Low
area: cleargate-cli,sprint-planning
context_source: "Decomposed from approved EPIC-062 (owner 2026-11-10: 'agree with your recommendations. please plan the sprint'; Q1 frontmatter-only, Q2 warn-not-block, Q3 refuse moves). Grounded 2026-11-10 against cleargate-cli/src/lib/frontmatter-locator.ts, stamp-frontmatter.ts, src/commands/gate.ts, wiki-ingest.ts, sprint-file-locate.ts and src/cli.ts."
actor: ClearGate owner or orchestrator agent assembling a sprint
complexity_label: L2
parallel_eligible: y
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
  last_gate_check: 2026-11-10T05:53:27Z
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
  last_stamp: 2026-11-10T06:49:35Z
  sessions:
    - session: 11d4cf54-bf8f-48fe-b10c-fadb7867e924
      model: claude-opus-5-5
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-11-10T05:56:46Z
---

# STORY-062-03: `cleargate sprint add|remove` Command
**Complexity:** L2 — one new command module on existing frontmatter, stamp, gate and ingest helpers.

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate owner or orchestrator agent, I want `cleargate sprint add|remove <sprint-id> <ids…>`, so that sprint membership changes in one step and the sprint file and its items never disagree.

### 1.2 Detailed Requirements
- R1: `cleargate sprint add <sprint-id> <ids...>` and `cleargate sprint remove <sprint-id> <ids...>`, registered in `src/cli.ts` and implemented by `sprintScopeHandler({ op, sprintId, ids, expectSha?, json? }, cli?)` in a new `src/commands/sprint-scope.ts`.
- R2: Routing by id prefix: `EPIC`→`epics`, `STORY`→`stories`, `BUG`→`bugs`, `CR`→`crs`, `PROPOSAL`→`proposals`. Any other prefix (`SPRINT`, `INITIATIVE`, `HOTFIX`, `SPIKE`) is refused with "cannot be scheduled into a sprint".
- R3: `add` appends each id to its list (no duplicates) and sets the item's `sprint_cleargate_id` to the sprint id. `remove` deletes the id from its list and sets `sprint_cleargate_id: null`. An id already in or out of the sprint is a reported no-op.
- R4: Refusals. Exit 1 and modify nothing when any of these hold:
  - the sprint file is missing
  - the sprint is Active (named by `resolveActiveSprint`, or `.cleargate/sprint-runs/<id>/state.json` exists) or `status: Completed`
  - an id has no file in pending-sync
  - an `add` id has a `sprint_cleargate_id` naming a different sprint **that is still open (Draft, Ready or Active)**. The message names that sprint and suggests `cleargate sprint remove <other> <id>`.
  - *(Clarified 2026-11-10, M1 plan decision 1.)* A claim by a sprint that is Completed, archived, or has no sprint file is **stale**: `add` overwrites it and warns `<ID> was claimed by <OTHER> (<completed|archived|no sprint file>) — reassigned`. Otherwise carried items such as BUG-102..116 (claimed by the Completed SPRINT-41) could never be scheduled without hand-editing YAML.
- R5: `--expect <sha256>` precondition: when given and it differs from the sprint file's current sha256, exit 3 with "sprint file changed — reload", touching nothing.
- R6: All-or-nothing writes. Every new file content is computed and validated before the first write. Writes go through `withFrontmatterYaml`, so each body below the frontmatter is byte-identical, using atomic tmp+rename per file.
- R7: After writing, run `stampFrontmatter`, then `gateCheckHandler`, then `wikiIngestHandler` on every touched file. A failure in these steps is reported as a warning and does not undo the write (exit 0 with warnings).
- R8: Unready items are accepted (Q2: warn, don't block). `add` of an unapproved or gate-failing item succeeds and prints one warning per item naming the failing criteria.
- R9: `--json` prints `{ sprintId, op, changed: string[], unchanged: string[], warnings: string[], sha: string /* sprint file sha after write */ }`. Without `--json` it prints one human line per id. *(Clarified 2026-11-10, M2 plan cross-story risks; STORY-062-04 calls this handler twice in a row inside the dashboard server.)* `sha` is sha256 of the sprint file's **raw bytes** (`readFileSync`, not `hashNormalized`), computed **after** the stamp, gate-check and ingest steps of R7, so a second call with `expectSha = sha` succeeds. Every path resolves from `cli.cwd`. Gate and ingest run through exit/stdout seams, so a failure can never call `process.exit` in the server process. `sprint-scope.ts` must not import `commands/sprint.ts` (that would create an import cycle through `serve.ts`).
- R10: The sprint body (§1 Deliverables table, Sprint Design Review) is never edited (Q1).

### 1.3 Out of Scope
- Moving an item between sprints in one call (Q3; no `--move`).
- Editing the sprint plan body, `waves.json`, or `state.json`.
- The page and its POST route (STORY-062-04 calls `sprintScopeHandler`).

### 1.4 Open Questions

- **Question:** Should archived items be addable?
- **Recommended:** No. Only pending-sync files resolve; an archived id is reported as "not found in pending-sync (archived items are terminal)".
- **Human decision:** Accepted with the EPIC-062 recommendations (owner 2026-11-10).

### 1.5 Risks

- **Risk:** `gateCheckHandler` and `wikiIngestHandler` are written as CLI handlers that may print or call `process.exit`.
- **Mitigation:** Call them with their injectable `cli` seams (stdout, stderr and exit captured), as other handlers in `sprint.ts` do. If a handler has no exit seam, run `node <dist cli> gate check <file>` and `wiki ingest <file>` through the existing `run_script.sh` path instead, and record that choice in the dev report.
- **Risk:** YAML list rewrites reorder or reformat other keys.
- **Mitigation:** Edit only the target keys on the parsed object, serialize the way `stamp-frontmatter.ts` does, and assert byte-identical bodies in tests.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Add and remove. |
| Interfaces | T | Human output and `--json` output. |
| Data | T | Routing differs per work-item type. |
| Rules | T | Active or completed sprint, unknown id, item in another sprint, stale precondition. |

```gherkin
Feature: cleargate sprint add|remove

  @data
  Scenario Outline: Add routes each type to its list and stamps the item
    Given SPRINT-43 has status Draft and no state.json, and is not named by .active
    When the user runs `cleargate sprint add SPRINT-43 <id>`
    Then SPRINT-43's <list> list contains <id>
    And <id>'s file has sprint_cleargate_id SPRINT-43
    And the bodies of both files are byte-identical to before
    And both files have a refreshed cached_gate_result.last_gate_check

    Examples:
      | id           | list      |
      | EPIC-031     | epics     |
      | STORY-031-03 | stories   |
      | BUG-086      | bugs      |
      | CR-120       | crs       |

  @paths
  Scenario: Remove clears both sides
    Given BUG-086 is in SPRINT-43's bugs list with sprint_cleargate_id SPRINT-43
    When the user runs `cleargate sprint remove SPRINT-43 BUG-086`
    Then SPRINT-43's bugs list no longer contains BUG-086
    And BUG-086's sprint_cleargate_id is null

  @rules
  Scenario Outline: Invalid requests are refused and nothing is written
    Given <setup>
    When the user runs `<command>`
    Then the command exits <code> with a message containing "<message>"
    And no file under .cleargate/delivery is modified

    Examples:
      | setup                                         | command                                          | code | message                          |
      | SPRINT-42 is named by .active                 | cleargate sprint add SPRINT-42 BUG-086           | 1    | SPRINT-42 is active              |
      | BUG-999 does not exist                        | cleargate sprint add SPRINT-43 BUG-086 BUG-999   | 1    | BUG-999                          |
      | BUG-052 has sprint_cleargate_id SPRINT-42     | cleargate sprint add SPRINT-43 BUG-052           | 1    | cleargate sprint remove SPRINT-42 BUG-052 |
      | SPRINT-43's sha256 is not abc123              | cleargate sprint add SPRINT-43 BUG-086 --expect abc123 | 3 | sprint file changed — reload     |
      | INITIATIVE-001 exists                         | cleargate sprint add SPRINT-43 INITIATIVE-001    | 1    | cannot be scheduled into a sprint |

  @rules
  Scenario: An unready item is added with a warning
    Given BUG-106 has approved false and cached_gate_result.pass false with failing criterion repro-steps-deterministic
    When the user runs `cleargate sprint add SPRINT-43 BUG-106`
    Then the command exits 0
    And it warns "BUG-106 is not approved" and "BUG-106 fails repro-steps-deterministic"

  @rules
  Scenario: A stale claim by a completed sprint is reassigned
    Given BUG-106 has sprint_cleargate_id SPRINT-41 and SPRINT-41 has status Completed
    When the user runs `cleargate sprint add SPRINT-43 BUG-106`
    Then the command exits 0
    And BUG-106's sprint_cleargate_id is SPRINT-43
    And it warns "BUG-106 was claimed by SPRINT-41 (completed) — reassigned"

  @interfaces
  Scenario: JSON output reports the change and the new sha
    When the user runs `cleargate sprint add SPRINT-43 BUG-086 CR-120 --json`
    Then stdout is one JSON object with op "add", changed ["BUG-086","CR-120"] and sha equal to SPRINT-43's new sha256
```

### 2.2 Verification Steps (Manual)
- [ ] In this repo, `node cleargate-cli/dist/cli.js sprint add SPRINT-43 BUG-086 --json` then `sprint remove SPRINT-43 BUG-086` leaves `git diff` for both files limited to `updated_at`/gate stamps.

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/commands/sprint-scope.ts` |
| Related Files | `cleargate-cli/src/cli.ts` |
| Test Files | `cleargate-cli/test/commands/sprint-scope.node.test.ts` |
| New Files Needed | Yes — `cleargate-cli/src/commands/sprint-scope.ts`, `cleargate-cli/test/commands/sprint-scope.node.test.ts` |

### 3.2 Technical Logic
1. Resolve the sprint file with `findSprintPlanFile(cwd, sprintId)` (`sprint-file-locate.ts:53`); refuse per R4.
2. Resolve each id to a pending-sync file using the delimiter rule from `collect.ts` `findDeliveryFileById`. Pending-sync only.
3. Parse each file with `locateFrontmatter` + `frontmatterYaml` (`frontmatter-locator.ts:69`, `:136`) and validate everything. Then compute new YAML for the sprint and each item, and new full contents with `withFrontmatterYaml` (`:144`).
4. Check `--expect` against sha256 of the sprint file's current bytes, then write all files (tmp+rename).
5. Post-write: `stampFrontmatter(abs)` (`stamp-frontmatter.ts:33`), `gateCheckHandler` (`gate.ts:152`), `wikiIngestHandler` (`wiki-ingest.ts:83`), each wrapped so a throw becomes a warning.
6. Export `sprintScopeHandler` and the result type so STORY-062-04 can call it in-process with a captured `cli` seam.

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `sprintScopeHandler` (in-process) | — | — | `{ op: 'add'\|'remove', sprintId, ids: string[], expectSha?: string, json?: boolean }` | `{ ok: boolean, code: 0\|1\|3, sprintId, op, changed, unchanged, warnings, errors, sha }` |

## Task Breakdown

- [ ] Id routing and sprint/item resolution with all R4 refusals -> R2, R4
- [ ] Compute-then-write with `--expect` precondition and atomic writes -> R5, R6
- [ ] add/remove list and `sprint_cleargate_id` edits -> R3
- [ ] Post-write stamp, gate check and wiki ingest with warning capture; unready-item warnings -> R7, R8
- [ ] `--json` and human output; register both subcommands in `cli.ts` -> R1, R9

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 3 | id routing, refusal precedence, byte-identical body after edit. |
| Integration tests | 2 | Against a temp project tree: add then remove round-trip with real stamp, gate check and ingest; a failing ingest yields a warning, not a rollback. |
| E2E / acceptance tests | 5 | One per Gherkin scenario in §2.1 (each outline counts once; every Examples row is asserted). |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] `npm run typecheck` clean and `sprint-scope.node.test.ts` green in `cleargate-cli/`.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/lib/frontmatter-locator.ts:69` — `locateFrontmatter`; `withFrontmatterYaml` (144) gives body-preserving rewrites.
- **Surface:** `cleargate-cli/src/lib/stamp-frontmatter.ts:33` — `stampFrontmatter`.
- **Surface:** `cleargate-cli/src/commands/gate.ts:152` — `gateCheckHandler`.
- **Surface:** `cleargate-cli/src/commands/wiki-ingest.ts:83` — `wikiIngestHandler`.
- **Surface:** `cleargate-cli/src/commands/sprint-file-locate.ts:53` — `findSprintPlanFile`; `resolveActiveSprint` (101).
- **Coverage of this requirement:** partial. Every primitive exists; no command writes sprint membership or `sprint_cleargate_id` today (the only references in `cleargate-cli/src` are wiki-ingest reads).

## Prior work

- [[EPIC-030]] — AI-driven sprint planning (Draft). Its future `sprint plan --auto` would write membership too and should call this command instead of a second writer.
- [[CR-084]] — the sprint command family this joins.

## Why not simpler?

- **Smallest existing surface that could carry this:** `cleargate-cli/src/commands/sprint.ts`, as two more handlers.
- **Why isn't extension / parameterization / config sufficient?** `sprint.ts` is already ~2000 lines across five handlers, and STORY-062-04 must import this logic without pulling in the rest. A small module reusing the existing primitives keeps one write path for the CLI, the page and future EPIC-030 planning. Hand-editing YAML, today's method, is exactly what drifts the two sides apart.

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
