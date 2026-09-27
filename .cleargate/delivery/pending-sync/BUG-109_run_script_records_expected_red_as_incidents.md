---
bug_id: BUG-109
parent_ref: CR-046
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-41
carry_over: false
area: scripts
status: Triaged
severity: P3-Low
reporter: orchestrator (SPRINT-41 Codex dogfood runs r6/r7, issue I20)
approved: true
approved_by: "sandrinio (SPRINT-41 directives: 'log every issue you find and fix them'; 2026-09-27 'you watch and file all issues, then fix and then use codex to test again'; 'you respond as an owner'); filed by the orchestrator per plans/M7.md §8.4"
approved_at: 2026-09-27T08:58:00Z
context_source: "Codex dogfood r6/r7 (issues.md I20); verified codebase grounding at cli main 0e5b0ac: scaffold/core/.cleargate/scripts/run_script.sh:16-26 (incident path, AGENT_TYPE/WORK_ITEM_ID env), :197-238 (incident JSON), SKILL.md §C.3 :352 (QA-Red scripts MUST go through run_script.sh)"
created_at: 2026-09-27T08:58:00Z
updated_at: 2026-09-27T08:58:00Z
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
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-27T09:01:04Z
  transition: ready-for-fix
---

# BUG-109: `run_script.sh` records QA-Red's intended red test runs as script incidents, unattributed

### Open Questions

- **Question:** How should an intended failure be told apart from a real one?
- **Recommended:** An explicit marker, not a heuristic. `RUN_SCRIPT_EXPECT_FAIL=1` makes a non-zero exit print `run_script: expected failure (exit N)` on stderr and write no incident. The exit code still passes through unchanged, and an exit 0 under the marker writes an `unexpected-pass` incident, because a red test that passes is the real anomaly. The QA-Red text in SKILL.md §C.3 and `qa.md` shows the marker on the red-confirmation run, together with `AGENT_TYPE=qa WORK_ITEM_ID=<id>`, so incidents that do get written are attributed.
- **Human decision:** Recommended option taken by the orchestrator acting as owner (2026-09-27 "you respond as an owner"). The owner may overrule at the next check-in.

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** `.script-incidents/` holds real failures, attributed to the role and work item that hit them, so the Reporter and the orchestrator can act on them.

**Actual Behavior:** QA-Red must run its red-confirmation command through `run_script.sh` (§C.3 CR-046), and that command exits 1 by design. Each run writes an incident with `"agent_type": null, "work_item_id": null`. In Codex r6, 9 of 11 incidents were intended reds, which buried the two real ones (an exit 127 from `dispatch_serial`, an npm ENOENT). In r7, 5 more followed.

## 2. Reproduction Protocol
1. In an installed repo with an active sprint, run `bash .cleargate/scripts/run_script.sh node --test` on a suite with a failing test.
2. Observe a new `.cleargate/sprint-runs/<id>/.script-incidents/<ts>-<hash>.json` with `exit_code: 1`, `agent_type: null`, `work_item_id: null`.

Edge conditions:
- Without the marker, behavior is unchanged: every non-zero exit is an incident.
- Under the marker, exit codes still pass through, so callers still see the failure.
- Exit 0 under the marker is recorded (`unexpected-pass`).

## 3. Evidence & Context
```
.script-incidents/20260927T083731Z-e3779b7938a9.json (Codex r7):
  "command": "node", "args": ["--test"], "exit_code": 1,
  "stdout": "✖ complete rejects non-positive … ℹ pass 9 ℹ fail 9 …",
  "agent_type": null, "work_item_id": null
run_script.sh:25  AGENT_TYPE — populates incident JSON agent_type field (null if empty)
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/scaffold/core/.cleargate/scripts/run_script.sh`: the `RUN_SCRIPT_EXPECT_FAIL` branch.
- SKILL.md §C.3 and `qa.md` red-confirmation example (the SKILL.md edit has upstream BUG-103; the Codex renders come from gen:codex).
- Tests beside the existing run_script tests (`scaffold/core/.cleargate/scripts/test/cr080_wrapper.test.sh` convention, or a node test).

**Do NOT modify:** the incident JSON schema; the no-marker behavior.

## Task Breakdown

> **Binding plan:** `.cleargate/sprint-runs/SPRINT-41/plans/M7.md` addendum 2026-09-27T09:41Z (A2/A4/A7, errata A1). The plan wins where it differs from this file.

- [ ] QA-Red (lane M7-A): run-script-expect-fail red (4); run_script.sh init-fixture row
- [ ] run_script.sh RUN_SCRIPT_EXPECT_FAIL branch + stderr prefix (+ twin); SKILL §C.3 bullet; qa.md step 3; gen:codex
- [ ] Typecheck, targeted, run-script-* tests (outer twin), cr080_wrapper.test.sh

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/scripts/run-script-expect-fail.red.node.test.ts` (solo).

| Axis | Cover | Reason |
|---|---|---|
| Paths | F | One wrapper path |
| Interfaces | F | One script surface |
| Data | T | Exit 0 vs non-zero, with and without the marker |
| Rules | T | Expected failures are not incidents; unexpected passes are |

```gherkin
Feature: Intended red runs are not script incidents

  @data @rules
  Scenario Outline: The expect-fail marker
    Given an installed repo with an active sprint
    When run_script.sh runs a command exiting <exit> with RUN_SCRIPT_EXPECT_FAIL=<marker>
    Then the wrapper exits <exit> and <incident>
    Examples:
      | exit | marker | incident                              |
      | 1    | 1      | writes no incident                    |
      | 0    | 1      | writes an unexpected-pass incident    |
      | 1    | unset  | writes an incident, as today          |
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 3 | one per Examples row |
| Integration tests | 0 | none |
| E2E / acceptance tests | 0 | observed in the DT Codex re-run |

---

## Prior work

- [[CR-046]]: the `run_script.sh` wrapper and its incident contract.
- [[BUG-103]]: defect #4 hits the same incident path from a different trigger (a `<cmd>` placeholder misread, exit 127).

## Context Source

**context_source:** Codex dogfood r6/r7 (2026-09-27, issues.md I20); code grounding at cli main `0e5b0ac`; owner directives recorded in `approved_by`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
