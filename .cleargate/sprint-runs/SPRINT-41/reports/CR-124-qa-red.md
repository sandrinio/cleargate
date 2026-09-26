# CR-124 — QA-Red report

```
QA-RED: WRITTEN
RED_TESTS:
  - cleargate-cli/test/scripts/waves-json-v2.red.node.test.ts
  - cleargate-cli/test/docs/contract-first-dag-text.red.node.test.ts
  - cleargate-cli/test/scripts/init-sprint-waves-v2.red.integration.node.test.ts
BASELINE_FAIL: 10 red scenarios (3 + 7) + 1 integration red = 11 failing tests at the red commit
flashcards_flagged: [see bottom of this report]
```

## Commit

cli `story/CR-124`, `dbd002f` — `qa-red(CR-124): failing tests for the contract-first build-then-integrate DAG`. Base `35580b0`. Files: the 3 new test files plus `test/helpers/init-fixture.ts` (7 appended `SANCTIONED_BASELINE_DELTAS` rows). No `src/**`, `scaffold/**`, `scripts/**` or agent/skill edits — tests and the fixture-row appendix only.

## Per-file red/anchor table (solo runs, `npm run test:file -- <file>`)

### `test/scripts/waves-json-v2.red.node.test.ts` — default tier, 7 tests: **4 pass (anchor), 3 fail (red)**

| # | State | Result | Failure reason |
|---|---|---|---|
| W1 | anchor | PASS | — (v1 waves.json lane ingest unchanged) |
| W2 | anchor | PASS | — (schema_version 2 waves.json: same lane ingest) |
| W3 | red | FAIL | `typeof mod.storyBases === 'function'` assertion fails — `storyBases` is `undefined` on canonical `launch_wave.mjs` (export not yet added) |
| W4 | red | FAIL | `STORY-99-02` worktree command is `...sprint/S-99`, not `...contract/S-99-api` — `launchWave`'s plan-only branch ignores the `bases` argument entirely today |
| W4b | anchor | PASS | — (no-bases call already ends every command with the sprint branch) |
| W5 | red | FAIL | `typeof mod.integrationReady === 'function'` assertion fails — `integrationReady` is `undefined` |
| W6 | anchor | PASS | — (`VERDICT_KINDS`/`BLOCKER_TYPES`/`validateVerdicts`/`mintRunId`/`worktreeAddCommand`/`launchWave` all still exported) |

Measured: `tests 7, pass 4, fail 3, skipped 0`. Matches the plan's expected split exactly.

### `test/docs/contract-first-dag-text.red.node.test.ts` — default tier, 10 tests: **3 pass (anchor), 7 fail (red)**

| # | State | Result | Failure reason |
|---|---|---|---|
| T1 | red | FAIL | `architect-reader.md` digest block/field-sources have no `exports_provided`/`exports_consumed` yet |
| T2 | red | FAIL | `architect-synth.md` has no `## Real-collision predicate` heading yet (first assertion in the chain) |
| T3a | red | FAIL | `SKILL.md` has no `#### C.0.2 Contract-first build and integration (CR-124)` heading yet |
| T3b | anchor | PASS | — (all 6 -12 anchor lines occur exactly once; §A.4 is already free of the 9 -12 banned Codex-render tokens) |
| T3c | red | FAIL | `SKILL.md` §A.4 still says "five-clause", not "real-collision predicate" |
| T4 | red | FAIL | canonical/live `cleargate-enforcement.md` are byte-identical (that part passes) but neither yet contains "real-collision predicate" (still "five-clause predicate") |
| T5 | red | FAIL | canonical/live Sprint Plan Template are byte-identical (passes) but §2.1 body has no `contract/S-` example yet |
| T5b | anchor | PASS | — (the three `declareProbeSprint` template anchors are untouched) |
| T6 | anchor | PASS* | — (`findExecModeVocabHits` over the 7 CR-124 files returns `[]`; see Spec-Gap note below) |
| T7 | red | FAIL | `architect.md` §2.1 Phase Plan bullet has no "contract-first DAG" / "upstream" text yet |

Measured: `tests 10, pass 3, fail 7, skipped 0`. Matches the plan's expected split exactly.

`*` **Spec-Gap on T6, resolved in-file (not a halt):** the plan's blueprint text says "none of the 7 CR-124 files matches `INCLUDE_PATTERN` imported from `scripts/check-no-exec-mode-vocab.mjs`." A literal bare `INCLUDE_PATTERN.test(text)` check (no `EXCLUDE_PATTERN`) is red-for-the-wrong-reason: `cleargate-enforcement.md` legitimately contains historical `execution_mode: "v1"` / `execution_mode: v2` / `v2-only` strings documenting the RETIRED behavior switch, and the script's own `EXCLUDE_PATTERN` explicitly exempts `launch_wave\.mjs` and `cleargate-enforcement\.md` for exactly this reason — that's why an anchor must "pass now." I used the actual exported gate function, `findExecModeVocabHits(files)` (INCLUDE_PATTERN filtered through EXCLUDE_PATTERN — the same function the sibling anchor `test/commands/no-exec-mode-vocab.node.test.ts` reuses), which is the correct "does this file trip the dead execution-mode vocabulary gate" check and passes today as an anchor should. Noted here per the "flag under Spec-Gap" instruction rather than silently changing the spec's intent.

### `test/scripts/init-sprint-waves-v2.red.integration.node.test.ts` — integration tier, 1 test: **red**

| State | Result | Failure reason |
|---|---|---|
| red | FAIL | `init_sprint.mjs` exits 0 and both lane assertions pass (v2 plan ingested correctly via the room's own composed scaffold); the test then fails cleanly on `typeof mod.storyBases === 'function'` against the room's own `launch_wave.mjs` copy — `storyBases` is `undefined` |

Measured: `tests 1, pass 0, fail 1, skipped 0`. The sprint plan + two approved, non-empty stories seeded for Gate-2 (`assert_story_files.mjs`) all validated cleanly (no MISSING/UNAPPROVED/STUB-EMPTY), keeping BUG-090's frontmatter-fence work off this test's path as required.

**Totals vs plan §7.3:** unit **17** (10 red, 7 anchor) — measured exactly; integration **1** — measured exactly. No deviation.

## §7.5 sanctioned-delta rows (appended to `test/helpers/init-fixture.ts`)

All 6 non-shared `baselineHash` literals were independently recomputed against the canonical bytes at the worktree's base (`35580b0`) via `shasum -a 256` before sealing — every one matches the plan's literal exactly:

| rel | measured sha256 | matches plan §7.5 |
|---|---|---|
| `.claude/agents/architect.md` | `17c2c14afeec3e6706e26b5104d63d4513394323d0a9b70ae2fbf6da81dc7299` | yes |
| `.claude/agents/architect-synth.md` | `78a5f4f05517bdefc382df72f9821ee1891f1087ef8146d90be935be93ca2365` | yes |
| `.claude/agents/architect-reader.md` | `bd4986f3e1c06448e0a191447ffcfa8b559f7ba726c501999d91889f0cf8a50b` | yes |
| `.claude/skills/sprint-execution/SKILL.md` | `c5affd1b4b8fc5f78942fbc9b71455ca516164eb14d1472289518a43ed6f2bd1` | yes |
| `.cleargate/scripts/launch_wave.mjs` | `aa04cd43184cd035d8a659649bdfc0587cbfbdfe41922463c5a4ce5ba9b83c8d` | yes |
| `.cleargate/templates/Sprint Plan Template.md` | `864e16594ce6cc2e8ccb423a7cf82c4f5b7a536a9e8a273968f8df0f749b244d` | yes |
| `.cleargate/knowledge/cleargate-enforcement.md` (shared row) | `4c3e8083c9ae4d3adcf968a75b454135c1d51cc0b0f0bf412e3d7ea71f9a4fdb` | yes |

**The shared enforcement row**, as written verbatim in `test/helpers/init-fixture.ts` (lines 625–637 post-insertion):

```ts
  {
    item: 'STORY-058-11+CR-124',
    rel: '.cleargate/knowledge/cleargate-enforcement.md',
    scenarios: 'all',
    // Shared by STORY-058-11 (§16), CR-124 (:103) and STORY-058-12 (§17); one row per rel.
    baselineHash: () => '4c3e8083c9ae4d3adcf968a75b454135c1d51cc0b0f0bf412e3d7ea71f9a4fdb',
    currentHash: () => {
      const h = currentPinSubstitutedHash('.cleargate/knowledge/cleargate-enforcement.md');
      return h === '4c3e8083c9ae4d3adcf968a75b454135c1d51cc0b0f0bf412e3d7ea71f9a4fdb'
        ? '<cleargate-enforcement.md delta not landed: canonical still ' + h + '>'
        : h;
    },
  },
```

sha256 of this exact block (byte range as committed) = `2203a6405406444013cfacd4312f92f6f977a16fe6a3f54df1e075c257be5fe8`. This is byte-for-byte the block pinned in `plans/replan-contract-first.md` §7.5 — STORY-058-11's QA-Red must insert the identical bytes; the second merger deletes its duplicate at integration.

## M2 parity pair (compare mode, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, read-only)

| File | Result | Red-by-design reason |
|---|---|---|
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` | **0/5** (all 5 scenarios fail) | Every scenario fails on the first sanctioned-delta row hit (`.claude/agents/architect.md`, item `CR-124`): `currentHash` still equals `baselineHash` because the Developer has not landed the canonical edit yet — exactly the refuse-baseline contract. Will flip to 5/5 once the Developer's commit lands. |
| `test/commands/init-host-parity.red.integration.node.test.ts` | **0/15** (all 15 scenarios × host-arg variants fail) | Same reason, same row, same message, across all `fresh`/`user-content`/`reinit`/`malformed`/`force` × `hosts=undefined`/`["claude"]`/`[" Claude ,claude"]` combinations. Will flip to 15/15 once the Developer's commit lands. |

Confirmed via `find /private/tmp/cg-s41-m2-init-baseline -newermt "2026-09-26 00:00:00"` (no output) that the baseline directory was not written to by any of these runs — compare mode only; `CLEARGATE_INIT_BASELINE_CAPTURE` was never set.

## TPV-relevant checks run

- `npm run typecheck` — clean (tsc --noEmit, 0 errors). Per the flashcard on typecheck scope, this covers `src/**` only; the new test files' own TS soundness was verified by actually running them (below), not by tsc.
- Anchors listed in plan §7.4, solo runs from `<cw>`:

| File | Result |
|---|---|
| `bug-033-collision-surface-failsafe.node.test.ts` | 7/7 |
| `collision-surface-planning-workflow.red.node.test.ts` | 15/15 |
| `wave-execution-barrier.red.node.test.ts` | 23/23 |
| `bug-034-flashcard-gate-restore.node.test.ts` | 5/5 |
| `parallel-dispatch.red.node.test.ts` | 6/6 |
| `test/docs/gate-section-index-pinning.node.test.ts` | 14/14 |
| `test/docs/no-execution-mode-vocabulary.red.node.test.ts` | 9/9 |
| `test/commands/no-exec-mode-vocab.node.test.ts` | 4/4 |
| `no-inline-id-regex.node.test.ts` | 7/7 |
| `clean-room-evidence.red.node.test.ts` | 60/60 |
| `test/scaffold/skill-md-consolidation-d5.red.node.test.ts` | 18/18 |
| `test/scaffold/skill-md-conditional-architect.red.node.test.ts` | 18/18 |
| `test/docs/autonomy-contract.red.node.test.ts` | 30/30 |
| `test/docs/test-layers-declared-doctrine.red.node.test.ts` | 11/11 |
| `test/scaffold/enforcement-doc-coherence.node.test.ts` | 26/26 |
| `test/scripts/enforcement-section-13.node.test.ts` | 11/11 (after `npm run build` in `<cw>` — see note) |
| `test/commands/new-command.node.test.ts` | 57/57 |
| `bash scaffold/core/.cleargate/scripts/test/cr078_init.test.sh` | see note below |
| `node scripts/build-codex-payload.mjs --check` | **not run** — plan §7.4 gates this "once -10 has merged into CR-124's tree"; -10 has not integrated into `story/CR-124` yet (that is the Developer's later INTEGRATE step). Not applicable at the QA-Red commit. |

**Note — `enforcement-section-13.node.test.ts` needed a worktree build.** Two of its 11 cases spawn `dist/cli.js`; a freshly-cut nested cli worktree has no `dist/` yet. Ran `npm run build` in `<cw>` (rule 19: allowed, writes only `<cw>/dist/`, gitignored — `git status` in `<cw>` and `<ow>` stayed clean before and after). Went from 9/11 → 11/11, both failures were `MODULE_NOT_FOUND` on `dist/cli.js`, unrelated to CR-124.

**Note — `cr078_init.test.sh` must run from the outer worktree, not the canonical nested path.** Running the literal `scaffold/core/.cleargate/scripts/test/cr078_init.test.sh` path (from `<cw>`) breaks: its `REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"` assumes the script lives at exactly `<repo>/.cleargate/scripts/test/` (depth 3). The canonical copy is nested one level deeper (`scaffold/core/.cleargate/scripts/test/`), so `REPO_ROOT` resolves to `scaffold/core` instead of a real repo root, and every `${REPO_ROOT}/cleargate-planning/...` read 404s — a pre-existing, CR-124-unrelated artifact of this script never having been made depth-agnostic after STORY-058-01's canonical move. Ran the byte-identical outer twin instead (`bash <ow>/.cleargate/scripts/test/cr078_init.test.sh`, confirmed identical via `diff`), where `REPO_ROOT` correctly resolves to `<ow>` (which does carry a tracked `cleargate-planning/`): **38 passed, 1 failed** — the one failure is the plan's own named, pre-existing "SAFETY VIOLATION: real repo .active clobbered! expected SPRINT-34, got ''" (hardcoded SPRINT-34 expectation, flashcard 2026-08-29), unrelated to CR-124.

## Git status (all three trees, post-commit)

```
$ git -C /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/CR-124 status --porcelain
(clean)

$ git -C /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/CR-124/cleargate-cli status --porcelain
(clean — dist/ and templates/ are gitignored; the QA-Red commit dbd002f already includes the 4 tracked files)

$ git -C /Users/ssuladze/Documents/Dev/ClearGate status --porcelain   (captured before writing this report)
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
?? .cleargate/sprint-runs/SPRINT-41/reports/STORY-058-10-qa.md
?? .cleargate/sprint-runs/SPRINT-41/.processed-2a21eefbd446
```

The outer main checkout shows only the 4 standard ledger files, plus two artifacts from CONCURRENT parallel-lane activity (this sprint runs 4 build lanes at once, all sharing the one outer main checkout's `.cleargate/sprint-runs/` tree): `STORY-058-10-qa.md` (another QA dispatch's report) and a `.processed-<hash>` flashcard marker neither authored by nor related to this CR-124 QA-Red dispatch. No CR-124 back-sync artifacts. This report file itself (`CR-124-qa-red.md`) is the only writer of this dispatch's own untracked output.

## Deviations from the blueprint

1. **T6 vocabulary check** — used `findExecModeVocabHits` instead of a bare `INCLUDE_PATTERN.test()`, per the Spec-Gap note above (bare INCLUDE_PATTERN false-positives on `cleargate-enforcement.md`'s legitimate retired-vocabulary documentation, which the gate's own `EXCLUDE_PATTERN` exempts — the anchor must "pass now," and this is the more correct implementation of "the dead execution-mode vocabulary gate" the test's own name describes).
2. **`cr078_init.test.sh` invocation path** — ran the outer live-mirror copy (`<ow>/.cleargate/scripts/test/cr078_init.test.sh`) rather than the literal canonical path named in the dispatch, because the canonical path's own relative-depth math cannot resolve a repo root from its nested `scaffold/core/` location. Confirmed byte-identical via `diff` first.
3. **`npm run build` in `<cw>`** — run once, to make `enforcement-section-13.node.test.ts`'s two dist-spawning cases resolve `dist/cli.js`. Permitted under rule 19/11; writes only gitignored `<cw>/dist/`.

No other deviations. `node scripts/build-codex-payload.mjs --check` was correctly skipped — not yet applicable pre-integration.

## flashcards_flagged

```yaml
flashcards_flagged:
  - "2026-09-26 · #qa-red #vocab #test-harness · Bare INCLUDE_PATTERN false-positives on enforcement.md/launch_wave.mjs; use findExecModeVocabHits instead."
  - "2026-09-26 · #qa-red #test-harness #shell · cr078_init.test.sh REPO_ROOT assumes depth-3 .cleargate/scripts/test/; run outer twin, not nested scaffold/core copy."
  - "2026-09-26 · #test-harness #worktree · A fresh nested cli worktree has no dist/; dist-spawning anchors (enforcement-section-13) need npm run build first."
```
