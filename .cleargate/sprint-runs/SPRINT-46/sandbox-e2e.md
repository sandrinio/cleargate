# SPRINT-46 sandbox end-to-end run — Goal check (d)

Owner, 2026-11-15: "lets plan the sandbox e2e", then "go"; realism additions a–d "as you recommended". Status: **approved as Goal check (d); fixture prepared; setup after the tenth merge.**

## Why

Goal checks (a)–(c) test the parts: the runner with stub agents, the scan on a dispenser copy, and lane assignment over past items. None of them runs the new agent prompts with real agents, end to end. This run does, on a throwaway repo, before 0.31.0 is published. It also stands in for a pre-release dispenser trial. Dispenser's next sprint on the published release is ordinary use, not a gate.

## When

After the tenth SPRINT-46 merge (cli `main` holds 03–12), before Gate 4. 0.31.0 is not published until (d) passes or the owner waives it.

## Realism additions (owner-approved a–d)

- **a. Packed install.** The build under test is installed from its `npm pack` tarball into a scratch prefix, not run from `dist`, so a script missing from the npm package shows up here.
- **b. Upgrade, not fresh install.** The sandbox is first initialised with the published global 0.30.1 and committed; then the tarball's `cleargate upgrade` (dry run, then `--yes`) moves it to the RC. This is the path dispenser and every existing user takes.
- **c. Dispenser-shaped test command.** As in dispenser_adapter: `qa.typecheck` is `go vet ./...` and `qa.test` is `make check`, which exits 2 at a guard when `TALLY_DB_URL` is unset. There is no `gates.precommit` (dispenser has none). The configured test therefore fails before the sprint starts, with no test names, exactly as dispenser's does without its Postgres URL.
- **d. One item that depends on another.** STORY-001-04 (`tally --top N`) consumes 001-02's `TopN` and shares `cmd/tally/main.go` with 001-03. The SDR should put it in a later wave, building against 001-02's export.

## Setup (orchestrator, ~15 min)

1. **Frozen RC build.** A cli worktree `.worktrees/S46-sandbox/cleargate-cli`, detached at the final cli `main` SHA (node_modules symlinked). In it, `npm version 0.31.0-rc.1 --no-git-tag-version` (uncommitted, worktree only), then `npm pack`, which runs the package's own build. The tarball is kept in the scratchpad.
2. **Prefix install and shim.** `npm i -g --prefix /Users/ssuladze/Documents/Dev/cg-sandbox-s46-bin <tarball>` with a scratch npm cache. The session runs with `/Users/ssuladze/Documents/Dev/cg-sandbox-s46-bin/bin` first on PATH, so the hook resolver's on-PATH branch (the sandbox has no `cleargate-cli/`) and every agent and script call run the RC, not the global 0.30.1. Check: `cleargate --version` prints `0.31.0-rc.1` with that PATH.
3. **Repo.** `/Users/ssuladze/Documents/Dev/cg-sandbox-s46` (prepared: Go module `example.com/tally`, commit `0942f33` plus the Makefile commit). Run `cleargate init` with the global 0.30.1 (no PATH change), set `gate-checks.json` to dispenser's shape (c), and commit. Then, with the RC PATH, run `cleargate upgrade` as a dry run, then `--yes`, and commit. Record the dry-run and `--yes` output as evidence.
4. **Items** (prepared in `sandbox-fixture/`, pre-approved): copy them into `.cleargate/delivery/pending-sync/` and run `cleargate gate check` on each until all are 🟢 (fix fixture wording only). Commit; leave the tree clean.

   | Item | Expected lane | Why | Surface |
   |---|---|---|---|
   | STORY-001-01 trim punctuation in `Normalize` | fast | 2 scenarios, 1 subsystem, no proof tier | `internal/textutil/` |
   | STORY-001-02 `TopN` with tie-break | standard | 4 scenarios, 1 subsystem | `internal/tally/top.go` + test |
   | STORY-001-03 `tally --json` | runtime | `proof_tier: live`; `## Proof`: `go run ./cmd/tally --json testdata/sample.txt` (hand-added; `## Proof` arrives in the template with EPIC-065) | `cmd/tally/main.go` |
   | STORY-001-04 `tally --top N` | standard | 3 scenarios, 1 subsystem; consumes 001-02 `TopN`; collides with 001-03 | `cmd/tally/main.go` |

   Smoke checks before handover: `assign_lane.mjs` on the four files; the installed `.cleargate/scripts/` holds `wave_runner.js`, `wave_runner_args.mjs`, `merge_story.mjs`, `seal_red.mjs`, `assign_lane.mjs`, `record_baseline.mjs`, `segment_stages.mjs`; `cleargate doctor` exits 0; `cleargate sprint preflight SPRINT-01` (read-only; a fresh repo has no previous sprint).

## Run (owner, 3 messages)

1. `cd /Users/ssuladze/Documents/Dev/cg-sandbox-s46 && PATH=/Users/ssuladze/Documents/Dev/cg-sandbox-s46-bin/bin:$PATH claude`
2. "start SPRINT-01" → preflight, SDR (4 readers + synth, lanes from `assign_lane`) → Gate 2 halt → "approved".
3. Execution runs on its own: wave 1 holds 001-01, 001-02 and 001-03 in parallel; wave 2 holds 001-04. Then the walkthrough, then close, where the owner gives the close ack.
The owner pastes the session id here. The orchestrator watches with Sonnet digests (the tooling is in `.cleargate/field-trials/watch/`), read-only, and logs findings in `.cleargate/field-trials/2026-11-sandbox-s46.md`.

Estimate: about 20 agent dispatches (SDR 5, stages 1 + 3 + 5 + 3, Reporter 1, plus any flagged TPV), mostly Sonnet; about 1.5 h of wall clock.

## Pass criteria (Goal check (d))

1. **Packaging and upgrade (a, b).** The upgrade dry run and `--yes` succeed from 0.30.1 to the RC. The installed scripts include every file in the smoke list. The hooks run the RC.
2. **Lanes.** `waves.json` `lane_assignments` = fast / standard / runtime / standard as in the table, written by `assign_lane.mjs`. 001-04 is in a later wave than 001-03 and builds on 001-02's `TopN`.
3. **Baseline (c).** Kickoff writes `baseline.json` recording the `make check` guard failure (066-04).
4. **Runner.** Both waves run through the shipped `wave_runner.js` via `/workflows`; no runner file is written by the orchestrator (066-11).
5. **Stages.** Each item runs exactly `stagesFor(lane)`: agent dispatches 1 / 3 / 5 / 3 on the clean path, matching `state.json` `stages_run` and the token-ledger descriptions (066-06).
6. **Seal and scan.** QA-Red seals through `seal_red.mjs` (commit `qa-red(<ID>)`), and the scan runs `go vet` and `make check` (066-07, 066-03).
7. **QA-Verify.** It runs the item's commands and, for 001-03, the proof command. It treats the `make check` guard failure as already present before the sprint, not as the item's defect (066-09, 066-04).
8. **Merges.** Every merge goes through `merge_story.mjs`, with no DevOps agent on the clean path. Each runs the post-merge check, where the guard failure is classed as baseline, then teardown and state Done. 001-04 integrates `main` after 001-02 and 001-03 merge (066-08). Every merge's JSON has `post_merge_test: excused` and `NOT TESTED (pre-merge)` / `NOT TESTED (post-merge)` tail lines (08 amendment A, R11); a merge of the sandbox's own JS-free items is never refused for debug prints in ClearGate's installed scripts (R10). Rehearsed: `evidence/STORY-066-08/amendment-a-dispenser-shaped.txt`.
9. **Metrics and report.** `sprint_metrics` shows `by_lane` and `rework_by_defect_in`, and the Reporter's text describes the three paths (066-10, 066-12).
10. **Close.** Close completes on the owner's ack, with no worktree left over.

## Failure policy

- A defect that breaks the loop is fixed in SPRINT-46 before release (owner decides: hotfix item or amend a merged story), then (d) re-runs from setup.
- A cosmetic or doc defect goes to `intake.md`.
- Setup trips that are not loop defects (PATH, prefix, npm cache) are fixed in place and logged.
- If (c) shows that a configured test command which cannot run at all (the guard case) breaks the baseline or merge logic, that counts as loop-breaking: dispenser hits it on its first 0.31.0 sprint.

## Left to dispenser (field use after release, not a gate)

- Scale and length: about 15 items over days, and orchestrator context compaction.
- A real codebase that agents must read and reason about.
- Real defects and the rework mix they produce (rework routing is covered here only by unit tests and QA's real `update_state` run).
- The real database-backed environment and the owner's day-to-day workflow.

## Teardown

After the report is read: remove the frozen worktree (`git -C cleargate-cli worktree remove`) and the prefix dir. Keep the sandbox repo until Gate 4, then delete it with the owner's OK.
