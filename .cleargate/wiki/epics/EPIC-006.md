---
type: epic
id: "EPIC-006"
parent: ""
children: 
  - "[[STORY-006-01]]"
  - "[[STORY-006-02]]"
  - "[[STORY-006-03]]"
  - "[[STORY-006-04]]"
  - "[[STORY-006-05]]"
  - "[[STORY-006-06]]"
  - "[[STORY-006-07]]"
  - "[[STORY-006-08]]"
  - "[[STORY-006-09]]"
  - "[[STORY-006-10]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-006_Admin_UI.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "df788e44cbb85fc71c13016b80799a517cde93db"
repo: "planning"
---

# EPIC-006: Admin UI (SvelteKit)

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Build the ClearGate Admin web UI — a SvelteKit + DaisyUI + Tailwind app that admins log into via GitHub OAuth to manage projects, members, tokens, and view audit logs + basic stats. Talks exclusively to the MCP's admin API (EPIC-004).</objective>
  <architecture_rules>
    <rule>No direct database access. Only the admin API.</rule>
    <rule>GitHub OAuth via @auth/sveltekit is the only login path in v1.</rule>
    <rule>Sessions stored in Redis (shared with MCP service).</rule>
    <rule>Admin JWT is short-lived (15 min) — fetched on login, refreshed silently via @auth/sveltekit middleware.</rule>
    <rule>Token plaintext shown exactly once, in a modal, with explicit "I've saved it" confirmation before dismissal.</rule>
    <rule>No PII stored beyond what admin API provides.</rule>
    <rule>Visual language is defined by knowledge/design-guide.md — the custom DaisyUI `cleargate` theme, token palette, typography, spacing, and component patterns there are authoritative.

[+9,601 bytes not shown — read .cleargate/delivery/archive/EPIC-006_Admin_UI.md]

## Blast radius
Affects: [[STORY-006-01]], [[STORY-006-02]], [[STORY-006-03]], [[STORY-006-04]], [[STORY-006-05]], [[STORY-006-06]], [[STORY-006-07]], [[STORY-006-08]], [[STORY-006-09]], [[STORY-006-10]]
