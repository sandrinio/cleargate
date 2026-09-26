---
type: sprint
id: "SPRINT-41"
parent: ""
children: []
status: "Active"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/SPRINT-41_multi_host_adapters_and_frontmatter_locator.md"
last_ingest: "2026-09-26T13:58:18.382Z"
last_ingest_commit: "bc999833c2f93447876496246c89787064a8b954"
repo: "planning"
---

# SPRINT-41: Multi-Host Adapters & Frontmatter Locator

## 0. Stakeholder Brief

- **Sprint Goal:** Make the frontmatter locator position-independent so freshly scaffolded work items stop corrupting and start gating, and land the first slice of multi-host adapter support with Claude Code proven intact by clean-room verification.
- **Business Outcome:** ClearGate installs and runs under OpenAI Codex as well as Claude Code, from one shared planning core — and every install/upgrade change is from now on proven against a real fresh install rather than against this repo's hand-synced dogfood copy.
- **Risks (top 3):** Claude's intended blocking gates currently signal a non-blocking error; canonical/live hook drift prevents fixes reaching this instance; an alpha Codex loop may complete while enforcement never fires. M0 repairs and real negative controls are mandatory. The inspected active sentinel names SPRINT-41.
- **Metrics:** Fresh-install `cleargate new` → edit → gate cycle passes; clean-room Claude baseline reproduced for both no-flag and `--host all`; `cleargate init --host codex` produces a working Codex install; one real story completes the full Architect→QA-Red→Developer→QA-Verify loop under Codex, evidenced by `STORY-058-13`.

[+73,584 bytes not shown — read .cleargate/delivery/pending-sync/SPRINT-41_multi_host_adapters_and_frontmatter_locator.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
