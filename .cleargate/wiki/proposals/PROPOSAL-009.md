---
type: proposal
id: "PROPOSAL-009"
parent: ""
children: []
cites: []
cited_by: 
  - "[[CR-084-Sprint-Dashboard-In-CLI-Payload]]"
  - "[[EPIC-062]]"
  - "[[STORY-062-02]]"
  - "[[STORY-062-04]]"
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/archive/PROPOSAL-009_Planning_Visibility_UX.md"
last_ingest: "2026-11-12T21:25:29.802Z"
last_ingest_commit: "24c383f4fdb142f48f20a752f8bff2f11e043115"
repo: "planning"
sprint_cleargate_id: "SPRINT-06"
---

# PROPOSAL-009: Planning Visibility UX — Sprints, Epic Hierarchy, Activity

**Status:** Draft · **Sprint:** SPRINT-06 · **Gate:** pass

## Initiative & Context
### 1.1 Objective

Turn the admin UI from a flat item browser into a **planning dashboard** that mirrors how work actually runs in ClearGate: a sprint-centric timeline (shipped → active → planned), epics as expandable containers over their child stories, orphan items surfaced side-by-side, and an activity chart that shows created-vs-completed over time. Builds on the work already planned in EPIC-006 (Admin UI) but replaces the implicit "one flat items table" mental model.

### 1.2 The "Why"

[+1,591 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-009_Planning_Visibility_UX.md]

## Technical Architecture & Constraints
### 2.1 Dependencies

- **Admin API (EPIC-004):** must expose parent/sprint linkage in item list responses — today `ItemSummary` (`cleargate-cli/src/admin-api/responses.ts:97`) has no `parent_id`, `sprint_id`, `created_at`, or `resolved_at`. Either (a) extend the schema with two nullable `string` IDs + two timestamps, or (b) derive from `current_payload` client-side. **Recommendation: (a)** — typed API beats fragile frontmatter-key sniffing and keeps the UI query simple.

[+4,010 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-009_Planning_Visibility_UX.md]

## Scope Impact (Touched Files & Data)
### 3.1 Known Files

- `cleargate-cli/src/admin-api/responses.ts` — extend `ItemSummarySchema` with `parent_cleargate_id`, `sprint_cleargate_id`, `resolved_at`; add `SprintSummarySchema`, `EpicTreeNodeSchema`, `ActivityPointSchema`.
- `mcp/src/db/schema.ts` (or equivalent) — add columns, migration.
- `mcp/src/routes/admin-api/items.ts` (or equivalent) — include new fields in list response.

[+2,454 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-009_Planning_Visibility_UX.md]

## 🔒 Approval Gate
Key things for the Vibe Coder to sign off on before decomposition:

1. **Schema additions.** OK to add `parent_cleargate_id`, `sprint_cleargate_id`, `resolved_at` to items? (vs. deriving from `current_payload` client-side — faster to ship, slower to query, no indexes.)
2. **Scope target.** Reshape EPIC-006 stories (rewrite 006-03 / 006-06 / 006-08, add 006-0A Sprints + 006-0B Epics), or cut a sibling **EPIC-013 Planning Visibility** that ships after EPIC-006's baseline?
3.

[+635 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-009_Planning_Visibility_UX.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Cited by (4): [[CR-084-Sprint-Dashboard-In-CLI-Payload]], [[EPIC-062]], [[STORY-062-02]], [[STORY-062-04]]
<!-- END relations -->
