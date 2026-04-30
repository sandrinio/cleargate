---
story_id: STORY-013-03_Run_Script_Wrapper_PreGate
parent_epic_ref: EPIC-013
parent_cleargate_id: EPIC-013
status: Done
ambiguity: 🟢 Low
context_source: EPIC-013_Execution_Phase_v2.md §4.2 rows 'Pre-gate scanner' + 'run_script.sh wrapper' + V-Bounce Engine `scripts/{run_script.sh,pre_gate_runner.sh,pre_gate_common.sh,init_gate_config.sh}`
actor: Orchestrator + Developer Agent
complexity_label: L2
approved: true
approved_at: 2026-04-21T00:00:00Z
completed_at: 2026-04-21T08:30:00Z
approved_by: sandro
milestone: M1
created_at: 2026-04-21T00:00:00Z
updated_at: 2026-04-21T00:00:00Z
created_at_version: post-SPRINT-08
updated_at_version: post-SPRINT-08
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-21T00:00:01Z
implementation_files:
  - ".cleargate/scripts/gate-checks.json"
  - ".cleargate/scripts/init_gate_config.sh"
  - ".cleargate/scripts/pre_gate_common.sh"
  - ".cleargate/scripts/pre_gate_runner.sh"
  - ".cleargate/scripts/run_script.sh"
  - "cleargate-planning/.cleargate/scripts/gate-checks.json"
  - "cleargate-planning/.cleargate/scripts/init_gate_config.sh"
  - "cleargate-planning/.cleargate/scripts/pre_gate_common.sh"
  - "cleargate-planning/.cleargate/scripts/pre_gate_runner.sh"
  - "cleargate-planning/.cleargate/scripts/run_script.sh"
stamp_error: no ledger rows for work_item_id STORY-013-03_Run_Script_Wrapper_PreGate
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-20T22:26:50Z
  sessions: []
pushed_by: sandro.suladze@gmail.com
pushed_at: 2026-04-20T22:27:12.497Z
push_version: 1
---

# STORY-013-03: run_script.sh Wrapper + Pre-Gate Scanner
**Complexity:** L2 — four shell scripts + JSON config. No TypeScript surface.

## 1. The Spec (The Contract)

### 1.1 User Story
As the Orchestrator, I want a single wrapper (`run_script.sh`) that captures stdout/stderr separately and prints a structured diagnostic block on any non-zero exit, plus a pre-gate scanner (`pre_gate_runner.sh qa|arch`) that runs mechanical checks BEFORE spawning a QA or Architect agent, so that I stop spending expensive agent calls on failures that a grep could catch.

### 1.2 Detailed Requirements
- **`.cleargate/scripts/run_script.sh`** — bash wrapper invoked as `run_script.sh <script-name> [args...]`. Behavior:
  - Captures stdout → memory, stderr → memory.
  - On exit 0: stream stdout to caller stdout, stderr to caller stderr, return 0.
  - On exit ≠0: print a structured diagnostic block to stderr: script name, exit code, first 10 lines of stderr, a "Root cause" line (heuristic — see §3.2), a "Suggested fix" line. Return the original exit code.
  - Works with both `.mjs` (invoked via `node`) and `.sh` (invoked via `bash`) targets. Refuses unknown extensions.
  - Never mutates the environment or cwd of the caller.
- **`.cleargate/scripts/pre_gate_runner.sh`** — `pre_gate_runner.sh qa|arch <worktree-path> <branch>`. Behavior:
  - Mode `qa`: runs `npm run typecheck`, grep for `console.log` / `console.debug` / `debugger` in staged changes, grep for `TODO` / `FIXME` newly introduced, `npm test` on the package touched.
  - Mode `arch`: runs `npm run typecheck`, compares `package.json` vs `sprint/<branch>^` to list new runtime deps (non-dev), checks for stray `.env*` files, lists file counts per directory to flag structural drift.
  - Reads `.cleargate/scripts/gate-checks.json` for stack detection + which checks to run; if the file is missing, first-run auto-creates defaults via `init_gate_config.sh`.
  - Writes a report to `<worktree-path>/.cleargate/reports/pre-<mode>-scan.txt` (creates dir if needed).
  - Exit 0 = all checks pass → orchestrator proceeds to spawn QA/Architect.
  - Exit 1 = checks failed → orchestrator returns story to Developer, does NOT spawn QA/Architect.
  - Exit 2 = scan couldn't run (missing config, missing worktree) → orchestrator escalates to self-repair.
- **`.cleargate/scripts/pre_gate_common.sh`** — sourced by `pre_gate_runner.sh`; holds shared functions (grep helpers, diff-against-branch, JSON read via `node -p`).
- **`.cleargate/scripts/init_gate_config.sh`** — first-run generator; writes `.cleargate/scripts/gate-checks.json` with Node+TS defaults (matches ClearGate's stack — Fastify, Drizzle, SvelteKit, Vitest). No Python/Go/Rust detectors.
- Three-surface landing: all four shell scripts + gate-checks.json under `.cleargate/scripts/` AND `cleargate-planning/.cleargate/scripts/`.
- All scripts executable (`chmod 755`).

### 1.3 Out of Scope
- Integration with `state.json` — pre-gate scanner is a standalone tool in this story; wiring it into the orchestrator's v2 loop is part of STORY-013-05/08.
- Self-repair recipes (agent retries on failure) — protocol §14 in STORY-013-05.
- Python/Go/Rust stack detection — explicitly out (ClearGate is Node+TS only per EPIC-013 §4.2).

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: run_script.sh + pre-gate scanner

  Scenario: run_script.sh passes through a successful script
    Given a script "ok.mjs" that prints "hello" and exits 0
    When I run "run_script.sh ok.mjs"
    Then stdout is "hello"
    And exit code is 0

  Scenario: run_script.sh prints a diagnostic block on failure
    Given a script "fail.mjs" that prints "oops" to stderr and exits 7
    When I run "run_script.sh fail.mjs"
    Then exit code is 7
    And stderr contains "## Script Incident"
    And stderr contains "Exit code: 7"
    And stderr contains "Suggested fix:"

  Scenario: pre_gate_runner qa catches a debug statement
    Given a worktree with one committed file containing "console.log('debug')"
    When I run "pre_gate_runner.sh qa .worktrees/STORY-FAKE sprint/S-FAKE"
    Then exit code is 1
    And .worktrees/STORY-FAKE/.cleargate/reports/pre-qa-scan.txt names the offending file and line

  Scenario: pre_gate_runner arch flags a new runtime dep
    Given a worktree where package.json adds "some-new-lib" under dependencies vs sprint branch
    When I run "pre_gate_runner.sh arch .worktrees/STORY-FAKE sprint/S-FAKE"
    Then exit code is 1
    And the report file lists "new runtime dep: some-new-lib"

  Scenario: init_gate_config seeds a config file on first run
    Given .cleargate/scripts/gate-checks.json does not exist
    When I run "init_gate_config.sh"
    Then gate-checks.json exists with mode-qa and mode-arch keys
    And re-running init_gate_config.sh is a no-op (does not overwrite)

  Scenario: run_script.sh refuses unknown extension
    When I run "run_script.sh something.py"
    Then exit code is 2
    And stderr says "unsupported extension"
```

### 2.2 Verification Steps (Manual)
- [ ] Seed a fake worktree with a `console.log` and walk through §2.1 scenarios 3 and 4.
- [ ] Inspect the generated `gate-checks.json` — human-readable, comments explaining each check.
- [ ] Confirm `chmod +x` on all four scripts (verify with `ls -l`).
- [ ] Scaffold mirror present under `cleargate-planning/`.

## 3. The Implementation Guide

**Files to touch:**

- `.cleargate/scripts/run_script.sh` (new) — bash wrapper with structured diagnostic block
- `.cleargate/scripts/pre_gate_runner.sh` (new) — qa/arch mode scanner
- `.cleargate/scripts/pre_gate_common.sh` (new) — shared shell helpers
- `.cleargate/scripts/init_gate_config.sh` (new) — first-run config generator
- `.cleargate/scripts/gate-checks.json` (generated) — stack-aware checks config
- `cleargate-planning/.cleargate/scripts/*` — scaffold mirror (all four scripts)

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `.cleargate/scripts/run_script.sh` (new) |
| Primary File | `.cleargate/scripts/pre_gate_runner.sh` (new) |
| Primary File | `.cleargate/scripts/pre_gate_common.sh` (new) |
| Primary File | `.cleargate/scripts/init_gate_config.sh` (new) |
| Primary File | `.cleargate/scripts/gate-checks.json` (generated, not checked in — or: committed with defaults?) |
| Scaffold mirrors | `cleargate-planning/.cleargate/scripts/` — all four |
| New Files Needed | Yes — all four scripts |

### 3.2 Technical Logic
Port V-Bounce's `scripts/run_script.sh` + `scripts/pre_gate_runner.sh` + `scripts/pre_gate_common.sh` + `scripts/init_gate_config.sh`. Strip Python/Go/Rust detectors. The "root cause" heuristic in `run_script.sh`: match stderr against known patterns (`ENOENT` → missing file, `EACCES` → permission, `SyntaxError` → JS syntax, `state.json not found` → suggest re-init). No ML, just a dozen regex cases. Architect can extend during M1 planning.

`gate-checks.json` shape (verbatim from V-Bounce with stack trimmed):
```json
{
  "schema_version": 1,
  "qa": {
    "typecheck": "npm run typecheck",
    "debug_patterns": ["console.log", "console.debug", "debugger"],
    "todo_patterns": ["TODO", "FIXME", "XXX"],
    "test": "npm test"
  },
  "arch": {
    "typecheck": "npm run typecheck",
    "new_deps_check": true,
    "stray_env_files": [".env", ".env.local", ".env.production"],
    "file_count_report": true
  }
}
```

### 3.3 API Contract (if applicable)
N/A.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| bats-like integration tests (or bash `set -e` test script) | 6 | One per §2.1 scenario |
| Manual walkthrough | 1 | End-to-end on a fake worktree |

### 4.2 Definition of Done
- [ ] All six §2.1 scenarios green.
- [ ] Four scripts chmodded 755.
- [ ] Three-surface landing (`.cleargate/` + `cleargate-planning/`).
- [ ] Architect M1 plan consulted.
- [ ] `npm run typecheck` still green in `cleargate-cli`.
- [ ] Commit: `feat(EPIC-013): STORY-013-03 run_script.sh wrapper + pre-gate scanner`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity (Ready for Execution)**

- [x] Gherkin covers §1.2.
- [x] Paths verified.
- [x] 0 unresolved placeholders.
- [x] Stack detection scope pinned to Node+TS (no Python/Go/Rust).
