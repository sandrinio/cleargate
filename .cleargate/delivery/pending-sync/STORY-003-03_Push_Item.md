---
story_id: STORY-003-03
parent_epic_ref: EPIC-003
status: Draft
ambiguity: 🟢 Low
complexity_label: L3
context_source: PROPOSAL-003_MCP_Adapter.md
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-17T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:45:17.917Z
push_version: 2
---

# STORY-003-03: `push_item` Tool (Versioning + Prune)

**Complexity:** L3 — core business logic, concurrency, invariants.

## 1. The Spec
Implement `push_item` MCP tool. On call, upsert into `items` with row-level lock; archive prior `current_payload` to `item_versions`; increment `current_version`. DB trigger (STORY-003-01) prunes to last 10. Return `{ version, updated_at }`.

### Detailed Requirements
- Args: `cleargate_id`, `type`, `payload`, `idempotency_key`
- Lock row via `SELECT ... FOR UPDATE` inside a transaction
- On first push: insert new `items` row at version 1, insert `item_versions` row at version 1
- On subsequent push: archive prior payload to `item_versions`, update `items` row
- Enforce project scope — `project_id` from JWT, never body

## 2. Acceptance
```gherkin
Scenario: First push creates version 1
  When authenticated push_item with new cleargate_id
  Then items.current_version = 1
  And item_versions has one row at version 1

Scenario: Concurrent pushes serialize
  Given item at version N
  When two pushes arrive in quick succession
  Then both succeed
  And items.current_version = N+2
  And item_versions has both intermediate versions

Scenario: Cross-project access rejected
  Given JWT scoped to project P
  When attempting push_item against payload claiming project Q
  Then status 403; no DB write
```

## 3. Implementation
- `mcp/src/tools/push-item.ts` — handler
- `mcp/src/db/queries/upsert-item.ts` — transactional upsert

## 4. Quality Gates
- Integration: concurrent push test (2 Promise.all) → no duplicate versions
- Integration: 11 pushes → verify prune to last 10

## Ambiguity Gate
🟢 — per PROPOSAL-003 and EPIC-003.
