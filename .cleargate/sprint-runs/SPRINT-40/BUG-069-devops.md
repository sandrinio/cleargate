# DevOps Report — BUG-069

role: devops

STORY: BUG-069
STATUS: done

## Merge Result
- Sprint branch: sprint/S-40
- Story branch: story/BUG-069
- Merge commit SHA: `3eef06615148c8f172f227fadd9aa1e4b98f276e`
- No conflicts. Commits merged (in order): `6dbcdf06` qa-red (17 assertions, 5 scenarios), `ea386fe3` fix (token-ledger.sh net −181, reporter.md, delivery-doc Task Breakdown ticks, wiki ingest churn).
- Diff stat: 7 files changed, 427 insertions(+), 181 deletions(-)
  - `.cleargate/delivery/pending-sync/BUG-069_ledger_fallback_inherits_prior_attribution.md`
  - `.cleargate/scripts/test/bug069_ledger_fallback.red.sh` (new)
  - `.cleargate/wiki/bugs/BUG-069.md` (new)
  - `.cleargate/wiki/index.md`
  - `.cleargate/wiki/log.md`
  - `cleargate-planning/.claude/agents/reporter.md`
  - `cleargate-planning/.claude/hooks/token-ledger.sh`

## Post-Merge Tests
- Test file run (touched by this commit set only, per cost discipline): `.cleargate/scripts/test/bug069_ledger_fallback.red.sh` — the only test file the commit range creates/modifies (`6dbcdf06` adds it, `ea386fe3` is the code under test).
- Run via `bash .cleargate/scripts/run_script.sh bash .cleargate/scripts/test/bug069_ledger_fallback.red.sh`.
- Result: 17 passed, 0 failed across 5 scenarios (Sc1 2/2, Sc2 6/6, Sc3 2/2, Sc4 4/4, Sc5 2/2 — including Sc4, the BUG-068 marker-present regression boundary, and Sc5, the mid-sprint-amendment `"unknown"`-literal refusal added by M1.md §8).
- Exit code: 0. No script incident emitted.
- Not re-run: `test_count_tokens.sh`, `test_prep_reporter_context.sh`, `bug068_dispatch_tool_name.red.sh` — Dev's report shows these green and none of the three is in this commit range's file list (`git show --stat ea386fe3` / `6dbcdf06`); outside DevOps' "test files touched by this commit" mandate.

## Mirror Parity Audit — non-standard for this story (per dispatch)

This story edits only canonical `cleargate-planning/.claude/**`. Re-sync of the npm payload (`cleargate-cli/templates/cleargate-planning/**`) and the live `/.claude/` instance is explicitly deferred to a human Gate-4 step (M1.md §0 item 4; the story's own Task Breakdown row 5 is correctly left unticked). Per dispatch: no `npm run prebuild` was run, nothing was copied into `/.claude/` or `cleargate-cli/templates/`.

Reporting the canonical ↔ live delta only (not fixed):

| File | canonical (`cleargate-planning/.claude/`) | live (`/.claude/`) | Status |
|---|---|---|---|
| `hooks/token-ledger.sh` | `ec83cebc66d7...b4d3b5` | `da0680fe5dcf...553a2b9` | **DIFFERS** (this story) |
| `agents/reporter.md` | `6898a9adf673...4f292d01` | `249949f59d8f...6373cf3ed` | **DIFFERS** (this story) |
| `hooks/pre-tool-use-task.sh` | `d0e5fb16cc83...c372906` | `79fdd30e3f30...500368e7f` | **DIFFERS** (BUG-068, still unsynced) |
| `hooks/pending-task-sentinel.sh` | `2449e3bbcad6...fce0fa26` | `cb9c37ceea8e...5ea1fc1759` | **DIFFERS** (BUG-068, still unsynced) |
| `settings.json` | `84d7d7ca7efc...4895de11a` | `cd0bb53b69c0...31fd9546c9` | **DIFFERS** (BUG-068, still unsynced) |

All five differences are expected — the point of this dispatch's mirror-parity note, not drift for DevOps to fix:
- `token-ledger.sh` / `reporter.md`: this story's own fix, landed canonical-only per M1.md §0 item 4.
- `pre-tool-use-task.sh` / `pending-task-sentinel.sh` / `settings.json`: BUG-068's fix, carried over unsynced from wave 1 (confirmed already noted in `BUG-068-devops.md`).

Live re-sync for all five (via `cleargate init` or hand-port) remains a single human Gate-4-adjacent step, not DevOps'.

## State Transition

Story state vocabulary for this sprint is `Ready to Bounce → Bouncing → QA Passed → Architect Passed → Sprint Review → Done` (`.cleargate/scripts/constants.mjs` `VALID_STATES`); `update_state.mjs` enforces only `VALID_STATES` membership (not the `STATE_TRANSITIONS` ordering table — confirmed via `state-scripts.test.mjs:1175`'s own comment), so the three-hop sequence named in the dispatch (`QA Passed → Architect Passed → Done`, skipping `Sprint Review`) was accepted without a script-level guard rejecting it.

Stepped through all three transitions from `Bouncing` (BUG-069's state at dispatch start):

```
CLEARGATE_STATE_FILE=.cleargate/sprint-runs/SPRINT-40/state.json node .cleargate/scripts/update_state.mjs BUG-069 "QA Passed"
CLEARGATE_STATE_FILE=.cleargate/sprint-runs/SPRINT-40/state.json node .cleargate/scripts/update_state.mjs BUG-069 "Architect Passed"
CLEARGATE_STATE_FILE=.cleargate/sprint-runs/SPRINT-40/state.json node .cleargate/scripts/update_state.mjs BUG-069 "Done"
```

All three ran via `.cleargate/scripts/run_script.sh`, exit 0, no `checkFoldDrift()` refusal (the wave-1 narrative/transition mixing in `events.jsonl` is confirmed fixed — `events.jsonl` now carries only `kind: "transition"` rows; narrative moved to `orchestrator-log.jsonl`). No script incident emitted by any of the three calls.

- Story state: `Done` (confirmed via `state.json` — `stories["BUG-069"].state === "Done"`, `updated_at: "2026-09-01T20:39:58.809Z"`).
- `events.jsonl` carries the three formal transition rows appended above (`Bouncing→QA Passed`, `QA Passed→Architect Passed`, `Architect Passed→Done`), each `kind: "transition"`, `actor: "system"`.
- Transitioned at: 2026-09-01T20:39:58.809Z (final hop; sequence completed within ~8s).

## Cleanup
- Worktree `.worktrees/BUG-069`: removed (`git worktree remove .worktrees/BUG-069` exit 0; `git worktree list` confirms only the main checkout remains).
- Branch `story/BUG-069`: deleted (`Deleted branch story/BUG-069 (was ea386fe3)`; `git branch -a | grep BUG-069` returns empty).

## Script Incidents
None for this dispatch. (`.script-incidents/20260901T200711Z-4cd0cc827f94.json` is a pre-existing wave-1 BUG-068 incident, unrelated to BUG-069's steps.)
