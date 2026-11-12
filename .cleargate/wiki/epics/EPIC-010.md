---
type: epic
id: "EPIC-010"
parent: ""
children: 
  - "[[STORY-010-01]]"
  - "[[STORY-010-02]]"
  - "[[STORY-010-03]]"
  - "[[STORY-010-04]]"
  - "[[STORY-010-05]]"
  - "[[STORY-010-06]]"
  - "[[STORY-010-07]]"
  - "[[STORY-010-08]]"
cites: []
cited_by: 
  - "[[EPIC-027]]"
  - "[[SPRINT-27]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-010_Multi_Participant_MCP_Sync.md"
last_ingest: "2026-11-12T21:25:29.802Z"
last_ingest_commit: "a743603981ddb8788e7bde8cc42dc1fe5ef1a8f4"
repo: "planning"
---

# EPIC-010: Multi-Participant MCP Sync (v1)

**Status:** Completed · **Sprint:** none · **Gate:** pass

## Objective
Ship bidirectional MCP sync v1 so Business (PM/BA/Stakeholders/SME) and IT (Vibe Coders) collaborate on the same backlog from their native tools. Deliver: (1) participant identity at `cleargate init` with env/git fallbacks; (2) four new MCP tools (pull_item, list_remote_updates, pull_comments, detect_new_items); (3) `cleargate sync` driver with three-way-merge conflict resolution; (4)

[+382 bytes not shown — read .cleargate/delivery/archive/EPIC-010_Multi_Participant_MCP_Sync.md]

## Problem & Value
**Why are we doing this?**
ClearGate's whole value proposition is opening doors between Business and IT so they collaborate on one backlog from their native tools. Today `cleargate_push_item` is one-way: a Vibe Coder pushes an approved proposal to Linear, but every subsequent remote edit (status change, PM comment, stakeholder rewording the description, a PM authoring a fresh

[+1,331 bytes not shown — read .cleargate/delivery/archive/EPIC-010_Multi_Participant_MCP_Sync.md]

## Scope
**In:**
- [ ] **Identity + attribution foundation** — `cleargate init` extension writes `.cleargate/.participant.json` (prompt for email or infer from git).
**Out:**
- `cleargate sync --watch` long-running background mode.
- Webhook-driven remote push (label polling is v1).
- FLASHCARD.md personal/shared split (stays git-tracked-shared in v1).

[+4,324 bytes not shown — read .cleargate/delivery/archive/EPIC-010_Multi_Participant_MCP_Sync.md]

## Architecture rules
- MCP stays a pure adapter — no business logic server-side. All conflict detection, merge, and state reconciliation happens in the CLI.
- Authority split: remote is authoritative for operational metadata (status, assignees, comments, priority); local is authoritative for content body (description, acceptance criteria).

[+1,727 bytes not shown — read .cleargate/delivery/archive/EPIC-010_Multi_Participant_MCP_Sync.md]

## Decisions
*All 11 PROP-007 questions are resolved (see PROPOSAL-007 §4). The 6 Epic-level decomposition questions below were resolved 2026-04-19 by Vibe Coder (sandro.suladze@gmail.com).*

1. **Story decomposition granularity** — **Resolved: 8 medium stories.** Preliminary slicing: (1) identity + sync-log foundation; (2) 4 new MCP endpoints (architect may split to 2 stories if it's heavy); (3)

[+2,731 bytes not shown — read .cleargate/delivery/archive/EPIC-010_Multi_Participant_MCP_Sync.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (8): [[STORY-010-01]], [[STORY-010-02]], [[STORY-010-03]], [[STORY-010-04]], [[STORY-010-05]], [[STORY-010-06]], [[STORY-010-07]], [[STORY-010-08]]
- Cited by (2): [[EPIC-027]], [[SPRINT-27]]
<!-- END relations -->
