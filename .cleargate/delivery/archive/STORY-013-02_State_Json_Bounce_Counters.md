---
story_id: STORY-013-02_State_Json_Bounce_Counters
parent_epic_ref: EPIC-013
status: Done
ambiguity: 🟢 Low
context_source: EPIC-013_Execution_Phase_v2.md §4.2 row 'state.json + bounce counters' + V-Bounce Engine `scripts/{init_sprint,update_state,validate_state,validate_bounce_readiness,constants}.mjs`
actor: Orchestrator (conversational Claude)
complexity_label: L3
approved: true
approved_at: 2026-04-21T00:00:00Z
completed_at: "2026-04-21T08:30:00Z"
approved_by: sandro
milestone: M1
created_at: 2026-04-21T00:00:00Z
updated_at: 2026-04-21T00:00:00Z
created_at_version: post-SPRINT-08
updated_at_version: post-SPRINT-08
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-20T22:27:02Z
stamp_error: no ledger rows for work_item_id STORY-013-02_State_Json_Bounce_Counters
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-20T22:26:46Z
  sessions: []
pushed_by: sandro.suladze@gmail.com
pushed_at: 2026-04-20T22:27:11.616Z
push_version: 1
---

# STORY-013-02: state.json Schema + Bounce Counters + Lifecycle Scripts
**Complexity:** L3 — five new scripts + schema lock + constants module.

## 1. The Spec (The Contract)

### 1.1 User Story
As the Orchestrator, I want a machine-readable `.cleargate/sprint-runs/<sprint-id>/state.json` that tracks each story's state (`Ready to Bounce` → `Bouncing` → `QA Passed` → `Architect Passed` → `Sprint Review` → `Done` / `Escalated` / `Parking Lot`) and separate `qa_bounces` / `arch_bounces` counters, so that agent transitions are atomic, auditable, and either counter hitting 3 triggers escalation without ambiguity.

### 1.2 Detailed Requirements
- Ship **one schema**: `{schema_version: 1, sprint_id, execution_mode, stories: {[id]: {state, qa_bounces, arch_bounces, updated_at, notes}}, sprint_status, last_action, updated_at}`. Schema version field is mandatory — any future field change bumps it.
- Ship **five Node scripts** under `.cleargate/scripts/` (Node 24, ESM `.mjs`, built-ins only — no runtime deps):
  - `constants.mjs` — exports `TERMINAL_STATES = ['Done', 'Escalated', 'Parking Lot']` and the canonical state-machine transitions table.
  - `init_sprint.mjs <sprint-id> --stories STORY-ID1,STORY-ID2,...` — creates `state.json`; refuses if one exists unless `--force`.
  - `update_state.mjs <STORY-ID> <state> | --qa-bounce | --arch-bounce` — atomic state/counter update with bounce-counter cap enforcement (hitting 3 flips state to Escalated automatically and refuses further bounce increments).
  - `validate_state.mjs` — reads `state.json`, confirms schema version, reports any counter >3 or transition from terminal state.
  - `validate_bounce_readiness.mjs <STORY-ID>` — pre-bounce gate: story exists in state.json, state == "Ready to Bounce", git working tree is clean (`git status --porcelain` empty).
- Scripts exit non-zero on any validation failure with a structured message (stderr gets the detail; stdout stays quiet). All writes are write-then-rename for atomicity.
- Each script must be idempotent: running `update_state.mjs STORY-X "Bouncing"` twice in a row is a no-op after the first, not an error.
- Three-surface landing: scripts land in `.cleargate/scripts/` + `cleargate-planning/.cleargate/scripts/`. (CLI wrappers for these scripts are STORY-013-08.)

### 1.3 Out of Scope
- CLI wrappers (`cleargate state update`, `cleargate sprint init`) — STORY-013-08.
- `run_script.sh` wrapper + self-repair — STORY-013-03 (but this story's scripts MUST be compatible with that wrapper: clean exit codes, stderr/stdout separation).
- Sprint close + report archival — STORY-013-07.
- Bounce-counter visibility in the Sprint Plan §1 table — touched by STORY-013-09.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: state.json lifecycle

  Scenario: init_sprint creates fresh state.json
    Given no state.json exists for S-FAKE
    When I run "node init_sprint.mjs S-FAKE --stories STORY-FAKE-01,STORY-FAKE-02"
    Then .cleargate/sprint-runs/S-FAKE/state.json is created
    And schema_version is 1
    And both stories have state "Ready to Bounce" with qa_bounces=0 and arch_bounces=0
    And exit code is 0

  Scenario: init_sprint refuses to overwrite
    Given state.json already exists for S-FAKE
    When I run "node init_sprint.mjs S-FAKE --stories STORY-FAKE-03"
    Then exit code is non-zero
    And stderr names the existing file and suggests --force

  Scenario: update_state transitions a story
    Given STORY-FAKE-01 is "Ready to Bounce"
    When I run "node update_state.mjs STORY-FAKE-01 Bouncing"
    Then state.json shows STORY-FAKE-01 state="Bouncing"
    And updated_at is refreshed
    And running the same command a second time is a no-op (exit 0, file unchanged)

  Scenario: qa-bounce counter caps at 3 and auto-escalates
    Given STORY-FAKE-01 has qa_bounces=2
    When I run "node update_state.mjs STORY-FAKE-01 --qa-bounce"
    Then qa_bounces becomes 3
    And state becomes "Escalated"
    And a further --qa-bounce on the same story exits non-zero with message "already Escalated"

  Scenario: validate_bounce_readiness blocks a dirty tree
    Given STORY-FAKE-02 is "Ready to Bounce"
    And the git working tree has uncommitted changes
    When I run "node validate_bounce_readiness.mjs STORY-FAKE-02"
    Then exit code is non-zero
    And stderr lists the dirty files

  Scenario: validate_state catches a corrupted counter
    Given state.json has STORY-FAKE-01 with qa_bounces=5 (corrupt)
    When I run "node validate_state.mjs"
    Then exit code is non-zero
    And stderr names the invariant violation and the offending story
```

### 2.2 Verification Steps (Manual)
- [ ] Seed a fake sprint directory and walk through all 6 scenarios above.
- [ ] Inspect `state.json` by eye — field ordering is deterministic (alphabetical within objects), trailing newline, 2-space indent.
- [ ] Confirm `cleargate-planning/.cleargate/scripts/` mirrors all five scripts + constants.mjs.

## 3. The Implementation Guide

**Files to touch:**

- `.cleargate/scripts/constants.mjs` (new) — exports `TERMINAL_STATES` + state transition graph
- `.cleargate/scripts/init_sprint.mjs` (new) — creates state.json
- `.cleargate/scripts/update_state.mjs` (new) — atomic transitions + bounce counter caps
- `.cleargate/scripts/validate_state.mjs` (new) — schema + invariant checks
- `.cleargate/scripts/validate_bounce_readiness.mjs` (new) — pre-bounce gate
- `.cleargate/scripts/state.schema.json` (new) — JSON Schema v7 reference
- `cleargate-planning/.cleargate/scripts/*` — scaffold mirror (all six files above)

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `.cleargate/scripts/init_sprint.mjs` (new) |
| Primary File | `.cleargate/scripts/update_state.mjs` (new) |
| Primary File | `.cleargate/scripts/validate_state.mjs` (new) |
| Primary File | `.cleargate/scripts/validate_bounce_readiness.mjs` (new) |
| Primary File | `.cleargate/scripts/constants.mjs` (new — exports `TERMINAL_STATES`, state transition graph) |
| Schema fixture | `.cleargate/scripts/state.schema.json` (new — JSON Schema v7 for validate_state reference) |
| Scaffold mirrors | `cleargate-planning/.cleargate/scripts/*` (same five files + schema) |
| New Files Needed | Yes — all six above |

### 3.2 Technical Logic
Port V-Bounce's scripts verbatim, strip the `vbounce` namespace, rename `.vbounce/state.json` → `.cleargate/sprint-runs/<id>/state.json`. Keep the same schema field names (`state`, `qa_bounces`, `arch_bounces`, `updated_at`, `sprint_id`, `sprint_status`) for cross-tool familiarity; add our `execution_mode` + `schema_version` fields. Use `fs.promises` + `path` only — no external deps. Atomic writes via `fs.writeFile(tmp)` then `fs.rename(tmp, final)`.

### 3.3 API Contract (if applicable)
N/A — scripts are invoked by orchestrator + future CLI wrappers; no HTTP surface.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit-ish (`node --test`) per script | 1 per script × 5 | Happy + one edge case each |
| Integration (all five scripts end-to-end on a fake sprint) | 1 | Seeds fake state, walks init→bounce→escalate→validate |
| Gherkin coverage | 6 | Every §2.1 scenario green |

### 4.2 Definition of Done
- [ ] All six §2.1 scenarios pass.
- [ ] `node --test .cleargate/scripts/` green.
- [ ] Three-surface landing: `.cleargate/scripts/` + `cleargate-planning/.cleargate/scripts/`.
- [ ] Architect M1 plan consulted.
- [ ] `npm run typecheck` in `cleargate-cli` still green.
- [ ] Schema documented in the script source (JSDoc block at top of `constants.mjs`).
- [ ] Commit: `feat(EPIC-013): STORY-013-02 state.json + bounce counters + lifecycle scripts`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity (Ready for Execution)**

- [x] Gherkin covers all §1.2 requirements.
- [x] File paths verified.
- [x] 0 unresolved placeholders.
- [x] Schema version pinned at 1 — future changes bump it, no silent edits.
