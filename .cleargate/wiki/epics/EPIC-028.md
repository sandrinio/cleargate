---
type: epic
id: "EPIC-028"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-028_Vitest_Elimination.md"
last_ingest: "2026-08-24T09:45:20.081Z"
last_ingest_commit: "a743603981ddb8788e7bde8cc42dc1fe5ef1a8f4"
repo: "planning"
---

# EPIC-028: Vitest Elimination — One Test Runner

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Convert every vitest-using test file in the repo (~222 files across cleargate-cli/, mcp/, admin/) to node:test, then remove the vitest dependency, configs, and scripts. After this Epic the repo has exactly one test runner: node:test (via tsx).</objective>
  <architecture_rules>
    <rule>node:test is the only runner. After EPIC-028 lands, package.json across all three packages has zero vitest references; vitest.config.ts files are deleted; npm run test:vitest is removed.</rule>
    <rule>File naming convention: every test file uses *.node.test.ts. Codemod renames *.test.ts → *.node.test.ts as part of the conversion. *.spec.ts files convert in place but get renamed to *.node.test.ts.</rule>
    <rule>API mapping is mechanical for ~80% of cases. The codemod handles: describe/it/expect → node:test test()/t.test()/assert; import 'vitest' → import { test } from 'node:test' + import assert from 'node:assert/strict'; beforeAll/afterAll/beforeEach/afterEach → before/after/beforeEach/afterEach.</rule>
    <rule>vi.mock / vi.fn / vi.spyOn / vi.useFakeTimers / vi.stubGlobal require per-file manual fixes.

[+17,678 bytes not shown — read .cleargate/delivery/archive/EPIC-028_Vitest_Elimination.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
