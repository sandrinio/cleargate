---
type: sprint
id: "SPRINT-31"
parent: ""
children: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/SPRINT-31_Test_Speed.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "766a05cb70d9f8951f856151ef0e94d1b6a7d64e"
repo: "planning"
---

# SPRINT-31: Test Speed — Runner Split + Scoped QA

## 0. Sprint Goal

- **Sprint Goal:** Cut sprint-execution test wall time by ≥ 50% on cleargate-cli/ by splitting the test runner (parallel-unit + serial-db) and switching QA-Verify default to scoped tests.

- **Success measure:** `time npm test` on cleargate-cli/ drops from ~10min to ≤ 5min on an 8-core machine; QA-Verify dispatches in the next sprint run scoped by default; full-suite invocations cite a trigger.

## 1. Consolidated Deliverables

| ID | Type | Lane | Milestone | Parallel? | Bounce exposure |
|---|---|---|---|---|---|
| STORY-031-01 | Story | standard | M1 | y | low |
| STORY-031-02 | Story | standard | M1 | y | low |

Both stories are L1/L2 and touch disjoint surfaces (cleargate-cli/package.json + test files vs cleargate-planning/.claude/agents/qa.md + template). They can run in parallel in M1.

## 2. Execution Strategy

_(Architect Sprint Design Review writes §§2.1–2.4 at kickoff. Pre-SDR placeholder.)_

### 2.1 Phase Plan

- **M1 (only milestone):** STORY-031-01 + STORY-031-02 in parallel. Both merge before sprint close.

### 2.2 Merge Ordering

[+1,601 bytes not shown — read .cleargate/delivery/pending-sync/SPRINT-31_Test_Speed.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
