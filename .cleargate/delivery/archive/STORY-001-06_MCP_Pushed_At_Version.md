---
story_id: STORY-001-06
parent_epic_ref: EPIC-001
parent_cleargate_id: "EPIC-001"
status: "Abandoned"
ambiguity: 🟢 Low
complexity_label: L1
context_source: PROPOSAL-001_Document_Metadata.md
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-17T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
depends_on:
  - STORY-003-03
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:43:43.616Z
push_version: 3
---

# STORY-001-06: MCP `push_item` Writes `server_pushed_at_version`

**Complexity:** L1 — small addition to push handler.

## 1. The Spec
When `push_item` succeeds, inject `server_pushed_at_version` (from MCP's own `codebase-version` at the moment of push) into the persisted payload's frontmatter block.

### Dependency
Requires STORY-003-03 (`push_item` tool) to exist.

## 2. Acceptance
```gherkin
Scenario: Push stamps server version
  Given MCP container built from SHA "b1c4d8a"
  When push_item succeeds
  Then the stored current_payload frontmatter has server_pushed_at_version="b1c4d8a"
```

## 3. Implementation
- `mcp/src/tools/push-item.ts` — add version injection before persist
- `mcp/src/utils/codebase-version.ts` — same helper as cleargate-cli's (or shared)

## 4. Quality Gates
- Integration: push + pull → verify field present in returned payload

## Ambiguity Gate
🟢.
