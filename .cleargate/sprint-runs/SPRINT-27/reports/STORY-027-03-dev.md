---
work_item: "STORY-027-03"
sprint: "SPRINT-27"
agent: "developer"
lane: "standard"
status: "done"
inner_mcp_commit: "80e1a08"
red_commit: "34e8890"
typecheck: "pass"
tests_027_03: "28 passed, 0 failed"
tests_regression: "65 passed, 0 failed (5 Red files -01/-02 + 331 vitest baseline)"
story_id: "STORY-027-03"
sprint_id: "SPRINT-27"
qa_bounces: "0"
arch_bounces: "0"
---

# STORY-027-03 — Developer Report

## R-coverage
- R1-R8: all covered.

## Plan deviations
- Advisory strip handles both positions: body-start (no H1) AND immediately after H1. Reason: Red test revealed the simple `/^\[advisory...\]\n/` regex only matches position 0; H1-present bodies re-stack. Fixed with dual-case strip. ACCEPTED.
- `cleargate-cli/src/commands/push.ts` also stamps `payload.origin = 'cleargate-cli'` idempotently (R8 spans both sides). Outer-repo touch flagged. ACCEPTED.

## Files changed
Inner mcp (commit 80e1a08):
- mcp/src/lib/payload-contract.ts (ORIGIN_CLEARGATE_CLI + originRequiresGates)
- mcp/src/tools/push-item.ts (originRequiresGates wrap + dual-case advisory strip + console.warn dedup Set)
- mcp/src/tools/pull-item.ts (ItemNotFoundError.code → item_not_found + readonly hint field)
- mcp/src/tools/sync-status.ts (origin migration)
- mcp/src/mcp/register-tools.ts (stampedArgs with origin default)

Outer (story/STORY-027-03):
- cleargate-cli/src/commands/push.ts (stamps payload.origin for CLI side)

## Flashcards flagged
- 2026-05-15 · #advisory #idempotent #push-item · Advisory strip-and-replace must handle both positions: body start (no H1) AND immediately after H1 — pos-0 regex misses H1 bodies; use dual-case regex.
