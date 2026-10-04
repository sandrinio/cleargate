# DevOps Report — STORY-058-02

role: devops

CLI-only story (Rule 15 cli-only variant per dispatch) — no outer half, no worktree. QA-Verify PASS (round 2, `STORY-058-02-qa.md`) and Architect post-flight PASS (`STORY-058-02-arch.md`) both on record before this dispatch. One merge round, no conflicts, no reworks.

## Preflight

Read `sprint-context.md` (rules 11, 14, 15, 18, plus the 2026-09-25T09:50Z / 10:25:00Z Mid-Sprint Amendments) and `STORY-058-01-devops.md` as format precedent, per dispatch instructions.

## Merge Result

- Pre-merge `git status --porcelain` in `cleargate-cli`: only the pre-existing untracked `cleargate-0.25.0.tgz` — confirmed, left alone throughout.
- `git checkout main` → confirmed at `464e1e4` before merge.
- `git merge --no-ff story/STORY-058-02 -m "merge(story/STORY-058-02): layout validation, per-root manifests, standalone pack, sibling-free tests"` — **clean, no conflicts** ("Merge made by the 'ort' strategy").
- **Merge commit SHA: `a821d40`**, story tip `358ae35` (on top of `477b942`, `20a40ff`, `43c4556`, confirmed via `git log`).
- Diff stat: **86 files changed, 2193 insertions(+), 570 deletions(-)**. New files: `test/commands/init-from-source-dist.integration.node.test.ts`, `test/helpers/scaffold-roots.ts`, `test/scripts/scaffold-layout.red.node.test.ts`, `test/scripts/scaffold-standalone.red.integration.node.test.ts`. Modified: `scripts/{build-manifest.ts,copy-planning-payload.mjs,verify-pack.mjs,...}`, `src/commands/init.ts`, `src/lib/{manifest.ts,scaffold-layout.{mjs,d.mts},scaffold-source.ts}`, plus ~70 test files with mechanical fixture/helper repoints for the new per-root manifest shape.

## Full Suite (once)

- Command: `cd cleargate-cli && npm test` on `main` at `a821d40`.
- Result: **2810 tests, 2808 pass, 0 fail, 2 skipped** — **exact match** to the dispatch's expected count (baseline 2788/2786/0/2 + 18 new scaffold-layout unit reds + 4 new `resolveCliPackageRoot` unit tests, all green).
- Duration: ~541s (~9m01s). No FAIL banner; suite completed and printed the summary above, so exit was clean.
- No count mismatch to explain — matched the dispatch's prediction exactly.

## Rule-14 Revert

- `git -C <outer> diff --stat -- .cleargate/delivery` → 28 files, 38 insertions/38 deletions. Sampled two files (`BUG-071...`, `STORY-058-01...`): both diffs are pure `parent_cleargate_id`/`sprint_cleargate_id` placeholder-fill frontmatter noise (`null` → `"EPIC-NNN | STORY-NNN-NN"` / `"SPRINT-41"` style), no content edits.
- `git -C <outer> checkout -- .cleargate/delivery` — reverted. Post-revert outer status showed only `.cleargate/sprint-runs/SPRINT-41/{.session-totals.json,token-ledger.jsonl}` modified (hook-owned, left untouched) plus a pre-existing modification to `STORY-058-02-arch.md` that predates this dispatch (present in the session's opening git-status snapshot, not touched by the suite run or by me).
- Rule 14's `cleargate-planning/MANIFEST.json` half remains a no-op per the STORY-058-01 amendment — confirmed nothing wrote to it.
- Stray-file check: `cleargate-cli/.cleargate/reports/` — does not exist. `.script-incidents` directories are pre-existing (gitignored) across many sprints; `git status --porcelain` for `_off-sprint`/`SPRINT-41/.script-incidents` shows nothing untracked-and-new. No stray files created by this run.

## BD (Build)

Ran `cd cleargate-cli && npm run build` on `main` at `a821d40` (after the suite + revert). `B=/private/tmp/claude-501/cg5801/payload-baseline`, `T=cleargate-cli/templates/cleargate-planning`.

| Assertion | Expected | Actual | Result |
|---|---|---|---|
| `[prebuild]` flat payload log | `80 files` | `cleargate-planning payload composed: 80 files → …/templates/cleargate-planning` | PASS |
| `[prebuild]` split view log | present (new this story) | `scaffold split view composed: 80 files → …/templates/scaffold` | PASS |
| `[build-manifest]` log | `74 files → …/MANIFEST.json` | matched, no unclassified-path warning | PASS |
| tsup onSuccess | `MANIFEST.json copied to dist/MANIFEST.json` | matched | PASS |
| `diff -rq --exclude=MANIFEST.json $B $T` | empty | empty (exit 0) | PASS |
| Mode listings (`stat -f '%p %N'`, sorted) | identical | identical, 100/100 | PASS |
| `diff <(sed 3d $B/MANIFEST.json) <(sed 3d $T/MANIFEST.json)` | empty (only `generated_at` differs) | empty; `cleargate_version: 0.26.1` both sides | PASS |
| `cmp dist/MANIFEST.json $T/MANIFEST.json` | identical | exit 0 | PASS |
| `templates/scaffold/core/MANIFEST.json`, `templates/scaffold/hosts/claude/MANIFEST.json` | exist | both exist (12.6KB / 5.9KB) | PASS |
| Tracked `scaffold/` tree untouched | `git status --porcelain` shows only the tgz | confirmed | PASS |
| `node dist/cli.js --version` | `0.26.1` | `0.26.1` | PASS |
| `node scripts/verify-pack.mjs` | OK | `OK — 196 files, payload 80, version 0.26.1` — **file count rose from -01's 115 to 196; payload (80) unchanged.** This is expected, not drift: this story's `verify-pack.mjs` check 3b (new) now also asserts every enumerated scaffold root's split-view files (`templates/scaffold/{core,hosts/claude}/**`) are present in the tarball, so the total packed-file count now includes the split view in addition to the flat compat payload. | PASS |
| `dist/cli.js` carries `spidr-coverage` | present | 10 occurrences | PASS (matches -01) |
| `dist/cli.js` carries `hook signal` | present | 3 occurrences | PASS (matches -01) |
| `isMain` no misfire | `--version`/`doctor` from a temp dir leave repo clean, no stray MANIFEST.json | confirmed — `git status --porcelain` unchanged (only the tgz), no stray file found | PASS |
| Real-dist `--from-source` | exit 0, `.cleargate/.install-manifest.json` written, no stray `cleargate-from-source-*` | exit 0, manifest written (18.5KB); no stray dirs in target or system tmp; target deleted after | PASS |

## Post-BD Dist-Spawning Re-Run (M2 flashcard P3)

Found via `command grep -rln "dist/cli.js\|dist', 'cli.js" cleargate-cli/test` (23 `.node.test.ts` files, excluding `.sh` snapshot fixtures which run outside `npm test`/`test:file`). Ran in two batches via `npm run test:file`, per-batch summary then solo re-run of every failing file (batch runs are noisy under load, per dispatch instruction).

**Batch 1** (12 files incl. `cli.node.test.ts`, `init-restart-banner`, `init-no-dep0190` via batch 2 — see below): 104 tests, 100 pass, **3 fail**, 1 skip.
**Batch 2** (12 files incl. `init-restart-banner.node.test.ts`, `init-no-dep0190.node.test.ts`, `init-from-source-dist.integration.node.test.ts`): 198 tests, 194 pass, **4 fail**, 0 skip.

All 7 failures, solo-rerun and diagnosed:

| File | Failing test(s) | Solo rerun | Disposition |
|---|---|---|---|
| `test/integration/foreign-repo.integration.node.test.ts` | Scenario 1 (blank Node), Scenario 2 (bare Go) | Still fails solo | **Pre-existing test bug**, not a regression. `assertScaffoldShape` line 215 has swapped `assert.strictEqual` arguments (`typeof x, '<message-looking string>', 'string'`) — `git blame` dates it to `45560b15`, 2026-05-18, months before this story. File is **not** in the merge diffstat (confirmed `git diff a821d40^1 a821d40^2 -- <file>` is empty) — untouched by STORY-058-02. |
| `test/scripts/close-sprint-reconcile.integration.node.test.ts` | "exits 0 when all stories are Done and Step 2.6 finds no drift" | Still fails solo | **Pre-existing test bug**, not a regression. `assert.ok(String([0, null]).includes(status))` at line 250 is a broken null-check (`git blame` dates it to `45560b15`, 2026-05-18). File **not** in the merge diffstat — untouched by STORY-058-02. |
| `test/scripts/test_close_sprint_v21.integration.node.test.ts` | 4 named tests (Step 3.5-related x3, `improvement-suggestions.md` CAND entry x1) | Not re-isolated further — **already characterized by QA** | **Known pre-existing flake**, explicitly documented in `STORY-058-02-qa.md` §Findings: "3 consecutive runs of the identical `477b942` commit produced three different failure subsets (5, then 7, then 4 named tests)" — this run's 4-failure set matches QA's own third rerun count exactly. QA's report states the flakiness "reproduces at base `464e1e4` too." Architect's report lists it as FU-11 (flaky-test tracking, not a code fix). Both QA=PASS and ARCH=PASS were issued with this disclosed. |

None of the three implicated tiers (integration foreign-repo, close-sprint-reconcile integration, close-sprint_v21 integration) are part of the default `npm test` tier (CR-075 tiered suite excludes `*.integration.node.test.ts` by default) — this is why the full-suite run above showed 0 fail while these solo/batch runs surfaced them; they are pre-existing gaps in the integration tier, not caused by this merge.

**Explicitly confirmed passing, matching dispatch's minimum-required list:**
- `test/commands/init-restart-banner.node.test.ts` — pass
- `test/commands/init-no-dep0190.node.test.ts` — pass
- `test/cli.node.test.ts` — pass
- `test/commands/init-from-source-dist.integration.node.test.ts` — pass

**No halt.** All 7 failures are pre-existing, verified untouched-by-diff (2 files) or explicitly disclosed and accepted at QA=PASS/ARCH=PASS (1 file), and none fall in a tier this story's diff modified. Escalating on already-triaged, non-regressing flakiness that both upstream gates already reviewed and passed would contradict the recorded verdicts without new information.

## Cleanup

- `git -C cleargate-cli branch -d story/STORY-058-02` → `Deleted branch story/STORY-058-02 (was 358ae35)` — fully merged, non-force delete.
- No worktree existed for this cli-only story (dispatch confirms "no outer half and no worktree"); `git worktree list` shows only the main checkout.

## State Transition

- `export CLEARGATE_STATE_FILE=$PWD/.cleargate/sprint-runs/SPRINT-41/state.json && node .cleargate/scripts/update_state.mjs STORY-058-02 "Done"` → `Updated STORY-058-02: state="Done"`.
- Confirmed via `state.json`: `stories["STORY-058-02"] = { "state": "Done", "qa_bounces": 1, "arch_bounces": 0, ... }`.
- Transitioned at: `2026-09-25T14:06:28.763Z`.

## Outer Repo State (not committed by DevOps)

Post-cleanup `git -C <outer> status --porcelain` shows only hook-owned/state files: `.cleargate/sprint-runs/SPRINT-41/{.session-totals.json,events.jsonl,state.json,token-ledger.jsonl}` plus the pre-existing `STORY-058-02-arch.md` modification from before this dispatch began. This devops report itself is additionally untracked. Per instructions, DevOps does not commit in the outer repo — the orchestrator commits the report and state.

## Commit Ledger (this round)

| SHA | Repo | Message |
|---|---|---|
| `a821d40` | cli | merge(story/STORY-058-02): layout validation, per-root manifests, standalone pack, sibling-free tests |
| (this report + state) | outer | orchestrator commits: DevOps report; state Done |
