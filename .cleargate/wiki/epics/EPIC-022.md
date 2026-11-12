---
type: epic
id: "EPIC-022"
parent: ""
children: 
  - "[[STORY-022-01]]"
  - "[[STORY-022-02]]"
  - "[[STORY-022-03]]"
  - "[[STORY-022-04]]"
  - "[[STORY-022-05]]"
  - "[[STORY-022-06]]"
  - "[[STORY-022-07]]"
  - "[[STORY-022-08]]"
  - "[[STORY-099-01]]"
cites: []
cited_by: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-022_Sprint_Lane_Classifier_And_Hotfix_Path.md"
last_ingest: "2026-11-12T20:33:09.611Z"
last_ingest_commit: "2691d20a51eb6e8211a9ec862c0ec0ddf8c09601"
repo: "planning"
sprint_cleargate_id: "SPRINT-14"
---

# EPIC-022: Sprint Planning Lane Classifier + Hotfix Path

**Status:** Completed · **Sprint:** SPRINT-14 · **Gate:** pass

## Objective
Add an Architect-judged lane classifier to Sprint Planning v2 that tags each story with one of {standard, fast, hotfix}; route the four-agent loop accordingly; auto-demote on failure; surface metrics and audit tables in the Sprint Report; preserve the existing four-agent contract (no DevOps role split).

## Problem & Value
**Why are we doing this?**

SPRINT-12 and SPRINT-13 each carried ≥1 story (BUG-006, BUG-007, CR-007 ResendMailer swap) that went through the full architect → developer → QA → reporter loop despite being a single-file fix with deterministic verification. Token spend ~30–60k per item, with zero correction signal in the QA bounces — the loop was theatre. EPIC-013 §2 punted a fast-track lane with the rationale *"formalize only if metrics show cost"* — those metrics now exist. PROPOSAL-013 (approved 2026-04-26) is the response.

[+1,355 bytes not shown — read .cleargate/delivery/archive/EPIC-022_Sprint_Lane_Classifier_And_Hotfix_Path.md]

## Scope
**In:**
- [ ] Architect Lane Classification: rubric (PROPOSAL-013 §2.3, seven checks) lands in `.claude/agents/architect.md` and `.cleargate/knowledge/cleargate-protocol.md` §14 (new). Both surfaces stay in sync — protocol is the spec, agent file is the runtime instruction.
**Out:**
- DevOps agent split. EPIC-013 Q5 deferred this; EPIC-022 keeps merge inside Developer's extended checklist regardless of lane. Re-evaluate after 2 sprints on this epic.
- Automatic lane assignment without human confirmation.

[+5,423 bytes not shown — read .cleargate/delivery/archive/EPIC-022_Sprint_Lane_Classifier_And_Hotfix_Path.md]

## Architecture rules
- Pre-gate scanner is NEVER skipped, regardless of lane. Mechanical correctness is non-negotiable.
- Four-agent contract preserved. No new agent. Lane routing happens inside the existing Architect (judges) + Developer (executes lane-aware) + QA (skipped on lane=fast) + Reporter (audits) loop.
- Demotion is one-way: a story can demote `fast → standard` mid-sprint but NEVER promote `standard → fast`. Lane is decided once at Sprint Planning v2 Gate 2.
- Hotfix lane is OFF-SPRINT only.

[+1,361 bytes not shown — read .cleargate/delivery/archive/EPIC-022_Sprint_Lane_Classifier_And_Hotfix_Path.md]

## Decisions
§6 is empty. No outstanding questions. Epic is 🟢.

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (9): [[STORY-022-01]], [[STORY-022-02]], [[STORY-022-03]], [[STORY-022-04]], [[STORY-022-05]], [[STORY-022-06]], [[STORY-022-07]], [[STORY-022-08]], [[STORY-099-01]]
<!-- END relations -->
