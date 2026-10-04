# STORY-058-06 TPV — Round 1

role: architect

TPV: REJECTED — QA-Red's dual-accept `SANCTIONED_BASELINE_DELTAS` compare contradicts M3 T1 item 2 and blinds both M2 parity files to a missing or reverted delta (measured: a build that never writes `hosts` passes 5/5 and 15/15). Separately, M3-A2's carry-forward drops shared-root core entries (M3-A7), and six surviving mutants matter. The fixes are re-seal edits E1–E9 below: one unified diff, `git apply --check` clean on `3871857`. If the counts in "Expected counts after re-seal" reproduce, no second TPV round is needed.

Wiring itself is sound. Every import resolves, and every `runInitScenario`/`initHandler`/`doctorHandler` seam matches the as-built signatures (T1, T10). `mock.fn` targets exist. Every `doctorHandler` call injects `exit`. Temp dirs are removed in `finally`. Red-file naming follows §Test Stack.

**What I reviewed:**
- cli `story/STORY-058-06` @ `3871857`, whose red commit sits on main `2e566b5`.
- `git diff --stat 2e566b5 3871857` touches exactly the 9 files the plan names:
  - 4 new red files
  - the 3 deliberately amended sealed files (`scaffold-layout.red` scenario 6, `init-from-source`, `init-from-source-dist`)
  - `test/helpers/init-fixture.ts`
  - the 0.10.0 fixture
- No other sealed file changed.
- The plan: `plans/M3.md` §STORY-058-06, as superseded by T1 and M3-A1/A2. Story C1–C6 are applied.

## Simulation

**Scratch clones.** `/private/tmp/cg-s41-tpv-058-06/{cleargate-cli,b/cleargate-cli,c/cleargate-cli}` were cut from `3871857`.
- `node_modules` is symlinked from the main checkout.
- Each clone's parent holds a `git archive` copy of outer `HEAD`'s `.cleargate/`, `cleargate-planning/` and `CLAUDE.md` as its meta-root. Copies, not symlinks, so test writes can never reach the outer checkout.
- `npm run prebuild` and `npm run build` ran **only** inside the scratch clones. The main cli checkout was never edited, stashed, built or checked out. Its `git status` is unchanged, and `test/` still equals `3871857`.
- All clones are now deleted.

**Plan-conformant -06.** 7 files, +843/−656. The M3-A7 delta adds +10/−2 in `init.ts`.
- **`src/lib/manifest-builder.ts`**
  - Moved verbatim: `TierRule`/`TIER_RULES`/`matchRule`/`classifyPath`, private `hashNormalizedSync`, the opts/result types, the legacy walk, `INTENTIONALLY_UNTRACKED` (now exported), `unclassifiedPaths`, `walkDir` and `buildMultiRootManifest`.
  - (a) `pkgRoot` is required, and there is no `import.meta.url` in the lib.
  - (b) FU-1 via `COMPAT_ROOT_KEYS`, placed after the all-roots collision check. `writeCompat` is added.
  - (c) FU-4.
  - (d) `walkDir`'s 5th parameter `ownerOf`, with `owner` as the last key.
  - Added `ownerForRootKey`, `buildViewManifest` (provenance lookup with an exactly-one check) and `buildInstallView`.
- **`scripts/build-manifest.ts`** is a thin entry:
  - identity re-exports
  - a wrapper `buildManifest` that fills `pkgRoot`/`planningRoot`
  - CLI steps 1–5 with the equality tripwire
- **`src/lib/manifest.ts`** gains `ManifestOwner`, `owner?`, `hosts?`, `LEGACY_INSTALLED_HOSTS`, `installedHosts`, `entryOwner` and `mergeInstalledHosts`. `HostName` is a type-only import.
- **`src/commands/init.ts`**
  - The bridge now calls `buildInstallView` with the fixed core+claude roots and `readRunningCliVersion()`.
  - `resolveCliPackageRoot` and its doc are deleted, as are the `pathToFileURL` and `composePayload` imports.
  - `include` is hoisted (M3-A1).
  - Step 7 implements M3-A2 (build "A2"), then M3-A7 (build "A7").
- **`scripts/verify-pack-checks.mjs`** holds `checkCompatPayload`. **`scripts/verify-pack.mjs`** wires check 3c.
- **`test/helpers/scaffold-roots.ts`**: `composeCanonicalPayload` now calls `buildInstallView`.

`npm run typecheck` exits 0 on A2 and A7.

**Live witnesses on the A2/A7 scratch builds:**
- `node scripts/verify-pack.mjs` → `OK — 196 files, payload 80`.
- Negative control: one compat entry set to `owner: "codex"` → `REFUSING TO PUBLISH … ".claude/agents/architect-reader.md" has owner "codex"`.
- **Payload identity** (NUL-safe, M3-A12): 80 files excluding `MANIFEST.json`, digest `a2fd8216a525eeeee33df96132622a554c09a446dd9530fb9f6e8eb4b12c8614`, identical on sealed and conformant.
- `MANIFEST.json`:
  - 74 entries, owners `{core, claude}`.
  - Stripping `owner` gives entries byte-equal to sealed.
  - The split-root manifests carry an owner-only delta.

## Measured red → green (each file solo, `npm run test:file`)

| File (tests) | Sealed `3871857` | Conformant A2 | Conformant A7 | Re-sealed on sealed src (new red) | Re-sealed on A2 | Re-sealed on A7 |
|---|---|---|---|---|---|---|
| manifest-host-ownership.red (17 → 18) | 3/17 | 17/17 | 17/17 | **3/18** | 18/18 | **18/18** |
| init-host-snapshot.red (11 → 13) | 3/11 | 11/11 | 11/11 | **4/13** | 12/13 (E3 red) | **13/13** |
| verify-pack-compat.red (6 → 7) | 0/6 | 6/6 | 6/6 | **0/7** | 7/7 | **7/7** |
| manifest-legacy-snapshot.red.integration (1) | 1/1 | 1/1 | 1/1 | 1/1 | — | 1/1 |
| scaffold-layout.red (18), amended | 17/18 | 18/18 | 18/18 | 17/18 | — | 18/18 |
| init-from-source (11), amended | 10/11 | 11/11 | 11/11 | **10/11** | 11/11 | **11/11** |
| init-from-source-dist.integration (2), amended, commit first | 1/2 | 2/2 | 2/2 | 1/2 (file untouched by E) | — | 2/2 |
| claude-adapter-init-parity (5, compare) | 5/5 (dual) | 5/5 | 5/5 | **0/5 (intended)** | 5/5 | **5/5** |
| init-host-parity (15, compare) | 15/15 (dual) | 15/15 | 15/15 | **0/15 (intended)** | 15/15 | **15/15** |
| -03 host-adapter-contract (19) | 19/19 | 19/19 | — | 19/19 | — | 19/19 |
| -04 host-selection (11) | 11/11 | 11/11 | — | 11/11 | — | 11/11 |
| -04 init-host-selection (10) | 10/10 | 10/10 | — | 10/10 | — | 10/10 |
| -04 init-host-cli (4) | 4/4 | 4/4 | — | 4/4 | — | 4/4 |

- Sealed counts reproduce QA-Red's report exactly.
- The M3-A2-literal build fails only E3. That is the M3-A7 design gap, not a Dev defect.
- The parity files were run in compare mode only (`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`). No capture flag was ever set.

### Baseline integrity (read-only, never captured)

`find /private/tmp/cg-s41-m2-init-baseline -type f -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256`:
- **Before:** 425 files, `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2`
- **After:** 425 files, `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2`

The two are equal. The directory was kept.

## Q1 ruling — (a) strict `currentHash`

**Ruling: (a).** The sanctioned-delta compare asserts `stored.sha256 === baselineHash(id)` **and** `record.sha256 === currentHash(id)`, with no alternative. That is re-seal E1, pinned by E2.

1. **The plan says so literally.**
   - T1 item 2: "Assert `stored.sha256 === baselineHash(id)`, `record.sha256 === currentHash(id)`, and equal modes."
   - *Cross-story risks*: "the baseline record's hash equals `baselineHash(s)`, **and** the current hash equals `currentHash(s)`."
   - The "only when the snapshot changed" wording QA-Red cites appears nowhere in `plans/M3.md`. Where the plan and the dispatch conflict, the plan governs.
2. **The dual-accept blind spot, measured.**
   - Mutant MI2 is -06 with no `hosts` written. Under dual-accept it passes both parity files, 5/5 and 15/15.
   - Under E1 both go 0/5 and 0/15.
   - Mutant MI (`hosts` not the last key) fails under both variants, because it produces a third hash.
   - So dual-accept loses exactly the "delta missing or reverted" class.
3. **Later rows.**
   - The baseline lives until M3 closes. A dual row therefore accepts a **revert** of its own delta for the rest of M3.
   - Example: BUG-085 (wave11) re-breaking -07's `.claude/settings.json` supersede would pass parity on `user-content`.
   - The -07 and both BUG-085 rows follow E1 (M3-A8).
4. **Cost.** At every M3 red commit, the parity files are red on the new row's scenarios. That is the intended red.
   - For -06 that is 0/5 and 0/15. The failure message names `.cleargate/.install-manifest.json` and says "has not landed or was reverted".
   - Whole-tree byte-neutrality of QA-Red's helper edits (`primeExtra`, the delta loop) is proven twice: by QA-Red's own dual run at `3871857` (5/5, 15/15), and by conformant-plus-E1 (5/5, 15/15).
5. **(c) rejected.**
   - At seal time, the delta cannot have landed, so a per-row `landed` flag's only honest value is `false`.
   - The Dev may not flip it.
   - It is therefore dual-accept under another name.
6. QA-Red's proposed flashcard ("must accept EITHER …") must **not** be recorded. The replacement card is below.

## Mutants (measured; reference = conformant)

"Sealed" means the `3871857` files. "Re-sealed" means after E1–E9, measured on the A7 build.

| # | Mutant | Sealed killer(s) | Re-sealed killer(s) |
|---|---|---|---|
| MA | Owner stamped only on host roots (core left `undefined`) | 1, 5, 6, 9, 11, 19 (scaffold-layout 18 does **not**: both sides share the walk) | same |
| MB | `COMPAT_ROOT_KEYS` not applied (FU-1 skipped) | 2 | same |
| MC | FU-4 refusal checked after the per-root writes | 4a | same |
| MC′ | FU-4 **plan-literal** bare `realpathSync` (no ENOENT guard) | 4c goes red on a *correct* intent (ENOENT on `tmpPkg/scaffold`). This is a plan defect, M3-A9 → D2. | same |
| MD1 | `installedHosts` returns `snapshot.hosts` by reference | 7.4 | same |
| MD2 | `installedHosts` returns `LEGACY_INSTALLED_HOSTS` by reference | 7.3 | same |
| ME | `installedHosts(null)` for the prior set (M3-A2 danger card) | 14, 21(c) | same |
| MF | `hosts: [...selected]` | 21(a), 21(b) | same |
| MG | Carried entries appended unsorted | **none (survives)** | **E9** (21(a) sort) |
| MH | Carried entries not deduped against `listed` | none: **equivalent**. A carried entry is by construction one that `include` rejects, so it is never in `rehashedFiles`. | none (equivalent) |
| MI | `hosts` not the last key | 11; parity 0/5 and 0/15 under both helper variants (third hash) | same |
| MI2 | `hosts` never written | 11–14, 19, 21(a–c); **parity passes under dual-accept (5/5, 15/15)** | + parity 0/5, 0/15 (E1) |
| MJ | Two separate `payloadFilter(registry, selected)` calls instead of the hoisted one | none: **equivalent** (a pure function of identical inputs). M3-A1 stays a style rule. | none (equivalent) |
| MJ2 | Step 7 `.filter(include)` omitted | 13, 14 | same |
| MK | Bridge still imports the scripts entry (`'build' + '-manifest.ts'`, dodging the substring check) | 20, plus its sibling dist test (0/2). A literal specifier is also killed by 10. | same |
| ML | `verify-pack` 3c not wired | **none (survives)** | **E7** |
| MM | `entryOwner` via `p.startsWith('.claude')` (no `/` boundary) | **none (survives)** | **E6** |
| MN | Over-carry: every prior entry not re-listed is carried | **none (survives)**. It changes Claude-only re-init snapshots when the payload drops a file (Rule 2). | **E4** |
| MP | `ownerForRootKey` returns `'hosts/claude'` unstripped | 1, 6 | same |
| MT | Collision check restricted to compat roots | 3, 5, scaffold-layout collision test | same |
| MU | `buildViewManifest` owner by the `.claude` prefix rule, not provenance (breaks -10's codex views) | **none (survives)** | **E5** |
| MQ | `--from-source` stamps a constant `cleargate_version` | **none (survives)** | **E8** |
| M-iff | `checkCompatPayload` as a biconditional `(owner==='claude') !== underClaude` | 16 (codex), 16 (no owner): double-reports | same (M3-A11) |
| M-A2 | The M3-A2 carry predicate itself | none | **E3** (M3-A7) |
| M-dual | QA-Red's dual-accept helper | n/a | **E2** |

## Regression witnesses

- **Files.** The 43 files matching the task globs plus the plan's extras (`build-manifest*`, `manifest*`, `copy-payload*`, `init*`, `upgrade*`, `uninstall`, `doctor*`, `scaffold-*`, `verify-pack*`, `claude-md-block-leads`, `ratchet-retired`, `test_version_bump_alignment`, `cli.node`). That is 402 tests, excluding the -06 red and amended files, which are measured above.
- **Method.** Each file ran solo. I diffed the failing-test **name** sets:
  - sealed vs conformant A2
  - sealed-with-dist vs A7-plus-re-seal-with-dist
- **Result: no regression.** The only name-set difference is scaffold-layout scenario 6, which goes red → green as intended.
- **Env-only failures, identical on both sides:**
  - `scaffold-relocation.red` "executable set under scaffold/ equals the tracked 100755 set …" (the scratch meta-root is a `git archive` copy)
  - `test_version_bump_alignment` ×2 (no sibling `mcp/` in scratch)
- **Dist-spawning files.** Without `dist`, `cli.node` (20), `init-pre-member-isolation` (2), `doctor-drift-guard`, `init-restart-banner`, `init-no-dep0190` and `doctor-retired-field` fail or skip identically on both sides. With `dist` built in each scratch clone, all pass on both sides: 23/23, 2/2, 7/7, 3/3, 2/2, 3/3.

## Rulings on QA-Red's five ambiguities

1. **Scenario 5's "fixture registry" clause: accepted.** `buildManifest` takes no registry, and ownership derives from the physical root. The shared-root semantics are exercised where a registry exists: R2 in `init-host-snapshot`, now including E3.
2. **`test/helpers/scaffold-roots.ts` left for the Dev: accepted.** The -06 *Files — cli* list assigns the `composeCanonicalPayload` rewrite to the Dev under FU-2, and the QA-Red Task Breakdown row does not name it.
   - It is the only file under `test/` the Dev edits (D11).
   - Scenarios 9 and 11 go red if the Dev skips it (measured by MA and by the sealed run).
3. **Dual-accept sanctioned delta: rejected.** See the Q1 ruling. It is replaced by E1 and pinned by E2.
4. **4b, 4c and 17 recorded GREEN: accepted.** They are regression guards, verified against source. 15.1–15.3 green is also accepted, as mechanism self-tests of the QA-Red-owned helper.
5. **The four -03/-04 contract files as QA-Red's re-run scope: accepted** for the red commit. The broader list belongs to the Dev and QA-Verify ("How Dev and QA run"), and this TPV ran it as the witness sweep above.

**Additional finding F1.** 21(a)'s comment says "codex-only pass 2 must never re-run claude's install() surgery", but the test asserted `fakeCodex.install` once. E9 adds the missing `claudeSpy.install` assertion.

## Binding Developer constraints

- **D1 — FU-2 split.**
  - `src/lib/manifest-builder.ts` holds the moved code and the pinned exports.
  - It imports `composePayload`/`enumerateScaffoldRoots` from `./scaffold-layout.mjs`, and types from `./manifest.js`.
  - It contains no `import.meta.url`. The lib's `buildManifest(opts: BuildManifestOpts & { pkgRoot: string })`, in legacy mode, defaults `planningRoot` to `path.join(pkgRoot, 'templates', 'cleargate-planning')`.
  - `scripts/build-manifest.ts` re-exports with `export { TIER_RULES, matchRule, classifyPath, INTENTIONALLY_UNTRACKED, unclassifiedPaths, COMPAT_ROOT_KEYS, ownerForRootKey, buildViewManifest, buildInstallView } from '../src/lib/manifest-builder.js';`. That is identity; scenario 10 pins it.
  - It keeps a wrapper `buildManifest(opts: BuildManifestOpts = {})` that fills `pkgRoot ?? path.resolve(<scripts>, '..')`. The script-relative defaults live only there; the `scaffold-relocation` sibling-read guard still scans this file.
  - Nothing under `src/` imports `scripts/`.
- **D2 — FU-4 (M3-A9).**
  ```ts
  const sameDir = (a: string, b: string): boolean => { try { return fs.realpathSync(a) === fs.realpathSync(b); } catch { return false; } };
  if (doWrite && sameDir(opts.scaffoldRoot, path.join(pkgRoot, 'scaffold'))) throw new Error(`buildManifest: refusing to write per-root MANIFEST.json into the tracked scaffold source ${opts.scaffoldRoot}; pass write: false, or point scaffoldRoot at templates/scaffold`);
  ```
  It comes first in `buildMultiRootManifest`, after reading `pkgRoot`/`now`/`write`, and before `enumerateScaffoldRoots` and any write.
- **D3 — Owner stamping.**
  - The signature is `walkDir(baseDir, currentDir, entries, unclassifiedSink?, ownerOf?: (relPath: string) => ManifestOwner)`. Build the entry literal, then `if (ownerOf) entry.owner = ownerOf(normalizedRelPath);` so `owner` is the last key.
  - Multi-root passes `() => ownerForRootKey(root.key)`. Legacy `planningRoot` mode passes nothing, so it stays byte-unchanged.
  - `buildViewManifest`'s `ownerOf` is the provenance lookup: `roots.filter((r) => { try { return fs.lstatSync(path.join(r.dir, ...rel.split('/'))).isFile(); } catch { return false; } })`. Anything other than exactly one match throws a descriptive `Error`. Never use the `.claude` prefix rule here; E5 pins this.
  - `ownerForRootKey`: `'core'` → `'core'`; `/^hosts\/([^/]+)$/` → the group; anything else throws `` Error(`ownerForRootKey: unexpected root key "${key}"`) ``.
- **D4 — FU-1.** The collision check stays over **every** root. Only after it: `if (COMPAT_ROOT_KEYS.has(root.key)) compatEntries.push(entry);`. `writeCompat !== false` gates only the compat file write. Both doc comments say "core + hosts/claude".
- **D5 — Thin CLI entry.** It follows blueprint steps 1–5: per-root write with `writeCompat: false`, `buildViewManifest` over the flat view with `now` pinned to `multi.compat.generated_at`, the `JSON.stringify(files)` tripwire with exit 1, then the compat write. It also prints `[...new Set(unclassifiedPaths)]` and names `src/lib/manifest-builder.ts` in the hint (M3-A10).
- **D6 — `manifest.ts`.**
  - `import type { HostName } from '../hosts/types.js';`
  - `LEGACY_INSTALLED_HOSTS = Object.freeze(['claude'])`
  - `installedHosts = snapshot?.hosts ? [...snapshot.hosts] : [...LEGACY_INSTALLED_HOSTS]`
  - `entryOwner = entry.owner ?? (p === '.claude' || p.startsWith('.claude/') ? 'claude' : 'core')`; E6 pins the boundary.
  - `mergeInstalledHosts` is the M3-A2 one-liner.
  - `loadInstallSnapshot` is byte-unchanged.
- **D7 — `init.ts` bridge.**
  - Call `buildInstallView({ roots: [{ key: 'core', dir: path.join(resolved.payloadDir, 'core') }, { key: 'hosts/claude', dir: path.join(resolved.payloadDir, 'hosts', 'claude') }], dst: tempDir, cleargateVersion: readRunningCliVersion() })`.
  - `readRunningCliVersion()` walks up from `path.dirname(fileURLToPath(import.meta.url))` to the first `package.json` with `name === 'cleargate'`, returns its `version`, and falls back to `'0.0.0'`. E8 pins the value.
  - Delete `resolveCliPackageRoot` and its doc. Delete `pathToFileURL` from the `node:url` import, and the `composePayload` import.
  - The strings `resolveCliPackageRoot` and `build-manifest` must not appear **anywhere** in `init.ts`, comments included. Scenario 10 is a raw substring check.
  - The `ScaffoldSourceError` catch and the cleanup are unchanged.
- **D8 — M3-A1.** Insert `const include = payloadFilter(registry, selected);` directly above `const copyReport = copyPayload(`, and pass `include,`.
- **D9 — Step 7 = M3-A7 verbatim** (the code block in `plans/M3.md` M3-A7).
  - `rehashedFiles = pkgManifest.files.filter((e) => include(e.path)).map(<unchanged body>)`.
  - `listed` and the sort are as in M3-A2.
  - The snapshot literal ends `pin_version: pinVersion, hosts: hostsAfter,`.
  - `POST_PROCESSED_FILES` keeps its exact text.
- **D10 — FU-3.**
  - `scripts/verify-pack-checks.mjs` is plain ESM and exports `checkCompatPayload({ packedFiles, compatManifest })`.
  - The presence check is independent. The owner checks are the M3-A11 `else if` chain, and every message names the path.
  - In `verify-pack.mjs`, check 3c goes after 3b. It imports `./verify-pack-checks.mjs` via `pathToFileURL(path.join(pkgRoot, 'scripts', 'verify-pack-checks.mjs'))`, reads `templates/cleargate-planning/MANIFEST.json`, and runs exactly `errors.push(...checkCompatPayload({ packedFiles: files, compatManifest }));`. E7 pins this.
- **D11 — `test/helpers/scaffold-roots.ts`.** Keep the signature `composeCanonicalPayload(dst: string): Promise<void>`. The body is:
  - a dynamic import of `pathToFileURL(path.join(CLI_ROOT, 'src', 'lib', 'manifest-builder.ts')).href`
  - then `buildInstallView({ roots: [{ key: 'core', dir: SCAFFOLD_CORE }, { key: 'hosts/claude', dir: SCAFFOLD_CLAUDE }], dst, cleargateVersion: <JSON.parse(fs.readFileSync(path.join(CLI_ROOT, 'package.json'))).version> })`

  This is the only `test/` file the Dev edits.
- **D12 — Run discipline.**
  - `npm run typecheck`.
  - Run each file solo.
  - **Commit before** `init-from-source-dist`: it `git clone`s `HEAD`, so uncommitted `src/` is invisible to it.
  - Run the parity files in compare mode only, never with a capture flag.
  - `npm run prebuild` is allowed. `npm run build` never runs in the main checkout (rule 11).
- **D13 — Sealed after re-seal.** Every red and amended file, and `test/helpers/init-fixture.ts`, is sealed. The Q1 helper change is QA-Red's E1 and never the Dev's.

## Re-seal edits E1–E9 (QA-Red, one commit on `story/STORY-058-06`)

Apply the unified diff below verbatim, for example with `git apply`, on `3871857`. `git apply --check` is clean.

| Edit | Where | What |
|---|---|---|
| E1 | `test/helpers/init-fixture.ts` `captureOrCompare` | strict `currentHash` (Q1 / M3-A8) |
| E2 | `init-host-snapshot.red` | new scenario 15 test: a record on the **baseline** hash fails, naming the path |
| E3 | 21(b) | `.agents/skills/demo/SKILL.md` survives (M3-A7) |
| E4 | new 21(e) | a no-longer-shipped core entry is not carried |
| E5 | `manifest-host-ownership.red` | new scenario 2b: `buildViewManifest` owner by provenance |
| E6 | scenario 7 | `.clauderc` → core, `.claude` → claude |
| E7 | `verify-pack-compat.red` | 3c wiring static check (+ `node:fs` import) |
| E8 | `init-from-source` scenario 19 | `cleargate_version` equals the cli `package.json` version |
| E9 | 21(a) | `claudeSpy.install` once, plus the snapshot sorted by path |

```diff
diff --git a/test/commands/init-from-source.node.test.ts b/test/commands/init-from-source.node.test.ts
index a3bd8b1..16870f9 100644
--- a/test/commands/init-from-source.node.test.ts
+++ b/test/commands/init-from-source.node.test.ts
@@ -514,6 +514,7 @@ describe('STORY-058-06 scenario 19: --from-source snapshot has owner + hosts', (
       const snapshotPath = path.join(target, '.cleargate', '.install-manifest.json');
       assert.ok(fs.existsSync(snapshotPath), '.cleargate/.install-manifest.json must exist after a successful --from-source install');
       const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8')) as {
+        cleargate_version?: string;
         files: Array<{ path: string; owner?: string }>;
         hosts?: string[];
       };
@@ -522,6 +523,10 @@ describe('STORY-058-06 scenario 19: --from-source snapshot has owner + hosts', (
         assert.strictEqual(typeof entry.owner, 'string', `snapshot entry ${entry.path} has no owner`);
       }
       assert.deepStrictEqual(snapshot.hosts, ['claude']);
+      // TPV E8: the bundled bridge stamps the running cli's own version, as the
+      // retired scripts/ import did (it read <cli>/package.json).
+      const cliVersion = (JSON.parse(fs.readFileSync(path.join(CLI_ROOT, 'package.json'), 'utf8')) as { version: string }).version;
+      assert.strictEqual(snapshot.cleargate_version, cliVersion);
     } finally {
       cleanup(target);
     }
diff --git a/test/commands/init-host-snapshot.red.node.test.ts b/test/commands/init-host-snapshot.red.node.test.ts
index d11cf28..c841b56 100644
--- a/test/commands/init-host-snapshot.red.node.test.ts
+++ b/test/commands/init-host-snapshot.red.node.test.ts
@@ -309,12 +309,47 @@ describe('Scenario 15 — SANCTIONED_BASELINE_DELTAS neutralizes exactly its own
   });
 });
 
+describe('Scenario 15 (TPV E2) — a sanctioned row never passes on the baseline hash', () => {
+  const REL = '.cleargate/.install-manifest.json';
+  const MODE = 420; // 0o644
+  const BASELINE_HASH = '12efef5a49365b232044de43c0c839fa214ab4094b64d741e83c1cfa58bae26d';
+
+  test('a record still holding the BASELINE hash (delta not landed, or reverted) fails, naming that path', async () => {
+    const { captureOrCompare } = (await import('../helpers/init-fixture.js')) as unknown as {
+      captureOrCompare: (
+        baselineDir: string | undefined,
+        id: 'fresh',
+        record: { files: Array<{ rel: string; sha256: string; mode: number }>; stdout: string; stderr: string },
+      ) => Promise<void>;
+    };
+    const baselineDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-s41-delta15-notlanded-'));
+    try {
+      fs.mkdirSync(path.join(baselineDir, 'fresh'), { recursive: true });
+      fs.writeFileSync(
+        path.join(baselineDir, 'fresh', 'meta.json'),
+        JSON.stringify({ files: [{ rel: REL, sha256: BASELINE_HASH, mode: MODE }], stdout: '', stderr: '' }, null, 2) + '\n',
+      );
+      const record = { files: [{ rel: REL, sha256: BASELINE_HASH, mode: MODE }], stdout: '', stderr: '' };
+      await assert.rejects(
+        () => captureOrCompare(baselineDir, 'fresh', record),
+        (err: unknown) => {
+          assert.ok(err instanceof Error);
+          assert.ok((err as Error).message.includes(REL), `error does not name "${REL}": ${(err as Error).message}`);
+          return true;
+        },
+      );
+    } finally {
+      fs.rmSync(baselineDir, { recursive: true, force: true });
+    }
+  });
+});
+
 // ── Scenario 21(a)-(c) — M3-A2: snapshot hosts is the INSTALLED set ──────────
 // (plans/M3.md "As-built resolution after STORY-058-04", M3-A2)
 
 describe('Scenario 21 — M3-A2: snapshot hosts is the installed set, not this run\'s selection', () => {
   test('21(a): claude then codex — hosts is ["claude","codex"]; claude entry survives; .claude/** untouched by pass 2', async () => {
-    const { registry, fakeCodex } = await makeR2();
+    const { registry, fakeCodex, claudeSpy } = await makeR2();
     const record = await runInitScenario('reinit', {
       primeExtra: { hostRegistry: registry, hosts: ['claude'], readInstallManifest: () => STUB4_MANIFEST },
       extra: { hostRegistry: registry, hosts: ['codex'], readInstallManifest: () => STUB4_MANIFEST },
@@ -328,6 +363,13 @@ describe('Scenario 21 — M3-A2: snapshot hosts is the installed set, not this r
     assert.ok(fs.existsSync(settingsPath), '.claude/settings.json must still exist after pass 2');
     // codex-only pass 2 must never re-run claude's install() surgery.
     assert.equal(fakeCodex.install.mock.calls.length, 1, 'fakeCodex.install must run exactly once (pass 2 only)');
+    // TPV E9: the assertion the comment above names, plus the M3-A2 sort rule.
+    assert.equal(claudeSpy.install.mock.calls.length, 1, 'claude install() must run exactly once (pass 1 only)');
+    assert.deepStrictEqual(
+      paths,
+      [...paths].sort((a, b) => a.localeCompare(b)),
+      'a snapshot that carries entries forward stays sorted by path',
+    );
   });
 
   test('21(b): claude+codex then no flag — hosts stays ["claude","codex"]; .codex/fake.toml survives byte-unchanged', async () => {
@@ -340,6 +382,12 @@ describe('Scenario 21 — M3-A2: snapshot hosts is the installed set, not this r
     assert.deepStrictEqual(snapshot.hosts, ['claude', 'codex']);
     const paths = snapshot.files.map((f) => f.path);
     assert.ok(paths.includes('.codex/fake.toml'), `the .codex/fake.toml entry must survive a no-flag pass 2, got: ${paths.join(', ')}`);
+    // TPV E3 (M3-A7): codex is still installed and declares .agents as a
+    // sharedRoot, so the core-owned .agents/** entry must survive too.
+    assert.ok(
+      paths.includes('.agents/skills/demo/SKILL.md'),
+      `the core-owned .agents/** entry shared by still-installed codex must survive a no-flag pass 2, got: ${paths.join(', ')}`,
+    );
   });
 
   test('21(c): a fresh dir with hosts: ["codex"] gives hosts ["codex"] (kills the installedHosts(null) mutant)', async () => {
@@ -352,6 +400,29 @@ describe('Scenario 21 — M3-A2: snapshot hosts is the installed set, not this r
   });
 });
 
+describe('Scenario 21(e) (TPV E4) — re-init never carries an entry the payload stopped shipping', () => {
+  test('21(e): claude then claude, the payload dropped a core file — its entry is gone from the snapshot', async () => {
+    const { registry } = await makeR2();
+    const GONE = {
+      path: '.cleargate/gone.md',
+      sha256: 'e'.repeat(64),
+      tier: 'protocol',
+      overwrite_policy: 'merge-3way',
+      preserve_on_uninstall: false,
+      owner: 'core',
+    } as ManifestFile['files'][number];
+    const primeManifest: ManifestFile = { ...STUB4_MANIFEST, files: [...STUB4_MANIFEST.files, GONE] };
+    const record = await runInitScenario('reinit', {
+      primeExtra: { hostRegistry: registry, hosts: ['claude'], readInstallManifest: () => primeManifest },
+      extra: { hostRegistry: registry, hosts: ['claude'], readInstallManifest: () => STUB4_MANIFEST },
+    });
+    const snapshot = readSnapshot(record.dir);
+    const paths = snapshot.files.map((f) => f.path);
+    assert.ok(!paths.includes('.cleargate/gone.md'), `a no-longer-shipped core entry must not be carried forward, got: ${paths.join(', ')}`);
+    assert.deepStrictEqual(snapshot.hosts, ['claude']);
+  });
+});
+
 // ── Scenario 21(d) — mergeInstalledHosts unit ────────────────────────────────
 
 describe('Scenario 21(d) — mergeInstalledHosts unit', () => {
diff --git a/test/helpers/init-fixture.ts b/test/helpers/init-fixture.ts
index 57e93f7..a3ffde3 100644
--- a/test/helpers/init-fixture.ts
+++ b/test/helpers/init-fixture.ts
@@ -477,22 +477,16 @@ export async function captureOrCompare(
       delta.baselineHash(id),
       `sanctioned delta "${delta.rel}" (${delta.item}): baseline hash mismatch at scenario "${id}"`,
     );
-    // The delta only takes effect once the item's implementation actually
-    // lands and changes this file's bytes — until then the current run's
-    // hash is still the OLD (baseline) one, which is expected, not a
-    // regression ("the record sha == currentHash ONLY WHEN the snapshot
-    // changed" — Cross-story risks → "Rule-2 parity"). Accept either; a
-    // THIRD, unexpected hash is a real defect.
-    const expectedCurrent = delta.currentHash(id);
-    const stillMatchesBaseline = recordEntry.sha256 === delta.baselineHash(id);
-    const matchesLandedDelta = recordEntry.sha256 === expectedCurrent;
-    if (!stillMatchesBaseline && !matchesLandedDelta) {
-      throw new Error(
-        `sanctioned delta "${delta.rel}" (${delta.item}): current hash ${recordEntry.sha256} matches ` +
-          `neither the baseline (${delta.baselineHash(id)}, not-yet-landed) nor the sanctioned delta ` +
-          `(${expectedCurrent}, landed) at scenario "${id}"`,
-      );
-    }
+    // Hash-anchored on BOTH sides (plans/M3.md T1 item 2, M3-A8): the current
+    // run must hold exactly the sanctioned post-delta bytes. A run that still
+    // holds the baseline hash means the delta has not landed, or a later
+    // change reverted it; both are Rule-2 failures, never a pass.
+    assert.strictEqual(
+      recordEntry.sha256,
+      delta.currentHash(id),
+      `sanctioned delta "${delta.rel}" (${delta.item}): current hash mismatch at scenario "${id}" ` +
+        `(equal to the baseline hash means the delta has not landed or was reverted)`,
+    );
     assert.strictEqual(
       storedEntry.mode,
       recordEntry.mode,
diff --git a/test/lib/manifest-host-ownership.red.node.test.ts b/test/lib/manifest-host-ownership.red.node.test.ts
index d412af9..d984e8b 100644
--- a/test/lib/manifest-host-ownership.red.node.test.ts
+++ b/test/lib/manifest-host-ownership.red.node.test.ts
@@ -154,6 +154,35 @@ describe('Scenario 2 — FU-1: compat excludes non-claude hosts and equals the f
   });
 });
 
+// ── Scenario 2b (TPV E5) — buildViewManifest owner is provenance, not prefix ─
+
+describe('Scenario 2b — buildViewManifest derives owner from the source root, not the .claude prefix', () => {
+  it('a non-claude host root composed into a view stamps that host as owner, even under .claude/**', async () => {
+    const fixture = makeOwnershipFixture();
+    const composed = mkTmp('mho-view-fake-');
+    try {
+      const { composePayload } = await loadScaffoldLayout();
+      composePayload([path.join(fixture, 'core'), path.join(fixture, 'hosts', 'fake')], composed);
+      const manifestBuilder = await loadManifestBuilder();
+      const view = manifestBuilder.buildViewManifest({
+        viewDir: composed,
+        roots: [
+          { key: 'core', dir: path.join(fixture, 'core') },
+          { key: 'hosts/fake', dir: path.join(fixture, 'hosts', 'fake') },
+        ],
+        cleargateVersion: 'x',
+        now: frozenNow,
+      });
+      const ownerOf = new Map(view.files.map((f: { path: string; owner?: string }) => [f.path, f.owner]));
+      assert.strictEqual(ownerOf.get('.claude/agents/fake-only.md'), 'fake');
+      assert.strictEqual(ownerOf.get('.cleargate/knowledge/k.md'), 'core');
+    } finally {
+      rmTmp(fixture);
+      rmTmp(composed);
+    }
+  });
+});
+
 // ── Scenario 3 — collision stays all-roots ──────────────────────────────────
 
 describe('Scenario 3 — collision detection stays all-roots (regression guard — STORY-058-02 behaviour)', () => {
@@ -331,6 +360,9 @@ describe('Scenario 7 — legacy default (Gherkin 3, unit)', () => {
     assert.strictEqual(manifestLib.entryOwner({ path: '.cleargate/k.md' }), 'core');
     assert.strictEqual(manifestLib.entryOwner({ path: '.claude/x', owner: 'core' }), 'core');
     assert.strictEqual(manifestLib.entryOwner({ path: '.codex/x', owner: 'codex' }), 'codex');
+    // TPV E6: the legacy rule is a path-segment boundary, not a string prefix.
+    assert.strictEqual(manifestLib.entryOwner({ path: '.clauderc' }), 'core');
+    assert.strictEqual(manifestLib.entryOwner({ path: '.claude' }), 'claude');
   });
 
   it('installedHosts defaults to the legacy ["claude"] for null/undefined/hosts-absent snapshots', async () => {
diff --git a/test/scripts/verify-pack-compat.red.node.test.ts b/test/scripts/verify-pack-compat.red.node.test.ts
index d1de5bd..1efd8f8 100644
--- a/test/scripts/verify-pack-compat.red.node.test.ts
+++ b/test/scripts/verify-pack-compat.red.node.test.ts
@@ -15,6 +15,7 @@
  */
 import { describe, it } from 'node:test';
 import assert from 'node:assert/strict';
+import * as fs from 'node:fs';
 import * as path from 'node:path';
 import { fileURLToPath, pathToFileURL } from 'node:url';
 
@@ -79,6 +80,20 @@ describe('Scenario 16 — checkCompatPayload: consistent pair', () => {
   });
 });
 
+// ── Wiring (TPV E7) — check 3c runs inside verify-pack.mjs ───────────────────
+
+describe('Scenario 16 — check 3c is wired into scripts/verify-pack.mjs', () => {
+  it('verify-pack.mjs loads verify-pack-checks.mjs and pushes checkCompatPayload results into errors', () => {
+    const src = fs.readFileSync(path.join(CLI_ROOT, 'scripts', 'verify-pack.mjs'), 'utf8');
+    assert.match(src, /verify-pack-checks\.mjs/, 'verify-pack.mjs never loads scripts/verify-pack-checks.mjs (FU-3 check 3c not wired)');
+    assert.match(
+      src,
+      /errors\.push\(\s*\.\.\.checkCompatPayload\(/,
+      'verify-pack.mjs never pushes checkCompatPayload(...) results into errors (FU-3 check 3c not wired)',
+    );
+  });
+});
+
 // ── Negative controls (each introduced ALONE) ────────────────────────────────
 
 describe('Scenario 16 — checkCompatPayload: negative controls, one error naming the path each', () => {
```

## Expected counts after re-seal

**At the re-seal commit** (the -06 src is absent), each file solo:

| File | Tests | Pass | Fail | Green-by-design |
|---|---|---|---|---|
| `test/lib/manifest-host-ownership.red.node.test.ts` | 18 | 3 | 15 | 3, 4b, 4c |
| `test/commands/init-host-snapshot.red.node.test.ts` | 13 | 4 | 9 | 15.1–15.3, E2 |
| `test/scripts/verify-pack-compat.red.node.test.ts` | 7 | 0 | 7 | — |
| `test/lib/manifest-legacy-snapshot.red.integration.node.test.ts` | 1 | 1 | 0 | 17 |
| `test/scripts/scaffold-layout.red.node.test.ts` | 18 | 17 | 1 | the 17 sealed -02 tests |
| `test/commands/init-from-source.node.test.ts` | 11 | 10 | 1 | the 10 sealed tests |
| `test/commands/init-from-source-dist.integration.node.test.ts` | 2 | 1 | 1 | unchanged by the re-seal |
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (compare) | 5 | 0 | 5 | intended red: `.cleargate/.install-manifest.json` "has not landed" |
| `test/commands/init-host-parity.red.integration.node.test.ts` (compare) | 15 | 0 | 15 | intended red, same message |
| -03/-04 contract files | 19 / 11 / 10 / 4 | all | 0 | unchanged |

- `npm run typecheck` exits 0.
- The baseline hash is unchanged (`bdc4bb1a…4a62b2`, 425 files).

**After a Dev commit that obeys D1–D13:**
- every row is all-pass: 18/18, 13/13, 7/7, 1/1, 18/18, 11/11, 2/2, 5/5, 15/15
- the contract files are 19, 11, 10 and 4
- the witness sweep has no new failing names

## Script Incidents

None. No `.cleargate/scripts` wrapper was invoked. Every execution was one of:
- `npm run test:file`/`typecheck`/`prebuild`/`build` inside the scratch clones
- read-only `git show`/`diff`/`log`/`status`/`apply --check` against the main checkout
- `shasum` on the read-only baseline

Version check: no dependency is added or pinned, so `npm view` is not applicable.

flashcards_flagged:
  - "2026-09-25 · #test-harness #tpv #host · Sanctioned-delta rows assert currentHash strictly; dual-accept let a build that never wrote hosts pass parity."
  - "2026-09-25 · #manifest #host #danger · Carrying only owner!=='core' drops .agents/** of a still-installed host; carry via payloadFilter(installed)."
  - "2026-09-25 · #manifest #scaffold · realpathSync(<pkgRoot>/scaffold) throws ENOENT in installed pkgs and tmp fixtures; wrap the equality in try/catch."
  - "2026-09-25 · #test-harness #tpv · find|sort|xargs shasum splits 'Sprint Plan Template.md'; hash payload trees with -print0 | sort -z | xargs -0."
  - "2026-09-25 · #manifest #tpv · walkDir pushes every stray into global unclassifiedPaths per walk; a two-walk build warns twice unless deduped."

STATUS=done
