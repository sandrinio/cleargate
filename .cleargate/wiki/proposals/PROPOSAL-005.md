---
type: proposal
id: "PROPOSAL-005"
parent: ""
children: []
status: "Abandoned"
remote_id: ""
raw_path: ".cleargate/delivery/archive/PROPOSAL-005_Token_Cost_And_Readiness_Gates.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "e2fef1f5c8d58f66c94aa3418a1150ece11573d2"
repo: "planning"
---

# PROPOSAL-005: Per-Work-Item Token Cost + Machine-Checkable Readiness Gates

## 1. Initiative & Context

### 1.1 Objective
Extend every ClearGate work-item template with two new capabilities:

1. **Token cost stamp** — each Proposal, Epic, Story, CR, Bug, Initiative, and Sprint file carries a `draft_tokens` block in its frontmatter reporting the LLM tokens spent to draft it (input / output / cache_read / cache_creation + model). Stamped automatically by the PostToolUse hook.
2. **Readiness Gates** — each template declares an explicit, machine-checkable readiness checklist for its next downstream transition (Proposal → Epic, Epic → decomposition → coding, Story → execution, CR → apply, Bug → fix). `cleargate gate check` evaluates the literal checklist against the document so "is this ready?" gets a grounded yes/no, not a rubber-stamp.

The two capabilities ship together because they share the same surface area (per-template frontmatter + per-template review logic) and reinforce each other: the readiness gate tells you *whether* to proceed, the token stamp tells you *what it cost to get there* — together they give the Vibe Coder objective signal on both quality and budget.

[+25,672 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-005_Token_Cost_And_Readiness_Gates.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
