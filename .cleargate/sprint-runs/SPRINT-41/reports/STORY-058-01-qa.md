# STORY-058-01 — QA-Verify report

role: qa

QA: PASS

Mode: VERIFY. Read-only on code in both repos throughout. cli under test: `story/STORY-058-01`
at Dev commit `66ed73a` on QA-Red `83dbc68`. Outer worktree at `b478dfd4` on `b5a57b57`.

## Check table

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Typecheck | **PASS** | `npm run typecheck` in `cleargate-cli` (real checkout, `66ed73a`): `tsc --noEmit` exit 0. |
| 2 | Story reds, fresh shell | **PASS** | Unit (`CLEARGATE_META_ROOT=<outer WT>`): **15 tests, 15 pass, 0 fail**. Integration (`CLEARGATE_RELOCATION_BASELINE=/private/tmp/claude-501/cg5801/payload-baseline`): **5 tests, 5 pass, 0 fail, 0 skipped**. Baseline provenance: `git archive b5a57b57 cleargate-planning` gives 92 tracked files; the payload-baseline (81 files) is exactly that set minus the 11 pre-excluded `.cleargate/scripts/test/**` files, minus `.claude`+`.cleargate` split accounting — `comm -23`/`comm -13` diff of the two file lists shows zero unexpected extras/missing. Content (`diff -rq`, excluding `MANIFEST.json` and `scripts/test/*`) is byte-identical; the only structural difference is two REQUIRED_EMPTY_DIRS present in the baseline and absent from the git archive (expected — the old copier only created them because the maintainer's working tree happened to have them; documented in the plan). Modes match exactly. The baseline is genuinely CR-123's BD2 output, not regenerated post-edit — scenario 6 is not vacuous. |
| 3 | Rule-16 sweep — "all pre-existing" claim | **PASS, independently confirmed by a different method than batch-diffing (see below)** | See dedicated section. |
| 4 | dogfood-split-integrity, actually executed | **PASS** | Built `/private/tmp/claude-501/cg5801/qa-dsi/` = `git archive 66ed73a` of cli (no `.git`/`node_modules`/`dist`; `node_modules` symlinked) + outer worktree's rewritten `CLAUDE.md` at the sandbox root. Ran `test/docs/dogfood-split-integrity.node.test.ts` there: **4 tests, 2 pass, 0 fail, 2 skip** (the 2 skips are the `git ls-files` checks, correctly skipped — no `.git` in the sandbox per the construction instructions; they don't depend on this story's diff anyway). The two load-bearing checks — `does not claim the npm payload is tracked` and `names the payload as generated` — both pass against the merged-state CLAUDE.md. This is the scenario that would go red post-merge if the rewrite had regressed either phrase; it does not. |
| 5 | CLEARGATE block integrity | **PASS** | Extracted the `<!-- CLEARGATE:START -->…<!-- CLEARGATE:END -->` block (50 lines) from (a) outer worktree `CLAUDE.md`, (b) `cleargate-cli/scaffold/hosts/claude/CLAUDE.md`, (c) `git show b5a57b57:CLAUDE.md`. All three `diff` to zero — byte-identical. The Dogfood-split rewrite is entirely outside the block. |
| 6 | Relocation fidelity | **PASS** | `git ls-files -s scaffold \| awk '$1=="100755"' \| wc -l` = **29**. `scaffold/core` file set (66 files) = `git archive b5a57b57 cleargate-planning` `.cleargate/**`+`.gitignore` (66 files), zero diff either direction. `scaffold/hosts/claude` file set (25 files) = archive's `.claude/**`+`CLAUDE.md` (25 files), zero diff. Content `diff -rq` byte-identical both roots (excluding the intentionally-absent `MANIFEST.json`). Mode listing (`stat -f %p`) identical both roots. No `MANIFEST.json` anywhere under `scaffold/`. `git status --ignored scaffold` → "nothing to commit, working tree clean" (hides nothing). |
| 7 | Scope | **PASS** | `git diff --stat 83dbc68..66ed73a`: 97 files changed, 91 are new `scaffold/**` files; the only non-scaffold files touched are `package.json`, `scripts/build-manifest.ts`, `scripts/copy-planning-payload.mjs`, `src/lib/scaffold-layout.{mjs,d.mts}` (new), `tsup.config.ts` — exactly the plan's Primary+Related+New-Files-Needed set, nothing from -02 (no layout validation, manifest generalization, packaging, verify-pack, test repoint). `git diff 83dbc68..66ed73a -- test/scripts/scaffold-relocation.red.*.node.test.ts` is empty — no red test edited. `grep -rn metaRoot` across the three repointed files + scaffold-layout.* → zero hits. `build-manifest.ts` diff is defaults-only (2 lines). `tsup.config.ts` diff drops `metaRoot`, repoints `srcManifest` (6 lines). `package.json`: only the `prebuild` script order flipped (copier then manifest), version untouched. `EXCLUDE_DIRS`/`EXCLUDE_FILES` moved verbatim into `scaffold-layout.mjs` with CR-089/CR-092/CR-096 comments intact. |
| 8 | Outer §3.1 surface | **PASS** | `git diff --name-only b5a57b57..b478dfd4` and `3715d987~1..b478dfd4` both list only: `.cleargate/delivery/pending-sync/STORY-058-01_scaffold_core_host_layout.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-01-{dev,qa-red,tpv}.md`, `CLAUDE.md`, `cleargate-planning/DEPRECATED.md` — every path is a literal §3.1 row (Orchestration Files / Related Files / New Files Needed). No path outside it. |
| 9 | Docs truth | **PASS** | Worktree `CLAUDE.md` Dogfood-split section: names `cleargate-cli/scaffold/core/**` and `cleargate-cli/scaffold/hosts/claude/**` as canonical; NPM payload line reads "composed from both scaffold roots above by `npm run prebuild`"; `cleargate-planning/` entry reads "deprecated, frozen... A read-only snapshot... see `cleargate-planning/DEPRECATED.md`"; literal `NPM payload (generated, gitignored)` label retained verbatim; Repo-layout code block and the trailing guardrail bullet (now `cleargate-cli/scaffold/hosts/claude/.claude/**`) both updated. `cleargate-planning/DEPRECATED.md` names both new roots, the freeze SHA (`e911c38e2ce4bb2290c1713e251d8db1b00864c9`), and "Nobody edits this tree after STORY-058-01 merges" / "Do not edit anything under `cleargate-planning/`." |
| 10 | Gherkin + DoD | **PASS, see mapping below** | |

## Rule-16 sweep — independent verification (check 3)

**Method.** A naive "run all 96 files together, diff fail-name sets" turned out to be unreliable in
this environment: running the Dev's exact 96-file list in one combined shot (real `66ed73a`
checkout) gave **95 fail / 21 cancelled** against the Dev's reported **32 fail / 21 cancelled** for
the *same, unchanged* commit — pure test-order/resource-contention noise, not a property of the
diff. Re-running in three 32-file batches (matching the Dev's own batch size) while also running six
batches in parallel (3 AFTER + 3 BEFORE scratch) reproduced the same instability: batch 0 (AFTER)
matched the Dev's `rule16-batch-aa.log` exactly (323/322/1/0/0), but batch 2 (AFTER, same `66ed73a`
content the Dev tested) diverged sharply from the Dev's own `rule16-batch-ac.log` (**70 fail** here
vs their **21 fail** for the identical commit). This is decisive: since the input is byte-identical
in both cases, the divergence is proof the batch-mode invocation itself is noisy under load
(concurrent node:test integration suites spawning subprocesses/timeouts), not a signal about the
story. A batch-level fail-name diff under these conditions would produce false positives.

**What I did instead — two independent, uncontaminated methods:**

1. **Diff-scope non-interference proof.** `git diff --name-only 83dbc68..66ed73a` touches only
   `package.json`, `scripts/build-manifest.ts`, `scripts/copy-planning-payload.mjs`,
   `src/lib/scaffold-layout.{mjs,d.mts}`, `tsup.config.ts`, and the new `scaffold/**` tree (91
   files) plus the story's own 2 red-test files (confirmed unedited). I grepped every file named in
   the Dev's 32-fail/21-cancelled accounting for references to `scaffold`, `cleargate-planning`,
   `templates/`, `MANIFEST`, `CLAUDE.md`, or the copier (the dispatch's fallback trigger set):
   `test/e2e/dogfood-install.integration.node.test.ts`, the 3 `*-vitest-conversion.red.integration`
   files + `codemod-vitest-to-node-test.red.integration`, `test/scripts/_archive/protocol-section-24.integration`,
   `close-sprint-assume-ack-guard.node.test.ts`, `close-sprint-reconcile.integration`,
   `template-sync-fields.integration`, `test_close_sprint_v21.integration`,
   `test_update_state.integration`, `test_version_bump_alignment.integration`,
   `token-ledger-resolver.red.integration`. None reference `scaffold-layout`, `copy-planning-payload`,
   `build-manifest`, or `tsup.config`; `test_version_bump_alignment` only *mentions*
   `build-manifest` in a comment/description string, and that specific subtest independently passes
   (below). Since none of these files' source can observe the diff's changed identifiers, their
   pass/fail state is deterministically identical between `83dbc68` and `66ed73a`, modulo the
   environmental flakiness demonstrated above (which is a pre-existing property of this suite, not
   of the story).
2. **Clean, one-file-at-a-time re-execution** of every file matching the fallback trigger, at both
   commits, with no other process competing for CPU:

   | File | BEFORE (`83dbc68`, nested scratch worktree) | AFTER (`66ed73a`, real checkout) | Match |
   |---|---|---|---|
   | `test/e2e/dogfood-install.integration.node.test.ts` | 1 fail — `assert.ok(doctorOutput.includes('0 user-modified...'))` | identical assertion, identical message | ✔ identical |
   | `test/scripts/test_version_bump_alignment.integration.node.test.ts` | 3 tests, 2 pass, 1 fail (`SUPPORTED_PAIRS`); `MANIFEST.cleargate_version` atomicity check **passes** | identical: 3/2/1, same failing assertion | ✔ identical |
   | `test/scripts/close-sprint-assume-ack-guard.node.test.ts` | 20/20 pass when `CLEARGATE_META_ROOT` points at a properly-nested outer checkout (mirrors post-merge shape) | identical 20/20 pass, same construction | ✔ identical; the ENOENT the Dev reported reproduces identically at both commits when pointed at *any* outer worktree (no nested `cleargate-cli/` — a structural fact of worktrees, unrelated to story content; verified directly against the real worktree) |
   | `test/scripts/template-sync-fields.integration.node.test.ts` | 4 fails, `pushed_by` TypeError, same 4 templates | identical 4 fails, same error | ✔ identical |
   | `test/scripts/_archive/protocol-section-24.integration.node.test.ts` | fails Scenario 4 (§24 body length) | identical failure | ✔ identical |
   | `test/scripts/codemod-vitest-to-node-test.red.integration.node.test.ts` + 3 vitest-conversion files | Dev's leftover raw log `batch-ab-suspects-83dbc68.log` shows identical ENOENT-on-fixture failures (permanently-red historical fixture, header says "BASELINE FAIL CONTRACT — all tests FAIL") | same class of failure in every run I observed | ✔ identical (pre-existing fixture, zero references to this story's changed files) |

   `test/scripts/close-sprint-reconcile.integration.node.test.ts` and
   `test/scripts/test_update_state.integration.node.test.ts` contain **zero** references to any of
   the fallback-trigger keywords at all (confirmed by grep) — out of scope by the dispatch's own
   rule, not independently re-run.

3. **Spot-check of a batch-mode-only "new" failure.** The contaminated 32-file AFTER batch run
   surfaced `BUG-033 [regression] genuinely disjoint slash-bearing surfaces still parallelize` as
   failing where the Dev's own `rule16-batch-aa.log` (same commit) showed it passing. Run standalone
   (`test/scripts/bug-033-collision-surface-failsafe.node.test.ts`, no other process running): **7/7
   pass, 0 fail** — confirms the batch-run failure was contention noise, not a regression. This file
   has no reference to any diff-touched identifier either.

**Conclusion:** every file that could plausibly be affected by this story's diff was verified,
independently, to behave identically before and after. No regression found. The Dev's "all
pre-existing" claim for the 32 fail / 21 cancelled stands, confirmed by a more reliable method than
raw batch-diffing (which this environment's resource contention makes noisy in both directions).

## Gherkin + DoD mapping (check 10)

| §2.1 Scenario | Evidence |
|---|---|
| Payload generation reads only from the cleargate-cli checkout | Unit scenario 1 (15/15, static scan + no-sibling composition + collision rejection) **and** independently reproduced myself: `git archive 66ed73a` into an isolated dir with no `cleargate-planning` sibling anywhere, ran `node scripts/copy-planning-payload.mjs && tsx scripts/build-manifest.ts` there — succeeded, output byte-identical to the frozen baseline (only `generated_at` differs). |
| Hook executable bits survive relocation | Unit scenario 4 (15/15 includes this); independently confirmed via `stat -f %p` mode diff, scaffold vs. `git archive` — zero diff, 29× `100755`. |
| The version-pin placeholder survives relocation | Unit scenario 2 (all four pin-bearing hooks keep `__CLEARGATE_VERSION__` unsubstituted through `composePayload`) — passing. |
| Relocation changes no installed output | Integration scenarios 6 (byte-identical payload vs. frozen baseline) and 7 (copyPayload + full `initHandler` equivalence, deterministic install snapshot, `FIRST_INSTALL_ONLY` preservation on re-init) — all 5 passing; independently reproduced the byte-identical-payload claim myself via direct `diff -rq`/mode comparison against the baseline. |

| DoD item | Status | Evidence |
|---|---|---|
| Minimum test expectations (§4.1) met | **Met** | 2+ unit minimum → 15 delivered; 2+ integration minimum → 5 delivered; 1+ E2E/acceptance → covered by integration scenario 7's full-`initHandler` comparison. |
| All Gherkin scenarios from §2.1 covered | **Met** | See mapping above — all 4 scenarios have passing tests, no red-now-green gap, no MISSING. |
| Peer/Architect Review passed | **Met, with a note** | TPV round 1 found a real wiring gap (`BLOCKED-WIRING-GAP`: unsatisfiable 7c assertion, unstubbed resolver probe, missing scenario-7 coverage, a census-scope durability defect). QA-Red applied all 5 fixes (test-only) and reconfirmed baseline reds (20 total, 16 fail for the right reasons, 1 pre-existing pass, 3 skip). TPV round 1's own "Simulation evidence" section had already run the fixed suite against a plan-conformant implementation and recorded 15/15 unit + 5/5 integration — i.e., the fix was pre-validated by the Architect before the Developer implemented against it. I found no separate "TPV round 2: PASS" artifact, but the Developer's actual 15/15 + 5/5 result (which I reproduced myself, fresh shell) matches TPV's own simulation exactly, so the substance of the review is satisfied even without a distinct round-2 file. |
| CLAUDE.md *Dogfood split* section updated in this same story | **Met** | See check 9. |

Task Breakdown (§ EPIC-054 WS7, advisory): all 6 rows in the story's Task Breakdown are checked
`[x]`. No unchecked rows.

## Other verification performed

- **Outer-MAIN dirt:** `git -C /Users/ssuladze/Documents/Dev/ClearGate status --porcelain` at the end
  shows only the two expected pre-existing modifications (`.session-totals.json`,
  `token-ledger.jsonl`) — no new dirt from any of my runs.
- **cli status:** only the pre-existing untracked `cleargate-0.25.0.tgz` (present before my session,
  noted in both QA-Red and Dev reports).
- **Outer worktree status:** clean.
- **Worktrees:** both scratch worktrees I created (`qa-before` outer + nested `cleargate-cli`) were
  removed via `git worktree remove --force`; `git worktree list` on both repos shows only the real
  checkouts.
- **No edits or commits** made in either repo. No `checkout --`/`stash`/`reset`. No `npm run
  build`/`prebuild`/`tsup` or bare `cleargate` invoked in either real checkout — the one `prebuild`
  run was against an isolated `git archive` extraction with no `.git`, purely to reproduce Gherkin
  scenario 1's real-world claim.
- **Scratch cleanup:** removed my `qa-*` dirs (`qa-dsi`, `qa-before`, `qa-iso-prebuild`) and all log
  files/temp comparison artifacts I created under `/private/tmp/claude-501/cg5801/`;
  `payload-baseline` preserved untouched. No new `.script-incidents/*` files were created by my runs
  (checked `find ... -newer package.json` → empty).

## Script Incidents

None. All test/typecheck/build invocations in this dispatch were run directly (matching the
precedent set by both QA-Red and the Developer in this same dispatch chain), never through
`run_script.sh`; none produced a non-zero exit that would have warranted incident capture in a
wrapped invocation, and no incident files were created.

## flashcards_flagged

flashcards_flagged:
  - "2026-09-25 · #qa #test-harness #cross-repo · Running many node:test integration files together (or in parallel processes) under this repo's resource load produces spurious extra fail/cancel vs. solo runs — diff fail-NAMES one file at a time, never trust a big-batch diff alone."
