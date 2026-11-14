---
sprint_id: "SPRINT-46"
created_at: "2026-11-14T20:46:24.517Z"
last_updated: "2026-11-15T09:30:00.000Z"
---

# Sprint Context

Per-sprint audit artefact. Populated at sprint init (M1 planning) and re-touched after each story merges. Referenced from every Developer/QA/Architect task brief so all agents start from the same baseline.

## Sprint Goal

Make the build step fit the item: a script assigns fast, standard or runtime from risk signals, a shipped runner runs the plan as written, scripts replace the agents that only ran commands, and QA-Verify runs the item and names where a defect is.

## Goal Acceptance Check

Run before Gate 4 (sprint plan §3 Goal Acceptance Check; confirmed by the owner at Gate 2, (d) added 2026-11-15 on the owner's "go"):
- (a) `wave_runner.js` dry run with stub agents over a three-wave fixture plan holding one item per lane: each item runs exactly `stagesFor(lane)`; dispatch counts 1 / 3 / 5 on the clean path; no runner file written by the orchestrator.
- (b) Canonical `pre_gate_runner.sh qa` on a copy of dispenser_adapter runs `make check` and `go vet ./...`, and reports failing output when a test is broken on purpose.
- (c) `assign_lane.mjs` over the items of SPRINT-43, SPRINT-44, SPRINT-45, SPRINT-46 and dispenser_adapter SPRINT-04: at least a quarter `fast`, no forbidden-surface item `fast`, owner spot-checks five.
- (d) Sandbox end-to-end run per `sandbox-e2e.md` (pass criteria 1–9). 0.31.0 is not published until (d) passes or the owner waives it.

## Locked Versions

| Package | Version |
|---------|---------|
| Node    | `>=24.0.0` |
| TypeScript | `^5.8.0` |
| cleargate (cli) | `0.30.1` at sprint start (cli `main` f846d9a, 40 commits ahead of origin). Release 0.31.0 happens at Gate 4 only, with the owner's go. |

No item adds a runtime dependency. Node built-ins only; shell scripts stay POSIX bash.

## Test Stack

| Field | Value |
|-------|-------|
| Backend runner    | Full suite: `npm test` in a cli tree (merge lane only, rule 17). Single files: `npm run test:file -- <file>` (adds `--experimental-test-module-mocks`). `npm test` skips `*.integration.node.test.ts`; run those by file. |
| Frontend runner   | none |
| Typecheck command | `npm run typecheck` (`tsc --noEmit`) in the cli worktree |
| Red-test naming   | `*.red.node.test.ts` (integration-layer reds: `*.red.integration.node.test.ts`) |

Run full suites with a short private `TMPDIR`. Never run two full suites at once (fixed ports in the `cr097`/`cr101` tests). A throwaway cli worktree has no `dist`: build it there (never in cli `main`) before comparing dist-spawning tests.

## Cross-Cutting Rules

From EPIC-066 `<architecture_rules>`:

1. Keep the three lane names `fast`, `standard`, `runtime`. `runtime` becomes a real `state.json` value. No new state and no new work unit (EPIC-054 lock).
2. One source for "which stages does this lane run": `segment_stages.mjs`. The skill, `launch_wave.mjs`, `dispatch_serial.mjs` and the shipped runner read it; none restates the list.
3. A stage that is a fixed command sequence is a script. An agent may call it as its last step, or the orchestrator runs it at the barrier; it is never a dispatch of its own.
4. Merges stay serial and at the barrier (EPIC-055, CR-124). This epic changes who runs the merge, not when.
5. Stack-neutral: no script added here depends on `package.json` or Node in the target's own code. Commands come from `gate-checks.json`.
6. Scripts change in `cleargate-cli/scaffold/core`; prompts and the skill change in `scaffold/hosts/claude`, `scaffold/core/.agents` and the `scaffold/hosts/codex` counterparts in the same story. Generated files are regenerated (`npm run gen:codex`), never hand-edited.
7. QA-Red stays a separate agent and its tests stay sealed. This epic limits how much it writes; EPIC-065 owns what its assertions may pin.

Hand-applied INITIATIVE-002 rules (sprint plan, Execution Guidelines):

8. **Proof per item.** An item is Done only when the evidence in its sprint-plan Proof column exists, recorded in its DevOps report or in `sprint-runs/SPRINT-46/evidence/`.
9. **Fixed roster.** The ten items are the roster. Anything found mid-sprint goes to `sprint-runs/SPRINT-46/intake.md` and enters only with the owner's recorded OK in sprint §6.
10. **Recount at close.** The orchestrator records a hand recount of rework from git and dispatch metadata beside `sprint_metrics.mjs` in the close Brief.
11. **Loop unchanged under the sprint.** No edit to live `/.claude/**` or live `.cleargate/{scripts,knowledge,templates}` until Gate 4. At Gate 4 (owner's go only): live re-sync from cli `main`, release 0.31.0 (push cli + tag, npm publish, GitHub release), push the meta-repo.

Execution (owner, Gate 2 2026-11-15; the SPRINT-44/45 nested-cli layout; the plan of record is `plans/waves.json`):

12. **Worktrees.** `OUTER` = `/Users/ssuladze/Documents/Dev/ClearGate`, `CLI` = `OUTER/cleargate-cli`. Each item has a detached outer host `OUTER/.worktrees/<ID>` (`git worktree add --detach … sprint/S-46`; no item has an outer change) and a nested cli worktree `OUTER/.worktrees/<ID>/cleargate-cli` (`git -C CLI worktree add <path> -b story/<ID> <base from waves.json>`). Setup, by the orchestrator, serially: `ln -s CLI/node_modules <cli wt>/node_modules`; `ln -s OUTER/.claude <outer host>/.claude`; `(cd <cli wt> && npm run prebuild)`. Never `npm install`/`npm ci` in a worktree. **No agent edits files in the cli main checkout.**
13. **Concurrency.** At most 5 build lanes and 1 merge lane. Build lanes run typecheck plus targeted test files only. Invoke scripts as `ORCHESTRATOR_PROJECT_DIR=OUTER bash OUTER/.cleargate/scripts/run_script.sh …`. Dispatch descriptions are `<stage> <ID>` (CR-120); briefs name the work-item id on line 1.
14. **Contracts (CR-124).** C1 `contract/S-46-stages` (owner STORY-066-06, base cli `main`): `segment_stages.mjs` — `STAGE_NAMES`, `stagesFor(lane)` (the full table, frozen), `laneOf(storyId, {state, plan})`; interface: verdict `lane` + `stages_run`, `qaSha` null on GREEN only for a lane with no QA stage. C2 `contract/S-46-baseline` (owner STORY-066-04, base cli `main`, not stacked on C1): `record_baseline.mjs` — `extractFailing(output: string): string[]` (stub returns `[]`), CLI exits 0 behind a main guard, the `baseline.json` shape. Owners replace stub bodies; never rename or retype a frozen export. Pinned no-branch interfaces P1–P7 are in `waves.json` `pinned_interfaces`.
15. **Integration.** An item integrates only after every `upstream` item has merged into cli `main`: in its cli worktree `git merge --no-ff main`; the owner's region wins and the item re-applies its insertions; a conflict inside an existing or red test goes to QA-Red, never the Developer. Never hand-merge a generated file: `npm run gen:codex`, then prebuild (`build-codex-payload.mjs --check`; note `npm run gen:codex -- --check` ignores `--check`). Then typecheck and the item's tests, then QA-Verify on the integrated tree. If `main` moves before the merge, integrate again.
16. **Sealed red tests from earlier sprints** (066-06: six `.red` files plus `bug-034-flashcard-gate-restore`; 066-10: `sprint-metrics.red`; 066-12: `codex-sprint-execution-render.red`) are edited in the item's QA-Red commit, never the Developer's. The cli repo has no git hooks: QA-Verify's diff review enforces each item's §3.1.
17. **Merge.** Default order 03, 04, 07, 05, 06, 08, 09, 10, 11, 12, taken as items pass QA-Verify, subject to `upstream`. DevOps merges `story/<ID>` into cli `main` with `--no-ff` (local only — no push, no publish). **No `dist` rebuild on cli `main`** (five live hooks run `CLI/dist/cli.js`, and STORY-066-04 changes `sprint init`): the post-merge full suite runs in a throwaway cli worktree at `main`'s tip. Teardown: both `git status --porcelain` empty, remove the cli worktree first, then the outer host.
18. **Known reds.** Canonical-live parity breaks by design (rule 11): `canonical-live-parity` 5a (templates) from the 066-05 merge; 5b (knowledge) from the first of 066-05 / 066-06; 5c (agents) from 066-05; the `qa-content` slice parity test from 066-09; doctor drift lines and the SessionStart drift banner from the first merge. Scenarios 1–3 and 5d stay green. Pre-existing failures at cli f846d9a are listed in `evidence/baseline-failures-f846d9a.txt`; a failure in that list is not a merge regression. Each new known red is logged in sprint §6 when it starts. Never hand-port live.
19. **Codex companions.** `qa.toml` (066-07 then 066-09) and `architect.toml` (066-05 then 066-12) have two editors each, serialized by upstream edges; the second regenerates at integration. One editor each: `devops.toml` (066-08); `developer.toml`, `architect-synth.toml`, `reporter.toml`, `core/.agents/skills/sprint-execution/{SKILL,dispatch-serial}.md` (066-12).
20. **Detached hosts.** The Developer cannot tick Task Breakdown rows in the item file; the orchestrator ticks them at merge.
21. **Proof runs.** Run proofs with the canonical scripts by path from a cli tree, never the live copies. dispenser_adapter is used only as a fresh copy. STORY-066-04's kickoff proof runs on a fixture sprint in a temp git repo, never through this sprint's own `sprint init`.

## Active FLASHCARD Tags

- `#worktree` — nested cli worktrees under detached outer hosts; baseline worktrees sit under the outer host, not `/private/tmp`; a throwaway cli worktree has no `dist`; never `git stash` (shared stack).
- `#test-harness` — `npm test` skips integration files; dynamic-import not-yet-existing modules per test; never stub `dist/cli.js` through a symlinked cli; reds spawning real git can flake under load.
- `#codegen #gen-codex` — generated Codex files fail `prebuild --check` when stale; `gen:codex -- --check` ignores `--check`.
- `#contract #merge` — contracts fast-forward to the owner's integrated commit; swapping merge order of independent items forces re-integration.
- `#qa-red` — zsh expands `== x`; BSD sed needs `-i ''` (use `perl -pi`); red tests pin behaviour, not file existence.

## Adjacent Implementations (Reuse First)

| Story | Module / Export | Path |
|-------|----------------|------|
| (existing) | `validateVerdicts`, `storyBases`, `integrationReady`, `mintRunId`, `launchWave` | `cleargate-cli/scaffold/core/.cleargate/scripts/launch_wave.mjs` |
| (existing) | `dispatchSerial`, `runNext` | `cleargate-cli/scaffold/core/.cleargate/scripts/dispatch_serial.mjs` |
| (existing) | `record_result`, `print_summary`, `resolve_story_id_from_branch`, `resolve_lane` | `cleargate-cli/scaffold/core/.cleargate/scripts/pre_gate_common.sh` |
| (existing) | `--lane-demote`, `--qa-bounce`, `--arch-bounce` | `cleargate-cli/scaffold/core/.cleargate/scripts/update_state.mjs`, `state-events.mjs` |
| (existing) | rework and dispatch metrics | `cleargate-cli/scaffold/core/.cleargate/scripts/sprint_metrics.mjs` |
| (existing) | QA pack | `cleargate-cli/scaffold/core/.cleargate/scripts/prep_qa_context.mjs` |
| (existing) | red-test lint | `cleargate-cli/scaffold/core/.cleargate/scripts/qa_red_lint.mjs` |
| (existing) | Codex payload generator | `cleargate-cli/scripts/build-codex-payload.mjs` |
| (populated as stories merge) | | |

## Mid-Sprint Amendments

_(append only: '<ISO-ts> · <ID> · <one-line note>')_
- 2026-11-15 · Gate 2 · spec clarifications at kickoff: STORY-066-03 R9 (`CLEARGATE_SCAN_NO_LANE_ROUTING=1`), STORY-066-06 R10 (clean-room verdict in `scripts/clean-room/loop-script.mjs`), STORY-066-08 R2/R5 (sets the switch; set-aside/write-back, never `git stash`), STORY-066-12 R10 (reporter.md, protocol, README, CLAUDE.md block, story template) and build timing (A: from C1 at kickoff).
- 2026-11-15 · M2 · CR:spec-clarifications C-1..C-10 from plans/M2.md ratified by the orchestrator (no scope change): 066-08 C-1 full-capture rerun of `qa.test` judged against baseline, also post-merge (`excused`); C-2 write-back before teardown and `Done` (supersedes the Gate-2 "write back last" wording); C-3 `precondition` step, `post_merge_test` key, prebuild failure → 5, no-unmerged-path merge failure → 2, 20-min spawn timeout; C-4 dirt refused at precondition too, restore by `git checkout HEAD --`; C-5 demotion writes no LD line; C-6 on exit 5 DevOps keeps or reverts. All: C-7 `.red` infix, ≤2 tests/scenario wins over §4.1 counts. 066-09 C-8 proof-command parse rule. 066-10 C-9 §3.1 gains sealed `sprint-metrics.red.integration.node.test.ts` (QA-Red commit); C-10 message/route/value formats. plans/M2.md governs.
- 2026-11-15 · M1 · CR:spec-clarifications C-1..C-18 from plans/M1.md ratified by the orchestrator (no scope change; plans/M1.md governs): 066-04 C-1 baseline spawns only when record_baseline.mjs exists, §3.1 gains `sprint-unit.node.test.ts`; C-2 pack `source` ∈ baseline.json/.baseline-failures.json/none; C-3 baseline step after "Load skill", before the dashboard. 066-03 C-4 absolute/`$`/quoted dirs never N/A; C-5 commands run under `set +e +u +o pipefail`. 066-05 C-6 strip BUG-129 `Yes —`/`No —` prefixes; C-8 keep Lane Classification and §9 headings; C-9 id from file name, none → exit 2. 066-06 C-10 additive C1 export `normaliseLane(lane)` (contract addition, nothing renamed or retyped); C-11 new verdict checks run last, no-QA lane allows `qaSha: null`; C-12 new tests in `segment-stages`, old fixtures gain the two fields only; C-13 `stages` = full stage objects. 066-07 C-14 re-seal only on a `qa_red_lint` flag, ≤2 times; C-15 re-seal window from the first `qa-red(` commit; C-16 R-volume counts listed files only. All: C-7 ≤2 tests/scenario; C-18 red files keep §3.1 names.
- 2026-11-15 · rule 18 · known reds extended (M1 C-17, same rule-11 cause): 5c from the 066-07 merge (07 merges before 05); from the 066-05 merge also `template-stubs.integration` Sprint Plan Template live === mirror (:206), `gate-section-index-pinning.live` S1c, `enforcement-section-13.live` :56, `serial-dispatch-docs.live` Test 27, `ratchet-retired.live`, `file-surface-gate-e2e.live` :30, `codex-enforcement-delta.live` :20; `qa-content` parity from 07 (M2). Never hand-port live.
- 2026-11-15 · M3 · CR:spec-clarifications C-1..C-13 from plans/M3.md ratified by the orchestrator (plans/M3.md governs): 066-11 C-1 dispatch labels use the CR-120 stage word (`QA-Red STORY-A`, `Architect` for architect stages); C-2 args per-item `stages`/`runId` plus additive `items[].file`; C-3 an item whose upstream has all merged is cut from the sprint branch, not its contract (no-upstream items keep `storyBases`; 066-12 §C.0.2 says so); C-4 scan-flagged = `scan_exit ≠ 0` (2 included), non-empty `flags`, or no seal result, and the same seal scan gates standard `architect-review`; C-5 verdict gains additive `defects_in: string[]`, the orchestrator replays `--qa-bounce --defect-in` / `--arch-bounce` at the barrier; C-6 ESCALATED at the cap carries `blocker.type: technical-impossibility`, Done items omitted; C-8 `models_by_lane.runtime.qa-verify` beats `models.qa-verify`, unknown keys warn. 066-12 C-9 §3.1 gains `skill-md-serial-pointers.red` (Test 21 re-scoped to the five anchor headings, in the QA-Red commit); C-10 render test third literal (:110 `**DevOps-owned.**` → `**Script-owned.**`); C-11 Phase B stub heading allowed; C-12 R6 widens to architect.md Post-Flight, Guardrails and the :144-165/:205 wording; C-13 resolved by M2. Sprint-wide naming rule (C-7, supersedes M1 C-18 for every red file not yet sealed): new red files use the `.red` infix and count as their §3.1 rows; 066-07 keeps its already-sealed §3.1 names.
- 2026-11-15 · rule 18 · known reds extended (rule 11 cause; from the 066-12 merge; QA-Verify 12 class iii): `canonical-live-parity.red.integration` 5a/5b/5c (templates, protocol, agents); `sprint-execution-mirror.integration` Scenario 7 "diff command on live vs canonical returns empty output", "Live and mirror templates are byte-identical", "Mirror parity for both templates (STORY-025-04)", Scenario 5 dirs parity; `claude-md-block-leads-relocation.live.integration` test 3 "bounded-block BODIES hash-match" (doctor reports a block mismatch until the Gate 4 re-sync); `gate-section-index-pinning.live` S1c; `contract-first-dag-text.live` T5 template parity; `template-stubs.integration` "Sprint Plan Template: live === mirror", "template Sprint Plan Template.md: live === mirror", "template story.md: live === mirror"; `serial-dispatch-docs.live` Test 26. Baseline (not new): `agent-developer-section.integration` Scenario 2, `readme-qa-doc-truth-043-06` s1_d/s1_e/s2_a–c. Never hand-port live.
- 2026-11-15 · rule 18 · load flake (not a regression when it passes alone): `test/commands/doctor-session-brief-f2.red.node.test.ts` "release_repos [notags, tagged]: exactly ONE describe…" and "the describe for the tagged repo is already running…" (plus parents STORY-063-11-F2) fail in the full unit run under multi-lane load; the merge lane re-runs the file alone and records the result.
- 2026-11-15 · STORY-066-08 · owner-approved amendment before merge ("Amend 08 before merge"): R10 debug/TODO hits count only in files the item changed (scan's whole-tree fallback flags ClearGate's installed scripts in every target repo); R11 an unnamed test failure matching baseline exit code + last line is excused (dispenser `make check` DB guard). Surface adds `pre_gate_runner.sh`/`pre_gate_common.sh` if the Architect places R10 there. Flow: Architect amends plans/M2.md §08 → QA-Red (new red file; sealed 08 reds stay) → Developer → QA-Verify.
- 2026-11-15 · M2 Amendment A · CR:spec-clarifications C-A1..C-A6 from plans/M2.md §08 Amendment A ratified by the orchestrator (plans/M2.md governs): R10 placed in merge_story.mjs only (changed files vs `sprint/S-NN`, scan untouched); R11 `judgeTestFailure(..., { exitCode })`, reason `baseline-unnamed`, trim-only last-line match, `NOT TESTED (<stage>)` tail line, `post_merge_test` stays `excused`; TODO is WARN and needs no change. New reds: test/scripts/merge-story-amend-a.red{,.integration}.node.test.ts (A1–A11).
- 2026-11-15 · rule 18 · known red starts earlier than listed: the `qa-content` slice parity test and its parent "CR-024 S2 Scenario 6: Mirror parity over inserted sections" are red from the 066-07 merge (07 edited canonical qa.md), not 066-09. Same rule-11 cause.
