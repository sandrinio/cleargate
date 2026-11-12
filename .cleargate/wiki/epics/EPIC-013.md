---
type: epic
id: "EPIC-013"
parent: ""
children: 
  - "[[BUG-002]]"
  - "[[BUG-005]]"
  - "[[BUG-026]]"
  - "[[BUG-029]]"
  - "[[CR-014]]"
  - "[[CR-037]]"
  - "[[CR-039]]"
  - "[[CR-042]]"
  - "[[CR-043]]"
  - "[[CR-044]]"
  - "[[CR-045]]"
  - "[[CR-046]]"
  - "[[CR-047]]"
  - "[[CR-048]]"
  - "[[CR-049]]"
  - "[[CR-050]]"
  - "[[CR-051]]"
  - "[[CR-052]]"
  - "[[CR-053]]"
  - "[[CR-054]]"
  - "[[CR-055]]"
  - "[[CR-056]]"
  - "[[CR-057]]"
  - "[[CR-058]]"
  - "[[CR-060]]"
  - "[[CR-085-Drive-Execution-Loop-States-Live]]"
  - "[[STORY-013-01]]"
  - "[[STORY-013-02]]"
  - "[[STORY-013-03]]"
  - "[[STORY-013-04]]"
  - "[[STORY-013-05]]"
  - "[[STORY-013-06]]"
  - "[[STORY-013-07]]"
  - "[[STORY-013-08]]"
  - "[[STORY-013-09]]"
cites: []
cited_by: 
  - "[[PROPOSAL-074]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-013_Execution_Phase_v2.md"
last_ingest: "2026-11-12T21:25:29.802Z"
last_ingest_commit: "2691d20a51eb6e8211a9ec862c0ec0ddf8c09601"
repo: "planning"
sprint_cleargate_id: "SPRINT-01"
---

# EPIC-013: Execution Phase v2 — Bounce Loop, Worktrees, Pre-Gates, Self-Improvement

**Status:** Completed · **Sprint:** SPRINT-01 · **Gate:** pass

## Objective
Harden ClearGate's execution phase by porting 8 mechanized patterns from V-Bounce Engine — git worktree per story, pre-gate scanner, independent bounce counters with machine-readable state, circuit-breaker blockers report, immediate flashcard gate, user walkthrough on sprint branch, mid-sprint triage, sprint-close self-improvement pipeline — while preserving ClearGate's three-repo split (delivery/wiki/mcp) and Karpathy wiki drift model.

## Problem & Value
**Why are we doing this?**
Through SPRINT-01 → SPRINT-08 we learned our execution loop is under-mechanized. Developer commits straight to `main`, so we cannot parallelize stories safely; QA re-runs typecheck on every story even when a pre-scan would bounce trivial failures back cheaper; flashcards are batched at sprint end when context has decayed; post-sprint user feedback lands as hotfixes that

[+1,103 bytes not shown — read .cleargate/delivery/archive/EPIC-013_Execution_Phase_v2.md]

## Scope
**In:**
- [ ] **Git worktree hierarchy per story** — cut `sprint/S-XX` from main at sprint start; each story executes inside `.worktrees/STORY-NNN-NN/` on its own branch; merge back to sprint branch after
**Out:**
- **DevOps agent as a fifth role.** We keep the four-agent contract. Merge + post-merge validation stays with Developer (extended checklist) and orchestrator. Re-evaluate after this epic ships.

[+5,070 bytes not shown — read .cleargate/delivery/archive/EPIC-013_Execution_Phase_v2.md]

## Architecture rules
- Do NOT replace the four-agent contract (architect/developer/qa/reporter). DevOps + Scribe are OUT OF SCOPE for v2; optional split stays future work.
- Do NOT touch MCP adapter, wiki ingest/lint, or scaffold manifest surfaces. This epic is execution-loop only.

[+378 bytes not shown — read .cleargate/delivery/archive/EPIC-013_Execution_Phase_v2.md]

## Decisions
- Should we retro-draft **PROPOSAL-010** before decomposing this epic? The protocol (§2.5 of `cleargate-protocol.md`) requires a Proposal as Gate 1 for… → Skip the retro-proposal. Approve EPIC-013 directly. Intent here is sharp ("port V-Bounce execution patterns, cite each reference"); drafting a proposal would restate §4.2 back as prose.

[+2,901 bytes not shown — read .cleargate/delivery/archive/EPIC-013_Execution_Phase_v2.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (35): [[BUG-002]], [[BUG-005]], [[BUG-026]], [[BUG-029]], [[CR-014]], [[CR-037]], [[CR-039]], [[CR-042]], [[CR-043]], [[CR-044]], [[CR-045]], [[CR-046]], [[CR-047]], [[CR-048]], [[CR-049]], [[CR-050]], [[CR-051]], [[CR-052]], [[CR-053]], [[CR-054]], +15 more
- Cited by (1): [[PROPOSAL-074]]
<!-- END relations -->
