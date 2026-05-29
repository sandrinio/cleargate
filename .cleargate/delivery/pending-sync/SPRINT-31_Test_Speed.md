---
sprint_id: SPRINT-31
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-31
carry_over: false
lifecycle_init_mode: warn
remote_id: null
source_tool: null
status: Draft
start_date: 2026-05-25
end_date: 2026-05-28
synced_at: null
epics:
  - EPIC-031
stories:
  - STORY-031-01
  - STORY-031-02
bugs: []
crs: []
area: tests,test-runner,sprint-execution,perf,dx
execution_mode: v2
sprint_goal: |
  Cut sprint-execution test wall time by ≥ 50% on cleargate-cli/ by splitting
  the runner into parallel-unit + serial-db and making QA-Verify default to
  scoped tests. Measured by `time npm test` before/after on 8-core laptop.
created_at: 2026-05-24T00:00:00Z
updated_at: 2026-05-24T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
context_source: |
  Born from execution-loop slowness analysis 2026-05-24. User asked for a
  small sprint targeting the highest-leverage fix from the ranked list. See
  EPIC-031 context_source for the full data trail (SPRINT-30 ledger,
  204-file census, 1/204 DB-test verified).

  Small-sprint shape on purpose: 1 epic, 2 stories, both ≤ L2. No mid-sprint
  growth expected. mcp/ + admin/ runner splits are explicit follow-ups, not
  this sprint.
stamp_error: no ledger rows for work_item_id SPRINT-31
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-24T18:16:17Z
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-24T18:16:17Z
---

# SPRINT-31: Test Speed — Runner Split + Scoped QA

## 0. Sprint Goal

- **Sprint Goal:** Cut sprint-execution test wall time by ≥ 50% on cleargate-cli/ by splitting the test runner (parallel-unit + serial-db) and switching QA-Verify default to scoped tests.

- **Success measure:** `time npm test` on cleargate-cli/ drops from ~10min to ≤ 5min on an 8-core machine; QA-Verify dispatches in the next sprint run scoped by default; full-suite invocations cite a trigger.

## 1. Consolidated Deliverables

| ID | Type | Lane | Milestone | Parallel? | Bounce exposure |
|---|---|---|---|---|---|
| STORY-031-01 | Story | standard | M1 | y | low |
| STORY-031-02 | Story | standard | M1 | y | low |

Both stories are L1/L2 and touch disjoint surfaces (cleargate-cli/package.json + test files vs cleargate-planning/.claude/agents/qa.md + template). They can run in parallel in M1.

## 2. Execution Strategy

_(Architect Sprint Design Review writes §§2.1–2.4 at kickoff. Pre-SDR placeholder.)_

### 2.1 Phase Plan

- **M1 (only milestone):** STORY-031-01 + STORY-031-02 in parallel. Both merge before sprint close.

### 2.2 Merge Ordering

No ordering constraint — surfaces are disjoint. Either order is fine. Suggest 031-01 first (so 031-02's doc-shape test, which doesn't depend on 031-01, lands second).

### 2.3 Shared-Surface Warnings

None.

### 2.4 ADR-Conflict Flags

None. EPIC-028's `--test-concurrency=1` default is preserved on the test:db side; check:no-vitest invariant unchanged.

## 3. Risks + Mitigations

| Risk | Mitigation |
|---|---|
| Parallel reveals latent ordering bug across 203 cleargate-cli unit tests | STORY-031-01 §1.2 step 5: 3× flake smoke; quarantine offenders by `.db.` rename |
| SPRINT-30 not Gate-4-closed before SPRINT-31 preflight | Halt SPRINT-31 kickoff until SPRINT-30 close runs; surfaced in Brief |
| Live `/.claude/` not re-synced after STORY-031-02 merge | DoD checklist item; doc-refresh checklist at Gate 4 enforces |
| The 138 known-failing baseline tests still pollute QA signal | Out of scope for SPRINT-31; defer to follow-up CR after parallelism lands |

## 4. Decomposition Status

- [x] All work items have §1, §2, §3 sections.
- [x] All work items 🟢 or 🟡 at draft time.
- [x] No epic without child stories.
- [ ] Gate 2 SDR §2 Execution Strategy written by Architect (pending kickoff).

## 5. Gate Checklist

- [ ] **Gate 1** (this sprint approved by human) — pending Brief approval.
- [ ] **Gate 2** (Sprint Ready) — pending SDR + cached_gate_result.pass on both stories.
- [ ] **Gate 3** (preflight) — pending SPRINT-30 close.
- [ ] **Gate 4** (close) — runs after both stories merge + walkthrough.

## 6. Execution Log

_(populated during sprint execution)_
