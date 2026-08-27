---
type: epic
id: "EPIC-056"
parent: ""
children: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-056_CI_Verification_Layer.md"
last_ingest: "2026-08-25T21:20:01.280Z"
last_ingest_commit: ""
repo: "planning"
---

# EPIC-056: CI verification layer — environment-independent proof that tests pass

> **Not scheduled.** Filed 2026-08-26. Prerequisite for [[CR-107]]'s deferred story-PR half and for a GitHub merge queue under [[EPIC-055]].

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Add GitHub Actions workflows to cleargate-cli, cleargate-mcp and cleargate-admin that run typecheck plus the full test suite on push and pull_request, and wire them as required status checks.</objective>
  <architecture_rules>
    <rule>Must use node:test via tsx — the single-runner rule (EPIC-028). Do NOT reintroduce vitest</rule>
    <rule>Must run database tests against real infra (docker-compose Postgres 18 + Redis 8) — the no-mocks rule</rule>
    <rule>admin/ tests require the `node --conditions browser` flag for jsdom-bootstrap</rule>
    <rule>No changes to the five-agent loop — CI supplements QA, it does not replace it</rule>
    <rule>No deployment steps — Coolify owns deploy for mcp and admin; npm publish stays manual</rule>
  </architecture_rules>
  <target_files>
    <file path=".github/workflows/ci.yml" action="create" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**

[+7,215 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-056_CI_Verification_Layer.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
