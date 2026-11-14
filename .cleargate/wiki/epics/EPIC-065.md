---
type: epic
id: "EPIC-065"
parent: "[[INITIATIVE-002]]"
children: []
cites: 
  - "[[BUG-054]]"
  - "[[BUG-066]]"
  - "[[BUG-113]]"
  - "[[CR-082]]"
  - "[[CR-110]]"
  - "[[CR-111]]"
  - "[[CR-126]]"
  - "[[CR-128]]"
  - "[[CR-129]]"
  - "[[EPIC-056]]"
  - "[[EPIC-058]]"
  - "[[INITIATIVE-002]]"
cited_by: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-065_proof_decides_done.md"
last_ingest: "2026-11-14T19:10:53.964Z"
last_ingest_commit: ""
repo: "planning"
parent_cleargate_id: "INITIATIVE-002"
---

# EPIC-065: Proof Decides Done

**Status:** Draft · **Sprint:** none · **Gate:** fail: interrogation-resolved

## Objective
Every sprint goal and every story, CR and bug declares a proof tier (unit, container, live, human) and how it is proven; a script records the proof as an evidence file; an item reaches Done only when evidence for its declared tier exists; sprint close and the report show, per item and for the goal, the tier promised and the evidence produced, or "built, not proven at tier X".

## Problem & Value
**Why are we doing this?**
In every repository that runs ClearGate, "QA passed" is not the same as "it works". doc_processor
found about 130 bugs at owner walkthroughs against about 35 QA bounces; new_app found more than 70
defects in live runs after every agent check passed; this repository found about 47 bugs only by
real runs (INITIATIVE-002, "Evidence this rests on"). Where a real-run check existed, escapes fell.

[+1,109 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-065_proof_decides_done.md]

## Scope
**In:**
- [ ] Tier vocabulary `unit | container | live | human`, declared on the sprint goal (Goal
      Acceptance Check) and on every story, CR and bug (frontmatter `proof_tier` plus a `## Proof`
      section:
**Out:**
- Building a browser harness for any repository (only the config hook that runs one if present).
- The CI verification layer (EPIC-056) and environment independence of the container tier.

[+2,508 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-065_proof_decides_done.md]

## Architecture rules
- Generalise what exists, do not add a parallel mechanism: the evidence file generalises CR-082's deferred-verify/&lt;ID&gt;.json; the goal tier extends CR-110's Goal Acceptance Check; "merged, awaiting proof" uses the existing `Sprint Review` state in constants.mjs.
- Evidence is written only by `record_evidence.mjs`, never hand-authored by an agent.

[+658 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-065_proof_decides_done.md]

## Open questions
- Tier names. Recommended: `unit` (the repo's own test runner, no outside services), `container` (real dependencies started for the run: a database, docker compose, an end-to-end make target), `live` (a live service, device or real host session the agents can reach), `human` (the owner's check is the evidence). Keep these four?
- Where an item declares its proof.

[+2,414 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-065_proof_decides_done.md]

<!-- BEGIN relations -->
## Relations
- Parent: [[INITIATIVE-002]]
- Cites (12): [[BUG-054]], [[BUG-066]], [[BUG-113]], [[CR-082]], [[CR-110]], [[CR-111]], [[CR-126]], [[CR-128]], [[CR-129]], [[EPIC-056]], [[EPIC-058]], [[INITIATIVE-002]]
<!-- END relations -->
