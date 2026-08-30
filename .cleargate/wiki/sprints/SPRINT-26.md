---
type: sprint
id: "SPRINT-26"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-26_Dogfood_Hardening.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "bdd9a810444df5c7142c80d8b0a75634fc66d741"
repo: "planning"
---

# SPRINT-26: Dogfood Hardening — Issues Surfaced by Live Use

## 0. Stakeholder Brief

First post-SDLC-Hardening sprint. Five items, all dogfood-surfaced from the 2026-05-04/05 test on `markdown_file_renderer`. Three bugs (one P2 regression, one P2 parallel-execution gap, one P3 UX), two CRs (one polish on the v0.11.2 hotfix, one doc clarification). Theme is "fix what real use surfaced", not new capability.

The framework already ships product end-to-end via the four-agent loop (verified in dogfood). This sprint closes the rough edges that real use exposed.

## 1. Consolidated Deliverables

| ID | Type | Title | Severity / Priority |
|---|---|---|---|
| [[BUG-027]] | Bug | Token-ledger fallback grep mis-tags work_item to first lexical EPIC-NNN (regression of BUG-024) | P2-Medium |
| [[BUG-028]] | Bug | Upgrade merge prompt: dry-run vs real-run state mismatch + empty diff render | P3-Low |
| [[BUG-029]] | Bug | Parallel-eligible story dispatches silently serialize | P2-Medium |
| [[CR-059]] | CR | Smarter session-load restart warning — suppress no-op rewrites | Polish |
| [[CR-060]] | CR | Doc clarity: cleargate-planning/ is meta-repo-only (CLAUDE.md edit) | Doc |

[+12,847 bytes not shown — read .cleargate/delivery/archive/SPRINT-26_Dogfood_Hardening.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
