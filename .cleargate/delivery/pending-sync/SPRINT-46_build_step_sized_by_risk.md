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
- (c) `assign_lane.mjs` over the items of SPRINT-43, SPRINT-44, SPRINT-45, SPRINT-46 and dispenser_adapter SPRINT-04: at least a quarter assigned `fast`, no item touching a forbidden surface assigned `fast`, and the owner spot-checks five assignments.

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
