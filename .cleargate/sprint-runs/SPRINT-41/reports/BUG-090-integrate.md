# BUG-090 — Developer INTEGRATE report

role: developer

```
STORY: BUG-090
STATUS: done
COMMIT: cli 2e638540e82fe49fde9e841ffd648db0adfa4ece (integrate(BUG-090): merge cli main c5a311e); outer 398dfac31b1bd9309a1ff465cd5e86f493619630 (integrate(BUG-090): merge sprint/S-41)
TYPECHECK: pass
TESTS: make-green 48/48 default delta + 2/2 integration; M2 pair 5/5 + 15/15; K12 anchors all green except the 4 named pre-existing template-sync-fields failures (16/20); K13 21/21 files green; -10 spot-check codex-hook-scripts 18/18, codex-hooks-harness 67/67, init-fixture-cleanup 3/3 (solo, see flake note)
FILES_CHANGED: none (mechanical integrate only — two merge commits, no new edits); outer twins re-derived and left uncommitted per protocol
```

Mechanical integration only. No new feature work, no test-file edits, no src edits beyond what the merges brought in.

## Where

- cli worktree `<cw>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-090/cleargate-cli`, branch `story/BUG-090`. Pre-integrate HEAD `f31c684` (Dev). Post-integrate HEAD `2e63854`.
- outer worktree `<ow>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-090`, branch `story/BUG-090`. Pre-integrate HEAD `0b97950d`. Post-integrate HEAD `398dfac3`.
- cli main checkout stayed on `main` @ `c5a311e` throughout. Never edited, tested or checked out beyond read-only `git log`/`diff`/`status`.
- A concurrent CR-124 INTEGRATE lane is active in the outer main checkout (its untracked report `reports/CR-124-integrate.md` appeared during this dispatch, and the 30 `delivery/pending-sync/*` back-sync files present at dispatch start were gone by the end — a different lane's Rule-14 revert, not mine). Not touched.

## 1. cli merge

`git -C <cw> merge --no-ff main -m "integrate(BUG-090): merge cli main c5a311e"` — **clean, no conflicts.** Auto-merged `test/helpers/init-fixture.ts` (BUG-090's tail append vs BUG-096's disjoint `mkShortTmpDir`/`TRACKED_TMP_DIRS` region, lines 62-90ish). Merge brought in 7 files from -10 pass C/D and BUG-096: `scripts/clean-room/{claude-baseline,codex-appserver,codex-hooks,evidence,mock-responses}.mjs`, `test/helpers/init-fixture.ts`, and the new `test/helpers/init-fixture-cleanup.red.node.test.ts`.

`git diff c5a311e HEAD --name-only` confirms the merge commit's own delta is exactly BUG-090's 16 files (5 scaffold/core, `probe-items.mjs`, `doctor.ts`, `push.ts`, and 8 test files) — nothing from CR-124/BUG-097/BUG-098 leaked in.

CHANGELOG.md had no diff on either side of the merge-base in this range, so no keep-both resolution was needed.

## 2. Conflicts

None. No `*.red.*` test conflict, no sanctioned-row conflict, no owner-file/insertion conflict. Nothing routed to QA-Red.

## 3. Regenerate / build

- `node scripts/build-codex-payload.mjs --check` → exit 0 (not stale; no `npm run gen:codex` needed, nothing to commit for regeneration).
- `npm run prebuild && npm run build` in `<cw>`: payload 80 files, split view 87, manifest 74, ESM build success, DTS build success. Writes landed only in `<cw>/templates/**` and `<cw>/dist/` (gitignored).

## 4. Outer twins (re-derived, never merged)

1. `git -C <ow> checkout -- <5 twin paths>` — discarded the build-phase copies.
2. `git -C <ow> merge --no-ff sprint/S-41 -m "integrate(BUG-090): merge sprint/S-41"` — **clean, no conflicts.** Brought in 80 files: FLASHCARD.md, item-file amendments (BUG-090/096/098, SPRINT-41, STORY-058-10), the `.processed-*` sentinels, and the M5/M5-fixwave/replan-contract-first plan appends plus reports from concurrent lanes (BUG-096/097, CR-124, STORY-058-10, STORY-058-11-qa-red).
3. `cp` each of the 5 canonical files from `<cw>/scaffold/core/.cleargate/{scripts,templates}/**` into `<ow>/.cleargate/{scripts,templates}/**`.
4. `cmp` — all 5 identical (see table).

| Twin (`<ow>/…`) | cmp vs `<cw>/scaffold/core/.cleargate/…` |
|---|---|
| `.cleargate/scripts/assert_story_files.mjs` | identical |
| `.cleargate/scripts/close_sprint.mjs` | identical |
| `.cleargate/templates/epic.md` | identical |
| `.cleargate/templates/story.md` | identical |
| `.cleargate/templates/hotfix.md` | identical |

Left **uncommitted** per protocol (merge lane commits the ESM pair plus templates in one outer commit at DevOps time).

**Link witnesses** (post re-derivation):
- `(cd <ow> && node .cleargate/scripts/close_sprint.mjs)` → usage printed, exit 2, no SyntaxError.
- `(cd <ow> && node .cleargate/scripts/assert_story_files.mjs)` → usage printed, exit 2, no SyntaxError.

## 5. Full re-verification (solo, in `<cw>`)

| Check | Result |
|---|---|
| `test/scripts/frontmatter-fence-parity.red.node.test.ts` | 21/21 |
| `test/scripts/assert-story-files-fence.red.node.test.ts` | 11/11 |
| `test/scripts/close-sprint-fence.red.node.test.ts` | 4/4 |
| `test/scripts/template-approved-key.red.node.test.ts` | 7/7 |
| `test/commands/push.node.test.ts` | 9/9 |
| `test/commands/doctor.node.test.ts` | 40/40 |
| `test/commands/doctor-session-start.node.test.ts` | 22/22 |
| `test/e2e/sprint-init-fresh-install.red.integration.node.test.ts` | 2/2 |
| **make-green total** | **48/48 default delta + 2/2 integration** — matches pre-integration Dev report exactly |
| `npm run typecheck` | clean |
| `node scripts/build-codex-payload.mjs --check` | exit 0 |
| `claude-adapter-init-parity.red.integration` (CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline, compare mode) | 5/5 |
| `init-host-parity.red.integration` (same baseline, compare mode) | 15/15 |

**K12 anchors:**

| File | Result |
|---|---|
| clean-room-evidence.red | 60/60 |
| frontmatter-locator.red | 11/11 |
| test_assert_work_item_files | 20/20 |
| sync-acquire | 9/9 |
| init-host-snapshot.red | 13/13 |
| status-vocab-phase-b.red | 75/75 |
| work-item-id | 47/47 |
| no-inline-id-regex | 7/7 |
| no-exec-mode-vocab | 4/4 |
| clean-room-baseline-coexistence.red | 24/24 |
| gate-section-index-pinning | 14/14 |
| close-sprint-step-2-6c.red | 8 pass + 1 skip |
| close-sprint-step-7-4.red | 6/6 |
| frontmatter-authoring.red.integration | 9/9 |
| canonical-live-parity.red.integration | 11/11 |
| template-sync-fields.integration | 16/20 (4 named pre-existing failures, below) |

**K13 — all 21 `CLEARGATE_META_ROOT`-honouring files, without the override** (default now resolves to `<ow>`):

| File | Result |
|---|---|
| new-command | 57/57 |
| no-exec-mode-vocab | 4/4 |
| claude-md-block-leads-relocation.red | 4/4 |
| clean-room-verification-doc.red | 9/9 |
| test-layers-declared-doctrine.red | 11/11 |
| frontmatter-authoring.red.integration | 9/9 |
| spidr-coverage.red.integration | 1/1 |
| hook-signal.red.integration | 3/3 |
| hook-signal.red | 14/14 |
| pre-tool-use-task | 13/13 |
| token-ledger-attribution | 9/9 |
| token-ledger-regression | 14/14 |
| readiness-predicates-spidr-coverage.red | 32/32 |
| readiness-predicates-test-layers-declared.red | 17/17 |
| enforcement-doc-coherence | 26/26 |
| file-surface-gate-e2e | 21/21 |
| pre-commit-downstream-safe | 12/12 |
| ratchet-retired | 8/8 |
| close-sprint-assume-ack-guard | 20/20 |
| scaffold-relocation.red | 15/15 |
| bucket-registry-parity.red | 11/11 |

Every count is byte-identical to the pre-integration Dev report's tables. `-10`'s merge changed nothing BUG-090 touches, and the merge left every anchor's behavior unchanged.

**-10 regression spot-check:**

| File | Result |
|---|---|
| `test/hooks/codex-hook-scripts.red.node.test.ts` | 18/18 |
| `test/scripts/codex-hooks-harness.red.node.test.ts` | 67/67 |
| `test/scripts/clean-room-baseline-coexistence.red.node.test.ts` | 24/24 (already counted under K12) |
| `test/helpers/init-fixture-cleanup.red.node.test.ts` | 3/3 (solo — see flake note) |

**Flake note:** `init-fixture-cleanup.red.node.test.ts` failed once (`ERR_ASSERTION actual:1 expected:0`) when run in a batch immediately after the 21-file K13 background run was still finishing on the same machine (two heavy backgrounded batches overlapping, per replan §5 "full-suite load flakes"). Re-run solo immediately after: 3/3 green, no code path touches this test. Treated as contention, not a regression — matches the plan's documented hazard class.

## Entry-gate greps (M5-fixwave Order 1, run at integration per RP-A20)

Re-ran the M5-fixwave entry gate against the integrated range (`d0f0d95` → pre-merge `main` `c5a311e`, i.e. everything -10/BUG-096 added before BUG-090's own merge):

- `test/helpers/init-fixture.ts`: only `SANCTIONED_BASELINE_DELTAS`-adjacent... actually only BUG-096's `mkShortTmpDir`/`TRACKED_TMP_DIRS` region (`:62-90`) changed — disjoint from BUG-090's tail rows. ✅
- `src/commands/doctor.ts`: **no change** between C1 and pre-merge `main`. ✅
- `scripts/clean-room/probe-items.mjs`: **no change**; `approveProbeStory` unchanged. ✅
- The five `scaffold/core/.cleargate/{scripts,templates}` files: **no change**. ✅

Entry gate holds — the BUG-090 delta-row literals in the plan remain valid.

## Named reds (pre-existing, not this dispatch's)

- `test/scripts/template-sync-fields.integration.node.test.ts`: 4 failures, all "live template {epic,story,CR,Bug}.md — parseFrontmatter returns all 6 new keys", `TypeError: Cannot use 'in' operator to search for 'pushed_by' in <name> frontmatter should have key "pushed_by"`. Cause: test bug at `:78`, `assert.ok(field in (fm, msg))` — the comma operator evaluates to the message string. Fails identically on untouched `CR.md`/`Bug.md` at any commit (same as the pre-integration Dev report, FW-A16).

## Git statuses

```
$ git -C <cw> status --porcelain
(empty — 2e63854 is HEAD)

$ git -C <ow> status --porcelain
 M .cleargate/scripts/assert_story_files.mjs
 M .cleargate/scripts/close_sprint.mjs
 M .cleargate/templates/epic.md
 M .cleargate/templates/hotfix.md
 M .cleargate/templates/story.md

$ git -C /Users/ssuladze/Documents/Dev/ClearGate status --porcelain
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
?? .cleargate/sprint-runs/SPRINT-41/reports/CR-124-integrate.md
```

The outer-main entries are not this dispatch's: the ledger/state/session-totals churn is normal per-dispatch bookkeeping, and `CR-124-integrate.md` belongs to a concurrent CR-124 INTEGRATE lane running in parallel (confirmed by its filename and the fact it appeared mid-dispatch). This dispatch wrote nothing to the outer main checkout except this report.

## Script Incidents

None. No `run_script.sh`-wrapped script was invoked (all runs were direct `npm run test:file` / `npm run typecheck` / `npm run prebuild` / `npm run build` / `node scripts/build-codex-payload.mjs --check` from `<cw>`, per replan §4 "Where tests run").

## Next step (for DevOps)

Per replan §6 step 7-8: the outer-half commit (twins + any item-file ticks) lands in the merge lane, then DevOps runs `git -C CLI merge-base --is-ancestor main story/BUG-090` and `git -C OUTER merge-base --is-ancestor sprint/S-41 story/BUG-090` (both should hold — no `main`/`sprint/S-41` movement was observed by this dispatch beyond what's already merged in), then outer → `sprint/S-41`, cli → `main`, full suite once, Rule-14 revert, BD, witnesses, ledger row, teardown. D4 = previous merge total + 48 (unchanged from the pre-integration Dev report's projection, since the make-green delta is unchanged by this merge).

```yaml
r_coverage: []
plan_deviations: []
adjacent_files:
  - "cleargate-cli/scripts/clean-room/claude-baseline.mjs"
  - "cleargate-cli/scripts/clean-room/codex-hooks.mjs"
  - "cleargate-cli/test/helpers/init-fixture.ts"
  - "cleargate-cli/test/scripts/template-sync-fields.integration.node.test.ts"
flashcards_flagged:
  - "2026-09-26 · #test-harness #concurrency · Two heavy backgrounded npm test:file batches on one machine can flake a green test; always re-run solo before calling it a regression."
  - "2026-09-26 · #worktree #integration · CR-124/BUG-090 INTEGRATE dispatches ran concurrently; outer-main `git status` is a moving target mid-sprint — read it, don't diff against a stale snapshot."
```
