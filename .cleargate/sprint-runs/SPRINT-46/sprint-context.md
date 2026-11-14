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

_(populated by orchestrator at §A.5, confirmed by the human at the same halt that confirms the sprint plan)_

The concrete condition that is true when the Sprint Goal is met. Either a named command, artifact, or observable state — or the literal token `not-mechanically-verifiable` followed by the qualitative evidence standing in for it. Both are valid. Silence is not.

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
