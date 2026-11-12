---
type: proposal
id: "PROPOSAL-010"
parent: ""
children: []
cites: []
cited_by: []
status: "Abandoned"
remote_id: ""
raw_path: ".cleargate/delivery/archive/PROPOSAL-010_Execution_Phase_v2.md"
last_ingest: "2026-11-12T19:31:58.580Z"
last_ingest_commit: "2691d20a51eb6e8211a9ec862c0ec0ddf8c09601"
repo: "planning"
sprint_cleargate_id: "SPRINT-01"
---

# PROPOSAL-010: Execution Phase v2 (Gate Waiver Record)

**Status:** Abandoned · **Sprint:** SPRINT-01 · **Gate:** pass

## Initiative & Context
### 1.1 Objective

Port V-Bounce Engine's execution-loop primitives — git-worktree-per-story, pre-gate scanner, machine-readable `state.json` with independent bounce counters, circuit-breaker Blockers Report, immediate flashcard gate, user walkthrough on sprint branch, mid-sprint change-request triage, sprint-close self-improvement pipeline, Architect Sprint Design Review — into ClearGate's three-surface scaffold (`cleargate-planning/` · `cleargate-cli/` · `.cleargate/`), gated behind an opt-in `execution_mode: v2` flag.

### 1.2 The "Why"

[+579 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-010_Execution_Phase_v2.md]

## Technical Architecture & Constraints
### 2.1 Dependencies

- V-Bounce Engine reference implementation: `github.com/sandrinio/V-Bounce-Engine@main` — HEAD SHA pinned at `2b8477ab65e39e594ee8b6d8cf13a210498eaded` in `.cleargate/sprint-runs/S-09/plans/M1.md`.
- No new runtime dependencies across any package. Node 24 built-ins + `git` + `bash` only.

### 2.2 System Constraints

[+636 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-010_Execution_Phase_v2.md]

## Scope Impact (Touched Files & Data)
### 3.1 Known Files

See EPIC-013 §0 `<target_files>` and §4.2 V-Bounce Reference Map for the full mapping. Summary: four `.claude/agents/*.md` specs patched; four `.cleargate/templates/*.md` new or patched; `.cleargate/knowledge/cleargate-protocol.md` gains §§10–13; ten new scripts under `.cleargate/scripts/`.

### 3.2 Expected New Entities

[+391 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-010_Execution_Phase_v2.md]

## 🔒 Approval Gate — Waiver Record
This proposal exists **as a record** of a Gate-1 waiver granted 2026-04-21.

**Why the waiver:** EPIC-013 was drafted directly with V-Bounce as a reference repo. Intent was sharp, files were cited inline in EPIC-013 §4.2 (12-row capability → reference → destination mapping). A retro-drafted proposal would restate the same content as prose without adding information. The Vibe Coder (sandro) explicitly authorized skipping the normal Proposal → Epic gate on 2026-04-21 (see EPIC-013 §6 Q1 "Human Answer").

[+490 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-010_Execution_Phase_v2.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
<!-- END relations -->
