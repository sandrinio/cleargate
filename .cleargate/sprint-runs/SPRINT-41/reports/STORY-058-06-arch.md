# STORY-058-06 — Architect Post-Flight

role: architect

ARCH: PASS

The Dev commit conforms to D1–D13 and M3-A7..A13. Its one deviation (a `try/catch` around verify-pack check 3c) is sanctioned: it fails closed. No finding is a runtime defect of -06, so nothing bounces.

Three forward risks are real and are routed below:
- `buildInstallView` cannot compose the packed split roots yet (measured). This routes to -10.
- Hand-added fixture entries without `owner` silently read as `core`. This is a binding rule for -05.
- -09 B5 reds for a correct install from RS-4 on. This routes to -09.

## What I reviewed

- **Commits.** Cli `story/STORY-058-06` @ `10176ea` (Dev), on re-seal `e990607`, on sealed `3871857`, on main `2e566b5`. I read them with `git show`/`git diff` only.
- **Scope of the Dev commit.** `git diff --stat e990607 10176ea` touches 7 files. Under `test/` it touches only `test/helpers/scaffold-roots.ts` (D11/D13). `git diff --stat 2e566b5 10176ea -- src/hosts src/cli.ts src/init src/commands/{uninstall,doctor,upgrade}.ts src/lib/scaffold-layout.mjs` is empty.
- **Inputs.** Plan `plans/M3.md`: the -06/-05/-07/BUG-085 blueprints, D1–D5, the tag tables, and M3-A1..A13. Plus the -06 QA-Red, TPV and Dev reports, the story file, and `plans/M4.md` V1–V3.
- **Evidence runs.** None duplicates a QA-Verify re-run.
  - I ran the three `composeCanonicalPayload` consumers that no one else ran, solo with `npm run test:file` on HEAD = `10176ea`. They exercise FU-2's one-builder claim:

    | File | Result |
    |---|---|
    | `test/docs/no-execution-mode-vocabulary.red.node.test.ts` | 9/9 |
    | `test/docs/pin-placeholder-coverage.node.test.ts` | 4/4 |
    | `test/scaffold/sprint-execution-mirror.integration.node.test.ts` | 4/4 |

  - One `tsx` probe script in the session scratchpad composed into the scratchpad only (the M3-A19 measurement).
  - No build, stash or checkout. Afterwards the cli `git status` shows only the pre-existing untracked `cleargate-0.25.0.tgz`.

## Conformance

| Constraint | As built (`10176ea`) | Verdict |
|---|---|---|
| D1 FU-2 split | `src/lib/manifest-builder.ts` holds the moved core. `TIER_RULES`, `matchRule`, `classifyPath` and `INTENTIONALLY_UNTRACKED` are byte-verbatim apart from `export` (measured with `diff`). There is no `import.meta` in the lib (grep 0). The lib's `buildManifest` requires `pkgRoot` (`:366`) and defaults `planningRoot` to `<pkgRoot>/templates/cleargate-planning` (`:372`). `scripts/build-manifest.ts` re-exports by identity (`:36-54`) and keeps the wrapper (`:61-67`). Nothing under `src/` imports `scripts/`. | Conforms. One non-verbatim byte: see F1. |
| D2 / M3-A9 FU-4 | The `sameDir` try/catch comes first after the option reads (`:552-563`), before package.json, `enumerateScaffoldRoots` and any write. | Conforms |
| D3 owner stamping | `walkDir(…, unclassifiedSink?, ownerOf?)`; `owner` is assigned after construction, so it is the last key (`:500-511`). Multi-root passes `() => ownerForRootKey(root.key)` (`:580`). The legacy walk passes none (`:387`). `buildViewManifest` uses a provenance `lstat().isFile()` lookup with an exactly-one check (`:678-695`). `ownerForRootKey` matches the spec (`:445-450`). | Conforms |
| D4 FU-1 | The collision check stays over every root (`:595-601`). Only after it: `COMPAT_ROOT_KEYS.has(root.key)` (`:604`). `writeCompat` gates only the compat write (`:626-630`). Both doc comments say core + hosts/claude. | Conforms |
| D5 / M3-A10 thin entry | Steps 1–5 (`:88-132`): `writeCompat: false`, `now` pinned to `multi.compat.generated_at`, the `JSON.stringify(files)` tripwire with exit 1, and the compat write. The warning is deduped with `new Set` and its hint names `src/lib/manifest-builder.ts`. | Conforms |
| D6 `manifest.ts` | A type-only `HostName` import. `LEGACY_INSTALLED_HOSTS` is frozen (`:216`). `installedHosts` returns a fresh copy (`:229-231`). `entryOwner` applies the segment-boundary rule (`:239-242`; it tests `if (entry.owner)` for truthiness, where the plan wrote `??`, which is equivalent for every non-empty owner). `mergeInstalledHosts` is the M3-A2 one-liner (`:252-260`). `loadInstallSnapshot` is byte-unchanged (`:200-208`). | Conforms |
| D7 bridge | `buildInstallView` gets the fixed core+claude roots and `readRunningCliVersion()` (`init.ts:297-304`). `resolveCliPackageRoot`, `pathToFileURL` and the `composePayload` import are gone. The `resolveCliPackageRoot`/`build-manifest` substrings occur 0 times in `init.ts`. The `ScaffoldSourceError` catch and the cleanup are unchanged (`:307-319`). | Conforms |
| D8 / M3-A1 | One hoisted `include` (`:397`) feeds `copyPayload` (`:401`) and Step 7 (`:598`, `:601`). | Conforms |
| D9 / M3-A7 | The block matches the M3-A7 text line for line (`:590-599`). `rehashedFiles` is filtered (`:601`). `listed` and the sort are at `:612-618`. The literal ends `pin_version, hosts: hostsAfter` (`:626-628`). `POST_PROCESSED_FILES` text is kept (`:577`). | Conforms |
| D10 / M3-A11 FU-3 | `checkCompatPayload` is plain ESM (`verify-pack-checks.mjs:27`): an independent presence check, then the `else if` owner chain, and every message names the path. 3c comes after 3b and uses a `pathToFileURL` import. The exact E7 line is present (`verify-pack.mjs:111`). | Conforms, with the deviation below |
| D11 | `composeCanonicalPayload(dst): Promise<void>` calls `buildInstallView(core, claude)` with the CLI `package.json` version. It is the only `test/` file the Dev edited. | Conforms |
| D12 run discipline | The Dev committed before running the dist test, ran prebuild only, never ran `npm run build` in the main checkout, and ran parity in compare mode. The baseline hash is unchanged (Dev report). | Conforms |
| D13 sealed | `git diff e990607 10176ea -- test` shows `test/helpers/scaffold-roots.ts` only. | Conforms |
| M3-A8 strict delta | The strict loop is at `init-fixture.ts:465-497` (QA-Red E1). The Dev did not touch it. | Conforms |
| M3-A12 NUL-safe identity | A DevOps step, not the Dev's (80 files per the Dev's prebuild). | n/a for Dev; DevOps owns it |
| M3-A13 counts | The Dev reports every row of the TPV "after Dev" table reproduced exactly. | Conforms; QA-Verify re-checks |

**The Dev deviation: a `try/catch` around check 3c (`verify-pack.mjs:104-114`), not orchestrator-confirmed. Ruling: accepted, sanctioned as M3-A22.**
- It fails closed. Any import, parse or check exception pushes an error, and `verify-pack` exits 1. Without the wrapper, the same exception would be an unhandled top-level rejection that suppresses checks 4–5's reports.
- It mirrors the pattern of checks 3b and 4 in the same file.
- E7's pinned regex matches the line inside the `try`.
- Its only cost is diagnostic: the catch message attributes every exception to "MANIFEST.json is unreadable" (FU-12).

## Design-quality findings

1. **One builder (FU-2): yes, with one hole.**
   - Every flat-view manifest in the tree now comes from `buildViewManifest`:
     - prebuild step 2 (`scripts/build-manifest.ts:98-106`)
     - `--from-source` (`init.ts:297`)
     - `composeCanonicalPayload` (`scaffold-roots.ts:67`)
   - The per-root split manifests keep the multi-root walk. The build-time tripwire forces the two to agree.
   - `git grep` finds no other builder under `src/`, `scripts/` or `test/helpers/`.
   - **The hole (measured):** `buildInstallView` over the **packed** split roots `templates/scaffold/{core,hosts/claude}` throws `composePayload: collision at "MANIFEST.json"`. Every split root ships a per-root `MANIFEST.json`, and an installed npm package has no `scaffold/`, so it has no other per-host source. `--from-source` and the test helper pass raw scaffold roots, which carry no `MANIFEST.json` because FU-4 guards them, so they work. -10 is the first caller that needs the packed roots → FU-5 / M3-A19 (binding for -10). This is the existing flashcard `#scaffold #host #manifest`, now measured on the as-built function.
2. **FU-1 with a future `hosts/codex` root: compat stays core+claude by four independent guards.**
   - `copy-planning-payload.mjs:43-72` composes the flat view from `coreEntry` + `claudeEntry` only.
   - `COMPAT_ROOT_KEYS` gates compat after the all-roots collision check.
   - Build step 2's provenance roots are fixed to core + claude, and the tripwire compares against compat.
   - verify-pack 3c rejects any owner outside `{core, claude}`.

   A `hosts/codex` root adds only `templates/scaffold/hosts/codex/MANIFEST.json` (owner `codex`), which 3b checks. When -11 later puts `.agents/**` into `scaffold/core`, those entries correctly appear in compat with owner `core` and are filtered at install by `payloadFilter` + the -06 Step 7 filter.
3. **FU-4 guard.** Correct for its stated case, and the ENOENT-safe `sameDir` is right for installed packages. Two limits, both low severity, route to close (FU-11):
   - It keys on `<pkgRoot>/scaffold`, so a caller passing another `pkgRoot` with the real scaffold as `scaffoldRoot` is not refused.
   - Legacy `planningRoot` mode is unguarded.
4. **Owner stamping.** Correct in both paths.
   - `MANIFEST.json` is `INTENTIONALLY_UNTRACKED`, so it is skipped before any owner lookup.
   - Provenance is exact because `composePayload` rejects collisions and symlinks.
   - `ownerForRootKey` takes the host directory name verbatim. A `scaffold/hosts/<dir>` whose name differs from its adapter's `name` would stamp an unregistered owner, and -06 scenario 6 does not catch an unregistered directory → census test, FU-6 (-10).
5. **Legacy defaults.** `installedHosts` and `entryOwner` are exact and never write. Carried legacy entries keep no `owner`, so snapshots can be mixed. Every consumer must use the accessors (FU-8, FU-9).

   **Robustness gap (FU-13):** `loadInstallSnapshot` does no shape check. A prior snapshot that parses but is mis-shaped now breaks re-init:
   - `files: {}` throws inside Step 7's `try`, so no snapshot is written at all. Re-init was the documented recovery.
   - `hosts: "claude"` spreads into characters.

   Hand-corruption only; it routes to close.
6. **Step 7 carry-forward vs -05 and -07: consistent.**
   - Step 7's `keep = payloadFilter(registry, hostsAfter ∩ registered)` (`init.ts:594`) is the same predicate as:
     - -07's `selectEntriesForHosts` path half
     - -05's orphaned-shared rule (under the registry's disjointness validation)

     M3-A16 makes -05 reuse it literally.
   - Unregistered-host entries: Step 7 carries them, -07 never selects them, and -05 cannot name them (`registry.resolve` throws first). So they are preserved and never touched.
   - Uninstall deletes the snapshot (`uninstall.ts:466-468`), so a re-init after uninstall starts from `prior = null`.
   - Downgrade edge (informational): an older binary that does not register codex re-inits a claude+codex snapshot. It carries codex's entries, but drops core `.agents/**` entries from the snapshot, because it cannot see codex's `sharedRoots`. The files stay on disk untracked until a newer binary re-lists them. Out of scope.
7. **`readRunningCliVersion` under bundled `dist`: correct.**
   - From npm, the module sits at `node_modules/cleargate/dist/cli.js`, or at a `dist/` chunk (tsup emits split ESM chunks at `dist/` root for the multiple entries in `tsup.config.ts`). The first `package.json` up is `node_modules/cleargate/package.json` (`name: "cleargate"`).
   - The same holds for pnpm (`.pnpm/cleargate@x/node_modules/cleargate/`), npx caches and `npm link`, where ESM resolves the realpath to the checkout.
   - The walk never reaches the consumer project's `package.json` first. It falls back to `'0.0.0'` only for a renamed fork.
   - Witnessed by E8 (unbundled) and `init-from-source-dist` (bundled, `scripts/` deleted).
   - -08 routes it through `findCleargatePackageRoot` + `readPackageVersion` (V3).
8. **verify-pack 3c: correct.** One gap: it checks the `templates/…/MANIFEST.json` copy that init reads, not `dist/MANIFEST.json`, which doctor and upgrade read (`manifest.ts:173` default). `prepublishOnly` rebuilds `dist` from the same prebuild, so the two cannot diverge in a release → FU-12 (close).

**F1 — non-verbatim move.** `hashNormalizedSync` (`manifest-builder.ts:289`) now holds a raw invisible U+FEFF inside `startsWith('…')`, where the original had the escape `'﻿'` (hexdump `27 ef bb bf 27`).
- Behaviour is identical: esbuild emits ASCII escapes.
- But any BOM-stripping edit turns it into `startsWith('')`, which is always true and silently drops the first character of every hashed file.
- No test covers BOM handling in the builder.
- `hashNormalizedSync` also duplicates `src/lib/sha256.ts#hashNormalized`, which is now importable from the same directory.
- Fixing both is one line (FU-7 → -10, which next edits this file).
- `src/lib/frontmatter-locator.ts:78,107` (BUG-067) carries the same raw-BOM pattern → FU-14 (close).

## FU list and routing

| FU | Target | What | Binding? |
|---|---|---|---|
| FU-1 | -05 | Hand-added fixture manifest entries carry an explicit `owner` (M3-A14). A missing owner makes `.codex/**` read as `core`, and the ownership gate passes vacuously | **Binding before -05 QA-Red seals** |
| FU-2 | -05, -07 | One fixture payload per registry: P2 for R2, P3 for R3 (M3-A15) | **Binding before -05 QA-Red seals** |
| FU-3 | -05 | The orphaned-shared rule reuses `payloadFilter(registry, nextKnown)` (M3-A16) | Binding (Dev) |
| FU-4 | -05 | Test/code mechanics (M3-A17): `primeExtra` two-pass, the byte-identity witness excludes the snapshot, the scenario-9 fixture path, accessor-only reads, a private atomic writer | Binding |
| FU-5 | -10 | `buildInstallView` skips each root's top-level `MANIFEST.json` through a new `composePayload` `skipTopLevelFiles` option (M3-A19). Measured collision today | **Binding for -10** |
| FU-6 | -10 | Census: every scaffold host directory name ∈ `defaultHostRegistry.names()` (a relation, P1-safe) | Binding for -10 |
| FU-7 | -10 | Replace `hashNormalizedSync` (raw U+FEFF at `:289`) with `hashNormalized` from `./sha256.js`. Byte-neutral | Binding for -10 |
| FU-8 | -08 | V1–V3 as resolved in M3: the `composeCanonicalPayload` return-value correction; check 3 uses `entryOwner`/`installedHosts` only; the `readRunningCliVersion` routing body | Binding (mirror into M4) |
| FU-9 | -07 | `entryOwner` only; no entry deep-compare that includes `owner`; `DriftMapEntry.owner = entryOwner(snapshot ?? package entry)`; fixture rules FU-1/FU-2 (M3-A20) | Binding |
| FU-10 | BUG-085 | Anchor moves: the pin-aware sentinel `TIER_RULES` entry is at `src/lib/manifest-builder.ts:198-205`; delta rows append at `init-fixture.ts:381-394` (M3-A21) | Binding (anchors) |
| FU-11 | close | The FU-4 guard keys on `<pkgRoot>/scaffold` only, and legacy `planningRoot` mode is unguarded. Make it structural (basename `scaffold` + sibling `package.json` named `cleargate`) | No |
| FU-12 | close | Check 3c's catch message hides the real exception (include `err.message`). 3c does not cross-check `dist/MANIFEST.json` against the templates copy | No |
| FU-13 | close | Validate prior-snapshot shape (`Array.isArray(files)`, `hosts` a string array) in `installedHosts` and Step 7, treating a mis-shaped prior as `null`, so re-init repairs it instead of skipping the snapshot write | No |
| FU-14 | close | `frontmatter-locator.ts:78,107` raw U+FEFF literals, plus a `src/**` "no raw EF BB BF" static guard | No |
| FU-15 | close | `test_version_bump_alignment.integration` fails `SUPPORTED_PAIRS` (cli 0.26 vs mcp 0.2). Pre-existing, outside the default glob, unrelated to -06 | No |
| FU-16 | -09 | From RS-4, B5 compares the claude-visible subset (`payloadFilter(registry, ['claude'])`, or `selectEntriesForHosts` after -07), not `entryOwner ∈ {core, claude}`. Core `.agents/**` exists only in the all room (M3-A23) | Binding (M4 amendment) |

**Binding amendments before -05's QA-Red seals** (orchestrator):
1. Apply D1–D5 to STORY-058-05, with **D4 corrected** (M3-A18): `uninstall.ts:325-342` (marker pre-validation) and `:434-457` (surgery), in place of `:325-341` and `:431-458`.
2. Put M3-A14, M3-A15 and M3-A17 into the -05 QA-Red dispatch text verbatim, and M3-A16 and M3-A17 into the Dev dispatch text. These are plan rules, not story-text changes.
3. Mirror V1–V3 (from `plans/M3.md` "As-built resolution after STORY-058-06") into M4's use before -08's QA-Red. The V2 fixture line in M4 is wrong as written.

**Other orchestrator actions after the -06 merge:**
- Record in the 058-02 *Adjacent Implementations* row that `resolveCliPackageRoot` is retired.
- Add the -06 row below.

## Adjacent Implementations row (final wording)

| Story | Module / Export | Path |
|-------|----------------|------|
| STORY-058-06 | `ManifestOwner`; `ManifestEntry.owner?` (last key; absent on legacy/carried entries); `ManifestFile.hosts?` (install snapshot only, last key); `LEGACY_INSTALLED_HOSTS`; `installedHosts(snapshot)` (fresh copy; absent ⇒ `['claude']`; never pass `null` to mean "no prior install"); `entryOwner(entry)` (explicit owner wins, else `.claude`/`.claude/**` ⇒ claude, else core; always use it, never `e.owner`); `mergeInstalledHosts(prior, added, registryNames)`. Bundled manifest core: `TIER_RULES`, `INTENTIONALLY_UNTRACKED`, `matchRule`, `classifyPath`, `unclassifiedPaths`, `buildManifest({ pkgRoot, scaffoldRoot?, writeCompat? })` (lib requires `pkgRoot`; `scripts/build-manifest.ts` re-exports by identity and fills it), `COMPAT_ROOT_KEYS` (core + hosts/claude), `ownerForRootKey`, `buildViewManifest` (provenance owner), `buildInstallView` (the one flat-view builder; cannot yet compose the packed `templates/scaffold/*` roots — M3-A19). Init Step 7: `hosts` = the installed set, plus carry-forward (M3-A7). `checkCompatPayload` (verify-pack 3c). `SANCTIONED_BASELINE_DELTAS` (strict on both sides) and `RunInitScenarioOptions.primeExtra`. Fixture `legacy-install-manifest-0.10.0.json`. `resolveCliPackageRoot` retired. | `cleargate-cli/src/lib/manifest.ts`, `src/lib/manifest-builder.ts`, `src/commands/init.ts`, `scripts/build-manifest.ts`, `scripts/verify-pack-checks.mjs`, `test/helpers/init-fixture.ts`, `test/helpers/scaffold-roots.ts`, `test/fixtures/manifest/legacy-install-manifest-0.10.0.json` |

## Plan update

I appended `## As-built resolution after STORY-058-06` to `plans/M3.md` before writing this report. It contains:
- the anchor tables for `manifest.ts`, `init.ts`, `manifest-builder.ts`, the helpers and `uninstall.ts`
- M3-A14..A18 (-05)
- M3-A19..A23 (-10, -07, BUG-085, the deviation sanction, and -09)
- M4 V1–V3 resolved
- tag status: T1–T10 resolved, T11 open, new T12 after -05, V4–V12 open

## Script Incidents

None. No `.cleargate/scripts` wrapper was invoked. The only executions were:
- read-only `git show`/`diff`/`grep`/`log`/`status`
- three solo `npm run test:file` runs
- one `tsx` probe script in the session scratchpad that wrote only there

Version check: no dependency is added or pinned, so `npm view` is not applicable.

flashcards_flagged:
  - "2026-09-25 · #manifest #cli · TIER_RULES/INTENTIONALLY_UNTRACKED now live in src/lib/manifest-builder.ts; scripts/build-manifest.ts only re-exports."
  - "2026-09-25 · #manifest #test-harness #danger · A fixture manifest entry added without owner reads by the legacy rule: .codex/** => core. Always stamp owner explicitly."
  - "2026-09-25 · #manifest #host · Legacy and carried snapshot entries lack owner; call entryOwner(e) and installedHosts(s), never e.owner or s.hosts."
  - "2026-09-25 · #tooling #danger · A moved '\\ufeff' escape became a raw invisible U+FEFF (manifest-builder.ts:289); grep for EF BB BF after code moves."
  - "2026-09-25 · #clean-room #manifest · From RS-4, core-owned .agents/** is only in the --host all snapshot; compare claude-visible entries, not core+claude."

STATUS=done
