---
type: epic
id: "EPIC-060"
parent: ""
children: 
  - "[[STORY-060-01]]"
  - "[[STORY-060-02]]"
  - "[[STORY-060-03]]"
  - "[[STORY-060-04]]"
  - "[[STORY-060-05]]"
cites: 
  - "[[CR-033]]"
  - "[[CR-122]]"
  - "[[EPIC-058]]"
  - "[[EPIC-059]]"
  - "[[STORY-060-01]]"
  - "[[STORY-060-02]]"
  - "[[STORY-060-03]]"
  - "[[STORY-060-04]]"
  - "[[STORY-060-05]]"
cited_by: 
  - "[[CR-126]]"
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-060_fresh_context_review_before_approval.md"
last_ingest: "2026-11-13T01:02:08.963Z"
last_ingest_commit: "bb1a2f5a6006132248a8aab767d91be6d2fba9c1"
repo: "planning"
---

# EPIC-060: Fresh-Context Review Before Approval

**Status:** Draft · **Sprint:** none · **Gate:** pass

## Objective
Before the owner approves an epic or CR, and before a sprint's stories execute, have read-only reviewer agents that never saw the drafting conversation check the draft, and record how each of their findings was handled.

## Problem & Value
**Why are we doing this?**
The agent that drafts a work item also ticks its own Ambiguity Gate and writes the Brief. The readiness predicates check that sections exist, not that what they say holds up: `simplest-form-justified` passes when the `## Why not simpler?` heading is present. So the owner is the only reader who did not write the draft. Google's Elephant-Goldfish Model (EGM) is built on the same observation: a reviewer that shares the author's context tends to confirm the author's assumptions.

[+1,556 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-060_fresh_context_review_before_approval.md]

## Scope
**In:**
- [ ] **Reviewer agents** ([[STORY-060-01]]): `cleargate-review-simplicity` (unneeded features, reuse checked by code search, symptom-vs-cause, epic prose sliding into code detail) and `cleargate-review-clarity` (a reader who knows nothing about the
**Out:**
- EGM's five-stage review pipeline with a checkpoint after each stage. One parallel pass, one record.
- EGM's brainstorm and bootstrap skills (directory-README generation overlaps the code-map and wiki).
- EGM's "one question at a time" rule.

[+2,325 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-060_fresh_context_review_before_approval.md]

## Architecture rules
- A reviewer receives the target file path and nothing from the drafting conversation. On Claude Code it runs with omitClaudeMd: true and tools Read, Grep, Glob.
- Reviewer prompt text is written for ClearGate. The approach comes from Google's Elephant-Goldfish Model (Apache-2.0); do not copy its prompt text into the MIT-licensed cleargate-cli. Each reviewer file credits EGM with a link.
- No new gate.

[+696 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-060_fresh_context_review_before_approval.md]

## Decisions
_(empty — two questions resolved by the owner 2026-10-28: epics and CRs get the Gate-1 review, and the drafting agent applies fixes before the Brief. Answers integrated into §2, the STORY-060-02 bullet and Out-of-scope.)_

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (5): [[STORY-060-01]], [[STORY-060-02]], [[STORY-060-03]], [[STORY-060-04]], [[STORY-060-05]]
- Cites (9): [[CR-033]], [[CR-122]], [[EPIC-058]], [[EPIC-059]], [[STORY-060-01]], [[STORY-060-02]], [[STORY-060-03]], [[STORY-060-04]], [[STORY-060-05]]
- Cited by (1): [[CR-126]]
<!-- END relations -->
