---
story_id: "STORY-014-07"
sprint_id: "SPRINT-10"
agent: "developer"
status: "done"
complexity: "L3"
flashcards_flagged: "[]"
qa_bounces: "0"
arch_bounces: "0"
---

# STORY-014-07 Developer Report

## Status: done

Rewrote `storyStartHandler` + `storyCompleteHandler` in `cleargate-cli/src/commands/story.ts` to orchestrate the full v2 worktree/merge sequence atomically. Removed the `complete_story.mjs not yet implemented` stub guard. Replaced the stale-prone `resolveActiveSprintId` helper with `resolveSprintIdFromSentinel` (consumed from STORY-014-06).

## Spawn sequences shipped

**`story start STORY-NN-NN` (2 spawns + 1 fs write):**
1. `git worktree add <cwd>/.worktrees/<ID> -b story/<ID> <sprintBranch>` — PATH before `-b` per macOS git convention.
2. `bash run_script.sh update_state.mjs <ID> Bouncing` — flips state.state field.
3. (no-spawn) re-read `state.json` fresh bytes, set `stories[<ID>].worktree = ".worktrees/<ID>"`, atomic tmp+rename write. Does NOT touch the `state` field (2-pass contract preserved per plan gotcha).

**`story complete STORY-NN-NN` (6 spawns):**
1. `git rev-list --count <sprintBranch>..story/<ID>` — preflight. If 0 → exit 1 with `"no commits on story branch — nothing to merge"`.
2. `git -C <cwd> checkout <sprintBranch>`.
3. `git merge story/<ID> --no-ff -m "merge: story/<ID> → <sprintBranch>"`.
4. `git worktree remove .worktrees/<ID>`.
5. `git branch -d story/<ID>`.
6. `bash run_script.sh update_state.mjs <ID> Done`.

## Merge-conflict UX (orchestrator decision 2)

On non-zero merge exit: leaves conflict markers in place, prints stderr diagnostic + `git merge --abort` suggestion, exits 1. The CLI does NOT spawn `git merge --abort` itself — the Scenario-5 test asserts this by grepping spawn calls and confirming no `merge --abort` is issued.

## Tests

`cleargate-cli/test/commands/story.test.ts` — fully replaced (6 `it` blocks across 5 Gherkin scenarios):
1. `Scenario 1: story start — 3-step spawn + state.json mutation` — temp-dir fixture; asserts 2 spawns in exact order + the seeded `state.json` gets its `worktree` field set to `.worktrees/STORY-99-01` while `state` stays `Bouncing`.
2. `Scenario 2: story complete — 6-step spawn sequence in order` — asserts every command + args for all 6 spawns.
3. `Scenario 3: complete refuses when rev-list count = 0` — asserts exit 1, single spawn only, exact error message.
4. `Scenario 4: v1-inert for both commands` — 2 `it` blocks covering start + complete under FIXTURE_V1.
5. `Scenario 5: merge conflict surfaces cleanly` — asserts exit 1, stderr contains `"merge conflict"` + `"git merge --abort"`, and NO spawn invokes `git merge --abort` (orchestrator UX).

All 6 tests pass: `RUN v2.1.9 … Test Files 1 passed (1), Tests 6 passed (6)`.

## Verification

- `npm run typecheck` → clean.
- Full `npm test` (cleargate-cli) → **810 passed, 27 skipped, 2 failed** (both pre-existing: `bootstrap-root.test.ts` needs live Postgres, `snapshot-drift.test.ts` reads `mcp/` nested-repo snapshot absent in worktree). Identical baseline profile.
- `node .cleargate/scripts/test_ratchet.mjs check` → `OK — +25 tests passing (current=810, baseline=785)`. Ratchet passes.

## Plan adherence

- Consumed `resolveSprintIdFromSentinel` from `execution-mode.ts` (014-06 export) instead of the old filename-scan heuristic.
- Removed lines 176-180 stub guard. Handler now orchestrates inline.
- Atomic write pattern ported inline as `atomicWriteString(filePath, text)` — no import from `.mjs`.
- All seams (`spawnFn`, `exitFn`, `stdoutFn`, `stderrFn`) already present; reused.
- Tests pass `stdio: 'pipe'` implicitly via the mock (the real production path sets `stdio: 'pipe'` so stdout capture works).
- No new flashcards — no surprises during implementation.

## Files changed

- `cleargate-cli/src/commands/story.ts` — full rewrite of both handlers (~165 lines of handler logic).
- `cleargate-cli/test/commands/story.test.ts` — full rewrite of test file (~280 lines, 6 `it` blocks across 5 scenarios).
