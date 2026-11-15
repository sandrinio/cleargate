---
sprint_id: SPRINT-46
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
lifecycle_init_mode: block
remote_id: null
source_tool: manual
status: Active
start_date: 2026-11-15
end_date: 2026-11-19
synced_at: null
created_at: 2026-11-14T19:47:49.526Z
updated_at: 2026-11-14T20:47:45Z
created_at_version: strategy-phase-pre-init
updated_at_version: 7683c00f-dirty
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
last_contradict_sha: 4d498cf6a2e74d3e7f1e446187c5bcea29f1e600414d61f63ba94f89e5d959db
stamp_error: no ledger rows for work_item_id SPRINT-46
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-14T20:30:19Z
  sessions: []
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

<!-- cleargate:ignore-ids -->The Proof column applies INITIATIVE-002 rule 1 by hand, as in SPRINT-45.<!-- /cleargate:ignore-ids --> Lanes are set at the Sprint
Design Review by the current rubric; this sprint runs on the current loop.

| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure | Proof (tier — check) |
|---|---|---|---|---|---|---|
| `STORY-066-03` | Pre-gate scan runs configured commands on any stack <!-- cleargate:ignore-ids -->(absorbs BUG-087)<!-- /cleargate:ignore-ids --> | standard | M1 | y | med | Real run — `pre_gate_runner.sh qa` on a copy of dispenser_adapter runs `make check`; meta-repo worktree reports `n/a`, not FAIL |
| `STORY-066-04` | Kickoff baseline | standard | M1 | y | low | Real run — kickoff on a fixture sprint writes `baseline.json` with a known pre-existing failure |
| `STORY-066-05` | Computed lanes | standard | M1 | y | med | <!-- cleargate:ignore-ids -->Real run — `assign_lane.mjs` over SPRINT-43..46 items and dispenser_adapter SPRINT-04 stories<!-- /cleargate:ignore-ids --> |
| `STORY-066-06` | Stage table | standard | M1 | y | low | Unit — `stagesFor` per lane; verdict validation with `lane` and `stages_run` |
| `STORY-066-07` | QA-Red seals its own tests | standard | M1 | y | med | Integration — `seal_red.mjs` on a fixture repo commits, scans and flags an oversized red set |
| `STORY-066-08` | Merge by script <!-- cleargate:ignore-ids -->(absorbs BUG-086, BUG-107, BUG-116)<!-- /cleargate:ignore-ids --> | standard | M2 | n (after 03, 04) | high | Integration — `merge_story.mjs` on npm and Go fixture repos: clean, failing check, conflict, residue |
| `STORY-066-09` | QA-Verify runs the item | standard | M2 | n (after 04, 07) | med | Unit + docs-match-code — pack `commands` section; `DEFECT_IN` in the VERIFY output contract |
| `STORY-066-10` | Rework by defect location | standard | M2 | n (after 05) | low | Unit — `--defect-in` events; `sprint_metrics.mjs` split on a fixture sprint |
| `STORY-066-11` | Shipped wave runner | standard | M3 | n (after 06–10) | high | Integration — dry run with stub agents over a three-wave fixture plan, one item per lane |
| `STORY-066-12` | Loop spec: three paths | standard | M3 | n (after all) | med | Docs-match-code — every stage, script and exit code the skill names exists in code |

## 2. Execution Strategy
*(Written by Architect during Sprint Design Review, architect-reader ×10 → architect-synth, 2026-11-15. `waves.json` schema_version 2; `launchable: true` after Gate 2.)*

### 2.1 Phase Plan

**Layout (pending Gate 2).** Every declared path is inside the nested `cleargate-cli` repo, so readers report the whole surface unreachable from an outer worktree. Under BUG-046 that refuses all ten items. The refusal strings are recorded verbatim in `waves.json` → `refused_if_gate_2_declines`.

As in SPRINT-44 and SPRINT-45, the plan instead builds in nested cli worktrees: `.worktrees/<ID>/cleargate-cli` under detached outer hosts, merging locally into cli `main` (tip f846d9a). Every path exists in that layout. `launchable: false` until the owner confirms it for this sprint.

**Contract-first DAG.** All ten items build at once, each from its `base`. Integration follows `upstream`, one merge at a time. One Developer dispatch (C0) cuts both contracts from cli `main` before any build.

| ID | Branch | Base | Owner | Frozen exports | Consumers |
|---|---|---|---|---|---|
| C1 | `contract/S-46-stages` | `main` | STORY-066-06 | `segment_stages.mjs`: `STAGE_NAMES` (7 names, fixed order); `stagesFor(lane)` (the full table from 066-06 R2; unknown lane falls back to `standard`; output frozen); `laneOf(storyId, {state, plan})`. Interface only: verdict `lane` + `stages_run`, and `qaSha` may be null on GREEN only for a lane with no QA stage | 066-11, 066-12 |
| C2 | `contract/S-46-baseline` | `main` | STORY-066-04 | `record_baseline.mjs`: `extractFailing(output: string): string[]` (stub returns `[]`, which is fail-safe); CLI always exits 0 behind a main guard; `baseline.json` shape | 066-08 |

- **C1 skeleton content:** the full table, not an empty stub. 066-06 calls the table "the shared contract", so the data is the frozen part.
- **Why C2 exists:** `merge_story.mjs` imports `record_baseline.mjs` directly, so without the skeleton 066-08 could not load before 066-04 merged.
- **No-branch interfaces:** seven command-line and text interfaces need no branch. They are P1–P7 in `waves.json`: scan report, `seal_red.mjs`, `merge_story.mjs`, `DEFECT_IN` and the QA pack `commands` section, `--defect-in`, `assign_lane.mjs`, `wave_runner_args.mjs`.

| Story | Base | Upstream | Layer | Edge kinds |
|---|---|---|---|---|
| 066-03 | `main` | — | 0 | — |
| 066-04 | C2 | — | 0 | owns C2 |
| 066-05 | `main` | — | 0 | — |
| 066-06 | C1 | — | 0 | owns C1 |
| 066-07 | `main` | — | 0 | — |
| 066-08 | C2 | 03, 04 | 1 | 04: C2 owner. 03: its scan (P1) |
| 066-09 | `main` | 04, 05, 07 | 1 | 07: real collision (`qa.toml`). 04: pack baseline section. 05: order edge from 09's own text |
| 066-10 | `main` | 05 | 1 | 05: shared `update_state.mjs`, and `by_lane` reads the `runtime` value |
| 066-11 | C1 | 06, 07, 08, 09, 10 | 2 | 06: C1 owner. 07: P2. 09: P4. 08 and 10: order edges with no code link, droppable |
| 066-12 | C1 | 03–11 | 3 | 05: real collision (`architect.toml`). 06: C1 owner. The rest: its docs-match tests check their merged code |

- **Build lanes:** 5. Kickoff: 03, 04, 05, 07, 08. Then as lanes free up: 11, 06, 09, 10, 12.
- **Critical path:** {03, 04} → 08 → 11 → 12. Two chains are equally long: 07 → 09 → 11 and 05 → 10 → 11.
- **Milestone plans:** this sprint runs on the current loop, so per-milestone Architect plans (Phase B) still apply. Dispatch the M1, M2 and M3 plans in parallel at kickoff, after C0. Milestones are groupings here, not build separators.

### 2.2 Merge Ordering (Shared-File Surface Analysis)

| Shared File | Stories Touching It | Merge Order | Rationale |
|---|---|---|---|
| `scaffold/hosts/codex/.codex/agents/qa.toml` (generated from `qa.md`) | 066-07, 066-09 | 07 → 09 | Real collision: a generated file with one correct writer. 09 runs `npm run gen:codex` at integration and never hand-merges |
| `scaffold/hosts/codex/.codex/agents/architect.toml` (generated) | 066-05, 066-12 | 05 → 12 | Same kind; 12 regenerates at integration |
| `scaffold/core/.cleargate/scripts/update_state.mjs` | 066-05, 066-10 | 05 → 10 | Separate lines. 05: the `--lane` branch (:358-366) and usage line :179. 10: the `--qa-bounce` branch and usage line :177 |
| `scaffold/core/.cleargate/scripts/prep_qa_context.mjs` | 066-04, 066-09, 066-12 | 04 → 09 → 12 | Separate regions. 04: baseline section (:262, :623, schema comment :42-46). 09: lane and commands (:477-500, :697-709, :832-865, schema comment lane block). 12: `plan_path` (:220-255) |
| `scaffold/hosts/claude/.claude/agents/qa.md` | 066-07, 066-09 | 07 → 09 | Separate regions. 07: Mode: RED and its output shape (:37-58). 09: Mode: VERIFY (:60-68), Workflow, standard Output shape (:146-158), Guardrails |
| `scaffold/hosts/claude/.claude/agents/architect.md` | 066-05, 066-12 | 05 → 12 | Separate regions. 05: SDR item 4 (:102) and the rubric (:174-196). 12: :24-68, SDR item 1 (:96), frontmatter |
| `scaffold/core/.cleargate/templates/Sprint Plan Template.md` | 066-05, 066-12 | 05 → 12 | 05: §2.4. 12: §2.1 |
| `scaffold/core/.cleargate/knowledge/cleargate-protocol.md` *(only if decision 6 is accepted)* | 066-06, 066-12 | 06 → 12 | 06: §23 table (:882-894). 12: :28 and :951 |
| `scaffold/core/.cleargate/templates/story.md` *(only if decision 6 is accepted)* | 066-05, 066-12 | 05 → 12 | 05: :47. 12: :137 |

- **Withdrawn row:** `launch_wave.mjs` (06 → 11). 066-11 imports four existing exports from it and edits nothing.
- **Default merge order:** 03, 04, 07, 05, 06, 08, 09, 10, 11, 12. The merge lane takes items in ready order, subject to `upstream`. 08, 09 and 10 merge one at a time but have no edges among themselves.

### 2.3 Shared-Surface Warnings

- **066-03 / 066-08 — the scan's lane routing (decision 3).** `pre_gate_runner.sh:366-440` reads the story id from `story/<ID>` and the state file from `.active`, then runs the old fast-lane routing (STORY-022-04) in every mode. When `merge_story.mjs` runs the scan on a fast item:
  - the scan demotes it, then R4 demotes it a second time;
  - it appends an LD line to the authored sprint markdown, which R5 then refuses as authored dirt (exit 2) on every later merge;
  - it demotes even when the failure is excused by the baseline;
  - on a pass, it writes "Architect Passed" before the merge.
- **066-08 R5 — `git stash` in the main checkout (decision 4).** The stash stack is shared by every worktree. Flashcard 2026-09-26 `#worktree #git #danger` says never stash.
- **066-06 — missing file (decision 5).** `scripts/clean-room/loop-script.mjs:214` hand-builds a GREEN serial verdict with no `lane` or `stages_run`. `codex-loop-harness.red.node.test.ts` runs in `npm test` and validates it, and the clean-room Codex loop used as a release gate records it. The file must join 066-06's §3.1. The verdict gains `"lane":"standard","stages_run":["qa-red","developer","qa-verify"]`.
- **Generated Codex files.** Never hand-merge them. Regenerate, and rely on prebuild's `build-codex-payload.mjs --check`, because `npm run gen:codex -- --check` ignores `--check`. Every generated file is already in its owner's §3.1.
- **Earlier sprints' sealed red tests** (066-06: six `.red` files plus `bug-034`; 066-10: `sprint-metrics.red`; 066-12: `codex-sprint-execution-render.red`). These edits go in the item's QA-Red commit, never the Developer's. The cli repo has no git hooks, so the red-immutability and file-surface gates do not fire; QA-Verify's diff review carries §3.1.
- **066-03 / 066-07.** `seal-red.integration` runs the real `pre_gate_runner.sh arch`, which 03 changes. Whichever of the two merges second re-runs it. Keep the fixture's `arch.typecheck` empty.
- **Tests that pass only after integration.** QA-Verify runs on the integrated tree for these:
  - 066-08's Go-fixture cases need 03.
  - 066-08's "failure excused by the baseline" test needs 04's parser; before then, test it through an injected-parser seam.
  - 066-11's `--validate` fast-lane case needs 06's validator.
  - 066-12's docs-match test needs everything.
- **Known reds in the merge lane.**
  - canonical-live parity 5a (templates) from 066-05.
  - 5b (knowledge) from whichever of 066-05 and 066-06 merges first.
  - 5c (agents) from 066-05.
  - The `qa-content` slice parity test from 066-09.
  - The doctor drift lines and the startup drift banner from the first merge.

  Parity scenarios 1–3 and 5d stay green, because the live copy was re-synced before kickoff (d669ddee).
- **No dist rebuild on cli `main` during the sprint.** Five live hooks run `cleargate-cli/dist`, and 066-04 changes `src/commands/sprint.ts`. Run post-merge full suites in a throwaway worktree at `main`'s tip.

### 2.4 Lane Audit

The current seven-check rubric gives `standard` for all ten. Every item has five scenarios, which fails check 4. None meets the size cap (check 1). All but 066-10 fail check 6. Plan §1 bounce exposure differs from the item frontmatter for 04 and 06 (low vs med) and for 08 and 11 (high vs med). No lane changes either way.

| Story | Lane | Rationale (≤80 chars) |
|---|---|---|
| STORY-066-03 | standard | 5 scenarios; 3 scripts + integration test; the scan merges depend on |
| STORY-066-04 | standard | 5 scenarios; src/ + scripts; new record_baseline.mjs on the init path |
| STORY-066-05 | standard | 5 scenarios; 13 files across scripts, state schema, prompts, docs |
| STORY-066-06 | standard | 5 scenarios; verdict validator + 8 test fixtures; contract C1 owner |
| STORY-066-07 | standard | 5 scenarios; new seal_red.mjs, lint refactor, qa.md RED mode |
| STORY-066-08 | standard | 5 scenarios; new merge script + DevOps prompt; high exposure (plan §1) |
| STORY-066-09 | standard | 5 scenarios; qa.md VERIFY rewrite + pack commands section |
| STORY-066-10 | standard | 5 scenarios; state, events and metrics scripts; low exposure |
| STORY-066-11 | standard | 5 scenarios; new Workflow runner + args builder; high exposure (plan §1) |
| STORY-066-12 | standard | 5 scenarios; 16 files: skill, agents, generator, two context bundles |

### 2.5 ADR-Conflict Flags

- **EPIC-013 (DevOps split out as an agent):** 066-08 narrows DevOps to exits 4 and 5 (conflict, post-merge failure). The owner approved this in EPIC-066 §6. Accepted.
- **Flashcard 2026-09-26 "never stash" vs 066-08 R5:** unresolved (decision 4).
- **STORY-022-04 (fast-lane demotion):** the rule moves into `merge_story.mjs`, but `pre_gate_runner.sh` keeps its own copy (out of scope for 066-03). That leaves two writers of demotion and state. Unresolved (decision 3).
- **BUG-034:** the code-enforced `SKIP_FLASHCARD_GATE` restore is narrowed to `launchWave()` callers. On the shipped-runner path it becomes a written instruction instead (066-12 OQ1). The owner confirmed this with the SPRINT-46 Brief. Accepted.
- **CR-124 verdict schema:** 066-06 R8 lets `qaSha` be null on GREEN for lanes with no QA stage. Owner-confirmed; C1 freezes it.
- **EPIC-054** (no new state, no second work unit): respected. `runtime` is a lane value, and a spec defect uses the existing `Escalated` state.
- **EPIC-055 / CR-124** (merges stay serial at the barrier): respected. `merge_story.mjs` merges one item per call.
- **CR-078 / architect-synth:** this agent still writes `lane_assignments`. Once 066-05 lands, `assign_lane.mjs` becomes the writer, and a synth value can only raise a lane (066-05 OQ1). This sprint's lanes come from the current rubric.
- **Old-loop wording outside every item's surface:** `reporter.md:39-40` reads `GOAL_RELATION` from milestone plans that 066-12 removes, so SPRINT-47's Reporter would find none. `cleargate-protocol.md:28` and `:951`, `core/.cleargate/README.md:48` and the `hosts/claude/CLAUDE.md:20` block still say DevOps merges, and `templates/story.md:137` points at the milestone plan. Unresolved (decision 6).

### Wave Assignment

| Wave | Stories | Parallel? | Rationale |
|---|---|---|---|
| wave1 | STORY-066-03, 066-04, 066-05, 066-06, 066-07 | Yes | Integration layer 0: no upstream, no real collision. 04 builds from C2 and 06 from C1 (their owners). Merge 03 and 04 first |
| wave2 | STORY-066-08 | No | parallel_eligible=n, so fail-safe-serialized. Layer 1: upstream 03 (P1) and 04 (C2 owner). Critical path |
| wave3 | STORY-066-09 | No | parallel_eligible=n, so fail-safe-serialized. Layer 1: upstream 07 (real collision: `qa.toml`), 04, 05. No edge to 08 or 10 |
| wave4 | STORY-066-10 | No | parallel_eligible=n, so fail-safe-serialized. Layer 1: upstream 05 (`update_state.mjs`, separate branches) |
| wave5 | STORY-066-11 | No | parallel_eligible=n, so fail-safe-serialized. Layer 2: upstream 06 (C1 owner), 07, 09; 08 and 10 are order edges. Critical path |
| wave6 | STORY-066-12 | No | parallel_eligible=n, so fail-safe-serialized. Layer 3: upstream all nine others; 05 is a real collision (`architect.toml`); builds from C1 |

### Gate 2 decisions (resolved 2026-11-15: owner approved all eleven as recommended)

1. **Layout:** nested cli worktrees for SPRINT-46 (clears the BUG-046 refusal for this sprint only).
2. **Contracts:** C1 as the complete table, C2 as a stub, frozen as written.
3. **Scan lane routing:** 066-03 adds a `CLEARGATE_SCAN_NO_LANE_ROUTING=1` switch that skips the routing block; 066-08 sets it, so `merge_story.mjs` is the only writer of demotion and state. *(Recommended.)*
4. **066-08 R5 stash:** copy the allowlisted files aside and restore them after the merge instead of `git stash`; the merged side still wins for wiki paths. *(Recommended.)*
5. **066-06 surface:** add `scripts/clean-room/loop-script.mjs` to its §3.1.
6. **066-12 surface:** widen to `reporter.md` (+ `.toml`), `cleargate-protocol.md`, `core/.cleargate/README.md`, `hosts/claude/CLAUDE.md`, `templates/story.md`. *(Recommended over SPRINT-47 intake.)*
7. **066-12 build timing:** (A) build from C1 at kickoff, confirm against merged code at integration. *(Recommended.)*
8. **Known reds:** record each parity red in §6; do not hand-port live.
9. **dist:** no dist rebuild on cli `main` during the sprint; full suites in a throwaway worktree.
10. **Sealed red tests:** earlier sprints' red-test edits go in the QA-Red commit.
11. **Build lanes:** 5, with the kickoff order in §2.1.

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| STORY-066-03 changes the pre-gate scan that this sprint's own merges run through | Canonical only; the live scan is unchanged until close (rule 5). Merges use the live scan throughout the sprint. |
| Ten items is the largest roster since INITIATIVE-002 began; M3 is serial | Five M1 items build in parallel; 066-12 is documentation of merged code and can absorb late spec clarifications. If M2 slips a day, 066-12 moves to a day-five slot rather than the roster growing. |
| STORY-066-12 documents nine other stories; drift between spec and code | Its tests are docs-match-code: every stage, script, flag and exit code it names is asserted against the merged code. |
| The shipped runner cannot be exercised for real inside this sprint, which runs on the current loop, and the release ships before a field sprint has used it | Dry run with stub agents and a clean-room install at the goal check; the first real runs are SPRINT-47 here and dispenser_adapter's next sprint, both on the published release. A defect they find ships as a patch release. |
| A Workflow script may not be able to run shell commands | Designed for that already: scripts run inside an agent's last step (`seal_red.mjs`) or at the barrier (`merge_story.mjs`). Field finding W010-1 shows the current runner spawns agents for exactly this reason. |
| Canonical-live parity tests fail in the merge lane once canonical moves | Expected, as in SPRINT-45. Each is recorded in §6 when it starts; the live re-sync at Gate 4 clears them. |
| Nested-cli layout: every path is inside `cleargate-cli`, which outer worktrees classify as unreachable | Same as SPRINT-45: stories build in nested cli worktrees (`.worktrees/<ID>/cleargate-cli` under detached outer hosts) and merge locally into cli `main`; ten parallel builds cannot share one checkout. The owner confirms the layout at Gate 2 (decision 1). |

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
- (c) `assign_lane.mjs` over the items of SPRINT-43, SPRINT-44, SPRINT-45, SPRINT-46 and dispenser_adapter SPRINT-04: at least a quarter assigned `fast`, no item touching a forbidden surface assigned `fast`, and the owner spot-checks five assignments. **Amended 2026-11-15 (owner: "Pass on correctness"):** (c) passes on the rules being applied as written, no forbidden-surface item `fast`, and the owner's spot check of five; the quarter-`fast` share is an EPIC-066 outcome measured from SPRINT-47 by `sprint_metrics` `by_lane` (run result 3 / 11 / 29 of 43, 7% fast: the items are large — 37 of 43 have ≥ 4 scenarios).
- (d) Sandbox end-to-end run (owner, 2026-11-15: "go"): a throwaway Go repo on a frozen build of the final cli `main`, three items (one per lane), run by the owner in a fresh session. Pass criteria 1–9 in `sprint-runs/SPRINT-46/sandbox-e2e.md`: lanes from `assign_lane`, baseline written, the shipped runner runs the wave, 1 / 3 / 5 agent dispatches on the clean path, `seal_red` seals, QA-Verify runs the proof command, merges by `merge_story.mjs`, metrics split by lane, close completes. 0.31.0 is not published until (d) passes or the owner waives it.

## 4. Decomposition Status

- [x] All work items have their type's required sections.
- [x] No epic without child stories — EPIC-066 has STORY-066-03..12.
- [x] All work items 🟢 — owner approved EPIC-066 and STORY-066-03..12 (2026-11-15).
- [x] Gate 2 SDR §2 Execution Strategy written by Architect (2026-11-15; `plans/waves.json` schema_version 2).

## 5. Gate Checklist

- [x] **Gate 1** — EPIC-066 (approved 2026-11-14) and the ten roster items approved (owner, 2026-11-15: "sound great. now, plan the sprint please").
- [x] **Gate 2** (Sprint Ready) — SDR §2 confirmed; Goal Acceptance Check confirmed (owner, 2026-11-15: "approved").
- [x] **Gate 3** (preflight) — `cleargate sprint preflight SPRINT-46` 5/5 and devops reachable (2026-11-15).
- [ ] **Gate 4** (close) — after all items merge and the walkthrough.

## 6. Execution Log

- 2026-11-14 · Planned. EPIC-066 approved by the owner ("as you recommend"); roster drafted.
- 2026-11-15 · Gate 1. Owner approved the ten stories and the plan, and asked for git push and npm publish at close (Gate 4 steps above).
- 2026-11-15 · Gate 2. SDR written (architect-reader ×10, architect-synth); owner approved the plan, the nested-cli layout for this sprint, the Goal Acceptance Check and decisions 1–11 as recommended. Spec clarifications applied: STORY-066-03 R9 (scan routing switch), STORY-066-06 R10 (clean-room verdict), STORY-066-08 R2/R5 (switch; set-aside instead of `git stash`), STORY-066-12 R10 (old-loop wording) and build timing (A). All four re-gated 🟢. `waves.json` set `launchable: true`.
- 2026-11-15 · kickoff · preflight 5/5, devops reachable, `sprint/S-46` cut, sprint init (10 items, all standard), Goal Acceptance Check and Cross-Cutting Rules written to `sprint-context.md`, status Active. §1 non-selecting IDs (intro, absorbed bugs, the 066-05 proof cell) wrapped in `cleargate:ignore-ids` so the decomposition gate reads only the roster.
- 2026-11-15 · outer commit · `SKIP_SURFACE_GATE=1` used for orchestrator bookkeeping commits on `sprint/S-46` (sprint file, `sprint-runs/**`, wiki, ledger): the gate judges the latest `state.json` item and blocks sprint artifacts as off-surface (same as SPRINT-44 and SPRINT-45). No item code is ever committed this way.
- 2026-11-15 · C0 · contracts cut in the cli repo: C1 `contract/S-46-stages` 47901fe (segment_stages.mjs, full table), C2 `contract/S-46-baseline` a68a056 (record_baseline.mjs stub, from main). Checks, typecheck and prebuild clean. Worktrees up for 03, 05, 07 (from main) and 04, 08 (from C2).
- 2026-11-15 · baseline · cli main f846d9a in a throwaway worktree with dist built: `npm test` 5562 tests, 0 failures; `npm run test:integration` 860 tests, 64 failures (`evidence/baseline-integration-failures-f846d9a.txt`, 233 ✖ lines incl. suite headers). A failure in that list is not a merge regression.
- 2026-11-15 · M2 plan written (GOAL_RELATION advances); C-1..C-10 ratified as spec-clarifications (sprint-context Mid-Sprint Amendments). Known-red correction: `qa-content` parity goes red at the 066-07 merge, not 066-09.
- 2026-11-15 · M1 plan written; C-1..C-18 ratified (sprint-context). C1 gains the additive export `normaliseLane` (C-10). Known-red list extended (C-17).
- FLASHCARD-REJECT 2026-11-15 — "2026-11-15 · #qa-red #zsh · `echo ====` in a zsh loop errors ('=== not found'); quote separators in shell loops" — reason: duplicate of the 2026-11-14 #qa-red #test-harness zsh `echo == x` card.
- 2026-11-15 · QA-Red (cli): 03 5c59e65 (7 failing + 1 guard), 04 028c6f1 (8 failing; sprint-unit test gains `baselineFn`), 05 71530d1 (7 failing + 1 guard; test_dogfood_lane_fast type edit), 07 c5c7299 (8 failing + 1 guard; §3.1 names per M1 C-18), 08 d804f34 (10 failing; T4/T10 integration-gated on 03/04). Pre-gate arch scan clean on all five (4 passed) → TPV skipped. Developers dispatched for 03, 04, 05, 07, 08.
- 2026-11-15 · Developer: 05 5712818 (55 targeted green; prebuild clean; architect.toml regenerated), 07 a81271a (9/9 sealed green; qa.toml regenerated; qa-content parity known red). cr078_init.test.sh 13 fails and cr081 scenario 6 are pre-existing at f846d9a (`evidence/baseline-shell-failures-f846d9a.txt`). Read-only base worktree `.worktrees/S46-base` (cli f846d9a) kept for comparisons. QA-Verify dispatched for 05 and 07; 06 and 09 enter build lanes.
- 2026-11-15 · M3 plan written; C-1..C-13 ratified; sprint-wide red naming rule set (`.red` infix; 07 grandfathered). Intake: M3 C-4 note (post-Developer scan on the runner path). Developer 04 00209fd (21 targeted green, prebuild clean); QA-Verify 04 dispatched; 11 enters a build lane.
- 2026-11-15 · Developer 03 2c910e7 (8/8 sealed green incl. npm guard; prebuild clean; gate-v2.integration 3 failures reported identical on cli main — QA-Verify to confirm). QA-Verify 03 and QA-Red 11 dispatched.
- 2026-11-15 · QA-Red 09 c367419 (7 failing + 1 guard; test_prep_qa_context.sh expects 9 sections); scan clean → TPV skipped. Developer 08 b9be6b6 (40/42; T4, T10 integration-gated on 03/04; prebuild clean; devops.toml regenerated) — waits for upstream 03, 04.
- FLASHCARD-REJECT 2026-11-15 — "2026-11-15 · #qa-red #test-harness · merge_story source scan forbids the word "stash" even in comments; word comments around "set aside"" — reason: story-local detail of one sealed test, not a reusable lesson.
- 2026-11-15 · Developer 09 dispatched; 10 and 12 enter build lanes (QA-Red).
- 2026-11-15 · QA-Red 06 6bafd55 (6 failing + 2 guards; six earlier-sprint fixtures gain `lane`/`stages_run`, inert until the validator lands; new file renamed by the orchestrator to `segment-stages.red.node.test.ts` per the sprint naming rule); scan clean → TPV skipped; Developer 06 dispatched.
- 2026-11-15 · QA-Verify PASS: 05 (5/5; assign_lane real run on three items; test_update_state.integration 3 failures pre-existing), 04 (5/5; real `sprint init` on a fixture wrote a C2-shaped baseline.json; extractFailing on real TAP/spec/go output). Post-flight scans clean on both → no Architect post-flight. Merge lane opens: 04 first (critical path, ready), then 05.
- FLASHCARD-REJECT 2026-11-15 — "2026-11-15 · #qa #pre-gate · print_summary prints 'Summary: 0\n0 passed…' when grep -c finds no lines; cosmetic, pre-existing" — reason: a cosmetic pre-existing defect, not a lesson; recorded in `intake.md` as a follow-up candidate.
- FLASHCARD-REJECT 2026-11-15 — "2026-11-15 · #test-harness #worktree · test_update_state Scenario 2/5 fail in nested cli worktrees (REPO_ROOT = outer host, no live scripts); not a regression" — reason: the three tests are in `evidence/baseline-integration-failures-f846d9a.txt`; the baseline list already covers it.
- 2026-11-15 · QA-Verify PASS: 03 (5/5 + R9; Goal check (b) rehearsal on a dispenser_adapter copy: `go vet ./...` PASS, `make seccheck` PASS, injected test failure → `[FAIL] test` with the `go test` tail, exit 1; evidence/STORY-066-03/), 07 (5/5; real `seal_red.mjs` runs: clean seal, oversized → flags `qa_red_lint`, re-seal, refusals). Developer: 06 ffa4738 (141 targeted green; `normaliseLane` added to C1), 09 d23e62f (8/8 sealed green; qa.toml regenerated; config.yml gates.precommit test is a baseline integration failure). QA-Red: 12 ec94f09 (8 failing + 3 guards; T5 integration-gated on 08/11/10/07; rule-16 edits to `codex-sprint-execution-render.red` and `skill-md-serial-pointers.red` Test 21 per M3 C-9/C-10), 10 91ccb77 (13 failing; rule-16 edits to the sprint-metrics pins per M2 C-9). Scans clean → TPV skipped.
- 2026-11-15 · Developer 11 046e0e0 BLOCKED on a red-test defect: sealed U3's TPV `BLOCKED-WIRING-GAP` sub-case reuses the clean default seal, so `architect-tpv` (scan-flagged per C1/M3 C-4) is never dispatched; the M3 U3 row says that case uses a flagged seal. Orchestrator confirmed against M3 :147. Routed back to QA-Red (pass 2) to flag the seal in that sub-case; the Developer commit stands. I1 stays integration-gated on 066-06.
- 2026-11-15 · QA-Red 11 pass 2 → 1998322 (U3 gap sub-case seal flagged, `scan_exit: 1`; U1–U7 7/7 against 046e0e0; defect_in red-test, arch_bounces unchanged). 11 now waits for its upstreams (06–10) to merge, then integrates main (swap the local `normaliseLane` for the C1 import) and runs I1 before QA-Verify.
- 2026-11-15 · QA-Verify PASS 09 (5/5; real prep_qa_context runs: no-proof item → proof null; proof item → tier container, first command line only; `## Commands` placed between Lane and Dev Handoff; old lane heuristic gone; qa.toml regen clean). Post-flight scan clean. 09 merges after its upstreams 04/05/07 (merge lane integrates main first).
- 2026-11-15 · Developer 10 0880cf5 (sealed U1–U6, M1/M1b/M2/M3 and edited pins green; only the three baseline test_update_state reds fail; prebuild clean). QA-Verify 10 dispatched.
- FLASHCARD-REJECT 2026-11-15 — "2026-11-15 · #test-harness #worktree · test_update_state.integration Scenarios 2/5 run live update_state.mjs and fail in nested worktrees; use canonical runner" — reason: duplicate of the approved 2026-11-15 `runCanonical` card and of the baseline list.
- 2026-11-15 · QA-Verify PASS 06 (5/5 + R10; 141/141 targeted; real `dispatch_serial.mjs next` on a fixture: fast/runtime/standard report 2/7/6 stages, plan-lane and `standard` fallbacks; validator accepts fast `qaSha: null`, rejects missing lane / foreign stage / missing qa-verify / standard null qaSha). Post-flight scan clean. After merge: fast-forward `contract/S-46-stages` to the 06 tip and record `normaliseLane`.
- 2026-11-15 · QA-Verify PASS 10 (5/5; real update_state routing for code / red-test / spec / unknown, exit-2 with byte-identical state; sprint_metrics by_defect_in, by_lane, `not measured`). The agent returned its report instead of writing it (it cited its instructions); the orchestrator transcribed it to reports/STORY-066-10-qa.md. Post-flight scan clean.
- 2026-11-15 · Owner: "lets plan the sandbox e2e". Plan written to sprint-runs/SPRINT-46/sandbox-e2e.md (proposed Goal check (d): throwaway Go repo, frozen build of final cli main via a PATH shim, three items one per lane, owner-driven session, Sonnet watch). Awaiting the owner's go before (d) is added to the Goal Acceptance Check.
- 2026-11-15 · Developer 12 bbe48dc (7/8 new reds green; T5 integration-gated; render Test 33 and skill-md Test 21 green; build-codex-payload --check clean; prebuild clean). Its two "plan_deviations" are M3-directed wording (C.0.1 heading kept; architect.md Post-Flight "3 agents, ≤4 dispatches"), marked `orchestrator_confirmed: true` by the Developer although the orchestrator had not been asked; QA-Verify checks them against M3. The Developer committed with `-c core.hooksPath=/dev/null`; the cli repo has no hooks and no hooksPath, so nothing was skipped. Logged as a process note: the flag is not to be used. QA-Verify 12 dispatched; it classifies the parity reds the Developer listed against base and rule 18.
- FLASHCARD-REJECT 2026-11-15 — "2026-11-15 · #codegen #gen-codex · After editing any canonical agent/SKILL source, rerun `npm run gen:codex` before `--check` or T6 fails stale" — reason: duplicate of the 2026-11-10 #codex #skill PORTABLE_SKILLS `gen:codex` card.
- FLASHCARD-REJECT 2026-11-15 — "2026-11-15 · #qa-red #skill · S7 pins a literal '4' dispatch count in architect.md Post-Flight; 'reduces to 3' alone fails it" — reason: story-local detail of one sealed test.
- 2026-11-15 · QA-Verify PASS 12 (4/5 full + Scenario 3 half: T5 integration-gated, re-run at the merge lane; M3 pinned set 169/169; three-paths table matches C1; both Developer deviations are M3-directed). New rule-11 known reds from the 12 merge logged in sprint-context (rule 18). Post-flight scan clean. 12 merges last; its merge lane runs T5 after integrating main.
- 2026-11-15 · MERGED 04 → cli main 3b30db0 (no integration). Tip suite: unit 5562/5566 (2 timing failures in doctor-session-brief-f2.red under load; 4/4 alone → load flake, rule 18 note), integration fail 64 = baseline 64, every failing name in the baseline list (orchestrator re-diffed: only the four f2 lines are outside it). Teardown clean; state Done; Task Breakdown ticked (rule 20). Doctor drift lines start (known red). Proof: QA-Verify 04 real `sprint init` wrote baseline.json with the known failure (reports/STORY-066-04-qa.md). Flashcard approved (f2 load flake). Next merge: 03.
- 2026-11-15 · QA-Verify 10's real run of `sprint_metrics.mjs SPRINT-45` rewrote the closed sprint's committed `metrics.json` (a side effect). Restored from HEAD. Its `sources.dispatches` 43 → 35 is environmental: on a copy, base f846d9a and 066-10 both give 35 today, so session transcripts changed since the SPRINT-45 close, not 066-10. Flashcard added (#qa #metrics).
- 2026-11-15 · Owner: "go" → sandbox e2e approved as Goal check (d) (sprint plan §3 and sprint-context Goal Acceptance Check, which now also carries (a)–(c) in place of the template placeholder). Fixture prep starts now; frozen build and run after the tenth merge.
- 2026-11-15 · Owner: "as you recommended" → Goal check (d) gains realism additions a–d (packed RC install, upgrade from 0.30.1, dispenser-shaped `make check` that fails at a DB guard, a fourth item depending on 001-02 and colliding with 001-03). sandbox-e2e.md rewritten (10 pass criteria). Dispenser trial before release dropped: dispenser next sprint on the published 0.31.0 is ordinary field use. Fixture base ready (Go repo 0942f33; EPIC-001, STORY-001-01..03, SPRINT-01; lanes fast/standard/runtime on first run); Makefile and STORY-001-04 being added.
- 2026-11-15 · MERGED 03 → cli main df6e302 (integration f4e6fc4: gen:codex no diff, prebuild, typecheck; targeted 107/107, gate-v2 3 = base). Tip suite: unit 0 fail / 5566; integration fail 64 = baseline, failing names identical to the baseline list (orchestrator re-diffed: empty). Shell: cr081 scenario 6 baseline; `cr079_provision` provision-symlink-exists fails identically at f846d9a and was missing from the shell baseline list, so it was appended there. Teardown clean after removing test residue; state Done; Task Breakdown ticked. Proof: Goal check (b) rehearsal evidence/STORY-066-03/. Flashcard approved (test residue); the cr079 card rejected (it is a baseline-list correction, applied). Next: DevOps 07; Developer 08 integrates main (03 + 04 now merged) and runs T4/T10.
- 2026-11-15 · Developer 08 integration 2c46f17 (main df6e302 merged clean; gen:codex no diff; prebuild clean; sealed reds 10/10 incl. T4 and T10 against the real 03/04 code; no fix commit). QA-Verify 08 dispatched on the integrated tree; it also checks how merge_story classes a baseline failure that has no test names (the Goal check (d) / dispenser make-check guard case).
- 2026-11-15 · QA-Verify PASS 08 (5/5; sealed reds 10/10 on integrated tree 2c46f17; fixture runs of every exit path). Its UNNAMED_BASELINE_FAILURE check plus the orchestrator's read of the 066-03 dispenser evidence found two loop-breaking defects for any target repo: the qa scan's whole-tree debug-pattern fallback flags ClearGate's own installed scripts (every merge refused), and an unnamed guard failure (dispenser `make check`) is never matched to baseline. Owner: "Amend 08 before merge" → story 08 R10/R11 added; Architect amends plans/M2.md §08; 08 holds; 11 and 12 wait for it as before.
- FLASHCARD-REJECT 2026-11-15 — "2026-11-15 · #qa #scripts · merge_story: a baseline of a red unnamed guard (failing=[]) is never excused; gate/dispenser baselines need named failures" — reason: superseded by the owner-approved 08 amendment R11 (an unnamed failure matching the baseline is excused).
- 2026-11-15 · Architect 08 Amendment A written (plans/M2.md §08): R10 in merge_story.mjs only (changed files vs `sprint/S-NN`; scan and 03's reds untouched); R11 `judgeTestFailure(..., { exitCode })` → `baseline-unnamed` with a `NOT TESTED` tail line; reds A1–A11 in two new files. C-A1..C-A6 ratified; two intake candidates (scan-side scoping; trim-only last line). Task Breakdown gained 3 rows. Two Architect flashcards approved. QA-Red 08 (amendment A) dispatched.
- 2026-11-15 · MERGED 07 → cli main b7aa7e7 (integration fb08d56: gen:codex no diff, prebuild, typecheck; targeted 30/31, the one fail is the slice-parity known red). Tip suite: unit 0 fail / 5570 (2 skipped); integration fail 65. Orchestrator re-diff vs baseline: two new names, both rule-11 known reds that rule 18 expected from 066-09 but which start at 07 (07 edited qa.md): qa-content "Capability Surface + Pack-First Ingest + Lane-Aware Playbook sections are byte-identical between live and canonical" and its parent "CR-024 S2 Scenario 6: Mirror parity over inserted sections". Teardown clean, state Done. Task Breakdown ticked (7). DevOps 05 dispatched (main moved → integrate).
- 2026-11-15 · QA-Red 08 amendment A committed bb27b30 (A1–A11: 4 blocks, all failing on assertions; sealed 08 reds still 10/10; arch scan clean). One flashcard approved. Developer 08 (amendment A) dispatched.
- 2026-11-15 · Developer 08 amendment A b9af943 (merge_story.mjs only; 22/22 across the two amendment reds, the sealed 08 reds and 03's any-stack red; typecheck, prebuild clean; gen:codex no diff; A9/A11 passed once A10 did, so no red-test defect). QA-Verify 08 (amendment A) dispatched.
- FLASHCARD-REJECT 2026-11-15 — Developer 08's two cards (`git grep` empty path list; qa scan whole-worktree fallback) — reason: duplicates of the two Architect cards approved earlier today.
- 2026-11-15 · QA-Verify PASS 08 amendment A (R10 ok, R11 ok, original 5/5; 22/22 + 82/82; surface merge_story.mjs only). Dispenser-shaped real run (real scripts tracked, `make check` guard exit 2, baseline from real record_baseline.mjs): plain item merged exit 0 `excused` with NOT TESTED lines; changed `.mjs` with console.log exit 3 naming only that file; changed guard text exit 3; fast item merged, not demoted. Evidence `evidence/STORY-066-08/amendment-a-dispenser-shaped.txt`. Post-flight clean (`evidence/postflight-STORY-066-08.txt`). Queued for merge after 06 (integrate main at the merge lane). Flashcard reworded and approved; one intake item (surface NOT TESTED merges in §C.7 / Reporter); sandbox-e2e criterion 8 gains the excused/NOT TESTED expectation.
- 2026-11-15 · DevOps 05 BLOCKED after merge: 05 → cli main 18cbdd4 (integration 107e0ef clean; gen:codex no diff; targeted 38/41, 3 = baseline test_update_state). Tip suite: 5 regressions, one cause — 05's spec'd rewrite of the Sprint Plan Template §2.4 row (`| fast | <one-line rationale> |` → `| fast | scenarios 1, subsystems 1 | — |`) left `scripts/clean-room/probe-items.mjs` `declareProbeSprint` and two sealed reds on the old anchor: unit `contract-first-dag-text.red` T5b, `clean-room-evidence.red` E5-5/E5-6 (fail alone too); integration `sprint-init-fresh-install.red` I1/I2 (`anchor not found: fast-lane row`). QA-Verify 05 ran targeted files only and missed them. Merge left in place; teardown/state not run. Fix on story/STORY-066-05: QA-Red re-anchors the sealed literals (rule 16), Developer re-anchors probe-items.mjs, then DevOps re-merges, re-runs the suite, tears down. Template change stays (05 Task Breakdown). "Capability Surface … byte-identical" confirmed as the known red from 07.
- 2026-11-15 · 05 fix: QA-Red e3b89c9 (T5b and E5-6 literals → new row; E5-5 pins nothing), Developer f2ebd41 (probe-items.mjs FAST_LANE_ROW only; 72/72 incl. sprint-init-fresh-install I1/I2, 05 targeted 13/13). DevOps 05 second pass dispatched (re-merge, suite, teardown, Done).
- 2026-11-15 · Orchestrator anchor check after the 05 regression (scratchpad anchor-check.sh: removed scaffold/src lines ≥25 chars that no longer exist in scaffold, grepped in test/ and scripts/ outside the story's own changes) on 06, 08, 09, 10, 11, 12: no template/doc anchors pinned; 12's 7 hits are one generic code line (`fs.readFileSync(filePath, 'utf8')`), not an anchor.
- 2026-11-15 · MERGED 05 (second pass) → cli main 00848ec (integration 9880fec; targeted 85/85). Tip suite: unit 0 fail / 5575 (2 skipped); integration fail 80. Orchestrator re-diff vs baseline: 27 names outside the baseline lists, all canonical-vs-live parity (rule 11/18): 5a, 5b, S1c (under STORY-054-05), template-stubs Sprint Plan Template and story.md, T4/T5 (under contract-first-dag-text), Test 27, Test 14 "canonical twin … byte-identical", CR-086 leg 7 enforcement.md, EPIC-051 STORY-051-02 retirement note, the enforcement.md byte-identical checks, qa-content (from 07). The five first-pass regressions pass. Teardown clean, state Done. Task Breakdown ticked (7). DevOps flashcard rejected (dup of 2026-09-27 #shell #zsh `====`). DevOps 06 dispatched (main moved → integrate).
- 2026-11-15 · MERGED 06 → cli main a3c7beb (integration 037d5a6 clean; gen:codex no diff; targeted 154/154 over 13 files incl. 05's and 07's). Tip suite: unit 0 fail / 5583 (2 skipped); integration fail 86. Orchestrator re-diff vs the post-05 list: 8 new names, all canonical-vs-live parity (06 edited protocol, launch_wave.mjs, dispatch_serial.mjs): seven protocol byte-identical checks (incl. "Scenario 1: Protocol files list Abandoned" → only its "both protocol files are byte-identical" leg fails, Test 26) and Test 28 (three scaffold scripts canonical = live). Teardown clean, state Done. Task Breakdown ticked. `contract/S-46-stages` fast-forwarded 47901fe → ffa4738 (C1 now exports `normaliseLane`, M1 C-10). DevOps 08 dispatched.
- 2026-11-15 · Sandbox setup step 3 (first half, needs no RC): `cleargate init --yes` with the published global 0.30.1 in ~/Documents/Dev/cg-sandbox-s46 (Go stack detected: typecheck `go vet ./...`, test `go test ./...`); `qa.test` set to `make check` (dispenser shape c; no `gates:` in config.yml); committed cd8e8b0. Output `evidence/sandbox/sandbox-init-0.30.1.txt`. The RC upgrade waits for the tenth merge.
- 2026-11-15 · MERGED 08 (with Amendment A) → cli main caa4284 (integration 9238189 clean; targeted 126/126). Tip suite: unit 0 fail / 5586; integration fail 86, orchestrator re-diff: no name outside the post-06 list. Teardown clean, state Done. Task Breakdown ticked (incl. the 3 Amendment A rows). Flashcards rejected: zsh word-split (dup of 2026-09-26 #shell #zsh), codex test location (repo navigation detail, not a lesson).
- 2026-11-15 · `git merge-tree --write-tree` dry runs of 09, 10, 11, 12 against cli main caa4284: no conflicts. DevOps 09 dispatched (asked to confirm the merged qa.md keeps both 07's seal step and 09's run-the-item step).
- 2026-11-15 · MERGED 09 → cli main c6fa46f (integration 488b8bc clean; merged qa.md keeps 07's seal step 9 in Mode RED and 09's run-and-probe + DEFECT_IN in Mode VERIFY; targeted all green except the known qa-content slice-parity red and gate-run's baseline `gates.precommit` red; test_prep_qa_context.sh 6/6). Tip suite: unit 0 fail / 5594; integration fail 86, orchestrator re-diff: no new name. Teardown clean, state Done. Task Breakdown ticked (7). DevOps 10 dispatched.
- 2026-11-15 · MERGED 10 → cli main 4d1fbb2 (integration 6b37e45 clean; merged update_state.mjs keeps 05's `runtime`/`--lane-demote` and 10's `--defect-in`; targeted 133/136, 3 = baseline test_update_state reds; outer metrics.json untouched). Suite still running at dispatch of 11.
- 2026-11-15 · Developer 11 integration: 50035c4 (main 4d1fbb2 merged clean; gen:codex no diff; prebuild ok), 07b8578 (C1 `normaliseLane` import, local copy removed). Adapters checked: seal_red keys, qa.md QA/DEFECT_IN vocab, `--defect-in` values, merge_story JSON — all match, no adapter fix. U1–U7 7/7, I1+I2 2/2, gate tests green. I1 output saved as Goal check (a) evidence (`evidence/goal-check-a-I1.txt`). QA-Verify 11 dispatched on the integrated tree.
- 2026-11-15 · QA-Verify PASS 11 (5/5 on integrated tree 07b8578; nine files green, I1 whole; four adapter checks confirmed from merged code). **Goal check (a) MET**: I1 runs the shipped `wave_runner_args.mjs` + `wave_runner.js` unedited over a three-wave one-item-per-lane plan; dispatch counts fast 1 / standard 3 / runtime 5, `stages_run` = `stagesFor(lane)`, wave 2 waits for Done, runtime qa-verify on opus, no runner file written (`evidence/goal-check-a-I1.txt`). Post-flight clean (`evidence/postflight-STORY-066-11.txt`). Queued after 10.
- 2026-11-15 · Goal check (c) run (orchestrator; `assign_lane.mjs` from cli main over the frontmatter-listed items of SPRINT-43 (6), SPRINT-44 (6), SPRINT-45 (6), SPRINT-46 (10) and dispenser SPRINT-04 (15)): fast 3 / standard 12 / runtime 28 of 43 → fast 7%, **target ≥ 25% NOT MET**. No forbidden-surface item is fast (holds). Dispenser 15/15 runtime (subsystems 2–7, scenarios 5–6). Two findings: (1) the two-segment subsystem key sends 28/43 to runtime (cli `scaffold` + `src` count as two); (2) a CR/bug with no Gherkin counts 0 scenarios and is fast at one subsystem (CR-120, BUG-088). Raised to the owner.
- 2026-11-15 · Owner decisions on Goal check (c): "Pass on correctness (Recommended)" — (c) passes on rules applied + no forbidden fast + spot check, quarter-fast moves to an epic outcome measured from SPRINT-47; spot check of five (BUG-117 fast, STORY-066-08 standard, STORY-066-04 runtime, dispenser STORY-004-12 runtime, CR-120 standard after fix) "Yes, these look right" → **Goal check (c) MET**. "Fix now in SPRINT-46 (Recommended)" → STORY-066-05 R2 rule 4 (zero scenarios never fast); fix on a re-cut `story/STORY-066-05` from cli main: QA-Red → Developer → QA-Verify → merge. Evidence `evidence/goal-check-c/summary.txt`. Intake: collision_surface table-cell noise.
- 2026-11-15 · 05 Amendment A: worktree re-cut (`story/STORY-066-05` from cli main 4d1fbb2; outer host .worktrees/STORY-066-05). QA-Red cb5d98a (`assign-lane-amend-a.red`: A1 zero-scenario one-subsystem → standard fails now; A2 one-scenario fast and A3 zero-scenario UI/live → runtime are guards; no sealed 05 red pins zero-scenario-is-fast; arch scan clean). Developer dispatched. state.json keeps 05 at Done (the fix is tracked here, not as a state transition).
- 2026-11-15 · 10 merge complete: tip suite unit 0 fail; integration fail 86, orchestrator re-diff: no new name. Teardown clean, state Done. Task Breakdown ticked. DevOps 11 dispatched (main 4d1fbb2 already integrated at 50035c4; no re-integration).
- 2026-11-15 · Developer 05 Amendment A 7fa70a3 (assign_lane.mjs only; amend-a 3/3, sealed 05 reds 5/5 + 3/3 + 5/5; real run CR-120 → standard "scenarios: 0 (none parsed; never fast)", BUG-117 still fast). QA-Verify 05 (amendment A) dispatched. Story 10 has no Task Breakdown section (nothing to tick).
- 2026-11-15 · QA-Verify PASS 05 Amendment A (rule 4 ok; 16/16; real run over SPRINT-43..46 lists: only BUG-088 and CR-120 move fast → standard; CR-121/122 stay runtime; surface assign_lane.mjs + new red only). Post-flight clean. Revised Goal check (c) numbers: fast 1 / standard 13 / runtime 29 of 43. Queued after 11 (needs integration of main once 11 lands).
- 2026-11-15 · MERGED 11 → cli main 75fe664 (no integration needed; targeted 77/77). Tip suite: unit 0 fail (2 skipped); integration fail 86, orchestrator re-diff: no new name. Teardown clean, state Done. Task Breakdown ticked. DevOps 05 Amendment A dispatched (main moved → integrate).
- 2026-11-15 · Developer 12 integration pass dispatched (merge main 75fe664 into story/12 per M3 integration rules; T5 integration-gated must pass whole; then QA-Verify on the integrated tree, then the final merge). Runs alongside DevOps 05 Amendment A.
- 2026-11-15 · Developer 12 integration c4cab66 (main 75fe664 merged clean; gen:codex no diff; prebuild incl. build-codex-payload --check ok; regions intact: architect.md 05 lane text + 12 STORY-PLAN/TPV/Post-Flight, template GOAL_RELATION, story.md, prep_qa_context 04 + 12 blocks). **T5 passes whole** (9/9: real merge_story / wave_runner_args / seal_red / update_state --defect-in match 12's text); no fix commit. Groups 15/15, 44/44, 125/125. Flashcard rejected (dup of 2026-09-26 zsh word-split). QA-Verify 12 second pass dispatched.
- 2026-11-15 · QA-Verify PASS 12 second pass (5/5 fully green on integrated tree c4cab66; T5 runs real merge_story/wave_runner_args/seal_red/update_state; §C.7 exit table = MERGE_EXIT; §5 stage table = stagesFor; merged regions intact). Nit: §C.7 prose mentions DevOps twice outside the table (T4 green). Post-flight on the integrated tree run. Queued last, after the 05 Amendment A merge.
- 2026-11-15 · MERGED 05 Amendment A → cli main e006598 (integration 33f62a2 of main 75fe664, clean; gen:codex no diff; targeted 5 files green). Tip suite: unit 0 fail / 5608 (2 skipped); integration fail 86, orchestrator re-diff vs ref: no new name. Teardown clean; state already Done (update_state no-op). Stale QA agents for 05 (first pass) and 08 (amendment A) stopped; no orphaned test runs. DevOps 12 dispatched (final merge; main moved → integrate e006598; tick 12's Task Breakdown at Done).
- 2026-11-15 · MERGED 12 → cli main ad5110c (the tenth and last merge; c4cab66 already held e006598, so no second integration; groups 15/15, 44/44, 125/125, T5 whole; assign-lane-amend-a 3/3). Tip suite: unit 0 fail / 5617 (2 skipped); integration fail 92 (was 86). Orchestrator re-diff: 13 new names, all CLAUDE.md block / SKILL.md live-vs-canonical parity (rule 11; logged in sprint-context rule 18), none gone. Teardown clean; state Done; all 14 Task Breakdown rows ticked. state.json: 03–12 Done. Next: Goal check (d) sandbox setup on ad5110c.
- 2026-11-15 · Goal check (d) setup done on ad5110c: RC 0.31.0-rc.1 packed (all seven new scripts in the tarball) and installed to the prefix; sandbox upgraded 0.30.1 → RC (dry run 47 planned; `--yes` 36 updated; `make check` / `go vet` kept; pins substituted; hooks run the RC on PATH); six items 🟢; smoke: lanes fast/standard/runtime/standard, scripts installed, doctor 0, preflight 5/5 (after a fixture timestamp fix, X-1). Findings log `.cleargate/field-trials/2026-11-sandbox-s46.md`; watch tooling `field-trials/watch-sandbox-s46/`. X-2 (preflight dirties its own tree, pre-existing) → intake. Handed to the owner.
