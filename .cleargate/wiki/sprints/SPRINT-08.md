---
type: sprint
id: "SPRINT-08"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-08_End_To_End_Production_Readiness.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "e2fef1f5c8d58f66c94aa3418a1150ece11573d2"
repo: "planning"
---

# SPRINT-08: End-to-End Production Readiness

## Sprint Goal

Ship **EPIC-011 (End-to-End Production Readiness)** — close the four remaining onboarding blockers (CLI wire-up · service-token middleware · bootstrap-root CLI · Coolify deploy execution) so that a brand-new user can run `npm install cleargate && cleargate init && cleargate join <invite-url> && cleargate sync` against a production `mcp.cleargate.<domain>` + `admin.cleargate.<domain>` in under 5 minutes. After this sprint, ClearGate v1-alpha is demonstrably shippable.

## Consolidated Deliverables

### EPIC-011 — End-to-End Production Readiness (4 stories)

- [`STORY-011-01`](STORY-011-01_Wire_Acquire_Into_CLI.md): Wire `acquireAccessToken` into sync / pull / push / sync-log / conflicts / mcp-client — single-flight cache, env-first fallback, clear `no-stored-token` error · **L1**
- [`STORY-011-02`](STORY-011-02_Service_Token_Middleware.md): Service-token middleware on `/mcp` — bcrypt-compare plaintext Bearer against `tokens.token_hash`, chain order JWT → service-token → 401, pino redaction holds · **L2**
- [`STORY-011-03`](STORY-011-03_Bootstrap_Root_Admin.md): `cleargate admin bootstrap-root <handle>` — idempotent SQL via `pg`, refuses second root without

[+9,249 bytes not shown — read .cleargate/delivery/archive/SPRINT-08_End_To_End_Production_Readiness.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
