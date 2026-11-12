---
type: bug
id: "BUG-035-MCP-Test-Isolation-FK-Race"
parent: "[[STORY-047-01-Indexed-Credential-Schema-Verify]]"
children: []
cites: []
cited_by: 
  - "[[BUG-057]]"
  - "[[EPIC-053]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/BUG-035-MCP-Test-Isolation-FK-Race.md"
last_ingest: "2026-11-12T20:33:09.611Z"
last_ingest_commit: "1ed0fb723bbcefc386f623e2587d4d155fcc4295"
repo: "planning"
parent_cleargate_id: "STORY-047-01"
sprint_cleargate_id: "SPRINT-36"
---

# BUG-035-MCP-Test-Isolation-FK-Race: BUG-035: mcp test suite — systemic cross-file FK seed race (Postgres 23503)

**Status:** Completed · **Sprint:** SPRINT-36 · **Gate:** fail: repro-steps-deterministic · **Severity:** P1-High

## Anomaly
**Expected:** `npm test` in `mcp/` runs deterministically — same commit, same result, green (or a stable known-failures baseline).

**Actual:** `npm test` is **non-deterministic**. On the same commit the failure count swings wildly (observed `122 → 2 → 0` full-suite fails with zero code change). The dominant failure is Postgres error **code 23503** — a foreign-key violation `Key (project_id)=… is not present in table projects` — raised when a test inserts a row (e.g.

[+1,668 bytes not shown — read .cleargate/delivery/pending-sync/BUG-035-MCP-Test-Isolation-FK-Race.md]

## Reproduction
```bash
cd /Users/ssuladze/Documents/Dev/ClearGate/mcp
# Real Postgres 18 @ localhost:5433 (container cleargate-postgres), DATABASE_URL set in .env
npm test ; npm test ; npm test     # 3 consecutive runs → failure count varies; 23503 FK violations appear non-deterministically
```

Isolated (single file, no siblings) — **always green**, proving impl/test design are sound and the fault is cross-file isolation:

```bash
PG_POOL_MAX=1 node --test --test-concurrency=1 --experimental-test-module-mocks --env-file=.env --import tsx/esm 'test/credential-*.node.test.ts'   # 16/16 green, deterministic
```

## Evidence
- Full-suite RUN 1: 522 tests, 122 FAIL (67× 23503). RUN 2 (identical commit): 522 tests, 2 FAIL. Isolated 047 run 1: 3/16 FAIL; reruns 2–4: 16/16. (SPRINT-36 STORY-047-01 verify lenses, mcp@8037b38.)
- FK error: `app_tokens_project_id_projects_id_fk` violation, code 23503, `Key (project_id)=<uuid> is not present in table projects`.

[+997 bytes not shown — read .cleargate/delivery/pending-sync/BUG-035-MCP-Test-Isolation-FK-Race.md]

## Sandbox
- **Repo:** `/Users/ssuladze/Documents/Dev/ClearGate/mcp` (separate git, origin `sandrinio/cleargate-mcp`). Branch **off `main`**: `fix/mcp-test-isolation`.
- **In scope:** every `**/*.node.test.ts` under `mcp/test/`, `mcp/src/`, `mcp/scripts/` that performs an unconditional fixture DELETE. Scope each cleanup DELETE to the file's own `ADMIN_ID`/`created_by` (the `credential-verify-trace.node.test.ts` pattern). Where a file lacks a unique `ADMIN_ID`, give it one. Prefer a small shared helper (e.g.

[+573 bytes not shown — read .cleargate/delivery/pending-sync/BUG-035-MCP-Test-Isolation-FK-Race.md]

<!-- BEGIN relations -->
## Relations
- Parent: [[STORY-047-01-Indexed-Credential-Schema-Verify]]
- Cited by (2): [[BUG-057]], [[EPIC-053]]
<!-- END relations -->
