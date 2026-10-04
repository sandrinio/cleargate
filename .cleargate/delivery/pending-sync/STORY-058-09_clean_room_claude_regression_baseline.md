---
story_id: STORY-058-09
parent_epic_ref: EPIC-058
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-41
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-09-04T00:00:00Z
ambiguity: 🟢 Low
context_source: Decomposition of [[EPIC-058]] on direct owner instruction 2026-09-04. Grounded in verified cleargate-cli source paths and Codex CLI v0.153.2 documented contracts; no path in this story is inferred.
actor: ClearGate maintainer
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
db_write_set: []
deferred_verification:
  - description: "Clean-room Claude baseline: the last run in clean-room-evidence.md is PASS against the final cli artifact inputs"
    command: node cleargate-cli/scripts/clean-room/claude-baseline.mjs check --evidence .cleargate/sprint-runs/SPRINT-41/clean-room-evidence.md --write-result .cleargate/sprint-runs/SPRINT-41/deferred-verify/STORY-058-09.json
    blocks: close
created_at: 2026-09-04T00:00:00Z
updated_at: 2026-09-25T22:01:57Z
created_at_version: cleargate@0.26.1
updated_at_version: 5bda3b15-dirty
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-04T10:25:03Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-058-09
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-24T22:38:49Z
  sessions: []
---

# STORY-058-09: Clean-room Claude regression baseline for no-flag and --host all

**Milestone:** M4 — Clean-room verification

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate maintainer shipping multi-host support, I want Claude Code's behavior re-proven in a clean room for both the no-flag install and `--host all`, so that adding other hosts is provably invisible to existing Claude users.

### 1.2 Detailed Requirements
- Execute the [[STORY-058-08]] procedure against a no-flag install and record the evidence artifact.
- Execute it again against `--host all` and assert every Claude-observable behavior is reproduced unchanged.
- Checked behaviors: SessionStart banner emitted; PreToolUse hook fires on an edit to `.cleargate/delivery/**`; the matching PostToolUse stamp-and-gate fires and reports its ingest result; the 11 agents and 3 skills are discoverable by name; MCP registration present; sprint state initialises; `cleargate doctor` exits 0.
- Assert `.claude/settings.json` contains no Codex- or Copilot-owned hook entries under `--host all`.
- Add an automated e2e test covering the mechanically assertable subset, so the baseline does not depend on someone remembering to run it.
- The evidence artifact is a gating input to sprint close.

### 1.3 Out of Scope
- Codex or Copilot functional verification — those hosts' own stories.
- Writing the procedure or the driver — [[STORY-058-08]].

### 1.4 Open Questions
- **Question:** where does the evidence artifact live — `.cleargate/sprint-runs/<id>/` or alongside the procedure in `knowledge/`?
- **Recommended:** `.cleargate/sprint-runs/<id>/clean-room-evidence.md`. It is per-run evidence, not standing knowledge, and sprint close already reads that directory.
- **Resolved 2026-09-25 (Architect):** .cleargate/sprint-runs/SPRINT-41/clean-room-evidence.md, append-only runs; it gates close through this story's deferred_verification entry (close_sprint.mjs Step 2.9).

### 1.5 Risks
- The behavioral half needs a real Claude Code session and cannot run in CI. If the automated subset is mistaken for the whole check, the story's value is lost — the e2e test must state in its own output which checks it does *not* cover.
- FLASHCARD 2026-08-30 `#qa #test-harness #danger`: "verified BOTH variants" is vacuous unless the test actually varies the thing. The `--host all` run must be a genuinely separate install, not the same fixture asserted twice.
- `cleargate sprint init` rejects every freshly scaffolded story as UNAPPROVED (`assert_story_files.mjs:162`, M4 F5; filed as BUG-090). The baseline records `sprint-init` as observed and never strips `<instructions>`; the check is host-independent and non-gating for the Claude baseline, recorded as `FAIL-KNOWN (BUG-090)` via `--known-fail sprint-init=BUG-090`.
- Without PATH control a clean room runs the global `cleargate`, not the artifact (M4 F1); the harness refuses to run live checks until `command -v cleargate` resolves inside the container.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Claude regression baseline in a clean room

  Scenario: No-flag install reproduces the Claude baseline
    Given a newly created empty directory outside the repository
    And a fresh git init and the packed cleargate artifact installed
    When `cleargate init` runs with no host flag
    Then a real Claude Code session emits the ClearGate SessionStart banner
    And a PreToolUse hook fires on an edit to a .cleargate/delivery work item
    And the PostToolUse stamp-and-gate hook fires and reports its ingest result
    And the ClearGate agents and skills are discoverable by name
    And `cleargate doctor` exits 0

  Scenario: --host all leaves Claude behavior unchanged
    Given a separate clean-room directory installed with --host all
    When the same checks run in a real Claude Code session
    Then every Claude-observable behavior from the baseline is reproduced
    And .claude/settings.json contains no Codex- or Copilot-owned hook entries

  Scenario: The automated subset states its own limits
    Given the e2e regression test
    When it runs
    Then it asserts the mechanically checkable behaviors
    And its output names the behaviors it cannot check without a live session

  Scenario: Evidence gates sprint close
    Given a change to install, upgrade, doctor, or uninstall
    When the evidence artifact for that change is absent
    Then the Definition of Done is not met
```

### 2.2 Verification Steps (Manual)
- [ ] Run the full procedure in a real Claude Code session for the no-flag install; record each check.
- [ ] Repeat in a **separate** directory for `--host all`; diff the two records — expect no Claude-observable difference.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File (new) | `cleargate-cli/test/e2e/clean-room-claude-baseline.red.integration.node.test.ts` |
| Related Files | `.cleargate/knowledge/clean-room-verification.md`, `cleargate-cli/src/commands/verify-install.ts` — reference, unchanged |
| New Files Needed | `cleargate-cli/scripts/clean-room/claude-baseline.mjs`, `cleargate-cli/scripts/clean-room/evidence.mjs`, `cleargate-cli/scripts/clean-room/probe-items.mjs`, `cleargate-cli/test/scripts/clean-room-evidence.red.node.test.ts`, `.cleargate/sprint-runs/SPRINT-41/clean-room-evidence.md` |
| Orchestration Files | `.cleargate/delivery/pending-sync/STORY-058-09_clean_room_claude_regression_baseline.md`, `.cleargate/wiki/log.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-09-qa-red.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-09-tpv.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-09-dev.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-09-qa.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-09-arch.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-09-devops.md` |

- `cleargate-cli/test/e2e/clean-room-claude-baseline.red.integration.node.test.ts` — **create**. The automated subset, run against an extracted `npm pack` of the committed tree. Two separate rooms, a Claude-shaped hook-process probe, and a diagnostic naming what it cannot check.
- `cleargate-cli/scripts/clean-room/{claude-baseline,evidence,probe-items}.mjs` — **create**. The re-runnable harness (used by RS-4 and close), its pure helpers, and the probe-item transforms. Outside the packed `files`.
- `cleargate-cli/test/scripts/clean-room-evidence.red.node.test.ts` — **create**. Unit tests for the helpers.
- `.cleargate/sprint-runs/SPRINT-41/clean-room-evidence.md` — **create**. Run 1; RS-4 and close append runs.
- `.cleargate/knowledge/clean-room-verification.md` — **modify**. A one-paragraph harness pointer at the end of section 5, plus any procedure gap the harness exposes.

### 3.2 Technical Logic
Two installs, two directories, one comparison. The comparison is the assertion — a single install checked twice proves nothing about coexistence.

The automated test covers what can be asserted without a host: payload tree, hook wiring in `settings.json`, mode bits, `doctor` exit code, and the absence of foreign hook entries under `--host all`. It must print the manual-only checks it skipped, so a green CI run is never mistaken for a completed baseline.

The live half runs headless (`claude -p`, stream-json with hook events, `--setting-sources project,local`) through `scripts/clean-room/claude-baseline.mjs run`, which executes the STORY-058-08 procedure verbatim for both rooms and appends a run section. Evidence validity is keyed on the cli artifact inputs (`src`, `scaffold`, build config), so re-runs are required exactly when the packed artifact changes. The `--host all` room equals the no-flag install until another host registers; the RS-4 re-run after STORY-058-11 is the non-vacuous witness for Goal check 3.

From RS-4 onward the two rooms' install snapshots are compared on the claude-visible subset — the entries `selectEntriesForHosts(files, ['claude'], registry)` admits — on (path, sha256, tier, `entryOwner`), because the `--host all` room also holds core-owned `.agents/**` entries the no-flag room lacks (M3-A23).

### 3.3 API Contract (if applicable)
Not applicable.

## Task Breakdown

- [ ] Add scripts/clean-room/probe-items.mjs (authored epic, approved story, declared sprint)
- [ ] Add scripts/clean-room/evidence.mjs (tree comparison, frontmatter check, Claude stream parser and verdicts, run-section render, evidence check, container validation, artifact inputs)
- [ ] Add scripts/clean-room/claude-baseline.mjs with run and check
- [ ] Run the harness: two separate rooms (no flag, --host all), live headless sessions, Run 1 appended to clean-room-evidence.md
- [ ] Compare the two rooms' verdicts and trees; resolve or file every Claude-observable difference
- [ ] Point the procedure's section 5 at the harness
- [ ] The automated e2e subset passes on the committed branch and names the checks it cannot make
- [x] Evidence gates close through deferred_verification (close_sprint.mjs Step 2.9) — frontmatter applied by the orchestrator (M4 amendment B1)

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 0 | Nothing unit-testable here; the story is an end-to-end behavioral assertion by construction |
| Integration tests | 1 | `--host all` install contains no foreign hook entries in .claude/settings.json |
| E2E / acceptance tests | 2 | No-flag baseline subset; --host all equivalence subset |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.
- [ ] The two runs used two separate directories, not one fixture asserted twice.
- [ ] The evidence artifact exists in the sprint-run directory and gates sprint close through this story's deferred_verification entry (close_sprint.mjs Step 2.9).

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/settings.json` — the hook event set (`SubagentStop`, `PreToolUse`, `PostToolUse`, `SessionStart`) the baseline asserts.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/hooks/session-start.sh` — emits the banner the baseline checks.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/hooks/stamp-and-gate.sh` — the PostToolUse hook whose firing and ingest report the baseline checks.
- **Surface:** `.cleargate/scripts/close_sprint.mjs:1015-1230` — Step 2.9, the deferred-verification close gate this story's evidence uses.
- **Surface:** `cleargate-cli/test/e2e/` — existing e2e home for the new test.

## Why not simpler?

- **Smallest existing surface:** extend `dogfood-install.integration.node.test.ts` with a couple of assertions.
- **Why isn't that sufficient?** That test runs against this repository, whose `/.claude/**` is gitignored, hand-synced, and fully untracked (CR-099) — so it reflects this machine's history rather than what the payload installs. That is precisely the blind spot that let [[BUG-024]] ship its own fix while still running the buggy hook, and it is why the baseline has to be a separate real install.

## Prior work

- [[EPIC-058]] — parent epic; this story is one of its decompositions.
- [[PROPOSAL-074]] — Antigravity single-host port; the `HostAdapter` precedent EPIC-058 generalizes.
- [[SPRINT-34]] — `Polyglot Portability Hardening`; language/test-stack portability, adjacent but distinct from harness portability.
- Decomposition-time re-check 2026-09-04: `cleargate-wiki-query` returned [[EPIC-058]] and [[PROPOSAL-074]] as the only multi-host prior work; no story-level prior art exists for this scope.
- [[BUG-024]] — shipped its own fix while running the buggy hook; the canonical example of why the dogfood instance cannot be the witness.
- [[BUG-067]] — surfaced by the first execution of this baseline on 2026-09-04.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered (no "TBD" / no "{}").
- [x] `approved: true` is set in the YAML frontmatter. (Direct owner approval 2026-09-04.)

