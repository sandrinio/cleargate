---
type: sprint
id: "SPRINT-27"
parent: ""
children: []
cites: 
  - "[[BUG-030]]"
  - "[[CR-061]]"
  - "[[CR-062]]"
  - "[[CR-063]]"
  - "[[CR-064]]"
  - "[[CR-065]]"
  - "[[EPIC-002]]"
  - "[[EPIC-006]]"
  - "[[EPIC-010]]"
  - "[[EPIC-027]]"
  - "[[STORY-004-03]]"
  - "[[STORY-006-04]]"
  - "[[STORY-006-05]]"
  - "[[STORY-027-01]]"
  - "[[STORY-027-02]]"
  - "[[STORY-027-03]]"
  - "[[STORY-027-04]]"
  - "[[STORY-027-05]]"
cited_by: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-27_MCP_Type_Agnostic_And_Console_Connection.md"
last_ingest: "2026-11-12T19:31:58.580Z"
last_ingest_commit: "46d8e1d2bd30047a674f31bb09b263dbdfbe39de"
repo: "planning"
sprint_cleargate_id: "SPRINT-27"
report_raw_path: ".cleargate/sprint-runs/SPRINT-27/SPRINT-27_REPORT.md"
last_report_ingest_commit: "6883a94781e46a04f797d1e76e74a69b95c21b33"
---

# SPRINT-27: MCP Type-Agnostic Sync + Sprint Artifact Push + Admin-Console Connection UX

**Status:** Completed · **Sprint:** SPRINT-27 · **Gate:** pass

## Goal
Ship EPIC-027 Phase 1 (open-type validator, gate-policy split, error taxonomy, codebase/PM-tool boundary lock), prove the type-agnostic foundation end-to-end via sprint artifact sync (CR-063 wiki + CR-064 MCP push), and ship the admin-console connection-UX quartet (CR-061 3-tab modal, CR-062 invite resend + email, CR-065 stdio service-token bridge, BUG-030 member-delete FK fix).

## Deliverables
| ID | Type | Title | Lane | Bounce Exposure | Status |
|---|---|---|---|---|---|
| [[STORY-027-01]] | Story (EPIC-027) | Open type validator + normalize + `KNOWN_TYPES` registry (incl. `sprint`/`sprint_report`) in `mcp/src/lib/payload-contract.ts` | standard | low | **To draft @ SDR** |
| [[STORY-027-02]] | Story (EPIC-027) | `RESERVED_PAYLOAD_KEYS` + reserved-key reject + type-change forbid (guiding error) + payload size cap + `approved_not_boolean` with `{code, message, hint}` | standard | med | **To draft @ SDR** |
| [[STORY-027-03]] | Story (EPIC-027) | Origin-based gate policy split (`approved` + `cached_gate_result` wrapped in `payload.origin === "cleargate-cli"`) + idempotent advisory prefix + structured pull 404 | standard | high | **To draft @ SDR** |
| [[STORY-027-04]] | Story (EPIC-027) | L1 error code taxonomy + L2 warnings array (`unknown_type`, `unknown_id_format`, `missing_recommended_fields`) + `audit_log` integration | standard | low | **To draft @ SDR** |
| [[STORY-027-05]] | Story (EPIC-027) | Docs (`cleargate-protocol.md` + `CLAUDE.md`) + CI no-PM-SDK grep rule script | fast | low | **To draft @ SDR** |
| [[CR-061]] | CR | Token-Issued modal renders 3-tab snippet (HTTP JSON + curl + stdio Claude Desktop config) | standard | low | 🟢 |
| [[CR-062]] | CR | Resend invite from members list + email on create + email on resend + Send/Trash2 icon buttons | standard | low | 🟢 |
| [[CR-063]] | CR | Ingest sprint reports into wiki (plan + report on one page, backfill SPRINT-03..26, Gate-4 auto-trigger) | standard | low | 🟢 |
| [[CR-064]] | CR | Sync sprint plans + reports to MCP (typeMap entry + path validator extension + close_sprint.mjs Gate-4 push step + smoke script) | standard | low | 🟢 |

[+1,007 bytes not shown — read .cleargate/delivery/archive/SPRINT-27_MCP_Type_Agnostic_And_Console_Connection.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Cites (18): [[BUG-030]], [[CR-061]], [[CR-062]], [[CR-063]], [[CR-064]], [[CR-065]], [[EPIC-002]], [[EPIC-006]], [[EPIC-010]], [[EPIC-027]], [[STORY-004-03]], [[STORY-006-04]], [[STORY-006-05]], [[STORY-027-01]], [[STORY-027-02]], [[STORY-027-03]], [[STORY-027-04]], [[STORY-027-05]]
<!-- END relations -->
<!-- BEGIN sprint-report -->
## Sprint Report
**Report status:** Draft · **Report:** .cleargate/sprint-runs/SPRINT-27/SPRINT-27_REPORT.md · **Improvement suggestions:** .cleargate/sprint-runs/SPRINT-27/improvement-suggestions.md

### Carried Over
None. All 11 planned deliverables shipped within the sprint window.
<!-- END sprint-report -->
