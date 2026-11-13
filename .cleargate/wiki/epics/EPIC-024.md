---
type: epic
id: "EPIC-024"
parent: ""
children: 
  - "[[STORY-024-01]]"
  - "[[STORY-024-02]]"
  - "[[STORY-024-03]]"
  - "[[STORY-024-04]]"
cites: []
cited_by: 
  - "[[EPIC-063]]"
  - "[[STORY-063-09]]"
  - "[[STORY-063-11]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-024_AI_Orientation_Surface_Slim.md"
last_ingest: "2026-11-13T01:02:08.963Z"
last_ingest_commit: "7cbc665f6f3a6c98cfacf10f23c14b95ebf481a9"
repo: "planning"
sprint_cleargate_id: "SPRINT-15"
---

# EPIC-024: AI Orientation Surface Slim

**Status:** Completed · **Sprint:** SPRINT-15 · **Gate:** pass

## Objective
Make four currently-implicit ClearGate rules explicit in CLAUDE.md, split cleargate-protocol.md into "AI reads" + "hooks enforce" files with full citation rewrite (no stub redirects), and remove Story §3.1 duplication from per-milestone Architect plans — without changing any gate semantic, CLI surface, or four-agent loop contract.

## Problem & Value
**Why are we doing this?**

A new AI agent landing in this repo today pays a ~5k-token orientation cost: 135 lines of CLAUDE.md + 1088 lines of `cleargate-protocol.md` + scattered agent definitions read reactively when a hook trips. Three quality issues compound the cost:

[+2,638 bytes not shown — read .cleargate/delivery/archive/EPIC-024_AI_Orientation_Surface_Slim.md]

## Scope
**In:**
- [ ] **Workstream A — Architect plan slim.** Edit `architect.md` (live + canonical mirror): rewrite Workflow step 4 plan template to drop per-story Files-to-create/Files-to-modify subsections; keep Order, Cross-story coupling, Gotchas
**Out:**
- Changing any gate semantic (Gate 1/2/3/3.5 unchanged).
- Changing four-agent loop role contracts beyond Architect's plan-template field.

[+2,993 bytes not shown — read .cleargate/delivery/archive/EPIC-024_AI_Orientation_Surface_Slim.md]

## Architecture rules
- Preserve every existing gate semantic: Gate 1 (proposal approval), Gate 2 (ambiguity 🔴→🟢), Gate 3 (push approved+confirmed), Gate 3.5 (sprint close ack). No mechanical changes — only document split, full citation rewrite, CLAUDE.md surfacing, and Architect plan template edit.
- Preserve four-agent loop and existing v1/v2 enforcement. The execution_mode flag's behaviour is unchanged; only its *visibility* in CLAUDE.md changes.

[+1,197 bytes not shown — read .cleargate/delivery/archive/EPIC-024_AI_Orientation_Surface_Slim.md]

## Decisions
*All eight questions answered. This section is preserved as a decision log; `§6 AI Interrogation Loop is empty (all human answers integrated into the spec)` is satisfied because every answer below has been propagated into §0–§5.*

- **Q1 — Sprint placement.** **Resolved: SPRINT-17 in full.** All three workstreams target SPRINT-17. High-impact bundle; splitting across sprints doubles coordination cost.

[+1,567 bytes not shown — read .cleargate/delivery/archive/EPIC-024_AI_Orientation_Surface_Slim.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (4): [[STORY-024-01]], [[STORY-024-02]], [[STORY-024-03]], [[STORY-024-04]]
- Cited by (3): [[EPIC-063]], [[STORY-063-09]], [[STORY-063-11]]
<!-- END relations -->
