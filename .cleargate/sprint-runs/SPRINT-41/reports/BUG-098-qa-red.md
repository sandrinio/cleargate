# BUG-098 — QA-Red report

role: qa

```
QA-RED: WRITTEN
```

## Commit

- cli `story/BUG-098` in `<cw>` (`/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-098/cleargate-cli`), base `contract/S-41-fence` (BUG-090 Developer commit `f31c684`):
  - `2ea4832` — `qa-red(BUG-098): fence reds for the remaining positional frontmatter sites`
- No commit needed in `<ow>` (outer worktree) — BUG-098's QA-Red is TS-tests only; the two live-script twins are Developer/DevOps work, per plans/M5-fixwave.md §BUG-098 "Interface contract with no branch."

## Per-file red/anchor table (solo, `npm run test:file -- <file>`)

| # | File | tests | pass | fail | Reds (reason) | Anchors |
|---|---|---|---|---|---|---|
| 1 | `test/lib/frontmatter-yaml-splice.red.node.test.ts` (new) | 4 | 0 | 4 | H1–H4: `frontmatterYaml is not a function` — missing contract export | — |
| 2 | `test/commands/sprint-frontmatter-fence.red.node.test.ts` (new) | 5 | 0 | 5 | S1/S2: `sprintInitHandler --allow-drift` plants `---\ncontext_source: "lifecycle waiver: … for CR-001"\n---` in front of `<instructions>` (byte-for-byte the measured signature); S3: `stampSprintClose` does the same; S4: `lifecycle_init_mode: block` never blocks (base reads `{}` → warn mode); S5: malformed YAML behind `<instructions>` still gets a phantom planted | — |
| 3 | `test/commands/sprint-archive.node.test.ts` (amend) | 18 | 17 | 1 | S6: archive `stampFile` plants the same phantom on an instructions-led story | 17 pre-existing |
| 4 | `test/lib/lifecycle-reconcile-fence.red.node.test.ts` (new) | 2 | 0 | 2 | L1/L2: `reconcileCurrentSprintStories` (Step 2.6d) throws `No frontmatter in <path>` for an instructions-led Done story | — |
| 5 | `test/commands/gate-unit.node.test.ts` (amend) | 27 | 25 | 2 | R1/R2: `parent-approved` OR-group reads `undefined` behind `<instructions>` on an approved Proposal/Initiative parent → `❌ parent-approved` fires | 25 pre-existing |
| 6 | `test/commands/doctor-fence.red.node.test.ts` (new) | 3 | 1 | 2 | D4: retired `execution_mode:` advisory never fires (offset-0 regex misses the field, so `matchCount` stays 0 and the line is never printed); D5: `runPricing`'s one remaining offset-0 sniff (BUG-090 K2, doctor.ts's last `trimStart().startsWith('---')`) exits 2 "file has no frontmatter" on a readable instructions-led item | D6 (no-frontmatter case) |
| 7 | `test/lib/slug.node.test.ts` (amend) | 14 | 12 | 2 | SL1: instructions-led `PROP-004` is invisible to `nextProposalId` → hands out `PROP-001` (duplicate risk); SL2: `findByRemoteId` returns `null` for an instructions-led `remote_id` | 12 pre-existing |
| 8 | `test/lib/frontmatter-merge.node.test.ts` (amend) | 8 | 7 | 1 | FM1: `mergeFrontmatterConflict` throws `input does not start with ---` on an instructions-led local file | 7 pre-existing |
| 9 | `test/wiki/contradict.node.test.ts` (amend) | 28 | 27 | 1 | C1: `commitPhase4Findings` silently fails to stamp `last_contradict_sha` behind `<instructions>` | 27 pre-existing |
| 10 | `test/wiki/audit-status.node.test.ts` (amend) | 14 | 13 | 1 | W1: `--fix --yes` reports success but leaves the instructions-led status line untouched | 13 pre-existing |
| 11 | `test/lib/intake.node.test.ts` (amend) | 9 | 8 | 1 | I1: R10 WARN fires even though a prior instructions-led remote-authored file exists (`hasAnyRemoteAuthored` scans only the first `\n---`, i.e. the `<instructions>` preamble) | 8 pre-existing |
| 12 | `test/scripts/scripts-fence-bug098.red.node.test.ts` (new, spawns canonical via `canonicalPath()`) | 4 | 2 | 2 | P1: `prep_reporter_context.mjs` prints "no date window available" for an instructions-led plan with real `start_date`/`end_date`; DD1: `dedupe_frontmatter.mjs` reports `0 rewritten, 1 skipped` on an instructions-led duplicate-key file | P2, DD2 (`---`-led twins) |
| 13 | `test/e2e/sprint-allow-drift-fresh-install.red.integration.node.test.ts` (new, integration tier) | 1 | 0 | 1 | Same phantom repro against a REAL `cleargate new sprint`/`cleargate new cr`-scaffolded plan (not a handcrafted fixture) — reproduces the exact measured signature end-to-end | — |

**Default-tier totals: 27 tests touched, 24 red + 3 anchors (D6, P2, DD2) — matches plans/M5-fixwave.md §BUG-098 "Default tier +27: 24 red, 3 anchors" exactly.**
**Integration: +1 red — matches plan.**

## `test/helpers/init-fixture.ts` (item 14)

Appended 2 `SANCTIONED_BASELINE_DELTAS` rows after BUG-090's 5 (`item: 'BUG-098'`, `scenarios: 'all'`, refuse-baseline pattern, mode asserted on both sides by the shared harness):

| rel | baselineHash (pinned, matches the plan's measured M2 literal) |
|---|---|
| `.cleargate/scripts/prep_reporter_context.mjs` | `31d041da56a7187e480a1b7100c0828310f56ff5ed4b29d6fe9c6c7111c45f06` |
| `.cleargate/scripts/dedupe_frontmatter.mjs` | `6bf2816399cad2ab6f8f770de5eb920c3547b6fad9295c81f08aa6a4f894ef21` |

## M2 parity pair (compare mode, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, read-only)

- `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts`: **0/5 pass, 5/5 red.** All 5 scenarios fail at the new `prep_reporter_context.mjs` sanctioned-delta row: `current hash mismatch … (equal to the baseline hash means the delta has not landed or was reverted)` — the baseline hash I pinned is independently confirmed byte-accurate against the real M2 capture, and the row correctly detects "delta not landed." Red by design.
- `test/commands/init-host-parity.red.integration.node.test.ts`: **0/15 pass, 15/15 red.** Same cause, all 3 host-selector variants × 5 scenarios.
- Total: **20/20 parity runs flip red, with no count change** — matches the plan exactly ("Both are red at the red commit on the 5 + 15 M2 parity runs … and green after Dev").

## Typecheck

`npm run typecheck` — clean (no errors) after all 14 file changes.

## Anchors solo-verified green (not part of BUG-098's own delta)

`test/lib/lifecycle-reconcile.node.test.ts` (24/24), `test/lib/close-sprint-backsync.node.test.ts` (11/11), `test/commands/sprint-init-decomp-gate.node.test.ts` (11/11), `test/commands/sprint-sentinel-validation.node.test.ts` (14/14), `test/commands/doctor.node.test.ts` (40/40), `test/commands/doctor-pricing.node.test.ts` (5/5), `test/commands/doctor-session-start.node.test.ts` (22/22), `test/lib/readiness-predicates.node.test.ts` (119/119), `test/lib/frontmatter-locator.red.node.test.ts` (11/11), `test/scripts/test_prep_reporter_context.node.test.ts` (2/2), `test/scripts/dedupe-frontmatter.node.test.ts` (5/5), `test/scripts/no-inline-id-regex.node.test.ts` (7/7), the four BUG-090 fence files — `frontmatter-fence-parity.red` (21/21), `assert-story-files-fence.red` (11/11), `close-sprint-fence.red` (4/4), `template-approved-key.red` (7/7) — and `test/commands/sprint-archive-stamp.integration.node.test.ts` (14/14, named integration run).

**One named exception:** `test/docs/gate-section-index-pinning.node.test.ts` — **13/14** (S1c fails). S1c diffs `CANON` (`<cw>/scaffold/core/.cleargate`, already on contract C4 = BUG-090's Developer commit, so it carries BUG-090's `approved: false` template fix) against `LIVE` (`META_ROOT/.cleargate` = this BUG-098 outer worktree's live mirror, cut from `sprint/S-41` *before* BUG-090's merge, so it does not yet carry that fix). This is the two-repo merge-order artifact rule-15 anticipates ("a failing full-suite test that reads the main checkout's unmerged canonical is expected only if they name it and show why"), not a BUG-098 regression — I touched neither `.cleargate/templates/epic.md` nor any BUG-090 file. It self-resolves once BUG-090 merges to `sprint/S-41` ahead of BUG-098's own integration (per the DAG: BUG-098 upstream = BUG-090).

## Integration-only exclusions

None beyond the one integration file already listed (item 13) and the two named M2 parity files. Per the plan's "Expected pre-merge reds (Rule 15): none in the default tier."

## Statuses

```
git -C <cw> status --porcelain   → (clean, working tree matches commit 2ea4832)
git -C <ow> status --porcelain   → (clean)
git -C /Users/ssuladze/Documents/Dev/ClearGate status --porcelain → 34 lines, all pre-existing
  (the same 30 .cleargate/delivery/pending-sync/* + 4 sprint-run-artifact modifications
  present in the git-status snapshot at dispatch start — not touched by this dispatch)
```

No `<ow>/.cleargate/delivery` back-sync occurred (every run was `npm run test:file`, never a full suite / `run-default-tests.mjs`).

## Script Incidents

None. Every invocation was a direct `npm run test:file -- <path>` / `npm run typecheck` / `npm run prebuild` / `npm run build` inside `<cw>`, per the dispatch's own measurement recipe — no `run_script.sh`-wrapped script was invoked.

```yaml
flashcards_flagged:
  - "2026-09-26 · #frontmatter #qa-red · sprintInitHandler --allow-drift phantom reproduces byte-for-byte on real new-scaffolded templates too."
  - "2026-09-26 · #test-harness #two-repo · A cli worktree on a later contract (C4) legitimately diffs an outer worktree cut pre-merge — name it, don't chase it."
```
