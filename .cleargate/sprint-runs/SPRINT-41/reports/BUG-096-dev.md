role: developer

# BUG-096 — Developer report

```
STORY: BUG-096
STATUS: done
COMMIT: 266c1ba
TYPECHECK: pass
TESTS: 3 passed, 0 failed (init-fixture-cleanup.red.node.test.ts, solo)
FILES_CHANGED: cleargate-cli/test/helpers/init-fixture.ts
```

## Change

- cli `story/BUG-096` in `<cw>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-096/cleargate-cli`
- Base: `1619fad` (QA-Red, 3/3 red)
- Commit: `266c1ba` — `fix(BUG-096): init-fixture tracks and removes its temp dirs at exit`
- One file touched, within the pinned `mkShortTmpDir` region (`init-fixture.ts:65-67` at the base commit): added `TRACKED_TMP_DIRS`, `cleanupRegistered`, `registerTmpCleanup()`, rewrote `mkShortTmpDir` to track+register, and exported `trackedTmpDirs()`. Byte-for-byte the pinned shape in `plans/M5-fixwave.md` §BUG-096. No caller file, no `src/**`, no test file edited.

## Per-file counts

| File | Before (red) | After (green) |
|---|---|---|
| `test/helpers/init-fixture-cleanup.red.node.test.ts` (solo) | tests 3 / pass 0 / fail 3 | tests 3 / pass 3 / fail 0 |

Confirmed the fix is load-bearing: `git stash` on the one changed file reproduced the exact 3/3 red (`TypeError: trackedTmpDirs is not a function`, same stack as the QA-Red report), `git stash pop` restored green.

**Anchors (solo, unchanged behavior, all green):**

| File | Result |
|---|---|
| `test/commands/init-host-selection.red.node.test.ts` | 10/10 pass |
| `test/commands/init-host-snapshot.red.node.test.ts` | 13/13 pass |
| `test/hosts/host-adapter-contract.red.node.test.ts` | 19/19 pass |
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`) | 5/5 pass |
| `test/commands/init-host-parity.red.integration.node.test.ts` (same baseline env) | 15/15 pass |

M2 baseline hash after all runs: `find /private/tmp/cg-s41-m2-init-baseline -type f -print0 \| sort -z \| xargs -0 shasum -a 256 \| shasum -a 256` → `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` (matches the required hash, 425-file baseline untouched — read-only throughout).

`npm run typecheck` — clean, before and after the commit.

## Leak before/after

Raw `/tmp` counts of `cg-s41-fix-*`/`cg-s41-payload-*` are not a clean signal machine-wide right now: other build lanes (BUG-090/BUG-097/STORY-058-10/-11) run concurrently against unpatched copies of the same fixture in their own worktrees and add to the same `/tmp`, per sprint-context Rule 20. Global count drifted 352 → 358 across my whole verification session for that reason, not because this fix leaks.

The blueprint's actual leak probe (targeted before/after around one anchor file) is the correct signal and is clean:
```
before = 358   ls -d /tmp/cg-s41-fix-* /tmp/cg-s41-payload-* | sort
(solo-run test/commands/init-host-selection.red.node.test.ts — 10/10 pass)
after  = 358   same listing
comm -13 before after → (empty — no new entry survived the run)
```
Same zero-delta result held for the new red-turned-green test itself (352 → 352, run in isolation right after the fix landed, before other lanes had run).

## Git status

```
$ git -C <cw> status --porcelain
(clean, HEAD 266c1ba)

$ git -C /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-096 status --porcelain
(clean)

$ git -C /Users/ssuladze/Documents/Dev/ClearGate status --porcelain
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```
The outer diffs are pre-existing/concurrent-lane orchestrator, ledger and other-item writes (BUG-097 QA-Red, session totals, etc.) — not caused by this dispatch. No back-sync from this dispatch landed in the outer host worktree or the outer main checkout.

## Task Breakdown

The bug's `## Task Breakdown` lives in `.cleargate/delivery/pending-sync/BUG-096_init_fixture_leaks_tmp_dirs.md`, in the outer main checkout — outside this cli-only dispatch's assigned scope (outer host worktree `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-096` is a detached `sprint/S-41` checkout with no story branch to commit the tick to, and the dispatch's Scope section restricts edits to `test/helpers/init-fixture.ts` only). Status for the orchestrator/DevOps to tick at the boundary step:
- [x] QA-Red: a child-process test proves the scenario dir and payload dir are gone after the child exits, both for a passing child and a throwing child — done by QA-Red (`1619fad`, 3/3 red, verified green above)
- [x] Track every `mkShortTmpDir` result; remove all tracked dirs in one `process.on('exit')` handler — done (`266c1ba`)
- [x] Export trackedTmpDirs() from init-fixture.ts (test-only snapshot of the cleanup set) — done (`266c1ba`)
- [x] Prove capture mode still writes a baseline that survives the process — proven by test B3 (`never tracks a captured baseline dir for cleanup, and the baseline survives`), green above

## Notes

No plan deviations. The pinned change shape from `plans/M5-fixwave.md` §BUG-096 applied verbatim and satisfied all 3 sealed red tests without any assertion conflict. No flashcard-worthy surprise from this dispatch — QA-Red's two flashcards already cover the interesting mechanics (child-crash-starves-later-asserts, snapshot-diff self-cleanup) and this dispatch found nothing beyond that.

```yaml
r_coverage:
  - { r_id: "R1", covered: true, deferred: false, clarified: false }  # scenario+payload dirs removed on normal exit (B1)
  - { r_id: "R2", covered: true, deferred: false, clarified: false }  # cleanup also runs when the child throws (B2)
  - { r_id: "R3", covered: true, deferred: false, clarified: false }  # captured baseline is never tracked and survives (B3)
plan_deviations: []
adjacent_files:
  - "cleargate-cli/test/helpers/host-fixtures.ts"
flashcards_flagged: []
```
