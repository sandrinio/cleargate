---
type: epic
id: "EPIC-011"
parent: ""
children: 
  - "[[STORY-011-01]]"
  - "[[STORY-011-02]]"
  - "[[STORY-011-03]]"
  - "[[STORY-011-04]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-011_End_To_End_Production_Readiness.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "2691d20a51eb6e8211a9ec862c0ec0ddf8c09601"
repo: "planning"
---

# EPIC-011: End-to-End Production Readiness (Auth + Bootstrap + Deploy)

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Close the four remaining blockers that prevent a brand-new real user from successfully onboarding onto a deployed ClearGate instance: (1) CLI commands must use the refresh-token-in-keychain that `cleargate join` produces (not a pasted env JWT); (2) Admin-UI-issued project service tokens must authenticate against MCP (currently stored but never verified); (3) first-root-admin seeding must be a CLI command, not a raw psql INSERT; (4) MCP + Admin must actually run on Coolify behind `admin.cleargate.<domain>` + `mcp.cleargate.<domain>` with TLS. After this Epic, `npm install cleargate && cleargate init && cleargate join <url> && cleargate sync` is the complete day-one experience.</objective>
  <architecture_rules>
    <rule>Reuse existing JWT issuance (`mcp/src/auth/jwt.ts`) and token store (`cleargate-cli/src/auth/factory.ts`) — do not introduce a second auth path.</rule>
    <rule>Service-token middleware verifies `Authorization: Bearer <plaintext>` via bcrypt-compare against `tokens.token_hash`; on match, issues a short-lived access JWT with `role: 'user'` and the matched member's project_id.

[+19,412 bytes not shown — read .cleargate/delivery/archive/EPIC-011_End_To_End_Production_Readiness.md]

## Blast radius
Affects: [[STORY-011-01]], [[STORY-011-02]], [[STORY-011-03]], [[STORY-011-04]]
