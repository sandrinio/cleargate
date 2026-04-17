---
story_id: "STORY-005-04"
parent_epic_ref: "EPIC-005"
status: "Draft"
ambiguity: "🟢 Low"
complexity_label: "L1"
context_source: "PROPOSAL-003_MCP_Adapter.md"
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-17T00:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
depends_on: ["STORY-004-04"]
---

# STORY-005-04: `cleargate-admin revoke-token`

**Complexity:** L1.

## 1. The Spec
Calls `DELETE /tokens/:tid`; prints confirmation.

## 2. Acceptance
```gherkin
Scenario: Revoke
  When cleargate-admin revoke-token <tid>
  Then stdout confirms revocation
  And the token cannot authenticate subsequent MCP calls
```

## 3. Implementation
- `mcp/scripts/commands/revoke-token.ts`

## Ambiguity Gate
🟢.
