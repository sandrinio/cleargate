---
story_id: STORY-066-10
parent_epic_ref: EPIC-066
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: "Completed"
approved: true
approved_by: "sandrinio"
approved_at: "2026-11-15T09:00:00Z"
ambiguity: 🟢 Low
context_source: EPIC-066 (approved 2026-11-14; rework-routing and dispatches-by-lane bullets); update_state.mjs, state-events.mjs and sprint_metrics.mjs read at canonical main
actor: QA-Verify and the orchestrator reading the sprint report
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: low
lane: standard
area: sprint-execution,scripts,measurement
db_write_set: []
deferred_verification: []
created_at: 2026-11-14T19:47:48.886Z
updated_at: 2026-11-14T19:47:48.886Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-14T19:54:40Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# STORY-066-10: Rework Routed by Defect Location
**Complexity:** L2 — three existing scripts, one new event field, one new metrics table; known pattern.

## 1. The Spec (The Contract)

### 1.1 User Story
As an orchestrator reading a QA-Verify FAIL, I want the bounce to record whether the defect is in the code, the red test or the spec, so that the item returns to the right agent and the sprint report counts the two kinds of rework apart and shows dispatches per item by lane.

### 1.2 Detailed Requirements
- Requirement 1: `update_state.mjs <ID> --qa-bounce --defect-in <code|red-test|spec>` records the location on the `qa-bounce` event as `defect_in`. Any other value exits 2 with a usage error and writes nothing. `--qa-bounce` without `--defect-in` keeps working and records `defect_in: "unknown"`. `--arch-bounce` is unchanged.
- Requirement 2: The routing rule lives in the script's output message, so the orchestrator and Codex hosts read it without the skill: `code` returns to the Developer, `red-test` returns to QA-Red, `spec` halts for the owner. A `spec` defect sets the resulting state to `Escalated` at once (it is not a retry), whatever the bounce count; `code` and `red-test` escalate only at `BOUNCE_CAP` as today. `state-events.mjs` folds a `qa-bounce` event whose `to` is `Escalated` to that state.
- Requirement 3: `state-events.mjs` lists `defect_in` among the kind-specific fields of `qa-bounce` events (`EVENT_SCHEMA` comment and fold); events written before this release have no `defect_in` and read as `unknown`. A state.json or events.jsonl from an earlier release still folds without error.
- Requirement 4: `sprint_metrics.mjs` reads `events.jsonl` and reports, per item and for the sprint, rework split by defect location: `rework.by_defect_in: { code, red-test, spec, unknown }`, counted from the item's `qa-bounce` events. The existing transcript-derived `red_corrections`, `dev_reruns` and `verify_reruns` fields are kept as they are.
- Requirement 5: `sprint_metrics.mjs` reports dispatches per item by lane: each item carries `lane` (from `state.json`, `standard` when absent), and the document gains `by_lane: { <lane>: { items, dispatches, per_item } }` where `per_item` is dispatches divided by items. The table printer adds the lane to each item line and prints one `by lane:` line per lane. The metric is read from the host's transcripts, so a sprint with no measured dispatches prints `not measured` for it, not zero.

### 1.3 Out of Scope
- QA-Verify's `DEFECT_IN:` output line and the pack's commands (STORY-066-09), and the skill text that tells the orchestrator which agent to dispatch next (STORY-066-12).
- Letting the Developer or QA-Red act on the routing; this story records and reports.
- Changing `BOUNCE_CAP`, or counting `red-test` bounces apart from `code` bounces against the cap. All `qa-bounce` events count toward `qa_bounces` as today.
- The `runtime` lane value itself ([[STORY-066-05]] adds it to the schema and to `--lane`; this story only reads a lane string).

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** Does a `spec` defect count as a bounce and escalate at once, or follow the cap like the others? The epic says only that it "halts for the owner".
- **Recommended:** Count it and escalate at once (Requirement 2). A wrong spec cannot be fixed by another Developer round, so spending bounces on it only delays the owner.
- **Human decision:** Resolved by the drafter on the epic's wording ("a `spec` defect halts for the owner"); confirmed by the owner with the SPRINT-46 Brief, 2026-11-15.

### 1.5 Risks

> Risks specific to this Story (cross-story risks belong in the milestone plan).

- **Risk:** A `state.json` replay of an old `events.jsonl` breaks when the fold sees an unknown field or a missing `defect_in`.
- **Mitigation:** The fold never requires the field; a test replays a pre-release event log and asserts the same state.
- **Risk:** Hand-built metrics fixtures lack `lane` or `events.jsonl`, and the new table throws.
- **Mitigation:** Defaults (`standard`, `unknown`, empty table) and a guard test over the existing `test/fixtures/sprint-metrics/builders.ts` fixtures.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | A code defect and a red-test defect take different routes through the same command. |
| Interfaces | F | Both changes are CLI and file outputs of one script family; no second surface. |
| Data | T | An old bounce event with no `defect_in` is read as `unknown`. |
| Rules | T | An invalid location is rejected; a spec defect escalates at once. |

```gherkin
Feature: Rework routed by defect location

  @paths
  Scenario: A red-test defect is recorded and routed to QA-Red
    Given STORY-G is in state "Bouncing" with qa_bounces 0
    When update_state.mjs STORY-G --qa-bounce --defect-in red-test runs
    Then the qa-bounce event in events.jsonl carries defect_in "red-test"
    And qa_bounces is 1 and the state is unchanged
    And the printed message says the item returns to QA-Red

  @data
  Scenario: A bounce without a location is still accepted
    Given STORY-H is in state "Bouncing"
    When update_state.mjs STORY-H --qa-bounce runs with no --defect-in
    Then the event carries defect_in "unknown"
    And an events.jsonl written before this release folds to the same state as before

  @rules
  Scenario: An unknown location is rejected and a spec defect escalates
    Given STORY-I is in state "Bouncing" with qa_bounces 0
    When update_state.mjs STORY-I --qa-bounce --defect-in style runs
    Then it exits 2 and writes no event
    And when update_state.mjs STORY-I --qa-bounce --defect-in spec runs instead, the state becomes "Escalated" with qa_bounces 1

  @paths
  Scenario: The sprint metrics split rework by defect location
    Given a sprint whose events.jsonl holds two code bounces, one red-test bounce and one bounce with no location for STORY-J
    When sprint_metrics.mjs runs for that sprint
    Then STORY-J's rework.by_defect_in is { code: 2, red-test: 1, spec: 0, unknown: 1 }
    And the sprint totals carry the same split

  @data
  Scenario: The sprint metrics report dispatches per item by lane
    Given a fast item with 1 measured dispatch and two standard items with 3 each
    When sprint_metrics.mjs runs
    Then by_lane.fast is { items: 1, dispatches: 1, per_item: 1 } and by_lane.standard is { items: 2, dispatches: 6, per_item: 3 }
    And each item line in the table output names its lane
```

### 2.2 Verification Steps (Manual)
- [ ] Run `update_state.mjs` against a scratch `state.json` with each of the three locations and read `events.jsonl`.
- [ ] Run `sprint_metrics.mjs` on SPRINT-45's directory and confirm the old fields are unchanged and `by_lane` appears.

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/core/.cleargate/scripts/update_state.mjs` |
| Related Files | `cleargate-cli/scaffold/core/.cleargate/scripts/state-events.mjs`, `cleargate-cli/scaffold/core/.cleargate/scripts/sprint_metrics.mjs` |
| Tests | `cleargate-cli/test/scripts/test_update_state.integration.node.test.ts`, `cleargate-cli/test/scripts/sprint-metrics.red.node.test.ts`, `cleargate-cli/test/fixtures/sprint-metrics/builders.ts` |
| New Files Needed | No |

### 3.2 Technical Logic
`update_state.mjs`: in the `--qa-bounce` branch (line 386) read `args[2] === '--defect-in'` and `args[3]`; validate against `['code', 'red-test', 'spec']` (exit 2 otherwise, add the form to `usage()` at line 174); default `unknown`; compute `resultingState` as `Escalated` when `defect_in === 'spec'` or the cap is reached; put `defect_in` on the event and the routing sentence in `message`. Do not touch the `--lane` branch ([[STORY-066-05]] edits it; this story is sequenced after it so the two do not collide).

`state-events.mjs`: extend the `qa-bounce` fold (line 234) so `event.to === 'Escalated'` sets the state; update the `EVENT_SCHEMA` comment (line 41-50). `defect_in` needs no fold effect.

`sprint_metrics.mjs`: `runSprintMetrics` already parses `events.jsonl` (line 484); count `kind === 'qa-bounce'` events per `story_id` by `defect_in` and pass the result to `buildMetrics` (line 390), which adds `rework.by_defect_in` to each item (type at line 20) and to `totals`. Read each story's `lane` from `state.json` (already loaded at line 472) and build `by_lane` from `item.dispatches.total`. Extend `formatTable` (line 531).

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `update_state.mjs <ID> --qa-bounce [--defect-in code\|red-test\|spec]` | CLI | none | argv | `qa-bounce` event with `defect_in`; exit 2 on a bad value |
| `sprint_metrics.mjs` document | file | none | `events.jsonl`, `state.json` | `items[ID].rework.by_defect_in`, `items[ID].lane`, `by_lane`, `totals.rework_by_defect_in` |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

> Name the parent epic's Testing Strategy level(s) this story covers, and the journey step(s) it implements, in the Notes column.

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 3 | Epic levels Unit and Contract: defect-in validation, fold of `to: Escalated`, `by_lane` and `by_defect_in` builders. Journey "Wrong red test" (rework event with `defect_in: red-test`). |
| Integration tests | 2 | Epic level Integration: `update_state.mjs` against a fixture sprint directory (extends `test_update_state.integration.node.test.ts`); `sprint_metrics.mjs` over a fixture. |
| E2E / acceptance tests | 5 | One per Gherkin scenario in §2.1 (the tests above are these). |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] A pre-release `events.jsonl` replays unchanged.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/update_state.mjs:386-398` — the `--qa-bounce` branch; no defect location today. `:174-183` usage text.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/state-events.mjs:41-50` — event schema; `:234-239` the `qa-bounce` fold.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/sprint_metrics.mjs:156-193` — transcript-derived rework (`red_corrections`, `dev_reruns`, `verify_reruns`), kept. `:390-442` `buildMetrics`; `:531-548` `formatTable`.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/constants.mjs:33` — `BOUNCE_CAP`, unchanged.
- **Surface:** `cleargate-cli/test/scripts/sprint-metrics.red.node.test.ts` and `cleargate-cli/test/fixtures/sprint-metrics/builders.ts` — metrics tests and fixtures to extend.
- **Coverage of this requirement:** partial, about 40%. Bounce counting, the events log and the metrics document exist; the location field, the routing message and the lane table are new.

## Prior work

- [[EPIC-066]] — parent; rework-routing and dispatches-by-lane bullets.
- [[CR-120]] — dispatch descriptions and per-stage attribution that `sprint_metrics.mjs` rests on.
- [[STORY-066-05]] — upstream; edits the `--lane` branch of `update_state.mjs` for `runtime`.
- [[STORY-066-09]] — prints `DEFECT_IN:`, the value this story records.
- [[EPIC-054]] — no new state; this story adds none (`Escalated` already exists).
- No prior work found for: recording where a QA defect lives, or a per-lane dispatch table.

## Why not simpler?

- **Smallest existing surface that could carry this:** the existing `--qa-bounce` flag and the `qa-bounce` event, with the location written into the event's free `reason` field.
- **Why isn't extension / parameterization / config sufficient?** A free-text reason cannot be counted reliably by `sprint_metrics.mjs`, and routing needs a closed set of three values the script can validate. A typed `defect_in` field is the smallest form that makes the split reportable; the metrics changes are the epic's success-metric table, which today is counted by hand.

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
