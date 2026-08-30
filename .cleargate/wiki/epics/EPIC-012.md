---
type: epic
id: "EPIC-012"
parent: ""
children: []
status: "Abandoned"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-012_Full_Stack_Sync_Coverage.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "a743603981ddb8788e7bde8cc42dc1fe5ef1a8f4"
repo: "planning"
---

# EPIC-012: Full-Stack Sync Coverage (Sprints, Reports, Plans, Flashcards)

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Extend MCP's sync surface to cover the three Business↔IT artefacts currently excluded from push_item: sprint plans, sprint reports, and architect milestone plans. After this Epic, a Business stakeholder visiting admin.cleargate.&lt;domain&gt; can read the full sprint package (plan + story list + report + per-milestone architect notes) in one place, and any developer pulling the project gets the same mirror in their local .cleargate/. Team-wide FLASHCARD.md becomes a project-scoped "lessons" record too.</objective>
  <architecture_rules>
    <rule>Extend the existing push_item enum — do NOT introduce a parallel push_sprint/push_report path. MCP's type column already supports free-text; only the Zod enum gates it. Single code path = single auth + audit path.</rule>
    <rule>Reports and milestone plans are NOT stored as top-level items — they ride on the parent sprint's payload as payload.report_body (string) and payload.plans: { "M1": "...", "M2": "..." } (record).

[+17,338 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-012_Full_Stack_Sync_Coverage.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
