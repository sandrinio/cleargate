# DevOps Report — BUG-090

role: devops

Merge lane for BUG-090 (two-repo; position-independent frontmatter fences in `assert_story_files.mjs`/`close_sprint.mjs`, `approved:` key in epic/story/hotfix templates, `push.ts` wording, `doctor.ts` sniff removal). `CLI` = `/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli` (main checkout, stayed on `main` throughout except the one merge below). `OUTER` = `/Users/ssuladze/Documents/Dev/ClearGate` (`sprint/S-41`). Rule 15 order honoured: outer merged first, cli second, one turn.

Entering this dispatch, BUG-090 had already run its full loop (QA-Red → live TPV → Dev → integrate → QA-Verify → live Architect post-flight, all PASS) against cli main `c5a311e`. Between that integrate and this DevOps turn, cli `main` advanced to `d4d6d93` via the BUG-097 merge, so Step 0 below re-syncs before the merge-lane steps.

## 0. Re-sync (main moved c5a311e → d4d6d93 via BUG-097)

- `<cw>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-090/cleargate-cli`, branch `story/BUG-090` (pre-resync HEAD `2e63854`, the prior INTEGRATE commit).
- `<ow>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-090`, branch `story/BUG-090` (HEAD `398dfac3`, 5 twins already `cmp`-identical to canonical, uncommitted).
- `git -C <cw> merge --no-ff main -m "integrate(BUG-090): re-sync cli main d4d6d93"` — **clean, no conflicts.** **Re-sync commit SHA: `e9e3d46eda866951fbd77a927cbab71d8bd66115`.** Brought in exactly BUG-097's 8 files (`src/commands/{gate,scaffold-lint,stamp,wiki-query}.ts` + their 4 test files) — disjoint from BUG-090's surface, as BUG-097's own DevOps report predicted.
- `<cw>`: `npm run prebuild && npm run build > /private/tmp/bug090-cw-build.log 2>&1` — payload 80 files, scaffold split 87 files, MANIFEST 74 files, ESM/CJS/DTS all `⚡️ Build success`, exit 0. `npm run typecheck` — clean, exit 0.
- Solo re-verify in `<cw>` (counts vs. `BUG-090-qa.md`):

| File | tests/pass/fail/skip | Match |
|---|---|---|
| `test/scripts/frontmatter-fence-parity.red.node.test.ts` | 21/21/0/0 | yes |
| `test/scripts/assert-story-files-fence.red.node.test.ts` | 11/11/0/0 | yes |
| `test/scripts/close-sprint-fence.red.node.test.ts` | 4/4/0/0 | yes |
| `test/scripts/template-approved-key.red.node.test.ts` | 7/7/0/0 | yes |
| `test/commands/push.node.test.ts` | 9/9/0/0 | yes |
| `test/commands/doctor.node.test.ts` | 40/40/0/0 | yes |
| `test/commands/doctor-session-start.node.test.ts` | 22/22/0/0 | yes |
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, compare mode) | 5/5/0/0 | yes |
| `test/commands/init-host-parity.red.integration.node.test.ts` (same baseline, compare mode) | 15/15/0/0 | yes |

All green on the first run — no solo re-runs needed. Re-sync introduced no regression.

## 1. Outer twin commit (Rule 17)

- `cmp` of all 5 `<ow>/.cleargate/{scripts,templates}/*` against `<cw>/scaffold/core/.cleargate/{scripts,templates}/*`: **all 5 already identical** (the QA-Verify/post-flight passes had already confirmed this on the pre-resync tree, and the re-sync touched no BUG-090 file, so no `cp` re-derivation was needed).
- Ran `cd OUTER && CLEARGATE_STATE_FILE=$PWD/.cleargate/sprint-runs/SPRINT-41/state.json node .cleargate/scripts/update_state.mjs BUG-090 "Architect Passed"` immediately before committing, per instruction. Result: `No-op: BUG-090 is already in state "Architect Passed"` — a true zero-write no-op (state was already correct; `updated_at` unchanged at `2026-09-26T16:16:35.953Z`). At commit time BUG-097 held the max `updated_at` (`16:17:33.882Z`) in `state.json`, and BUG-097 is itself a non-STORY id, so the surface gate's active-item resolution still had no STORY candidate — consistent with the intended effect of the refresh call.
- `git -C <ow> add` the 5 twin paths and committed on `story/BUG-090`:
  - **Commit SHA: `04fbdccc6a87cf7927517fd9550c251609754c40`** — `chore(BUG-090): live mirror — byte-copy 5 canonical files (assert_story_files.mjs + close_sprint.mjs ESM pair, epic/story/hotfix templates)`.
  - Pre-commit hooks ran normally (`check:no-vitest` clean, `no inline work-item-id regexes` clean). Surface gate printed `[surface-gate] WARNING: No active story file found (searched .worktrees/BUG-090 and OUTER) — skipping surface check` — the gate did not block, exactly as expected (`SKIP_SURFACE_GATE` was **not** set on this story-branch commit, per instruction).
  - `5 files changed, 157 insertions(+), 19 deletions(-)`.

## 2. Merge-lane checks

- `git -C CLI merge-base --is-ancestor main story/BUG-090` → exit 0 (`story/BUG-090` tip is the re-sync commit, which contains `main`'s `d4d6d93`).
- `git -C CLI status --porcelain` → only `?? cleargate-0.25.0.tgz` (never staged).
- `git -C OUTER status --porcelain` → only the 4 sprint ledger files (never committed).

## 3. D1 — payload-identity baseline (pre-merge)

`cp -R CLI/templates/cleargate-planning /private/tmp/cg-s41-fw-payload-pre-090` — **81 files** (80 payload + `MANIFEST.json`), taken before either merge.

## 4. D2 — outer merge FIRST

`git -C OUTER merge --no-ff story/BUG-090 -m "merge(story/BUG-090): position-independent frontmatter fences in sprint scripts + approved: in templates (live mirror)"` — **clean, no conflicts.**

- **Outer merge commit SHA: `61d1cdca35272926f24b57d0032088364ec2077d`.**
- Diff stat: **5 files changed, 157 insertions(+), 19 deletions(-)** — exactly `.cleargate/scripts/{assert_story_files,close_sprint}.mjs` and `.cleargate/templates/{epic,hotfix,story}.md`.

**Link witnesses:**
```
$ (cd OUTER && node .cleargate/scripts/close_sprint.mjs; echo "exit=$?")
Usage: node close_sprint.mjs <sprint-id> [--assume-ack | --report-body-stdin]
...
exit=2

$ (cd OUTER && node .cleargate/scripts/assert_story_files.mjs; echo "exit=$?")
Usage: node assert_story_files.mjs <sprint-file-path>
exit=2
```
No SyntaxError either time — the ESM import pair (`close_sprint.mjs` → `assert_story_files.mjs`) links correctly in the live outer tree.

## 5. D3 — cli merge SECOND

`git -C CLI merge --no-ff story/BUG-090 -m "merge(story/BUG-090): position-independent frontmatter fences (assert_story_files/close_sprint), approved: in epic/story/hotfix templates, push wording, doctor sniff removal"` — **clean, no conflicts.**

- **CLI merge commit SHA: `984e8d5325d23a6bbef9c94206a33cfab4ba5705`.**
- Diff stat (vs. pre-merge `main` `d4d6d93`): **17 files changed, 1513 insertions(+), 30 deletions(-)** — the 5 `scaffold/core/.cleargate/**` files, `scripts/clean-room/probe-items.mjs`, `src/commands/{doctor,push}.ts`, and 10 test files (7 new/amended default-tier + `test/helpers/init-fixture.ts` tail rows + the new `test/e2e/sprint-init-fresh-install.red.integration.node.test.ts`). Matches the pinned "Files (BUG-090, complete)" list exactly; nothing from CR-124/BUG-096/BUG-098 leaked in.

## 6. D4 — full suite (step 6)

`npm test` in `CLI` on the merge commit `984e8d5` (run in background, ~9m52s).

**Result: 3373 tests / 3371 pass / 0 fail / 2 skipped**, `suites 1155`, `duration_ms 591594.2`, exit code 0. Matches the expected count exactly (previous merge's total 3325/3323/0/2 **+48/+48/0/0** = 3373/3371/0/2, per the dispatch and `replan-contract-first.md` §9 "D4 count = previous total + 38" superseded by the dispatch's measured `+48` — matching BUG-090-qa.md's own default-tier delta of 48/48 exactly). **No solo re-runs were needed** — 0 failures on the first run.

## 7. Rule-14 revert (step 7)

`git -C OUTER diff --name-only` listed 34 paths: the same 30 `.cleargate/delivery/pending-sync/**` full-suite back-sync paths as the BUG-096/BUG-097 merges, plus the 4 sprint ledger files. Reverted only the 30 delivery paths with `git -C OUTER checkout -- <paths>`:

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

`cleargate-planning/MANIFEST.json` not in the diff (no-op per the 2026-09-25 sprint-context amendment). **Never touched:** the 4 ledger files. Post-revert `git -C OUTER diff --name-only` showed only those 4 ledger files. An untracked `reports/STORY-058-11-dev.md` from a concurrent build lane was present in `git status --porcelain` at various points — correctly left alone.

## 8. D5 — BD (step 8)

`npm run build > /private/tmp/bug090-bd.log 2>&1` in `CLI` on `main` (captured to a file, never piped through `head` — FLASHCARD 2026-09-26 `#devops #build`). Exit 0.

- `[prebuild] cleargate-planning payload composed: 80 files` (unchanged)
- `[prebuild] scaffold split view composed: 87 files` (unchanged)
- `[build-manifest] 74 files → MANIFEST.json` (unchanged)
- CJS/ESM/DTS all `⚡️ Build success`.

## 9. D6 — Payload identity CHANGES (step 9)

`diff -rq /private/tmp/cg-s41-fw-payload-pre-090 CLI/templates/cleargate-planning` lists **exactly 6 lines**:
```
Files .../pre-090/.cleargate/scripts/assert_story_files.mjs and .../cleargate-planning/.cleargate/scripts/assert_story_files.mjs differ
Files .../pre-090/.cleargate/scripts/close_sprint.mjs and .../cleargate-planning/.cleargate/scripts/close_sprint.mjs differ
Files .../pre-090/.cleargate/templates/epic.md and .../cleargate-planning/.cleargate/templates/epic.md differ
Files .../pre-090/.cleargate/templates/hotfix.md and .../cleargate-planning/.cleargate/templates/hotfix.md differ
Files .../pre-090/.cleargate/templates/story.md and .../cleargate-planning/.cleargate/templates/story.md differ
Files .../pre-090/MANIFEST.json and .../cleargate-planning/MANIFEST.json differ
```
— exactly the 5 pinned files plus `MANIFEST.json` (build-time regeneration, not content drift beyond the 5 entries + `generated_at`).

- `templates/scaffold/core/.cleargate/{scripts,templates}/*` (split view): `diff -q` against `scaffold/core/.cleargate/{scripts,templates}/*` (the tracked canonical source) shows **zero diffs** for all 5 files — the split view was recomposed byte-identical to canonical by `prebuild`.
- `templates/scaffold/hosts/codex/**`: **unchanged** — the merge touched no `scaffold/hosts/codex/**` source file (confirmed by the D3 diff-stat file list, §5 above), and `prebuild` is a pure function of source content, so the composed codex output is unchanged by construction.
- `node scripts/verify-pack.mjs` → `[verify-pack] OK — 204 files, payload 80, version 0.26.1.` — entry count unchanged.

## 10. D7 — Post-merge live witnesses, read-only (step 10)

1. **`cmp` live vs canonical for the 5 files:** all 5 identical (`assert_story_files.mjs`, `close_sprint.mjs`, `epic.md`, `hotfix.md`, `story.md`).
2. **`node CLI/dist/cli.js doctor --cwd OUTER`:** exit 0, no `scaffold drift:` line. (One pre-existing, unrelated advisory printed: `hook failure at 2026-09-26T13:03:07Z: stamp=0 gate=1 ingest=0 file=.../CR-124_contract_first_build_then_integrate_sprint_dag.md` — a CR-124-lane artifact, not touched by or related to this merge; plus the pre-existing "5 sprint files carry a retired `execution_mode:` field" advisory.)
3. **`bash OUTER/.cleargate/scripts/test/test_assert_story_files.sh`:** **15/15**, all scenarios pass.
4. **Named integration runs:**
   - `test/scaffold/canonical-live-parity.red.integration.node.test.ts`: **11/11** (all cases, including 5d).
   - `test/scripts/template-sync-fields.integration.node.test.ts`: **16/20**, with the 4 named pre-existing failures reproduced exactly: `live template {epic,story,CR,Bug}.md — parseFrontmatter returns all 6 new keys`, each throwing `TypeError: Cannot use 'in' operator to search for 'pushed_by' in <name> frontmatter should have key "pushed_by"` from the comma-operator bug at `:78` (`assert.ok(field in (fm, msg))`). Content-independent, reproduces identically on `CR.md`/`Bug.md`, which BUG-090 never touches — pre-existing, not a regression.
5. **M2 parity pair** (`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, compare mode): `claude-adapter-init-parity.red.integration.node.test.ts` **5/5**; `init-host-parity.red.integration.node.test.ts` **15/15**.
6. **`test/e2e/sprint-init-fresh-install.red.integration.node.test.ts`:** **2/2**.
7. **`test/e2e/frontmatter-authoring.red.integration.node.test.ts`** (after BD, spawns the rebuilt dist through the rendered hook): **9/9**.
8. **Step-2.9 equivalence census**, read-only, against the shipped live script — `(cd OUTER && node <script>)` importing `./.cleargate/scripts/assert_story_files.mjs`'s `locateFrontmatterFence`, walking `.cleargate/delivery/{pending-sync,archive}/*.md`, applying the `parseFrontmatterFields`/`parseDeferredVerifications` rule inline (mirroring `close_sprint.mjs`'s private Step-2.9 parsers byte-for-byte):

   ```json
   { "files": 558, "throws": 0, "deferredSet": ["STORY-058-09", "STORY-058-10", "STORY-058-13"] }
   ```

   **0 throws**; the SPRINT-41 deferred set is exactly `[STORY-058-09, STORY-058-10, STORY-058-13]` — matches the dispatch's expected value and the Architect's independent post-flight census (`BUG-090-arch.md` Check 6) exactly. No writes performed.
9. **M2 baseline:** `find /private/tmp/cg-s41-m2-init-baseline -type f | wc -l` → **425** (unchanged); combined `shasum -a 256` → **`bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2`** — matches exactly. Read-only throughout; never written into.

**Self-caused incident during D7.8 (corrected, no lasting effect):** my first attempt at writing the census script began with `cat > .../\.script-incidents/.gitkeep 2>/dev/null` with no stdin redirect — this blocks reading from stdin indefinitely in this tool environment rather than creating an empty file, which stalled the whole heredoc chain (the actual census script file was never written). Diagnosed via `ps`/`pgrep` (the blocked `cat` child of the backgrounded shell), killed the stuck process pair, removed the stray 0-byte `.gitkeep` it had created before blocking, and rewrote the census script with a clean heredoc (no leading blocking command). Re-run succeeded immediately (§10.8 above). No other worktree or lane was touched; nothing was left uncommitted or corrupted as a result. Flagged as a flashcard below.

## 11. D8 — No `.claude/` re-sync (step 11)

`git -C CLI diff --name-only d4d6d93 HEAD -- scaffold/hosts/claude` → **empty**. No canonical Claude-host file changed by this merge; no live re-sync or restart needed.

## State Transition

```
CLEARGATE_STATE_FILE=OUTER/.cleargate/sprint-runs/SPRINT-41/state.json node OUTER/.cleargate/scripts/update_state.mjs BUG-090 Done
```
Output: `Updated BUG-090: state="Done"`. Confirmed in `state.json`: `"BUG-090": { "state": "Done", "qa_bounces": 0, "arch_bounces": 1, "worktree": null, "updated_at": "2026-09-26T16:48:02.087Z", ... }`.

## Cleanup / Teardown (step 13)

- `git -C <cw> status --porcelain` → empty; `git -C <ow> status --porcelain` → empty (confirmed before removal).
- `git -C CLI worktree remove OUTER/.worktrees/BUG-090/cleargate-cli` → removed (cli first, per Rule 19/re-plan §4).
- `git -C OUTER worktree remove .worktrees/BUG-090` → removed.
- `git worktree list` (both repos) confirms BUG-090 is gone; the other live lanes (BUG-098, CR-124, STORY-058-11) are untouched.
- Branches kept, per instruction: `story/BUG-090` still present in both `CLI` and `OUTER`.

## Hygiene (step 14)

```
find /private/tmp /var/folders -maxdepth 3 \( -name 'cg-s41-fix-*' -o -name 'cg-s41-payload-*' -o -name 'cg-s41-contract-payload-*' \) -mmin +60 -exec rm -rf {} +
```
- Before: 419 matching dirs total, 154 older than 60 min.
- Removed: 154 (the `-mmin +60` set).
- After: 265 matching dirs remain (fresh/in-use by concurrent build lanes, all ≤60 min old).
- `/private/tmp/cg-s41-m2-init-baseline` (425 files, hash unchanged) and `/private/tmp/cg-s41-fresh-journey` both confirmed still present — never touched.
- Removed `/private/tmp/cg-s41-fw-payload-pre-090` (the D1 baseline copy) at the very end, per instruction.
- Also removed my own scratch build/test logs (`bug090-cw-build.log`, `bug090-bd.log`, `bug090-fullsuite.log`, `bug090-tsf.log`) — not part of the named hygiene set, but no reason to leave them behind.

## Final Git Status

**OUTER** (`/Users/ssuladze/Documents/Dev/ClearGate`, branch `sprint/S-41` @ `61d1cdca`):
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
?? .cleargate/sprint-runs/SPRINT-41/reports/STORY-058-11-dev.md
```
(the 4 ledger files only, plus this dispatch's own devops report and an untracked report from a concurrent STORY-058-11 build lane — not mine, left alone.)

**CLI** (`/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli`, branch `main` @ `984e8d5`):
```
?? cleargate-0.25.0.tgz
```
(pre-existing untracked artifact, never staged.)

## Mirror Parity Audit

All 5 canonical↔live mirror pairs confirmed `cmp`-identical post-merge (§10.1): `.cleargate/scripts/assert_story_files.mjs`, `.cleargate/scripts/close_sprint.mjs`, `.cleargate/templates/{epic,hotfix,story}.md`. Live re-sync required: **none** — the D2 outer merge itself is the sync mechanism (this item's outer half *is* the live mirror commit). No drift detected; `doctor` confirms with no `scaffold drift:` line (§10.2).

## Script Incidents

None wrapped via `run_script.sh` — this item's mechanical steps (state transitions and all git/npm commands) were run directly, matching the BUG-096/BUG-097 DevOps precedent; no RS-*/`b0-live-resync.mjs`-class procedure applies here. The one operational incident (§10, D7.8's stuck `cat > file` with no stdin redirect) was a plain shell/stdin block, not a `run_script.sh`-wrapped script failure, self-diagnosed and corrected within this dispatch with no lasting effect on any tracked file or other lane.

```yaml
flashcards_flagged:
  - "2026-09-26 · #devops #shell #stdin · `cat > file` with no redirect (no heredoc, no </dev/null) blocks forever reading stdin in an agent Bash call; use a heredoc or `: > file`/`touch` for empty-file creation."
```

The BD `head`-pipe SIGPIPE lesson (`#devops #build`) and the `#worktree #build` prebuild/build-in-worktree lesson are already recorded (FLASHCARD.md 2026-09-26); not re-flagged. This item's merge produced no new payload-identity or manifest-volatility findings beyond what's already carded.
