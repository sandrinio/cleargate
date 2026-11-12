---
type: epic
id: "EPIC-028"
parent: ""
children: 
  - "[[STORY-028-04]]"
  - "[[STORY-028-05]]"
  - "[[STORY-028-06]]"
  - "[[STORY-028-07]]"
  - "[[STORY-028-08]]"
cites: []
cited_by: 
  - "[[CR-092]]"
  - "[[EPIC-056]]"
  - "[[SPRINT-28]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-028_Vitest_Elimination.md"
last_ingest: "2026-11-12T21:25:29.802Z"
last_ingest_commit: "a743603981ddb8788e7bde8cc42dc1fe5ef1a8f4"
repo: "planning"
sprint_cleargate_id: "SPRINT-28"
---

# EPIC-028: Vitest Elimination — One Test Runner

**Status:** Completed · **Sprint:** SPRINT-28 · **Gate:** pass

## Objective
Convert every vitest-using test file in the repo (~222 files across cleargate-cli/, mcp/, admin/) to node:test, then remove the vitest dependency, configs, and scripts. After this Epic the repo has exactly one test runner: node:test (via tsx).

## Problem & Value
**Why are we doing this?**

The repo runs two test runners (vitest + node:test) since SPRINT-22's 2026-05-04 decision that `npm test` routes to node:test, while ~222 legacy vitest files stay accessible via `npm run test:vitest`.

[+1,808 bytes not shown — read .cleargate/delivery/archive/EPIC-028_Vitest_Elimination.md]

## Scope
**In:**
- [ ] **STORY-028-NN: Codemod tool.** `cleargate-cli/scripts/codemod-vitest-to-node-test.mjs` reads `.test.ts` / `.spec.ts` files, transforms the AST (via ts-morph or babel), writes back as `*.node.test.ts`.
**Out:**
- Switching node:test for a third runner (jest, ava, uvu). The 2026-05-04 decision picked node:test; this Epic doesn't revisit that.
- Reorganizing test directory structure (test/ vs src/__tests__/). Convert in place.

[+2,282 bytes not shown — read .cleargate/delivery/archive/EPIC-028_Vitest_Elimination.md]

## Architecture rules
- node:test is the only runner. After EPIC-028 lands, package.json across all three packages has zero vitest references; vitest.config.ts files are deleted; npm run test:vitest is removed.
- File naming convention: every test file uses *.node.test.ts. Codemod renames *.test.ts → *.node.test.ts as part of the conversion. *.spec.ts files convert in place but get renamed to *.node.test.ts.
- API mapping is mechanical for ~80% of cases.

[+1,078 bytes not shown — read .cleargate/delivery/archive/EPIC-028_Vitest_Elimination.md]

## Decisions
1. **Q1: Codemod tool — ts-morph vs babel-parser vs plain regex?** **Resolved:** ts-morph. Strong typing on AST + already familiar (`cleargate-cli/scripts` uses it elsewhere). Avoids regex fragility on complex describe/it nesting.
2. **Q2: Conversion batch order — by package or by directory?** **Resolved:** by package. mcp/ first (smallest, exposes mocks early), cleargate-cli/ second (largest, mostly DI), admin/ third (UI + svelte-testing-library risk).

[+698 bytes not shown — read .cleargate/delivery/archive/EPIC-028_Vitest_Elimination.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (5): [[STORY-028-04]], [[STORY-028-05]], [[STORY-028-06]], [[STORY-028-07]], [[STORY-028-08]]
- Cited by (3): [[CR-092]], [[EPIC-056]], [[SPRINT-28]]
<!-- END relations -->
