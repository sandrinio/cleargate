role: architect

# CR-124: Architect TPV (live) on QA-Red `dbd002f`

```
TPV: REJECTED — re-seal required (real survivors); wiring clean
RESEAL_PATCH: reports/CR-124-tpv-reseal.patch
RESEAL_SHA256: 66bc35a994e6d6195482f513b410bde613a35a9c5e471e5315b662fe25705077
NEW_COUNTS: unchanged. Default tier 17 (10 red / 7 anchors), integration 1 red, parity pair 0/5 · 0/15 until the Developer commit
PLAN_AMENDMENTS: plans/replan-contract-first.md §7.8, RP-A25..RP-A27 (append-only)
```

The wiring is correct, and every red fails for the right reason. I reject because the sealed tests let several defective implementations pass:

- `integrationReady` written with `some` instead of `every`, or ignoring a root story;
- shell metacharacters accepted in a base;
- the synth's predicate left as the old clauses, only renamed;
- the canonical reader dropping `file_surface: []`, which only a live-reading guard checks;
- and others listed in §3.

The re-seal only adds assertions to the three CR-124 test files. It adds no test and changes no row.

## 1. Reproduced counts (solo, scratch clone of `story/CR-124` @ `dbd002f`, nested in a `git archive` of outer `story/CR-124`)

| File | Measured | QA-Red | Red reasons (first failing assertion) |
|---|---|---|---|
| `waves-json-v2.red.node.test.ts` | 7: 4 pass / 3 fail | same | W3 `storyBases` not exported; W4 `…STORY-99-02 sprint/S-99` (bases ignored); W5 `integrationReady` not exported |
| `contract-first-dag-text.red.node.test.ts` | 10: 3 pass / 7 fail | same | T1 missing `"exports_provided"`; T2 missing heading; T3a missing C.0.2 heading; T3c no `real-collision predicate` in §A.4; T4 same, in enforcement (the twin byte-equality half passes); T5 no `contract/S-`; T7 no `contract-first DAG` |
| `init-sprint-waves-v2.red.integration.node.test.ts` | 1 fail | same | `init_sprint.mjs` exit 0, lanes match, then `storyBases` not exported in the room's own copy |
| `claude-adapter-init-parity` (compare) | 0/5 | same | all 5: `".claude/agents/architect.md" (CR-124): current hash mismatch` (refuse-baseline) |
| `init-host-parity` (compare) | 0/15 | same | all 15: the same row and the same message |

Every failure is an `AssertionError` on missing text, a missing export, or ignored bases. None comes from wiring. The M2 baseline dir was not written: its 425-file sha fingerprint `bdc4bb1a…` was identical before and after every parity run (5 runs), and `find -newer` returned nothing.

**TPV wiring checks (plan §7.4)**

- All 7 rows follow the refuse-baseline pattern, and each `currentHash` reads canonical.
- The twin reads resolve to `CLI_ROOT/..`, which in the nested worktree is `<ow>`.
- W1 and W2 spawn the canonical `init_sprint.mjs` with `cwd` and `CLEARGATE_REPO_ROOT` both set to the fixture.
- The integration test spawns the room's own copy with `cwd` = the room.
- Imports resolve, no mocks are used, and every temp dir is `rmSync`'d in a `finally`.
- One hardening, in the re-seal: the integration spawn did not pin `CLEARGATE_REPO_ROOT`. An ambient value would have redirected the room's `state.json` and `.active` writes out of the room. The spawn now sets it to the room.

## 2. Satisfiability: plan-conformant simulation of §7.2

I built all 8 cli files in scratch exactly as §7.2 describes:

- `launch_wave.mjs`: the §7.2 code verbatim, plus the `bases` parameter, `baseFor` and the JSDoc;
- the reader, synth and architect text;
- SKILL.md §A.4, the §C.0 intro and §C.0.2, with the -12 anchors byte-identical and no banned token in §A.4;
- enforcement `:103`;
- the template §2.1 body;
- the CHANGELOG line;
- `cp` of the 3 outer twins, with `cmp` equal.

| Check | Result on the sim |
|---|---|
| waves-json-v2 | 7/7 (3 red→green, 4 anchors stay green) |
| contract-first-dag-text | 10/10 (7 red→green, 3 anchors stay green) |
| init-sprint-waves-v2 (integration) | 1/1 |
| parity pair (compare, read-only baseline) | **5/5, 15/15** |
| `node scripts/check-no-exec-mode-vocab.mjs` | exit 0 ("no dead execution_mode/v1/v2 vocabulary") |
| `node scripts/check-no-inline-id-regex.mjs` | exit 0 |
| `npm run typecheck` | clean |
| §7.4 anchors (solo) | bug-033 7/7 · collision-surface 15/15 · wave-execution-barrier 23/23 · bug-034 5/5 · parallel-dispatch 6/6 · skill-md-consolidation-d5 18/18 · skill-md-conditional-architect 18/18 · autonomy-contract 30/30 · test-layers 11/11 · enforcement-doc-coherence 26/26 · enforcement-section-13 11/11 (after `npm run build` in the clone) · gate-section-index-pinning 14/14 · new-command 57/57 · clean-room-evidence 60/60 · no-execution-mode-vocabulary 9/9 · no-exec-mode-vocab 4/4 · no-inline-id-regex 7/7 |
| Other tests that read the 7 rels (rule 16) | init 29/29 · uninstall 20/20 · frontmatter-authoring 9/9 · hook-signal 14/14 · file-surface-gate-e2e 21/21 · ratchet-retired 8/8 · close-sprint-assume-ack-guard 20/20 · status-vocab-phase-b 75/75 · template-stubs 50/50 · code-map-integration 8/8 · scaffold-layout 18/18 · run-id-ledger-attribution 10/10 |
| Named reds (integration tier, not in `npm test`) | `sprint-execution-mirror.integration` 3/4: live SKILL.md ≠ canonical until RS-CR, **not named in §7.6** (added by RP-A27). `canonical-live-parity` 5c (agents) until RS-CR, named. `foreign-repo.integration` 4/6: pre-existing, `:215` passes its `strictEqual` arguments in the wrong order, unrelated. |

**Unsatisfiable or over-constrained tests: none.**

- T3a's tokens are case-sensitive. My first sim wrote "One merge at a time" and failed. The plan's literal lowercase wording passes. RP-A27 tells the Developer.
- A bare-`INCLUDE_PATTERN` T6, as §7.3 literally words it, would have been unsatisfiable: see §4.
- The re-sealed files are also 7/7, 10/10 and 1/1 on the same sim, and keep the red-commit counts and red reasons exactly.

**Integration probe.** cli `main` has moved: STORY-058-10 merged at `fcb1491`. A scratch `git merge --no-ff main` into `dbd002f` conflicts only in `test/helpers/init-fixture.ts`. Both sides append rows at the tail.

- Git splits that collision into 3 **interleaved** hunks, because the rows share identical lines. Taking theirs-then-ours per hunk breaks the syntax (TS1005).
- Rebuilding the tail at row level works: main's file, then CR-124's contiguous 109-line block before `]);`. The result is 3 × `STORY-058-10` rows, then 7 CR-124 rows. On that tree plus the sim: parity 5/5 and 15/15, waves-json-v2 7/7, init-sprint-waves-v2 1/1, and `node scripts/build-codex-payload.mjs --check` exit 0.
- -10 touched none of the 7 rels. Its codex payload does not derive from them.

## 3. Mutant sampling (78 mutants; results before → after the re-seal)

| Area | Mutants | Killed before | Killed after | Survivors after (classified) |
|---|---|---|---|---|
| `storyBases` | 15 | 11 | **15** | — |
| `launchWave` bases | 8 | 4 | 5 | L18 `bases` default removed (the `bases &&` guard makes it equivalent) · L18b guard dropped with the default kept (equivalent) · L20 execute-path `worktreeCommands` ignore bases (dead value, `void`-ed; K3 grep) |
| `integrationReady` | 6 | 3 | **6** | — |
| reader (T1) | 3 | 1 | **3** | — |
| synth (T2) | 16 | 7 | 14 | X11 `frozen_exports` missing from the field list but kept in the JSON shape (benign) · X16 the "no schema_version stays valid" sentence dropped (low; the code-side v1 cases in W1/W3/W5 cover it) |
| SKILL (T3a/b/c) | 17 | 15 | 16 | X28 tail of the A1 line altered with the prefix intact. -12 keys on the prefix and builds on top of CR-124, so it is benign; K4 checks it. |
| enforcement (T4) | 3 | 2 | 2 | X35 an extra byte change elsewhere (K5 numstat `1 1`) |
| template (T5/T5b) | 4 | 4 | 4 | — |
| architect (T7) | 2 | 2 | 2 | — |
| vocabulary (T6) | 4 | 2 | **4** | — |
| **Total** | **78** | **51** | **71** | 7, all equivalent, benign, or covered by a K-gate |

**Real survivors before the re-seal, each killed by the re-seal**

- `storyBases`:
  - L07 regex weakened to `\S+` (`;`, `$(`, backtick accepted in a bash command);
  - L03 / L02 `schema_version: 3` read as `schema_version: 2`;
  - L12 a base-less entry emitted as `undefined`.
- `launchWave`: L19 an empty-string base produces a base-less `git worktree add`, which silently branches from HEAD.
- `integrationReady`:
  - L22 `every`→`some`;
  - L26 only the first upstream checked;
  - L27 a root story never ready.

  All three survived because every fixture had exactly one upstream.
- Reader:
  - X02 the fields present only in the description, not in the pinned `## Digest shape` JSON;
  - X03 canonical `file_surface: []` dropped. bug-033 reads only the live copy, so it goes red only at RS-CR.
- Synth:
  - X13 the three serializing kinds replaced by the old clauses, without the word "five-clause";
  - X12 the `dep_predecessors`→`upstream` integration-edge rule removed;
  - X15 the layer rule wrong;
  - X09 the `## Reachability refusal (BUG-046)` heading dropped, masked by an in-body mention;
  - X10 and X47 a fail-safe rationale literal dropped, masked by a second copy in the reachability section;
  - X46 the tiny-sprint floor heading dropped.
- SKILL: X18 C.0.2 inserted inside C.0.1, before the Idempotent paragraph.
- Vocabulary: X44 and X45 `v2 only` / `under v2` in `launch_wave.mjs` and in enforcement `:103`. Both files are exempted by name from `findExecModeVocabHits`.

Mutants killed by the original tests include:

- the off-by-one base (killed by W4);
- an undeclared contract accepted (W3);
- a space in a base accepted (W3);
- `integrationReady` true on an unmet upstream (W5);
- the C.0.2 heading after C.1 (T3a);
- an altered -12 anchor prefix (T3b);
- a duplicated A3 anchor (T3b);
- `launch_wave`, `/workflows` or `RUN_ID` added to §A.4 (T3b);
- a twin not copied (T4 and T5);
- the T7 sentence placed in §2.2.

## 4. Rulings

**T6 Spec-Gap: QA-Red's `findExecModeVocabHits` is UPHELD, and T6 is augmented.**

- Measured: bare `INCLUDE_PATTERN` hits canonical enforcement 3 times at `35580b0` (`:213`, `:260`, `:272`, all retired-behaviour prose). §7.2 item 6 forbids other byte changes, so a bare-pattern T6 is unsatisfiable.
- `findExecModeVocabHits` is what the gate enforces. But it exempts `launch_wave.mjs` and `cleargate-enforcement.md` by name, so 2 of the 7 files were unguarded (X44 and X45 survived).
- The re-seal adds a bare-pattern check scoped to CR-124's own surface: `launch_wave.mjs` whole file = 0 hits (0 at the base too), and 0 hits among enforcement lines that contain `real-collision predicate`. RP-A26 corrects the §7.3 T6 wording.

**Shared enforcement row: byte-identical in all three places.**

- The block runs from `  {` through `  },`, 13 lines, sha256 `2203a6405406444013cfacd4312f92f6f977a16fe6a3f54df1e075c257be5fe8`, in:
  - the plan §7.5 fence;
  - CR-124 `dbd002f`;
  - STORY-058-11's committed QA-Red `f4234f2` (`test/helpers/init-fixture.ts:641-653`; the worktree is clean).
- The second merger deletes its copy (rule 21). The re-seal does not touch `init-fixture.ts`.

**§7.3 spec compliance.** QA-Red wrote every test and assertion §7.3 names (W1–W6, T1–T7, the integration flow, the 7 rows). Nothing binding was omitted. The two logged deviations (cr078 run via the outer twin; `npm run build` in `<cw>`) are correct.

## 5. Developer brief

**Precondition.** The orchestrator applies `reports/CR-124-tpv-reseal.patch` (sha256 above) on cli `story/CR-124` at `dbd002f` as one QA-Red re-seal commit. Check it before committing: `git apply --check` is clean (verified on a fresh `dbd002f` clone), and exactly the 3 test files are staged. The Developer never edits `test/**`.

**Make-green set.**

| File | From | To |
|---|---|---|
| waves-json-v2 | 4/7 | 7/7 |
| contract-first-dag-text | 3/10 | 10/10 |
| init-sprint-waves-v2 (integration) | 0/1 | 1/1 |
| `claude-adapter-init-parity` (`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, compare only, never `…_CAPTURE`) | 0/5 | 5/5 |
| `init-host-parity` (same settings) | 0/15 | 15/15 |

**K-gates** (run from `<cw>` unless noted):

- **K1: file allow-list.** `git diff --name-only dbd002f..HEAD`, before integration, is exactly these 8 files:
  - `CHANGELOG.md`
  - `scaffold/core/.cleargate/scripts/launch_wave.mjs`
  - `scaffold/core/.cleargate/knowledge/cleargate-enforcement.md`
  - `scaffold/core/.cleargate/templates/Sprint Plan Template.md`
  - `scaffold/hosts/claude/.claude/agents/architect.md`
  - `scaffold/hosts/claude/.claude/agents/architect-synth.md`
  - `scaffold/hosts/claude/.claude/agents/architect-reader.md`
  - `scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md`

  No `init_sprint.mjs` byte, no `test/**`, no `init-fixture.ts`. The 3 codex TOMLs are added only under K9.
- **K2: twins.** `cp` the 3 canonical `.cleargate` files to `<ow>`, then `cmp` each → exit 0. They stay uncommitted during the build (rule 17) and are re-derived at integration (rule 21).
- **K3: `launch_wave.mjs`.**
  - `git diff 35580b0 -- <file>` has no hunk inside `:1-41` or `:129-224`.
  - The functions match §7.2 verbatim.
  - `command grep -c 'worktreeAddCommand(.*baseFor(' <file>` = 2.
  - `node <file>` prints the usage line and exits 0.
  - `node scripts/check-no-inline-id-regex.mjs` exits 0.
- **K4: SKILL.md.**
  - Diff hunks only between `### A.4` and `### A.5`, and between `### C.0 Execution` and `### C.1`.
  - For each of the 7 anchor prefixes in T3b, the full line equals the base: `diff <(git show 35580b0:<SKILL> | command grep -F '<prefix>') <(command grep -F '<prefix>' <SKILL>)` is empty. This covers X28.
- **K5: enforcement.** `git diff --numstat 35580b0 -- <file>` = `1	1`, and the changed line is `:103`, worded per §7.2 item 6. This covers X35.
- **K6: template.** Hunks only in the `### 2.1 Phase Plan` body. T5b stays green.
- **K7: vocabulary.**
  - `node scripts/check-no-exec-mode-vocab.mjs` exits 0.
  - The `+` lines of the Developer diff contain no `INCLUDE_PATTERN` hit.
  - §A.4 contains none of the 9 banned tokens (T3b).
- **K8: anchors.**
  - Every §2 anchor and rule-16 file at the counts above. Run `npm run build` in `<cw>` first for enforcement-section-13.
  - `npm run typecheck` clean.
  - `bash <ow>/.cleargate/scripts/test/cr078_init.test.sh`: 38 pass / 1 fail, the named SPRINT-34 SAFETY line.
  - The named reds exactly as listed (RP-A27): sprint-execution-mirror 3/4, canonical-live-parity 5c, foreign-repo 4/6.
- **K9: integration** (rule 21; cli `main` is already at `fcb1491`, with -10 merged).
  - `git merge --no-ff main` conflicts at the `init-fixture.ts` tail. Resolve **at row level**: main's file, then CR-124's 7-row block, contiguous, before `]);`. A per-hunk merge interleaves the rows and breaks the syntax. If -11 merged first, delete one identical copy of the shared row.
  - A CHANGELOG `### Added` conflict is possible after the Developer commit. Keep both bullets.
  - Run `node scripts/build-codex-payload.mjs --check`; it must exit 0. It passed on the probe.
  - If -11 has merged, run `npm run gen:codex`, confirm `--check` exits 0, and commit the regenerated `scaffold/hosts/codex/.codex/agents/architect{,-synth,-reader}.toml`.
  - Re-run the make-green set and K3–K8 on the integrated tree.
- **K10: synth coherence (RP-A27).**
  - Drop the "Clause 2" / "clause-2" / "clause 4" references.
  - Keep the Fail-safe-serialize section verbatim.
  - The synth's input "Reader digest shape" gains the two export fields.
  - Write the T3a tokens in the listed case.

## 6. Git status of the real checkouts (unchanged by this dispatch except the 3 permitted files)

| Checkout | Branch @ HEAD | `status --porcelain` |
|---|---|---|
| outer main | `sprint/S-41` @ `7a6f33d9` (moved by other lanes) | This dispatch: ` M plans/replan-contract-first.md` (RP-A25..27, 18:55:56), `?? reports/CR-124-tpv-reseal.patch`, `?? reports/CR-124-tpv.md`. Not this dispatch: 4 hook-owned ledger files; 30 `delivery/pending-sync/*` files `M` at 18:56:56, which is the rule-14 back-sync of a concurrent merge-lane full `npm test` (PID 57207, cwd = cli main checkout, started about 18:55; the merge lane reverts them); `plans/M5-fixwave.md` (18:59:30); `?? reports/BUG-090-tpv-reseal.patch`, `?? reports/BUG-097-dev.md` (other lanes) |
| cli main | `main` @ `fcb1491` | `?? cleargate-0.25.0.tgz`: mtime 2026-09-02, not from this dispatch |
| `.worktrees/CR-124` | `story/CR-124` @ `0b97950d` | clean |
| `.worktrees/CR-124/cleargate-cli` | `story/CR-124` @ `dbd002f` | clean |
| `.worktrees/STORY-058-11/cleargate-cli` | `story/STORY-058-11` @ `f4234f2` | clean |

No commits and no git state changes in any real checkout. I ran no `cleargate`, no `npm install`, and no harness. All simulation happened under `/private/tmp/cg-s41-tpv-cr124`, which I deleted at the end. I did not touch `/private/tmp/cg-s41-fresh-journey` or mediafi.

## Script Incidents

None. I did not invoke any `.cleargate/scripts` through `run_script.sh`. The only direct invocations were cli-repo check scripts (`check-no-exec-mode-vocab.mjs`, `check-no-inline-id-regex.mjs`, `build-codex-payload.mjs --check`), run inside the scratch clones.

## flashcards_flagged

```yaml
flashcards_flagged:
  - "2026-09-26 · #test-harness #init #merge · init-fixture row append/append conflicts split into interleaved hunks; rebuild tail: upstream rows, then own."
  - "2026-09-26 · #tpv #test-harness · every() vs some() survives single-upstream fixtures; gate tests need a 2-upstream one-merged case + a root."
  - "2026-09-26 · #tpv #test-harness · A doc literal present twice masks deleting its operative copy; pin it inside its own section slice."
  - "2026-09-26 · #tpv #test-harness · A guard reading only live .claude can't see a canonical deletion until live re-sync; pin canonical too."
  - "2026-09-26 · #tpv #vocab · findExecModeVocabHits exempts launch_wave.mjs + enforcement.md by name; add a bare check scoped to new lines."
  - "2026-09-26 · #test-harness #skill · sprint-execution-mirror.integration diffs live vs canonical SKILL.md; any SKILL edit is named-red till re-sync."
```
