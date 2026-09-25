# STORY-058-01 — QA-Red report

role: qa

Mode: RED. Wrote failing tests against §2.1 Gherkin + M1 plan (`sprint-runs/SPRINT-41/plans/M1.md`
§STORY-058-01) test scenarios 1-7. No implementation, scaffold, or non-test file touched. Read
`sprint-context.md`, the story file, M1.md, and the flashcard tag grep before writing anything.

## RED_TESTS

- `cleargate-cli/test/scripts/scaffold-relocation.red.node.test.ts` (unit — scenarios 1-5)
- `cleargate-cli/test/scripts/scaffold-relocation.red.integration.node.test.ts` (integration —
  scenarios 6-7)

Both on cli branch `story/STORY-058-01` (cli main checkout, R1), untracked/uncommitted per the
"do not commit" rule.

## Scope covered per scenario

1. **Source resolution.** Static scan of `scripts/copy-planning-payload.mjs`,
   `scripts/build-manifest.ts`, `tsup.config.ts` for the plan's literal tells (`metaRoot`
   identifier, and the `'..', 'cleargate-planning'` literal pair — chose these two independent
   patterns over a bare substring scan for `cleargate-planning` because the DESTINATION path
   `templates/cleargate-planning` legitimately keeps that substring and must not false-positive).
   Plus `composePayload` from two roots with no sibling relationship, and a bonus collision-
   rejection check against the stated `composePayload(roots, dst)` contract (not one of the 7
   numbered scenarios, called out separately in the test file's comment).
2. **Pin passthrough.** All four pin-bearing hooks (`stamp-and-gate`, `pre-edit-gate`,
   `pending-task-sentinel`, `session-start`) keep `__CLEARGATE_VERSION__` unsubstituted through
   `composePayload`.
3. **Hygiene.** `EXCLUDE_DIRS`/`EXCLUDE_FILES`/`REQUIRED_EMPTY_DIRS` export shape; injected dirt
   (`sprint-runs/x/token-ledger.jsonl`, `hook-log/y.log`, `scripts/test/z.sh`,
   `.sync-marker.json`) is dropped/emptied while a sibling `scripts/real-script.sh` survives;
   `REQUIRED_EMPTY_DIRS` are created **unconditionally** even when wholly absent from the source
   fixture (FLASHCARD 2026-09-25 `#scaffold #relocation` — both dirs are gitignored, hence absent
   from a fresh clone).
4. **Modes.** Every file under `scaffold/hosts/claude/.claude/hooks/` is `0755`, asserting
   `length >= 9` (not `=== 9`, per dispatch guidance); the composed payload's twin hooks are
   `0755`; the full executable (`& 0o111 !== 0`) set under `scaffold/**` is compared against a
   `git ls-files -s` census of the tracked `100755` files in `cleargate-planning/.cleargate`,
   `.claude`, and `CLAUDE.md`, mapped onto `core/**` and `hosts/claude/**`.
5. **CLAUDE.md doc truth.** Root idiom: `META_ROOT` honours `CLEARGATE_META_ROOT`, falling back to
   `CLI_ROOT/..` (grepped the assignment itself, not just a header comment, per FLASHCARD
   2026-08-30 `#test-harness #cross-repo #danger`). Asserts the *Dogfood split* section names both
   `cleargate-cli/scaffold/core` and `cleargate-cli/scaffold/hosts/claude` as canonical, keeps the
   literal `NPM payload (generated, gitignored)` label, and that
   `cleargate-planning/DEPRECATED.md` exists and names both new roots.
6. **Byte-identical payload (integration, gated).** Skips when `CLEARGATE_RELOCATION_BASELINE` is
   unset. When set, composes the payload from `scaffold/{core,hosts/claude}`, regenerates its
   MANIFEST with `now` fixed to the **baseline's own** `generated_at` (never a value hardcoded in
   the test — "same frozen now on both sides, no other normalization"), then walks both trees and
   asserts identical file lists, byte-identical content, and identical mode bits.
7. **Installed-output equivalence (integration).** Three sub-checks: (a) `copyPayload` from the
   baseline and from the new composed payload into two fixtures with a fixed `pinVersion` — gated
   on the same env var as scenario 6, since it needs the baseline; (b) `initHandler` with `pin` and
   `now` seams fixed produces a deterministic `.cleargate/.install-manifest.json`
   (`installed_at`/`pin_version` asserted verbatim against the seam — the clock is held **by
   seam**, never blanket-masked) — ungated, needs only the new payload; (c) re-init with `--force`
   preserves user-edited `FIRST_INSTALL_ONLY` files (`.gitignore`, `.cleargate/FLASHCARD.md`,
   `.cleargate/scripts/*`, per `copy-payload.ts:79`) — also ungated.

## Guidance followed

- Every `composePayload`-dependent test uses a **per-test dynamic import** of
  `src/lib/scaffold-layout.mjs` via a non-literal specifier (`pathToFileURL(...).href`), so the
  file typechecks/parses today (no static resolution of a nonexistent module) and each scenario
  reports its own red instead of collapsing the file into one failure (FLASHCARD 2026-08-29
  `#test-harness #qa-red`).
- `CLEARGATE_REPO_ROOT` is set to each fixture around every `copyPayload`/`initHandler` call in
  the integration file and restored in `finally`.
- Fixtures are built under `os.tmpdir()` with short prefixes and removed in `finally` blocks — no
  subprocess spawning, so the long-tsx-socket-path EINVAL hazard (FLASHCARD 2026-09-12) does not
  apply here.
- Reused `copyPayload`, `PIN_PLACEHOLDER`, `FIRST_INSTALL_ONLY` (`src/init/copy-payload.ts`),
  `buildManifest` (`scripts/build-manifest.ts`), and `initHandler` (`src/commands/init.ts`)
  unchanged, per the plan's "Reuse" note — none of these are edited by this test file.
- Did not run `npm run build` / `npm run prebuild` / a bare `cleargate` at any point (rules 11,
  18). Ran only `npm run test:file -- <red files>`, targeted, with
  `CLEARGATE_META_ROOT=/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-01` for the
  unit file (needed by scenario 5's outer-tree reads); the integration file needs no override
  (it reads only CLI-local paths and the `CLEARGATE_RELOCATION_BASELINE` fixture).

## BASELINE_FAIL

Unit file (`scaffold-relocation.red.node.test.ts`), `CLEARGATE_META_ROOT` pointed at the outer
worktree:

```
tests 15
suites 5
pass 1
fail 14
skipped 0
```

The one pass is scenario 5's "keeps the literal `NPM payload (generated, gitignored)` label" —
that phrase is already correct in the current (pre-fix) outer `CLAUDE.md`, and the assertion is a
preserve-this-invariant guard, not a scenario the fix newly satisfies; it is expected to stay green
through the Developer's rewrite. Every other assertion in the file fails at baseline, in two
distinct legitimate "not implemented yet" classes:
- `ERR_MODULE_NOT_FOUND` for `src/lib/scaffold-layout.mjs` (scenarios 1 composition/collision, 2,
  3, 4 payload-twin) and `ENOENT` for `scaffold/hosts/claude/.claude/hooks` and `scaffold/`
  (scenario 4's on-disk checks) — the module and the tracked scaffold trees do not exist yet.
- Assertion failures against the **current** source content — scenario 1's three static scans
  (the copier/build-manifest/tsup still carry `metaRoot` / the `'..', 'cleargate-planning'` pair),
  and scenario 5's CLAUDE.md/DEPRECATED.md checks (the doc has not been rewritten,
  DEPRECATED.md does not exist).

Integration file (`scaffold-relocation.red.integration.node.test.ts`), no env var overrides:

```
tests 4
suites 2
pass 0
fail 2
skipped 2
```

The 2 skips are scenario 6 and scenario 7a, correctly gated on `CLEARGATE_RELOCATION_BASELINE`
being unset (it is not yet captured — that is the Developer's first action on the branch, per the
plan's "Baseline capture" note). The 2 fails (scenario 7b init-seam determinism, 7c FIRST_INSTALL_
ONLY preservation on re-init) are both `ERR_MODULE_NOT_FOUND` on `scaffold-layout.mjs`, since both
need the new composed payload to install from.

Combined across both files: **19 tests, 1 pass, 16 fail, 2 skip**
(unit: 15 tests, 1 pass, 14 fail; integration: 4 tests, 0 pass, 2 fail, 2 skip).

## Script Incidents

`run_script.sh` recorded three incidents (all are the wrapped `npm run test:file` invocations
exiting non-zero because the RED suite is, correctly, red — not a script-harness defect):

- `/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli/.cleargate/sprint-runs/_off-sprint/.script-incidents/20260925T073416Z-90ef539e13bf.json`
- `/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli/.cleargate/sprint-runs/_off-sprint/.script-incidents/20260925T073426Z-90ef539e13bf.json`
- `/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli/.cleargate/sprint-runs/_off-sprint/.script-incidents/20260925T073450Z-c580827c5408.json`

## Not run / not touched

- No full suite, no `npm run build`/`prebuild`, no bare `cleargate` (rules 11, 18).
- No implementation, scaffold, or CLAUDE.md edit of any kind — read-only on all non-test files.
- No git add/commit in either repo.

## flashcards_flagged

flashcards_flagged: []

## Round 2

TPV round 1 verdict: `BLOCKED-WIRING-GAP`. Applied all five fixes from
`STORY-058-01-tpv.md` §"QA-Red fixes", test-only, to the two files already committed at cli
`744cb5e`. Edited the working tree only — `744cb5e` was not amended, nothing was committed.

### Per-fix change

1. **Blocker — 7c `.gitignore` (integration).** Init Step 5d always appends a managed
   `# >>> cleargate >>>` block to the root `.gitignore` (`root-gitignore.ts:100-117`); the old
   assertion compared the whole re-init file against the bare literal `'user-added-pattern/\n'`,
   which no implementation could ever satisfy. Now the user edit is written **outside** the block
   (`userGitignore = 'user-added-pattern/\n' + <file at that point>`), and the re-init assertion
   compares against `userGitignore` verbatim, not a hardcoded literal.
2. **Stub the resolver probe.** Added `PROBE_STUB` (precedent:
   `test/commands/init-from-source.node.test.ts:227`) to the scenario-7 describe block, right
   after `FIXED_NOW`. Wired `spawnSyncFn: PROBE_STUB` into all four `initHandler` calls in the
   integration file (7b, 7c's `runInit`, and the two calls in the new 7-init test) so no test
   spawns a real `which cleargate` / bare `cleargate --version` / network `npx`.
3. **New test — scenario 7 init-level equivalence.** Inserted before the 7b test, gated on
   `CLEARGATE_RELOCATION_BASELINE` like 6 and 7a. Runs a full `initHandler` from `BASELINE_DIR`
   and from the newly composed payload (its `MANIFEST.json` rebuilt with `now` frozen to the
   baseline's own `generated_at`, same rule as scenario 6), each into its own fixture inside
   `withRepoRoot`, with the fixed pin/now, `yes: true`, and `PROBE_STUB`. Asserts
   `assertTreesIdentical(targetBaseline, targetNew, ...)`; all three temp dirs cleaned in
   `finally`. This is the only new/old test (besides scenario 6) that can catch a drift inside the
   `CLEARGATE` block of `scaffold/hosts/claude/CLAUDE.md`, since `copyPayload` (7a) skips
   `CLAUDE.md` entirely (`copy-payload.ts:63`).
4. **Scenario 4c census scope (unit).** Was comparing the executable set of the whole `scaffold/`
   tree against the frozen snapshot — red for any later story's first new executable under
   `scaffold/` (STORY-058-11's `harness.sh`, STORY-058-10's `hosts/codex/**`). Now builds
   `snapshotRel` from the same `coreEntries`/`claudeEntries` mapping, asserts
   `expectedExecRel.size >= 9` (never vacuous), and compares
   `[...actualExec].filter((rel) => snapshotRel.has(rel))` against `expectedExecRel` — keyed on the
   snapshot's own file set. Extra/missing files stay covered by scenario 6's file-list equality.
5. **Scenario 5 section scoping (unit).** The first CLAUDE.md test used to grep the whole file, so
   a stray mention anywhere (Repo layout block, a guardrail) would satisfy it. Now slices from
   `full.indexOf('## Dogfood split')` to the next `\n## ` heading, asserts the section is found,
   and keeps the two `includes` assertions scoped to that slice only.

### Typecheck

Both files typecheck clean under a scratch tsconfig
(`extends: "./tsconfig.json"`, `rootDir: "."`, includes the two red files plus `src/**/*` minus
`**/*.test.ts`/`**/*.node.test.ts`, excludes `node_modules`/`dist`) — `npx tsc --noEmit -p
tsconfig.scratch-qa-red.json` exited 0. The cli's own `tsconfig.json` only covers `src/**`, so this
scratch config was required to typecheck `test/scripts/**`. The scratch file was deleted after use
— it is not part of the diff.

### Re-run baseline counts (round 2)

Unit file, `CLEARGATE_META_ROOT=/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-01`:

```
tests 15
suites 5
pass 1
fail 14
skipped 0
```

Unchanged from round 1 (fixes 4-5 changed *how* scenario 4c/5a assert, not whether they are red at
baseline — both still fail for the right reason: scenario 4c on `ENOENT` for `scaffold/`, scenario
5's first test now says "Dogfood split section does not yet name cleargate-cli/scaffold/core as
canonical" instead of the old whole-file-grep message). The 1 pass is still scenario 5's
preserve-this-invariant guard on the existing `NPM payload (generated, gitignored)` label.

Integration file, no env var:

```
tests 5
suites 2
pass 0
fail 2
skipped 3
```

5 tests now (was 4) — the new scenario-7 init-equivalence test is present and correctly SKIPPED
(3 skips total: scenario 6, 7a, and the new 7-init test, all gated on
`CLEARGATE_RELOCATION_BASELINE`). The 2 fails (7b, 7c) are still `ERR_MODULE_NOT_FOUND` on
`src/lib/scaffold-layout.mjs`, now via the `PROBE_STUB`-wired call sites — the stub itself never
executes because `composePayload` throws first.

Combined: **20 tests, 1 pass, 16 fail, 3 skip** (unit 15/1/14/0; integration 5/0/2/3).

### Script Incidents

Two incidents were recorded by `run_script.sh` for the round-2 `npm run test:file` invocations
(non-zero exit because the suite is correctly red), then deleted per instruction:
- `20260925T075112Z-90ef539e13bf.json` (unit re-run)
- `20260925T075124Z-c580827c5408.json` (integration re-run)

No `.script-incidents/*` files remain from either round.

### Hard rules honored

No `npm run build`/`prebuild`, no bare `cleargate`. No edit to any non-test file (the scratch
tsconfig was a typecheck-only scratch file, created and deleted, never left in the tree). No `git
checkout`, `stash`, or `reset`. No commit — `744cb5e` untouched; both files remain modified,
uncommitted, in the working tree.

QA-RED: WRITTEN
RED_TESTS: cleargate-cli/test/scripts/scaffold-relocation.red.node.test.ts (15 tests, 1 pass, 14 fail), cleargate-cli/test/scripts/scaffold-relocation.red.integration.node.test.ts (5 tests, 0 pass, 2 fail, 3 skip)
BASELINE_FAIL: 20 total, 16 failing (correct reasons), 1 passing (preserve-invariant guard), 3 skipped (baseline env var unset)
flashcards_flagged: []
