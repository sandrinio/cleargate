---
type: epic
id: "EPIC-027"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-027_MCP_Type_Agnostic_Sync_And_Universal_Payload.md"
last_ingest: "2026-08-24T09:45:20.081Z"
last_ingest_commit: "a743603981ddb8788e7bde8cc42dc1fe5ef1a8f4"
repo: "planning"
---

# EPIC-027: MCP Type-Agnostic Sync & Universal Payload Contract

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Relax MCP push-item type validation to an open normalized string, formalize a minimum payload contract (title + status), extract ClearGate-specific gates from the universal push path, and surface a three-layer structured error model (L1 reject codes / L2 warnings / L3 draft-time lint).</objective>
  <architecture_rules>
    <rule>CLI and agent surfaces (cleargate-cli, .claude/agents, repo scripts) MUST NOT import a PM-tool SDK (no @linear/sdk, no jira-client, no azure-devops). They speak only to MCP.</rule>
    <rule>PM-tool adapters live exclusively at mcp/src/adapters/. Credentials are stored against the project row in the admin DB. Configuration happens only through the admin console UI — never via CLI flags or env vars.</rule>
    <rule>items.type column stays text + JSONB payload — no DB CHECK/ENUM. Validation is API-layer only.</rule>
    <rule>Approved gate (STORY-010-07) and cached_gate_result.pass (CR-010) are ClearGate-process artifacts.

[+24,651 bytes not shown — read .cleargate/delivery/archive/EPIC-027_MCP_Type_Agnostic_Sync_And_Universal_Payload.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
