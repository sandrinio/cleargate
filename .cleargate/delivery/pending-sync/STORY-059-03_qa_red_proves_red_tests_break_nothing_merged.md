---
story_id: STORY-059-03
parent_epic_ref: EPIC-059
parent_cleargate_id: EPIC-059
sprint_cleargate_id: SPRINT-42
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-10-08T00:00:00Z
ambiguity: 🟢 Low
context_source: "EPIC-059 Rule 3, from Kurnera CR-002 Rule 3 (owner-approved 2026-10-04), reconciled with SPRINT-42's STORY-031-04 (QA-Red runs only its own files). Grounded 2026-10-04 against qa.md Mode RED (:37-58), sprint_context.md §Test Stack (:31-46), SKILL.md §C.0.2 step 6 (:304) and §C.8 (:567-577). Verified: cleargate-cli has no git pre-commit hook (core.hooksPath unset, .git/hooks empty), so nothing catches a red test breaking a merged test before the Developer's commit-time run. AMENDED 2026-10-08: SPRINT-42 re-cut to EPIC-059 + BUG-052; STORY-031-03/04 moved to SPRINT-43. Owner chose to land this story first: it adds its row to today's §Test Stack table, and 031-03/04 rebase onto it. Re-grounded 2026-10-08 against cli main 89f0230 (qa.md Mode RED steps 3-4 at :45-46, no full-suite instruction present; sprint_context.md §Test Stack table :37-42)."
actor: QA-Red agent
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
area: sprint-execution,agent-prompts,test-runner
db_write_set: []
deferred_verification: []
created_at: 2026-10-04T00:00:00Z
updated_at: 2026-10-08T00:00:00Z
created_at_version: cleargate@0.26.1
updated_at_version: cleargate@0.26.1
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-10-08T13:22:50Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-059-03
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-10-03T23:23:23Z
  sessions: []
---

# STORY-059-03: QA-Red Proves Its Red Tests Break Nothing Merged
**Complexity:** L2 — one §Test Stack row, one Mode RED step, one output key, one routing line; canonical + live.

## 1. The Spec (The Contract)

### 1.1 User Story
As the QA-Red agent, I want to run one declared check before my red tests are frozen and confirm that the only failures are my own new red tests, so that a red test that breaks a merged rule is fixed by me, not discovered by the Developer, who is not allowed to touch it.

### 1.2 Detailed Requirements
1. **§Test Stack row.** Add a `Red-commit check` row as the last row of the current §Test Stack table in `sprint_context.md`. STORY-031-03 (SPRINT-43) adds its rows later and keeps this one. Its value is either a command, usually the repo's unit suite, or the literal `developer-commit`. The placeholder text explains both forms. `developer-commit` declares that the Developer's existing commit-time full run is the check, for repos where a full run per story is too slow.
2. **Mode RED step.** Add a step to `qa.md` Mode RED, after "Confirm each test FAILS against the clean baseline":
   - If the row holds a command, run it once. The only failures allowed are the new red tests plus §Test Stack's `Known pre-existing failures`.
   - Any other failure means the new tests break a merged rule. QA-Red fixes its own tests and re-runs before returning `QA-RED: WRITTEN`.
   - If the row says `developer-commit`, skip the step.
3. **Output key.** The `QA-RED:` output shape gains `RED_COMMIT_CHECK: pass | developer-commit`. A `WRITTEN` report carrying any other value is malformed.
4. **Routing when the check is deferred.** In SKILL.md §C.8, a Developer blocker whose `## Test-Pattern` section names a frozen red test that makes a merged test fail is routed to QA-Red. The re-dispatch is Mode RED, with the failure as input. It is never handed to the Developer, and the Orchestrator never edits the frozen file. §C.0.2 step 6 gets one sentence pointing to this route.
5. **§C.3 dispatch text** names the `Red-commit check` row, so the dispatch and the agent prompt agree (STORY-031-04's lesson: prompt edits don't bind when the dispatch says otherwise).

### 1.3 Out of Scope
- Anything STORY-031-04 (SPRINT-43) changes: the scoped BASELINE_FAIL run and the `TESTS:` parser. That story rebases onto this one.
- Choosing this repo's own row value in code. It is recorded at sprint init, see §2.2.
- Any new script or pre-commit hook.

### 1.4 Open Questions

- **Question:** Kurnera's rule is "QA-Red runs the whole suite". STORY-031-04, in the same sprint, removes exactly that run, and SPRINT-42's success measure (1) forbids it. Which wins?
- **Recommended:** Both rules can hold, through the row (EPIC-059 §6 Q1). Its default, a unit-suite command, is Kurnera's rule as written. This repo sets `developer-commit`, so STORY-031-04's saving and SPRINT-42's goal stand. The defect class is still closed by requirement 4's routing.
- **Human decision:** Accepted 2026-10-08 (owner): the row, with this repo set to `developer-commit`. STORY-031-04 then moved to SPRINT-43, so the two no longer share a sprint; this story lands first.

### 1.5 Risks

- **Risk:** This edits the same Mode RED lines and §C.3 dispatch text as STORY-031-04, and `qa.md` as CR-122 does.
- **Mitigation:** This story lands first, in SPRINT-42. STORY-031-04 and CR-122 (SPRINT-43) rebase onto its merged text and must keep the row, the step and `RED_COMMIT_CHECK`. Flagged in SPRINT-43's risk table.
- **Risk:** In `developer-commit` repos, the defect is caught one dispatch later, at the Developer.
- **Mitigation:** The deliberate trade, stated in the row's placeholder. The routing in requirement 4 keeps the fix with QA-Red.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Command path and developer-commit path. |
| Interfaces | T | qa.md prompt, §C.3 dispatch text and §C.8 routing must agree. |
| Data | F | The row holds one string; no data shapes vary behaviour beyond the two forms covered under Paths. |
| Rules | T | Only own red tests may fail; frozen red tests are never edited by Developer or Orchestrator. |

```gherkin
Feature: QA-Red proves its red tests break nothing merged

  Scenario: The Test Stack declares the check
    Given cleargate-cli/scaffold/core/.cleargate/templates/sprint_context.md
    When the §Test Stack table is read
    Then it has a "Red-commit check" row whose placeholder explains a command and developer-commit

  @paths @rules
  Scenario: A command check allows only the new red tests to fail
    Given qa.md Mode RED
    When the red-commit step is read
    Then QA-Red runs the declared command once before returning WRITTEN
    And any failure other than its new red tests and the known pre-existing failures sends it back to fix its own tests

  @paths
  Scenario: developer-commit skips the step
    Given qa.md Mode RED
    When the row value is developer-commit
    Then the step is skipped and the report carries RED_COMMIT_CHECK: developer-commit

  @interfaces @rules
  Scenario: A deferred failure routes back to QA-Red
    Given SKILL.md §C.8 and §C.0.2 step 6
    When a Developer blocker names a frozen red test that makes a merged test fail
    Then the Orchestrator re-dispatches QA-Red in Mode RED with that failure
    And neither the Developer nor the Orchestrator edits the frozen file

  @interfaces
  Scenario: Dispatch, prompt and output agree
    Given SKILL.md §C.3 and qa.md
    When the dispatch text and the QA-RED output shape are read
    Then both name the Red-commit check
    And the output shape includes RED_COMMIT_CHECK: pass | developer-commit
    And the live mirrors match canonical byte-for-byte
```

### 2.2 Verification Steps (Manual)
- [ ] At the next `cleargate sprint init` in this repo, set the `Red-commit check` row to `developer-commit` in `sprint-context.md`, and record the setting in that sprint's §4 log.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md` |
| Related Files | `cleargate-cli/scaffold/core/.cleargate/templates/sprint_context.md`, `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md`, `.claude/agents/qa.md`, `.cleargate/templates/sprint_context.md`, `.claude/skills/sprint-execution/SKILL.md` |
| New Files Needed | Yes — `cleargate-cli/test/scaffold/qa-red-commit-check.node.test.ts` |

### 3.2 Technical Logic
- **`sprint_context.md`:** add the row as the last row of the table (`:37-42`), keeping the `| Field | Value |` shape.
- **`qa.md`:** insert the step between Mode RED steps 3 and 4 (`:45-46`) and renumber the steps after it. Add `RED_COMMIT_CHECK:` to the output block (`:50-56`).
- **`SKILL.md`:**
  - §C.3: one sentence in the dispatch block, plus the new key in the `QA-Red returns:` block.
  - §C.8: one routing sentence under the table.
  - §C.0.2 step 6 (`:304`): a pointer to §C.8.
- Lands before STORY-031-04 (SPRINT-43). Add no full-suite instruction outside the conditional red-commit step; with `developer-commit` the step adds no run.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 5 | One per §2.1 scenario, text assertions on canonical + live. |
| Integration tests | 0 | Prompt and template text only. |
| E2E / acceptance tests | 0 | The next sprint's QA-Red reports carry RED_COMMIT_CHECK; checked by the Reporter. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] No full-suite instruction added outside the conditional red-commit step.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md:41` — Mode RED numbered steps and output shape.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/templates/sprint_context.md:37` — §Test Stack table, the single source agents read for test commands.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:304` — §C.0.2 step 6, "re-scoped by QA-Red, never by the Developer".
- **Coverage of this requirement:** ≥80% — one row, one step and one routing line on existing surfaces.

## Prior work

- [[STORY-031-04]] — QA-Red runs only its own files (SPRINT-43). It rebases onto this story; the merged-rule check sits beside it, not against it.
- [[STORY-031-03]] — adds further §Test Stack rows (SPRINT-43) beside this row.
- [[BUG-113]], [[BUG-109]] — Mode RED fixes carried from SPRINT-41, not yet landed; whichever lands second rebases its Mode RED edit.

## Why not simpler?

- **Smallest existing surface that could carry this:** one sentence in `qa.md`: "run the whole suite before committing" (Kurnera's form).
- **Why isn't extension / parameterization / config sufficient?** That sentence contradicts STORY-031-04 (SPRINT-43), and it costs this repo about ten minutes per standard story. The row is the parameterization. Repos with a small suite get Kurnera's rule unchanged, and slow repos get the routing fallback.

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
