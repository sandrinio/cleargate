# DevOps Report — BUG-096

role: devops

Merge lane for BUG-096 (cli-only, init-fixture temp-dir cleanup). `CLI` = `/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli` (main checkout, stayed on `main` throughout except the two merges below). `OUTER` = `/Users/ssuladze/Documents/Dev/ClearGate` (`sprint/S-41`). BUG-096 has no outer half — its outer worktree was a detached `sprint/S-41` checkout with no commits.

## 1. Re-sync (INTEGRATE)

- `<cw>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-096/cleargate-cli`, branch `story/BUG-096` (Dev `266c1ba`, QA-Red `1619fad`, base `35580b0`).
- Note: `git worktree list` shows `<cw>`'s registered path as `/Users/ssuladze/Documents/Dev/cleargate/.worktrees/BUG-096/cleargate-cli` (lowercase) — same inode (`259722794`) as the canonical `ClearGate`-cased path; APFS case-insensitivity, not a second checkout (already flagged in FLASHCARD.md 2026-08-29).
- `git -C <cw> merge --no-ff main -m "integrate(BUG-096): merge cli main fcb1491"` — **clean, no conflicts**. `test/helpers/init-fixture.ts` auto-merged (BUG-096's `mkShortTmpDir`-region edit vs. -10's tail-appended `SANCTIONED_BASELINE_DELTAS` rows, non-overlapping regions, exactly as the plan predicted).
- **Integrate commit SHA: `9a3a0c0c3bb926eb5f5201e06d4b2d126570aeef`.**

## 2. Re-verify (`<cw>`, solo)

`npm run prebuild && npm run build` in `<cw>`: both green (payload 80 files, scaffold split 87 files, MANIFEST 74 files; tsup ESM/CJS/DTS all `⚡️ Build success`).

| File | Tests | Pass | Fail | Skip | Expected | Match |
|---|---|---|---|---|---|---|
| `test/helpers/init-fixture-cleanup.red.node.test.ts` | 3 | 3 | 0 | 0 | 3/3 | yes |
| `test/commands/init-host-selection.red.node.test.ts` | 10 | 10 | 0 | 0 | — | yes |
| `test/commands/init-host-snapshot.red.node.test.ts` | 13 | 13 | 0 | 0 | — | yes |
| `test/hosts/host-adapter-contract.red.node.test.ts` | 19 | 19 | 0 | 0 | — | yes |
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`) | 5 | 5 | 0 | 0 | 5/5 | yes |
| `test/commands/init-host-parity.red.integration.node.test.ts` (same baseline) | 15 | 15 | 0 | 0 | 15/15 | yes |
| `test/commands/init.node.test.ts` | 31 | 31 | 0 | 0 | — | yes |
| `test/hooks/codex-hook-scripts.red.node.test.ts` | 18 | 18 | 0 | 0 | 18/18 | yes |

All green on the first run; no solo re-runs needed.

## 3. Merge-lane check

- `git -C CLI merge-base --is-ancestor main story/BUG-096` → exit 0.
- `git -C CLI status --porcelain` → only `?? cleargate-0.25.0.tgz` (never staged).

## 4. Payload-identity baseline (pre-merge)

`CLI/templates/cleargate-planning` copied to `/private/tmp/bug096-premerge/payload-baseline` immediately before the merge — 81 files (matches -10's post-merge count). `node scripts/verify-pack.mjs` → `OK — 204 files, payload 80, version 0.26.1`.

## Merge Result

- Sprint/merge branch: cli `main` (this item has no `sprint/S-41` half).
- Story branch: `story/BUG-096` (tip `266c1ba`).
- Merge command: `git -C CLI merge --no-ff story/BUG-096 -m "merge(story/BUG-096): init-fixture tracks and removes its temp dirs at exit"`.
- **Merge commit SHA: `c5a311ead9f2acb13026c7a14761f45add43f1a4`.**
- Clean merge via the `ort` strategy — no conflicts.
- Diff stat (vs. pre-merge `main`): **2 files changed, 247 insertions(+), 1 deletion(-)** — `test/helpers/init-fixture-cleanup.red.node.test.ts` (new, 221 lines) + `test/helpers/init-fixture.ts` (26 insertions / 1 deletion). Exactly the pinned change shape; no `src/**`, no caller file.

## Full-Suite Result (step 6)

`npm test` in `CLI` on the merge commit.

**Result: 3312 tests / 3310 pass / 0 fail / 2 skipped**, `suites 1142`, `duration_ms 1305393.9` (~21m45s — longer than -10's ~13m, consistent with §5's concurrency-hazard note that other build lanes were running full tests/harnesses concurrently). Matches the expected count exactly (previous merge's total 3309/3307/0/2 **+3/+3/0/0** = 3312/3310/0/2, per replan §6/§9). **No solo re-runs were needed** — 0 failures on the first run.

## Rule-14 Revert (step 7)

`git -C OUTER diff --name-only` listed 34 paths: 30 under `.cleargate/delivery/pending-sync/**` (full-suite back-sync signature, identical file list to the -10 merge) plus the 4 sprint ledger files. Reverted only the 30 delivery paths with `git -C OUTER checkout -- <paths>`:

```
.cleargate/delivery/pending-sync/BUG-071_existing_surfaces_sentinel_contradicts_template.md
.cleargate/delivery/pending-sync/BUG-072_listed_item_predicate_counts_only_hyphen_bullets.md
.cleargate/delivery/pending-sync/BUG-073_preflight_shells_out_to_bare_cleargate.md
.cleargate/delivery/pending-sync/BUG-074_state_transition_dirties_tree_fails_next_bounce_check.md
.cleargate/delivery/pending-sync/BUG-075_state_transitions_table_never_enforced.md
.cleargate/delivery/pending-sync/BUG-076_close_sprint_requires_metarepo_cli_path.md
.cleargate/delivery/pending-sync/BUG-077_parent_rollup_runs_before_child_backsync.md
.cleargate/delivery/pending-sync/BUG-078_sprint_parent_cannot_enumerate_children.md
.cleargate/delivery/pending-sync/BUG-085_live_instance_never_resynced_canonical_hook_fixes_inert.md
.cleargate/delivery/pending-sync/BUG-089_pretooluse_gates_exit_1_fail_open.md
.cleargate/delivery/pending-sync/CR-118_existing_surfaces_forward_references.md
.cleargate/delivery/pending-sync/CR-119_story_template_greenfield_create_row.md
.cleargate/delivery/pending-sync/CR-124_contract_first_build_then_integrate_sprint_dag.md
.cleargate/delivery/pending-sync/SPRINT-41_multi_host_adapters_and_frontmatter_locator.md
.cleargate/delivery/pending-sync/STORY-031-03_test_stack_single_source_runner_and_known_failures.md
.cleargate/delivery/pending-sync/STORY-031-04_qa_red_stops_full_suite_runs.md
.cleargate/delivery/pending-sync/STORY-031-05_test_stack_carry_forward_at_sprint_init.md
.cleargate/delivery/pending-sync/STORY-058-01_scaffold_core_host_layout.md
.cleargate/delivery/pending-sync/STORY-058-02_scaffold_source_and_manifest_builder_repoint.md
.cleargate/delivery/pending-sync/STORY-058-03_hostadapter_contract_and_registry.md
.cleargate/delivery/pending-sync/STORY-058-04_init_host_selector_parsing.md
.cleargate/delivery/pending-sync/STORY-058-05_host_lifecycle_commands.md
.cleargate/delivery/pending-sync/STORY-058-06_manifest_host_ownership_fields.md
.cleargate/delivery/pending-sync/STORY-058-07_per_host_doctor_upgrade_uninstall_scoping.md
.cleargate/delivery/pending-sync/STORY-058-08_clean_room_verification_procedure_and_driver.md
.cleargate/delivery/pending-sync/STORY-058-09_clean_room_claude_regression_baseline.md
.cleargate/delivery/pending-sync/STORY-058-10_codex_payload_surfaces.md
.cleargate/delivery/pending-sync/STORY-058-11_codex_role_and_skill_translation.md
.cleargate/delivery/pending-sync/STORY-058-12_host_dispatch_mode_split_and_serial_fallback.md
.cleargate/delivery/pending-sync/STORY-058-13_codex_end_to_end_loop_evidence.md
```

`cleargate-planning/MANIFEST.json` was not in the diff (no-op per the 2026-09-25 sprint-context amendment — nothing regenerates it any more). **Never touched:** the 4 ledger files (`.session-totals.json`, `events.jsonl`, `state.json`, `token-ledger.jsonl`). Post-revert `git -C OUTER diff --name-only` showed only those 4 ledger files.

## BD (step 8)

`npm run build` in `CLI` on `main` (npm's lifecycle auto-ran `prebuild` first). All green:
- `[prebuild] cleargate-planning payload composed: 80 files`
- `[prebuild] scaffold split view composed: 87 files`
- `[build-manifest] 74 files → MANIFEST.json`
- ESM/CJS/DTS builds all report `⚡️ Build success`.

## Post-BD Checks (step 9)

- **Payload identity vs. the step-4 baseline:** `diff -rq /private/tmp/bug096-premerge/payload-baseline CLI/templates/cleargate-planning` → exactly one line, `MANIFEST.json` differs. `diff` of that one file shows only the `generated_at` timestamp (`2026-09-26T15:09:10.673Z` → `2026-09-26T15:48:22.104Z`) — expected build-time volatility (FLASHCARD 2026-09-25 "#test-harness #manifest"), not content drift. No payload file content changed, file count unchanged (81 → 81).
- `node scripts/verify-pack.mjs` → `OK — 204 files, payload 80, version 0.26.1` (unchanged from step 4).
- **M2 baseline hash:** `find /private/tmp/cg-s41-m2-init-baseline -type f | wc -l` → 425 (unchanged). `find … -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256` → `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` — matches exactly.
- **Leak probe on `main`:** snapshotted the name-set of `/private/tmp/cg-s41-fix-*` + `cg-s41-payload-*` dirs (1045 entries) before a solo `npm run test:file -- test/commands/init-host-selection.red.node.test.ts` run in `CLI` (10/10 pass), then re-snapshotted (1045 entries). `comm -13` and `comm -23` both empty — **zero net new entries**, confirming the exit-hook cleanup holds on the merged `main` build too.

## Hygiene (step 10)

Ran (after the hash/leak checks above):
```
find /private/tmp -maxdepth 1 -type d \( -name 'cg-s41-fix-*' -o -name 'cg-s41-payload-*' -o -name 'cg-s41-contract-payload-*' \) -mmin +60 -exec rm -rf {} +
```
- Before: 1054 matching dirs total, 361 older than 60 min.
- Removed: 361 (the `-mmin +60` set) + the 5 named STORY-058-10 DevOps scratch dirs, all of which still existed: `/private/tmp/s10-premerge-14w26r`, `/private/tmp/s10-premerge-14w26r-payload-baseline`, `/private/tmp/s10-postbd-OciB3o`, `/private/tmp/s10-smoke-codex-TM6EDo`, `/private/tmp/s10-smoke-all-8fdHsA`.
- After: 693 matching dirs remain (fresh/in-use by concurrent lanes, all ≤60 min old).
- M2 baseline (`/private/tmp/cg-s41-m2-init-baseline`) confirmed still present — name matches none of the three prefixes.
- Also removed my own scratch (`/private/tmp/bug096-premerge/`, small `.txt` snapshots, the full-suite log) — not part of the named hygiene set, but this bug is specifically about `/tmp` growth, so cleaned up rather than left behind.
- **Disk free:** `/dev/disk3s1` before hygiene 48Gi avail / 501M ifree → after hygiene 48Gi avail / 507M ifree. The removed dirs are small fixture/config trees (JSON + a few shell/markdown files each), so freed *space* rounds to the same `df -h` bucket; inode headroom increased by ~6M (`ifree` 501M→507M), consistent with removing hundreds of small directory trees.

## State Transition

```
CLEARGATE_STATE_FILE=OUTER/.cleargate/sprint-runs/SPRINT-41/state.json node OUTER/.cleargate/scripts/update_state.mjs BUG-096 Done
```
Output: `Updated BUG-096: state="Done"`. Confirmed in `state.json`: `"BUG-096": { "state": "Done", "qa_bounces": 0, "arch_bounces": 0, "worktree": null, "updated_at": "2026-09-26T15:50:31.772Z", … }`.

## Cleanup / Teardown

- `git -C OUTER/.worktrees/BUG-096/cleargate-cli status --porcelain` → empty.
- `git -C OUTER/.worktrees/BUG-096 status --porcelain` → empty.
- `git -C CLI worktree remove OUTER/.worktrees/BUG-096/cleargate-cli` → removed (cli first, per re-plan §4).
- `git -C OUTER worktree remove .worktrees/BUG-096` → removed.
- `git worktree list` (both repos) confirms BUG-096 is gone; the other live lanes (BUG-090, BUG-097, BUG-098, CR-124, STORY-058-11) are untouched.
- Branch kept, per instruction: `story/BUG-096` still present in `CLI`.

## Final Git Status

**OUTER** (`/Users/ssuladze/Documents/Dev/ClearGate`, branch `sprint/S-41`):
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```
(the 4 ledger files only — `state.json` now carries the Done transition.)

**CLI** (`/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli`, branch `main` @ `c5a311ead9f2acb13026c7a14761f45add43f1a4`):
```
?? cleargate-0.25.0.tgz
```
(pre-existing untracked artifact, never staged.)

## Mirror Parity Audit

N/A — the §3.1 files-changed manifest for this merge is cli-source-only (`test/helpers/**`), with no outer canonical↔npm-payload mirror pair to audit and no RS-* boundary step scheduled for this item (RS-4a already ran at the -10 merge). No `.claude/` re-sync performed, per the dispatch's "no `.claude/` re-sync for this item."

## Script Incidents

None. No `run_script.sh`-wrapped script was required for this item's mechanical steps (state transition and all git/npm commands were run directly, matching the STORY-058-10 DevOps precedent for `update_state.mjs`; no RS-* / `b0-live-resync.mjs`-class procedure applies here).

## flashcards_flagged

```yaml
flashcards_flagged: []
```

Nothing new: the two mechanics-relevant observations from this dispatch (APFS case-insensitive worktree path aliasing; MANIFEST.json `generated_at` volatility) are already recorded in `.cleargate/FLASHCARD.md` (2026-08-29 `#dogfood-split #portability #danger`; 2026-09-25 `#test-harness #manifest`).
