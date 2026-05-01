---
story_id: STORY-025-03
parent_epic_ref: EPIC-025
parent_cleargate_id: "EPIC-025"
sprint_cleargate_id: SPRINT-18
carry_over: false
status: Done
ambiguity: 🟢 Low
context_source: EPIC-025 + CR-021 §3.2.3 (close_sprint.mjs Step 3.5 + Step 7 + naming spec). M3 of CR-021's milestone plan — depends on STORY-025-01 (prep_reporter_context.mjs script must exist before Step 3.5 can invoke it).
actor: Sprint close pipeline
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
created_at: 2026-05-01T20:30:00Z
updated_at: 2026-05-01T20:30:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-01T11:16:15Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-025-03
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-01T11:16:14Z
  sessions: []
---

# STORY-025-03: `close_sprint.mjs` Step 3.5 + Step 7 + REPORT Naming
**Complexity:** L2 — modify two existing scripts + two test fixtures. Depends on STORY-025-01 (Step 3.5 invokes its scripts).

## 1. The Spec (The Contract)

### 1.1 User Story
As the **sprint close pipeline**, I want to **build the curated Reporter context bundle (Step 3.5) before announcing Reporter spawn**, **auto-push per-artifact status updates to MCP (Step 7) after Gate 4 ack**, and **write the report under the new `SPRINT-<#>_REPORT.md` filename**, so that the Reporter starts with a 30-50KB bundle instead of broad-fetch, the MCP stays in sync without manual `cleargate sync`, and report files are self-identifying outside their sprint dir.

### 1.2 Detailed Requirements

- **R1 — REPORT.md → `SPRINT-<#>_REPORT.md`** (4 hits in `close_sprint.mjs`, 1 hit in `prefill_report.mjs`). `<#>` = numeric portion of sprint-id (strip `SPRINT-` prefix). Backwards-compat: SPRINT-01..17 archived REPORT.md files keep old name; new naming applies SPRINT-18+ only — implementation MUST NOT rename pre-existing files.
- **R2 — New Step 3.5: build Reporter context bundle.** Inserted in `close_sprint.mjs` between current Step 3 (prefill) and Step 4 announcement. Invokes `node .cleargate/scripts/prep_reporter_context.mjs <sprint-id>` (the script shipped by STORY-025-01). On success, prints `Step 3.5 passed: <sprintDir>/.reporter-context.md ready.`. On failure (non-zero exit), prints to stderr `Step 3.5 warning: ... Reporter will fall back to broad-fetch context loading.` and continues — non-fatal.
- **R3 — New Step 7: auto-push per-artifact status to MCP.** Inserted after Step 6 (`suggest_improvements.mjs`), runs only after Gate 4 ack succeeds. Invokes `cleargate sync work-items <sprint-id>` (existing CLI from STORY-023-01, commit `36208fc`). On success, prints `Step 7 passed: work-item statuses synced.`. On failure, prints to stderr `Step 7 warning: ... Run \`cleargate sync work-items\` manually to retry.` and continues — non-fatal; sprint stays Completed.
- **R4 — Step 5 prompt text update.** Replace the wait-for-ack message references to `REPORT.md` with `SPRINT-<#>_REPORT.md`. Operator sees the correct filename in the close-pipeline prompt.
- **R5 — Test fixture updates.** `.cleargate/scripts/test/test_close_pipeline.sh` and `.cleargate/scripts/test/test_report_body_stdin.sh` need fixture-path updates to reference the new filename for SPRINT-18+ fixtures. Pre-existing legacy fixtures (if any reference SPRINT-01..17) keep old name to verify backwards-compat.

### 1.3 Out of Scope
- Implementing `prep_reporter_context.mjs` itself — STORY-025-01.
- Updating `reporter.md` agent definition to read `.reporter-context.md` — STORY-025-05.
- Renaming archived `REPORT.md` files in SPRINT-01..17 dirs — explicitly preserved as backwards-compat carve-out.
- Adding worktree-closed / main-merged checks (CR-022 / SPRINT-19 scope).

### 1.4 Open Questions

- **Question:** Step 7 invocation — call CLI binary (`node cleargate-cli/dist/cli.js sync work-items <id>`) or import + call function directly?
  **Recommended:** **Call the CLI binary** via `execSync` — matches CR-021 §3.2.3's example code; respects the CLI as the public interface; isolates close_sprint.mjs from any cli.ts internal refactors. Skip non-fatal if `dist/cli.js` doesn't exist (dev environments without prebuild).
  **Human decision:** _accept recommended_

- **Question:** If Step 3.5 fails because token-ledger.jsonl is missing (off-sprint scratch dir) — block the close or warn?
  **Recommended:** **Warn and continue.** STORY-025-01 R4 says missing ledger is hard-error in `prep_reporter_context.mjs` — that surfaces as Step 3.5 non-zero exit; close_sprint.mjs catches and warns per R2. Sprint can still close; Reporter falls back to source files.
  **Human decision:** _accept recommended_

### 1.5 Risks

- **Risk:** `SPRINT-<#>` numeric extraction — sprint-id "SPRINT-018" (3-digit) vs "SPRINT-18" (2-digit). Different sprints, different filenames.
  **Mitigation:** Use `sprintId.replace(/^SPRINT-/, '')` — preserves whatever digit-count the id carries. The result is `SPRINT-${sprintNumber}_REPORT.md` exactly matching the id's number portion. No padding, no normalization.

- **Risk:** Step 7 calls `cleargate sync work-items` which makes network calls to MCP. If MCP is unreachable, the call hangs/fails. Sprint should still close.
  **Mitigation:** Wrap `execSync` in try/catch with a 30-second timeout. Failure path emits warning to stderr and returns; sprint stays Completed. Operator can retry manually.

- **Risk:** Test fixture changes may break vitest worker contention test (the `test_close_sprint_v21.test.ts` Scenarios 2/3/6 that fail in full-suite runs — flagged for CR-023).
  **Mitigation:** Coordinate with CR-023 fix landing first if vitest worker hygiene is in the same wave; otherwise, this story's test changes are scoped to fixture filenames and don't compound the contention issue.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: close_sprint.mjs Step 3.5 + Step 7 + naming

  Scenario: New SPRINT-18+ sprints write SPRINT-<#>_REPORT.md
    Given a fixture sprint with sprint-id "SPRINT-18"
    When close_sprint.mjs runs end-to-end against it
    Then .cleargate/sprint-runs/SPRINT-18/SPRINT-18_REPORT.md is written
    And no file named REPORT.md exists in that directory

  Scenario: SPRINT-01..17 archived reports keep old REPORT.md name
    Given the archived sprint dir SPRINT-15/ already contains REPORT.md (no SPRINT-15_REPORT.md)
    When close_sprint.mjs is invoked retroactively against SPRINT-15 (smoke test)
    Then SPRINT-15/REPORT.md is NOT renamed
    And no SPRINT-15_REPORT.md is created

  Scenario: Step 3.5 invokes prep_reporter_context.mjs and prints success
    Given STORY-025-01 has shipped (prep_reporter_context.mjs exists)
    When close_sprint.mjs runs against the SPRINT-18 fixture
    Then stdout contains "Step 3.5 passed: .../SPRINT-18/.reporter-context.md ready."
    And the bundle file is present after Step 3.5

  Scenario: Step 3.5 warns and continues if prep_reporter_context.mjs fails
    Given prep_reporter_context.mjs exits 1 (e.g., missing token-ledger.jsonl in fixture)
    When close_sprint.mjs runs
    Then stderr contains "Step 3.5 warning"
    And the close pipeline continues to Step 4
    And the sprint eventually flips to Completed

  Scenario: Step 7 invokes cleargate sync work-items after Gate 4 ack
    Given Gate 4 ack succeeded for SPRINT-18 fixture
    And cleargate-cli/dist/cli.js exists
    When close_sprint.mjs proceeds to Step 7
    Then stdout contains "Step 7 passed: work-item statuses synced."
    OR stdout contains "Step 7 skipped" if MCP unreachable

  Scenario: Step 7 warns and continues if sync fails
    Given the cleargate sync command exits non-zero
    When close_sprint.mjs reaches Step 7
    Then stderr contains "Step 7 warning"
    And state.json sprint_status stays "Completed" (not rolled back)

  Scenario: Step 7 skipped when CLI binary missing (dev environment)
    Given cleargate-cli/dist/cli.js does NOT exist
    When close_sprint.mjs reaches Step 7
    Then stdout contains "Step 7 skipped: CLI binary not found (non-fatal)."
    And exit code is 0

  Scenario: Step 5 wait-for-ack prompt shows new filename
    Given close_sprint.mjs has reached the Step 5 wait-for-ack pause
    When the prompt is rendered
    Then it references "SPRINT-18_REPORT.md" (not "REPORT.md")
```

### 2.2 Verification Steps (Manual)
- [ ] Run `node .cleargate/scripts/close_sprint.mjs SPRINT-18` end-to-end against a synthetic fixture; verify Step 3.5 + Step 7 fire.
- [ ] Inspect SPRINT-18 sprint dir post-close — confirm `SPRINT-18_REPORT.md` exists and `REPORT.md` does not.
- [ ] Inspect archived SPRINT-15/ dir — confirm `REPORT.md` (legacy name) is untouched.

## 3. The Implementation Guide

### 3.1 Context & Files

**Files affected:**
- `.cleargate/scripts/close_sprint.mjs` — modify; insert Step 3.5 + Step 7 + 4 REPORT.md naming hits + Step 5 prompt text update
- `.cleargate/scripts/prefill_report.mjs` — modify; update output-path naming (1 hit)
- `.cleargate/scripts/test/test_close_pipeline.sh` — modify; update fixture paths to new naming
- `.cleargate/scripts/test/test_report_body_stdin.sh` — modify; update fixture paths

| Item | Value |
|---|---|
| Primary File | `.cleargate/scripts/close_sprint.mjs` (modify — Step 3.5 + Step 7 + 4 naming hits + Step 5 prompt text) |
| Related Files | `.cleargate/scripts/prefill_report.mjs` (modify — output path naming) |
| Test Files | `.cleargate/scripts/test/test_close_pipeline.sh` (modify — fixture paths), `.cleargate/scripts/test/test_report_body_stdin.sh` (modify — fixture paths) |
| New Files Needed | No |

### 3.2 Technical Logic

**Naming pattern (apply at every reportFile / reportFile2 reference in `close_sprint.mjs`):**

```javascript
const sprintNumber = sprintId.replace(/^SPRINT-/, '');
const reportFile = path.join(sprintDir, `SPRINT-${sprintNumber}_REPORT.md`);
```

Same edit in `prefill_report.mjs` output-path computation.

**Step 3.5 insert** (between current Step 3 prefill block and Step 4 announcement):

```javascript
process.stdout.write('Step 3.5: building Reporter context bundle...\n');
try {
  invokeScript('prep_reporter_context.mjs', [sprintId], {
    CLEARGATE_STATE_FILE: stateFile,
    CLEARGATE_SPRINT_DIR: sprintDir,
  });
  process.stdout.write(`Step 3.5 passed: ${sprintDir}/.reporter-context.md ready.\n`);
} catch (err) {
  process.stderr.write(`Step 3.5 warning: prep_reporter_context.mjs failed: ${err.message}\n`);
  process.stderr.write('Reporter will fall back to broad-fetch context loading.\n');
}
```

**Step 7 insert** (after Step 6 suggest_improvements, before final close stdout):

```javascript
process.stdout.write('Step 7: pushing per-artifact status updates to MCP...\n');
try {
  const cliBin = path.join(REPO_ROOT, 'cleargate-cli', 'dist', 'cli.js');
  if (fs.existsSync(cliBin)) {
    execSync(`node ${JSON.stringify(cliBin)} sync work-items ${JSON.stringify(sprintId)}`, {
      stdio: 'inherit',
      env: process.env,
      timeout: 30000,
    });
    process.stdout.write('Step 7 passed: work-item statuses synced.\n');
  } else {
    process.stdout.write('Step 7 skipped: CLI binary not found (non-fatal).\n');
  }
} catch (err) {
  process.stderr.write(`Step 7 warning: sync work-items failed: ${err.message}\n`);
  process.stderr.write('Run `cleargate sync work-items` manually to retry.\n');
}
```

**Step 5 prompt text** — find the wait-for-ack line referencing "REPORT.md found at ..." and replace with the new filename via the same `sprintNumber` extraction.

### 3.3 API Contract — none (internal scripts; no external surface change beyond filename).

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Integration tests | 8 | One per Gherkin scenario. Existing `test_close_sprint_v21.test.ts` infra reused; new fixtures for Step 3.5 / Step 7 / naming. |
| Manual verification | 3 | Per §2.2. |

### 4.2 Definition of Done
- [ ] All 8 Gherkin scenarios pass.
- [ ] STORY-025-01 has merged before this commit lands (Wave dependency).
- [ ] Backwards-compat preserved: archived SPRINT-01..17 REPORT.md files unchanged.
- [ ] No regression: `vitest run cleargate-cli/test/scripts/test_close_sprint_v21.test.ts cleargate-cli/test/scripts/close-sprint-reconcile.test.ts` exits 0 (note: full-suite vitest worker contention is CR-023's fix, not this story).
- [ ] Commit message: `feat(EPIC-025): STORY-025-03 close_sprint Step 3.5 + Step 7 + REPORT naming`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green:
- [x] Gherkin scenarios cover Step 3.5 success + failure, Step 7 success + failure + skip, naming for SPRINT-18+ vs SPRINT-01..17, Step 5 prompt update.
- [x] Implementation §3 includes verbatim code blocks from CR-021 §3.2.3.
- [x] Wave dependency on STORY-025-01 explicitly stated.
- [x] No "TBDs" remain.
