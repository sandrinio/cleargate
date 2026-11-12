---
type: epic
id: "EPIC-031"
parent: ""
children: 
  - "[[STORY-031-01]]"
  - "[[STORY-031-02]]"
  - "[[STORY-031-03]]"
  - "[[STORY-031-04]]"
  - "[[STORY-031-05]]"
cites: []
cited_by: 
  - "[[SPRINT-31]]"
  - "[[STORY-031-03]]"
  - "[[STORY-031-04]]"
  - "[[STORY-031-05]]"
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-031_Test_Suite_Wall_Time_Reduction.md"
last_ingest: "2026-11-12T19:31:58.580Z"
last_ingest_commit: "a6e6d2b749ca8aac494c2d5ffd3c13bbe825fb38"
repo: "planning"
sprint_cleargate_id: "SPRINT-31"
---

# EPIC-031: Test Suite Wall-Time Reduction — Split Runner + Scoped QA

**Status:** Draft · **Sprint:** SPRINT-31 · **Gate:** pass

## Objective
Cut sprint-execution wall time by halving full-suite runtime. Two levers: (1) split cleargate-cli/ test runner into test:unit (parallel, default concurrency) + test:db (serial concurrency=1) so the 203/204 non-DB tests stop being serialized behind 1 DB test; (2) make QA-Verify default to scoped tests (touched files only) and switch the default reporter from spec to dot to reduce stdout context burden.

## Problem & Value
**Why are we doing this?**

The five-dispatch sprint execution loop spends most of its wall time on `npm test`. SPRINT-30 ledger data: STORY-070-01 QA-Verify ran ~10min, STORY-071-01 QA-Verify ran ~10min — most of that is the full 204-file suite at concurrency=1. The serialization exists because EPIC-028 set `--test-concurrency=1` to prevent FK-constraint conflicts on DB integration tests.

[+978 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-031_Test_Suite_Wall_Time_Reduction.md]

## Scope
**In:**
- [ ] cleargate-cli/package.json runner split (test:unit + test:db + test wrapper).
- [ ] Rename `bootstrap-root.node.test.ts` → `bootstrap-root.db.node.test.ts`.
- [ ] Reporter default → `dot`; `TEST_REPORTER=spec` env opt-out.
**Out:**
- mcp/ runner split (43 DB files + tsx/esm import style — separate epic).
- admin/ runner split (34 jsdom-bootstrapped files — separate epic).
- Quarantining the 138 known-failing baseline tests (separate effort, surface volatility risk).

[+722 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-031_Test_Suite_Wall_Time_Reduction.md]

## Architecture rules
- cleargate-cli/ runner split: test = test:unit && test:db. test:unit globs all *.node.test.ts EXCEPT *.db.node.test.ts; runs with default concurrency (parallel). test:db globs *.db.node.test.ts only; keeps --test-concurrency=1. Fallback: TEST_REPORTER env var can override default reporter back to spec for debugging.
- DB-test tagging: rename file to *.db.node.test.ts. In cleargate-cli/, ONLY bootstrap-root.node.test.ts qualifies as of 2026-05-24 (verified census). Future DB-touching tests use the .db. infix.

[+971 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-031_Test_Suite_Wall_Time_Reduction.md]

## Decisions
Resolved at draft time — no remaining open questions for the human. (Ambiguity 🟡 Medium → 🟢 Low after Brief approval.)

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (5): [[STORY-031-01]], [[STORY-031-02]], [[STORY-031-03]], [[STORY-031-04]], [[STORY-031-05]]
- Cited by (4): [[SPRINT-31]], [[STORY-031-03]], [[STORY-031-04]], [[STORY-031-05]]
<!-- END relations -->
