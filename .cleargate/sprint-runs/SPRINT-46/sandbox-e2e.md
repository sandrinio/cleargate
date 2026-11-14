# SPRINT-46 sandbox end-to-end run — plan (proposed Goal check (d))

Owner, 2026-11-15: "lets plan the sandbox e2e". Status: **plan — awaiting the owner's go.**

## Why

Goal checks (a)–(c) test the parts: the runner with stub agents, the scan on a dispenser copy, and lane assignment over past items. None of them runs the new agent prompts with real agents, end to end. This run does, on a throwaway repo, before 0.31.0 is published.

## When

After the tenth SPRINT-46 merge (cli `main` holds 03–12), before Gate 4. 0.31.0 is not published until (d) passes or the owner waives it.

## Setup (orchestrator, ~10 min)

1. **Frozen build.** A cli worktree `.worktrees/S46-sandbox/cleargate-cli`, detached at the final cli `main` SHA (node_modules symlinked), then `npm run prebuild && npm run build`. It stays fixed for the whole run, because the tip tree is reused by merges.
2. **Shim, outside the repo.** `/Users/ssuladze/Documents/Dev/cg-sandbox-s46-bin/cleargate` contains `exec node <frozen>/dist/cli.js "$@"`. The hook resolver takes the on-PATH `cleargate` when the repo has no `cleargate-cli/`. The session is launched with this dir first on PATH, so hooks, agents and scripts all run the build under test, not the global 0.30.1. There is no `cleargate-cli/` dir in the sandbox, so none of the meta-repo's nested-cli behaviour applies.
3. **Repo.** `/Users/ssuladze/Documents/Dev/cg-sandbox-s46`, `git init`, a Go module (Go 1.27 is installed): `internal/textutil` (`Normalize`), `internal/tally` (`Count`), `cmd/tally` (prints word counts for a file), each with passing tests. `cleargate init` via the shim. `gate-checks.json` gets `qa.typecheck: go vet ./...` and `qa.test: go test ./...`, and `config.yml` `gates.precommit` gets the same commands. Initial commit on `main`, clean tree.
4. **Items** (drafted with `cleargate new`, approved as fixtures, so the run starts at sprint planning): EPIC-001 and three disjoint stories, one per lane by `assign_lane.mjs` rules:
   | Item | Expected lane | Why the rule picks it | Surface |
   |---|---|---|---|
   | STORY-001-01 trim punctuation in `Normalize` | fast | 2 scenarios, 1 subsystem, no proof tier | `internal/textutil/` |
   | STORY-001-02 `TopN` with tie-break | standard | 4 scenarios, 1 subsystem | `internal/tally/top.go` + test |
   | STORY-001-03 `tally --json` | runtime | `proof_tier: live`; `## Proof`: `go run ./cmd/tally --json testdata/sample.txt` | `cmd/tally/` |
   The SPRINT-01 plan is drafted with the three items. Before handing over, `assign_lane.mjs` is run on the three files, and `cleargate sprint preflight SPRINT-01` is run as a read-only smoke check (a fresh repo has no previous sprint).

## Run (owner, 3 messages)

1. `cd /Users/ssuladze/Documents/Dev/cg-sandbox-s46 && PATH=/Users/ssuladze/Documents/Dev/cg-sandbox-s46-bin:$PATH claude`
2. "start SPRINT-01" → preflight, SDR (3 readers + synth, lanes from `assign_lane`) → Gate 2 halt → "approved".
3. Execution runs on its own: one wave, three lanes in parallel. At the walkthrough, then close → the owner gives the close ack.
The owner pastes the session id here. The orchestrator watches with Sonnet digests (the tooling is in `.cleargate/field-trials/watch/`), read-only, and logs findings in `.cleargate/field-trials/2026-11-sandbox-s46.md`.

Estimate: ~14 agent dispatches (SDR 4, stages 1 + 3 + 5, Reporter 1, plus any flagged TPV), mostly Sonnet; 45–75 min of wall clock.

## Pass criteria (Goal check (d))

1. `waves.json` `lane_assignments` = fast / standard / runtime as in the table, written by `assign_lane.mjs`.
2. Kickoff writes `baseline.json` (066-04).
3. The wave runs through the shipped `wave_runner.js` via `/workflows`; no runner file is written by the orchestrator (066-11).
4. Each item runs exactly `stagesFor(lane)`: agent dispatches 1 / 3 / 5 on the clean path, matching `state.json` `stages_run` and the token-ledger descriptions (066-06).
5. QA-Red seals through `seal_red.mjs` (commit `qa-red(<ID>)`), and the scan runs `go vet` / `go test` (066-07, 066-03).
6. QA-Verify runs the item's commands and, for 001-03, the proof command (066-09).
7. Merges go through `merge_story.mjs` with no DevOps agent on the clean path: post-merge suite, teardown, state Done (066-08).
8. `sprint_metrics` shows `by_lane` and `rework_by_defect_in`, and the Reporter's text describes the three paths (066-10, 066-12).
9. Close completes on the owner's ack, with no worktree left over.

## Failure policy

- A defect that breaks the loop is fixed in SPRINT-46 before release (owner decides: hotfix item or amend a merged story), then (d) re-runs from setup.
- A cosmetic or doc defect goes to `intake.md`.
- Setup trips that are not loop defects (shim, PATH) are fixed in place and logged.

## Not covered (by design)

- Rework routing with real defects (066-10): non-deterministic to provoke. Covered by unit tests and QA's real `update_state` run.
- A pre-existing failing test in the baseline: it would trip the precommit gate in a fresh repo. Covered by 066-04's QA real run.
- Contract-first upstreams between items: the items are disjoint on purpose. A chained variant is a later run.

## Teardown

After the report is read: remove the frozen worktree (`git -C cleargate-cli worktree remove`), keep the sandbox repo until Gate 4, then delete it with the owner's OK.
