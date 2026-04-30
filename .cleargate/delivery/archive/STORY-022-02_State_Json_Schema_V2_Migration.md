---
story_id: STORY-022-02
parent_epic_ref: EPIC-022
status: Completed
ambiguity: 🟢 Low
context_source: EPIC-022_Sprint_Lane_Classifier_And_Hotfix_Path.md
actor: update_state.mjs / init_sprint.mjs
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: med
sprint: SPRINT-14
milestone: M3
approved: true
approved_at: 2026-04-26T00:00:00Z
approved_by: sandrinio
created_at: 2026-04-26T00:00:00Z
updated_at: 2026-04-26T00:00:00Z
created_at_version: cleargate@0.5.0
updated_at_version: cleargate@0.5.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-26T17:22:18Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-022-02
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-26T17:22:18Z
  sessions: []
---

# STORY-022-02: state.json Schema v1→v2 Bump + Migration in `update_state.mjs`
**Complexity:** L2 — additive schema delta + idempotent migration on first read + tests against fixtures.

## 1. The Spec (The Contract)

### 1.1 User Story

As `update_state.mjs`, I want to read v1 state.json files transparently and write them as v2 (with lane fields defaulted to `standard, lane_assigned_by: migration-default`), so that pre-EPIC-022 sprints stay readable AND post-EPIC-022 sprints carry the lane signal end-to-end.

### 1.2 Detailed Requirements

Three changes:

1. **Bump `SCHEMA_VERSION` constant** in `.cleargate/scripts/constants.mjs` from `1` to `2`. Mirror in scaffold at `cleargate-planning/.cleargate/scripts/constants.mjs` (verify path; if scaffold mirror does not exist, only update the live file and document).
2. **Add per-story optional fields** to the state.json story shape:
   - `lane: "standard" | "fast"` — default `"standard"` for any story without an explicit value.
   - `lane_assigned_by: "architect" | "human-override" | "migration-default"`.
   - `lane_demoted_at: ISO string | null` — null until a demotion fires.
   - `lane_demotion_reason: string | null`.
3. **Migrate v1 → v2 on first read.** In `update_state.mjs`, when reading a state.json with `schema_version: 1`, inject defaults (`lane: "standard", lane_assigned_by: "migration-default"`, both demotion fields `null`) for every story. Bump `schema_version` to `2`. Write atomically. Emit a one-line log to stderr: `migration: schema_version 1 → 2 for sprint <SPRINT-ID> (N stories defaulted to lane: standard)`.

CLI-flag additions to `update_state.mjs`:
- `--lane <standard|fast>` — paired with `--story <ID>`, sets the lane field for one story. Reject `fast` if the story's parent sprint plan has the story marked `expected_bounce_exposure: med|high` (rubric §6 contradiction per PROPOSAL-013 §2.3 #6 — but cross-reading the sprint file is M3-N for now; this story can stub the check as TODO if cross-file lookup is unwieldy and the orchestrator agrees).
- `--lane-demote <reason>` — paired with `--story <ID>`, flips lane to `standard`, populates `lane_demoted_at` (now) and `lane_demotion_reason` (the argument value). Reset `qa_bounces` and `arch_bounces` to 0 (per PROPOSAL-013 §2.4 demotion mechanics).

### 1.3 Out of Scope

- Architect rubric in agent.md (STORY-022-01 owns).
- Templates (STORY-022-03 owns).
- pre_gate_runner.sh demotion event emission (STORY-022-04 owns).
- Developer agent reading lane (STORY-022-05 owns).
- Hotfix lane (STORY-022-06 owns).
- Reporter contract (STORY-022-07 owns).
- Self-disabling rubric (deferred per EPIC-022 §2 OUT-OF-SCOPE).

## 2. The Truth (Executable Tests)

### 2.1 Gherkin Acceptance Criteria

```gherkin
Feature: state.json schema v1 → v2 migration

  Scenario: Fresh init writes schema_version 2
    Given a new sprint with story IDs S1, S2
    When `init_sprint.mjs SPRINT-NN --stories S1,S2` runs
    Then the resulting state.json has `schema_version: 2`
    And every story has `lane: "standard"` and `lane_assigned_by: "migration-default"` (or "architect" if init was given a Sprint Plan §1 Lane column — defer; default is migration-default)
    And `lane_demoted_at` and `lane_demotion_reason` are both `null`

  Scenario: v1 state.json migrates additively on first read under new code
    Given an existing state.json fixture with `schema_version: 1` and 3 stories
    When `update_state.mjs` is invoked under the new code (any flag — read-only counts)
    Then on-disk state.json is updated to `schema_version: 2`
    And every story has `lane: "standard"` and `lane_assigned_by: "migration-default"`
    And no other field on any story is mutated (qa_bounces, arch_bounces, state, updated_at, notes, worktree byte-preserved)
    And a stderr log line is emitted: `migration: schema_version 1 → 2 for sprint SPRINT-NN (3 stories defaulted to lane: standard)`

  Scenario: --lane sets the field on a single story
    Given a v2 state.json with story S1 at `lane: "standard"`
    When `update_state.mjs --story S1 --lane fast` runs
    Then S1's `lane` becomes `"fast"`
    And `lane_assigned_by` becomes `"human-override"`
    And no other story is mutated

  Scenario: --lane-demote flips lane to standard with reason
    Given a v2 state.json with story S1 at `lane: "fast"` and `qa_bounces: 0`, `arch_bounces: 0`
    When `update_state.mjs --story S1 --lane-demote "pre-gate scanner failed"` runs
    Then S1's `lane` becomes `"standard"`
    And `lane_demoted_at` is populated with an ISO timestamp
    And `lane_demotion_reason` is `"pre-gate scanner failed"`
    And `qa_bounces` and `arch_bounces` are both reset to 0

  Scenario: Idempotency — re-reading a v2 state.json does not double-migrate
    Given a state.json at `schema_version: 2`
    When `update_state.mjs` runs
    Then no migration log line is emitted
    And on-disk state.json is byte-equal to the input (modulo any flag-driven mutations)
```

### 2.2 Manual Verification

- Run init on a fresh fixture sprint dir: confirm v2 shape.
- Take a SPRINT-12-shaped v1 state.json fixture; copy to a temp; run update_state.mjs; diff before/after to confirm only schema_version + new lane fields were added.
- Confirm SPRINT-14's hand-recovered state.json still loads (it currently has `schema_version: 1` per recovery; this story's migration should bump it to 2 + add lane fields on next touch).

## 3. Implementation Guide

### 3.1 Files To Modify

- `.cleargate/scripts/constants.mjs` — `SCHEMA_VERSION` constant.
- `.cleargate/scripts/update_state.mjs` — read/migrate/write logic + CLI flags.
- `.cleargate/scripts/init_sprint.mjs` — emit `schema_version: 2` + per-story lane defaults at init time.
- `.cleargate/scripts/close_sprint.mjs` — read-side; tolerate v2 if it doesn't already (verify with grep first; if close_sprint already uses constants.mjs, no change needed).
- Test surface: `cleargate-cli/test/scripts/test_init_sprint.sh` or equivalent (bash table-driven), plus a vitest file under `cleargate-cli/test/scripts/` if that's the existing pattern. Verify by reading the surrounding test file pattern.
- Fixtures: a v1-shaped state.json fixture at `cleargate-cli/test/scripts/fixtures/state-v1.json` for the migration test.

### 3.2 Technical Logic

Migration is read-on-load:

```
function readState(path):
  json = readFile(path)
  if json.schema_version === 1:
    json = migrateV1ToV2(json)
    log("migration: schema_version 1 → 2 ...")
  return json

function migrateV1ToV2(json):
  json.schema_version = 2
  for storyId in json.stories:
    json.stories[storyId].lane ??= "standard"
    json.stories[storyId].lane_assigned_by ??= "migration-default"
    json.stories[storyId].lane_demoted_at ??= null
    json.stories[storyId].lane_demotion_reason ??= null
  return json
```

Atomic write: existing `init_sprint.mjs` already uses a `.tmp.<pid>` + rename pattern (see line ~180 of init_sprint.mjs); preserve it.

Migration is idempotent: a state.json already at v2 short-circuits.

### 3.3 API / CLI Contract

`update_state.mjs --story <ID> --lane <standard|fast>` — additive flag.
`update_state.mjs --story <ID> --lane-demote <reason>` — additive flag.

Both reject if `--story` is missing or the story doesn't exist in state.json.

## 4. Quality Gates

### 4.1 Test Expectations

- Five Gherkin scenarios above, each with a passing test.
- Idempotency test (running migration twice produces byte-equal output after first run).
- Cross-OS portability per BUG-010's flashcard if any bash test scripts are added: portable shebangs, no GNU-only flags, etc.

### 4.2 Definition of Done

- [ ] `SCHEMA_VERSION = 2` in constants.mjs.
- [ ] All four new fields added per §1.2.
- [ ] Migration emits one stderr log per first-touch.
- [ ] Idempotency: v2 state.json read returns byte-equal output (no spurious mutations).
- [ ] `--lane` and `--lane-demote` flags implemented.
- [ ] Demotion resets bounce counters.
- [ ] Existing SPRINT-10/11/12 fixtures still load (v1 → v2 migration on read).
- [ ] `npm run typecheck` clean.
- [ ] `npm test` green.
- [ ] Commit message: `feat(STORY-022-02): SPRINT-14 M3 — state.json schema v1→v2 + migration + lane CLI flags`.
- [ ] One commit. NEVER `--no-verify`.
