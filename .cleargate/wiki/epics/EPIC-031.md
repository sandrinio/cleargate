---
type: epic
id: "EPIC-031"
parent: ""
children: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-031_Test_Suite_Wall_Time_Reduction.md"
last_ingest: "2026-08-24T09:45:20.081Z"
last_ingest_commit: "766a05cb70d9f8951f856151ef0e94d1b6a7d64e"
repo: "planning"
---

# EPIC-031: Test Suite Wall-Time Reduction — Split Runner + Scoped QA

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Cut sprint-execution wall time by halving full-suite runtime. Two levers: (1) split cleargate-cli/ test runner into test:unit (parallel, default concurrency) + test:db (serial concurrency=1) so the 203/204 non-DB tests stop being serialized behind 1 DB test; (2) make QA-Verify default to scoped tests (touched files only) and switch the default reporter from spec to dot to reduce stdout context burden.</objective>
  <architecture_rules>
    <rule>cleargate-cli/ runner split: test = test:unit && test:db. test:unit globs all *.node.test.ts EXCEPT *.db.node.test.ts; runs with default concurrency (parallel). test:db globs *.db.node.test.ts only; keeps --test-concurrency=1. Fallback: TEST_REPORTER env var can override default reporter back to spec for debugging.</rule>
    <rule>DB-test tagging: rename file to *.db.node.test.ts. In cleargate-cli/, ONLY bootstrap-root.node.test.ts qualifies as of 2026-05-24 (verified census). Future DB-touching tests use the .db. infix.

[+9,676 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-031_Test_Suite_Wall_Time_Reduction.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
