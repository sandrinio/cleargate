---
type: epic
id: "EPIC-023"
parent: ""
children: 
  - "[[STORY-023-01]]"
  - "[[STORY-023-02]]"
  - "[[STORY-023-03]]"
  - "[[STORY-023-04]]"
cites: []
cited_by: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-023_MCP_Native_Source_Of_Truth.md"
last_ingest: "2026-11-12T21:25:29.802Z"
last_ingest_commit: "5f8134f8b1ea5ad975d5687114fbf0f84ca1f53e"
repo: "planning"
sprint_cleargate_id: "SPRINT-16"
---

# EPIC-023: MCP as Native Source of Truth — Work-Item Sync v2

**Status:** Completed · **Sprint:** SPRINT-16 · **Gate:** pass

## Objective
Replace PmAdapter indirection in cleargate-cli sync paths with direct MCP DB queries; ship cleargate sync command that pushes work items (all statuses) to the MCP items table without requiring a PM adapter to be wired.

## Problem & Value
**Why are we doing this?**

The current CLI sync surface routes through `PmAdapter`, which requires an external PM tool (Linear, Jira) to be wired. Clean-folder users who rely on the MCP server as their backlog cannot read remote state, pull updated items, or detect new items — every read path errors with "no adapter configured." The MCP server's Postgres `items` table already contains the data; the adapter indirection is a false gate.

This epic removes the false gate for work-item sync. `cleargate sync` will push all local work items (every status) directly to the MCP items table, pulling back any server-side updates.

**Success Metrics (North Star):**
- `cleargate sync` completes without error on a clean-folder project with no PM adapter configured.
- All local work items (including Drafts) appear in the MCP `items` table after a successful sync.
- Conflicts detected by the server-side conflict-detector are reported to the user per-item.
- `cleargate sync` prints `→ View synced items: <url>` on success, URL sourced from `lib/admin-url.ts`.

## Architecture rules
- PmAdapter interface stays in mcp/src/adapters/ — it is NOT removed; CLI stops reaching for it in sync flows. Admin-panel code may still use it later.
- Sync is status-blind: Draft, In-Review, Triaged, Approved, Done, Verified, Abandoned all sync. No pre-flight approved gate on cleargate sync (that gate lives on cleargate push and is admin-panel's filtering concern).
- Wire format is defined in EPIC-023 §2 (below). STORY-023-01 (CLI) and STORY-023-02 (server handler) MUST reference §2 — never duplicate or diverge.
- Full body ships on every sync of a changed item (no prose-patch). Idempotent — sha256 of body determines skip vs push.
- Sub-epic 1 scope: work items only. Sprint plans, sprint reports, wiki recompute are sub-epics 2–4 (SPRINT-17+).

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (4): [[STORY-023-01]], [[STORY-023-02]], [[STORY-023-03]], [[STORY-023-04]]
<!-- END relations -->
