role: developer

# BUG-047: Developer INTEGRATE report (cli main 8c98177)

```
STORY: BUG-047
STATUS: done
COMMIT: cli f03670093255d8dfce00b290d9d9782e6c951b1c (integrate(BUG-047): merge cli main 8c98177; parents 8b7daf3 + 8c98177; tree 2703a7b5)
TYPECHECK: pass
TESTS: 14 files run solo, 223 tests / 223 pass / 0 fail / 0 skipped (BUG-047 set 119, -13 codex-loop + verify-install codex 95, BUG-101 witnesses 9)
FILES_CHANGED: none authored. cli: merge commit only; CHANGELOG.md was the one conflict (append/append at the same anchor), resolved keep-both. outer: nothing (cli-only item; the detached outer worktree was not touched)
NOTES: Mechanical integration. No src, scaffold, script, fixture, generated or test file was edited. The only conflict was CHANGELOG.md, where both sides appended a `### Fixed` entry after BUG-085's. I kept main's BUG-101 entry and put BUG-047's after it, the same order as BUG-101-integrate. The merge delta against main is exactly BUG-047's change set (cbb7248 + 9a44e4b + 8b7daf3). Main's delta arrives unchanged. One flashcard is flagged.
```

## Where

- `<cw>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-047/cleargate-cli`, `story/BUG-047`: `8b7daf3` → `f036700`.
- **Before starting:**
  - `<cw>` was clean and the `node_modules` symlink was in place.
  - cli `main` = `8c98177`, and `git merge-base --all HEAD main` = `f0c33f7` only.
  - Main brought in 7 commits since the base: STORY-058-13's `1111659..0e5b0ac` and BUG-101's `59da770..8c98177`.
- The outer worktree `.worktrees/BUG-047` was detached at `7db0e89e` and clean before and after. I did not touch it.
- The cli main checkout is still on `main` at `8c98177`. I ran only read-only git against it, through `<cw>`'s shared refs.

## 1. cli merge

**Read-only preview.** `git merge-tree --write-tree --name-only HEAD main` exited 1 and listed exactly one conflicted path, `CHANGELOG.md`. The paths both sides changed since `f0c33f7` (`comm -12` of the two `--name-only` lists) are `CHANGELOG.md` only.

**Merge.** I ran `git merge --no-ff --no-commit main`.
- 31 paths from main were staged cleanly: -13's `scripts/clean-room/**` and its fixtures, `src/commands/verify-install.ts`, its tests, BUG-101's hook, the generated Codex copies, `build-codex-payload.mjs`, `init-fixture.ts`, and the two BUG-101 test files.
- `CHANGELOG.md` came out `UU`. Both sides had appended a `### Fixed` bullet directly after BUG-085's entry under `## Unreleased`.
- No path under `src/`, and no sealed test, was in conflict. BUG-047's three files (`src/lib/frontmatter-cache.ts`, `src/commands/sprint.ts`, `test/lib/gate-cache-staleness.red.node.test.ts`) are untouched by main (`git diff --quiet f0c33f7 main -- …` exit 0).

**CHANGELOG resolution (keep-both).**
- Main's BUG-101 bullet comes first, then BUG-047's 9-line bullet unchanged. Main's `### Added` line for STORY-058-13 is kept.
- I stripped the markers mechanically and then checked the result against an independent rebuild. The rebuild is `git show main:CHANGELOG.md` with BUG-047's 9 added lines (`git diff -U0 f0c33f7 8b7daf3 -- CHANGELOG.md`, `+` lines) spliced in after main's BUG-101 entry (line 60). The two files are `cmp`-identical, and the result has zero conflict markers.
- Staged tree: `2703a7b5`.

**TPV103-A7.** BUG-047 touches neither `test/helpers/init-fixture.ts` nor any generated Codex file, so the rule's union, regen and M2-pair steps do not apply. Main's generated files arrived without conflict, and `build-codex-payload.mjs --check` passes on the merged tree (§2).

**Merge-delta proof.** I measured on the staged tree `2703a7b5`; the committed `f036700` has the same tree.

| Proof | numstat | shortstat | full patch (`index` lines stripped) |
|---|---|---|---|
| `git diff main <merge>` vs `git diff f0c33f7 8b7daf3`: BUG-047's own set (QA-Red `cbb7248` +474, re-seal `9a44e4b` +169/−19, dev `8b7daf3`) | `cmp` identical | both 4 files, +691/−15 | Every `+`/`−` line is `cmp`-identical. The only difference is the CHANGELOG hunk: `@@ -58` vs `@@ -51`, with its 3 leading context lines. Main's BUG-101 entry now sits above the insertion. |
| `git diff 8b7daf3 <merge>` vs `git diff f0c33f7 main`: what main brought in | `cmp` identical | both 32 files, +6001/−74 | Every `+`/`−` line is `cmp`-identical. The only difference is the 3 trailing context lines of the second CHANGELOG hunk, because BUG-047's entry now follows main's. |

After the commit, `git diff main HEAD --stat` shows 4 files, +691/−15: `CHANGELOG.md` +9, `src/commands/sprint.ts` +20/−5, `src/lib/frontmatter-cache.ts` +38/−10, and `test/lib/gate-cache-staleness.red.node.test.ts` +624. That is BUG-047's set and nothing else.
- `main` is an ancestor of `story/BUG-047`.
- The sealed red file is byte-identical to `9a44e4b`.
- BUG-047's src is byte-identical to `8b7daf3`.
- Nothing from main is reverted.

## 2. Build and checks (`<cw>` only, rule 11)

- `npm run prebuild && npm run build`: exit 0. Payload 88, split view 107, manifest 82. The prebuild runs `build-codex-payload.mjs --check` first, and that passed. Only the gitignored `templates/**` and `dist/` were written; the index tree stayed `2703a7b5`, with no unstaged or untracked entries.
- `npm run typecheck`: exit 0.
- `node scripts/build-codex-payload.mjs --check`: exit 0.
- `node scripts/check-no-inline-id-regex.mjs`: exit 0 ("no inline work-item-id regexes").
- **`node scripts/verify-pack.mjs`: `OK — 232 files, payload 88, version 0.26.1`**, as expected.

## 3. Tests (`<cw>`, each file solo via `npm run test:file -- <f>`, counted from `^ℹ (tests|pass|fail|skipped) `)

Every result is from the first run, on the merged tree with the rebuilt dist, before the commit.

| Set | File | tests / pass / fail / skipped |
|---|---|---|
| BUG-047 | `test/lib/gate-cache-staleness.red.node.test.ts` | 5 / 5 / 0 / 0 |
| BUG-047 | `test/commands/sprint-preflight.node.test.ts` | 27 / 27 / 0 / 0 |
| BUG-047 | `test/lib/frontmatter-cache.node.test.ts` | 11 / 11 / 0 / 0 |
| BUG-047 | `test/lib/frontmatter-writers.red.node.test.ts` | 30 / 30 / 0 / 0 |
| BUG-047 | `test/commands/gate-unit.node.test.ts` | 30 / 30 / 0 / 0 |
| BUG-047 | `test/commands/stamp.node.test.ts` | 10 / 10 / 0 / 0 |
| BUG-047 | `test/wiki/lint-checks-gate.node.test.ts` | 6 / 6 / 0 / 0 |
| -13 | `test/scripts/codex-loop-evidence.red.node.test.ts` | 43 / 43 / 0 / 0 |
| -13 | `test/scripts/codex-loop-harness.red.node.test.ts` | 21 / 21 / 0 / 0 |
| -13 | `test/commands/verify-install-codex.red.node.test.ts` | 9 / 9 / 0 / 0 |
| -13 | `test/commands/verify-install-codex-shape.red.node.test.ts` | 20 / 20 / 0 / 0 |
| -13 | `test/commands/verify-install-codex-cli.red.integration.node.test.ts` | 2 / 2 / 0 / 0 |
| BUG-101 (extra witness, arrived via the merge) | `test/hooks/codex-dispatch-attribution.red.node.test.ts` | 6 / 6 / 0 / 0 |
| BUG-101 (extra witness) | `test/scripts/codex-sprint-execution-render.red.node.test.ts` | 3 / 3 / 0 / 0 |

**Totals:**
- BUG-047 set: 119 / 119. Every file hit its expected count (5, 27, 11, 30, 30, 10, 6).
- -13 set: 95 / 95. These are the same counts BUG-101-integrate recorded.
- BUG-101 witnesses: 9 / 9.
- **All 14 files: 223 / 223 / 0 / 0.**

No codex binary was used. The e2e harness-lane files (`codex-hooks`, `codex-loop`) were not run; they are outside this brief. The M2 pair was not run, because TPV103-A7 does not apply (§1). The M2 baseline dir was not touched.

No test wrote into the outer worktree (`<cw>/..`); its `git status --porcelain` stayed empty.

## 4. cli commit

- Before committing I re-checked that `main` was still `8c98177`, the staged tree was still `2703a7b5`, and the working tree had no unstaged changes.
- `git commit` with the brief's exact subject produced `f036700`, and `<cw>` is clean afterwards.
- I used `--no-commit` so the merge stayed staged until the tests were green (flashcard line 57).

## 5. Outer main checkout status

I captured `git -C /Users/ssuladze/Documents/Dev/ClearGate status --short` before the first test and again after the commit. The outer `HEAD` was `c4fac16e` both times.

**Before my tests ran:**
- the 4 ledger files;
- 48 modified `.cleargate/delivery/pending-sync/*.md` files, which are the concurrent merge lane's Rule-14 back-sync writes;
- `M .cleargate/FLASHCARD.md`;
- `M .cleargate/sprint-runs/SPRINT-41/close-followups.md` (+1 line);
- 29 untracked `.processed-*` markers;
- untracked `reports/BUG-100-dev.md`.

**After the commit:** the same list minus the 48 delivery files. The merge lane reverted those during my run. None of it came from this dispatch.

Beyond the 4 ledger files and untracked reports, the status therefore still shows `FLASHCARD.md` (M), `close-followups.md` (M) and the 29 `.processed-*` markers. All three were present before my first test, and I left them alone. This report is untracked.

## Cleanup and not touched

- **Scratch:** `/private/tmp/cg-s41-int047-20260927T105013Z/` held my logs, delta proofs, the CHANGELOG rebuild and my solo runner. I deleted it by exact path after writing this report. I never used the shared session scratchpad and never ran a script I did not write.
- **Not touched:**
  - `/private/tmp/cg-s41-m2-init-baseline`, `-fresh-journey`, `-int11-evidence`, `-fix11-evidence`, and `CG_TEST`;
  - `~/.codex`, any `CODEX_HOME`, and auth files;
  - no bare `cleargate`;
  - no `gate check`, `stamp` or `sprint preflight` against the meta-repo's delivery files;
  - no stash, reset, push or history rewrite. cli `main` was not moved.

## D4

BUG-047 adds +5 (TPV047-A4: 3671 / 3669 in the M7 chain; 3672 / 3670 in the reconciled chain at `M7.md:765/994`). The merge adds no default-tier tests beyond those already counted for -13 and BUG-101. I did not run the full suite; it runs in the merge lane only.

## Script Incidents

None. I did not invoke `run_script.sh`. Everything ran as `git`, `npm run …`, or `node scripts/…` inside `<cw>`, or through my own runner in my scratch dir.

```yaml
r_coverage:
  - { r_id: "R1", covered: true, deferred: false, clarified: false }
  - { r_id: "R2", covered: true, deferred: false, clarified: false }
  - { r_id: "R3", covered: true, deferred: false, clarified: false }
  - { r_id: "R4", covered: true, deferred: false, clarified: false }
  - { r_id: "R5", covered: true, deferred: false, clarified: false }
  - { r_id: "R6", covered: true, deferred: false, clarified: false }
plan_deviations:
  - { what: "BUG-101's two target files run as extra witnesses", why: "they arrived via the merge and are cheap; not required by the brief", orchestrator_confirmed: false }
adjacent_files:
  - "cleargate-cli/src/commands/gate.ts"
  - "cleargate-cli/src/commands/verify-install.ts"
  - ".claude/hooks/stamp-and-gate.sh"
```

```yaml
flashcards_flagged:
  - "2026-09-27 · #shell #zsh · zsh expands a word starting with = as a command path: echo ==== aborts the chain; quote it."
```
