# Watch brief: SPRINT-46 Goal check (d), sandbox end-to-end run

You are reviewing a condensed transcript chunk from a live Claude Code session in a throwaway Go repo,
`/Users/ssuladze/Documents/Dev/cg-sandbox-s46` (Go module `example.com/tally`, a word-count CLI). The
owner drives it. It runs **ClearGate** 0.31.0-rc.1, an unpublished release candidate, through one whole
sprint: preflight, Sprint Design Review (4 readers + synth), Gate 2, kickoff, two waves run by the shipped
wave runner via `/workflows`, merges by script, walkthrough, Reporter, close. Your job: check the new loop
against the pass criteria below and find what ClearGate should fix before 0.31.0 ships. You are a
reviewer, not a participant.

## What is under trial (EPIC-066, "build step sized by risk")

- `assign_lane.mjs` computes each item's lane: **fast** (Developer → merge), **standard** (QA-Red →
  [Architect TPV if the scan flags] → Developer → QA-Verify → [Architect post-flight if flagged] → merge),
  **runtime** (story plan → QA-Red → [TPV if flagged] → Developer → QA-Verify → Architect post-flight →
  merge). `segment_stages.mjs` `stagesFor(lane)` is the one stage list.
- `record_baseline.mjs` (kickoff) records the configured test's pre-sprint failures in `baseline.json`.
- `seal_red.mjs`: QA-Red's tests are committed as `qa-red(<ID>)` by the script.
- The pre-gate scan runs the configured typecheck (`go vet ./...`) and test (`make check`).
- QA-Verify runs the item's own commands and, for a `proof_tier: live` item, the `## Proof` command.
- `merge_story.mjs` merges with no DevOps agent on the clean path; DevOps only on exit 4 or 5.
  Here `make check` fails at a guard (exit 2, "make check needs TALLY_DB_URL…", no test names) on every
  run, exactly like the dispenser repo without its database. Expected: the failure is classed as
  baseline, each merge JSON has `post_merge_test: excused` and `NOT TESTED (pre-merge)` /
  `NOT TESTED (post-merge)` tail lines, and the merge is not refused.
- `wave_runner.js` + `wave_runner_args.mjs`: the orchestrator runs the shipped runner; it must not write
  its own runner file.
- `sprint_metrics.mjs`: `by_lane`, `rework_by_defect_in`; the Reporter describes the three paths.
- Agent prompts and the sprint-execution SKILL.md were rewritten for the three paths (066-12).

## The four items and what should happen

| Item | Expected lane | Clean-path agent dispatches |
|---|---|---|
| STORY-001-01 trim punctuation in `Normalize` | fast | 1 (Developer) |
| STORY-001-02 `TopN` with tie-break | standard | 3 (QA-Red, Developer, QA-Verify) |
| STORY-001-03 `tally --json` (`proof_tier: live`) | runtime | 5 (story plan, QA-Red, Developer, QA-Verify, post-flight) |
| STORY-001-04 `tally --top N` (uses 001-02's `TopN`; shares `cmd/tally/main.go` with 001-03) | standard | 3 |

Wave 1 should hold 001-01, 001-02, 001-03; wave 2 holds 001-04, which integrates `main` after 001-02 and
001-03 merge. TPV and extra post-flight runs appear only if the scan flags something.

## Pass criteria (Goal check (d)): flag any deviation as a finding

1. Upgrade: done before the session (0.30.1 → RC, recorded). Hooks must run the RC (`cleargate` on PATH).
2. Lanes: `waves.json` `lane_assignments` = fast / standard / runtime / standard, written by `assign_lane.mjs`.
   001-04 in a later wave than 001-03, building on 001-02's `TopN`.
3. Baseline: kickoff writes `baseline.json` recording the `make check` guard failure.
4. Runner: both waves run through the shipped `wave_runner.js` via `/workflows`; no hand-written runner.
5. Stages: each item runs exactly `stagesFor(lane)`; dispatch counts 1 / 3 / 5 / 3 on the clean path;
   descriptions follow `<stage> <WORK-ITEM-ID>`.
6. QA-Red seals through `seal_red.mjs` (commit `qa-red(<ID>)`); the scan runs `go vet` and `make check`.
7. QA-Verify runs the item's commands and, for 001-03, `go run ./cmd/tally --json testdata/sample.txt`;
   it treats the `make check` guard failure as pre-existing, not the item's defect.
8. Merges: all through `merge_story.mjs`, no DevOps agent on the clean path, `post_merge_test: excused`
   and NOT TESTED tail lines on each, teardown + state Done; never refused for debug prints in
   ClearGate's own installed scripts.
9. `sprint_metrics` shows `by_lane` and `rework_by_defect_in`; the Reporter's text describes three paths.
10. Close completes on the owner's ack; no worktree left over.

## Known, not findings

- The ClearGate MCP server fails to start (`.mcp.json` pins `npx cleargate@0.31.0-rc.1`, not on npm).
  The repo is pre-member; push/pull are not used. RC-only artifact.
- `make check` always fails at its guard. That is the test condition, not a defect.

## What counts as a finding

Anything where ClearGate (CLI, hooks, scripts, templates, agent prompts, skill, gates) made the session
slower, more expensive, wrong or confusing, and any deviation from the pass criteria. Examples: a script
errors or refuses a merge; an agent improvises around a missing step or writes its own runner; a stage
runs that the lane does not list (or one is skipped); the orchestrator dispatches DevOps on a clean
merge; the owner has to correct the agent; wasted tokens or time (budgets: architect ≤10 min,
developer ≤30, qa ≤15, devops ≤5, reporter ≤20); report numbers that disagree with the transcript.
Not findings: the tally program's own Go bugs, unless ClearGate's process let them through.

## Inputs

- The chunk file(s) named in your task. Format: `HH:MM:SS KIND: text`, UTC times; KIND is USER,
  ASSISTANT, TOOL <name>, RESULT ([ERROR] marks failures), ATTACH (hook output), SYSTEM. Each
  `===== FILE` block is one transcript (the main session or one subagent, with its agentType);
  `----- usage` is that file's token use within the chunk. Long texts are cut (`…[+N chars]`).
- The findings log so far: `/Users/ssuladze/Documents/Dev/ClearGate/.cleargate/field-trials/2026-11-sandbox-s46.md`.
  Read it first and do not re-log a finding already there (add "recurs in chunk NNN" instead).
- If you need the full text behind a cut line, grep the raw transcripts named in your task by a
  distinctive phrase. You may read sandbox files (including `.cleargate/sprint-runs/SPRINT-01/`) to check a claim.

## Hard rules

- **Read-only everywhere except your one output file.** Never write, edit, commit, or run any command
  that changes anything in `/Users/ssuladze/Documents/Dev/cg-sandbox-s46` or in the transcripts. No
  `cleargate` commands, no sandbox scripts, no git commands other than `git log`/`git show`/`git status`/
  `git diff` (read-only).
- Do not edit the findings log; write only the output file named in your task.

## Output

Write the output file in this shape, chunk order:

```
### Chunk NNN (HH:MM–HH:MM UTC) — <one line on what the session did>

- **Criteria seen:** <which of 1–10 this chunk shows passing or failing, one line each, with evidence>
- **S<NNN>-<k> · <area> · <short title>.** What happened, with the evidence (time + quoted line).
  Why it matters. Suggested fix (one or two sentences). Severity: high | medium | low.
```

`<area>` is one of: cli, hook, gate, template, agent-prompt, skill, orchestration, workflow, script,
measurement, report, upgrade, docs, cost. Keep each finding to 3–6 lines. If a chunk has no findings,
write the header, the criteria line and `- No findings.` Then end your reply with at most 8 lines: the
count of findings by severity, the criteria status so far, and any **urgent** item the owner should hear
about now (a merge refused, a loop-breaking defect, a wrong number about to land in a report). Say
"none urgent" if so.
