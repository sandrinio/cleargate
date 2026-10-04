role: devops

# DevOps Report — BUG-098

```
STORY: BUG-098
STATUS: done
OUTER_TWIN_SHA: 28cd64d6b97dbd5fca5e174982e56d3475fc2b78
OUTER_MERGE_SHA: 3898c05e55bc127372c95c2cb658697177657ba3
CLI_MERGE_SHA: e720592340363340d8708633efe64e051428e159
TESTS: 3513 tests / 3511 pass / 0 fail / 2 skipped (init-from-source S1 red on first pass, confirmed transient concurrency artifact via solo re-run 11/11/0/0)
POST_BD_CHECKS: pass — prebuild (83 payload / 102 split-view / 77 manifest files), build (CJS/ESM/DTS) exit 0, typecheck exit 0, verify-pack 222 files/payload 83, build-codex-payload --check exit 0, M2 pair 5/5+15/15, canonical-live-parity 11/11, sprint-allow-drift-fresh-install 1/1, sprint-archive-stamp 14/14, doctor --cwd OUTER exit 0 (no "scaffold drift:" line)
STATE: Done
WORKTREE: removed (both <cw> and <ow>)
BRANCH: kept (both repos, per instruction)
```

Merge lane for BUG-098 (position-independent frontmatter writes across TS writers — `frontmatterYaml`/`withFrontmatterYaml` splice helpers threaded through `doctor.ts`, `sprint.ts`, `wiki-audit-status.ts`, `frontmatter-merge.ts`, `intake.ts`, `lifecycle-reconcile.ts`, `readiness-predicates.ts`, `slug.ts`, `wiki/contradict.ts` — plus the 2 live-mirror scripts `prep_reporter_context.mjs` and `dedupe_frontmatter.mjs`). Two-repo, one turn, per `plans/M5-fixwave.md` § DevOps (BUG-098, one turn; Rule 15 order). `CLI` = `/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli` (main checkout, stayed on `main` throughout except the merge). `OUTER` = `/Users/ssuladze/Documents/Dev/ClearGate` (`sprint/S-41`). `<cw>` = `.worktrees/BUG-098/cleargate-cli` (`story/BUG-098` @ `ff29236`, clean). `<ow>` = `.worktrees/BUG-098` (`story/BUG-098` @ `2e4d6fe4`, 2 twins uncommitted).

Entering this dispatch, BUG-098 had already run QA-Red → Developer → integrate (re-sync onto cli main `0399beb` / outer `sprint/S-41` `667e8bce`, `reports/BUG-098-reintegrate.md`) → QA-Verify re-run (PASS, `reports/BUG-098-qa2.md`, 616/616/0/0) → Architect post-flight standing on the original `9b2abf0` review.

## Blocker and resume

Step 1's outer twin commit initially blocked. The dispatch's precondition call, `update_state.mjs BUG-098 "Architect Passed"`, was a true no-op — BUG-098 was already in that exact state, so `updated_at` did not refresh (`update_state.mjs` is documented idempotent: zero-write, no event appended, no timestamp bump when `story.state === newState`). Because of that, the outer surface gate's "most recently updated item" fallback (`file_surface_diff.sh`'s `resolve_story_file()`) resolved the active item to `STORY-058-11` (`updated_at 2026-09-26T19:20:34.262Z`) rather than `BUG-098` (`2026-09-26T18:12:48.694Z`) — STORY-058-11's §3.1 does not declare either twin script path, so the commit was blocked:

```
[surface-gate] BLOCKED: staged files outside declared §3.1 surface:
  off-surface: .cleargate/scripts/dedupe_frontmatter.mjs
  off-surface: .cleargate/scripts/prep_reporter_context.mjs
[surface-gate] Commit blocked. Declare these files in §3.1 or open a CR:scope-change.
[surface-gate] Set SKIP_SURFACE_GATE=1 to bypass.
```

Per the dispatch's explicit contingency, I halted without setting `SKIP_SURFACE_GATE`, without editing any §3.1, and wrote `reports/BUG-098-devops-blockers.md` (left in place, per the coordinator's instruction — not deleted, not committed by me). No merge, test, or teardown step had run at that point; `<ow>`'s two twin files were left staged (not committed), HEAD unchanged.

The coordinator resolved this on the orchestrator side with two real state transitions on OUTER — `BUG-098` → "QA Passed" (the QA re-run genuinely passed, `reports/BUG-098-qa2.md`) → "Architect Passed" (the original post-flight on `9b2abf0` stands; the re-integrate was mechanical) — which pushed BUG-098's `updated_at` to `2026-09-26T20:14:24.843Z`, ahead of every other item including STORY-058-11 (confirmed by reading `state.json` before resuming: BUG-098 was the max of all 22 entries). On resume the gate's fallback now resolves the active id to `BUG-098` itself; because `resolve_story_file()`'s `find_story_file()` helper hardcodes a `STORY-` prefix glob (`STORY-${story_num}_*.md`), it can never match a `BUG-`-prefixed id, so the gate printed the skip path instead of a block:

```
[surface-gate] WARNING: No active story file found (searched <ow> and OUTER) — skipping surface check
```

No `update_state` call was re-run before the twin commit on resume, per the coordinator's explicit instruction. Steps 1 (commit) through 9 below then ran exactly as originally briefed, with no further deviation.

## 1. Outer twin commit (resumed)

- Re-verified `git -C <ow> diff --cached --name-only` showed exactly the 2 twins (still staged from the blocked attempt) and `git -C <ow> status --short` showed only those 2 as ` M`.
- Re-ran `cmp`: both twins identical to `<cw>/scaffold/core/.cleargate/scripts/…` (unchanged from the pre-block verification).
- `git -C <ow> commit` succeeded: **OUTER_TWIN_SHA `28cd64d6b97dbd5fca5e174982e56d3475fc2b78`** — `chore(BUG-098): live mirror twins — prep_reporter_context.mjs + dedupe_frontmatter.mjs (byte-copy of canonical)`. 2 files changed, 43 insertions(+), 27 deletions(-). No `SKIP_SURFACE_GATE` set.
- Link witnesses (from OUTER, post-commit, pre-merge): `node .cleargate/scripts/prep_reporter_context.mjs` → `Usage: node prep_reporter_context.mjs <sprint-id>`, exit 2 — no SyntaxError. `node .cleargate/scripts/dedupe_frontmatter.mjs --dry-run /private/tmp/cg-s41-fw-empty-dir` (fresh empty dir) → `Dedupe complete: 0 would-rewrite, 0 skipped, 0 errors.`, exit 0.

## 2. Outer merge FIRST

`git -C OUTER merge --no-ff story/BUG-098 -m "merge(story/BUG-098): position-independent frontmatter writes (TS writers, 2.6d, parent-approved, slug, intake, doctor, 2 scripts) — live mirror twins"` — **clean, no conflicts.**

- **OUTER_MERGE_SHA: `3898c05e55bc127372c95c2cb658697177657ba3`.**
- Diff stat: **2 files changed, 43 insertions(+), 27 deletions(-)** — the same 2 scripts the twin commit carried (the only outer-tracked commit on `story/BUG-098` ahead of `sprint/S-41`).
- Post-merge link witnesses re-run (fresh mktemp dir): both prints identical to §1 above (usage/exit-2, and `Dedupe complete: 0 would-rewrite, 0 skipped, 0 errors.`/exit-0).

## 3. Cli merge SECOND

`git -C CLI merge --no-ff story/BUG-098 -m "merge(story/BUG-098): position-independent frontmatter writes across TS writers + 2 scripts"` — **clean, no conflicts.**

- **CLI_MERGE_SHA: `e720592340363340d8708633efe64e051428e159`.**
- Diff stat: **26 files changed, 2018 insertions(+), 118 deletions(-)** — exactly the file set and stat recorded by every prior report (Dev re-integrate §1, QA-Verify re-run §1): the 12 TPV allow-list src/scaffold files (`src/commands/{doctor,sprint,wiki-audit-status}.ts`; `src/lib/{frontmatter-locator,frontmatter-merge,intake,lifecycle-reconcile,readiness-predicates,slug,wiki/contradict}.ts`; the 2 canonical scripts under `scaffold/core/.cleargate/scripts/`), 13 test files (6 new red files + amendments), and `test/helpers/init-fixture.ts` (the previously-resolved criss-cross-merge tail insertion, carried through unchanged).

## 4. Full suite once

`npm test` in `CLI` on merge tip `e720592` (background, ~15.1 min, `duration_ms 906156.98`).

**First-pass result: 3513 tests / 3510 pass / 1 fail / 2 skipped.** The one failure:

```
test/commands/init-from-source.node.test.ts
✖ Scenario 1: Local core/host path composes into an owned temp payload...
  AssertionError: --from-source composition left a temp dir behind: PLl1fJ_vfXxVQ5rgY1sia
```

This is the same class of transient `os.tmpdir()`-scan cleanup-assertion flake documented in flashcards (`#devops #test-harness`: "init-from-source S1 reds when parallel lanes leave cg-hook-test-* in os.tmpdir; re-run it solo first") and hit by the prior merge (STORY-058-11, same file, different scratch-dir name).

**Diagnosis, confirmed by solo re-run:**
```
$ npm run test:file -- test/commands/init-from-source.node.test.ts
ℹ tests 11
ℹ pass 11
ℹ fail 0
```
Per the coordinator's note the concurrent STORY-058-12 integrate lane had already finished by the time this ran, so the leftover scratch dir was most likely a residue of an earlier/adjacent run against the same shared temp root rather than a live concurrent writer — the solo-rerun rule was kept regardless, per the dispatch's own instruction to always re-run this class of failure before any verdict.

**Corrected total: 3513 tests / 3511 pass / 0 fail / 2 skipped** — exactly the dispatch's forecast (3486 + 27, the previous merge's total plus BUG-098's default-tier delta).

## 5. Rule-14 revert

`git -C OUTER diff --name-only` listed 34 paths: the same 30 `.cleargate/delivery/pending-sync/**` full-suite back-sync paths every prior merge has seen, plus the 4 sprint ledger files. Reverted only the 30 delivery paths with `git -C OUTER checkout -- <paths>`. Post-revert `git -C OUTER diff --name-only` showed only the 4 ledger files. Never touched the ledger files.

## 6. BD

- `npm run prebuild` in `CLI` on `main`: exit 0. `[prebuild] cleargate-planning payload composed: 83 files`; `[prebuild] scaffold split view composed: 102 files`; `[build-manifest] 77 files → MANIFEST.json`.
- `npm run build` (captured to a log file, never piped through `head` — flashcard `#devops #build`): exit 0. CJS/ESM/DTS all `⚡️ Build success`.
- `npm run typecheck`: clean, exit 0.

## 7. Payload identity CHANGES

`diff -rq /private/tmp/cg-s41-fw-payload-pre-098 CLI/templates/cleargate-planning` lists **exactly**:

```
Files .../.cleargate/scripts/dedupe_frontmatter.mjs differ
Files .../.cleargate/scripts/prep_reporter_context.mjs differ
Files .../MANIFEST.json differ
```

— the 2 scripts plus the build-time MANIFEST.json regeneration, nothing else.

- `templates/scaffold/core/.cleargate/scripts/{prep_reporter_context,dedupe_frontmatter}.mjs` vs `scaffold/core/.cleargate/scripts/…`: **`cmp` identical**, both — confirming the same 2 scripts changed in the split-view root too, plus its own per-root `MANIFEST.json` (regenerated, fresh mtime present).
- `dedupe_frontmatter.mjs` mode: **755** in both `templates/cleargate-planning` and `scaffold/core` — unchanged.
- `node scripts/verify-pack.mjs` → `[verify-pack] OK — 222 files, payload 83, version 0.26.1.` — unchanged, no entry added.
- `node scripts/build-codex-payload.mjs --check` → exit 0.

## 8. Witnesses

1. **`cmp` live OUTER vs cli canonical** (both scripts): identical.
2. **`node CLI/dist/cli.js doctor --cwd OUTER`** (default mode, read-only): exit 0, **no `scaffold drift:` line** — only the same 2 pre-existing, unrelated advisories the STORY-058-11 merge also saw (a stale CR-124-lane `hook failure` log line; the retired `execution_mode:` advisory).
3. **M2 parity pair** (`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, compare mode): `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` **5/5**; `test/commands/init-host-parity.red.integration.node.test.ts` **15/15**.
4. **`test/scaffold/canonical-live-parity.red.integration.node.test.ts`**: **11/11**.
5. **`test/e2e/sprint-allow-drift-fresh-install.red.integration.node.test.ts`**: **1/1**.
6. **`test/commands/sprint-archive-stamp.integration.node.test.ts`**: **14/14**.
7. **M2 baseline integrity**: `find /private/tmp/cg-s41-m2-init-baseline -type f | wc -l` = **425**; aggregate `find ... -exec shasum -a 256 {} + | sort -k2 | shasum -a 256` = **`bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2`** — matches exactly. `find -newer <pre-run marker>` = 0 files; the baseline was read-only throughout.

## 9. No `.claude/` re-sync

`.cleargate/scripts/backfill_hierarchy.mjs` is unchanged across both merges (`git diff HEAD~2 HEAD -- <path>` empty; last real touch was an unrelated SPRINT-20 commit `c1ca1790`; sha256 `1c682c73c1544ace61f490f94aecc8c4109a4a3d3ccf3301043f2fdcf0227e95`). No `dist/cli.js init` or live-resync script ran this dispatch.

## Mirror Parity Audit

| File | Result |
|---|---|
| `.cleargate/scripts/prep_reporter_context.mjs` | `cmp` clean (outer live == cli canonical, both `scaffold/core` and split-view `templates/scaffold/core` roots) — mode 644 both sides |
| `.cleargate/scripts/dedupe_frontmatter.mjs` | `cmp` clean (outer live == cli canonical, both roots) — mode 755 both sides |

No drift after merge + BD (`doctor` confirms exit 0, no `scaffold drift:` line — witness §8.2).

## State Transition

```
CLEARGATE_STATE_FILE=OUTER/.cleargate/sprint-runs/SPRINT-41/state.json node OUTER/.cleargate/scripts/update_state.mjs BUG-098 Done
```
Output: `Updated BUG-098: state="Done"`. Confirmed in `state.json`: `"BUG-098": { "state": "Done", "qa_bounces": 0, "arch_bounces": 1, "worktree": null, "updated_at": "2026-09-26T20:33:07.063Z", "notes": "Approved scope addition; no implementation or runtime evidence claimed.", ... }`.

## Cleanup / Teardown

- `git -C <cw> status --porcelain` / `git -C <ow> status --porcelain`: both empty, confirmed before removal.
- `git -C CLI worktree remove .worktrees/BUG-098/cleargate-cli` — removed (cli first, per rule 19).
- `git -C OUTER worktree remove .worktrees/BUG-098` — removed.
- `git worktree list` (both repos) confirms BUG-098 is gone; `STORY-058-12`'s worktree (both repos) untouched.
- Branches kept, per instruction: `story/BUG-098` still present in both `CLI` and `OUTER`.

## Hygiene

Removed only my own scratch artifacts, by exact path:
- `/private/tmp/cg-s41-fw-payload-pre-098` (D1 pre-merge payload snapshot)
- `/private/tmp/cg-s41-fw-empty-dir` (pre-blocker link-witness scratch dir)
- `/private/tmp/cg-s41-bug098-{fullsuite,prebuild,build,typecheck}.log` (my own build/test logs)

Left untouched, not mine (earlier Developer/QA re-integrate dispatch artifacts): `cg-s41-bug098-int-empty`, `cg-s41-bug098-reint-{build,commit,outer-merge,tc}.log`, `cg-s41-bug098-reint-logs/`. Protected dirs confirmed still present, untouched: `cg-s41-m2-init-baseline`, `cg-s41-fresh-journey`, `cg-s41-int11-evidence`, `cg-s41-fix11-evidence`. `-12`-lane dirs (`cg-s41-int12-work`, `cg-s41-int12-logs`) left alone, per instruction. No bulk `cg-s41-*` deletion performed.

## Final Git Status

**OUTER** (`sprint/S-41`, advanced past my merge by 2 concurrent commits from the STORY-058-12 lane — `fb5bd4b0` integrate report, `d753c626` flashcard chore — neither touches BUG-098's files):
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```
(the 4 ledger files only; this report and the retained `BUG-098-devops-blockers.md` are untracked and not committed by me, per instruction — the coordinator commits them.)

**CLI** (`main` @ `e720592340363340d8708633efe64e051428e159`):
```
?? cleargate-0.25.0.tgz
```
(pre-existing untracked artifact, never staged.)

## Script Incidents

None. No `.cleargate/scripts/*` invocation needed the `run_script.sh` wrapper — the two link-witness smokes are direct `node <script>` calls, as the dispatch specifies.

```yaml
flashcards_flagged:
  - "2026-09-26 · #devops #state #surface-gate · A same-state update_state.mjs call is a true no-op (no updated_at bump); it can't refresh a BUG's timestamp to make the surface gate skip it — a real transition is required."
  - "2026-09-26 · #devops #test-harness · init-from-source S1 can red post-merge under a shared os.tmpdir() even after a known concurrent lane finished; solo re-run before verdict every time, not only when a lane is known-active."
```
