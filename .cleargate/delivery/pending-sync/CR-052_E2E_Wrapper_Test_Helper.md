---
cr_id: CR-052
parent_ref: EPIC-013
parent_cleargate_id: EPIC-013
sprint_cleargate_id: SPRINT-24
carry_over: false
status: Ready
approved: true
approved_at: 2026-05-04T13:00:00Z
approved_by: human
created_at: 2026-05-04T18:00:00Z
updated_at: 2026-05-04T13:00:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
context_source: |
  CR-046 Architect post-flight kickback (SPRINT-23) found that the
  wrapper-rewrite tests passed (7/7) while silently breaking 6 production
  callers. Root cause: every caller integration test injected
  `spawnFn: spawnMock as never` and never invoked the real
  run_script.sh wrapper end-to-end.

  CR-046 commit 763e7f7 added a single companion test
  `cleargate-cli/test/scripts/run-script-wrapper-backcompat.node.test.ts`
  that copies the wrapper into os.tmpdir() and spawnSync's it directly
  (3 scenarios / 7 assertions, 4.5s runtime). This pattern caught the
  back-compat regression and would have caught the original CR-046
  bug if it had existed pre-rewrite.

  Architect post-flight flagged the pattern as flashcard-worthy:
    "For wrapper-interface changes, copy the wrapper into os.tmpdir()
     alongside fixture scripts and spawnSync the real wrapper; catches
     drift that spawnMock-style command tests cannot."

  CR-052 promotes that pattern into a shared test utility:
  `cleargate-cli/test/helpers/wrap-script.ts` (or similar). CR-050
  (Path B caller migration) then consumes the helper instead of inlining
  tmpdir-spawnSync logic into 3 test files.
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-04T14:01:46Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-052
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-04T13:58:55Z
  sessions: []
---

# CR-052: E2E Wrapper Test Helper — `wrapScript()`

## 0.5 Open Questions

- **Question:** Helper API shape — function vs class?
  - **Recommended:** plain async function. `wrapScript({wrapper, args, fixtures, env}): Promise<{exitCode, stdout, stderr, incidentJson?}>`. Stateless; tmpdir lifecycle handled internally with auto-cleanup. Simpler than a class; matches the test harness's typical functional style.
  - **Human decision:** _populated during Brief review_

- **Question:** Where does the helper live — `test/helpers/` or `src/lib/test-helpers/`?
  - **Recommended:** `cleargate-cli/test/helpers/wrap-script.ts`. Test-only; never imported by src. Keeps the prod bundle small; tsup entry list stays unchanged.
  - **Human decision:** _populated during Brief review_

- **Question:** Should the helper read the LIVE wrapper or its own copy?
  - **Recommended:** copy LIVE wrapper into a fresh tmpdir per invocation. Mirrors what production callers do (they spawnSync the live path). Catches drift if the wrapper changes mid-test. Cleanup deletes tmpdir on each exit.
  - **Human decision:** _populated during Brief review_

- **Question:** Helper supports script-incident JSON inspection?
  - **Recommended:** YES — return `incidentJson?: ScriptIncident | undefined`. Helper reads `.script-incidents/*.json` post-exec and returns the parsed object if present (failure case) or undefined (success). Tests can assert on incident schema fields without re-reading filesystem.
  - **Human decision:** _populated during Brief review_

- **Question:** Land before or after CR-050?
  - **Recommended:** BEFORE — W2 ordering: CR-052 → CR-050. CR-050's caller-test migration imports the helper. If CR-052 lands second, CR-050 has to inline + then refactor when CR-052 ships. Sequential.
  - **Human decision:** _populated during Brief review_

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- Wrapper integration tests use spawnMock-as-never to fake the wrapper layer.
- Each test file inlines its own tmpdir-spawnSync logic (only one such file exists today: run-script-wrapper-backcompat.node.test.ts).

**New Logic (The New Truth):**
- A shared helper `wrapScript()` at `cleargate-cli/test/helpers/wrap-script.ts` is the canonical test pattern for wrapper-invocation testing.
- Helper copies the LIVE wrapper into tmpdir, runs spawnSync, returns structured result + parsed incident JSON if present.
- CR-050's 3 caller test files migrate to the helper. The existing run-script-wrapper-backcompat.node.test.ts also migrates (or is deleted as part of CR-050).

## 2. Blast Radius & Invalidation

- [ ] **NEW `cleargate-cli/test/helpers/wrap-script.ts`** — async `wrapScript()` function (~80 LOC) returning `{exitCode, stdout, stderr, incidentJson?}`. Auto-tmpdir lifecycle.
- [ ] **NEW `cleargate-cli/test/helpers/wrap-script.node.test.ts`** — meta-test for the helper itself: 4 scenarios covering success path, failure path with incident, env-var passthrough, tmpdir cleanup.
- [ ] **`cleargate-cli/test/scripts/run-script-wrapper-backcompat.node.test.ts`** — refactor to use new helper (or scheduled for deletion in CR-050). For CR-052 acceptance, refactor it as a proof-of-use demonstration.
- [ ] **No src code change** — test-helper only.
- [ ] **No SKILL.md edit** — internal test infrastructure; doesn't surface to agents.

## Existing Surfaces

- **Surface:** `cleargate-cli/test/scripts/run-script-wrapper-backcompat.node.test.ts` — pattern source.
- **Surface:** `cleargate-cli/src/lib/script-incident.ts` — ScriptIncident type for incidentJson return.
- **Surface:** `cleargate-cli/test/scripts/run-script-wrapper.red.node.test.ts` — uses spawnMock; do NOT refactor (Red-immutable).
- **Why this CR extends rather than rebuilds:** the pattern exists in one test file; CR-052 promotes to shared helper. No new test framework.

## 3. Execution Sandbox

**Add:**
- `cleargate-cli/test/helpers/wrap-script.ts` — async `wrapScript()` helper
- `cleargate-cli/test/helpers/wrap-script.node.test.ts` — 4 meta-tests for helper

**Modify:**
- `cleargate-cli/test/scripts/run-script-wrapper-backcompat.node.test.ts` — refactor to use helper (proof of consumer)

**Out of scope:**
- Refactoring run-script-wrapper.red.node.test.ts (Red-immutable per CR-043)
- Generic test-helpers framework (`test/helpers/` may grow, but CR-052 only adds wrapScript)
- Changing run_script.sh interface (CR-050 owns that)

## 4. Verification Protocol

**Acceptance:**
1. NEW `test/helpers/wrap-script.ts` exports `wrapScript({wrapper, args, fixtures, env})` returning `{exitCode, stdout, stderr, incidentJson?}`.
2. Helper copies the wrapper into a fresh tmpdir per invocation; cleans up on exit.
3. `incidentJson` is parsed from `.script-incidents/*.json` if present; undefined otherwise.
4. Meta-test `wrap-script.node.test.ts` passes 4 scenarios:
   - Success: exit 0, stdout passthrough, no incidentJson.
   - Failure: non-zero exit, stderr captured, incidentJson populated with full schema.
   - Env-var passthrough: helper passes env through to wrapper; wrapper sees it.
   - Tmpdir cleanup: post-helper-exit, tmpdir does not exist.
5. `run-script-wrapper-backcompat.node.test.ts` refactored to import wrapScript from helper. Test count unchanged; assertions pass.
6. Helper test execution time ≤6s (slightly more than the 4.5s of the inline version due to import overhead).
7. `cd cleargate-cli && npm run typecheck && npm test` exits 0.

**Test Commands:**
- `cd cleargate-cli && npm test -- test/helpers/wrap-script.node.test.ts`
- `cd cleargate-cli && npm test -- test/scripts/run-script-wrapper-backcompat.node.test.ts`

**Pre-commit:** `cd cleargate-cli && npm run typecheck && npm test`. Never `--no-verify`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Yellow — Awaiting Brief approval**

- [x] §0.5 Open Questions surfaced (5 questions).
- [x] §3 Execution Sandbox lists files to touch.
- [x] §4 Verification Protocol has testable acceptance.
- [ ] Human approves §0.5 defaults.
- [ ] Lane assigned at SDR (preliminary: standard — new file + meta-tests + 1 consumer refactor).
- [ ] Lands before CR-050 in W2 (per Open Q5).

---
