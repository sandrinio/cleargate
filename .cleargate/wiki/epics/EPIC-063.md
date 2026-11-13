---
type: epic
id: "EPIC-063"
parent: ""
children: 
  - "[[CR-127]]"
  - "[[CR-129]]"
  - "[[CR-130]]"
  - "[[STORY-063-01]]"
  - "[[STORY-063-02]]"
  - "[[STORY-063-03]]"
  - "[[STORY-063-04]]"
  - "[[STORY-063-05]]"
  - "[[STORY-063-06]]"
  - "[[STORY-063-07]]"
  - "[[STORY-063-08]]"
  - "[[STORY-063-09]]"
  - "[[STORY-063-10]]"
  - "[[STORY-063-11]]"
  - "[[STORY-063-12]]"
  - "[[STORY-063-13]]"
cites: 
  - "[[BUG-085]]"
  - "[[BUG-086]]"
  - "[[CR-063]]"
  - "[[CR-093]]"
  - "[[CR-103]]"
  - "[[CR-112]]"
  - "[[CR-126]]"
  - "[[EPIC-015]]"
  - "[[EPIC-020]]"
  - "[[EPIC-024]]"
  - "[[EPIC-052]]"
  - "[[PROPOSAL-012]]"
cited_by: 
  - "[[BUG-126]]"
  - "[[CR-126]]"
  - "[[CR-127]]"
  - "[[CR-128]]"
  - "[[CR-129]]"
  - "[[CR-130]]"
  - "[[STORY-063-01]]"
  - "[[STORY-063-02]]"
  - "[[STORY-063-03]]"
  - "[[STORY-063-04]]"
  - "[[STORY-063-05]]"
  - "[[STORY-063-06]]"
  - "[[STORY-063-07]]"
  - "[[STORY-063-08]]"
  - "[[STORY-063-09]]"
  - "[[STORY-063-10]]"
  - "[[STORY-063-11]]"
  - "[[STORY-063-12]]"
  - "[[STORY-063-13]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-063_wiki_ingest_pipeline_wired_end_to_end.md"
last_ingest: "2026-11-13T01:02:08.963Z"
last_ingest_commit: "61ca756c65394d2d560fe76753cbf93a3cd2dc71"
repo: "planning"
last_contradict_sha: "9b2bd8027fc7661744d38af20e103146cf01e9b5a1f435bde0c90a4c1c570755"
---

# EPIC-063: Wiki Pipeline Wired End to End and Orchestrator Awareness Layer

**Status:** Completed · **Sprint:** none · **Gate:** pass

## Objective
M1: make every wiki-ingest path the protocol promises actually run and tell the truth (contradiction check reaches the agent and stamps; shell/CLI writes reach ingest; `wiki build` keeps sprint reports; the active-sprint page reads the real sentinel). M2: turn the wiki into the orchestrator's awareness layer — a ≤1,500-token session brief injected at SessionStart, a ≤4,000-token index built for duplicate checks, section-extracted item pages with computed relations, and a decisions page.

## Problem & Value
**Why are we doing this?**
The wiki is meant to be what the orchestrator (the agent the owner talks to) reads to know where things stand. Today it does not do that job, for two kinds of reason.

*The pipeline does not run as documented.* EPIC-020 shipped the Phase 4 contradiction check assuming the PostToolUse hook would start the `cleargate-wiki-ingest` agent.

[+3,040 bytes not shown — read .cleargate/delivery/archive/EPIC-063_wiki_ingest_pipeline_wired_end_to_end.md]

## Scope
**In:**
*Milestone 1 — the pipeline runs and tells the truth (release 0.29.0, ships with [[CR-126]])*
- [ ] **STORY-063-01 Contradiction commit command and recheck rules.** `cleargate wiki contradict-commit
**Out:**
- Making Phase 4 blocking, or a readiness predicate that requires it. The approval edit itself changes the content hash.

[+5,890 bytes not shown — read .cleargate/delivery/archive/EPIC-063_wiki_ingest_pipeline_wired_end_to_end.md]

## Architecture rules
- Keep EPIC-020's Mode A: the contradiction LLM call is the `cleargate-wiki-contradict` subagent dispatched by the in-session agent. The CLI never calls a model API and never spawns `claude`/`codex`. This supersedes EPIC-020's "no changes to stamp-and-gate.sh in v1".

[+1,505 bytes not shown — read .cleargate/delivery/archive/EPIC-063_wiki_ingest_pipeline_wired_end_to_end.md]

## Decisions
- Protocol §10.8 says `cleargate wiki lint` blocks Gate 1 and push, but nothing outside `cleargate sprint archive` calls lint (sprint… → Recommended option. §10.8 is corrected to say where lint actually runs (STORY-063-02); a follow-up CR for per-item lint enforcement at push is filed separately.
- Recommended: run off-sprint as two milestones with two releases.

[+457 bytes not shown — read .cleargate/delivery/archive/EPIC-063_wiki_ingest_pipeline_wired_end_to_end.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (16): [[CR-127]], [[CR-129]], [[CR-130]], [[STORY-063-01]], [[STORY-063-02]], [[STORY-063-03]], [[STORY-063-04]], [[STORY-063-05]], [[STORY-063-06]], [[STORY-063-07]], [[STORY-063-08]], [[STORY-063-09]], [[STORY-063-10]], [[STORY-063-11]], [[STORY-063-12]], [[STORY-063-13]]
- Cites (12): [[BUG-085]], [[BUG-086]], [[CR-063]], [[CR-093]], [[CR-103]], [[CR-112]], [[CR-126]], [[EPIC-015]], [[EPIC-020]], [[EPIC-024]], [[EPIC-052]], [[PROPOSAL-012]]
- Cited by (19): [[BUG-126]], [[CR-126]], [[CR-127]], [[CR-128]], [[CR-129]], [[CR-130]], [[STORY-063-01]], [[STORY-063-02]], [[STORY-063-03]], [[STORY-063-04]], [[STORY-063-05]], [[STORY-063-06]], [[STORY-063-07]], [[STORY-063-08]], [[STORY-063-09]], [[STORY-063-10]], [[STORY-063-11]], [[STORY-063-12]], [[STORY-063-13]]
<!-- END relations -->
