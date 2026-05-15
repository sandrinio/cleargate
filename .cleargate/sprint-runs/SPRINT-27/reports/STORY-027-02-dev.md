---
work_item: STORY-027-02
sprint: SPRINT-27
agent: developer
lane: standard
status: done
inner_mcp_commit: 51c432c
red_commit: 0d5ab7f
typecheck: pass
tests_027_02: 29 passed, 0 failed
tests_027_01_regression: 36 passed, 0 failed
vitest_full: 331 passed, 1 skipped (pre-existing rate-limit socket noise)
---

# STORY-027-02 — Developer Report

## R-coverage
- R1-R8: all covered per Dev report.

## Plan deviations
- sync-status.ts edited in -02 (not -03). Reason: stored payload contains server_pushed_at_version from prior push; new reserved-key check fires before skipApprovedGate gate; fix required to not break existing sync-status vitest. Minimal fix (strip RESERVED_PAYLOAD_KEYS before re-pushing); preserves behavior -03 will migrate via origin policy. ACCEPTED.

## Files changed (inner mcp commit 51c432c)
- mcp/src/lib/payload-contract.ts (extended: RESERVED_PAYLOAD_KEYS, MAX_PAYLOAD_BYTES_DEFAULT, full ValidationError)
- mcp/src/tools/push-item.ts (4 reject paths inserted above skipApprovedGate)
- mcp/src/tools/sync-status.ts (strip RESERVED_PAYLOAD_KEYS pre-republish — deviation)
- mcp/src/mcp/register-tools.ts (minor adjustment)

## Flashcards flagged
- 2026-05-15 · #mcp #reserved-keys · syncStatus re-pushes stored payload which already contains server_pushed_at_version — strip RESERVED_PAYLOAD_KEYS before re-passing to pushItem
