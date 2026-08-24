---
type: sprint
id: "SPRINT-29"
parent: ""
children: []
status: "Abandoned"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/SPRINT-29_Delivery_Folder_Umbrella.md"
last_ingest: "2026-08-24T09:45:20.081Z"
last_ingest_commit: "dfc4069ef78521b1fbdc15a7659a4aa91afa17a2"
repo: "planning"
---

# SPRINT-29: Delivery Folder Umbrella Restructure

## 0. Stakeholder Brief

- **Sprint Goal:** Restructure `.cleargate/delivery/` into umbrella-grouped folders so related work items co-locate; co-locate sprint telemetry into the sprint folder; ship a migration runbook for target-repo upgrades.
- **Business Outcome:** Discovery time for an epic's children drops from "grep + read N files" to one `ls`. Eliminates ~329 flat-list scans per session for both humans and AI agents. Sprint plan + telemetry stop bifurcating across two trees.
- **Risks (top 3):** (1) Migration touches 329 files atomically — must be transactional. (2) ≥19 cleargate-cli files + 5 hooks + 3 scripts + 2 agents reference delivery paths — high consumer count. (3) Canonical-mirror discipline (cleargate-planning/ + npm payload + live /.claude/) means every edit lands in three places.
- **Metrics:** `Moved: 329, Skipped: 0, Conflicts: 0` from migration script; zero regressions in the four-agent loop during SPRINT-29 itself; M-001 runbook executes clean against test-fixture target repo.

## Sprint Goal

[+10,265 bytes not shown — read .cleargate/delivery/pending-sync/SPRINT-29_Delivery_Folder_Umbrella.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
