---
bug_id: BUG-096
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: "SPRINT-41"
carry_over: false
area: test-harness
status: Triaged
severity: P2-Medium
reporter: orchestrator (SPRINT-41 fresh-folder journey, 2026-09-26)
approved: true
approved_by: sandrinio
approved_at: 2026-09-26T09:30:00Z
context_source: "measured on this machine 2026-09-26: /private/tmp listing plus cleargate-cli test/helpers/init-fixture.ts:65-85,283 at cli main 35580b0; owner directive 'log every issue you find and fix them'"
created_at: 2026-09-26T09:30:00Z
updated_at: 2026-09-26T09:30:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-26T09:14:10Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-096
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-26T09:14:10Z
  sessions: []
---

# BUG-096: The init-parity test fixture leaks a temp directory on every scenario run

### Open Questions

- **Question:** Should cleanup happen per test (callers remove `dir`) or once, centrally, in the helper?
- **Recommended:** Centrally. `init-fixture.ts` records every directory it creates. One `process.on('exit')` handler removes them with `fs.rmSync(dir, { recursive: true, force: true })`. node:test runs each test file in its own process, so no directory is needed after its process exits. This fixes all 15 caller files with one change and cannot be forgotten by a new caller.
- **Human decision:** Recommended option taken. The owner directed on 2026-09-26: "log every issue you find and fix them". The orchestrator resolved this question under sprint autonomy.

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** A test run leaves no fixture directories behind in `/tmp`.

**Actual Behavior:** `runInitScenario` (`test/helpers/init-fixture.ts:283`) creates `mkdtemp('/tmp/cg-s41-fix-<scenario>-')` on every call and never removes it. `getComposedPayloadDir` (`:79`) does the same for `cg-s41-payload-`, once per test file. 11 of the 15 calling test files have no cleanup at all. Each directory holds a full install, about 1.1 MB. Every suite run adds hundreds of them. By 2026-09-26, 17,379 had built up (about 19 GB), and the disk sat at 92% full.

## 2. Reproduction Protocol
1. `ls /tmp | grep -cE '^cg-s41-(fix|payload)-'` and note N.
2. `cd cleargate-cli && npm run test:file -- test/commands/init-host-selection.red.node.test.ts`.
3. Run step 1 again. The count has grown by one per `runInitScenario` call plus one payload dir, and it never shrinks.

Edge conditions: capture mode (`CLEARGATE_INIT_BASELINE` pointing at a missing dir) copies bytes into the baseline before exit. The baseline dir is not created by `mkShortTmpDir`, so it must never be in the cleanup set. A test that fails mid-scenario must still clean up, because the exit handler runs on failure too.

## 3. Evidence & Context
```
$ ls /private/tmp | grep -c '^cg-s41-fix-fresh-'        → 12445
cg-s41-fix-reinit 1054 · user-content 1464 · force 781 · malformed 781 · cg-s41-payload 854
$ du -sh /private/tmp/cg-s41-fix-fresh-008cab           → 1.1M
$ df -h /private/tmp   → 460Gi 395Gi 38Gi 92%   (after removing those older than 2h: 55Gi free)

test/helpers/init-fixture.ts:65   function mkShortTmpDir(prefix) { return fs.mkdtempSync(path.join(SHORT_TMP_BASE, prefix)); }
test/helpers/init-fixture.ts:79   const dst = mkShortTmpDir('cg-s41-payload-');
test/helpers/init-fixture.ts:283  const dir = mkShortTmpDir(`cg-s41-fix-${id}-`);
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/test/helpers/init-fixture.ts` only: a module-level tracked-dir set plus one exit handler.
- New test `cleargate-cli/test/helpers/init-fixture-cleanup.red.node.test.ts`.
- Do not edit the 15 caller files. Do not touch `src/`.

## Task Breakdown
- [x] QA-Red: a child-process test proves the scenario dir and payload dir are gone after the child exits, both for a passing child and a throwing child
- [x] Track every `mkShortTmpDir` result; remove all tracked dirs in one `process.on('exit')` handler
- [x] Export trackedTmpDirs() from init-fixture.ts (test-only snapshot of the cleanup set)
- [x] Prove capture mode still writes a baseline that survives the process

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/helpers/init-fixture-cleanup.red.node.test.ts` (solo).

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | A child that completes normally and a child that throws both clean up |
| Interfaces | F | One surface: the test helper |
| Data | T | Scenario dirs and the per-file payload dir |
| Rules | T | The capture-mode baseline must survive cleanup |

```gherkin
Feature: The init-parity fixture cleans up its temp directories

  @paths @data
  Scenario: Scenario and payload dirs are removed when the test process exits
    Given a child node process that calls runInitScenario('fresh') and prints the scenario dir and payload dir
    When the child exits normally
    Then neither directory exists

  @paths
  Scenario: Cleanup also runs when the test process fails
    Given a child that calls runInitScenario('fresh') and then throws
    When the child exits non-zero
    Then the scenario directory does not exist

  @rules
  Scenario: A captured baseline survives cleanup
    Given CLEARGATE_INIT_BASELINE points at a missing directory
    When a child runs captureOrCompare in capture mode and exits
    Then the baseline directory still exists with its files
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 3 | one per scenario, each spawning a child node process |
| Integration tests | 0 | the helper is test-only; no product surface changes |
| E2E / acceptance tests | 0 | the leak count before and after one suite run is checked by hand at DevOps |

---

## Prior work

- [[BUG-060]] — hardcoded absolute paths in cleargate-cli tests; a different test-hygiene defect, not temp-dir cleanup.
- [[SPRINT-41]] — STORY-058-03 introduced the fixture; the 2026-09-26 fresh-folder journey found the leak.

## Context Source

**context_source:** measured `/private/tmp` counts on 2026-09-26, verified against `test/helpers/init-fixture.ts` at cli main `35580b0`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
