---
type: sprint
id: "SPRINT-28"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-28_Reconcile_Finish_Harvest.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "77b6da7136ff086393fcd6ad3a9b57aa7a13de62"
repo: "planning"
---

# SPRINT-28: Reconcile, Finish, Harvest

## 0. Stakeholder Brief

- **Sprint Goal:** Three foundation tracks — sprint-close parent reconciliation (CR-066), status-vocabulary unification to `Completed` (CR-067), and full vitest elimination (EPIC-028) — plus EPIC-010 closeout (STORY-010-02), wiki-lint bugfix (BUG-004), and a one-shot reconciler harvest pass against the six stale epics surfaced 2026-05-16.
- **Business Outcome:** (a) Sprint close stops leaking stale Epic statuses — six rotting epics get reconciled in one pass, and every future sprint maintains parent state automatically. (b) ONE and only one meaning of "done" across all artifact types — `Completed`. Reconciler and gate-check simplify; cross-artifact audit queries collapse to one terminal label. (c) ONE test runner in the repo — node:test only. Two-runner cognitive overhead eliminated; vitest dep + configs removed. (d) EPIC-010 formally completes after STORY-010-02 ships. (e) BUG-004 closes.
- **Risks (top 3):** EPIC-028 is the largest scope item — 222 file conversions in three batches; risk of svelte-testing-library incompat in the admin/ batch (mitigated by early preflight).

[+26,316 bytes not shown — read .cleargate/delivery/archive/SPRINT-28_Reconcile_Finish_Harvest.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
