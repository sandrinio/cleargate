---
story_id: STORY-022-08
parent_epic_ref: EPIC-022
status: Approved
ambiguity: 🟢 Low
context_source: EPIC-022_Sprint_Lane_Classifier_And_Hotfix_Path.md + SPRINT-14_Process_v2.md §M5
actor: ClearGate orchestrator + four-agent loop
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: med
sprint: SPRINT-14
milestone: M5
approved: true
approved_at: 2026-04-27T00:00:00Z
approved_by: sandrinio
created_at: 2026-04-27T00:00:00Z
updated_at: 2026-04-27T00:00:00Z
created_at_version: cleargate@0.5.0
updated_at_version: cleargate@0.6.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-26T23:02:48Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-022-08
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-26T23:02:48Z
  sessions: []
---

# STORY-022-08: Dogfood — Fast-Lane End-to-End Against Post-Upgrade Live Dogfood
**Complexity:** L2 — orchestrator runs the lane classifier + Architect/Developer/QA loop in `lane: fast` mode against a synthetic L1 fixture story; verifies Lane Audit + LD-on-induced-failure + Reporter §3 metrics populate correctly. This story doubles as the upgrade-path regression test on a non-trivial repo.

## 1. The Spec (The Contract)

### 1.1 User Story

As the ClearGate orchestrator at sprint close (post STORY-014-02 self-upgrade), I want to run a real fast-lane story end-to-end against the upgraded dogfood — verifying the rubric, demotion mechanics, and Reporter §5 Lane Audit all work in practice — so that SPRINT-15+ has confidence the lane classifier is production-ready and not just unit-tested.

### 1.2 Detailed Requirements

Two parts, one commit:

**Part A — Synthetic fast-lane story:**

1. Seed a tiny synthetic L1 story under `pending-sync/STORY-099-01_Dogfood_Lane_Fast_Smoke.md` with frontmatter `lane: "fast"`, `expected_bounce_exposure: "low"`, `complexity_label: "L1"`, `sprint: "SPRINT-14"`, `milestone: "M5"`. The story body has a single Gherkin scenario asking the Developer to add a 1-line comment to a known-trivial file (e.g. a constant in `cleargate-cli/src/constants.ts` if it exists, or a similar single-file ≤2-LOC change). Pre-gate scanner MUST pass on this change without intervention.
2. Update `state.json` to add `STORY-099-01` with `lane: "fast"`, `lane_assigned_by: "architect"`, both demotion fields `null`. (Architect normally does this during Sprint Design Review, but this is a synthetic post-hoc story so the orchestrator hand-writes it.)
3. **Run the four-agent loop in fast-lane mode:**
   - Architect: produce a one-pager plan (since lane=fast, plan is minimal — call out only the file to touch and the test surface).
   - Developer (sonnet): single-commit, single-file change.
   - Pre-gate scanner: must pass (this is the happy path).
   - QA: NOT spawned (per STORY-022-04's lane=fast skip-on-pass logic).
4. Verify state.json post-execution: STORY-099-01 state advances to `Architect Passed` (per STORY-022-04 §3 contract); `qa_bounces` and `arch_bounces` stay 0; `lane` stays `fast`.

**Part B — Induced-failure demotion verification:**

1. Spawn a SECOND Developer for the same STORY-099-01 with instruction to commit a deliberately scanner-failing change (e.g. introduce a syntax error or use a banned debug-statement pattern).
2. Pre-gate scanner: fails per the existing v2 scanner.
3. STORY-022-04's lane-aware post-pass hook should: call `update_state.mjs --lane-demote "<reason>"` to flip lane=standard, populate `lane_demoted_at` + `lane_demotion_reason`, append an LD event row to sprint markdown §4, exit with scanner-fail signal.
4. Orchestrator re-spawns Developer + QA per the standard contract on next iteration (since lane is now standard).

Verify post-failure:

- state.json STORY-099-01 has `lane: "standard"`, `lane_assigned_by: "human-override"`, `lane_demoted_at` populated, `lane_demotion_reason` populated, `qa_bounces` and `arch_bounces` reset to 0.
- Sprint markdown §4 (auto-created by STORY-022-04's `append_ld_event`) contains an LD row naming STORY-099-01 with the failure reason.

**Part C — Reporter v2.1 metrics population (smoke check):**

1. Manually invoke or simulate the Reporter agent's REPORT.md generation against SPRINT-14 state.
2. Verify §3 contains all six new metric rows from STORY-022-03's template (Fast-Track Ratio, Fast-Track Demotion Rate, Hotfix Count, Hotfix-to-Story Ratio, Hotfix Cap Breaches, LD events) with computed values (Fast-Track Ratio = 1/16; Demotion Rate = 1/1 if fast-then-demoted, or 0/1 if fast-then-passed-then-induced-fail-second-time; depends on Part B exact sequence).
3. Verify §5 Process > Lane Audit table contains STORY-099-01's row.
4. Verify `close_sprint.mjs` validation (per STORY-022-07) PASSES against this REPORT.md (activation gate met: schema_version=2 + at least one fast-lane story + all v2 sections populated).

**Output deliverables in commit:**

- `cleargate-cli/src/constants.ts` (or whatever 1-LOC target file) — the actual single-line change Developer A made (still in tree post-Part-B if Developer A's commit was preserved; if Part B reverted Part A, just the synthetic story file is committed).
- `pending-sync/STORY-099-01_Dogfood_Lane_Fast_Smoke.md` — synthetic story file.
- `cleargate-cli/test/scripts/test_dogfood_lane_fast.test.ts` — vitest exercising the Lane Audit row generation + LD event-row regex match. Even if the manual smoke can't be fully automated, the audit-table generation logic should have a unit test against fixture state.json.
- `.cleargate/sprint-runs/SPRINT-14/dogfood-log.md` — narrative log of the dogfood run (Part A + B + C results, exact commands run, exact state.json mutations observed). This is human-readable evidence for the Reporter to cite at sprint close.

### 1.3 Out of Scope

- Modifying the lane rubric, agent contracts, or close_sprint validation (M3 + STORY-022-07 own).
- Backporting metrics to past sprint REPORT.md files.
- Publishing `cleargate-cli@0.6.0` to npm (manual user step post-014-02).
- Real production traffic. This is dogfood only.
- Hotfix lane dogfood (deferred — first-pass hotfix run can happen organically in SPRINT-15+).

## 2. The Truth (Executable Tests)

### 2.1 Gherkin Acceptance Criteria

```gherkin
Feature: Fast-lane dogfood end-to-end against post-upgrade dogfood

  Scenario: Part A — fast-lane happy path
    Given STORY-099-01 with lane=fast in state.json (post STORY-014-02 self-upgrade)
    And a synthetic 1-LOC change passing the pre-gate scanner
    When the orchestrator dispatches Developer
    Then the Developer commit lands single-file ≤2 LOC
    And the pre-gate scanner passes
    And QA is NOT spawned (per STORY-022-04 lane=fast skip)
    And state.json STORY-099-01 state is "Architect Passed"
    And qa_bounces=0 and arch_bounces=0

  Scenario: Part B — induced failure auto-demotes
    Given STORY-099-01 with lane=fast (post Part A reset)
    And a deliberately scanner-failing change (e.g. introduced syntax error)
    When the pre-gate scanner runs
    Then the scanner fails
    And STORY-022-04's post-pass hook fires
    And state.json STORY-099-01 has lane=standard, lane_assigned_by=human-override
    And lane_demoted_at is populated with an ISO timestamp
    And lane_demotion_reason is populated
    And qa_bounces=0 and arch_bounces=0 (reset)
    And sprint markdown §4 contains an LD event row naming STORY-099-01

  Scenario: Part C — Reporter v2.1 §3 metric rows populate
    Given SPRINT-14 has at least one story with lane=fast in state.json
    And one LD event recorded in sprint markdown §4
    When the Reporter generates REPORT.md
    Then §3 contains rows: Fast-Track Ratio, Fast-Track Demotion Rate, Hotfix Count, Hotfix-to-Story Ratio, Hotfix Cap Breaches, LD events
    And §5 Process > Lane Audit table has at least one row (STORY-099-01)
    And §5 Process > Hotfix Audit table is present (rows = count of hotfixes merged within sprint window per ledger)
    And §5 Process > Hotfix Trend narrative is present

  Scenario: Part D — close_sprint.mjs validation passes for SPRINT-14
    Given SPRINT-14's REPORT.md contains all required v2.1 sections
    And SPRINT-14's state.json has schema_version=2 + at least one lane=fast story
    When close_sprint.mjs validates SPRINT-14
    Then validation passes
    And sprint_status flips to Completed
    And no error about missing sections is emitted
```

### 2.2 Manual Verification

The dogfood is largely manual because it exercises the orchestrator's spawn flow (which can't be unit-tested cheaply). Document each step in `.cleargate/sprint-runs/SPRINT-14/dogfood-log.md`:

1. Add STORY-099-01 to state.json with lane=fast.
2. Spawn Developer A (sonnet) for STORY-099-01 — instructions: "add 1-LOC comment to constants.ts, commit, exit."
3. Run `pre_gate_runner.sh qa $(pwd) story/STORY-099-01` (or whatever the v2 invocation is).
4. Inspect state.json + stdout: verify "Architect Passed" + skip-QA message.
5. Commit Part A.
6. Spawn Developer B for STORY-099-01 (re-flipped to lane=fast manually) — instructions: "introduce a typecheck-failing import, commit, exit."
7. Run `pre_gate_runner.sh qa ...` again.
8. Inspect state.json + sprint markdown §4: verify lane=standard + LD row.
9. Revert Developer B's commit (keep Part A's 1-LOC comment, OR revert both if scoping clean).
10. Generate REPORT.md against SPRINT-14 state.json.
11. Run `close_sprint.mjs` against SPRINT-14: verify pass.
12. Snapshot the dogfood-log.md.

## 3. Implementation Guide

### 3.1 Files To Modify / Create

**Create:**
- `.cleargate/delivery/pending-sync/STORY-099-01_Dogfood_Lane_Fast_Smoke.md` (synthetic story file).
- `.cleargate/sprint-runs/SPRINT-14/dogfood-log.md` (narrative log).
- `cleargate-cli/test/scripts/test_dogfood_lane_fast.test.ts` (unit-level audit-table generation test).

**Modify:**
- `cleargate-cli/src/constants.ts` (or whatever 1-LOC target the orchestrator picks) — add a single-line comment per the synthetic story's spec. Keep the change ≤2 LOC.
- `.cleargate/sprint-runs/SPRINT-14/state.json` — add STORY-099-01 entry with the appropriate lane state at each phase.

### 3.2 Technical Logic

This story is procedural, not algorithmic. The orchestrator follows the §2.2 Manual Verification steps and records observations in dogfood-log.md.

The vitest at `test_dogfood_lane_fast.test.ts` is the only auto-runnable surface: it should construct a fixture state.json with a fast-lane story, simulate a demotion, and verify the Lane Audit table generation function (whatever the Reporter exposes) produces the expected row. If the Reporter's audit-table generator isn't exposed as a callable function, refactor it minimally to be testable.

### 3.3 API / CLI Contract

No new CLI surface. Uses existing `cleargate sprint`, `cleargate state`, `cleargate gate` (or whatever the v2 names are post-EPIC-013).

## 4. Quality Gates

### 4.1 Test Expectations

- 4 Gherkin scenarios documented in dogfood-log.md (Parts A/B/C/D).
- 1 vitest covering the audit-table generation logic against a fixture.
- close_sprint.mjs run on SPRINT-14 must pass post-this-story.

### 4.2 Definition of Done

- [ ] STORY-099-01 synthetic story file created.
- [ ] state.json STORY-099-01 advances through Ready→Architect Passed→Demoted→Done across the run.
- [ ] Sprint markdown §4 contains the LD event row for the induced failure.
- [ ] Lane Audit table populates with STORY-099-01 in REPORT.md.
- [ ] close_sprint.mjs against SPRINT-14 passes (activation gate met + all v2.1 sections present).
- [ ] dogfood-log.md narrates the run in detail.
- [ ] vitest at `test_dogfood_lane_fast.test.ts` covers the audit-table generation.
- [ ] `npm run typecheck` clean.
- [ ] `npm test` green.
- [ ] Commit message: `feat(STORY-022-08): SPRINT-14 M5 — fast-lane dogfood end-to-end + Reporter v2.1 metrics smoke + close_sprint validation pass`.
- [ ] One commit. NEVER `--no-verify`.
