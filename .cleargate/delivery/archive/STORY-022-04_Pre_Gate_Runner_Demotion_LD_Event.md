---
story_id: STORY-022-04
parent_epic_ref: EPIC-022
status: Completed
ambiguity: 🟢 Low
context_source: EPIC-022_Sprint_Lane_Classifier_And_Hotfix_Path.md
actor: pre_gate_runner.sh
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: med
sprint: SPRINT-14
milestone: M4
approved: true
approved_at: 2026-04-27T00:00:00Z
approved_by: sandrinio
created_at: 2026-04-27T00:00:00Z
updated_at: 2026-04-27T00:00:00Z
created_at_version: cleargate@0.5.0
updated_at_version: cleargate@0.5.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-26T20:48:49Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-022-04
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-26T20:48:49Z
  sessions: []
---

# STORY-022-04: pre_gate_runner.sh Demotion Mechanics + LD Event Emission
**Complexity:** L2 — bash hook gains lane-aware post-pass branching + LD event row emission to sprint markdown §4. Cross-OS portable per BUG-010 §4b.

## 1. The Spec (The Contract)

### 1.1 User Story

As `pre_gate_runner.sh`, I want to read the per-story `lane` field from `state.json` and route the post-pass behaviour accordingly, so that fast-lane stories skip the QA spawn signal on scanner pass AND auto-demote to standard on scanner failure with an `LD` event row appended to sprint markdown §4.

### 1.2 Detailed Requirements

After the existing pre-gate scanner phase completes (typecheck + lint + debug-statement + TODO + new-dep detection from EPIC-013), add a post-pass hook that:

1. **Reads `state.json` for the current sprint** (`.cleargate/sprint-runs/$SPRINT_ID/state.json` resolved from `.active` sentinel) and looks up the story's `lane` field.
2. **If lane=fast AND scanner passed:** skip the QA spawn signal. Emit a stdout line `pre-gate: lane=fast → skipping QA spawn for <STORY-ID>`. Update `state.json` story to `state: "QA-Skipped (Fast)"` (or whatever the existing state-vocabulary uses; verify by reading `.cleargate/scripts/constants.mjs` VALID_STATES first).
3. **If lane=fast AND scanner failed:** auto-demote to standard.
   - Call `update_state.mjs --story <ID> --lane-demote "<reason>"` to flip lane and reset bounce counters (this CLI was added by STORY-022-02).
   - Append an `LD` event row to the sprint markdown §4 events list. Format must match the existing `UR` and `CR` row format. Search the existing sprint markdown for an `## §4` or `## 4. Events` section header; if absent, append `## 4. Events` then the row.
   - Spawn QA per the standard contract on the next iteration (pre_gate_runner exits with the standard scanner-fail signal so the orchestrator routes to QA).
4. **If lane=standard:** behaviour is unchanged from current code. Pass→QA spawn; fail→fail.

### 1.3 Out of Scope

- Architect rubric / agent.md (STORY-022-01 shipped at `112a799`).
- state.json schema bump + migration (STORY-022-02 shipped at `cf8198e`).
- Templates carrying lane fields (STORY-022-03 shipped at `86bf9af`).
- Developer agent reading lane (STORY-022-05 owns).
- Hotfix lane (STORY-022-06 owns).
- Reporter contract (STORY-022-07 owns).
- Post-merge sprint-branch test (deferred to a follow-up if pre_gate_runner.sh doesn't already cover it).

## 2. The Truth (Executable Tests)

### 2.1 Gherkin Acceptance Criteria

```gherkin
Feature: pre_gate_runner.sh lane-aware post-pass routing

  Scenario: lane=fast + scanner pass → skip QA spawn signal
    Given a story with lane=fast in state.json
    And the pre-gate scanner runs and passes
    When pre_gate_runner.sh completes
    Then stdout contains "pre-gate: lane=fast → skipping QA spawn for <STORY-ID>"
    And state.json story state advances directly to QA-Skipped (Fast) (or framework-equivalent state)
    And no QA spawn signal is emitted

  Scenario: lane=fast + scanner fail → auto-demote with LD event
    Given a story with lane=fast in state.json
    And the pre-gate scanner runs and fails (e.g. typecheck error)
    When pre_gate_runner.sh completes
    Then state.json story has lane=standard, lane_assigned_by=human-override (set by update_state.mjs --lane-demote)
    And state.json story has lane_demoted_at populated with an ISO timestamp
    And state.json story has lane_demotion_reason populated with the scanner-failure reason
    And state.json story has qa_bounces=0 and arch_bounces=0 (reset)
    And the sprint markdown §4 events list contains an LD event row naming the story and reason
    And the script exits with the standard scanner-fail signal (so orchestrator routes to QA on next iteration)

  Scenario: lane=standard → existing behaviour preserved
    Given a story with lane=standard in state.json
    When pre_gate_runner.sh runs the scanner
    Then the post-pass hook does NOT modify state.json beyond the existing scanner-result write
    And no LD event row is emitted
    And QA spawn signal is emitted on pass (existing behaviour)

  Scenario: state.json lacks lane field (legacy) → treat as standard
    Given a v2 state.json story object without an explicit lane field (migrated default missing edge case)
    When pre_gate_runner.sh resolves lane
    Then lane is treated as "standard" (no demotion attempted)
    And the script exits as if lane=standard

  Scenario: Cross-OS portability (informational — verified by code review per BUG-010 §4b)
    Given pre_gate_runner.sh runs on macOS bash 3.2 OR Linux bash 5.x
    When the lane-aware logic executes
    Then no GNU-only flags or BSD-only flags are used
    And quoted variable expansions guard against IFS surprises
```

### 2.2 Manual Verification

- Seed a fixture state.json with one lane=fast story; run pre_gate_runner.sh against a passing scenario; confirm stdout + state transition.
- Same fixture but with a deliberately failing typecheck; confirm demotion + LD row + standard exit.

## 3. Implementation Guide

### 3.1 Files To Modify

- `.cleargate/scripts/pre_gate_runner.sh` (verify path; this is the v2 sprint scanner per EPIC-013).
- `.cleargate/scripts/pre_gate_common.sh` if helper functions are needed (additive only).
- New bash test cases in `cleargate-cli/test/scripts/test_pre_gate_lane_aware.sh` (or extend the existing pre-gate test surface — verify by `find cleargate-cli/test -name "*pre_gate*"` first).
- New fixture state.json files under `cleargate-cli/test/scripts/fixtures/` for lane=fast (pass + fail variants) and lane=standard.
- (optional) `cleargate-planning/.cleargate/scripts/pre_gate_runner.sh` if scaffold mirror exists; verify by listing.

### 3.2 Technical Logic

```sh
# After existing scanner finishes:
SCANNER_EXIT=$?

# Read lane from state.json
LANE=$(jq -r --arg sid "$STORY_ID" '.stories[$sid].lane // "standard"' "$STATE_JSON")

if [ "$LANE" = "fast" ]; then
  if [ "$SCANNER_EXIT" -eq 0 ]; then
    # Pass: skip QA
    printf 'pre-gate: lane=fast → skipping QA spawn for %s\n' "$STORY_ID"
    node "$REPO_ROOT/.cleargate/scripts/update_state.mjs" --story "$STORY_ID" --state "QA-Skipped (Fast)" || true
    exit 0
  else
    # Fail: demote + LD event
    REASON="pre-gate scanner failed: <captured-reason>"
    node "$REPO_ROOT/.cleargate/scripts/update_state.mjs" --story "$STORY_ID" --lane-demote "$REASON"
    append_ld_event "$SPRINT_FILE" "$STORY_ID" "$REASON"
    exit "$SCANNER_EXIT"
  fi
fi
# lane=standard: existing behaviour
exit "$SCANNER_EXIT"
```

`append_ld_event` is a small helper that locates §4 of the sprint markdown and appends a row matching the existing UR/CR format.

### 3.3 API / CLI Contract

- No new CLI surface. The script reads state.json and shells out to update_state.mjs (existing flag from STORY-022-02).
- LD event row format (must match existing UR/CR rows in sprint markdown §4):
  ```
  | LD | <STORY-ID> | <ISO-timestamp> | <reason ≤80 chars> |
  ```

### 3.4 Cross-OS Portability (Mandatory per BUG-010 §4b)

- bash 3.2+ compatible.
- POSIX EREs in `grep -E`; no `\d`, no `\<\>`.
- `printf '%s\n'` not `echo -e`.
- All variable expansions quoted (`"${var}"`).
- jq 1.5+ portable syntax.
- `date -u +%FT%TZ` for ISO timestamps (portable across BSD + GNU).

## 4. Quality Gates

### 4.1 Test Expectations

- Five Gherkin scenarios from §2.1 covered by tests in the bash harness.
- Cross-OS code review (per §3.4 portability rules).
- No new `.skip`. Existing skips at boundaries acceptable.

### 4.2 Definition of Done

- [ ] Lane-aware post-pass logic added to pre_gate_runner.sh.
- [ ] LD event row appended to sprint markdown §4 on fast-lane scanner failure.
- [ ] Demotion calls update_state.mjs --lane-demote with a clear reason.
- [ ] All five Gherkin scenarios have passing tests.
- [ ] Cross-OS portability rules followed.
- [ ] `npm run typecheck` clean.
- [ ] `npm test` green.
- [ ] Bash harness passes on macOS dev box.
- [ ] Commit message: `feat(STORY-022-04): SPRINT-14 M4 — pre_gate_runner.sh lane-aware demotion + LD event emission`.
- [ ] One commit. NEVER `--no-verify`.
