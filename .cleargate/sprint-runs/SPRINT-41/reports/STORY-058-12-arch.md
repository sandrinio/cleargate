role: architect

# STORY-058-12 Architect post-flight (integrated tree)

```
VERDICT: PASS
REVIEWED: cli story/STORY-058-12 @ 9a94ff2 (53028ea pass A, 2695eea pass B = C3 as cut, 9a94ff2 merge of cli main 0399beb)
          outer .worktrees/STORY-058-12 @ 929740d9 + 5 uncommitted twins (cmp-identical to integrated canonical)
BLUEPRINT: plans/M6.md -12 blueprint (:224), AD-M6-1..AD-M6-6, E0-E12 (:1506), TPV-A1..A6 (:2344); reports/STORY-058-12-tpv.md Developer brief
BLOCKING FINDINGS: none
RE-INTEGRATION: REQUIRED. cli main moved 0399beb -> e720592 (BUG-098; tree == ff29236) and sprint/S-41 moved to d753c626.
                Measured against those REAL commits in scratch: one mechanical init-fixture.ts conflict (DELTAS tail only),
                no regen, no fixture re-freeze; every targeted set green. DevOps full suite = BUG-098's recorded total + 52.
```

**Method.** I only read the real checkouts: `git show/log/diff/rev-parse`, `shasum`, `command grep`, plus read-only `import()` of `<cw>` modules for the pin, render and differential checks.
- Everything that builds or executes ran in `/private/tmp/cg-s41-pf12-20260926T202154`, which I deleted by exact path at the end. That covered the merges, prebuild, build, tests, init smokes and driver probes.
  - The scratch held `outer/` (an outer clone), `outer/cleargate-cli` (a cli clone) and `pre/cleargate-cli` (cli main `e720592`).
  - Both clones used `git clone --no-hardlinks`.
  - `node_modules` was symlinked from the cli main checkout, and `.claude` was a copy of `OUTER/.claude`.
- **Not done:**
  - no build, prebuild or test in the cli main checkout (the DevOps merge lane was running there);
  - no full `npm test` (rule 20);
  - no clean-room harness, codex binary, `CODEX_HOME` or `~/.codex`;
  - I did not touch the protected `/private/tmp` dirs.
- The M2 baseline was read only through `CLEARGATE_INIT_BASELINE`. Before and after: 425 files, aggregate `bdc4bb1a…62b2`, and 0 files newer than the pre-run marker.

## 1. Conformance to the pinned signatures and texts: PASS

**Pinned code, checked against the TPV brief's "Pinned signatures and texts", at 9a94ff2.**

| Pin | As built | Result |
|---|---|---|
| E6.1 `DispatchMode` + `HostAdapter.dispatchMode` | `src/hosts/types.ts:21` (type), `:90` (`readonly dispatchMode: DispatchMode;`) | exact |
| E6.1 adapter values | `claude.ts:312` `'wave-parallel'`, `codex.ts:279` `'serial'` | exact |
| E6.1 `SERIAL_DISPATCH_SURFACE`, `serialByName`, loop condition | `registry.ts:133`, `:154`, `:184`, verbatim | exact |
| E6.6 mode resolution | `launch_wave.mjs:267-270`: `options == null \|\| options.mode === undefined` → wave; unknown mode → `TypeError("validateVerdicts: unknown mode '<m>'")`, thrown before the array check and before any verdict | exact |
| E6.6 serial messages | `:185` `'<devSha\|qaSha>' must be a non-empty string, or null on a non-GREEN serial verdict`; `:220` `'tokens' must be the measured object or exactly { metering: 'unavailable' }`. GREEN falls through to the default scalar message. Everything is wrapped as `Malformed segment verdict for <id>: …` | exact |
| E3.4 usage string | `:387` `'Exports validateVerdicts, mintRunId, worktreeAddCommand, storyBases, integrationReady, launchWave. '`. The `:384` main guard is untouched | exact |
| E6.5 API | `flashcard-gate.mjs`: `cardHash` `:57`, `flaggedCards → {cards, unterminated}` `:69-151`, `reportFiles` `:170-187` (dot-files and non-regular files skipped), `pendingFlashcards → {ok, unprocessed, unparseable}` `:198-220`. `.` is ported as `[\s\S]` and `[[:space:]]` as `[ \t\n\v\f\r]` (`:34-48`). The check order is JSON mode, inline `[]`, JSON open, YAML key, md heading, stop rules, list item (`:99-147`). It splits on `\n` and pops one trailing `''` (`:96-97`) | exact |
| AD-M6-4 / E6.4 exports | `SERIAL_EXIT` `:50`, `sprintBranchFor` `:83`, `serialLogPath` `:97`, `readVerdictLog` `:108`, `nextAction` `:133`, `dispatchSerial` `:255` | exact |
| AD-M6-4 `next` order | `runNext` `:427-461`: `loadWave` (sprint, wave id, repo, `waves.json`, `schema_version`, wave, stories, every id, log), then halt/complete, then the gate (exit 4 with `unprocessed` + `unparseable`), then `git worktree list`, then dispatch | exact |
| AD-M6-4 `record` order | `runRecord` `:463-497`: `loadWave`, read, parse, `validateVerdicts([v], {mode:'serial'})`, membership, append. Exit 0/3/1 | exact |
| E6.2/E6.3 renderer | `build-codex-payload.mjs`: `CODEX_SKILL_BANNED` `:264` (11 tokens, E6.2 order), `CODEX_SKILL_REPLACEMENTS` `:279` (R1-R6), `CodexRenderError` `:289`, caught in `main()` `:529`. All 9 anchor lines resolved by prefix first (`:334-341`), the A6 sentence counted (`:342-344`), splice bottom-up A4, A3, A2, A6, A1, A5 (`:349-364`), banned scan last (`:368-370`). A6 uses `replace(x, () => R6)`. Two plan entries with `FILE_MODE`, after the portable skills (`:413-430`). `PORTABLE_SKILLS` and `GENERATED_DIRS` unchanged | exact |
| E4 detail strings | `evidence.mjs:1073-1075`: FAIL `not listed room-local: <names>`, PASS `flashcard, sprint-dashboard, sprint-execution room-local` | exact |

**Pinned texts: extracted from `plans/M6.md` programmatically and compared byte for byte, all equal.**
- P1 (`:296`), P2 (`:300`).
- `dispatch-serial.md` (`:1875-1935`).
- R1 (`:1409`), R3 (`:1421`), R4 (`:1426-1428`), R5 (`:1394-1404`), R2 and R6 (E6.9).
- Protocol intro (E6.7) and §23.5 (`:1434-1442`).
- Enforcement bullet 10, the §17 Index row directly after §16, and §17 (E6.8).
- The CHANGELOG line (`:353`).

**Self-check hashes, recomputed at 9a94ff2 and again on the simulated re-integrated tree: all 5 match TPV-A3/A2.**

| Artifact | sha256 | Lines |
|---|---|---|
| canonical `SKILL.md` (numstat 4/0 vs C2 and vs main) | `cecf1700864c631e18bb8efbd31ccc751e200dbf2fd52a2684b87c8782cf3bc0` | 849 |
| `dispatch-serial.md` (Claude canonical = generated `.agents` copy) | `496feae3acbcfd9934216d9ce4a4f9c071a4a7c72955807790e1d23b921309b0` | 61 |
| `cleargate-protocol.md` (13/0) | `a95a5382f0359b1b79522615af22ae4edfac77c8d8d36c715784e6a9babb405a` | 951 |
| `cleargate-enforcement.md` (13/1) | `22a09dab3b813f98d9bbf242c526e8fd6fda35500c47f79e133e9283661abaac` | 615 |
| generated `.agents/skills/sprint-execution/SKILL.md` | `ec54c4013fd4db47de5170c7f2095e318fa523739502d1968983e0456e2740b3`. A fresh `renderCodexSprintExecution(canonical)` is byte-equal to the committed file | 824 |

**File allow-list: PASS.**
- **Pass A (`53028ea`)** changes exactly the 7 allow-listed files.
- **Pass B (`2695eea`)** changes exactly 9 files: `CHANGELOG.md`, the 2 generated files, `build-codex-payload.mjs`, `evidence.mjs` and `src/hosts/{claude,codex,registry,types}.ts`.
  - It shares **no** file with pass A.
- `git diff 03cbb33 2695eea -- test` is empty, so the Developer made no test, fixture or init-fixture edit. The sealed tests are byte-identical to the QA-Red re-seal.
- `lifecycle.ts`, `manifest-query.ts`, `codex-hooks.mjs` and `manifest-builder.ts` are untouched, and `scripts/codex-sprint-execution.mjs` does not exist.
- The integrate merge adds nothing. `git diff 0399beb 9a94ff2` equals `git diff 8c8c5ff 2695eea` in numstat and in the per-file `+`/`-` line sets (34 files).
- Modes: the 3 new payload files and the 2 generated files are all `100644`.

## 2. Claude path intact (Rule 2): PASS

- **Playbook.** The canonical `SKILL.md` diff against C2 `8c8c5ff`, and against cli main `e720592`, is exactly `+4/-0`: blank line + P1 after `:104`, and blank line + P2 after the `A single-story wave is one segment` line. The text is byte-equal to the pins.
- **Wave-mode validator.** It is behaviourally identical to the frozen pre-story module (`test/fixtures/launch-wave-pre-058-12/launch_wave.mjs`, `09088196…`).
  - I ran a differential of 20,000 random mutated verdicts × 5 call forms: `(v)`, `(v, undefined)`, `(v, null)`, `(v, {})` and `(v, {mode:'wave'})`.
  - That is 100,000 calls with **0** outcome differences, comparing both accept/reject and the exact error class and message.
- **`launchWave`.** It is unchanged. The only hunks in `launch_wave.mjs` are the header block (`:41-48`), the validator region (`:154-285`) and the usage string (`:387`). `launchWave` still calls `validateVerdicts(verdicts)` in default mode (`:373`).
- **Install set: measured, not inferred.** I ran `init --yes --pin 0.0.0-pf12` with no flag, using scratch builds of pre-merge main (`e720592`) and of the simulated re-integrated tree. `diff -rq` of the two installs shows exactly:
  - `.claude/skills/sprint-execution/SKILL.md` (P1/P2)
  - `+.claude/skills/sprint-execution/dispatch-serial.md`
  - `.cleargate/scripts/launch_wave.mjs`
  - `+.cleargate/scripts/dispatch_serial.mjs`
  - `+.cleargate/scripts/lib/flashcard-gate.mjs`
  - `.cleargate/knowledge/cleargate-{protocol,enforcement}.md`
  - the install snapshot (3 new entries plus timestamps)
  - `.participant.json` (`set_at` only)

  Beyond that:
  - No `.agents/` was installed.
  - `.claude/settings.json`, every hook, every agent and the CLAUDE.md block are byte-identical.
  - The init stdout differs only by the 3 `Created` lines.
  - The new files are 0644.
- **`--host all`.** `.claude/settings.json` is byte-identical to the no-flag install's and has 0 `codex` matches (goal condition 3). The two `dispatch-serial.md` copies are identical.
- **M2 pair (compare only).** 5/5 and 15/15 on the simulated tree.

## 3. Serial driver safety: PASS (three non-blocking follow-ups)

| Check | Evidence | Result |
|---|---|---|
| Validates before use | CLI `loadWave` (`dispatch_serial.mjs:368-421`) checks `sprintBranchFor` → wave-id regex and `.`/`..` → `waves.json` → `schema_version` ∈ {absent, 2} → wave → `stories` array → every id is an exact work-item id, all before any path or git use. `dispatchSerial` runs `assertWaveStories` (`:155-162`) before any seam. Measured: `--sprint 'SPRINT-99;id'` exits 2, `--wave ../x` exits 2 | PASS |
| Realpath main guard | `isMainModule` (`:516-523`) compares `realpathSync(fileURLToPath(import.meta.url)) === realpathSync(argv[1])`, with try/catch → false | PASS |
| No `SKIP_FLASHCARD_GATE` in source | `command grep` finds 0 hits in `dispatch_serial.mjs` and `lib/flashcard-gate.mjs`. The comments paraphrase it ("the gate's bypass key") | PASS |
| Only `ORCHESTRATOR_PROJECT_DIR` read | The only env read is `env.ORCHESTRATOR_PROJECT_DIR` (`:200`). `process.env` is only passed through to child processes (`:266`, `:387`, `:448`). `flashcard-gate.mjs` reads no env | PASS |
| No shell execution of untrusted strings | Only `execFileSync` is used (`:179`, `:202`, `:217`), with no `shell` option, and there is no `exec`/`execSync`/`spawn`. The printed `worktreeCommand` interpolates only a validated exact id (letters, digits and hyphens, no leading dash) and a `sprintBranchFor` output, so it is shell-safe for the orchestrator's own shell too | PASS (see FU-2) |
| storyId guard | `dispatchSerial` `:320-322` throws `Malformed segment verdict for <id>: verdict names storyId '<x>'.` after validation and before `recordVerdict`. CLI `record` checks wave membership only (`:486-491`), as the plan pins | PASS (see FU-1) |
| Exit codes | `SERIAL_EXIT {0,1,2,3,4}`. `next`: 0 dispatch/complete, 3 halt, 4 flashcards. `record`: 0/3/1. Usage: 2 with an empty stdout. `--help`: 0 | PASS (see FU-3) |
| No ledger write | `record` appends only to `serial/<wave>.verdicts.jsonl` (`:193-196`, `:493`) | PASS |

**Measured probes.** These ran in a scratch `--host codex` install, using the installed `dispatch_serial.mjs`.
- `next` → `{"action":"dispatch","storyId":"STORY-001-01",…,"worktreeCommand":"git worktree add .worktrees/STORY-001-01 -b story/STORY-001-01 sprint/S-99","worktreeExists":false,"resumed":false}`, exit 0.
- **FU-1.** `record` of a GREEN verdict for `STORY-001-03` *before* 01 and 02 → exit 0. After GREENs for 01 and 02, `next` → `wave-complete`. **`STORY-001-03` was never named by `next`, and it counts as done.**
- **FU-3.** `record` with an unwritable `serial/` dir → exit **1**, with a node EACCES stack trace and an empty stdout. The contract maps exit 1 to "the verdict is malformed — fix the verdict".
- **FU-2.** I drove `dispatchSerial` with the default seams from a node script.
  - With well-formed inputs → `complete`, and the worktree was created.
  - `sprintBranch: 'sprint/S-99 --detach'` → git rejected the extra argv token (`options '-b', '-B', and '--detach' cannot be used together`). There is no shell, but argv takes whatever tokens the caller supplies.
  - `sprintId: '../../escaped'` → `complete`, with the log written at `<repo>/escaped/serial/wC.verdicts.jsonl`.
  - `dispatchSerial` has no production caller: the CLI uses `nextAction` and its own validated paths, and `command grep -rl dispatchSerial scaffold src scripts` lists only the module itself.

## 4. Deviation rulings

| # | Source | Deviation | Where | Ruling |
|---|---|---|---|---|
| D1 | dev | `dispatchSerial` rejects a verdict whose `storyId` differs from the dispatched story | `dispatch_serial.mjs:320-322` | **ACCEPT.** Without it, `nextAction` names the same story forever, which is an unbounded loop. It sits after `validateVerdicts` and before `recordVerdict`, so nothing is recorded, and it reuses the validator's `Malformed segment verdict for <id>:` wrapper (test 12's family). The CLI `record` has no equivalent, so the production path keeps the gap; see FU-1. |
| D2 | dev | Default seams: `createWorktree` = the printed command split on spaces via `execFileSync` (no shell); `worktreeExists` = `git worktree list --porcelain` with a realpath compare; `flashcardGate` = `pendingFlashcards`; `recordVerdict` appends to `serialLogPath`; repo root = `env.ORCHESTRATOR_PROJECT_DIR`, else the git top level | `:168-229` | **ACCEPT with follow-up (FU-2).** It runs without a shell (verified). argv is safe for every validated input: story ids are exact ids, and the CLI branch is `sprintBranchFor`. The realpath compare is right under `/tmp`→`/private/tmp` (flashcard 131). The seams read `env` only for `ORCHESTRATOR_PROJECT_DIR`, and are never built when all four seams are injected, so test 9's Proxy env is untouched. But `dispatchSerial()` validates neither `sprintId` nor `sprintBranch` (measured, §3). There is no production caller, so this does not block. |
| D3 | dev | Unpinned edge exits and error: an unreadable `--verdict` file exits 2; a corrupt serial log exits 2; a non-JSON verdict exits 1 ("not valid JSON; nothing recorded"); the renderer adds `codex-sprint-execution: anchors out of order`; plan-only lists every wave story | `:466-479`, `:414-419`; `build-codex-payload.mjs:356-363`; `dispatch_serial.mjs:270-276` | **ACCEPT.** A bad path is a usage error. A corrupt log fails closed, with nothing appended, and needs a human. A non-JSON verdict is a malformed verdict, and there is no storyId to name. The extra render error keeps the `codex-sprint-execution:` prefix, and `main()` catches it (exit 1). Plan-only mirrors `launchWave`'s plan-only and test 11. |
| D4 | dev | One JSDoc sentence was added to `planCodexPayload`, and the file header's (a)/(b)/(c) list was left as is | `build-codex-payload.mjs:376-381` | **ACCEPT.** It is inside the allow-listed file and documentation only. The header still says "plans three kinds of files" (FU-4). |
| I1 | integrate | `checkout --` was run on the 3 tracked twins only; the 2 untracked new twins were overwritten by `cp` | process | **ACCEPT.** All 5 build copies were `cmp`-equal to canonical before the discard, and the re-derived twins are `cmp`-equal to the integrated canonical (hashes in §5). |
| I2 | integrate | No second outer merge after sprint/S-41 moved to `4d6f3a99` | process | **ACCEPT, superseded.** BUG-098 has since merged in both repos, so a full re-integration is required anyway (§5). |

## 5. Re-integration forecast: MEASURED against the real BUG-098 merge

**State at review time.**
- cli main = `e720592`, which is `merge(story/BUG-098)` with parents `0399beb` + `ff29236`. Its tree `482846b4` is **identical** to `ff29236`'s. It is therefore exactly the brief's simulation "0399beb + merge of ff29236", and I used the real commit.
- Outer sprint/S-41 = `d753c626`. That is `3898c05e` (the merge of story/BUG-098) plus `fb5bd4b0` (the -12 integrate report) plus `d753c626` (a flashcard chore).
- DevOps for BUG-098 was still in its full-suite step, so the outer main checkout's `.cleargate/delivery/**` was dirty from `npm test` (rule 14). I did not touch it.

**cli** (scratch clone at 9a94ff2, then `git merge --no-ff e720592`):
- **Merge base.** `0399beb` is the single merge base; the criss-cross is gone.
- **Conflict.** `git merge-tree` predicted, and the merge produced, exactly one conflict: `test/helpers/init-fixture.ts`, a single hunk at the `SANCTIONED_BASELINE_DELTAS` tail. There, -12's protocol row and BUG-098's 2 rows were both appended after the -11 rows. The `SANCTIONED_BASELINE_ADDITIONS` tail auto-merges, because BUG-098 adds no additions.
  - Every other BUG-098 file (`src/commands/{doctor,sprint,wiki-audit-status}.ts`, `src/lib/*`, 2 `scaffold/core` scripts, its tests) auto-merges without touching -12's surface.
- **Resolution (rule 21, row level).**
  1. Take `git show main:test/helpers/init-fixture.ts` verbatim.
  2. Cut -12's two blocks from `2695eea`. Each runs from the `// ── STORY-058-12` header to the line before the next `]);`: 14 lines and 35 lines.
  3. Insert the first before main's DELTAS `]);` (main `:868`) and the second before main's ADDITIONS `]);` (main `:930`).
- **Result.** It is a pure 49-line insertion (`diff main resolved` = `867a868,881` + `928a943,977`, 0 deletions), with 0 duplicate `rel:` values. The tail order is:
  - DELTAS: -06, -07, BUG-085 ×2, -10 ×3, BUG-090 ×5, CR-124 ×6, the shared `STORY-058-11+CR-124` row, -11 ×4, **BUG-098 ×2**, then **STORY-058-12 ×1**. BUG-098's rows sit ahead of -12's protocol row, in main's order.
  - ADDITIONS: -11 `harness.sh`, then **-12 ×3**.
- **Delta proof.**
  - `git diff main HEAD` equals `git diff 8c8c5ff 2695eea`, in numstat and in the per-file line sets.
  - `git diff 9a94ff2 HEAD` equals `git diff 0399beb main` (BUG-098's delta only: 26 files, +2018/−118).
- **No regeneration.** `build-codex-payload.mjs --check` exits 0.
- **No fixture re-freeze.** Main still carries the E3.3 bytes: `SKILL.md` `e7c730ef…`, `launch_wave.mjs` `09088196…`, protocol `be92d45a…`.
- **Build.**
  - prebuild: payload **88**, split view **107**, manifest **82**.
  - `npm run build` and `npm run typecheck`: exit 0.
  - `check-no-inline-id-regex` and `check-no-exec-mode-vocab`: exit 0.
  - **`verify-pack`: `OK — 232 files, payload 88, version 0.26.1`.** That is unchanged from 9a94ff2; BUG-098 adds no payload file.

**outer** (scratch clone at 929740d9, then `git merge --no-ff origin/sprint/S-41`):
- **Merge.** Clean (`merge-tree` exit 0). The result tree equals sprint/S-41's.
- **Upstream changes.** `3236bdce..d753c626` touches none of the 5 twin paths. It touches only BUG-098's twins `prep_reporter_context.mjs` and `dedupe_frontmatter.mjs`, plus FLASHCARD, markers and reports. In the real `<ow>` the merge therefore will not refuse, even with the build twins in place. Rule 21 still says discard, merge, `cp`, `cmp`.
- **Re-derived twins.** They are unchanged from the build and integrate tables:
  - `launch_wave.mjs` `b26505e8…`
  - `dispatch_serial.mjs` `862e72f4…`
  - `lib/flashcard-gate.mjs` `95f38115…`
  - protocol `a95a5382…`
  - enforcement `22a09dab…`

**Targeted suites on the simulated tree** (solo `npm run test:file`, META_ROOT = scratch outer holding the twins):

| Set | Result |
|---|---|
| The 15 -12 files | **155/155/0/0**: 5, 8, 7, 14, 3, 3, 2, 1, 2, 3, 3, 6, **harness 91**, 6, and e2e 1 (`ℹ NOT RUN` diagnostic) |
| BUG-098's 12 default files | **139/139/0/0**: 4, 5, 18, 2, 30, 3, 14, 8, 28, 14, 9, 4. Plus its e2e `sprint-allow-drift-fresh-install` 1/1 |
| M2 pair (`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, compare only) | **5/5, 15/15**. Baseline untouched |
| `codex-hooks-harness` | 91/91 (in the 15) |
| Rule-16 sweep (25 files, helper excluded, no override) | **338/338/0/0** |
| Anchors | `wave-execution-barrier` 23/23, `bug-034` 5/5, `hooks-claude-parity` 19/19, `canonical-live-parity` 11/11 |
| Named red (RS-5) | `sprint-execution-mirror` 3/4, "diff live vs canonical", which is P1/P2 |

**Payload identity (E9 / TPV-A5).**
- I ran `diff -rq` on `templates/` from the pre-merge main build and from the simulated build. The only differences are:
  - the 5 flat `cleargate-planning` paths plus `.agents/skills/sprint-execution/`;
  - their `templates/scaffold/{core,hosts/claude}` equivalents;
  - the four `MANIFEST.json` files.
- `hosts/codex/MANIFEST.json` differs only in `generated_at` (`jq -S 'del(.generated_at)'`).
- The new manifest rows are all `overwrite_policy: always`, `preserve_on_uninstall: false`:
  - the 2 `.agents/…/sprint-execution` files: tier `skill`;
  - Claude `dispatch-serial.md`: tier `skill`;
  - `dispatch_serial.mjs` and `lib/flashcard-gate.mjs`: tier `script`.

**Codex smoke** (`init --yes --pin 0.0.0-pf12 --host codex`, single `(cd <literal> && …)` call):
- `.agents/skills` = `flashcard`, `sprint-dashboard`, `sprint-execution`.
- The `/workflows` count in the rendered `SKILL.md` is 0, and there is no `.claude/`.
- `node .cleargate/scripts/dispatch_serial.mjs --help` exits 0, and `verify-install` exits 0.
- The installed hashes are `ec54c401…` and `496feae3…`.
- Both snapshot entries have owner `core`.

## 6. DevOps full-suite forecast

- **Expected total: BUG-098's recorded total + 52 default-tier tests.** Per the BUG-098 re-integrate forecast, that is **3513 + 52 = 3565 tests / 3563 pass / 0 fail / 2 skipped**.
  - The +52 breaks down as 11 new default-tier files (51 tests) plus `codex-hooks-harness` 90 → 91.
  - The integration tier gains 1 (test 37), which `npm test` excludes.
  - If BUG-098 records a different number, apply +52 to it.
- **Expected transient first-pass reds (not regressions).** `npm test` does not prebuild, so the main checkout's `templates/` still holds the previous BD's payload.
  - I modelled this by swapping pre-merge `templates/` and `dist/` into the simulated tree. I then ran all 52 default-tier files that read `templates/`, plus the -12 files: **749/747/2/0**. The only reds were:
    - `test/scaffold/skill-md-conditional-architect.red.node.test.ts` S5 ("payload SKILL.md is byte-identical to canonical");
    - `test/scaffold/skill-md-serial-pointers.red.node.test.ts` Test 22 ("templates/cleargate-planning SKILL.md must equal canonical after prebuild").
  - This follows the CR-124 DevOps precedent (flashcard `#devops #test-order`, line 27): `status-vocab-phase-b`'s `before()` runs a real prebuild mid-suite. If both files run before it, the first pass reads **3565 / 3561 / 2 / 2**. A solo re-run of each after the suite gives the corrected **3565 / 3563 / 0 / 2**. Name both in the DevOps report; never prebuild outside BD.
- **Surface gate** (flashcard `d753c626`, BUG-098 blockers report). The outer twin commit on `story/STORY-058-12` needs STORY-058-12 to be the max-`updated_at` item. -12 is `Bouncing` now, so do a **genuine** state transition, not a same-state no-op, immediately before that commit. -12's §3.1 lists all 5 twins.
- **Post-BD:**
  - verify-pack 232/88;
  - `--check` exit 0;
  - M2 pair 5/5 + 15/15;
  - doctor prints exactly 2 `scaffold drift:` lines (sprint-execution `SKILL.md` and `dispatch-serial.md`) until RS-5 (E9).

## 7. Follow-ups (non-blocking; file under EPIC-058 at close)

- **FU-1 — `record` can make a story count as done without it ever being dispatched** (measured, §3).
  - The production CLI accepts any wave member. A verdict naming a later story marks it GREEN, and `next` then never names it. This is the CLI twin of D1.
  - Fix: `record` requires `verdict.storyId === nextAction({ wave, verdicts, resume: true }).storyId`, else exit 1, with a sealed CLI case.
  - SPRINT-41 is not exposed: -13's loop runs a single story (AD-M6-7). Land it before any multi-story serial wave.
- **FU-2 — `dispatchSerial()` does not validate `sprintId` or `sprintBranch`** (measured: an extra argv token reached git, and `../../escaped` wrote outside `sprint-runs/`).
  - Assert `sprintBranch === sprintBranchFor(sprintId)` at entry; the sealed tests use `SPRINT-99`/`sprint/S-99`, so they are unaffected.
  - Validate `wave.wave` before any seam, not only inside `recordVerdict`.
  - Build the default `createWorktree` argv from the validated tokens, not from `cmd.split(' ')`, and assert that it re-joins to the printed command.
- **FU-3 — Unexpected errors exit 1, which collides with `SERIAL_EXIT.INVALID`.** An I/O failure in `record` prints a stack trace and exits 1, which the contract tells the orchestrator means "fix the verdict". Catch non-usage errors in `main()` and give them their own code, or map them to 2 with a message.
- **FU-4 — The `build-codex-payload.mjs` file header (`:7-24`) still lists three kinds of files.** Add (d), the sprint-execution rendering plus the `dispatch-serial.md` copy, the next time the file is touched.
- **FU-5 — Payload-parity tests read the built artifact.** `skill-md-conditional-architect` S5 and `skill-md-serial-pointers` Test 22 compare canonical against the main checkout's `templates/`, so every canonical `SKILL.md` edit goes red before BD (§6). Compose into a temp dir (`composeCanonicalPayload`) or skip when `templates/` is older than canonical.
- **FU-6 (low) — Card hashes can diverge on non-UTF-8 reports.** `flashcard-gate.mjs` decodes reports as UTF-8, while the hook hashes raw bytes, so a report with invalid UTF-8 gets different hashes. Agents write UTF-8 and the parity corpus is UTF-8. Read the file as a Buffer and hash the card's original bytes if this ever matters.
- **TPV-A6** (already recorded): `host add` bypasses `payloadFilter`'s serial-surface rule (`lifecycle.ts:293-294`). It is a prerequisite for the first `wave-parallel` host that declares `.agents`.

## 8. Observations for the orchestrator

- **C3 moved during this review, and not by this dispatch.** The `contract/S-41-loop` reflog shows `2695eea` (created `2026-09-26 23:54:51 +0400`), then **`9a94ff2`** at `2026-09-27 00:37:56 +0400`, with an empty reflog message. The integrate report still says "C3 = 2695eea". Whoever re-derives -13 against C3 should use the current ref value.
  - The frozen exports are identical at both SHAs: the merge adds no -12 change.
  - Re-integrating -12 onto BUG-098 will move `story/STORY-058-12` again. `contract/S-41-loop` stays at `9a94ff2` unless someone moves it.
- **No -12 QA-Verify report exists yet.** The E8 integration-only witnesses remain QA-Verify's, and this review does not cover them:
  - the paid dispatch-path probe (test 37: `HALT` on Claude, `SERIAL` on the Codex rendering);
  - the harness-lane scripted `codex-hooks.mjs run` (`codex.live.skills` and `codex.live.roles` PASS);
  - the diff of `SKILL.md` against `main` just before the merge (+4).

  Under rule 21 they run on the re-integrated tree.

## Plan amendments to append to M6.md

The orchestrator should append the block below to the end of `plans/M6.md` verbatim, after the -13 architect's append lands.

````markdown
## Post-flight rulings (STORY-058-12, 2026-09-27; role: architect; append-only)

Source: `reports/STORY-058-12-arch.md` (VERDICT: PASS). These rulings are binding for STORY-058-12 and win over anything above that they contradict. They change no Gherkin, no scope, no file list and no test count.

**PF12-A1: Deviation rulings (they bring the plan in line with the build at cli `2695eea`).**
- D1 **ACCEPT.** `dispatchSerial` throws `Malformed segment verdict for <id>: verdict names storyId '<x>'.` when a validated verdict names a story other than the dispatched one. The check runs after `validateVerdicts([v], { mode: 'serial' })` and before `recordVerdict`, so nothing is recorded. This is now part of AD-M6-4.
- D2 **ACCEPT with follow-up (PF12-FU-2).** The default seams are part of AD-M6-4:
  - `createWorktree` runs the printed `worktreeAddCommand` via `execFileSync` with no shell;
  - `worktreeExists` uses `git worktree list --porcelain` with a realpath compare;
  - `flashcardGate` is `pendingFlashcards({ sprintDir })`;
  - `recordVerdict` appends `{...verdict, recorded_at}` to `serialLogPath`;
  - the repo root is `env.ORCHESTRATOR_PROJECT_DIR`, else the git top level;
  - the defaults are built only when a seam is missing.
- D3 **ACCEPT.** These edge behaviours join the AD-M6-4 CLI table and E6.2:
  - `record`: an unreadable `--verdict` file exits 2; a corrupt serial log (`next` or `record`) exits 2; a non-JSON verdict exits 1 with `the verdict is not valid JSON (…); nothing recorded.`;
  - the renderer also throws `codex-sprint-execution: anchors out of order` for an inverted or overlapping range;
  - plan-only `dispatchSerial` lists every wave story regardless of recorded verdicts.
- D4 **ACCEPT.** One JSDoc sentence was added to `planCodexPayload`; the file header is PF12-FU-4.
- Integrate I1 (discard 3 tracked twins and `cp` the 2 untracked ones) and I2 (no second outer merge) **ACCEPT**. I2 is superseded by PF12-A2.

**PF12-A2: Re-integration onto cli main `e720592` (BUG-098 merged; tree `482846b4` = `ff29236`) and sprint/S-41 `d753c626` (measured in scratch).**
- **cli.**
  - `git merge --no-ff main` on `9a94ff2`. The single merge base is `0399beb`.
  - There is exactly one conflict: `test/helpers/init-fixture.ts`, one hunk at the DELTAS tail. The ADDITIONS tail auto-merges.
  - Resolve by taking main's file verbatim, then inserting -12's 14-line protocol block before the DELTAS `]);` and -12's 35-line additions block before the ADDITIONS `]);`. The result is a pure 49-line insertion.
  - Resulting order:
    - DELTAS: …, -11 ×4, BUG-098 ×2, STORY-058-12 ×1;
    - ADDITIONS: -11 `harness.sh`, STORY-058-12 ×3;
    - one row per `rel`.
- **Proof.**
  - `git diff main HEAD` equals `git diff 8c8c5ff 2695eea`, in numstat and in the per-file line sets.
  - `git diff 9a94ff2 HEAD` equals `git diff 0399beb main`.
- **No regeneration.** `--check` exits 0.
- **No fixture re-freeze.** Main still has `e7c730ef…`, `09088196…` and `be92d45a…`.
- **Build.** prebuild 88/107/82; verify-pack 232/88.
- **outer.** `git merge --no-ff sprint/S-41` is clean, and upstream touches no -12 twin path. Re-derive the 5 twins with `cp` and `cmp`. The expected hashes are unchanged:
  - `b26505e8…`, `862e72f4…`, `95f38115…`;
  - `a95a5382…`, `22a09dab…`.
- **Expected verification.**
  - the 15 -12 files 155/155 (harness 91);
  - BUG-098's 12 default files 139/139 plus its e2e 1/1;
  - M2 5/5 + 15/15;
  - rule-16 (25 files) 338/338;
  - named red: `sprint-execution-mirror` 3/4 (RS-5).

**PF12-A3: DevOps deltas to E9.**
- **Full suite.** Expect BUG-098's recorded total + 52 (3513 + 52 = 3565 / 3563 / 0 / 2).
- **Transient first-pass reds** (stale `templates/`, flashcard `#devops #test-order`): `skill-md-conditional-architect` S5 and `skill-md-serial-pointers` Test 22.
  - Re-run each solo after the suite and name them in the report.
  - The corrected total must be the expected one.
  - Never prebuild outside BD.
- **Surface gate.** Before the outer twin commit on `story/STORY-058-12`, make a genuine STORY-058-12 state transition (a same-state `update_state.mjs` call is a no-op; see the BUG-098 blockers report).
- **C3 ref.** `contract/S-41-loop` now points at `9a94ff2` (moved 2026-09-27 00:37:56 +0400), not `2695eea`. The frozen exports are identical at both.

**PF12-A4: Follow-ups (file under EPIC-058 at close, beside TPV-A6).**
- PF12-FU-1: CLI `record` accepts any wave member, so a GREEN for a later story means `next` never names it. Pin `record` to `nextAction({wave, verdicts, resume:true}).storyId` (exit 1 otherwise). Do this before any multi-story serial wave.
- PF12-FU-2: `dispatchSerial()` validates neither `sprintId` nor `sprintBranch`. Assert `sprintBranch === sprintBranchFor(sprintId)`, validate `wave.wave` up front, and build the `createWorktree` argv from validated tokens.
- PF12-FU-3: an uncaught error in the driver exits 1, which collides with `SERIAL_EXIT.INVALID`. Give unexpected errors a distinct exit code.
- PF12-FU-4: the `build-codex-payload.mjs` header still lists three kinds of generated files. Add the sprint-execution rendering.
- PF12-FU-5: the payload-parity tests (`skill-md-conditional-architect` S5, `skill-md-serial-pointers` T22) read the stale main-checkout `templates/`. Compose into a temp dir instead.
- PF12-FU-6 (low): `flashcard-gate.mjs` hashes UTF-8-decoded cards, while the hook hashes raw bytes. Only non-UTF-8 reports diverge.
````

## Script Incidents

None. `run_script.sh` was not invoked.

## Scratch and git status at the end

- Scratch `/private/tmp/cg-s41-pf12-20260926T202154` was deleted by exact path. The session-scratchpad subdir `pf12/`, which only I used, was also deleted by exact path.
- **Protected state.**
  - The protected `/private/tmp` dirs were not touched.
  - The M2 baseline had 0 files newer than the marker.
  - No `CODEX_HOME`, `~/.codex`, codex binary or clean-room harness was used.
- **`<cw>`.** Clean. HEAD `9a94ff2`, local `main` ref `e720592`.
- **`<ow>`.** Exactly the 5 pre-existing twins (` M` launch_wave, protocol, enforcement; `??` `dispatch_serial.mjs`, `lib/flashcard-gate.mjs`). HEAD `929740d9`, untouched.
- **cli main checkout.** Read-only `git` only; `main` @ `e720592`, with the pre-existing untracked `cleargate-0.25.0.tgz`.
- **Outer main checkout.** I did not touch it. Its dirty `.cleargate/delivery/**` belongs to the running BUG-098 DevOps full suite (rule 14 revert pending there).
- **Plan file.** Per the coordinator's mid-task change, `plans/M6.md` was not edited. Its amendment text is above.

```yaml
flashcards_flagged:
  - "2026-09-27 · #serial #dispatch · dispatch_serial record accepts any wave member: a GREEN for a later story skips it; pin record to next's story."
  - "2026-09-27 · #cli #exit-codes · An uncaught Error in a node CLI exits 1; if exit 1 means 'invalid input', give unexpected errors their own code."
  - "2026-09-27 · #devops #forecast · Forecast pre-BD reds: build the merged tree in scratch, swap in pre-merge templates/+dist/, run payload readers."
```
