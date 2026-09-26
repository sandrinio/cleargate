# BUG-098 TPV report (live)

role: architect

```
TPV: REJECTED
RESEAL_PATCH: reports/BUG-098-tpv-reseal.patch
RESEAL_SHA256: 6485674b31cc0b38c4ba588651562bcc4f76c30540020f005391128f8e5eed4e
RESEAL_SCOPE: 12 test files; applies cleanly on cli 2ea4832 (git apply --check, index-only and read-only on <cw>); no src/scaffold/script/template change
PLAN_AMENDMENT: plans/M5-fixwave.md "## FW-A17 — BUG-098 TPV" (append-only, +55 lines)
COUNTS_AFTER_RESEAL: default +27 (24 red + 3 anchors D6, P2, DD2), integration +1, parity 20 runs flip; D4 = previous total + 27 (unchanged)
```

## Verdict in one paragraph

The sealed commit is wired correctly. All 13 entry points use the right seam, all 24 reds fail for the right reason, the 3 anchors hold, the delta rows refuse the baseline, and a build that follows the plan turns everything green. The reds do not pin what the plan says they pin, though. 15 of the 28 mutants survive.

Two survivors do real damage:
- **K3m.** A `dedupe_frontmatter.mjs` rebuild that drops the final EOL glues the closing fence onto the last YAML line (`status: Triaged---`) and still passes DD1.
- **H1m.** A `contradict` writer that inserts a blank line after the closer passes C1.

Whole-file scans and first-`---`-anywhere scans (private re-implementations of the locator) survive at every reader.

Separately, the TPV found a **plan-level defect**. The pinned `sprint.ts` shape converts a locator throw into `null`, and its `!span` branch then plants a phantom block in front of `<instructions>` on malformed framing. I measured this for both the waiver write and `stampSprintClose`.

The re-seal kills all 30 mutants. FW-A17 amends the change shape: on `framingError`, nothing is written.

## Reproduced counts

All runs were solo `npm run test:file`, in the scratch clone `/private/tmp/cg-s41-tpv098-37a296/cleargate-cli`. It is nested in an archive of `<ow>`@73252918 so that `<cli>/..` reads match `<cw>`.

| Tree | Default-tier BUG-098 files (12) | e2e | M2 parity (`CLEARGATE_INIT_BASELINE`) |
|---|---|---|---|
| 2ea4832, sealed tests | 24 red + 3 anchors green, the same per-file table as the QA-Red report (4/5/1/2/2/2/2/1/1/1/1/2) | 0/1, preamble assert (phantom) | 0/5 + 0/15, all at the `prep_reporter_context.mjs` row "delta not landed" |
| 2ea4832 + plan-as-pinned build (v1) | 24/24 green, anchors green | 1/1 | 5/5 + 15/15 |
| 2ea4832 + re-seal, base src | 24 red + 3 anchors green, same per-file counts (4,5,18,2,27,3,14,8,28,14,9,4 tests); every red for the right reason (below) | 0/1 | not re-run (tests unchanged) |
| re-seal + FW-A17 build (v2) | 24/24 green | 1/1 | 5/5 + 15/15 |
| re-seal + v1 build | S3 and S5 red (the malformed-framing halves). All other reds green | n/a | n/a |

**Red reasons at base after the re-seal.** Each red was checked by its assertion text:
- H1–H4: `frontmatterYaml is not a function`.
- S1, S2, S3: preamble changed (phantom). S4: "unreconciled artifacts found" and warn-mode proceed. S5: file rewritten.
- S6: preamble changed.
- L1, L2: `No frontmatter in`.
- R1, R2: `❌ parent-approved` present.
- D4: advisory absent. D5: "file has no frontmatter".
- SL1: base returned PROP-001. SL2: base returned null.
- FM1: throws.
- C1: stamp absent.
- W1: status not fixed.
- I1: WARN present.
- P1: "no date window available". DD1: "0 rewritten, 1 skipped".

**Typecheck:** clean on v1 and v2. `node scripts/check-no-inline-id-regex.mjs` is clean on v2.

## Per-check evidence

### Check 1: seams, reds going green, mutants

Every entry point was exercised through its seam, and each seam was verified against source:

| # | Entry point | Seam | Verified |
|---|---|---|---|
| 1 | `frontmatterYaml` / `withFrontmatterYaml` | dynamic import | `src/lib/frontmatter-locator.ts` (the exports are missing at base) |
| 2 | `sprintInitHandler(opts, cli)` | `cwd`, `gitRunner` (the `sha\0subject\0body\0---COMMIT---\n` format of `lifecycle-reconcile.node.test.ts:183-192`), `spawnFn` stub, throwing `exit` | `sprint.ts:276-535`. Drift fires at base. With no `.active`, the `code 0` dashboard path is inert (`writeDashboardSnapshot` returns null, `dashboard/snapshot.ts:36-41`) |
| 3 | `stampSprintClose(path, now)` | direct call | `sprint.ts:823-848` |
| 4 | `sprintArchiveHandler` | existing `buildFixture` plus the `spawnFn` mock | `sprint.ts:877-1160`. The outer try swallows `exit:N` |
| 5 | `reconcileCurrentSprintStories` | `deliveryRoot`/`sprintRunsRoot` fixture roots and `state.json` Done | `lifecycle-reconcile.ts:880-930`. `readArtifactStatus` is already located (`:220-235`) |
| 6 | `gateCheckHandler` | `gatesDocPath`, `cwd`, `OR_GROUP_GATES_DOC` | parent resolved relative to the citer (`readiness-predicates.ts:420-430`) |
| 7 | `doctorHandler` | throwing `exit` | `doctor.ts:251-278` |
| 8 | `runPricing` | direct call | `doctor.ts:858-900` |
| 9 | `nextProposalId` / `findByRemoteId` | direct call | `slug.ts:56-169` |
| 10 | `mergeFrontmatterConflict` | direct call | `frontmatter-merge.ts:91-100` |
| 11 | `commitPhase4Findings` | opts | `contradict.ts:480-516` |
| 12 | `wikiAuditStatusHandler` | `fix`/`yes`/`isTTY: false` through `runAudit` | `wiki-audit-status.ts:240-270` |
| 13 | `runIntakeBranch` | mock MCP | `intake.ts:238-275` |

The script spawns and the e2e are covered in check 2 and in the counts above.

**Mutant results.** 28 mutants ran against the sealed tests, plus 2 more after the re-seal. Each ran on top of the v1 or v2 build, and each test file ran solo.

| Mutant | Description | Sealed tests | Re-sealed tests |
|---|---|---|---|
| A1 | `withFrontmatterYaml` adds an EOL after `---` | killed (H1–H3, L1, audit S4) | killed (also S1, S2, S6, C1) |
| A2 | `withFrontmatterYaml` always writes LF | killed (H2, S2, L2) | killed |
| A3 | `frontmatterYaml` keeps the trailing EOL | killed (H1, H2, L1) | killed |
| A4 | no EOL normalization inside `withFrontmatterYaml` | killed (L2 only) | killed (S2, L2) |
| B2 | first-`---`-anywhere scan in `parseFileFrontmatter` | **survived** | killed (S1–S5, S6) |
| B3 | malformed YAML falls back to `serializeFileContent` | killed (S5) | killed |
| B4 | malformed YAML overwritten in the span | killed (S5) | killed |
| B5 | preamble kept, body separator re-normalized | killed by the S2 CRLF case only (LF survives) | killed (S2, S3, S6) |
| B6 | `didChange: true` on a no-op | not tested | killed (S3 half 2) |
| B7a | `stampFile` left positional | killed (S6) | killed |
| B8 | FW-A17 `framingError` guard absent (= plan v1) | not tested | killed (S3, S5 halves 2) |
| C1m | `m`-flag first-fence regex in `setFrontmatterFieldAtomic` | killed by L2 only (L1 survives) | killed (L1, L2) |
| D1m | first-`---`-anywhere scan in `readFrontmatterFromFile` | **survived** | killed (R1, R2) |
| D2m | whole-file line parse in `readFrontmatterFromFile` | **survived** | killed (R1, R2) |
| E1m | `/^execution_mode:/m.test(raw)` | **survived** | killed (D4) |
| E2m | `runPricing` sniff deleted | killed (D6) | killed |
| E3m | locator throw mapped to "no frontmatter" | **survived** | killed (D5) |
| G1m | `extractFrontmatterBlock` returns `raw` | **survived** | killed (SL1, SL2) |
| G2m | first-`---`-anywhere scan in `slug.ts` | **survived** | killed (SL1, SL2) |
| H1m | `contradict` writer inserts a blank line after the closer | **survived** | killed (C1) |
| H2m | first-`---`-anywhere scan in `contradict` | **survived** | killed (C1) |
| I1m | audit-status writer inserts a blank line | killed (existing Scenario 4 only) | killed (W1 too) |
| I2m | audit-status replaces the first `status:` in the whole file | **survived** | killed (W1) |
| J1m | `intake` whole-file `source:` scan | **survived** | killed (I1 half 2) |
| K1m | `prep_reporter` whole-file field loop (last wins) | **survived** | killed (P1, P2) |
| K2m | `prep_reporter` `m`-flag first-fence regex | **survived** | killed (P1) |
| K3m | `dedupe` rebuild drops the final EOL (closer glued) | **survived** | killed (DD1, DD2) |
| K4m | `dedupe` first-`---`-anywhere scan | **survived** | killed (DD1) |
| R-a | delta row: `dedupe_frontmatter.mjs` not landed | killed (5/5 red, "dedupe … delta not landed") | not re-run |
| R-b | delta row: `dedupe_frontmatter.mjs` exec bit dropped | killed (5/5 red, "mode mismatch") | not re-run |

**Totals.**
- Sealed: 28 tried, 13 killed, 15 survived.
- Re-seal: 30 tried, 30 killed, 0 survived.
- A behavioural test cannot tell a full private copy of the locator from the shared one. FW-A17 K1/K2 cover that at post-flight. K2's grep hits all 13 sites at 2ea4832, and on v2 it hits only the pre-existing doc comment at `frontmatter-locator.ts:8`.

**Plan-level defect (the FW-A17 item 2 amendment).** I probed an instructions-led sprint plan with an unterminated header, and a second one with an unterminated `<instructions>` block. On v1, as pinned, both the `--allow-drift` waiver and `stampSprintClose` wrote `---\ncontext_source: "lifecycle waiver: …"\n---\n\n<instructions>…` and `---\nstatus: Completed…`, which is a phantom block. On v2 both are byte-identical and `didChange` is false.

### Check 2: the two scripts

- The reds spawn **canonical** through `canonicalPath()` with `process.execPath`. `prep_reporter` gets the env seams `CLEARGATE_SPRINT_DIR` and `CLEARGATE_PENDING_SYNC_DIR` (tmp); `dedupe` gets the dir argument.
- Canonical `assert_story_files.mjs` at C4 exports `locateFrontmatterFence`, so the v1/v2 imports link.
- `prep_reporter` writes only `<sprintDir>/.reporter-context.md` (`:516`). Its `execSync` calls are read-only `git log` and `count_tokens`.
- `dedupe_frontmatter.mjs` stayed 755 through in-place edits. Delta row R-b proves the mode is asserted.
- **Build-phase finding (FW-A17 item 3).**
  - `<ow>`'s live `assert_story_files.mjs` lacks the export: `sprint/S-41` and `<ow>` both grep 0, while `.worktrees/BUG-090` greps 1.
  - Twins copied into the scratch outer that mirrors `<ow>` turn `test_prep_reporter_context` 0/2 and `dedupe-frontmatter` 1/5 red (ESM link).
  - Without twins, both stay green: 2/2 and 5/5.
  - With the BUG-090 and BUG-098 twins both present (the simulated integration), both are green, and `canonical-live-parity` is 11/11.

### Check 3: delta rows and the integration merge

- **Row shape.** Both rows follow the refuse-baseline pattern: `currentHash` returns a `<… delta not landed …>` sentinel when canonical equals the baseline. Both baseline literals are byte-accurate: the compare-mode baseline assert passes on v1/v2 against `/private/tmp/cg-s41-m2-init-baseline`, which I only read. The rows are appended at the tail after BUG-090's 5 rows (numstat 35/0, and BUG-090's rows are byte-intact).
- **int-A** = BUG-098 sim merged with `d4d6d93` plus story/BUG-090 `2e63854`. This is the planned order.
  - The merge is clean and automatic.
  - Tail order: -10 ×3, BUG-090 ×5, BUG-098 ×2.
  - Make-green 12 files green. gate-unit is 30/30, because BUG-097 adds 3.
  - `init-fixture-cleanup.red` 3/3, e2e 1/1, parity 5/5 + 15/15, `sprint-init-fresh-install` 2/2, `sprint-archive-stamp` 14/14, `canonical-live-parity` 11/11.
  - `runInitScenario` leaks are self-cleaned, because BUG-096 is merged.
- **int-B** = int-A's future main plus story/CR-124 `430424a`, merged before BUG-098.
  - BUG-098's merge hits a pure append/append tail conflict.
  - Resolution per rule 21: main rows first (…BUG-090 ×5, CR-124 ×6, the shared STORY-058-11+CR-124 row), then BUG-098's 35-line block, cut from `  // ── BUG-098` through its last `  },`. That gives 21 rows.
  - Parity 5/5 + 15/15.
  - Extracting the block with a prefix/suffix diff shifted the boundary at a shared `},` line and caused a parse error. Take the block by its header comment.
- The BUG-090 × CR-124 merge (fm-B) also conflicts at the tail. That is the second-merging item's integration, under the same rule.

### Check 4: counts

- **Default tier +27.** New files: splice 4, sprint-fence 5, lifecycle-fence 2, doctor-fence 3, scripts 4, for 18. Amended files: archive +1, gate-unit +2, slug +2, merge +1, contradict +1, audit +1, intake +1, for 9. Total 27.
- **Reds and anchors.** 4 + 5 + 2 + 2 + 2 = 15 reds in the new files, plus 9 in the amended files, gives 24. The anchors are D6, P2 and DD2, for 27.
- The re-seal changes no count. It folds its additions into existing tests (S3, S5, D4, D5, I1, SL2).
- Integration +1 (the e2e).
- Parity flips 0/5 + 0/15 at the red commit and returns to 5/5 + 15/15 on the conformant build.
- **D4** = previous merge total + 27. `npm test` excludes `*.integration.node.test.ts`, so the e2e and parity are not in D4.

### Check 5: no foreign sealed test edited, no cross-item regression

- **Overlap with sealed files.** The BUG-098 QA-Red commit and the re-seal each overlap the BUG-090 sealed set (`d0f0d95..93e48dc`) and the -09/-10 sealed sets only at `test/helpers/init-fixture.ts`, and only by pure appends (35/0). The re-seal edits only BUG-098's own additions inside the amended files.
- **Sweep on int-A.** 81 default-tier files ran solo. They are every file that imports a touched module (sprint, lifecycle-reconcile, readiness-predicates, doctor, frontmatter-merge, slug, contradict, wiki-audit-status, intake, frontmatter-locator, gate, push/pull/sync, wiki-ingest) or references the two scripts, plus every `dist/cli.js` spawner, run after building dist in scratch.
  - Result: 1070 tests, 1068 pass, 1 fail, 1 skip.
  - The fail is `test/cr076-package-trim.node.test.ts` #5, "Expected at least one root templates/cleargate-planning entry in npm pack --dry-run output".
  - It fails identically on fm-A without BUG-098. It is a scratch-clone environment artifact, not BUG-098's.
- **Rule 16.** 21 `CLEARGATE_META_ROOT` files ran one at a time with `CLEARGATE_META_ROOT=<ow>` against the build-phase build (C4 + re-seal + v2). 310/310 pass. `git -C <ow> status --porcelain` was empty before and after.
- **dist-dependent anchors** (after building dist in scratch): `doctor-retired-field.red` 3/3 and `close-sprint-backsync` 11/11. Before the build they read "Built CLI not found" and 5 failures, which is environment only.

### Check 6: S1c 13/14 is a two-repo merge-order artifact (confirmed)

- With the scratch outer's templates at `<ow>` HEAD, S1c fails: "templates/epic.md differs between live and canonical". The diff is BUG-090's `approved: false` at epic `:44` and hotfix `:36`.
- With BUG-090's twins copied, S1c is 14/14.
- BUG-098 touches no template.
- `canonical-live-parity` 5a (integration tier) is red in the build phase for the same reason.

### Check 7: collision with STORY-058-11

- The -11 branch (`d0f0d95..635816c`) and `reports/STORY-058-11-tpv-reseal.patch` touch 16 and 27 test paths. None is `sprint-archive`, `gate-unit`, `slug`, `frontmatter-merge`, `contradict`, `audit-status` or `intake`. The only shared file is `test/helpers/init-fixture.ts`.
- **Forecast** from `git merge-tree` of 635816c over int-A and over int-B:
  - One content conflict in `init-fixture.ts`: 3 interleaved tail hunks (BUG-090/BUG-098 rows against -11's rows).
  - -11's other `init-fixture` regions merge automatically: `bug085SentinelCurrentHash` near `:470`, and the `captureOrCompare` added-file extension.
  - Resolution at -11's integration: rebuild the tail as main's rows (…BUG-090, CR-124 if merged, BUG-098), then -11's rows. Delete the identical shared STORY-058-11+CR-124 row if CR-124 already merged (rule 21).
  - BUG-098's rows are plain changed-file rows, so -11's added-file extension does not reach them.

## Satisfiability

Every re-sealed red is satisfiable by the FW-A17-amended shape, as measured on v2: all 12 files, the e2e and the parity pair green, plus the full anchor list and the sweeps above. The plan-as-pinned shape (v1) fails exactly the two malformed-framing halves (S3, S5). The amendment is therefore required, not optional.

## Integration forecast

- **Outer.** BUG-090's outer merge must land first, so that `assert_story_files.mjs` is live with the export. BUG-098's twins are then derived at integration, not at build.
- **cli.** int-A is clean. If CR-124 merges first (int-B), the tail conflict is mechanical: main rows, then BUG-098's 2 rows.
- **STORY-058-11** follows with a mechanical tail rebuild. No test file overlaps beyond `init-fixture.ts`.

## Developer brief

- **Start from** cli `story/BUG-098` after the orchestrator applies the re-seal patch on `2ea4832` (verify sha256 `6485674b…ed4e`, `git apply --check`, and that the staged list equals the 12 test paths).
- **File allow-list** (12; no test file; no outer file during the build):
  - `src/lib/frontmatter-locator.ts`
  - `src/commands/sprint.ts`
  - `src/lib/lifecycle-reconcile.ts`
  - `src/lib/readiness-predicates.ts`
  - `src/commands/doctor.ts`
  - `src/lib/frontmatter-merge.ts`
  - `src/lib/slug.ts`
  - `src/lib/wiki/contradict.ts`
  - `src/commands/wiki-audit-status.ts`
  - `src/lib/intake.ts`
  - `scaffold/core/.cleargate/scripts/prep_reporter_context.mjs`
  - `scaffold/core/.cleargate/scripts/dedupe_frontmatter.mjs`
- **Pinned helpers,** added to `src/lib/frontmatter-locator.ts` verbatim from M5-fixwave "Change shape (pinned)":
  - `export function frontmatterYaml(raw: string, span: FrontmatterSpan): string`
  - `export function withFrontmatterYaml(raw: string, span: FrontmatterSpan, yamlText: string): string`
  - Every TS writer goes through `withFrontmatterYaml`.
- **`sprint.ts`, per plan plus FW-A17 item 2:**
  - `parseFileFrontmatter(raw)` returns `{ fm, body, span, parseOk, framingError }`. A locator throw gives `framingError: true`.
  - `rewriteFrontmatter(raw, parsed, fm)`:
    - `framingError` → `raw`
    - `span && parseOk` → `withFrontmatterYaml(raw, span, dumpFrontmatterYaml(fm))`
    - `span && !parseOk` → `raw`
    - `!span` → `serializeFileContent(fm, parsed.body)`
  - `stampSprintClose` skips the write and reports `didChange: false` when the result equals `previousContent`.
- **Other sites:** exactly per M5-fixwave "Remaining readers and writers". In `doctor.ts`, also remove the two consecutive blank lines BUG-090 left at `:771-772` and `:1054-1055` (BUG-090 post-flight follow-up 3).
- **Scripts:** add `import { locateFrontmatterFence } from './assert_story_files.mjs';` and use the pinned span logic. `dedupe` stays mode 755.
- **Make-green set** (solo, from `<cw>`, after `(cd <cw> && npm run prebuild && npm run build)`):
  - the 12 default files of BUG-098 §5: 4/4, 5/5, 18/18, 2/2, 27/27, 3/3, 14/14, 8/8, 28/28, 14/14, 9/9, 4/4;
  - `test/e2e/sprint-allow-drift-fresh-install.red.integration.node.test.ts` 1/1;
  - `claude-adapter-init-parity` 5/5 and `init-host-parity` 15/15 with `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`.
- **Anchors** are the M5-fixwave list. `doctor-retired-field.red` and `close-sprint-backsync` need the worktree dist.
- **Named build-phase reds:** only `gate-section-index-pinning` S1c (13/14) and `canonical-live-parity` 5a (integration tier). Both come from BUG-090's templates and clear at integration.
- **Rule 16:** run the 21-file list without an override (the default META_ROOT is `<ow>`).
- **Leak hygiene:** C4 is pre-BUG-096. Every `runInitScenario` run (the e2e and the parity pair) leaks `/tmp/cg-s41-fix-*` and `/tmp/cg-s41-payload-*`. Snapshot `/tmp` before each run and remove only the new dirs.
- **Twins at integration only:** after `git merge --no-ff sprint/S-41` in `<ow>`, `cp` both scripts from the integrated canonical, then `cmp` both. `stat -f %Lp` on dedupe must read 755. Commit both in the one outer commit, then re-run `test_prep_reporter_context` 2/2 and `dedupe-frontmatter` 5/5.
- **Gates:** `npm run typecheck` clean. `node scripts/check-no-inline-id-regex.mjs` clean. FW-A17 K1–K6 are self-checks before the report.
- **DevOps D4:** previous merge total + 27.

## Script Incidents

None. No `run_script.sh`-wrapped script was invoked. Everything ran in `/private/tmp/cg-s41-tpv098-37a296`: solo `npm run test:file`, `npm run prebuild/build/typecheck`, `git merge`/`merge-tree`, and `tsx` probes. I deleted that directory at the end.
- The real `<cw>` saw only read-only `git apply --check`, `git status` and `git diff`. `<ow>` saw only reads and the `CLEARGATE_META_ROOT` reads; its status was clean before and after.
- My pre-BUG-096 runs leaked init-fixture dirs. I removed exactly the ones carrying the C4 `assert_story_files.mjs` hash `8764961f…755a`: 87 plus later snapshot-diff removals. Dirs from other lanes, with other hashes, were left alone.
- Files written: this report, `reports/BUG-098-tpv-reseal.patch`, and the FW-A17 append to `plans/M5-fixwave.md`.

```yaml
flashcards_flagged:
  - "2026-09-26 · #frontmatter #locator #danger · A locator THROW is malformed framing, not 'no frontmatter': a !span writer fallback still plants a phantom."
  - "2026-09-26 · #two-repo #scripts #esm · A live twin importing a contract export won't link in an outer wt cut pre-contract-merge; copy twins at integration."
  - "2026-09-26 · #tpv #test-harness · A tail-of-length-N 'bytes after closer' check misses inserted bytes; compare raw.slice(span.end) on both sides."
  - "2026-09-26 · #tpv #test-harness · A whole-file-scan mutant is more permissive: only an expect-false case (key only in <instructions>) kills it."
  - "2026-09-26 · #test-harness #gate · CR-030 γ fixtures' 'No TBDs here.' contains TBD, so no-tbds always fails there; exit code is no pass signal."
  - "2026-09-26 · #test-harness #init #merge · Cut an item's delta rows by its '// ── ID' header to its last '},'; prefix/suffix diffs shift at shared '},'."
```
