---
bug_id: BUG-099
parent_ref: STORY-058-10
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-41
carry_over: false
area: clean-room
status: Triaged
severity: P1-High
reporter: orchestrator (SPRINT-41, from the STORY-058-13 C3 entry re-derivation OD-F1, 2026-09-27)
approved: true
approved_by: sandrinio (standing directive 2026-09-26 "log every issue you find and fix them"; applied by the orchestrator under sprint autonomy, same basis as BUG-096..098)
approved_at: 2026-09-26T20:44:00Z
context_source: "verified codebase grounding at cli main e720592: scripts/clean-room/codex-hooks.mjs:868-872, scripts/clean-room/claude-baseline.mjs:760-776, .cleargate/scripts/close_sprint.mjs:1204-1226; STORY-058-10 deferred_verification command; owner directive 'log every issue you find and fix them'"
created_at: 2026-09-26T20:44:00Z
updated_at: 2026-09-26T20:50:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-26T20:44:13Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-099
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-26T20:44:13Z
  sessions: []
---

# BUG-099: `codex-hooks.mjs check --write-result` writes no status or exit code, so sprint close always fails STORY-058-10's deferred verification

### Open Questions

- **Question:** Should the Codex result file copy the Claude harness's shape exactly, or keep its current fields and add `status`/`exit_code`?
- **Recommended:** Copy the STORY-058-09 shape exactly: `{ story, command, ran_at, exit_code, status, reason }`, with `status` `green`/`red` and `story` defaulting to `STORY-058-10` (overridable with `--story`, as in `claude-baseline.mjs`). One shape for every deferred-verification writer is what `close_sprint.mjs` Step 2.9 reads, and nothing else consumes the current `{ ...result, artifactInputs, checkedAt }` fields (no test or script reads them).
- **Human decision:** Recommended option taken by the orchestrator under the 2026-09-26 directive ("log every issue you find and fix them"). The owner may overrule at the next check-in.

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** `node cleargate-cli/scripts/clean-room/codex-hooks.mjs check --evidence <file> --write-result <path>` writes the result file that `close_sprint.mjs` Step 2.9 reads: `status: "green"` and `exit_code: 0` when the evidence check passes, `status: "red"` and `exit_code: 1` when it fails. With a passing evidence file, sprint close's deferred-verification gate passes for STORY-058-10.

**Actual Behavior:** `check` writes `{ ...result, artifactInputs, checkedAt }` (`codex-hooks.mjs:871`). That object has `ok` and `reason` but no `status` and no `exit_code`. Step 2.9 requires `resultJson.status === 'green' && resultJson.exit_code === 0` (`close_sprint.mjs:1219`), so it records `status=unknown exit_code=unknown` and blocks close even when the Codex evidence is a full PASS. SPRINT-41 cannot close while STORY-058-10 declares this `deferred_verification`.

## 2. Reproduction Protocol
1. In a scratch directory, write an evidence file that `checkCodexEvidence` accepts (the harness's own test fixtures carry one), or use any file: the shape is wrong in both outcomes.
2. Run `node <cli>/scripts/clean-room/codex-hooks.mjs check --evidence <file> --write-result <dir>/STORY-058-10.json`.
3. `node -e "const r=require('<dir>/STORY-058-10.json'); console.log(r.status, r.exit_code)"` prints `undefined undefined`.
4. Step 2.9 turns that into `status=unknown exit_code=unknown`, which fails close for STORY-058-10.

Edge conditions: the command's own exit code is already right (0 on PASS, 1 on FAIL); only the file is wrong. A missing or unreadable evidence file is a FAIL (`markdown = ''`) and must write `status: "red"`, `exit_code: 1`. The `--write-result` directory may not exist yet (`mkdirSync` recursive is already there and must stay).

## 3. Evidence & Context
```
cleargate-cli/scripts/clean-room/codex-hooks.mjs:868-872 (cli main e720592)
  if (typeof opts['write-result'] === 'string') {
    const outPath = path.resolve(process.cwd(), opts['write-result']);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify({ ...result, artifactInputs, checkedAt: new Date().toISOString() }, null, 2)}\n`);
  }

cleargate-cli/scripts/clean-room/claude-baseline.mjs:762-776 (the working STORY-058-09 shape)
  const exitCode = result.ok ? 0 : 1;
  const status = result.ok ? 'green' : 'red';
  ... { story, command, ran_at: new Date().toISOString(), exit_code: exitCode, status, reason: result.reason ?? null }

.cleargate/scripts/close_sprint.mjs:1219-1226
  if (resultJson.status !== 'green' || resultJson.exit_code !== 0) {
    failures.push({ storyId, command: entry.command,
      reason: `status=${resultJson.status ?? 'unknown'} exit_code=${resultJson.exit_code ?? 'unknown'}` });

STORY-058-10 frontmatter deferred_verification:
  command: node cleargate-cli/scripts/clean-room/codex-hooks.mjs check --evidence .cleargate/sprint-runs/SPRINT-41/codex-hooks-evidence.md --write-result .cleargate/sprint-runs/SPRINT-41/deferred-verify/STORY-058-10.json
  blocks: close
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/scripts/clean-room/codex-hooks.mjs`: the `check` subcommand's `--write-result` block, plus a `--story` option in the argv usage (default `STORY-058-10`). Nothing else in the file.
- New test `cleargate-cli/test/scripts/codex-hooks-write-result.red.node.test.ts`.
- Do not edit `close_sprint.mjs`, `claude-baseline.mjs`, `evidence.mjs`, or `checkCodexEvidence`. `scripts/clean-room/**` is not an artifact input (`computeArtifactInputs`), so existing Codex evidence runs stay valid.

## Task Breakdown
- [x] QA-Red: spawn `codex-hooks.mjs check` against a passing and a failing evidence file with `--write-result`; assert the -09 shape, `status`/`exit_code` values, `story` default and `--story` override, and that Step 2.9's predicate accepts the passing file
- [x] Write the -09 shape in `check --write-result` (`story`, `command`, `ran_at`, `exit_code`, `status`, `reason`); add `--story` to the usage line
- [x] Typecheck and the targeted tests; `codex-hooks-harness.red` stays green (90/90 on main)

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/scripts/codex-hooks-write-result.red.node.test.ts` (solo).

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | A passing evidence check and a failing one both write a gate-readable file |
| Interfaces | F | One surface: the `check` subcommand's `--write-result` file |
| Data | T | A missing evidence file is a FAIL and writes the red shape |
| Rules | T | Step 2.9's rule (`status === 'green' && exit_code === 0`) passes only for the passing file |

```gherkin
Feature: codex-hooks check --write-result writes the deferred-verification result shape

  @paths @rules
  Scenario: A passing Codex evidence check writes a green result that close accepts
    Given an evidence file that checkCodexEvidence accepts
    When codex-hooks.mjs check runs with --write-result <dir>/STORY-058-10.json
    Then the file has story "STORY-058-10", status "green", exit_code 0, a command, and an ISO ran_at
    And close_sprint Step 2.9's predicate accepts it

  @paths @rules
  Scenario: A failing Codex evidence check writes a red result that close rejects
    Given an evidence file with no PASS scripted run
    When codex-hooks.mjs check runs with --write-result
    Then the file has status "red", exit_code 1 and a non-empty reason
    And the command itself exits 1

  @data
  Scenario: A missing evidence file is a FAIL
    Given --evidence names a file that does not exist
    When codex-hooks.mjs check runs with --write-result
    Then the file has status "red" and exit_code 1

  @rules
  Scenario: --story overrides the story id
    Given a passing evidence file
    When codex-hooks.mjs check runs with --write-result and --story STORY-058-13
    Then the file's story is "STORY-058-13"
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | one per scenario; each spawns the script with node against fixture evidence in a temp dir |
| Integration tests | 0 | the fix is one file-write block; the close gate itself is unchanged and already covered by close_sprint Step 2.9 tests |
| E2E / acceptance tests | 0 | the real proof is SPRINT-41's own close: Step 2.9 reads the file this writes (RS-CLOSE) |

---

## Prior work

- [[CR-082]] — introduced `deferred_verification` and the close-time Step 2.9 gate that reads `status`/`exit_code`; this bug is a writer that does not match that contract.
- [[BUG-090]] — also touches `close_sprint.mjs` (frontmatter location for Step 2.9's reader); orthogonal defect.
- [[SPRINT-41]] — STORY-058-10 declared the Codex deferred verification; the STORY-058-13 C3 entry re-derivation (plans/M6.md OD-F1) found the gap.

## Context Source

**context_source:** verified against cli main `e720592` (`codex-hooks.mjs:868-872`, `claude-baseline.mjs:760-776`) and the live `close_sprint.mjs:1204-1226`, plus STORY-058-10's frontmatter `deferred_verification` command.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
