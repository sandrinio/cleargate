---
story_id: STORY-015-02
parent_epic_ref: EPIC-015
parent_cleargate_id: "EPIC-015"
sprint_cleargate_id: "SPRINT-10"
status: Completed
ambiguity: 🟢 Low
context_source: EPIC-015_Wiki_Index_Hygiene_And_Scale.md
actor: Orchestrator agent (maintenance pass) / Human operator
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: low
created_at: 2026-04-24T00:00:00Z
updated_at: 2026-04-24T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-24T08:12:36Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-015-02
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-24T08:12:36Z
  sessions: []
---

# STORY-015-02: Status Audit CLI + One-Time Fix
**Complexity:** L2 — new CLI command with scan + dry-run/apply modes, plus a data-only commit that runs it.

## 1. The Spec (The Contract)

### 1.1 User Story
As an orchestrator agent, I want a `cleargate wiki audit-status` command that detects items whose frontmatter status contradicts their raw-file location (archive/ ↔ pending-sync/), so that index drift is observable and fixable without hand-editing frontmatter across dozens of files.

### 1.2 Detailed Requirements
- New command `cleargate wiki audit-status` registered in `cleargate-cli/src/commands/`.
- For each raw item under `.cleargate/delivery/{pending-sync,archive}/`:
  - **Rule A (archive + non-terminal status):** file is in `archive/` but status ∈ {Draft, Ready, Approved, Planned, In-Progress} → report "archived but not marked Completed/Abandoned".
  - **Rule B (pending-sync + terminal status):** file is in `pending-sync/` but status ∈ {Completed, Done, Abandoned} → report "marked terminal but still in pending-sync — move to archive/".
  - **Rule C (sprint with all-done stories):** sprint file status ∉ {Completed, Done} but all stories in its `epics:` list have terminal status → report "sprint likely Completed".
- Default mode = read-only. Exits `0` if clean, `1` if any drift found. Writes human-readable report to stdout.
- `--fix` flag: applies the obvious correction. Rule A → set status to `Completed` if all child stories are terminal, else `Abandoned`. Rule B → leave status alone but emit the shell command to move the file (explicit: never move files silently). Rule C → set sprint status to `Completed`.
- `--fix` prints the diff before writing and requires `--yes` (or an interactive confirmation prompt in TTY) unless `--quiet` is set.
- After running `--fix --yes`, a second audit run must exit `0`.
- Land a **data-only commit** in the same story that runs `audit-status --fix --yes` against the current repo. Commit message: `fix(EPIC-015): STORY-015-02 reconcile status drift (SPRINT-10, EPIC-001, EPIC-008, EPIC-009)`. No code in that commit.

### 1.3 Out of Scope
- Adding `Abandoned` to the protocol vocabulary (that's STORY-015-04; this story uses the literal but the protocol update is separate).
- Physically moving files from pending-sync/ to archive/ — the command only emits the shell command; human executes.
- Re-running `wiki build` as part of `--fix` (user runs it manually after the data commit).

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Status Audit CLI

  Scenario: Clean repo passes
    Given every raw item's status agrees with its location
    When I run `cleargate wiki audit-status`
    Then the command exits 0
    And stdout contains "audit-status: clean (0 drift)"

  Scenario: Archive + Draft status flagged
    Given EPIC-001 has status="Ready" and lives in archive/
    When I run `cleargate wiki audit-status`
    Then the command exits 1
    And stdout lists "EPIC-001: Rule A — archived with non-terminal status 'Ready'"

  Scenario: Sprint with all-done stories flagged
    Given SPRINT-10 has status="Planned" and all 10 child stories are status=Done
    When I run `cleargate wiki audit-status`
    Then stdout lists "SPRINT-10: Rule C — 10/10 child stories terminal; suggest Completed"

  Scenario: --fix applies corrections
    Given the repo has 6 drift items (Rule A + Rule C)
    When I run `cleargate wiki audit-status --fix --yes`
    Then the corresponding `status:` values in frontmatter are updated in-place
    And the file bodies are unchanged except for the status line
    And a subsequent `cleargate wiki audit-status` exits 0

  Scenario: Pending-sync + terminal status emits move command
    Given PROPOSAL-011 has status="Approved" and lives in pending-sync/
    When I run `cleargate wiki audit-status`
    Then stdout contains "git mv .cleargate/delivery/pending-sync/PROPOSAL-011_Execution_V2_Polish.md .cleargate/delivery/archive/"
    And --fix does NOT move the file (only the human does)
```

### 2.2 Verification Steps (Manual)
- [ ] Run `cleargate wiki audit-status` against current repo; verify it reports SPRINT-10, EPIC-001, EPIC-008, EPIC-009, and their child stories.
- [ ] Run `cleargate wiki audit-status --fix --yes`; verify only frontmatter `status:` lines changed, nothing else.
- [ ] `git diff` on the data commit shows only `-status: "…"` / `+status: "Completed"` pairs.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/commands/wiki-audit-status.ts` |
| Related Files | `cleargate-cli/src/wiki/scan.ts` (reuse `scanRawItems`), `cleargate-cli/src/commands/index.ts` (register), `cleargate-cli/test/commands/wiki-audit-status.test.ts` |
| New Files Needed | Yes — `wiki-audit-status.ts` and its test file |

### 3.2 Technical Logic
- Reuse `scanRawItems(deliveryRoot, cwd)` from `src/wiki/scan.ts` to enumerate raw items with frontmatter parsed.
- Each item already carries `bucket` + `rawPath` + `fm`. Apply Rule A/B/C as pure predicates over these fields.
- For `--fix`: read the file, replace the `status:` line via regex targeting the YAML frontmatter block only (first `---`-delimited section), write back. Preserve line endings and exact formatting elsewhere.
- Terminal statuses (closed set): `Completed`, `Done`, `Abandoned`, `Closed`, `Resolved`.
- Non-terminal: everything else (`Draft`, `Ready`, `Approved`, `Planned`, `In-Progress`, empty).

### 3.3 API Contract
CLI only. `cleargate wiki audit-status [--fix] [--yes] [--quiet]`.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 5 | One per Gherkin scenario; use fixture delivery/ tree under `test/fixtures/wiki-audit-status/` |
| E2E / acceptance tests | 1 | Run `--fix --yes` end-to-end on a temp dir and verify second run exits 0 |

### 4.2 Definition of Done
- [ ] Minimum test expectations met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Data commit lands and `wiki audit-status` exits 0 on main.
- [ ] Typecheck + tests pass; two commits: `feat(EPIC-015): STORY-015-02 wiki audit-status command` then `fix(EPIC-015): STORY-015-02 reconcile status drift`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green:
- [ ] Terminal-status set confirmed (are `Completed` and `Done` aliases? Current draft treats both as terminal).
- [ ] Confirm that emitting a `git mv` hint (Rule B) without executing it is the right UX vs. a `--move-files` flag.
