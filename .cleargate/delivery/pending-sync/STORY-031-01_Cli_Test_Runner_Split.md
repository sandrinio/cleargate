---
story_id: STORY-031-01
parent_epic_ref: EPIC-031
parent_cleargate_id: EPIC-031
sprint_cleargate_id: SPRINT-31
carry_over: false
area: cli,tests,test-runner,perf
status: Draft
approved: false
ambiguity: 🟢 Low
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
context_source: |
  EPIC-031 §4 row 1+2. The runner split + reporter swap are mechanical:
  package.json edits + one file rename. The 8-core target metric is the only
  variable; mid-story flake discovery in *.node.test.ts that happens to
  collide under parallel concurrency can extend bounce exposure but the
  scenario is contained (revert to serial + tag the file).
created_at: 2026-05-24T00:00:00Z
updated_at: 2026-05-24T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
stamp_error: no ledger rows for work_item_id STORY-031-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-24T18:15:08Z
  sessions: []
cached_gate_result:
  pass: false
  failing_criteria:
    - id: gherkin-present
      detail: "'Scenario:' not found in body"
    - id: reuse-audit-recorded
      detail: "'## Existing Surfaces' not found in body"
    - id: simplest-form-justified
      detail: "'## Why not simpler?' not found in body"
  last_gate_check: 2026-05-24T18:15:08Z
---

# STORY-031-01: Split `cleargate-cli/` Test Runner + Dot Reporter Default

**Complexity:** L2 — package.json edit + one git mv + record before/after timing. ~1-2hr Dev wall time. Risk: latent parallel-unsafe tests surfacing as flakes — contained by revert-and-tag procedure.

## 1. The Spec

### 1.1 User Story

As the sprint-execution orchestrator, I want `npm test` in cleargate-cli/ to finish in ~3min instead of ~10min so Dev + QA dispatches stop being dominated by serialized unit tests.

### 1.2 Detailed Requirements

1. **Runner split.** `cleargate-cli/package.json` defines:
   - `test:unit`: `tsx --test --experimental-test-module-mocks --test-reporter=dot 'test/**/*.node.test.ts' '!test/**/*.db.node.test.ts' '!test/fixtures/**'` (default concurrency = num CPUs).
   - `test:db`: `tsx --test --test-concurrency=1 --experimental-test-module-mocks --test-reporter=dot 'test/**/*.db.node.test.ts'`.
   - `test`: `npm run test:unit && npm run test:db`.
   - `test:file` and `test:node:file` unchanged in concurrency/reporter — they accept a path arg so the operator controls scope.
2. **Tag the one DB test.** `git mv cleargate-cli/test/commands/bootstrap-root.node.test.ts cleargate-cli/test/commands/bootstrap-root.db.node.test.ts`. Update any test-file path references in script-incident fixtures, dispatched-test paths, or report snapshots if present.
3. **Reporter env override.** When `TEST_REPORTER=spec` is set, the npm scripts MUST honor it. Two options: (a) inline shell expansion `--test-reporter=${TEST_REPORTER:-dot}` if the scripts run under bash/zsh, OR (b) a tiny wrapper script at `cleargate-cli/scripts/run-tests.mjs` that constructs the argv. Pick whichever keeps the package.json invocation in one line — Architect decides during M1.
4. **Wall-time evidence.** Record `time npm test` output before the change (on `sprint/S-31` checkout pre-edit) and after the change (post-commit). Include both numbers in the Dev report.
5. **Smoke for parallel-unsafe regressions.** After flipping concurrency, run `npm run test:unit` three times in a row. If any of the three has a different pass/fail set, name the flaky file in the Dev report and tag it `.db.node.test.ts` (move it to the serial side) — do NOT investigate root cause in this story; surface as a follow-up CR.

### 1.3 Out of Scope

- mcp/ or admin/ runner changes.
- Adding new tests.
- Fixing the 138 known-failing baseline tests.
- Changing tsx → native node strip-types.

### 1.4 Open Questions

None at draft time. Architect resolves the wrapper-vs-inline question (1.2 §3) during M1.

### 1.5 Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Parallel reveals latent race/ordering bug | Med | Run test:unit 3× post-change; quarantine flakes to .db. |
| dot reporter loses signal needed by QA's bug-triage | Low | TEST_REPORTER=spec escape hatch; QA's read-only access to logs unchanged |
| bootstrap-root rename breaks a path reference in scripts | Low | grep for the old path before commit; update or document |

## 2. The Truth

### 2.1 Gherkin

```gherkin
Scenario S1: test:unit excludes .db. files
  Given cleargate-cli/package.json defines test:unit
  When `npm run test:unit` runs
  Then the resolved file list contains 0 files matching '*.db.node.test.ts'

Scenario S2: test:unit runs in parallel
  Given an 8-core machine
  When `time npm run test:unit` runs
  Then wall time is at most 50% of the pre-change `time npm test` baseline

Scenario S3: test:db runs serially
  Given cleargate-cli/package.json defines test:db
  When `npm run test:db` runs
  Then the resolved file list contains only files matching '*.db.node.test.ts'
  And bootstrap-root.db.node.test.ts passes

Scenario S4: npm test chains both
  Given test = "npm run test:unit && npm run test:db"
  When `npm test` runs and test:unit fails
  Then test:db does NOT run
  And the exit code matches test:unit's

Scenario S5: dot reporter is default
  Given no TEST_REPORTER env var
  When `npm test` runs
  Then the output uses node:test dot format (one char per test)

Scenario S6: spec reporter opt-in
  Given TEST_REPORTER=spec
  When `npm test` runs
  Then the output uses node:test spec format

Scenario S7: stdout size reduction
  Given the same suite size as pre-change
  When `npm test 2>&1 | wc -c` is measured before and after
  Then the after-byte-count is at most 1/5 of the before-byte-count
```

### 2.2 Manual verification

```bash
cd cleargate-cli
time npm test                                        # capture baseline (sprint/S-31 pre-edit)
# (apply changes)
time npm test                                        # post-change full
time npm run test:unit                               # post-change unit only
npm run test:unit && npm run test:unit && npm run test:unit  # flake smoke
TEST_REPORTER=spec npm test | head -5                # spec opt-in works
```

## 3. Implementation Guide

### 3.1 Context & Files

| Path | Operation |
|---|---|
| `cleargate-cli/package.json` | Modify: scripts.{test, test:unit, test:db}; optional scripts.test:file/test:node:file reporter flag flip |
| `cleargate-cli/test/commands/bootstrap-root.node.test.ts` | Rename via `git mv` → `bootstrap-root.db.node.test.ts` |
| `cleargate-cli/scripts/run-tests.mjs` | Create IF Architect picks wrapper option (M1 decision) |
| `.cleargate/scripts/gate-checks.json` | Verify `test` entry still resolves; no change expected |

### 3.2 Technical Logic

The current `test` script:
```
tsx --test --test-concurrency=1 --experimental-test-module-mocks --test-reporter=spec 'test/**/*.node.test.ts' '!test/fixtures/**'
```

Split into two siblings. Default concurrency is omitting `--test-concurrency` (node:test defaults to num CPUs). Reporter default flips to `dot` and gains env override.

The wrapper option (if chosen) reads `process.env.TEST_REPORTER || 'dot'` and spawns tsx with the constructed argv.

### 3.3 API Contract

Public test commands surface (unchanged set, changed behavior):
- `npm test` — chains unit then db.
- `npm run test:unit` — new.
- `npm run test:db` — new.
- `npm run test:file -- <path>` — unchanged.
- `npm run test:node` — alias kept pointing at the new wiring.

## 4. Quality Gates

### 4.1 Test expectations

- All 7 S1-S7 scenarios above pass.
- The bootstrap-root rename does not break any existing test (same content, new path).
- Three-run flake smoke shows identical pass/fail sets.
- `npm run check:no-vitest` still passes (no regression on EPIC-028 invariant).
- `tsc --noEmit` clean.

### 4.2 Definition of Done

- [ ] One commit with subject `feat(EPIC-031): STORY-031-01 split cleargate-cli runner + dot reporter`.
- [ ] cleargate-cli/package.json contains test:unit + test:db + test wrapper.
- [ ] bootstrap-root renamed via `git mv`.
- [ ] Dev report includes recorded before/after `time npm test` numbers.
- [ ] Flake smoke (3× test:unit) documented in Dev NOTES.
- [ ] check:no-vitest passes.
- [ ] Story §3.1 surface respected (no off-surface edits).

---

**Ambiguity Gate**

- [x] §1.2 specifies exact scripts
- [x] §2.1 has 7 Gherkin scenarios
- [x] §3.1 file surface is concrete
- [x] Wall-time target is quantified (≥ 50% reduction on 8-core)
- [ ] Architect picks wrapper-vs-inline reporter env option in M1 (one outstanding decision)
