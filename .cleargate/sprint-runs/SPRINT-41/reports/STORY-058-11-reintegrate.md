role: developer

# STORY-058-11 Developer RE-INTEGRATE report (rule 21, onto cli main 6fc13d2, CR-124 merged)

```
STORY: STORY-058-11
STATUS: done
COMMIT: cli 53f90a2 (integrate(STORY-058-11): re-sync cli main 6fc13d2); cli 55fc4cb (chore(STORY-058-11): regenerate codex architect TOMLs after CR-124); outer 46244b04 (integrate(STORY-058-11): merge sprint/S-41)
TYPECHECK: pass
TESTS: 658 passed, 0 failed (42 distinct files, first run, no flakes, no re-runs) — includes the rule-16 CLEARGATE_META_ROOT set (23 files, 335/335), the K3 red-set + anchors (17 files), hooks-claude-parity 19/19, the M2 pair (5/5 + 15/15, compare-only), CR-124's make-green (waves-json-v2 7/7, init-sprint-waves-v2 1/1; contract-first-dag-text 10/10 counted once, inside rule-16), BUG-090's frontmatter-fence-parity 21/21 and assert-story-files-fence 11/11. Test 46 / clean-room harness NOT run per dispatch (§QA-Verify's job next).
FILES_CHANGED: cli test/helpers/init-fixture.ts (merge resolution, row level); cli scaffold/hosts/codex/.codex/agents/architect{,-synth,-reader}.toml (regenerated); outer .cleargate/knowledge/cleargate-enforcement.md (twin re-derived, uncommitted per rule 21)
```

## 0. Preflight

Read `sprint-context.md` (rules 11, 16, 19–21), `reports/STORY-058-11-arch.md` §8, `plans/M5.md` M5-A54/M5-A55, `reports/STORY-058-11-integrate.md` (the prior integrate onto `984e8d5`, before CR-124), `reports/CR-124-devops.md`. Grepped FLASHCARD.md for `#merge #init-fixture #integration` — all 5 hits confirmed the expected shape (byte-identical row merges as common text; only lead comments conflict; rebuild a tail conflict from each side's git-show tip, verify vs an independent rebuild).

Verified starting state matched the dispatch exactly: `<cw>` clean at `76dee8c` (cli `main` = `6fc13d2`), `<ow>` at `abb3a991` with only the twin `M`, `sprint/S-41` moved ahead of the dispatch's stated `cefb1c07` to `83fcd135` in the interim (STORY-058-12 QA-Red report + flashcard/ledger bookkeeping only — no file overlap with STORY-058-11's surface) — proceeded per rule 21 since no upstream surface moved.

## 1. cli merge (step 1)

`git -C <cw> merge --no-ff main -m "integrate(STORY-058-11): re-sync cli main 6fc13d2"` (`main` = `6fc13d2`):
- Auto-merged `CHANGELOG.md` (both entries kept: -11's Codex-roles line and CR-124's Contract-first-sprint-planning paragraph) and `scaffold/core/.cleargate/knowledge/cleargate-enforcement.md` (CR-124's 2-line edit plus -11's §16, sha256 `477b404f51058f0ff97439248b2caef53e345d4367e320adb3c80a85717650cc` — byte-equal to arch's expected/C2 hash).
- **One conflict**, `test/helpers/init-fixture.ts`, exactly the forecast tail (5 interleaved hunks). No `*.red.*` or sealed-test conflict.

**Resolution, verbatim (per arch §8).** Rebuilt the tail in this order:
1. Main's tail as-is: the 5 BUG-090 rows (already unconflicted, before the first marker), then CR-124's 6 rows in main's order — `architect.md`, `architect-synth.md`, `architect-reader.md`, `SKILL.md`, `launch_wave.mjs`, `Sprint Plan Template.md` — then CR-124's lead comment ("The shared enforcement row...").
2. The one shared row, `item: 'STORY-058-11+CR-124'`, `rel: '.cleargate/knowledge/cleargate-enforcement.md'` — git had already merged this as common text (byte-identical on both sides, per the flashcard pattern); kept once, untouched.
3. Deleted -11's 5-line shared-row comment ("Shared row (plan replan-contract-first.md §7.5)..."). No literal duplicate row existed to delete — git's common-text merge had already collapsed it to one occurrence.
4. Appended -11's header comment ("── STORY-058-11 (M5 plan test 17 / RP-A15 item 4) ──") plus its 4 hook rows (`session-start.sh`, `pre-tool-use-task.sh`, `pre-tool-use-autonomy.sh`, `pre-commit-surface-gate.sh`), then `]);`.
5. Appended -11's `SanctionedAddition` interface plus the `SANCTIONED_BASELINE_ADDITIONS` block, verbatim (unchanged from HEAD).

-11's non-tail edits (the `STORY05810_SENTINEL_POST` refusal sentence and the addition-aware `captureOrCompare` `workingStdout` rewrite) auto-merged untouched.

**Independent-rebuild verification (mandatory before commit).**
- `diff <(git show main:test/helpers/init-fixture.ts) <result>`: 177 `+` / 1 `-` lines. The additions are exactly -11's own delta (the sentinel refusal, the 4 hook rows + header comment, the `SanctionedAddition`/`SANCTIONED_BASELINE_ADDITIONS` block, the addition-aware `captureOrCompare` rewrite); the 1 `-` is the `record.stdout` → `workingStdout` line-level edit (an -11 modification, not a main-content deletion).
- `diff <(git show 76dee8c:test/helpers/init-fixture.ts) <result>`: 109 `+` / 18 `-` lines. The additions are exactly CR-124's 6 rows + its lead comment (moved ahead of the shared row); the 18 deletions are -11's own 5-line shared-row comment plus its 13-line copy of the shared row (both now superseded by CR-124's comment + the single common-text row) — matching the flashcard pattern exactly.
- No conflict markers remain (`grep -n "^<<<<<<<\|^=======\|^>>>>>>>"` → empty). `git diff --check` on the file → clean.

Merge commit `53f90a2`, parents `76dee8c` and `6fc13d2`.

## 2. Regeneration (step 2)

- `node scripts/build-codex-payload.mjs --check` before regen: exactly 3 `stale:` lines (`architect-reader.toml`, `architect-synth.toml`, `architect.toml`).
- `npm run gen:codex`: wrote all 18 generated files; `git status --porcelain` after showed exactly the 3 stale TOMLs modified, everything else byte-identical.
- `node scripts/build-codex-payload.mjs --check` after: exit 0.
- sha256 of the 3 regenerated files, byte-equal to arch §8's forecast and to `git show contract/S-41-dispatch:<path>` (C2), confirmed with `diff`:
  - `architect.toml` → `71d1c56b2089a90120cd442942a2cbcbe6ae294945a371c3591a6711c88483ea`
  - `architect-synth.toml` → `8bdd01387a4336dbc0ce3483140a0c4fb64f55d775bd4d363e70ae1bb5547522`
  - `architect-reader.toml` → `64ba7730bb2a3620d708d142e8320f225da6a0cc8b9ef84ecf25a9a6fedc3f55`
- Committed those 3 files only: `git diff --stat` for commit `55fc4cb` is exactly the 3 TOML files, 80 insertions(+)/28 deletions(-).

## 3. Outer twin (step 3)

1. `git -C <ow> checkout -- .cleargate/knowledge/cleargate-enforcement.md` discarded the stale build copy.
2. `git -C <ow> merge --no-ff sprint/S-41 -m "integrate(STORY-058-11): merge sprint/S-41"` (sprint/S-41 had moved to `83fcd135`, orchestrator-bookkeeping only) — clean, no conflicts. Commit `46244b04`.
3. `cp <cw>/scaffold/core/.cleargate/knowledge/cleargate-enforcement.md <ow>/.cleargate/knowledge/cleargate-enforcement.md`; `cmp` → 0.
4. sha256 `477b404f51058f0ff97439248b2caef53e345d4367e320adb3c80a85717650cc` — matches the arch report's expected twin hash exactly.

Left **uncommitted** in `<ow>`, per instructions (merge-lane responsibility).

## 4. Rebuild + typecheck (step 4)

- `npm run prebuild`: payload 83 files, split view 102 files, manifest 77 files — exact match to arch's forecast.
- `npm run build > /private/tmp/reint11-build.log 2>&1`: exit 0 (ESM/CJS/DTS all `⚡️ Build success`).
- `npm run typecheck`: exit 0.
- `node scripts/verify-pack.mjs`: `OK — 222 files, payload 83, version 0.26.1` — exact match to arch's forecast (222/83).

## 5. Verification (solo, sequential, `npm run test:file -- <file>` in `<cw>`; counts via `command grep -aE "^ℹ (tests|pass|fail|skipped) "`)

All first-run results. No flakes, no re-runs.

**K3 red-set + anchors**

| File | tests/pass/fail |
|---|---|
| test/scripts/codex-agents-codegen.red | 30/30/0 |
| test/scaffold/portable-skills.red | 6/6/0 |
| test/hooks/harness-shim.red | 18/18/0 |
| test/docs/codex-enforcement-delta.red | 15/15/0 |
| test/scripts/codex-hooks-harness.red | 90/90/0 |
| test/commands/init.node | 34/34/0 |
| test/snapshots/hooks-snapshots.node | 16/16/0 |
| test/commands/lifecycle-codex.red | 6/6/0 |
| test/commands/init-host-snapshot.red | 13/13/0 |
| test/scaffold/codex-payload.red | 14/14/0 |
| test/hooks/pre-tool-use-task.node | 13/13/0 |
| test/hooks/stamp-and-gate.node | 7/7/0 |
| test/hooks/session-start.node | 9/9/0 |
| test/scaffold/file-surface-gate-e2e.node | 21/21/0 |
| test/scaffold/pre-commit-downstream-safe.node | 12/12/0 |
| test/hooks/cr-026-integration.node | 1/1/0 |
| test/hooks/hooks-claude-parity.red.integration | 19/19/0 |

**M2 pair** (`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, compare only — `find <dir> -newer` confirmed 0 files written)

| File | Result |
|---|---|
| test/hosts/claude-adapter-init-parity.red.integration | 5/5/0 |
| test/commands/init-host-parity.red.integration | 15/15/0 |

**CR-124's make-green**

| File | tests/pass/fail |
|---|---|
| test/scripts/waves-json-v2.red | 7/7/0 |
| test/docs/contract-first-dag-text.red | 10/10/0 |
| test/scripts/init-sprint-waves-v2.red.integration | 1/1/0 |

**BUG-090's**

| File | tests/pass/fail |
|---|---|
| test/scripts/frontmatter-fence-parity.red | 21/21/0 |
| test/scripts/assert-story-files-fence.red | 11/11/0 |

**Rule-16 file list** (every `CLEARGATE_META_ROOT` file, default META_ROOT = `<ow>`, no override — 23 files, helper `test/helpers/scaffold-roots.ts` excluded): **335/335/0**. Grew from 22 to 23 by adding `test/docs/contract-first-dag-text.red.node.test.ts` (CR-124), exactly as forecast.

| File | tests |
|---|---|
| new-command | 57 |
| no-exec-mode-vocab | 4 |
| claude-md-block-leads-relocation | 4 |
| clean-room-verification-doc | 9 |
| codex-enforcement-delta | 15 |
| contract-first-dag-text | 10 |
| test-layers-declared-doctrine | 11 |
| frontmatter-authoring e2e | 9 |
| spidr-coverage e2e | 1 |
| hook-signal.integration | 3 |
| hook-signal | 14 |
| pre-tool-use-task | 13 |
| token-ledger-attribution | 9 |
| token-ledger-regression | 14 |
| readiness-predicates-spidr-coverage | 32 |
| readiness-predicates-test-layers-declared | 17 |
| enforcement-doc-coherence | 26 |
| file-surface-gate-e2e | 21 |
| pre-commit-downstream-safe | 12 |
| ratchet-retired | 8 |
| close-sprint-assume-ack-guard | 20 |
| scaffold-relocation | 15 |
| bucket-registry-parity | 11 |

## 6. The four invariants (arch §8), all measured true on the re-integrated tree

- **I1.** `git diff main HEAD -- scaffold src scripts ':!scaffold/hosts/codex/.codex/agents/architect*.toml'` vs `git diff 984e8d5 76dee8c` over the same paths: identical `+`/`-` line sets, **2722 lines** each (excluding diff headers) — byte-for-byte match to arch's forecast.
- **I2.** `git diff 76dee8c HEAD --stat`: **15 files, +1189/−85** — CR-124's 12-file set plus the 3 architect TOMLs; `test/helpers/init-fixture.ts` at **+109/−18** exactly.
- **I3.** `git diff 8c8c5ff HEAD -- scaffold` vs `git diff d0f0d95 984e8d5 -- scaffold`: identical, **5 files, +157/−19** (BUG-090's scaffold delta) — confirms scaffold = C2 plus main-since-C1.
- **I4.** In `init-fixture.ts`: every `rel:` value appears exactly once (no duplicates, checked via `grep -oE "rel: '[^']+'" | sort | uniq -c`); exactly one `item: 'STORY-058-11+CR-124'` row; exactly one `SANCTIONED_BASELINE_ADDITIONS` row.

## 7. Git statuses

```
$ git -C <cw> status --porcelain          → (empty); HEAD 55fc4cb ← 53f90a2 ← 6fc13d2 (merge(story/CR-124)) ← 76dee8c
$ git -C <ow> status --porcelain
 M .cleargate/knowledge/cleargate-enforcement.md      (re-derived twin; cmp 0; uncommitted for the merge lane)
$ git -C OUTER status --porcelain
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
?? .cleargate/sprint-runs/SPRINT-41/reports/STORY-058-11-reintegrate.md   (this report)
?? .cleargate/sprint-runs/SPRINT-41/.pending-task-3576-43042-11045.json  (pre-existing, not touched by this dispatch)
```

Never touched: `/private/tmp/cg-s41-m2-init-baseline` (env read only), `/private/tmp/cg-s41-fresh-journey`, any evidence dir, other worktrees (BUG-098, STORY-058-12), CODEX_HOME/~/.codex/auth. No `git stash`, no `git reset --hard`, no push, no bare `cleargate`, no `--no-verify`, no full `npm test`, no prebuild/build in the cli main checkout. Test 46 / clean-room harness intentionally not run (QA-Verify's lane next).

Scratchpad hygiene: deleted only the ad hoc `/private/tmp/{merge-tree-preview.txt,i1-a.diff,i1-b.diff,i1-a-lines.txt,i1-b-lines.txt,i3-a.diff,i3-b.diff}` files this dispatch created (exact names, no glob); kept `/private/tmp/reint11-build.log` as the dispatch-named build-log artifact.

## Task Breakdown

Not applicable — this dispatch is a rule-21 re-integration, not a fresh story build; the story file's own Task Breakdown rows were already ticked (or explained) by the original Developer/QA dispatches per `reports/STORY-058-11-integrate.md` and the arch post-flight. Nothing in this dispatch's scope required a new row.

## Script Incidents

None. Every command was `npm run …`, `node scripts/…`, `git`, or a `python3`/`diff`/`shasum` splice-and-verify step run directly, per dispatch instructions (`run_script.sh` not applicable — no sanctioned script was invoked).

```yaml
r_coverage:
  - { r_id: "R1", covered: true, deferred: false, clarified: false }   # codegen 30/30 post-re-integration; gen:codex --check exit 0 after regen; 3 TOMLs byte-equal to C2
  - { r_id: "R2", covered: true, deferred: false, clarified: false }   # single source + --check: exit 0; codex-payload.red 14/14; verify-pack 222/83
  - { r_id: "R3", covered: true, deferred: false, clarified: false }   # portable skills: portable-skills.red 6/6 (unchanged by re-integration; identical to 76dee8c per I1)
  - { r_id: "R4", covered: true, deferred: false, clarified: false }   # shim in 8 hooks: harness-shim 18/18; hooks unchanged by the merge (I1)
  - { r_id: "R5", covered: true, deferred: false, clarified: false }   # Claude no-op: hooks-claude-parity 19/19; M2 pair 5/5 + 15/15
  - { r_id: "R6", covered: true, deferred: false, clarified: false }   # §16: codex-enforcement-delta 15/15; twin cmp 0, sha256 exact match
  - { r_id: "R7", covered: true, deferred: false, clarified: false }   # real session roles: codex-hooks-harness 90/90 (incl. M5-A55's parsed-string tokenization fix from 76dee8c); live test 46 is QA-Verify's lane next, not re-run here
plan_deviations: []
adjacent_files:
  - "cleargate-cli/scripts/clean-room/evidence.mjs (codexRolesVerdict, unchanged by this dispatch — already fixed at 76dee8c per M5-A55; not re-touched)"
  - "cleargate-cli/test/e2e/codex-hooks.red.integration.node.test.ts (test 46 — QA-Verify's harness-lane run next, intentionally not run here)"
  - "cleargate-cli/test/helpers/init-fixture.ts (row-level merge resolution — future items reusing the shared enforcement row or appending new SANCTIONED_BASELINE_ADDITIONS should read this tail's ordering)"
  - ".cleargate/knowledge/cleargate-enforcement.md (uncommitted twin in <ow>, merge-lane responsibility)"
flashcards_flagged: []
```
