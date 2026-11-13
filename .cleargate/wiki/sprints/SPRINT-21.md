---
type: sprint
id: "SPRINT-21"
parent: ""
children: 
  - "[[BUG-026]]"
  - "[[CR-030]]"
  - "[[CR-031]]"
  - "[[CR-032]]"
  - "[[CR-033]]"
  - "[[CR-034]]"
  - "[[CR-035]]"
  - "[[CR-036]]"
  - "[[CR-037]]"
  - "[[CR-038]]"
  - "[[CR-039]]"
cites: []
cited_by: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-21_Framework_Hardening_Test_Surfaced.md"
last_ingest: "2026-11-13T01:02:08.963Z"
last_ingest_commit: "28642e312bd5eb624293c5f36e7225c80b0f1f58"
repo: "planning"
sprint_cleargate_id: "SPRINT-21"
report_raw_path: ".cleargate/sprint-runs/SPRINT-21/SPRINT-21_REPORT.md"
last_report_ingest_commit: "6883a94781e46a04f797d1e76e74a69b95c21b33"
---

# SPRINT-21: Framework Hardening — Test-Surfaced Findings (Visibility + Cost + Initiative)

**Status:** Completed · **Dates:** 2026-05-30 → 2026-06-12 · **Gate:** pass

## Deliverables
| Item | Type | Title | Lane | Complexity | Parallel? | Bounce Exposure | Wave |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [`BUG-026`](BUG-026_Update_State_Mjs_Broken_Validate_Shape_Ignoring_Version_Import.md) | Bug | `update_state.mjs` broken — `validateShapeIgnoringVersion` import | fast | XS | y (W1 batch) | low | W1 |
| [`CR-031`](CR-031_Predicate_Resolves_Linked_Files_Across_PendingSync_And_Archive.md) | CR | `resolveLinkedPath` walks pending-sync + archive | fast | XS | y (W1 batch) | low | W1 |
| [`CR-034`](CR-034_Listed_Item_Predicate_Accepts_Table_Rows.md) | CR | `listed-item` predicate accepts table rows (`declared-item`) | standard | S | y (W1 batch) | low | W1 |
| [`CR-037`](CR-037_Architect_Validates_Dep_Versions_Against_Npm_Registry.md) | CR | Architect pre-spec dep version check via `npm view` | fast | XS | y (W1 batch) | low | W1 |
| [`CR-032`](CR-032_Surface_Gate_Failures_And_Stop_Self_Cert.md) | CR | Surface gate failures + literal-criterion rule at Ambiguity Gate | standard | S | y (W2) | low | W2 |
| [`CR-038`](CR-038_Stale_Gate_Cache_Refresh_At_Sprint_Preflight.md) | CR | Stale `cached_gate_result` refresh as preflight Step 0 | standard | S | y (W2) | low | W2 |
| [`CR-030`](CR-030_Initiative_First_Class_Citizenship.md) | CR | Initiative + Sprint first-class citizenship (bucket+type+stamp+id+predicate) | standard | M | y (W3) | med | W3 |
| [`CR-033`](CR-033_Reuse_Audit_Verifies_Cited_Surfaces_Exist.md) | CR | `existing-surfaces-verified` predicate (CR-028 follow-up) | standard | M | y (W3) | low | W3 |
| [`CR-035`](CR-035_Reporter_Token_Total_Includes_Own_SubagentStop.md) | CR | Reporter §3 token total — session-totals + two-line split | fast | XS | y (W3) | low | W3 |
| [`CR-036`](CR-036_Reporter_Token_Diet_Bundle_Enforcement_And_Fresh_Session.md) | CR | Reporter token diet — bundle mandatory + fresh session_id + budget warn | standard | M | n (W4 solo) | med | W4 |
| [`CR-039`](CR-039_Spike_Per_Story_Session_Reset_For_Dev_QA_Loop.md) | CR (spike) | Per-story session reset investigation memo | standard | spike (≤1 dev-day) | n (W5 solo) | low | W5 |

[+631 bytes not shown — read .cleargate/delivery/archive/SPRINT-21_Framework_Hardening_Test_Surfaced.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (11): [[BUG-026]], [[CR-030]], [[CR-031]], [[CR-032]], [[CR-033]], [[CR-034]], [[CR-035]], [[CR-036]], [[CR-037]], [[CR-038]], [[CR-039]]
<!-- END relations -->
<!-- BEGIN sprint-report -->
## Sprint Report
**Report status:** Shipped · **Report:** .cleargate/sprint-runs/SPRINT-21/SPRINT-21_REPORT.md · **Improvement suggestions:** .cleargate/sprint-runs/SPRINT-21/improvement-suggestions.md

### Carried Over
- CR-040: vitest → node:test migration (new scope, drafted mid-sprint from user feedback; deferred to SPRINT-22).
- CR-041: session-reset implementation (spike outcome: gated on hang-correlation study; needs further analysis before drafting).
- CR-042: `reporter.md` L108 doc-bug fix (gated on CR-041 outcome).
<!-- END sprint-report -->
