---
story_id: STORY-003-09
parent_epic_ref: EPIC-003
status: Abandoned
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-003_MCP_Adapter.md
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-17T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:45:12.721Z
push_version: 2
---

# STORY-003-09: Audit Middleware

**Complexity:** L2.

## 1. The Spec
Fastify onResponse hook that writes one row to `audit_log` per tool invocation: `{ timestamp, project_id, member_id, client_id, acting_user, tool, target_cleargate_id, result, error_code, ip_address, user_agent }`. No payload bodies logged.

### Detailed Requirements
- Runs for all tool endpoints regardless of success/failure
- Non-blocking: failure to write audit must not fail the request (log the audit failure separately)
- Reads `X-Acting-User` header for service-role tokens

## 2. Acceptance
```gherkin
Scenario: Success creates audit row
  When authenticated push_item succeeds
  Then audit_log has a row with result=ok, tool=push_item, target=<cleargate_id>

Scenario: Failure creates audit row
  When push_item returns 403 (cross-project)
  Then audit_log has a row with result=error, error_code=cross_project

Scenario: Service role logs acting user
  Given service JWT with X-Acting-User: alice@example.com
  When tool invoked
  Then audit_log.acting_user = "alice@example.com"
```

## 3. Implementation
- `mcp/src/middleware/audit.ts`

## 4. Quality Gates
- Integration: verify every tool call produces an audit row

## Ambiguity Gate
🟢.
