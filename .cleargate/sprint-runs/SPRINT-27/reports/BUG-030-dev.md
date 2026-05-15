---
work_item: BUG-030
sprint: SPRINT-27
agent: developer
lane: standard
status: done
commit: c173c72
red_commit: 785ca0d
repo: inner-mcp (sprint/S-27 branch)
typecheck: pass
tests: 4 passed Red node:test; 331 passed 1 skipped vitest full suite (pre-existing socket errors in rate-limit.test.ts unrelated)
migration: mcp/src/db/migrations/0009_aspiring_vapor.sql
---

# BUG-030 — Developer Report

## R-coverage
- R1: schema.ts items.updatedByMemberId nullability + onDelete('set null') — covered
- R2: New migration 0009_aspiring_vapor.sql — covered
- R3: members.ts try/catch + 23503 → 409 — covered
- R4: 204 path unchanged — covered

## Plan deviations
- Migration named `0009_aspiring_vapor.sql` (drizzle-kit generated) instead of hand-crafted `0008_bug030_fk_set_null.sql`. Reason: hand-written 0008 lacked drizzle-kit snapshot; drizzle-kit generate produced canonical 0009 with full schema snapshot; 0008 removed from journal. `orchestrator_confirmed: pending` → ACCEPTED (correct toolchain practice for drizzle-managed schema).
- Two type-widening fixes in items.ts and pull-item.ts. Reason: making updatedByMemberId nullable propagated TS2345/TS2322 to downstream callers. Required for typecheck. `orchestrator_confirmed: pending` → ACCEPTED (necessary type-system fallout).

## Files changed (all under mcp/)
- mcp/src/db/schema.ts
- mcp/src/db/migrations/0009_aspiring_vapor.sql (NEW)
- mcp/src/db/migrations/meta/_journal.json
- mcp/src/db/migrations/meta/0009_snapshot.json (NEW)
- mcp/src/admin-api/members.ts
- mcp/src/admin-api/items.ts (type-widening)
- mcp/src/tools/pull-item.ts (type-widening)

## Flashcards flagged
- 2026-05-15 · #schema #migration #postgres · Postgres 18 stores NOT NULL as named constraints (e.g. items_col_not_null); ALTER COLUMN DROP NOT NULL alone does not drop them — also DROP CONSTRAINT IF EXISTS the named constraint.
