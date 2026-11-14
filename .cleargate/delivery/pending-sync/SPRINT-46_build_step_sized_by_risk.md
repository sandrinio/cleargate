---
sprint_id: SPRINT-46
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
lifecycle_init_mode: block
remote_id: null
source_tool: manual
status: Draft
start_date: 2026-11-15
end_date: 2026-11-19
synced_at: null
created_at: 2026-11-14T19:47:49.526Z
updated_at: 2026-11-14T19:47:49.526Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
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
  last_gate_check: 2026-11-14T19:58:51Z
  transition: ready-for-execution
epics:
  - EPIC-066
stories:
  - STORY-066-03
  - STORY-066-04
  - STORY-066-05
  - STORY-066-06
  - STORY-066-07
  - STORY-066-08
  - STORY-066-09
  - STORY-066-10
  - STORY-066-11
  - STORY-066-12
execution_mode: v2
area: sprint-execution,scripts,agent-prompts
sprint_goal: |
  Make the build step fit the item: a script assigns fast, standard or runtime from risk signals,
  a shipped runner runs the plan as written, scripts replace the agents that only ran commands, and
  QA-Verify runs the item and names where a defect is, proven by a dry run of the shipped runner, a
  real scan of a copy of dispenser_adapter, and lane assignment on the last four sprints' items.
proposals: []
context_source: |
  Decomposes EPIC-066 (INITIATIVE-002 WS-2, approved by the owner 2026-11-14) into STORY-066-03..12.
  Carries the two prerequisites moved from EPIC-065 (stack-neutral pre-gate scan, kickoff baseline)
  inside STORY-066-03/04. BUG-087 is absorbed by STORY-066-03; BUG-086, BUG-107 and BUG-116 by
  STORY-066-08. Re-cuts SPRINT-43 per INITIATIVE-002 §6: BUG-087 and BUG-086 move here.
last_contradict_sha: 677a59b2c9e40679738ac91f73c4db51f6fba1a752eed027a0940ca17136cd4c
---

# SPRINT-46: Build Step Sized by Risk

## 0. Stakeholder Brief

This is the second slice of INITIATIVE-002 (Evidence-First Execution Loop), and the one that makes
the coding loop faster. Today every item takes the whole pipeline: a milestone plan that blocks every
story, a red-test agent, a developer, a checker that reads instead of runs, and a merge agent, with
six agents per wave in dispenser_adapter doing work two scripts could do. This sprint makes the path
fit the item. Small items take one agent and a scripted check. Ordinary items take three agents and
wait on no plan. Risky items get a short plan of their own and a second-model check. The runner that
drives a wave ships with ClearGate instead of being written by hand each sprint.

The sprint runs on the current loop. At its close the new loop goes live in this repository, both
repositories are pushed and `cleargate` is published to npm, so SPRINT-47 here and dispenser_adapter's
next sprint both run on it.

- **Sprint Goal:** Make the build step fit the item: a script assigns fast, standard or runtime from risk signals, a shipped runner runs the plan as written, scripts replace the agents that only ran commands, and QA-Verify runs the item and names where a defect is.
- **Business Outcome:** faster sprints with fewer agent dispatches per item, and a checker that catches what green tests miss.
- **Risks (top 3):** the sprint changes the scan its own merges depend on; ten items is the largest roster since INITIATIVE-002 began; the loop spec story must describe nine others correctly. See Risks & Dependencies.
- **Metrics:** dry run of the shipped runner shows 1 / 3 / 5 dispatches for fast / standard / runtime items on the clean path; the scan runs `make check` on a copy of dispenser_adapter; at least a quarter of the last four sprints' items are assigned `fast`.

## Sprint Goal

Make the build step fit the item: a script assigns fast, standard or runtime from risk signals, a shipped runner runs the plan as written, scripts replace the agents that only ran commands, and QA-Verify runs the item and names where a defect is, proven by a dry run of the shipped runner, a real scan of a copy of dispenser_adapter, and lane assignment on the last four sprints' items.

## 1. Consolidated Deliverables

The Proof column applies INITIATIVE-002 rule 1 by hand, as in SPRINT-45. Lanes are set at the Sprint
Design Review by the current rubric; this sprint runs on the current loop.

| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure | Proof (tier — check) |
|---|---|---|---|---|---|---|
| `STORY-066-03` | Pre-gate scan runs configured commands on any stack (absorbs BUG-087) | standard | M1 | y | med | Real run — `pre_gate_runner.sh qa` on a copy of dispenser_adapter runs `make check`; meta-repo worktree reports `n/a`, not FAIL |
| `STORY-066-04` | Kickoff baseline | standard | M1 | y | low | Real run — kickoff on a fixture sprint writes `baseline.json` with a known pre-existing failure |
| `STORY-066-05` | Computed lanes | standard | M1 | y | med | Real run — `assign_lane.mjs` over SPRINT-43..46 items and dispenser_adapter SPRINT-04 stories |
| `STORY-066-06` | Stage table | standard | M1 | y | low | Unit — `stagesFor` per lane; verdict validation with `lane` and `stages_run` |
| `STORY-066-07` | QA-Red seals its own tests | standard | M1 | y | med | Integration — `seal_red.mjs` on a fixture repo commits, scans and flags an oversized red set |
| `STORY-066-08` | Merge by script (absorbs BUG-086, BUG-107, BUG-116) | standard | M2 | n (after 03, 04) | high | Integration — `merge_story.mjs` on npm and Go fixture repos: clean, failing check, conflict, residue |
| `STORY-066-09` | QA-Verify runs the item | standard | M2 | n (after 04, 07) | med | Unit + docs-match-code — pack `commands` section; `DEFECT_IN` in the VERIFY output contract |
| `STORY-066-10` | Rework by defect location | standard | M2 | n (after 05) | low | Unit — `--defect-in` events; `sprint_metrics.mjs` split on a fixture sprint |
| `STORY-066-11` | Shipped wave runner | standard | M3 | n (after 06–10) | high | Integration — dry run with stub agents over a three-wave fixture plan, one item per lane |
| `STORY-066-12` | Loop spec: three paths | standard | M3 | n (after all) | med | Docs-match-code — every stage, script and exit code the skill names exists in code |

## 2. Execution Strategy
*(Written by Architect during Sprint Design Review, architect-reader ×10 → architect-synth. Pending.)*

**Proposed order (for the SDR to confirm or amend), from EPIC-066's decomposition:**
- **M1, build in parallel:** STORY-066-03, 04, 05, 06, 07. No upstream edges.
- **M2:** STORY-066-08 after 03 and 04; STORY-066-09 after 04 and 07; STORY-066-10 after 05.
- **M3:** STORY-066-11 after 06 to 10; STORY-066-12 last.
- **Critical path:** 03 → 08 → 11 → 12.

**Proposed contract (for the SDR to confirm):** C1 `contract/S-46-stages` (base cli `main`, owner
STORY-066-06): `segment_stages.mjs` exports `STAGE_NAMES` and `stagesFor(lane)` with the stage shape
pinned in STORY-066-06. Consumed by STORY-066-11 and STORY-066-12. The script CLIs and exit codes
(`seal_red.mjs`, `merge_story.mjs`, `assign_lane.mjs`) and the `baseline.json` shape are pinned in
their stories' §3.3 and need no branch.

### 2.2 Merge Ordering (Shared-File Surface Analysis)

| Shared File | Stories Touching It | Merge Order | Rationale |
|---|---|---|---|
| `scaffold/core/.cleargate/scripts/update_state.mjs` | 066-05, 066-10 | 05 → 10 | 05 adds `runtime` to `--lane`; 10 adds `--defect-in` |
| `scaffold/hosts/claude/.claude/agents/qa.md` (+ `qa.toml`) | 066-07, 066-09 | 07 → 09 | 07 edits Mode: RED; 09 rewrites Mode: VERIFY |
| `scaffold/core/.cleargate/scripts/prep_qa_context.mjs` | 066-04, 066-09 | 04 → 09 | 04 adds the `baseline` section; 09 adds `commands` |
| `scaffold/hosts/claude/.claude/agents/architect.md` (+ `.toml`) | 066-05, 066-12 | 05 → 12 | 05 replaces the rubric; 12 changes the modes |
| `scaffold/core/.cleargate/templates/Sprint Plan Template.md` | 066-05, 066-12 | 05 → 12 | 05 rewrites §2.4; 12 moves `GOAL_RELATION` |
| `scaffold/core/.cleargate/scripts/launch_wave.mjs` | 066-06, 066-11 | 06 → 11 | 06 extends the verdict; 11 calls `launchWave` |

### 2.3 Shared-Surface Warnings
- To be written by the SDR.

### 2.4 Lane Audit

| Story | Lane | Rationale (≤80 chars) |
|---|---|---|

### 2.5 ADR-Conflict Flags
- To be written by the SDR. Known: STORY-066-08 narrows the DevOps agent that EPIC-013 split out; the owner approved this in EPIC-066 §6.

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| STORY-066-03 changes the pre-gate scan that this sprint's own merges run through | Canonical only; the live scan is unchanged until close (rule 5). Merges use the live scan throughout the sprint. |
| Ten items is the largest roster since INITIATIVE-002 began; M3 is serial | Five M1 items build in parallel; 066-12 is documentation of merged code and can absorb late spec clarifications. If M2 slips a day, 066-12 moves to a day-five slot rather than the roster growing. |
| STORY-066-12 documents nine other stories; drift between spec and code | Its tests are docs-match-code: every stage, script, flag and exit code it names is asserted against the merged code. |
| The shipped runner cannot be exercised for real inside this sprint, which runs on the current loop, and the release ships before a field sprint has used it | Dry run with stub agents and a clean-room install at the goal check; the first real runs are SPRINT-47 here and dispenser_adapter's next sprint, both on the published release. A defect they find ships as a patch release. |
| A Workflow script may not be able to run shell commands | Designed for that already: scripts run inside an agent's last step (`seal_red.mjs`) or at the barrier (`merge_story.mjs`). Field finding W010-1 shows the current runner spawns agents for exactly this reason. |
| Canonical-live parity tests fail in the merge lane once canonical moves | Expected, as in SPRINT-45. Each is recorded in §6 when it starts; the live re-sync at Gate 4 clears them. |
| Nested-cli layout: every path is inside `cleargate-cli`, which outer worktrees classify as unreachable | Same as SPRINT-45: stories run on branches in the cli main checkout; the owner confirms the layout at Gate 2. |

## Metrics & Metadata
- **Expected Impact:** dispatches per item fall to 1 / 3 / 5 by lane on the clean path; no orchestrator-written runner; no agent spent on a commit, a scan or a clean merge; a QA-Verify FAIL names the code, the red test or the spec.
- **Priority Alignment:** owner direction 2026-11-14: the coding-loop change as soon as possible, with its prerequisites first. INITIATIVE-002 WS-2, with the two WS-1 prerequisites moved forward from EPIC-065.

## Prior work

- [[EPIC-066]] — the epic this sprint decomposes; [[INITIATIVE-002]] its parent.
- [[SPRINT-45]] — the previous slice (measurement); its `sprint_metrics.mjs` is how this sprint's metrics are read.
- [[SPRINT-43]] — re-cut per INITIATIVE-002 §6: [[BUG-087]] and [[BUG-086]] move here (absorbed). Its other items stay for a later re-cut.
- [[SPRINT-42]] — overlaps WS-2 and WS-3; untouched here.
- [[EPIC-065]] — follows in SPRINT-47, on the new loop.

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Starting Point:** the five M1 stories in parallel; STORY-066-03 first among equals, since it is on the critical path.
- **Relevant Context:** EPIC-066 (pending-sync), `cleargate-cli/scaffold/core/.cleargate/scripts/`, `cleargate-cli/scaffold/hosts/{claude,codex}/`, field-trial log `.cleargate/field-trials/2026-11-dispenser-sprint45-rc.md`.
- **Constraints:** canonical edits only; local merges only; no push or publish during the sprint.

**Before kickoff:**
1. Owner approves the ten stories and this plan (Gate 1).
2. Re-sync this repository to cli `main` (rebuild `cleargate-cli/dist`, then `node cleargate-cli/dist/cli.js init`), so the sprint runs on the SPRINT-45 release candidate. This does not wait for dispenser_adapter SPRINT-04 to close; the post-hoc watch pass runs on its own.
3. Sprint Design Review writes §2 and `waves.json` (Gate 2). Preflight (Gate 3).

**Hand-applied rules from INITIATIVE-002** (copied into `sprint-context.md` Cross-Cutting Rules at kickoff):

1. **Proof per item.** Each item is Done only when the evidence named in its Proof column exists, recorded in its DevOps report or in `sprint-runs/SPRINT-46/evidence/`.
2. **Fixed roster.** The ten items above are the roster. Anything found mid-sprint goes to `sprint-runs/SPRINT-46/intake.md` and enters only with the owner's recorded OK in §6.
3. **Lanes by risk.** Lanes follow UI surface, subsystems crossed and scenario count.
4. **Recount at close.** The orchestrator records a hand recount of rework from git and dispatch metadata beside `sprint_metrics.mjs` in the close Brief.
5. **Loop unchanged under the sprint.** No edit to live `/.claude/**` or live `.cleargate/{scripts,knowledge,templates}` until Gate 4.

**At Gate 4 (differs from SPRINT-45; owner request 2026-11-14 and 2026-11-15):**
1. Re-sync the live copy here from cli `main` after the close, so SPRINT-47 runs on the new loop.
2. Release: bump `cleargate` to 0.31.0, commit `release(cleargate): v0.31.0 — <summary>`, tag, push cli `main` and the tag to origin, `npm publish` (recipe and traps in the npm-publish memory), and a GitHub release. The release carries SPRINT-45's unpublished work as well (cli was 40 commits ahead of origin at planning).
3. Push the meta-repo `main` to origin.
4. Install the published release in dispenser_adapter for its next sprint.
This replaces the INITIATIVE-002 rollout order (prove in dispenser, then release) for this release, at the owner's request for speed.

**Goal Acceptance Check** (run before Gate 4):
- (a) `wave_runner.js` dry run with stub agents over a three-wave fixture plan holding one item per lane: each item runs exactly `stagesFor(lane)`; dispatch counts 1 / 3 / 5 on the clean path; no runner file written by the orchestrator.
- (b) Canonical `pre_gate_runner.sh qa` on a copy of dispenser_adapter runs `make check` and `go vet ./...`, and reports failing output when a test is broken on purpose.
- (c) `assign_lane.mjs` over the items of SPRINT-43, SPRINT-44, SPRINT-45, SPRINT-46 and dispenser_adapter SPRINT-04: at least a quarter assigned `fast`, no item touching a forbidden surface assigned `fast`, and the owner spot-checks five assignments.

## 4. Decomposition Status

- [x] All work items have their type's required sections.
- [x] No epic without child stories — EPIC-066 has STORY-066-03..12.
- [x] All work items 🟢 — owner approved EPIC-066 and STORY-066-03..12 (2026-11-15).
- [ ] Gate 2 SDR §2 Execution Strategy written by Architect.

## 5. Gate Checklist

- [x] **Gate 1** — EPIC-066 (approved 2026-11-14) and the ten roster items approved (owner, 2026-11-15: "sound great. now, plan the sprint please").
- [ ] **Gate 2** (Sprint Ready) — SDR §2 confirmed; Goal Acceptance Check confirmed.
- [ ] **Gate 3** (preflight) — `cleargate sprint preflight SPRINT-46` and devops reachable.
- [ ] **Gate 4** (close) — after all items merge and the walkthrough.

## 6. Execution Log

- 2026-11-14 · Planned. EPIC-066 approved by the owner ("as you recommend"); roster drafted.
- 2026-11-15 · Gate 1. Owner approved the ten stories and the plan, and asked for git push and npm publish at close (Gate 4 steps above).
