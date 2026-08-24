---
type: epic
id: "EPIC-021"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-021_Solo_Onboarding_DX.md"
last_ingest: "2026-08-24T09:45:20.081Z"
last_ingest_commit: "5f8134f8b1ea5ad975d5687114fbf0f84ca1f53e"
repo: "planning"
---

# EPIC-021: Token-First Onboarding — Single-Command Join, OAuth Opt-In

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Make token-based bearer auth the default and only required path for joining a ClearGate workspace from the CLI. The admin panel issues a token; the invitee pastes one command in their terminal; sync works. GitHub OAuth becomes opt-in via --auth github, not the front door.</objective>
  <architecture_rules>
    <rule>Reuse existing primitives. The MCP already implements token + invite mint/redeem at mcp/src/admin-api/{tokens,invites}.ts and bearer validation at mcp/src/auth/service-token.ts. No new auth primitives.</rule>
    <rule>Backwards compatibility is mandatory. Existing OAuth-redeemed ~/.cleargate/auth.json files MUST continue to push without re-issuance.</rule>
    <rule>OAuth (EPIC-019 device-flow) is preserved as opt-in via "cleargate join &lt;url&gt; --auth github".

[+26,958 bytes not shown — read .cleargate/delivery/archive/EPIC-021_Solo_Onboarding_DX.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
