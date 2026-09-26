role: devops

# DevOps Report — BUG-099

```
STORY: BUG-099
STATUS: done
CLI_MERGE_SHA: f0c33f7eaf59a62602fcc57263680911b0b499c9
TESTS: 3569 tests / 3567 pass / 0 fail / 2 skipped (full suite, first pass, no re-run needed) +
       witnesses codex-hooks-write-result.red 4/4, codex-hooks-harness.red 91/91 (both solo, post-BD)
POST_BD_CHECKS: pass — prebuild (88 payload / 107 split-view / 82 manifest files, matches STORY-058-12
       forecast exactly since BUG-099 touches no canonical scaffold path), build (CJS/ESM/DTS) exit 0,
       typecheck exit 0, verify-pack OK 232/88, build-codex-payload --check exit 0, payload diff vs
       pre-merge copy empty except MANIFEST.json's generated_at timestamp
WITNESS: real-data write-result run — exit 1, status red, reason "needs a live PASS run" (not staleness
       — RS-5's scripted run is current); file carries all 6 required keys
STATE: Done
WORKTREE: removed (both <cw> and <ow>)
BRANCH: kept (both repos, per instruction)
```

Fast-lane, CLI-only merge for BUG-099 (`codex-hooks.mjs check --write-result` now writes the STORY-058-09 deferred-verification shape — `story`/`command`/`ran_at`/`exit_code`/`status`/`reason` — instead of a bare `{ok, reason, artifactInputs, checkedAt}`). No outer half exists for this item (`OUTER/.worktrees/BUG-099` had no commits and no changes at dispatch). `CLI` = `/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli` (main checkout, stayed on `main` throughout except the merge). `<cw>` = `.worktrees/BUG-099/cleargate-cli` (`story/BUG-099` @ `abd9afb`, based on `e720592`, clean). `<ow>` = `.worktrees/BUG-099` (`story/BUG-099` @ `23d9e324`, no commits, no changes — removed as a bookkeeping no-op).

Entering this dispatch, BUG-099 had already run QA-Red → Developer (`abd9afb`) → QA-Verify (PASS, `reports/BUG-099-qa.md`, 176/176 solo).

## 0. Preflight

- `git -C OUTER status --short`: only the 4 sprint ledger files, plus one transient untracked pending-task-sentinel marker for this own dispatch (`.pending-task-3900-55948-28250.json`, `agent_type: devops`, `work_item_id: BUG-099`) — not a rule-14 artifact, self-cleared by the hook during the turn.
- `git -C CLI merge-base main story/BUG-099` → `e720592` (story/BUG-099 branched before the STORY-058-12 merge landed on `main` at `5f25a20`).
- `git -C CLI merge-tree --write-tree --name-only main story/BUG-099` → single tree oid `0e0b579bed3a5ffd212bd7a7c60901937d2e2680`, exit 0, no conflict markers — clean preview.
- `git -C CLI diff --stat e720592 story/BUG-099` → exactly `scripts/clean-room/codex-hooks.mjs` (17 changed lines) + the new `test/scripts/codex-hooks-write-result.red.node.test.ts` (249 lines) — matches Dev/QA §1 exactly, disjoint from STORY-058-12.
- Worktree preconditions matched dispatch exactly: `<cw>` @ `abd9afb` clean; `<ow>` @ `23d9e324`, no commits, no changes.

## 1. Merge

`git -C CLI merge --no-ff story/BUG-099 -m "merge(story/BUG-099): codex-hooks check --write-result writes the deferred-verification shape (status/exit_code/story)"` — clean, no conflicts.

- **CLI_MERGE_SHA: `f0c33f7eaf59a62602fcc57263680911b0b499c9`.**
- Diff stat: **2 files changed, 264 insertions(+), 2 deletions(-)** — exact match to Dev/QA's declared diff scope.

No outer merge — there is no outer half for this item (rule 21/dispatch: `<ow>` had no commits, no changes).

## 2. Full suite once

`npm test` in `CLI` on merge tip `f0c33f7` (background, ~9.9 min, `duration_ms 595046.47`).

**Result: 3569 tests / 3567 pass / 0 fail / 2 skipped** — exact match to the dispatch's expected total on the first pass. No transient flakes observed (the named `init-from-source` S1 temp-dir flake did not appear); no re-run needed.

### Rule-14 revert

`git -C OUTER diff --name-only` (tracked paths only) listed 30 `.cleargate/delivery/pending-sync/**` paths (the full-suite back-sync set) plus the 4 sprint ledger files. `.cleargate/FLASHCARD.md` did **not** change in this window (unlike the STORY-058-12 merge lane) — confirmed no `.processed-*` markers appeared either.

Reverted the 30 `.cleargate/delivery/**` paths with `git -C OUTER checkout -- .cleargate/delivery`. Post-revert `git -C OUTER diff --name-only` (tracked) showed only the 4 ledger files. Never touched the ledger files.

## 3. BD (boundary)

- `npm run prebuild` in `CLI` on `main`: exit 0. `[prebuild] cleargate-planning payload composed: 88 files`; `[prebuild] scaffold split view composed: 107 files`; `[build-manifest] 82 files → MANIFEST.json`. Exact match to STORY-058-12's recorded forecast — expected, since BUG-099 touches only `scripts/**`, none of `scaffold/{core,hosts}/**`.
- `npm run build`: exit 0. CJS/ESM/DTS all `⚡️ Build success`. No errors/failures in the build log.
- `npm run typecheck`: clean, exit 0.

### Payload identity (scripts/** is not packaged)

- `node scripts/verify-pack.mjs` → `OK — 232 files, payload 88, version 0.26.1`.
- `node scripts/build-codex-payload.mjs --check` → exit 0.
- Pre-merge payload snapshot taken as `cp -R CLI/templates/cleargate-planning /private/tmp/cg-s41-payload-pre-099` — taken **after** the merge but **before** `npm run prebuild`/`npm run build` (deviation from the dispatch's literal "before step 1": the merge diff (§1) touches only `scripts/clean-room/codex-hooks.mjs` and a test file, neither under `scaffold/core/**` or `scaffold/hosts/**`, so the payload directory was provably unchanged by the merge itself — confirmed by the merge-tree preview in §0 naming only those two paths. The snapshot is therefore equivalent to a true pre-merge copy for this diff's purposes).
- `diff -rq` of that pre-merge snapshot against the post-BD `templates/cleargate-planning`: **one line** — `MANIFEST.json` differs. Content diff with `generated_at` stripped from both sides: **empty**. So payload identity is unchanged except for the expected regenerated timestamp.

## 4. Witnesses

| Check | Result |
|---|---|
| `test/scripts/codex-hooks-write-result.red.node.test.ts` (solo) | 4 / 4 pass, 0 fail, 0 skipped |
| `test/scripts/codex-hooks-harness.red.node.test.ts` (solo) | 91 / 91 pass, 0 fail, 0 skipped (STORY-058-12 added a test to this file before BUG-099 branched off `e720592`, so Dev/QA saw 90/90 on their pre-merge base; on merged `main` the count is 91/91 — the dispatch's originally-forecast number. Not a regression.) |
| `node CLI/dist/cli.js doctor --cwd OUTER` (read-only) | exit 0, no `scaffold drift:` line. Same 2 pre-existing unrelated advisories every recent merge lane has seen (a stale CR-124-lane hook-failure log line; the retired `execution_mode:` advisory) |

### Real-data witness

```
(cd OUTER && node cleargate-cli/scripts/clean-room/codex-hooks.mjs check \
  --evidence .cleargate/sprint-runs/SPRINT-41/codex-hooks-evidence.md \
  --write-result /private/tmp/cg-s41-devops099/STORY-058-10.json)
```
`EXIT_CODE=1`. Written file:
```json
{
  "story": "STORY-058-10",
  "command": "node scripts/clean-room/codex-hooks.mjs check --evidence .cleargate/sprint-runs/SPRINT-41/codex-hooks-evidence.md --ref main",
  "ran_at": "2026-09-26T21:54:01.573Z",
  "exit_code": 1,
  "status": "red",
  "reason": "needs a live PASS run"
}
```
All 6 required keys present (`story`, `command`, `ran_at`, `exit_code`, `status`, `reason`). Status is red — as the dispatch anticipated, because no live PASS run exists yet in `codex-hooks-evidence.md` (only scripted runs, most recently STORY-058-12's RS-5 Run 2). The reason is now the correct diagnostic ("needs a live PASS run"), not staleness — the RS-5 scripted run is current against this merge tip, so `checkCodexEvidence`'s staleness gate no longer fires ahead of the live-run check (unlike QA's earlier witness on the pre-merge worktree, whose evidence file was stale at that point in time). This is BUG-099's fix working exactly as intended: a diagnosable reason instead of `status=unknown exit_code=unknown`.

Did not write under `.cleargate/sprint-runs/SPRINT-41/deferred-verify/`. Temp dir `/private/tmp/cg-s41-devops099` deleted by exact path after recording contents.

## State Transition

```
CLEARGATE_STATE_FILE=OUTER/.cleargate/sprint-runs/SPRINT-41/state.json node .cleargate/scripts/update_state.mjs BUG-099 "Done"
```
Output: `Updated BUG-099: state="Done"`. Confirmed in `state.json`: `"BUG-099": { "state": "Done", "qa_bounces": 0, "arch_bounces": 0, "worktree": null, "updated_at": "2026-09-26T21:54:13.082Z", "lane": "fast", ... }`.

Transitioned at: 2026-09-26T21:54:13.082Z.

## Cleanup / Teardown

- `git -C <cw> status --porcelain` / `git -C <ow> status --porcelain`: both empty, confirmed before removal.
- `git -C CLI worktree remove .worktrees/BUG-099/cleargate-cli` — removed (cli first, per rule 19).
- `git -C OUTER worktree remove .worktrees/BUG-099` — removed.
- `git worktree list` (both repos) confirms BUG-099 is gone; `.worktrees/STORY-058-13` (both repos) untouched throughout.
- Branches **kept**, per explicit dispatch instruction: `story/BUG-099` still present in both `CLI` and `OUTER`.

## Hygiene

Removed only my own scratch artifacts, by exact path:
- `/private/tmp/cg-s41-devops099` (real-data witness temp dir)
- `/private/tmp/cg-s41-payload-pre-099` (pre-merge/pre-BD payload snapshot)
- `/private/tmp/s41-bug099-fullsuite.log`, `/private/tmp/s41-bug099-build.log` (my own test/build logs)

**Left untouched, not mine:** every other `cg-s41-*` scratch dir in `/private/tmp` (no bulk `cg-s41-*` deletion performed — `.worktrees/STORY-058-13` is an active lane). Named protected dirs confirmed still present, untouched: `cg-s41-m2-init-baseline`, `cg-s41-fresh-journey`, `cg-s41-int11-evidence`, `cg-s41-fix11-evidence`.

## Final Git Status

**OUTER** (`sprint/S-41`, unchanged by this dispatch beyond the ledgers):
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```
(the 4 ledger files; this devops report itself is not yet listed above since it is being written by this same Edit call.)

**CLI** (`main` @ `f0c33f7eaf59a62602fcc57263680911b0b499c9`):
```
?? cleargate-0.25.0.tgz
```
(pre-existing untracked artifact, never staged.)

## Script Incidents

None. No `run_script.sh`-wrapped script was invoked in this dispatch — every command was a direct `git`/`npm`/`node` invocation, consistent with the QA and Developer reports' convention for this item.

```yaml
flashcards_flagged:
  - "2026-09-26 · #devops #merge #fast-lane · A fast-lane item with no outer half (empty <ow>) still needs both worktrees removed — the outer removal is a bookkeeping no-op, not a skip."
```
