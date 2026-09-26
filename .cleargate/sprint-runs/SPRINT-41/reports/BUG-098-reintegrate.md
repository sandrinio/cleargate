role: developer

# BUG-098: Developer RE-INTEGRATE report (cli main 0399beb, sprint/S-41 667e8bce)

```
STORY: BUG-098
STATUS: done
COMMIT: cli ff29236e685dd94bfa4b37654f733b432bcc9b9f (integrate(BUG-098): re-sync cli main 0399beb; parents 9b2abf0 + 0399beb); outer 2e4d6fe48e944fb3312ac6f83aae087d3057a47f (integrate(BUG-098): re-sync sprint/S-41; parents 0a91f267 + 667e8bce)
TYPECHECK: pass
TESTS: 12 default files 139/139; e2e 1/1; M2 pair 5/5 + 15/15; named 40/40 (gate-section-index-pinning 14, canonical-live-parity 11, wiki-ingest-sprint-report 15); twin anchors 7/7; BUG-090 make-green 43/43; BUG-097 make-green 46/46; STORY-058-11 shared-surface 121/121; rule-16 sweep (23 files) 335/335. 0 fail, 0 skipped anywhere.
FILES_CHANGED: test/helpers/init-fixture.ts (merge resolution only). No src, scaffold, script or sealed-test edits. The 2 outer twins were re-derived and left uncommitted.
```

This was a mechanical re-integration. There was no feature work, and no test file changed except the row-level rebuild of the `init-fixture.ts` tail.

## Where

- `<cw>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-098/cleargate-cli`, `story/BUG-098`: `9b2abf0` → `ff29236`.
- `<ow>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-098`, `story/BUG-098`: `0a91f267` → `2e4d6fe4`.
- Pre-flight `git -C <ow> status --porcelain` showed exactly the 2 twins, as required.
- The cli main checkout stayed on `main` @ `0399beb`, and nothing ran there except read-only `git rev-parse`/`status`. Its untracked `cleargate-0.25.0.tgz` predates this dispatch.
- No action touched the outer main checkout's git state or `.cleargate/delivery/**`, and nothing touched `.worktrees/STORY-058-12`.

## 1. cli merge and conflict resolution

Read-only pre-check:
- `git diff 984e8d5 0399beb -- test/helpers/init-fixture.ts` gave main's side:
  - the STORY-058-11 sentinel post-hash guard (`STORY05810_SENTINEL_POST`);
  - 6 CR-124 delta rows, 1 shared `STORY-058-11+CR-124` enforcement row and 4 STORY-058-11 hook rows, all appended after BUG-090's 5;
  - the new `SanctionedAddition` interface and the `SANCTIONED_BASELINE_ADDITIONS` block after the array close;
  - the additions loop plus `workingStdout` in `captureOrCompare`.
- The merge base was `984e8d5`. Main's 74-file delta and BUG-098's 26-file delta overlap only in `test/helpers/init-fixture.ts`.

`git -C <cw> merge --no-ff main -m "integrate(BUG-098): re-sync cli main 0399beb"`:
- There was one conflict, `test/helpers/init-fixture.ts`, as forecast. It came as two interleaved hunks at the delta-array tail.
- `CHANGELOG.md` auto-merged with only main's 6 lines, since BUG-098 does not touch it. No keep-both edit was needed.
- No src, scaffold or sealed-test file conflicted.

Resolution: I rebuilt the tail from each side's `git show` tip rather than editing the hunks (flashcards `#merge #init-fixture`).
1. Take `git show main:test/helpers/init-fixture.ts` verbatim.
2. Cut BUG-098's own block from `git show 9b2abf0:…`, from its `// ── BUG-098` header to its last `},`. That is 35 lines: the lead comment plus 2 rows.
3. Insert the block after main's last delta row (STORY-058-11 `pre-commit-surface-gate.sh`), before the `]);` that closes `SANCTIONED_BASELINE_DELTAS`. The insertion lands at main line 833.

Independent check:
- `diff main resolved` is a single pure insertion, `832a833,867`.
- Those 35 added lines are byte-identical to the lines BUG-098 added versus the merge base `984e8d5`. BUG-098's side deleted 0 lines.
- No conflict markers remain.

The BUG-098 block's lead comment still reads "appended after BUG-090's". I kept it verbatim, because block text is not re-authored in a mechanical integration. The rows now sit after STORY-058-11's rows, which is the order upstream-first requires.

Resulting `SANCTIONED_BASELINE_DELTAS` order (`init-fixture.ts:514-868`):

| # | item | rel |
|---|---|---|
| 1 | STORY-058-06 | `.cleargate/.install-manifest.json` |
| 2 | STORY-058-07 | `.claude/settings.json` |
| 3-4 | BUG-085 | `.claude/hooks/pending-task-sentinel.sh`, `.cleargate/scripts/validate_state.mjs` |
| 5-7 | STORY-058-10 | `pre-edit-gate.sh`, `stamp-and-gate.sh`, `token-ledger.sh` |
| 8-12 | BUG-090 | `templates/epic.md`, `story.md`, `hotfix.md`, `scripts/assert_story_files.mjs`, `close_sprint.mjs` |
| 13-18 | CR-124 | `architect.md`, `architect-synth.md`, `architect-reader.md`, `sprint-execution/SKILL.md`, `launch_wave.mjs`, `Sprint Plan Template.md` |
| 19 | STORY-058-11+CR-124 | `.cleargate/knowledge/cleargate-enforcement.md` |
| 20-23 | STORY-058-11 | `session-start.sh`, `pre-tool-use-task.sh`, `pre-tool-use-autonomy.sh`, `pre-commit-surface-gate.sh` |
| **24-25** | **BUG-098** | **`.cleargate/scripts/prep_reporter_context.mjs`, `.cleargate/scripts/dedupe_frontmatter.mjs`** |

`SANCTIONED_BASELINE_ADDITIONS` follows at `:918`, unchanged from main: STORY-058-11 `.claude/hooks/lib/harness.sh`.

Delta proof after the commit:
- `git -C <cw> diff 0399beb ff29236 --name-only` is byte-identical (`cmp`) to the pre-integrate `984e8d5..9b2abf0` set: 26 paths, 2018(+)/118(−), the same stat QA recorded. Nothing from CR-124 or STORY-058-11 leaks in.
- The 26 paths are the 12 TPV allow-list src/scaffold files, the 13 QA-Red test files and `init-fixture.ts`. The dispatch's "25-file" count leaves out one; the previous integrate report did the same, while QA's §1 counted 26.
- `git diff 9b2abf0 ff29236` over the 25 non-fixture paths is empty. Every BUG-098 src, scaffold and test byte is unchanged by the re-sync.

I committed only after typecheck and every test set below were green on the integrated pair (rule 12). The merge stayed staged through the test runs.

## 2. Regenerate and build (`<cw>`)

- `node scripts/build-codex-payload.mjs --check`: exit 0, not stale. The prebuild re-runs it, also exit 0.
- `npm run prebuild && npm run build`: exit 0 (log at `/private/tmp/cg-s41-bug098-reint-build.log`). Writes landed only in gitignored `templates/**` and `dist/`.
- `npm run typecheck`: clean, exit 0.
- `node scripts/check-no-inline-id-regex.mjs`: `no inline work-item-id regexes`, exit 0.

## 3. Outer merge and twins (done before the tests so that META_ROOT = `<ow>` reads integrated live mirrors)

- `git -C <ow> merge --no-ff sprint/S-41 -m "integrate(BUG-098): re-sync sprint/S-41"` was clean, with no refusal and no conflict. sprint/S-41 had not touched either twin path since `0a91f267`, so no `checkout --` was needed.
- `git -C <ow> diff sprint/S-41 2e4d6fe4 --name-only` is empty: the committed outer tree equals sprint/S-41.
- I re-derived both twins with `cp` from `<cw>/scaffold/core/.cleargate/scripts/…`.

| Twin (`<ow>/.cleargate/scripts/…`) | `cmp` vs canonical | mode live / canonical (`stat -f %Lp`) | index mode live / canonical | sha256 |
|---|---|---|---|---|
| `prep_reporter_context.mjs` | identical | 644 / 644 | 100644 / 100644 | `6b3cf683…b236a2` |
| `dedupe_frontmatter.mjs` | identical | 755 / 755 | 100755 / 100755 | `831b7c27…933fed` |

The sha256 values match those recorded by the Dev and the Architect post-flight. The modes match QA's correction: prep_reporter is 644, not 755.

**Link witnesses** (from `<ow>`, after the re-derivation):
- `node .cleargate/scripts/prep_reporter_context.mjs` printed `Usage: node prep_reporter_context.mjs <sprint-id>`, exit 2. There was no SyntaxError about `locateFrontmatterFence`.
- `node .cleargate/scripts/dedupe_frontmatter.mjs --dry-run /private/tmp/cg-s41-bug098-reint-empty` printed `Dedupe complete: 0 would-rewrite, 0 skipped, 0 errors.`, exit 0.
  - The dir was freshly made for this run and verified empty (0 entries).
  - It was removed afterwards by exact path with `rmdir`.

## 4. Tests (`<cw>`, each file solo via `npm run test:file -- <f>`, counted with `command grep -aE "^ℹ (tests|pass|fail|skipped) "`)

Per-file logs: `/private/tmp/cg-s41-bug098-reint-logs/`.

| Set | Files | tests / pass / fail / skipped |
|---|---|---|
| BUG-098 12 default files | frontmatter-yaml-splice.red 4, sprint-frontmatter-fence.red 5, sprint-archive 18, lifecycle-reconcile-fence.red 2, gate-unit 30, doctor-fence.red 3, slug 14, frontmatter-merge 8, contradict 28, audit-status 14, intake 9, scripts-fence-bug098.red 4 | **139 / 139 / 0 / 0** |
| e2e | sprint-allow-drift-fresh-install.red.integration | **1 / 1 / 0 / 0** |
| M2 pair (`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, compare only) | claude-adapter-init-parity.red.integration 5, init-host-parity.red.integration 15 | **20 / 20 / 0 / 0** (5/5 + 15/15) |
| Named (build-phase reds from FW-A17 item 4 + S14) | gate-section-index-pinning 14, canonical-live-parity.red.integration 11, wiki-ingest-sprint-report.red 15 | **40 / 40 / 0 / 0** |
| Script-twin anchors | test_prep_reporter_context 2, dedupe-frontmatter 5 | **7 / 7 / 0 / 0** |
| BUG-090 make-green | frontmatter-fence-parity.red 21, assert-story-files-fence.red 11, template-approved-key.red 7, close-sprint-fence.red 4 | **43 / 43 / 0 / 0** |
| BUG-097 make-green | stamp 10, scaffold-lint 10, wiki/query 26 | **46 / 46 / 0 / 0** |
| STORY-058-11 shared-surface | hooks-claude-parity.red.integration 19, portable-skills.red 6, codex-hooks-harness.red (default tier) 90, lifecycle-codex.red 6 | **121 / 121 / 0 / 0** (matches -11's recorded 19/6/90/6) |
| Rule-16 sweep (no override; default META_ROOT = `<ow>`) | 23 files: `command grep -rl CLEARGATE_META_ROOT test` = 24 paths, minus `test/helpers/scaffold-roots.ts` | **335 / 335 / 0 / 0** |

Rule-16 reconciliation:
- 335 = 310 from the previous 21 files, unchanged, plus 15 from `test/docs/codex-enforcement-delta.red.node.test.ts` (added by STORY-058-11 `f4234f2`) plus 10 from `test/docs/contract-first-dag-text.red.node.test.ts` (added by CR-124 `dbd002f`).
- No file dropped out of the sweep.

M2 baseline was not written:
- 425 files.
- The aggregate `find <abs> -type f -exec shasum -a 256 {} + | sort -k2 | shasum -a 256` is `bdc4bb1a…62b2`, which matches DevOps witness 7.
- `find -newer <pre-run marker>` returns nothing.

There were no reds in any set, so there was nothing to halt on.

## 5. Hygiene

- `git -C <ow> status --porcelain` shows exactly the 2 twins (` M .cleargate/scripts/dedupe_frontmatter.mjs`, ` M .cleargate/scripts/prep_reporter_context.mjs`). No test or ingest wrote into `<ow>/.cleargate/delivery/**` or the wiki, so nothing needed reverting. I did not tick or edit any delivery item.
- `git -C <cw> status --porcelain` is empty.
- **Temp-dir count:** `cg-s41-fix-*`/`cg-s41-payload-*` went from 454 to 511 during this dispatch. None of the 57 new dirs is mine.
  - Only `test/helpers/init-fixture.ts` creates them.
  - Their mtimes cluster at 23:32:04–05 and 23:32:48–54. My runs at those moments were slug/frontmatter-merge and the BUG-090 script files, and none of those imports `init-fixture`.
  - My own init-fixture users (e2e and M2 at 23:32:11–22; portable-skills and lifecycle-codex at 23:33:25–31) created no surviving dir.
  - They come from a concurrent lane, so I did not remove them.

## 6. Expected DevOps full suite

**3486 + 27 = 3513 tests / 3511 pass / 0 fail / 2 skipped**, the previous merge's total (STORY-058-11, `667e8bce`: 3486/3484/0/2) plus BUG-098's default-tier delta.
- Measured delta: a static count of `test(`/`it(` in the 12 default files gives 107 at `0399beb` and 134 at `ff29236`, so +27.
  - 5 new red files add 18.
  - 7 existing files gain 9: sprint-archive +1, gate-unit +2, slug +2, frontmatter-merge +1, contradict +1, audit-status +1, intake +1.
- The static count undercounts `contradict` by 5 loop-generated tests: 23 static against 28 measured. Those tests exist on both sides, so the delta is unaffected.
- `npm test` excludes `*.integration.node.test.ts` (package.json `test` script), so the e2e +1 is not counted.
- This matches FW-A17 item 7, so there is no deviation.

## Script Incidents

None. No `.cleargate/scripts/*` invocation needed `run_script.sh`. The two link-witness smokes are direct `node <script>` calls, as the dispatch specifies and as in the previous integrate.

```yaml
r_coverage: []
plan_deviations:
  - { what: "Outer merge + twin re-derivation done before the step-3 test sets, and the cli merge committed after them", why: "The tests read META_ROOT = <ow>, so testing before the outer merge would red two-repo-lag parity tests, and rule 12 requires green tests before a cli commit. The previous integrate used the same order", orchestrator_confirmed: false }
adjacent_files:
  - "cleargate-cli/test/helpers/init-fixture.ts"
  - "cleargate-cli/test/hosts/claude-adapter-init-parity.red.integration.node.test.ts"
  - "cleargate-cli/test/commands/init-host-parity.red.integration.node.test.ts"
flashcards_flagged:
  - "2026-09-26 · #test-harness #shell · /bin/bash is 3.2 on macOS: no mapfile; build file-list arrays with a while IFS= read -r loop."
```
