---
type: epic
id: "EPIC-058"
parent: ""
children: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-058_Additive_Multi_Host_Execution_Adapters.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "9443d146a790c2fa08f812d48e35d7f1dc0b41dc"
repo: "planning"
---

# EPIC-058: Additive Multi-Host Execution Adapters

## 0. AI Coding Agent Handoff
*(This section is strictly for downstream AI execution agents. It contains zero business fluff.)*

```xml
<agent_context>
  <objective>Make the npm-installed ClearGate scaffold natively support Claude Code, GitHub Copilot, and OpenAI Codex through additive host adapters that share one `.cleargate/**` core and can coexist in the same target repository.</objective>
  <architecture_rules>
    <rule>All production implementation and canonical npm payload sources MUST live inside the standalone `cleargate-cli` repository; the outer meta-repo and sibling `cleargate-planning/` directory MUST NOT be build-time dependencies.</rule>
    <rule>Preserve `cleargate init` as byte-compatible Claude installation behavior unless the user supplies a host flag.</rule>
    <rule>Use `--host claude`, `--host copilot`, and `--host codex` as explicit additive selectors; `--host portable` expands to Copilot plus Codex, and `--host all` expands to all three.</rule>
    <rule>Repeated host flags and comma-separated host values MUST normalize to a de-duplicated set; installing a new host MUST NOT remove or rewrite another installed host's owned files.</rule>
    <rule>One

[+20,869 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-058_Additive_Multi_Host_Execution_Adapters.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
