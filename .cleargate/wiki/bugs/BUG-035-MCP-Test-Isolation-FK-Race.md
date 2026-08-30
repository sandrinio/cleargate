---
type: bug
id: "BUG-035-MCP-Test-Isolation-FK-Race"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/BUG-035-MCP-Test-Isolation-FK-Race.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "1ed0fb723bbcefc386f623e2587d4d155fcc4295"
repo: "planning"
---

# BUG-035-MCP-Test-Isolation-FK-Race: BUG-035: mcp test suite — systemic cross-file FK seed race (Postgres 23503)

## 1. The Anomaly

**Expected:** `npm test` in `mcp/` runs deterministically — same commit, same result, green (or a stable known-failures baseline).

**Actual:** `npm test` is **non-deterministic**. On the same commit the failure count swings wildly (observed `122 → 2 → 0` full-suite fails with zero code change). The dominant failure is Postgres error **code 23503** — a foreign-key violation `Key (project_id)=… is not present in table projects` — raised when a test inserts a row (e.g. `app_tokens`, `members`, `invites`) referencing a `projects` row that a **sibling test file deleted mid-test**.

[+8,649 bytes not shown — read .cleargate/delivery/pending-sync/BUG-035-MCP-Test-Isolation-FK-Race.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
