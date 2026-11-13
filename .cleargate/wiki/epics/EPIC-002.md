---
type: epic
id: "EPIC-002"
parent: ""
children: 
  - "[[CR-012]]"
  - "[[CR-063]]"
  - "[[STORY-002-01]]"
  - "[[STORY-002-02]]"
  - "[[STORY-002-03]]"
  - "[[STORY-002-04]]"
  - "[[STORY-002-05]]"
  - "[[STORY-002-06]]"
  - "[[STORY-002-07]]"
  - "[[STORY-002-08]]"
  - "[[STORY-002-09]]"
cites: 
  - "[[EPIC-000]]"
  - "[[EPIC-001]]"
  - "[[EPIC-003]]"
  - "[[EPIC-004]]"
  - "[[EPIC-005]]"
  - "[[EPIC-006]]"
  - "[[SPRINT-03]]"
  - "[[SPRINT-04]]"
  - "[[STORY-000-01]]"
  - "[[STORY-000-02]]"
  - "[[STORY-003-13]]"
  - "[[STORY-004-03]]"
  - "[[STORY-004-07]]"
  - "[[STORY-005-01]]"
  - "[[STORY-005-05]]"
cited_by: 
  - "[[CR-063]]"
  - "[[SPRINT-27]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-002_Knowledge_Wiki_Layer.md"
last_ingest: "2026-11-13T01:02:08.963Z"
last_ingest_commit: "2691d20a51eb6e8211a9ec862c0ec0ddf8c09601"
repo: "planning"
---

# EPIC-002: Knowledge Wiki Layer

**Status:** Completed · **Sprint:** none · **Gate:** not run

## Objective
Ship the Karpathy-style compiled awareness layer at .cleargate/wiki/. Three subagents (ingest/query/lint) maintain index.md + log.md + per-item pages + synthesis pages (product-state, roadmap, active-sprint, open-gates) + filed-back topic pages. PostToolUse hook + protocol rule trigger ingest; lint blocks Gate 1 and Gate 3 on drift.

## Problem & Value
**Why are we doing this?**
Without a compiled index, Claude Code starts every session blind — it must grep `delivery/` + `archive/` + `plans/` to know what exists, what's shipped, and what's next. That's slow, error-prone, and causes duplicate Proposals and misread roadmap state. The wiki is the awareness layer that fixes this in ~3k tokens at session start.

[+1,181 bytes not shown — read .cleargate/delivery/archive/EPIC-002_Knowledge_Wiki_Layer.md]

## Scope
**In:**
- [ ] Protocol `§10 Knowledge Wiki Protocol` added to `cleargate-protocol.md`.
- [ ] Three subagent definitions shipped as assets in `cleargate-cli/` (copied into `.claude/agents/` by `cleargate init`).
**Out:**
- Indexing static protocol docs (`knowledge/`) and `templates/` (PROP-002 Q6 amended — these stay outside the wiki; they're loaded via CLAUDE.md).
- Real-time push to clients (v1.1).

[+1,832 bytes not shown — read .cleargate/delivery/archive/EPIC-002_Knowledge_Wiki_Layer.md]

## Architecture rules
- Wiki is derived; raw files (.cleargate/delivery, .cleargate/plans) are source of truth. On conflict, lint rebuilds from raw.
- Raw → wiki is a compile step (Karpathy framing). Rebuild is always safe and idempotent.
- Wiki pages hold metadata + summary + edges only — NOT full raw content (PROP-002 Q1). Exception: wiki/topics/ pages hold synthesis prose filed back from query results.
- wiki/ is committed to git (PROP-002 Q2).

[+639 bytes not shown — read .cleargate/delivery/archive/EPIC-002_Knowledge_Wiki_Layer.md]

## Decisions
Q1–Q7 resolved 2026-04-17 by Vibe Coder. Q8–Q10 added 2026-04-18 during scope expansion (per user direction: wiki covers work items + sprints + product state + roadmap, per Karpathy's full pattern).

1. **Subagent definition location** — **Resolved:** project-local (`.claude/agents/`). Subagents are project-specific — each repo's wiki rules live with the repo.

[+2,040 bytes not shown — read .cleargate/delivery/archive/EPIC-002_Knowledge_Wiki_Layer.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (11): [[CR-012]], [[CR-063]], [[STORY-002-01]], [[STORY-002-02]], [[STORY-002-03]], [[STORY-002-04]], [[STORY-002-05]], [[STORY-002-06]], [[STORY-002-07]], [[STORY-002-08]], [[STORY-002-09]]
- Cites (15): [[EPIC-000]], [[EPIC-001]], [[EPIC-003]], [[EPIC-004]], [[EPIC-005]], [[EPIC-006]], [[SPRINT-03]], [[SPRINT-04]], [[STORY-000-01]], [[STORY-000-02]], [[STORY-003-13]], [[STORY-004-03]], [[STORY-004-07]], [[STORY-005-01]], [[STORY-005-05]]
- Cited by (2): [[CR-063]], [[SPRINT-27]]
<!-- END relations -->
