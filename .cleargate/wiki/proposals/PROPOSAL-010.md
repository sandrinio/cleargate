---
type: proposal
id: "PROPOSAL-010"
parent: ""
children: []
status: "Abandoned"
remote_id: ""
raw_path: ".cleargate/delivery/archive/PROPOSAL-010_Execution_Phase_v2.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "2691d20a51eb6e8211a9ec862c0ec0ddf8c09601"
repo: "planning"
---

# PROPOSAL-010: Execution Phase v2 (Gate Waiver Record)

## 1. Initiative & Context

### 1.1 Objective

Port V-Bounce Engine's execution-loop primitives — git-worktree-per-story, pre-gate scanner, machine-readable `state.json` with independent bounce counters, circuit-breaker Blockers Report, immediate flashcard gate, user walkthrough on sprint branch, mid-sprint change-request triage, sprint-close self-improvement pipeline, Architect Sprint Design Review — into ClearGate's three-surface scaffold (`cleargate-planning/` · `cleargate-cli/` · `.cleargate/`), gated behind an opt-in `execution_mode: v2` flag.

### 1.2 The "Why"

- SPRINT-01 → SPRINT-08 surfaced real friction: Developer commits direct to main (no parallel safety), QA re-runs typecheck on every story (expensive mechanical filter), flashcards batched at sprint end (context decay), post-sprint feedback inflates hotfix load, zero cross-sprint quality metrics.
- V-Bounce — a sibling framework — has already solved each with concrete reusable primitives; references cited inline in EPIC-013 §4.2.
- Compounding value: every future sprint (product or process) rides on this loop, so porting first pays back across all downstream work.

## 2. Technical Architecture & Constraints

[+2,810 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-010_Execution_Phase_v2.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
