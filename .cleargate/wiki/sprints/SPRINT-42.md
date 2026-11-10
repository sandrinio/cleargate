---
type: sprint
id: "SPRINT-42"
parent: ""
children: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/SPRINT-42_planning_catches_what_execution_stopped_for.md"
last_ingest: "2026-11-10T18:20:47.120Z"
last_ingest_commit: "7ba61eb5110056cbc5302b31b3248bf5e2331090"
repo: "planning"
---

# SPRINT-42: Planning Catches What Execution Stopped For

## 0. Stakeholder Brief

A downstream ClearGate install (Kurnera) stopped four of six UI stories mid-sprint for an owner decision. Every one of those conflicts was already visible in the story drafts. Its designer agent only read them once each story was already running.

This sprint moves that review to the one place ClearGate already halts for the owner: plan confirmation. A repo lists its own reviewer agents (a designer, for a UI repo) under `sprint.draft_reviewers`. Each one reads every story draft at kickoff, and its findings arrive as a single batch of owner questions before anything executes. Three smaller rules close the other gaps that sprint exposed. The surface-gate fix stops story commits from being checked against the wrong story.

Three of the four rules land on files `cleargate upgrade` overwrites, so only an upstream fix reaches every install.

## Sprint Goal

- **Sprint Goal:** Move to plan confirmation the owner decisions a downstream sprint paid for mid-execution, and make the surface gate check each story commit against that story's own surface.

[+7,038 bytes not shown — read .cleargate/delivery/pending-sync/SPRINT-42_planning_catches_what_execution_stopped_for.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
