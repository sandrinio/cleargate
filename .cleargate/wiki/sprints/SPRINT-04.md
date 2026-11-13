---
type: sprint
id: "SPRINT-04"
parent: ""
children: []
cites: []
cited_by: 
  - "[[EPIC-002]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-04_Knowledge_Wiki.md"
last_ingest: "2026-11-13T01:02:08.963Z"
last_ingest_commit: "e2fef1f5c8d58f66c94aa3418a1150ece11573d2"
repo: "planning"
sprint_cleargate_id: "SPRINT-04"
report_raw_path: ".cleargate/sprint-runs/SPRINT-04/REPORT.md"
last_report_ingest_commit: "6883a94781e46a04f797d1e76e74a69b95c21b33"
---

# SPRINT-04: Knowledge Wiki Layer (Karpathy pattern)

**Status:** Completed · **Dates:** 2026-04-19 → 2026-04-19 · **Gate:** not run

## Goal
Ship **EPIC-002 (Knowledge Wiki Layer)** end-to-end, adapted for our three-repo case (meta-planning · `cleargate-cli/` · `mcp/`). After this sprint, every new Claude Code session that opens against any of the three repos (or against a downstream user's repo that has run `cleargate init`) begins by reading `.cleargate/wiki/index.md` (~3k tokens) and has full situational awareness — what shipped, what's in flight, what's blocked, what's planned, what cross-invalidates — without scanning raw directories. Duplicate-proposal detection, blast-radius flagging, gate-enforcement on drift, and the Karpathy "file-back-to-topics" compounding loop all become automatic. The wiki bundles into the `cleargate` npm package so `cleargate init` scaffolds it alongside the existing `.claude/agents/` + `.cleargate/{knowledge,templates,delivery}/` payload from Phase 2a/b.

## Deliverables
### EPIC-002 — Knowledge Wiki Layer (9 stories, all in `.cleargate/delivery/pending-sync/`-equivalent state today)

- [`STORY-002-01`](STORY-002-01_Protocol_Section_10.md): Protocol §10 — add "Knowledge Wiki Protocol" to `cleargate-protocol.md` (ingest/query/lint, backlink syntax `[[ID]]`, gate-blocking rules, page schema, `log.md` YAML event format). Edit `.cleargate/knowledge/cleargate-protocol.md`; mirror to `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md`. · L1
- [`STORY-002-02`](STORY-002-02_Wiki_Ingest_Subagent.md): `cleargate-wiki-ingest` subagent definition (model: haiku). Triggered by PostToolUse hook on write to `.cleargate/delivery/**` or `.cleargate/plans/**`. Writes per-item wiki page + log.md entry + recompiles affected synthesis pages. Ships as canonical source at `cleargate-planning/.claude/agents/cleargate-wiki-ingest.md` (installed via `cleargate init`). · L2
- [`STORY-002-03`](STORY-002-03_Wiki_Query_Subagent.md): `cleargate-wiki-query` subagent definition (model: haiku). Auto-invoked at triage (read-only mode) and on `cleargate wiki query --persist` (file-back mode → `wiki/topics/<slug>.md` with `cites:` frontmatter). · L1
- [`STORY-002-04`](STORY-002-04_Wiki_Lint_Subagent.md): `cleargate-wiki-lint` subagent definition (model: sonnet). Enforcement mode: refuses Gate 1 (Proposal approval) + Gate 3 (Push) on drift.

[+3,089 bytes not shown — read .cleargate/delivery/archive/SPRINT-04_Knowledge_Wiki.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Cited by (1): [[EPIC-002]]
<!-- END relations -->
<!-- BEGIN sprint-report -->
## Sprint Report
**Report status:** unknown · **Report:** .cleargate/sprint-runs/SPRINT-04/REPORT.md

### Carried Over
(none recorded)
<!-- END sprint-report -->
