---
type: epic
id: "EPIC-065"
parent: "[[INITIATIVE-002]]"
children: 
  - "[[STORY-065-01]]"
  - "[[STORY-065-02]]"
  - "[[STORY-065-03]]"
  - "[[STORY-065-04]]"
  - "[[STORY-065-05]]"
  - "[[STORY-065-06]]"
cites: 
  - "[[BUG-054]]"
  - "[[BUG-066]]"
  - "[[BUG-075]]"
  - "[[BUG-113]]"
  - "[[CR-082]]"
  - "[[CR-110]]"
  - "[[CR-111]]"
  - "[[CR-126]]"
  - "[[CR-128]]"
  - "[[CR-129]]"
  - "[[EPIC-056]]"
  - "[[EPIC-058]]"
  - "[[EPIC-066]]"
  - "[[INITIATIVE-002]]"
cited_by: 
  - "[[EPIC-066]]"
  - "[[SPRINT-46]]"
  - "[[SPRINT-47]]"
  - "[[STORY-065-01]]"
  - "[[STORY-065-02]]"
  - "[[STORY-065-03]]"
  - "[[STORY-065-04]]"
  - "[[STORY-065-05]]"
  - "[[STORY-065-06]]"
  - "[[STORY-066-03]]"
  - "[[STORY-066-04]]"
  - "[[STORY-066-05]]"
  - "[[STORY-066-06]]"
  - "[[STORY-066-07]]"
  - "[[STORY-066-09]]"
  - "[[STORY-066-18]]"
  - "[[STORY-066-22]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-065_proof_decides_done.md"
last_ingest: "2026-11-17T10:51:24.246Z"
last_ingest_commit: "7bef129d7f8f48786f094c50f38a1b1e0f509be7"
repo: "planning"
last_contradict_sha: "6cf4b7f1365529740a7d5fcebbef5735f4403ecdab53373d049827c42a468beb"
parent_cleargate_id: "INITIATIVE-002"
---

# EPIC-065: Proof Decides Done

**Status:** Completed · **Sprint:** none · **Gate:** pass

## Objective
Every sprint goal and every story, CR and bug declares a proof tier (unit, container, live, human) and how it is proven; a script records the proof as an evidence file; an item reaches Done only when evidence for its declared tier exists; sprint close and the report show, per item and for the goal, the tier promised and the evidence produced, or "built, not proven at tier X".

## Problem & Value
**Why are we doing this?**
In every repository that runs ClearGate, "QA passed" is not the same as "it works". doc_processor
found about 130 bugs at owner walkthroughs against about 35 QA bounces; new_app found more than 70
defects in live runs after every agent check passed; this repository found about 47 bugs only by
real runs (INITIATIVE-002, "Evidence this rests on").

[+1,155 bytes not shown — read .cleargate/delivery/archive/EPIC-065_proof_decides_done.md]

## Scope
**In:**
- [ ] Tier vocabulary `unit | container | live | human`, declared on the sprint goal (Goal
      Acceptance Check) and on every story, CR and bug (frontmatter `proof_tier` plus a `## Proof`
      section:
**Out:**
- Building a browser harness for any repository (only the config hook that runs one if present).
- The CI verification layer (EPIC-056) and environment independence of the container tier.

[+2,472 bytes not shown — read .cleargate/delivery/archive/EPIC-065_proof_decides_done.md]

## Architecture rules
- Generalise what exists, do not add a parallel mechanism: the evidence file generalises CR-082's deferred-verify/&lt;ID&gt;.json; the goal tier extends CR-110's Goal Acceptance Check; "merged, awaiting proof" uses the existing `Sprint Review` state in constants.mjs.
- Evidence is written only by `record_evidence.mjs`, never hand-authored by an agent.

[+658 bytes not shown — read .cleargate/delivery/archive/EPIC-065_proof_decides_done.md]

## Decisions
- Tier names. Recommended: `unit` (the repo's own test runner, no outside services), `container` (real dependencies started for the run: a… → As recommended (owner, 2026-11-16: "happy with recommendations"). The four tiers are `unit` (the repo's own test runner, no outside services), `container` (real dependencies started for the run: a database, docker compose, an end-to-end make target), `live` (a live service, device

[+3,300 bytes not shown — read .cleargate/delivery/archive/EPIC-065_proof_decides_done.md]

<!-- BEGIN relations -->
## Relations
- Parent: [[INITIATIVE-002]]
- Children (6): [[STORY-065-01]], [[STORY-065-02]], [[STORY-065-03]], [[STORY-065-04]], [[STORY-065-05]], [[STORY-065-06]]
- Cites (14): [[BUG-054]], [[BUG-066]], [[BUG-075]], [[BUG-113]], [[CR-082]], [[CR-110]], [[CR-111]], [[CR-126]], [[CR-128]], [[CR-129]], [[EPIC-056]], [[EPIC-058]], [[EPIC-066]], [[INITIATIVE-002]]
- Cited by (17): [[EPIC-066]], [[SPRINT-46]], [[SPRINT-47]], [[STORY-065-01]], [[STORY-065-02]], [[STORY-065-03]], [[STORY-065-04]], [[STORY-065-05]], [[STORY-065-06]], [[STORY-066-03]], [[STORY-066-04]], [[STORY-066-05]], [[STORY-066-06]], [[STORY-066-07]], [[STORY-066-09]], [[STORY-066-18]], [[STORY-066-22]]
<!-- END relations -->
