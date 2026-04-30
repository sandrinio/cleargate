---
story_id: STORY-022-07
parent_epic_ref: EPIC-022
parent_cleargate_id: "EPIC-022"
sprint_cleargate_id: "SPRINT-14"
status: Completed
ambiguity: 🟢 Low
context_source: EPIC-022_Sprint_Lane_Classifier_And_Hotfix_Path.md
actor: reporter agent + close_sprint.mjs
complexity_label: L3
parallel_eligible: n
expected_bounce_exposure: high
sprint: SPRINT-14
milestone: M5
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
  last_gate_check: 2026-04-26T23:00:04Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-022-07
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-26T23:00:04Z
  sessions: []
---

# STORY-022-07: Reporter Sprint Report v2.1 + close_sprint.mjs Validation
**Complexity:** L3 — extends reporter.md contract + adds close_sprint.mjs validation phase + activation-gating logic. High bounce risk per sprint plan §2.3 R-03.

## 1. The Spec (The Contract)

### 1.1 User Story

As the Reporter agent (and close_sprint.mjs), I want the new §3 Fast-Track + Hotfix metric rows and §5 Lane Audit + Hotfix Audit + Hotfix Trend tables enforced at sprint close, but ONLY when activation conditions are met (state.json `schema_version >= 2` AND at least one story shipped with `lane: fast`), so that SPRINT-14's own close report does not trip its own gate.

### 1.2 Detailed Requirements

Two synchronised surfaces:

1. **`cleargate-planning/.claude/agents/reporter.md`** — extend the report-writing contract:
   - §3 Execution Metrics: Reporter writes the six new rows from `sprint_report.md` template (post STORY-022-03 at `86bf9af`): Fast-Track Ratio, Fast-Track Demotion Rate, Hotfix Count (sprint window), Hotfix-to-Story Ratio, Hotfix Cap Breaches, LD events. Compute values from state.json (lane fields per story) + sprint markdown §4 events list (LD rows) + `wiki/topics/hotfix-ledger.md` filtered by sprint window.
   - §5 Process > Lane Audit table: one row per fast-lane story (whether shipped fast or auto-demoted). Columns per template: `Story | Files touched | LOC | Demoted? | In retrospect, was fast correct? (y/n) | Notes`. Reporter computes the first four columns from git log + state.json; the retrospect column is left blank for human fill-in at sprint close.
   - §5 Process > Hotfix Audit table: one row per hotfix merged within the sprint window. Read from `wiki/topics/hotfix-ledger.md` filtered by `merged_at` between sprint `started_at` and `closed_at`. Columns per template. Last two columns blank for human fill-in.
   - §5 Process > Hotfix Trend narrative: one paragraph rolling 4-sprint hotfix count. Reporter reads the last 4 sprint REPORT.md files OR walks the ledger by sprint_id field. Flag if monotonic-increase across 3+ consecutive sprints.
   - `cp` to live `.claude/agents/reporter.md` post-edit (live is gitignored).
   - Live mirror byte-equality assertion preserved.

2. **`.cleargate/scripts/close_sprint.mjs`** — add a validation phase BEFORE flipping `sprint_status: Active → Completed`:
   - Read state.json for the sprint. If `schema_version < 2`, skip all v2 validation (legacy-pass — protects pre-EPIC-022 sprints).
   - If `schema_version >= 2` AND any story has `lane: fast` in state.json → activate v2 validation:
     - Read `REPORT.md` from `.cleargate/sprint-runs/<SPRINT-ID>/REPORT.md`.
     - Verify §3 contains all six new metric rows (regex match on row labels).
     - Verify §5 Process contains the Lane Audit table (heading + at least one data row per fast-lane story counted in state.json).
     - Verify §5 Process contains the Hotfix Audit table (heading; rows match the count of hotfixes merged within the sprint window per `wiki/topics/hotfix-ledger.md`).
     - Verify §5 Process contains the Hotfix Trend narrative paragraph.
     - On any check fail: exit non-zero with a structured error naming the missing section. Sprint stays Active.
   - **Naming convention enforcement**: reject reports whose path is not exactly `.cleargate/sprint-runs/<SPRINT-ID>/REPORT.md` where `<SPRINT-ID>` matches `^SPRINT-\d{2,3}$`. Legacy `S-NN/` paths fail. (Note: SPRINT-09 was renamed in sprint kickoff bookkeeping; this validation prevents regression.)

### 1.3 Out of Scope

- Architect rubric (STORY-022-01 shipped at `112a799`).
- state.json schema (STORY-022-02 shipped at `cf8198e`).
- Templates carrying lane fields (STORY-022-03 shipped at `86bf9af` — your validation reads against the v2 templates).
- pre_gate_runner.sh demotion (STORY-022-04 shipped at `7d7be3b`).
- Developer agent contract (STORY-022-05 shipped at `c59a057`).
- Hotfix lane CLI (STORY-022-06 shipped at `55f6b53` — your reporter reads the ledger this story shipped).
- Sprint close-out self-upgrade + version bump (STORY-014-02 owns).
- Dogfood end-to-end (STORY-022-08 owns).
- Backporting v2 sections to historical REPORT.md files. Forward-only.

## 2. The Truth (Executable Tests)

### 2.1 Gherkin Acceptance Criteria

```gherkin
Feature: Reporter Sprint Report v2.1 + close validation activation

  Scenario: reporter.md documents v2.1 contract
    Given `cleargate-planning/.claude/agents/reporter.md`
    When a reader greps for "Fast-Track Ratio" or "Lane Audit"
    Then sections exist describing how to compute each metric and which sources to read
    And the section explicitly enumerates the six §3 metric rows
    And the section explicitly enumerates the §5 Lane Audit + Hotfix Audit + Hotfix Trend tables/narrative

  Scenario: close_sprint accepts a v1 report unchanged (legacy-pass)
    Given a state.json fixture with schema_version: 1
    And REPORT.md without v2 sections
    When close_sprint.mjs validates
    Then validation passes
    And no error about missing Lane Audit / Hotfix Audit is emitted
    And sprint_status flips to Completed

  Scenario: close_sprint accepts a v2 report with no fast-lane stories
    Given a state.json fixture with schema_version: 2 AND every story lane=standard
    And REPORT.md without §3 fast-track rows or §5 Lane Audit
    When close_sprint.mjs validates
    Then validation passes (activation gate not met — no lane=fast story)
    And sprint_status flips to Completed

  Scenario: close_sprint rejects a v2 report missing required sections
    Given a state.json fixture with schema_version: 2 AND at least one lane=fast story
    And REPORT.md missing §5 Lane Audit table
    When close_sprint.mjs validates
    Then validation fails non-zero
    And the error names the missing "Lane Audit" section verbatim
    And sprint_status stays Active

  Scenario: close_sprint rejects non-conformant sprint-run path
    Given a REPORT.md at `.cleargate/sprint-runs/S-09/REPORT.md`
    When close_sprint.mjs validates
    Then validation fails non-zero
    And the error explains the `^SPRINT-\d{2,3}$` convention and the offending path

  Scenario: Reporter writes Lane Audit + Hotfix Audit on a sprint with a fast-lane story
    Given a sprint where at least one story shipped with lane=fast
    And one hotfix merged within the sprint window per wiki/topics/hotfix-ledger.md
    When the Reporter generates REPORT.md
    Then §3 contains all six new metric rows with computed values
    And §5 Process > Lane Audit has one row per fast-lane story
    And §5 Process > Hotfix Audit has one row per hotfix merged within sprint window
    And §5 Process > Hotfix Trend paragraph is present (even if empty rolling-4 data)
```

### 2.2 Manual Verification

- Read `cleargate-planning/.claude/agents/reporter.md` post-edit. Confirm the new contract section.
- Run `close_sprint.mjs` against a fixture v2 sprint with a fast-lane story but a missing Lane Audit table → confirm rejection.
- Run against a fixture v1 sprint → confirm legacy-pass.
- Run against the legacy `S-09/` path (renamed to `SPRINT-09/` in kickoff bookkeeping; if you want to test naming-convention enforcement, create a temp `S-99/` fixture).

## 3. Implementation Guide

### 3.1 Files To Modify

- `cleargate-planning/.claude/agents/reporter.md` (scaffold canonical, tracked).
- `.claude/agents/reporter.md` (live, gitignored — `cp` from scaffold post-edit).
- `.cleargate/scripts/close_sprint.mjs` (live; verify scaffold mirror exists at `cleargate-planning/.cleargate/scripts/close_sprint.mjs` and update both byte-identically; if no scaffold mirror, only modify live).
- `cleargate-cli/test/scripts/test_close_sprint_v21.test.ts` (NEW — vitest covering 5 Gherkin scenarios). Or extend existing `cleargate-cli/test/scripts/test_close_sprint*.test.{mjs,ts}` if present.
- New fixture sprint dirs under `cleargate-cli/test/scripts/fixtures/`:
  - `sprint-v1-legacy/` (state.json v1 + minimal REPORT.md → legacy-pass).
  - `sprint-v2-no-fast/` (state.json v2 + all standard lanes + REPORT.md without v2 sections → pass via activation gate).
  - `sprint-v2-fast-missing-audit/` (state.json v2 + one lane=fast + REPORT.md missing Lane Audit → fail).
  - `sprint-v2-fast-complete/` (state.json v2 + one lane=fast + REPORT.md with all v2 sections → pass).
  - `sprint-bad-name/` (path matching `S-NN` style → fail).

### 3.2 Technical Logic

```javascript
// close_sprint.mjs validation phase (added before sprint-status flip)

const state = readState(sprintRunsDir + '/state.json');

// Activation gate
const isV2 = state.schema_version >= 2;
const hasFastLane = isV2 && Object.values(state.stories).some(s => s.lane === 'fast');

if (!isV2 || !hasFastLane) {
  // Legacy-pass: skip v2 validation
  return existingCloseLogic();
}

// V2 validation
const reportPath = path.join(sprintRunsDir, 'REPORT.md');

// Naming convention
if (!/^SPRINT-\d{2,3}$/.test(path.basename(sprintRunsDir))) {
  process.stderr.write(`close_sprint: sprint dir "${sprintRunsDir}" does not match ^SPRINT-\\d{2,3}$\n`);
  process.exit(1);
}

const report = fs.readFileSync(reportPath, 'utf8');

const requiredMetricRows = [
  /Fast-Track Ratio/,
  /Fast-Track Demotion Rate/,
  /Hotfix Count/,
  /Hotfix-to-Story Ratio/,
  /Hotfix Cap Breaches/,
  /LD events/,
];
const missingMetrics = requiredMetricRows.filter(rx => !rx.test(report));
if (missingMetrics.length > 0) {
  process.stderr.write(`close_sprint: §3 missing rows: ${missingMetrics.map(rx => rx.source).join(', ')}\n`);
  process.exit(1);
}

const requiredSections = [
  /^## (5\.|§5).*Process/m,
  /Lane Audit/,
  /Hotfix Audit/,
  /Hotfix Trend/,
];
const missingSections = requiredSections.filter(rx => !rx.test(report));
if (missingSections.length > 0) {
  process.stderr.write(`close_sprint: §5 missing: ${missingSections.map(rx => rx.source).join(', ')}\n`);
  process.exit(1);
}

return existingCloseLogic();
```

Reporter contract addition (in `reporter.md`): a new section "Sprint Report v2.1 — Lane + Hotfix Metrics" describing how to compute each row, citing state.json fields + sprint markdown §4 LD events + wiki/topics/hotfix-ledger.md as the canonical sources.

### 3.3 API / CLI Contract

`close_sprint.mjs` exits non-zero on validation fail. Existing exit-code semantics preserved (0 = closed; 1 = validation fail; 2 = config error). Aligns with STORY-014-01's doctor exit-code hierarchy.

## 4. Quality Gates

### 4.1 Test Expectations

- 6 Gherkin scenarios passing.
- All new fixture sprints exist in `cleargate-cli/test/scripts/fixtures/`.
- The activation-gate guard is exercised in scenarios 2 + 3 (so SPRINT-14's own close report won't fail this validation since SPRINT-14 has no `lane: fast` story).
- No regression in existing close_sprint tests (run them all).

### 4.2 Definition of Done

- [ ] §"Sprint Report v2.1 — Lane + Hotfix Metrics" added to `cleargate-planning/.claude/agents/reporter.md`.
- [ ] Live + scaffold reporter.md byte-identical (cp post-edit).
- [ ] `close_sprint.mjs` validation phase added with activation gate.
- [ ] Naming convention `^SPRINT-\d{2,3}$` enforced.
- [ ] All 6 Gherkin scenarios pass.
- [ ] Legacy-pass for v1 reports verified (SPRINT-10/11/12 archives still close cleanly).
- [ ] `npm run typecheck` clean.
- [ ] `npm test` green.
- [ ] Commit message: `feat(STORY-022-07): SPRINT-14 M5 — Reporter Sprint Report v2.1 + close_sprint.mjs validation (activation-gated)`.
- [ ] One commit. NEVER `--no-verify`.
