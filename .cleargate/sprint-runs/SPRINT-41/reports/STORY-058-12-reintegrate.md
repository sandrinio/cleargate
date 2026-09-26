role: developer

# STORY-058-12: Developer RE-INTEGRATE report (cli main e720592, sprint/S-41 23d9e324)

```
STORY: STORY-058-12
STATUS: done
COMMIT: cli 31a8a1826cb21860cad604e77a8e7584ffbe5441 (integrate(STORY-058-12): re-sync cli main e720592; parents 9a94ff2 + e720592; tree 54c6b35f)
        outer b742af88f137baf9f62e30968312ef5e0c46a37d (integrate(STORY-058-12): re-sync sprint/S-41; parents 929740d9 + 23d9e324)
        gen:codex chore: none (--check exit 0)
TYPECHECK: pass
TESTS: the 15 -12 files 155/155/0/0 (harness 91); BUG-098 12 default files 139/139/0/0 plus e2e 1/1; M2 pair 5/5 + 15/15; rule-16 sweep 25 files 338/338/0/0; named red sprint-execution-mirror 3/4 (RS-5, P1/P2 only). 56 distinct files, 659 tests / 658 pass / 1 fail (named) / 0 skipped.
FILES_CHANGED: cli test/helpers/init-fixture.ts (merge resolution only, row level). No src, scaffold, script, fixture or sealed-test edit. Outer: the 5 twins re-derived and left uncommitted.
```

This was a mechanical re-integration per `plans/M6.md` PF12-A2. No feature work was done, and the only file changed is the `init-fixture.ts` tail rebuild.

## Where

- `<cw>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-12/cleargate-cli`, `story/STORY-058-12`: `9a94ff2` → `31a8a18`.
- `<ow>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-12`, `story/STORY-058-12`: `929740d9` → `b742af88`.

**Pre-flight state.**
- `<cw>` was clean.
- `<ow>` showed exactly the 5 twins.
- cli `main` = `e720592`.
- `contract/S-41-loop` = `9a94ff2`.

**sprint/S-41 moved during the dispatch,** from `48766519` to `23d9e324`, before my outer merge.
- The new commit is `chore(BUG-099)`, registration bookkeeping only. It touches the BUG-099 item, the sprint plan, `waves.json`, `sprint-context.md` and 4 wiki files.
- It touches no twin path and nothing on -12's surface.
- The merge took the current tip, so `merge-base --is-ancestor sprint/S-41 story/STORY-058-12` holds at `23d9e324`.

**Untouched:**
- the cli main checkout (read-only `rev-parse` only);
- the outer main checkout's git state (`status --porcelain` is byte-identical before and after all tests);
- `.worktrees/STORY-058-13`;
- `contract/S-41-loop`, still `9a94ff2`.

## 1. cli merge and resolution

**Read-only pre-check.**
- `git merge-base --all HEAD main` = `0399beb` only; the criss-cross is gone.
- `git merge-tree --write-tree --name-only HEAD main` predicted exactly one conflict, `test/helpers/init-fixture.ts`.

`git -C <cw> merge --no-ff main -m "integrate(STORY-058-12): re-sync cli main e720592"`:
- There was one conflict (`UU test/helpers/init-fixture.ts`), as forecast.
- The other 25 BUG-098 paths auto-merged: `src/commands/{doctor,sprint,wiki-audit-status}.ts`, `src/lib/*`, 2 `scaffold/core` scripts and its tests. There was no other conflict.

**Resolution (PF12-A2).** I rebuilt the file from each side's `git show` tip, not from hunks.
1. `git show main:test/helpers/init-fixture.ts` verbatim (1130 lines).
2. From `git show 2695eea:…`, cut block 1 (`:752-765`, 14 lines: the `// ── STORY-058-12` header plus the protocol row) and block 2 (`:828-862`, 35 lines: the comment plus 3 additions).
3. Insert block 1 before main's DELTAS `]);` (`:868`) and block 2 before main's ADDITIONS `]);` (`:930`). The result has 1179 lines.

**Checks before staging.**
- `diff main resolved` has 0 deleted lines. The 49 added lines are byte-identical and in the same order as `diff 8c8c5ff 2695eea`'s 49 added lines (`cmp` of the `>` streams). -12 deleted 0 lines against C2.
  - BSD `diff` reports the hunks as `864a865,878` and `929a944,978`. PF12-A2's `867a868,881` is the same insertion: block 1 ends with `: h; }, },`, which is also the BUG-098 row's suffix, so the reported offset shifts by 3 lines (flashcard `#test-harness #init #merge`, line 56).
- 0 conflict markers; `git diff --cached --check` is clean.
- 30 `rel:` rows across both arrays (26 DELTAS + 4 ADDITIONS), with 0 duplicates.

**Resulting order** (committed `init-fixture.ts`):

| # | item | rel | line |
|---|---|---|---|
| 1 | STORY-058-06 | `.cleargate/.install-manifest.json` | 516 |
| 2 | STORY-058-07 | `.claude/settings.json` | 528 |
| 3-4 | BUG-085 | `pending-task-sentinel.sh`, `validate_state.mjs` | 540, 556 |
| 5-7 | STORY-058-10 | `pre-edit-gate.sh`, `stamp-and-gate.sh`, `token-ledger.sh` | 569-600 |
| 8-12 | BUG-090 | `epic.md`, `story.md`, `hotfix.md`, `assert_story_files.mjs`, `close_sprint.mjs` | 619-656 |
| 13-18 | CR-124 | `architect.md`, `architect-synth.md`, `architect-reader.md`, `sprint-execution/SKILL.md`, `launch_wave.mjs`, `Sprint Plan Template.md` | 670-747 |
| 19 | STORY-058-11+CR-124 | `.cleargate/knowledge/cleargate-enforcement.md` | 766 |
| 20-23 | STORY-058-11 | `session-start.sh`, `pre-tool-use-task.sh`, `pre-tool-use-autonomy.sh`, `pre-commit-surface-gate.sh` | 786-822 |
| **24-25** | **BUG-098** | **`prep_reporter_context.mjs`, `dedupe_frontmatter.mjs`** | **837, 853** |
| **26** | **STORY-058-12** | **`.cleargate/knowledge/cleargate-protocol.md`** | **870** |
| — | `]);` | | 882 |

`SANCTIONED_BASELINE_ADDITIONS`:
- STORY-058-11 `.claude/hooks/lib/harness.sh` (`:934`);
- then **STORY-058-12** `dispatch-serial.md` (`:947`), `dispatch_serial.mjs` (`:958`), `lib/flashcard-gate.mjs` (`:969`);
- `]);` at `:979`.

This is PF12-A2's order: DELTAS …, -11 ×4, BUG-098 ×2, STORY-058-12 ×1; ADDITIONS -11 `harness.sh`, then -12 ×3; one row per `rel`.

### Equality proofs

These were measured on the staged merge tree (`git write-tree` = `54c6b35f`). The committed `31a8a18` has that same tree.

| Proof | numstat | shortstat | per-file `+`/`−` line sets |
|---|---|---|---|
| `git diff main HEAD` vs `git diff 8c8c5ff 2695eea` | `cmp` identical (34 files) | both 34 files, +5287/−28 | 0 of 34 files differ (sorted `+`/`−` lines, sha256 per file) |
| `git diff 9a94ff2 HEAD` vs `git diff 0399beb main` | `cmp` identical (26 files) | both 26 files, +2018/−118 | 0 of 26 files differ |

The integration adds nothing from `main` to -12's delta and drops nothing from it. The only thing that moved onto -12 is BUG-098's own delta.

The cli merge stayed staged through every test run. It was committed only after all sets were green (rule 12). The index tree was re-checked as `54c6b35f` after the build and after the tests.

## 2. Checks and build (`<cw>`)

- **Codex payload:** `node scripts/build-codex-payload.mjs --check` exited 0. Nothing was regenerated.
- **Fixture hashes:** unchanged. `git show main:<path> | shasum -a 256`:
  - `SKILL.md` `e7c730efde50df07…`;
  - `launch_wave.mjs` `090881968a62b40b…`;
  - protocol `be92d45a217ca4a5…`.
  The committed fixtures `test/fixtures/skill-pre-058-12/SKILL.md` and `test/fixtures/launch-wave-pre-058-12/launch_wave.mjs` hash to the same first two values. No re-freeze was needed.
- **Build:** `npm run prebuild && npm run build` exited 0. The log is at `/private/tmp/cg-s41-reint12-work/build.log`.
  - Prebuild composed a payload of **88**, a split view of **107** and a manifest of **82**.
  - Only the gitignored `templates/**` and `dist/` were written, and the index was unchanged.
- **Typecheck and vocab gates:**
  - `npm run typecheck`: exit 0.
  - `node scripts/check-no-inline-id-regex.mjs`: `no inline work-item-id regexes`, exit 0.
  - `node scripts/check-no-exec-mode-vocab.mjs`: `no dead execution_mode/v1/v2 vocabulary`, exit 0.
- **`node scripts/verify-pack.mjs`: `OK — 232 files, payload 88, version 0.26.1`**, the 232/88 forecast. BUG-098 adds no payload file.

## 3. Outer merge and twins (done before the tests; META_ROOT = `<cw>/..` = `<ow>`)

1. **Preview.** `git merge-tree` was clean. None of the 33 upstream paths since merge base `3236bdce` touches a twin.
2. **Build copies.** All 5 were `cmp`-equal to the integrated canonical `<cw>/scaffold/core/<rel>`.
3. **Merge.** `git -C <ow> merge --no-ff sprint/S-41 -m "integrate(STORY-058-12): re-sync sprint/S-41"` **did not refuse**, so no `checkout --` was needed. It was clean, and the outer pre-commit ran and passed.
   - `git diff sprint/S-41 HEAD --name-only` is empty: the committed tree equals sprint/S-41 `23d9e324`.
   - No stash was used.
4. **Re-derive.** I ran `cp <cw>/scaffold/core/<rel> <ow>/<rel>`, then `cmp`, for all 5 twins.

| Twin (`<ow>/…`) | `cmp` vs integrated canonical | mode live / canonical | index mode outer / cli | sha256 |
|---|---|---|---|---|
| `.cleargate/scripts/launch_wave.mjs` | identical | 644 / 644 | 100644 / 100644 | `b26505e8e75ec0464d0c0eb270d87427f00980ef482f1569d771326bf7cf1070` |
| `.cleargate/scripts/dispatch_serial.mjs` | identical | 644 / 644 | untracked / 100644 | `862e72f43168b2594c1c19d4a9ce1641af6b89efcc06fb62fdb6a8b3fb3a61b7` |
| `.cleargate/scripts/lib/flashcard-gate.mjs` | identical | 644 / 644 | untracked / 100644 | `95f3811523d95096333ff71b5bea9f41d681c16eb71373466b3beb7defc6b415` |
| `.cleargate/knowledge/cleargate-protocol.md` | identical | 644 / 644 | 100644 / 100644 | `a95a5382f0359b1b79522615af22ae4edfac77c8d8d36c715784e6a9babb405a` |
| `.cleargate/knowledge/cleargate-enforcement.md` | identical | 644 / 644 | 100644 / 100644 | `22a09dab3b813f98d9bbf242c526e8fd6fda35500c47f79e133e9283661abaac` |

- All 5 hashes equal PF12-A2's expected values.
- The sprint/S-41 (HEAD) copies of launch_wave, protocol and enforcement equal `git show main:scaffold/core/<rel>`: `09088196…`, `be92d45a…`, `477b404f…`. Each outer twin diff is therefore exactly -12's delta.
- The twins are left uncommitted.

## 4. Tests (`<cw>`, each file solo via `npm run test:file -- <f>`, counted from `^ℹ (tests|pass|fail|skipped) `)

The per-file logs (56) are in `/private/tmp/cg-s41-reint12-logs/`. All results are first-run.

| Set | Files and counts | tests / pass / fail / skipped |
|---|---|---|
| The 15 -12 files (`git diff --name-only 8c8c5ff 2695eea -- test/`) | init-codex-sprint-execution 3, lifecycle-codex 6, serial-dispatch-docs 2, claude-dispatch-path (e2e) 1 (`ℹ NOT RUN: set CLEARGATE_CLAUDE_E2E=1 …`), dispatch-mode 2, dispatch-serial-doc 3, portable-skills 6, skill-md-serial-pointers 3, **codex-hooks-harness 91**, codex-sprint-execution-render 3, dispatch-serial-cli 7, dispatch-serial 8, dispatch-verdict-modes 5, flashcard-gate-parity 14, serial-twins 1 | **155 / 155 / 0 / 0** |
| BUG-098's 12 default files (`git diff --name-only 0399beb main -- test/`) | doctor-fence 3, gate-unit 30, sprint-archive 18, sprint-frontmatter-fence 5, frontmatter-merge 8, frontmatter-yaml-splice 4, intake 9, lifecycle-reconcile-fence 2, slug 14, scripts-fence-bug098 4, audit-status 14, contradict 28 | **139 / 139 / 0 / 0** |
| BUG-098 e2e | sprint-allow-drift-fresh-install.red.integration | **1 / 1 / 0 / 0** |
| M2 pair (`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, `CLEARGATE_INIT_BASELINE_CAPTURE` unset) | claude-adapter-init-parity 5, init-host-parity 15 | **20 / 20 / 0 / 0** (5/5 + 15/15) |
| Rule-16 sweep (`command grep -rl CLEARGATE_META_ROOT test` = 26, minus `test/helpers/scaffold-roots.ts` = 25; override unset) | new-command 57, no-exec-mode-vocab 4, claude-md-block-leads-relocation 4, clean-room-verification-doc 9, codex-enforcement-delta 15, contract-first-dag-text 10, serial-dispatch-docs 2, test-layers-declared-doctrine 11, frontmatter-authoring.integration 9, spidr-coverage.integration 1, hook-signal.integration 3, hook-signal 14, pre-tool-use-task 13, token-ledger-attribution 9, token-ledger-regression 14, readiness-predicates-spidr-coverage 32, readiness-predicates-test-layers-declared 17, enforcement-doc-coherence 26, file-surface-gate-e2e 21, pre-commit-downstream-safe 12, ratchet-retired 8, close-sprint-assume-ack-guard 20, scaffold-relocation 15, serial-twins 1, bucket-registry-parity 11 | **338 / 338 / 0 / 0** |
| Named red (RS-5) | sprint-execution-mirror.integration: 3/4. The fail is "diff command on live vs canonical returns empty output"; the diff is exactly `104a105,106` + `271a274,275`, -12's P1/P2 serial-dispatch lines | **4 / 3 / 1 / 0** |

**Distinct files: 56** (serial-dispatch-docs and serial-twins appear in both the -12 set and rule-16). **659 tests / 658 pass / 1 fail (named) / 0 skipped.** No other red.

**Reconciliation.** Every set matches PF12-A2's "Expected verification" and the architect's measured scratch numbers:
- the -12 file counts;
- BUG-098's count multiset {4,5,18,2,30,3,14,8,28,14,9,4};
- M2 5 + 15;
- rule-16 338.

**Harness miss (mine, not a test failure).** My first M2 loop passed both paths to one `npm run test:file` as a single argument, because zsh does not word-split `$var`. tsx printed `Could not find …` and ran nothing. I deleted that log and re-ran with explicit paths; the table above is from that re-run. The baseline was unaffected (next paragraph).

**M2 baseline not written.**
- 425 files before and after.
- The aggregate `find <baseline> -type f -exec shasum -a 256 {} + | sort -k2 | shasum -a 256` = `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` before and after, matching the BUG-098 and integrate witnesses.
- `find <baseline> -newer <pre-run marker>` returns 0.

## 5. Hygiene

- **`<ow>`:** `git status --porcelain` shows exactly the 5 twins (` M` enforcement, protocol and launch_wave; `??` dispatch_serial.mjs and lib/flashcard-gate.mjs), byte-identical to the pre-test snapshot. No test wrote into `<ow>/.cleargate/delivery/**`, the wiki or `cleargate-planning/`, so nothing was reverted. No delivery item was ticked or edited.
- **`<cw>`:** `git status --porcelain` is empty.
- **Outer main checkout:** `git status --porcelain` is byte-identical before and after all tests (the 4 orchestrator ledger/state files only).
- **Refs:**
  - cli `main` = `e720592`, unchanged, and an ancestor of `story/STORY-058-12`;
  - `contract/S-41-loop` = `9a94ff2`, unchanged;
  - sprint/S-41 = `23d9e324`, merged.
- **Scratch:**
  - kept as evidence: `/private/tmp/cg-s41-reint12-work` (build log, resolution inputs, numstat proofs, tables, status snapshots) and `/private/tmp/cg-s41-reint12-logs` (56 per-file logs);
  - deleted by exact path, as permitted: `/private/tmp/cg-s41-int12-work` and `/private/tmp/cg-s41-int12-logs`;
  - not touched: the protected dirs.
- **Not run:** no clean-room harness, `CODEX_HOME`, `~/.codex`, codex binary or bare `cleargate`.

## 6. DevOps forecast

- **Full suite: 3565 tests / 3563 pass / 0 fail / 2 skipped.** That is BUG-098's recorded 3513 / 3511 / 0 / 2 (`reports/BUG-098-devops.md:11`) plus 52:
  - 11 new default-tier files = 51;
  - `codex-hooks-harness` 90 → 91 = +1.
  The -12 e2e is integration tier and is excluded by `npm test`.
- **Two transient first-pass reds before BD (PF12-A3).** They come from the stale main-checkout `templates/`, flashcard `#devops #test-order`:
  - `test/scaffold/skill-md-conditional-architect.red.node.test.ts` S5 ("payload SKILL.md is byte-identical to canonical");
  - `test/scaffold/skill-md-serial-pointers.red.node.test.ts` Test 22 ("templates/cleargate-planning SKILL.md must equal canonical after prebuild").
  - If both run before `status-vocab-phase-b`'s mid-suite prebuild, the first pass reads **3565 / 3561 / 2 / 2**.
  - Re-run each solo after the suite, name both, and record the corrected 3565 / 3563 / 0 / 2. Never prebuild outside BD.
  - Precedent to watch: BUG-098's first pass also showed a transient `init-from-source` S1 concurrency flake that passed 11/11 solo. The same solo re-run rule applies if it recurs.
- **Post-BD:**
  - verify-pack 232/88;
  - `--check` exit 0;
  - M2 pair 5/5 + 15/15;
  - doctor prints exactly 2 `scaffold drift:` lines (sprint-execution `SKILL.md`, `dispatch-serial.md`) until RS-5.
- **Surface gate (PF12-A3).** Make a genuine STORY-058-12 state transition, not a same-state no-op, right before the outer twin commit on `story/STORY-058-12`.
- **Re-sync check.** `git -C OUTER merge-base --is-ancestor sprint/S-41 story/STORY-058-12` passes as long as sprint/S-41 is still `23d9e324`. If bookkeeping moves it again, apply the same replan §6 step 8 rule as the integrate: a conflict-free outer re-merge off -12's surface needs no QA re-run.

## Script Incidents

None. No `.cleargate/scripts/*` invocation was needed. Everything was `git`, `npm run …`, `node scripts/…` inside `<cw>`, or `cp`/`cmp`/`shasum`/`sed`/`diff`.

```yaml
r_coverage: []
plan_deviations:
  - { what: "no checkout -- on the tracked twins", why: "git did not refuse the outer merge (upstream touches no twin path, as PF12-A2 measured); the build copies were cmp-equal to canonical and cp re-derived all 5 afterwards", orchestrator_confirmed: true }
adjacent_files:
  - "cleargate-cli/test/helpers/init-fixture.ts"
  - "cleargate-cli/test/scaffold/sprint-execution-mirror.integration.node.test.ts"
  - "cleargate-cli/test/scaffold/skill-md-conditional-architect.red.node.test.ts"
  - "cleargate-cli/test/scaffold/skill-md-serial-pointers.red.node.test.ts"
flashcards_flagged:
  - "2026-09-27 · #test-harness #zsh · zsh never word-splits $var: 'for f in $files' runs once with every path; use an array or $(cat list)."
  - "2026-09-27 · #merge #init-fixture · BSD diff offsets an insertion by its shared '},' suffix; prove a splice by cmp of the '>' streams, not hunk offsets."
```
