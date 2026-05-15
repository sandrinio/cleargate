---
work_item: "STORY-027-04"
sprint: "SPRINT-27"
agent: "developer"
lane: "standard"
status: "done"
inner_mcp_commit: "a69536a"
red_commit: "fe786ae"
migration_file: "mcp/src/db/migrations/0009_sad_mindworm.sql"
typecheck: "pass"
tests_027_04: "57 passed, 0 failed"
tests_regression: "331 passed, 1 skipped (pre-existing)"
story_id: "STORY-027-04"
sprint_id: "SPRINT-27"
qa_bounces: "0"
arch_bounces: "0"
---

# STORY-027-04 — Developer Report

## R-coverage
- R1-R9: all covered.

## Plan deviations (all ACCEPTED post-hoc)
- CLEARGATE_ID_TYPE_REGEX relaxed to `/^[A-Z][A-Z0-9_]*(-[A-Z0-9]+)+$/`. Reason: Red tests use test-harness IDs (CUSTOM-AUDIT-RED-01) with alpha sub-segments; strict digits-only contradicted those tests.
- Per-warning audit rows written inside `pushItem` (not `runTool`). Reason: Red tests call pushItem directly without MCP transport.
- Migration named `0009_sad_mindworm.sql` (drizzle picked the next slot; coexists with `0009_aspiring_vapor.sql` from BUG-030 — drizzle tracks by journal hash not filename).

## Files changed (inner mcp commit a69536a)
- mcp/src/lib/payload-contract.ts (CLEARGATE_ID_TYPE_REGEX + CLEARGATE_ID_NUMERIC_REGEX + isKnownIdFormat + Warning type)
- mcp/src/db/schema.ts (auditLog warningCode + origin columns)
- mcp/src/db/migrations/0009_sad_mindworm.sql (NEW)
- mcp/src/db/migrations/meta/0009_snapshot.json (NEW)
- mcp/src/db/migrations/meta/_journal.json
- mcp/src/middleware/audit.ts (warnings → audit_log writer)
- mcp/src/mcp/register-tools.ts
- mcp/src/tools/push-item.ts (PushItemResult.warnings + warning emission + per-warning audit row)
- mcp/src/tools/push-item.test.ts (vitest fixture updated to avoid missing_recommended_fields)
- mcp/src/routes/join.test.ts (allowedKeys set extended)

## Flashcards flagged
- 2026-05-15 · #migration #drizzle #sequence · drizzle-kit reuses next available sequence slot regardless of gaps; duplicate slot names coexist if journal hash differs.
- 2026-05-15 · #audit-log #push-item #test-isolation · pushItem-direct-call tests fail if new logic emits warnings — suppress with complete payload.
- 2026-05-15 · #cleargate-id #regex · CLEARGATE_ID_TYPE_REGEX with alpha sub-segments allows test-harness IDs; lowercase-kebab still rejected.
