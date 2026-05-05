---
cr_id: CR-055
parent_ref: EPIC-013
parent_cleargate_id: EPIC-013
sprint_cleargate_id: SPRINT-25
carry_over: false
status: Draft
approved: true
created_at: 2026-05-04T19:00:00Z
updated_at: 2026-05-04T13:30:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
context_source: |
  CR-052 (SPRINT-24) shipped `cleargate-cli/test/helpers/wrap-script.ts`
  — async `wrapScript({wrapper, args, fixtures, env, _tmpdirCallback})`
  helper that copies the wrapper to tmpdir + spawnSync + returns
  structured `WrapScriptResult` with parsed incidentJson + macOS
  realpathSync mitigation + NODE_TEST_CONTEXT scrub + finally cleanup.

  CR-052 also refactored `run-script-wrapper-backcompat.node.test.ts`
  as proof-of-consumer (-145 LOC of inline plumbing).

  CR-050 (SPRINT-24) shipped 4 NEW caller integration test files
  (`sprint.node.test.ts`, `state.node.test.ts`, `gate.node.test.ts`,
  `story.node.test.ts`) that assert wrapper invocations via
  spawnFn-arg-capture (mock spawn, capture args, assert shape).
  This is regression-protection-equivalent but BYPASSES wrapScript —
  the helper's payoff was reduced.

  Architect post-flight on CR-050 flagged this as a leverage gap:
    "Acceptable under the project's two-runner state, but document
     the canonical pattern for SPRINT-25."

  CR-055 closes the leverage gap: refactor the 4 caller tests to
  consume wrapScript end-to-end. Pattern: instead of mocking spawn
  + asserting args, actually invoke the real wrapper via wrapScript +
  assert exit code + outcome. Catches the original CR-046 regression
  class (interface-level wrapper bugs) that spawnFn-arg-capture does
  not.

  This is also a meta-improvement: future caller tests will look at
  these 4 as the canonical pattern; getting them right now compounds.
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-04T19:03:19Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-055
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-04T18:55:54Z
  sessions: []
---

# CR-055: wrapScript Helper Adoption in Caller Tests

## 0.5 Open Questions

- **Question:** Refactor scope — full replacement OR add wrapScript scenarios alongside spawnFn-arg-capture?
  - **Recommended:** REPLACE. spawnFn-arg-capture pattern provides regression-protection-equivalent BUT misses the interface-level bugs CR-046 had. wrapScript catches both. Keep one canonical pattern; remove the dual-test redundancy.
  - **Human decision:** _populated during Brief review_

- **Question:** Test count — preserve or rebalance?
  - **Recommended:** preserve test count where possible; if a spawnFn-arg-capture scenario maps 1:1 to a wrapScript scenario, swap. If not (some spawnFn checks have no wrapScript equivalent — e.g., "spawn called with cwd: X"), keep a minimal spawnFn-arg-capture scenario alongside the wrapScript one. Net: ~10-12 tests across 4 files post-refactor.
  - **Human decision:** _populated during Brief review_

- **Question:** Test runtime budget?
  - **Recommended:** wrapScript spawns real tsx processes (each ~5s). 4 test files × 2-3 wrapScript scenarios × 5s = 40-60s added to test suite. Acceptable; current suite runs in ~30s. Total post-refactor: ~75-90s. If runtime exceeds 2x current, scope-cut to 1 wrapScript scenario per file.
  - **Human decision:** _populated during Brief review_

- **Question:** Should the canonical-pattern documentation also live in a doc?
  - **Recommended:** YES. Add ~20-line section to `cleargate-cli/test/helpers/wrap-script.ts` JSDoc top-of-file: "Canonical caller-test pattern" with a 5-line example. Future test authors copy from there.
  - **Human decision:** _populated during Brief review_

- **Question:** Does CR-055 deserve a Red test?
  - **Recommended:** NO. CR-055 is a refactor — semantics unchanged, tests still pass. Red mode is for new behavior. The acceptance is "post-refactor, the 4 caller test files import wrapScript AND original test count preserved AND suite green".
  - **Human decision:** _populated during Brief review_

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- 4 caller integration tests use spawnFn-arg-capture pattern (mock spawn + assert args).
- wrapScript helper exists but is consumed only by run-script-wrapper-backcompat.node.test.ts.
- Two competing test patterns for wrapper invocation.

**New Logic (The New Truth):**
- 4 caller integration tests consume `wrapScript` from `test/helpers/wrap-script.ts`.
- spawnFn-arg-capture pattern retained ONLY where wrapScript can't substitute (e.g., asserting non-wrapper spawn invocations elsewhere in the same caller).
- wrap-script.ts JSDoc has the canonical pattern documented for future test authors.

## 2. Blast Radius & Invalidation

- [ ] **`cleargate-cli/test/commands/sprint.node.test.ts`** — refactor to use wrapScript for run_script.sh invocations.
- [ ] **`cleargate-cli/test/commands/state.node.test.ts`** — same.
- [ ] **`cleargate-cli/test/commands/gate.node.test.ts`** — same.
- [ ] **`cleargate-cli/test/commands/story.node.test.ts`** — same.
- [ ] **`cleargate-cli/test/helpers/wrap-script.ts`** — JSDoc update with canonical-pattern example.
- [ ] **No src code change** — refactor only.
- [ ] **No SKILL.md edit** — internal test infrastructure.

## Existing Surfaces

- **Surface:** `cleargate-cli/test/helpers/wrap-script.ts` (CR-052) — async wrapScript helper.
- **Surface:** `cleargate-cli/test/commands/sprint.node.test.ts` (CR-050) — caller integration test using spawnFn-arg-capture.
- **Surface:** `cleargate-cli/test/commands/state.node.test.ts` (CR-050) — caller integration test using spawnFn-arg-capture.
- **Surface:** `cleargate-cli/test/commands/gate.node.test.ts` (CR-050) — caller integration test using spawnFn-arg-capture.
- **Surface:** `cleargate-cli/test/commands/story.node.test.ts` (CR-050) — caller integration test using spawnFn-arg-capture.
- **Surface:** `cleargate-cli/test/scripts/run-script-wrapper.red.node.test.ts` (CR-052 refactored) — proof-of-consumer reference pattern.
- **Why this CR extends rather than rebuilds:** `cleargate-cli/test/helpers/wrap-script.ts` exists; 4 caller tests exist. CR-055 swaps one pattern for another. Pure refactor.

## 3. Execution Sandbox

**Modify:**
- 4 caller test files (refactor spawnFn-arg-capture → wrapScript)
- wrap-script.ts (JSDoc canonical-pattern doc)

**Add:**
- (none — refactor only)

**Out of scope:**
- Adding NEW caller test scenarios
- Generalizing wrap-script.ts API (e.g., wrapScript-with-mock fallback)
- Refactoring non-caller tests that still use spawnFn-arg-capture for non-wrapper concerns

## 4. Verification Protocol

**Acceptance:**
1. All 4 caller test files import `wrapScript` from `../helpers/wrap-script.js`.
2. Each file has ≥1 scenario invoking the real wrapper via wrapScript (not spawnFn-arg-capture).
3. Test count post-refactor: preserved (or within ±2 of pre-refactor count per file).
4. Suite runtime ≤ 2× current. Measured via `time npm test`.
5. wrap-script.ts JSDoc has a "## Canonical caller-test pattern" section with a 5-10 line example.
6. `cd cleargate-cli && npm run typecheck && npm test` exits 0.

**Test Commands:**
- `cd cleargate-cli && npm test -- test/commands/`
- `cd cleargate-cli && time npm test` (verify runtime budget).

**Pre-commit:** `cd cleargate-cli && npm run typecheck && npm test`. Never `--no-verify`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Yellow — Awaiting Brief approval**

- [x] §0.5 Open Questions surfaced (5 questions, all with recommended defaults).
- [x] §3 Execution Sandbox lists files to touch.
- [x] §4 Verification Protocol has testable acceptance.
- [ ] Human approves §0.5 defaults.
- [ ] Lane assigned at SDR (preliminary: standard — 4 file refactor + JSDoc).

---
