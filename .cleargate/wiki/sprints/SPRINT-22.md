---
type: sprint
id: "SPRINT-22"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-22_SDLC_Hardening.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "92e11546669fc72e6d1524d91f6aee2ee2d0f6d1"
repo: "planning"
---

# SPRINT-22: SDLC Hardening — Test discipline + Role refinement

## 0. Stakeholder Brief

> Sponsor-readable summary.

- **Sprint Goal:** Make the four-agent loop disciplined: adopt TDD Red/Green via existing-`qa.md`-with-mode-dispatch (CR-043), split DevOps from the orchestrator into a new sonnet-tier agent (CR-044), and fix one inaccurate reporter prompt claim from SPRINT-21 (CR-042).
- **Business Outcome:** Future sprints run with structurally-prevented α-class defects (test author ≠ impl author at the dispatch level), with the orchestrator narrowed to plan/dispatch/halt (no merge/cleanup/state-mutation), and with the reporter prompt aligned to actual session-id behavior. Net expected impact on SPRINT-23+: ~30-40% wall-clock reduction per story.
- **Risks (top 3):**
  1. **CR-043 + CR-044 both restructure the four-agent contract.** CR-043 inserts QA-Red dispatch before Dev (using existing `qa.md` agent in mode-dispatch shape); CR-044 adds DevOps after QA-Verify. SKILL.md §C is rewritten in disjoint subsections by both. Mitigation: serialize merge order in §2.2 + Architect SDR pre-locks line ranges.
  2.

[+17,885 bytes not shown — read .cleargate/delivery/archive/SPRINT-22_SDLC_Hardening.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
