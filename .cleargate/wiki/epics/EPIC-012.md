---
type: epic
id: "EPIC-012"
parent: ""
children: []
cites: []
cited_by: []
status: "Abandoned"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-012_Full_Stack_Sync_Coverage.md"
last_ingest: "2026-11-13T01:02:08.963Z"
last_ingest_commit: "a743603981ddb8788e7bde8cc42dc1fe5ef1a8f4"
repo: "planning"
sprint_cleargate_id: "SPRINT-08"
---

# EPIC-012: Full-Stack Sync Coverage (Sprints, Reports, Plans, Flashcards)

**Status:** Abandoned · **Sprint:** SPRINT-08 · **Gate:** pass

## Objective
Extend MCP's sync surface to cover the three Business↔IT artefacts currently excluded from push_item: sprint plans, sprint reports, and architect milestone plans. After this Epic, a Business stakeholder visiting admin.cleargate.&lt;domain&gt; can read the full sprint package (plan + story list + report + per-milestone architect notes) in one place, and any developer pulling the project gets the same mirror in their local .cleargate/. Team-wide FLASHCARD.md becomes a project-scoped "lessons" record too.

## Problem & Value
**Why are we doing this?**
SPRINT-08 shipped the four onboarding blockers and proved the Business↔IT sync loop end-to-end for stories/epics/proposals/CRs/bugs. But during the SPRINT-08 prod bulk-push, five SPRINT files silently failed with `cannot determine item type from frontmatter` — MCP's `push_item` enum only accepts six types, none are `"sprint"`.

[+1,932 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-012_Full_Stack_Sync_Coverage.md]

## Scope
**In:**
- [ ] **Story 1: Extend `push_item` type enum to include `"sprint"`.** Add to the Zod enum in `mcp/src/tools/push-item.ts`, regenerate openapi schema, add unit test for sprint push.
**Out:**
- Token ledger sync (`token-ledger.jsonl`). Per-machine agent telemetry; aggregation is a separate analytics concern.
- `.cleargate/wiki/` sync.

[+1,733 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-012_Full_Stack_Sync_Coverage.md]

## Architecture rules
- Extend the existing push_item enum — do NOT introduce a parallel push_sprint/push_report path. MCP's type column already supports free-text; only the Zod enum gates it. Single code path = single auth + audit path.
- Reports and milestone plans are NOT stored as top-level items — they ride on the parent sprint's payload as payload.report_body (string) and payload.plans: { "M1": "...", "M2": "..." } (record).

[+913 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-012_Full_Stack_Sync_Coverage.md]

## Decisions
*All scope-level questions resolved 2026-04-21 via review of SPRINT-08 prod-bulk-push failures + Business↔IT transparency gap surfaced in that sprint:*

1. **Why not make report + plans first-class items (their own `items` rows)?** — Tried that during scoping.

[+2,007 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-012_Full_Stack_Sync_Coverage.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
<!-- END relations -->
