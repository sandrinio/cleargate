---
type: sprint
id: "SPRINT-07"
parent: ""
children: []
status: "Abandoned"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/SPRINT-07_Multi_Participant_MCP_Sync.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "a743603981ddb8788e7bde8cc42dc1fe5ef1a8f4"
repo: "planning"
---

# SPRINT-07: Multi-Participant MCP Sync v1

## Sprint Goal

Ship **EPIC-010 (Multi-Participant MCP Sync, v1)** end-to-end — bidirectional sync between ClearGate's local markdown state and the remote PM tool (Linear first concrete adapter; generic `PmAdapter` interface for Jira / GitHub Projects later). After this sprint, (a) a Business stakeholder can draft a proposal in Linear tagged `cleargate:proposal` and have it land in `.cleargate/delivery/pending-sync/` automatically on the next `cleargate sync`; (b) two developers sharing a repo see each other's pushed items without re-drafting; (c) local content edits and remote status changes reconcile via a three-way-merge prompt (content+content) or a silent remote-wins (status+status) with full sync-log attribution; (d) every push carries `pushed_by` + `pushed_at`; (e) the SessionStart hook nudges "N remote updates since yesterday" once per 24h. This Epic is the **product's core value proposition** — without it ClearGate is a single-developer tool, with it Business and IT share one backlog from their native tools.

## Consolidated Deliverables

### EPIC-010 — Multi-Participant MCP Sync v1 (8 stories)

[+17,590 bytes not shown — read .cleargate/delivery/pending-sync/SPRINT-07_Multi_Participant_MCP_Sync.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
