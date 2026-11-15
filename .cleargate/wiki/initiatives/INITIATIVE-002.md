---
type: initiative
id: "INITIATIVE-002"
parent: ""
children: 
  - "[[EPIC-064]]"
  - "[[EPIC-065]]"
  - "[[EPIC-066]]"
cites: 
  - "[[BUG-052]]"
  - "[[BUG-062]]"
  - "[[BUG-068]]"
  - "[[BUG-069]]"
  - "[[BUG-114]]"
  - "[[BUG-117]]"
  - "[[BUG-129]]"
  - "[[CR-024]]"
  - "[[CR-077]]"
  - "[[CR-082]]"
  - "[[CR-091]]"
  - "[[CR-106]]"
  - "[[CR-110]]"
  - "[[CR-111]]"
  - "[[CR-115]]"
  - "[[CR-119]]"
  - "[[CR-120]]"
  - "[[CR-121]]"
  - "[[CR-124]]"
  - "[[CR-125]]"
  - "[[CR-126]]"
  - "[[CR-128]]"
  - "[[CR-129]]"
  - "[[CR-130]]"
  - "[[CR-132]]"
  - "[[EPIC-013]]"
  - "[[EPIC-022]]"
  - "[[EPIC-030]]"
  - "[[EPIC-031]]"
  - "[[EPIC-032]]"
  - "[[EPIC-043]]"
  - "[[EPIC-044]]"
  - "[[EPIC-045]]"
  - "[[EPIC-054]]"
  - "[[EPIC-055]]"
  - "[[EPIC-056]]"
  - "[[EPIC-058]]"
  - "[[EPIC-059]]"
  - "[[EPIC-060]]"
  - "[[SPRINT-42]]"
  - "[[SPRINT-43]]"
cited_by: 
  - "[[EPIC-065]]"
  - "[[EPIC-066]]"
  - "[[SPRINT-46]]"
  - "[[STORY-066-05]]"
status: "Triaged"
remote_id: ""
raw_path: ".cleargate/delivery/archive/INITIATIVE-002_evidence_first_execution_loop.md"
last_ingest: "2026-11-15T21:31:06.985Z"
last_ingest_commit: "ccd4e95e1f4598758cf5dddd36759cf74a5b9fd6"
repo: "planning"
---

# INITIATIVE-002: Evidence-First Execution Loop

**Status:** Triaged · **Sprint:** none · **Gate:** pass

## User Flow
Happy path, from the owner's side:

1. **Plan.** The owner states a sprint goal.

[+1,575 bytes not shown — read .cleargate/delivery/archive/INITIATIVE-002_evidence_first_execution_loop.md]

## Diagrams
```
 goal ──► proof named (tier) ──► roster fixed ──► build ──► evidence for tier? ──► Done
                                      ▲
```

[+301 bytes not shown — read .cleargate/delivery/archive/INITIATIVE-002_evidence_first_execution_loop.md]

## End-to-End Verbal Description
Change the sprint loop so that proof, not process, decides when work is done.

[+868 bytes not shown — read .cleargate/delivery/archive/INITIATIVE-002_evidence_first_execution_loop.md]

## Business Outcome
Sprints that report "shipped" are shipped: fewer defects reach the owner's walkthrough or a
published release, small work costs less, and the sprint report can be trusted without a recount.

## Success Criteria
Measured on the first three sprints run on a release carrying this work, in this repository and in
one pilot field repository.

[+962 bytes not shown — read .cleargate/delivery/archive/INITIATIVE-002_evidence_first_execution_loop.md]

## Open Questions for AI Triage
All nine were decided by the owner on 2026-11-14 ("all accepted"): each recommendation stands.

[+2,086 bytes not shown — read .cleargate/delivery/archive/INITIATIVE-002_evidence_first_execution_loop.md]

## Evidence this rests on
Read on 2026-11-14 from the reports' own tables. Other repositories' sprints are written as
"<repo> sprint N" on purpose: their IDs are not this

[+2,967 bytes not shown — read .cleargate/delivery/archive/INITIATIVE-002_evidence_first_execution_loop.md]

## Proposed decomposition
Candidate epics, not yet drafted. Each lists the open or shipped work it must absorb, extend or
leave alone.

[+2,217 bytes not shown — read .cleargate/delivery/archive/INITIATIVE-002_evidence_first_execution_loop.md]

## Prior work
Wiki query run 2026-11-14. The redesign does not start from zero.

- Self-review and loop redesign: [[EPIC-043]], [[EPIC-044]], [[EPIC-013]], [[CR-124]]

[+884 bytes not shown — read .cleargate/delivery/archive/INITIATIVE-002_evidence_first_execution_loop.md]

## Existing Surfaces
- Loop specification: `.claude/skills/sprint-execution/SKILL.md` (canonical in

[+749 bytes not shown — read .cleargate/delivery/archive/INITIATIVE-002_evidence_first_execution_loop.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (3): [[EPIC-064]], [[EPIC-065]], [[EPIC-066]]
- Cites (41): [[BUG-052]], [[BUG-062]], [[BUG-068]], [[BUG-069]], [[BUG-114]], [[BUG-117]], [[BUG-129]], [[CR-024]], [[CR-077]], [[CR-082]], [[CR-091]], [[CR-106]], [[CR-110]], [[CR-111]], [[CR-115]], [[CR-119]], [[CR-120]], [[CR-121]], [[CR-124]], [[CR-125]], +21 more
- Cited by (4): [[EPIC-065]], [[EPIC-066]], [[SPRINT-46]], [[STORY-066-05]]
<!-- END relations -->
