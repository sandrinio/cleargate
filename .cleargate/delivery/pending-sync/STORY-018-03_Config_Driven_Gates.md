---
story_id: STORY-018-03
parent_epic_ref: EPIC-018
status: Ready
ambiguity: 🟢 Low
context_source: EPIC-018_Framework_Universality_Public_Ship.md
actor: Downstream adopter in any language / build system
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: med
created_at: 2026-04-24T00:00:00Z
updated_at: 2026-04-24T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-24T19:51:46Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-018-03
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-24T19:51:46Z
  sessions: []
---

# STORY-018-03: Config-Driven Gates — `cleargate gate {precommit|test|typecheck|lint}`
**Complexity:** L2 — CLI extension + config loader extension + agent-wording refresh. The load-bearing universality story.

## 1. The Spec (The Contract)

### 1.1 User Story
As a downstream adopter whose project is Go / Rust / Python / Ruby (not Node), I want to configure ClearGate's pre-commit / test / typecheck / lint gate commands via `.cleargate/config.yml` instead of inheriting hard-coded `npm test` from the agent definitions, so that the four-agent loop works in my toolchain without forking the scaffold.

### 1.2 Detailed Requirements
- Extend `.cleargate/config.yml` schema with `gates` map:
  ```yaml
  gates:
    precommit: "npm run typecheck --workspace=cleargate-cli && npm test"  # this repo's own value
    test: "npm test --workspace=cleargate-cli"
    typecheck: "npm run typecheck --workspace=cleargate-cli"
    lint: "cleargate wiki lint"
  ```
  All keys optional; each defaults to a safe fallback when absent (see below).
- New CLI subcommand: `cleargate gate <name>` where `<name>` ∈ {`precommit`, `test`, `typecheck`, `lint`}.
  - Loads `.cleargate/config.yml` via the EPIC-015 `loadWikiConfig` surface (extend to load `gates` too, or use a shared loader).
  - Resolves the command string for `<name>`.
  - Executes via `child_process.spawnSync` with `stdio: 'inherit'`; propagates exit code.
  - If config absent OR key absent: prints `gate "<name>" not configured — add gates.<name> to .cleargate/config.yml (see cleargate-planning/.cleargate/config.example.yml)` and **exits 0** (non-blocking; the loop continues but no gate runs).
  - `--strict` flag flips the absent-key behavior to exit 1 ("no gate means no ship").
- Extend `cleargate wiki-config.ts` from EPIC-015 to expose `gates` field (keep the `wiki.index_token_ceiling` behavior unchanged).
- Swap agent-definition language from `npm test` / `npm run typecheck` to `cleargate gate test` / `cleargate gate typecheck`:
  - `cleargate-planning/.claude/agents/developer.md`
  - `cleargate-planning/.claude/agents/qa.md`
  - Also this repo's live mirrors: `.claude/agents/developer.md`, `.claude/agents/qa.md` (keep dogfood in sync).
- Add `cleargate-planning/.cleargate/config.example.yml` with all gate keys documented + safe defaults + comments explaining each.
- Add this repo's own `.cleargate/config.yml` committed so dogfooding stays identical post-switch.

### 1.3 Out of Scope
- Custom user-defined gate *names* beyond the four canonical ones — if teams want `security-scan`, that's a follow-up CR.
- Parallel-run or chained-gate semantics (for now, `precommit` is a single command string; users can chain with `&&` themselves).
- Per-language stock gate presets (`--preset=go`, `--preset=python`) — out-of-scope polish.
- Gate timeout handling.
- Gate command output parsing / test-result structured output.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Config-Driven Gates

  Scenario: Configured gate runs the user's command
    Given .cleargate/config.yml contains `gates.test: "echo TEST_RAN"`
    When I run `cleargate gate test`
    Then stdout contains "TEST_RAN"
    And exit code is 0

  Scenario: Configured gate propagates non-zero exit
    Given .cleargate/config.yml contains `gates.test: "exit 7"`
    When I run `cleargate gate test`
    Then exit code is 7

  Scenario: Missing config is friendly, not fatal
    Given no .cleargate/config.yml
    When I run `cleargate gate precommit`
    Then stdout contains "gate \"precommit\" not configured"
    And stdout contains "add gates.precommit to .cleargate/config.yml"
    And exit code is 0

  Scenario: Missing key with --strict fails
    Given .cleargate/config.yml exists but has no `gates.precommit` key
    When I run `cleargate gate precommit --strict`
    Then exit code is 1

  Scenario: Unknown gate name rejected
    When I run `cleargate gate frobnicate`
    Then stderr contains "unknown gate name 'frobnicate' — must be one of: precommit, test, typecheck, lint"
    And exit code is 2

  Scenario: Agent wording updated
    Given cleargate-planning/.claude/agents/developer.md
    When I grep for "npm test" or "npm run typecheck"
    Then no match is found
    And "cleargate gate test" and "cleargate gate typecheck" are both present

  Scenario: Meta-repo workflow preserved
    Given this repo's .cleargate/config.yml with real gate commands
    When the orchestrator invokes `cleargate gate precommit`
    Then the command executes the same work as pre-EPIC-018 `npm run typecheck && npm test` invocation
```

### 2.2 Verification Steps (Manual)
- [ ] In this repo: `cleargate gate precommit` → typecheck + tests run as today.
- [ ] In a tmpdir without config: `cleargate gate test` → friendly message + exit 0.
- [ ] `grep -rn "npm test" cleargate-planning/.claude/agents/` → empty.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/commands/gate.ts` (extend existing readiness-gate command OR add new sibling) |
| Related Files | `cleargate-cli/src/lib/wiki-config.ts` (extend to include `gates` map), `cleargate-cli/src/cli.ts` (register subcommand shape `gate <name>`), `cleargate-planning/.claude/agents/developer.md`, `cleargate-planning/.claude/agents/qa.md`, `.claude/agents/developer.md`, `.claude/agents/qa.md`, `cleargate-planning/.cleargate/config.example.yml` (new), `.cleargate/config.yml` (new in this repo) |
| New Files Needed | Yes — `config.example.yml` + this repo's `config.yml` |

### 3.2 Technical Logic
- Config schema additive — existing `wiki.index_token_ceiling` stays; new top-level `gates` map added.
- `loadWikiConfig()` renamed or extended to `loadCleargateConfig()` returning `{ wiki: {...}, gates: {...} }`. Back-compat alias if feasible.
- Gate handler: `spawnSync(command, { shell: true, stdio: 'inherit' })`. Use `shell: true` so the command string is parsed by /bin/sh (enables `&&`, `||`, pipes for user convenience).
- Agent-definition edits: grep for literal `npm test` and `npm run typecheck`; replace inline occurrences with `cleargate gate test` / `cleargate gate typecheck`. Keep example contexts where they read as "this repo's example" obvious.
- `cleargate-planning/.cleargate/config.example.yml` must include commented hints for common stacks (Node, Go, Python, Rust) as copy-paste starters.

### 3.3 API Contract

| Command | Exit | Behavior |
|---|---|---|
| `cleargate gate <name>` | propagated | Runs configured command via shell; inherits stdio |
| `cleargate gate <name>` (missing config) | 0 (default) / 1 (--strict) | Prints friendly guidance |
| `cleargate gate <invalid>` | 2 | Rejects with usage text |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 6 | One per Gherkin scenario (seamed `spawnSync` for test isolation) |
| E2E / integration | 1 | Against this repo's own `.cleargate/config.yml`; expect typecheck + tests to run |

### 4.2 Definition of Done
- [ ] `cleargate gate {precommit|test|typecheck|lint}` all work.
- [ ] Friendly "not configured" path exits 0; `--strict` exits 1.
- [ ] `cleargate-planning/.cleargate/config.example.yml` documents all four gate keys.
- [ ] Agent definitions free of `npm test` / `npm run typecheck` literals (per grep).
- [ ] This repo's `.cleargate/config.yml` committed; dogfood loop unchanged.
- [ ] Typecheck + tests green (ironic but essential).
- [ ] Commit: `feat(EPIC-018): STORY-018-03 config-driven gates`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green:
- [ ] EPIC-018 §6 Q3 answer (gate CLI shape — `cleargate gate <name>` recommended) confirmed.
- [ ] Confirm `--strict` flag belongs here (story), or deferred to a follow-up CR (simpler default).
