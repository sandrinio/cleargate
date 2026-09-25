# DevOps Report — STORY-058-03

role: devops

CLI-only story (Rule 15 cli-only variant per dispatch) — no outer half, no worktree. QA-Verify PASS and Architect post-flight PASS both on record before this dispatch (`STORY-058-03-qa.md`, `STORY-058-03-arch.md`). One merge round, no conflicts, no reworks.

## Preflight

Read `sprint-context.md` (rules 11, 14, 15, 18, plus the 2026-09-25T09:50Z / 10:25:00Z / 15:05:00Z Mid-Sprint Amendments) and `STORY-058-02-devops.md` as format precedent, per dispatch instructions.

## Merge Result

- Pre-merge `git status --porcelain` in `cleargate-cli`: only the pre-existing untracked `cleargate-0.25.0.tgz` — confirmed, left alone throughout.
- `git checkout main` → confirmed at `a821d40` before merge.
- `git merge --no-ff story/STORY-058-03 -m "merge(story/STORY-058-03): HostAdapter contract, registry, Claude adapter"` — **clean, no conflicts** ("Merge made by the 'ort' strategy").
- **Merge commit SHA: `55f5d95`**, story tip `0fb61b1` (on top of `11fe514`, confirmed via `git log --graph`).
- Diff stat: **7 files changed, 1299 insertions(+), 138 deletions(-)**. New files: `src/hosts/{claude.ts,registry.ts,types.ts}`, `test/helpers/init-fixture.ts`, `test/hosts/host-adapter-contract.red.node.test.ts`, `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts`. Modified: `src/commands/init.ts` (-151 lines, delegates to the new adapter/registry).

## Full Suite (once)

- Command: `cd cleargate-cli && npm test` on `main` at `55f5d95`.
- Result: **2829 tests, 2827 pass, 0 fail, 2 skipped** — **exact match** to the dispatch's expected count (V7 2810 + 19 new contract unit tests).
- Duration: ~485s (~8m05s). No FAIL banner; suite completed and printed the summary above, so exit was clean.
- No count mismatch to explain — matched the dispatch's prediction exactly. No re-run needed.

## Rule-14 Revert

- `git -C <outer> diff --stat -- .cleargate/delivery` → 29 files, 39 insertions/39 deletions. Sampled two files (`BUG-074...`, `STORY-058-03...`): both diffs are pure `parent_cleargate_id`/`sprint_cleargate_id` placeholder-fill frontmatter noise (`null` → `"EPIC-NNN | STORY-NNN-NN"` / `"EPIC-058"` style), no content edits.
- `git -C <outer> checkout -- .cleargate/delivery` — reverted. Post-revert outer status showed only `.cleargate/sprint-runs/SPRINT-41/{.session-totals.json,token-ledger.jsonl}` modified (hook-owned, left untouched) plus a pre-existing modification to `STORY-058-03-qa.md` that predates this dispatch (present in the session's opening git-status snapshot, not touched by the suite run or by me).
- Rule 14's `cleargate-planning/MANIFEST.json` half remains a no-op per the STORY-058-01 amendment — confirmed `git diff --stat -- cleargate-planning/MANIFEST.json` is empty.
- Stray-file check: the untracked `.pending-task-1363-23981-2375.json` visible in the session's opening git-status snapshot was already gone before this dispatch touched anything (pre-existing artifact from a prior turn, not created by this run). Full `git -C <outer> status --porcelain` post-revert shows no untracked files at all — no stray files created by this run.

## BD (Build)

Ran `cd cleargate-cli && npm run build` on `main` at `55f5d95` (after the suite + revert). `B=/private/tmp/claude-501/cg5801/payload-baseline`, `T=cleargate-cli/templates/cleargate-planning`.

| Assertion | Expected | Actual | Result |
|---|---|---|---|
| `[prebuild]` flat payload log | `80 files` | `cleargate-planning payload composed: 80 files → …/templates/cleargate-planning` | PASS |
| `[prebuild]` split view log | `80 files` | `scaffold split view composed: 80 files → …/templates/scaffold` | PASS |
| `[build-manifest]` log | no unclassified warning | `74 files → …/MANIFEST.json`, no unclassified-path warning | PASS |
| tsup onSuccess | `MANIFEST.json copied to dist/MANIFEST.json` | matched | PASS |
| `diff -rq --exclude=MANIFEST.json $B $T` | empty | empty (exit 0) — -03 touched no `scaffold/**` | PASS |
| Mode listings (`stat -f '%p %N'`, sorted, space-safe) | identical | identical, 100/100 | PASS |
| `diff <(sed 3d $B/MANIFEST.json) <(sed 3d $T/MANIFEST.json)` | empty | empty (exit 0) | PASS |
| `cmp dist/MANIFEST.json $T/MANIFEST.json` | identical | exit 0 | PASS |
| `node dist/cli.js --version` | `0.26.1` | `0.26.1` | PASS |
| `node scripts/verify-pack.mjs` | `196 files, payload 80` (unchanged from -02) | `OK — 196 files, payload 80, version 0.26.1` | PASS |
| `dist/cli.js` carries `spidr-coverage` | present | 10 occurrences (matches -02) | PASS |
| `dist/cli.js` carries `hook signal` | present | 3 occurrences (matches -02) | PASS |
| `dist/cli.js` carries `createHostRegistry`/`defaultHostRegistry` | present (new for -03) | 7 occurrences | PASS |
| Tracked `scaffold/` tree untouched | `git status --porcelain` shows only the tgz | confirmed | PASS |

## Real-Dist Init Sanity (new for -03)

Fresh `git init`-ed `mktemp -d` target, `node dist/cli.js init --yes` run twice:

- Run 1 exit 0, run 2 exit 0 (idempotent re-init, all `Skipped (exists)`).
- Every stdout line on both runs is prefixed `[cleargate init] `, except the restart-banner block (ignored per instruction). Confirmed via `grep -vE '^\[cleargate init\] |^$|restart'` — run 1 only surfaces the restart-banner border/warning lines; run 2 surfaces zero non-conforming lines.
- `.claude/settings.json`: `pre-edit-gate.sh --host claude` — exactly 1 occurrence. `stamp-and-gate.sh` — exactly 1 occurrence.
- `CLAUDE.md`: `^<!-- CLEARGATE:START -->$` — exactly 1 line-anchored match.
- `.mcp.json` exists (172 bytes).
- Target deleted after.

Second fresh target, `node dist/cli.js init --from-source cleargate-cli/scaffold --yes`:

- Exit 0. `.cleargate/.install-manifest.json` present (18.5KB).
- No `cleargate-from-source-*` directories left in the target or in system tmp.
- Target deleted after.

## Post-BD Dist-Spawning Re-Run (solo)

All required files re-run solo via `npm run test:file`, in the order given:

| File | Result |
|---|---|
| `test/commands/init-restart-banner.node.test.ts` | 3/3 pass |
| `test/commands/init-no-dep0190.node.test.ts` | 2/2 pass |
| `test/cli.node.test.ts` | 23/23 pass |
| `test/commands/init-from-source-dist.integration.node.test.ts` | 1/1 pass |
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (compare mode, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, no capture flag set) | 5/5 pass — scenario 12 fresh/user-content/reinit/malformed/force all match the M2 baseline byte-for-byte (tree, modes, stdout, stderr) |

**No halt.** All required post-BD dist-spawning tests pass clean. The known pre-existing `.integration` fails (`foreign-repo` S1/S2, `dogfood-install` S1, `close-sprint-reconcile`, the flaky `test_close_sprint_v21`) were out of scope for this dispatch's required list and were not re-diagnosed, per instruction.

## Cleanup

- `git -C cleargate-cli branch -d story/STORY-058-03` → `Deleted branch story/STORY-058-03 (was 0fb61b1)` — fully merged, non-force delete.
- No worktree existed for this cli-only story (dispatch confirms "no outer half and no worktree"); `git worktree list` shows only the main checkout at `55f5d95 [main]`.

## State Transition

- `export CLEARGATE_STATE_FILE=$PWD/.cleargate/sprint-runs/SPRINT-41/state.json && node .cleargate/scripts/update_state.mjs STORY-058-03 "Done"` → `Updated STORY-058-03: state="Done"`.
- Confirmed via `state.json`: `stories["STORY-058-03"] = { "state": "Done", "qa_bounces": 0, "arch_bounces": 0, ... }`.
- Transitioned at: `2026-09-25T15:27:48.405Z`.

## Outer Repo State (not committed by DevOps)

Post-cleanup `git -C <outer> status --porcelain` shows only hook-owned/state files: `.cleargate/sprint-runs/SPRINT-41/{.session-totals.json,events.jsonl,state.json,token-ledger.jsonl}` plus the pre-existing `STORY-058-03-qa.md` modification from before this dispatch began. This devops report itself is additionally untracked. Per instructions, DevOps does not commit in the outer repo — the orchestrator commits the report and state.

## Commit Ledger (this round)

| SHA | Repo | Message |
|---|---|---|
| `55f5d95` | cli | merge(story/STORY-058-03): HostAdapter contract, registry, Claude adapter |
| (this report + state) | outer | orchestrator commits: DevOps report; state Done |
