---
cr_id: CR-029
parent_ref: cleargate-cli/ engine — test infrastructure (cleargate-cli/test/**, cleargate-cli/vitest.config.ts, cleargate-cli/package.json) + cleargate-planning/.claude/agents/developer.md
parent_cleargate_id: cleargate-cli/ engine — test infrastructure (cleargate-cli/test/**, cleargate-cli/vitest.config.ts, cleargate-cli/package.json) + cleargate-planning/.claude/agents/developer.md
sprint_cleargate_id: SPRINT-20
carry_over: false
status: Approved
ambiguity: 🟢 Low
context_source: "Multi-turn user conversation 2026-05-02 (this session). User cited laptop RAM pressure from vitest fork pool during sprint execution (3 parallel agents × maxForks=2 = 6 forks ≈ 2.4 GB; FLASHCARDs 2026-05-01 #vitest #leak #posttest, 2026-05-02 #vitest #ram #parallel-agents). Walked four options: (A) tighten vitest config, (B) split unit/integration tags, (C) drop vitest from engine, (D) per-iteration runner swap. Settled on C scoped to the cleargate-cli engine only (not mcp/, not admin/). User direct approval pattern: 'agreed' (option C) → 'good. create it' (CR drafting). Engine has 130 test files but only 1 real vi.mock site, 0 vi.useFakeTimers, 0 vi.stubGlobal in cleargate-cli/test/ — DI-first test style already dominates, which collapses the highest-risk part of the migration."
proposal_gate_waiver:
  approved_by: sandrinio
  approved_at: 2026-05-02T00:00:00Z
  reason: Direct approval pattern. User asked the question ('why vitest, can we use something lighter?'), evaluated four options across multi-turn conversation, narrowed to engine-only scope ('we are not talking about the same thing. I'm only refering to the cleargate engine'), and confirmed CR drafting ('good. create it') after I proposed CR-not-Story-not-manual governance. No new design decisions deferred to drafting.
approved: true
owner: sandrinio
target_date: between SPRINT-20 close and SPRINT-21 kickoff
created_at: 2026-05-02T00:00:00Z
updated_at: 2026-05-02T13:30:00Z
created_at_version: cleargate@0.9.0
updated_at_version: cleargate@0.9.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-02T14:08:21Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-029
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-02T14:08:21Z
  sessions: []
---

# CR-029: Engine Test Runner — Vitest → node:test

**Lane:** `fast` — passes lane rubric: no schema/migration; no shared file with active SPRINT-20 stories (engine `test/` dir is sprint-quiet during the gap between SPRINT-20 close and SPRINT-21 kickoff); CLI runtime surface unchanged (only `npm test` script changes); test-file edits are mechanical via codemod; verifiable via full-suite re-run.

## 0.5 Open Questions

> All five questions decided 2026-05-02 by user; recommendations accepted verbatim.

- **Question:** Hard-cut all 130 files in one PR, or stage migration with a `*.node.test.ts` naming convention so old and new coexist during transition?
  **Recommended:** **Hard-cut.** The engine is a publishable npm package with one canonical `test` script; mixed-runner setups add permanent complexity (two configs, two glob excludes, two CI invocations) for zero benefit since the migration is bounded at ~3–5 days. Staged setups are correct when migrations span months across teams; this one fits in one work-week, executed by one author.
  **Human decision:** ✅ **Hard-cut** (2026-05-02).

- **Question:** Engine version bump — `0.9.0 → 0.10.0` (minor) or `0.9.0 → 0.9.1` (patch)?
  **Recommended:** **0.10.0 (minor).** Test infrastructure is part of the developer-facing contract for downstream consumers contributing to the engine. Switching test runners changes how contributors write tests against the published package; that's not a patch-level change. Runtime behavior of the published `dist/` is identical, so it's not a major.
  **Human decision:** ✅ **0.10.0** (2026-05-02).

- **Question:** Codemod tooling — jscodeshift transform (rich AST, slower to write), or hand-rolled regex sweep (fast, less safe)?
  **Recommended:** **jscodeshift.** The patterns are AST-shaped (`expect(x).toBe(y)` → `assert.strictEqual(x, y)` requires reordering; `vi.fn().mockReturnValue(x)` → `mock.fn(() => x)` requires unwrapping a chain). Regex breaks on multi-line expressions and nested calls. ~1 day to write a clean transform vs. ~2 days of grief debugging regex misfires across 130 files.
  **Human decision:** ✅ **jscodeshift** (2026-05-02).

- **Question:** Does the developer-agent prompt change ship in this CR or a follow-up?
  **Recommended:** **Same CR.** The agent prompt update (`cleargate-planning/.claude/agents/developer.md` — instruct dev agents to write `node:test`-style tests for new code in target projects) is one paragraph and conceptually the same change. Splitting it into a follow-up CR creates a window where the engine itself uses node:test but the scaffold tells agents to write vitest tests. One CR keeps engine-side and scaffold-side aligned.
  **Human decision:** ✅ **Same CR** (2026-05-02).

- **Question:** Drop `cleargate-cli/vitest.config.ts` and the `vitest` devDependency in this CR, or keep them around for emergency rollback?
  **Recommended:** **Drop both.** Rollback is `git revert <commit>` — that's what version control is for. Keeping the dep around "just in case" is dead weight and signals indecision; the same logic would apply to the next migration too. If the migration fails verification, we revert before merge.
  **Human decision:** ✅ **Drop both** (2026-05-02).

## 0.6 Mid-SPRINT-20 Split Decision (2026-05-02)

User decided 2026-05-02 mid-SPRINT-20 to **split CR-029 across the SPRINT-20→SPRINT-21 boundary**:

- **Phase E partial — SHIPPED in SPRINT-20:** the developer-agent prompt update (the "Inner-loop test runner" paragraph) lands in both live `.claude/agents/developer.md` AND canonical `cleargate-planning/.claude/agents/developer.md` BEFORE Wave 2 dispatches. This ensures Wave 2 Dev agents (CR-027, CR-028) write any NEW test files in `node:test` style — no codemod needed for them later.
- **Phases A–D — DEFERRED to SPRINT-20 close → SPRINT-21 window:** pilot conversion, jscodeshift codemod, long-tail manual cleanup, full-suite flake hunting. Original §3.4 plan stands — `cr-029/vitest-to-node-test` branch off `main` AFTER SPRINT-20 closes.
- **Phase E remainder (CHANGELOG entry, FLASHCARD entries, version bump) — DEFERRED:** lands with Phases A–D, since the version bump signals the runtime cut.

**Rationale for split:** user asked to run CR-029 as a hotfix mid-sprint, before next dev writes tests. Surfaced 3 options (full mid-sprint hotfix / scaffold-only now / defer entirely). User picked scaffold-only — captures ~80% of the intent (no new vitest tests authored if we know we're migrating away) at ~5% of the cost (one paragraph edit), with zero impact on Wave 2 timing.

**Effect on Wave 2:** CR-027 + CR-028 Devs read the updated developer.md; their new test files will be node:test format from the start. Existing test files they modify stay vitest-style.

## 1. The Context Override

### 1.1 What to remove / forget

- **Vitest is the engine's test runner.** Was true through 2026-05-02. No longer.
- **`vi.fn`, `vi.spyOn`, `vi.mock`, `expect`, `describe.each`** are the engine's mock/assertion primitives. No longer — replaced by `mock.fn`, `mock.method`, DI seams, `node:assert/strict`, plain `for` loops.
- **`vitest.config.ts` controls fork pool sizing** (`maxForks=2`, `pool: 'forks'`) for engine tests. No longer relevant — `node:test` runs in one process by default with `--test-concurrency` for opt-in parallelism.
- **`npm test` in `cleargate-cli/` invokes vitest.** No longer — invokes `node --test --import tsx ...`.

### 1.2 The new truth (post-CR)

- **Engine test runner is `node:test`** (Node 24 built-in). Zero install cost; ~80 MB peak per run vs. ~400 MB for one vitest fork.
- **Mocking is via DI seams + `mock.fn` / `mock.method`** from `node:test`. Module-level mocking (`vi.mock`) is refactored to constructor injection, matching the pattern already documented in `cleargate-cli/test/lib/identity.test.ts:5` ("Do NOT `vi.mock('child_process')` — use the gitEmail injectable instead").
- **Assertions are `node:assert/strict`** — `assert.strictEqual`, `assert.deepStrictEqual`, `assert.partialDeepStrictEqual` (Node 22+).
- **TypeScript loading via `--import tsx`** flag on `node --test`.
- **`cleargate-planning/.claude/agents/developer.md` instructs dev agents to write `node:test`-style tests** for new code in target projects, using the universal pattern `node --test --import tsx <file>` for the inner-loop iteration.
- **Engine version `0.10.0`** ships the new test stack.

### 1.3 Inner-loop RAM math (motivation)

| Stage | Vitest | node:test | Delta |
|---|---|---|---|
| Single-file run, peak RAM | ~400 MB | ~80 MB | **−80%** |
| Single-file run, wall-clock | ~3 s | ~0.3 s | **−90%** |
| Parallel 3-agent sprint wave | ~2.4 GB | ~240 MB | **−90%** |
| Cold-start cost | ~1.5 s (vite + esbuild) | ~80 ms (node + tsx) | **−95%** |

Compounded across ~50 inner-loop iterations per Story, this is the single largest agent-runtime resource cut available without changing model selection.

## 2. Blast Radius & Invalidation

### 2.1 Surfaces directly modified

| Surface | What changes | Notes |
|---|---|---|
| `cleargate-cli/test/**/*.test.ts` (~130 files) | vitest API → node:test API | Codemod handles ~80%; remainder hand-tuned |
| `cleargate-cli/test/auth/keychain-store.test.ts:4` | `vi.mock('@napi-rs/keyring', factory)` → DI seam | The 1 real `vi.mock` site in the engine |
| `cleargate-cli/vitest.config.ts` | Deleted | |
| `cleargate-cli/package.json` | `"test": "vitest run"` → `"test": "node --test --import tsx 'test/**/*.test.ts'"`; drop `vitest` from `devDependencies`; bump version `0.9.0 → 0.10.0` | |
| `cleargate-cli/CHANGELOG.md` | New entry under `## [0.10.0] — YYYY-MM-DD`: "Migrate engine test stack from vitest to node:test (CR-029)" | |
| `cleargate-planning/.claude/agents/developer.md` | New paragraph: developer agents in target projects write `node:test`-style tests for new code, run via `node --test --import tsx <file>` for inner-loop iteration | |
| `.cleargate/FLASHCARD.md` | Append entries documenting migration patterns (codemod gotchas, parallelism defaults, DI-vs-mock pattern reinforcement) | |

**Total:** ~135 files touched. Diff size ~3000–6500 lines, mostly mechanical.

### 2.2 Documents reverted to 🔴

**None.** No in-flight item depends on the engine's test runner identity. SPRINT-20's open stories (EPIC-026 family) operate on `.cleargate/skills/` and protocol files, not engine tests. SPRINT-21 has not been drafted yet.

### 2.3 Out-of-scope (explicit non-goals)

- **`mcp/` test stack** — keeps vitest. Postgres/Redis integration tests, `singleFork: true` already minimizes resource cost; no node:test gain to be had.
- **`admin/` test stack** — keeps vitest. Svelte 5 component tests need the `@sveltejs/vite-plugin-svelte` chain + jsdom; `node:test` cannot run them without a parallel framework.
- **Pre-existing test failures unrelated to migration** (e.g., env-dependent flake) — surfaced as known-flake list, not fixed in this CR.
- **CI configuration changes** — CI already invokes `npm test` from each package root; the script change is transparent to CI.

### 2.4 Backwards-compat carve-outs

- None for the engine's runtime behavior. The published `dist/` is built from `src/`, not from `test/`; consumers of `cleargate` the npm package are unaffected.
- Contributors' local dev workflows: `npm test` continues to work (different runner, same command). Watch mode changes from `vitest` → `node --test --watch` (Node 22+).

### 2.5 New CLI surface

None. `cleargate` CLI commands and behavior are unchanged.

## 3. Execution Sandbox

### 3.1 Files modified / created

**Test files (engine-internal, ~130):**
- `cleargate-cli/test/**/*.test.ts` — full sweep; codemod-driven

**Test infra:**
- `cleargate-cli/vitest.config.ts` — DELETE
- `cleargate-cli/package.json` — edit `scripts.test`, drop `devDependencies.vitest`, bump `version`
- `cleargate-cli/CHANGELOG.md` — add `## [0.10.0]` entry

**Codemod (new tooling):**
- `cleargate-cli/scripts/codemod-vitest-to-node.mjs` — jscodeshift transform; runs once, can be removed post-merge or retained as historical reference
- (Decision: retain, gitignored output paths only)

**Scaffold:**
- `cleargate-planning/.claude/agents/developer.md` — append "inner-loop test runner" guidance paragraph

**FLASHCARD:**
- `.cleargate/FLASHCARD.md` — append migration lesson entries (newest-on-top per skill rules)

### 3.2 Edit blueprint

**Phase A — pilot (2 hrs, reversible):**
1. Pick `cleargate-cli/test/wiki/build.test.ts` (heavy `vi.fn`, no `vi.mock`).
2. Convert by hand to `node:test` + `node:assert/strict`.
3. Run `node --test --import tsx cleargate-cli/test/wiki/build.test.ts`.
4. Validate: same number of assertions, same green/red status as pre-conversion.
5. Document any pattern gaps the codemod must handle.

**Phase B — codemod (1 day):**
1. Write `scripts/codemod-vitest-to-node.mjs` using jscodeshift.
2. Transforms covered:
   - Import rewrite: `from 'vitest'` → `from 'node:test'` + `import assert from 'node:assert/strict'`
   - `expect(x).toBe(y)` → `assert.strictEqual(x, y)`
   - `expect(x).toEqual(y)` → `assert.deepStrictEqual(x, y)`
   - `expect(x).toMatchObject(y)` → `assert.partialDeepStrictEqual(x, y)`
   - `expect(x).toBeNull/Undefined/Truthy/Falsy()` → `assert.strictEqual` / `assert.ok` variants
   - `expect(x).toContain(y)` → `assert.ok(x.includes(y))`
   - `expect(fn).toThrow(...)` → `assert.throws(fn, ...)`
   - `expect(promise).rejects.toThrow(...)` → `await assert.rejects(promise, ...)`
   - `expect(fn).toHaveBeenCalledTimes(n)` → `assert.strictEqual(fn.mock.callCount(), n)`
   - `expect(fn).toHaveBeenCalledWith(...)` → `assert.deepStrictEqual(fn.mock.calls[N].arguments, [...])`
   - `vi.fn()` → `mock.fn()`
   - `vi.fn(impl)` → `mock.fn(impl)`
   - `vi.fn().mockReturnValue(x)` → `mock.fn(() => x)`
   - `vi.fn().mockResolvedValue(x)` → `mock.fn(async () => x)`
   - `vi.fn().mockRejectedValue(x)` → `mock.fn(async () => { throw x })`
   - `vi.fn().mockImplementation(impl)` → `mock.fn(impl)` or `.mock.mockImplementation(impl)` for re-implementation
   - `vi.spyOn(obj, 'method')` → `mock.method(obj, 'method')`
   - `describe.each(table)(name, fn)` → `for (const row of table) describe(name(row), fn(row))`
   - `it.each(table)(name, fn)` → analogous
3. Run codemod against `cleargate-cli/test/`.
4. Commit codemod output as a single commit titled `chore(CR-029): codemod vitest→node:test`.

**Phase C — long-tail manual cleanup (1 day):**
1. The 1 `vi.mock('@napi-rs/keyring', ...)` in `auth/keychain-store.test.ts` — refactor to constructor-injected keyring seam. Mirror the `gitEmail` injectable pattern from `lib/identity.test.ts:5`.
2. The 2 files using `expect.objectContaining` / `expect.arrayContaining` / `expect.any` — translate to `assert.partialDeepStrictEqual` (Node 22+) where it covers the case; otherwise hand-write helpers.
3. Any `it.each` / `describe.each` cases the codemod left as TODO comments.
4. Delete `cleargate-cli/vitest.config.ts`.
5. Update `cleargate-cli/package.json`:
   - `"test": "node --test --import tsx 'test/**/*.test.ts'"`
   - `"test:watch": "node --test --watch --import tsx 'test/**/*.test.ts'"`
   - Remove `vitest` from `devDependencies`
   - Bump `version` `0.9.0 → 0.10.0`
6. `npm install` to regenerate `package-lock.json` without vitest.

**Phase D — flake-hunting (1 day, variable):**
1. Run full suite: `cd cleargate-cli && npm test`.
2. For each failure, classify: (a) codemod gap (fix codemod, re-run) — (b) parallelism / order coupling (`node:test` runs files in parallel by default; tighten with `--test-concurrency=1` if needed) — (c) genuine logic bug surfaced by stricter assertions (fix test or production code per case).
3. Iterate until full suite green. **Worst-case escape hatch:** `--test-concurrency=1` for the whole suite if order-coupled tests prove too numerous to refactor. Slower but safe.

**Phase E — scaffold + docs (2 hrs):**
1. Append paragraph to `cleargate-planning/.claude/agents/developer.md`:
   > **Inner-loop test runner.** When implementing a Story, write new tests using `node:test` + `node:assert/strict` and run them iteratively via `node --test --import tsx <file>`. This is universal: it works in any Node 22+ project regardless of the project's outer test runner (jest, vitest, mocha, none). Use the project's full-suite test command (`npm test`) only at commit-time to confirm green across the entire harness.
2. Append `.cleargate/FLASHCARD.md` entries (topical lessons, ≤120 chars each, newest on top).
3. Add `cleargate-cli/CHANGELOG.md` entry under `## [0.10.0] — <merge-date>`.

### 3.3 Order of edits

Phases A → B → C → D → E. Each phase is a separate commit on a feature branch `cr-029/vitest-to-node-test`. PR opened after Phase D is green; Phase E lands as a follow-up commit on the same branch before merge.

### 3.4 Branch + merge plan

- Branch: `cr-029/vitest-to-node-test` off `main` (after SPRINT-20 closes and merges)
- Commits: one per phase (5 total)
- PR: open after Phase D green, request reviewer attention on (a) the codemod transform correctness, (b) the keychain-store DI refactor, (c) the developer-agent prompt delta
- Merge: squash or merge-commit per repo convention

## 4. Verification Protocol

### 4.1 Gherkin acceptance scenarios

```gherkin
Feature: Engine test runner migration

  Scenario: Engine npm test uses node:test
    Given CR-029 has merged
    When `cd cleargate-cli && cat package.json | jq -r .scripts.test` runs
    Then output starts with "node --test"
    And does not contain "vitest"

  Scenario: Vitest is no longer a dependency
    Given CR-029 has merged
    When `cd cleargate-cli && npm ls vitest` runs
    Then exit code is non-zero (vitest not found)
    And `cat package.json | jq '.devDependencies.vitest'` outputs "null"

  Scenario: vitest.config.ts is removed
    Given CR-029 has merged
    When `ls cleargate-cli/vitest.config.ts` runs
    Then exit code is non-zero (file does not exist)

  Scenario: Engine full suite passes on node:test
    Given CR-029 has merged
    When `cd cleargate-cli && npm test` runs
    Then exit code is 0
    And every test file under cleargate-cli/test/ has executed
    And the test count is ≥ the pre-migration test count (no silent test loss)

  Scenario: Inner-loop RAM is dramatically lower
    Given CR-029 has merged
    When `time -l node --test --import tsx cleargate-cli/test/wiki/build.test.ts` runs (macOS) or `/usr/bin/time -v ...` (Linux)
    Then peak resident set size is < 200 MB
    And wall-clock is < 1 s

  Scenario: No vitest API survives in test files
    Given CR-029 has merged
    When `grep -rn "from 'vitest'" cleargate-cli/test/` runs
    Then exit code is non-zero (no hits)
    And `grep -rn "vi\\.fn\\|vi\\.spyOn\\|vi\\.mock\\|expect(" cleargate-cli/test/` runs and outputs zero hits

  Scenario: Engine version bumped to 0.10.0
    Given CR-029 has merged
    When `cd cleargate-cli && cat package.json | jq -r .version` runs
    Then output is "0.10.0"

  Scenario: Developer-agent scaffold mentions node:test inner loop
    Given CR-029 has merged
    When `grep -n "node --test" cleargate-planning/.claude/agents/developer.md` runs
    Then exit code is 0
    And the surrounding paragraph references "inner-loop"

  Scenario: mcp/ and admin/ test stacks are untouched
    Given CR-029 has merged
    When `cat mcp/package.json | jq -r .scripts.test` and `cat admin/package.json | jq -r .scripts.test` run
    Then both outputs reference "vitest"
    And both `vitest.config.ts` files still exist
```

### 4.2 Manual verification steps

- [ ] Run `cd cleargate-cli && npm test` — exit 0.
- [ ] Run `cd cleargate-cli && npm run typecheck` — exit 0.
- [ ] Run `cd cleargate-cli && npm run build` — exit 0; verify `dist/` produced as before.
- [ ] Spot-check 5 random converted test files for assertion fidelity (same conditions verified before/after).
- [ ] Inspect `cleargate-cli/test/auth/keychain-store.test.ts` — verify DI seam pattern matches `lib/identity.test.ts:5` style.
- [ ] Run `node --test --import tsx cleargate-cli/test/wiki/build.test.ts` solo and observe RAM via Activity Monitor — confirm < 200 MB peak.
- [ ] Read `cleargate-planning/.claude/agents/developer.md` end-to-end — confirm the new paragraph reads coherently in agent-prompt context.

### 4.3 Definition of Done

- [ ] All 9 §4.1 Gherkin scenarios pass.
- [ ] Full engine test suite green via `node --test`.
- [ ] `npm ls vitest` returns nothing in `cleargate-cli/`.
- [ ] `cleargate-cli/vitest.config.ts` deleted.
- [ ] `cleargate-cli/package.json` version is `0.10.0`.
- [ ] `cleargate-cli/CHANGELOG.md` carries `## [0.10.0]` entry citing CR-029.
- [ ] `cleargate-planning/.claude/agents/developer.md` includes inner-loop guidance paragraph.
- [ ] `.cleargate/FLASHCARD.md` carries ≥3 new entries documenting migration lessons.
- [ ] Codemod script committed at `cleargate-cli/scripts/codemod-vitest-to-node.mjs` for future reference.
- [ ] PR merged to `main`; CR file moves from `pending-sync/` to `archive/` with `status: Done`.
- [ ] Commit message convention: `chore(CR-029): <phase> — <short>`. Final summary commit: `chore(CR-029): migrate engine test stack vitest → node:test`.

### 4.4 Rollback plan

If Phase D flake-hunting reveals >5 days of remediation work or fundamental incompatibility:
1. Halt the CR before merge.
2. Document the blocker in this file under a new `§5 Postmortem` section.
3. Move CR-029 to `archive/` with `status: Cancelled`.
4. Open a follow-up Bug or revised CR with the discovered constraint.

Post-merge rollback: `git revert <merge-commit>` restores vitest as the engine runner. No data loss; no schema impact.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green:
- [x] Approved Proposal exists (waived per `proposal_gate_waiver` frontmatter — direct approval pattern, user 2026-05-02 "good. create it" after multi-turn option-evaluation conversation).
- [x] §3 Execution Sandbox lists every file path explicitly (~135 files; per-phase blueprint).
- [x] Downstream invalidation analysis complete (§2.2: zero items reverted to 🔴).
- [x] Verification Protocol covers every behavior change (9 Gherkin scenarios + 7 manual steps + DoD checklist).
- [x] Out-of-scope items explicitly fenced (§2.3: mcp/, admin/ stay on vitest).
- [x] Open Questions §0.5 — all 5 decided by user 2026-05-02 (recommendations accepted verbatim).
- [x] `approved: true` set in frontmatter.
