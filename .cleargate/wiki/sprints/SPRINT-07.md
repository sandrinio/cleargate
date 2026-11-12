---
type: sprint
id: "SPRINT-07"
parent: ""
children: []
cites: []
cited_by: []
status: "Abandoned"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/SPRINT-07_Multi_Participant_MCP_Sync.md"
last_ingest: "2026-11-12T21:25:29.802Z"
last_ingest_commit: "a743603981ddb8788e7bde8cc42dc1fe5ef1a8f4"
repo: "planning"
sprint_cleargate_id: "SPRINT-07"
report_raw_path: ".cleargate/sprint-runs/SPRINT-07/REPORT.md"
last_report_ingest_commit: "6883a94781e46a04f797d1e76e74a69b95c21b33"
---

# SPRINT-07: Multi-Participant MCP Sync v1

**Status:** Abandoned · **Sprint:** SPRINT-07 · **Gate:** not run

## Goal
Ship **EPIC-010 (Multi-Participant MCP Sync, v1)** end-to-end — bidirectional sync between ClearGate's local markdown state and the remote PM tool (Linear first concrete adapter; generic `PmAdapter` interface for Jira / GitHub Projects later). After this sprint, (a) a Business stakeholder can draft a proposal in Linear tagged `cleargate:proposal` and have it land in `.cleargate/delivery/pending-sync/` automatically on the next `cleargate sync`; (b) two developers sharing a repo see each other's pushed items without re-drafting; (c) local content edits and remote status changes reconcile via a three-way-merge prompt (content+content) or a silent remote-wins (status+status) with full sync-log attribution; (d) every push carries `pushed_by` + `pushed_at`; (e) the SessionStart hook nudges "N remote updates since yesterday" once per 24h. This Epic is the **product's core value proposition** — without it ClearGate is a single-developer tool, with it Business and IT share one backlog from their native tools.

## Deliverables
### EPIC-010 — Multi-Participant MCP Sync v1 (8 stories)

- [`STORY-010-01`](STORY-010-01_Identity_And_SyncLog_Foundation.md): Identity resolver + sync-log library + template frontmatter fields — participant.json at `cleargate init`, precedence `.participant.json → CLEARGATE_USER → git → host`, append-only `sync-log.jsonl`, 5 templates gain `pushed_by` / `pushed_at` / `last_pulled_*` / `source` · **L2**
- [`STORY-010-02`](STORY-010-02_MCP_Pull_And_List_Endpoints.md): Four new MCP endpoints + generic `PmAdapter` interface — `cleargate_pull_item`, `list_remote_updates`, `pull_comments`, `detect_new_items`; `PmAdapter` interface in `mcp/src/adapters/` with `linear-adapter.ts` as v1 concrete impl · **L3**
- [`STORY-010-03`](STORY-010-03_Conflict_Detector_And_Merge_Helper.md): Conflict detector + three-way merge helper — pure `classify()` over PROP-007 §2.3 matrix (8 states); CLI `promptThreeWayMerge` with `[k]eep / [t]ake / [e]dit / [a]bort` · **L2**
- [`STORY-010-04`](STORY-010-04_Cleargate_Sync_Driver.md): `cleargate sync` / `pull` / `conflicts` / `sync-log` commands + frontmatter merge helper — driver enforces pull → detect → resolve → push ordering; `--dry-run`; single-item `pull <ID>`; halted-conflict surfacing · **L3**
-

[+1,157 bytes not shown — read .cleargate/delivery/pending-sync/SPRINT-07_Multi_Participant_MCP_Sync.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
<!-- END relations -->
<!-- BEGIN sprint-report -->
## Sprint Report
**Report status:** unknown · **Report:** .cleargate/sprint-runs/SPRINT-07/REPORT.md

### Carried Over
(none recorded)
<!-- END sprint-report -->
