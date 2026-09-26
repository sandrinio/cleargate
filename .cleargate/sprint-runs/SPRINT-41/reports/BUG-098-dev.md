# BUG-098 Developer report (build phase, contract C4)

role: developer

```
STORY: BUG-098
STATUS: done
COMMIT: 9970c108da406f5754e2771f047dc105e55c4813 (cli story/BUG-098, on re-seal ca18c73)
TYPECHECK: pass
TESTS: 157 passed, 0 failed (make-green: 12 default files 136/136, e2e 1/1, M2 parity 5/5 + 15/15)
FILES_CHANGED: src/lib/frontmatter-locator.ts, src/commands/sprint.ts, src/lib/lifecycle-reconcile.ts, src/lib/readiness-predicates.ts, src/commands/doctor.ts, src/lib/frontmatter-merge.ts, src/lib/slug.ts, src/lib/wiki/contradict.ts, src/commands/wiki-audit-status.ts, src/lib/intake.ts, scaffold/core/.cleargate/scripts/prep_reporter_context.mjs, scaffold/core/.cleargate/scripts/dedupe_frontmatter.mjs
```

Worktrees:
- `<cw>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-098/cleargate-cli`, HEAD `9970c10`, `git status --porcelain` clean.
- `<ow>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-098`: nothing written by me, `git status --porcelain` empty at the end. See the leak log for one test-induced write, which I reverted.
- Build: `(npm run prebuild && npm run build) > /private/tmp/bug098-build.log 2>&1`, exit 0.

## What changed (per plan)

- **`frontmatter-locator.ts`:** `frontmatterYaml` and `withFrontmatterYaml` added verbatim from M5-fixwave "Change shape (pinned)", next to `replaceFrontmatter`.
- **`sprint.ts`, sites 1–4 (FW-A17 item 2):**
  - `parseFileFrontmatter(raw)` returns `{ fm, body, span, parseOk, framingError }`. A locator throw gives `framingError: true`, `fm {}`, `span null`, `parseOk false`.
  - `dumpFrontmatterYaml(fm)` holds the exact `yaml.dump` options of `serializeFileContent`, which now calls it.
  - `rewriteFrontmatter(raw, parsed, fm)` checks, in order:
    - `framingError` → `raw`;
    - `span && parseOk` → `withFrontmatterYaml(raw, span, dumpFrontmatterYaml(fm))`;
    - `span` alone → `raw`;
    - otherwise → `serializeFileContent(fm, parsed.body)`.
  - The waiver write, `stampFile` and `stampSprintClose` all go through `rewriteFrontmatter`. `stampSprintClose` returns `didChange: false` and skips the write when the result equals `previousContent`.
- **`lifecycle-reconcile.ts` `setFrontmatterFieldAtomic`:**
  - The locator runs inside try/catch; `null` or a throw raises `No frontmatter in <path>`, as today.
  - The existing replace/append transform runs over `frontmatterYaml`, then `withFrontmatterYaml`, then the existing tmp+rename.
- **`readiness-predicates.ts` `readFrontmatterFromFile`:**
  - Locate, then `frontmatterYaml(raw, span).split('\n')` feeds the unchanged line loop.
  - `null` → `{}`. A throw lands in the existing outer catch → `{}`.
- **`doctor.ts`:**
  - `runHookHealth` tests `/^execution_mode:/m` on the located YAML; a locator throw means the file is skipped.
  - `runPricing`: the sniff is replaced by a locator try. `null` → "file has no frontmatter", exit 2. A throw → "cannot parse frontmatter", exit 2.
  - The two BUG-090 consecutive blank lines (`:771-772`, `:1054-1055`) are removed.
- **`frontmatter-merge.ts` `parseBlock`:** the `startsWith('---')` guard is deleted. `parseFrontmatter`, which already uses `locateFrontmatter`, locates the fence or throws.
- **Readers.**
  - `slug.ts` `extractFrontmatterBlock` returns the located YAML, or `null` on absent or thrown framing.
  - `intake.ts` `hasAnyRemoteAuthored` tests its unchanged `source:` regex against the located YAML only.
- **Writers.**
  - `contradict.ts` `upsertFrontmatterField` and `wiki-audit-status.ts` `applyStatusFix` run their existing line edit over `frontmatterYaml(...).split('\n')`, then call `withFrontmatterYaml`.
  - Absent or thrown framing returns `raw`, unchanged.
- **Scripts:**
  - Both scripts add `import { locateFrontmatterFence } from './assert_story_files.mjs';`.
  - `prep_reporter_context.mjs` runs the field loop over `content.slice(span.yamlStart, span.yamlEnd)`.
  - `dedupe_frontmatter.mjs`:
    - `parseFmLines` returns `{ span, fmLines, hadFinalEol }`;
    - it rebuilds as `raw.slice(0, yamlStart) + cleaned.join('\n') + (hadFinalEol ? '\n' : '') + raw.slice(yamlEnd)`;
    - the output strings are unchanged;
    - the mode stays 755 (`stat -f %Lp` = 755; git index `100755`).
- **New canonical hashes** (for the integration twin `cmp`):
  - `prep_reporter_context.mjs`: `6b3cf6834ebc7a0ea245b53d856275ffb3ca63488fec562883e7dd0bae2b36a2`
  - `dedupe_frontmatter.mjs`: `831b7c2726a01ba234b2b62e2686b7a54424fa89137b285a6bd95500b9933fed`
- **Untouched:**
  - No test file.
  - No outer file (twins deferred to integration, FW-A17 item 3).
  - No CHANGELOG: the M5-fixwave change shape does not name it.

## Make-green (solo `npm run test:file`, counted with `command grep -aE "^ℹ (tests|pass|fail|skipped) "`)

| File | Expected | Actual (tests/pass/fail/skip) |
|---|---|---|
| test/lib/frontmatter-yaml-splice.red.node.test.ts | 4/4 | 4 / 4 / 0 / 0 |
| test/commands/sprint-frontmatter-fence.red.node.test.ts | 5/5 | 5 / 5 / 0 / 0 |
| test/commands/sprint-archive.node.test.ts | 18/18 | 18 / 18 / 0 / 0 |
| test/lib/lifecycle-reconcile-fence.red.node.test.ts | 2/2 | 2 / 2 / 0 / 0 |
| test/commands/gate-unit.node.test.ts | 27/27 (C4) | 27 / 27 / 0 / 0 |
| test/commands/doctor-fence.red.node.test.ts | 3/3 | 3 / 3 / 0 / 0 |
| test/lib/slug.node.test.ts | 14/14 | 14 / 14 / 0 / 0 |
| test/lib/frontmatter-merge.node.test.ts | 8/8 | 8 / 8 / 0 / 0 |
| test/wiki/contradict.node.test.ts | 28/28 | 28 / 28 / 0 / 0 |
| test/wiki/audit-status.node.test.ts | 14/14 | 14 / 14 / 0 / 0 |
| test/lib/intake.node.test.ts | 9/9 | 9 / 9 / 0 / 0 |
| test/scripts/scripts-fence-bug098.red.node.test.ts | 4/4 | 4 / 4 / 0 / 0 |
| test/e2e/sprint-allow-drift-fresh-install.red.integration.node.test.ts | 1/1 | 1 / 1 / 0 / 0 |
| test/hosts/claude-adapter-init-parity.red.integration.node.test.ts (`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, compare only) | 5/5 | 5 / 5 / 0 / 0 |
| test/commands/init-host-parity.red.integration.node.test.ts (same env) | 15/15 | 15 / 15 / 0 / 0 |

Every file went green on the first run. There was no retry and no flake.

## Anchors (solo; worktree dist built first)

| File | Actual |
|---|---|
| test/lib/lifecycle-reconcile.node.test.ts | 24/24 |
| test/lib/close-sprint-backsync.node.test.ts (dist) | 11/11 |
| test/commands/sprint-init-decomp-gate.node.test.ts | 11/11 |
| test/commands/sprint-sentinel-validation.node.test.ts | 14/14 |
| test/commands/sprint-archive-stamp.integration.node.test.ts (named) | 14/14 |
| test/commands/doctor.node.test.ts | 40/40 |
| test/commands/doctor-pricing.node.test.ts | 5/5 |
| test/commands/doctor-session-start.node.test.ts | 22/22 |
| test/commands/doctor-retired-field.red.node.test.ts (dist) | 3/3 |
| test/lib/readiness-predicates.node.test.ts | 119/119 |
| test/lib/frontmatter-locator.red.node.test.ts | 11/11 |
| test/docs/gate-section-index-pinning.node.test.ts | **13/14, named build-phase red S1c** ("templates/epic.md differs between live and canonical", BUG-090's `approved: false`) |
| test/scripts/test_prep_reporter_context.node.test.ts (reads `<ow>` live) | 2/2 |
| test/scripts/dedupe-frontmatter.node.test.ts (reads `<ow>` live) | 5/5 |
| test/scripts/no-inline-id-regex.node.test.ts | 7/7 |
| test/scripts/frontmatter-fence-parity.red.node.test.ts | 21/21 |
| test/scripts/assert-story-files-fence.red.node.test.ts | 11/11 |
| test/scripts/close-sprint-fence.red.node.test.ts | 4/4 |
| test/scripts/template-approved-key.red.node.test.ts | 7/7 |

- Total: 345 tests, 344 pass, 1 fail. The one fail is the named S1c.
- `canonical-live-parity` 5a is the other named build-phase red (integration tier). I did not run it; it is named per FW-A17 item 4.

**Rule 16:** the 21 `CLEARGATE_META_ROOT` test files ran solo with no override (default META_ROOT = `<ow>`), from `command grep -rl CLEARGATE_META_ROOT test`, which gives 22 paths minus `test/helpers/scaffold-roots.ts`. Result: **310/310 pass**, matching the TPV. `git -C <ow> status --porcelain` was empty afterwards.

**Extra adjacency sweep** (beyond the brief):
- Scope: 79 default-tier files that import a touched module (`sprint`, `lifecycle-reconcile`, `readiness-predicates`, `doctor`, `frontmatter-merge`, `slug`, `contradict`, `wiki-audit-status`, `intake`, `frontmatter-locator`, `gate`, `stamp`, `wiki-ingest`, `push`/`pull`/`sync`) or reference either script.
- Result: 1103 tests, 1100 pass, 2 fail, 1 skip. Both fails are two-repo merge-order artifacts:
  - `test/docs/gate-section-index-pinning.node.test.ts` S1c, the named one.
  - `test/wiki/wiki-ingest-sprint-report.red.node.test.ts`, 14/15: "CR-063 Scenario 14: close_sprint.mjs byte-identical in both locations". **This red is not in FW-A17 item 4's list, but it is the same class.**
    - It compares `<ow>/.cleargate/scripts/close_sprint.mjs` (pre-BUG-090 live) with `<cw>` canonical `close_sprint.mjs` (C4 carries BUG-090's +33/−10). They first differ at line 85, BUG-090's import line.
    - BUG-098 does not touch `close_sprint.mjs`: `git diff ca18c73 -- …close_sprint.mjs` is empty.
    - `git show sprint/S-41:.cleargate/scripts/close_sprint.mjs | cmp - <cw canonical>` is byte-identical, so it clears at integration.
    - The TPV's 81-file sweep ran on the integrated int-A tree, which is why it never saw this red.

## FW-A17 K1–K6 self-checks

- **K1.** Each TS site imports from `frontmatter-locator`:
  - `sprint.ts`, `lifecycle-reconcile.ts`, `contradict.ts`, `wiki-audit-status.ts`: `locateFrontmatter`, `frontmatterYaml`, `withFrontmatterYaml` (+ type `FrontmatterSpan`).
  - `readiness-predicates.ts`: `locateFrontmatter`, `frontmatterYaml`.
  - `doctor.ts`, `slug.ts`, `intake.ts`: `locateFrontmatter`, `frontmatterYaml` (+ type).
  - `frontmatter-merge.ts` has no direct import. Its pinned site-9 change is "delete the guard", and it reads through `parseFrontmatter`, whose line 15 imports `locateFrontmatter`.
  - `frontmatter-locator.ts` defines the helpers.
  - No private fence scan remains.
- **K2.** `command grep -nE "lines\[0\] !== '---'|startsWith\('---'\)|indexOf\('\\\\n---'|match\(/\^---"` over the 10 TS files returns exactly one hit: `src/lib/frontmatter-locator.ts:8`. That is the existing BUG-067 doc comment the TPV had already noted, not a BUG-098 site.
- **K3.** `command grep -c "trimStart().startsWith('---')" src/commands/doctor.ts` = **0**. The double blank lines are gone: an awk scan for consecutive empty lines in doctor.ts finds none.
- **K4.** `rewriteFrontmatter`'s first statement is `if (parsed.framingError) return raw;` (`sprint.ts:833`).
- **K5.** Both scripts carry `import { locateFrontmatterFence } from './assert_story_files.mjs';` (`prep_reporter_context.mjs:48`, `dedupe_frontmatter.mjs:24`). Canonical `dedupe_frontmatter.mjs` is 755. The live side is made at integration.
- **K6.** `git diff --name-only ca18c73..HEAD` lists exactly the 12 allow-listed paths.
- **Other gates.**
  - `npm run typecheck` is clean.
  - `node scripts/check-no-inline-id-regex.mjs` prints "no inline work-item-id regexes", exit 0.
  - Canonical script link smoke:
    - `node <cw>/scaffold/core/.cleargate/scripts/prep_reporter_context.mjs` prints usage, exit 2;
    - `node …/dedupe_frontmatter.mjs --dry-run <empty scratch dir>` prints `Dedupe complete: 0 would-rewrite, 0 skipped, 0 errors.`, exit 0.
- **Edge probe** (tsx, scratch dir only), `stampSprintClose` on four `<instructions>`-led files:
  - empty `---`/`---` block: stamped inside the span;
  - unterminated `<instructions>`: `didChange=false`, bytes unchanged;
  - CRLF: CRLF kept, preamble identical;
  - no frontmatter: today's fallback.

## Leak-hygiene log

C4 is pre-BUG-096. Before each run I snapshotted `ls -d /private/tmp/cg-s41-fix-* /private/tmp/cg-s41-payload-*`. Afterwards I removed only the new dirs, each confirmed as mine: it carried this build's `prep_reporter_context.mjs` hash `6b3cf683…36a2`, or its timestamp matched my own run.

| Run | New dirs | Removed |
|---|---|---|
| e2e `sprint-allow-drift-fresh-install` | 2 (`cg-s41-fix-fresh-KvfvFE`, `cg-s41-payload-EvfRfp`) | 2 |
| `claude-adapter-init-parity` | 6 (5 fix + 1 payload) | 6 |
| `init-host-parity` | 16 (15 fix + 1 payload) | 16 |
| anchors (19 files) | 0 | 0 |
| rule-16 list (21 files) | 0 | 0 |
| adjacency sweep (79 files) | 9. Eight carry the hash; `cg-s41-fix-fresh-TvXVEh` holds a `.uninstalled` codex scenario with no scripts, created at 21:22:11, the moment my `lifecycle-codex.red` run finished | 9 |

Total: 33 dirs removed, all mine. The baseline `/private/tmp/cg-s41-m2-init-baseline` was read-only (env only). `/private/tmp/cg-s41-fresh-journey` was not touched.

**Outer-worktree back-sync (test-induced, reverted).**
- The adjacency sweep modified 30 `<ow>/.cleargate/delivery/pending-sync/*.md` files. Each change was a `parent_cleargate_id` fill from `parent_ref`, for example BUG-071's `"EPIC-NNN | STORY-NNN-NN"`.
- The source is `test/commands/push-hierarchy.node.test.ts`. It spawns the **live** `<cli>/../.cleargate/scripts/backfill_hierarchy.mjs` and runs it twice against the real corpus. That script's REPO_ROOT is `<ow>`.
- This is not BUG-098 code: `backfill_hierarchy.mjs` is LEAVE and untouched.
- `<ow>` was clean immediately before the sweep (checked after the rule-16 run). I made no intended edits there.
- Per rule 14 I reverted exactly the 30 paths from `git -C <ow> diff --name-only`, all under `.cleargate/delivery/pending-sync/`, with `git -C <ow> checkout -- <those paths>`. `<ow>` status is empty afterwards.
- The OUTER main checkout was not touched. Its status shows only the pre-existing sprint-run files plus another lane's report.

## `git -C <cw> show --stat HEAD`

```
commit 9970c108da406f5754e2771f047dc105e55c4813
Author: sandrinio <sandrinio@users.noreply.github.com>
Date:   Sat Sep 26 21:27:03 2026 +0400

    fix(BUG-098): remaining positional frontmatter sites — shared frontmatterYaml/withFrontmatterYaml splice; framingError never writes; scripts import locateFrontmatterFence

    Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
    Claude-Session: https://claude.ai/code/session_015Qz4eVKM8btGEYJaieiHkG

 .../core/.cleargate/scripts/dedupe_frontmatter.mjs |  54 +++++----
 .../.cleargate/scripts/prep_reporter_context.mjs   |  16 ++-
 src/commands/doctor.ts                             |  30 ++++-
 src/commands/sprint.ts                             | 124 ++++++++++++++++-----
 src/commands/wiki-audit-status.ts                  |  35 +++---
 src/lib/frontmatter-locator.ts                     |  14 +++
 src/lib/frontmatter-merge.ts                       |   5 +-
 src/lib/intake.ts                                  |  16 ++-
 src/lib/lifecycle-reconcile.ts                     |  21 +++-
 src/lib/readiness-predicates.ts                    |  14 +--
 src/lib/slug.ts                                    |  21 ++--
 src/lib/wiki/contradict.ts                         |  37 +++---
 12 files changed, 270 insertions(+), 117 deletions(-)
```

## Integration hand-off (not done in this build; FW-A17 item 3, rule 21)

1. In `<ow>`, run `git merge --no-ff sprint/S-41`. This brings BUG-090's live `assert_story_files.mjs`/`close_sprint.mjs` pair.
2. `cp` both scripts from integrated canonical, then `cmp` each. `stat -f %Lp` on dedupe must read 755.
3. Commit both in one outer commit.
4. Re-run `test_prep_reporter_context` (2/2) and `dedupe-frontmatter` (5/5).
5. Expect these three build-phase reds to clear on the integrated tree:
   - S1c (14/14);
   - `canonical-live-parity` 5a (11/11);
   - `wiki-ingest-sprint-report` S14 (15/15).
6. At integration, tick the Task Breakdown rows of the item file, which lives in the outer repo. The build forbids outer writes, so I could not tick them here.

## Script Incidents

None. No `run_script.sh`-wrapped script was invoked.

```yaml
r_coverage:
  - { r_id: "R1", covered: true, deferred: false, clarified: false }   # --allow-drift never plants a phantom: S1, S2 (CRLF), e2e fresh-install
  - { r_id: "R2", covered: true, deferred: false, clarified: false }   # close reconciler sets a field on an instructions-led story: L1, L2
  - { r_id: "R3", covered: true, deferred: false, clarified: false }   # parent-approved reads an instructions-led approved parent: gate-unit R1, R2
  - { r_id: "R4", covered: true, deferred: false, clarified: false }   # remaining readers agree with the locator (LF/CRLF/---led): S3, S4, S6, D4, D5, SL1, SL2, FM1, C1, W1, I1, P1/P2, DD1/DD2
  - { r_id: "R5", covered: true, deferred: false, clarified: false }   # malformed frontmatter behind <instructions> never rewritten: S5 + S3 malformed half (FW-A17 framingError)
  - { r_id: "R6", covered: false, deferred: true, clarified: false }   # §5 E2E row: clean-room sprint-init row, re-witnessed at RS-4
plan_deviations:
  - { what: "empty YAML block parses as parseOk:true", why: "parseFileFrontmatter keeps today's trim()==='' early return as fm {} with parseOk:true, so an empty ---/--- block stays writable (plan's 'non-object → parseOk:false' would make it silently unstampable); comment-only YAML still gives parseOk:false", orchestrator_confirmed: false }
  - { what: "waiver write skipped when unchanged", why: "sprint init --allow-drift writes only when rewriteFrontmatter's result differs from the raw file (malformed/framingError → no write at all), mirroring stampSprintClose's equality rule", orchestrator_confirmed: false }
  - { what: "applyStatusFix returns raw when no status line replaced", why: "avoids re-splicing (and EOL-normalizing) an unchanged block; byte-identical to the plan's shape for uniform-EOL files", orchestrator_confirmed: false }
  - { what: "contradict upsert treats empty YAML as zero lines", why: "faithful port of today's insert-before-closer on an empty block (---/key/---) instead of emitting a leading blank YAML line", orchestrator_confirmed: false }
  - { what: "Task Breakdown rows not ticked", why: "the item file is an outer file and the build brief forbids outer writes; rows 2-5 and 7 are done, row 6's twins are deferred to integration by FW-A17 item 3", orchestrator_confirmed: false }
adjacent_files:
  - "cleargate-cli/scaffold/core/.cleargate/scripts/assert_story_files.mjs"
  - ".cleargate/scripts/prep_reporter_context.mjs"
  - ".cleargate/scripts/dedupe_frontmatter.mjs"
  - "cleargate-cli/test/helpers/init-fixture.ts"
  - "cleargate-cli/src/wiki/parse-frontmatter.ts"
  - "cleargate-cli/test/wiki/wiki-ingest-sprint-report.red.node.test.ts"
  - "cleargate-cli/test/commands/push-hierarchy.node.test.ts"
flashcards_flagged:
  - "2026-09-26 · #test-harness #backfill #danger · push-hierarchy.node.test.ts runs live backfill_hierarchy.mjs over the real <cli>/.. corpus; revert pending-sync after."
  - "2026-09-26 · #test-harness #two-repo · Parity is not only S1c: wiki-ingest-sprint-report S14 cmps live vs canonical close_sprint.mjs; red in a pre-contract wt."
```
