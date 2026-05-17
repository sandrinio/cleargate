---
story_id: STORY-028-07
parent_epic_ref: EPIC-028
parent_cleargate_id: EPIC-028
sprint_cleargate_id: SPRINT-28
carry_over: false
area: admin,tests,svelte,codemod
status: Draft
approved: false
ambiguity: 🟡 Medium
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: high
lane: standard
context_source: |
  EPIC-028 §7 Batch 3: admin/ third because UI + @testing-library/svelte compat
  risk per EPIC-028 §6 Q3. Verified 2026-05-17 admin/package.json has
  @testing-library/svelte ^5.2.7 — must verify node:test compat at preflight
  before bulk conversion (EPIC-028 §"Risks & Dependencies").

  Depends on STORY-028-04 (codemod) AND STORY-028-05/-06 (mcp/ + cli/ batches
  flushed mock patterns). 34 files. Same atomic-commit-per-package rule.

  Ambiguity 🟡 because the svelte-testing-library compat path could surface
  a node:test gap that requires escalation OR a fallback to JSDOM-direct
  component testing.
created_at: 2026-05-17T16:40:00Z
updated_at: 2026-05-17T16:40:00Z
created_at_version: cleargate@0.12.0
updated_at_version: cleargate@0.12.0
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-17T19:20:29Z
stamp_error: no ledger rows for work_item_id STORY-028-07
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-17T19:20:29Z
  sessions: []
---

# STORY-028-07: Convert `admin/` Test Suite to node:test + Verify Svelte Compat

**Complexity:** L2 — 34 file conversions + svelte-testing-library compat verification at preflight + vitest.config delete + package.json cleanup. Atomic commit, but escalation-eligible at preflight if compat breaks.

## 1. The Spec

### 1.1 User Story

As the SPRINT-28 release operator, I want every test file under `admin/src/**/*.test.ts` and `admin/test/**/*.test.ts` converted to `*.node.test.ts`, `admin/vitest.config.ts` deleted, `vitest` removed from `admin/package.json` — all in one atomic commit — UNLESS the preflight svelte-testing-library compat check fails, in which case I want a clean escalation to human decision (do not partially convert).

### 1.2 Detailed Requirements

1. **PREFLIGHT — svelte compat verification (MANDATORY before any file conversion)**:
   - Pick ONE existing svelte component test (smallest, simplest — e.g. a button render test).
   - Hand-convert just that one file to node:test + `@testing-library/svelte`.
   - Run it with node:test: `cd admin && npx tsx --test src/<single-test>.node.test.ts`.
   - If it passes: proceed to bulk conversion.
   - If it FAILS with an import-resolution / DOM-environment / vite-loader Error: STOP. Escalate to human per EPIC-028 §"Risks & Dependencies" — do not start the 34-file batch.
   - Possible fallback (post-escalation): swap to JSDOM-direct (`new JSDOM('<div id="root"/>')` + component instantiation) OR use `vitest`-replacement library that targets node:test (none currently identified).
   - Per FLASHCARD 2026-05-15 `#svelte #vitest`: existing tests rely on `vi.mock('$env/dynamic/public')` with vitest.config alias — those mocks need DI refactor OR a node:test-compatible alias scheme.
2. **Codemod root**: `--root admin` (covers both `admin/src/` and `admin/test/` per EPIC-028 §4).
3. **Manual-fix surface — expect these patterns**:
   - `vi.mock('$env/dynamic/public')` — `$env/dynamic/public` is a SvelteKit virtual module. Refactor: extract env-reading into a `$lib/server/env.ts` module + DI inject; tests inject a fake env. Per FLASHCARD 2026-04-19 `#vitest #vi-mock #sveltekit-endpoint` precedent.
   - `vi.fn()` for store subscriptions — replace with a recorder function inline.
   - Component render assertions via `@testing-library/svelte` — keep the library; just swap test runner.
4. **Validation gates within the story commit**:
   - `cd admin && rg "from 'vitest'|from \"vitest\"" .` → 0 matches.
   - `cd admin && rg "vi\\.(mock|fn|spyOn|stubGlobal|useFakeTimers|hoisted)" .` → 0 matches.
   - `cd admin && rg "vitest" package.json` → 0 matches.
   - `find admin -name 'vitest.config.*' -not -path '*/node_modules/*'` → 0 files.
   - `cd admin && npm install && npm test` exits 0.
5. **DO NOT remove `@testing-library/svelte`** — that library works with both runners; keep it.
6. **Commit format**: `feat(SPRINT-28): STORY-028-07 — admin/ vitest → node:test (34 files, vitest dep removed)`.

### 1.3 Out of Scope

- Replacing @testing-library/svelte with a different testing library.
- DOM mocking shim authoring beyond what node:test + jsdom already provides (admin/ may need a `node --import jsdom-global` setup file — Architect verifies at preflight).
- mcp/ + cleargate-cli/ conversions.
- CI hook for vitest-reappearance (STORY-028-08).
- Coverage tooling.

### 1.4 Open Questions

- **Question:** Does @testing-library/svelte v5.2.7 work cleanly with node:test + jsdom?
- **Recommended:** Verified at PREFLIGHT step 1. If yes → proceed. If no → escalate.
- **Human decision:** Determined by the preflight result; orchestrator surfaces the outcome.

- **Question:** Does admin/ use Vite's import-analysis at test time (any `from '$env/...'` or `from '$app/...'` virtual imports)?
- **Recommended:** Grep `admin/src/**/*.ts` for SvelteKit virtual imports before preflight. If many sites use them, the DI refactor across all sites may exceed L2; consider splitting into "preflight + refactor" L2 + "bulk codemod" L2.
- **Human decision:** Architect/Developer at preflight.

### 1.5 Risks

| Risk | Mitigation |
|---|---|
| @testing-library/svelte doesn't render under node:test + jsdom | PREFLIGHT step 1 catches it before bulk conversion. Escalate, do not proceed. |
| SvelteKit virtual-module imports (`$env/dynamic/public`, `$app/navigation`) fail to resolve without vite-plugin alias | Pre-DI refactor of env/store reads into pure modules; node:test imports the pure module |
| RAM exhaustion mid-conversion (per FLASHCARD 2026-05-01 `#vitest #leak #posttest` + 2026-05-02 `#vitest #ram #pool`) | After conversion vitest pool stops spawning; pre-conversion run `pkill -f vitest` between iterations |
| node:test + jsdom-global setup file is the same shape across all 34 tests, but the codemod won't add it | Hand-add the setup-file `--import` flag to the admin/ `npm test` script; codemod doesn't touch package.json scripts |

### 1.6 Existing Surfaces

- **Surface:** `admin/src/**/*.test.ts` + `admin/test/**/*.test.ts` — 34 files per EPIC-028 §4.
- **Surface:** `admin/vitest.config.ts` — config to delete (likely contains $env alias per FLASHCARD).
- **Surface:** `admin/package.json` — vitest devDep + @testing-library/svelte ^5.2.7 (KEEP the latter).
- **Surface:** FLASHCARD 2026-05-15 `#svelte #vitest` — $env mock pattern reference.
- **Surface:** FLASHCARD 2026-04-19 `#vitest #vi-mock #sveltekit-endpoint` — SvelteKit endpoint test pattern.
- **Coverage of this story's scope:** ~40% — codemod handles plain assertions; svelte-specific manual fixes are net-new test patterns.

### 1.7 Why not simpler?

- **Smallest existing surface that could carry this:** keep vitest forever in admin/ only.
- **Why isn't extension sufficient?** EPIC-028 §0 architecture rule "node:test is the only runner. After EPIC-028 lands, package.json across all three packages has zero vitest references." Admin/ vitest-stay would violate the success metric and force the two-runner state we're explicitly eliminating.

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: admin/ vitest elimination with svelte compat verification

  Scenario: PREFLIGHT compat check passes — proceed to bulk
    Given STORY-028-04/-05/-06 merged
    And one svelte component test hand-converted to node:test
    When `npx tsx --test <converted-file>` runs
    Then exit code is 0
    And the bulk conversion proceeds

  Scenario: PREFLIGHT compat check fails — escalate, do NOT proceed
    Given the hand-converted single test fails with Error
    When the Developer reaches the bulk-conversion step
    Then the Developer halts and surfaces to Architect/human
    And no other test file is touched in this story's worktree
    And the story is split into a follow-up CR for the svelte compat investigation

  Scenario: All 34 files converted
    Given preflight passed
    When STORY-028-07 commit lands
    Then `rg "from 'vitest'" admin/` returns 0 matches
    And `find admin -name '*.node.test.ts' | wc -l` >= 34

  Scenario: vitest.config.ts deleted, package.json clean (except testing-library), npm test green
    Given STORY-028-07 commit
    When the validation gates run
    Then all four pass
    And `@testing-library/svelte` is still present in admin/package.json

  Scenario: Atomic commit
    Given STORY-028-07 commit
    When git show --stat runs
    Then conversions + config delete + package.json edit are one commit
```

### 2.2 Verification Steps (Manual)

- [ ] Run `npm test` in admin/; manually click through a couple of component tests in the output to confirm coverage didn't silently shrink.
- [ ] Verify $env-based modules still load via the DI replacement (e.g., `npm run dev` boots cleanly).

## 3. Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary Files | `admin/src/**/*.test.ts`, `admin/test/**/*.test.ts` (34 files → `*.node.test.ts`) |
| Config Delete | `admin/vitest.config.ts` |
| Package.json Edit | `admin/package.json` (remove vitest; KEEP @testing-library/svelte) |
| Codemod Tool | `cleargate-cli/scripts/codemod-vitest-to-node-test.mjs` |
| DI Refactor Targets | $env / $app virtual-module usages — extract into `admin/src/lib/server/env.ts` or similar |
| New Files Needed | Possibly 1 — node:test setup file with jsdom-global import; pattern TBD at preflight |

### 3.2 Technical Logic

1. PREFLIGHT compat verification (per §1.2 step 1). Halt-and-escalate path is the primary risk gate.
2. DI refactor any SvelteKit virtual-module imports detected pre-bulk.
3. Run codemod against `admin/`.
4. Manual-fix loop for vi.* sites + svelte-specific patterns.
5. Delete vitest.config.ts.
6. Edit package.json: remove vitest; ensure `test` script invokes node:test (likely with `--import` for jsdom-global setup file).
7. `npm install && npm test`; iterate.
8. Single commit per §1.2 step 6.

### 3.3 API Contract

N/A.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| PREFLIGHT compat | 1 | One hand-converted test runs under node:test |
| Test count preservation | 1 | total tests ≥ pre-conversion baseline (34+) |
| Full suite green | 1 | `npm test` exits 0 |
| Vitest-residue grep | 4 | Same as STORY-028-05 |

### 4.2 Definition of Done

- [ ] PREFLIGHT compat verified.
- [ ] 34 files renamed.
- [ ] vitest.config.ts deleted.
- [ ] package.json clean; @testing-library/svelte retained.
- [ ] `npm test` green.
- [ ] Atomic commit.
- [ ] If escalated at preflight: clean abort + follow-up CR drafted.

## Existing Surfaces

- **Surface:** `admin/src/` + `admin/test/` (34 vitest files per EPIC-028 §4) — codemod target directories.
- **Surface:** `admin/vitest.config.ts` — config to delete (likely contains $env alias per FLASHCARD).
- **Surface:** `admin/package.json` — vitest devDep to remove; `@testing-library/svelte ^5.2.7` to KEEP.
- **Surface:** `.cleargate/FLASHCARD.md` — 2026-05-15 `#svelte #vitest` $env mock pattern reference + 2026-04-19 `#vitest #vi-mock #sveltekit-endpoint` SvelteKit endpoint test pattern.
- **Coverage of this story's scope:** ~40% — codemod handles plain assertions; svelte-specific manual fixes are net-new test patterns.

## Why not simpler?

> See §1.7.

## Ambiguity Gate
🟡 Medium — the svelte-testing-library compat outcome is the determining factor. Preflight resolves to 🟢 or to escalation.
