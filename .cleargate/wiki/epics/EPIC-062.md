---
type: epic
id: "EPIC-062"
parent: ""
children: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-062_dashboard_backlog_board_and_sprint_planner.md"
last_ingest: "2026-11-10T05:56:00.505Z"
last_ingest_commit: ""
repo: "planning"
sprint_cleargate_id: "SPRINT-44"
---

# EPIC-062: Dashboard Backlog Board and Sprint Planner

## 0. AI Coding Agent Handoff
*(This section is strictly for downstream AI execution agents. It contains zero business fluff.)*

```xml
<agent_context>
  <objective>Grow the shipped sprint dashboard into a sprint-independent, three-tab local page (Backlog / Plan / Sprint) whose only write path is a new `cleargate sprint add|remove` command that edits a non-active sprint's item lists and each item's `sprint_cleargate_id`, then re-stamps, gate-checks and wiki-ingests every touched file.</objective>
  <architecture_rules>
    <rule>Extend `cleargate-cli/src/dashboard/**`; do not create a second server, port or daemon.</rule>
    <rule>The Sprint tab renders today's `collect()` output unchanged; `SprintDashboardData` stays backward-compatible (it is also the `/data` contract and the snapshot input).</rule>
    <rule>The page never writes a file itself.

[+20,520 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-062_dashboard_backlog_board_and_sprint_planner.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
