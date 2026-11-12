---
type: epic
id: "EPIC-008"
parent: ""
children: 
  - "[[BUG-008]]"
  - "[[CR-008]]"
  - "[[CR-010]]"
  - "[[CR-027]]"
  - "[[CR-028]]"
  - "[[CR-030]]"
  - "[[CR-031]]"
  - "[[CR-032]]"
  - "[[CR-033]]"
  - "[[CR-034]]"
  - "[[CR-035]]"
  - "[[CR-036]]"
  - "[[CR-038]]"
  - "[[CR-125]]"
  - "[[STORY-008-01]]"
  - "[[STORY-008-02]]"
  - "[[STORY-008-03]]"
  - "[[STORY-008-04]]"
  - "[[STORY-008-05]]"
  - "[[STORY-008-06]]"
  - "[[STORY-008-07]]"
cites: []
cited_by: 
  - "[[CR-125]]"
  - "[[STORY-060-03]]"
status: "Abandoned"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-008_Token_Cost_And_Readiness_Gates.md"
last_ingest: "2026-11-12T20:33:09.611Z"
last_ingest_commit: "2691d20a51eb6e8211a9ec862c0ec0ddf8c09601"
repo: "planning"
sprint_cleargate_id: "SPRINT-04"
---

# EPIC-008: Per-Work-Item Token Cost + Machine-Checkable Readiness Gates

**Status:** Abandoned · **Sprint:** SPRINT-04 · **Gate:** not run

## Objective
Ship two paired capabilities: (1) per-work-item `draft_tokens` frontmatter stamp populated by a PostToolUse hook from the sprint token ledger; (2) a closed-set predicate engine + `cleargate gate check` CLI that writes `cached_gate_result:` into each work item's frontmatter, blocks `wiki lint` on Epic/Story/CR/Bug failures, and advises (non-blocking) on Proposals.

[+192 bytes not shown — read .cleargate/delivery/archive/EPIC-008_Token_Cost_And_Readiness_Gates.md]

## Problem & Value
**Why are we doing this?**
Today `sprint-runs/<id>/token-ledger.jsonl` tracks per-sprint agent cost but cannot answer *"how much did PROPOSAL-005 itself cost to draft?"* — per-item attribution is missing. And the current Ambiguity Gate is a prose checklist a human visually inspects; under time pressure, humans tick boxes without reading.

[+1,289 bytes not shown — read .cleargate/delivery/archive/EPIC-008_Token_Cost_And_Readiness_Gates.md]

## Scope
**In:**
- [ ] Central `.cleargate/knowledge/readiness-gates.md` declaring all 6 transitions × criteria per PROP-005 §2.3 (Proposal→decomposition, Epic→decomposition, Epic→coding, Story→execution,
**Out:**
- MCP-side gate enforcement (`cleargate_push_item` refuses on gate fail) — deferred per PROP-005 Q10; revisit after PROP-007 Multi-Participant Sync lands.

[+2,888 bytes not shown — read .cleargate/delivery/archive/EPIC-008_Token_Cost_And_Readiness_Gates.md]

## Architecture rules
- Agent never invokes stamp-tokens or gate check directly — a PostToolUse hook chains stamp-tokens → gate check → wiki ingest on every Write/Edit under .cleargate/delivery/**.
- Predicates are a CLOSED set (frontmatter/body/section/file-exists/link-target/status-of). No shell-out, no network, no arbitrary code in predicate execution.

[+1,186 bytes not shown — read .cleargate/delivery/archive/EPIC-008_Token_Cost_And_Readiness_Gates.md]

## Decisions
All 6 questions resolved 2026-04-19 by Vibe Coder (accept all AI recommendations).

1. **Protocol section numbering** — **Resolved:** EPIC-008 takes §12 ("Token Cost Stamping & Readiness Gates"). EPIC-001 keeps §11; EPIC-009 takes §13. Chronological by Epic number; avoids collision.
2. **`cleargate doctor` command ownership** — **Resolved:** shared command surface.

[+1,219 bytes not shown — read .cleargate/delivery/archive/EPIC-008_Token_Cost_And_Readiness_Gates.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (21): [[BUG-008]], [[CR-008]], [[CR-010]], [[CR-027]], [[CR-028]], [[CR-030]], [[CR-031]], [[CR-032]], [[CR-033]], [[CR-034]], [[CR-035]], [[CR-036]], [[CR-038]], [[CR-125]], [[STORY-008-01]], [[STORY-008-02]], [[STORY-008-03]], [[STORY-008-04]], [[STORY-008-05]], [[STORY-008-06]], +1 more
- Cited by (2): [[CR-125]], [[STORY-060-03]]
<!-- END relations -->
