---
epic_id: EPIC-028
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-28
carry_over: false
status: Approved
approved: true
approved_by: sandrinio
approved_at: 2026-05-17T00:00:00Z
ambiguity: 🟢 Low
context_source: |
  Direct user direction 2026-05-17 during SPRINT-28 slate sizing, in response
  to CR-029 re-triage question: "no vitests!!!!". User then selected
  "Convert all ~129 vitest files in SPRINT-28" via AskUserQuestion — promotes
  the scope from CR-029's engine-only swap to a full repo-wide elimination.

  Verified file count 2026-05-17 (rg over *.test.ts + *.spec.ts importing
  vitest): 222 files total — 138 in cleargate-cli/, 50 in mcp/, 34 in
  admin/. Three vitest.config.ts roots to delete (one per package).

  53 *.node.test.ts files already use node:test (not in scope; left as-is).

  Reverses memory feedback_npm_test_routes_node_test.md 2026-05-04 "permanent
  two-runner state" decision. Updated memory captures the reversal.
  CR-029 (engine-only scope) abandoned 2026-05-17 with reason pointing here.
proposal_gate_waiver: true
proposal_gate_waiver_reason: |
  Direct user ask with sharp intent ("no vitests!!!!") + explicit option
  selection via AskUserQuestion. Recorded in context_source per memory
  feedback_proposal_gate_waiver.md.
owner: sandrinio
target_date: 2026-06-01
created_at: 2026-05-17T00:00:00Z
updated_at: 2026-05-16T20:00:00Z
created_at_version: cleargate@0.12.0
updated_at_version: cleargate@0.12.0
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-16T23:34:29Z
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-028
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-16T23:31:16Z
  sessions: []
pushed_by: sandro.suladze@gmail.com
pushed_at: 2026-05-16T23:31:34.893Z
push_version: 2
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
    <rule>vi.mock / vi.fn / vi.spyOn / vi.useFakeTimers / vi.stubGlobal require per-file manual fixes. Strategy: prefer DI refactor over node:test mocking; node:test's t.mock surface is limited. Per-call stub via assignment is acceptable for trivial cases.</rule>
    <rule>Batch by package, not by file type. Convert mcp/ first (smallest at 50 files, integration-heavy → exposes the most mock patterns early), then cleargate-cli/ (138 files, mostly unit), then admin/ (34 files, mostly UI).</rule>
    <rule>Each batch ships as one story with one commit. Story = one package conversion.</rule>
    <rule>npm test runs node:test only (already true since 2026-05-04). After this Epic, that's the only test command — no opt-in vitest path.</rule>
    <rule>Adjacent CR-067 vocab unification ships in parallel; they touch disjoint surfaces (tests vs frontmatter) so no merge ordering needed.</rule>
  </architecture_rules>
  <target_files>
    <file path="cleargate-cli/scripts/codemod-vitest-to-node-test.mjs" action="create" />
    <file path="cleargate-cli/scripts/codemod-vitest-to-node-test.node.test.ts" action="create" />
    <file path="mcp/test/**/*.test.ts" action="modify" />
    <file path="cleargate-cli/test/**/*.test.ts" action="modify" />
    <file path="cleargate-cli/test/**/*.spec.ts" action="modify" />
    <file path="admin/src/**/*.test.ts" action="modify" />
    <file path="mcp/vitest.config.ts" action="delete" />
    <file path="cleargate-cli/vitest.config.ts" action="delete" />
    <file path="admin/vitest.config.ts" action="delete" />
    <file path="mcp/package.json" action="modify" />
    <file path="cleargate-cli/package.json" action="modify" />
    <file path="admin/package.json" action="modify" />
    <file path="cleargate-planning/.claude/agents/developer.md" action="modify" />
    <file path="CLAUDE.md" action="modify" />
    <file path="cleargate-planning/CLAUDE.md" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**

The repo runs two test runners (vitest + node:test) since SPRINT-22's 2026-05-04 decision that `npm test` routes to node:test, while ~222 legacy vitest files stay accessible via `npm run test:vitest`. The two-runner state was a pragmatic dodge: vitest's fork pool burned RAM during parallel-agent sprint execution (FLASHCARDs 2026-05-01 `#vitest #leak #posttest` + 2026-05-02 `#vitest #ram #parallel-agents`), but a full conversion was deemed too costly at the time.

2026-05-17 user direction reversed that: "no vitests!!!!" + explicit selection of "Convert all ~129 vitest files in SPRINT-28" via AskUserQuestion. Recount confirms 222 vitest files, not 129 — the original 2026-05-04 estimate was low.

Two-runner state costs:
- Cognitive overhead: every Dev/QA dispatch needs to know which suite runs where. Test additions go in the wrong file convention (`.test.ts` vs `.node.test.ts`) silently.
- CI/local divergence: `npm test` passes on a feature branch while `npm run test:vitest` regresses, but no one runs the latter except during specific investigations.
- Mock API drift: new tests written against `vi.mock` lock the codebase into vitest semantics; later conversion requires rewriting the same mock against node:test or refactoring to DI.
- Dependency surface: vitest pulls a large transitive graph (esbuild, vite, @vitest/*). Removing it shrinks `node_modules` and `npm install` time noticeably.

**Success Metrics (North Star):**
- `rg "from 'vitest'|from \"vitest\"" mcp/ cleargate-cli/ admin/` → zero matches after this Epic.
- `rg "vi\.(mock|fn|spyOn|stubGlobal|useFakeTimers)" mcp/ cleargate-cli/ admin/` → zero matches.
- `find . -name 'vitest.config.*' -not -path '*/node_modules/*'` → zero files.
- `grep -l vitest mcp/package.json cleargate-cli/package.json admin/package.json` → zero matches (neither deps nor scripts).
- `npm test` in each package runs node:test only and passes green.
- `npm install` `node_modules` size drops measurably (target ≥10%; verified post-Epic).

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This — 5 Stories)**

- [ ] **STORY-028-NN: Codemod tool.** `cleargate-cli/scripts/codemod-vitest-to-node-test.mjs` reads `.test.ts` / `.spec.ts` files, transforms the AST (via ts-morph or babel), writes back as `*.node.test.ts`. Handles: imports (`from 'vitest'` → `from 'node:test'` + `from 'node:assert/strict'`), describe/it nesting, expect → assert.* mappings, before*/after* hooks, async patterns. Skip files with `vi.mock` / `vi.fn` / `vi.spyOn` / `vi.useFakeTimers` / `vi.stubGlobal` and emit a manual-fix list. L2.
- [ ] **STORY-028-NN: mcp/ conversion.** 50 vitest files → 50 node:test files. Codemod handles ~80%; manual fix for vi.mock sites (DB layer mocks → real Postgres via existing docker-compose). Delete `mcp/vitest.config.ts`, remove `vitest` from `mcp/package.json` deps + scripts. L3.
- [ ] **STORY-028-NN: cleargate-cli/ conversion.** 138 vitest files → 138 node:test files. Largest batch. DI-first style already dominates (per CR-029 §1 analysis: only 1 real vi.mock site in cleargate-cli/test/), so manual-fix burden is low. Delete `cleargate-cli/vitest.config.ts`, remove vitest from `cleargate-cli/package.json`. L3.
- [ ] **STORY-028-NN: admin/ conversion.** 34 vitest files → 34 node:test files. Mostly Svelte component tests via `@testing-library/svelte`. Verify @testing-library/svelte works with node:test (or swap to a node:test-compatible alternative if needed). Delete `admin/vitest.config.ts`, remove vitest from `admin/package.json`. L2.
- [ ] **STORY-028-NN: Docs + agent prompts + flashcard cleanup.** Update `CLAUDE.md` (live + canonical) to remove any "two-runner" language. Update `cleargate-planning/.claude/agents/developer.md` test-runner instructions. Append flashcard `2026-05-NN · #vitest #migration · post-EPIC-028 the repo runs node:test only; never re-add vitest`. Wiki rebuild. L1.

**❌ OUT-OF-SCOPE (Do NOT Build This)**

- Switching node:test for a third runner (jest, ava, uvu). The 2026-05-04 decision picked node:test; this Epic doesn't revisit that.
- Reorganizing test directory structure (test/ vs src/__tests__/). Convert in place.
- Migrating to a different assertion library (chai, sinon-chai, expect-type). Use `node:assert/strict`.
- Converting node:test files (the 53 existing `*.node.test.ts`) to anything else. They're the target form.
- Performance benchmarking the converted suites against the vitest baseline. Speed is not the goal; runner unification is.
- Mock library replacement for vi.mock sites that require a heavyweight mock framework. Strategy: refactor to DI; if DI is impossible, surface to human for per-case decision.
- Coverage tooling migration. If vitest coverage is in use, document the gap; a follow-up CR picks a node:test-compatible coverage tool (c8 / native v8).

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Mock API gap | node:test's `t.mock` is limited compared to vitest's `vi.*`. ~80% of mocks should refactor to DI; the remaining 20% need per-file manual fix. |
| Coverage gap | If any package uses vitest coverage today, this Epic loses that surface. Document the regression; follow-up CR picks c8 or native v8 coverage. |
| Svelte component tests | `@testing-library/svelte` works with vitest's jsdom integration. Verify node:test compatibility early (in admin/ story preflight); if broken, swap to a node:test-friendly testing pattern or escalate. |
| Atomic conversion per package | Each package's conversion ships as ONE commit with vitest fully removed. Mid-state (some files converted, vitest still in deps) is forbidden — leaves the runner in an indeterminate state. |
| Real-infra invariant | Database tests stay against real Postgres + Redis (flashcard `#mocked-tests`). Conversion does not introduce mocks. |
| Mirror parity | `CLAUDE.md` + `cleargate-planning/CLAUDE.md` updates land together. `cleargate-planning/.claude/agents/developer.md` mirrors via prebuild — touch canonical only. |
| Sprint-end gate | `npm test` green across all three packages at sprint close. If any package's conversion is incomplete, the package's vitest config + script must remain (mid-state forbidden); the story does not merge until the package is fully converted. |

## 4. Technical Grounding

**Affected files (verified 2026-05-17):**

- `mcp/vitest.config.ts`, `cleargate-cli/vitest.config.ts`, `admin/vitest.config.ts` — DELETE.
- `mcp/package.json`, `cleargate-cli/package.json`, `admin/package.json` — remove `vitest` + `@vitest/*` from deps; remove `test:vitest` script if present; ensure `test` script runs node:test via tsx.
- `mcp/test/**/*.test.ts` (50 files) — convert.
- `cleargate-cli/test/**/*.test.ts` + `**/*.spec.ts` (138 files) — convert.
- `admin/src/**/*.test.ts` + `admin/test/**/*.test.ts` (34 files) — convert.
- `cleargate-cli/scripts/codemod-vitest-to-node-test.mjs` — new codemod runner.
- `cleargate-cli/scripts/codemod-vitest-to-node-test.node.test.ts` — codemod tests (golden-fixture in/out pairs).
- `cleargate-planning/.claude/agents/developer.md` — update test-runner section.
- `CLAUDE.md` + `cleargate-planning/CLAUDE.md` — remove any "two-runner" language; add one-line "node:test is the only runner" rule.
- `.cleargate/FLASHCARD.md` — append post-Epic lesson.

**Codemod transformations (mechanical, ~80% coverage):**

| Vitest pattern | node:test pattern |
|---|---|
| `import { describe, it, expect, beforeAll } from 'vitest'` | `import { describe, test, before } from 'node:test'; import assert from 'node:assert/strict'` |
| `it('...', () => {})` | `test('...', () => {})` |
| `expect(x).toBe(y)` | `assert.strictEqual(x, y)` |
| `expect(x).toEqual(y)` | `assert.deepStrictEqual(x, y)` |
| `expect(x).toThrow()` | `assert.throws(() => x())` |
| `expect(fn).toHaveBeenCalledWith(arg)` | (refactor: assert recorded calls via DI; node:test t.mock is limited) |
| `beforeAll/afterAll` | `before/after` |
| `beforeEach/afterEach` | `beforeEach/afterEach` (same name; from `node:test`) |
| `vi.mock(...)` | manual fix: DI refactor OR per-call assignment stub |
| `vi.fn()` | manual fix: define a recorder function inline |
| `vi.spyOn(obj, 'method')` | manual fix: wrap method, restore in afterEach |
| `vi.useFakeTimers()` | manual fix: avoid timer mocking; use real `setTimeout` with short timeouts |
| `vi.stubGlobal('x', val)` | manual fix: assign + restore in afterEach |

**Data Changes:** none. Tests only.

## 5. Acceptance Criteria

```gherkin
Feature: Vitest Elimination

  Scenario: Codemod converts a vitest file with no vi.* API to node:test
    Given a vitest file using describe/it/expect/beforeAll only
    When I run the codemod
    Then the file is renamed *.node.test.ts
    And the import line is "import { describe, test, before } from 'node:test'"
    And the file contains "import assert from 'node:assert/strict'"
    And `node --test --import tsx <file>` exits 0

  Scenario: Codemod flags files with vi.* API for manual fix
    Given a vitest file containing vi.mock('./mod', ...)
    When I run the codemod
    Then the file is NOT auto-converted
    And the codemod's manual-fix report lists the file with the offending API names

  Scenario: mcp/ package is fully converted
    Given the mcp/ conversion story has merged
    When I grep mcp/ for "from 'vitest'"
    Then zero matches
    And mcp/vitest.config.ts does not exist
    And mcp/package.json contains no vitest entries
    And `cd mcp && npm test` exits 0

  Scenario: cleargate-cli/ package is fully converted
    Given the cleargate-cli/ conversion story has merged
    When I grep cleargate-cli/ for "from 'vitest'"
    Then zero matches
    And cleargate-cli/vitest.config.ts does not exist
    And cleargate-cli/package.json contains no vitest entries
    And `cd cleargate-cli && npm test` exits 0

  Scenario: admin/ package is fully converted
    Given the admin/ conversion story has merged
    When I grep admin/ for "from 'vitest'"
    Then zero matches
    And admin/vitest.config.ts does not exist
    And admin/package.json contains no vitest entries
    And `cd admin && npm test` exits 0

  Scenario: Docs and agent prompts reflect single-runner state
    Given EPIC-028's docs story has merged
    When a developer agent reads developer.md or CLAUDE.md
    Then no mention of "two-runner" or "npm run test:vitest" remains
    And one-line rule "node:test is the only runner" is present in both files

  Scenario: Sprint-end full-suite test green
    Given all 5 EPIC-028 stories have merged
    When I run `npm test` in each of mcp/, cleargate-cli/, admin/
    Then each exits 0
    And the elapsed time is reported in REPORT.md §5 Process

  Scenario: Error path — vitest references reappear after Epic ships
    Given EPIC-028 has shipped and vitest is fully removed
    When a developer accidentally adds a new test file with `import ... from 'vitest'`
    Then the CI pre-commit hook (or `npm run lint`) fails with a clear Error message naming the file
    And the message reads "Error: vitest reference detected at <path> — repo is node:test only (EPIC-028)"
    And the commit is blocked

  Scenario: Error path — codemod encounters an un-convertible file
    Given the codemod processes a vitest file containing `vi.mock('./dep', factory)` with complex factory closure
    When the codemod runs in auto-convert mode
    Then the codemod skips the file with an Error entry in the manual-fix report
    And the report entry includes the file path, line number, and the offending API
    And the codemod exit code is non-zero so the conversion batch story halts at preflight
```

## 6. AI Interrogation Loop

> All resolved 2026-05-17 at Gate-1 ack.

1. **Q1: Codemod tool — ts-morph vs babel-parser vs plain regex?** **Resolved:** ts-morph. Strong typing on AST + already familiar (`cleargate-cli/scripts` uses it elsewhere). Avoids regex fragility on complex describe/it nesting.
2. **Q2: Conversion batch order — by package or by directory?** **Resolved:** by package. mcp/ first (smallest, exposes mocks early), cleargate-cli/ second (largest, mostly DI), admin/ third (UI + svelte-testing-library risk).
3. **Q3: How to handle `vi.useFakeTimers` for genuinely time-dependent tests?** **Resolved:** prefer real-time-with-short-timeout. If a test truly needs deterministic time (e.g., testing a 24h throttle), refactor the production code to inject a `clock` dependency. node:test does not have a built-in fake-timers facility worth using.
4. **Q4: Coverage tooling?** **Resolved:** out of scope. If a package uses vitest coverage, document the regression in EPIC-028's REPORT entry; follow-up CR picks a tool.
5. **Q5: What about `*.spec.ts` files (vs `*.test.ts`)?** **Resolved:** convert in place AND rename to `*.node.test.ts`. The codemod handles both extensions; output is always `*.node.test.ts`.

## 7. Stories (Decomposition)

| ID | Title | Complexity | Notes |
|---|---|---|---|
| STORY-028-NN | Codemod tool — vitest → node:test transformer + golden-fixture tests | L2 | ts-morph based; emits manual-fix report for vi.* API sites |
| STORY-028-NN | mcp/ conversion — 50 files + delete config + package.json cleanup | L3 | First batch; flushes out mock patterns |
| STORY-028-NN | cleargate-cli/ conversion — 138 files + delete config + package.json cleanup | L3 | Largest; DI-style dominates so codemod auto-converts most |
| STORY-028-NN | admin/ conversion — 34 files + svelte-testing-library compat + delete config | L2 | Verify @testing-library/svelte works with node:test early |
| STORY-028-NN | Docs + agent prompts + flashcard cleanup | L1 | CLAUDE.md, developer.md, FLASHCARD.md |

Concrete story IDs assigned at Architect SDR during SPRINT-28 init.

## Existing Surfaces

> L1 reuse audit. This Epic extends existing test infrastructure rather than introducing new test tooling.

- **Surface:** `cleargate-cli/scripts/` — existing scripts directory; codemod lands here alongside the other `.mjs` runners.
- **Surface:** `cleargate-cli/test/` — 138 files there with mixed extensions (old vitest convention and new node:test convention); codemod normalizes to single naming convention.
- **Surface:** `mcp/test/` — 50 files; mocks are mostly DB-layer (real Postgres preferred per flashcard `#mocked-tests`).
- **Surface:** `admin/src/` — 34 files using `@testing-library/svelte`; compat verification required.
- **Surface:** `cleargate-planning/.claude/agents/developer.md` — test-runner instructions for downstream Dev agents.
- **Coverage of this Epic's scope:** ~85% — Epic converts files in place + removes vitest; no new test framework or test directory layout.

## Why not simpler?

- **Smallest existing surface that could carry this Epic:** the 2026-05-04 two-runner state. That's the status quo this Epic explicitly rejects per user direction.
- **Why isn't extension sufficient?** Keeping vitest as opt-in (the 2026-05-04 design) was the simpler option and it was deliberately reversed 2026-05-17. The two-runner state's cognitive + dependency cost outweighed the conversion effort once the user weighted vocabulary simplification ("one runner") over conversion cost.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready for Sprint Planning**

- [x] Proposal gate waived per `feedback_proposal_gate_waiver.md` (direct user ask + sharp intent + AskUserQuestion selection).
- [x] §0 agent_context has 8 architecture rules covering all decided invariants.
- [x] §4 file paths verified by 2026-05-17 grep (222 files / 3 configs).
- [x] §6 AI Interrogation Loop: all 5 questions resolved.
- [x] §7 Stories decomposed by package boundary; 5 stories sized.
- [x] 0 TBDs.
