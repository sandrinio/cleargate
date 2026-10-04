# STORY-058-12 TPV report

role: architect

```
TPV: REJECTED
RESEAL_PATCH: reports/STORY-058-12-tpv-reseal.patch
RESEAL_SHA256: ed47ca875b6a2c00ff5bb4811f9e821b0c608820e21bcb592bdd47a59c9f76ef
RESEAL_SCOPE: 8 test files, +157/-20; applies cleanly on cli e320ec4 (git apply --check, also read-only against <cw>); no src/scaffold/script/fixture/init-fixture change
PLAN_AMENDMENT: plans/M6.md "## Amendments from TPV (STORY-058-12, 2026-09-26; role: architect; append-only)" (TPV-A1..A6, +48 lines, append-only)
COUNTS_AFTER_RESEAL: unchanged. Default tier +52, integration +1; at e320ec4 62 red + 2 anchors; M2 pair 0/5, 0/15; D4 = previous total + 52
```

## Verdict in one paragraph

The sealed commit is wired correctly. QA-Red's counts reproduce exactly, every import resolves, and every red fails for the right reason at `e320ec4`. A build that follows E0–E12 turns 56 of the 62 reds green, keeps both anchors green, returns the M2 pair to 5/5 and 15/15, and leaves the Claude path byte-identical apart from P1/P2. **Six sealed assertions cannot pass on any plan-conformant build**, so the Developer cannot finish green:
- `dispatch-serial` Test 5 (microtask budget).
- `dispatch-serial` Test 7 (asserts the BLOCKED verdict is *not* recorded, the opposite of AD-M6-4).
- `skill-md-serial-pointers` Test 20 (off by one).
- `dispatch-mode` Test 30 (the claude-like fake declares `.agents`).
- `init-codex-sprint-execution` Tests 35 and 36 (their payload has no `hosts/claude`).

The sealed suite also leaves 22 of 54 plausible wrong builds alive, including a render that keeps `§C.0.2`, a render with no Codex host note, and a CLI whose main guard never runs through a symlinked path. The re-seal fixes the six and pins the missing plan tests. It kills 52 of 54 mutants: one survivor is equivalent, the other does not matter. Test counts do not change.

The integration forecast is clean: the only conflict is the expected mechanical `init-fixture.ts` tail. One plan-reach gap is recorded for follow-up, not fixed in -12: `host add` bypasses `payloadFilter` (TPV-A6).

## Reproduced counts

Scratch root `/private/tmp/cg-s41-tpv12-20260926T182511`. Each tree is a `git clone --no-hardlinks` nested in an outer clone so `<cli>/..` stays inside the scratch; `.claude` is a copy of `OUTER/.claude`; `node_modules` is symlinked; `prebuild` and `build` ran in the scratch only.

| Tree | -12 files (15) | M2 pair |
|---|---|---|
| `e320ec4`, sealed (outer `c6aec444`) | 62 red, 2 anchors. Per file: dvm 1/5, ds 0/8, cli 0/7, fg 0/14, smsp 1/3, doc 0/3, docs 0/2, twins 0/1, dm 0/2, render 0/3, ics 0/3, e2e 1/1 (skip diagnostic), portable-skills 5/6, codex-hooks-harness 74/85, lifecycle-codex 5/6. Identical to QA-Red's table | 0/5, 0/15 |
| + conformant pass A (twins copied into the scratch outer) | dvm 5/5, ds 6/8, cli 7/7, fg 14/14, smsp 2/3, doc 3/3, docs 2/2, twins 1/1, codex-enforcement-delta 15/15 | 5/5, 15/15 |
| + conformant pass B | dm 1/2, render 3/3, ics 1/3, e2e 1/1 skip, portable-skills 6/6, harness 85/85, lifecycle 6/6. The six failures are the six unsatisfiable assertions | 5/5, 15/15 |
| + conformant A+B + re-seal | all 12 new files green; the 8 re-sealed files 5/5, 8/8, 7/7, 14/14, 3/3, 2/2, 3/3, 3/3 | not re-run (tests unchanged) |
| `e320ec4` + re-seal, no build | same 62 red / 2 anchors, same per-file counts (4, 8, 7, 14, 2, 2, 3, 3 fails in the re-sealed files); every red for the right reason (below) | unchanged |
| integrated (see forecast) | all green; harness 91/91 | 5/5, 15/15 |

**Red reasons after the re-seal at `e320ec4`:**
- dvm: "Got unwanted exception" (serial accept), missing TypeError, synthesized-key accept, usage line names 4 of 6 functions.
- ds, fg: `ERR_MODULE_NOT_FOUND` inside each test body.
- cli: node's own `Cannot find module …/dispatch_serial.mjs` (exit 1).
- smsp: "delta of 0"; "canonical dispatch-serial.md does not exist yet".
- dm: `dispatchMode` undefined; "a wave-parallel-only selection must NOT admit the serial dispatch surface".
- render: "renderCodexSprintExecution must be exported"; "planCodexPayload must plan …".
- ics: plain `existsSync` asserts.

`npm run typecheck`, `check-no-inline-id-regex.mjs`, `check-no-exec-mode-vocab.mjs` and `build-codex-payload.mjs --check` all exit 0 on the conformant build.

## Per-check evidence

### Check 1: counts reproduced
The table above shows the counts reproduced solo. Totals: default tier +52 (51 new plus 1 in the harness, 84 → 85), integration +1.

### Check 2: plan-conformant build
Built in the scratch per E6/E7:
- `DispatchMode` plus `HostAdapter.dispatchMode` (claude `wave-parallel`, codex `serial`), `SERIAL_DISPATCH_SURFACE`, and the E6.1 `serialByName` rule.
- `validateVerdicts(verdicts, options)` with the E6.6 messages, plus the usage string.
- `lib/flashcard-gate.mjs` (E6.5 porting rule) and `dispatch_serial.mjs` (AD-M6-4, E6.4 guards, realpath main guard).
- `renderCodexSprintExecution` inlined in `build-codex-payload.mjs`, with six anchors, 11 banned tokens and `CodexRenderError`.
- `dispatch-serial.md` from E6.9, **sha256 `496feae3…09b0` reproduced**.
- P1/P2, protocol intro plus §23.5, enforcement bullet 10, the Index row after §16, and §17.
- `codexSkillsVerdict` inversion, the CHANGELOG line, and `npm run gen:codex`.

Why the reds go green:
- The 11 harness reds go green from the one `codexSkillsVerdict` inversion.
- The flashcard parity passes because the port matches the hook on all 13 fixtures, including CRLF (F6, F13) and fail-closed (F12).
- The M2 pair goes green on -12's protocol row plus 3 additions only.

Claude path:
- `git diff --numstat` for canonical `SKILL.md` is 4/0 (P1/P2), and the heading sequence is unchanged.
- The no-flag install has no `.agents/` and carries `.claude/skills/sprint-execution/dispatch-serial.md`.
- Pass B changes no no-flag installed byte (M2 pair 5/5, 15/15 after B).

Pass split: pass B edits no pass-A file. After pass A alone, prebuild and `--check` succeed and the M2 pair is 5/5, 15/15.

### Check 3: mutants
See the table below. 54 mutants.
- Sealed suite: kills 32, and *rewards* one (MB3: dropping the record of a BLOCKED verdict turns sealed Test 7 green).
- Re-sealed suite: kills 52. MB6 is equivalent: the next `nextAction` halts with no extra seam call. MD13 (a directory named `.processed-<hash>` counts as processed) does not matter.

### Check 4: cross-item fallout
Base (`e320ec4`) and conformant runs, per file, solo, over:
- 115 default-tier files: every file importing a touched module (`launch_wave`, `hosts/*`, `build-codex-payload`, `evidence`, `init-fixture`, `scaffold-roots`, `pending-task-sentinel`, the protocol and enforcement docs, `sprint-execution`, `verify-pack`, `manifest-builder`) plus the 22 default-tier rule-16 files;
- 21 more: the id and vocab gates, `gate-section-index-pinning`, payload-perms/upgrade/work-item-id/run-script/cli/command tests, and 2 integration-tier parity files.

Results:
- **No file got worse. 19 files improved.** No other item's sealed test turns red, so rule 21 needs no re-seal of any other item.
- Conformant-only change: `sprint-execution-mirror` 4/4 → 3/4 ("diff live vs canonical", integration tier). It is named in E8 and clears at RS-5.
- Reds present on both trees and not named in E8 (TPV-A4):
  - `close-sprint-step-2-6c` S5, `close-sprint-step-7-4` S3, `template-claude-md` 3 cases, `wiki-ingest-sprint-report` S14. These are BUG-090 two-repo parity: C2 predates BUG-090, and `<ow>` carries BUG-090's twins.
  - `canonical-live-parity` 5d (live `token-ledger.sh` base lag).
  - `init-from-source` S1: a shared-`os.tmpdir()` flake, 11/11 solo.
- The rule-16 set is 25 files (23 before, plus `serial-dispatch-docs` and `serial-twins`): 22 default tier and 3 integration.

### Check 5: integration forecast
See the section below.

### Check 6: Developer brief
See the section below.

## Mutants

"Sealed" compares against the sealed suite's own result on the conformant build (ds 2, smsp 1, dm 1, ics 2 failures). Count-masked means the mutant's failure lands in a test that already fails there.

| Id | Wrong build | Sealed | Re-sealed |
|---|---|---|---|
| MA1 | serial mode treated as wave | killed | killed |
| MA2 | serial branch leaks into wave mode | killed (T1) | killed |
| MA3 | unknown mode accepted | killed | killed |
| MA4 | `{metering:'unavailable', input:0}` accepted | killed | killed |
| MA5 | GREEN `devSha:null` accepted | killed | killed |
| MA6 | absent SHA accepted (`== null`) | killed | killed |
| MA6b | absent `qaSha` only accepted | survived | killed |
| MA7 | usage line not updated | killed (4b) | killed |
| MB1 | flashcard gate only before story 1 | killed | killed |
| MB2 | `createWorktree` even when it exists | killed (T8) | killed |
| MB3 | BLOCKED verdict never recorded | **rewarded** | killed |
| MB4 | no serial validation before record | killed | killed |
| MB5 | resume ignored | killed | killed |
| MB6 | no explicit halt after non-GREEN | equivalent | equivalent |
| MB7 | reads the skip key on `env` | killed | killed |
| MB8 | story 2 dispatched before story 1 resolves | masked (T5) | killed |
| MC1 | wave story ids unvalidated | killed | killed |
| MC2 | wave id unvalidated | survived | killed |
| MC3 | raw `file://` main guard | survived | killed |
| MC4 | `next` honours `CLEARGATE_ADVISORY` | survived | killed |
| MC4b | gate lib honours `SKIP_FLASHCARD_GATE` | survived | killed |
| MC5 | `record` skips wave membership | survived | killed |
| MC6 | `record` writes `token-ledger.jsonl` | killed | killed |
| MC7 | v2 `base` honoured (contract branch) | killed | killed |
| MC8 | `schema_version: 3` accepted | killed | killed |
| MC10 | `worktreeExists` always false | killed | killed |
| MD1 | list item via JS `.` (drops `\r`) | killed (F6) | killed |
| MD2 | split on `\r?\n` | killed | killed |
| MD3 | final unterminated line dropped | killed (F5) | killed |
| MD4 | inline `[]` stops the scan | killed (F9) | killed |
| MD5 | `cardHash` sha256 | killed | killed |
| MD6 | JSON open via JS `.` | killed (F13) | killed |
| MD7 | `-qa-red.md` scanned | killed | killed |
| MD8 | `reports/` skipped | killed | killed |
| MD9 | JSON cards not unescaped | killed (F11) | killed |
| MD10 | dot-file reports scanned | survived | killed |
| MD12 | unparseable ignored | killed | killed |
| MD13 | marker directory counts as processed | survived | survived (does not matter) |
| ME1 | `payloadFilter` ignores `dispatchMode` | masked | killed |
| ME2 | missing `dispatchMode` treated as serial | masked | killed |
| ME3 | claude declared serial | killed (T29) | killed |
| ME4 | codex declared wave-parallel | killed | killed (dm, ics; `lifecycle-codex` does not see it: TPV-A6) |
| ME5 | any registered serial host admits the surface | masked | killed |
| ME6 | serial surface always admitted (leaks to claude) | masked | killed |
| MF1 | 9-token banned list, no A6 | survived | killed |
| MF2 | A2 narrowed to keep `§C.0.2` | survived | killed |
| MF3 | no R5 host note | survived | killed |
| MF4 | render drops the `§C.2` body | survived | killed |
| MF5 | missing A5 tolerated | survived | killed |
| MF5b | A6 sentence check removed | survived | killed |
| MF6 | wrong R6 wording | survived | killed |
| MF7 | `SKILL.md` copied unrendered | killed | killed |
| MG1 | `codex.live.skills` not inverted | killed (harness) | killed |
| MG2 | an extra non-room `sprint-execution` fails | killed (harness) | killed |

**Re-seal content** (all inside existing tests, counts unchanged):
- **The six fixes.** TPV-A1 in M6.
- **Render.** Test 31 pins `CODEX_SKILL_BANNED` and `CODEX_SKILL_REPLACEMENTS` by value, requires R1–R6 verbatim, and checks the kept-line subsequence with the A6 line carrying R6. Test 32 deletes each of A1, A2, A4, A5 and the A6 line, plus the A6 sentence alone.
- **Verdicts.** Test 3 adds the `qaSha` analog.
- **CLI.**
  - Test 14: advisory and skip env still exit 4.
  - Test 15: an out-of-wave `record` exits 1.
  - Test 17: a declared `../x` wave still exits 2, and the CLI runs through a symlinked directory.
- **Frozen exports.** Test 11 (dispatch_serial exports) and Test 18 (`flaggedCards`, `reportFiles`) add direct-import pins.

## Satisfiability

With the re-seal, every red is satisfiable by the E0–E12 build, as demonstrated in the scratch. Both anchors stay green, and QA-Red's counts, fixtures (`e7c730ef…`, `09088196…`) and init-fixture rows are untouched. Every re-sealed assertion restates plan text:
- AD-M6-4 pseudocode (record, then halt);
- E6.4 guards, E6.5 API, E6.6 messages;
- E6.2 banned list, the M6 appendix and E6.9 R texts;
- E8 31/32.

No shape was invented. A5 blank-line placement follows the literal plan wording and is recorded in TPV-A2 item 5, with the resulting render sha256.

## Integration forecast

**Simulation.**
- `main'` = cli `6fc13d2` + `git merge --no-ff 76dee8c` (story/STORY-058-11 tip), with the tail rebuilt per `STORY-058-11-arch.md` §8, then `npm run gen:codex`.
- `main'` matches that report: the 3 architect TOMLs are `71d1c56b…`/`8bdd0138…`/`64ba7730…`, and enforcement is `477b404f…`.
- `main'` keeps the E3.3 bytes (`SKILL.md` `e7c730ef…`, `launch_wave.mjs` `09088196…`, protocol `be92d45a…`), so no fixture re-freeze is needed.
- Then conformant -12 + re-seal, committed in scratch only, then `git merge --no-ff main'`.

**cli.** One conflict: `test/helpers/init-fixture.ts`, 6 hunks, mechanical.
- Recipe (rule 21, E5): take `main`'s file, insert -12's protocol row immediately before the `SANCTIONED_BASELINE_DELTAS` `]);` and -12's 3 additions immediately before the `SANCTIONED_BASELINE_ADDITIONS` `]);`.
- Resulting order:
  - DELTAS: …BUG-090 ×5, CR-124 ×6, shared ×1, -11 ×4, -12 ×1.
  - ADDITIONS: -11 `harness.sh`, then -12 ×3.
  - One row per rel.
- Auto-merged with no conflict:
  - `CHANGELOG.md`;
  - `scripts/clean-room/evidence.mjs` (the skills verdict lands at `:1047-1075`, as `STORY-058-11-arch.md` §8 said);
  - `test/scripts/codex-hooks-harness.red.node.test.ts` (91 tests: -11's 90 + -12's 1);
  - `scripts/build-codex-payload.mjs`;
  - canonical `SKILL.md`, `launch_wave.mjs`, protocol, and enforcement (§16 then §17; Index `§15`, `§16`, `§17` in order).
- After the merge, `--check` exits 0 and `gen:codex` changes nothing.
- If BUG-098 merges first, its 2 rows join `main`'s tail and the same recipe applies. BUG-098 overlaps -12 only at `init-fixture.ts` (26-file list compared).

**outer.**
- `git merge-tree c6aec444 sprint/S-41` is clean, and `c6aec444` is an ancestor of `sprint/S-41`.
- Discard the build twins, merge, `cp` the 5 twins from the integrated canonical, `cmp`.

**Integrated verification, measured.**
- 135 default-tier files: 1891 tests, 1890 pass, 0 fail, 1 skipped. All BUG-090 parity reds and `contract-first-dag-text` T4/T5 clear.
- M2 pair 5/5, 15/15.
- `verify-pack` **232 files / payload 88** (from 222/83).
- Payload identity against `main'`: exactly the E9 list. Every per-root `MANIFEST.json` also differs in `generated_at`, and the codex one differs in nothing else (TPV-A5).
- Integration-tier reds: `sprint-execution-mirror` (RS-5) and `canonical-live-parity` 5d (live `token-ledger.sh`, not -12).

**DevOps full suite (D4).** Previous recorded total + 52 default-tier, 0 fail:
- -12 right after -11 (forecast 3486/3484/0/2): **3538 / 3536 / 0 / 2**.
- BUG-098 (+27) between them: **3565 / 3563 / 0 / 2**.

Not run here (harness lane, integration-only witnesses): the -09 e2e, the -10 codex e2e, the scripted `codex-hooks` QA-Verify run, and the paid dispatch-path probe (37).

## Developer brief

Precedence: this brief, then M6 TPV-A1..A6, then E0–E12, then the M6 blueprint. Start only after QA-Red applies `reports/STORY-058-12-tpv-reseal.patch` on `e320ec4` (3-point gate: sha256 `ed47ca87…76ef`; `git apply --check` clean; staged list equals the 8 files, +157/-20, 0 CR bytes) and re-measures 62 red / 2 anchors.

**Paths.**
- cli `<cw>` = `OUTER/.worktrees/STORY-058-12/cleargate-cli`.
- outer `<ow>` = `OUTER/.worktrees/STORY-058-12`: twins stay uncommitted during the build.
- Run `npm run prebuild && npm run build` in `<cw>` before tests 22 and 33 and any dist-spawning test.

**File allow-list.**
- **Pass A (cli):**
  - `scaffold/core/.cleargate/scripts/launch_wave.mjs`: header block, `verdictMalformationReason`/`validateVerdicts`, and the usage string only;
  - new `scaffold/core/.cleargate/scripts/dispatch_serial.mjs` and `scaffold/core/.cleargate/scripts/lib/flashcard-gate.mjs`, both 100644;
  - `scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md`: P1/P2 only;
  - new `scaffold/hosts/claude/.claude/skills/sprint-execution/dispatch-serial.md`;
  - `scaffold/core/.cleargate/knowledge/cleargate-protocol.md`;
  - `scaffold/core/.cleargate/knowledge/cleargate-enforcement.md`.
- **Pass A (outer):** `cp` then `cmp` for `.cleargate/scripts/{launch_wave.mjs,dispatch_serial.mjs,lib/flashcard-gate.mjs}` and `.cleargate/knowledge/cleargate-{protocol,enforcement}.md`.
- **Pass B (cli):**
  - `src/hosts/{types,claude,codex,registry}.ts`;
  - `scripts/build-codex-payload.mjs`: renderer, 2 plan entries, `CodexRenderError` in `main()`'s catch, and the `:70-74` comment;
  - `scripts/clean-room/evidence.mjs`: `codexSkillsVerdict` only;
  - `CHANGELOG.md`;
  - generated `scaffold/core/.agents/skills/sprint-execution/{SKILL.md,dispatch-serial.md}` via `npm run gen:codex`.
- **Never:**
  - any test, fixture or `test/helpers/init-fixture.ts`;
  - `src/hosts/manifest-query.ts`, `src/hosts/lifecycle.ts` (TPV-A6);
  - `scripts/clean-room/codex-hooks.mjs`, `src/lib/manifest-builder.ts`;
  - `scripts/codex-sprint-execution.mjs` (not created).
- Pass B edits no pass-A file.

**Make-green sets.**
- **Pass A:**
  - `dispatch-verdict-modes` 5/5, `dispatch-serial` 8/8, `dispatch-serial-cli` 7/7, `flashcard-gate-parity` 14/14;
  - `skill-md-serial-pointers` 3/3, `dispatch-serial-doc` 3/3, `serial-dispatch-docs` 2/2, `serial-twins` 1/1;
  - `codex-enforcement-delta` 15/15 (twins in `<ow>`);
  - the M2 pair 5/5 and 15/15 (`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, compare only).
- **Pass B:** `dispatch-mode` 2/2, `codex-sprint-execution-render` 3/3, `init-codex-sprint-execution` 3/3, `portable-skills` 6/6, `codex-hooks-harness` 85/85, `lifecycle-codex` 6/6. Test 37 skips; QA-Verify runs it.
- **Anchors that must stay green:** the E8 build-phase list, measured green on the conformant build, including:
  - `wave-execution-barrier` 23/23, `bug-034` 5/5;
  - the SKILL readers, `waves-json-v2`, `no-inline-id-regex` 7/7;
  - `enforcement-section-13` 11/11 (with dist and twins);
  - `ratchet-retired` 8/8, `file-surface-gate-e2e` 21/21;
  - both script gates exit 0 and `--check` exits 0.
- **Rule-16 set:** 25 files (`command grep -rl CLEARGATE_META_ROOT test`, helper excluded), run without the override.

**Pinned signatures and texts.**
- **AD-M6-1/E6.1:**
  - `export type DispatchMode = 'wave-parallel' | 'serial';` and `readonly dispatchMode: DispatchMode;`;
  - `SERIAL_DISPATCH_SURFACE = '.agents/skills/sprint-execution'`;
  - `serialByName` plus the loop condition, verbatim.
- **E6.6:** `validateVerdicts(verdicts, options)`.
  - `options == null` or `mode === undefined` means wave.
  - An unknown mode throws `TypeError("validateVerdicts: unknown mode '<m>'")` before iterating.
  - Serial messages: `'tokens' must be the measured object or exactly { metering: 'unavailable' }` and `'devSha'|'qaSha' must be a non-empty string, or null on a non-GREEN serial verdict`.
  - The usage string is `'Exports validateVerdicts, mintRunId, worktreeAddCommand, storyBases, integrationReady, launchWave. '`.
- **E6.5:** `cardHash`, `flaggedCards → {cards, unterminated}`, `reportFiles`, `pendingFlashcards → {ok, unprocessed:[{card,hash,report}], unparseable}`.
  - Port `.` as `[\s\S]` and `[[:space:]]` as `[ \t\n\v\f\r]`.
  - Check order: JSON mode, inline `[]`, JSON open, YAML key, md heading, stop rules, list item.
  - Split on `\n` only and pop one trailing `''`.
  - Markers must be regular files; skip dot-files and directories.
- **AD-M6-4/E6.4:** `SERIAL_EXIT`, `sprintBranchFor`, `serialLogPath`, `readVerdictLog`, `nextAction`, `dispatchSerial`, and the next/record table.
  - Validate the wave id, `schema_version`, the wave and every story id before any use.
  - `next`: halt or complete before the gate; the gate before `dispatch`.
  - `record`: validate, then check membership, then append.
  - Realpath main guard.
  - The source never contains `SKIP_FLASHCARD_GATE`.
  - Only `ORCHESTRATOR_PROJECT_DIR` is read.
- **E6.2/E6.3:** `CODEX_SKILL_BANNED` (11 tokens in E6.2 order), `CODEX_SKILL_REPLACEMENTS = { R1..R6 }`, `renderCodexSprintExecution`, `CodexRenderError`.
  - Resolve all nine anchor lines by prefix first, then splice bottom-up, then scan for banned tokens.
  - A5 per TPV-A2 item 5.
  - Both plan entries use `FILE_MODE`.
- **E4:** PASS detail `flashcard, sprint-dashboard, sprint-execution room-local`; FAIL `not listed room-local: <names>`.
- **Texts:**
  - P1/P2 (M6 `:296`, `:300`);
  - `dispatch-serial.md` (E6.9);
  - R1/R3/R4/R5 (M6 appendix), R2/R6 (E6.9);
  - protocol intro (E6.7, 3 lines after `:854`, no blank) and §23.5 (M6 appendix, after `:919` with one blank before);
  - bullet 10 (E6.8a), Index row after `§16` (E6.8b), §17 (E6.8c);
  - the CHANGELOG line (M6 `:353`).
- **Self-check hashes (TPV-A3):**
  - `SKILL.md` `cecf1700…3bc0`;
  - `dispatch-serial.md` `496feae3…09b0`;
  - protocol `a95a5382…405a`;
  - enforcement `22a09dab…baac`;
  - generated `.agents` `SKILL.md` `ec54c401…40b3` (824 lines).

**Twin check.** For each of the 5 twins: `cp <cw>/scaffold/core/<rel> <ow>/<rel> && cmp <cw>/scaffold/core/<rel> <ow>/<rel>`.

**Named build-phase reds.** Expected until integration; do not chase them.
- `contract-first-dag-text` T5;
- `gate-section-index-pinning` S1c;
- `close-sprint-step-2-6c` S5, `close-sprint-step-7-4` S3, `template-claude-md` ×3, `wiki-ingest-sprint-report` S14;
- integration tier: `canonical-live-parity` 5a/5d and `sprint-execution-mirror` (RS-5).
- `init-from-source` S1 is red only under concurrent runs.
- If you run `push-hierarchy.node.test.ts`, it rewrites `<ow>/.cleargate/delivery/**`. Revert only that path afterwards, never the twins.

**D4.** Previous recorded total + 52 default-tier, 0 fail (3538 or 3565, per the forecast).

**Commits.**
- One cli commit per pass, with the two subjects pinned at `plans/M6.md:579-580` (pass A: serial dispatch contract; pass B: host dispatch mode and Codex rendering).
- The outer twins stay uncommitted until integration (E7).

## Orchestrator actions

1. Commit `plans/M6.md` (TPV-A1..A6), this report and `reports/STORY-058-12-tpv-reseal.patch` on `sprint/S-41` as an orchestrator chore (`SKIP_SURFACE_GATE=1`, rule 17).
2. Dispatch QA-Red to apply the patch on cli `story/STORY-058-12` @ `e320ec4` with the 3-point gate, re-measure 62 red / 2 anchors, and commit.
3. Dispatch Developer pass A, then pass B, citing this brief and TPV-A1..A6.
4. At close, file the TPV-A6 follow-up under EPIC-058 (serial-surface rule in `addHost`, before any `wave-parallel` host declares `.agents`).

## Script Incidents

None. No `run_script.sh` invocation.

## Scratch and git status

- Scratch `/private/tmp/cg-s41-tpv12-20260926T182511` was removed at the end, by exact path.
- `<cw>` and `<ow>` `git status --porcelain` were empty before and after. The only `<cw>` interaction was a read-only `git apply --check`.
- No commit, stash, prebuild or build touched any real checkout. The M2 baseline was only read through `CLEARGATE_INIT_BASELINE`. No `CODEX_HOME` or `~/.codex` access, no codex binary, no clean-room harness.

```yaml
flashcards_flagged:
  - "2026-09-26 · #tpv #test-harness · Two Promise.resolve() ticks can't outrun 3 awaited seams; yield setImmediate before a 'not started yet' assert."
  - "2026-09-26 · #host #lifecycle · addHost copies owned∪shared roots (lifecycle.ts:293), not payloadFilter: payloadFilter-only rules never reach host add."
  - "2026-09-26 · #tpv #test-harness · A pin check that reads its list from the module (mod.X ?? default) is vacuous; pin banned lists and texts by value."
  - "2026-09-26 · #codex #skill · Anchored renderer: resolve every anchor before the banned-token scan, or a deleted anchor reports a neighbour's token."
```
