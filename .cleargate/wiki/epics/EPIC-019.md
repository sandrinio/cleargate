---
type: epic
id: "EPIC-019"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-019_Pluggable_Identity_Bound_Invite_Auth.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "08bdacb0657f9a24021eb40ba9b31b7f5379b38a"
repo: "planning"
---

# EPIC-019: Pluggable Identity-Bound Invite Auth

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Replace bearer-only invite redemption with identity-bound redemption pluggable across multiple auth providers (GitHub OAuth, email magic-link, future Google/SSO). Invite URL alone must no longer suffice to mint a member JWT.</objective>
  <architecture_rules>
    <rule>Existing `cleargate admin login` (GitHub device flow at mcp/src/admin-api/auth-device-poll.ts) is the prior-art pattern — extend it, do not duplicate it</rule>
    <rule>Already-redeemed JWTs MUST remain valid; this epic changes the redemption gate, not the post-redemption auth model</rule>
    <rule>Provider-specific code lives behind an `IdentityProvider` interface; `mcp/src/routes/join.ts` MUST NOT branch on provider name</rule>
    <rule>No PII in logs (FLASHCARD 2026-04-18 #cli #plaintext-redact still applies — invite URLs and OAuth codes are secrets)</rule>
    <rule>Schema change adds columns/tables; no destructive drops on `invites` or `members`</rule>
  </architecture_rules>
  <target_files>
    <file path="mcp/src/db/schema.ts" action="modify" />
    <file path="mcp/src/routes/join.ts" action="modify" />
    <file

[+10,933 bytes not shown — read .cleargate/delivery/archive/EPIC-019_Pluggable_Identity_Bound_Invite_Auth.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
