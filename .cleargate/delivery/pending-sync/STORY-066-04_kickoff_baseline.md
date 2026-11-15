---
story_id: STORY-066-04
parent_epic_ref: EPIC-066
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_by: "sandrinio"
approved_at: "2026-11-15T09:00:00Z"
ambiguity: 🟢 Low
context_source: EPIC-066 (approved 2026-11-14) In-scope prerequisite 2; field finding W010-3 (and the owner cross-session intervention) in .cleargate/field-trials/2026-11-dispenser-sprint45-rc.md; FLASHCARD 2026-11-14 baseline lines; sprint.ts, init_sprint.mjs and prep_qa_context.mjs read 2026-11-14
actor: Orchestrator starting a sprint; QA-Verify reading the pack
complexity_label: L2
area: sprint-execution,cli,scripts
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-11-14T19:47:47.572Z
updated_at: 2026-11-14T19:47:47.572Z
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
  last_gate_check: 2026-11-14T19:55:36Z
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

# STORY-066-04: Kickoff baseline
**Complexity:** L2 — one new script, one hook-in at `sprint init`, one pack section; real-repo tests, no mocks.

## 1. The Spec (The Contract)

### 1.1 User Story
As the orchestrator starting a sprint, I want the sprint base tested once at kickoff and its failing set written down, so that QA-Verify and the merge script can tell an old failure from one an item caused, instead of every Developer and QA rediscovering it mid-sprint.

### 1.2 Detailed Requirements
- Requirement 1: `cleargate sprint init <sprint-id>` records the baseline as its last step before the dashboard, after `init_sprint.mjs` exits 0 (`src/commands/sprint.ts:512`). That is the earliest point where both the sprint directory (`.cleargate/sprint-runs/<id>/`) and the sprint branch exist: `sprint preflight` runs before the branch is cut (SKILL.md A.1 then A.2) and before `init_sprint.mjs` creates the directory (`init_sprint.mjs:272`), and it is a read-only gate. The handler shells out to a new `record_baseline.mjs <sprint-id>` through `run_script.sh`, as it does for `init_sprint.mjs` (`sprint.ts:499`).
- Requirement 2: The command is `qa.baseline_command` from `.cleargate/scripts/gate-checks.json` when set, else `qa.test`. If both are empty the script writes no file and prints one line saying the baseline was skipped.
- Requirement 3: The command runs in the project root checkout (the sprint branch, cut from `main` with no commits yet, so `HEAD` is the sprint base), never in a worktree under a temporary directory. FLASHCARD 2026-11-14 `#qa #worktree`: a baseline worktree for path-dependent integration tests under `/private/tmp` gave 306 false failures.
- Requirement 4: Output is `<sprintDir>/baseline.json` = `{ sprint_id, base_sha, command, exit_code, failing: [<test identifiers>], tail: [last 40 lines], recorded_at }`, written atomically (tmp then rename). `base_sha` is `git rev-parse HEAD` in the project root. `failing` is empty when `exit_code` is 0. `record_baseline.mjs` exports `extractFailing(output)` so STORY-066-08 and STORY-066-09 compare branch failures to the baseline with the same parser; an identifier present in `baseline.failing` is a known failure.
- Requirement 5: `extractFailing` returns the sorted, de-duplicated identifiers from: node:test TAP `not ok N - <name>` lines, node:test spec `✖ <name>` lines, `test at <file>:<line>:<col>` lines under a failing run (these include `:1:1` file-level load errors, which a name-only parse misses; FLASHCARD 2026-11-07 `#test-harness #baseline`), and Go `--- FAIL: <Name>` plus `FAIL<TAB><package>` lines. A non-zero exit with no identifiers parsed leaves `failing` empty and the tail as the only evidence.
- Requirement 6: The baseline records only what its command ran. `npm test` skips `*.integration.node.test.ts` (FLASHCARD 2026-11-14 `#qa #test-harness`), so a repository whose integration suites are red on the base gets no entry for them from `qa.test`. The script does not guess a second command; `command` is recorded verbatim, and the QA pack says which command the baseline covers and that failures outside it are unknown. An owner who wants integration covered sets `qa.baseline_command` to a command that runs it.
- Requirement 7: Recording the baseline never changes the exit code of `sprint init`. A command that fails, cannot start, or runs past 20 minutes (recorded as `exit_code: 124`, with a last tail line saying so) still produces a `baseline.json`. `CLEARGATE_NO_BASELINE=1` skips the step, like `CLEARGATE_NO_DASHBOARD`. Running `record_baseline.mjs <sprint-id>` by hand overwrites the file.
- Requirement 8: `prep_qa_context.mjs` `buildBaseline` (`:262`) reads `<sprintDir>/baseline.json` first, then the legacy `.baseline-failures.json`, then reports unavailable. The pack section keeps its v1 keys (`main_head_sha`, `baseline_unavailable`, `failures`, the last as `{file: <identifier>, count: 1}` for a baseline.json source) and adds `source`, `base_sha`, `command`, `exit_code`, `failing`, `tail`, `recorded_at`. The prose (`proseBaseline`, `:623`) names the command and exit code, lists up to 30 failing identifiers with "and N more", and prints the tail when the command failed with no identifiers parsed.

### 1.3 Out of Scope
- Judging a branch's failures against the baseline: `merge_story.mjs` (STORY-066-08) and the QA-Verify mode (STORY-066-09) read `baseline.json` and `extractFailing`; this story writes and surfaces it.
- Running tests at `sprint preflight`, or adding a baseline gate that blocks the sprint when the base is red. The baseline informs; it does not block.
- Running a second command for integration suites, per-test timings, or a baseline per stack.
- Mentioning the baseline in `sprint-context.md` (`init_sprint.mjs` is not in this story).
- Sprint dashboard display.

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** The Epic's contract names `<sprintDir>/baseline.json` written by "kickoff" and its §4 says `src/commands/sprint.ts` runs `qa.test`. Should the run live in `sprint.ts` itself?
- **Recommended:** No. `sprint.ts` calls a script, as it does for `init_sprint.mjs`; the parser must be importable by the two `.mjs` scripts that consume it, and a TypeScript function in the CLI is not. `sprint.ts` stays the owner of when it runs.
- **Human decision:** Accept the recommendation. (This adds `record_baseline.mjs`, which the Epic's Owns column does not list.)

- **Question:** `prep_qa_context.mjs` already has a baseline section reading `.baseline-failures.json`, a file nothing writes. Replace or extend?
- **Recommended:** Extend, as in Requirement 8. `test_prep_qa_context.sh` writes that legacy file and asserts on it, and keeping the fallback leaves it green.
- **Human decision:** Accept the recommendation.

### 1.5 Risks

> Risks specific to this Story (cross-story risks belong in the milestone plan).

- **Risk:** The test suite runs inside `sprint init`, so a slow suite (this repository's `npm test`, dispenser's two-minute `make check`) delays sprint start and the dashboard.
- **Mitigation:** One announce line before the run, the 20-minute cap, and `CLEARGATE_NO_BASELINE=1`. The cost is paid once per sprint and replaces one rediscovery per Developer and QA.
- **Risk:** A baseline that covers only `qa.test` reads as "the base is green" when integration suites are red.
- **Mitigation:** The pack prose states the command it covers and says failures outside it are unknown (Requirement 6); the identifiers are never presented as the complete set.
- **Risk:** Identifier formats vary by runner, so `extractFailing` misses a format and an old failure is charged to an item.
- **Mitigation:** The four formats above are tested against real runner output in fixtures; an unparsed failure leaves the tail in the pack, so a reader still sees it.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Scenarios 1 and 2: the command comes from `qa.test` or from `qa.baseline_command`. |
| Interfaces | T | Scenario 5: the CLI writes `baseline.json`, the QA pack reads it. |
| Data | T | Scenario 1 is an outline over the runner output format (node:test, Go). |
| Rules | T | Scenarios 3 and 4: the baseline never blocks init; nothing configured writes nothing. |

```gherkin
Feature: Kickoff baseline

  @paths @data
  Scenario Outline: A failing sprint base is recorded at kickoff
    Given a sprint branch whose qa.test command prints <output> and exits 1
    When cleargate sprint init runs for the sprint
    Then <sprintDir>/baseline.json exists with exit_code 1 and command equal to the qa.test string
    And its failing list contains "<identifier>"
    And its tail holds the last 40 lines of the output and its base_sha equals git rev-parse HEAD
    And the command ran in the project root, not in a temporary directory

    Examples:
      | output                                          | identifier                  |
      | "not ok 3 - seccheck red workflow"              | seccheck red workflow       |
      | "--- FAIL: TestRedWorkflow (0.01s)"             | TestRedWorkflow             |

  @paths
  Scenario: qa.baseline_command takes precedence over qa.test
    Given gate-checks.json sets qa.test to "true" and qa.baseline_command to "sh ./all-tests.sh"
    When the baseline is recorded
    Then baseline.json records command "sh ./all-tests.sh"

  @rules
  Scenario: A baseline that cannot run does not block the sprint
    Given qa.test names a command that does not exist
    When cleargate sprint init runs
    Then init exits 0 as it would without a baseline
    And baseline.json records a non-zero exit_code, an empty failing list and the shell's error in tail

  @rules
  Scenario: With nothing configured no baseline is written
    Given qa.test and qa.baseline_command are empty
    When cleargate sprint init runs
    Then no baseline.json exists and one line says the baseline was skipped
    And init exits 0

  @interfaces
  Scenario: The QA pack carries the baseline
    Given baseline.json lists "TestRedWorkflow" as failing from command "make check"
    When prep_qa_context.mjs builds the pack for a story in that sprint
    Then the baseline section has source "baseline.json", failing ["TestRedWorkflow"] and command "make check"
    And the prose names the command and says failures outside it are unknown
    And with no baseline.json and no legacy file the section still reports baseline_unavailable true
```

### 2.2 Verification Steps (Manual)
- [ ] In a scratch clone with `qa.test` set to a command that fails one test, run `cleargate sprint init SPRINT-NN --stories ...` and open `.cleargate/sprint-runs/SPRINT-NN/baseline.json`; the failing test is listed and `base_sha` matches `git rev-parse HEAD`.
- [ ] Run `node .cleargate/scripts/prep_qa_context.mjs <story> <worktree>` and read the `## Baseline` section.
- [ ] Run with `CLEARGATE_NO_BASELINE=1`; no file is written and init output is otherwise unchanged.

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/commands/sprint.ts` |
| Related Files | `cleargate-cli/scaffold/core/.cleargate/scripts/prep_qa_context.mjs` |
| New Files Needed | Yes — `cleargate-cli/scaffold/core/.cleargate/scripts/record_baseline.mjs`, `cleargate-cli/test/scripts/record-baseline.node.test.ts`, `cleargate-cli/test/sprint-kickoff-baseline.integration.node.test.ts`, `cleargate-cli/test/scripts/prep-qa-context-baseline.node.test.ts` |

### 3.2 Technical Logic
`record_baseline.mjs <sprint-id>`: resolve the project root and `sprintDir` the way `init_sprint.mjs` does (`:144`); read `.cleargate/scripts/gate-checks.json`; pick `qa.baseline_command` else `qa.test`; if empty, print the skip line and exit 0. Otherwise print `recording baseline: <command>`, run it with `spawnSync('bash', ['-c', command], { cwd: projectRoot, encoding: 'utf8', timeout: 1_200_000, maxBuffer: 64 * 1024 * 1024 })`, join stdout and stderr, take `tail` as the last 40 lines, call `extractFailing`, read `git rev-parse HEAD`, and write the JSON atomically. Spawn error or timeout maps to `exit_code` 124 or 127 with the reason as the last tail line. The script always exits 0 and prints `baseline: <n> failing (exit <code>) -> <path>`. It guards `main()` behind an entry-point check so tests can import `extractFailing` (FLASHCARD 2026-11-12 `#qa-red #clean-room`: a script with no main guard runs on import).

`sprintInitHandler`: after `code === 0` and before the dashboard block (`sprint.ts:514-519`), unless `CLEARGATE_NO_BASELINE` is `1` or `true`, run `bash <run_script.sh> node <record_baseline.mjs> <sprintId>` with `stdio: 'inherit'` through `spawnFn`, in a try/catch whose failure is written to stderr and never reaches `exitFn(code)`. A `baselineFn` seam on `SprintCliOptions` (`sprint.ts:66`) overrides it in tests, as `dashboardFn` does.

`prep_qa_context.mjs`: `buildBaseline` and `proseBaseline` as in Requirement 8. The JSON schema comment at the file head (`:43-47`) gains the new keys.

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `<sprintDir>/baseline.json` | file | None | n/a | `{ sprint_id: string, base_sha: string, command: string, exit_code: number, failing: string[], tail: string[], recorded_at: string }` |
| `record_baseline.mjs` | CLI | None | `<sprint-id>` | exit 0; stdout one status line; exports `extractFailing(output: string): string[]` |

## Task Breakdown

- [x] Write `record_baseline.mjs` with `extractFailing`, the command choice, the atomic write and the main guard -> Requirements 2, 3, 4, 5, 7
- [x] Call it from `sprintInitHandler` after a successful init, with the `CLEARGATE_NO_BASELINE` switch and a `baselineFn` seam -> Requirements 1, 7
- [x] Extend `buildBaseline`, `proseBaseline` and the schema comment in `prep_qa_context.mjs`, keeping the legacy fallback -> Requirement 8
- [x] Write the parser tests from real node:test and Go output samples, including a `:1:1` load error -> scenario 1
- [x] Write the init integration test on a real git repository with `qa.test` failing, missing and empty -> scenarios 1-4
- [x] Write the pack test for the three baseline states -> scenario 5

## 4. Quality Gates

### 4.1 Minimum Test Expectations

> Covers EPIC-066 Testing Strategy levels Unit (parser), Contract (`baseline.json` shape and the pack section) and Integration (a real repository at `sprint init`); it feeds the journeys "Ordinary story" and "Small fix", whose checks read the baseline.

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | `extractFailing`: node:test TAP, node:test spec with a `:1:1` load error, Go, and a non-zero exit with nothing parsable. |
| Integration tests | 3 | `*.integration.node.test.ts`, real git repo and real `run_script.sh`: failing base, missing command with init exit 0, nothing configured. Run separately from `npm test`, which skips them. |
| E2E / acceptance tests | 1 | Scenario 5 through `prep_qa_context.mjs` against a fixture sprint directory (`CLEARGATE_SPRINT_DIR`). |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] `scaffold/core/.cleargate/scripts/test/test_prep_qa_context.sh` still passes (legacy fallback kept).
- [ ] `npm run typecheck` clean for `cleargate-cli`.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/commands/sprint.ts:275-540` — `sprintInitHandler`; `:499` shells out to `init_sprint.mjs` through `run_script.sh`; `:512-534` success path with the best-effort dashboard step whose pattern the baseline step copies.
- **Surface:** `cleargate-cli/src/commands/sprint.ts:66-96` — `SprintCliOptions` test seams (`spawnFn`, `dashboardFn`).
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/init_sprint.mjs:144-145,272` — where the sprint directory is resolved and created; no baseline written.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/prep_qa_context.mjs:262-291` — `buildBaseline` reads `.baseline-failures.json`, which no script writes; `:623-638` `proseBaseline` prints "recompute via `cleargate gate test` on main", a command that does not produce it.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/gate-checks.json` — `qa.test` source; `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:121-170` — Phase A order (preflight, cut branch, init).
- **Coverage of this requirement:** partial, about 25%. The pack section and the sprint-directory pattern exist; nothing runs the base, writes the file or parses failures.

## Prior work

- [[EPIC-066]] — parent; this story is its second in-scope prerequisite.
- [[EPIC-065]] (Draft) — held this slice before the owner moved it into EPIC-066 on 2026-11-14.
- [[STORY-066-03]] — the stack-neutral pre-gate scan; the baseline is judged against what that scan runs, and STORY-066-08 reads both.
- [[CR-045]] (Completed) — `sprint-context.md` written at init; the same directory and moment this step runs.
- [[CR-084]] (Completed) — the best-effort trailing dashboard step whose never-changes-the-exit-code pattern this story follows.
- [[EPIC-031]] (Draft) — scoped tests as QA's default; the baseline is the full-command view that scoped runs are compared with.
- No prior work found for: a recorded sprint-base test result, or a writer for `.baseline-failures.json`.

## Why not simpler?

- **Smallest existing surface that could carry this:** the existing `buildBaseline` section in `prep_qa_context.mjs:262`, fed by hand or by an agent running the command.
- **Why isn't extension / parameterization / config sufficient?** The section already exists and is always "unavailable", because nothing writes its input; an agent running `make check` mid-sprint is the cost the field trial measured (W010-3: a two-minute run, rediscovered per Developer and QA). The write has to happen once, deterministically, at the one moment the base is still the base, and the parser has to be shared with the two scripts that compare against it. That needs a script and one hook-in; the pack change is the smaller half.

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
