---
type: sprint
id: "SPRINT-29"
parent: ""
children: []
cites: []
cited_by: []
status: "Abandoned"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/SPRINT-29_Delivery_Folder_Umbrella.md"
last_ingest: "2026-11-12T20:33:09.611Z"
last_ingest_commit: "dfc4069ef78521b1fbdc15a7659a4aa91afa17a2"
repo: "planning"
sprint_cleargate_id: "SPRINT-29"
---

# SPRINT-29: Delivery Folder Umbrella Restructure

**Status:** Abandoned · **Sprint:** SPRINT-29 · **Gate:** fail: discovery-checked

## Goal
Ship EPIC-029 (umbrella folder restructure + sprint telemetry co-location + story Task Checklist + M-001 upgrade runbook) and BUG-004 (scaffold wiki lint YAML backtick fix). Set the foundation for SPRINT-30 (EPIC-012 + EPIC-021 — decomposed during this sprint's Prepare phase).

## Deliverables
| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure |
|---|---|---|---|---|---|
| `STORY-029-01` | Layout Spec + Folder Surface Contract Update | standard | M1 | n | low |
| `STORY-029-02` | Umbrella Path Resolver Library + Tests | standard | M1 | n | low |
| `STORY-029-03` | Migration Script + Tests + `.migration-lock` + meta-repo flip | standard | M1 | n | med (transactional 329-file move) |
| `STORY-029-04` | `cleargate_push_item` + push.ts Use Resolver | standard | M2 | y | low |
| `STORY-029-05` | Wiki Ingest + Lint + Index Compilation Umbrella-Aware | standard | M2 | y | med (PostToolUse hook regression surface) |
| `STORY-029-06` | Lifecycle Reconciler + close_sprint Umbrella-Aware | standard | M2 | y | low |
| `STORY-029-07` | Sprint Telemetry Co-location (Option α) — hooks + agents + scripts | standard | M3 | n | high (touches 5 hooks + 3 scripts + 2 agents in one story) |
| `STORY-029-08` | Story Template Task Checklist + Architect Population | fast | M3 | y | low |
| `STORY-029-09` | Upgrade Migration Runbook (M-001) + `cleargate upgrade` Wiring | standard | M3 | y | low |
| `BUG-004` | Scaffold Wiki Lint Agent YAML Backtick Fix | fast | M3 | y | low |

**Decomposition status:** EPIC-029 → 9 stories drafted in §7 of the epic file; per-story files to be authored at SPRINT-29 SDR (Phase: Prepare). BUG-004 is a standalone fix.

**Out-of-band cleanup (free side-effect, not stories):**
- 4 epics with `status: Completed` currently stuck in `pending-sync/` (EPIC-010, EPIC-016, EPIC-023, EPIC-026) get swept into `archive/<umbrella>/` by the migration script in STORY-029-03.
- STORY-027-* carry-over orphans (SPRINT-27 assignment, still in pending-sync) get reconciled to their correct umbrella by the same script.

<!-- BEGIN relations -->
## Relations
- Parent: none
<!-- END relations -->
