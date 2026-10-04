# STORY-058-07 — TPV (Test Pattern Validation) Report
role: architect

TPV: REJECTED — a plan-conformant -07 leaves 4 of the 30 new tests unsatisfiable (scenarios 6, 10, 15a and 18) and turns 1 sealed -03 contract test red with no sanctioned edit. Three binding plan tests (M3-A31 11b, M3-A32 11c/11d) are missing. 19 mutants survive or cannot be told apart from the conformant build. Re-seal R1–R10 below closes every one.

## Subject and setup

- **Subject:** cli `story/STORY-058-07` @ `23e8280` (the QA-Red commit, on main `170ac4c`). The 7 QA-Red paths:
  - `test/hosts/manifest-query.red.node.test.ts` (6)
  - `test/commands/doctor-per-host.red.node.test.ts` (8)
  - `test/commands/upgrade-per-host.red.node.test.ts` (6)
  - `test/commands/uninstall-per-host.red.node.test.ts` (7)
  - `test/commands/lifecycle-per-host.red.integration.node.test.ts` (3)
  - `test/helpers/host-fixtures.ts` (new helper)
  - the T2 row in `test/helpers/init-fixture.ts`
- **Scratch clone:** `/private/tmp/cg-s41-tpv-058-07/cleargate-cli` at `23e8280`.
  - `node_modules` is symlinked.
  - The parent meta-root holds `git archive` copies (not symlinks) of outer `HEAD`'s `.cleargate/`, `cleargate-planning/` and `CLAUDE.md`.
  - `npm run prebuild` ran in the scratch clone. `npm run build` also ran there, only to feed the two dist-spawning doctor witnesses, once per side.
  - The clone was deleted with a literal `rm -rf -- /private/tmp/cg-s41-tpv-058-07`.
- **What was not touched:** the main cli checkout (still `story/STORY-058-07` @ `23e8280`, status `?? cleargate-0.25.0.tgz` only) and the outer repo. Nothing was edited, stashed, built or checked out in either. Only this report and the M3.md append were written.
- **Every test file ran solo** with `npm run test:file`, with `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline` set on every run. That puts the parity files in compare mode only; no capture flag was ever set.
- **Baseline integrity** (`find … -type f -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256`):
  - before: `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` (425 files)
  - after: `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` (425 files), unchanged

## Rulings on the QA-Red ambiguities

The orchestrator already confirmed #3, #4 and #5. #4's `host-fixtures.ts` is also the fixture source the re-seal reuses.

**#1: does `--host h` narrow the top `Scaffold drift:` line? Ruling: yes. It narrows the whole printed report and never the cache.** Recorded as M3-A36.
- **Plan text.** The `runCheckScaffold` bullet narrows `entries` by `--host h` to `entryOwner(e) === h`. The `emitSummary` bullet keeps the top line "byte-identical (over the selected set)". "Byte-identical" there means the pre-07 format and Rule 2. "Over the selected set" names the set being counted, which is the narrowed one.
- **M3-A33.** The cache branch replays a full `.drift-state.json`, so narrowing has to happen in `emitSummary` for the cache path to be right at all.
- **Binding reading for the Developer:**
  - The map and the written cache always hold the full `selectEntriesForHosts(pkg, installed, registry)`.
  - `emitSummary` filters by `e.owner ?? entryOwner(e.entry)` === `h`.
  - It computes all four outputs over that filtered set: the top line, the `Run cleargate upgrade to review.` line, the single `  h:` line, and the verbose lines.
  - With a clean 3-host fixture, `--host codex` prints exactly `Scaffold drift: 0 user-modified, 0 upstream-changed, 0 both-changed, 1 clean` and then `  codex: 0 user-modified, 0 upstream-changed, 0 both-changed, 1 clean`.
- **Invariant:** the top line's counts equal the sum of the printed owner lines.
- **Why a narrowed cache is wrong:** the next `--session-start-mode` replay without `--host` would report a single host.
- The QA-Red test was silent on the top line, and its title claimed "(top summary line unaffected)". Re-seal R3 pins the ruling and retitles the test.

**#2: scenario 13's anchoring. Ruling: accepted, plus one equivalence assertion.** Recorded as M3-A37.
- **Why the anchoring is accepted.** The plan clause is "`uninstall --host claude` on a claude-only install behaves exactly like no `--host`: the same removed set and the marker is written". At the red commit `uninstall.ts` never reads `opts.host`, so a pure equivalence check would pass vacuously. Anchoring the red on `adapter.remove()` being called once, plus the marker, is correct.
- **What R8 adds.** The "same removed set" clause was not pinned. R8 adds a twin install uninstalled without `--host`. Both runs use `now: () => new Date('2026-01-01T00:00:00.000Z')`, and `listTree(record.dir)` must `deepStrictEqual` `listTree(twin.dir)`, marker bytes included. It is red at `23e8280` through the spy, and green on a conformant build.
- **Binding for the Developer:** `--host h` naming the only installed host enters the no-`--host` code path itself (M3-A31 step 2). It gets no separate branch.

## Simulation: the plan-conformant -07 written in the scratch clone

`npm run typecheck` is clean. The simulated change set, by file:
- **`src/hosts/manifest-query.ts`:** `selectEntriesForHosts`, exactly as M3-A6.
- **`types.ts`:** the three `HostAdapter` members.
- **`claude.ts`:**
  - `displayName: 'Claude Code'` and `sessionLoadedPaths: ['.claude/settings.json', '.mcp.json']`.
  - `mergeSurgeryTarget`, the body of `upgrade.ts:397-444` moved, with the settings "surgery failed → theirs" fallback.
  - The 7th deps key `supersedeHookCommands`.
  - `const supersededSettings = d.supersedeHookCommands(existingSettings, …)` feeding `d.mergeSettings`. `existingSettings` is never reassigned.
- **`merge-settings.ts`:** `supersedeHookCommands`, deep-cloned, same event and same matcher only, with the three drop conditions.
- **`settings-json-surgery.ts`:** `isClearGateCommand` exported, with the 7-hook alternation.
- **`manifest.ts`:** `DriftMapEntry.owner`.
- **`doctor.ts`:**
  - `DoctorFlags.host` and `DoctorCliOptions.hostRegistry`.
  - The `--host` + non-check-scaffold guard after `selectMode`: stderr, then `exit(2)`.
  - `runCheckScaffold(…, outcome)`: `loadInstallSnapshot` → `installedHosts` → `--host` validation (stdout line + `configError`) → cache.
  - The map is built over `selectEntriesForHosts`, with `owner: entryOwner(snapEntry ?? entry)`.
  - `emitSummary` narrows at emit (M3-A36).
- **`upgrade.ts`:**
  - `hostRegistry` seam.
  - `installed`, `known` and `installedAdapters`.
  - `filteredFiles` and prune both through `selectEntriesForHosts`.
  - `isClaudeMd` and `isSettingsJson` deleted.
  - Take-theirs goes through `installedAdapters.find(surgeryTargets().includes(path)).mergeSurgeryTarget`, and `null` → `{ updated: false }`.
  - The `SESSION_LOAD_PATHS` union.
  - One restart block per adapter.
  - The hint after `[upgrade] complete.`.
  - `owner` on the second `DriftMapEntry` literal.
- **`uninstall.ts`:**
  - M3-A31 order: resolve → last-host test → `planHostRemoval`.
  - M3-A32 gates: a dirty-tree check over `deletes ∪ keeps`; the `CLAUDE.md` marker check only when `h === 'claude'`; `--preserve`/`--remove` → exit 2.
  - The partial preview and dry-run.
  - `executeHostRemoval` with the `s.replace(/\n$/, '')` sink adapter.
  - Full path: pre-validation only when claude is installed; classify skips the union of installed adapters' `surgeryTargets()`; `adapter.remove()` per installed registered adapter, in registry order; rule 3.5.
- **`cli.ts`:** `--host <name>` on doctor and uninstall.

**One forced correction (M3-A38).** The verbatim-moved `[skip]` message contains the literal `<!-- CLEARGATE:START -->`, and that turns the sealed -03 `host-adapter-contract` Scenario 11 red ("claude.ts must not hardcode the CLEARGATE:START marker"; measured 17/19). Building it as `` `no ${CLEARGATE_START} block present` `` gives identical bytes and a green guard.

**CLI option-wiring smoke.** Run from a literal tmp dir outside every repo, as one `(cd … && tsx src/cli.ts …)` call each:
- `doctor --check-scaffold --host nope --cwd <tmp>` → `cleargate doctor: host "nope" is not installed (installed: claude)`, exit 2
- `uninstall --host nope --dry-run` → `cleargate uninstall: Unknown host "nope". Valid hosts: claude.`, exit 2
- The tmp dir held only its seeded snapshot afterwards, and was deleted.

## Red → green table: the 30 QA-Red tests at `23e8280`

"Sealed" means the tests run against `src` at `23e8280`. "Conformant" means they run against the simulation. Each file was run solo. The QA-Red counts at `23e8280` reproduce the QA-Red report exactly. The re-sealed files were also run twice on the conformant build, with identical counts.

| # | File | Test (abridged) | Sealed | Conformant | Verdict |
|---|---|---|---|---|---|
| 1a | manifest-query | R2 `[claude]` → core + claude | red | green | ok |
| 1b | manifest-query | R2 `[claude, codex]` → all four | red | green | ok |
| 1c | manifest-query | R2 `[codex]` → core + codex + shared | red | green | ok |
| 1d | manifest-query | unregistered owner excluded | red | green | ok |
| 1e | manifest-query | empty selection → core only | red | green | ok |
| 1f | manifest-query | registry defaults | red | green | ok |
| 2 | doctor-per-host | Gherkin 1: core/claude/codex lines in order | red | green | ok |
| 3 | doctor-per-host | Gherkin 4: attribution + cache `owner` | red | green | ok |
| 4a | doctor-per-host | `--host codex` → only the codex owner line | red | green | ok, but silent on ambiguity #1 → R3 |
| 4b | doctor-per-host | `--host copilot` (not installed) exits 2 | red | green | ok |
| 4c | doctor-per-host | `--host` + `sessionStart` exits 2 | red | green | ok |
| 5 | doctor-per-host | Rule-2 guard: pre-07 output + 2 lines | red | green | ok |
| 4b-1 | doctor-per-host | pre-07 cache still prints owner lines | red | green | vacuous on counts (M9 survives) → R4 |
| 4b-2 | doctor-per-host | fresh cache + `--host copilot` exits 2 | red | green | ok |
| 6 | upgrade-per-host | Gherkin 2: no non-claude path | red | **red** | **unsatisfiable**: sanity `existsSync('CLAUDE.md')`; upgrade never creates `CLAUDE.md` (`INTENTIONALLY_UNTRACKED`) → R1 |
| 7a | upgrade-per-host | legacy fixture: no non-claude file, no `hosts` | red | green | ok |
| 7b | upgrade-per-host | hint: none under production, once under R2 | red | green | ok |
| 8 | upgrade-per-host | scoped prune | red | green | ok |
| 9 | upgrade-per-host | `mergeSurgeryTarget` called once | red | green | ok |
| 10 | upgrade-per-host | restart named "Fake Codex" | red | **red** | **unsatisfiable**: no snapshot → installed is the legacy `['claude']`, so `.codex/hooks.json` is never selected → R2 |
| 11 | uninstall-per-host | Gherkin 5: `--host copilot` | red | green | ok |
| 12a | uninstall-per-host | full uninstall through the spy `remove()`; settings survives | red | green | ok |
| 12b | uninstall-per-host | `CLAUDE.md` without START exits 1 | **green** | green | unchanged anchor (#5 confirmed) |
| 13 | uninstall-per-host | `--host claude` last host → `remove()` + marker | red | green | ok; equivalence added → R8 |
| 14 | uninstall-per-host | census: 7 commands ⊆ `isClearGateCommand` | red | green | ok |
| 15a | uninstall-per-host | `supersedeHookCommands` unit | red | **red** | **unsatisfiable**: asserts the `--host claude` form after supersede alone. Supersede only drops (`[]` measured); the form comes from `mergeSettings` → R6 |
| 15b | uninstall-per-host | `null` → `null` | red | green | ok |
| 16 | lifecycle-per-host | legacy upgrade end to end | red | green | ok; `.agents` absence added → R9 |
| 17 | lifecycle-per-host | `--host codex` tree diff | red | green | ok |
| 18 | lifecycle-per-host | E2E: R2 `all`, every owner clean | red | **red** | **unsatisfiable** (measured stdout below) → R9 |

Scenario 18's measured stdout on the conformant build (verbose):
```
Scaffold drift: 1 user-modified, 1 upstream-changed, 0 both-changed, 74 clean
Run cleargate upgrade to review.
  core: 0 user-modified, 1 upstream-changed, 0 both-changed, 49 clean
  claude: 0 user-modified, 0 upstream-changed, 0 both-changed, 24 clean
  codex: 1 user-modified, 0 upstream-changed, 0 both-changed, 1 clean
  .cleargate/scripts/gate-checks.json  upstream-changed  (7d9672→7d9672 vs fa8e2a)
  .codex/hooks.json  user-modified  (364b37→d96a7c vs 364b37)
```
Both drifts are outside -07:
- `gate-checks.json` is the pre-existing fresh-install drift (flashcard 2026-09-25 `#doctor #drift`).
- `.codex/hooks.json` is rewritten by the fixture fake codex `install()` after the copy.

Totals:
- **Sealed:** 29 red, 1 green (12b).
- **Conformant:** 26 green, 4 red (6, 10, 15a, 18).

## Sealed files

| File | Expected | At `23e8280` (sealed src) | Conformant, QA-Red seal | Conformant, after re-seal |
|---|---|---|---|---|
| `host-adapter-contract.red` | 19 | 19/19 | **18/19**: Scenario 7 "on a user-content fixture" (contract change, M3-A39). Before the M3-A38 fix it was **17/19** (Scenario 11 too) | 19/19 |
| `host-selection.red` | 11 | 11/11 | 11/11 | 11/11 |
| `init-host-selection.red` | 10 | 10/10 | 10/10 | 10/10 |
| `init-host-cli.red.integration` | 4 | 4/4 | 4/4 | 4/4 |
| `manifest-host-ownership.red` | 18 | 18/18 | 18/18 | 18/18 |
| `init-host-snapshot.red` | 13 | 13/13 | 13/13 | 13/13 |
| `host-lifecycle.red` | 17 | 17/17 | 17/17 | 17/17 |
| `host-cli.red.integration` | 3 | 3/3 | 3/3 | 3/3 |

The Scenario 7 red is correct behaviour, not a regression:
- Its expectation is `mergeSettings(before, ADD)`.
- The -07 install drops the `stamp-and-gate.sh --legacy` stale variant first, which is exactly the T2 delta.
- R10 moves the expectation through `supersedeHookCommands` (M3-A39). No other sealed file changes.

## Rule-2 parity (compare mode, the -07 row strict on both sides, M3-A8)

| File | At `23e8280` | Conformant | Mutant M33 (supersede not wired) |
|---|---|---|---|
| `claude-adapter-init-parity.red.integration` | 4/5 (scenario 12 `user-content` red) | **5/5** | 4/5 |
| `init-host-parity.red.integration` | 12/15 (scenario 14 `user-content` ×3 red) | **15/15** | 12/15 |

The recorded `user-content` `.claude/settings.json` sha256 on the conformant build is `123d7bc742e7c7fadab80e2949db5cbe8b140884178ac74fc4cab47ad81109c7` (mode 644). That equals the T2 `currentHash` exactly. The baseline `meta.json` holds `7adcfa3d77557f61ebcbc15163fe36ff6719fef5a5edcf41131b14d76bb6f83b`.

On the conformant build, `user-content`'s stdout settings line is still `Updated .claude/settings.json: merged PostToolUse hook — restart …`, so stdout parity holds.

## Mutant table

Each mutant was applied to the conformant simulation and run solo against:
- the QA-Red seal (`23e8280` tests)
- the re-seal (`23e8280` + R1–R10)

Killer names are test titles, abbreviated. "Undiscriminated" means the host test is red on the conformant build anyway, so it cannot tell the mutant apart.

| ID | Mutant | QA-Red seal | After re-seal |
|---|---|---|---|
| M1 | `selectEntriesForHosts` keeps an unregistered owner (raw `hosts` in the owner check) | killed: MQ 1d | killed: 1d |
| M2 | …skips `payloadFilter` | killed: MQ 1a, 1d, 1e | same |
| M3 | …drops core | killed: MQ all 6 | same |
| M4 | doctor `--host` never validated | killed: 4b, 4b-2 | same |
| M5 | `--host` validated only after the cache replay | killed: 4b-2 | same |
| M6 | owner lines out of order | killed: 2, 5 | killed: 2, 5, 4b-1, R5a, R5b, 18 |
| M7 | no `core` line | killed: 2, 3, 5 | + R5a, R5b, 18 |
| M8 | `DriftMapEntry.owner` never set (doctor site) | killed: 3 (typecheck also rejects: required field) | killed: 3, R5b |
| M9 | `emitSummary` reads `e.owner` with no `entryOwner(e.entry)` fallback | **SURVIVED** | killed: 4b-1 (R4) |
| M10 | owner = `(snap ?? pkg).owner` (cast past tsc; uncast form fails typecheck) | **SURVIVED** | killed: R5b |
| M11 | `--host` + non-check-scaffold mode not exit 2 | killed: 4c | same |
| M12 | #1 inverted: top line over the un-narrowed map | **SURVIVED** | killed: 4a (R3) |
| M41 | `--host` still prints every owner line | killed: 4a | same |
| M42 | `--host` narrows the map, so the cache is narrowed | **SURVIVED** | killed: 4a (R3) |
| M36 | doctor iterates `pkgManifest.files`, not `selectEntriesForHosts` | **SURVIVED** | killed: R5a |
| M13 | upgrade additive (`pkgManifest.files` unfiltered) | killed: 7a, 16 | killed: 6, 7a, 16 |
| M14 | prune not scoped (a not-installed host's entry pruned) | killed: 8 | same |
| M15 | surgery inline, adapter never consulted | killed: 9; `upgrade-claude-md.red` 9/10/11 | same |
| M16 | `null` from `mergeSurgeryTarget` → writes `theirs` | killed only by the existing `upgrade-claude-md.red` 9, 10 (stays green unmodified) | same |
| M17 | hardcoded `SESSION_LOAD_PATHS` | **SURVIVED** (10 undiscriminated) | killed: 10 (R2) |
| M18 | restart names `a.name` | killed by the existing `upgrade-restart-warning.red` (2 tests) | + 10 |
| M18b | restart hardcodes "Claude Code" (wrong `displayName` for codex) | **SURVIVED** (10 undiscriminated) | killed: 10 (R2) |
| M40 | claude `sessionLoadedPaths` drops `.mcp.json` | killed by the existing `upgrade-restart-warning.red` | same |
| M19 | hint printed under the production registry (Rule 2) | killed: 7b | same |
| M20 | hint printed twice | killed: 7b | same |
| M21 | upgrade adds `hosts` to a legacy snapshot | killed: 7a, 16 | same |
| M22a | partial path writes `.uninstalled` | killed: 11, 17 | same |
| M22b | partial path deletes the snapshot | killed: 11 | same |
| M23 | settings.json classified for wholesale deletion | killed: 12a | same |
| M24 | `adapter.remove` never called | killed: 12a, 13, `uninstall.node` (1) | + 12d |
| M25 | `adapter.remove` called twice | killed: 12a, 13 | + 12d |
| M26 | `preserve_on_uninstall` ignored (no rule 3.5) | **SURVIVED** | killed: 12c |
| M27 | `CLAUDE.md` marker pre-validation when claude is not installed | **SURVIVED** | killed: 12d |
| M28 | unknown `--host` exits 1 | **SURVIVED** | killed: 11e |
| M29 | `isClearGateCommand` misses one of the 7 hooks | killed: 14 | same |
| M30 | supersede crosses matchers | **SURVIVED** (15a undiscriminated; the seed's other-matcher command has a different first token, so the mutant cannot reach it) | killed: 15a, 15c |
| M31 | supersede drops user commands (condition = `!== cmd` only) | undiscriminated | killed: 15a, 15c, 15d |
| M32 | supersede mutates its input | undiscriminated | killed: 15a |
| M45 | supersede ignores `isClearGateCommand` | **SURVIVED** | killed: 15d |
| M33 | supersede not wired into `install()` | killed: parity 12 and 14×3 (both files) | + 15c, contract Scenario 7 (R10) |
| M34 | partial path passes uninstall's line sinks unwrapped (double `\n`) | **SURVIVED** | killed: 11b |
| M35 | `--preserve`/`--remove` accepted on the partial path | **SURVIVED** | killed: 11c |
| M37 | partial `--dry-run` lists the full-path buckets | **SURVIVED** | killed: 11d |
| M38 | `--host <last host>` takes the partial path | killed: 13 | same |
| M39 | uninstall ignores `--host` | killed: 11, 17 | + 11c–11f |
| M43 | partial dirty-tree gate over `snapshot.files` | **SURVIVED** | killed: 11f |
| M44 | partial path has no dirty-tree gate | **SURVIVED** | killed: 11f |

**Summary:**
- **QA-Red seal:** 19 survive or are undiscriminated: M9, M10, M12, M17, M18b, M26, M27, M28, M30, M31, M32, M34, M35, M36, M37, M42, M43, M44, M45.
- **After re-seal:** 0 survive.

## Regression witnesses (sealed src vs conformant src, solo, failing-name sets diffed)

| File | Sealed | Conformant | Fail-name diff |
|---|---|---|---|
| `doctor-drift-guard.node` | 7/7 (scratch dist) | 7/7 (scratch dist) | empty |
| `doctor-membership-banner.node` | 4/4 | 4/4 | empty |
| `doctor-notifier.node` | 6/6 | 6/6 | empty |
| `doctor-pricing.node` | 5/5 | 5/5 | empty |
| `doctor-retired-field.red.node` | 3/3 (scratch dist) | 3/3 (scratch dist) | empty |
| `doctor-session-start.node` | 20/20 | 20/20 | empty |
| `doctor.node` | 39/39 | 39/39 | empty |
| `uninstall.node` | 20/20 | 20/20 | empty; it never pinned the settings.json wholesale deletion |
| `upgrade-changelog.node` | 7/7 | 7/7 | empty |
| `upgrade-claude-md.red.node` (unmodified) | 4/4 | 4/4 | empty |
| `upgrade-payload-root.node` | 3/3 | 3/3 | empty |
| `upgrade-pin-and-prune.node` | 11/11 | 11/11 | empty |
| `upgrade-preserves-gate-commands.node` | 4/4 | 4/4 | empty |
| `upgrade-registers-new-files.node` | 4/4 | 4/4 | empty |
| `upgrade-restart-warning.red.node` | 4/4 | 4/4 | empty |
| `upgrade-state-parity.red.node` | 2/2 | 2/2 | empty |
| `upgrade.node` | 14/14 | 14/14 | empty |
| `lib/settings-json-surgery.node` | 13/13 | 13/13 | empty |
| `lib/manifest.node` | 30/30 | 30/30 | empty |
| `commands/init.node` (the `mergeSettings` witness; `test/init/merge-settings*` does not exist) | 29/29 | 29/29 | empty |

Notes on these runs:
- **Dist-spawning files.** `doctor-drift-guard` and `doctor-retired-field` need a built `dist/cli.js`. Without one, both sides cancel the same 3 tests each, identically. With a scratch `npm run build` per side, both are green.
- **Bare `npm run typecheck`** is clean on the conformant build.

## Binding Dev constraints

- **E1 (M3-A38):** `claude.ts` contains no literal `CLEARGATE:START` or `mcpServers`, comments included. `mergeSurgeryTarget`'s `[skip]` text is built from the imported `CLEARGATE_START`, with identical bytes. Every other line of `upgrade.ts:397-444` moves verbatim, including the settings "surgery failed → return `theirs`" fallback. Helpers are called through `d.<key>`.
- **E2 (M3-A36):** doctor `--host` narrows only in `emitSummary`, over `e.owner ?? entryOwner(e.entry)`. The map and `.drift-state.json` always hold the full `selectEntriesForHosts(pkg, installed, registry)`.
- **E3 (M3-A33):** `runCheckScaffold` order is:
  1. `loadInstallSnapshot`
  2. `installedHosts`
  3. `--host` check, which prints `` `cleargate doctor: host "${h}" is not installed (installed: ${installed.join(', ')})` `` on **stdout**, sets `outcome.configError = true`, and returns
  4. the owners list (`core`, then the installed registered hosts in registry order)
  5. `readDriftState` and the cache
  6. the compute
  The `--host` + non-check-scaffold guard sits in `doctorHandler` right after `selectMode`: stderr `cleargate doctor: --host applies only to --check-scaffold`, `exit(2)`, return.
- **E4:** owner lines use the exact format `` `  ${owner}: ${um} user-modified, ${uc} upstream-changed, ${bc} both-changed, ${clean} clean` ``. They go after the `Run cleargate upgrade to review.` line, or after the top line when that line is absent, and before the verbose lines.
- **E5 (M3-A20/A33):** `owner: entryOwner(<snapshot entry> ?? <package entry>)` at both `DriftMapEntry` sites, `doctor.ts` and `upgrade.ts:806-812`. Never `e.owner`, never a cast.
- **E6:** `installed = installedHosts(installSnapshot)` in doctor, upgrade and uninstall, even for a null snapshot. A snapshot-less directory is a legacy Claude install. `known`/`installedAdapters` = `installed ∩ registry.names()`, resolved in registry order.
- **E7 (M3-A42):**
  - The hint prints once, immediately after `[upgrade] complete.`, iff `registry.names().some((n) => !installed.includes(n))`. The text is exactly `` [upgrade] hint: more hosts are available — add one with `cleargate host add <name>`. ``
  - Restart blocks go one per installed adapter, in registry order. Each is `''`, then `` `⚠ Restart ${a.displayName} in this repo to load the new ${n === 1 ? 'config' : 'configs'}:` ``, then its file lines.
  - A file belongs to the first installed adapter that declares it.
- **E8:** `supersedeHookCommands` follows the blueprint exactly:
  - deep clone
  - `null` → `null`
  - the same event and the same `matcher` only
  - drop iff the first token is equal, the command differs, and `isClearGateCommand` holds
  - an emptied entry stays as `hooks: []`
  - it guards a non-string `command`
  `existingSettings` is never reassigned, and `supersedeHookCommands` is the 7th `ClaudeAdapterDeps` key with a `DEFAULT_DEPS` entry. `createHostRegistry` does not validate the three new members (T4 item 5).
- **E9 (M3-A31/A32): the uninstall partial path:**
  - Order: `registry.resolve` (`UnknownHostError` → `cleargate uninstall: ${e.message}`, exit 2) → last-host test → `planHostRemoval` (`HostLifecycleError` → exit `e.exitCode`) → gates → preview → dry-run → confirmation → `executeHostRemoval`.
  - Gate order:
    1. dirty-tree over `[...plan.deletes, ...plan.keeps]`, bypassed by `--force`
    2. the `CLAUDE.md` marker check iff `h === 'claude'`
    3. `--preserve`/`--remove` → `cleargate uninstall: --preserve/--remove apply only to a full uninstall`, exit 2
  - Preview: `` `Will remove ${n} files, keep ${plan.keeps.length} files of host ${h}, and strip ${h}'s ClearGate config entries.` ``, where `n` counts deletes present on disk.
  - Dry-run buckets use the `:368-386` headers and line formats: `  [remove] ` for present deletes, `  [keep]   ` for keeps, `  [skip]   ` for absent deletes. Then `[dry-run] No files changed.` and `exit(0)`.
  - Sinks go through `s.replace(/\n$/, '')`, with `logPrefix: 'cleargate uninstall: '`.
  - After execute, return. No marker, no snapshot or drift-state removal, no package.json edit.
- **E10:** full uninstall:
  - the marker pre-validation runs iff `'claude'` is installed
  - the classify loop `continue`s on the union of installed adapters' `surgeryTargets()`
  - `adapter.remove({ cwd: target, stdout, stderr })` runs for each installed registered adapter, in registry order, with uninstall's own line sinks unwrapped; `removedPaths.push(...report.removed)`
  - `shouldPreserve` rule 3.5 (`if (entry.preserve_on_uninstall) return true;`) goes after the user-artifact rule and after the two overrides
  - the now-unused `removeBlock`/`removeClearGateHooks` imports are dropped (`noUnusedLocals`)
- **E11:** `git diff main -- src/hosts/lifecycle.ts src/commands/host.ts src/lib/session-load-delta.ts src/lib/drift-check.ts src/hosts/registry.ts` is empty.
- **E12 (M3-A6):** the `cli.ts` options land at the as-built anchors, doctor after `:605` and uninstall after `:662`. Each takes exactly one name, with no `collectHostOption`.
- **E13:** the Dev commit touches no test file. The only sealed-file change -07 carries is R10, made by QA-Red in the re-seal commit.

## Re-seal R1–R10 (QA-Red applies verbatim in one follow-up commit on `story/STORY-058-07`)

| ID | File | Change |
|---|---|---|
| R1 | `upgrade-per-host` scenario 6 | Drop the `CLAUDE.md` sanity check; assert `.agents` is absent and a core file (`.cleargate/knowledge/cleargate-protocol.md`) is present |
| R2 | `upgrade-per-host` scenario 10 | Seed a snapshot with `hosts: ['claude', 'codex']`; assert the exact 6-line tail (the Claude Code block, then the Fake Codex block) |
| R3 | `doctor-per-host` 4a | Ruling #1: exact 2-line stdout, and the cache keys still hold all 3 entries; retitled |
| R4 | `doctor-per-host` 4b-1 | Exact owner lines with `1 clean` each |
| R5 | `doctor-per-host` (new ×2) | R5a: the selected set excludes a not-installed host's stray file from stdout and the cache. R5b: a legacy snapshot's owners are stamped by path |
| R6 | `uninstall-per-host` 15a (rewritten), 15d, 15c (new) | Supersede-only expectations with a first-token-sharing other-matcher seed; a non-ClearGate same-token command survives; a non-force `claudeAdapter.install()` leaves exactly the `--host claude` form |
| R7 | `uninstall-per-host` (new ×7) | 11b sinks, 11c tier overrides → exit 2, 11d dry-run buckets, 11e unknown/not-installed → exit 2, 11f dirty-tree scope, 12c rule 3.5, 12d codex-only full uninstall |
| R8 | `uninstall-per-host` 13 | Ruling #2: twin no-`--host` install; the whole trees are equal under a frozen `now` |
| R9 | `lifecycle-per-host` 16 and 18 | 16: `.agents` absent. 18: a codex with a no-op `install()`; adapter lines all-clean; core tolerates only `gate-checks.json` `upstream-changed`; the top line's clean count equals the sum of the owner lines; exit 0 |
| R10 | sealed -03 `host-adapter-contract` Scenario 7 | Expectation `mergeSettings(supersedeHookCommands(before, ADD), ADD)` through a dynamic import, applied only when `before` is non-null, so the bare case stays green at the red commit |

The patch was measured to apply with `git apply --check` clean on a fresh clone at `23e8280`. Hashes:
- patch sha256: `7d6a5f6bedbc6e35c5cc9af66ef249e68b4b57c99e3b1048e419c5ed8b26ef5d`
- post-apply sha256:
  - `test/commands/doctor-per-host.red.node.test.ts`: `5cdf80c2eb74d765f63de2cc922de6b5f89462fda27f6a65eea4c8ba5a45fdbb`
  - `test/commands/lifecycle-per-host.red.integration.node.test.ts`: `f7ac9872280059829c0301926494d449f5daf1e42951416341fc3f8538840bbe`
  - `test/commands/uninstall-per-host.red.node.test.ts`: `9da65f6f990e4bd6d0b4b681da9693019e0cd7d28faac9aa6c09a766eec050b3`
  - `test/commands/upgrade-per-host.red.node.test.ts`: `deb4270018227b944de5cc29eed0a9c6024782dc634a0ab5a2a7d4752985ebbc`
  - `test/hosts/host-adapter-contract.red.node.test.ts`: `17e16be1a791b6d5194634be7db3bb3129758a2e8fcd944df47db200901c7a3d`
- Unchanged by the re-seal: `test/hosts/manifest-query.red.node.test.ts`, `test/helpers/host-fixtures.ts` and `test/helpers/init-fixture.ts` (the T2 row stands; its hashes are verified above).

```diff
diff --git a/test/commands/doctor-per-host.red.node.test.ts b/test/commands/doctor-per-host.red.node.test.ts
index 8d342b4..0c89c52 100644
--- a/test/commands/doctor-per-host.red.node.test.ts
+++ b/test/commands/doctor-per-host.red.node.test.ts
@@ -225,7 +225,7 @@ describe('Scenario 3 — Gherkin 4: drift is attributed to the owning host', ()
 // ── Scenario 4 — host filter ────────────────────────────────────────────────
 
 describe('Scenario 4 — --host filter', () => {
-  test('--host codex prints only the codex per-owner line (top summary line unaffected)', async () => {
+  test('--host codex narrows the whole report to codex (top line included); the written cache stays full', async () => {
     const { dir, packageRoot } = buildCleanR2Fixture();
     const registry = makeR2();
     const out: string[] = [];
@@ -249,6 +249,17 @@ describe('Scenario 4 — --host filter', () => {
       ['  codex: 0 user-modified, 0 upstream-changed, 0 both-changed, 1 clean'],
       `expected exactly one appended owner line (codex only), got: ${JSON.stringify(ownerLines)}`,
     );
+    // TPV ruling on QA-Red ambiguity #1 (M3-A36): the top line counts the --host-narrowed set.
+    assert.deepStrictEqual(out, [
+      'Scaffold drift: 0 user-modified, 0 upstream-changed, 0 both-changed, 1 clean',
+      '  codex: 0 user-modified, 0 upstream-changed, 0 both-changed, 1 clean',
+    ]);
+    // ...and the cache written by a --host run is never narrowed.
+    const cached = await readDriftState(dir);
+    assert.deepStrictEqual(
+      Object.keys(cached!.drift).sort(),
+      ['.claude/thing.md', '.codex/thing.md', 'core-thing.md'],
+    );
   });
 
   test('--host copilot (not installed) exits 2 and names the installed set', async () => {
@@ -396,6 +407,12 @@ describe('M3-A33 New test 4b — legacy (no-owner) cached drift-state; --host va
       new Set(['core', 'claude', 'codex']),
       `expected core/claude/codex owner lines even from a legacy (no-owner) cache, got: ${JSON.stringify(out)}`,
     );
+    // TPV re-seal R4: each cached entry is attributed (e.owner ?? entryOwner(e.entry)), not merely a line printed per owner.
+    assert.deepStrictEqual(ownerLines, [
+      '  core: 0 user-modified, 0 upstream-changed, 0 both-changed, 1 clean',
+      '  claude: 0 user-modified, 0 upstream-changed, 0 both-changed, 1 clean',
+      '  codex: 0 user-modified, 0 upstream-changed, 0 both-changed, 1 clean',
+    ]);
     assert.deepStrictEqual(codes, [0]);
   });
 
@@ -427,3 +444,63 @@ describe('M3-A33 New test 4b — legacy (no-owner) cached drift-state; --host va
     assert.deepStrictEqual(codes, [2], `a fresh cache must not bypass --host validation; stdout=${JSON.stringify(out)}`);
   });
 });
+
+// ── TPV re-seal R5 — the selected set: a registered-but-not-installed host is never reported ─
+
+describe('TPV R5 — doctor counts only selectEntriesForHosts(pkg, installed)', () => {
+  test('R2, hosts=[claude], a package holding a codex entry: stdout counts core + claude only', async () => {
+    const dir = mkTmp('cg-s41-doctor-selected-');
+    const packageRoot = mkTmp('cg-s41-doctor-selected-pkg-');
+    const entries = [
+      mkEntry('core-thing.md', 'core', 'core file\n'),
+      mkEntry('.claude/thing.md', 'claude', 'claude file\n'),
+      mkEntry('.codex/thing.md', 'codex', 'codex file\n'),
+    ];
+    writeFileAt(dir, 'core-thing.md', 'core file\n');
+    writeFileAt(dir, '.claude/thing.md', 'claude file\n');
+    writeFileAt(dir, '.codex/thing.md', 'codex file\n'); // a stray file of a host that is not installed
+    writePackageManifest(packageRoot, entries);
+    writeInstallSnapshot(dir, entries.slice(0, 2), ['claude']);
+    const out: string[] = [];
+    const { exit, codes } = makeExitCapture();
+    await doctorHandler(
+      { checkScaffold: true },
+      { cwd: dir, packageRoot, stdout: (s: string) => out.push(s), stderr: () => {}, exit, hostRegistry: makeR2() } as DoctorCliOptions & { hostRegistry: unknown },
+    );
+    assert.deepStrictEqual(out, [
+      'Scaffold drift: 0 user-modified, 0 upstream-changed, 0 both-changed, 2 clean',
+      '  core: 0 user-modified, 0 upstream-changed, 0 both-changed, 1 clean',
+      '  claude: 0 user-modified, 0 upstream-changed, 0 both-changed, 1 clean',
+    ]);
+    assert.deepStrictEqual(codes, [0]);
+    const state = await readDriftState(dir);
+    assert.deepStrictEqual(Object.keys(state!.drift).sort(), ['.claude/thing.md', 'core-thing.md']);
+  });
+
+  test('a legacy snapshot (no hosts, no owner) under a claude-only registry: owners attributed by path, stamped into the cache', async () => {
+    const dir = mkTmp('cg-s41-doctor-legacy-');
+    const packageRoot = mkTmp('cg-s41-doctor-legacy-pkg-');
+    const entries = [mkEntry('core-thing.md', 'core', 'core file\n'), mkEntry('.claude/thing.md', 'claude', 'claude file\n')];
+    writeFileAt(dir, 'core-thing.md', 'core file\n');
+    writeFileAt(dir, '.claude/thing.md', 'claude file\n');
+    writePackageManifest(packageRoot, entries);
+    writeInstallSnapshot(dir, entries.map(({ owner: _o, ...rest }) => rest as ManifestEntry), undefined);
+    const out: string[] = [];
+    const { exit, codes } = makeExitCapture();
+    await doctorHandler(
+      { checkScaffold: true },
+      { cwd: dir, packageRoot, stdout: (s: string) => out.push(s), stderr: () => {}, exit, hostRegistry: createHostRegistry([claudeAdapter]) } as DoctorCliOptions & { hostRegistry: unknown },
+    );
+    assert.deepStrictEqual(out, [
+      'Scaffold drift: 0 user-modified, 0 upstream-changed, 0 both-changed, 2 clean',
+      '  core: 0 user-modified, 0 upstream-changed, 0 both-changed, 1 clean',
+      '  claude: 0 user-modified, 0 upstream-changed, 0 both-changed, 1 clean',
+    ]);
+    assert.deepStrictEqual(codes, [0]);
+    const state = await readDriftState(dir);
+    const owners = Object.fromEntries(
+      Object.entries(state!.drift).map(([p, e]) => [p, (e as unknown as { owner?: string }).owner]),
+    );
+    assert.deepStrictEqual(owners, { 'core-thing.md': 'core', '.claude/thing.md': 'claude' });
+  });
+});
diff --git a/test/commands/lifecycle-per-host.red.integration.node.test.ts b/test/commands/lifecycle-per-host.red.integration.node.test.ts
index 0e07fec..38ed2b1 100644
--- a/test/commands/lifecycle-per-host.red.integration.node.test.ts
+++ b/test/commands/lifecycle-per-host.red.integration.node.test.ts
@@ -40,7 +40,9 @@ import { doctorHandler, type DoctorFlags, type DoctorCliOptions } from '../../sr
 import { installedHosts } from '../../src/lib/manifest.js';
 import type { ManifestFile } from '../../src/lib/manifest.js';
 import { runInitScenario } from '../helpers/init-fixture.js';
-import { getP2, getP3, makeR2, makeR3, mkTmp, listTree, readSnapshot } from '../helpers/host-fixtures.js';
+import { getP2, getP3, makeR3, mkTmp, listTree, readSnapshot, makeFakeCodex } from '../helpers/host-fixtures.js';
+import { createHostRegistry } from '../../src/hosts/registry.js';
+import { claudeAdapter } from '../../src/hosts/claude.js';
 
 const CLI_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
 const LEGACY_FIXTURE = path.join(CLI_ROOT, 'test', 'fixtures', 'manifest', 'legacy-install-manifest-0.10.0.json');
@@ -80,6 +82,7 @@ describe('Scenario 16 — legacy-snapshot upgrade end to end (R3 payload)', () =
     );
 
     assert.ok(!fs.existsSync(path.join(dir, '.codex')), 'upgrading a legacy snapshot must never create .codex');
+    assert.ok(!fs.existsSync(path.join(dir, '.agents')), 'upgrading a legacy snapshot must never create .agents');
     assert.ok(!fs.existsSync(path.join(dir, '.copilot-fake')), 'upgrading a legacy snapshot must never create .copilot-fake');
     const snapshot = JSON.parse(fs.readFileSync(path.join(dir, '.cleargate', '.install-manifest.json'), 'utf8')) as ManifestFile;
     assert.ok(!('hosts' in snapshot), 'a legacy snapshot must stay legacy after upgrade');
@@ -127,7 +130,10 @@ describe('Scenario 17 — uninstall --host codex preserves the other two hosts b
 describe('Scenario 18 — E2E: R2 init hosts=[all], doctor --check-scaffold reports every owner clean and exits 0', () => {
   test('init with hosts=[all] under R2, then doctor --check-scaffold prints core/claude/codex all-clean lines and exits 0', async () => {
     const payloadDir = await getP2();
-    const { registry } = makeR2();
+    // TPV re-seal R9: the shared fake codex's install() rewrites its own manifest-tracked .codex/hooks.json after
+    // the copy, which reads as user-modified; this E2E uses a codex whose install() is a no-op.
+    const quietCodex = { ...makeFakeCodex().adapter, install: async (): Promise<void> => {} };
+    const registry = createHostRegistry([claudeAdapter, quietCodex]);
     const record = await runInitScenario('fresh', {
       payloadDir,
       extra: { hostRegistry: registry, hosts: ['all'], readInstallManifest: undefined },
@@ -136,7 +142,7 @@ describe('Scenario 18 — E2E: R2 init hosts=[all], doctor --check-scaffold repo
     const out: string[] = [];
     const { exit, codes } = makeExitCapture();
     await doctorHandler(
-      { checkScaffold: true } as DoctorFlags,
+      { checkScaffold: true, verbose: true } as DoctorFlags,
       {
         cwd: record.dir,
         packageRoot: payloadDir,
@@ -149,16 +155,27 @@ describe('Scenario 18 — E2E: R2 init hosts=[all], doctor --check-scaffold repo
 
     const ownerLines = out.filter((l) => /^ {2}\w+:/.test(l));
     assert.deepStrictEqual(
-      new Set(ownerLines.map((l) => l.trim().split(':')[0])),
-      new Set(['core', 'claude', 'codex']),
+      ownerLines.map((l) => l.trim().split(':')[0]),
+      ['core', 'claude', 'codex'],
       `expected core/claude/codex owner lines, got: ${JSON.stringify(out)}`,
     );
-    for (const line of ownerLines) {
+    for (const line of ownerLines.slice(1)) {
       assert.ok(
-        /0 user-modified, 0 upstream-changed, 0 both-changed, \d+ clean$/.test(line),
-        `expected an all-clean owner line, got: ${line}`,
+        /: 0 user-modified, 0 upstream-changed, 0 both-changed, [1-9]\d* clean$/.test(line),
+        `expected an all-clean adapter line, got: ${line}`,
       );
     }
+    // The one pre-existing fresh-install drift (flashcard 2026-09-25 #doctor #drift): init's test-stack
+    // rewrite of gate-checks.json reads upstream-changed. It is core's, and nothing else may drift.
+    assert.ok(/^ {2}core: 0 user-modified, [01] upstream-changed, 0 both-changed, [1-9]\d* clean$/.test(ownerLines[0]!), ownerLines[0]);
+    const detail = out.filter((l) => /^ {2}\S+ {2}(user-modified|upstream-changed|both-changed) {2}/.test(l));
+    assert.ok(
+      detail.every((l) => l.startsWith('  .cleargate/scripts/gate-checks.json  upstream-changed  ')),
+      `unexpected drift: ${JSON.stringify(detail)}`,
+    );
+    const sum = (re: RegExp, lines: string[]): number => lines.reduce((n, l) => n + Number(re.exec(l)?.[1] ?? 0), 0);
+    const top = out.find((l) => l.startsWith('Scaffold drift: '))!;
+    assert.equal(sum(/(\d+) clean$/, [top]), sum(/(\d+) clean$/, ownerLines), 'the top line counts exactly the owners\' entries');
     assert.deepStrictEqual(codes, [0], `expected exit 0, stdout=${JSON.stringify(out)}`);
 
     const snapshot = readSnapshot(record.dir);
diff --git a/test/commands/uninstall-per-host.red.node.test.ts b/test/commands/uninstall-per-host.red.node.test.ts
index 383dc77..c4056ce 100644
--- a/test/commands/uninstall-per-host.red.node.test.ts
+++ b/test/commands/uninstall-per-host.red.node.test.ts
@@ -26,13 +26,14 @@ import assert from 'node:assert/strict';
 import * as fs from 'node:fs';
 import * as path from 'node:path';
 import { pathToFileURL } from 'node:url';
-import { uninstallHandler, type UninstallOptions } from '../../src/commands/uninstall.js';
+import { uninstallHandler, shouldPreserve, type UninstallOptions } from '../../src/commands/uninstall.js';
 import { createHostRegistry } from '../../src/hosts/registry.js';
 import { claudeAdapter, CLAUDE_HOOK_ADDITION } from '../../src/hosts/claude.js';
 import { installedHosts } from '../../src/lib/manifest.js';
 import { runInitScenario, ExitSignal, seedUserContentFixture } from '../helpers/init-fixture.js';
 import { canonicalPath } from '../helpers/scaffold-roots.js';
-import { getP2, getP3, makeR2, makeR3, readSnapshot, mkTmp } from '../helpers/host-fixtures.js';
+import { getP2, getP3, makeR2, makeR3, readSnapshot, mkTmp, listTree, makeFakeCodex } from '../helpers/host-fixtures.js';
+import type { ManifestEntry } from '../../src/lib/manifest.js';
 import type { HostAdapter, RemoveCtx, RemoveReport } from '../../src/hosts/types.js';
 import type { SettingsJson } from '../../src/init/merge-settings.js';
 
@@ -182,16 +183,22 @@ describe('Scenario 12 — full uninstall routes through adapter.remove()', () =>
 // ── Scenario 13 ──────────────────────────────────────────────────────────────
 
 describe('Scenario 13 — --host <last installed host> behaves like a full uninstall', () => {
-  test('uninstall --host claude on a claude-only install routes through claudeAdapter.remove() (the same gap as scenario 12) and writes the marker', async () => {
+  test('uninstall --host claude on a claude-only install routes through claudeAdapter.remove(), writes the marker, and leaves the same tree as no --host', async () => {
     const payloadDir = await getP2();
     const removeSpy = mock.fn(claudeAdapter.remove);
     const spyClaudeAdapter: HostAdapter = { ...claudeAdapter, remove: removeSpy as unknown as HostAdapter['remove'] };
     const registry = createHostRegistry([spyClaudeAdapter]);
+    const plainRegistry = createHostRegistry([claudeAdapter]);
+    const frozenNow = (): Date => new Date('2026-01-01T00:00:00.000Z');
 
     const record = await runInitScenario('fresh', {
       payloadDir,
       extra: { hostRegistry: registry, hosts: ['claude'], readInstallManifest: undefined },
     });
+    const twin = await runInitScenario('fresh', {
+      payloadDir,
+      extra: { hostRegistry: plainRegistry, hosts: ['claude'], readInstallManifest: undefined },
+    });
 
     const out: string[] = [];
     const { exit } = makeExitCapture();
@@ -199,14 +206,26 @@ describe('Scenario 13 — --host <last installed host> behaves like a full unins
       cwd: record.dir,
       host: 'claude',
       yes: true,
+      now: frozenNow,
       stdout: (s: string) => out.push(s),
       stderr: () => {},
       exit,
       hostRegistry: registry,
     } as UninstallOptions & { host: string; hostRegistry: unknown });
+    await uninstallHandler({
+      cwd: twin.dir,
+      yes: true,
+      now: frozenNow,
+      stdout: () => {},
+      stderr: () => {},
+      exit: makeExitCapture().exit,
+      hostRegistry: plainRegistry,
+    } as UninstallOptions & { hostRegistry: unknown });
 
     assert.equal(removeSpy.mock.calls.length, 1, 'expected --host claude (the only installed host) to route through claudeAdapter.remove(), exactly like no --host at all');
     assert.ok(fs.existsSync(path.join(record.dir, '.cleargate', '.uninstalled')), 'a full uninstall (even via --host <last host>) must write the .uninstalled marker');
+    // TPV ruling on QA-Red ambiguity #2: "the same removed set" — the whole post-uninstall tree (marker included) equals the no---host twin's.
+    assert.deepStrictEqual(listTree(record.dir), listTree(twin.dir));
   });
 });
 
@@ -239,7 +258,27 @@ describe('Scenario 14 — census guard: every canonical settings.json command sa
 // ── Scenario 15 — BUG-089 carry-forward 2 ───────────────────────────────────
 
 describe('Scenario 15 — BUG-089 carry-forward 2: supersedeHookCommands', () => {
-  test('replaces a stale ClearGate command in the SAME matcher, keeps user commands, never touches other matchers, never mutates its input', async () => {
+  // TPV re-seal R6: the other-matcher seed shares the FIRST TOKEN (full ClearGate path), so a matcher-crossing
+  // supersede would drop it; supersedeHookCommands only DROPS — the `--host claude` form is added by mergeSettings (15c).
+  const SEED: SettingsJson = {
+    hooks: {
+      PreToolUse: [
+        {
+          matcher: 'Edit|Write',
+          hooks: [
+            { type: 'command', command: '${CLAUDE_PROJECT_DIR}/.claude/hooks/pre-edit-gate.sh' },
+            { type: 'command', command: 'my-own.sh' },
+          ],
+        },
+        {
+          matcher: 'Bash',
+          hooks: [{ type: 'command', command: '${CLAUDE_PROJECT_DIR}/.claude/hooks/pre-edit-gate.sh --custom' }],
+        },
+      ],
+    },
+  };
+
+  test('drops a stale ClearGate variant in the SAME matcher only, keeps user commands, never mutates its input', async () => {
     const mod = (await import(
       pathToFileURL(path.join(CLI_ROOT, 'src', 'init', 'merge-settings.ts')).href
     )) as unknown as {
@@ -247,23 +286,7 @@ describe('Scenario 15 — BUG-089 carry-forward 2: supersedeHookCommands', () =>
     };
     assert.ok(typeof mod.supersedeHookCommands === 'function', 'supersedeHookCommands must be exported from merge-settings.ts');
 
-    const existing: SettingsJson = {
-      hooks: {
-        PreToolUse: [
-          {
-            matcher: 'Edit|Write',
-            hooks: [
-              { type: 'command', command: '${CLAUDE_PROJECT_DIR}/.claude/hooks/pre-edit-gate.sh' },
-              { type: 'command', command: 'my-own.sh' },
-            ],
-          },
-          {
-            matcher: 'Bash',
-            hooks: [{ type: 'command', command: 'pre-edit-gate.sh --custom' }],
-          },
-        ],
-      },
-    };
+    const existing = JSON.parse(JSON.stringify(SEED)) as SettingsJson;
     const existingSnapshot = JSON.parse(JSON.stringify(existing)) as SettingsJson;
 
     const result = mod.supersedeHookCommands!(existing, CLAUDE_HOOK_ADDITION);
@@ -272,18 +295,53 @@ describe('Scenario 15 — BUG-089 carry-forward 2: supersedeHookCommands', () =>
     const preToolUse = (result!.hooks ?? {})['PreToolUse'] ?? [];
     const editWrite = preToolUse.find((e) => e.matcher === 'Edit|Write');
     assert.ok(editWrite, 'expected the Edit|Write matcher to survive');
-    const preEditGateCommands = (editWrite!.hooks ?? []).filter((h) => h.command.includes('pre-edit-gate.sh'));
-    assert.equal(preEditGateCommands.length, 1, `expected exactly one pre-edit-gate command, got: ${JSON.stringify(preEditGateCommands)}`);
-    assert.equal(preEditGateCommands[0]!.command, '${CLAUDE_PROJECT_DIR}/.claude/hooks/pre-edit-gate.sh --host claude');
-    assert.ok((editWrite!.hooks ?? []).some((h) => h.command === 'my-own.sh'), 'the user command my-own.sh must survive');
+    assert.deepStrictEqual(editWrite!.hooks, [{ type: 'command', command: 'my-own.sh' }], 'the stale pre-edit-gate variant is dropped; the user command survives');
 
     const bash = preToolUse.find((e) => e.matcher === 'Bash');
     assert.ok(bash, 'expected the Bash matcher to survive untouched');
-    assert.deepStrictEqual(bash!.hooks, [{ type: 'command', command: 'pre-edit-gate.sh --custom' }], 'a DIFFERENT matcher\'s command must never be touched, even though its command string also contains "pre-edit-gate.sh"');
+    assert.deepStrictEqual(bash!.hooks, [{ type: 'command', command: '${CLAUDE_PROJECT_DIR}/.claude/hooks/pre-edit-gate.sh --custom' }], 'a DIFFERENT matcher is never touched, even when its command shares the first token');
 
     assert.deepStrictEqual(existing, existingSnapshot, 'supersedeHookCommands must never mutate its `existing` argument');
   });
 
+  test('a same-first-token command that is NOT a ClearGate command survives', async () => {
+    const mod = (await import(
+      pathToFileURL(path.join(CLI_ROOT, 'src', 'init', 'merge-settings.ts')).href
+    )) as unknown as {
+      supersedeHookCommands?: (existing: SettingsJson | null, addition: SettingsJson) => SettingsJson | null;
+    };
+    assert.ok(typeof mod.supersedeHookCommands === 'function', 'supersedeHookCommands must be exported from merge-settings.ts');
+    const existing: SettingsJson = { hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'my-lint.sh --old' }] }] } };
+    const addition: SettingsJson = { hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'my-lint.sh --new' }] }] } };
+    const result = mod.supersedeHookCommands!(existing, addition);
+    assert.deepStrictEqual(result, existing);
+  });
+
+  test('a non-force Claude install supersedes the stale pre-edit-gate variant (BUG-089 carry-forward 2)', async () => {
+    const dir = mkTmp('cg-s41-07-supersede-install-');
+    fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
+    fs.writeFileSync(path.join(dir, '.claude', 'settings.json'), JSON.stringify(SEED, null, 2) + '\n');
+    await claudeAdapter.install({
+      cwd: dir,
+      payloadDir: await getP2(),
+      pinVersion: '0.0.0-m3',
+      force: false,
+      stdout: () => {},
+      stderr: () => {},
+    });
+    const after = JSON.parse(fs.readFileSync(path.join(dir, '.claude', 'settings.json'), 'utf8')) as SettingsJson;
+    const preToolUse = (after.hooks ?? {})['PreToolUse'] ?? [];
+    const editWrite = preToolUse.find((e) => e.matcher === 'Edit|Write');
+    assert.ok(editWrite, 'expected the Edit|Write matcher');
+    assert.deepStrictEqual(
+      (editWrite!.hooks ?? []).filter((h) => h.command.includes('pre-edit-gate.sh')).map((h) => h.command),
+      ['${CLAUDE_PROJECT_DIR}/.claude/hooks/pre-edit-gate.sh --host claude'],
+    );
+    assert.ok((editWrite!.hooks ?? []).some((h) => h.command === 'my-own.sh'), 'my-own.sh must survive');
+    const bash = preToolUse.find((e) => e.matcher === 'Bash');
+    assert.deepStrictEqual(bash!.hooks, [{ type: 'command', command: '${CLAUDE_PROJECT_DIR}/.claude/hooks/pre-edit-gate.sh --custom' }]);
+  });
+
   test('null existing returns null', async () => {
     const mod = (await import(
       pathToFileURL(path.join(CLI_ROOT, 'src', 'init', 'merge-settings.ts')).href
@@ -294,3 +352,136 @@ describe('Scenario 15 — BUG-089 carry-forward 2: supersedeHookCommands', () =>
     assert.strictEqual(mod.supersedeHookCommands!(null, CLAUDE_HOOK_ADDITION), null);
   });
 });
+
+// ── TPV re-seal R7 — M3-A31/M3-A32 partial-path tests (11b-11f) and full-path tests (12c-12d) ──
+
+async function installR3All(): Promise<{ dir: string; registry: ReturnType<typeof makeR3>['registry'] }> {
+  const payloadDir = await getP3();
+  const { registry } = makeR3();
+  const record = await runInitScenario('fresh', {
+    payloadDir,
+    extra: { hostRegistry: registry, hosts: ['all'], readInstallManifest: undefined },
+  });
+  return { dir: record.dir, registry };
+}
+
+describe('TPV R7 — uninstall --host partial path (M3-A31, M3-A32)', () => {
+  test('11b — adapter.remove line output reaches uninstall\'s line sinks exactly once, never double-spaced', async () => {
+    const { dir, registry } = await installR3All();
+    const errs: string[] = [];
+    await uninstallHandler({
+      cwd: dir, host: 'copilot', yes: true, stdout: () => {}, stderr: (s: string) => errs.push(s), exit: makeExitCapture().exit, hostRegistry: registry,
+    } as UninstallOptions & { host: string; hostRegistry: unknown });
+    assert.equal(errs.filter((l) => l === 'x').length, 1, `expected the fake copilot remove() line exactly once: ${JSON.stringify(errs)}`);
+    assert.ok(!errs.some((l) => l === '' || l.endsWith('\n')), `no empty or newline-terminated line: ${JSON.stringify(errs)}`);
+  });
+
+  test('11c — --remove on a partial uninstall exits 2 before any write', async () => {
+    const { dir, registry } = await installR3All();
+    const before = listTree(dir);
+    const errs: string[] = [];
+    const { exit, codes } = makeExitCapture();
+    await uninstallHandler({
+      cwd: dir, host: 'copilot', remove: ['all'], yes: true, stdout: () => {}, stderr: (s: string) => errs.push(s), exit, hostRegistry: registry,
+    } as UninstallOptions & { host: string; hostRegistry: unknown });
+    assert.deepStrictEqual(codes, [2]);
+    assert.ok(errs.includes('cleargate uninstall: --preserve/--remove apply only to a full uninstall'), JSON.stringify(errs));
+    assert.deepStrictEqual(listTree(dir), before);
+  });
+
+  test('11d — --host copilot --dry-run prints the plan\'s [remove]/[keep]/[skip] buckets and writes nothing', async () => {
+    const { dir, registry } = await installR3All();
+    const snapPath = path.join(dir, '.cleargate', '.install-manifest.json');
+    const snap = JSON.parse(fs.readFileSync(snapPath, 'utf8')) as { files: ManifestEntry[] };
+    snap.files.push({ path: '.copilot-fake/gone.md', sha256: null, tier: 'agent', overwrite_policy: 'always', preserve_on_uninstall: false, owner: 'copilot' });
+    fs.writeFileSync(snapPath, JSON.stringify(snap, null, 2) + '\n');
+    const before = listTree(dir);
+    const out: string[] = [];
+    const { exit, codes } = makeExitCapture();
+    await uninstallHandler({
+      cwd: dir, host: 'copilot', dryRun: true, stdout: (s: string) => out.push(s), stderr: () => {}, exit, hostRegistry: registry,
+    } as UninstallOptions & { host: string; hostRegistry: unknown });
+    assert.deepStrictEqual(codes, [0]);
+    assert.ok(out.includes("Will remove 1 files, keep 1 files of host copilot, and strip copilot's ClearGate config entries."), JSON.stringify(out));
+    assert.deepStrictEqual(out.filter((l) => /^ {2}\[(remove|keep|skip)\]/.test(l)), [
+      '  [remove] .copilot-fake/x.md',
+      '  [keep]   .copilot-fake/sticky.md',
+      '  [skip]   .copilot-fake/gone.md',
+    ]);
+    assert.ok(out.includes('[dry-run] No files changed.'));
+    assert.deepStrictEqual(listTree(dir), before);
+  });
+
+  test('11e — an unknown --host and a registered-but-not-installed --host both exit 2 and write nothing', async () => {
+    const payloadDir = await getP3();
+    const { registry } = makeR3();
+    const record = await runInitScenario('fresh', {
+      payloadDir,
+      extra: { hostRegistry: registry, hosts: ['claude', 'codex'], readInstallManifest: undefined },
+    });
+    const before = listTree(record.dir);
+    for (const host of ['nope', 'copilot']) {
+      const errs: string[] = [];
+      const { exit, codes } = makeExitCapture();
+      await uninstallHandler({
+        cwd: record.dir, host, yes: true, stdout: () => {}, stderr: (s: string) => errs.push(s), exit, hostRegistry: registry,
+      } as UninstallOptions & { host: string; hostRegistry: unknown });
+      assert.deepStrictEqual(codes, [2], `--host ${host}`);
+      assert.ok(errs.some((l) => l.startsWith('cleargate uninstall: ')), `--host ${host}: ${JSON.stringify(errs)}`);
+    }
+    assert.deepStrictEqual(listTree(record.dir), before);
+  });
+
+  test('11f — the dirty-tree gate covers exactly the entries this removal drops', async () => {
+    const gitReporting = (dirty: string) => (args: string[]) =>
+      args.includes('rev-parse') ? { stdout: 'true\n', code: 0 } : { stdout: ` M ${dirty}\n`, code: 0 };
+
+    const a = await installR3All();
+    const beforeA = listTree(a.dir);
+    const exitA = makeExitCapture();
+    await uninstallHandler({
+      cwd: a.dir, host: 'copilot', yes: true, git: gitReporting('.copilot-fake/x.md'), stdout: () => {}, stderr: () => {}, exit: exitA.exit, hostRegistry: a.registry,
+    } as UninstallOptions & { host: string; hostRegistry: unknown });
+    assert.deepStrictEqual(exitA.codes, [1], 'an uncommitted change to a file this removal drops refuses');
+    assert.deepStrictEqual(listTree(a.dir), beforeA);
+
+    const b = await installR3All();
+    const exitB = makeExitCapture();
+    await uninstallHandler({
+      cwd: b.dir, host: 'copilot', yes: true, git: gitReporting('.claude/settings.json'), stdout: () => {}, stderr: () => {}, exit: exitB.exit, hostRegistry: b.registry,
+    } as UninstallOptions & { host: string; hostRegistry: unknown });
+    assert.ok(!exitB.codes.includes(1), 'an uncommitted change to another host\'s file never blocks removing copilot');
+    assert.ok(!fs.existsSync(path.join(b.dir, '.copilot-fake', 'x.md')));
+  });
+});
+
+describe('TPV R7 — full uninstall (blueprint (a) and (d))', () => {
+  test('12c — shouldPreserve rule 3.5: preserve_on_uninstall preserves a framework-tier entry; --remove still wins', () => {
+    const e: ManifestEntry = { path: '.copilot-fake/sticky.md', sha256: null, tier: 'agent', overwrite_policy: 'always', preserve_on_uninstall: true };
+    assert.equal(shouldPreserve(e, new Set(), new Set()), true);
+    assert.equal(shouldPreserve(e, new Set(), new Set(['agent'])), false);
+    assert.equal(shouldPreserve({ ...e, preserve_on_uninstall: false }, new Set(), new Set()), false);
+  });
+
+  test('12d — codex-only install: no CLAUDE.md marker pre-validation, only the installed adapter\'s remove() runs', async () => {
+    const payloadDir = await getP2();
+    const fakeCodex = makeFakeCodex();
+    const claudeRemove = mock.fn(claudeAdapter.remove);
+    const registry = createHostRegistry([{ ...claudeAdapter, remove: claudeRemove as unknown as HostAdapter['remove'] }, fakeCodex.adapter]);
+    const record = await runInitScenario('fresh', {
+      payloadDir,
+      extra: { hostRegistry: registry, hosts: ['codex'], readInstallManifest: undefined },
+    });
+    const userClaudeMd = '# my own notes — no ClearGate markers\n';
+    fs.writeFileSync(path.join(record.dir, 'CLAUDE.md'), userClaudeMd);
+    const { exit, codes } = makeExitCapture();
+    await uninstallHandler({
+      cwd: record.dir, yes: true, stdout: () => {}, stderr: () => {}, exit, hostRegistry: registry,
+    } as UninstallOptions & { hostRegistry: unknown });
+    assert.ok(!codes.includes(1), `must not refuse over a marker-less CLAUDE.md when claude is not installed: ${JSON.stringify(codes)}`);
+    assert.equal(fs.readFileSync(path.join(record.dir, 'CLAUDE.md'), 'utf8'), userClaudeMd);
+    assert.ok(fs.existsSync(path.join(record.dir, '.cleargate', '.uninstalled')));
+    assert.equal(fakeCodex.remove.mock.calls.length, 1);
+    assert.equal(claudeRemove.mock.calls.length, 0);
+  });
+});
diff --git a/test/commands/upgrade-per-host.red.node.test.ts b/test/commands/upgrade-per-host.red.node.test.ts
index eb5ac16..bfe8118 100644
--- a/test/commands/upgrade-per-host.red.node.test.ts
+++ b/test/commands/upgrade-per-host.red.node.test.ts
@@ -74,7 +74,9 @@ describe('Scenario 6 — Gherkin 2: upgrade never implicitly adds a host', () =>
 
     assert.ok(!fs.existsSync(path.join(dir, '.codex')), '.codex must never be created on a claude-only upgrade');
     assert.ok(!fs.existsSync(path.join(dir, '.copilot-fake')), '.copilot-fake must never be created on a claude-only upgrade');
-    assert.ok(fs.existsSync(path.join(dir, 'CLAUDE.md')), 'sanity: core/claude entries must still be processed');
+    assert.ok(!fs.existsSync(path.join(dir, '.agents')), '.agents (a shared root only codex/copilot declare) must never be created on a claude-only upgrade');
+    // TPV re-seal R1: CLAUDE.md is INTENTIONALLY_UNTRACKED (never a manifest entry), so upgrade never creates it — sanity-check a core entry instead.
+    assert.ok(fs.existsSync(path.join(dir, '.cleargate', 'knowledge', 'cleargate-protocol.md')), 'sanity: core entries must still be processed');
     assert.ok(fs.existsSync(path.join(dir, '.claude', 'settings.json')), 'sanity: the claude-owned settings.json must still be processed');
   });
 });
@@ -288,6 +290,23 @@ describe('Scenario 10 — restart warning is named per declaring adapter', () =>
     const { registry } = makeR2();
     fs.mkdirSync(path.join(dir, '.codex'), { recursive: true });
     fs.writeFileSync(path.join(dir, '.codex', 'hooks.json'), JSON.stringify({ entries: ['stale'] }, null, 2) + '\n');
+    // TPV re-seal R2: codex must be INSTALLED for its restart warning — a dir with no snapshot reads as the legacy ['claude'].
+    fs.mkdirSync(path.join(dir, '.cleargate'), { recursive: true });
+    fs.writeFileSync(
+      path.join(dir, '.cleargate', '.install-manifest.json'),
+      JSON.stringify(
+        {
+          cleargate_version: '0.0.0-upgrade-fixture',
+          generated_at: '2026-01-01T00:00:00.000Z',
+          files: [],
+          installed_at: '2026-01-01T00:00:00.000Z',
+          pin_version: '0.0.0-upgrade-fixture',
+          hosts: ['claude', 'codex'],
+        },
+        null,
+        2,
+      ) + '\n',
+    );
 
     const out: string[] = [];
     await upgradeHandler(
@@ -302,9 +321,17 @@ describe('Scenario 10 — restart warning is named per declaring adapter', () =>
       } as UpgradeCliOptions & { hostRegistry: unknown },
     );
 
-    assert.ok(
-      out.some((l) => l.includes('Restart Fake Codex in this repo to load the new')),
-      `expected a Fake-Codex-named restart warning: ${JSON.stringify(out)}`,
+    assert.deepStrictEqual(
+      out.slice(-6),
+      [
+        '',
+        '⚠ Restart Claude Code in this repo to load the new config:',
+        '    .claude/settings.json (loaded once at session start)',
+        '',
+        '⚠ Restart Fake Codex in this repo to load the new config:',
+        '    .codex/hooks.json (loaded once at session start)',
+      ],
+      `expected one restart block per declaring adapter, in registry order: ${JSON.stringify(out)}`,
     );
 
     // Phase 2 (non-regression anchor — already true today, kept so this
diff --git a/test/hosts/host-adapter-contract.red.node.test.ts b/test/hosts/host-adapter-contract.red.node.test.ts
index 144c033..79604a2 100644
--- a/test/hosts/host-adapter-contract.red.node.test.ts
+++ b/test/hosts/host-adapter-contract.red.node.test.ts
@@ -277,8 +277,15 @@ async function runInstallDelegationCheck(kind: 'bare' | 'user-content'): Promise
   // against the pre-install snapshot — proves the adapter reimplements nothing.
   const expectedBlock = extractBlock(payloadClaudeMd);
   const expectedClaudeMd = injectClaudeMd(beforeClaudeMd, expectedBlock);
+  // STORY-058-07 contract change (TPV re-seal R10): install() supersedes stale ClearGate variants before the merge.
+  const superseded =
+    beforeSettings === null
+      ? null
+      : ((await import('../../src/init/merge-settings.js')) as unknown as {
+          supersedeHookCommands: (e: unknown, a: unknown) => unknown;
+        }).supersedeHookCommands(beforeSettings, CLAUDE_HOOK_ADDITION);
   const expectedSettings = mergeSettings(
-    beforeSettings as Parameters<typeof mergeSettings>[0],
+    superseded as Parameters<typeof mergeSettings>[0],
     CLAUDE_HOOK_ADDITION as Parameters<typeof mergeSettings>[1],
   );
   const expectedSettingsContent = JSON.stringify(expectedSettings, null, 2) + '\n';
```

## Expected counts after re-seal (the orchestrator's acceptance check)

**At the re-seal commit (`23e8280` + R1–R10, sealed src, each file solo):**

| File | Tests | Pass | Fail | Named green |
|---|---|---|---|---|
| `test/hosts/manifest-query.red.node.test.ts` | 6 | 0 | 6 | — |
| `test/commands/doctor-per-host.red.node.test.ts` | 10 | 0 | 10 | — |
| `test/commands/upgrade-per-host.red.node.test.ts` | 6 | 0 | 6 | — |
| `test/commands/uninstall-per-host.red.node.test.ts` | 16 | 1 | 15 | "a CLAUDE.md without the START marker still exits 1 before any write" (unchanged anchor) |
| `test/commands/lifecycle-per-host.red.integration.node.test.ts` | 3 | 0 | 3 | — |
| `test/hosts/host-adapter-contract.red.node.test.ts` (sealed -03, R10) | 19 | 18 | 1 | red: "on a user-content fixture" |

Other checks at the re-seal commit:
- **Parity** (compare mode): `claude-adapter-init-parity` 4/5 (scenario 12 `user-content` red); `init-host-parity` 12/15 (scenario 14 `user-content` ×3 red).
- **The other 7 sealed files:** 11, 10, 4, 18, 13, 17 and 3, all green.
- **Every regression witness above:** unchanged.

**After a conformant Dev commit (measured on the simulation):** 6/6, 10/10, 6/6, 16/16, 3/3, contract 19/19, parity 5/5 and 15/15. The 7 other sealed files stay green, every witness is unchanged, and `npm run typecheck` is clean. The recorded `user-content` settings.json hash is `123d7bc742e7c7fadab80e2949db5cbe8b140884178ac74fc4cab47ad81109c7`.

No second TPV round is needed if these counts reproduce.

## Plan amendments

`plans/M3.md` now ends with the appended section `### Amendments from TPV (STORY-058-07, 2026-09-26)`, which holds M3-A36..M3-A43:
- **M3-A36:** ruling #1
- **M3-A37:** ruling #2
- **M3-A38:** the `CLEARGATE_START` constant
- **M3-A39:** the sealed -03 Scenario 7 contract change
- **M3-A40:** fixture facts
- **M3-A41:** the omitted and added tests
- **M3-A42:** upgrade output placement
- **M3-A43:** re-seal and counts

It was appended before this report was written. Nothing earlier in the file was touched.

## Outer `git status --porcelain`

At the start of this dispatch:
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
?? .cleargate/sprint-runs/SPRINT-41/.pending-task-1857-61583-932.json
```

At the end, after the scratch-clone deletion and before this report was written:
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/plans/M3.md
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```
Notes on the end state:
- `plans/M3.md` is this dispatch's append-only amendment. This report (`reports/STORY-058-07-tpv.md`, `??`) is the only other path the dispatch writes.
- The `.pending-task-*` sentinel churn is the hook's own.
- The cli main checkout is still `story/STORY-058-07` @ `23e8280`, status `?? cleargate-0.25.0.tgz` only (pre-existing).
- `/private/tmp` still holds many `cg-s41-*` mkdtemp fixture directories. They come from test helpers that never clean up, a pre-existing pattern from this and earlier dispatches, and I left them in place.

## Script incidents

None. No `.cleargate/scripts/*` script was invoked. The executions were:
- `npm run test:file`, `typecheck`, `prebuild` and `build` inside the scratch clone
- `git` and `shasum` probes
- two non-writing `tsx src/cli.ts` wiring smokes in a literal tmp dir

The version check does not apply, because no dependency is added or pinned.

flashcards_flagged:
  - "2026-09-26 · #test-harness #upgrade #tpv · upgrade never creates CLAUDE.md (untracked); a snapshot-less dir is claude-only — seed hosts for multi-host reds."
  - "2026-09-26 · #settings-json #test-harness · supersedeHookCommands only drops; the new command comes from mergeSettings. A cross-matcher seed must share token 1."
  - "2026-09-26 · #doctor #host · doctor --host narrows at emit only; a narrowed .drift-state.json makes the next cache replay report one host."
  - "2026-09-26 · #test-harness #tpv #qa-red · -07 QA-Red omitted 3 binding plan tests (M3-A31/A32 11b-d); TPV diffs the plan's named tests, not just the scenarios."
  - "2026-09-26 · #host #tpv · Code moved into claude.ts must not carry a CLEARGATE:START literal (sealed -03 grep); build it from CLEARGATE_START."

## TPV delta round — R11 (M3-A44)

role: architect · 2026-09-26 · This round covers only the R11 delta. Every section above stays in force.

TPV-R11: APPROVED

### Subject and setup

- **Subject:** cli `story/STORY-058-07` @ `4394c9b`, the QA-Red R11 commit on Dev `b146faf`.
  - It adds one file, `test/commands/uninstall-reinit.red.node.test.ts` (4 tests).
  - `git show --stat 4394c9b` lists only that file (+267 lines); `src/` is untouched.
- **Scratch clone:** `/private/tmp/cg-s41-tpv-058-07b/cleargate-cli` at `4394c9b`.
  - `node_modules` is symlinked.
  - The parent meta-root holds `git archive` copies of the outer `HEAD`'s `.cleargate/`, `cleargate-planning/` and `CLAUDE.md`.
  - `npm run prebuild` ran in the clone. `npm run build` also ran there, only to feed changelog-format's tarball scenario and the dist smoke below.
  - The clone was deleted with a literal `rm -rf -- /private/tmp/cg-s41-tpv-058-07b`.
- **What was not touched:** the main cli checkout (still `story/STORY-058-07` @ `4394c9b`, status `?? cleargate-0.25.0.tgz` only) and the outer repo. Nothing was edited, built or checked out in either.
- **Test runs:** every file ran solo with `npm run test:file`, with `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline` set on every run. That is compare mode only; no capture flag was ever set.
- **Baseline integrity** (`find … -type f -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256`):
  - before: `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` (425 files)
  - after: `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` (425 files), unchanged

### Wiring (TPV checks 1–5)

1. **Imports: all resolve at `4394c9b`.**
   - `test/helpers/init-fixture.ts`: `FROZEN_NOW` :35, `FIXED_PIN` :36, `ExitSignal` :43, `runInitScenario` :278
   - `test/helpers/scaffold-roots.ts`: `canonicalPath` :36, `composeCanonicalPayload` :54
   - `test/helpers/host-fixtures.ts`: `getP2` :217, `makeR2` :228
   - `src/commands/uninstall.ts`: `UninstallOptions` :50, `UninstalledMarker` :75, `uninstallHandler` :293
   - `src/commands/host.ts`: `HostCommandOptions` :25, `hostAddHandler` :133, `hostRemoveHandler` :162
   - `createClaudeAdapter`, `initHandler` and `InitOptions`
2. **Signatures match.**
   - Every `uninstallHandler` option the test passes is a declared `UninstallOptions` field: `cwd`, `yes`, `force`, `now: () => Date`, `stdout`, `stderr` and `exit`.
   - `hostRemoveHandler` and `hostAddHandler` take `(name, HostCommandOptions)`, and `hostRegistry` and `payloadDir` are both declared seams.
   - `createClaudeAdapter().remove()` takes a `RemoveCtx`.
   - `runInitScenario(id, { payloadDir, extra })` matches.
   - `npm run typecheck` exits 0 on `4394c9b` plus D1–D3.
3. The file makes no `t.mock` call.
4. **No orphan state.**
   - The file sets no environment variable or global. `CLEARGATE_REPO_ROOT` is set and restored inside `runInitScenario`, and nothing in `src/` reads it.
   - The mkdtemp directories are left behind. That is the helper's existing pattern, the same as `mkShortTmpDir` in `runInitScenario`.
   - R11b passes `promptYesNo: async () => true`, which answers the `.uninstalled` restore prompt at `init.ts:356-357`, so no test waits on stdin.
5. **Naming:** `*.red.node.test.ts` ✓.

R11b's `invokeInit` body is identical to `init-fixture.ts:180-211`, apart from the two renamed stub constants.

### Simulation (D1–D3 exactly as M3-A44 specifies)

- **D1:** the M3-A44 code block, verbatim, inside the existing `try` of `claude.ts` `remove()`, plus the updated `// Surgery: settings.json` comment. There is no other `claude.ts` change.
- **D2:** the single line at `merge-settings.ts:92`, re-indented to 8 spaces. Afterwards, `git diff 170ac4c -- src/init/merge-settings.ts` shows **55 insertions, 0 deletions**: the import plus `supersedeHookCommands`.
- **D3:** both CHANGELOG blocks, verbatim. `### Added` sits above `### Fixed`, and the two bullets follow the BUG-067 bullet.
- **Diff stat against `4394c9b`:**
  - `CHANGELOG.md`: +16
  - `src/hosts/claude.ts`: +10 / −3
  - `src/init/merge-settings.ts`: +1 / −1

### Red → green table

The "Sealed src" column runs `4394c9b`'s own `claude.ts`, which is `b146faf`'s. D2 and D3 are applied in that run too, but they have no runtime effect.

| File | Sealed src | After D1–D3 | Expected |
|---|---|---|---|
| `test/commands/uninstall-reinit.red.node.test.ts` (new) | **0/4**: R11a, R11b, R11c and R11d all red | **4/4** | 4/4 ✓ |
| `test/hosts/manifest-query.red.node.test.ts` | 6/6 | 6/6 | 6 ✓ |
| `test/commands/doctor-per-host.red.node.test.ts` | 10/10 | 10/10 | 10 ✓ |
| `test/commands/upgrade-per-host.red.node.test.ts` | 6/6 | 6/6 | 6 ✓ |
| `test/commands/uninstall-per-host.red.node.test.ts` | 16/16 | 16/16 | 16 ✓ |
| `test/commands/lifecycle-per-host.red.integration.node.test.ts` | 3/3 | 3/3 | 3 ✓ |
| `test/hosts/host-adapter-contract.red.node.test.ts` | 19/19 | 19/19 | 19 ✓ |
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (compare) | 5/5 | 5/5 | 5 ✓ |
| `test/commands/init-host-parity.red.integration.node.test.ts` (compare) | 15/15 | 15/15 | 15 ✓ |
| `test/commands/uninstall.node.test.ts` | 20/20 | 20/20 | 20 ✓ |
| `test/hosts/host-lifecycle.red.node.test.ts` | 17/17 | 17/17 | 17 ✓ |
| `test/commands/host-cli.red.integration.node.test.ts` | 3/3 | 3/3 | 3 ✓ |
| `test/lib/settings-json-surgery.node.test.ts` | 13/13 | 13/13 | 13 ✓ |
| `npm run typecheck` | — | exit 0 | clean ✓ |

**Extra witnesses.** D1 or D3 reaches these files, but they are not on the dispatch list. All ran on the conformant src:
- `test/commands/init.node.test.ts`: 29/29. It covers the `.uninstalled` restore flow.
- `test/changelog-format.node.test.ts`: 5/5, measured after the scratch `npm run build`.
  - Before that build it was 4/5. The tarball scenario failed on `ENOENT: scandir …/dist`, which is an environment gap, not a D3 effect.
  - The 4 format scenarios pass with the D3 text.
- `test/lib/changelog-slice.node.test.ts`: 14/14.
- `test/commands/upgrade-changelog.node.test.ts`: 7/7.

**Dist smoke on the scratch-built conformant `dist`** (the M3-A45 smoke 3 shape). It ran as one `(cd <literal mktemp room> && …)` call, with `git init -q` in the room first:
1. `init --yes --pin 0.0.0-m3` exited 0 and wrote the full `.claude/settings.json`.
2. `uninstall --yes --force` exited 0, and `.claude/settings.json` was **absent** afterwards.
3. `init --yes --pin 0.0.0-m3 </dev/null` exited 0 and printed `Created .claude/settings.json`. `diff` against `templates/cleargate-planning/.claude/settings.json` printed nothing.

Step 3 also printed `Restore preserved items? [Y/n]` despite `--yes`. With stdin at EOF it took the default (Y) and restored `.cleargate/FLASHCARD.md`. That is the reason for M3-A52 in `plans/M3.md`.

### Mutant table

**How each mutant ran:**
- It was applied to the conformant simulation and run solo against 14 files: the new R11 file, the 12 dispatch-listed files and `init.node`.
- Mutants f and f2 restore the sealed `claude.ts` and patch the named caller instead.
- "Other killers" lists failing test titles from files other than the R11 file.

| ID | Mutant | R11 killer(s) | Other killers |
|---|---|---|---|
| a | Unlink when `Object.keys(cleaned.hooks ?? {})` is empty, even though a user key such as `permissions` remains | **R11c, second half only**, the "already-green" anchor. It is the sole killer. | none |
| b | Deleted case labelled `.claude/settings.json (deleted)` | R11a (marker `removed[]`), R11c (first-half `deepStrictEqual`) | none |
| c | Never unlink (`b146faf` `claude.ts`) | R11a, R11b, R11c, R11d | none |
| d | Unlink, but push `.claude/settings.json (ClearGate hooks)` | R11a, R11c | none |
| e | `fs.unlinkSync` before `removeClearGateHooks`, and never write back, so a file with user content is deleted | R11c (second half) | uninstall-per-host S12 "claude-only, user-content seed…"; `uninstall.node` "Surgery on CLAUDE.md + settings.json"; contract S8 "remove() delegates and inverts install()"; host-lifecycle S8 "surgery targets are never deleted wholesale" |
| f | Fix placed in `uninstall.ts` after the adapter loop; `claude.ts` sealed. The `host remove` route (R11d) is unaffected. | R11c, R11d | none. R11a and R11b pass: that route is fixed. |
| f2 | The converse: fix placed in `executeHostRemoval` only, so the full-uninstall route is unaffected | R11a, R11b, R11c | none. R11d passes. |
| g | Threshold `Object.keys(cleaned).length <= 1` | R11c (second half) | the same 4 as e |
| h | Unlink and push no label | R11a, R11c | none |
| i | Unlink when no non-`hooks` key remains, so a file holding only user hooks is deleted | — | the same 4 as e |
| j | Survive case labelled with the plain path | R11c (second half) | contract S8 |
| k | Truncate the file to 0 bytes instead of unlinking it | R11a, R11b, R11c, R11d | none |
| l | `fs.unlinkSync` moved after the `try`/`catch` (a flag set inside, unlink outside), so an unlink failure throws out of `remove()` | **SURVIVES** | **SURVIVES** (all 14 files) |

**Summary:** 12 of 13 mutants are killed, and l survives.

**Why l does not block:**
- The existing `catch` is also untested for its original `writeAtomic` failure: `command grep -rn "could not update settings" test` is empty.
- The only trigger is an unwritable `.claude/` directory.
- Killing l would take a chmod fault-injection red and another QA-Red round, for a path that has had no coverage since before -07.
- It is bound instead as Dev constraint 1 below, and QA-Verify checks it by reading the diff.

Mutant a shows the second half of R11c (which QA-Red flagged as already passing on `b146faf`) doing real work. It must stay; it is not dead weight.

### Binding Dev constraints for D1–D3 (beyond M3-A44)

1. **The unlink goes inside the `try`.** D1's `fs.unlinkSync(settingsPath)` sits lexically inside the existing `try`, after `removeClearGateHooks` and before the `catch`. Mutant l survives every test, so QA-Verify confirms this by reading the `claude.ts` hunk.
2. **D2's diff is insertion-only.** After D2, `git diff 170ac4c --numstat -- src/init/merge-settings.ts` reads `55	0`, as measured on the simulation. Any deleted line means the re-indent is wrong or `mergeSettings` changed.
3. **`changelog-format.node.test.ts`'s tarball scenario reads `dist/`.** In the main checkout it is served by the existing BD-built `dist`.
   - Do not build `dist` on the story branch just for this scenario (Rule 11).
   - If the scenario fails there, name it as dist-dependent. The 4 format scenarios are the D3 witness.
4. **No other `src/` file changes.** The Dev commit touches only `src/hosts/claude.ts`, `src/init/merge-settings.ts` and `CHANGELOG.md` (M3-A44 plus E13). f and f2 show that compensating in `uninstall.ts` or `lifecycle.ts` is caught anyway.

### Plan amendment

`plans/M3.md` gains **M3-A52**: M3-A45 smoke 3 step 2 re-inits with `</dev/null`, because the `.uninstalled` marker makes `init` prompt even with `--yes`.

### Outer `git status --porcelain`

Start of this dispatch:
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
?? .cleargate/sprint-runs/SPRINT-41/.pending-task-2101-20162-29188.json
```
End of this dispatch, before these two appends:
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```
- The `.pending-task-*` sentinel came and went through the hook itself.
- This dispatch writes only this report section and the M3-A52 append.
- Nothing ran against the outer repo, so the SMOKE RULE was honoured.

### Script incidents

None. No `.cleargate/scripts/*` script was invoked. The only commands were:
- `git`, `shasum` and `command grep` probes
- `npm run test:file`, `typecheck`, `prebuild` and `build` inside the scratch clone
- one dist smoke in a literal mktemp room under the clone

The version check does not apply, because no dependency is added or pinned.

flashcards_flagged:
  - "2026-09-26 · #tpv #test-harness · An already-green anchor half can be a mutant's SOLE killer (R11c half 2 vs hooks-only-empty unlink); measure before calling it dead."

STATUS=done
