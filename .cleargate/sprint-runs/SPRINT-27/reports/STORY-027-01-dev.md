---
work_item: "STORY-027-01"
sprint: "SPRINT-27"
agent: "developer"
lane: "standard"
status: "done"
inner_mcp_commit: "caa8cf8"
red_commit: "3452581"
typecheck: "pass"
tests: "36 passed Red node:test, 331 passed + 1 skipped vitest (pre-existing rate-limit socket noise)"
story_id: "STORY-027-01"
sprint_id: "SPRINT-27"
qa_bounces: "0"
arch_bounces: "0"
---

# STORY-027-01 — Developer Report

## R-coverage
- R1: payload-contract.ts module with KNOWN_TYPES — covered
- R2: TYPE_REGEX + normalizeType — covered
- R3: ValidationError class (full, not stub) — covered (Dev clarification: `-02` can extend without API change)
- R4: push-item.ts uses validator at Zod level — covered
- R5: result.stored_type — covered
- R6: register-tools.ts dropped ITEM_TYPES import — covered (extended to all 4 importers)
- R7: KNOWN_TYPES includes 'sprint' + 'sprint_report' verbatim — covered (CR-064 smoke unblocked)

## Plan deviations
- Extended ITEM_TYPES removal to list-items.ts + cleargate-sync-work-items.ts (4 importers total, M-plan named 2). Reason: typecheck would fail otherwise; same removal scope. ACCEPTED.
- TYPE_REGEX import NOT added to register-tools.ts — Zod schema stays loose (z.string().min(1).max(64)). Reason: TYPE_REGEX would be unused → TS error; the loose-Zod + handler-gate split is the actual design. ACCEPTED.

## Files changed (inner mcp commit caa8cf8)
- mcp/src/lib/payload-contract.ts (NEW)
- mcp/src/tools/push-item.ts
- mcp/src/mcp/register-tools.ts
- mcp/src/tools/sync-status.ts
- mcp/src/tools/list-items.ts
- mcp/src/tools/cleargate-sync-work-items.ts

## Flashcards flagged
- 2026-05-15 · #mcp #open-type #scope-bleed-guard · ITEM_TYPES export chain: push-item.ts, list-items.ts, register-tools.ts, cleargate-sync-work-items.ts all import it — grep all importers before deleting an export.
