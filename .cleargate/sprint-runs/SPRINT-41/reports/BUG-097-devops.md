# DevOps Report — BUG-097

role: devops

Merge lane for BUG-097 (cli-only, four fresh-journey CLI output defects: `gate check -v` on pass, `stamp --dry-run` JSON outline rendering, `wiki query` duplicate wikilink prefix, `scaffold-lint` double "clean" print). `CLI` = `/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli` (main checkout, stayed on `main` throughout except the two merges below). `OUTER` = `/Users/ssuladze/Documents/Dev/ClearGate` (`sprint/S-41`). BUG-097 has no outer half — its outer worktree was a detached `sprint/S-41` checkout with no commits.

## 1. Re-sync (INTEGRATE)

- `<cw>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-097/cleargate-cli`, branch `story/BUG-097` (Dev `7993d37`, QA-Red `d41efe0`, base `35580b0`).
- Pre-merge tree states confirmed clean: `<cw>` porcelain empty, `<ow>` (detached `sprint/S-41`) porcelain empty, `CLI` main at `c5a311e` (BUG-096's merge SHA, as expected), `OUTER` porcelain showed only the 4 sprint ledger files plus untracked reports belonging to other in-flight lanes (CR-124, STORY-058-11) — untouched.
- `git -C <cw> merge --no-ff main -m "integrate(BUG-097): merge cli main c5a311e"` — **clean, no conflicts**. Main's delta since `35580b0` (STORY-058-10's codex host adapter slice, 76 files) did not touch any of BUG-097's 8 files (`src/commands/{gate,stamp,wiki-query,scaffold-lint}.ts` + the 4 corresponding test files), exactly as the dispatch's "Cross-Cutting Rules 11, 14, 17–21" coupling analysis predicted.
- **Integrate commit SHA: `a3720ea`.**

## 2. Re-verify (`<cw>`, solo)

`npm run prebuild && npm run build && npm run typecheck` in `<cw>`: all green (payload 80 files, scaffold split 87 files, MANIFEST 74 files; tsup ESM/CJS/DTS all `⚡️ Build success`; `tsc --noEmit` clean, exit 0).

| File | Tests | Pass | Fail | Skip | Match vs BUG-097-qa.md |
|---|---|---|---|---|---|
| `test/commands/gate-unit.node.test.ts` | 28 | 28 | 0 | 0 | yes (25 base + 3 new) |
| `test/commands/stamp.node.test.ts` | 10 | 10 | 0 | 0 | yes (6 base + 4 new) |
| `test/wiki/query.node.test.ts` | 26 | 26 | 0 | 0 | yes (23 base + 3 new) |
| `test/commands/scaffold-lint.node.test.ts` | 10 | 10 | 0 | 0 | yes (7 base + 3 new) |
| `test/lib/frontmatter-writers.red.node.test.ts` | 30 | 30 | 0 | 0 | yes |
| `test/commands/init.node.test.ts` | 31 | 31 | 0 | 0 | yes |
| `test/hosts/host-adapter-contract.red.node.test.ts` | 19 | 19 | 0 | 0 | yes |

All green on the first run; no solo re-runs needed.

## 3. Merge-lane check

- `git -C CLI merge-base --is-ancestor main story/BUG-097` → exit 0 (`story/BUG-097`'s tip is now the integrate commit `a3720ea`, which contains `main`'s `c5a311e`).
- `git -C CLI status --porcelain` → only `?? cleargate-0.25.0.tgz` (never staged).

## 4. Payload-identity baseline (pre-merge)

`CLI/templates/cleargate-planning` copied to `/private/tmp/bug097-premerge/payload-baseline` immediately before the merge — 81 files. `node scripts/verify-pack.mjs` → `OK — 204 files, payload 80, version 0.26.1`.

## Merge Result

- Sprint/merge branch: cli `main` (this item has no `sprint/S-41` half).
- Story branch: `story/BUG-097` (tip `a3720ea`, the integrate commit).
- Merge command: `git -C CLI merge --no-ff story/BUG-097 -m "merge(story/BUG-097): fresh-journey CLI output papercuts — gate -v on pass, stamp JSON outline, wiki query single wikilink, scaffold-lint clean once"`.
- **Merge commit SHA: `d4d6d93`.**
- Clean merge via the `ort` strategy — no conflicts.
- Diff stat (vs. pre-merge `main` `c5a311e`): **8 files changed, 396 insertions(+), 18 deletions(-)** — `src/commands/{gate,stamp,wiki-query,scaffold-lint}.ts` (the 4 pinned output fixes) plus the 4 corresponding test files (`test/commands/{gate-unit,scaffold-lint,stamp}.node.test.ts`, `test/wiki/query.node.test.ts`). Exactly the pinned change shape; no `scaffold/**`, no payload, no other `src/**` files.

## Full-Suite Result (step 6)

`npm test` in `CLI` on the merge commit `d4d6d93` (run in background, ~18 minutes).

**Result: 3325 tests / 3323 pass / 0 fail / 2 skipped**, `suites 1149`, `duration_ms 1084006.1` (~18m4s), exit code 0. Matches the expected count exactly (previous merge's total 3312/3310/0/2 **+13/+13/0/0** = 3325/3323/0/2, per M5-fixwave.md §BUG-097 "+13 tests: 7 red + 6 anchors" and replan-contract-first.md §6's "previous merge's recorded total + X's own default-tier delta"). **No solo re-runs were needed** — 0 failures on the first run.

## Rule-14 Revert (step 7)

`git -C OUTER diff --name-only` listed 34 paths: 30 under `.cleargate/delivery/pending-sync/**` (full-suite back-sync signature, identical file list to the BUG-096 merge) plus the 4 sprint ledger files. Reverted only the 30 delivery paths with `git -C OUTER checkout -- <paths>`:

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

`cleargate-planning/MANIFEST.json` was not in the diff (no-op per the 2026-09-25 sprint-context amendment — nothing regenerates it any more). **Never touched:** the 4 ledger files (`.session-totals.json`, `events.jsonl`, `state.json`, `token-ledger.jsonl`). Post-revert `git -C OUTER diff --name-only` showed only those 4 ledger files. Two untracked reports belonging to other in-flight lanes (`CR-124-integrate.md` at merge start, `BUG-090-qa.md` at revert time) were present in `git status --porcelain` throughout — correctly left alone, per the instruction not to touch other worktrees' work.

## BD (step 8)

`npm run build` in `CLI` on `main` (npm's lifecycle auto-ran `prebuild` first).

**Incident (self-caused, corrected):** the first BD attempt was piped through `head -15` to inspect the prebuild banner; `head` closed the pipe early and SIGPIPE'd the `tsup` build mid-`rm -rf dist`, leaving `dist/` deleted with no rebuild. Caught immediately via `ls dist/` returning "No such file or directory". Re-ran `npm run build` to a log file (no truncating pipe) — clean full rebuild, exit 0:
- `[prebuild] cleargate-planning payload composed: 80 files`
- `[prebuild] scaffold split view composed: 87 files`
- `[build-manifest] 74 files → MANIFEST.json`
- ESM/CJS/DTS builds all report `⚡️ Build success`.

No git-tracked state was affected by the incident (dist is gitignored); the only exposure was `verify-pack.mjs` correctly refusing to publish against a missing dist, which is exactly its job. Flagged as a flashcard below.

## Post-BD Checks (step 9)

- **Payload identity vs. the step-4 baseline:** `diff -rq /private/tmp/bug097-premerge/payload-baseline CLI/templates/cleargate-planning` → exactly one line, `MANIFEST.json` differs. `diff` of that one file shows only the `generated_at` timestamp (`2026-09-26T15:48:22.104Z` → `2026-09-26T16:17:10.632Z`) — expected build-time volatility (FLASHCARD 2026-09-25 "#test-harness #manifest"), not content drift. No payload file content changed; file count unchanged (81 → 81). Expected and confirmed: BUG-097 touches no scaffold.
- `node scripts/verify-pack.mjs` → `OK — 204 files, payload 80, version 0.26.1` (unchanged from step 4, after the clean rebuild).
- **M2 baseline hash:** `find /private/tmp/cg-s41-m2-init-baseline -type f | wc -l` → 425 (unchanged). `find … -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256` → `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` — matches exactly. Read-only; never written into.
- **Dist smoke** (read-only `--help` invocations against the rebuilt `CLI/dist/cli.js`): `scaffold-lint --help`, `gate --help`, `stamp --help`, `wiki --help` — all print their usage text and exit 0. No writes performed. (The dispatch's own fresh-journey hand-recheck of the 4 fixed behaviors was already exercised at QA-Verify — §4 of `BUG-097-qa.md` — against `/private/tmp/cg-s41-fresh-journey`; not repeated here to avoid a second write against that shared scratch fixture outside a QA dispatch.)

## State Transition

```
CLEARGATE_STATE_FILE=OUTER/.cleargate/sprint-runs/SPRINT-41/state.json node OUTER/.cleargate/scripts/update_state.mjs BUG-097 Done
```
Output: `Updated BUG-097: state="Done"`. Confirmed in `state.json`: `"BUG-097": { "state": "Done", "qa_bounces": 0, "arch_bounces": 0, "worktree": null, "updated_at": "2026-09-26T16:17:33.882Z", "lane": "standard", … }`.

## Cleanup / Teardown

- `git -C OUTER/.worktrees/BUG-097/cleargate-cli status --porcelain` → empty.
- `git -C OUTER/.worktrees/BUG-097 status --porcelain` → empty.
- `git -C CLI worktree remove OUTER/.worktrees/BUG-097/cleargate-cli` → removed (cli first, per re-plan §4).
- `git -C OUTER worktree remove .worktrees/BUG-097` → removed.
- `git worktree list` (both repos) confirms BUG-097 is gone; the other live lanes (BUG-090, BUG-098, CR-124, STORY-058-11) are untouched.
- Branch kept, per instruction: `story/BUG-097` still present in `CLI` (tip `a3720ea`, the integrate commit — not `d4d6d93`, which lives only on `main`).

## Hygiene (step 11)

Ran (after the M2 hash check above):
```
find /private/tmp /var/folders -maxdepth 3 \( -name 'cg-s41-fix-*' -o -name 'cg-s41-payload-*' -o -name 'cg-s41-contract-payload-*' \) -mmin +60 -exec rm -rf {} +
```
- Before: 763 matching dirs total, 511 older than 60 min.
- Removed: 511 (the `-mmin +60` set).
- After: 252 matching dirs remain (fresh/in-use by concurrent build lanes, all ≤60 min old).
- `/private/tmp/cg-s41-m2-init-baseline` confirmed still present (425 files, hash unchanged) — never touched, matches its name-prefix exclusion.
- `/private/tmp/cg-s41-fresh-journey` confirmed still present — never touched.
- Also removed my own scratch (`/private/tmp/bug097-premerge/`, the full-suite log, the BD-rebuild log) — not part of the named hygiene set, but this fix wave is specifically about fresh-journey CLI hygiene, so cleaned up rather than left behind.
- **Disk:** `/dev/disk3s3s1` (this machine's actual data volume — the BUG-096 report's `/dev/disk3s1` path was unavailable on this run; used `df -i /`) showed 540M ifree post-hygiene, consistent with a machine running several concurrent build/harness lanes generating and cleaning fixture trees continuously.

## Final Git Status

**OUTER** (`/Users/ssuladze/Documents/Dev/ClearGate`, branch `sprint/S-41`):
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```
(the 4 ledger files only — `state.json` now carries the Done transition. This report file itself is untracked, left for the orchestrator to commit per instruction.)

**CLI** (`/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli`, branch `main` @ `d4d6d93`):
```
?? cleargate-0.25.0.tgz
```
(pre-existing untracked artifact, never staged.)

## Mirror Parity Audit

N/A — the §3.1 files-changed manifest for this merge is cli-source-only (`src/commands/*.ts` + their test files), with no outer canonical↔npm-payload mirror pair to audit and no RS-* boundary step scheduled for this item. No `.claude/` re-sync performed — BUG-097 touches no scaffold, hooks, or canonical-live surfaces (confirmed by the payload-identity check above showing zero content drift).

## Script Incidents

None wrapped via `run_script.sh` — this item's mechanical steps (state transition and all git/npm commands) were run directly, matching the BUG-096 DevOps precedent; no RS-*/`b0-live-resync.mjs`-class procedure applies here. The one operational incident (BD's `head`-truncated build, see §BD) was a plain shell-pipe SIGPIPE, not a `run_script.sh`-wrapped script failure, and was self-corrected within this dispatch with no lasting effect (dist is gitignored; the corrected rebuild's outputs are verified identical in content to what a clean build always produces).

## flashcards_flagged

```yaml
flashcards_flagged:
  - "2026-09-26 · #devops #build #shell-pipe · piping `npm run build` into `head`/any pipe that closes early SIGPIPEs tsup mid-rebuild, deleting dist without repopulating it; verify-pack then correctly refuses to publish — capture full BD output to a file instead."
```

The MANIFEST.json `generated_at` volatility observation is already recorded (FLASHCARD.md 2026-09-25 `#test-harness #manifest`); not re-flagged.
