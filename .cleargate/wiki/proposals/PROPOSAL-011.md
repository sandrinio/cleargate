---
type: proposal
id: "PROPOSAL-011"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/PROPOSAL-011_Execution_V2_Polish.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "e2fef1f5c8d58f66c94aa3418a1150ece11573d2"
repo: "planning"
---

# PROPOSAL-011: Execution v2 Polish & Efficiency Fixes

## Context

SPRINT-09 shipped EPIC-013 (Execution Phase v2) in one calendar day — 9 stories, 78% first-pass, 22% Bug-Fix Tax. CG_TEST SPRINT-01 then dogfooded the full v2 loop end-to-end on a greenfield install (1/1 story, 0 bounces). Both runs exposed concrete friction points in the v2 scaffolding that weren't visible until it was actually in use.

## Problem

The v2 scaffold works but three classes of friction remain:

1. **CLI wrappers are thin.** `cleargate sprint close` doesn't pass `--assume-ack`; `cleargate state update` falls back to `v1-inert` without a `--sprint` context. Orchestrator has to invoke `run_script.sh` directly for several operations the CLI was supposed to cover.
2. **Safety gates that would have caught this sprint's bugs are missing.** 013-06's collateral stash-conflict damage (two unrelated files overwritten) and M2's Gate-2 story-file gap (drafted mid-sprint) are preventable with a file-surface-diff gate + a pre-init story-file assertion.
3. **Orchestration still has manual bash choreography.** Worktree creation, state transitions, merges, archive moves, and sentinel clearing are all hand-operated per story.

[+1,126 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-011_Execution_V2_Polish.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
