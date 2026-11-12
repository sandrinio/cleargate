---
type: sprint
id: "SPRINT-38"
parent: ""
children: []
cites: []
cited_by: 
  - "[[CR-107]]"
  - "[[EPIC-055]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-38_Enforcement_Integrity_Restoration.md"
last_ingest: "2026-11-12T19:31:58.580Z"
last_ingest_commit: "7e88816746b8ec8d0bc9de8ae06915ce3fcaff0c"
repo: "planning"
sprint_cleargate_id: "SPRINT-38"
report_raw_path: ".cleargate/sprint-runs/SPRINT-38/SPRINT-38_REPORT.md"
last_report_ingest_commit: "7e88816746b8ec8d0bc9de8ae06915ce3fcaff0c"
---

# SPRINT-38: Enforcement Integrity Restoration

**Status:** Completed · **Sprint:** SPRINT-38 · **Gate:** pass

## Goal
Restore enforcement integrity across the ClearGate scaffold: every gate documented "always enforced" must block on violation, all dead `execution_mode`/v1/v2 vocabulary is purged from shipping surfaces, and a drift guard prevents the canonical↔live↔root divergence that CR-074 exposed.

## Deliverables
*(EPIC-051 — approved at Gate 1, 2026-07-17. All stories 🟢, gate-pass. Local IDs; not yet pushed.)*

| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure |
|---|---|---|---|---|---|
| `STORY-051-01` | Restore file-surface pre-commit gate to blocking | standard | M0 | y | low |
| `STORY-051-02` | Retire the test-ratchet pre-commit gate from the payload | standard | M0 | y | low |
| `STORY-051-03` | Give the decomposition & sprint-readiness gates a work list | standard | M0 | y | med |
| `STORY-051-04` | Remove the `CLEARGATE_EXEC_MODE=v1` silent bypass | standard | M0 | y | low |
| `STORY-051-05` | Sweep dead execution_mode/v1/v2 vocabulary from shipping surfaces | standard | M1 | n | med |
| `STORY-051-06` | Add a canonical↔live↔root drift guard to `cleargate doctor` | standard | M1 | y | med |
| `STORY-051-07` | Give the duplicate check & Ambiguity Gate real enforcement | standard | M1 | y | med |
| `STORY-051-08` | Narrow break-glass semantics — scope CLEARGATE_ADVISORY & guard `--assume-ack` | standard | M2 | y | med |
| `STORY-051-09` | Fix doc contradictions, gate-numbering (four-gate) & phantom refs | standard | M2 | n | med |

**Milestone map:** **M0** (P0 gate restore) = 01·02·03·04 → *checkpoint* → **M1** (P1 integrity & drift) = 05·06·07 → **M2** (P2 coherence) = 08·09.

<!-- BEGIN relations -->
## Relations
- Parent: none
- Cited by (2): [[CR-107]], [[EPIC-055]]
<!-- END relations -->
<!-- BEGIN sprint-report -->
## Sprint Report
**Report status:** Draft · **Report:** .cleargate/sprint-runs/SPRINT-38/SPRINT-38_REPORT.md · **Improvement suggestions:** .cleargate/sprint-runs/SPRINT-38/improvement-suggestions.md

### Carried Over
**None.** All nine planned stories and both mid-sprint CRs merged. (Carry-over *work items* are enumerated in §4.5 — those are new findings, not unfinished sprint scope.)
<!-- END sprint-report -->
