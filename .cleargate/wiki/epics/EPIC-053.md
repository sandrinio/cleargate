---
type: epic
id: "EPIC-053"
parent: ""
children: []
cites: 
  - "[[BUG-033]]"
  - "[[BUG-035-MCP-Test-Isolation-FK-Race]]"
  - "[[CR-103]]"
  - "[[CR-126]]"
  - "[[EPIC-032]]"
  - "[[EPIC-033]]"
  - "[[EPIC-043]]"
  - "[[EPIC-052]]"
  - "[[STORY-032-02]]"
  - "[[STORY-033-03]]"
cited_by: 
  - "[[CR-123]]"
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-053_Downstream_DB_Collision_Detection.md"
last_ingest: "2026-11-12T19:31:58.580Z"
last_ingest_commit: "d3ca3bef420c543e8cc459e9333b736e15a556ba"
repo: "planning"
sprint_cleargate_id: "SPRINT-36"
---

# EPIC-053: Downstream DB Collision Detection — Fail-Safe by Default, Derived Not Declared

**Status:** Draft · **Sprint:** SPRINT-36 · **Gate:** pass

## Objective
Make the wave planner's DB-collision axis fail SAFE instead of open, and populate it by derivation from the repo rather than by author declaration, for downstream repos on any stack.

## Problem & Value
**Why are we doing this?**

ClearGate is installed into other teams' repos, and those repos have a real product database. The wave planner has a dedicated DB-collision axis (clause 4) precisely because two stories can write the same table from **different files** — one adds a migration, another adds a query module — leaving their file surfaces disjoint so clause 2 clears them to run concurrently. In a repo whose tests run against real infrastructure with no mocks, concurrent worktrees share **one** development database.

[+2,650 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-053_Downstream_DB_Collision_Detection.md]

## Scope
**In:**
- [ ] **WS1 — Polarity flip: absent ≠ empty (the MVP, ships value alone).** Introduce a third state. `null`/absent = **no evidence → serialize**; `[]` = a detector affirmatively found nothing → proven DB-free; a non-empty list = intersect.
**Out:**
- **Making the whole five-clause predicate executable.** Clauses 1, 2, 3, and 5 are also prose in `architect-synth.md`, and `launch_wave.mjs` cannot even read `waves.json` (it imports only `node:crypto`). That is a real and larger problem, and it is not this epic.

[+6,848 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-053_Downstream_DB_Collision_Detection.md]

## Architecture rules
- Polarity first, derivation second. WS1 (fail-safe) must land before or with WS2-WS5. Shipping derivation onto an axis that still fails open delivers a detector nobody can trust.
- Absent MUST be distinguishable from empty. `db_write_set: []` means "a detector ran and found nothing"; absent/null means "no evidence" and MUST serialize. Never collapse the two.
- Detection is a LADDER and every rung is optional. L0 path globs must work with zero parser and zero TypeScript.

[+777 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-053_Downstream_DB_Collision_Detection.md]

## Decisions
_Empty — the loop is closed. All seven questions were answered by the owner on 2026-08-06 and their
decisions are integrated into §2 (workstreams), §3 (constraints), and §5 (acceptance criteria). The
audit trail is preserved below under **Resolved Decisions**._

<!-- BEGIN relations -->
## Relations
- Parent: none
- Cites (10): [[BUG-033]], [[BUG-035-MCP-Test-Isolation-FK-Race]], [[CR-103]], [[CR-126]], [[EPIC-032]], [[EPIC-033]], [[EPIC-043]], [[EPIC-052]], [[STORY-032-02]], [[STORY-033-03]]
- Cited by (1): [[CR-123]]
<!-- END relations -->
