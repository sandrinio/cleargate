role: developer

# STORY-058-12: Developer INTEGRATE report (cli main 0399beb, sprint/S-41 3236bdce)

```
STORY: STORY-058-12
STATUS: done
COMMIT: cli 9a94ff2f53c4792fd0f23058c81569646a890e59 (integrate(STORY-058-12): merge cli main 0399beb; parents 2695eea + 0399beb); gen:codex chore: none (--check exit 0, not stale); outer 929740d9f4ce9edeefc1dd15de96f042b27850e0 (integrate(STORY-058-12): merge sprint/S-41; parents c6aec444 + 3236bdce)
TYPECHECK: pass
TESTS: 76 distinct files, 1072 tests / 1070 pass / 1 fail / 1 skipped. The 1 fail is the named RS-5 red (sprint-execution-mirror "diff live vs canonical", exactly P1/P2). The 1 skip is the sealed static skip in close-sprint-step-2-6c.red (superseded by BUG-083), one of the full suite's 2 recorded skips. The 15 -12 files 155/155 (test 37 NOT RUN); M2 pair 5/5 + 15/15; TPV-A4 parity set all green; Rule-16 25 files 338/338.
FILES_CHANGED: cli test/helpers/init-fixture.ts (merge resolution only, row level). No src, scaffold, script or sealed-test edits. Outer: the 5 twins re-derived and left uncommitted.
```

This was a mechanical integration. No feature work was done, and no file changed except the row-level rebuild of the `init-fixture.ts` tail. `contract/S-41-loop` is still `2695eea` (not moved). cli `main` is still `0399beb`.

## Where

- `<cw>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-12/cleargate-cli`, `story/STORY-058-12`: `2695eea` → `9a94ff2`.
- `<ow>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-12`, `story/STORY-058-12`: `c6aec444` → `929740d9`.
- Pre-flight state:
  - `<cw>` was clean.
  - `<ow>` showed exactly the 5 twins: ` M` launch_wave.mjs, protocol, enforcement; `??` dispatch_serial.mjs, lib/flashcard-gate.mjs.
- Untouched: the cli main checkout (read-only `rev-parse` only), the outer main checkout's git state and `.cleargate/delivery/**`, and `.worktrees/BUG-098`.

## 1. cli merge and conflict resolution

**Read-only pre-check.**
- `git merge-base --all HEAD main` returns **two** bases, `44ba381` (the -11 Dev commit) and `e22a408` (the CR-124 Dev commit). The history is criss-cross because C2 `8c8c5ff` merged both before `main` did.
- `git merge-tree --write-tree --name-only HEAD main` predicted exactly one conflict, `test/helpers/init-fixture.ts`. It predicted auto-merges for `scripts/clean-room/evidence.mjs` and `test/scripts/codex-hooks-harness.red.node.test.ts`.
- `git diff 8c8c5ff 0399beb --stat` covered 32 files, +3121/−473: BUG-096, BUG-097, BUG-090, -11's integrate commits and fixes, and CR-124's re-sync.
  - It includes none of -12's pass-A canonical files (launch_wave, protocol, enforcement, SKILL.md) and not `CHANGELOG.md`.
  - Main's `init-fixture.ts` side adds 3 things:
    - BUG-096's `TRACKED_TMP_DIRS`/`trackedTmpDirs()`;
    - BUG-090's 5 delta rows after -10's;
    - a move of -11's 4 hook rows from before CR-124's block to after the shared `STORY-058-11+CR-124` row.

`git -C <cw> merge --no-ff main -m "integrate(STORY-058-12): merge cli main 0399beb"`:
- There was one conflict, `test/helpers/init-fixture.ts`, as forecast.
- `CHANGELOG.md` did not conflict, because main has not touched it since C2. -12's 1 line is the only change, so no keep-both edit was needed.
- No src, scaffold, script or `*.red.*` file conflicted. `codex-hooks-harness.red` auto-merged, as the TPV forecast said.

**Resolution.** I rebuilt the file from each side's `git show` tip instead of editing hunks (flashcards `#merge #init-fixture`, `#test-harness #init #merge`).
1. Take `git show main:test/helpers/init-fixture.ts` verbatim.
2. From `git show 2695eea:…`, cut -12's two blocks, each from its `// ── STORY-058-12` header to the line before the next `]);`:
   - block 1: 14 lines, the header plus the protocol row;
   - block 2: 35 lines, the comment plus 3 additions.
3. Insert block 1 before main's `SANCTIONED_BASELINE_DELTAS` `]);` (main `:833`). Insert block 2 before main's `SANCTIONED_BASELINE_ADDITIONS` `]);` (main `:895`).

**Independent check before staging.**
- `diff main resolved` gives two pure insertions (`829a830,843` and `894a909,943`) and deletes 0 lines.
- The 49 added lines are byte-identical (`cmp`) to the lines -12 added against C2: `diff 8c8c5ff 2695eea` shows the same 2 insertions, and -12 deleted 0 lines.
- No conflict markers remain, and `git diff --cached --check` is clean.
- Every `rel:` value appears exactly once across both arrays.

**Whole-merge delta proof.**
- `git diff main <merged>` against `git diff 8c8c5ff 2695eea`:
  - the same 34 paths (`cmp` of the name lists);
  - the same shortstat, +5287/−28;
  - for every one of the 34 files, the same `+`/`−` line set (per-file sha compare, 0 differences).
- The integration adds nothing from main to -12's delta and drops nothing from it.

**Resulting tail order** (`init-fixture.ts`, integrated):

| # | item | rel | line |
|---|---|---|---|
| 1 | STORY-058-06 | `.cleargate/.install-manifest.json` | 517 |
| 2 | STORY-058-07 | `.claude/settings.json` | 529 |
| 3-4 | BUG-085 | `pending-task-sentinel.sh`, `validate_state.mjs` | 541, 557 |
| 5-7 | STORY-058-10 | `pre-edit-gate.sh`, `stamp-and-gate.sh`, `token-ledger.sh` | 570-601 |
| 8-12 | BUG-090 | `templates/epic.md`, `story.md`, `hotfix.md`, `assert_story_files.mjs`, `close_sprint.mjs` | 620-657 |
| 13-18 | CR-124 | `architect.md`, `architect-synth.md`, `architect-reader.md`, `sprint-execution/SKILL.md`, `launch_wave.mjs`, `Sprint Plan Template.md` | 671-748 |
| 19 | STORY-058-11+CR-124 | `.cleargate/knowledge/cleargate-enforcement.md` | 767 |
| 20-23 | STORY-058-11 | `session-start.sh`, `pre-tool-use-task.sh`, `pre-tool-use-autonomy.sh`, `pre-commit-surface-gate.sh` | 787-823 |
| **24** | **STORY-058-12** | **`.cleargate/knowledge/cleargate-protocol.md`** | **836** |
| — | `]);` | | 847 |

`SANCTIONED_BASELINE_ADDITIONS`:
- STORY-058-11 `.claude/hooks/lib/harness.sh` (`:900`);
- then **STORY-058-12** `dispatch-serial.md` (`:913`), `dispatch_serial.mjs` (`:924`), `lib/flashcard-gate.mjs` (`:935`).

This matches the E5 forecast, "DELTAS …-11 ×4, -12 ×1; ADDITIONS -11, then -12 ×3". If BUG-098 merges to `main` first, its 2 rows land after -11's 4 on `main`, and a re-integrate applies the same recipe: upstream rows first, then -12's rows.

The cli merge stayed staged through every test run and was committed only after all sets were green (rule 12; same order as the previous integrates).

## 2. Regenerate and build (`<cw>`)

- `node scripts/build-codex-payload.mjs --check`: exit 0, not stale. No `gen:codex` chore commit was needed.
- `npm run prebuild && npm run build`: exit 0 (log at `/private/tmp/cg-s41-int12-work/build.log`).
  - Prebuild composed a payload of **88** files, a split view of **107** and a manifest of **82**: exactly the TPV-A5 numbers.
  - Only the gitignored `templates/**` and `dist/` were written.
- `npm run typecheck`: exit 0.
- `node scripts/check-no-inline-id-regex.mjs`: `no inline work-item-id regexes`, exit 0.
- `node scripts/check-no-exec-mode-vocab.mjs`: `no dead execution_mode/v1/v2 vocabulary`, exit 0.
- **`node scripts/verify-pack.mjs`: `OK — 232 files, payload 88, version 0.26.1`**, matching the 232/88 forecast (from 222/83).

## 3. Outer merge and twins (done before the tests, because the tests read META_ROOT = `<ow>`)

1. `git -C <ow> merge --no-ff sprint/S-41` **refused** on `.cleargate/knowledge/cleargate-enforcement.md` and `.cleargate/scripts/launch_wave.mjs`. sprint/S-41 moved those two files through -11's and CR-124's twin commits.
2. I confirmed that all 5 build copies were `cmp`-equal to `git show 2695eea:scaffold/core/<rel>`, so discarding them lost nothing.
3. I ran `git -C <ow> checkout -- .cleargate/scripts/launch_wave.mjs .cleargate/knowledge/cleargate-protocol.md .cleargate/knowledge/cleargate-enforcement.md`.
   - The two new twins (`dispatch_serial.mjs`, `lib/flashcard-gate.mjs`) are untracked. `git checkout --` cannot address them, and they do not block the merge, since sprint/S-41 does not add them. `cp` overwrote them in step 5.
   - No stash was used.
4. `git -C <ow> merge --no-ff sprint/S-41 -m "integrate(STORY-058-12): merge sprint/S-41"` was clean, 75 files. `git diff sprint/S-41 929740d9 --name-only` is empty: the committed outer tree equals sprint/S-41 `3236bdce`.
5. I re-derived the twins with `cp <cw>/scaffold/core/<rel> <ow>/<rel>`, then `cmp`.

| Twin (`<ow>/…`) | `cmp` vs integrated canonical | mode live / canonical (`stat -f %Lp`) | index mode outer / cli | sha256 |
|---|---|---|---|---|
| `.cleargate/scripts/launch_wave.mjs` | identical | 644 / 644 | 100644 / 100644 | `b26505e8e75ec0464d0c0eb270d87427f00980ef482f1569d771326bf7cf1070` |
| `.cleargate/scripts/dispatch_serial.mjs` | identical | 644 / 644 | untracked / 100644 | `862e72f43168b2594c1c19d4a9ce1641af6b89efcc06fb62fdb6a8b3fb3a61b7` |
| `.cleargate/scripts/lib/flashcard-gate.mjs` | identical | 644 / 644 | untracked / 100644 | `95f3811523d95096333ff71b5bea9f41d681c16eb71373466b3beb7defc6b415` |
| `.cleargate/knowledge/cleargate-protocol.md` | identical | 644 / 644 | 100644 / 100644 | `a95a5382f0359b1b79522615af22ae4edfac77c8d8d36c715784e6a9babb405a` (TPV-A3) |
| `.cleargate/knowledge/cleargate-enforcement.md` | identical | 644 / 644 | 100644 / 100644 | `22a09dab3b813f98d9bbf242c526e8fd6fda35500c47f79e133e9283661abaac` (TPV-A3) |

- The hashes are unchanged from the build phase (dev report twin table), as TPV-A3 predicted ("unchanged on the integrated tree").
- The live copies on sprint/S-41 of launch_wave, protocol and enforcement are `cmp`-equal to `git show main:scaffold/core/<rel>`, so each outer twin diff is exactly -12's delta.
- The enforcement twin carries -11's §16 (`:591`, with bullet 10 at `:604`) and -12's §17 (`:606`). Its Index rows read `§15`, `§16`, `§17` in order (`:21-23`).

## 4. Tests (`<cw>`, each file solo via `npm run test:file -- <f>`, counted with `command grep -aE "^ℹ (tests|pass|fail|skipped) "`)

Per-file logs are in `/private/tmp/cg-s41-int12-logs/`. Everything below is from the first run, with no re-runs.

| Set | Files and counts | tests / pass / fail / skipped |
|---|---|---|
| The 15 -12 files | dispatch-verdict-modes 5, dispatch-serial 8, dispatch-serial-cli 7, flashcard-gate-parity 14, skill-md-serial-pointers 3, dispatch-serial-doc 3, serial-dispatch-docs 2, serial-twins 1, dispatch-mode 2, codex-sprint-execution-render 3, init-codex-sprint-execution 3, portable-skills 6, **codex-hooks-harness 91**, lifecycle-codex 6, claude-dispatch-path (e2e) 1 (`ℹ NOT RUN`) | **155 / 155 / 0 / 0** |
| TPV-A4 parity plus named reds | close-sprint-step-2-6c.red 9 (8 pass + 1 static skip; S5 mirror parity now ✔), close-sprint-step-2-6c-archive 2, close-sprint-step-7-4 6, template-claude-md 18, wiki-ingest-sprint-report 15, gate-section-index-pinning 14 (S1c cleared), contract-first-dag-text 10 (T5 cleared) | 74 / 73 / 0 / 1 |
| CR-124 launch_wave suites | waves-json-v2 7, wave-execution-barrier 23 (contract-first-dag-text counted above) | 30 / 30 / 0 / 0 |
| M2 pair (`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, compare only) | claude-adapter-init-parity 5, init-host-parity 15 | **20 / 20 / 0 / 0** (5/5 + 15/15) |
| STORY-058-11 suites | hooks-claude-parity.red.integration 19; portable-skills 6, codex-hooks-harness 91 and lifecycle-codex 6 (run in the -12 set) | **122 / 122 / 0 / 0** (harness 91/91 = forecast) |
| E8 anchors (20 files) | bug-034 5, skill-md-conditional-architect 18, skill-md-consolidation-d5 18, autonomy-contract 30, test-layers-declared-doctrine 11, enforcement-doc-coherence 26, no-execution-mode-vocabulary 9, no-exec-mode-vocab 4, no-inline-id-regex 7, codex-agents-codegen 30, codex-payload 14, init-codex 6, verify-install-codex 9, init-host-snapshot 13, host-adapter-contract 19, init-host-selection 10, enforcement-section-13 11, ratchet-retired 8, file-surface-gate-e2e 21, codex-enforcement-delta 15 | **284 / 284 / 0 / 0** |
| Rule-16 sweep (no override; default META_ROOT = `<ow>`) | `command grep -rl CLEARGATE_META_ROOT test` = 26 paths, minus `test/helpers/scaffold-roots.ts` = 25 files (22 default, 3 integration) | **338 / 338 / 0 / 0** |
| Adjacency (beyond the brief; surfaces the merge touched) | init-fixture-cleanup.red 3, init 34, init-from-source 11, clean-room-evidence.red 60, clean-room-baseline-coexistence.red 24, harness-shim.red 18, frontmatter-fence-parity.red 21, assert-story-files-fence.red 11, template-approved-key.red 7, close-sprint-fence.red 4, verify-install.red 42 | 235 / 235 / 0 / 0 |
| RS-5 integration tier (recorded, not chased) | canonical-live-parity.red.integration **11/11** (5a and 5d both cleared at integration); sprint-execution-mirror.integration **3/4** | 15 / 14 / 1 / 0 |

**Distinct files: 76, 1072 tests / 1070 pass / 1 fail / 1 skipped.**

Reconciliations:
- **The 15 -12 files: 155, not 149.** The build-phase 149 had `codex-hooks-harness` at 85, which was C2's 84 plus -12's 1. Main carries -11's 90 (its integrate and fix commits), so the integrated count is 91 = 90 + 1. Every other file matches the dev report.
- **Rule-16: 338** = BUG-098's 335 over 23 files, plus `serial-dispatch-docs` 2 and `serial-twins` 1 (new with -12). No file dropped out.
- **The one fail** is `sprint-execution-mirror` "diff live vs canonical". The diff is exactly `104a105,106` and `271a274,275`, -12's P1/P2 (4 lines). It is named in E8 and clears at RS-5. The same diff doubles as the E8 integration witness: `git diff --numstat main -- scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md` = `4 0`.
- **The one skip** is a sealed `skip:` in close-sprint-step-2-6c.red ("superseded by BUG-083"), which predates this sprint's changes. It is not a red.
- **`init-from-source`** is 11/11 solo (TPV-A4 flake not triggered).

**M2 baseline not written:**
- 425 files before and after;
- aggregate `find … -type f -exec shasum -a 256 {} + | sort -k2 | shasum -a 256` = `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` before and after (matches the BUG-098 witness);
- `find <baseline> -newer <pre-run marker>` returns 0;
- `CLEARGATE_INIT_BASELINE_CAPTURE` was unset.

## 5. Hygiene

- `git -C <ow> status --porcelain` shows exactly the 5 twins: ` M` enforcement, protocol and launch_wave; `??` dispatch_serial.mjs and lib/flashcard-gate.mjs. No test wrote into `<ow>/.cleargate/delivery/**` or the wiki, so nothing was reverted. `push-hierarchy` was not run. No delivery item was ticked or edited.
- `git -C <cw> status --porcelain` is empty.
- Refs:
  - `contract/S-41-loop` = `2695eea`, unchanged;
  - cli `main` = `0399beb`, unchanged;
  - `git merge-base --is-ancestor main story/STORY-058-12` passes in cli.
- Scratch kept as evidence: `/private/tmp/cg-s41-int12-work` (build log, resolution inputs, result tables) and `/private/tmp/cg-s41-int12-logs` (per-file logs). Delete them by exact path once QA-Verify is done. No protected temp dir was touched.
- **sprint/S-41 moved during this dispatch**, after my outer merge, from `3236bdce` to `4d6f3a99`.
  - The 2 new commits are BUG-098 bookkeeping only: `3a6c408f` qa(BUG-098) and `4d6f3a99` chore(BUG-098) ticks.
  - Their paths are `FLASHCARD.md`, the BUG-098 item, one `.processed-*` marker and `reports/BUG-098-qa2.md`. None is on -12's surface or a twin path, and `git merge-tree` against `929740d9` is clean.
  - The DevOps re-sync check `git -C OUTER merge-base --is-ancestor sprint/S-41 story/STORY-058-12` will therefore **fail** until one more outer merge. Per replan §6 step 8, QA-Verify need not be re-run for that merge, because it has no conflict and does not touch -12's surface.
  - I did not add a second outer merge. BUG-098's DevOps merge is imminent: its live-twin row waits on the DevOps outer commit, and its merge moves both cli `main` and `sprint/S-41` again. That forces a full re-integrate, with BUG-098's 2 rows joining main's tail ahead of -12's row.

## 6. Expected DevOps full suite

- **3486 + 52 = 3538 tests / 3536 pass / 0 fail / 2 skipped** on the `0399beb` base (the previous recorded total, STORY-058-11 `667e8bce`).
- **3513 + 52 = 3565 / 3563 / 0 / 2** if BUG-098 (+27) merges first.

Measured delta:
- 11 new default-tier files = 51 (5+8+7+14+3+3+2+1+2+3+3);
- `codex-hooks-harness` 90 → 91 = +1;
- `portable-skills` 6 → 6 and `lifecycle-codex` 6 → 6, both amended in place.

That totals **+52**. The e2e (test 37) is integration tier (+1), which `npm test` excludes. There is no QA-Red re-scope, and no deviation from E9 or D4.

Post-BD witnesses DevOps should expect:
- verify-pack 232/88 (from 222/83);
- `--check` exit 0;
- the M2 pair 5/5 + 15/15;
- doctor: exactly 2 `scaffold drift:` lines (sprint-execution `SKILL.md`, `dispatch-serial.md`) until RS-5 (E9).

## Script Incidents

None. No `.cleargate/scripts/*` invocation needed `run_script.sh`. Everything was `git`, `npm run …`, `node scripts/…` inside `<cw>`, or `cp`/`cmp`/`shasum`/`python3` splice-and-verify steps.

```yaml
r_coverage: []
plan_deviations:
  - { what: "checkout -- on 3 tracked twins, not 5", why: "the 2 new twins are untracked, so git checkout -- cannot address them and they do not block the merge; cp overwrote them after the merge", orchestrator_confirmed: false }
  - { what: "no second outer merge after sprint/S-41 moved to 4d6f3a99", why: "BUG-098 bookkeeping only, off -12's surface, merge-tree clean; BUG-098's imminent DevOps merge forces a full re-integrate anyway", orchestrator_confirmed: false }
adjacent_files:
  - "cleargate-cli/test/helpers/init-fixture.ts"
  - "cleargate-cli/test/scaffold/sprint-execution-mirror.integration.node.test.ts"
  - "cleargate-cli/test/scripts/codex-hooks-harness.red.node.test.ts"
flashcards_flagged:
  - "2026-09-27 · #merge #integrate · git merge-tree --write-tree --name-only HEAD main previews conflicts read-only, even on a criss-cross base."
  - "2026-09-27 · #integrate #twins · git checkout -- errors on an untracked new twin; discard only tracked twins, then cp overwrites the new ones."
```
