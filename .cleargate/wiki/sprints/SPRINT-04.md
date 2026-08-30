---
type: sprint
id: "SPRINT-04"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-04_Knowledge_Wiki.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "e2fef1f5c8d58f66c94aa3418a1150ece11573d2"
repo: "planning"
---

# SPRINT-04: Knowledge Wiki Layer (Karpathy pattern)

## Sprint Goal

Ship **EPIC-002 (Knowledge Wiki Layer)** end-to-end, adapted for our three-repo case (meta-planning · `cleargate-cli/` · `mcp/`). After this sprint, every new Claude Code session that opens against any of the three repos (or against a downstream user's repo that has run `cleargate init`) begins by reading `.cleargate/wiki/index.md` (~3k tokens) and has full situational awareness — what shipped, what's in flight, what's blocked, what's planned, what cross-invalidates — without scanning raw directories. Duplicate-proposal detection, blast-radius flagging, gate-enforcement on drift, and the Karpathy "file-back-to-topics" compounding loop all become automatic. The wiki bundles into the `cleargate` npm package so `cleargate init` scaffolds it alongside the existing `.claude/agents/` + `.cleargate/{knowledge,templates,delivery}/` payload from Phase 2a/b.

## Consolidated Deliverables

### EPIC-002 — Knowledge Wiki Layer (9 stories, all in `.cleargate/delivery/pending-sync/`-equivalent state today)

[+21,915 bytes not shown — read .cleargate/delivery/archive/SPRINT-04_Knowledge_Wiki.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
