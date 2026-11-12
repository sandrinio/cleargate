---
type: sprint
id: "SPRINT-34"
parent: ""
children: []
cites: []
cited_by: 
  - "[[EPIC-058]]"
  - "[[SPRINT-41]]"
  - "[[STORY-058-01]]"
  - "[[STORY-058-02]]"
  - "[[STORY-058-03]]"
  - "[[STORY-058-04]]"
  - "[[STORY-058-05]]"
  - "[[STORY-058-06]]"
  - "[[STORY-058-07]]"
  - "[[STORY-058-08]]"
  - "[[STORY-058-09]]"
  - "[[STORY-058-10]]"
  - "[[STORY-058-11]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-34_Polyglot_Portability_Hardening.md"
last_ingest: "2026-11-12T19:31:58.580Z"
last_ingest_commit: "a06160cd6d6b5743501f46d7a77155617b88a5b1"
repo: "planning"
sprint_cleargate_id: "SPRINT-34"
report_raw_path: ".cleargate/sprint-runs/SPRINT-34/SPRINT-34_REPORT.md"
last_report_ingest_commit: "a06160cd6d6b5743501f46d7a77155617b88a5b1"
---

# SPRINT-34: Polyglot Portability Hardening

**Status:** Completed · **Sprint:** SPRINT-34 · **Gate:** pass

## Goal
Harden ClearGate so a fresh install runs a sprint end-to-end on an arbitrary (non-node, worktree-isolated) target repo without orchestrator hand-fixes — fixing the 11 portability/loop defects the SPRINT-66 polyglot dogfood surfaced — and ship the two carried hygiene CRs.

## Deliverables
*(Eight CRs. CR-077…082 are EPIC-045 children (SPRINT-66 portability/loop findings F1–F11); CR-075/CR-076 are EPIC-043 hygiene CRs carried from SPRINT-33.)*

| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure |
|---|---|---|---|---|---|
| `CR-077` | Repo-derived test conventions + gate commands (F3 + F6) | standard | M1 | y | high |
| `CR-079` | Worktree config provisioning (F4 + F7) | standard | M1 | y | med |
| `CR-080` | Script-wrapper path + env correctness (F5 + F8) | fast | M1 | y | low |
| `CR-078` | init_sprint sets `.active` + applies lane audit (F1 + F2) | fast | M2 | y | med |
| `CR-081` | QA-loop semantic-fixture lint + red-now-green (F9 + F10) | standard | M3 | n | high |
| `CR-082` | Deferred-verification tracking + close gate (F11) | standard | M3 | n | med |
| `CR-075` | cleargate-cli standalone test suite (carried, EPIC-043) | standard | M4 | y | med |
| `CR-076` | Trim published npm package (carried, EPIC-043) | standard | M4 | y | low |

<!-- BEGIN relations -->
## Relations
- Parent: none
- Cited by (13): [[EPIC-058]], [[SPRINT-41]], [[STORY-058-01]], [[STORY-058-02]], [[STORY-058-03]], [[STORY-058-04]], [[STORY-058-05]], [[STORY-058-06]], [[STORY-058-07]], [[STORY-058-08]], [[STORY-058-09]], [[STORY-058-10]], [[STORY-058-11]]
<!-- END relations -->
<!-- BEGIN sprint-report -->
## Sprint Report
**Report status:** Shipped · **Report:** .cleargate/sprint-runs/SPRINT-34/SPRINT-34_REPORT.md · **Improvement suggestions:** .cleargate/sprint-runs/SPRINT-34/improvement-suggestions.md

### Carried Over
- None. All 8 stories reached Done.
<!-- END sprint-report -->
