---
story_id: STORY-066-12
parent_epic_ref: EPIC-066
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: sprint-execution,agent-prompts
status: Draft
approved: true
approved_by: "sandrinio"
approved_at: "2026-11-15T09:00:00Z"
ambiguity: 🟢 Low
context_source: EPIC-066 (approved 2026-11-14; §6 Q1, Q4, Q5, Q6 answered) + verified canonical scaffold at cleargate-cli main (SKILL.md, dispatch-serial.md, architect.md, developer.md, build-codex-payload.mjs) + stories STORY-066-03 to STORY-066-11 as the code this story documents
actor: Orchestrator and the Architect, Developer, QA agents reading the loop spec
complexity_label: L3
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-11-14T19:47:49.312Z
updated_at: 2026-11-14T19:47:49.312Z
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
  last_gate_check: 2026-11-14T19:57:35Z
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

# STORY-066-12: Loop spec — three paths, no milestone plan, story-plan mode
**Complexity:** L3 — prose rewrite across two playbooks, two serial contracts, three agent prompts and their Codex twins, plus the Codex generator's pinned replacements; no new runtime code, but every claim must match what STORY-066-03 to 066-11 ship.

## 1. The Spec (The Contract)

### 1.1 User Story
As the Orchestrator (and the Architect, Developer and QA agents it dispatches), I want the loop spec to describe the three build paths, the script-run merge and the story-plan mode exactly as the scripts implement them, so that no agent follows a removed milestone-plan step or restates a stage list that `stagesFor` already owns.

### 1.2 Detailed Requirements
- Requirement 1: Phase B (the per-milestone Architect plan) is removed from `SKILL.md` in both files (`scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md` §4, `:235-263`, and its generated twin `scaffold/core/.agents/skills/sprint-execution/SKILL.md`). Section 4 stays as a two-line stub (`## 4. Phase B — removed`) so the numbering of §5 and later, which other documents cite, does not move. The roster table (`SKILL.md:61-68`) drops the "per-milestone plan" spawn point and the `plans/M<N>.md` artifact, and the wall-clock budget row `architect (per milestone)` (`:75-87`) becomes `architect (per story plan)`. No file named `plans/M<N>.md` is referenced anywhere in either `SKILL.md`.
- Requirement 2: §C is rewritten as three paths. The intro (`SKILL.md:265-270`) and a new table give, per lane, the stage sequence by name — `fast`, `standard`, `runtime` — and state that `scaffold/core/.cleargate/scripts/segment_stages.mjs` (`stagesFor`, STORY-066-06) is the single source: a reader who finds a difference trusts the script. The table's stage names are exactly `STAGE_NAMES`. §C.0.1 is rewritten to launch the shipped runner (STORY-066-11): the orchestrator runs `wave_runner_args.mjs`, creates the printed worktrees serially, launches `wave_runner.js` unedited, validates the barrier array with `wave_runner_args.mjs --validate`, processes flashcards, merges each GREEN item with `merge_story.mjs`, then advances. §C.0.2 keeps its heading and its contract-first rules; its "Until EPIC-055's scheduler lands, the Orchestrator runs this protocol by hand" sentence (`:308`) is replaced by a statement that `wave_runner.js` runs it and nothing schedules above it.
- Requirement 3: §C.3 to §C.6 describe the per-stage steps as the stage table names them. §C.3 (QA-Red): the agent's last step is `seal_red.mjs`; the orchestrator no longer commits the red tests (`:371-376`). §C.3.5 (TPV): the scan result is `seal_red.mjs`'s `{ flags, scan_exit }`, and the live Architect TPV dispatch happens only on a flag (exit 1) or could-not-run (exit 2), the existing safeguard kept. §C.4 (Developer): the plan input is `plans/<ID>.md` when the item is `runtime`, else the Sprint Design Review block and the contracts. §C.5 (QA-Verify): run-and-probe per STORY-066-09, and on `QA: FAIL` the `DEFECT_IN` value routes the rework (`code` to Developer, `red-test` to QA-Red, `spec` halts for the owner) via `update_state.mjs <ID> --qa-bounce --defect-in <value>` (STORY-066-10). §C.6 (Architect review): the `architect-review` stage, always for `runtime`, only on a flagged scan for `standard`, absent for `fast`.
- Requirement 4: §C.7 (`SKILL.md:498-565`) is rewritten around `merge_story.mjs <ID> --sprint <SPRINT-NN>` (STORY-066-08). The orchestrator runs it at the barrier, one item at a time. Exit 0: merged. Exit 3: the pre-merge check failed; a `fast` item was demoted to `standard` by the script and re-enters at QA-Red, any other item returns to the Developer. Exit 4 (conflict) and exit 5 (post-merge test failure): dispatch the DevOps agent, passing the script's `conflict_files` and `tail`. Exit 2: usage or precondition, fix and rerun. The "Required reports" table drops the Architect-report and DevOps-report prerequisites (BUG-116), the nine-step ACTIONS block and the "DevOps Escape Hatch" (`:565-567`) are removed, and the "Forbidden orchestrator patterns" line keeps `git merge`, `git worktree remove` and `git branch -d` forbidden by hand while naming `merge_story.mjs` as the one allowed route.
- Requirement 5: `dispatch-serial.md` (both copies; identical today) §2 step 3 and §5 follow the same three paths: step 3 runs the story through the stages `dispatch_serial.mjs next` prints for its lane (read from `stagesFor` by STORY-066-06) instead of "§C.1 to §C.7", merges with `merge_story.mjs`, and the §5 verdict gains `lane` and `stages_run`. Nothing in it restates a stage list.
- Requirement 6: `architect.md` (`scaffold/hosts/claude/.claude/agents/architect.md`) loses the milestone-plan job (the `## Your one job` and `## Workflow` plan template at `:30-90`, and the "once per milestone" description in its frontmatter) and gains `## Mode: STORY-PLAN`: input is one `runtime` item, output is `.cleargate/sprint-runs/<sprint-id>/plans/<ID>.md` of at most 150 lines, ending in the Task Breakdown rows the existing EPIC-054 WS7 rule requires; Preflight, flashcard check and guardrails stay. `GOAL_RELATION: advances | off critical path` moves out of the milestone plan into the Sprint Design Review block, one line per milestone in §2.1 Phase Plan (`architect.md` `## Sprint Design Review`, which `architect-synth.md:191` already treats as canonical), and `Sprint Plan Template.md` §2.1 shows the line. `architect-synth.md:196` ("write the milestone plan file") is reworded. The lane-classification rubric section is not touched here (STORY-066-05 owns it).
- Requirement 7: `developer.md`: "Inputs" and Workflow step 2 (`:19-37`) take the plan from `plans/<ID>.md` when it exists, otherwise from the Sprint Design Review block and the contracts, and drop "milestone plan"; `plan_deviations` wording (`:82`) says "the story plan or the SDR block". The `lane=fast behavior` block (`:59-62`) states that a fast-lane Developer writes the regression test first (red before the fix) because the lane has no QA-Red, and that `merge_story.mjs`, not the Developer's own report, is its gate.
- Requirement 8: the Codex and `.agents` copies are produced, not hand-edited. The `.toml` agents and the `.agents` playbook are generated by `cleargate-cli/scripts/build-codex-payload.mjs` (`npm run gen:codex`); this story edits the generator's pinned replacement texts (`CODEX_SKILL_REPLACEMENTS` R3 and R6, `scripts/build-codex-payload.mjs:280-286`) where the canonical lines they replace change, keeps its anchors (`:298-308`) resolving, and regenerates. `build-codex-payload.mjs --check` exits 0 at the end.
- Requirement 9: the two context bundles follow the plan move. `prep_qa_context.mjs` (`:220-255`, `plan_path`) looks for `plans/<ID>.md` first and falls back to a `plans/M*.md` file holding a `## <ID>` heading, so sprints planned before this release still resolve. `prep_reporter_context.mjs` (`buildMilestonePlans`, `:192-212`) includes every `plans/<ID>.md` under a `## Story Plans` heading after any milestone plans, and keeps its "No milestone plans" line only when neither kind exists.

### 1.3 Out of Scope
- Any script or agent behaviour: `assign_lane.mjs`, `segment_stages.mjs`, `seal_red.mjs`, `merge_story.mjs`, `wave_runner.js`, the pre-gate scan (STORY-066-03 to 066-11), and `qa.md` / `devops.md` (STORY-066-07, 066-08, 066-09 own them). This story only describes them.
- The `Lane Classification` rubric in `architect.md` and `cleargate-enforcement.md` §9 (STORY-066-05), and `Sprint Plan Template.md` §2.4 Lane Audit (STORY-066-05).
- Live `.claude/` and `.cleargate/` copies: re-synced at sprint close, not here.
- Proof tiers, a `prove` stage and holdouts (EPIC-065); the stage table already leaves room for it.

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** The runner is a Workflow script and cannot set env, while `SKILL.md:281` says `launch_wave.mjs` owns the `SKIP_FLASHCARD_GATE=1` save, set and restore in a `try/finally` (BUG-034) and forbids the orchestrator to touch it. The shipped runner does not go through `launchWave()`. Who owns the gate window now?
- **Recommended:** The orchestrator sets `SKIP_FLASHCARD_GATE=1` in its own env immediately before launching the runner (spike decision 3) and unsets it as the first barrier step, before any merge or non-wave dispatch; §C.0.1 says so, and a docs-match test asserts the restore step precedes the merge step. The BUG-034 sentence is narrowed to "`launchWave()` callers". This reintroduces a prose obligation for the runner path only; the code-enforced restore remains for `launchWave()`.
- **Human decision:** Resolved in drafting per the recommendation; confirmed by the owner with the SPRINT-46 Brief, 2026-11-15.
- **Question:** `architect-synth.md` is not on EPIC-066's target list, yet it names the milestone plan file (`:196`) and is the producer of the Sprint Design Review block that `GOAL_RELATION` moves into for N > 2.
- **Recommended:** Include `architect-synth.md` and its generated toml in this story's surface for the one-line rewording; the `GOAL_RELATION` rule itself lives in `architect.md`'s SDR section, which synth already points at.
- **Human decision:** Resolved in drafting per the recommendation; confirmed by the owner with the SPRINT-46 Brief, 2026-11-15.
- **Question:** Existing sealed tests pin text this story rewrites: `test/scripts/codex-sprint-execution-render.red.node.test.ts` (the R3 replacement and the canonical A3 line, `:54`, `:122`) and `test/docs/contract-first-dag-text.red.node.test.ts` (the `#### C.0.2` heading position, `:146-159`).
- **Recommended:** Keep the `#### C.0.1` and `#### C.0.2` headings and the A1 to A6 anchor lines, so only the R3 and A3 literals change; update those literals in the same commit. No other sealed test is edited.
- **Human decision:** Resolved in drafting per the recommendation; confirmed by the owner with the SPRINT-46 Brief, 2026-11-15.

### 1.5 Risks

> Risks specific to this Story (cross-story risks belong in the milestone plan).

- **Risk:** the docs describe a script as designed in the epic, and the script ships differently (a flag name, an exit code, a stage name), so the spec lies on day one.
- **Mitigation:** `parallel_eligible: "n"`, upstream of every build story; the docs-match tests import `stagesFor`, run `merge_story.mjs` and `wave_runner_args.mjs` with no arguments to read their usage, and compare against the text, so a mismatch fails the build rather than reaching an agent (FLASHCARD: assert the code fact, not file existence).
- **Risk:** the Codex render breaks: a rewritten canonical paragraph removes an anchor, or new text outside the replaced regions contains a banned token (`launch_wave`, `RUN_ID`, `C.0.1`, `C.0.2`, `/workflows`, `Workflow tool`, `parallel()`; `build-codex-payload.mjs:265-277`).
- **Mitigation:** keep the six anchor lines verbatim; run `node scripts/build-codex-payload.mjs --check` after every SKILL edit; avoid the banned tokens outside the A1 to A6 regions.
- **Risk:** two agent prompts change under a story that other stories also touch (`architect.md` rubric by STORY-066-05, `developer.md` none, `qa.md`/`devops.md` by 066-07/08/09), so edits collide.
- **Mitigation:** this story runs last and edits only the sections named in Requirements 6 and 7; the file-surface table lists them; QA-Verify diffs the commit against those sections.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | The three lane paths, each read from `stagesFor`. |
| Interfaces | T | The same spec reaches Claude Code (wave runner), serial hosts (`dispatch-serial.md`) and Codex (generated twins). |
| Data | F | Documentation has no data shapes that vary by type or volume; shapes are owned by the upstream stories. |
| Rules | T | Milestone plan removed, `GOAL_RELATION` relocated, DevOps only on exit 4/5, story plan at most 150 lines. |

```gherkin
Feature: Loop spec describes the three paths the scripts implement

  @paths
  Scenario: Each path in the playbook lists exactly the stages stagesFor returns
    Given the SKILL.md section C table of paths
    When each lane's row is compared with stagesFor for fast, standard and runtime
    Then the stage names in the row equal the stage names stagesFor returns, in order
    And every stage name the playbook uses is in STAGE_NAMES

  @rules
  Scenario: No milestone plan remains and the story plan has its own mode
    Given the updated playbook and agent prompts
    When a reader searches both SKILL.md files and architect.md
    Then no plans/M<N>.md path, no Phase B dispatch and no milestone-plan job remain
    And architect.md has "Mode: STORY-PLAN" with the 150-line cap, matching the mode name on the runtime lane's story-plan stage
    And GOAL_RELATION is in the Sprint Design Review section and in the Sprint Plan Template section 2.1

  @rules
  Scenario: The merge is a script and DevOps runs only on a conflict or a post-merge failure
    Given section C.7 of the playbook
    When it is compared with merge_story.mjs
    Then it names merge_story.mjs with its real usage and dispatches the DevOps agent only on the exit codes the script defines for conflict and post-merge test failure
    And it names no merge step the orchestrator performs by hand

  @interfaces
  Scenario: Every host reads the same spec
    Given the canonical Claude playbook, dispatch-serial.md, developer.md and their generated Codex copies
    When build-codex-payload.mjs --check runs
    Then it exits 0
    And developer.md takes its plan from plans/<ID>.md when present, else the Sprint Design Review block, and tells a fast-lane Developer to write the regression test first
    And prep_qa_context.mjs and prep_reporter_context.mjs read plans/<ID>.md, falling back to plans/M<N>.md for an older sprint

  @rules
  Scenario: A spec that disagrees with the code fails the build
    Given a copy of SKILL.md whose runtime row names a stage not in stagesFor
    When the docs-match test runs against that copy
    Then it fails naming the unknown stage
```

### 2.2 Verification Steps (Manual)
- [ ] Read section C of the canonical `SKILL.md` top to bottom as the Orchestrator would, and confirm every command it names exists and accepts the flags shown (`wave_runner_args.mjs`, `wave_runner.js`, `seal_red.mjs`, `merge_story.mjs`, `update_state.mjs --qa-bounce --defect-in`).
- [ ] Open the generated `.agents` playbook and `architect.toml`, `developer.toml` and confirm they carry the same changes and no Claude-only token.

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md` |
| Related Files | `cleargate-cli/scaffold/core/.agents/skills/sprint-execution/SKILL.md`, `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/dispatch-serial.md`, `cleargate-cli/scaffold/core/.agents/skills/sprint-execution/dispatch-serial.md`, `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect.md`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/architect.toml`, `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect-synth.md`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/architect-synth.toml`, `cleargate-cli/scaffold/hosts/claude/.claude/agents/developer.md`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/developer.toml`, `cleargate-cli/scaffold/core/.cleargate/templates/Sprint Plan Template.md`, `cleargate-cli/scripts/build-codex-payload.mjs`, `cleargate-cli/scaffold/core/.cleargate/scripts/prep_qa_context.mjs`, `cleargate-cli/scaffold/core/.cleargate/scripts/prep_reporter_context.mjs`, `cleargate-cli/test/scripts/codex-sprint-execution-render.red.node.test.ts`, `cleargate-cli/test/docs/loop-spec-three-paths.node.test.ts` |
| New Files Needed | Yes — `cleargate-cli/test/docs/loop-spec-three-paths.node.test.ts` |

### 3.2 Technical Logic
Edit the canonical Claude files by hand; produce every Codex and `.agents` file with `npm run gen:codex` (never edit a file whose first line says GENERATED). Order: (1) agents and template (the sources the playbook points at), (2) `SKILL.md` §1, §4, §A.4/§A.5, §C, §8, (3) `dispatch-serial.md`, (4) the generator's R3/R6 and the one pinned test, (5) `npm run gen:codex`, (6) the docs-match test.

Section C shape: a short "three paths" table (`Path | Lane | Stages (from stagesFor)`) under the §C intro; then §C.0 to §C.7 as stage notes, each headed with the stage name it implements so the test can map prose to `STAGE_NAMES`. Keep §C.0.1 and §C.0.2 headings and the six Codex anchor lines unchanged. §C.7 states the exit-code table as the script defines it (2, 3, 4, 5) and the DevOps dispatch context as the script's printed `conflict_files` and `tail`.

Docs-match test (`node:test`, tsx): (a) import `stagesFor`/`STAGE_NAMES` from the real `segment_stages.mjs` and compare to the parsed path table; (b) read `merge_story.mjs` usage by running it with no arguments and assert the exit codes quoted in §C.7 are the ones it prints, and that DevOps is dispatched only on the conflict and post-merge codes; (c) run `wave_runner_args.mjs` with no arguments and assert every flag §C.0.1 uses appears in its usage text; (d) assert no `plans/M` token and no `Phase B` heading remain in either SKILL.md; (e) assert `architect.md` has the STORY-PLAN heading and "150", and that the `runtime` lane's first stage `mode` equals the heading text; (f) run `build-codex-payload.mjs --check` and assert exit 0; (g) the negative scenario edits a temp copy and asserts the matcher throws, so the test proves it can fail. No assertion is "file exists".

### 3.3 API Contract (if applicable)

n/a — documentation. The commands it documents are specified in STORY-066-06, 066-07, 066-08, 066-10 and 066-11.

## Task Breakdown

- [ ] Confirm STORY-066-03 to 066-11 are merged and read the real usage of `segment_stages.mjs`, `seal_red.mjs`, `merge_story.mjs`, `wave_runner_args.mjs`, `update_state.mjs --defect-in`; every command in the new text is copied from them -> Requirements 2, 3, 4
- [ ] Edit `architect.md`: remove the milestone-plan job and template, add `Mode: STORY-PLAN` (at most 150 lines, `plans/<ID>.md`, Task Breakdown rows), move `GOAL_RELATION` into the SDR section; reword `architect-synth.md:196` -> Requirement 6
- [ ] Edit `developer.md`: plan input from `plans/<ID>.md` else the SDR block; fast-lane regression test first and `merge_story.mjs` as its gate -> Requirement 7
- [ ] Edit `Sprint Plan Template.md` §2.1 to show `GOAL_RELATION` per milestone -> Requirement 6
- [ ] Rewrite `SKILL.md` §1 roster and budgets, replace §4 with the removed-stub, adjust §A.4/§A.5 and §8 -> Requirement 1
- [ ] Rewrite `SKILL.md` §C intro with the three-paths table, §C.0.1 (shipped runner, barrier steps, flashcard-gate window per Open Question 1), §C.0.2 tail -> Requirement 2
- [ ] Rewrite `SKILL.md` §C.3 to §C.6 as the stage notes (seal_red last step, scan-gated TPV, plan input, run-and-probe, `DEFECT_IN` routing, architect-review) -> Requirement 3
- [ ] Rewrite `SKILL.md` §C.7 around `merge_story.mjs`; delete the nine-step ACTIONS block and the DevOps Escape Hatch; update the forbidden-patterns line -> Requirement 4
- [ ] Update both `dispatch-serial.md` (§2 step 3, §5 verdict fields) -> Requirement 5
- [ ] `prep_qa_context.mjs` plan lookup (`plans/<ID>.md`, then `plans/M*.md`) and `prep_reporter_context.mjs` `## Story Plans` section, with a unit test for each -> Requirement 9
- [ ] Update the generator's R3 and R6 and the two pinned literals in `codex-sprint-execution-render.red.node.test.ts`; run `npm run gen:codex`, then `node scripts/build-codex-payload.mjs --check` -> Requirement 8
- [ ] Write `test/docs/loop-spec-three-paths.node.test.ts` (checks a to g above) and run it with the affected existing tests (`test/docs/*`, `test/scripts/codex-sprint-execution-render.red.node.test.ts`, `serial-dispatch-docs`) plus `npm run typecheck` -> Scenarios 1-5

## 4. Quality Gates

### 4.1 Minimum Test Expectations

> Epic Testing Strategy levels covered: Unit and Contract (docs-match against the real scripts). Journeys: "Ordinary story", "Risky story" and "Launch without authoring" are described by this spec; the real-host level is the dispenser pilot and this repository's next sprint after the live re-sync.

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 5 | Paths table equals `stagesFor` (3 lanes in one test plus `STAGE_NAMES`); no milestone-plan token; STORY-PLAN heading and cap; `GOAL_RELATION` location; developer.md plan input and fast-lane text. |
| Integration tests | 2 | `merge_story.mjs` and `wave_runner_args.mjs` usage run against the §C text (real scripts, no mocks); `build-codex-payload.mjs --check` exits 0. Named `*.integration.node.test.ts` only if split out from the unit file. |
| E2E / acceptance tests | 5 | One per Gherkin scenario in §2.1, the negative scenario included. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] `node scripts/build-codex-payload.mjs --check` exits 0 and no generated file was hand-edited.
- [ ] The two existing tests whose pinned text changed are updated in this commit; no other existing test is edited.
- [ ] After merge, the user is reminded that canonical edits do not reach live `.claude/`; re-sync is at sprint close (`node cleargate-cli/dist/cli.js init` after the dist rebuild).
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:235-263` — Phase B and `GOAL_RELATION`; `:265-308` §C intro, `launch_wave` contract and C.0.2; `:347-476` QA-Red, TPV, Developer, QA-Verify; `:477-567` Architect pass and the DevOps-owned merge; `:794-812` rework counters.
- **Surface:** `cleargate-cli/scaffold/core/.agents/skills/sprint-execution/SKILL.md:17-28` — the Codex host note; the file is generated from the Claude playbook by `cleargate-cli/scripts/build-codex-payload.mjs:314-380` (`renderCodexSprintExecution`, six anchored replacements, banned tokens at `:265-277`).
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/dispatch-serial.md:18-33` — the serial loop and `:44-61` the verdict contract; byte-copied to `cleargate-cli/scaffold/core/.agents/skills/sprint-execution/dispatch-serial.md` (`cleargate-cli/scripts/build-codex-payload.mjs:425`).
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect.md:30-90` — the milestone-plan job and template; `:105-125` Sprint Design Review (§2.1 to §2.5); `:174-196` the lane rubric (STORY-066-05's, untouched here).
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/developer.md:19-37,59-71` — plan input and the `lane=fast` block.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect-synth.md:191,196` — points at architect.md for the SDR structure; names the milestone plan file.
- **Surface:** the Sprint Plan template (in the scaffold's templates folder), lines 68-82 — §2.1 Phase Plan.
- **Surface:** `cleargate-cli/test/docs/contract-first-dag-text.red.node.test.ts:146-159` and `cleargate-cli/test/docs/serial-dispatch-docs.red.node.test.ts` — existing docs tests that pin playbook text; the pattern the new docs-match test follows, with real-script assertions added.
- **Coverage of this requirement:** partial, about 30%. The playbook, serial contract and prompts exist; the three-paths framing, the story-plan mode, the script merge text and the docs-match test are new.

## Prior work

- [[EPIC-066]] — parent; §6 Q4 (milestone plan removed, story plan at most 150 lines for `runtime`), Q5 (fast lane), Q6 (merge by script) are the decisions this story writes into the spec.
- [[CR-110]] (Completed) — introduced `GOAL_RELATION` on the milestone plan; moved to the SDR block here.
- [[CR-124]], [[EPIC-033]] (Completed) — contract-first plan and wave launch text (`C.0.1`, `C.0.2`) kept.
- [[CR-120]] (Completed in SPRINT-45) — dispatch description form `<stage> <ID>`, kept in the roster paragraph.
- [[EPIC-054]] (Completed) — the Architect's Task Breakdown rows requirement, kept in STORY-PLAN mode.
- [[CR-024]], [[EPIC-022]] (Completed) — lanes; rubric replaced by STORY-066-05.
- [[CR-081]] (Completed) — red-test lint inside the scan that `seal_red.mjs` runs.
- [[BUG-034]] — the `launchWave()` flashcard-gate restore the runner path does not go through (Open Question 1); [[BUG-116]], [[BUG-086]], [[BUG-107]] — closed by the script merge this story documents.
- [[STORY-058-12]] (Completed) — serial dispatch and the Codex render this story must keep consistent.
- [[STORY-066-03]] through [[STORY-066-11]] — upstream; this story documents what they build.
- No prior work found for: a docs-match test that runs the real scripts' usage against the playbook text.

## Why not simpler?

- **Smallest existing surface that could carry this:** a one-line pointer in `SKILL.md` §C saying "stages come from `stagesFor`", leaving the rest of the playbook as is.
- **Why isn't extension / parameterization / config sufficient?** The old §C is the milestone-plan loop: its prose tells the Orchestrator to dispatch the Architect per milestone, commit red tests by hand and send every merge to DevOps, so a pointer beside it leaves two contradicting instructions and the agents follow the longer one. The prompts must change in the same commit (the Architect would still write milestone plans, the Developer would still wait for one), and the Codex and serial copies are generated from these files, so a partial edit fails the generator's anchors. Writing the paths as a table checked against `stagesFor` is what keeps the spec from drifting again.

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
