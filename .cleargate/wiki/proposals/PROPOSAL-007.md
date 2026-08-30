---
type: proposal
id: "PROPOSAL-007"
parent: ""
children: []
status: "Abandoned"
remote_id: ""
raw_path: ".cleargate/delivery/archive/PROPOSAL-007_Multi_Participant_MCP_Sync.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "39f8f74ac7c91dafd7f370dd4b61ef5d2bf0361f"
repo: "planning"
---

# PROPOSAL-007: Multi-Participant MCP Sync

## 1. Initiative & Context

### 1.1 Objective
Define the bidirectional sync model between ClearGate's local markdown state (`.cleargate/delivery/**`) and the remote PM tool (Linear / Jira / GitHub Projects via MCP), so that multi-participant teams share a unified project knowledge and backlog across platforms. Stakeholders who never open Claude Code should still be able to draft proposals, review approvals, and update statuses from the PM tool's native UI, with those changes flowing back into every participant's local view. Developers sharing a git repo should see each other's pushed items without stepping on one another's drafts.

Today, ClearGate push is one-way: a local `approved: true` proposal flows to the PM tool via `cleargate_push_item`, but any subsequent edit on the remote side (status change, comment, assignee update, stakeholder rewriting the description) is invisible locally until an explicit re-pull. There is no conflict resolution, no identity tracking, and no model for stakeholder-authored content flowing back. This proposal designs the minimum coherent sync contract that makes ClearGate usable for teams of more than one person.

### 1.2 The "Why"

[+24,509 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-007_Multi_Participant_MCP_Sync.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
