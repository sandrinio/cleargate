---
type: epic
id: "EPIC-062"
parent: ""
children: 
  - "[[STORY-062-01]]"
  - "[[STORY-062-02]]"
  - "[[STORY-062-03]]"
  - "[[STORY-062-04]]"
  - "[[STORY-062-05]]"
  - "[[STORY-062-06]]"
cites: 
  - "[[CR-084-Sprint-Dashboard-In-CLI-Payload]]"
  - "[[CR-097]]"
  - "[[CR-101]]"
  - "[[CR-102]]"
  - "[[EPIC-030]]"
  - "[[PROPOSAL-009]]"
cited_by: 
  - "[[STORY-062-05]]"
  - "[[STORY-062-06]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-062_dashboard_backlog_board_and_sprint_planner.md"
last_ingest: "2026-11-12T19:31:58.580Z"
last_ingest_commit: "9d2bc8c9597007f7d12cf32c477364a29752960b"
repo: "planning"
sprint_cleargate_id: "SPRINT-44"
---

# EPIC-062: Dashboard Backlog Board and Sprint Planner

**Status:** Completed · **Sprint:** SPRINT-44 · **Gate:** pass

## Objective
Grow the shipped sprint dashboard into a sprint-independent, three-tab local page (Backlog / Plan / Sprint) whose only write path is a new `cleargate sprint add|remove` command that edits a non-active sprint's item lists and each item's `sprint_cleargate_id`, then re-stamps, gate-checks and wiki-ingests every touched file.

## Problem & Value
**Why are we doing this?**
ClearGate's planning state lives in ~137 markdown files under `.cleargate/delivery/pending-sync/`. The only visual surface, the sprint dashboard, shows one active sprint and shuts itself down when no sprint is active. Seeing what is open, what is 🟢 and gate-passing, and what belongs in the next sprint means grepping frontmatter or asking the agent.

[+1,683 bytes not shown — read .cleargate/delivery/archive/EPIC-062_dashboard_backlog_board_and_sprint_planner.md]

## Scope
**In:**
- [ ] Sprint-independent lifecycle: new top-level `cleargate dashboard [--open|--serve|--stop|--port]`, with `cleargate sprint dashboard` kept as an alias.
**Out:**
- Creating a new sprint file from the page. It stays `cleargate new sprint` or the agent.
- Rewriting the sprint plan body: §1 Consolidated Deliverables, the Sprint Design Review, `waves.json`.

[+2,498 bytes not shown — read .cleargate/delivery/archive/EPIC-062_dashboard_backlog_board_and_sprint_planner.md]

## Architecture rules
- Extend `cleargate-cli/src/dashboard/**`; do not create a second server, port or daemon.
- The Sprint tab renders today's `collect()` output unchanged; `SprintDashboardData` stays backward-compatible (it is also the `/data` contract and the snapshot input).
- The page never writes a file itself. `POST /plan` calls the same handler as the `cleargate sprint add|remove` CLI command, in-process.

[+936 bytes not shown — read .cleargate/delivery/archive/EPIC-062_dashboard_backlog_board_and_sprint_planner.md]

## Decisions
*(AI Planning Engine: List edge cases, contradictions, or missing details found while drafting. The Epic stays 🔴 until the Human answers all of these.)*

All questions resolved 2026-11-10. Owner: "agree with your recommendations." Answers are integrated into §2–§5:

[+826 bytes not shown — read .cleargate/delivery/archive/EPIC-062_dashboard_backlog_board_and_sprint_planner.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (6): [[STORY-062-01]], [[STORY-062-02]], [[STORY-062-03]], [[STORY-062-04]], [[STORY-062-05]], [[STORY-062-06]]
- Cites (6): [[CR-084-Sprint-Dashboard-In-CLI-Payload]], [[CR-097]], [[CR-101]], [[CR-102]], [[EPIC-030]], [[PROPOSAL-009]]
- Cited by (2): [[STORY-062-05]], [[STORY-062-06]]
<!-- END relations -->
