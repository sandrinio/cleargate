# BUG-067 QA-Red

role: qa

STORY: BUG-067
QA-RED: WRITTEN

## Scope and provenance

Fresh QA-Red pass on the clean baseline: `cleargate-cli` `story/BUG-067` at
`a2694e48156345643b10e956f762e013037635a1` (cut from `main`, no BUG-067 changes present).
No implementation source file was read for design purposes; `src/lib/stamp-frontmatter.ts`,
`src/commands/stamp-tokens.ts`, `src/wiki/parse-frontmatter.ts`, `src/lib/frontmatter-cache.ts`,
`src/commands/stamp.ts`, `src/commands/new.ts`, `src/commands/gate.ts`, and
`src/init/copy-payload.ts` were read only to confirm public export names/signatures the tests
call (`stampFrontmatter`, `stampTokensHandler`, `parseFrontmatter`, `readCachedGate`/
`writeCachedGate`, `stampHandler`, `newHandler`, `gateCheckHandler`, `copyPayload`) — all match
the M0 plan's "Existing source/API" table exactly. The prior fix commits
(`9de4d95`/`cf4bfb3`/`ec7cd79`) on the isolated CG_TEST clone were **not** read, per dispatch.

The prior QA-Red session's sealed commit `cb89074` (`refs/cgtest/BUG-067` in this cli repo) was
adopted as the starting point per dispatch instruction ("adopt what is sound"). Its three files —
`test/lib/frontmatter-locator.red.node.test.ts`, `test/lib/frontmatter-writers.red.node.test.ts`,
`test/e2e/frontmatter-authoring.red.integration.node.test.ts` — were reviewed against the item's
§5 and the M0 plan's scenario table (position independence, exact-byte boundaries, fence
discrimination, malformed-input fail-closed, stamp/token/cache contracts, eight-template fresh
authoring, installed hook chain) and found sound. Two portability corrections were required for
this repo's layout, both flagged by name in the dispatch:

1. **`FIXTURE_ROOT`** was hardcoded to the isolated clone's absolute path
   (`/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/test-tmp-I6mBlS`). Replaced in both
   `frontmatter-writers.red.node.test.ts` and `frontmatter-authoring.red.integration.node.test.ts`
   with `path.join(os.tmpdir(), 'bug067-w')` / `'bug067-e2e'` respectively — short labels under
   `os.tmpdir()`, cleaned up in the existing `afterEach` (unchanged).
2. **`META_ROOT`** in the integration file was `path.resolve(CLI_ROOT, '..')` (unconditional) —
   the CR-111 flashcard-flagged shape that always reads the outer MAIN checkout regardless of
   which worktree/branch holds the canonical edits under test. Replaced with the
   `CLEARGATE_META_ROOT`-honouring idiom copied byte-for-byte in spirit from
   `test/lib/readiness-predicates-test-layers-declared.red.node.test.ts:136-138`. Verified this
   resolves the authored fixture source (`BUG-067_Stamp_Corrupts_Frontmatter_Behind_Instructions.md`)
   from `.worktrees/BUG-067` when `CLEARGATE_META_ROOT` is set to that path, not from the outer
   main checkout.

No other content changes. Sealed SHA-256 values in `cb89074`'s own seal report no longer apply
verbatim to the two edited files (byte content changed by the two corrections above); the
locator file (`frontmatter-locator.red.node.test.ts`) is untouched and portable as-is (no
FIXTURE_ROOT/META_ROOT dependency — it only does dynamic `import()` of the not-yet-existing
module and static parser calls).

Reactivating the referenced `N6b` witness in `test/commands/new-command.node.test.ts` (M0 plan,
"Reactivate the existing N6b witness") was **not** done in this pass — that is an edit to an
*existing* (non-`.red.`) test file, which is Developer/TPV territory once the fix lands, not a
QA-Red addition. Flagging it here so the Architect/TPV step does not read its continued `skip`
as an omission on QA's part.

## RED_TESTS

- `cleargate-cli/test/lib/frontmatter-locator.red.node.test.ts` (new, adopted verbatim from
  `refs/cgtest/BUG-067` commit `cb89074`)
- `cleargate-cli/test/lib/frontmatter-writers.red.node.test.ts` (new, adopted with FIXTURE_ROOT
  correction)
- `cleargate-cli/test/e2e/frontmatter-authoring.red.integration.node.test.ts` (new, adopted with
  FIXTURE_ROOT + META_ROOT corrections)

## BASELINE_FAIL

Run via `bash .cleargate/scripts/run_script.sh npx tsx --test --test-concurrency=1
--experimental-test-module-mocks --test-reporter=spec <file>`, each with
`CLEARGATE_META_ROOT=/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-067`; the
integration file additionally with `CLEARGATE_BUILT_CLI=<cli>/dist/cli.js` (present, built
2026-09-25 07:44 from cli `main` post-BUG-089-merge — pre-BUG-067, i.e. still carries the
positional-sniff defect, which is what the "installed hook chain" scenario needs to be
red against).

| File | Fail/Total | Failure reason class |
|---|---|---|
| `frontmatter-locator.red.node.test.ts` | 11/11 | `ERR_MODULE_NOT_FOUND` on `src/lib/frontmatter-locator.js` (module does not exist — matches M0 plan's new module) for 10 tests; 1 test (`preserves the parser body convention...`) fails on the live positional `parseFrontmatter: input does not start with ---` throw, since its "closing delimiter at EOF" fixture opens with `Preamble\n---\n...` — the exact defect this bug describes. |
| `frontmatter-writers.red.node.test.ts` | 23/30 | `AssertionError` — "writer must retain preamble bytes exactly" / "must retain the actual template cache mapping" / missing `bug_id`/`status` as unchanged dry-run context / non-byte-identical malformed-input rejection for `stampFrontmatter`/`stampTokens` (both carry the positional sniff and silently corrupt instead of failing closed). **7/30 pass on baseline, all `writeCachedGate fails closed and leaves <malformed> byte-identical`** — `writeCachedGate` has no positional pre-check; it calls `parseFrontmatter` unconditionally, which already throws on all 7 malformed fixtures (they all lack an offset-zero `---`), so it already fails closed today. This is pre-existing correct behaviour unrelated to the locator fix, not a wiring defect — noted so TPV does not read it as under-coverage. |
| `frontmatter-authoring.red.integration.node.test.ts` | 9/9 | All 8 per-template scaffold→stamp→stamp-tokens→gate/cache chains fail with `AssertionError: stampFrontmatter must retain the scaffold preamble byte-for-byte` (first boundary check after the first write in the chain). The installed-hook-process scenario fails with `AssertionError: fully authored fixture must satisfy shipped readiness definitions: [...] stamp=0 gate=1 file=.../BUG-067_hook-chain.md` — this is the **exact literal string** from the sprint's Goal Acceptance Check condition 1 ("today's `stamp=0 gate=1`"), reproduced end-to-end through the real rendered `stamp-and-gate.sh` against the real built (pre-fix) `dist/cli.js`. |

Totals: **43 failing / 50 total** across the three files (11 + 23 + 9), 7 passing (all in
`frontmatter-writers`, the `writeCachedGate` malformed-guardrail group). No test failed for a
harness/wiring reason (no wrong-cwd, no missing fixture directory, no tsx/import-map error
outside the intentional missing-module case).

## Typecheck

`bash .cleargate/scripts/run_script.sh npx tsc --noEmit` → exit 0. The dynamic
`await import(LOCATOR_MODULE)` pattern (module path held in a `const string`, not a literal at
the call site) is not statically resolved by `tsc`, so the not-yet-existing
`src/lib/frontmatter-locator.ts` does not fail typecheck; all other imports resolve against
real, existing exports.

## Wiring soundness (for Architect TPV)

- Imports resolve: confirmed by direct execution above (only the intentionally-missing
  `frontmatter-locator.js` module fails to resolve; every other import — `stamp.js`,
  `stamp-frontmatter.js`, `stamp-tokens.js`, `frontmatter-cache.js`, `parse-frontmatter.js`,
  `new.js`, `gate.js`, `copy-payload.js` — resolved and ran).
- Constructor/handler signatures match: `stampFrontmatter(absPath, opts?)`,
  `stampTokensHandler(file, opts, cli?)`, `stampHandler(file, opts, cli?)`,
  `newHandler(input, cli?)` (sync), `gateCheckHandler(file, opts, cli?)`, `writeCachedGate(absPath,
  result, opts?)`/`readCachedGate(absPath)`, `copyPayload(payloadDir, targetCwd, opts)` all
  verified against current `src/` signatures before use (see Provenance above) — no mismatch.
  `CopyPayloadOptions.force`/`.pinVersion` both exist.
- Mocked/injected methods exist: `cli.exit`/`cli.stdout`/`cli.stderr`/`cli.now`/`cli.cwd`/
  `cli.sprintRunsRoot`/`cli.gatesDocPath` are all real optional fields on their respective
  `*CliOptions` interfaces.
- After-hooks present: both fixture-bearing files register `afterEach` that pops and
  `rm -rf`s every `mkdtempSync` root; verified no leftover subdirectories after the run (only
  the empty parent `bug067-w`/`bug067-e2e` label directories remain under `os.tmpdir()`).
- File naming: `*.red.node.test.ts` (2 files) / `*.red.integration.node.test.ts` (1 file) — per
  `sprint-context.md` §Test Stack and the dispatch's explicit exception carve-out (this is not
  one of the legacy-hyphenated-form cases).

## Script Incidents

`run_script.sh` logs an incident JSON on any nonzero-exit invocation; the three red runs above
each exited 1 (by design — that's the red baseline), so five incident files exist under
`cleargate-cli/.cleargate/sprint-runs/_off-sprint/.script-incidents/` (this cli repo has no
`.active` sprint sentinel of its own, so the wrapper's default off-sprint bucket applies):

- `20260925T033553Z-9e4642d9e223.json` (pre-existing, unrelated — present at session start)
- `20260925T035432Z-c41ad83aa815.json`, `20260925T035439Z-c41ad83aa815.json`,
  `20260925T035452Z-b14bde1d3530.json`, `20260925T035518Z-b4f0649fe6f9.json` — the three
  intentional red-baseline runs (writers ran twice while iterating the FIXTURE_ROOT fix).
  All exit-1 captures reflect the expected red state, not a script/harness defect.

The `npx tsc --noEmit` run exited 0 and produced no incident.

## Not done in this pass

- No implementation file touched. No commit made. No `git` write command run in any tree.
- `N6b` in `test/commands/new-command.node.test.ts` left as-is (skipped) — see Provenance note.
- No flashcard appended (listed only, per dispatch).

flashcards_flagged:
  - "2026-09-25 · #frontmatter #test-harness · writeCachedGate already fails closed on malformed frontmatter (no positional pre-check); only stampFrontmatter/stampTokens's `hasFrontmatter` sniff corrupts — a red suite covering all three writers legitimately shows 7/30 passing on baseline."
  - "2026-09-25 · #test-harness #cross-repo · A sealed QA-Red file's FIXTURE_ROOT/META_ROOT constants are session-specific (isolated CG_TEST clone paths); re-verify and re-root them for the target repo before trusting 'adopt what is sound' — don't just copy the file."

## Amendment (post-TPV, 2026-09-25)

Architect TPV approved (`BUG-067-tpv.md`) but flagged one fragility: the installed-hook-chain
scenario in `frontmatter-authoring.red.integration.node.test.ts` read the **live** outer
`pending-sync/BUG-067_Stamp_Corrupts_Frontmatter_Behind_Instructions.md` item via `META_ROOT` and
asserted `status: Triaged` — a cli test must not depend on an outer work item's lifecycle
(DevOps flipping status, or the item moving to `archive/` at sprint close, would silently break
this test for a reason unrelated to the locator fix).

Fix: froze the item's current bytes into a committed fixture,
`cleargate-cli/test/fixtures/bug-067/BUG-067_source_item.md` (copied verbatim, `status: Triaged`
at line 8), and repointed `authoredSource` in the hook-chain scenario from the `META_ROOT`-derived
live path to `path.join(CLI_ROOT, 'test', 'fixtures', 'bug-067', 'BUG-067_source_item.md')`. Every
assertion in the scenario is unchanged — they read `authored`/`after` bytes exactly as before, now
sourced from the frozen fixture instead of the live item.

Re-ran `test/e2e/frontmatter-authoring.red.integration.node.test.ts` in isolation with
`CLEARGATE_META_ROOT=/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-067
CLEARGATE_BUILT_CLI=/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli/dist/cli.js`: **9/9
still fail**, same reason classes as before the amendment — the 8 template chains on
`stampFrontmatter must retain the scaffold preamble byte-for-byte`, and the hook-chain scenario
on the literal `stamp=0 gate=1` string (unchanged: `[2026-09-25T04:07:52Z] stamp=0 gate=1
ingest=0 file=.../BUG-067_hook-chain.md`). `npx tsc --noEmit` still exits 0.

`META_ROOT` remains used elsewhere in this file (template/readiness-gates/config seeding for the
fixture project root, per the M0 plan's fresh-authoring-chain design) — only the hook-chain
scenario's `authoredSource` needed the outer-item read removed; that was the sole live-lifecycle
dependency TPV flagged.

Changes remain **uncommitted**: `test/e2e/frontmatter-authoring.red.integration.node.test.ts`
(modified) and `test/fixtures/bug-067/BUG-067_source_item.md` (new, untracked). No git write
command was run in any tree.
