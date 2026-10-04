---
bug_id: BUG-119
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
context_source: "SPRINT-41 close run 2026-10-04 (close_sprint.mjs Step 2.6c HALT on 14 parents); verified codebase grounding: .cleargate/scripts/close_sprint.mjs Step 2.6c (walkActiveParents over all of delivery/; halt-partial / halt-zero-children exit 1; only CLEARGATE_SKIP_PARENT_ROLLUP test seam), src/lib/parent-rollup.ts walkActiveParents"
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

# BUG-119: Sprint close halts on incomplete parents that have nothing to do with the closing sprint

### Open Questions

- **Question:** Which parents should Step 2.6c consider?
- **Recommended:** Only parents reachable from the closing sprint: the epics, stories and CRs that the sprint's own items name as `parent_ref`, plus the sprint file itself. A partial or childless parent outside that set is reported as a warning, never a halt. A real acknowledgement path exists for an in-scope halt (a recorded owner decision), so production never needs the `CLEARGATE_SKIP_PARENT_ROLLUP` test seam.
- **Human decision:** Recommended option taken by the orchestrator under the owner's 2026-10-04 close decision. The owner may overrule when the item is scheduled.

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** Closing SPRINT-NN is blocked only by problems in SPRINT-NN's own items and their parents.

**Actual Behavior:** Step 2.6c calls `walkActiveParents` over the whole `delivery/` tree and exits 1 on any `halt-partial` or `halt-zero-children` parent anywhere. The SPRINT-41 close halted on 14 parents unrelated to SPRINT-41: old undecomposed epics (EPIC-030, 050, 052, 053, 055, 056, 057), old partial epics (EPIC-031, 047, 048), drafted sprints (SPRINT-31, 37) and another session's in-progress planning (EPIC-059, SPRINT-42). The only way through is the test seam `CLEARGATE_SKIP_PARENT_ROLLUP=1`, which the SPRINT-41 close used as a recorded owner-approved deviation.

## 2. Reproduction Protocol
1. In a repo with one closing sprint whose items are all terminal, add an unrelated epic draft in `pending-sync/` with zero children.
2. Run `close_sprint.mjs <id>` → `Step 2.6c HALT: 1 parent(s) require manual ack: [halt-zero-children] EPIC-X`, exit 1.

Edge conditions:
- An in-scope parent (an epic of a closing story) with incomplete children still halts.
- An in-scope parent whose children are all Completed still auto-flips and archives (CR-066).
- Out-of-scope parents are listed as warnings, and the close continues.

## 3. Evidence & Context
```
Step 2.6c HALT: 14 parent(s) require manual ack:
  - [halt-zero-children] EPIC-030: 0 children drafted; not reconcilable — decompose or abandon
  - [halt-partial] EPIC-031: 0/5 children terminal — pending: STORY-031-01 …
  - [halt-partial] EPIC-059: 0/4 children terminal — pending: STORY-059-01 … (another session's draft)
  - [halt-zero-children] SPRINT-42: 0 children drafted; not reconcilable — decompose or abandon
close_sprint.mjs:619  if (process.env.CLEARGATE_SKIP_PARENT_ROLLUP === '1') { … (test seam) }
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/scaffold/core/.cleargate/scripts/close_sprint.mjs` Step 2.6c (scope to the closing sprint; out-of-scope → warning) — plus its outer twin.
- `cleargate-cli/src/lib/parent-rollup.ts` `walkActiveParents` (optional sprint scoping parameter).
- Tests beside the existing parent-rollup and close-path tests.

**Do NOT modify:** CR-066's auto-flip rule for in-scope parents; Step 2.6d (BUG-118).

## Task Breakdown
- [ ] QA-Red: an unrelated childless epic does not halt; an in-scope partial epic still halts; an in-scope complete epic still flips
- [ ] Implement the scoping (+ twin)
- [ ] Typecheck, targeted, close-path suites

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/lib/parent-rollup-sprint-scope.red.node.test.ts` (solo).

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | In-scope halt, in-scope flip, out-of-scope warning |
| Interfaces | F | One close step |
| Data | F | No data variation |
| Rules | T | Only the closing sprint's parents can block its close |

```gherkin
Feature: Sprint close is blocked only by its own parents

  @paths @rules
  Scenario: An unrelated epic does not block close
    Given a closing sprint with all items terminal and an unrelated epic draft with zero children
    When Step 2.6c runs
    Then it prints a warning naming the epic and the close continues

  @paths
  Scenario: An in-scope partial epic still halts
    Given a closing story whose parent epic has another child still open
    When Step 2.6c runs
    Then it halts naming that epic

  @paths
  Scenario: An in-scope complete epic still flips
    Given a closing story whose parent epic has every child Completed
    When Step 2.6c runs
    Then the epic is Completed and archived
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 3 | one per scenario |
| Integration tests | 0 | the close-path e2e covers wiring |
| E2E / acceptance tests | 0 | the next sprint close |

---

## Prior work

- [[CR-066]]: introduced the parent rollup at close.
- [[BUG-078]]: the sprint parent roster; same step, different defect.

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
