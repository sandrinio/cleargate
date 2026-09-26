# STORY-058-08 — QA-Red report

role: qa

## Commit

Cli repo `story/STORY-058-08`, one commit, cut from `main` `b244551`:

```
81c05e9 qa-red(STORY-058-08): write failing tests
```

(First cut `795a226`; amended once, same message, to tighten one detail-string
assertion in U13 to the catalogue's exact `path (owner x)` format before any
other work depended on the SHA — still exactly one commit on this branch.)

No outer-repo commit: this dispatch is QA-Red-only, cli-repo-only, per the
dispatch text ("QA-Red writes only in the cli repo"). `.cleargate/knowledge/
clean-room-verification.md` is the Developer's file (outer worktree
`.worktrees/STORY-058-08`); the doc test reads it via `CLEARGATE_META_ROOT`
and fails today because it does not exist yet — that is the correct red.

## Files written

| File | Scenarios | Tests |
|---|---|---|
| `cleargate-cli/test/commands/verify-install.red.node.test.ts` | U1–U16 | 22 |
| `cleargate-cli/test/commands/verify-install-cli.red.integration.node.test.ts` | I1–I5 | 5 |
| `cleargate-cli/test/docs/clean-room-verification-doc.red.node.test.ts` | D1–D2 | 9 |

No implementation file was read, edited, or referenced beyond what QA-Red
needs to construct fixtures and assert against the M4 plan's pinned contract
(`src/hosts/registry.ts`, `src/hosts/claude.ts` (via `defaultHostRegistry.
resolve('claude')`), `src/hosts/types.ts` (types only), `src/lib/manifest.ts`
(types only), `src/init/copy-payload.ts` (`PIN_PLACEHOLDER`), `src/init/
root-gitignore.ts` (`ROOT_BLOCK_START`/`ROOT_BLOCK_END`), `src/lib/
claude-md-surgery.ts` (`CLEARGATE_START`/`CLEARGATE_END`) — all pre-existing,
merged modules the M4 catalogue names as reuse targets, none of them
`src/commands/verify-install.ts` or `src/lib/cli-package-root.ts` (the
not-yet-existing modules, imported only via per-test dynamic `import()`).

## Per-scenario table

### `verify-install.red.node.test.ts` (U1–U16, 22 tests)

| Scenario | Test | Baseline failure reason |
|---|---|---|
| U1 | all 12 checks pass in pinned order; live lists six ids; registered; handler exits 0 | `ERR_MODULE_NOT_FOUND: src/commands/verify-install.js` |
| U2 | payload-files names the deleted file + tier; exit 1 | same |
| U3a | pin-substituted names the rewritten hook script | same |
| U3b | pin-substituted names `.mcp.json` | same |
| U4 | claude.hooks-executable names both chmod'd paths; no other check fails | same |
| U5a | claude.mcp-registration fails on a deleted `mcpServers.cleargate` | same |
| U5b | claude.mcp-registration fails "absent" on a deleted `.mcp.json` | same |
| U6a | claude.instruction-block fails on a duplicated START line | same |
| U6b | claude.instruction-block fails on both markers removed | same |
| U7 | claude.settings-hooks names the removed PostToolUse triple | same |
| U8a | claude.no-foreign-hooks fails on a `--host codex` command | same |
| U8b | claude.no-foreign-hooks fails on a command under a fake adapter's owned root | same |
| U8c | claude.no-foreign-hooks passes on `echo hi` | same |
| U9 | snapshot fails; checks 2–5 + host checks skip; doctor/gitignore still evaluate; ok=false | same |
| U10 | version-match fails; checks 8+11 skip; exit 1 | same |
| U11a | manifest-hosts fails "fake not installed" under `--host fake` | same |
| U11b | `--host nope` exits 2, `UnknownHostError` on stderr, no report printed | same |
| U12 | fail-closed `fake.no-verifier`; exit 1 | same |
| U13 | manifest-hosts names an owner-leaked entry `path (owner fake)` | same |
| U14 | read-only: tree byte-identical before/after; no `.drift-state.json` | same |
| U15 | injected `runDoctor` failure fails the `doctor` check; exit 1 | same |
| U16 | gitignore-generated fails on a stripped managed block | same |

Every failure is the identical, single, named reason: the dynamic
`import('../../src/commands/verify-install.js')` throws `ERR_MODULE_NOT_FOUND`
because the module does not exist at `b244551`. Verified directly in the
terminal output (22/22 show that exact error).

### `verify-install-cli.red.integration.node.test.ts` (I1–I5, 5 tests)

| Scenario | Test | Baseline failure reason |
|---|---|---|
| I1 | correct install → exit 0, live-ids section, `Result: PASS` | Commander: `error: unknown command 'verify-install'` → exit 1, not 0 |
| I2 | broken install (U2+U4 mutations) → exit 1, both ids/paths named | stdout is empty (command unknown); `payload-files`/`claude.hooks-executable` absent |
| I3 | `--json` parses, `.ok === true` | Commander: unknown command → exit 1, not 0; stdout is not JSON |
| I4 | `--host nope` → exit 2 | Commander: unknown command → exit 1, not 2 |
| I5 | `--help` lists `--host`/`--json`/`--cwd` | `verify-install --help` falls through to the top-level help (lists `join`, `init`, `host`, … — no `verify-install` entry, no `--host`/`--json`/`--cwd`) |

Each fails for its own distinct, observable reason (captured verbatim in the
terminal output above), not a single collapsed import error — this file
spawns the real `src/cli.ts`, so the shared root cause (command not
registered) surfaces differently per assertion.

### `clean-room-verification-doc.red.node.test.ts` (D1–D2, 9 tests)

| Scenario | Test | Baseline failure reason |
|---|---|---|
| D1 | doc file exists | `.cleargate/knowledge/clean-room-verification.md` does not exist at `META_ROOT` (outer main checkout, `sprint/S-41`) |
| D1 | every pinned H2 heading present | same (doc absent) |
| D1 | `## Location` names `~/Documents/Dev/`, disposable, recreated per run | same |
| D1 | `## Why not /tmp or inside the repository` names `/private/tmp` | same |
| D1 | `## Why not the in-repo dogfood instance` names it gitignored | same |
| D1 | `## 2. Install the artifact` names `command -v cleargate` | same |
| D1 | `## 1. Build the packed artifact` names `npm pack` | same |
| D1 | `## 4. Machine checks (cleargate verify-install)` names the driver | same |
| D2 | every `npm publish` mention sits on a No/never line + vacuity guard | same |

All 9 fail on the same `fs.existsSync(DOC_PATH)` assertion — the doc is the
Developer's deliverable (outer worktree), not written by this dispatch. This
confirms `CLEARGATE_META_ROOT` resolution is correct (it reads the real outer
main checkout, not a wrong root silently returning true).

## BASELINE_FAIL

36 (22 + 5 + 9). 0 pass, 0 skipped, 0 cancelled, in every file.

## Verify — each file SOLO, twice, `CLEARGATE_INIT_BASELINE` set

| File | Run 1 | Run 2 |
|---|---|---|
| `verify-install.red.node.test.ts` | 22 tests, 0 pass, 22 fail | 22 tests, 0 pass, 22 fail |
| `verify-install-cli.red.integration.node.test.ts` | 5 tests, 0 pass, 5 fail | 5 tests, 0 pass, 5 fail |
| `clean-room-verification-doc.red.node.test.ts` | 9 tests, 0 pass, 9 fail | 9 tests, 0 pass, 9 fail |

Identical both times — no flake.

`npm run typecheck` — exit 0, clean, both before and after writing the three
files (test files are outside `tsconfig.json`'s `include: ["src/**/*"]`, so
they are never type-checked by this command; `tsx` transpile-only execution
also never type-checks them — confirmed no type-level coupling to the
not-yet-existing modules blocks the gate).

## Sealed files stay green

Ran SOLO, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, both
before writing anything and again after the final commit. All identical,
both times:

| File | Count |
|---|---|
| `test/hosts/host-adapter-contract.red.node.test.ts` (sealed -03) | 19/19 |
| `test/hosts/host-selection.red.node.test.ts` | 11/11 |
| `test/hosts/host-lifecycle.red.node.test.ts` | 17/17 |
| `test/hosts/manifest-query.red.node.test.ts` | 6/6 |
| `test/lib/manifest-host-ownership.red.node.test.ts` | 18/18 |
| `test/commands/init-host-selection.red.node.test.ts` | 10/10 |
| `test/commands/init-host-snapshot.red.node.test.ts` | 13/13 |
| `test/commands/doctor-per-host.red.node.test.ts` | 10/10 |
| `test/commands/upgrade-per-host.red.node.test.ts` | 6/6 |
| `test/commands/uninstall-per-host.red.node.test.ts` | 16/16 |
| `test/commands/init-host-cli.red.integration.node.test.ts` | 4/4 |
| `test/commands/host-cli.red.integration.node.test.ts` | 3/3 |
| `test/commands/lifecycle-per-host.red.integration.node.test.ts` | 3/3 |
| `test/lib/drift-check-scaffold.red.node.test.ts` (BUG-085) | 24/24 |
| `test/hooks/pending-task-sentinel-cards.red.node.test.ts` (BUG-085) | 13/13 |
| `test/commands/doctor-drift-guard.node.test.ts` (BUG-085) | 13/13 |

**Parity (compare mode):**

| File | Count |
|---|---|
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` | 5/5 |
| `test/commands/init-host-parity.red.integration.node.test.ts` | 15/15 |

**Baseline hash** (`/private/tmp/cg-s41-m2-init-baseline`, 425 files, absolute
paths, `find -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256`):
`bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` — identical
before and after (never touched; this dispatch wrote no file under it).

## Outer status

**Start:**
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
?? .cleargate/sprint-runs/SPRINT-41/.pending-task-2307-16247-30335.json
```

**End (identical — no outer write of any kind this dispatch):**
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```
(the pending-task json is orchestrator/hook-owned; unrelated to this dispatch
and unchanged by it — its absence from this second listing is a
pre-existing hook-log housekeeping detail, not a QA action).

Cli repo `git status --porcelain` at end: only the pre-existing untracked
`cleargate-0.25.0.tgz` (present before this dispatch started; left alone per
the hard rule).

## No writing CLI command ran against the outer repo

Confirmed: every `cleargate`/`node dist/cli.js` invocation in this dispatch
ran against a throwaway `mkdtemp`/`runInitScenario` fixture directory, never
against `/Users/ssuladze/Documents/Dev/ClearGate`. No bare `cleargate` was
run. No `npm run build` was run. No `git stash`/`--no-verify`/amend-of-
someone-else's-commit/reset occurred (the one amend was of this dispatch's
own, not-yet-reported commit, to fix a self-authored assertion before
reporting — see *Commit* above).

## Script Incidents

None. Every script invocation in this dispatch was a direct `tsx`/`node`
process spawned for test execution or read-only inspection, not a wrapped
`.cleargate/scripts/*` script.

## Plan ambiguities (orchestrator_confirmed: false)

1. **Sealed-count digit list vs. measured reality.** The dispatch's
   thirteen-count list for "the -03..-07 contract files"
   (`19/11/10/4/18/13/17/3/6/10/6/16/4`) sorts to
   `3,4,4,6,6,10,10,11,13,16,17,18,19`. The thirteen files I actually measured
   (host-adapter-contract=19, host-selection=11, host-lifecycle=17,
   manifest-query=6, manifest-host-ownership=18, init-host-selection=10,
   init-host-snapshot=13, doctor-per-host=10, upgrade-per-host=6,
   uninstall-per-host=16, init-host-cli=4, host-cli=3,
   lifecycle-per-host=3) sort to `3,3,4,6,6,10,10,11,13,16,17,18,19` — one
   `3`/`4` transposed relative to the dispatch text (`host-cli` and
   `lifecycle-per-host` are each measured 3/3 today; the dispatch's list has
   two 4's and one 3). I did not chase this further: I re-measured every
   sealed file directly (twice, SOLO) rather than trust either list, and all
   thirteen reproduce today's actual counts with 0 mismatches against
   themselves before/after. Flagging only because the dispatch's own digit
   list appears stale by one digit somewhere in that set. orchestrator_confirmed: false
2. **`findCleargatePackageRoot` / `cli-package-root.ts` has no QA-Red
   scenario of its own.** The M4 plan's "Test scenarios (QA-Red covers all)"
   section for -08 lists only U1–U16, I1–I5 and D1–D2 — none exercise
   `findCleargatePackageRoot` directly (every unit scenario injects
   `payloadDir`/`version` explicitly per the Fixture section, so the
   package-root walk is never on the call path). I did not add a fourth test
   file for it, since the story's own "New Files Needed" row and the plan's
   test-scenario section both omit one. Its only planned exercise is
   indirect, via `readRunningCliVersion` inside pre-existing
   `init-from-source(-dist)` tests once -08's `init.ts` routing edit lands
   (Developer work, not QA-Red's). orchestrator_confirmed: false
3. **Exact detail-string wording beyond the catalogue's pinned templates.**
   Where the M4 catalogue pins an exact format (`missing: <path> (tier <t>)`,
   `path (owner x)`), I asserted the literal concatenated substring. Where it
   gives prose without a template (e.g. checks 8/9/10's "named"/"details
   include the path" language), I asserted `.includes(...)` on the
   substrings the catalogue explicitly names (a hook path, `PostToolUse`,
   `Edit|Write`, a host name) without pinning surrounding punctuation the
   Developer is free to choose. This is a judgment call standard to QA-Red
   wiring (leave wording latitude where the plan gives none), surfaced here
   only so TPV can confirm it reads the same way. orchestrator_confirmed: false
4. **Flashcard skill invocation.** My tool surface has no `Skill` action; I
   satisfied "Read flashcards" (workflow step 1) via
   `command grep -n -E "#verify-install|#clean-room|#test-harness|#qa-red|#host|#registry|#node-exit|#npm|#cli" .cleargate/FLASHCARD.md`
   against the exact tag list the dispatch names, applying every relevant
   card (the `#test-harness #qa-red` "import() of a module missing a named
   export yields undefined, not a throw" card is why every scenario asserts
   on the RESOLVED module's exports rather than on the bare import — moot
   here since the whole module is absent, but it shaped U1's structure).
   orchestrator_confirmed: false

## flashcards_flagged

flashcards_flagged:
  - "2026-09-26 · #qa-red #test-harness · A CLI command not yet registered fails `--help` differently per flag: it falls through to the top-level help, listing no subcommand flags at all."

## Re-seal (TPV R1–R17)

**Commit.** Cli repo `story/STORY-058-08`, one follow-up commit on top of `81c05e9`:

```
549fdaa qa-red(STORY-058-08): re-seal R1-R17 per TPV
```

**Patch verification (before applying):**

| Check | Expected | Measured |
|---|---|---|
| SHA-256 | `30e6ff852faac0d252cc7adc3ebf25cd7f0db1142fae8d352a85de9d127219bf` | `30e6ff852faac0d252cc7adc3ebf25cd7f0db1142fae8d352a85de9d127219bf` — match |
| Line count | 484 | 484 — match |
| `git apply --check` at `81c05e9` | clean | clean |

**Applied cleanly** with `git apply` (no `--check`-only). `git diff --numstat` after applying, before committing:

```
362  1  test/commands/verify-install.red.node.test.ts
2    1  test/docs/clean-room-verification-doc.red.node.test.ts
```

Matches the TPV's expected numstat exactly. The integration file
(`test/commands/verify-install-cli.red.integration.node.test.ts`) does not
appear in the diff — unchanged, as expected. `git status --porcelain` showed
only these two tracked files plus the pre-existing untracked
`cleargate-0.25.0.tgz` (untouched).

Committed only those two files (`git add` named them explicitly, never `-A`
or `.`).

## Counts against the expected table

| Check | Expected | Run 1 | Run 2 | Match |
|---|---|---|---|---|
| `npm run typecheck` | exit 0 | exit 0 | — | yes |
| Unit (`verify-install.red.node.test.ts`), SOLO | 38/0/38 | 38 tests, 0 pass, 38 fail | 38 tests, 0 pass, 38 fail | yes |
| Integration (`verify-install-cli.red.integration.node.test.ts`), SOLO | 5/0/5 | 5 tests, 0 pass, 5 fail | 5 tests, 0 pass, 5 fail | yes |
| Doc (`clean-room-verification-doc.red.node.test.ts`), SOLO, `CLEARGATE_META_ROOT`=main outer checkout | 9/0/9 | 9 tests, 0 pass, 9 fail | 9 tests, 0 pass, 9 fail | yes |

**Unit failure-reason breakdown** (both runs identical): of the 38 failures,
33 are `ERR_MODULE_NOT_FOUND` on `src/commands/verify-install.js` (U1–U16 and
their re-seal extensions/additions) and 5 are `ERR_MODULE_NOT_FOUND` on
`src/lib/cli-package-root.js` (U17a–e, the new direct
`findCleargatePackageRoot` tests per TPV ruling #2 / M4-A10). 33 + 5 = 38.
Every failure is the per-test dynamic `import()` throwing on a module that
does not exist at this commit — no other failure shape appeared.

**Sealed and parity files** — SOLO, re-run after the re-seal commit, all
identical to the TPV's "Regression witnesses" table and to the pre-re-seal
QA-Red measurement:

| File | Count |
|---|---|
| `host-adapter-contract.red.node.test.ts` | 19/19 |
| `host-selection.red.node.test.ts` | 11/11 |
| `host-lifecycle.red.node.test.ts` | 17/17 |
| `manifest-query.red.node.test.ts` | 6/6 |
| `manifest-host-ownership.red.node.test.ts` | 18/18 |
| `init-host-selection.red.node.test.ts` | 10/10 |
| `init-host-snapshot.red.node.test.ts` | 13/13 |
| `doctor-per-host.red.node.test.ts` | 10/10 |
| `upgrade-per-host.red.node.test.ts` | 6/6 |
| `uninstall-per-host.red.node.test.ts` | 16/16 |
| `uninstall-reinit.red.node.test.ts` (added to the witness set per TPV ruling #1) | 4/4 |
| `init-host-cli.red.integration.node.test.ts` | 4/4 |
| `host-cli.red.integration.node.test.ts` | 3/3 |
| `lifecycle-per-host.red.integration.node.test.ts` | 3/3 |
| `drift-check-scaffold.red.node.test.ts` (BUG-085) | 24/24 |
| `pending-task-sentinel-cards.red.node.test.ts` (BUG-085) | 13/13 |
| `doctor-drift-guard.node.test.ts` (BUG-085) | 13/13 |

Parity: `claude-adapter-init-parity.red.integration.node.test.ts` 5/5,
`init-host-parity.red.integration.node.test.ts` 15/15.

**Baseline hash** (`/private/tmp/cg-s41-m2-init-baseline`, 425 files, absolute
paths): `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` —
identical before and after this re-seal (never touched).

No mismatches anywhere. Every measured count reproduces the TPV's "Expected
counts after the re-seal" table exactly.

## Outer status

**Before (re-seal dispatch start):**
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```

**After (re-seal dispatch end):**
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```

Identical — no outer write of any kind during this re-seal dispatch (this
report edit is the only outer-tree change, and it is uncommitted, per
instructions). Cli repo `git status --porcelain` at end: only the
pre-existing untracked `cleargate-0.25.0.tgz`.

No writing CLI command ran against the outer repo. No `npm run build`. No
`git stash`/`--no-verify`/reset. The one `git apply` + one `git commit`
targeted only the two named test files in the cli main checkout, on
`story/STORY-058-08`, which is this item's authorized branch (sprint rule 9).

## Script Incidents

None. Every command in this re-seal dispatch was a direct `git`/`shasum`/`wc`/
`tsx --test`/`npm run typecheck`/`find`/`xargs shasum` invocation — no wrapped
`.cleargate/scripts/*` script was run.

flashcards_flagged: []

## Round 2 (M4-A14)

**Trigger.** QA-Verify FAILed Dev commit `9ac0fa3` (H17/M4-A5 fail-closed
violation: `<h>.no-verifier` fires for a `--host h` that is registered but
not installed). The Architect post-flight independently FAILed the same
commit, adding a second defect (R-B: a `TypeError` crash on a parseable
non-install-shaped snapshot body) and a doc fold-back item (R-C, Dev/outer
work, not QA-Red's). `plans/M4.md` §"As-built resolution after STORY-058-08"
→ **M4-A14** is the binding remediation spec; this round adds its three named
QA-Red tests, verbatim per that section's "Tests" bullet.

**Commit.** Cli repo `story/STORY-058-08`, one commit on top of `9ac0fa3`:

```
4285391 qa-red(STORY-058-08): round-2 reds U9c/U11e/U11f (M4-A14)
```

Edited only `test/commands/verify-install.red.node.test.ts` (`git diff
--numstat`: `122  0  test/commands/verify-install.red.node.test.ts` — no
other file touched). Every new fixture uses fake host names only (`fake`,
via the existing `makeFakeAdapter` helper) — no production registry
membership is pinned.

**Test count vs. the dispatch's natural-split note.** M4-A14 and the dispatch
both state "unit 41/41" as the expected post-fix count. The pre-round-2 file
had 38 tests. Written as one `test()` per U-number with an internal loop over
the five malformed bodies for U9c (rather than five separate `test()` calls),
the count comes out to exactly 38 + 3 = 41, matching the plan's own number.
Had I split U9c into five separate tests instead, the count would be 45, not
41 — noting this because the dispatch invited me to state a deviation, and I
chose the split that reproduces the plan's own stated number rather than a
finer-grained one. Each of U9c's five bodies still gets its own labelled
assertion messages (`[body=<label>] …`) inside that one test, so a future
failure still names which body broke.

### Per-test red reason (all measured directly, `9ac0fa3` + this round's commit)

| Test | Assertion that fails at `9ac0fa3` | Named reason |
|---|---|---|
| **U9c** | `await runVerifyInstall(...)` for body `null` | Uncaught `TypeError: Cannot read properties of null (reading 'cleargate_version')` thrown from `checkVersionMatch` (`src/commands/verify-install.ts:192`), inside `runVerifyInstall` (`:587`) — the test itself never reaches its first `assert`; the thrown error is node:test's failure reason (R-B, verbatim reproduction of the Arch report's measured crash) |
| **U11e** | `assert.deepStrictEqual(report.checks.filter(c => c.id === 'fake.no-verifier'), [])` | `fake.no-verifier` IS present (`status: 'fail'`, `details: ["this cleargate cannot verify host fake"]`) for a `--host fake` that is registered but not installed — exactly the H17 violation QA reproduced |
| **U11f** | same assertion, snapshot deleted | `fake.no-verifier` IS present even though the snapshot (and therefore `installed`) is absent — the same R-A defect under the fallback path |

All three failures were captured verbatim in the terminal output above before
committing; none is a module-resolution error this round (the module now
exists, per the Dev's `9ac0fa3`) — each is a real, distinguishable defect
reproduction, matching the dispatch's "each for a named reason."

### Counts, SOLO, twice

| File | Run 1 | Run 2 | Expected |
|---|---|---|---|
| `verify-install.red.node.test.ts` | 41 tests, 38 pass, 3 fail | 41 tests, 38 pass, 3 fail | 41 total; 3 red (U9c, U11e, U11f) until the Dev's fix |
| `verify-install-cli.red.integration.node.test.ts` | 5 tests, 5 pass, 0 fail | 5 tests, 5 pass, 0 fail | 5/5, unchanged |
| `clean-room-verification-doc.red.node.test.ts` (`CLEARGATE_META_ROOT=.worktrees/STORY-058-08`) | 9 tests, 9 pass, 0 fail | 9 tests, 9 pass, 0 fail | 9/9, unchanged |

`npm run typecheck`: exit 0, both before and after.

**Sealed and parity files** — SOLO, re-run after this round's commit, all
identical to every prior measurement:

| File | Count |
|---|---|
| `host-adapter-contract.red.node.test.ts` | 19/19 |
| `host-selection.red.node.test.ts` | 11/11 |
| `host-lifecycle.red.node.test.ts` | 17/17 |
| `manifest-query.red.node.test.ts` | 6/6 |
| `manifest-host-ownership.red.node.test.ts` | 18/18 |
| `init-host-selection.red.node.test.ts` | 10/10 |
| `init-host-snapshot.red.node.test.ts` | 13/13 |
| `doctor-per-host.red.node.test.ts` | 10/10 |
| `upgrade-per-host.red.node.test.ts` | 6/6 |
| `uninstall-per-host.red.node.test.ts` | 16/16 |
| `uninstall-reinit.red.node.test.ts` | 4/4 |
| `init-host-cli.red.integration.node.test.ts` | 4/4 |
| `host-cli.red.integration.node.test.ts` | 3/3 |
| `lifecycle-per-host.red.integration.node.test.ts` | 3/3 |
| `drift-check-scaffold.red.node.test.ts` (BUG-085) | 24/24 |
| `pending-task-sentinel-cards.red.node.test.ts` (BUG-085) | 13/13 |
| `doctor-drift-guard.node.test.ts` (BUG-085) | 13/13 |

Parity (compare mode, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`):
`claude-adapter-init-parity.red.integration.node.test.ts` 5/5,
`init-host-parity.red.integration.node.test.ts` 15/15.

**Baseline hash** (`/private/tmp/cg-s41-m2-init-baseline`, 425 files, absolute
paths): `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` —
identical before and after this round (never touched).

### Outer status

**Before:**
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
?? .cleargate/sprint-runs/SPRINT-41/.pending-task-2371-50582-29650.json
```

**After:**
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```

No outer write of any kind this round (the pending-task json is hook-owned
housekeeping, unrelated to and untouched by this dispatch; this report edit
is the only outer-tree change, and it is uncommitted, per instructions). Cli
repo at end: only the pre-existing untracked `cleargate-0.25.0.tgz`; HEAD
`4285391` on `story/STORY-058-08`. No build, stash, `--no-verify`, amend, or
bare `cleargate` — tests only, per the dispatch's SMOKE RULE.

flashcards_flagged:
  - "2026-09-26 · #qa-red #verify-install · A single test() with an internal loop over sub-cases keeps a plan's pinned test count exact; five separate test()s would have over-counted by 4."

STATUS=done
