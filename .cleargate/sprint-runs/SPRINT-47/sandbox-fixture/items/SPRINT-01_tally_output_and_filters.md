---
sprint_id: "SPRINT-01"
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
lifecycle_init_mode: "block"
status: "Draft"
start_date: "2026-11-16"
end_date: "2026-11-16"
created_at: "2026-11-16T15:00:00.000Z"
updated_at: "2026-11-16T15:00:00.000Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
area: sandbox
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: null
  failing_criteria: []
  last_gate_check: null
epics:
  - EPIC-001
stories:
  - STORY-001-01
  - STORY-001-02
  - STORY-001-03
  - STORY-001-04
proposals: []
context_source: "Decomposes EPIC-001 (Tally output and filters, pre-approved fixture) into STORY-001-01..04. Sandbox for the SPRINT-47 goal check (c)."
---

# SPRINT-01: Tally output and filters

## 0. Stakeholder Brief

- **Sprint Goal:** `tally` gains a `--min` filter, SQL output that loads into PostgreSQL 18, named tables for it, and a help text — each item proven at its declared tier.
- **Business Outcome:** none beyond the exercise; a throwaway repo used to run the ClearGate loop end to end.
- **Risks (top 3):** all four items edit `cmd/tally/main.go`; STORY-001-04 extends STORY-001-02's renderer; the container proofs need the PostgreSQL 18 container `cg-s47-pg`.
- **Metrics:** every item has evidence at its tier or is listed as built, not proven.

## Sprint Goal
`tally` gains a `--min N` filter, `--sql` output that loads into PostgreSQL 18, `--table NAME` for it, and a `--help` text, with every item proven at its declared tier (unit, container, human).

## 1. Consolidated Deliverables

| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure |
|---|---|---|---|---|---|
| `STORY-001-01` | Minimum count filter | fast | M1 | y | low |
| `STORY-001-02` | SQL output for tally | runtime | M1 | y | low |
| `STORY-001-03` | Help text | standard | M1 | y | low |
| `STORY-001-04` | Named table for SQL output | runtime | M1 | n (after 001-02) | med |

## 2. Execution Strategy
*(Written by the Architect during the Sprint Design Review.)*

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| All items edit `cmd/tally/main.go` | The SDR orders the merges; every flag lives on one FlagSet (EPIC-001 rule 2). |
| STORY-001-04 extends STORY-001-02's `renderSQL` | 001-04 merges after 001-02. |
| The container proofs need PostgreSQL 18 | The container `cg-s47-pg` runs for the whole sandbox run; `TALLY_DB_URL` points at it. |

## Metrics & Metadata
- **Expected Impact:** the four flags work and each item's evidence is on disk.
- **Priority Alignment:** none; equal priority.

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Starting Point:** as the SDR orders them.
- **Relevant Context:** `cmd/tally/main.go`, `testdata/`, `scripts/e2e-*.sh`.
- **Constraints:** standard library only; do not edit `go.mod`, `testdata/`, `scripts/` or `README.md`.
