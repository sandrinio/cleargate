---
type: epic
id: "EPIC-030"
parent: ""
children: []
cites: 
  - "[[CR-017]]"
  - "[[CR-071]]"
  - "[[PROPOSAL-013]]"
cited_by: 
  - "[[EPIC-059]]"
  - "[[EPIC-062]]"
  - "[[STORY-059-01]]"
  - "[[STORY-062-02]]"
  - "[[STORY-062-03]]"
  - "[[STORY-062-04]]"
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-030_AI_Driven_Sprint_Planning.md"
last_ingest: "2026-11-12T21:25:29.802Z"
last_ingest_commit: "f66e7744668126504eed66de8d74c5743f50136e"
repo: "planning"
---

# EPIC-030: AI-Driven Sprint Planning Orchestration

**Status:** Draft · **Sprint:** none · **Gate:** fail: parent-approved

## Objective
Replace judgment-based sprint planning with a four-mechanism deterministic orchestration layer: prioritized backlog grooming, conflict-graph parallel selection, drift bounding at session-start, and out-of-sprint research spikes.

## Problem & Value
**Why are we doing this?**

Today's sprint planning has four soft spots that compound into bad sprints:

1. **No global priority discipline.** `priority` is item-local; ties are common; nobody re-ranks on a schedule. AI silently picks by file mtime or alphabetical drift.
2. **Parallelism is Architect judgment.** Sprint Plan Template §2.2 Merge Ordering is filled by hand.

[+2,202 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-030_AI_Driven_Sprint_Planning.md]

## Scope
**In:**
- [ ] `cleargate sprint groom` command — emits ranked candidate list with proposed priority deltas + one-line rationale per delta
- [ ] `cleargate sprint plan --auto` flag — runs conflict-graph + capacity algorithm
**Out:**
- New heavyweight `Spike.md` template + `SPIKE-NNN` ID space → lightweight wiki-topic by default
- Replacing Architect Sprint Design Review entirely → algorithm populates §2; Architect overrides + writes rationale
-

[+2,630 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-030_AI_Driven_Sprint_Planning.md]

## Architecture rules
- Must extend existing Sprint Plan Template §2 SDR — algorithm output writes into existing slots (Phase Plan, Merge Ordering, Lane Audit), does not replace the template structure.
- Must reuse wiki topic-page mechanism (cleargate wiki query --persist) for spike findings — no new artifact type.
- Must reuse cleargate doctor --session-start surface for drift checks — extends, does not fork.

[+464 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-030_AI_Driven_Sprint_Planning.md]

## Open questions
- Is the "3× story cost" rule the right gate, or should it be a fixed minimum (e.g., spike only when ≥1h budget AND story is L3+)? *(Recommended: 3× rule, simpler to compute, scales with story size.)*
- Should drift detection block session-start, or warn-only? *(Recommended: warn-only in v1 mode, halt at gate in v2 mode — mirrors execution_mode envelope from CR-070/CR-071.)*
- When grooming proposes priority deltas, does AI commit them

[+2,977 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-030_AI_Driven_Sprint_Planning.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Cites (3): [[CR-017]], [[CR-071]], [[PROPOSAL-013]]
- Cited by (6): [[EPIC-059]], [[EPIC-062]], [[STORY-059-01]], [[STORY-062-02]], [[STORY-062-03]], [[STORY-062-04]]
<!-- END relations -->
