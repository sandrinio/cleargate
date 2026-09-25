# STORY-058-01 TPV — Round 1

role: architect

TPV: BLOCKED-WIRING-GAP — Scenario 7c asserts the whole re-init `.gitignore` equals `'user-added-pattern/\n'`, but init Step 5d (`src/commands/init.ts:510-527` → `src/init/root-gitignore.ts:112-116`) always appends its managed `# >>> cleargate >>>` block to a block-less user file, so no implementation of this story can turn 7c green.

Inputs:
- cli `story/STORY-058-01` at QA-Red `744cb5e` (clean apart from the pre-existing untracked `cleargate-0.25.0.tgz`).
- Outer worktree `.worktrees/STORY-058-01` at `3715d987`. Merge base with `sprint/S-41` is `4c791c28`, and `cleargate-planning/` has no diff between the two.
- Story file, M1 plan §STORY-058-01 (`plans/M1.md:158-238`) and Cross-story risks (`:332-338`), QA-Red report, flashcards.

## QA-Red fixes (test-only; fixes 1-3 required, 4 required with the plan amendment below, 5 recommended)

All five were applied to a scratch copy and measured (see Simulation). Each is a test-file edit only.

1. **Blocker — 7c `.gitignore` (`test/scripts/scaffold-relocation.red.integration.node.test.ts:240`, `:252`).**
   - Init owns only the bounded block of the root `.gitignore`; the user owns everything outside it (`root-gitignore.ts:14-21`). Make the user edit outside the block, and assert that it survives byte for byte.
   - `:240` → `const userGitignore = 'user-added-pattern/\n' + fs.readFileSync(path.join(target, '.gitignore'), 'utf8');` followed by `fs.writeFileSync(path.join(target, '.gitignore'), userGitignore);`
   - `:252` → `assert.strictEqual(fs.readFileSync(path.join(target, '.gitignore'), 'utf8'), userGitignore);`
   - This still kills a broken `FIRST_INSTALL_ONLY`: a forced overwrite would replace the file with the payload `.gitignore` plus the block, which is not equal to `userGitignore`.
2. **Stub the resolver probe in every `initHandler` call.**
   - Without a stub, `initHandler` Step 7.6 (`init.ts:616-651`) spawns `which cleargate` and then a bare `cleargate --version`, which here is the global 0.26.1 (rule 18). On a machine with no global install it runs `npx -y cleargate@0.99.0-relocation-test --version` with a 15-second timeout, which makes the test depend on the network.
   - After `:141`, add:
     `const PROBE_STUB = (() => ({ status: 0, stdout: '', stderr: '' })) as unknown as NonNullable<Parameters<typeof initHandler>[0]>['spawnSyncFn'];`
   - Add `spawnSyncFn: PROBE_STUB,` to the `initHandler` options at `:190` (7b) and `:231` (7c `runInit`). The precedent is `test/commands/init-from-source.node.test.ts:227`.
3. **Coverage gap — plan scenario 7, "`init` with fixed pin/time also gives identical output" (`M1.md:209`).**
   - 7b only checks that the seams come back unchanged (`installed_at`, `pin_version`). No test compares a full init from the baseline payload against a full init from the new one, and that comparison is exactly the story's Gherkin "Relocation changes no installed output".
   - 7a cannot stand in for it, because `copyPayload` skips `CLAUDE.md` (`copy-payload.ts:63`). The CLAUDE.md-block mutant below is killed only by scenario 6 and this new test.
   - Insert before `:170` a test gated on the baseline env var, like 6 and 7a:
     - Compose into `composed`.
     - Rebuild `composed/MANIFEST.json` with `now: () => new Date(<baseline MANIFEST generated_at>)`, the same frozen-clock rule as scenario 6.
     - Run `initHandler({ cwd, payloadDir, pin: FIXED_PIN, now: FIXED_NOW, yes: true, spawnSyncFn: PROBE_STUB, stdout: () => {}, stderr: () => {} })` once with `payloadDir = BASELINE_DIR` and once with `payloadDir = composed`, each into its own fixture and inside `withRepoRoot`.
     - Assert `assertTreesIdentical(targetBaseline, targetNew, 'init from baseline vs init from new payload')`.
     - Remove all three temp dirs in `finally`.
4. **Scenario 4c census scope (`test/scripts/scaffold-relocation.red.node.test.ts:337-340`); needs the plan amendment below.**
   - Today the test compares the executable set of the whole `scaffold/` tree with the frozen snapshot. The file is in the default `npm test` glob, so the first later story that adds an executable under `scaffold/` turns it red post-merge. STORY-058-11 §3.1 already names `scaffold/core/.cleargate/hooks/lib/harness.sh`, and -10 adds `scaffold/hosts/codex/**`.
   - Key the comparison on the snapshot's own file set instead:
     - Build `snapshotRel` from `coreEntries` and `claudeEntries`, using the same `core/` and `hosts/claude/` mapping.
     - Assert `expectedExecRel.size >= 9`, so the check can never pass vacuously.
     - Assert `deepStrictEqual([...actualExec].filter((rel) => snapshotRel.has(rel)).sort(), [...expectedExecRel].sort())`.
   - It still kills a dropped exec bit and a spurious exec bit on any relocated file. Extra files are already caught by scenario 6's file-list equality.
5. **Recommended — scope scenario 5's first test to the section it names (`:349-350`).**
   - Today it greps the whole `CLAUDE.md`, so a single mention anywhere (the Repo layout block, or a guardrail) satisfies "Dogfood split names both roots as canonical". That is the spelling-coverage risk in flashcard 2026-08-29 `#tpv`.
   - Replace the read with:
     - `const full = …`
     - `const start = full.indexOf('## Dogfood split'); assert.ok(start !== -1)`
     - `const next = full.indexOf('\n## ', start + 1); const content = full.slice(start, next === -1 ? undefined : next);`
   - Keep the two `includes` assertions. The phrases themselves are not stricter than the plan: `M1.md:192` names `cleargate-cli/scaffold/core/**` and `cleargate-cli/scaffold/hosts/claude/**` verbatim.

### PLAN AMENDMENT NEEDED (orchestrator applies it to `plans/M1.md`; it does not block the Developer)

- `M1.md:206`: replace "The executable set in `scaffold/` equals the snapshot's `100755` set." with:
  "For every file the snapshot tracks under `cleargate-planning/{.cleargate,.claude,CLAUDE.md}`, its `scaffold/core` / `scaffold/hosts/claude` twin is executable exactly when the snapshot mode is `100755` (29 today; assert ≥ 9 so the census is never vacuous). Files added under `scaffold/` after -01 are out of scope, so later stories (-10 `hosts/codex`, -11 `core/.cleargate/hooks/lib/harness.sh`) do not red a sealed test."
- `M1.md:209`: replace "Re-init preserves user `.gitignore`, `FLASHCARD.md` and script edits" with:
  "Re-init preserves user `.gitignore` content outside the `# >>> cleargate >>>` block (init Step 5d owns only that block, `root-gitignore.ts:100-117`), plus `FLASHCARD.md` and script edits"

## Check-by-check

| # | Check | Result |
|---|---|---|
| 1 | Scenario ↔ plan mapping | **Gap.** Scenarios 1-6 are covered, with no over-constraint. The collision test is labelled bonus, but it pins `M1.md:183` "with collision rejection", so it is a plan contract, not an invention. Scenario 7 has two defects: 7c is unsatisfiable (fix 1), and the plan's init-level equivalence is missing (fix 3). |
| 2 | Static scans (scenario 1) | **PASS.** -01 is meant to repoint `build-manifest.ts` defaults (`M1.md:165,185`); -02 only parameterizes it. A plan-conformant repoint scans clean in all three files: `'templates', 'cleargate-planning'` has no `'..'` pair, and the regex (`:88`) needs quoted tokens, so prose comments such as `build-manifest.ts:5,299` and the copier's `cleargate-planning/` comments cannot hit. The plan itself says to remove `metaRoot` (`M1.md:184,186`). -02's dev fallback lives in `src/lib/manifest.ts:125-129`, which is not scanned, and -02 introduces no sibling pair in the three scanned files. Measured: 0 hits after the scratch repoint. |
| 3 | `composePayload` contract / exports | **PASS.** Module path `src/lib/scaffold-layout.mjs`, `composePayload(roots, dst)`, `EXCLUDE_DIRS`, `EXCLUDE_FILES` and `REQUIRED_EMPTY_DIRS` all match `M1.md:180-183` verbatim. The expected `EXCLUDE_*` values equal `copy-planning-payload.mjs:53-82`. `[...x]` accepts either a Set or an array. The dynamic, non-literal import (`:59-64`) keeps each test's red separate. |
| 4 | Scenario 4 modes census | **PASS for -01, with a durability defect (fix 4).** The mapping `cleargate-planning/.cleargate` → `core/`, and `.claude` + `CLAUDE.md` → `hosts/claude/`, matches `M1.md:176-177`. The measured census is 29 files: 9 hooks → `hosts/claude`, and 8 scripts + 11 `scripts/test` + `write_dispatch.sh` → `core`, matching `M1.md:179`. No file is expected under the wrong root. |
| 5 | Scenario 5 doc assertions | **PASS (looser than the plan, not stricter).** The phrases match `M1.md:192,197,199`. `DEPRECATED.md` only has to name both roots; the plan also asks for a freeze SHA and "do not edit", which is not asserted. Scoping is recommended (fix 5). |
| 6 | Integration 6/7 seams and gating | **Gap (7c).** `InitOptions.pin` (`init.ts:120`) and `now` (`:81`) exist and feed the snapshot (`:595-598`). `loadPackageManifest({ packageRoot: payloadDir })` (`:562`) reads the `composed/MANIFEST.json` the test builds. The frozen `now` read from the baseline's own `generated_at` round-trips exactly (`buildManifest` writes `toISOString()`). The `FIRST_INSTALL_ONLY` set in 7c matches `copy-payload.ts:79-83`. Gating 6 and 7a on `CLEARGATE_RELOCATION_BASELINE` matches the plan's baseline-capture step (`M1.md:208,211-215`), and QA-Verify can run them unskipped (done here). The defects are 7c (Step 5d, fix 1), the unstubbed probe (fix 2) and the missing init comparison (fix 3). |
| 7 | Root idiom (rule 16) | **PASS.** Unit `:45-48` is `META_ROOT = CLEARGATE_META_ROOT ? resolve(env) : resolve(CLI_ROOT,'..')` — checked on the assignment itself. Scenarios 4c and 5 read through it. The integration file reads only `CLI_ROOT` and the env baseline, never an outer file. Without the override, pre-merge scenario 5 reads MAIN and stays red until the outer merge. That is the expected rule-15 case: name it in the full-suite run; it is not a regression. |
| 8 | Suite hygiene | **PASS.** Every temp dir uses `mkdtemp` + `finally rmSync` (0 leaked `sr-*` dirs after 8 runs). `CLEARGATE_REPO_ROOT` is set and restored around every install. The unit file is in the default `npm test` glob; the integration file is correctly excluded (`package.json:46`). `npx tsc --noEmit -p .` in the cli exits 0, but that config includes only `src/**`. Both red files, original and amended, typecheck clean under a scratch tsconfig that extends the cli config with `rootDir: "."` (exit 0). There were no writes to outer MAIN, the worktree or live `.claude/`; `git status` is unchanged in all three. |

TPV wiring items: the imports resolve (`buildManifest`, `copyPayload`, `initHandler` all exist at the cited paths). `buildManifest`'s `planningRoot`/`outputPath`/`now`/`write` seams match `build-manifest.ts:273-285`. There are no `t.mock.method` calls. There are no before-hooks that leave orphan state. The naming follows §Test Stack.

## Simulation evidence

Scratch copy: the cli without `node_modules`, `.git` or `dist`, with `node_modules` symlinked back. Deleted afterwards.

- **Baseline reproduction (unmodified scratch).**
  - Unit with `CLEARGATE_META_ROOT=WT`: 15 tests, 1 pass, 14 fail.
  - Integration with no env: 4 tests, 0 pass, 2 fail, 2 skipped.
  - Both match the QA-Red report.
- **Plan-conformant fix.**
  - `scaffold/core` and `scaffold/hosts/claude` extracted from the worktree's tracked `cleargate-planning` with `git archive`: 91 files, 29 executable.
  - `scaffold-layout.mjs` built with the verbatim exclusions, unconditional `REQUIRED_EMPTY_DIRS`, and collision-checked compose.
  - Copier, `build-manifest` default and tsup source repointed.
  - Baseline: `cp -Rp templates/cleargate-planning`, then MANIFEST regenerated with a fixed `now`. The payload file set equals the tracked set minus the excluded dirs (81 = 81), so byte equality is achievable.
  - Unit, `META=<scratch git repo holding the snapshot plus a rewritten Dogfood split and DEPRECATED.md>`: **15/15 pass.**
  - Unit, `META=WT` (docs not yet rewritten): 13 pass. The only reds are scenario 5's two doc checks, which fail for the right reason.
  - Integration with `CLEARGATE_RELOCATION_BASELINE` set: 6, 7a and 7b pass. **7c fails:** `actual 'user-added-pattern/\n\n# >>> cleargate >>>\n…\n# <<< cleargate <<<\n'`, `expected 'user-added-pattern/\n'`.
- **Fixes 1-3 applied:** integration **5/5 pass**. **Fixes 4-5 applied:** unit **15/15 pass**. Amended files typecheck clean.
- **Mutants, run against the amended suite (both files, env set):**

  | Mutant | Killed by |
  |---|---|
  | 1 byte appended to a core knowledge file | 6, 7a, new 7-init |
  | One hook `chmod 644` | 6, 4a, 4b, 4c |
  | Edit inside the CLEARGATE block of `hosts/claude/CLAUDE.md` | 6, new 7-init only |
  | Restored reference | all green |

- **Durability of fix 4.** With an executable `scaffold/core/.cleargate/hooks/lib/harness.sh` added (simulating -11), the amended unit file stays 15/15. The original file reds 4c.

## Developer hints (derived from test wiring)

1. `composePayload` must accept an existing, empty `dst`: every test passes a `mkdtemp` dir. Do not throw on existing `dst`, and do not detect collisions by `existsSync` on `dst`. Detect them across the enumerated roots.
2. Resolve `EXCLUDE_DIRS` / `EXCLUDE_FILES` paths relative to each root, which is the logical install path. Recreate an excluded directory empty whenever the source contains it (the scenario 3 `scripts/test` case), and always create `REQUIRED_EMPTY_DIRS`.
3. Preserve modes (`fs.copyFileSync` does). Scenario 4b composes the real `scaffold/` trees.
4. The static scan forbids the `metaRoot` identifier anywhere in the three files, including comments.

## Script Incidents

None. All runs were direct `npx tsx --test` in scratch, not through the wrapper. No new files appeared in `cleargate-cli/.cleargate/sprint-runs/_off-sprint/.script-incidents/` (0 files dated 20260925).

flashcards_flagged: ["2026-09-25 · #test-harness #tpv #init · initHandler post-processes the root .gitignore (Step 5d appends a managed block): assert FIRST_INSTALL_ONLY survival on the user region, never whole-file equality.", "2026-09-25 · #test-harness #tpv #scaffold · A census over a whole growing tree (scaffold/**) compared to a frozen snapshot reds on the next story's first new file; key the census on the snapshot's own file set."]
