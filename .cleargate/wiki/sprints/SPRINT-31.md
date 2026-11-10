---
type: sprint
id: "SPRINT-31"
parent: ""
children: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/SPRINT-31_Test_Speed.md"
last_ingest: "2026-11-10T18:20:47.120Z"
last_ingest_commit: "a6e6d2b749ca8aac494c2d5ffd3c13bbe825fb38"
repo: "planning"
---

# SPRINT-31: Test Speed — Runner Split + Scoped QA

> **SUPERSEDED 2026-09-06 — retired as a sprint, not as work.**
> This sprint was drafted 2026-05-24 and never kicked off. Its goal and both child stories move
> under [[SPRINT-42]], which extends [[EPIC-031]] with STORY-031-03/04/05 from the 2026-09-06
> execution-efficiency audit. [[STORY-031-01]] (runner split) and [[STORY-031-02]] (QA-Verify
> scoping) remain valid and are **not** cancelled — 031-02 needs one correction first: it derives
> touched files from the QA Context Pack, which `prep_qa_context.mjs` has never once generated.
> Repoint it at the §Test Stack rows STORY-031-03 adds.
> Do not kick off SPRINT-31. Retained for its evidence trail (SPRINT-30 ledger, 204-file census).

## 0. Sprint Goal

- **Sprint Goal:** Cut sprint-execution test wall time by ≥ 50% on cleargate-cli/ by splitting the test runner (parallel-unit + serial-db) and switching QA-Verify default to scoped tests.

- **Success measure:** `time npm test` on cleargate-cli/ drops from ~10min to ≤ 5min on an 8-core machine; QA-Verify dispatches in the next sprint run scoped by default; full-suite invocations cite a trigger.

## 1. Consolidated Deliverables

[+2,235 bytes not shown — read .cleargate/delivery/pending-sync/SPRINT-31_Test_Speed.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
