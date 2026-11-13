---
type: sprint
id: "SPRINT-01"
parent: ""
children: []
cites: []
cited_by: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-01_MCP_v0.1.md"
last_ingest: "2026-11-13T01:02:08.963Z"
last_ingest_commit: "e2fef1f5c8d58f66c94aa3418a1150ece11573d2"
repo: "planning"
sprint_cleargate_id: "SPRINT-01"
---

# SPRINT-01: MCP Server v0.1

**Status:** Completed · **Dates:** 2026-04-17 → 2026-04-17 · **Gate:** not run

## Goal
Ship a deployable v0.1 of the ClearGate MCP server — a real client authenticates via JWT over Streamable HTTP, exercises all four tools with versioned item storage, and the image runs cleanly on Coolify.

## Deliverables
- `STORY-003-01`: DB schema + Drizzle migrations — ✅ Done 2026-04-17 (8 tables + last-10-version pruning trigger verified against Postgres 18)
- `STORY-003-02`: JWT issue / verify / refresh — 15-min access + 90-day rotating refresh, Redis revocation list
- `STORY-003-03`: `push_item` + row-level lock versioning + trigger-based pruning
- `STORY-003-04`: `pull_item` (current or historical version)
- `STORY-003-05`: `list_items` with keyset cursor pagination
- `STORY-003-06`: `sync_status` wrapper around `push_item`
- `STORY-003-07`: Rate-limit middleware (Redis sliding window, per-role)
- `STORY-003-08`: Idempotency middleware (24h Redis cache on `push_item`)
- `STORY-003-09`: Audit middleware (one row per tool call, no bodies)
- `STORY-003-10`: Streamable HTTP transport registration (`@modelcontextprotocol/sdk@^1.29`)
- `STORY-003-11`: First-admin bootstrap + `scripts/dev-issue-token.ts` (dev-only helper that mints a refresh token for manual smoke testing — no Admin UI/CLI yet in this sprint)
- `STORY-003-12`: Dockerfile verification + Coolify deployment runbook

<!-- BEGIN relations -->
## Relations
- Parent: none
<!-- END relations -->
