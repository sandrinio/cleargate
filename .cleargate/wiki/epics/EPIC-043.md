---
type: epic
id: "EPIC-043"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-043_Framework_Hygiene_And_Efficiency_Remediation.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "5f8134f8b1ea5ad975d5687114fbf0f84ca1f53e"
repo: "planning"
---

# EPIC-043: Framework Hygiene & Efficiency Remediation

## 0. AI Coding Agent Handoff
*(This section is strictly for downstream AI execution agents. It contains zero business fluff.)*

```xml
<agent_context>
  <objective>Garbage-collect three superseded/stale documentation surfaces, cut two
  per-session and per-story efficiency taxes, and remove dead/plumbing surface area —
  without touching the framework's load-bearing core (the 5-agent split, gates 1-4,
  worktree isolation, the MCP items store).</objective>
  <architecture_rules>
    <rule>Do NOT re-implement execution-mode collapse — that is CR-070 (Approved). This Epic SEQUENCES AFTER CR-070 and must not edit the same execution_mode lines.</rule>
    <rule>Do NOT touch parallel-wave (launch_wave.mjs) or the token-ledger 3-level attribution fallback — EPIC-033 shipped these and the fallback is required for parallel dispatch attribution.</rule>
    <rule>Do NOT change QA-Verify's test scope behavior — that is EPIC-031/STORY-031-02. Only reconcile the qa.md PROSE with the shipped behavior + the artifact-diff memory note.</rule>
    <rule>Canonical/payload/live sync is mandatory.

[+24,608 bytes not shown — read .cleargate/delivery/archive/EPIC-043_Framework_Hygiene_And_Efficiency_Remediation.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
