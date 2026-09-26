# BUG-090 — QA-Red Re-Seal Report

role: qa

QA-RED: WRITTEN

## Commit

- Worktree: `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-090/cleargate-cli` (branch `story/BUG-090`)
- Prior HEAD (verified before patching): `dbdcfc89ba081fb9a2cbbc4febd3535ebbcdcd10` — matched dispatch.
- New commit: `93e48dcd78301d147a904502a826ea9863779fd7`
  `qa-red(BUG-090): TPV re-seal — applies patch sha256 28d4f07c…1b27 (FW-A16)`

## Patch integrity (3-point gate)

1. **sha256 match:** computed `28d4f07c6da5e2fe84332bb3fd14076c55ab3a33f0e0c2970652d1af22f51b27` — matches dispatch value exactly.
2. **`git apply --check`:** clean (`CHECK_OK`).
3. **Staged-list equality:** patch touches exactly 3 files; `git diff --cached --name-only` after `git add` equals that list byte-for-byte:
   - `test/scripts/assert-story-files-fence.red.node.test.ts`
   - `test/scripts/close-sprint-fence.red.node.test.ts`
   - `test/scripts/frontmatter-fence-parity.red.node.test.ts`

No hand edits made to any file. `npm run prebuild` was run in the cli worktree (writes only gitignored `templates/**`) so payload-reading tests had fixtures available; no `dist` build was needed (push/doctor/doctor-session-start tests reference `dist/cli.js` only in "no dist" fall-through branches).

## Per-file counts vs FW-A16 expected

| File | Total | Pass (anchor) | Fail (red) | Expected | Match |
|---|---|---|---|---|---|
| `frontmatter-fence-parity.red.node.test.ts` | 21 | 0 | 21 | 21 red | ✓ |
| `assert-story-files-fence.red.node.test.ts` | 11 | 5 | 6 | 11 (6 red, 5 anchors) | ✓ |
| `close-sprint-fence.red.node.test.ts` | 4 | 1 | 3 | 4 (3 red, 1 anchor) | ✓ |
| `template-approved-key.red.node.test.ts` | 7 | 2 | 5 | 7 (5 red, 2 anchors) | ✓ |
| `push.node.test.ts` (+2 red among 7 pre-existing pass) | 9 | 7 | 2 | +2 red, rest green | ✓ |
| `doctor.node.test.ts` (+1 red among 39 pre-existing pass) | 40 | 39 | 1 | +1 red, rest green | ✓ |
| `doctor-session-start.node.test.ts` (+2 red among 20 pre-existing pass) | 22 | 20 | 2 | +2 red, rest green | ✓ |
| **Default-tier delta total** | **48 new** | **8 anchors** | **40 red** | 48 (40 red, 8 anchors) | ✓ |
| `sprint-init-fresh-install.red.integration.node.test.ts` (integration) | 2 | 0 | 2 | 2 red | ✓ |

Delta arithmetic: 21 + 11 + 4 + 7 + 2 + 1 + 2 = 48 new tests; red-only 21 + 6 + 3 + 5 + 2 + 1 + 2 = 40; anchors 5 + 1 + 2 = 8. All three FW-A16 totals reproduce exactly.

## Red-for-the-right-reason check

Scanned every solo run's captured output for wiring/syntax failure signatures (`Cannot find module`, `SyntaxError`, `is not a function`, `is not defined`, `ERR_MODULE_NOT_FOUND`, `TSError`, `Unexpected token`, `ReferenceError`). One hit, in `frontmatter-fence-parity`: repeated `AssertionError … (script threw: fn is not a function)`. Inspected the test source (`test/scripts/frontmatter-fence-parity.red.node.test.ts:19,37,45,49,179`) — this is the intentional BUG-090(a)/BUG-098 C4 contract assertion: `locateFrontmatterFence` is not yet exported from `assert_story_files.mjs`, so `attempt(script.locateFrontmatterFence, …)` correctly throws `fn is not a function` until the Developer adds the export. This is the designed red (missing not-yet-built implementation), not a broken/mis-wired test. No other file produced a hit.

`npm run typecheck` (cli worktree): clean, exit 0.

## Git statuses

```
$ git -C /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-090/cleargate-cli status --porcelain
(empty — clean, commit 93e48dc is HEAD)

$ git -C /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-090 status --porcelain
(empty — no outer back-sync occurred; nothing to revert)

$ git -C /Users/ssuladze/Documents/Dev/ClearGate status --porcelain
 M .cleargate/delivery/pending-sync/BUG-071_existing_surfaces_sentinel_contradicts_template.md
 M .cleargate/delivery/pending-sync/BUG-072_listed_item_predicate_counts_only_hyphen_bullets.md
 M .cleargate/delivery/pending-sync/BUG-073_preflight_shells_out_to_bare_cleargate.md
 M .cleargate/delivery/pending-sync/BUG-074_state_transition_dirties_tree_fails_next_bounce_check.md
 M .cleargate/delivery/pending-sync/BUG-075_state_transitions_table_never_enforced.md
 M .cleargate/delivery/pending-sync/BUG-076_close_sprint_requires_metarepo_cli_path.md
 M .cleargate/delivery/pending-sync/BUG-077_parent_rollup_runs_before_child_backsync.md
 M .cleargate/delivery/pending-sync/BUG-078_sprint_parent_cannot_enumerate_children.md
 M .cleargate/delivery/pending-sync/BUG-085_live_instance_never_resynced_canonical_hook_fixes_inert.md
 M .cleargate/delivery/pending-sync/BUG-089_pretooluse_gates_exit_1_fail_open.md
 M .cleargate/delivery/pending-sync/CR-118_existing_surfaces_forward_references.md
 M .cleargate/delivery/pending-sync/CR-119_story_template_greenfield_create_row.md
 M .cleargate/delivery/pending-sync/CR-124_contract_first_build_then_integrate_sprint_dag.md
 M .cleargate/delivery/pending-sync/SPRINT-41_multi_host_adapters_and_frontmatter_locator.md
 M .cleargate/delivery/pending-sync/STORY-031-03_test_stack_single_source_runner_and_known_failures.md
 M .cleargate/delivery/pending-sync/STORY-031-04_qa_red_stops_full_suite_runs.md
 M .cleargate/delivery/pending-sync/STORY-031-05_test_stack_carry_forward_at_sprint_init.md
 M .cleargate/delivery/pending-sync/STORY-058-01_scaffold_core_host_layout.md
 M .cleargate/delivery/pending-sync/STORY-058-02_scaffold_source_and_manifest_builder_repoint.md
 M .cleargate/delivery/pending-sync/STORY-058-03_hostadapter_contract_and_registry.md
 M .cleargate/delivery/pending-sync/STORY-058-04_init_host_selector_parsing.md
 M .cleargate/delivery/pending-sync/STORY-058-05_host_lifecycle_commands.md
 M .cleargate/delivery/pending-sync/STORY-058-06_manifest_host_ownership_fields.md
 M .cleargate/delivery/pending-sync/STORY-058-07_per_host_doctor_upgrade_uninstall_scoping.md
 M .cleargate/delivery/pending-sync/STORY-058-08_clean_room_verification_procedure_and_driver.md
 M .cleargate/delivery/pending-sync/STORY-058-09_clean_room_claude_regression_baseline.md
 M .cleargate/delivery/pending-sync/STORY-058-10_codex_payload_surfaces.md
 M .cleargate/delivery/pending-sync/STORY-058-11_codex_role_and_skill_translation.md
 M .cleargate/delivery/pending-sync/STORY-058-12_host_dispatch_mode_split_and_serial_fallback.md
 M .cleargate/delivery/pending-sync/STORY-058-13_codex_end_to_end_loop_evidence.md
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```

The outer-main dirt above is pre-existing orchestrator/ledger state (matches the session's opening `gitStatus` snapshot verbatim) — not touched by this dispatch. Per hard rules, the cli main checkout (`/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli`) was never read or written.

## flashcards_flagged

```yaml
flashcards_flagged:
  - "2026-09-26 · #qa-red #tpv · A missing-export TypeError ('fn is not a function') during re-seal is the intended not-yet-built contract, not a wiring gap — check the source before flagging."
```
