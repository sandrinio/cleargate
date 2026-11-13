---
type: proposal
id: "PROPOSAL-005"
parent: ""
children: []
cites: []
cited_by: 
  - "[[BUG-124]]"
status: "Abandoned"
remote_id: ""
raw_path: ".cleargate/delivery/archive/PROPOSAL-005_Token_Cost_And_Readiness_Gates.md"
last_ingest: "2026-11-13T01:02:08.963Z"
last_ingest_commit: "e2fef1f5c8d58f66c94aa3418a1150ece11573d2"
repo: "planning"
sprint_cleargate_id: "SPRINT-04"
---

# PROPOSAL-005: Per-Work-Item Token Cost + Machine-Checkable Readiness Gates

**Status:** Abandoned · **Sprint:** SPRINT-04 · **Gate:** not run

## Initiative & Context
### 1.1 Objective
Extend every ClearGate work-item template with two new capabilities:

1. **Token cost stamp** — each Proposal, Epic, Story, CR, Bug, Initiative, and Sprint file carries a `draft_tokens` block in its frontmatter reporting the LLM tokens spent to draft it (input / output / cache_read / cache_creation + model). Stamped automatically by the PostToolUse hook.
2.

[+3,500 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-005_Token_Cost_And_Readiness_Gates.md]

## Technical Architecture & Constraints
### 2.1 Dependencies

- **PROP-001** (hard) — frontmatter stamping helper is the extension point for `draft_tokens`. This proposal cannot ship until PROP-001's `stamp-frontmatter` helper lands (EPIC-001).
- **PROP-002** (soft) — readiness lint piggybacks on `cleargate wiki lint`. If PROP-002 ships first (currently in SPRINT-04), we extend its lint pass. If not, we ship a standalone `cleargate gate check` command.

[+9,537 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-005_Token_Cost_And_Readiness_Gates.md]

## Scope Impact (Touched Files & Data)
### 3.1 Known Files — must be modified

**Templates (add `draft_tokens` frontmatter stub + `§ Readiness Gate` block):**
- `.cleargate/templates/proposal.md`
- `.cleargate/templates/epic.md`
- `.cleargate/templates/story.md`
- `.cleargate/templates/CR.md`
- `.cleargate/templates/Bug.md`
- `.cleargate/templates/initiative.md`
- `.cleargate/templates/Sprint Plan Template.md`

[+2,655 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-005_Token_Cost_And_Readiness_Gates.md]

## AI Interrogation Loop (Human Input Required)
*(The following are the AI's open questions on this Proposal. The Proposal stays at Draft until all are answered. Draft → In Review once the Vibe Coder has answered; In Review → Approved when `approved: true` is set.)*

[+9,277 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-005_Token_Cost_And_Readiness_Gates.md]

## Approval Gate
(Vibe Coder: Review this proposal. If the architecture and context are correct, answer the questions in §4 and set `approved: true` in the YAML frontmatter. Only then is the AI authorized to decompose into Epics/Stories.)

<!-- BEGIN relations -->
## Relations
- Parent: none
- Cited by (1): [[BUG-124]]
<!-- END relations -->
