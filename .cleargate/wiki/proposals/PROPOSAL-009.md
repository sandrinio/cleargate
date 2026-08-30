---
type: proposal
id: "PROPOSAL-009"
parent: ""
children: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/archive/PROPOSAL-009_Planning_Visibility_UX.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "24c383f4fdb142f48f20a752f8bff2f11e043115"
repo: "planning"
---

# PROPOSAL-009: Planning Visibility UX — Sprints, Epic Hierarchy, Activity

## 1. Initiative & Context

### 1.1 Objective

Turn the admin UI from a flat item browser into a **planning dashboard** that mirrors how work actually runs in ClearGate: a sprint-centric timeline (shipped → active → planned), epics as expandable containers over their child stories, orphan items surfaced side-by-side, and an activity chart that shows created-vs-completed over time. Builds on the work already planned in EPIC-006 (Admin UI) but replaces the implicit "one flat items table" mental model.

### 1.2 The "Why"

1. **Stakeholder read.** The repo already knows what's planned (`EPIC-012`), in flight (`SPRINT-06`), and shipped (SPRINT-01…05). There is no non-grep way to see that shape — a PM or the Vibe Coder cannot glance at a browser and answer "what did we ship, what's next." A sprint timeline + active-sprint panel closes that gap without new data.
2. **Hierarchy is the primary mental model.** ClearGate work is structurally Epic → Story (with Sprint as the delivery vessel), but the current items browser is a flat table that obscures that shape. Users want to see "this epic has 11 stories, 9 shipped, 2 Draft" at a glance, not click through 11 individual rows.
3.

[+9,493 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-009_Planning_Visibility_UX.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
