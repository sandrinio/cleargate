---
story_id: STORY-066-03
parent_epic_ref: EPIC-066
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_by: "sandrinio"
approved_at: "2026-11-15T09:00:00Z"
ambiguity: 🟢 Low
context_source: EPIC-066 (approved 2026-11-14) In-scope prerequisite 1; field finding W-D1 and W010-6 in .cleargate/field-trials/2026-11-dispenser-sprint45-rc.md; BUG-087; canonical pre_gate_runner.sh and pre_gate_common.sh read 2026-11-14
actor: Orchestrator running the pre-gate scan
complexity_label: L2
area: sprint-execution,scripts,gates
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-11-14T19:47:47.346Z
updated_at: 2026-11-14T19:47:47.346Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
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
  last_gate_check: 2026-11-14T19:53:55Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# STORY-066-03: Pre-gate scan runs configured commands on any stack
**Complexity:** L2 — two shell scripts and one seeder, one new helper, real-repo tests on an npm fixture and a Go fixture.

## 1. The Spec (The Contract)

### 1.1 User Story
As the orchestrator of a sprint on a repository that is not an npm project, I want the pre-gate scan to run the test and typecheck commands that `gate-checks.json` configures, and to say so loudly when it cannot, so that a passing scan means the code was checked, and a fast-lane item can be gated by it.

### 1.2 Detailed Requirements
- Requirement 1: Every configured command in `pre_gate_runner.sh` runs whatever the stack. The `-f "${WORKTREE}/package.json"` guards on `qa.typecheck` (line 82), `qa.test` (line 187) and `arch.typecheck` (line 208) are removed. A command is "configured" when its `gate-checks.json` value is a non-empty string.
- Requirement 2: A failing configured command records `[FAIL] <check>: exit code N` followed by the last 40 lines of its combined stdout and stderr, each prefixed with `  | `, in the report. Today `qa.test` sends all output to `/dev/null` (line 189) and `qa.typecheck` keeps five lines (line 86). One helper in `pre_gate_common.sh` (`run_configured_check`) owns this for all three call sites, so the behaviour cannot differ between them.
- Requirement 3: A configured command that cannot run is `[FAIL]`, never `[INFO]`. This covers a command not found (exit 127), a command not executable (126), and a worktree that is not a directory. An empty command stays `[INFO] <check>: not configured`, because nothing was asked for.
- Requirement 4: A check whose target is not in the worktree is `[N/A] <check>: <reason>`, does not set `OVERALL_EXIT`, and is not counted as a pass or a failure. Two targets are covered: a configured command carrying `--prefix <dir>` (or beginning `cd <dir> &&`) where `<worktree>/<dir>` does not exist (BUG-087: `cleargate-cli/` is gitignored in the meta-repo, so it is in no worktree), and the `arch.new_deps_check` step when the worktree has no `package.json`. A new helper `resolve_check_target <worktree> <cmd>` prints the directory the command needs, or nothing.
- Requirement 5: `record_result` accepts the status `N/A`. `print_summary` leaves its three counts alone, and the CR-120 `flagged_checks` extraction (line 380, `^\[(FAIL|WARN)\]`) ignores `N/A`, so the jsonl line and the exit code are unchanged by an `N/A`.
- Requirement 6: No scan result authors a lifecycle transition without a story id. The fast-lane branch that calls `update_state.mjs ... "Architect Passed"` (line 411) also requires `STORY_ID` non-empty explicitly. Now that `OVERALL_EXIT` can be 0 in a worktree, this guard must not depend on the lane lookup that happens to precede it (BUG-087 "Ship with").
- Requirement 7: `init_gate_config.sh` (the fallback seeder, lines 24, 27, 30) seeds empty strings for `typecheck` and `test`, matching the shipped `gate-checks.json`. With Requirement 1 in place the seeded `npm run typecheck` would turn into a permanent FAIL in every non-npm repository that falls through to the seeder. `cleargate init` already writes the stack's real commands through `applyTestStack` (`src/commands/init.ts:428`), so the seeder is only reached when the file is missing.
- Requirement 8: Stack-neutral. No new line reads `package.json` to decide whether to run a configured command.
- Requirement 9 (Gate 2 spec clarification (SPRINT-46 SDR, owner approved 2026-11-15), decision 3): `CLEARGATE_SCAN_NO_LANE_ROUTING=1` in the environment skips the lane-aware routing block after the scan (`pre_gate_runner.sh` "Lane-aware post-scan routing (STORY-022-04)", lines 399-440): no `update_state.mjs` call (neither "Architect Passed" nor `--lane-demote`), no `append_ld_event` line in the sprint markdown, and the scan exits with `OVERALL_EXIT`. The CR-120 `pre-gate.jsonl` line is still written. Unset, or any value other than `1`, leaves the routing exactly as today. STORY-066-08's `merge_story.mjs` sets it, so the merge script is the only writer of demotion and state on the merge path.

### 1.3 Out of Scope
- Stack-specific defaults for `debug_patterns` and the TODO grep (JS-only file globs, field finding W-D1 tail). `init` seeding Go patterns is a separate item.
- A `--out` or `--report-dir` flag so the report never lands in the worktree (W010-6, W010-1). `seal_red.mjs` (STORY-066-07) and `merge_story.mjs` (STORY-066-08) move the report themselves.
- Judging failures against the sprint baseline (STORY-066-04 writes it; STORY-066-08 and -09 read it). This story reports what the command did.
- `new_deps_check` for Go (`go.mod`), Python or Rust manifests.
- The lane-aware routing after the scan (lines 399-440). Unchanged, except for the opt-out switch in Requirement 9.

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** BUG-087 proposes also requiring the named `npm run <script>` key to exist. Do we?
- **Recommended:** No. With Requirement 3 a missing script is `exit code 1` plus npm's "Missing script" line in the 40-line tail, which is the honest answer and needs no npm-specific parsing. The `--prefix` directory test covers the case BUG-087 reproduces.
- **Human decision:** Accept the recommendation (default; EPIC-066 decision of record is stack neutrality).

- **Question:** BUG-087 says `qa` mode is never used by the loop. EPIC-066 makes `merge_story.mjs` run `pre_gate_runner.sh qa`. Does that change what this story fixes?
- **Recommended:** The code agrees with the Epic: `run_qa` is where the test command lives, so both modes get the same helper. Confirmed against `pre_gate_runner.sh:78-198`.
- **Human decision:** Accept the recommendation.

### 1.5 Risks

> Risks specific to this Story (cross-story risks belong in the milestone plan).

- **Risk:** A repository whose configured `qa.test` is slow now pays for it on every scan, where it used to be skipped or run only in npm repos. A scan with no timeout can hang a wave.
- **Mitigation:** The scan keeps the host's own command semantics and adds no timeout of its own; the caller (`merge_story.mjs`, `seal_red.mjs`) owns the wall-clock budget. State this in the script header.
- **Risk:** `eval` of a configured string with `--prefix` parsing by shell text is brittle (quoted paths, `$VAR`).
- **Mitigation:** `resolve_check_target` handles only the two literal forms in Requirement 4 and prints nothing otherwise, so an unrecognised form runs the command rather than guessing it away. A wrong guess therefore costs a visible FAIL, never a silent pass.
- **Risk:** Repositories that relied on the silent skip (an `npm run typecheck` that never existed) now fail the scan after upgrade.
- **Mitigation:** The shipped defaults are empty strings and `init` writes real commands; the CHANGELOG entry for the release names the change. A Developer sees the failing line and the 40-line tail, which is the point.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Scenario 1: a stack with no `package.json` runs the configured command. |
| Interfaces | T | Scenarios 4 and 5: `arch` mode runs the same helper as `qa` mode, and the seeder is reached from it. |
| Data | T | Scenario 4: a target directory present or absent in the worktree. |
| Rules | T | Scenarios 3 and 4: a configured command never silently skipped; a missing target is `N/A`, never a FAIL. |

```gherkin
Feature: Pre-gate scan runs configured commands on any stack

  @paths
  Scenario: The configured test runs in a repository with no package.json
    Given a git worktree containing go.mod and no package.json
    And gate-checks.json sets qa.test to "sh ./check.sh" and check.sh exits 0
    When pre_gate_runner.sh qa runs against the worktree
    Then the report contains "[PASS] test: sh ./check.sh"
    And the scan exits 0

  @rules
  Scenario: A failing configured command keeps its last 40 lines
    Given the same worktree and check.sh prints 60 lines then exits 1
    When pre_gate_runner.sh qa runs
    Then the report contains "[FAIL] test: exit code 1"
    And the report holds the last 40 printed lines, each prefixed "  | ", and not the first 20
    And the scan exits 1

  @rules
  Scenario: A configured command that cannot run is FAIL, not INFO
    Given gate-checks.json sets qa.typecheck to "no-such-binary-xyz ./..."
    When pre_gate_runner.sh qa runs
    Then the report contains "[FAIL] typecheck:" with the shell's "not found" line in the tail
    And the report contains no "[INFO] typecheck"
    And the scan exits 1

  @data
  Scenario: A target that is not in the worktree is N/A and leaves the exit code alone
    Given gate-checks.json sets arch.typecheck to "npm --prefix cleargate-cli run typecheck"
    And the worktree has a root package.json and no cleargate-cli directory
    When pre_gate_runner.sh arch runs
    Then the report contains "[N/A] typecheck: target cleargate-cli is not in the worktree"
    And the scan exits 0
    And no state transition is written for a branch that names no story
    And the pre-gate.jsonl line for the scan lists no flagged check

  @interfaces
  Scenario: Arch mode on a Go repository with no gate-checks.json yet is not failed by the seeder
    Given a worktree with no package.json and no gate-checks.json beside the scripts
    When pre_gate_runner.sh arch runs and init_gate_config.sh seeds the file
    Then the seeded typecheck is empty and the report contains "[INFO] typecheck: not configured"
    And the report contains "[N/A] new_deps: no package.json in the worktree"
    And the scan exits 0
```

### 2.2 Verification Steps (Manual)
- [ ] In a real Go repository with a `Makefile` `check` target, set `qa.test` to `make check` in `.cleargate/scripts/gate-checks.json` and run `bash .cleargate/scripts/pre_gate_runner.sh qa . HEAD`; the report shows the command ran.
- [ ] In a git worktree of this meta-repository, run the scan in `arch` mode with the live `gate-checks.json`; the `cleargate-cli` typecheck shows `[N/A]` and the exit code is 0 (BUG-087 reproduction, section 2).
- [ ] `grep -c 'package.json' cleargate-cli/scaffold/core/.cleargate/scripts/pre_gate_runner.sh` shows only the `new_deps` block.

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/core/.cleargate/scripts/pre_gate_runner.sh` |
| Related Files | `cleargate-cli/scaffold/core/.cleargate/scripts/pre_gate_common.sh`, `cleargate-cli/scaffold/core/.cleargate/scripts/init_gate_config.sh` |
| New Files Needed | Yes — `cleargate-cli/test/pre-gate-any-stack.integration.node.test.ts` |

### 3.2 Technical Logic
In `pre_gate_common.sh`:
1. `record_result` (line 48): document `N/A` beside `PASS | FAIL | WARN | INFO`. No other change; the line format `[STATUS] name: details` is what `print_summary` and the CR-120 extractor already match on.
2. `resolve_check_target <worktree> <cmd>`: print the directory named by `--prefix <dir>` or a leading `cd <dir> &&`, else print nothing. Exact literals only.
3. `run_configured_check <report> <name> <cmd> <worktree>`: return codes 0 pass, 1 fail, 3 N/A. Order: empty command gives `[INFO] <name>: not configured`; `resolve_check_target` names a directory that does not exist under the worktree gives `[N/A] <name>: target <dir> is not in the worktree`; worktree not a directory gives FAIL; otherwise run `( cd "$worktree" && eval "$cmd" ) 2>&1` into a variable, capture the exit, and on non-zero write `[FAIL] <name>: exit code N` then `tail -n 40` of the output prefixed `  | `. Capture the exit independently (`|| rc=$?`) per the existing flashcard on `set -e` exit capture.

In `pre_gate_runner.sh`: replace the three guarded blocks (lines 79-95, 184-199, 205-220) with calls to the helper, setting `OVERALL_EXIT=1` on return 1 only. The `new_deps` block (line 224) keeps its `package.json` condition and its `else` branch becomes `[N/A] new_deps: no package.json in the worktree` when `arch.new_deps_check` is true. In the fast-lane branch (line 409), the existing `[[ -n "${STATE_JSON}" ]]` test becomes `[[ -n "${STORY_ID}" && -n "${STATE_JSON}" ]]`. Header comment: the scan has no timeout; callers own the budget.

In `init_gate_config.sh`: `typecheck` and `test` become `""` in both blocks.

Requirement 9: immediately before the `LANE="standard"` line, `if [[ "${CLEARGATE_SCAN_NO_LANE_ROUTING:-}" = "1" ]]; then exit "${OVERALL_EXIT}"; fi`. It sits after the CR-120 jsonl block, so the scan record is kept.

Tests build a real git repository in a temp directory, copy the three scripts and a `gate-checks.json` into `<tmp>/.cleargate/scripts/` (the runner reads its config from its own directory), add a worktree, and spawn `bash pre_gate_runner.sh`. No mocks. The Go fixture is `go.mod`, `main.go` and a shell script standing in for the toolchain, so the test needs no Go install and no network.

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `pre_gate_runner.sh qa\|arch <worktree> <branch>` | CLI | None | unchanged | exit 0 / 1 / 2 unchanged; report lines gain `[N/A]` and `  | ` tail lines |

## Task Breakdown

- [ ] Add `N/A` to the `record_result` header comment and confirm `print_summary` and the CR-120 extractor ignore it -> Requirement 5
- [ ] Add `resolve_check_target` and `run_configured_check` to `pre_gate_common.sh` -> Requirements 2, 3, 4
- [ ] Replace the three package.json-guarded blocks in `run_qa` and `run_arch` with the helper -> Requirement 1
- [ ] Make `new_deps` report `[N/A]` when there is no `package.json` -> Requirement 4
- [ ] Require `STORY_ID` in the fast-lane transition branch -> Requirement 6
- [ ] Seed empty `typecheck` and `test` in `init_gate_config.sh` -> Requirement 7
- [ ] Add the `CLEARGATE_SCAN_NO_LANE_ROUTING=1` early exit before the lane routing, with one integration case: a fast-lane story in a fixture `state.json` whose scan fails keeps lane `fast` and the sprint markdown gains no LD line when the switch is set -> Requirement 9
- [ ] Write the integration tests on an npm fixture and a Go fixture, including the 60-line tail and the `--prefix` case -> scenarios 1-5

## 4. Quality Gates

### 4.1 Minimum Test Expectations

> Covers EPIC-066 Testing Strategy levels Unit (helper) and Integration (real fixture repositories, npm and Go); it is the prerequisite for the "Small fix" journey's pre-merge check.

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 3 | `resolve_check_target`: `--prefix` form, `cd <dir> &&` form, no directory. Sourced and called from node:test through `bash -c`. |
| Integration tests | 6 | One per Gherkin scenario, in `cleargate-cli/test/pre-gate-any-stack.integration.node.test.ts`, real git repo and worktree, Go fixture with no `package.json`, plus one npm fixture proving no regression for `npm test`, plus one for the Requirement 9 switch (no state write, no LD line, `pre-gate.jsonl` line still written). |
| E2E / acceptance tests | 0 | Covered by the integration tests; the real-host proof is the dispenser_adapter pilot sprint in the Epic. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] `grep` of `pre_gate_runner.sh` shows `package.json` only in the `new_deps` block.
- [ ] BUG-087 reproduction (section 2 of that bug) passes: worktree scan exit 0 with `[N/A]`.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/pre_gate_runner.sh:82` — qa typecheck guarded by `package.json`; `:93` the INFO skip.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/pre_gate_runner.sh:187-197` — qa test guarded and sent to `/dev/null`, records only `exit code N`.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/pre_gate_runner.sh:208-218` — arch typecheck, same guard, output discarded.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/pre_gate_runner.sh:224-247` — `new_deps`, npm-only by nature.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/pre_gate_runner.sh:378-384` and `:409-412` — the CR-120 jsonl extractor and the fast-lane "Architect Passed" write that this change makes reachable.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/pre_gate_common.sh:48-54` `record_result`, `:60-67` `print_summary`, `:94-105` `detect_stack` (npm-only; left unused).
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/init_gate_config.sh:24-30` — seeds `npm run typecheck` and `npm test`.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/gate-checks.json` — ships empty `typecheck` and `test`; `cleargate-cli/src/commands/init.ts:428` (`applyTestStack`) writes the real commands.
- **Coverage of this requirement:** partial, about 40%. The configured commands and the report exist; the stack-neutral run, the output tail, `N/A` and the skipped-is-FAIL rule are new.

## Prior work

- [[EPIC-066]] — parent; this story is its first in-scope prerequisite.
- [[BUG-087]] (Draft) — the typecheck false-FAIL in a worktree; absorbed here, with the `STORY_ID` guard it asked to ship with the fix. Its `init_gate_config.sh` task is Requirement 7.
- [[EPIC-065]] (Draft) — held this fix before the owner moved it into EPIC-066 on 2026-11-14.
- [[STORY-022-04]] (Completed) — the lane-aware routing after the scan (fast lane skips QA, demotes on failure); unchanged and the reason Requirement 6 matters.
- [[CR-081]] (Completed) — `qa_red_lint`, the arch-mode check that stays as it is.
- [[CR-120]] (Completed) — the `pre-gate.jsonl` line whose extractor must ignore `N/A`.
- [[EPIC-057]] (Completed) — multi-repo story execution; the same single-repo-worktree assumption BUG-087 names.
- No prior work found for: a tail of failing command output in the scan report, an `N/A` status.

## Why not simpler?

- **Smallest existing surface that could carry this:** the existing guarded blocks in `pre_gate_runner.sh:79-95` and `:184-220`, with the `-f package.json` test deleted.
- **Why isn't extension / parameterization / config sufficient?** Deleting the guard alone would fix the Go case and break two others: the meta-repo worktree would FAIL on a `--prefix` directory that is in no worktree (BUG-087), and an unrunnable command would still be recorded however each of three copies of the block chooses. The report would also still hold no output for a reader to act on. One helper with the `N/A` and FAIL rules is the smallest change that makes the three call sites agree and gives the fast lane a trustworthy gate.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered (no "TBD" / no "{}").
