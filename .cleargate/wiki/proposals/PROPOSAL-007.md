---
type: proposal
id: "PROPOSAL-007"
parent: ""
children: []
cites: []
cited_by: []
status: "Abandoned"
remote_id: ""
raw_path: ".cleargate/delivery/archive/PROPOSAL-007_Multi_Participant_MCP_Sync.md"
last_ingest: "2026-11-12T21:25:29.802Z"
last_ingest_commit: "39f8f74ac7c91dafd7f370dd4b61ef5d2bf0361f"
repo: "planning"
---

# PROPOSAL-007: Multi-Participant MCP Sync

**Status:** Abandoned · **Sprint:** none · **Gate:** pass

## Initiative & Context
### 1.1 Objective
Define the bidirectional sync model between ClearGate's local markdown state (`.cleargate/delivery/**`) and the remote PM tool (Linear / Jira / GitHub Projects via MCP), so that multi-participant teams share a unified project knowledge and backlog across platforms.

[+3,051 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-007_Multi_Participant_MCP_Sync.md]

## Technical Architecture & Constraints
### 2.1 Dependencies

- **PROP-003** (hard) — MCP adapter is the existing push/pull surface; this proposal extends it.
- **PROP-001** (hard) — `created_at` / `updated_at` / `codebase_version` are the conflict-detection primitives.
- **PROP-002** (soft) — wiki synthesis pages render remote comments / statuses pulled down.

[+12,791 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-007_Multi_Participant_MCP_Sync.md]

## Scope Impact (Touched Files & Data)
### 3.1 Known Files — must be modified

**MCP server:**
- `mcp/src/endpoints/pull-item.ts` — new `cleargate_pull_item` handler.
- `mcp/src/endpoints/list-remote-updates.ts` — new.
- `mcp/src/endpoints/pull-comments.ts` — new.
- `mcp/src/endpoints/detect-new-items.ts` — new.
- `mcp/src/endpoints/push-item.ts` — extend with gate-check enforcement (PROP-005 Q10 deferred work) and `pushed_by` attribution.

[+2,235 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-007_Multi_Participant_MCP_Sync.md]

## AI Interrogation Loop (Human Input Required)
*(The AI's open questions on this Proposal. The Proposal stays at Draft until all are answered.)*

1. **Q — Stakeholder-authored proposal flow: push or pull model for the initial "remote draft" state?** When a stakeholder creates a Linear issue intended as a ClearGate proposal, does (a) ClearGate periodically poll for such issues and pull them into `pending-sync/`, or (b) the stakeholder (or a PM

[+5,571 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-007_Multi_Participant_MCP_Sync.md]

## Approval Gate
(Vibe Coder: Review this proposal. This is the largest-surface Proposal in ClearGate to date. Recommended: answer Q10 first — the sequencing decision shapes whether the other answers matter now or in six months. If the architecture and context are correct, answer the questions in §4 and set `approved: true` in the YAML frontmatter. Only then is the AI authorized to decompose into Epics/Stories.)

<!-- BEGIN relations -->
## Relations
- Parent: none
<!-- END relations -->
