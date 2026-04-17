---
story_id: "STORY-003-04"
parent_epic_ref: "EPIC-003"
status: "Draft"
ambiguity: "🟢 Low"
complexity_label: "L1"
context_source: "PROPOSAL-003_MCP_Adapter.md"
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-17T00:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
---

# STORY-003-04: `pull_item` Tool

**Complexity:** L1 — straightforward read.

## 1. The Spec
Fetch current (or specific) version of an item. Args: `cleargate_id`, `version?` (optional). Returns `{ payload, version, updated_at, updated_by }`.

### Detailed Requirements
- No version arg → return `items.current_payload`
- With `version` → return matching `item_versions.payload` or 404 if not retained
- Scoped to JWT's `project_id`

## 2. Acceptance
```gherkin
Scenario: Pull current
  Given an item at version 5
  When pull_item without version arg
  Then payload matches version 5

Scenario: Pull specific historical version
  Given an item with versions 1..10 retained
  When pull_item with version=3
  Then payload matches version 3

Scenario: Pruned version returns 404
  Given versions older than the last 10 were pruned
  When pull_item with the pruned version number
  Then status 404
```

## 3. Implementation
- `mcp/src/tools/pull-item.ts`

## 4. Quality Gates
- Unit + integration: roundtrip with push + pull; historical fetch; pruned fetch 404

## Ambiguity Gate
🟢 — simple read.
