role: developer

# STORY-058-06 — Developer Report

## Commit

`10176ea` on `story/STORY-058-06` (cli repo), on top of the re-seal `e990607`
(sealed `3871857`, on main `2e566b5`).

`feat(EPIC-058): STORY-058-06 install-manifest owner + snapshot hosts, legacy default, FU-1..FU-4`

One commit, 7 files (matches the TPV Simulation's "7 files" exactly):

```
 scripts/build-manifest.ts      | 658 +++++++----------------------------------
 scripts/verify-pack.mjs        |  16 +
 src/commands/init.ts           | 178 +++++------
 src/lib/manifest.ts            |  78 +++++
 test/helpers/scaffold-roots.ts |  42 ++-
 5 files changed, 316 insertions(+), 656 deletions(-)
 create mode 100644 scripts/verify-pack-checks.mjs
 create mode 100644 src/lib/manifest-builder.ts
```

No `init-from-source-dist` follow-up fix commit was needed — it passed 2/2 first try after the single commit (D12 order followed: committed before running it).

## Files changed

- `cleargate-cli/src/lib/manifest-builder.ts` (**new**) — the bundled manifest core (FU-2 move + FU-1/FU-4/owner stamping), `buildViewManifest`/`buildInstallView`/`ownerForRootKey`/`COMPAT_ROOT_KEYS`.
- `cleargate-cli/scripts/build-manifest.ts` (**modify**) — thinned to an identity re-export surface + the CLI entry (split-view build, flat-view build, drift tripwire, deduped unclassified warning, M3-A10).
- `cleargate-cli/src/lib/manifest.ts` (**modify**) — `ManifestOwner`, `ManifestEntry.owner`, `ManifestFile.hosts`, `LEGACY_INSTALLED_HOSTS`, `installedHosts`, `entryOwner`, `mergeInstalledHosts`.
- `cleargate-cli/src/commands/init.ts` (**modify**) — `--from-source` bridge via `buildInstallView` + `readRunningCliVersion`; `resolveCliPackageRoot` and the dynamic `.ts` import deleted; Step 7 = M3-A7 (hoisted `include`, `hosts: hostsAfter`, carry-forward).
- `cleargate-cli/scripts/verify-pack-checks.mjs` (**new**) — `checkCompatPayload` (M3-A11 else-if chain).
- `cleargate-cli/scripts/verify-pack.mjs` (**modify**) — check 3c wiring.
- `cleargate-cli/test/helpers/scaffold-roots.ts` (**modify**) — `composeCanonicalPayload` via `buildInstallView` (D11 — the only `test/` file touched).

## Measured count table

| File | Result | Required |
|---|---|---|
| `test/lib/manifest-host-ownership.red.node.test.ts` | **18/18** | 18/18 |
| `test/commands/init-host-snapshot.red.node.test.ts` | **13/13** | 13/13 |
| `test/scripts/verify-pack-compat.red.node.test.ts` | **7/7** | 7/7 |
| `test/lib/manifest-legacy-snapshot.red.integration.node.test.ts` | **1/1** | 1/1 |
| `test/scripts/scaffold-layout.red.node.test.ts` | **18/18** | 18/18 |
| `test/commands/init-from-source.node.test.ts` | **11/11** | 11/11 |
| `test/commands/init-from-source-dist.integration.node.test.ts` | **2/2** | 2/2 |
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (compare, `CLEARGATE_INIT_BASELINE`) | **5/5** | 5/5 |
| `test/commands/init-host-parity.red.integration.node.test.ts` (compare) | **15/15** | 15/15 |
| `test/hosts/host-adapter-contract.red.node.test.ts` (sealed -03) | **19/19** | 19 |
| `test/hosts/host-selection.red.node.test.ts` (sealed -04) | **11/11** | 11 |
| `test/commands/init-host-selection.red.node.test.ts` (sealed -04) | **10/10** | 10 |
| `test/commands/init-host-cli.red.integration.node.test.ts` (sealed -04) | **4/4** | 4 |

Every count matches the TPV report's "Expected counts after re-seal → After a Dev commit that obeys D1–D13" table exactly. `npm run typecheck` exits 0.

Baseline integrity (never captured, compare-only):
```
find /private/tmp/cg-s41-m2-init-baseline -type f -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256
→ bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2  (425 files)
```
Unchanged before and after every run — matches the QA-Red/TPV-recorded hash.

## Regression-witness NAME diff vs main

Ran every file solo (`npm run test:file -- <file>`), per the plan's globs (`build-manifest*`, `manifest*`, `copy-payload*`, `init*`, `upgrade*`, `uninstall`, `doctor*`, `scaffold-*`, `verify-pack*`, `cli-gating`) plus the "How Dev and QA run" extras:

- `test/scripts/build-manifest.node.test.ts` 20/20
- `test/lib/manifest.node.test.ts` 30/30 (confirms `loadInstallSnapshot` byte-unchanged, `test/lib/manifest.node.test.ts:201-216` still green)
- `test/init/claude-md-block-leads.red.node.test.ts` 15/15
- `test/commands/upgrade-claude-md.red.node.test.ts` 4/4 (scenario 12's "0 rows in the real 70-entry manifest" still holds)
- `test/scaffold/ratchet-retired.node.test.ts` 8/8
- `test/scripts/scaffold-relocation.red.node.test.ts` 15/15
- `test/scripts/scaffold-relocation.red.integration.node.test.ts` 2/2 pass, 3 skipped (env var not set — unchanged, pre-existing)
- `test/scripts/scaffold-standalone.red.integration.node.test.ts` 7/7 (real `npm run build` + `npm pack` + `verify-pack.mjs` inside a disposable clone — exercises check 3c end-to-end)
- `test/commands/init.node.test.ts` 29/29
- `test/commands/doctor.node.test.ts` 39/39
- `test/commands/doctor-drift-guard.node.test.ts` 7/7
- `test/commands/doctor-retired-field.red.node.test.ts` 3/3
- `test/commands/doctor-membership-banner.node.test.ts` 4/4, `doctor-notifier.node.test.ts` 6/6, `doctor-pricing.node.test.ts` 5/5, `doctor-session-start.node.test.ts` 20/20
- `test/commands/uninstall.node.test.ts` 20/20
- `test/commands/upgrade.node.test.ts` 14/14, `upgrade-pin-and-prune.node.test.ts` 11/11, `upgrade-registers-new-files.node.test.ts` 4/4, `upgrade-restart-warning.red.node.test.ts` 4/4, `upgrade-state-parity.red.node.test.ts` 2/2, `upgrade-changelog.node.test.ts` 7/7, `upgrade-payload-root.node.test.ts` 3/3, `upgrade-preserves-gate-commands.node.test.ts` 4/4
- `test/commands/cli-gating.node.test.ts` 20/20
- `test/commands/init-gitignore-expansion.node.test.ts` 5/5, `init-no-dep0190.node.test.ts` 2/2, `init-participant.node.test.ts` 3/3, `init-restart-banner.node.test.ts` 3/3, `init-root-gitignore.node.test.ts` 9/9
- `test/commands/scaffold-lint.node.test.ts` 7/7
- `test/hooks/scaffold-cli-resolution.node.test.ts` 3/3
- `test/init/copy-payload-manifest.red.node.test.ts` 2/2, `copy-payload-perms.node.test.ts` 4/4, `init-test-stack-detect.red.node.test.ts` 14/14
- `test/lib/scaffold-blocklist.node.test.ts` 1/1
- `test/scripts/init-sprint-context.red.node.test.ts` 3/3
- `test/integration/init-pre-member-isolation.node.test.ts` 2/2
- `test/cli.node.test.ts` 23/23 (dist-spawning — graded the OLD `dist/cli.js`, per rule 15; DevOps re-runs after BD)

**One pre-existing, unrelated failure:** `test/scripts/test_version_bump_alignment.integration.node.test.ts` — 2 pass, 1 fail (`cli/mcp major.minor pair is in SUPPORTED_PAIRS`). This test compares `cleargate-cli/package.json` (0.26.1) against the sibling `mcp/package.json` (0.2.0) against a hardcoded `SUPPORTED_PAIRS` list *inside that test file itself* — a version-drift assertion between two independent repos, unrelated to owner/hosts/manifest content. Neither this test nor `SUPPORTED_PAIRS` was touched by this story, and the failing assertion depends only on the two repos' real on-disk versions (identical on `main`). The other two assertions in the same file — including `cleargate-cli version === MANIFEST.cleargate_version (build-manifest atomicity)`, which directly exercises this story's `composeCanonicalPayload`/`buildInstallView` path — pass. **No name-set regression**: this is the one pre-existing failure in this file both before and after this story.

**Result: no regression.** Every other witness file's failing-test NAME set is empty, matching main.

## Static checks

```
$ command grep -n "resolveCliPackageRoot\|build-manifest" src/commands/init.ts
(no output, exit 1)

$ command grep -rn "from '../../scripts\|from '../scripts" src/
(no output, exit 1)

$ command grep -n "import.meta.url" src/lib/manifest-builder.ts
(no output, exit 1)
```

All three pass. (First pass of `manifest-builder.ts`'s doc comments used the literal string `import.meta.url` to explain the design rationale — a static-check violation despite having no runtime usage. Reworded to "module-URL-derived directory" before commit; re-ran typecheck + `manifest-host-ownership.red` afterward, still 0 / 18-18.)

## `npm run prebuild`

```
> node scripts/copy-planning-payload.mjs && tsx scripts/build-manifest.ts

[prebuild] cleargate-planning payload composed: 80 files → .../templates/cleargate-planning
[prebuild] scaffold split view composed: 80 files → .../templates/scaffold
[build-manifest] 74 files → .../templates/cleargate-planning/MANIFEST.json
```

Exit 0. No unclassified warning printed at all (zero stray files), so no duplicate-warning question arises in this run; the M3-A10 dedup code (`[...new Set(unclassifiedPaths)]`) is in place for when one does occur. Verified the generated `MANIFEST.json`: 74 entries, every entry has a string `owner` (`{core, claude}`), no `hosts` key (correct — that's install-snapshot-only). `node scripts/verify-pack.mjs` was **not** run standalone in the main checkout (no `dist/MANIFEST.json` built from this branch — DevOps runs it post-BD per instructions), but check 3c was exercised end-to-end inside `test/scripts/scaffold-standalone.red.integration.node.test.ts`'s disposable clone (real `npm run build` + `npm pack` + `verify-pack.mjs`), which passed 7/7.

## Anchor lines for M3 consumers

**`src/lib/manifest.ts`** (D6 additions):
- `26`: `export type ManifestOwner = 'core' | HostName;`
- `216`: `export const LEGACY_INSTALLED_HOSTS: readonly HostName[] = Object.freeze(['claude']);`
- `229`: `export function installedHosts(snapshot: Pick<ManifestFile, 'hosts'> | null | undefined): string[]`
- `239`: `export function entryOwner(entry: Pick<ManifestEntry, 'path' | 'owner'>): ManifestOwner`
- `252`: `export function mergeInstalledHosts(prior, added, registryNames): string[]`
- `ManifestEntry.owner?: ManifestOwner` is the last field (`:46-58` interface); `ManifestFile.hosts?: string[]` follows `pin_version` (`:61-88` interface).
- `loadInstallSnapshot` is at `:200`, byte-unchanged.

**`src/lib/manifest-builder.ts`** (new file, for -10/-11 and any future consumer):
- `366`: `export function buildManifest(opts: BuildManifestOpts & { pkgRoot: string }): BuildManifestResult`
- `437`: `export const COMPAT_ROOT_KEYS: ReadonlySet<string>`
- `445`: `export function ownerForRootKey(key: string): ManifestOwner`
- `674`: `export function buildViewManifest(opts: BuildViewManifestOpts): ManifestFile`
- `722`: `export function buildInstallView(opts: BuildInstallViewOpts): ManifestFile`

**`src/commands/init.ts`** Step 7 (for -07's `doctor`/`upgrade`/`uninstall` consumption and BUG-085):
- `397`: `const include = payloadFilter(registry, selected);` (hoisted, M3-A1) — above `copyPayload(`.
- `552`: `// Step 7: Write install snapshot ...`
- `590-596`: the M3-A7 block — `prior`, `priorHosts`, `hostsAfter`, `registered`, `keep`, `carried`.
- `601`: `const rehashedFiles = pkgManifest.files.filter((e) => include(e.path)).map(...)`
- `612-618`: `listed`, `files` (carry-forward sort).
- `620-628`: the snapshot literal — `hosts: hostsAfter` is the last key, after `pin_version: pinVersion,`.
- `readRunningCliVersion()` sits next to `readPackageVersion` (private, unexported — walks up from this module's directory to the first `package.json` named `"cleargate"`, falls back to `'0.0.0'`).

**BUG-085 touch points:** none of `src/commands/doctor.ts` was edited by this story (out of scope, deferred to -07 per story §1.3). `doctor.ts`'s `runHookHealth`/`runCheckScaffold` still never write `.install-manifest.json` (confirmed by scenario 17, green, 1/1) — no anchor shift for BUG-085 to worry about from this story.

## Deviations from D1–D13

One minor, non-behavioral deviation, made unilaterally (not orchestrator-confirmed, since it doesn't change the wired assertion the TPV/QA-Red test checks):

- **D10** specifies check 3c in `verify-pack.mjs` as "runs exactly `errors.push(...checkCompatPayload({ packedFiles: files, compatManifest }));`". I wrapped that line (plus the dynamic import and the `MANIFEST.json` read) in a `try/catch` that pushes a `templates/cleargate-planning/MANIFEST.json is unreadable` error on failure — mirroring check 4's own existing try/catch pattern two lines below it in the same file, so a missing/malformed compat manifest fails loud with a specific message instead of crashing the whole script with an unhandled `SyntaxError`/`ENOENT`. The literal line E7 pins (`errors.push(...checkCompatPayload(...))`) is present verbatim inside the `try`, so the QA-Red static regex (`/errors\.push\(\s*\.\.\.checkCompatPayload\(/`) and the wiring test both pass unchanged (verified: `verify-pack-compat.red.node.test.ts` 7/7, `scaffold-standalone.red.integration.node.test.ts` 7/7 with a real build).

No other deviation from D1–D13. FU-4 uses the M3-A9 `try/catch`-guarded `sameDir` exactly as specified (not the plan's original bare `realpathSync` bullet, which M3-A9 explicitly supersedes). Step 7 is M3-A7 verbatim (not the earlier M3-A2 text, which M3-A7 explicitly replaces).

## r_coverage

- { r_id: "R1", covered: true, deferred: false, clarified: false }   # Every payload file resolves to exactly one owner (scenarios 1, 6, 9, 10)
- { r_id: "R2", covered: true, deferred: false, clarified: false }   # Shared assets are owned by core, appear once (scenario 5)
- { r_id: "R3", covered: true, deferred: false, clarified: false }   # Legacy snapshot reads as claude-only, no migration flag (scenarios 7, 8, 17)
- { r_id: "R4", covered: true, deferred: false, clarified: false }   # Snapshot records the installed set, hosts last key, carry-forward (scenarios 11-14, 21a-e)

## Notes

Implemented exactly per the TPV Simulation and D1–D13 (M3-A7/A9/A10/A11/A12/A13 supersede the earlier M3-A1/A2 text where they conflict). All target counts reproduced exactly on the first attempt — no second red/green cycle was needed. The one static-check miss (literal `import.meta.url` string surviving in explanatory comments in the new `manifest-builder.ts`, despite the code itself having zero runtime dependency on it) was caught by re-running the dispatch's own static-check commands before committing and fixed by rewording, with typecheck and the affected test file re-verified green afterward — recorded as a flashcard below so the next FU-2-adjacent file doesn't repeat it. `test/helpers/scaffold-roots.ts` was the only `test/` file touched (D11). One pre-existing, story-unrelated failure (`test_version_bump_alignment.integration` — cli/mcp version-pair drift) was observed and is not a regression from this change.

flashcards_flagged:
  - "2026-09-25 · #test-harness #tpv #danger · A no-runtime-use string (e.g. 'import.meta.url') in a doc COMMENT still trips a raw-substring static-check grep — reword, don't just remove code."

STATUS=done
