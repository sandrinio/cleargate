---
story_id: STORY-066-13
parent_epic_ref: EPIC-066
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: sprint-execution,scripts,agents
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-11-15T08:30:00Z
ambiguity: 🟢 Low
context_source: "SPRINT-46 Goal check (d) sandbox run, findings S1, S3, S4, S5, S6 (.cleargate/field-trials/2026-11-sandbox-s46.md, sandbox session transcripts 3f5a65bc/4e1d5917/b6209151); owner /goal 2026-11-15: 'file any findings and fix them. run e2e tests until we achieve the goal. then ship npm and github. make decisions yourself' (decisions delegated; recorded in sprint-context Mid-Sprint Amendments)"
actor: Orchestrator running a sprint wave with the shipped runner
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-11-15T08:21:39.255Z
updated_at: 2026-11-15T08:21:39.255Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-15T08:24:08Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-066-13
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-15T08:24:07Z
  sessions: []
---

# STORY-066-13: Sandbox loop fixes: QA context pack, plan-aware QA-Red, red-test blocks, environment fails, single-item re-run
**Complexity:** L2 — routing and prompt lines in the shipped runner and its args builder, plus the QA, Developer and skill text that goes with them; no new script.

## 1. The Spec (The Contract)

### 1.1 User Story
As the Orchestrator running a sprint with the shipped `wave_runner.js`, I want the runner and the agent prompts to hand each stage what it needs and to route the failures the SPRINT-46 sandbox run hit, so that a clean item runs its lane's stages once, a bad red test goes back to QA-Red without a human, and a blocked item can be re-run through the runner.

### 1.2 Detailed Requirements
- Requirement 1 (finding S3): QA-Verify gets its context pack. `wave_runner.js` `promptFor`, for the `verify` role, adds a first step: `node .cleargate/scripts/prep_qa_context.mjs <ID> .worktrees/<ID>` (writes `.cleargate/sprint-runs/<sprint>/.qa-context-<ID>.md`). `qa.md` §Pack-First Ingest "Pack-absent fallback" changes from "emit QA: FAIL … and stop" to: run that command yourself, then read the pack; only when the command exits non-zero emit `QA: FAIL` with `DEFECT_IN: none` and the command's stderr. `prep_qa_context.mjs` accepts the worktree path relative to the repo root.
- Requirement 2 (finding S5): QA-Red honours the story plan. When the item's stage list has a `plan` stage, `promptFor` for the `red` role adds: `Plan: .cleargate/sprint-runs/<sprint>/plans/<ID>.md. Read it before writing tests. Call the functions and types it names with the signatures it gives; never declare a symbol with one of those names in a test file; give test helpers names that cannot collide with production code.` `qa.md` Mode: RED step 1 allows reading `plans/<ID>.md` when it exists (it is a plan, not implementation) and states the same no-redeclare rule; step 5 (no implementation reads) is unchanged.
- Requirement 3 (finding S6, routing): a Developer blocked by the sealed red test goes back to QA-Red. The `developer` adapter's `blocker_section` enum gains `Red-Test`. `developer.md` (`:130`, red test conflicts) returns `STATUS: blocked` with `blocker_section: Red-Test` and one sentence naming what in the red test is wrong (compiler error, contradiction with the item or plan). The runner, on a `build` result `blocked` with `Red-Test` and a red stage in the list: `qaBounces++`, pushes `red-test` to `defects_in`, sets the rework input to the Developer's notes, applies the bounce cap, and continues at the red stage (QA-Red pass N re-seals, then the Developer runs again). `Spec-Gap` keeps its `BLOCKED` / `spec-contradiction` verdict; `Test-Pattern` and `Environment` keep `technical-impossibility`.
- Requirement 4 (findings S4, S1): an environment failure is not a code defect. The runner, on a `verify` FAIL with `defect_in: none`, re-dispatches QA-Verify once (label `QA-Verify <ID> pass 2`), with no Developer dispatch, no `qaBounces` increment and nothing added to `defects_in`; a second consecutive `none` FAIL returns `BLOCKED` with `blocker.type: 'technical-impossibility'` and QA's defects text. A FAIL with no `defect_in` field stays `code` (STORY-066-11 Requirement 7). `SKILL.md` §C.5 "On QA: FAIL" names the `none` row. `SKILL.md` §A.5 (Gate 2 halt) says: when `baseline.json` records a failing configured test, report it at Gate 2 as information (merges excuse a failure that matches it, with `post_merge_test: excused` and `NOT TESTED` lines), not as a blocker, and never propose changing the configured test command.
- Requirement 5 (finding S6, re-run): one blocked item can be re-run through the runner. `wave_runner_args.mjs` gains `--item <ID>` (args for that one item of the wave; usage error when the item is not in the wave or is `Done`), `--from <stage>` (requires `--item`; an agent stage name in the item's lane; sets `startAt`) and `--issue <text>` (sets the item's rework input). When `startAt` comes after the red stage, the builder sets `item.qaSha` to the newest `qa-red(<ID>)` commit on `story/<ID>` (`git log story/<ID> --grep=^qa-red(<ID>) -1 --format=%H`; usage error when none). `worktreeCommands` omits an item whose `.worktrees/<ID>` already exists. The runner starts the walk at `startAt`, seeds `st.issue` from `item.issue` and `st.qaSha` from `item.qaSha`. `SKILL.md` §C barrier step 9 replaces the `resumeFromRunId` re-approach (a Workflow resume replays completed agent calls with unchanged prompts, so a BLOCKED segment returns the same verdict) with a fresh launch on `wave_runner_args.mjs --sprint <ID> --wave <wave> --item <ID> [--from <stage>] [--issue <text>]`.

### 1.3 Out of Scope
- The cost of the Architect TPV when a compiled language's red tests name a symbol the story creates (finding S7): the scan flag is the TPV's designed trigger; recorded in `intake.md`.
- Preflight Step 0 dirtying the tree it checks (X-2, pre-existing): `intake.md`.
- Merge, baseline and lane logic (`merge_story.mjs`, `record_baseline.mjs`, `assign_lane.mjs`) and the stage table (`segment_stages.mjs`): no change.
- Live `.claude/` and `.cleargate/` copies: re-synced at SPRINT-46 Gate 4.

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** Should the runner run `prep_qa_context.mjs` itself instead of telling QA to?
- **Recommended:** No. The runner is a Workflow script with no shell (STORY-066-11 Requirement 1). QA has Bash; the prompt line plus the `qa.md` fallback cover both the runner and hand or serial dispatches.
- **Human decision:** Resolved by the orchestrator under the owner's delegation (/goal, 2026-11-15) per the recommendation.
- **Question:** On a `none` FAIL, re-run QA-Verify or return BLOCKED at once?
- **Recommended:** Re-run once. With Requirement 1 the pack is present, so a second `none` means a real environment problem, which is the human's call; one retry absorbs a transient failure without a Developer no-op.
- **Human decision:** Resolved by the orchestrator under the owner's delegation per the recommendation.
- **Question:** `--from` after the red stage needs the sealed red SHA. Read it from git in the builder, or pass it on the command line?
- **Recommended:** From git: the seal commit subject is fixed (`qa-red(<ID>): …`, `seal_red.mjs`), so the builder finds it without the orchestrator copying SHAs.
- **Human decision:** Resolved by the orchestrator under the owner's delegation per the recommendation.

### 1.5 Risks

> Risks specific to this Story (cross-story risks belong in the Sprint Design Review).

- **Risk:** prompt-only fixes (Requirements 1, 2) are not proven by unit tests; an agent may still skip the step.
- **Mitigation:** both are backed twice (runner prompt line and `qa.md` text), and Goal check (d) re-runs the sandbox end to end after the merge, where a missing pack or a redeclared symbol shows up as a bounce.
- **Risk:** the `Red-Test` route loops between QA-Red and the Developer.
- **Mitigation:** it counts toward `qaBounces` and the existing `bounceCap` escalation.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | The red-test rework path and the single-item re-run path. |
| Interfaces | T | The re-run is a new `wave_runner_args.mjs` interface (`--item`, `--from`, `--issue`). |
| Data | T | Whether the lane has a story plan changes the QA-Red prompt. |
| Rules | T | The QA context pack step, and the `none` FAIL rule. |

```gherkin
Feature: Sandbox loop fixes

  @rules
  Scenario: QA-Verify is told to build its context pack first
    Given a standard item STORY-A in a wave
    When wave_runner.js runs it with stub agents that always pass
    Then the QA-Verify STORY-A prompt contains "node .cleargate/scripts/prep_qa_context.mjs STORY-A .worktrees/STORY-A"
    And qa.md's pack-absent fallback runs prep_qa_context.mjs and fails with DEFECT_IN none only when that command exits non-zero
    And prep_qa_context.mjs run from the repo root with the relative worktree path writes .qa-context-STORY-A.md in the sprint directory

  @data
  Scenario Outline: QA-Red reads the story plan when the lane has one
    Given an item on the <lane> lane
    When wave_runner.js dispatches its QA-Red stage
    Then the QA-Red prompt <names> "plans/<ID>.md" and the rule "never declare a symbol with one of those names in a test file"

    Examples:
      | lane     | names            |
      | runtime  | contains         |
      | standard | does not contain |

  @paths
  Scenario: A Developer blocked by the sealed red test goes back to QA-Red
    Given a standard item STORY-B whose first Developer returns status blocked with blocker_section "Red-Test" and notes "run redeclared in main_red_test.go"
    When wave_runner.js runs it with stub agents that pass afterwards
    Then the dispatches are QA-Red, Developer, QA-Red pass 2, Developer pass 2, QA-Verify
    And the QA-Red pass 2 prompt carries the rework input "run redeclared in main_red_test.go"
    And the verdict is GREEN with defects_in ["red-test"] and counters.qa_bounces 1
    And a Developer blocked with blocker_section "Spec-Gap" still returns BLOCKED with blocker.type "spec-contradiction"

  @rules
  Scenario: An environment failure is not booked as a code defect
    Given a standard item STORY-C whose first QA-Verify returns FAIL with defect_in "none"
    When wave_runner.js runs it and the second QA-Verify passes
    Then the dispatches are QA-Red, Developer, QA-Verify, QA-Verify pass 2 with no second Developer
    And the verdict is GREEN with defects_in [] and counters.qa_bounces 0
    And two consecutive defect_in "none" FAILs return BLOCKED with blocker.type "technical-impossibility"
    And SKILL.md §A.5 tells the orchestrator to report a failing baseline test at Gate 2 as information, not a blocker, and never to propose changing the configured test command

  @paths @interfaces
  Scenario: One blocked item is re-run through the runner from a named stage
    Given a fixture sprint whose wave1 holds STORY-D (Done) and STORY-E (blocked), with a "qa-red(STORY-E): write failing tests" commit on story/STORY-E and .worktrees/STORY-E present
    When wave_runner_args.mjs runs with --sprint SPRINT-99 --wave wave1 --item STORY-E --from developer --issue "rename the helper"
    Then the args hold one item, STORY-E, with startAt "developer", issue "rename the helper" and qaSha equal to that commit
    And worktreeCommands is empty
    And wave_runner.js with those args dispatches Developer STORY-E first and returns GREEN with qaSha set
    And --item STORY-D exits 2 because STORY-D is Done
    And SKILL.md's re-approach step names the fresh launch with --item and no longer names resumeFromRunId
```

### 2.2 Verification Steps (Manual)
- [x] Goal check (d): re-run the sandbox end to end on an RC built after this merge; no QA-Verify fails for a missing pack, the runtime item's red tests compile against its story plan, and dispatch counts match `stagesFor` on the clean path.

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/core/.cleargate/scripts/wave_runner.js` |
| Related Files | `cleargate-cli/scaffold/core/.cleargate/scripts/wave_runner_args.mjs`, `cleargate-cli/scaffold/core/.cleargate/scripts/prep_qa_context.mjs`, `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md`, `cleargate-cli/scaffold/hosts/claude/.claude/agents/developer.md`, `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md`, `cleargate-cli/scripts/build-codex-payload.mjs`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/qa.toml`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/developer.toml`, `cleargate-cli/scaffold/core/.agents/skills/sprint-execution/SKILL.md`, `cleargate-cli/test/scripts/wave-runner-sandbox-fixes.red.node.test.ts`, `cleargate-cli/test/integration/wave-runner-item-rerun.red.integration.node.test.ts` |
| New Files Needed | Yes — the two red test files |

### 3.2 Technical Logic
1. **Runner prompts (`wave_runner.js` `promptFor`, `:53-76`).** `verify` role: prepend the prep command line (Requirement 1). `red` role: when `hasPlan`, add the plan line (Requirement 2). `red` and `build`: rework input from `st.issue` as today.
2. **Runner routing (`segment`, `:78-166`).** Developer adapter enum gains `Red-Test` (`:29`). Build branch (`:138-144`): `blocked` + `Red-Test` + `idxOf('red') >= 0` → Requirement 3 route; else today's `blocked`. Verify branch (`:145-153`): `res.defect_in === 'none'` → if `st.noneFails` is 0, set it to 1 and stay on the verify stage (`continue` without `i++`); else `blocked('technical-impossibility', …)`; any other result resets `st.noneFails` to 0. `defectIn()` (`:49`) keeps absent → `code`. Start: `let i = item.startAt ? stages.findIndex((s) => s.name === item.startAt) : 0` (blocked when -1), `st.issue = item.issue || ''`, `st.qaSha = item.qaSha || null`.
3. **Args builder (`wave_runner_args.mjs`).** `parseFlags` (`:180-192`) takes `--item`, `--from`, `--issue`; `USAGE` documents them. `buildWaveArgs` (`:118-153`) takes `item`, `from`, `issue`, `worktreeExists(id)`, `sealedRed(id)`: filters to the one item (throw when absent or Done), validates `from` against the item's agent stage names, sets `startAt`/`issue`, sets `qaSha` from `sealedRed(id)` when `startAt` is after the red stage (throw when null), and drops worktree commands for items where `worktreeExists(id)`. `main` supplies `worktreeExists` (`fs.existsSync(<root>/.worktrees/<id>)`) and `sealedRed` (`git log story/<id> --grep=^qa-red(<id>) -1 --format=%H` via `execFileSync`, empty → null).
4. **`prep_qa_context.mjs`.** Resolve `<worktree-path>` with `path.resolve(REPO_ROOT, worktreePath)` before the existence check (`:31-35` in `main`), so the relative path from the runner prompt works from the repo root.
5. **Prompts and skill.** `qa.md` `:42` (RED step 1) and `:113` (pack-absent fallback); `developer.md` `:130` (`Red-Test`); `SKILL.md` §A.5 (Gate 2 baseline line), §C.5 `:459` (the `none` row), §C barrier step 9 `:274` (fresh launch with `--item`). Regenerate the Codex copies with `npm run gen:codex`; adjust `build-codex-payload.mjs` replacement anchors only if a changed canonical line is one they pin; `npm run prebuild` must pass (`build-codex-payload.mjs --check`).

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `wave_runner_args.mjs --sprint <ID> --wave <id> [--item <ID> [--from <stage>] [--issue <text>]]` (stdout) | CLI | None | waves.json, state.json, git (sealed red), `.worktrees/` | as STORY-066-11's args, items gain optional `startAt`, `issue`, `qaSha` |
| `wave_runner.js` developer adapter | Workflow schema | None | `blocker_section` enum adds `Red-Test` | unchanged verdict envelope |

## Task Breakdown

- [x] Write the red tests: runner prompts (pack line, plan line by lane), Red-Test routing, `none` FAIL rule, `--item`/`--from`/`--issue` builder cases, and the docs assertions -> Scenarios 1-5
- [x] Runner: `promptFor` verify and red lines -> Requirements 1, 2
- [x] Runner: `Red-Test` enum and route, `none` FAIL re-verify and block, `startAt`/`issue`/`qaSha` seeding -> Requirements 3, 4, 5
- [x] `wave_runner_args.mjs`: `--item`, `--from`, `--issue`, `sealedRed`, `worktreeExists`, usage text -> Requirement 5
- [x] `prep_qa_context.mjs`: resolve a relative worktree path against the repo root -> Requirement 1
- [x] `qa.md`, `developer.md`, `SKILL.md` text; `npm run gen:codex`; `npm run prebuild` -> Requirements 1-5
- [x] `npm run typecheck`, the new red tests, and the existing runner, QA, developer and skill tests -> all

## 4. Quality Gates

### 4.1 Minimum Test Expectations

> Epic Testing Strategy levels: Unit (runner through `node:vm` with stub agents, as `wave-runner.red.node.test.ts` does), Integration (args builder on a real git fixture), Release gate (Goal check (d) sandbox re-run).

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 6 | Pack line; plan line runtime and standard; Red-Test route; Spec-Gap unchanged; `none` re-verify; double `none` blocks. |
| Integration tests | 2 | `*.red.integration.node.test.ts`: `--item --from developer` on a real git fixture (sealed red commit, existing worktree, Done item refused); `prep_qa_context.mjs` with a relative worktree path. |
| E2E / acceptance tests | 5 | One per Gherkin scenario (the outline counts once). |

### 4.2 Definition of Done (The Gate)
- [x] Minimum test expectations (§4.1) met.
- [x] All Gherkin scenarios from §2.1 covered.
- [x] `build-codex-payload.mjs --check` passes; existing runner, seal, QA and skill tests stay green.
- [x] Goal check (d) re-run passes on an RC that includes this story.
- [x] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/wave_runner.js:53-76` — `promptFor`, the only place stage prompts are built; `:138-153` build and verify routing; `:49` `defectIn`.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/wave_runner_args.mjs:118-153` — `buildWaveArgs` (already skips `Done` items); `:180-192` `parseFlags`.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/prep_qa_context.mjs:6-21` — usage and default output `<sprint-dir>/.qa-context-<ID>.md`; nothing in the shipped loop calls it.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md:42,113` — RED step 1 (story file only) and the pack-absent FAIL.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/developer.md:130` — red-test conflict returns `BLOCKED: spec mismatch`, which the runner maps to `spec-contradiction`.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:274,459` — the `resumeFromRunId` re-approach and the QA FAIL routing.
- **Coverage of this requirement:** partial. Routing, prompts and the args builder exist; each requirement is a few lines in one of them.

## Prior work

- [[EPIC-066]] — parent; Goal check (d) is its release gate.
- [[STORY-066-11]] — the shipped runner and args builder this story corrects (Requirement 7 kept: absent `DEFECT_IN` is `code`).
- [[STORY-066-07]], [[STORY-066-09]], [[STORY-066-10]] — QA-Red seal, QA-Verify run-and-probe and `DEFECT_IN`, rework routing; their prompts change here.
- [[STORY-066-12]] — the loop spec whose re-approach line is corrected.
- [[CR-024]] — the QA context pack (`prep_qa_context.mjs`), never wired into the shipped loop.
- [[BUG-108]] (Triaged, SPRINT-41) — "the sprint-execution skill never tells the orchestrator to run `prep_qa_context.mjs`"; absorbed by Requirement 1 (closed with this story).
- [[BUG-113]] — adjacent (QA-Red sealed tests vs Test Layers minimums); not covered here.
- [[STORY-033-01]] — the Workflow spike that asked whether `resumeFromRunId` returns cached results; Requirement 5 follows from the answer.
- cleargate-wiki-query 2026-11-15: points 2 and 5 had no prior item; points 3 and 4 were partial in [[EPIC-066]] / [[STORY-066-10]].

## Why not simpler?

- **Smallest existing surface that could carry this:** `wave_runner.js` `promptFor` and its routing branches, `wave_runner_args.mjs` `buildWaveArgs`, and the three prompt files; no new file except tests.
- **Why isn't extension / parameterization / config sufficient?** Each defect is in what the loop tells an agent or how it routes an agent's result, so the fix is in those lines: config cannot add a prompt step or a route. The re-run needs a builder flag because the documented path (Workflow resume) returns cached results by design, and hand dispatch outside the runner is what STORY-066-11 removed.

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
