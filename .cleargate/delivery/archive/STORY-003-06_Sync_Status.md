---
story_id: STORY-003-06
parent_epic_ref: EPIC-003
status: Abandoned
ambiguity: 🟢 Low
complexity_label: L1
context_source: PROPOSAL-003_MCP_Adapter.md
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-17T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:44:51.309Z
push_version: 2
---

# STORY-003-06: `sync_status` Tool

**Complexity:** L1.

## 1. The Spec
Convenience wrapper around `push_item` that updates only the status field of an item's current payload.

### Detailed Requirements
- Args: `cleargate_id`, `new_status`
- Loads current payload, merges `{ status: new_status }`, pushes through normal versioning
- Preserves `idempotency` semantics via auto-generated key from `(cleargate_id, new_status, version)`

## 2. Acceptance
```gherkin
Scenario: Status update
  Given item at version N with status=draft
  When sync_status(cleargate_id, "ready")
  Then version N+1 exists with status=ready
  And all other payload fields preserved
```

## 3. Implementation
- `mcp/src/tools/sync-status.ts` — thin wrapper delegating to push-item logic

## 4. Quality Gates
- Integration: roundtrip, verify other fields unchanged

## Ambiguity Gate
🟢.
