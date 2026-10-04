---
bug_id: BUG-118
parent_ref: CR-066
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: sprint-close
status: Triaged
severity: P1-High
reporter: orchestrator (SPRINT-41 close run, 2026-10-04)
approved: true
approved_by: "sandrinio (2026-10-04 Gate-4 decision: 'Close now, workaround' — close SPRINT-41 and file both close-path bugs as top carry-over)"
approved_at: 2026-10-04T07:02:57Z
context_source: "SPRINT-41 close run 2026-10-04 (close_sprint.mjs Step 2.6d output); verified codebase grounding at cli main c6d6656: src/lib/lifecycle-reconcile.ts reconcileCurrentSprintStories (TERMINAL_STATE_JSON = Done, Escalated, Parking Lot; no carry_over read); .cleargate/scripts/close_sprint.mjs Step 2.6d print '(state.json: Done)'; constants.mjs TERMINAL_STATES"
created_at: 2026-10-04T07:02:57Z
updated_at: 2026-10-04T07:02:57Z
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
  last_gate_check: 2026-10-04T07:02:58Z
  transition: ready-for-fix
---

# BUG-118: Sprint close marks carried-over (Parking Lot) items Completed and archives them

### Open Questions

- **Question:** Which state.json states should Step 2.6d back-sync to `status: Completed`?
- **Recommended:** Only `Done`. `Parking Lot` and `Escalated` stay terminal for Step 2 (the sprint can close with them), but 2.6d leaves their files in `pending-sync/` with their status unchanged. An artifact with `carry_over: true` is skipped whatever its state. The Step 2.6d line prints the real state.json state instead of a hard-coded `Done`.
- **Human decision:** Recommended option taken by the orchestrator under the owner's 2026-10-04 close decision. The owner may overrule when the item is scheduled.

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** Closing a sprint with carried-over items (state `Parking Lot`, frontmatter `carry_over: true`) leaves those items open in `pending-sync/` for the next sprint.

**Actual Behavior:** Step 2.6d (`reconcileCurrentSprintStories`) treats every terminal state.json state — `Done`, `Escalated` and `Parking Lot` — as done. It sets `status: "Completed"` and `approved: true`, moves the file to `archive/`, and never reads `carry_over`. The close log then says `(state.json: Done)` for items that are `Parking Lot`. In the SPRINT-41 close run, all 15 carried bugs (BUG-102..116) were marked Completed and archived; the orchestrator restored them by hand.

## 2. Reproduction Protocol
1. In a sprint whose state.json has one `Done` story and one `Parking Lot` story with `carry_over: true` in its frontmatter, run `close_sprint.mjs <id>` (fixtures as in the existing close-path tests).
2. Observe both stories flipped to `status: "Completed"` and moved to `archive/`, and the Step 2.6d line for the parked story reading `(state.json: Done)`.

Edge conditions:
- A `Done` story still flips and archives, as today.
- An `Escalated` story stays in `pending-sync/` with its status unchanged.
- A story already in `archive/` is untouched, as today.
- Step 2 still accepts `Parking Lot` and `Escalated` as terminal.

## 3. Evidence & Context
```
SPRINT-41 close run (2026-10-04), state.json: BUG-102..116 = "Parking Lot", frontmatter carry_over: true
Step 2.6d: BUG-114 status Triaged → Completed (state.json: Done) → archived at archive/BUG-114_close_sprint_cli_unresolvable_for_global_install.md
src/lib/lifecycle-reconcile.ts reconcileCurrentSprintStories:
  const TERMINAL_STATE_JSON = new Set(['Done', 'Escalated', 'Parking Lot']);
  … setFrontmatterFieldAtomic(srcPath, 'status', '"Completed"'); … fs.renameSync(srcPath, destPath);
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/src/lib/lifecycle-reconcile.ts` `reconcileCurrentSprintStories` (flip only `Done`; skip `carry_over: true`).
- `cleargate-cli/scaffold/core/.cleargate/scripts/close_sprint.mjs` Step 2.6d print (real state) — plus its outer twin.
- Tests beside the existing close-path and lifecycle-reconcile tests.

**Do NOT modify:** `TERMINAL_STATES` in `constants.mjs` (Step 2 semantics); the parent rollup (BUG-119).

## Task Breakdown
- [ ] QA-Red: Done flips and archives; Parking Lot and Escalated stay put; carry_over skipped; log prints the real state
- [ ] Implement the reconciler filter and the log line (+ twin)
- [ ] Typecheck, targeted, close-path suites

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/lib/reconcile-carry-over.red.node.test.ts` (solo).

| Axis | Cover | Reason |
|---|---|---|
| Paths | F | One back-sync path |
| Interfaces | F | One reconciler surface |
| Data | T | Done vs Parking Lot vs Escalated, with and without carry_over |
| Rules | T | Only Done completes; carry_over always wins |

```gherkin
Feature: Sprint close leaves carried work open

  @data @rules
  Scenario Outline: Back-sync by state
    Given a closing sprint whose state.json marks a story "<state>" and its frontmatter carry_over is <carry>
    When Step 2.6d runs
    Then the story file <outcome>
    Examples:
      | state       | carry | outcome                                         |
      | Done        | false | is Completed and moved to archive/              |
      | Parking Lot | true  | stays in pending-sync/ with its status unchanged |
      | Escalated   | false | stays in pending-sync/ with its status unchanged |
      | Done        | true  | stays in pending-sync/ with its status unchanged |
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | one per Examples row |
| Integration tests | 0 | the close-path e2e covers wiring |
| E2E / acceptance tests | 0 | the next sprint close with a carried item |

---

## Prior work

- [[CR-066]]: introduced sprint-close parent reconciliation (the same close path).
- [[BUG-078]]: the sprint parent roster; same close path, different defect.

## Context Source

**context_source:** SPRINT-41 close run (2026-10-04); code grounding at cli main `c6d6656`; owner decision recorded in `approved_by`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
