---
type: epic
id: "EPIC-005"
parent: ""
children: 
  - "[[STORY-005-01]]"
  - "[[STORY-005-02]]"
  - "[[STORY-005-03]]"
  - "[[STORY-005-04]]"
  - "[[STORY-005-05]]"
  - "[[STORY-005-06]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-005_Admin_CLI.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "2691d20a51eb6e8211a9ec862c0ec0ddf8c09601"
repo: "planning"
---

# EPIC-005: Admin CLI + Client Bootstrap

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Ship two CLIs: (a) cleargate-admin — headless administrative ops run by a root admin against an MCP instance (create-project, invite, issue-token, revoke-token); (b) cleargate join — the client-side onboarding flow that a Vibe Coder runs locally to exchange an invite token for a long-lived refresh token stored in the OS keychain.</objective>
  <architecture_rules>
    <rule>cleargate-admin lives in mcp/scripts/ — ships with the MCP service; operator runs it against the MCP URL with an admin JWT.</rule>
    <rule>cleargate join lives in cleargate-cli/ — a separate npm package that Vibe Coders install globally.</rule>
    <rule>Refresh tokens stored in OS keychain via keytar (or equivalent); file fallback is ~/.cleargate/auth.json with chmod 600.</rule>
    <rule>Invite tokens are one-time-use, short-lived (24h), and bound to project_id + email.</rule>
    <rule>Both CLIs call the Admin API (EPIC-004) for state-changing operations — never write to the DB directly.</rule>
  </architecture_rules>
  <target_files>
    <file path="mcp/scripts/cleargate-admin.ts" action="create" />
    <file

[+8,228 bytes not shown — read .cleargate/delivery/archive/EPIC-005_Admin_CLI.md]

## Blast radius
Affects: [[STORY-005-01]], [[STORY-005-02]], [[STORY-005-03]], [[STORY-005-04]], [[STORY-005-05]], [[STORY-005-06]]
