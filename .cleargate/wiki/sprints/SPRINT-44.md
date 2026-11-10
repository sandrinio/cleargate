---
type: sprint
id: "SPRINT-44"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-44_dashboard_backlog_board_and_sprint_planner.md"
last_ingest: "2026-11-10T18:20:47.120Z"
last_ingest_commit: "9d2bc8c9597007f7d12cf32c477364a29752960b"
repo: "planning"
---

# SPRINT-44: Dashboard Backlog Board and Sprint Planner

## 0. Stakeholder Brief

ClearGate's plan lives in about 140 markdown files. Today the only visual view is the sprint dashboard, which shows one running sprint and shuts down between sprints. Seeing what is ready, and putting a sprint together, means reading frontmatter or hand-editing YAML lists in two places that drift apart.

This sprint turns the dashboard into one local page with three tabs. **Backlog** lists every open item with its approval and gate result. **Plan** lets the owner tick items into a draft sprint and warns about anything that would fail preflight. **Sprint** is today's live view, unchanged. One new command, `cleargate sprint add|remove`, does the writing for both the page and the agent. It keeps the sprint file and each item in agreement and refreshes their gate results and wiki pages.

[+42,914 bytes not shown — read .cleargate/delivery/archive/SPRINT-44_dashboard_backlog_board_and_sprint_planner.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
