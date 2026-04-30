---
story_id: STORY-018-05
parent_epic_ref: EPIC-018
parent_cleargate_id: "EPIC-018"
status: Completed
ambiguity: 🟢 Low
context_source: EPIC-018_Framework_Universality_Public_Ship.md
actor: CI pipeline / regression safety net
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: med
created_at: 2026-04-24T00:00:00Z
updated_at: 2026-04-24T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-24T19:51:49Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-018-05
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-24T19:51:49Z
  sessions: []
---

# STORY-018-05: Foreign-Repo Integration Test — `cleargate init` in a Non-ClearGate Tree
**Complexity:** L2 — test harness + two fixtures + CI wiring. Load-bearing proof-of-universality.

**Depends on:** STORY-018-03 (gate verbs) + STORY-018-04 (scaffold-lint runs clean on the installed scaffold).

## 1. The Spec (The Contract)

### 1.1 User Story
As a maintainer who claims "ClearGate installs into any repo," I want an automated integration test that installs the scaffold into two minimal foreign-repo fixtures (blank Node, bare Go) and walks them through the canonical first-use motions, so that any PR that breaks universality fails CI loudly instead of shipping silently.

### 1.2 Detailed Requirements
- New test file: `cleargate-cli/test/integration/foreign-repo.test.ts` (use the existing vitest config; co-located tests in `test/integration/` dir).
- Two fixture generators inside the test file (no committed fixture tree; build them in tmpdir so they're always pristine):

  **Fixture A — Blank Node repo:**
  ```
  package.json (from `npm init -y` equivalent: name, version 1.0.0, scripts.test = "echo stub")
  .git/ (initialized via `git init` so worktree semantics are testable)
  README.md (one-line: "# Foreign test repo")
  ```

  **Fixture B — Bare Go repo:**
  ```
  go.mod ("module example.com/foo\ngo 1.22\n")
  main.go ("package main\nfunc main() {}\n")
  .git/
  README.md
  ```

- Per-fixture, the test must:
  1. Build the scaffold install path programmatically — invoke the CLI's own init handler (`cleargate-cli/src/commands/init.ts`'s exported function) with `cwd` seam pointing at the tmpdir. Avoid shelling out to `cleargate init` CLI to keep the test fast and deterministic.
  2. Assert post-init:
     - `.cleargate/knowledge/cleargate-protocol.md` exists
     - `.cleargate/templates/{proposal,epic,story,CR,Bug}.md` all exist
     - `.cleargate/delivery/pending-sync/` exists (empty)
     - `.cleargate/delivery/archive/` exists (empty)
     - `.cleargate/FLASHCARD.md` exists (empty template)
     - `.cleargate/.install-manifest.json` exists with the current `cleargate_version`
     - `.claude/agents/{architect,developer,qa,reporter}.md` all exist
     - `.claude/hooks/token-ledger.sh` + `.claude/hooks/session-start.sh` (or equivalent) exist
     - `.claude/skills/flashcard/SKILL.md` exists
     - `CLAUDE.md` exists with the bounded `<!-- CLEARGATE:START -->…END -->` block populated
     - **Every `.md` under `.cleargate/` + `.claude/` parses as valid frontmatter-plus-body** (each file: `js-yaml.load` the frontmatter doesn't throw).
  3. Run `cleargate scaffold-lint` (from STORY-018-04) against the installed scaffold; assert exit 0.
  4. Run `cleargate gate precommit` (from STORY-018-03) with no `.cleargate/config.yml` present; assert stdout contains "not configured" + exit 0.
  5. Create a minimal `.cleargate/config.yml` with `gates.precommit: "echo PRECOMMIT_OK"`; run `cleargate gate precommit`; assert stdout contains `PRECOMMIT_OK` + exit 0.
  6. File a trivial proposal via template copy to `.cleargate/delivery/pending-sync/PROPOSAL-999_Test.md`; run `cleargate wiki build`; assert `.cleargate/wiki/proposals/PROPOSAL-999.md` exists.
- Single test suite; distinct `describe` blocks per fixture.
- Teardown: best-effort `fs.rm -rf tmpdir` after each test; don't fail the suite if cleanup errors.
- **CI wiring:** extend `.github/workflows/scaffold-lint.yml` (from STORY-018-04) with a new job `foreign-repo-integration` that runs the test. Jobs may run in parallel; both must pass for the PR check to pass.

### 1.3 Out of Scope
- Actually invoking Claude Code subagents inside the fixtures (no Claude Code session spawning in CI — too flaky, no API access needed).
- Downstream four-agent-loop end-to-end (that's covered by this repo's own operation).
- Python, Rust, Ruby, Java fixtures. Node + Go is sufficient per EPIC-018 §6 Q1 recommended default.
- Running `cleargate upgrade` in the fixture (EPIC-016 scope).
- Assertion on exact byte-contents of installed files — shape + parseability is enough.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Foreign-Repo Integration

  Scenario: Init into blank Node repo succeeds
    Given a tmpdir with only `package.json` and `.git/`
    When `cleargate init` runs programmatically
    Then the canonical scaffold files all exist
    And every installed .md parses as valid frontmatter
    And .cleargate/.install-manifest.json records the current cleargate_version

  Scenario: Init into bare Go repo succeeds
    Given a tmpdir with `go.mod` + `main.go` + `.git/` and no Node tooling
    When `cleargate init` runs programmatically
    Then the scaffold files all exist with the same shape as the Node fixture

  Scenario: scaffold-lint on installed scaffold is clean
    Given an installed scaffold in either fixture
    When `cleargate scaffold-lint` runs
    Then exit code is 0

  Scenario: Gate friendly-fallback in fresh fixture
    Given a fixture with no .cleargate/config.yml
    When `cleargate gate precommit` runs
    Then stdout contains "not configured"
    And exit code is 0

  Scenario: Configured gate runs the command
    Given a fixture with .cleargate/config.yml setting gates.precommit: "echo PRECOMMIT_OK"
    When `cleargate gate precommit` runs
    Then stdout contains "PRECOMMIT_OK"
    And exit code is 0

  Scenario: Wiki build works in fixture
    Given a proposal file exists at .cleargate/delivery/pending-sync/PROPOSAL-999_Test.md
    When `cleargate wiki build` runs
    Then `.cleargate/wiki/proposals/PROPOSAL-999.md` exists
    And `.cleargate/wiki/index.md` lists PROPOSAL-999 in the Active section

  Scenario: CI gates on regression
    Given a PR that breaks `cleargate init` in one fixture
    When the foreign-repo-integration GitHub Actions job runs
    Then the job fails loudly
```

### 2.2 Verification Steps (Manual)
- [ ] Run the integration test locally: `npm test --workspace=cleargate-cli -- foreign-repo` — both fixtures pass in < 30 s.
- [ ] Push a scratch branch that breaks init (e.g., rename a scaffold file the init handler copies); confirm CI fails on that branch.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/test/integration/foreign-repo.test.ts` (new) |
| Related Files | `cleargate-cli/src/commands/init.ts` (read-only — ensure exported init handler accepts `cwd` seam), `cleargate-cli/vitest.config.ts` (ensure `test/integration/**` included), `.github/workflows/scaffold-lint.yml` (extend with new job) |
| New Files Needed | Yes — the test file + GitHub Actions job extension |

### 3.2 Technical Logic
- Use `fs.mkdtemp(os.tmpdir() + '/cg-foreign-')` per test.
- Initialize `.git/` via `execSync('git init', { cwd: tmp })` — git worktree behavior is part of the scaffold's assumptions.
- Pre-write fixture files with `fs.writeFileSync`.
- Invoke `initHandler({ cwd: tmp })` directly from the test import; verify side-effects via file-existence checks.
- For gate + scaffold-lint assertions, call the exported handlers directly with `cwd` seam — same test-seam pattern already used in `build.test.ts`, `lint.test.ts`, etc.
- Performance: must complete in < 30s total on CI. If slower, parallelize fixtures via `describe.concurrent` or equivalent vitest primitive.

### 3.3 API Contract
N/A — test-only.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Integration tests | 7 | One per Gherkin scenario; 2× fixtures × core assertions |
| Unit tests | 0 | Integration only for this story |

### 4.2 Definition of Done
- [ ] `cleargate-cli/test/integration/foreign-repo.test.ts` exists with 7+ scenarios.
- [ ] Both fixtures pass locally + in CI.
- [ ] CI workflow runs the integration test as a required PR check.
- [ ] Test completes in < 30s on CI.
- [ ] Typecheck + unit tests pass.
- [ ] Commit: `feat(EPIC-018): STORY-018-05 foreign-repo integration test`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green:
- [ ] Confirm the exported `initHandler` accepts a `cwd` seam, or add it as a prerequisite edit (should already exist per FLASHCARD `#cli #test-seam` patterns).
- [ ] Confirm EPIC-018 §6 Q1 (fixtures = Node + Go) — recommended default accepted.
