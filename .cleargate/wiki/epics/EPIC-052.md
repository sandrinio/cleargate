---
type: epic
id: "EPIC-052"
parent: ""
children: []
cites: 
  - "[[CR-063]]"
  - "[[CR-103]]"
  - "[[CR-126]]"
  - "[[EPIC-032]]"
  - "[[EPIC-043]]"
  - "[[PROPOSAL-002]]"
  - "[[STORY-032-02]]"
  - "[[STORY-043-07]]"
cited_by: 
  - "[[BUG-042]]"
  - "[[CR-103]]"
  - "[[CR-104]]"
  - "[[CR-109]]"
  - "[[CR-123]]"
  - "[[EPIC-053]]"
  - "[[EPIC-054]]"
  - "[[EPIC-063]]"
  - "[[STORY-054-05]]"
  - "[[STORY-054-06]]"
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-052_Requirement_Level_Grounding.md"
last_ingest: "2026-11-12T20:33:09.611Z"
last_ingest_commit: "d3ca3bef420c543e8cc459e9333b736e15a556ba"
repo: "planning"
---

# EPIC-052: Requirement-Level Grounding — Make "Is This Shipped?" Answerable

**Status:** Draft · **Sprint:** none · **Gate:** pass

## Objective
Make every requirement in an Epic, Story, CR, Bug, or Initiative carry a machine-checked status + code citation + locking test, and detect when those citations go stale.

## Problem & Value
**Why are we doing this?**

The planning layer can say an item *exists*. It cannot say whether the thing the item describes is *shipped*. Today that answer is reconstructed by hand — read the raw item, grep the source, guess — and the reconstruction is thrown away each time.

[+2,006 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-052_Requirement_Level_Grounding.md]

## Scope
**In:**
- [ ] **WS1 — Grounding table as template contract, with an explicit lifecycle.** Add a `## Grounding` section to **all five work-item templates** — `.cleargate/templates/{epic,story,CR,Bug,initiative}.md` (+ the `cleargate-planning/` mirrors), per D2.
**Out:**
- **A `cleargate research` command.** Evaluated and rejected during drafting: its chain decomposes into one existing command (`wiki query`), one file Read, one check that is WS3, and one existing subagent (`cleargate-wiki-query`).

[+9,330 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-052_Requirement_Level_Grounding.md]

## Architecture rules
- Must extend the existing readiness-predicate registry in cleargate-cli/src/lib/readiness-predicates.ts — mirror the closed-set shape of prior-work-recorded (:124), do not invent a parallel validation path.
- Must extend the existing wiki lint pass in cleargate-cli/src/wiki/lint-checks.ts — evidence verification is a lint check, NOT a new top-level command.
- Evidence is ranked: executing a row's locking test is proof; resolving its file::symbol is only a staleness tripwire.

[+1,028 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-052_Requirement_Level_Grounding.md]

## Decisions
_Empty — the loop is closed. All seven questions were answered by the owner on 2026-08-06 and their
decisions are integrated into §2 (workstreams), §3 (constraints), §4 (affected files), and §5
(acceptance criteria). The audit trail is preserved below under **Resolved Decisions**._

<!-- BEGIN relations -->
## Relations
- Parent: none
- Cites (8): [[CR-063]], [[CR-103]], [[CR-126]], [[EPIC-032]], [[EPIC-043]], [[PROPOSAL-002]], [[STORY-032-02]], [[STORY-043-07]]
- Cited by (10): [[BUG-042]], [[CR-103]], [[CR-104]], [[CR-109]], [[CR-123]], [[EPIC-053]], [[EPIC-054]], [[EPIC-063]], [[STORY-054-05]], [[STORY-054-06]]
<!-- END relations -->
