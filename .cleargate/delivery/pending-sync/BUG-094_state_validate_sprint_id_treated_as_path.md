<instructions>
FOLLOW THIS EXACT STRUCTURE. Output sections in order 1-5.
YAML Frontmatter: Bug ID, Parent Ref, Status, Severity, Reporter, Approved gate.
§1 The Anomaly: Expected vs. Actual behavior.
§2 Reproduction Protocol: Deterministic steps to recreate.
§3 Evidence & Context: Raw logs, stack traces, payloads — no paraphrasing.
§4 Execution Sandbox: Exact file paths to investigate. Restrict scope to prevent unrelated refactoring.
Task Breakdown: one `- [ ] <action>` row per executable step, in execution order. REQUIRED at L3 and above, optional at L2, omit the section entirely at L1. An absent section passes the gate; a present-but-empty one fails. Task Breakdown rows implement the Gherkin scenarios in §5; no row is written for an axis marked F.
§5 Verification Protocol: The failing test that proves the bug exists and proves the fix resolves it. §5 also carries a SPIDR coverage table (axes: Paths, Interfaces, Data, Rules) above a Gherkin block. Paths = more than one *successful* way through (the baseline error scenario is not a path). Interfaces = more than one surface exposes the behaviour (CLI / API / UI / hook). Data = behaviour differs by data type, shape or volume — usually a Scenario Outline with Examples. Rules = a business rule constrains the outcome — one scenario per rule, including breaking it. Tag each covered scenario with the matching `@paths` / `@interfaces` / `@data` / `@rules` marker directly above `Scenario:` / `Scenario Outline:`. There is no Spike row: open discovery is chartered as a SPIKE item before this Bug is written.
Output location: .cleargate/delivery/pending-sync/BUG-094_state-validate-sprint-id-treated-as-path.md

POST-WRITE BRIEF
After Writing this document, render a Brief in chat with the following sections,
mechanically extracted from the document's own structure:

  - Prior work    ← cleargate-wiki-query result (cite [[IDs]] or write "none found")
  - Summary        ← §1 The Anomaly (repro)
  - Open Questions ← ### Open Questions
  - Edge Cases     ← §2 Reproduction Protocol (edge conditions)
  - SPIDR          ← §5 Verification Protocol (SPIDR coverage table)
  - Risks          ← §4 Execution Sandbox (suspected blast radius)
  - Ambiguity      ← bottom-of-doc ambiguity gate block

Halt for human review. When ambiguity reaches 🟢, proceed to call cleargate_push_item.
Do NOT ask separately for push confirmation — Brief approval covers it.

Do NOT output these instructions.
</instructions>

---
bug_id: BUG-094
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: cli,state,scripts
status: Draft
severity: P2-Medium
reporter: orchestrator (SPRINT-41 BUG-085 post-flight FU-1)
approved: false
context_source: measured by the BUG-085 Architect post-flight (reports/BUG-085-arch.md FU-1) and verified against cleargate-cli src/commands/state.ts:205-209 and scaffold/core/.cleargate/scripts/validate_state.mjs:5-9 on cli story/BUG-085 @ 12ae157
created_at: 2026-09-26T00:00:00Z
updated_at: 2026-09-26T02:53:23Z
created_at_version: strategy-phase-pre-init
updated_at_version: 806e0ab4-dirty
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-26T02:53:23Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# BUG-094: `cleargate state validate <sprint-id>` always fails after the CR-117 port of `validate_state.mjs`

### Open Questions

- **Question:** Should the cli wrapper pass `--state-file <root>/.cleargate/sprint-runs/<id>/state.json`, or should `validate_state.mjs` resolve a bare sprint id itself?
- **Recommended:** Fix the wrapper. CR-117 deliberately made a lone positional a file path, the same convention as every other script in `.cleargate/scripts/`. The wrapper knows the project root and the sprint id, so it should build the path explicitly and pass `--state-file`, which wins over a positional.
- **Human decision:** {pending Gate 1}

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** `cleargate state validate SPRINT-NN` validates `.cleargate/sprint-runs/SPRINT-NN/state.json` and exits 0 when it is well-formed. That was the behaviour before the CR-117 port, in single-sprint repos.

**Actual Behavior:**
- `validate_state.mjs` now takes a lone positional argument as the state-file PATH (CR-117, ported to `scaffold/core` by BUG-085).
- The cli wrapper still calls `bash run_script.sh node <validate_state.mjs> <sprintId>` (`cleargate-cli/src/commands/state.ts:205-209`).
- The script therefore resolves `<cwd>/SPRINT-NN` as the state file and exits 1 in every repo.
- This became ship-visible when BUG-085 put the CR-117 bytes into the canonical payload. The meta-repo's live copy has run these bytes since CR-117.
- Nothing in the sprint loop calls this command, and no publish happens in SPRINT-41, so there is no in-sprint impact. It must be fixed before the next `npm publish`.

## 2. Reproduction Protocol
1. Take a scratch install from a dist built at or after cli `12ae157`, with one sprint's `state.json` at `.cleargate/sprint-runs/SPRINT-01/state.json`.
2. Run `node <cli>/dist/cli.js state validate SPRINT-01` in that directory, as one `(cd <dir> && …)` call.
3. Observe exit 1, with the script naming `<dir>/SPRINT-01` as the missing state file.
4. Control: `node .cleargate/scripts/validate_state.mjs --state-file .cleargate/sprint-runs/SPRINT-01/state.json` → exit 0.

Edge conditions: a sprint id containing a path separator (reject); a missing sprint directory (exit non-zero with a clear message); multi-sprint repos.

## 3. Evidence & Context
```
cleargate-cli/src/commands/state.ts @ 12ae157, :203-209
  const validateScriptPath = resolveCleargateScript({ cwd: validateCwd }, 'validate_state.mjs');
  const result = spawnFn('bash', [runScript, 'node', validateScriptPath, opts.sprintId], { stdio: 'inherit' });

scaffold/core/.cleargate/scripts/validate_state.mjs @ 12ae157, :5-9
  * Usage: node validate_state.mjs [<path>] [--state-file <path>]
  * A lone positional argument is treated as the state file path ...

BUG-085 post-flight probe (single-sprint fixture): exit 0 before the port, exit 1 after.
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/src/commands/state.ts` (`:203-209`): pass `--state-file <root>/.cleargate/sprint-runs/<id>/state.json`.
- `cleargate-cli/test/commands/state.node.test.ts` and `test/commands/state-unit.node.test.ts`: the CR-050 argv assertions.
- Do not change `validate_state.mjs` (canonical and live stay byte-equal; BUG-085's drift check enforces that).

## Task Breakdown
- [ ] QA-Red: `cleargate state validate <id>` against a real single-sprint fixture exits 0; the spawned argv carries `--state-file <root>/.cleargate/sprint-runs/<id>/state.json`
- [ ] Build the explicit state-file path in `state.ts` and pass `--state-file`; update the CR-050 argv tests
- [ ] Add a CHANGELOG `### Fixed` entry before the next publish

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/commands/state-validate-path.red.node.test.ts` (new), then `test/commands/state.node.test.ts` and `test/commands/state-unit.node.test.ts`, each run solo.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Valid state file (exit 0) and an invalid one (exit 1) both succeed as validations |
| Interfaces | F | One surface: `cleargate state validate` |
| Data | F | One input shape: a sprint id |
| Rules | T | The wrapper always names the state file explicitly; a sprint id is never a path |

```gherkin
Feature: state validate resolves the sprint's state file

  @paths
  Scenario: A well-formed sprint state validates
    Given a repo with .cleargate/sprint-runs/SPRINT-01/state.json that is well-formed
    When cleargate state validate SPRINT-01 runs
    Then it exits 0

  @rules
  Scenario: The wrapper passes the state file explicitly
    Given cleargate state validate SPRINT-01
    When the wrapper spawns validate_state.mjs
    Then its argv carries --state-file <root>/.cleargate/sprint-runs/SPRINT-01/state.json
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 2 | one per scenario |
| Integration tests | 1 | the spawned script against a real fixture |
| E2E / acceptance tests | 0 | none |

---

## Prior work

- [[CR-117]] — made `validate_state.mjs` take a lone positional as the state-file path; the wrapper was not updated with it.
- [[SPRINT-40]] — shipped CR-117 to the live meta-repo copy.
- [[CR-106]] — adjacent: the event-log drift check inside `validate_state.mjs`.

## Context Source

**context_source:** BUG-085 Architect post-flight (FU-1), verified against `cleargate-cli/src/commands/state.ts` and `scaffold/core/.cleargate/scripts/validate_state.mjs` at cli `12ae157`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity** — the fix-location question is open; approval pending.

- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
