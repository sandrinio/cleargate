---
type: epic
id: "EPIC-059"
parent: ""
children: 
  - "[[STORY-059-01]]"
  - "[[STORY-059-02]]"
  - "[[STORY-059-03]]"
  - "[[STORY-059-04]]"
cites: 
  - "[[BUG-052]]"
  - "[[BUG-109]]"
  - "[[BUG-113]]"
  - "[[CR-090]]"
  - "[[CR-124]]"
  - "[[EPIC-030]]"
  - "[[STORY-031-04]]"
  - "[[STORY-059-01]]"
  - "[[STORY-059-02]]"
  - "[[STORY-059-03]]"
  - "[[STORY-059-04]]"
cited_by: 
  - "[[BUG-052]]"
  - "[[CR-131]]"
  - "[[EPIC-060]]"
  - "[[STORY-060-01]]"
  - "[[STORY-060-02]]"
  - "[[STORY-060-04]]"
  - "[[STORY-060-05]]"
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-059_planning_catches_what_execution_stopped_for.md"
last_ingest: "2026-11-12T21:25:29.802Z"
last_ingest_commit: "7ba61eb5110056cbc5302b31b3248bf5e2331090"
repo: "planning"
sprint_cleargate_id: "SPRINT-42"
---

# EPIC-059: Planning Catches What Execution Stopped For

**Status:** Draft · **Sprint:** SPRINT-42 · **Gate:** pass

## Objective
Add four short process rules to the canonical scaffold, learned from a downstream sprint, so that conflicts already present in story drafts surface once at plan confirmation instead of as mid-sprint halts.

## Problem & Value
**Why are we doing this?**
Kurnera, a downstream install on cleargate 0.26.1, ran a sprint in which four of six UI stories stopped mid-sprint for an owner decision. Every one of those conflicts was already in the story text when it was written. The same sprint showed four more gaps no ClearGate rule covers. Test data piled up because no story owned its cleanup. A merged guard's failure stayed hidden until the Developer hit it. A tool defect was worked around for the whole sprint and never filed. And the owner's walkthrough ran on the dev server, not on the build the tests verify. Kurnera fixed what lives in its own files.

[+1,021 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-059_planning_catches_what_execution_stopped_for.md]

## Scope
**In:**
- [ ] **Rule 1, draft reviewers** ([[STORY-059-01]]): an optional `sprint.draft_reviewers` list of agent names in `.cleargate/config.yml`, documented as a commented example in `config.example.yml`. Reviewers are agent names in the target's `.claude/agents/`; ClearGate ships none.
**Out:**
- A designer agent, or any domain reviewer shipped in the scaffold. ClearGate ships the hook point; the target repo brings its own reviewer agents.
- A readiness predicate that blocks a sprint plan missing §2.6. The table is advisory in this epic.
- The surface-gate story resolution defect behind Kurnera's BUG-006.

[+1,782 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-059_planning_catches_what_execution_stopped_for.md]

## Architecture rules
- Text and template changes only. No new script, agent, CLI command or readiness predicate.
- Canonical edits land in cleargate-cli/scaffold/** on a story branch in the cleargate-cli repo; the live .claude/ and .cleargate/ mirrors are updated in the same story and diffed for parity.
- Every new behaviour is optional or defaults to today's behaviour: an empty draft-reviewer list changes nothing.
- Do not edit cleargate-planning/** (frozen since STORY-058-01).

## Decisions
_(empty — three questions resolved by the owner 2026-10-08; answers integrated into §2 Rules 1 and 3, §3 and §4.)_

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (4): [[STORY-059-01]], [[STORY-059-02]], [[STORY-059-03]], [[STORY-059-04]]
- Cites (11): [[BUG-052]], [[BUG-109]], [[BUG-113]], [[CR-090]], [[CR-124]], [[EPIC-030]], [[STORY-031-04]], [[STORY-059-01]], [[STORY-059-02]], [[STORY-059-03]], [[STORY-059-04]]
- Cited by (7): [[BUG-052]], [[CR-131]], [[EPIC-060]], [[STORY-060-01]], [[STORY-060-02]], [[STORY-060-04]], [[STORY-060-05]]
<!-- END relations -->
