---
type: proposal
id: "PROPOSAL-029"
parent: ""
children: []
status: "Ready"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/PROPOSAL-029_Delivery_Folder_Umbrella_Restructure.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "ec5e6d5673cec3082c3761ae296d81d819ac08f7"
repo: "planning"
---

# PROPOSAL-029: EPIC-029: Delivery Folder Umbrella Restructure

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Restructure .cleargate/delivery/ from flat pending-sync/+archive/ into umbrella-grouped folders (active/&lt;EPIC|SPRINT|CR&gt;/, archive/&lt;same&gt;/) so related work items co-locate; co-locate sprint telemetry from sprint-runs/SPRINT-NN/ into active/SPRINT-NN/; add Task Checklist section to story template populated by Architect; ship migration script + upgrade runbook so target repos can roll forward.</objective>
  <architecture_rules>
    <rule>Umbrella path resolver is a single pure function in cleargate-cli/src/lib/. Push, init, wiki ingest, lifecycle reconciler, migration script, and close_sprint all import from it. Never inline path-joins.</rule>
    <rule>pending-sync/ becomes truly transient: only items between Write and cleargate_push_item live there. Push moves the file to active/&lt;umbrella&gt;/. Close moves the umbrella folder to archive/&lt;umbrella&gt;/.</rule>
    <rule>Sprint co-location is Option α: sprint-runs/SPRINT-NN/ collapses into active/SPRINT-NN/. The .active sentinel relocates.

[+27,518 bytes not shown — read .cleargate/delivery/pending-sync/PROPOSAL-029_Delivery_Folder_Umbrella_Restructure.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
