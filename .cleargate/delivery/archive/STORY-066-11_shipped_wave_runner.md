---
story_id: STORY-066-11
parent_epic_ref: EPIC-066
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: sprint-execution,scripts
status: "Completed"
approved: true
approved_by: "sandrinio"
approved_at: "2026-11-15T09:00:00Z"
ambiguity: 🟢 Low
context_source: EPIC-066 (approved 2026-11-14, §6 Q1/Q7/Q8 answered) + field findings W009-1, W009-2, W009-5, W010-1, W010-2 (.cleargate/field-trials/2026-11-dispenser-sprint45-rc.md) + STORY-033-01 spike result + dispenser_adapter's SPRINT-04 hand-written runner (read-only)
actor: Orchestrator (conversational agent) running a sprint wave
complexity_label: L3
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-11-14T19:47:49.096Z
updated_at: 2026-11-14T19:47:49.096Z
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
  last_gate_check: 2026-11-14T19:54:10Z
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

# STORY-066-11: Shipped wave runner, loop.models, last retry one tier up
**Complexity:** L3 — one new self-contained Workflow script, one small args builder, one config block; cross-cutting only through `stagesFor` (STORY-066-06) and the scripts STORY-066-07 to 066-10 leave behind.

## 1. The Spec (The Contract)

### 1.1 User Story
As the Orchestrator running a sprint wave, I want a shipped Workflow script that runs the wave exactly as `waves.json` and `stagesFor` describe it, so that I launch it unedited instead of hand-writing a 500-line runner whose own tables override the plan (W009-1, W009-2).

### 1.2 Detailed Requirements
- Requirement 1: `scaffold/core/.cleargate/scripts/wave_runner.js` is one self-contained Workflow script: no `import`, no `require`, no file or shell access. It uses only the Workflow globals (`agent`, `parallel`, `log`, `args`). This is the shape that ran in practice (dispenser_adapter's SPRINT-04 hand-written runner, wave.js: no imports, tables hard-coded, `agent(prompt, { label, phase, agentType, model, schema })`) and what the STORY-033-01 spike allows (a Workflow script dispatches agents; it cannot be assumed to run shell, W010-1).
- Requirement 2: everything the script needs arrives in `args`, built by a new helper `scaffold/core/.cleargate/scripts/wave_runner_args.mjs` (`node wave_runner_args.mjs --sprint <SPRINT-ID> --wave <wave-id>`), which prints one JSON object: the wave's items with `lane`, `base`, `upstream` (from `waves.json`, using `storyBases` and the plan's `stories[*].upstream` as `launch_wave.mjs:128-166` exposes them), `stages` (`stagesFor(lane)` for each lane present, never restated in the runner), `models` (resolved per stage per lane, requirement 5), `bounceCap` (`BOUNCE_CAP`), `merged` (ids already merged), and `worktreeCommands` (`worktreeAddCommand`). The script contains no stage list, no lane table, no DAG and no cap: it adds no scheduling policy (EPIC-066 §2; EPIC-055 is paused).
- Requirement 3: per item the script walks `args.stages[lane]` in order. An `agent` stage whose `when` is `always`, or is `scan-flagged` and the sealed-red scan flagged, dispatches one agent. A `barrier-script` stage is not run: the walk stops before it and the verdict returns, so the orchestrator runs `merge_story.mjs` at the barrier. Dispatch description is `<stage> <ID>` (CR-120 form, e.g. `qa-red STORY-066-07`), with ` pass <N>` appended on a re-dispatch of the same stage (the form `sprint_metrics.mjs:148` already reads). `phase` is `Plan` for `story-plan`, `QA-Red` for `qa-red`, `Wiring` for `architect-tpv`, `Build` for `developer`, `Verify` for `qa-verify`, `Post-flight` for `architect-review`, the names in `sprint_metrics.mjs:50-53`.
- Requirement 4: no agent is dispatched for a fixed command sequence. Worktrees are created by the orchestrator from `args.worktreeCommands` before launch (W009-5). The commit and the wiring scan are the QA-Red agent's last step (`seal_red.mjs`, STORY-066-07), and its structured output carries the scan result the script routes on. The merge is `merge_story.mjs` (STORY-066-08) at the barrier. The orchestrator sets `SKIP_FLASHCARD_GATE=1` in its own env before launch (spike decision 3); the script cannot set env.
- Requirement 5: `config.example.yml` gains a commented `loop:` block: `loop.models.<stage>` (stage name to model) and `loop.models_by_lane.<lane>.<stage>`, model values `haiku | sonnet | opus`; shipped default `models_by_lane.runtime.qa-verify: opus`. Keys are the exact stage names from `stagesFor` (`story-plan`, `qa-red`, `architect-tpv`, `developer`, `qa-verify`, `architect-review`). Resolution order in `wave_runner_args.mjs`: `models_by_lane.<lane>.<stage>`, then `models.<stage>`, then no `model` (the agent file's own frontmatter model applies). The reader is a dependency-free line scan of `.cleargate/config.yml` (precedent: `close_sprint.mjs:118-128`, `readVcsSprintPr`), with the shipped default applied when the key is absent.
- Requirement 6: the last Developer retry before `BOUNCE_CAP` runs one tier up: haiku to sonnet, sonnet to opus, opus stays. "Last retry" is the Developer dispatch whose cycle number equals `args.bounceCap` (cycle 1 is the first; `BOUNCE_CAP = 3`, `constants.mjs:33`), and only when `bounceCap > 1`. The base is the resolved Developer model, else `sonnet` (the `developer.md` frontmatter model).
- Requirement 7: rework routing inside the segment follows the QA-Verify verdict's `DEFECT_IN` (STORY-066-09): `code` re-dispatches the Developer, `red-test` re-dispatches QA-Red then the Developer, `spec` returns a `BLOCKED` verdict with `blocker.type: 'spec-contradiction'` and no further dispatch. `FAIL` with no `DEFECT_IN` is treated as `code`. Bounces at `bounceCap` return `ESCALATED`.
- Requirement 8: an item whose `upstream` ids are not all in `args.merged` is not started; it is listed in the return value's `waiting` array with the ids it needs. Each started item returns a verdict in the envelope `launch_wave.mjs` defines (`verdict`, `storyId`, `runId`, `devSha`, `qaSha`, `flashcards_flagged`, `counters`, `tokens`, `blocker?`) plus `lane` and `stages_run` (the agent stages that ran, in order; `merge` is not in it because it runs at the barrier). The script returns `{ verdicts, waiting }`.

### 1.3 Out of Scope
- Scheduling: ready-set scheduler, concurrent-segment cap, merge queue (EPIC-055). The wave runs the plan it is given, all started items in one `parallel()`.
- Writing the rework event or `--defect-in` (STORY-066-10); the runner only routes on `DEFECT_IN`. Merge, demotion and conflict handling (STORY-066-08, run by the orchestrator).
- The verdict's `lane`/`stages_run` validation (STORY-066-06 owns `validateVerdicts`) and any edit to `launch_wave.mjs` or `dispatch_serial.mjs`.
- `SKILL.md` and `dispatch-serial.md` (STORY-066-12 documents how the orchestrator launches the runner). The serial host path: `dispatch_serial.mjs` already reads `stagesFor` (066-06) and needs no runner.
- A `prove` stage (EPIC-065); the runner inserts none, and picks one up from `stagesFor` unchanged.

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** The epic's Data Changes lists `loop.models.{developer, qa_red, qa_verify, architect}`; the build contract keys models by stage name (`qa-red`, `qa-verify`, ...) and adds `models_by_lane`. Which spelling?
- **Recommended:** The contract's stage names, hyphenated, because `stagesFor` is the one source of stage names and the runner looks models up by `stage.name`. The epic's underscore list is superseded.
- **Human decision:** Resolved in drafting (the contract overrides the epic's illustrative list); confirmed by the owner with the SPRINT-46 Brief, 2026-11-15.
- **Question:** `validateVerdicts` in wave mode (`launch_wave.mjs:216-228`) requires numeric `tokens.*`; the script cannot read agent usage, and a zero object would be invented data. What does it return?
- **Recommended:** `tokens: { metering: 'unavailable' }` (the honest form serial mode already accepts, `launch_wave.mjs:216-222`), and the orchestrator validates the barrier array with `validateVerdicts(verdicts, { mode: 'serial' })`. Cost comes from the host's subagent transcripts (SPRINT-45 measurement), not from the verdict. No change to `launch_wave.mjs` in this story.
- **Human decision:** Resolved in drafting per the recommendation; confirmed by the owner with the SPRINT-46 Brief, 2026-11-15.
- **Question:** A Workflow script may not be able to `import`; `wave_runner.js` also needs `stagesFor`. Is the args builder the right seam?
- **Recommended:** Yes. The proven runner has no imports, and the builder is plain Node reading real files, so it is testable without the Workflow runtime. The builder is one file beyond the epic's target list (`wave_runner_args.mjs`); it lives in this story's file surface.
- **Human decision:** Resolved in drafting per the recommendation; confirmed by the owner with the SPRINT-46 Brief, 2026-11-15.

### 1.5 Risks

> Risks specific to this Story (cross-story risks belong in the milestone plan).

- **Risk:** the Workflow runtime's real globals differ from the dispenser runner's (`args` shape, `agent()` option names, schema support), so the stub-agent dry run passes and a live run fails.
- **Mitigation:** the dry run injects stubs with exactly the dispenser runner's call shape (`agent(prompt, { label, phase, agentType, model, schema })`); the first live use is the dispenser pilot sprint (EPIC-066 Release gate), judged by the owner. A test also asserts the script contains no `import`/`require`.
- **Risk:** the runner drifts into scheduling policy (lane caps, start-after, skips), recreating W009-2.
- **Mitigation:** a test greps the script for any lane or stage literal list and for `max_parallel`; every behaviour is derived from `args`. Requirement 8 is the only gating it does.
- **Risk:** this story depends on 066-06 to 066-10 (stage table, `seal_red.mjs`, `merge_story.mjs`, `DEFECT_IN`), so QA-Verify defect text and the scan-result field names must match what those stories ship.
- **Mitigation:** `parallel_eligible: "n"`; the script reads the scan result and `DEFECT_IN` through two small named adapters at the top of the file, and the contract tests pin them to the shared contract names (`flags`, `scan_exit`, `DEFECT_IN: code | red-test | spec`).

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Standard lane clean path, and the red-test / code rework paths. |
| Interfaces | F | One surface: the Workflow script. The args builder is a helper that feeds it, not a second way to run a wave. |
| Data | T | The stage list differs by lane (fast, standard, runtime) and the model by stage and lane. |
| Rules | T | Model resolution order, the last-retry tier rule, and the spec-defect halt. |

```gherkin
Feature: Shipped wave runner

  @paths
  Scenario: A wave runs unedited and each item runs the stages its lane names
    Given a waves.json with a wave of STORY-A on the standard lane, STORY-B on the fast lane and STORY-C whose upstream STORY-Z is not merged
    And wave_runner_args.mjs printed args from waves.json and stagesFor
    When wave_runner.js runs with stub agents
    Then STORY-A dispatches qa-red, developer and qa-verify in that order, with descriptions "QA-Red STORY-A", "Developer STORY-A" and "QA-Verify STORY-A" (CR-120's display form of each stage name)
    And STORY-B dispatches developer only
    And STORY-C is not started and is listed in waiting with STORY-Z
    And each verdict carries the lane and a stages_run listing the stages that ran, with no merge stage

  @data
  Scenario Outline: The first stage and the stage list follow the lane
    Given an item on the <lane> lane
    When wave_runner.js runs it with stub agents that always pass
    Then the dispatched stages are <stages>

    Examples:
      | lane     | stages                                                                      |
      | fast     | developer                                                                   |
      | standard | qa-red, developer, qa-verify                                                |
      | runtime  | story-plan, qa-red, developer, qa-verify, architect-review                  |

  @rules
  Scenario: The shipped default checks runtime items on a different model
    Given a config.yml with no loop block
    When wave_runner_args.mjs builds args for a runtime item and a standard item
    Then the runtime item's qa-verify model is "opus"
    And the standard item's qa-verify model is unset
    And the runtime item's developer model is unset

  @rules
  Scenario Outline: The last Developer retry before the bounce cap runs one tier up
    Given the developer model resolves to <base> and the bounce cap is 3
    When QA-Verify fails twice and the Developer is dispatched for cycle 3
    Then cycle 1 and cycle 2 run on <base>
    And cycle 3 runs on <last>

    Examples:
      | base   | last   |
      | haiku  | sonnet |
      | sonnet | opus   |
      | opus   | opus   |

  @rules
  Scenario: A spec defect stops the segment for the owner
    Given STORY-D is on the standard lane
    When its qa-verify agent returns FAIL with "DEFECT_IN: spec"
    Then the verdict is BLOCKED with blocker.type "spec-contradiction"
    And no further agent is dispatched for STORY-D
```

### 2.2 Verification Steps (Manual)
- [ ] Run `node .cleargate/scripts/wave_runner_args.mjs --sprint <SPRINT-ID> --wave <wave-id>` on a real sprint directory and confirm the printed `stages` equal `stagesFor(<lane>)` for each item and the plan's `lane_assignments`.
- [ ] Launch `wave_runner.js` through the Workflow tool in the dispenser_adapter pilot sprint without editing it; confirm no runner file appears in the sprint directory and `sprint_metrics.mjs` shows dispatch counts by lane matching the stage table.

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/core/.cleargate/scripts/wave_runner.js` |
| Related Files | `cleargate-cli/scaffold/core/.cleargate/scripts/wave_runner_args.mjs`, `cleargate-cli/scaffold/core/.cleargate/config.example.yml`, `cleargate-cli/test/scripts/wave-runner.node.test.ts`, `cleargate-cli/test/integration/wave-runner.integration.node.test.ts` |
| New Files Needed | Yes — `wave_runner.js`, `wave_runner_args.mjs`, and the two test files |

### 3.2 Technical Logic
1. **Args builder (`wave_runner_args.mjs`).** Read `<sprintDir>/plans/waves.json` (path as `init_sprint.mjs` reads it), pick the named wave, and for each item take `lane` from `lane_assignments` (unknown or absent lane means `standard`, EPIC-066 Compatibility row), `base` from `storyBases(plan)` or the sprint branch, `upstream` from `plan.stories[id].upstream`. `merged` comes from `state.json` (items in `Done`). Import `stagesFor`/`STAGE_NAMES` from `./segment_stages.mjs`, `BOUNCE_CAP` from `./constants.mjs`, `worktreeAddCommand`/`storyBases` from `./launch_wave.mjs`. Models: line-scan `.cleargate/config.yml` for a `loop:` block (`models:` and `models_by_lane:` sub-blocks, two-space nesting), apply the shipped default `runtime.qa-verify: opus` when the key is absent, resolve per item per stage. Print JSON; exit 2 on a usage error or an unknown wave. Add `--validate <verdicts.json>` which runs `validateVerdicts(verdicts, { mode: 'serial' })` and exits 1 naming the offending story (Open Question 2).
2. **Runner (`wave_runner.js`).** Top-of-file `meta`, then `const A = args`. A `segment(item)` async function walks `A.stages[item.lane]`. State per segment: `cycle` (Developer dispatch count), `qaBounces`, `stagesRun[]`, `devSha`, `qaSha`. For each stage: skip when `kind === 'barrier-script'` (stop the walk); skip `when: 'scan-flagged'` unless the last sealed-red result has non-empty `flags` or `scan_exit === 1`; otherwise `await agent(prompt, { label: \`${stage.name} ${id}\` (+ \` pass ${n}\` when n>1), phase, agentType: stage.agent, model, schema })`. The prompt names the item file, worktree `.worktrees/<ID>`, branch, the `Mode:` from the stage (`stage.mode`), and for `qa-red` the instruction to end with `seal_red.mjs`. No approval claim in the prompt (W009-7). Developer model for a dispatch = `tierUp(base)` when `cycle === A.bounceCap && A.bounceCap > 1`, else `base`. Routing after `qa-verify`: PASS ends the walk, FAIL routes by `DEFECT_IN` (Requirement 7) with `qaBounces++` and `ESCALATED` at `A.bounceCap`.
3. **Barrier return.** `parallel(items.filter(ready).map((it) => () => segment(it)))`, where `ready` is every `upstream` id in `A.merged`. Return `{ verdicts, waiting }`. `runId` is passed in `A.runIds[id]` by the builder (stable per item, `mintRunId`) so the script needs no crypto.
4. **Config.** `config.example.yml` gets a commented `# loop:` block after `worktree:`, in the file's existing comment style, documenting `models`, `models_by_lane`, the stage names and the shipped default.

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `wave_runner_args.mjs --sprint <ID> --wave <id>` (stdout) | CLI | None | waves.json, state.json, config.yml | `{ sprintId, sprintBranch, bounceCap, merged: string[], worktreeCommands: string[], items: [{ id, lane, base, upstream: string[], stages: Stage[], models: { [stage]: string \| null }, runId }] }` |
| `wave_runner.js` (Workflow return) | Workflow | None | `args` = the object above | `{ verdicts: Verdict[], waiting: [{ storyId, needs: string[] }] }` where `Verdict` adds `lane` and `stages_run` to the `launch_wave.mjs` envelope |

## Task Breakdown

- [x] Confirm `segment_stages.mjs` (066-06) exports `stagesFor`/`STAGE_NAMES` and that `seal_red.mjs` (066-07) and the QA-Verify output (066-09) use the contract field names; write the two adapters at the top of the runner against them -> Requirement 3
- [x] Add `loop` block to `config.example.yml` (models, models_by_lane, shipped `runtime.qa-verify: opus`) -> Requirement 5
- [x] Write `wave_runner_args.mjs`: waves.json + state.json + `stagesFor` + config line-scan, with `--validate` -> Requirements 2, 5
- [x] Write the model resolver and `tierUp` in the args builder and runner; unit tests for resolution order and the haiku/sonnet/opus table -> Requirements 5, 6
- [x] Write `wave_runner.js`: segment walk over `args.stages`, barrier-script stop, scan-flagged gate, description form, phase map -> Requirements 1, 3, 4
- [x] Add rework routing on `DEFECT_IN`, the bounce cap and the spec-defect halt -> Requirement 7
- [x] Add upstream gating, the `waiting` list, and the verdict envelope with `lane`, `stages_run`, `tokens: { metering: 'unavailable' }` -> Requirement 8
- [x] Write unit and contract tests (stub `agent`/`parallel`/`log`/`args` through `node:vm`; no-import and no-literal-stage-list assertions) -> Scenarios 1-5
- [x] Write the integration test: build args from a three-wave fixture plan with computed lanes, run the runner with stub agents, assert the dispatch sequence per lane and the verdict fields -> Scenarios 1, 2
- [x] Run `npm run typecheck` and the affected tests in `cleargate-cli`; confirm the new scripts appear in the composed payload (`npm run prebuild`) and `cleargate verify-install` lists them

## 4. Quality Gates

### 4.1 Minimum Test Expectations

> Epic Testing Strategy levels covered: Unit, Contract, Integration (stub-agent dry run over a three-wave fixture, the Release-gate item). Journey: "Launch without authoring" (kickoff launches `wave_runner.js` with the wave id); the real-host level is the dispenser pilot.

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 6 | Model resolution order; shipped default; `tierUp` table (3 rows); last-retry cycle rule with `bounceCap` 1 and 3; config line-scan with and without a `loop:` block; unknown lane falls back to `standard`. |
| Integration tests | 2 | `*.integration.node.test.ts`: three-wave fixture with stub agents (stage order per lane, `waiting`, verdict `lane`/`stages_run`); `wave_runner_args.mjs` on a fixture sprint directory including a Go-style repo with no `package.json`. Real git fixture, no mocks of the scripts. |
| E2E / acceptance tests | 5 | One per Gherkin scenario in §2.1 (the outlines count once each), driving the script through `node:vm` with the dispenser call shape. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] `wave_runner.js` contains no `import`/`require` and no stage or lane list; both asserted by a test.
- [ ] Docs-match-code: STORY-066-12's wording of the launch command matches `wave_runner_args.mjs` flags (checked there).
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/launch_wave.mjs:332` — `launchWave({..., segmentRunner})` takes the segment body as a seam; nothing in the scaffold supplies one. The runner is that body. `launch_wave.mjs:128-166` `storyBases` / `integrationReady` are reused by the args builder; `:100` `mintRunId`, `:122` `worktreeAddCommand`; `:266` `validateVerdicts` and its serial `metering` form.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/dispatch_serial.mjs:133` — `nextAction`, the serial counterpart that reads the same stage table (STORY-066-06); no runner needed for serial hosts.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/constants.mjs:33` — `BOUNCE_CAP = 3`, passed in through args.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/sprint_metrics.mjs:50-53,148` — phase names and the `pass <N>` description form the runner's labels must satisfy for per-stage attribution.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/close_sprint.mjs:118-128` — dependency-free config line-scan precedent for the `loop:` reader.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/config.example.yml:1-104` — all-commented config example; `loop:` block is added in the same style. No `loop` key exists today.
- **Reference (outside this repo, read-only):** dispenser_adapter's SPRINT-04 runner script, wave.js (485 lines) — the hand-written runner that worked: no imports, `agent()` call shape, prepare/commit/scan done by agents (the cost W009-5 and W010-1 record), and its own `C`/`ITEMS`/`PLANS` tables overriding `waves.json` (W009-2). Source of the call shape, not of the tables.
- **Coverage of this requirement:** partial, about 25%. The seam, the DAG helpers, the verdict envelope and the phase names exist; the runner, the args builder, `loop.models` and the tier rule are new.

## Prior work

- [[EPIC-066]] — parent; §6 Q7 (QA-Verify on opus for `runtime`) and Q8 (last retry one tier up) are this story's rules.
- [[EPIC-033]], [[CR-124]] (Completed) — wave launch, `waves.json` `schema_version: 2`, bases and upstream edges; the runner honours them and adds no policy.
- [[EPIC-055]] (Draft, paused) — scheduling above the launcher; excluded here.
- [[CR-120]] (Completed in SPRINT-45) — `<stage> <ID>` dispatch descriptions the runner keeps.
- [[STORY-033-01]] — the Workflow capability spike: per-thunk env not settable, ClearGate-managed worktrees, no hook attribution under workflows.
- [[STORY-066-06]], [[STORY-066-07]], [[STORY-066-08]], [[STORY-066-09]], [[STORY-066-10]] — upstream: stage table, sealed red, script merge, run-and-probe `DEFECT_IN`, rework routing.
- [[STORY-066-12]] — downstream: documents how the orchestrator launches this runner.
- No prior work found for: a shipped wave runner, a per-stage or per-lane model setting, a model-tier step on the final retry.

## Why not simpler?

- **Smallest existing surface that could carry this:** `launchWave()`'s `segmentRunner` seam in `launch_wave.mjs:332`, supplied by the orchestrator at run time.
- **Why isn't extension / parameterization / config sufficient?** The seam is exactly what each orchestrator filled by hand: it needs a Workflow script (globals, not Node imports), because `launchWave` is a Node function the Workflow runtime does not call. A parameterised `launch_wave.mjs` cannot be the runner for that reason, and leaving the body to the orchestrator is what produced W009-1 and W009-2, a 500-line script whose tables replaced the plan. The args builder is the smallest bridge from real files (`waves.json`, `stagesFor`, config) into a script that cannot read them; `loop.models` and the tier step are config plus about twenty lines, but they only have meaning once a runner reads them.

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
