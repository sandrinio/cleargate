role: developer

# BUG-047 Developer report

```
STORY: BUG-047
STATUS: done
COMMIT: 8b7daf3 (cli, branch story/BUG-047, parent 9a44e4b)
TYPECHECK: pass
TESTS: 5 passed, 0 failed (re-sealed red file); targeted + regression set 367 passed, 6 failed (6 are the TPV-documented pre-existing base failures, unrelated)
FILES_CHANGED: cleargate-cli/src/lib/frontmatter-cache.ts, cleargate-cli/src/commands/sprint.ts, cleargate-cli/CHANGELOG.md
NOTES: Implemented exactly the binding Developer brief (BUG-047-tpv.md) + M7 §3 + TPV047-A1..A5. Nothing else changed: gate.ts, stamp-frontmatter.ts, readiness predicates, wiki/lint-checks.ts, refreshScopedGateCaches' iteration and every test are untouched. The bug file's Task Breakdown rows are NOT ticked: the item file lives in the outer main checkout, and this dispatch forbids outer edits other than this report. The orchestrator should tick rows 2 and 3 (row 1 is QA-Red's). Two flashcards are flagged below.
```

## What changed (commit 8b7daf3, +67/-15)

- **`src/lib/frontmatter-cache.ts`**
  - New export `isGateCacheFresh(cached: { last_gate_check: string } | null, updatedAt: string): boolean`. Its body is exactly the brief's: `cached !== null && cached.last_gate_check !== '' && (updatedAt === '' || cached.last_gate_check >= updatedAt)`.
  - `writeCachedGate`'s idempotency early return now also needs `isGateCacheFresh(existing, String(fm['updated_at'] ?? ''))`. It uses the existing cache and `updated_at`, never `newResult` and never `created_at`. When the skip does not fire, the full `newResult` is written, as before.
  - I rewrote the comment above that block and the function docstring. They now say the skip applies only to a fresh cache and that `pass` plays no part in freshness.
- **`src/commands/sprint.ts`**
  - Added `import { isGateCacheFresh } from '../lib/frontmatter-cache.js'`.
  - The Check 5 item site (:1666) and plan site (:1710) are now `!isGateCacheFresh(cachedGate, updatedAt)` and `!isGateCacheFresh(sprintGate, sprintUpdatedAt)`. The reason string `'stale'` and the reason order (null, then pass=false, then stale) are unchanged.
  - `restoreIfOnlyTimestampMoved` keeps two guards: `after === original → return`, and the `withoutGateTimestamp` equality test (now written as an early return). It then parses the **original** bytes. If `cached_gate_result` is a mapping it builds `{ last_gate_check: String(... ?? '') }`, otherwise it uses `null`. It restores only when `isGateCacheFresh(cached, String(fm['updated_at'] ?? ''))`. This is pass-independent, the boundary counts as fresh, and the best-effort try/catch is kept.
  - I updated the docstring and the Step-0 comment (:1864-1873). An already-fresh original is restored. A stale item keeps its stamp, so the file is dirtied once and Check 4 fails in that run: commit, then re-run.
- **`CHANGELOG.md`**: one `### Fixed` entry under `## Unreleased`.

## Verification (all in `<cw>` = `.worktrees/BUG-047/cleargate-cli`; each file run solo with `npm run test:file --`)

- `npm run typecheck`: exit 0, no output. `npm run build` (inside the worktree only, rule 11): exit 0.
- Brief-named set, every one at the expected count:

| File | Result |
|---|---|
| test/lib/gate-cache-staleness.red.node.test.ts | 5/5 (fail 0, skipped 0) |
| test/commands/sprint-preflight.node.test.ts | 27/27 |
| test/lib/frontmatter-cache.node.test.ts | 11/11 |
| test/lib/frontmatter-writers.red.node.test.ts | 30/30 |
| test/commands/gate-unit.node.test.ts | 30/30 |
| test/commands/stamp.node.test.ts | 10/10 |
| test/wiki/lint-checks-gate.node.test.ts | 6/6 |

- Regression set. This covers every file `command grep -rlE` finds for `writeCachedGate|restoreIfOnlyTimestampMoved|isGateCacheFresh|cached_gate_result|gateCheckHandler|sprintPreflightHandler`, plus every importer of `frontmatter-cache` or `commands/sprint`, plus the TPV's extra witnesses:

| File | Result |
|---|---|
| commands/doctor-session-start | 22/22 |
| commands/doctor | 40/40 |
| commands/hotfix-new.integration | 7/9: the same 2 failures as TPV base (meta `wiki/index.md` has no "Hotfix Ledger") |
| e2e/frontmatter-authoring.red.integration | 9/9 |
| e2e/spidr-coverage.red.integration | 1/1 |
| lib/work-item-type-spike | 12/12 |
| scripts/template-stubs.integration | 50/50 |
| scripts/template-sync-fields.integration | 16/20: the same 4 failures as TPV base ("live template … all 6 new keys") |
| integration/advisory-env-gate.red | 3/3 |
| scripts/close-sprint-assume-ack-guard | 20/20 |
| scripts/enforcement-section-13 | 11/11 |
| commands/sprint-archive-stamp.integration | 14/14 |
| commands/sprint-archive | 18/18 |
| commands/sprint-frontmatter-fence.red | 5/5 |
| commands/sprint-init-decomp-gate | 11/11 |
| commands/sprint-sentinel-validation | 14/14 |
| commands/sprint-unit | 11/11 |
| commands/sprint.dashboard | 9/9 |
| commands/sprint | 5/5 |
| dashboard/cr097 | 13/13 |
| dashboard/cr101 | 25/25 |
| e2e/sprint-allow-drift-fresh-install.red.integration | 1/1 |

- **Fail without the fix.** I cloned `9a44e4b` into scratch; no stash. Its src fails the red file on exactly T1, T2 and T5 (2/5), for the reasons QA-Red recorded. The same file passes 5/5 at `8b7daf3`.
- **Real-data probe.** This was read-only against the meta-repo. I copied `pending-sync/BUG-047_Gate_Cache_Stamp_Deadlock.md`, which is stale (lgc `2026-08-25T21:32:29Z` < updated `2026-09-27T08:29:05Z`), and a copy of `readiness-gates.md` into a throwaway git repo in scratch. Sequence: gate check → stamp → gate check.
  - **Old binary** (cli main checkout dist, `0e5b0ac`): `last_gate_check` stays `2026-08-25T21:32:29Z` through every step. After the stamp, `updated_at` = `10:27:40Z`. The bug reproduces.
  - **New binary** (worktree dist, `8b7daf3`):
    - gate check 1 advances lgc to `10:27:50Z`.
    - stamp moves `updated_at` to `10:27:51Z`.
    - gate check 2 advances lgc to `10:27:52Z`, which is ≥ `updated_at`.
    - A third gate check with no edit leaves the file byte-identical (CR-038).
    - The file diff touches only `updated_at`, `updated_at_version` and `last_gate_check`.
  - Every run used `node <dist>/cli.js`; nothing ran against the meta-repo's delivery files.

## Mutant cross-check (my build; scratch clone nested in a `git archive` of the outer worktree `7db0e89e`; the red file runs first, and the three existing witnesses run only if the red file survives)

| Id | Wrong build | Result |
|---|---|---|
| M1 | restore unconditional | killed: red 4/5 |
| M2 | restore judges from the **after** bytes | killed: red 4/5 |
| M3 | restore never restores | killed: red 4/5 |
| M4 | restore inverted | killed: red 4/5 |
| M5 | restore boundary `>` | killed: red 4/5 (T5 C) |
| M6 | early return unconditional (old code) | killed: red 3/5 |
| M7 | early return removed | killed: red 4/5 |
| M8 | freshness from `created_at` | killed: red 3/5 |
| M9 | `writeCachedGate` boundary `>` | killed: red 4/5 |
| M10 | freshness of `newResult` | killed: red 3/5 |
| M11 | stale: new stamp spliced onto the old verdict | killed: red 4/5 (T4) |
| M12 | early return only when passing | killed: red 4/5 |
| M13 | stale failing items never advance | killed: red 4/5 |
| M14 | stale rewrite keeps the old lgc | killed: red 2/5 |
| M15 | empty `updated_at` = stale | killed: frontmatter-writers.red 29/30 (sole killer, as TPV said) |
| M17 | `isGateCacheFresh` `>` | killed: red 2/5 |
| M18 | Check 5 item site `<=` | killed: red 4/5 |
| M19 | Check 5 plan site `<=` | killed: red 4/5 |
| M20 | item site never stale | killed: sprint-preflight 25/27 (sole killer S11/S16) |
| M21 | plan site never stale | killed: red 4/5 (T2 phase 2) |
| M23 | restore drops the verdict-equality check | killed: sprint-preflight 26/27 (sole killer S20) |
| M25 | restore reverts stale **failing** items | killed: red 4/5 (T5 D) |

- **Total:** 22/22 non-equivalent mutants killed.
- **Code read for the equivalent mutants:**
  - M22: both Check 5 sites call `isGateCacheFresh` (sprint.ts:1666, :1710). No inline comparison remains; `command grep -n "last_gate_check <" src/commands/sprint.ts` finds nothing.
  - M16: `isGateCacheFresh` returns false for an empty `last_gate_check`, as the brief pins.
- **Type errors.** tsc errors from dead variables in the M1, M3, M7, M20, M21 and M23 builds are artefacts of those mutants. tsx runs regardless, so they did not affect the kills.

## Pinned consequences (contract, per brief §5)

- A stale item's Step-0 refresh leaves the file modified, so Check 4 fails in that run; commit, then re-run.
- Check 5 now reports a hand-written `pass: true` cache with no `last_gate_check` as `stale`.
- After BD, only strictly stale live items rewrite on their next gate. Items at the boundary do not (R-5 / TPV047-A5).

## Outer-checkout status after all commands

`git -C /Users/ssuladze/Documents/Dev/ClearGate status --short` shows the 4 ledger files. It also shows changes this dispatch did not make, which appeared during the run from the concurrent BUG-101 lane and the orchestrator:
- `M .cleargate/FLASHCARD.md`: 3 new cards tagged `#pre-gate`, `#codex #clean-room` and `#codex #dispatch`, none from BUG-047.
- `?? .processed-09d2f563ce23` and `?? .processed-7360d1c7f86e`, both written 14:32.
- `?? reports/BUG-101-integrate.md` and `?? reports/BUG-101-prescan.txt`.

The outer worktree `.worktrees/BUG-047` is clean, and so is the cli worktree after the commit. The scratch dir `/private/tmp/cg-s41-dev047-20260927T102536Z` was deleted by exact path. One stray file, `/private/tmp/cg-s41-dev047-out.txt`, was briefly used outside that dir during the first test loop. It was removed in the same command.

## Script Incidents

None. `run_script.sh` was not needed; no sprint script was invoked.

```yaml
r_coverage:
  - { r_id: "R1", covered: true, deferred: false, clarified: false }   # bug §5.1 gate → stamp → gate advances (T1 incl. failing half)
  - { r_id: "R2", covered: true, deferred: false, clarified: false }   # §5.2 Check 5 passes after re-gate, item + plan site (T2)
  - { r_id: "R3", covered: true, deferred: false, clarified: false }   # §5.3 CR-038 no-edit rerun byte-identical (T3 a/b/c)
  - { r_id: "R4", covered: true, deferred: false, clarified: false }   # §5.4 verdict change writes verdict + stamp, fresh and stale (T4)
  - { r_id: "R5", covered: true, deferred: false, clarified: false }   # §5.5 archived/terminal skipped (sprint-preflight S13/S18 unchanged, 27/27)
  - { r_id: "R6", covered: true, deferred: false, clarified: false }   # M7 §3 Step-0 restore: stale keeps, fresh restored (T5 A-D)
plan_deviations: []
adjacent_files:
  - "cleargate-cli/src/commands/gate.ts"
  - "cleargate-cli/src/wiki/lint-checks.ts"
  - "cleargate-cli/src/commands/doctor.ts"
  - ".claude/hooks/stamp-and-gate.sh"
flashcards_flagged:
  - "2026-09-27 · #gate #cache · BUG-047: gate check now rewrites a stale cache; stop hand-bumping last_gate_check by hand."
  - "2026-09-27 · #test-harness #gate · A real-item gate/stamp probe needs only a git repo plus a copy of readiness-gates.md."
```
