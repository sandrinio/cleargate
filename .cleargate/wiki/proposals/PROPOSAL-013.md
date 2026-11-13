---
type: proposal
id: "PROPOSAL-013"
parent: ""
children: []
cites: []
cited_by: 
  - "[[EPIC-030]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/PROPOSAL-013_Sprint_Planning_Fast_Track.md"
last_ingest: "2026-11-13T01:02:08.963Z"
last_ingest_commit: "e2fef1f5c8d58f66c94aa3418a1150ece11573d2"
repo: "planning"
sprint_cleargate_id: "SPRINT-12"
---

# PROPOSAL-013: Sprint Planning Fast-Track Lane

**Status:** Completed · **Sprint:** SPRINT-12 · **Gate:** pass

## Initiative & Context
### 1.1 Objective

Add an AI-judged **lane classifier** to ClearGate's Sprint Planning v2 phase that tags each decomposed story with one of three lanes — `standard` (default; full architect → developer → QA loop), `fast` (skips Architect plan + QA gate; relies on pre-gate scanner + post-merge sprint-branch tests), or `hotfix` (off-sprint; CR-style; Dev → user manual verify → merge). The Architect proposes lanes during Sprint Design Review; the human confirms at Gate 2; the orchestrator routes accordingly during execution.

[+4,060 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-013_Sprint_Planning_Fast_Track.md]

## Technical Architecture & Constraints
### 2.1 Lane definitions

| Lane | Triage timing | Architect plan | QA gate | Pre-gate scanner | Post-merge test on sprint branch | Demotion path |
|---|---|---|---|---|---|---|
| `standard` | Sprint Planning v2 (default) | ✅ written | ✅ spawned | ✅ runs | ✅ runs | n/a |

[+12,487 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-013_Sprint_Planning_Fast_Track.md]

## Scope Impact (Touched Files & Data)
### 3.1 Known Files (modified)

- `.claude/agents/architect.md` — append § Lane Classification (the §2.3 rubric, the §2.2 Sprint Design Review tail step, the rationale-emission contract).
- `.claude/agents/developer.md` — append § Lane-Aware Execution: read `lane` from state.json on spawn; if `lane: fast`, skip writing the architect-plan-citation block (no plan exists); demotion handler that resets state.json on pre-gate or post-merge failure.

[+3,976 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-013_Sprint_Planning_Fast_Track.md]

## Open Questions for Human Confirmation
These are genuinely undecided and should land in the resulting Epic's §6 AI Interrogation Loop. Listing here so they don't get lost between Gate 1 (this proposal's approval) and Gate 2 (epic decomposition).

1. **Should lane assignment be available to Bugs, or stories only?** A trivial bug (typo, copy fix) is the strongest fast-track candidate, but bugs already have a lighter triage. Recommendation: yes, extend `lane` to bug frontmatter too — same rubric, same demotion path. Confirm or override.
2.

[+1,513 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-013_Sprint_Planning_Fast_Track.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Cited by (1): [[EPIC-030]]
<!-- END relations -->
