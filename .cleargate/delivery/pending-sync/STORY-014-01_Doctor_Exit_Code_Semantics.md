---
story_id: STORY-014-01
parent_epic_ref: SPRINT-14
status: Approved
ambiguity: 🟢 Low
context_source: SPRINT-14_Process_v2.md §1 (M2 small-wins) + Architect M1 §7 forward-flag
actor: Hook author / orchestrator agent
complexity_label: L1
parallel_eligible: y
expected_bounce_exposure: low
sprint: SPRINT-14
milestone: M2
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
  last_gate_check: 2026-04-26T11:34:24Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-014-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-26T11:34:24Z
  sessions: []
---

# STORY-014-01: `cleargate doctor` Exit-Code Semantics
**Complexity:** L1 — single file (`cleargate-cli/src/commands/doctor.ts`), known pattern, predictable hierarchy.

## 1. The Spec (The Contract)

### 1.1 User Story

As a hook author / orchestrator agent, I want `cleargate doctor` to exit with a *predictable, documented* status code so that downstream hooks (CR-008's SessionStart routing, CR-009's preflight, future CI checks) can branch behaviour on a single integer rather than parsing stdout for state.

### 1.2 Detailed Requirements

The doctor command's exit code semantics today are inconsistent across modes (`--session-start`, `--can-edit`, default mode). After CR-008 routed doctor stdout to where Claude reads it, the exit code became part of the contract: hooks decide whether to surface the doctor banner based on stdout *and* exit code.

Pin the exit-code hierarchy to exactly three values:

- **`0` — clean.** No blockers. Sprint state is healthy: no stale gates, hook resolver works, manifest checksums match, no migration drift, no stamp errors that prevent push. Doctor stdout MAY include informational lines (e.g. `ClearGate state: pre-member`) but no warnings or errors.
- **`1` — blocked items / advisory issues.** At least one blocked work-item OR one advisory issue (gate failures, stamp errors, drifted SHAs, missing ledger rows). Doctor stdout MUST list each blocker with item-id + criterion. Hooks treat exit=1 as "show the user what's wrong" but do NOT halt their own execution.
- **`2` — config / install error.** ClearGate is misconfigured or partially installed: missing `.cleargate/` directory, missing `cleargate-planning/MANIFEST.json`, missing `~/.cleargate/auth.json` for a sync-required operation, hook resolver completely fails. Doctor stdout MUST emit a remediation hint (`Run: cleargate init` or `Run: cleargate join <url>` or similar). Hooks treat exit=2 as "this isn't a content issue, it's a setup issue" — typically halt with a loud error.

Document this hierarchy in `cleargate doctor --help` output and in `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` (one-line addition under §6 MCP Tools Reference, or a fresh §23 if no fit).

### 1.3 Out of Scope

- Adding new doctor checks. The fix is exit-code semantics over existing checks.
- Refactoring the doctor command's check architecture.
- Changing the SessionStart hook contract (CR-008 already wired stdout routing; this story does not touch the hook).
- Backward-compat for callers that depended on the old exit codes — there are no such callers in-repo (verified by grep on 2026-04-26 sprint kickoff).

## 2. The Truth (Executable Tests)

### 2.1 Gherkin Acceptance Criteria

```gherkin
Feature: cleargate doctor exit-code semantics

  Scenario: Clean repo exits 0
    Given a fully-installed ClearGate repo with no blocked items, no drift, no stamp errors
    When `cleargate doctor` runs
    Then the exit code is exactly 0
    And stdout contains no "blocked" or "error" markers

  Scenario: Blocked items exit 1
    Given a repo with at least one pending-sync item failing a gate criterion
    When `cleargate doctor` runs
    Then the exit code is exactly 1
    And stdout lists each blocked item with item-id and criterion

  Scenario: Missing .cleargate directory exits 2
    Given a directory with no .cleargate/
    When `cleargate doctor` runs
    Then the exit code is exactly 2
    And stdout contains a remediation hint pointing at `cleargate init`

  Scenario: Missing manifest exits 2
    Given a repo where cleargate-planning/MANIFEST.json is absent
    When `cleargate doctor` runs
    Then the exit code is exactly 2
    And stdout names the missing file

  Scenario: Hook resolver complete failure exits 2
    Given a repo where neither dist nor PATH nor npx can resolve the CLI
    When `cleargate doctor` runs (invoked via the resolver chain or directly)
    Then the exit code is exactly 2
    And stdout names the resolution failure surface

  Scenario: --session-start mode preserves exit-code hierarchy
    Given a repo with at least one blocked item
    When `cleargate doctor --session-start` runs
    Then the exit code is exactly 1
    And stdout includes the resolver-status line (CR-009 contract) and the planning-first reminder when applicable (CR-008 contract)
```

### 2.2 Manual Verification

- `cleargate doctor; echo $?` in a clean repo → prints state, exits 0.
- Mark a draft as failing a gate; rerun → exits 1, lists the item.
- Move `cleargate-planning/MANIFEST.json` aside; rerun → exits 2 with hint.

## 3. Implementation Guide

### 3.1 Files To Modify

- `cleargate-cli/src/commands/doctor.ts` — primary surface. Audit every existing return / process.exit call. Map each to one of {0, 1, 2}. Do NOT introduce intermediate codes.
- `cleargate-cli/test/commands/doctor.test.ts` (or wherever doctor tests currently live — verify path before writing).
- `cleargate-cli/test/commands/doctor-session-start.test.ts` — already covers the SessionStart path post-CR-008/009; add at most one new test asserting exit=1 propagates through `--session-start` mode (Scenario 6 above).
- `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` — append a one-line exit-code-hierarchy reference. Keep the addition ≤6 lines.

### 3.2 Technical Logic

Exit-code computation lives at the doctor command's top level. Pseudocode:

```
checks = run_all_doctor_checks()  // existing
config_errors = checks.filter(c => c.kind === 'config-error')
blockers      = checks.filter(c => c.kind === 'blocker')

if config_errors.length > 0: exit(2)
else if blockers.length > 0: exit(1)
else: exit(0)
```

Where `kind` is a new tag on each check's result. Each existing check is annotated as either `'config-error'` (missing files / install state) or `'blocker'` (state that exists but is wrong) or `'info'` (purely informational, e.g. resolver status line — never affects exit code).

### 3.3 API / CLI Contract

`cleargate doctor [--session-start | --can-edit <file>]` — flags unchanged. Exit codes unified per §1.2. Documented in `--help` output:

```
Exit codes:
  0  Clean — no blockers, no config errors.
  1  Blocked items or advisory issues — see stdout.
  2  ClearGate misconfigured or partially installed — see stdout for remediation.
```

## 4. Quality Gates

### 4.1 Test Expectations

- 6 new unit/integration tests covering the Gherkin scenarios above.
- Snapshot the help-text addition (so future help-text edits don't accidentally drop the exit-code documentation).
- No new `.skip`. Existing skips at boundaries acceptable.

### 4.2 Definition of Done

- [ ] Each existing doctor check is tagged `kind: 'config-error' | 'blocker' | 'info'`.
- [ ] Top-level exit-code computation matches the §3.2 pseudocode.
- [ ] All 6 Gherkin scenarios have passing tests.
- [ ] `cleargate doctor --help` documents the three exit codes.
- [ ] Protocol §6 (or §23) carries a one-line cross-reference.
- [ ] `npm run typecheck` clean for cleargate-cli.
- [ ] `npm test` green for cleargate-cli.
- [ ] Commit message: `feat(STORY-014-01): SPRINT-14 M2 — doctor exit-code semantics (0 clean / 1 blocked / 2 config-error)`.
- [ ] One commit. NEVER `--no-verify`.
