---
epic_id: EPIC-066
parent_ref: INITIATIVE-002
parent_cleargate_id: INITIATIVE-002
sprint_cleargate_id: null
carry_over: false
status: Completed
approved: true
approved_by: sandrinio
approved_at: 2026-11-14T20:10:00Z
ambiguity: 🟢 Low
area: sprint-execution,agent-prompts,scripts,gates,measurement
context_source: INITIATIVE-002 workstream WS-2 (process by risk) and the owner's decisions of 2026-11-14; the five open coding-loop questions in coding_loop.md; owner request 2026-11-14 ('write epic, I need to make it work in next sprint'); the SPRINT-45 release-candidate field trial in dispenser_adapter (.cleargate/field-trials/2026-11-dispenser-sprint45-rc.md, findings W009-1, W009-2, W009-5, W010-1, W010-2); a review of peer frameworks and vendor write-ups run 2026-11-14; canonical cleargate-cli main at f846d9a, surfaces mapped 2026-11-14
owner: sandrinio
target_date: null
created_at: 2026-11-14T19:28:17.665Z
updated_at: 2026-11-14T19:28:17.665Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-14T19:47:14Z
  transition: ready-for-decomposition
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-066
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-14T19:32:02Z
  sessions: []
last_contradict_sha: ca2ecc15f77301b4125a1b88bce5dddcf1ceffec354821d02b22bb4918d7cb62
---

# EPIC-066: Build Step Sized by Risk

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>The per-item build step runs one of three paths chosen by a script from risk signals (fast: Developer, script check, script merge; standard: QA-Red, Developer, QA-Verify, script merge; runtime: story plan, then standard, then Architect review); the stage list per lane ships as code that the wave launcher and the serial dispatcher both read; no agent is dispatched for work a script can do; QA-Verify runs the item instead of tracing it and names where a defect lives; the per-milestone Architect plan is removed.</objective>
  <architecture_rules>
    <rule>Keep the three lane names `fast`, `standard`, `runtime` (owner decision, INITIATIVE-002 §6). `runtime` becomes a real `state.json` value. No new state and no new work unit (EPIC-054 lock).</rule>
    <rule>One source for "which stages does this lane run": `segment_stages.mjs`. The skill, `launch_wave.mjs`, `dispatch_serial.mjs` and the shipped runner read it; none of them restates the list.</rule>
    <rule>A stage that is a fixed command sequence is a script. An agent may call the script as its last step, or the orchestrator runs it at the barrier; it is never a dispatch of its own.</rule>
    <rule>Merges stay serial and stay at the barrier (EPIC-055, CR-124). This epic changes who runs the merge, not when.</rule>
    <rule>Stack-neutral: no script added here may depend on `package.json` or Node in the target's own code. Commands come from `gate-checks.json`.</rule>
    <rule>Scripts change in cleargate-cli/scaffold/core; prompts and the skill change in scaffold/hosts/claude, scaffold/core/.agents and the scaffold/hosts/codex counterparts in the same story.</rule>
    <rule>QA-Red stays a separate agent and its tests stay sealed (owner decision). This epic limits how much it writes; EPIC-065 owns what its assertions may pin and the holdout scenarios.</rule>
  </architecture_rules>
  <target_files>
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/assign_lane.mjs" action="create" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/segment_stages.mjs" action="create" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/wave_runner.js" action="create" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/seal_red.mjs" action="create" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/merge_story.mjs" action="create" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/record_baseline.mjs" action="create" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/wave_runner_args.mjs" action="create" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/init_gate_config.sh" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/prep_reporter_context.mjs" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/templates/story.md" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/agents/architect-synth.md" action="modify" />
    <file path="cleargate-cli/scripts/build-codex-payload.mjs" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/pre_gate_runner.sh" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/pre_gate_common.sh" action="modify" />
    <file path="cleargate-cli/src/commands/sprint.ts" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/launch_wave.mjs" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/dispatch_serial.mjs" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/init_sprint.mjs" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/update_state.mjs" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/state.schema.json" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/state-events.mjs" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/qa_red_lint.mjs" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/prep_qa_context.mjs" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/sprint_metrics.mjs" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/config.example.yml" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/knowledge/cleargate-enforcement.md" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/templates/Sprint Plan Template.md" action="modify" />
    <file path="cleargate-cli/scaffold/core/.agents/skills/sprint-execution/SKILL.md" action="modify" />
    <file path="cleargate-cli/scaffold/core/.agents/skills/sprint-execution/dispatch-serial.md" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/dispatch-serial.md" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/agents/architect.md" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/agents/developer.md" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/agents/devops.md" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/codex/.codex/agents/architect.toml" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/codex/.codex/agents/qa.toml" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/codex/.codex/agents/developer.toml" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/codex/.codex/agents/devops.toml" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
Every item pays for the whole pipeline, and the pipeline spends its effort in the wrong places. The
fast lane was used once in 77 items here, although bugs bounce less than stories (14% against 23% in
new_app). The per-milestone Architect plan blocks every story in the milestone: dispenser M1 took 24
minutes against a 10-minute budget and produced a 60 KB plan. Red tests are the top source of
bounces and the most expensive agent in a wave (dispenser story 004-01: 1,347 lines). Six agents per
wave did work two shell scripts could do (W010-1). There is no shipped runner, so each sprint's
orchestrator writes about 500 lines of wave runner by hand and the plan in `waves.json` is not what
runs (W009-1, W009-2). And QA-Verify is a "read-only acceptance trace", while owner walkthroughs and
live runs find three to four times more defects than it does.

Peer frameworks agree on the shape of the fix. Spec Kit, superpowers, OpenSpec, Kiro and GSD plan
once per feature and have no second planning stage at build time. BMAD, GSD, OpenSpec and Kiro all
send small work down a short path. Anthropic's harness write-ups and the Claude Code documentation
report that a checker which runs the application catches what a checker that reads the diff approves.
Cursor removed its integrator agent because it was a bottleneck.

**What changes:** a script picks each item's path from its risk signals; the stage list ships as
code; mechanical steps are scripts; the milestone plan goes; QA-Red writes one test per scenario;
QA-Verify runs the item and says whether a defect is in the code or in the red test.

**Success Metrics (North Star)** (measured by `sprint_metrics.mjs` on the first three sprints on a
release carrying this epic, here and in the dispenser_adapter pilot; targets marked (proposed) await
the owner, confirmed 2026-11-14):
- A fast-lane item on the clean path uses one agent dispatch (INITIATIVE-002 §5 allows two).
- A standard-lane item on the clean path uses three agent dispatches, from four plus a share of the
  milestone plan.
- Dispatches whose only work is a fixed command sequence: zero, from six per wave in dispenser.
- No item waits on a milestone plan: the time from wave launch to an item's first dispatch is the
  worktree setup only.
- At least a quarter of sprint items run on the fast lane, from 1 in 77.
- Median red-test lines per acceptance scenario fall by half against the pilot's previous three
  sprints.
- The first-pass rate of fast-lane items is no lower than the standard lane's rate in the same
  sprint. If it is lower, the rubric is wrong and is tightened before the next sprint.
- The orchestrator writes no wave runner: the shipped `wave_runner.js` runs every wave unedited.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**

Prerequisites, moved from [[EPIC-065]] by owner decision 2026-11-14 because the fast lane's check
and QA-Verify's run both depend on tests that actually run:
- [ ] The pre-gate scan runs any configured command whatever the stack (no `package.json` guard),
      keeps the last 40 lines of a failing command's output, and records a configured command it
      skipped as FAIL, not INFO (field finding W-D1). A check whose target is not in the worktree at
      all (the meta-repo case in [[BUG-087]]) is reported as `n/a` with the reason, never as a
      silent pass or a false FAIL. Absorbs [[BUG-087]].
- [ ] The sprint base is tested once at kickoff and the failing set is written to
      `<sprintDir>/baseline.json`; QA-Verify and `merge_story.mjs` read it, so an old failure is not
      counted against an item whose branch did not touch it (field finding W010-3).

The build step:
- [ ] `assign_lane.mjs`: computes `fast | standard | runtime` per item from risk signals (scenario
      count, subsystems crossed, UI surface, forbidden surfaces, new dependency, and `proof_tier`
      when the item declares one), prints the signals that decided it, and writes
      `lane_assignments` into `waves.json`. It replaces the Architect's seven-check rubric. The
      Architect may raise a lane with a one-line reason and never lowers one; the owner may override
      either way.
- [ ] `runtime` is a real lane value in `state.schema.json`, `update_state.mjs --lane` and
      `init_sprint.mjs`.
- [ ] `segment_stages.mjs`: the stage list per lane as data, exported as `stagesFor(lane)`.
      `launch_wave.mjs` and `dispatch_serial.mjs` read it.
- [ ] `wave_runner.js`: a shipped Workflow script that runs a wave from `waves.json` and
      `stagesFor`, so the orchestrator no longer authors a runner. It honours `schema_version: 2`
      bases and upstream edges as `launch_wave.mjs` already exposes them (`storyBases`,
      `integrationReady`); it adds no scheduling policy of its own.
- [ ] `seal_red.mjs`: commits the red tests on the story branch (paths as separate arguments) and
      runs the wiring scan. QA-Red calls it as its last step. The Architect TPV dispatch stays only
      for a flagged scan, as today.
- [ ] `merge_story.mjs`: the DevOps agent's nine steps as a script, run by the orchestrator at the
      barrier, one item at a time. It runs the configured gate checks on the story branch before
      merging and refuses the merge when they fail. The DevOps agent is dispatched only when the
      script reports a merge conflict or a post-merge test failure. The script handles the cases
      that block DevOps today, and the three bugs close as absorbed: the orchestrator's own wiki and
      ledger edits in the tree ([[BUG-086]]), ClearGate residue blocking worktree removal
      ([[BUG-107]]), and a required Architect report that a clean-scan item never has ([[BUG-116]]).
- [ ] The per-milestone Architect plan (Phase B) is removed. A `runtime`-lane item gets a story plan
      of at most 150 lines from the Architect as the first stage of its own segment. Fast and
      standard items get no plan: the Developer reads the item, the Sprint Design Review block and
      the contracts. `GOAL_RELATION` moves from the milestone plan to the Sprint Design Review block.
- [ ] QA-Red volume: one test per acceptance scenario, plus edge cases only where the item names
      them. `qa_red_lint.mjs` counts tests against scenarios and flags a red set above twice the
      scenario count.
- [ ] QA-Verify `Mode: VERIFY` becomes run-and-probe: it runs the configured checks and the item's
      own proof command, exercises each scenario's behaviour, reports defects against scenarios only
      (no style findings), and states `DEFECT_IN: code | red-test | spec` on a FAIL. Fast-lane items
      have no QA-Verify dispatch; `merge_story.mjs`'s pre-merge check is their gate.
- [ ] Rework routing: a `code` defect returns to the Developer, a `red-test` defect returns to
      QA-Red, a `spec` defect halts for the owner. `update_state.mjs` records the defect location on
      the event, and `sprint_metrics.mjs` reports the two rework kinds separately.
- [ ] The last retry before escalation runs the Developer on the next model tier up.
- [ ] A fast-lane item whose pre-merge check fails is demoted to `standard` (the existing
      `--lane-demote` path and rule from STORY-022-04) and restarts at QA-Red.
- [ ] `config.yml` `loop.models`: an optional model per stage. Default: QA-Verify on a `runtime`
      item runs on a different model than the Developer.
- [ ] `sprint_metrics.mjs` reports dispatches per item by lane, so the success metrics above are
      read from a table rather than counted by hand.

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- Proof tiers, the evidence file, the Done guard, holdout scenarios and the property-not-shape rule
  for red tests ([[EPIC-065]], next sprint). This epic reads `proof_tier` when present and works
  without it; `stagesFor` leaves room for EPIC-065's prove stage.
- Wave scheduling: the ready-set scheduler, the concurrent-segment budget and the merge queue
  ([[EPIC-055]], paused). `wave_runner.js` runs the plan it is given.
- Generated file surfaces (WS-5), sprint composition and intake (WS-3), short item templates for
  small bugs and CRs (the other half of WS-2; see §6).
- Mutation testing of red tests, and any new parallelism between agents.
- Removing QA-Red, or letting the Developer edit sealed tests.
- The flashcard gate ([[CR-121]]) and the Sprint Design Review reader and synth agents.

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Host limits | A Workflow script dispatches agents and cannot be assumed to run shell commands itself. Scripts therefore run inside an agent's last step (`seal_red.mjs`) or at the barrier by the orchestrator (`merge_story.mjs`). The first story confirms this against the STORY-033-01 spike result before the runner is written. |
| Self-hosting | The sprint that builds this epic runs on the current loop. The new loop is first exercised by the next sprint here and by the dispenser_adapter pilot, after the live copy is re-synced. |
| Trust | A fast-lane item's gate is run by `merge_story.mjs`, not reported by the Developer. A Developer's own "tests pass" line never stands in for it. |
| Stack neutrality | `merge_story.mjs` and `seal_red.mjs` run on a Go target with no `package.json`. The pre-merge check is only as good as `pre_gate_runner.sh`, which skips every command in a Go repository today (field finding W-D1, owned by [[EPIC-065]]) and always fails the typecheck in a worktree ([[BUG-087]]). Until both are fixed the fast lane is not safe. |
| Cost | No new dispatch is added on any path. QA-Verify on a different model applies to `runtime` items only by default. |
| Multi-host | Prompt changes land in the Claude and Codex files together. `dispatch-serial.md` gets the same three paths from `stagesFor`. |
| Compatibility | A `state.json` or `waves.json` written before this release, with no `runtime` value and no computed lanes, still loads; unknown lanes are treated as `standard`. |

## Existing Surfaces

> Mapped 2026-11-14 against canonical `cleargate-cli` main (f846d9a).

- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect.md:174-196` — the seven-check Lane Classification rubric, applied by the Architect at Sprint Design Review. All seven must pass for `fast`.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/state.schema.json:105-108` — `lane` enum is `standard | fast`. `cleargate-cli/scaffold/core/.cleargate/scripts/update_state.mjs:358-384` sets and demotes lanes. `cleargate-cli/scaffold/core/.cleargate/scripts/init_sprint.mjs:191-256` reads `lane_assignments` from `waves.json`, falling back to the plan's §2.4 Lane Audit table.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md:94-122` — the QA playbook already describes a `runtime` lane and notes that `state.json` does not know it. `qa.md:60-64` defines `Mode: VERIFY` as a read-only acceptance trace.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:235-264` — Phase B, the per-milestone Architect plan and its `GOAL_RELATION` line. `SKILL.md:347-376` QA-Red and the orchestrator's red commit. `SKILL.md:378-415` the wiring scan and the scan-gated TPV dispatch. `SKILL.md:450-475` QA-Verify and the bounce. `SKILL.md:498-565` the DevOps-owned merge.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/launch_wave.mjs:332` — `launchWave({…, segmentRunner})` takes the segment body as a parameter. Nothing in the scaffold supplies one, which is why each orchestrator writes its own. `launch_wave.mjs:128-166` exports `storyBases` and `integrationReady`.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/dispatch_serial.mjs:133` — `nextAction` for serial hosts, with the stage order written in `dispatch-serial.md`.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/devops.md:86-172` — nine merge steps, all fixed commands: verify reports, checkout, no-ff merge, prebuild, parity audit, post-merge tests, worktree remove, branch delete, state transition.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/qa_red_lint.mjs` — the red-test lint that runs inside the wiring scan (CR-081). It checks fixtures, not volume.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/constants.mjs:33` `BOUNCE_CAP = 3`; `update_state.mjs:386-394` records a `qa-bounce` event with no defect location.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/sprint_metrics.mjs` — attributes tokens and rework rounds by the dispatch description `<stage> <ID>` (CR-120, SPRINT-45).
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect-reader.md:5` — the per-story reader runs on Haiku and extracts a digest; it is not a planner and is left alone.
- **Coverage of this epic's scope:** partial, about 35%. Lanes, the scan-gated Architect dispatches, the `segmentRunner` seam and per-stage attribution exist. The computed lane, the stage table, the shipped runner, the two scripts, the run-and-probe mode and defect routing are new.

## Prior work

- [[INITIATIVE-002]] — parent. WS-2 is defined there. Decided 2026-11-14: keep the three lane names, replace the rubric with risk signals, make `runtime` a real state value; keep QA-Red.
- [[EPIC-065]] (Draft) — proof tiers, evidence, holdouts, property-not-shape reds, the stack-neutral pre-gate scan and the kickoff baseline. This epic depends on its pre-gate fix for non-npm targets and reads its `proof_tier`.
- [[CR-024]], [[EPIC-022]] (Completed) — the lanes and the seven-check rubric this epic replaces.
- [[EPIC-033]], [[CR-124]] (Completed) — wave launch, `waves.json` `schema_version: 2`, the reader and synth fan-out. Kept; this epic supplies the missing segment body.
- [[EPIC-055]] (Draft, paused) — scheduling above the launcher. Its out-of-scope list excludes the segment body, the verdict schema and the merge mechanics, which is the ground this epic takes.
- [[CR-081]] (Completed) — red-test lint; extended with a volume check.
- [[CR-120]] (Completed in SPRINT-45) — dispatch descriptions and per-stage attribution; the measurement this epic's metrics rest on.
- [[CR-110]] (Completed) — `GOAL_RELATION` on the milestone plan; moved to the Sprint Design Review block.
- [[CR-082]] (Completed) — `PASS-PENDING-SMOKE`; unchanged here, generalised by [[EPIC-065]].
- [[CR-122]] (Draft) — the Developer may read its red tests; compatible, not absorbed.
- [[BUG-086]] (Draft) — DevOps merge blocked by orchestrator wiki dirt; `merge_story.mjs` must not reintroduce it and may close it.
- [[SPRINT-42]], [[SPRINT-43]] (Draft) — folded under INITIATIVE-002 by owner decision; SPRINT-43's loop-efficiency items are re-cut after this epic decomposes.
- [[EPIC-054]] (Completed) — no new state and no second execution unit; respected.
- [[STORY-022-04]] (Completed) — the pre-gate scan skips the QA spawn for a passing fast-lane item and demotes a failing one; the rule is kept and moves into `merge_story.mjs`.
- [[STORY-043-08]] (Completed) — Architect TPV and post-flight dispatches only on a flagged scan; kept.
- [[CR-078]] (Completed) — `init_sprint` reads lanes from `waves.json`; `assign_lane.mjs` becomes the writer.
- [[EPIC-013]] (Completed) — recorded the decision to split DevOps out as an agent; this epic narrows that agent to conflicts.
- [[BUG-087]] (Draft) — the pre-gate typecheck always fails in a worktree; must be fixed before `merge_story.mjs` relies on the scan, alongside W-D1.
- [[BUG-107]], [[BUG-116]], [[BUG-074]], [[BUG-075]] (Triaged) — worktree teardown needing `--force`, DevOps halting on a missing Architect report, state transitions dirtying the tree, unenforced transitions; all sit in the nine steps `merge_story.mjs` takes over and are fixed or carried there.
- [[BUG-102]] (Triaged) — serial-driver verdicts do not move `state.json`; touched by the `dispatch_serial.mjs` change.
- [[BUG-113]] (Triaged), [[STORY-059-03]] (Draft) — checks on sealed reds before the Developer starts; they run inside `seal_red.mjs` once it exists.
- [[EPIC-031]] (Draft) — scoped tests as QA's default; the run-and-probe mode keeps that scoping.
- No prior work found for: per-story Architect plans, a size limit on plans, one test per scenario, attributing rework to test or code, scripting the merge.

## Why not simpler?

- **Smallest existing surface that could carry this epic:** the existing `fast` lane (`architect.md:174-196`, `SKILL.md` §C skip rules) with a looser rubric.
- **Why isn't extension / parameterization / config sufficient?** Loosening the rubric is part of this epic, and on its own it would move more items to a shorter path. It would not make that path run, because the path exists only as prose that each orchestrator re-implements in a hand-written runner (W009-1: the runner's own tables overrode `waves.json`). It would also leave the standard path as it is: a blocking milestone plan, agents doing script work, an oversized red set and a checker that reads instead of runs. The stage table and the shipped runner are the minimum that makes a lane mean something at run time; the rest removes steps rather than adding them.

## 4. Technical Grounding (The "Shadow Spec")

**Affected Files:**
- Found during decomposition: `record_baseline.mjs` (new; exports `extractFailing` for 066-08 and 066-09), `wave_runner_args.mjs` (new; a Workflow script cannot import, so the runner gets its tables as args), `init_gate_config.sh` (stops seeding npm-only commands in a non-npm repo), `prep_reporter_context.mjs` (story plans), `templates/story.md` (lane field text), `architect-synth.md`, and `scripts/build-codex-payload.mjs`, which generates the Codex `.toml` agents and the `.agents` playbook (they are regenerated, not hand-edited).
- `cleargate-cli/scaffold/core/.cleargate/scripts/pre_gate_runner.sh`, `pre_gate_common.sh` — drop the `package.json` guards at lines 81-82, 186-187, 207-208, 223-224; keep 40 lines of failing output; skipped-configured is FAIL; out-of-worktree target is `n/a`.
- `cleargate-cli/src/commands/sprint.ts` — kickoff baseline: run `qa.test` from `gate-checks.json` on the sprint base, write `<sprintDir>/baseline.json`.
- `cleargate-cli/scaffold/core/.cleargate/scripts/assign_lane.mjs` (new) — `assign_lane.mjs <item-file>… [--write <waves.json>]`; prints lane and deciding signals per item.
- `cleargate-cli/scaffold/core/.cleargate/scripts/segment_stages.mjs` (new) — `stagesFor(lane)` returning ordered stages, each `{ name, kind: agent | script, agent?, mode?, when? }`.
- `cleargate-cli/scaffold/core/.cleargate/scripts/wave_runner.js` (new) — the shipped Workflow script.
- `cleargate-cli/scaffold/core/.cleargate/scripts/seal_red.mjs` (new) — commit reds, run the wiring scan, print the scan result.
- `cleargate-cli/scaffold/core/.cleargate/scripts/merge_story.mjs` (new) — pre-merge check, merge, post-merge test, teardown, state transition; exit codes distinguish check failure, conflict and post-merge failure.
- `cleargate-cli/scaffold/core/.cleargate/scripts/launch_wave.mjs`, `dispatch_serial.mjs` — read `stagesFor`; verdict gains `lane` and `stages_run`.
- `cleargate-cli/scaffold/core/.cleargate/scripts/init_sprint.mjs`, `update_state.mjs`, `state.schema.json` — `runtime` lane; `--qa-bounce --defect-in <code|red-test|spec>`.
- `cleargate-cli/scaffold/core/.cleargate/scripts/state-events.mjs` — `defect_in` on rework events.
- `cleargate-cli/scaffold/core/.cleargate/scripts/qa_red_lint.mjs` — test count against scenario count.
- `cleargate-cli/scaffold/core/.cleargate/scripts/prep_qa_context.mjs` — the pack carries the commands QA-Verify must run; the `not-yet-runtime-aware` heuristic is removed.
- `cleargate-cli/scaffold/core/.cleargate/scripts/sprint_metrics.mjs` — dispatches per item by lane; rework split by defect location.
- `cleargate-cli/scaffold/core/.cleargate/config.example.yml` — `loop.models`.
- `cleargate-cli/scaffold/core/.cleargate/knowledge/cleargate-enforcement.md` — §9 Lane Routing rewritten around the computed lane.
- `cleargate-cli/scaffold/core/.cleargate/templates/Sprint Plan Template.md` — §2.4 Lane Audit lists computed lanes with their signals; `GOAL_RELATION` per milestone.
- `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md`, `cleargate-cli/scaffold/core/.agents/skills/sprint-execution/SKILL.md` and both `dispatch-serial.md` files — Phase B removed; §C rewritten as three paths that point at `stagesFor`; §C.7 merge by script.
- `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect.md` — rubric removed; `Mode: STORY-PLAN` with the 150-line cap; milestone-plan mode removed.
- `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md` — RED volume rule and the `seal_red.mjs` last step; VERIFY as run-and-probe with `DEFECT_IN`.
- `cleargate-cli/scaffold/hosts/claude/.claude/agents/developer.md` — plan input is the story plan when one exists, otherwise the Sprint Design Review block; fast-lane items write their own regression test first.
- `cleargate-cli/scaffold/hosts/claude/.claude/agents/devops.md` — conflict and post-merge-failure handling only.
- `cleargate-cli/scaffold/hosts/codex/.codex/agents/architect.toml`, `qa.toml`, `developer.toml`, `devops.toml` — the same changes.

**Data Changes:**
- New per sprint: `<sprintDir>/baseline.json` (command, sha, failing test identifiers, last 40 lines).
- `state.json` story entry: `lane` gains `runtime`; `lane_assigned_by` gains `assign-lane-script`.
- `waves.json`: `lane_assignments` written by `assign_lane.mjs`, with a `lane_signals` map beside it.
- Rework events: `defect_in: code | red-test | spec`.
- Segment verdict: `lane`, `stages_run[]`.
- `config.yml`: `loop.models.<stage-name>` and `loop.models_by_lane.<lane>.<stage-name>`, keyed by the `stagesFor` stage names (`qa-red`, `qa-verify`, ...); all optional.
- `plans/M<N>.md` is no longer written; `plans/<ID>.md` is written for `runtime` items.

## 5. Acceptance Criteria

```gherkin
Feature: Build step sized by risk

  Scenario: A small bug takes the fast path with one dispatch
    Given BUG-A has one acceptance scenario, touches one subsystem and no forbidden surface
    When assign_lane.mjs runs for BUG-A
    Then it assigns lane "fast" and prints the signals that decided it
    And the segment for BUG-A dispatches the Developer and no other agent
    And merge_story.mjs runs the configured checks on story/BUG-A and merges it

  Scenario: A fast-lane item that fails its check is not merged and is demoted
    Given BUG-B is on the fast lane and its branch fails the configured test command
    When merge_story.mjs runs for BUG-B
    Then the merge is refused with the last 40 lines of the failing output
    And BUG-B's lane becomes "standard" with a recorded demotion reason
    And its next stage is QA-Red

  Scenario: A standard item runs three dispatches and waits on no plan
    Given STORY-C is on the standard lane in a milestone of five stories
    When its wave launches
    Then its first dispatch is QA-Red, with no Architect plan before it
    And on a clean path it dispatches QA-Red, Developer and QA-Verify only
    And the red commit and the wiring scan are run by seal_red.mjs inside the QA-Red dispatch

  Scenario: A risky item gets its own short plan
    Given STORY-D crosses two subsystems and has a UI surface
    When assign_lane.mjs runs for STORY-D
    Then it assigns lane "runtime"
    And the first stage of STORY-D's segment is an Architect story plan of at most 150 lines
    And no other item waits for that plan

  Scenario: The Architect can raise a lane but not lower it
    Given assign_lane.mjs assigned STORY-E the lane "standard"
    When the Sprint Design Review sets STORY-E to "fast" without an owner override
    Then init_sprint.mjs refuses the assignment and keeps "standard"

  Scenario: An oversized red set is flagged before the Developer starts
    Given STORY-F has four acceptance scenarios
    And QA-Red wrote eleven tests
    When seal_red.mjs runs the wiring scan
    Then the scan flags "11 tests for 4 scenarios" and the item returns to QA-Red

  Scenario: QA-Verify runs the item and names where the defect is
    Given STORY-G's Developer commit passes its sealed tests
    When QA-Verify runs the configured checks and exercises each scenario
    And one scenario fails because the red test asserts the wrong behaviour
    Then the verdict is "QA: FAIL" with "DEFECT_IN: red-test"
    And the item returns to QA-Red, not to the Developer
    And the rework event records defect_in "red-test"

  Scenario: The merge needs an agent only on a conflict
    Given STORY-H passed QA-Verify and merges cleanly
    When merge_story.mjs runs
    Then the item is merged, its worktree removed and its state advanced with no DevOps dispatch
    And when the merge conflicts instead, the script stops and the DevOps agent is dispatched with the conflict files

  Scenario: The pre-gate scan runs the configured test in a Go repository
    Given a repository with no package.json whose gate-checks.json sets qa.test to "make check"
    When pre_gate_runner.sh runs in qa mode
    Then it runs "make check"
    And on failure the scan report contains the last 40 lines of its output

  Scenario: A configured command that is skipped fails the scan
    Given gate-checks.json sets qa.typecheck to "go vet ./..."
    When the scan cannot run it
    Then the scan records FAIL for typecheck, not INFO

  Scenario: Old failures on the sprint base are known before building
    Given make check fails on the sprint base in internal/seccheck
    When the sprint kicks off
    Then baseline.json lists that failure
    And neither QA-Verify nor merge_story.mjs counts it against an item whose branch did not touch it

  Scenario: The shipped runner runs the plan as written
    Given a waves.json with three waves and computed lanes
    When the orchestrator launches wave_runner.js unedited
    Then each item runs the stages stagesFor returns for its lane
    And the verdict for each item lists the stages that ran
```

## Testing Strategy

- **What "working" means:** In a real sprint on a release carrying this epic, the orchestrator launches the shipped runner without editing it; small items merge after one dispatch; standard items start without waiting for a plan; no agent is spent on a commit, a scan or a clean merge; and a QA-Verify FAIL says whether the code or the red test is wrong.
- **Oracle:** `sprint_metrics.mjs` output read from the host's subagent transcripts and git (the SPRINT-45 measurement), not the orchestrator's own account: dispatches per item by lane, rework by defect location, and the absence of any `plans/M<N>.md` and any hand-written runner in the sprint directory.
- **Known-positive case:** a one-scenario bug in one subsystem is assigned `fast`, merges after one Developer dispatch and a passing script check.
- **Known-negative case:** the same bug with a failing test command is refused by `merge_story.mjs`; a story crossing two subsystems is never assigned `fast`.
- **Baseline:** from SPRINT-43..45 here and dispenser_adapter SPRINT-01..04, using the SPRINT-45 metrics: dispatches per item, share of items on the fast lane (1 in 77 here), minutes from wave launch to first Developer dispatch (dispenser M1: 24 for the plan alone), red-test lines per scenario, agents spent on mechanical steps (6 per wave in dispenser), first-pass rate by item type.
- **Release gate:** unit and integration tests in cleargate-cli; a clean-room install showing the new scripts and prompts (EPIC-058 rule 1, `cleargate verify-install`); a dry run of `wave_runner.js` with stub agents over a three-wave fixture. The owner moved the npm publish to SPRINT-46's close (2026-11-15); the dispenser_adapter pilot sprint runs on the published release and is judged by the owner.
- **Regression guard:** node:test suites for `assign_lane.mjs`, `stagesFor`, `seal_red.mjs`, `merge_story.mjs` (clean, failing check, conflict; on a Go fixture with no `package.json`) and the lint's volume check; the per-lane dispatch table in every later sprint report.

| Level | What it proves | Where the tests live | Who runs them, when |
|---|---|---|---|
| Unit | Lane assignment from signals, the stage table per lane, the volume check, defect routing in `update_state.mjs` | `cleargate-cli/test/**/*.node.test.ts` | Developer and QA-Verify, every story |
| Contract | The verdict's `lane` and `stages_run` fields, the `lane_assignments` and `lane_signals` shape in `waves.json`, the rework event's `defect_in` | `cleargate-cli/test/scripts/*.node.test.ts` | QA-Verify, stories that touch them |
| Integration | `seal_red.mjs` and `merge_story.mjs` against a fixture git repository (npm and Go); `wave_runner.js` with stub agents over a fixture plan | `cleargate-cli/test/**/*.integration.node.test.ts` | QA-Verify; consolidation pass |
| Real-host end-to-end | A real sprint in which the shipped runner runs every wave, at least one item per lane completes, and the metrics table shows the dispatch counts | dispenser_adapter pilot sprint on the release candidate; this repository's next sprint after the live re-sync | Orchestrator runs the sprint; owner judges at the walkthrough |
| Eval | n/a — no model-judgement output is scored; the lane is computed by a script and the agents' rule changes are checked by the real-host run | — | — |

### User journeys

| Journey | Actor | Path (trigger → steps → end) | Observable end state | Walked by |
|---|---|---|---|---|
| Small fix | Orchestrator + Developer | Item enters the sprint → `assign_lane.mjs` assigns `fast` → Developer writes the regression test and the fix → `merge_story.mjs` checks and merges | One dispatch in the metrics table; item merged; check output on record | Pilot sprint in dispenser_adapter |
| Ordinary story | Orchestrator + agents | Wave launches → QA-Red (seals its own tests) → Developer → QA-Verify runs it → script merge | Three dispatches; no milestone plan file; no DevOps dispatch | Pilot sprint in dispenser_adapter |
| Risky story | Orchestrator + agents | `runtime` assigned → Architect story plan → QA-Red → Developer → QA-Verify on a second model → Architect review → script merge | `plans/<ID>.md` of 150 lines or fewer; review recorded | This repository's next sprint |
| Wrong red test | QA-Verify + QA-Red | QA-Verify fails a scenario → `DEFECT_IN: red-test` → QA-Red re-scopes → Developer re-runs | Rework event with `defect_in: red-test`; report counts it apart from code rework | Pilot sprint, first occurrence |
| Launch without authoring | Orchestrator | Kickoff → launch `wave_runner.js` with the wave id | No runner file written in the sprint directory | Pilot sprint kickoff |

## Decomposition and build order

Owner direction 2026-11-14: put first whatever the loop change depends on. Ten stories, one sprint
(SPRINT-46). Numbering starts at 03 because the archived CR-066 already owns STORY-066-01 and -02. Each story that changes an agent prompt changes its Codex `.toml` in the same commit.
Only STORY-066-12 edits `SKILL.md` and `dispatch-serial.md`.

| Story | What it delivers | Owns | Upstream |
|---|---|---|---|
| STORY-066-03 | Pre-gate scan runs configured commands on any stack; 40 lines on failure; skipped is FAIL; out-of-worktree is `n/a` (absorbs BUG-087) | `pre_gate_runner.sh`, `pre_gate_common.sh` | none |
| STORY-066-04 | Kickoff baseline: `baseline.json`, and the QA pack carries it | `src/commands/sprint.ts`, `prep_qa_context.mjs` (baseline section) | none |
| STORY-066-05 | Computed lanes: `assign_lane.mjs`, `runtime` as a real value, raise-not-lower | `assign_lane.mjs` (new), `state.schema.json`, `update_state.mjs` (`--lane`), `init_sprint.mjs`, `architect.md` rubric section, `cleargate-enforcement.md` §9, Sprint Plan Template §2.4 | none |
| STORY-066-06 | Stage table: `stagesFor(lane)`; launcher and serial dispatcher read it; verdict `lane`, `stages_run` | `segment_stages.mjs` (new), `launch_wave.mjs`, `dispatch_serial.mjs` | none |
| STORY-066-07 | QA-Red seals its own tests; one test per scenario; volume lint | `seal_red.mjs` (new), `qa_red_lint.mjs`, `qa.md` RED section | none |
| STORY-066-08 | Merge by script; fast-lane pre-merge gate and demotion; DevOps on conflict only (absorbs BUG-086, BUG-107, BUG-116) | `merge_story.mjs` (new), `devops.md` | 066-03, 066-04 |
| STORY-066-09 | QA-Verify runs the item and states `DEFECT_IN` | `qa.md` VERIFY section, `prep_qa_context.mjs` (commands) | 066-04, 066-07 |
| STORY-066-10 | Rework routed by defect location; metrics by lane | `update_state.mjs` (`--defect-in`), `state-events.mjs`, `sprint_metrics.mjs` | 066-05 |
| STORY-066-11 | Shipped `wave_runner.js`; `loop.models`; last retry one tier up | `wave_runner.js` (new), `config.example.yml` | 066-06 to 066-10 |
| STORY-066-12 | Loop spec: three paths, milestone plan removed, Architect story-plan mode, Developer plan input | both `SKILL.md`, both `dispatch-serial.md`, `architect.md` modes, `developer.md`, Sprint Plan Template `GOAL_RELATION` | all |

Critical path: 066-03 → 066-08 → 066-11 → 066-12. Stories 066-03 to 066-07 build in parallel.

## 6. AI Interrogation Loop (Human Input Required)

- **AI Question:** "Make it work in next sprint" can mean two things. (a) SPRINT-46 here builds this epic on the current loop, the release candidate goes to dispenser_adapter for its next sprint, and SPRINT-47 here is the first to run on it. (b) The next sprint must already run on the new loop, which means building this off-sprint first. Recommended: (a). Which?
- **Human Answer:** As recommended (owner, 2026-11-14). SPRINT-46 builds this epic on the current loop. After its close and the live re-sync, SPRINT-47 here is the first sprint on the new loop. The owner added on 2026-11-15: push both repositories and publish to npm at SPRINT-46's close; dispenser_adapter's next sprint then runs on the published release.
- **AI Question:** SPRINT-46 roster. EPIC-065 is drafted at eight stories and this epic is about seven. Your earlier order was evidence first. Recommended: SPRINT-46 carries this epic plus the two EPIC-065 stories it needs (the stack-neutral pre-gate scan and the kickoff baseline), and the rest of EPIC-065 follows in SPRINT-47. The alternative is both epics in one sprint of about fifteen items. Which?
- **Human Answer:** As recommended (owner, 2026-11-14), with the owner's direction to put first whatever the loop change depends on. SPRINT-46 carries this epic, including the two prerequisites moved in from EPIC-065 (stack-neutral pre-gate scan, kickoff baseline) and BUG-087, BUG-086, BUG-107 and BUG-116 as absorbed cases. The rest of EPIC-065 follows in SPRINT-47, on the new loop.
- **AI Question:** Lane rubric. Recommended signals: `fast` = at most two acceptance scenarios, one subsystem, no UI surface, no forbidden surface (schema, auth, config schema, security code), no new dependency, and proof tier `unit` when declared. `runtime` = a UI surface, or two or more subsystems, or proof tier `container` or `live`. Everything else is `standard`. The Architect may raise a lane, never lower it. Agree with the signals and the two-scenario limit (today it is one)?
- **Human Answer:** As recommended (owner, 2026-11-14). `fast`: at most two acceptance scenarios, one subsystem, no UI surface, no forbidden surface, no new dependency, proof tier `unit` when declared. `runtime`: a UI surface, or two or more subsystems, or proof tier `container` or `live`. Otherwise `standard`. The Architect may raise a lane, never lower it.
- **AI Question:** Remove the per-milestone Architect plan entirely, with a story plan of at most 150 lines for `runtime` items only? The Sprint Design Review already settles contracts and order. The weaker alternative is to keep the milestone plan with a size cap. Recommended: remove it.
- **Human Answer:** As recommended (owner, 2026-11-14). The per-milestone plan is removed; `runtime` items get a story plan of at most 150 lines as the first stage of their own segment.
- **AI Question:** Fast-lane items have no QA-Red and no QA-Verify; the Developer writes the regression test and `merge_story.mjs` runs the checks. Today's fast lane already skips QA-Red and skips the QA spawn when the pre-gate scan passes (STORY-022-04), so the change is that the check moves into the merge script and the Developer is told to write the regression test first. Recommended: accept it, with demotion to `standard` on a failed check and the first-pass-rate tripwire in §1. Agree?
- **Human Answer:** As recommended (owner, 2026-11-14). No QA-Red and no QA-Verify on the fast lane; the Developer writes the regression test first and `merge_story.mjs` runs the check; a failed check demotes the item to `standard`; the first-pass-rate tripwire in §1 applies.
- **AI Question:** Merge by script, with the DevOps agent only on a conflict or a post-merge failure. The handoff note kept the merge unchanged. Recommended: change it; all nine DevOps steps are fixed commands. Agree?
- **Human Answer:** As recommended (owner, 2026-11-14). Merge by script; the DevOps agent only on a conflict or a post-merge failure.
- **AI Question:** QA-Red volume cap: one test per scenario plus named edge cases, flagged above twice the scenario count. I earlier suggested putting this and defect routing in EPIC-065; they are here instead so EPIC-065 stays at eight stories and the build-step changes ship together. Agree with the cap and the placement?
- **Human Answer:** As recommended (owner, 2026-11-14). One test per scenario plus named edge cases, flagged above twice the scenario count; the cap and defect routing live in this epic.
- **AI Question:** A different model for checking. The research found vendor claims but no controlled study, so it is a config knob rather than a rule. Recommended default: QA-Verify on `runtime` items runs on Opus while the Developer stays on Sonnet; other lanes are unchanged. Agree, or leave the default off?
- **Human Answer:** As recommended (owner, 2026-11-14). `loop.models` is a config knob; the shipped default runs QA-Verify on `runtime` items on Opus while the Developer stays on Sonnet; other lanes unchanged.
- **AI Question:** Escalation. Recommended: the bounce cap stays at three, and the last Developer retry before escalation runs one model tier up. Agree?
- **Human Answer:** As recommended (owner, 2026-11-14). The cap stays at three; the last Developer retry before escalation runs one model tier up.
- **AI Question:** The targets marked (proposed) in §1: at least a quarter of items on the fast lane, and median red-test lines per scenario halved. Confirm or change?
- **Human Answer:** As recommended (owner, 2026-11-14). Both targets confirmed and written into §1 without the (proposed) mark.
- **AI Question:** Short item templates for small bugs and CRs are the other half of WS-2 and are left out so this epic fits one sprint. Recommended: a follow-up CR after the first sprint on the new loop. Agree?
- **Human Answer:** As recommended (owner, 2026-11-14). Short item templates for small bugs and CRs become a follow-up CR, drafted after SPRINT-47 shows how the fast lane behaves.


---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Coding Agent):
- [x] `approved: true` is set in the YAML frontmatter.
- [x] The `<agent_context>` block is complete and validated.
- [x] §4 Technical Grounding contains 100% real, verified file paths.
- [x] §6 AI Interrogation Loop is empty (all human answers integrated into the spec).
- [x] 0 "TBDs" exist in the document.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered.
- [x] Testing Strategy answers how we test this, including its user journeys and real-host proof or why it isn't needed.
