---
type: sprint
id: "SPRINT-15"
parent: ""
children: 
  - "[[STORY-015-05]]"
  - "[[STORY-015-06]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-15_Process_v3.md"
last_ingest: "2026-08-24T09:45:20.081Z"
last_ingest_commit: "89539e8bfcdb817b90712e9e148c6e392145214e"
repo: "planning"
---

# SPRINT-15: Process v3 — Awareness, Ledger, Hierarchy, Upgrade

## Sprint Goal

Tighten ClearGate's *internal* process layer so the framework can describe its own state honestly to itself, its agents, and its operators. Five things land together:

1. **Wiki tells the truth about contradictions.** EPIC-020 ships an advisory contradiction-check phase in wiki-ingest so Draft work items get screened against their cited neighborhood. No new gates blocked; surfaces drift the lint pass can't see.
2. **The token ledger reports real cost.** Two sequential CRs in M3 split per the granularity rubric (L3+high default split): **CR-016** replaces transcript-scan attribution with explicit dispatch markers (closes BUG-021); **CR-018** replaces cumulative-snapshot rows with per-turn deltas + flips the Reporter contract + cuts the 0.9.0 release (closes BUG-022). Reporter math becomes additive across multi-session sprints; Anthropic-dashboard reconciliation becomes possible.
3. **The hierarchy becomes machine-readable.** Two stories pulled from PROPOSAL-009's schema half: formalise `parent_cleargate_id:` and `sprint_cleargate_id:` as top-level frontmatter keys; `cleargate push` and wiki-ingest learn to extract and propagate them.

[+18,172 bytes not shown — read .cleargate/delivery/archive/SPRINT-15_Process_v3.md]

## Blast radius
Affects: [[STORY-015-05]], [[STORY-015-06]]
