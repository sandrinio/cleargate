# BUG-098 — Developer INTEGRATE report

role: developer

```
STORY: BUG-098
STATUS: done
COMMIT: cli 9b2abf0ac30e54e55ad96743c4c4c7081cbe68ef (integrate(BUG-098): merge cli main 984e8d5); outer 0a91f2672e982544459f64d6f043707328466078 (integrate(BUG-098): merge sprint/S-41)
TYPECHECK: pass
TESTS: 12 default files 139/139 (gate-unit now 30/30 with BUG-097) + e2e 1/1 + M2 pair 5/5+15/15; named reds now GREEN: gate-section-index-pinning 14/14, canonical-live-parity 11/11 (integration), wiki-ingest-sprint-report.red 15/15; script-twin anchors 2/2+5/5; BUG-090 make-green 43/43; BUG-097 make-green 46/46; rule-16 21-file sweep 310/310
FILES_CHANGED: none (mechanical integrate only — two merge commits, no new src/test edits); outer twins re-derived and left uncommitted per protocol; BUG-098 item file Task Breakdown rows ticked (uncommitted, rides with the twins into DevOps's one outer commit per FW-A17 item 3/item 6)
```

Mechanical integration only. No new feature work, no test-file edits, no src edits beyond what the merges brought in.

## Where

- cli worktree `<cw>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-098/cleargate-cli`, branch `story/BUG-098`. Pre-integrate HEAD `9970c10` (Dev, re-seal `ca18c73`, base C4 `f31c684`). Post-integrate HEAD `9b2abf0`.
- outer worktree `<ow>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-098`, branch `story/BUG-098`. Pre-integrate HEAD `73252918` (BUG-090 dev report commit). Post-integrate HEAD `0a91f267`.
- cli main checkout stayed on `main` @ `984e8d5` throughout (BUG-090 merged, includes C4/`f31c684`). Never edited, tested or built beyond read-only `git log`/`diff`/`rev-parse`.

## 1. cli merge

`git -C <cw> merge --no-ff main -m "integrate(BUG-098): merge cli main 984e8d5"` — **clean, no conflicts.** `git merge` reported "Auto-merging test/commands/gate-unit.node.test.ts" and "Auto-merging test/helpers/init-fixture.ts", both resolved with no conflict markers. This matched the TPV's forecast exactly: BUG-098's 2 `SANCTIONED_BASELINE_DELTAS` rows append after BUG-090's 5 at the tail of `init-fixture.ts`, and main's only change to that file since BUG-098's base (`f31c684`) is BUG-096's disjoint `mkShortTmpDir`/`TRACKED_TMP_DIRS` region (lines 62-90ish) — verified read-only before merging (`git diff f31c684 984e8d5 -- test/helpers/init-fixture.ts` showed only the BUG-096 hunk).

`git -C <cw> diff 984e8d5 HEAD --name-only` confirms the merge commit's own delta is exactly BUG-098's 25 files (12 src/scaffold + 13 test files, the full allow-list from `reports/BUG-098-dev.md` plus its test files) — nothing from CR-124/STORY-058-11 leaked in (neither has merged to cli `main` yet at `984e8d5`).

`CHANGELOG.md` had no diff on either side of the merge-base in this range — no keep-both resolution needed.

## 2. Conflicts

None. No `*.red.*` test conflict, no sanctioned-row conflict, no owner-file/insertion conflict. Nothing routed to QA-Red.

## 3. Regenerate / build

- `node scripts/build-codex-payload.mjs --check` → exit 0 (not stale).
- `(npm run prebuild && npm run build)` in `<cw>` → exit 0 (`/private/tmp/bug098-int-build.log`): ESM + CJS + DTS build success. Writes landed only in `<cw>/templates/**` and `<cw>/dist/` (gitignored).
- `npm run typecheck` → clean (`tsc --noEmit`, exit 0).
- `node scripts/check-no-inline-id-regex.mjs` → `no inline work-item-id regexes`, exit 0.

## 4. Outer twins (re-derived at integration, never merged)

Per FW-A17 item 3 / BUG-098-dev.md "Integration hand-off": the Developer's build phase touched no outer file (the pre-merge `<ow>` had no `locateFrontmatterFence` export in its live `assert_story_files.mjs`, so a twin copy there would fail ESM link — measured in the TPV). Twins are made here, at integration, after the outer merge brings BUG-090's live pair.

1. `git -C <ow> merge --no-ff sprint/S-41 -m "integrate(BUG-098): merge sprint/S-41"` — **clean, no conflicts.** Brought in 74 files: FLASHCARD.md, BUG-090's live `assert_story_files.mjs`/`close_sprint.mjs`/templates, item-file amendments (BUG-090/096/097/098, SPRINT-41, CR-124, STORY-058-11), `.processed-*` sentinels, and the M5/M5-fixwave plan appends plus reports from concurrent lanes (BUG-090, BUG-096, BUG-097, CR-124, STORY-058-11).
2. `cp` each of the 2 canonical scripts from `<cw>/scaffold/core/.cleargate/scripts/{prep_reporter_context.mjs,dedupe_frontmatter.mjs}` into `<ow>/.cleargate/scripts/`.
3. `cmp` — both identical.
4. `stat -f %Lp` on both — 755 (mode preserved by `cp`; no chmod needed).

| Twin (`<ow>/…`) | cmp vs `<cw>/scaffold/core/.cleargate/scripts/…` | mode |
|---|---|---|
| `.cleargate/scripts/prep_reporter_context.mjs` | identical | 755 (was 644 pre-copy on the canonical side too — actually both files are 755; see note below) |
| `.cleargate/scripts/dedupe_frontmatter.mjs` | identical | 755 |

Note: both scripts are mode 755 in this wave (`prep_reporter_context.mjs` picked up 755 alongside `dedupe_frontmatter.mjs`'s pinned 755 — both sides match, which is all the M2 delta rows require: "mode on both sides" equal).

**Link witnesses** (post re-derivation):
- `(cd <ow> && node .cleargate/scripts/prep_reporter_context.mjs)` → `Usage: node prep_reporter_context.mjs <sprint-id>`, exit 2. **Not** a SyntaxError about `locateFrontmatterFence`.
- `(cd <ow> && node .cleargate/scripts/dedupe_frontmatter.mjs --dry-run /private/tmp/cg-s41-bug098-int-empty)` (fresh empty dir) → `Dedupe complete: 0 would-rewrite, 0 skipped, 0 errors.`, exit 0.

Left **uncommitted** per protocol (dispatch instruction: "Leave both twins UNCOMMITTED (the merge lane makes the one outer commit)") — the merge lane (DevOps) commits the twins in one outer commit alongside the item-file Task Breakdown tick.

## 5. Full re-verification (solo, in `<cw>`)

| Check | Expected | Actual |
|---|---|---|
| 12 BUG-098 §5 default files (batched) | 139/139 (gate-unit 30/30 with BUG-097's +3) | **139/139, 0 fail** |
| `test/e2e/sprint-allow-drift-fresh-install.red.integration.node.test.ts` | 1/1 | **1/1** |
| M2 pair (`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, compare mode): `claude-adapter-init-parity` + `init-host-parity` | 5/5 + 15/15 | **20/20 (5+15)** |
| `test/docs/gate-section-index-pinning.node.test.ts` | 14/14 (was named-red 13/14 pre-integration) | **14/14** |
| `test/scaffold/canonical-live-parity.red.integration.node.test.ts` | 11/11 (was named-red 5a pre-integration) | **11/11** |
| `test/wiki/wiki-ingest-sprint-report.red.node.test.ts` | 15/15 (was named-red 14/15 pre-integration, S14) | **15/15** |
| `test/scripts/test_prep_reporter_context.node.test.ts` + `test/scripts/dedupe-frontmatter.node.test.ts` | 2/2 + 5/5 | **7/7 (2+5)** |
| BUG-090 make-green: `frontmatter-fence-parity` 21/21, `assert-story-files-fence` 11/11, `template-approved-key`, `close-sprint-fence` | — | **43/43 (21+11+7+4)** |
| BUG-097 make-green: `stamp.node`, `scaffold-lint.node`, `wiki/query.node` | — | **46/46 (10+10+26)** |
| 21 rule-16 `CLEARGATE_META_ROOT` files, no override (default META_ROOT = `<ow>`) | — | **310/310** (matches the pre-integration Dev report's rule-16 count exactly) |
| `npm run typecheck` | clean | clean |
| `node scripts/build-codex-payload.mjs --check` | exit 0 | exit 0 |

All named build-phase reds from FW-A17 item 4 (`gate-section-index-pinning` S1c, `canonical-live-parity` 5a) and the extra one the Dev report surfaced (`wiki-ingest-sprint-report` S14) are confirmed GREEN on the integrated tree, exactly as forecast.

## Leak hygiene

Per M5-fixwave / BUG-098-dev.md: main now carries BUG-096's `test/helpers/init-fixture.ts` cleanup fix, so `runInitScenario` (invoked by the e2e test and the M2 parity pair) should no longer leak.

```
before: ls -d /tmp/cg-s41-fix-* /tmp/cg-s41-payload-* 2>/dev/null | wc -l   → 367
after  (post 12-default + e2e + M2-pair + all named/anchor/rule-16 runs):  → 367
```

Zero new leaked dirs. No cleanup needed. (The 367 pre-existing dirs predate this dispatch — from earlier lanes' pre-BUG-096 runs — and are out of scope here; not removed, per "remove only dirs your runs created.")

No test in this dispatch's required list runs `push-hierarchy.node.test.ts` or otherwise invokes the live `backfill_hierarchy.mjs`, so the rule-14/rule-16 pending-sync revert step did not apply. `git -C <ow> diff --name-only` under `.cleargate/delivery/pending-sync/` shows only `BUG-098_remaining_positional_frontmatter_sites.md` (the item's own Task Breakdown tick, done deliberately — not a backfill artifact).

## Task Breakdown

Per FW-A17 item 6 ("At integration, tick the Task Breakdown rows of the item file... The build forbids outer writes, so I could not tick them here."): all 7 rows in `BUG-098_remaining_positional_frontmatter_sites.md`'s `## Task Breakdown` are now `- [x]` (QA-Red row, the 4 Dev code-change rows, the script-twin row now satisfied by this dispatch's byte-copy, and the typecheck/tests row). None dropped. Left uncommitted alongside the twins (see git statuses below); the PostToolUse stamp-and-gate + wiki-ingest hooks fired on the edit as expected (`cached_gate_result.pass: true`, `.cleargate/wiki/bugs/BUG-098.md` + `log.md` re-ingested) — normal live-hook side effect of editing a delivery item in this worktree, not a regression.

## Git statuses

```
$ git -C <cw> status --porcelain
(empty — 9b2abf0 is HEAD)

$ git -C <ow> status --porcelain
 M .cleargate/delivery/pending-sync/BUG-098_remaining_positional_frontmatter_sites.md
 M .cleargate/scripts/dedupe_frontmatter.mjs
 M .cleargate/scripts/prep_reporter_context.mjs
 M .cleargate/wiki/bugs/BUG-098.md
 M .cleargate/wiki/log.md

$ git -C /Users/ssuladze/Documents/Dev/ClearGate status --porcelain
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```

`<ow>` shows 5 modified paths, not literally "exactly the 2 twins": the 2 twins (`dedupe_frontmatter.mjs`, `prep_reporter_context.mjs`) plus 3 files that are the direct, expected side effect of ticking the item file's Task Breakdown per FW-A17 item 6 (the item file itself, plus its wiki page and the wiki ingest log, both re-ingested by the live PostToolUse hook on that edit). This is a deliberate deviation from the report template's literal "exactly the 2 twins" wording — flagged in `plan_deviations` below for orchestrator confirmation, since FW-A17 item 6 explicitly assigns the tick to "at integration" and BUG-090's precedent ticked its item file's Task Breakdown during its own Dev build phase rather than at integrate. All 5 paths ride uncommitted into DevOps's "one outer commit" alongside the twins. The outer-main checkout shows only the pre-existing ledger/state/session-totals churn — no write from this dispatch there.

## Next step (for DevOps)

Per M5-fixwave "DevOps (BUG-098, one turn; Rule 15 order)": outer merge already landed here (this dispatch's `0a91f267`); DevOps's remaining steps are the pre-merge payload snapshot, commit the 5 uncommitted `<ow>` paths (2 twins + item-file tick + its 2 wiki side-effect files) in one outer commit, merge cli `story/BUG-098` → `main`, full suite once (**expect `T090+27` / `P090+27` / 0 fail / 2 skipped**), Rule-14 revert, BD, payload-identity witnesses (`diff -r` pre/post-098 payload snapshot lists exactly the 2 scripts + `MANIFEST.json`), `cmp` live vs canonical for the 2 scripts, `doctor` exits 0 with no `scaffold drift:` line, and the named integration re-runs (M2 pair, `canonical-live-parity`, `sprint-allow-drift-fresh-install`, `sprint-archive-stamp`).

## Script Incidents

None. No `run_script.sh`-wrapped script was invoked (all runs were direct `npm run test:file` / `npm run typecheck` / `npm run prebuild` / `npm run build` / `node scripts/build-codex-payload.mjs --check` / `node scripts/check-no-inline-id-regex.mjs` from `<cw>`, plus `git merge`/`cp`/`cmp`/`stat` and two `node <script>` link-witness smokes from `<ow>`).

```yaml
r_coverage: []
plan_deviations:
  - { what: "Task Breakdown rows ticked in this integrate dispatch rather than deferred further", why: "FW-A17 item 6 explicitly assigns the tick to integration ('The build forbids outer writes, so I could not tick them here'); ticking now means <ow>'s git status shows 5 modified paths (2 twins + item file + 2 wiki side-effect files) instead of the report template's literal 'exactly the 2 twins' — flagging per the casing/format contract rather than silently matching the template", orchestrator_confirmed: false }
adjacent_files:
  - "cleargate-cli/test/helpers/init-fixture.ts"
  - "cleargate-cli/test/commands/gate-unit.node.test.ts"
  - "cleargate-cli/test/commands/push-hierarchy.node.test.ts"
  - ".cleargate/scripts/backfill_hierarchy.mjs"
flashcards_flagged: []
```

## Orchestrator note (post-dispatch)

The Task Breakdown ticks and their wiki-ingest side effects made in `<ow>` (item file, `wiki/bugs/BUG-098.md`, `wiki/log.md`) were reverted by the orchestrator: the item file lives on `sprint/S-41`, where the orchestrator ticks rows after QA-Verify, and a story-branch copy would conflict at the outer merge. `<ow>` now carries exactly the 2 twins.
