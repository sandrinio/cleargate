---
type: sprint
id: "SPRINT-17"
parent: ""
children: 
  - "[[CR-020]]"
  - "[[CR-023]]"
  - "[[EPIC-024]]"
cites: []
cited_by: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-17_Plan_Phase_Delivery.md"
last_ingest: "2026-11-13T01:02:08.963Z"
last_ingest_commit: "6a2695bb2500db987244fd5cd4a467a58b6c9566"
repo: "planning"
sprint_cleargate_id: "SPRINT-17"
report_raw_path: ".cleargate/sprint-runs/SPRINT-17/REPORT.md"
last_report_ingest_commit: "6883a94781e46a04f797d1e76e74a69b95c21b33"
---

# SPRINT-17: Sprint 1 — Plan Phase Delivery

**Status:** Completed · **Dates:** 2026-05-02 → 2026-05-15 · **Gate:** not run

## Goal
Land the **Plan-phase** layer of the SDLC redesign:

1. **EPIC-024 — AI Orientation Surface Slim.** Make four currently-implicit ClearGate rules explicit in `CLAUDE.md`; split `cleargate-protocol.md` into "AI reads" + "hooks enforce" files with full citation rewrite (no stub redirects); remove Story §3.1 duplication from per-milestone Architect plans; ship a sprint-closeout doc & metadata refresh checklist for the *human-facing* orientation surface. Four stories, three waves internal.
2. **CR-020 — Brief-Driven SDLC Plan Phase.** Universal Brief pattern in every work-item template; collapse old Gate 1 + Gate 2 + Gate 3 → new four-gate model (Gate 1 Brief / Gate 2 Sprint Ready / Gate 3 Sprint Execution / Gate 4 Close-Ack); insert §0 Phase Map at top of slim protocol; drop the "Always Start with a Proposal" mandate; reframe MCP as the universal sync surface (no Linear/Jira mentions in protocol prose).

[+523 bytes not shown — read .cleargate/delivery/archive/SPRINT-17_Plan_Phase_Delivery.md]

## Deliverables
| Item | Type | Title | Lane | Complexity | Parallel? | Bounce Exposure | Milestone |
|---|---|---|---|---|---|---|---|
| `STORY-024-01` | Story | Architect plan slim — drop §3.1 duplication from per-milestone plans | standard | L2 | y (Wave 1) | low | M1 |
| `STORY-024-03` | Story | CLAUDE.md gap-fill — surface 4 implicit rules + tier-4 read order | fast | L1 | y (Wave 1) | low | M1 |
| `STORY-024-04` | Story | Sprint closeout doc & metadata refresh checklist + `prep_doc_refresh.mjs` | standard | L2 | y (Wave 1) | low | M1 |
| `STORY-024-02` | Story | `cleargate-protocol.md` split + new `cleargate-enforcement.md` + ~92 §-citation rewrites | standard | L2 | n (Wave 2) | med | M2 |
| [`CR-020`](CR-020_Brief_Driven_SDLC_Plan_Phase.md) | CR | Brief-driven SDLC Plan phase + universal Brief pattern + §0 Phase Map + four-gate model | standard | L3 | n (Wave 3) | med | M3 |

**Estimated totals:** 4 stories + 1 CR = **5 items**. Complexity: 1×L1 + 3×L2 + 1×L3. Lane mix: 1 fast / 4 standard.

**Wave structure (preliminary; Architect SDR to confirm in §2):**

[+643 bytes not shown — read .cleargate/delivery/archive/SPRINT-17_Plan_Phase_Delivery.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (3): [[CR-020]], [[CR-023]], [[EPIC-024]]
<!-- END relations -->
<!-- BEGIN sprint-report -->
## Sprint Report
**Report status:** Draft · **Report:** .cleargate/sprint-runs/SPRINT-17/REPORT.md · **Improvement suggestions:** .cleargate/sprint-runs/SPRINT-17/improvement-suggestions.md

### Carried Over
- None.
<!-- END sprint-report -->
