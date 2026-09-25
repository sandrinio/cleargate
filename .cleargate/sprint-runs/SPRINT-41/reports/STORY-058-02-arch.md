# STORY-058-02 — Architect post-flight

role: architect

STORY: STORY-058-02 · SPRINT-41 · M1 (wave5)

Reviewed: cli `story/STORY-058-02`. Base `464e1e4`, reds `20a40ff`, implementation `477b942`, QA-bounce fix `358ae35`. Production diff reviewed in full: `git diff 20a40ff..358ae35 -- src scripts .gitignore` (12 files, +584/−70). I also read `tsup.config.ts` and `test/helpers/scaffold-roots.ts`, and skimmed the test repoint for structure only. Preflight covered `sprint-context.md`, `plans/M1.md` §STORY-058-02 (Names (TPV R1) and carry-forwards 1–5), `plans/M2.md` and `reports/STORY-058-02-{tpv,dev,qa}.md`, including the dev report's "QA bounce 1 — rework" addendum. I grepped FLASHCARD.md for `#scaffold #npm #tsup #host`.

Nothing was built. I ran no suite and made no write inside either repo. The only execution was one read-only probe: a plain-`node` import of `scripts/build-manifest.ts` against a fixture in my session scratchpad, which I deleted afterwards. I ran no `run_script.sh` invocation.

## 1. Conformance to M1 §STORY-058-02 and Names (TPV R1)

| Contract item | As built (358ae35) | Verdict |
|---|---|---|
| `REQUIRED_ITEMS` exported as `ReadonlyArray<{path; type: 'dir'\|'file'}>` | `src/lib/scaffold-source.ts:50-54`. It covers `core/.cleargate` (dir), `hosts/claude/.claude` (dir) and `hosts/claude/CLAUDE.md` (file). The check at `:144-154` goes through `resolveCaseExact` (`:63-86`). That helper walks `readdirSync(withFileTypes)` with exact `dirent.name` and type checks, so symlinks and wrong case both fail. `PATH_MISSING`/`LAYOUT_INVALID` and `missing[]` are unchanged. | Conformant |
| `enumerateScaffoldRoots(scaffoldRoot)` in `scaffold-layout.mjs` + `.d.mts`, returning `{name,key,kind,dir}[]`, core first, hosts sorted, `key` = `'core'`/`'hosts/<name>'` | `src/lib/scaffold-layout.mjs:190-217` and `.d.mts:33-49`. Symlinked hosts throw; stray files are skipped. | Conformant. Two gaps, both non-blocking: M1's "invalid names … rejected" is not implemented (any directory name is enumerated), and the sort uses `localeCompare` rather than code-unit order. Both go to -10 in Follow-ups (FU-6). |
| `buildManifest({scaffoldRoot})` → `{perRoot, compat, unclassified}`, with `manifest === compat` and a per-call `unclassified` (the module-level `unclassifiedPaths` stays) | `scripts/build-manifest.ts:337-339` dispatches to `buildMultiRootManifest` (`:481-559`). It returns `manifest: compat` (the same object), `perRoot` keyed by `root.key`, and `unclassified` prefixed with the root key. `walkDir`'s sink is additive at `:411-440`. | Conformant with one latent deviation, FU-1 below: `compat` is the union of core and **every** host, not core + `hosts/claude`. |
| Per-root `templates/scaffold/<key>/MANIFEST.json` plus the compat manifest at `templates/cleargate-planning/MANIFEST.json` | Per-root writes happen at `:524-529` (into `root.dir`) and the compat write at `:539-544`. The CLI entry `:570-577` points `scaffoldRoot` at `<pkg>/templates/scaffold`, which is the sanitized split view. | Conformant |
| Within-view collision check ignores `MANIFEST.json` | `:510-519`. It skips `MANIFEST.json` and throws a descriptive error naming both roots. | Conformant. The check is stricter than specified: all roots against all roots, not core against each host. Accepted; see §3. |
| `copy-planning-payload.mjs` emits the split view from the same enumeration; `.gitignore` gains `templates/scaffold/` | `scripts/copy-planning-payload.mjs:42-84` and `.gitignore:6` | Conformant |
| `verify-pack.mjs` derives roots from source enumeration and checks per-root presence, the per-root MANIFEST and the manifest entries | `scripts/verify-pack.mjs:25-28,70-98` | Conformant. One gap, FU-3: no check that compat entries are present in the flat view. |
| Carry-forward 1: `composePayload(roots, dst, {ensureRequiredEmptyDirs = true} = {})` | `scaffold-layout.mjs:162`, used with `false` for host views at `copy-planning-payload.mjs:82` | Conformant |
| Carry-forward 2: descriptive symlink and dir/file collision errors | `scaffold-layout.mjs:107-137` | Mostly conformant. Through `--from-source` these errors surface as a raw rethrown `Error`, not as `LAYOUT_INVALID` with exit 2 (FU-7). |
| Carry-forwards 3–5, test repoint (70 files), guard allowlist | Verified by QA §6–§7. I re-checked `test/helpers/scaffold-roots.ts:20-63`. | Conformant |
| `src/lib/manifest.ts` dev fallback moved to `<cli>/templates/cleargate-planning` | `src/lib/manifest.ts:126-134` | Conformant. The comments at `:93` and `:108` still name the old sibling (nit, FU-12). |
| `--from-source` bridge: owned temp dir, shared manifest builder, flat pipeline, cleanup in `finally` after Step 7, supplied source never written | `src/commands/init.ts:283-351` (bridge), `try` at `:366`, `finally` at `:727-734`. The only consumer after the finally is Step 7.6+, which does not read `payloadDir`: its last read is `:673`. No `exit()` or early `return` sits inside the try; every `exit` call site (`:266`, `:277`, `:347`, `:359`) is before `:366`. | Conformant |

## 2. Rulings on the Developer's unilateral calls

**(i) Identifier renames that clear the guard's proximity match — ACCEPT.**
- `enforcement-doc-coherence` and `ratchet-retired` now route every canonical read through `canonicalPath()`. The renamed `metaOverrideEnv` feeds only the live-side `REPO_ROOT`.
- QA §3 reproduced the 120-character false positive, and I agree it is legitimate.
- Follow-up FU-10 (at close): the guard's window heuristic is brittle. A later test that legitimately keeps a META_ROOT live read next to a canonical literal will hit the same trap. Replace it with a call-site match (`path.join(<ROOT_ID>, …'cleargate-planning'…)`) when the guard is next unsealed.

**(ii) Non-literal dynamic import of `scripts/build-manifest.ts` via `resolveCliPackageRoot` — ACCEPT for SPRINT-41, with a structural follow-up to -06.**
- Why it is sound today:
  - A static import would bundle the `isMain` IIFE into `dist/cli.js` (dev plan deviation 2 is correct).
  - `resolveCliPackageRoot` (`init.ts:189-210`) matches on structure: `package.json` has `name === 'cleargate'` and `scripts/build-manifest.ts` exists. That survives unbundled, bundled and alternate out-dir runs.
  - An installed npm package has no `scripts/` (`package.json` `files` = dist, templates, docs), so it degrades to `ScaffoldSourceError` `PATH_MISSING` with exit 2. It does not crash.
  - Plain-node `.ts` import works. `build-manifest.ts` uses only erasable syntax (`import type`, an inline `type` specifier, the `.mjs` sibling). I confirmed the import with plain `node` v25.9.0 in my probe; `engines.node >=24` covers type stripping.
- Costs accepted for now:
  - `--from-source` no longer works from an installed package. Before -02 it did, with the flat snapshot.
  - Under dogfood, `dist` (built from `main` at BD) loads `scripts/build-manifest.ts` from the working tree, which can be a story branch.
- Follow-up FU-2 (-06, which already owns `build-manifest.ts` next per M1's 02 → 06 coupling):
  - Move the manifest core (`TIER_RULES`, `INTENTIONALLY_UNTRACKED`, classify, walk, `buildManifest`, `buildMultiRootManifest`) into `src/lib/` so it is bundled. `scripts/build-manifest.ts` then becomes a thin CLI entry.
  - Delete the dynamic import and `resolveCliPackageRoot`.
  - This is also a hard need for -10, which has to produce a manifest at runtime from an installed package (M2 amendment item M2-A10).

**(iii) `composeCanonicalPayload` also writes `MANIFEST.json` — ACCEPT.**
- It reproduces exactly what `init` consumes: a flat core+claude payload with `REQUIRED_EMPTY_DIRS` plus a root `MANIFEST.json`. That is the same recipe the `--from-source` bridge uses (`init.ts:305-335`), so tests exercise the shipped shape.
- The manifest carries the real clock and the cli `package.json` version, so it is nondeterministic. That is harmless: `copyPayload` `SKIP_FILES` it, and M2's fixture stubs `readInstallManifest`.
- Constraint for callers, recorded in M2 V1: `dst` must be a fresh or nonexistent directory, because `composePayload` never clears `dst`.
- It goes through the legacy single-root builder, so FU-2 and FU-1 must update it together with the bridge.

**(iv) Rework integration test builds in a clone, not with `tsup --out-dir` in `CLI_ROOT` — ACCEPT.**
- The Dev's reading is correct. `tsup.config.ts:60-64` computes `pkgRoot` from `new URL('.', import.meta.url).pathname`, which is the config file's own directory, and copies `templates/cleargate-planning/MANIFEST.json` to the literal `<pkgRoot>/dist/MANIFEST.json`.
- `--out-dir` does not redirect that write. A side build from the main checkout therefore overwrites the live `dist/MANIFEST.json`, which doctor and upgrade read through `manifest.ts:113-116`, while leaving the out-dir build without a manifest. Rule 11 makes that live-enforcement contamination.
- **Yes, the tsup behaviour is a latent hazard.** It rates a flashcard (flagged below) and follow-up FU-8 (at close):
  - make the config a function, `defineConfig((opts) => …)`, and copy to `opts.outDir ?? 'dist'`
  - use `fileURLToPath` instead of `.pathname`: an unescaped `%20` breaks the `existsSync` in a checkout path containing a space, and `dist/` then silently ships without `MANIFEST.json`
- The clone pattern is the right harness regardless. `git clone` of a local repo checks out the source's current `HEAD`, so the test grades committed code only. The Dev and QA-Red must commit before running it (recorded in M2-A7).

## 3. Structural fitness for M2/M3

**Two views.** Prebuild now emits:
- (a) the flat compat view `templates/cleargate-planning/` (= `composePayload([core, claude])`, with `REQUIRED_EMPTY_DIRS`, one compat `MANIFEST.json`)
- (b) the split view `templates/scaffold/{core,hosts/<h>}/`: each root composed alone, `REQUIRED_EMPTY_DIRS` only in core, a `MANIFEST.json` at each root

Only these two ship. The raw `scaffold/` is **not** in the tarball.

Which view each story consumes (decided):

| Story | Consumes | Why |
|---|---|---|
| -03 | Flat view (`payloadDir`: npm default / `--from-source` temp / test `composeCanonicalPayload`) | Byte-parity with the pre-M2 install is the whole story. The adapter reads `payloadDir/CLAUDE.md`, which exists only in a flat view. |
| -04 | Flat view + `include` filter | With registry = {claude}, the filter is the identity on the flat view. Rule 2's no-flag path stays on the prebuilt flat payload. |
| -06 | Split view per-root manifests (owner provenance) **and** the compat manifest (the snapshot `init` writes) | See below. |
| -10 | Split view, for any non-Claude selection | The flat view has no `.codex/**`, and the raw `scaffold/` is absent from an installed package. |

**Drift risk between the views.**
- Enumeration is shared: `copy-planning-payload.mjs:42-44` calls `enumerateScaffoldRoots` once and picks core + claude from that same list for the flat view.
- Sanitization is shared: both views go through `composePayload`'s `EXCLUDE_DIRS`/`EXCLUDE_FILES`.
- The live drift surface is the **manifest**:
  - The compat manifest is built by walking the split view (`buildMultiRootManifest`), but it describes the flat view.
  - The `--from-source` bridge and `composeCanonicalPayload` build theirs with the legacy single-root walker over a composed flat dir.
  - Equality of the two builders is asserted only by sealed scenario 6's two-file fixture (`scaffold-layout.red.node.test.ts:356-366`).
  - Nothing in `verify-pack` cross-checks compat entries against `templates/cleargate-planning/**`.
- This is where FU-1 hides. My probe:
  - A fixture with `hosts/codex/.codex/agents/x.md` put that path into `unclassified`, not `compat`, because no `TIER_RULES` entry covers `.codex/**` today. So `compat` is observably core + claude **at -02**.
  - A classified path under a second host (`hosts/codex/.claude/agents/a.md`) was pulled into `compat`, and then threw the cross-host collision.
  - Consequence: the first `TIER_RULES` entry for a non-Claude host path (-06's owner work, or -10's codex rules) puts that host's files into `templates/cleargate-planning/MANIFEST.json` and hence `dist/MANIFEST.json`. The no-flag Claude install's `.install-manifest.json` would then list files that were never copied. That is a Claude-observable change (Rule 2 release blocker), and doctor/upgrade would report them missing. Hence FU-1 is a precondition for -06.

**All-vs-all collision.**
- The implementation rejects host-vs-host logical collisions, not only core-vs-host. I accept this as stricter than spec: `--host all` composes hosts together, so a host-vs-host collision is a real install-time error, and it is better caught at build.
- Consequence for -10/-11: a shared-root asset (for example `.agents/skills/**`, shared by portable hosts) must physically live in exactly **one** scaffold root, never duplicated per host (M2-A10).

**Does the per-root manifest give -06 what it needs to derive `owner`?** Yes, for provenance. Every entry in `perRoot[key]` has `owner = key === 'core' ? 'core' : key.slice('hosts/'.length)`, and `buildMultiRootManifest` already holds `root` and a `compatOwner` map (`:500-521`) at the point where each entry is pushed into `compat`. -06 stamps `owner` on the entry there.

Two gaps -06 must close, both FU-2:
1. The legacy single-root builder has no root provenance, so `--from-source` installs and `composeCanonicalPayload` payloads would lack `owner`. -06 routes both through one view-building function shared with prebuild: compose each root into a temp split view, run `buildMultiRootManifest`, compose the flat view, and write compat. A single builder then serves prebuild, `--from-source` and the test helper.
2. The manifest core must be bundled in `src/lib`.

## 4. Defects QA missed

None is blocking at -02. Every item below is latent (it triggers in a later story) or cosmetic. Each is in Follow-ups with an owner.

1. **Compat manifest scope** (`scripts/build-manifest.ts:500-537`). `compatEntries` collects every root's classified entries. Names (TPV R1) says `compat` is core + `hosts/claude`, and the result type's own doc comment says "The core+hosts/claude union" (`:309-316`), which the function doc at `:470-478` ("core+every-host union") contradicts. It is unreachable today, as the probe showed, and deterministic once a non-Claude path is classified. → FU-1 (-06, precondition).
2. **Per-root `MANIFEST.json` collides under multi-root compose.** Each split-view root carries `MANIFEST.json`, and `EXCLUDE_FILES` (`scaffold-layout.mjs:77`) does not list it. So `composePayload([templates/scaffold/core, templates/scaffold/hosts/<h>], tmp)` throws `collision at "MANIFEST.json"` (`copyDir` at `:127-131`). M2's -10 recommendation composes exactly that way. → FU-5 (-10), and M2-A10.
3. **`--from-source` compose errors are not `LAYOUT_INVALID`.** A symlink or dir/file collision inside the supplied source throws a descriptive plain `Error` from `composePayload`. The bridge's catch at `init.ts:339-350` rethrows anything that is not a `ScaffoldSourceError`, so the user gets a stack trace and a non-2 exit, while carry-forward 2 asked for the `LAYOUT_INVALID` path error. The flag is dogfood-only and the message names the path. → FU-7 (at close).
4. **`--from-source` pin derivation reads `<tmpdir>/../../package.json`.** `init.ts:419` resolves `payloadParent` from the temp dir. This is harmless unless `TMPDIR`'s grandparent holds a `package.json`, because the fallback at `:423` then applies. It is not a regression: pre-(-02) it read `<source>/../../package.json`. → FU-9 (at close).
5. **`buildManifest({scaffoldRoot})` writes into `root.dir` by default** (`write` defaults to `true`, `:524-529`). Any caller that passes the raw tracked `scaffold/` without `write: false` dirties `scaffold/core/MANIFEST.json` and `scaffold/hosts/claude/MANIFEST.json`. The CLI entry passes the split view, so it is safe today. → FU-4 (-06).

## Follow-ups

- **FU-1 → STORY-058-06 (precondition, before any `TIER_RULES` entry for a non-Claude path lands).** Restrict `compat` to core + `hosts/claude`. Keep the all-roots collision check. Add a unit test: fixture `hosts/fake/.claude/agents/fake-only.md` (classified, no collision) must appear in `perRoot['hosts/fake']` and must **not** appear in `compat`. Reconcile the two doc comments. -10 re-verifies it before adding codex rules.
- **FU-2 → STORY-058-06.**
  - Move the manifest core into `src/lib/` (bundled) and make `scripts/build-manifest.ts` a thin entry.
  - Retire the dynamic `.ts` import and `resolveCliPackageRoot`.
  - Route prebuild, the `--from-source` bridge and `composeCanonicalPayload` through one view-building function, so `owner` stamping (in the compat loop, `:510-521`) reaches all three.
  - Add the -06 cross-check that `owner: 'claude'` entries all sit under `.claude` (M2 cross-story risk).
- **FU-3 → STORY-058-06.** Extend `verify-pack.mjs` so every compat `MANIFEST.json` entry is present under `templates/cleargate-planning/` in the tarball. That is the flat-view counterpart of check 3b, and it is the net that catches FU-1.
- **FU-4 → STORY-058-06.** In `scaffoldRoot` mode, refuse to write per-root manifests when `scaffoldRoot` resolves to `<pkg>/scaffold` (tracked source), or default `write` to `false` in that mode and make the CLI entry pass `write: true`.
- **FU-5 → STORY-058-10.**
  - Compose non-Claude installs from the split view, excluding each root's `MANIFEST.json`.
  - Build the temp install manifest by merging the selected roots' per-root manifests; this needs FU-2's bundled helper.
  - Shared-root assets live in exactly one scaffold root.
  - Details: M2-A10.
- **FU-6 → STORY-058-10** (the story that adds `hosts/codex`). In `enumerateScaffoldRoots`, reject host names outside `^[a-z][a-z0-9-]*$` with a descriptive error (M1's "invalid names rejected"), and sort with a code-unit comparison (`a < b ? -1 : a > b ? 1 : 0`) instead of `localeCompare`.
- **FU-7 → follow-up at close.** Wrap non-`ScaffoldSourceError` failures from `composePayload` in the `--from-source` bridge as `ScaffoldSourceError{code:'LAYOUT_INVALID', missing:[<path>]}`, giving exit 2. Kept out of the M2 stories on purpose: it touches `init.ts` Step 2, and M2 anchors must stay stable through -03/-04.
- **FU-8 → follow-up at close.** Fix `tsup.config.ts` `onSuccess` so it honours `outDir` and decodes its URL with `fileURLToPath`.
- **FU-9 → follow-up at close.** When `fromSourceTempDir` is set, derive `pinVersion` from `resolveCliPackageRoot`'s `package.json` (or FU-2's replacement), not from `path.resolve(payloadDir, '..', '..')`.
- **FU-10 → follow-up at close.** Replace the sibling guard's 120-character proximity window with a call-site match.
- **FU-11 → follow-up at close.** `test_close_sprint_v21.integration` is flaky at both base and implementation (QA Finding 2); record it in the Reporter's flaky-test list. `gate-run.integration` Scenario 7 is a pre-existing live-config assertion failure (QA Finding 3).
- **FU-12 → follow-up at close.** Fix the stale comments at `src/lib/manifest.ts:93,108`, `src/init/copy-payload.ts:2,52,61` and `src/init/inject-claude-md.ts:16,26`, all of which still name `cleargate-planning/` as a source root. Leave `drift-check.ts` for BUG-085.

## flashcards_flagged

```
flashcards_flagged: [
  "2026-09-25 · #tsup #build #danger · tsup onSuccess derives dist/ from the config URL; --out-dir won't redirect it, so a side build clobbers live dist/MANIFEST.json.",
  "2026-09-25 · #scaffold #host #manifest · Each templates/scaffold/<key>/ root has a MANIFEST.json; composePayload over 2+ split roots collides on it. Exclude it and merge.",
  "2026-09-25 · #host #manifest #danger · buildManifest({scaffoldRoot}) compat takes EVERY host's classified files; the first .codex TIER_RULE leaks into Claude installs."
]
```

## Script Incidents

None. I ran no wrapped script. The only execution was a read-only plain-`node` probe in the session scratchpad.

ARCH=PASS
