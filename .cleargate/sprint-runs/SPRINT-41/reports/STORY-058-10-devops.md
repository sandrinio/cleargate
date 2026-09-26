# DevOps Report — STORY-058-10

role: devops

Merge lane for the first contract-first item (STORY-058-10, cli-only). Cli main checkout `CLI` = `/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli`, outer `OUTER` = `/Users/ssuladze/Documents/Dev/ClearGate`. -10 has no outer half (its outer worktree was a detached `sprint/S-41` checkout with no commits).

## 0. Re-sync check

- `git -C CLI merge-base --is-ancestor main story/STORY-058-10` → exit 0.
- `git -C CLI status --porcelain` → only `?? cleargate-0.25.0.tgz` (never staged).
- `git -C CLI branch --show-current` → `main` @ `35580b09a44725ac0908d326dddb3da554e28e70` (matches M5-A30's stated base).

## 1–2. Pre-merge captures

- No-flag install tree (pre-merge `dist`), scratch: `/private/tmp/s10-premerge-14w26r` (`git init` + `node CLI/dist/cli.js init --yes --pin 0.0.0-m5`, one `(cd … && …)` call). Exit 0, clean install log.
- Payload identity before merge (M3-A12 NUL-safe recipe): `e44154af06f608c8cb9c83c2b2845527ed489c52740eeec66fd16798a8939a27` — 81 files including `MANIFEST.json`. Matches M5-A30's re-measured value exactly.
- Payload-identity baseline copy: `CLI/templates/cleargate-planning` copied to `/private/tmp/s10-premerge-14w26r-payload-baseline` immediately before the merge (81 files).

## Merge Result

- Sprint/merge branch: cli `main` (this item has no `sprint/S-41` half).
- Story branch: `story/STORY-058-10` (tip `b12240b`, pass D).
- Merge command: `git -C CLI merge --no-ff story/STORY-058-10 -m "merge(story/STORY-058-10): codex host adapter — payload surfaces, enforcement under Codex, codex clean-room harness"`.
- **Merge commit SHA: `fcb14918cc7a4f9978ca93791172d860fbcbfdcc`.**
- Clean fast merge via the `ort` strategy — **no conflicts**.
- Diff stat: 75 files changed, 11807 insertions(+), 302 deletions(-).

## Full-Suite Result (step 4)

- `npm test` in `CLI` on the merge commit.
- **Result: 3309 tests / 3307 pass / 0 fail / 2 skipped**, `suites 1141`, `duration_ms 789561.1` (~13m10s).
- Matches the expected count exactly (M5-A44 "after pass B" carried forward through passes C/D per replan-contract-first.md §6: "3309 / 3307 / 0 / 2"). **No solo re-runs were needed** — 0 failures on the first run.

## Rule-14 Revert (step 5)

`git -C OUTER diff --name-only` listed 34 paths: 30 under `.cleargate/delivery/pending-sync/**` (full-suite back-sync signature) plus the 4 sprint ledger files. Reverted only the 30 delivery paths with `git -C OUTER checkout -- <paths>`:

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

`cleargate-planning/MANIFEST.json` was not in the diff (no-op per the 2026-09-25 sprint-context amendment). **Never touched:** the 4 ledger files (`.session-totals.json`, `events.jsonl`, `state.json`, `token-ledger.jsonl`). Post-revert `git -C OUTER diff --name-only` shows only those 4 ledger files.

## BD (step 6)

`npm run build` in `CLI` on `main`. `prebuild` (`build-codex-payload.mjs --check` → `copy-planning-payload.mjs` → `build-manifest.ts`) then `tsup` build. All green, no errors:
- `[prebuild] cleargate-planning payload composed: 80 files`
- `[prebuild] scaffold split view composed: 87 files`
- `[build-manifest] 74 files → MANIFEST.json`
- ESM/CJS/DTS builds all report `⚡️ Build success`.

## Post-BD Witnesses (step 7, solo)

| Witness | Result |
|---|---|
| `test/commands/init-restart-banner.node.test.ts` | 3/3 PASS |
| `test/commands/init-no-dep0190.node.test.ts` | 2/2 PASS |
| `test/cli.node.test.ts` | 23/23 PASS |
| `test/integration/init-pre-member-isolation.node.test.ts` | 2/2 PASS |
| `test/commands/init-from-source-dist.integration.node.test.ts` | 2/2 PASS |
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (M2 parity, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`) | 5/5 PASS |
| `test/commands/init-host-parity.red.integration.node.test.ts` (M2 parity, same baseline) | 15/15 PASS |
| `node scripts/verify-pack.mjs` | `OK — 204 files, payload 80, version 0.26.1` (196→204 as expected) |
| `test/e2e/clean-room-claude-baseline.red.integration.node.test.ts` (-09 e2e on `main`) | 13/13 PASS |

No solo re-runs needed — every witness passed on the first try.

## Payload Identity After Merge (step 8 / M5-A30)

- Post-BD payload identity hash: `16dda946d971c7efed256fed3f081574dcc9b0ad7cf6f214fa0d645f770683b7` — 81 files (same count, 4 bytes changed).
- `diff -rq` of `CLI/templates/cleargate-planning` against the pre-merge copy (`/private/tmp/s10-premerge-14w26r-payload-baseline`): **exactly 5 lines** — the 4 hooks (`pending-task-sentinel.sh`, `pre-edit-gate.sh`, `stamp-and-gate.sh`, `token-ledger.sh`) plus `MANIFEST.json`.
- `diff -rq` against `/private/tmp/claude-501/cg5801/payload-baseline-post-085`: **identical 5-line result** — same 4 hooks plus `MANIFEST.json`.
- New split root confirmed: `CLI/templates/scaffold/hosts/codex/` exists with `.codex/`, `AGENTS.md`, `MANIFEST.json`.

## Re-Capture, Post-BD dist (step 9)

- No-flag install tree captured post-BD at `/private/tmp/s10-postbd-OciB3o` (same recipe as step 1).
- `diff -rq` against the step-1 pre-merge tree: the 4 hooks, `.cleargate/.install-manifest.json`, and `.cleargate/.participant.json` (the latter differs only in its `set_at` timestamp — expected run-to-run volatility from two separate `init` invocations, not a merge/BD artifact). No other file differs.
- `.install-manifest.json` diff: exactly the 4 hook `sha256` entries plus the `generated_at`/`installed_at` timestamps.

## Smokes (step 10)

All run as single non-backgrounded `(cd /private/tmp/<mktemp> && node OUTER/cleargate-cli/dist/cli.js …)` calls, never in `OUTER`:

1. `init --yes --pin 0.0.0-m5 --host codex` (`/private/tmp/s10-smoke-codex-TM6EDo`) → `verify-install` → **PASS, exit 0** (8 machine checks PASS, `codex.features-hooks` PASS, live checks correctly reported as "NOT CHECKED — needs a live host session").
2. `--host all` (`/private/tmp/s10-smoke-all-8fdHsA`) → `verify-install --host claude` **PASS, exit 0**; plain `verify-install` **PASS, exit 0** (claude + codex machine checks all PASS).
3. `upgrade --dry-run` in the codex room: 55 files planned, **no prune entries for `.codex/**`** (5 codex-owned files listed as `pin-aware`/`overwrite`, all `state=clean`).
4. `host remove codex` in the all room:
   - `.codex/hooks.json` and `.codex/hooks/**` gone; `.codex/config.toml` survives with `[features] hooks = true` and no `[mcp_servers.cleargate]` table (AD-4/M5-A35 behavior) — this matches the plan's precise definition of "`.codex/**` gone", not a literal empty directory.
   - `AGENTS.md` is empty (no anchored markers — zero user prose was ever added, so "keeps user prose with zero anchored markers" holds vacuously).
   - `.install-manifest.json` `hosts` = `["claude"]` only.
   - Claude files byte-unchanged: `shasum -a 256` of all 24 files under `.claude/` before vs. after `host remove codex` — **diff empty**.

## RS-4a (step 11)

Used the sanctioned `.cleargate/sprint-runs/SPRINT-41/b0-live-resync.mjs` tool (per M5.md RS-4a procedure and the arch report's §5 RS-4a readiness section), invoked through the required `run_script.sh` wrapper.

**Before (live, `OUTER/.claude/hooks/`):**

| File | Before hash |
|---|---|
| `pre-edit-gate.sh` | `cb06ccc2ab863f52eee1971fe68574d090fd7ad7078f961323ce2594517508c5` |
| `stamp-and-gate.sh` | `9c6beeda6d1a0db19b1c6e21de8f20b9845317d40f32d7f4d390025d652a5462` |
| `pending-task-sentinel.sh` | `444becd20e458c7982203243b7e6d8471905d90120660eca430405804fbb4d1b` |
| `token-ledger.sh` | `ec83cebc66d73b841b544cd4f5734244d8a3f63251660944548e5d7f60b4d3b5` |
| `session-start.sh` (must not appear in the change list) | `14d73e83bd2f7052a237489785aa65322b152c02a904b14dea421c4d99c44cb4` |

All four "before" hashes and the untouched `session-start.sh` hash match the arch post-flight report's §5 table exactly.

**Dry run** (`node b0-live-resync.mjs`): change list was exactly `hooks/pending-task-sentinel.sh`, `hooks/pre-edit-gate.sh`, `hooks/stamp-and-gate.sh`, `hooks/token-ledger.sh` — no extra entries, no orphans. `session-start.sh` absent from the list, as required.

**Apply** (`node b0-live-resync.mjs --apply`): wrote all 4 files (mode 0755 preserved), backed up to `.cleargate/sprint-runs/SPRINT-41/b0/claude-live-backup-2026-09-26T15-12-43-960Z.tgz` (+ sha256 manifest), post-condition confirmed (`"live == canonical (pin-substituted) for every canonical file"`).

**After (live pin `0.20.0`):**

| File | After hash | Matches arch report expected? |
|---|---|---|
| `pre-edit-gate.sh` | `4e401831b09e171ad4f0ec8ae49e218cf666556cf27fa507958820f9ac053e0a` | yes |
| `stamp-and-gate.sh` | `f1c4eaf99ea07c7570c9c23383c0d304ce429ceaeedfe20d0ca776b882913b79` | yes |
| `pending-task-sentinel.sh` | `fe597ef080df2b70e3f8c7935886687b28de0df01b35ba1074ef451bf5f30766` | yes |
| `token-ledger.sh` | `f4d832bacff0f6d3f8fbccf5083dbee99690cbf369873fa2b7a72c47e37dee9e` | yes |

**Parity result:**
- `node CLI/dist/cli.js doctor` — exit 0, no `scaffold drift` line for any file (only a pre-existing, unrelated `hook failure` log line from an earlier `CR-124` item timestamped before RS-4a, plus a `retired execution_mode:` advisory — neither is drift, neither is in scope).
- `test/scaffold/canonical-live-parity.red.integration.node.test.ts` — **11/11 PASS**, including case 5d (`.claude/hooks/token-ledger.sh canonical = live`).
- Modes: all 4 files `0755`.
- `.claude/settings.json` was not in the b0 change list — untouched; no restart needed. Nothing else under `OUTER/.claude/` was touched (the script's own diff enumeration covers the entire canonical↔live tree and reported no other drift).

## Mirror Parity Audit

The §3.1 files-changed manifest for this merge is cli-source only (`src/**`, `scaffold/**`, `scripts/**`, `test/**`); there is no outer canonical↔npm-payload mirror pair to audit beyond the RS-4a hook re-sync above, which is the applicable parity check for this item (per the M5/-10 DevOps contract, "cli-only, none" outer paths). RS-4a result: **clean** (all 4 hooks re-synced and verified; no drift remaining).

## State Transition

```
CLEARGATE_STATE_FILE=OUTER/.cleargate/sprint-runs/SPRINT-41/state.json node OUTER/.cleargate/scripts/update_state.mjs STORY-058-10 Done
```
Output: `Updated STORY-058-10: state="Done"`. Confirmed in `state.json`: `"STORY-058-10": { "state": "Done", "qa_bounces": 1, "arch_bounces": 2, "worktree": null, "updated_at": "2026-09-26T15:13:20.288Z", … }`.

## Cleanup / Teardown

- `git -C OUTER/.worktrees/STORY-058-10/cleargate-cli status --porcelain` → empty.
- `git -C OUTER/.worktrees/STORY-058-10 status --porcelain` → empty.
- `git -C CLI worktree remove OUTER/.worktrees/STORY-058-10/cleargate-cli` → removed (cli first, per re-plan §4).
- `git -C OUTER worktree remove .worktrees/STORY-058-10` → removed.
- `git worktree list` (both repos) confirms STORY-058-10 is gone; the other 5 live lanes (BUG-090, BUG-096, BUG-097, CR-124, STORY-058-11) are untouched.
- Branches kept, per instruction: `story/STORY-058-10` and `contract/S-41-codex` both still present.

## Final Git Status

**OUTER** (`/Users/ssuladze/Documents/Dev/ClearGate`, branch `sprint/S-41`):
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```
(the 4 ledger files only — state.json now carries the Done transition; the other three predate this dispatch.)

**CLI** (`/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli`, branch `main` @ `fcb14918cc7a4f9978ca93791172d860fbcbfdcc`):
```
?? cleargate-0.25.0.tgz
```
(pre-existing untracked artifact, never staged.)

## Script Incidents

None. `run_script.sh` was used once (RS-4a dry-run + apply, both via the wrapper); no incident file was written under `.cleargate/sprint-runs/SPRINT-41/.script-incidents/` (checked: directory unchanged / no new entries for this dispatch).

## flashcards_flagged

```yaml
flashcards_flagged:
  - "2026-09-26 · #devops #host-lifecycle · host remove codex leaves .codex/config.toml (features kept, mcp table stripped) — 'gone' means owned entries, not the dir."
  - "2026-09-26 · #devops #rs-4a · b0-live-resync.mjs is the sanctioned RS-4a/RS-4 tool; its dry-run change list is a stronger pre-apply gate than a manual cp+diff."
```
