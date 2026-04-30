---
story_id: STORY-003-10
parent_epic_ref: EPIC-003
parent_cleargate_id: "EPIC-003"
status: Abandoned
ambiguity: 🟡 Medium
complexity_label: L3
context_source: PROPOSAL-003_MCP_Adapter.md
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-17T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:45:31.079Z
push_version: 2
---

# STORY-003-10: Streamable HTTP Transport

**Complexity:** L3 — SDK API may have drifted since training cutoff.

## 1. The Spec
Register the four tools through `@modelcontextprotocol/sdk`'s Streamable HTTP transport. Wire Fastify's request handler to the SDK's transport. Validate one live roundtrip from a minimal MCP client.

### Detailed Requirements
- Single endpoint (POST + GET) at `/mcp`
- Transport verifies JSON-RPC framing
- Auth middleware runs before tools dispatch

## 2. Acceptance
```gherkin
Scenario: Tools register
  When server boots
  Then the MCP SDK lists push_item, pull_item, list_items, sync_status as registered

Scenario: Live tool call
  Given an authenticated MCP client
  When it calls push_item over /mcp
  Then response is a valid MCP tool result with { version, updated_at }
```

## 3. Implementation
- `mcp/src/server.ts` — register MCP transport + tools
- `mcp/src/mcp/transport.ts` — adapter glue between SDK and Fastify

## 4. Quality Gates
- Integration: minimal MCP client (in tests) performs push + pull
- Manual: verify against SDK's current `.d.ts` + docs

## 6. Open question
1. **SDK API verification step.** Do the install + docs-fetch before writing this Story's code, not during. *Default: pre-story spike — `npm i @modelcontextprotocol/sdk@latest && WebFetch current transport docs` before coding.*

## Ambiguity Gate
🟡 — will drop to 🟢 after the SDK verification spike.
