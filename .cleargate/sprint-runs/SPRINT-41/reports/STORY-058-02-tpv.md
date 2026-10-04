# STORY-058-02 TPV — Round 1

role: architect

TPV: BLOCKED-WIRING-GAP — the scenario-9 test/** guard can never go green (it flags its own file, the sealed sibling integration red, and the -01 relocation red) and misses 5 real sibling reads; integration scenarios 11 and 12 red on a correct implementation.

Reviewed: cli `story/STORY-058-02` @ `43c4556`. The files are `test/scripts/scaffold-layout.red.node.test.ts` (18 tests) and `test/scripts/scaffold-standalone.red.integration.node.test.ts` (7 tests). The plan is `plans/M1.md` §STORY-058-02, including the corrected carry-forward 5.

## Short answer

A correct, plan-conformant implementation does **not** turn every red green. I measured this against a minimal reference implementation (see Simulation):

- Unit file: 17/18. The `test/**` guard stays red after a complete repoint. The three files it still flags are all sealed QA-Red files, so a Developer cannot fix them.
- Integration file: 5/7. Scenario 11 fails because the plan requires a per-root `MANIFEST.json` in each split view, and that file carries a wall-clock `generated_at`. Scenario 12 fails because `initHandler` always writes `.mcp.json` (`src/commands/init.ts:423-441`), and the expected top-level set leaves it out.

With the nine test-only fixes below, the same reference implementation scores 18/18 and 7/7, and the baseline (`43c4556`) stays red for the right reasons: 17/18, where the only pass is the documented PATH_MISSING regression guard.

## Required QA-Red fixes (test-only)

Line numbers refer to the `43c4556` versions.

### `test/scripts/scaffold-layout.red.node.test.ts`

**F1 — `:384` ALLOWLIST (guard can't be satisfied).** Replace it with four exact paths. There is no pattern and no semantic rule.
```ts
  const ALLOWLIST = new Set<string>([
    // Plan §STORY-058-02: historical, never built — keeps its paths.
    'scripts/migrate-024-citations.mjs',
    // Carry-forward 5 (corrected 2026-09-25): sealed STORY-058-01 red; reads the frozen
    // snapshot's DEPRECATED.md doc-truth and git ls-files census on purpose.
    'test/scripts/scaffold-relocation.red.node.test.ts',
    // This guard's own definition file: its patterns and prose name the banned join.
    'test/scripts/scaffold-layout.red.node.test.ts',
    // Scenarios 10-11: names the sibling path only to assert it is absent and to poison it.
    'test/scripts/scaffold-standalone.red.integration.node.test.ts',
  ]);
```
Evidence: after I deleted all 65 non-sealed hit files (a simulated full repoint), the as-written guard still reported `3 test file(s) … scaffold-layout.red.node.test.ts, scaffold-relocation.red.node.test.ts, scaffold-standalone.red.integration.node.test.ts`. The self-hit comes from the comment prose at `:386-393`. The standalone hit is `:138` `path.join(clonePath, '..', 'cleargate-planning')`.

**F2 — `:395-402` regex block (5 false negatives).** Replace everything from `const NAMED_ROOT_JOIN_RE` through the `META_JOIN_RE` object with this:
```ts
  // Root identifiers, including affixed forms (REPO_ROOT_FROM_TEST, META_ROOT_PLANNING, metaRootDir).
  const ROOT_ID = String.raw`\b\w*(?:META|REPO|CANON|OUTER)_?ROOT\w*\b|\b\w*(?:meta|repo|canon|outer)Root\w*\b`;
  // A 'cleargate-planning' string segment ('cleargate-planning' or 'cleargate-planning/...'),
  // never the in-package destination ('templates', 'cleargate-planning').
  const CP_LIT = String.raw`(?<!['"\x60]templates['"\x60]\s*,\s*)['"\x60]cleargate-planning(?:['"\x60]|/)`;
  // The root id must be USED as a call argument (followed by , or )), never merely declared.
  const ROOT_ARG = String.raw`(?:${ROOT_ID})\s*[,)]`;
  const NAMED_ROOT_JOIN_RE = new RegExp(`${ROOT_ARG}[\\s\\S]{0,120}${CP_LIT}|${CP_LIT}[\\s\\S]{0,120}${ROOT_ARG}`);
  const DOTDOT_CHAIN_JOIN_RE = /(?:['"]\.\.['"]\s*,\s*){1,6}['"]cleargate-planning['"/]/;
  const CLIMB_STRING_RE = /['"`](?:\.\.\/)+cleargate-planning\b/;
  const TEMPLATE_JOIN_RE = /\$\{[^}]+\}\/(?:\.\.\/)*cleargate-planning\b/;
  // Whole-line comments (//, JSDoc *, /*) are prose, not reads.
  const stripLineComments = (src: string): string =>
    src.split('\n').filter((l) => !/^\s*(?:\/\/|\*|\/\*)/.test(l)).join('\n');
  const META_JOIN_RE = {
    test: (s: string) => {
      const code = stripLineComments(s);
      return NAMED_ROOT_JOIN_RE.test(code) || DOTDOT_CHAIN_JOIN_RE.test(code) || CLIMB_STRING_RE.test(code) || TEMPLATE_JOIN_RE.test(code);
    },
  };
```
The current regex misses these five canonical sibling reads. Each resolves to `<cli>/../cleargate-planning`, which is exactly what the plan's repoint deliverable removes:

| File:line | Form the old regex can't see |
|---|---|
| `test/commands/gate-run.integration.node.test.ts:316,327` | `path.resolve(REPO_ROOT, 'cleargate-planning/.claude/…')`, a literal with a `/` suffix (REPO_ROOT = `<cli>/..` at `:138`) |
| `test/hooks/run-id-ledger-attribution.red.node.test.ts:29-31` | `REPO_ROOT_FROM_TEST`, an affixed identifier that `\bREPO_ROOT\b` rejects |
| `test/hooks/stamp-and-gate.node.test.ts:25-28` | `'../../../cleargate-planning/…'`, a climb string |
| `test/wiki/code-map-integration.red.node.test.ts:66-69` | `'../../../cleargate-planning/…'`, a climb string |
| `test/scaffold/enforcement-doc-coherence.node.test.ts:45-66` | a `REL` map of `'cleargate-planning/…'` literals, then `path.join(REPO_ROOT, rel)` |

Measured on the real tree at `43c4556`, before the allowlist: the amended regex keeps all 73 old hits, loses only the guard's own comment-only self-hit, and adds exactly the 5 above. `src/**`/`scripts/**` still names exactly the plan's four files. The `build-manifest.ts:65` comment `${REPO_ROOT}/cleargate-planning/` is not flagged.

I also ran probes on the simulated repointed tree:
- **Hits (6/6):** `path.join(META_ROOT, 'cleargate-planning', …)`, `path.resolve(REPO_ROOT, '..', 'cleargate-planning')`, `` `${META_ROOT}/cleargate-planning/…` ``, a `'../../../cleargate-planning/…'` climb, `REPO_ROOT_FROM_TEST`, and a `'cleargate-planning/…'` literal next to REPO_ROOT.
- **Not flagged:**
  - `path.join(CLI_ROOT, 'templates', 'cleargate-planning')` next to a META_ROOT live-side read
  - `'templates/cleargate-planning/…'`
  - `//`, `/* */` and JSDoc comments that name the join
  - `path.join(tmpDir, 'cleargate-planning', …)` followed by `const REPO_ROOT =`
  - the same probe placed under `test/fixtures/`

**F3 — `:240-244` symlink test (passes today for the wrong reason).** Replace the `assert.throws` predicate so it discriminates:
```ts
        (err: unknown) => {
          assert.ok(err instanceof ScaffoldSourceError);
          assert.strictEqual((err as { code?: string }).code, 'LAYOUT_INVALID');
          const missing = (err as { missing: string[] }).missing;
          // Discriminates NOW: the flat validator never names a hosts/ path.
          assert.ok(missing.includes('hosts/claude/.claude'), `symlinked hosts/claude/.claude not named: ${missing.join(', ')}`);
          assert.ok(!missing.includes('core/.cleargate'), `valid core/.cleargate wrongly flagged: ${missing.join(', ')}`);
          assert.ok(!missing.includes('hosts/claude/CLAUDE.md'), `valid hosts/claude/CLAUDE.md wrongly flagged: ${missing.join(', ')}`);
          return true;
        },
```
Measured: at baseline it now fails with `symlinked hosts/claude/.claude not named: .claude, .cleargate, CLAUDE.md`, and it passes on the reference build. This matches scenario 3's file-for-dir convention that a wrong-typed item goes into `missing[]`.

**F4 — `:262-266` escape test (over-constrained).** The plan says "symlinks and escapes are **rejected**". A descriptive throw is at least as conformant as silently leaving the entry out, but today a throw reds the test. Accept either:
```ts
      let roots: unknown;
      try {
        roots = mod.enumerateScaffoldRoots(src);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        assert.match(message, /evil/, `rejection does not name the symlinked host: ${message}`);
        return;
      }
      const names = (Array.isArray(roots) ? roots : []).map((r: unknown) =>
        typeof r === 'string' ? r : (r as { name?: string })?.name,
      );
      assert.ok(names.includes('claude'), `valid host "claude" missing: ${names.join(', ')}`);
      assert.ok(!names.includes('evil'), `symlinked escaping host "evil" must not be enumerated; got: ${names.join(', ')}`);
```

**F5 — `:344-348` scenario 7 (vacuous).** The fixture holds only two classified files, so an implementation that always returns `unclassified: []` passes. Seed one file per accounting class plus one stray, and assert on the detail (flashcard 2026-08-30 #73):
```ts
      fs.writeFileSync(path.join(scaffoldRoot, 'core', '.gitignore'), 'x\n'); // INTENTIONALLY_UNTRACKED
      fs.writeFileSync(path.join(scaffoldRoot, 'hosts', 'claude', 'CLAUDE.md'), '# c\n'); // INTENTIONALLY_UNTRACKED
      fs.mkdirSync(path.join(scaffoldRoot, 'core', '.cleargate', 'scripts', 'test'), { recursive: true });
      fs.writeFileSync(path.join(scaffoldRoot, 'core', '.cleargate', 'scripts', 'test', 'x.sh'), 'x\n'); // TIER_RULES exclude
      fs.writeFileSync(path.join(scaffoldRoot, 'core', '.cleargate', 'stray.bin'), 'x\n'); // unaccounted
      const result = mod.buildManifest({ scaffoldRoot, now: () => new Date('2026-01-01T00:00:00.000Z'), write: false });
      assert.ok(Array.isArray(result.unclassified), 'buildManifest result has no unclassified[] field');
      assert.strictEqual(result.unclassified.length, 1, `expected exactly the stray file unaccounted, got: ${result.unclassified.join(', ')}`);
      assert.ok(String(result.unclassified[0]).endsWith('.cleargate/stray.bin'), `unexpected unaccounted file: ${result.unclassified[0]}`);
```
`endsWith` accepts either a logical or a root-prefixed report path, so the naming stays open.

### `test/scripts/scaffold-standalone.red.integration.node.test.ts`

**F6 — `:83` hashTree (reds a correct implementation).** Normalize `MANIFEST.json` before hashing. Replace `const buf = fs.readFileSync(abs);` with:
```ts
        let buf = fs.readFileSync(abs);
        // Per-root/compat MANIFEST.json carry a wall-clock generated_at; compare entries only.
        if (entry.name === 'MANIFEST.json') {
          const m = JSON.parse(buf.toString('utf8')) as { generated_at?: string };
          delete m.generated_at;
          buf = Buffer.from(JSON.stringify(m));
        }
```
Measured on the reference build: scenario 11 failed with only two diffs, `core/MANIFEST.json` and `hosts/claude/MANIFEST.json`, and both were `generated_at` changes.

**F7 — `:161-163` and `:173` scenario 11 (poison control incomplete).** Also hash the flat payload that the default install uses. Otherwise a copier that prefers the sibling when it exists passes both scenarios 10 and 11: there is no sibling in 10, and the split view is untouched in 11.
```ts
    const flatOut = path.join(clonePath, 'templates', 'cleargate-planning');
    scaffoldOutBeforePoison = [...hashTree(scaffoldOut), ...hashTree(flatOut).map((e) => ({ ...e, rel: `FLAT/${e.rel}` }))];
    // … after the poisoned prebuild:
    const after_ = [...hashTree(scaffoldOut), ...hashTree(flatOut).map((e) => ({ ...e, rel: `FLAT/${e.rel}` }))];
```
Measured: that mutant is killed only by the amended scenario 11 (`FLAT/.claude/POISON.md` shows up in the diff), and every other scenario stays green.

**F8 — `:212` scenario 12 (reds a correct implementation).** The expected set becomes `['.claude', '.cleargate', '.gitignore', '.mcp.json', 'CLAUDE.md']`. `.mcp.json` is part of today's Claude baseline, because `init.ts:423-441` always creates it. Exact equality is still correct, since rule 2 freezes the default install.

**F9 — `:97-110`, `:220-224`, `:230-234` scenario 13 (depends on readdir order, and the host control isn't independent).**
- Replace `firstFileUnder` with a deterministic victim: the first entry, by path, of the root's own `MANIFEST.json`:
  ```ts
  function manifestVictim(rootDir: string): string {
    const m = JSON.parse(fs.readFileSync(path.join(rootDir, 'MANIFEST.json'), 'utf8')) as { files: Array<{ path: string }> };
    const rel = [...m.files.map((f) => f.path)].sort()[0];
    assert.ok(rel, `per-root MANIFEST.json under ${rootDir} lists no files`);
    return path.join(rootDir, ...rel.split('/'));
  }
  ```
  Why it matters: `npm pack` never ships `.gitignore` files. I measured `gitignore entries: []` in the packed listing, and `templates/scaffold/core/.gitignore` sits next to `.cleargate/`. On any filesystem where readdir doesn't return sorted order, the victim can be that `.gitignore`, and a correct verify-pack then passes.
- In each scenario-13 test, save the victim, delete it, run verify-pack, and restore it in `finally`: `const saved = fs.readFileSync(victim); fs.rmSync(victim); try { … } finally { fs.writeFileSync(victim, saved); }`. Today the core deletion is still in place when the host test runs, so the host test's `status !== 0` assertion proves nothing.

Optional, not blocking: in scenario 8, use a classified path (`.cleargate/knowledge/dup.md` in both roots) so an implementation that checks collisions only among manifest entries isn't bounced. In scenario 6, assert that `result.compat.files` deep-equals `buildManifest({ planningRoot: <composePayload of the same fixture>, write: false }).manifest.files`, which makes "unchanged" literal.

## PLAN AMENDMENT (M1.md §STORY-058-02)

Append to "Carry-forwards from STORY-058-01 post-flight", replacing the operative sentence of item 5:

> 5 (TPV R1, 2026-09-25). Scenario 9's guard allowlist is exactly: `scripts/migrate-024-citations.mjs`, `test/scripts/scaffold-relocation.red.node.test.ts` (sealed -01 red; reads the DEPRECATED.md doc-truth and does the snapshot census), `test/scripts/scaffold-layout.red.node.test.ts` (the guard's own file), and `test/scripts/scaffold-standalone.red.integration.node.test.ts` (names the sibling only to assert its absence and to poison it). It is keyed on exact paths, with no pattern and no semantic exemption. The guard also catches affixed root identifiers, `'cleargate-planning/…'` literals, `'../…/cleargate-planning'` climb strings and `${ROOT}/cleargate-planning` template forms. That adds 5 files to the repoint set (`gate-run.integration`, `run-id-ledger-attribution.red`, `stamp-and-gate`, `code-map-integration.red`, `enforcement-doc-coherence`), for 70 test files in total.

Add after the `scripts/build-manifest.ts` bullet (these pin the names the plan left open; each matches the QA-Red assumption, see rulings):

> Names (TPV R1):
> - `REQUIRED_ITEMS` is **exported** from `scaffold-source.ts` as `ReadonlyArray<{ path: string; type: 'dir' | 'file' }>`.
> - `enumerateScaffoldRoots(scaffoldRoot)` lives in `src/lib/scaffold-layout.mjs` and is declared in `.d.mts`. It returns `{ name, key, kind: 'core' | 'host', dir }[]`, with core first and then the immediate `hosts/*` sorted. `key` is `'core'` or `'hosts/<name>'`.
> - `buildManifest` gains an additive `scaffoldRoot?: string` option. Passing it returns `perRoot: Record<key, ManifestFile>`, `compat: ManifestFile` (core + `hosts/claude`; `manifest === compat`) and `unclassified: string[]` (per call; the module-level `unclassifiedPaths` stays for the CLI warning).
> - The CLI entry calls it with `scaffoldRoot = <pkg>/templates/scaffold` (the sanitized split view). It writes `templates/scaffold/<key>/MANIFEST.json` for each root, plus the compat manifest at `templates/cleargate-planning/MANIFEST.json`.
> - The within-view collision check (core vs each host, on logical paths) ignores `MANIFEST.json`.
> - Scenario 12's expected default-install top level includes `.mcp.json` (Claude baseline, `init.ts:423-441`).

## Rulings on QA-Red "Assumptions for TPV"

| # | Assumption | Ruling | Basis |
|---|---|---|---|
| 1 | `enumerateScaffoldRoots` lives in `src/lib/scaffold-layout.mjs` | **Upheld; pinned by amendment** | Three consumers need it: `build-manifest.ts`, `copy-planning-payload.mjs` ("from the same enumeration") and `verify-pack.mjs` ("derive … from source enumeration"). The last two are plain `.mjs` with no build step, and `scaffold-layout.mjs` is the only builtins-only module they already load (`copy-planning-payload.mjs:28-30`). |
| 2 | `buildManifest({ scaffoldRoot, now, write })` → `{ perRoot, compat, unclassified }` | **Upheld; pinned by amendment** | "Parameterize" and "keep entry shape" support an additive option next to `planningRoot` (`build-manifest.ts:274-285`). The existing callers in `test/scripts/build-manifest.node.test.ts` stay valid. The test's tolerant `perRoot['hosts/claude'] ?? perRoot.claude` is fine. The amendment pins `'hosts/<name>'` so it matches the split-view directory. |
| 3 | `REQUIRED_ITEMS` accepted as `string[]` or `{path}[]` | **Upheld** | Tolerance is correct. The amendment pins `{path, type}[]` ("each with the right type") and requires the **export**, which the plan never stated but the test needs. |
| 4 | `enumerateScaffoldRoots` returns `string[]` or `{name}[]` | **Upheld** | Tolerance is correct; the amendment pins `{name, key, kind, dir}[]`. |
| 5 | Scenario-9 allowlist left unresolved | **Resolved: option (a), extended** | Corrected carry-forward 5 lists `scaffold-relocation.red` by name. Measurement shows two more sealed files must be listed by exact path: the guard file itself and the standalone integration red (F1). Options (b) and (c) are rejected. |
| 6 | Guard regex strengthened beyond named identifiers | **Upheld in direction, insufficient** | The src/scripts half is exact (4 files). The test half has 5 false negatives (F2). |

## Check table

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Scenario ↔ plan mapping (1-13, cf1-2) | **Mapped; 2 gaps** | Every scenario has a test. Gaps: scenario 7 is vacuous (F5), and scenario 9 misses 5 sibling reads (F2). Carry-forwards 3-4 (the DEPRECATED.md-gone assertion, `test_version_bump_alignment:137`), the `init.ts` `--from-source` bridge and `test/helpers/scaffold-roots.ts` have no red test. The plan assigns them to the repointed files (`init-from-source.node.test.ts`, `init.node.test.ts`, …), so the Developer owns them and QA-Verify checks them. Not blocking. |
| 2 | Names and locations | **Conformant, 2 over-constraints** | `composePayload(roots, dst, { ensureRequiredEmptyDirs })` and `templates/scaffold/{core,hosts/<host>}` match the plan verbatim. `PATH_MISSING`/`LAYOUT_INVALID` + `missing[]` are preserved. `resolveScaffoldRoot` returning the source root as `payloadDir` is correct (it stays read-only; `init.ts` does the composing). `test/helpers/scaffold-roots.ts` isn't referenced by the reds, so there's no conflict. Over-constraints: the escape test rejects a throw (F4), and scenario 12 omits `.mcp.json` (F8). |
| 3 | Scenario-9 guard | **FAIL as written** | Unsatisfiable (F1): it flags itself, the standalone red and the relocation red. It has 5 false negatives (F2). The amended guard measured green after a simulated repoint, with no false positives on the destination, comments, fixtures or declarations. |
| 4 | Frozen sets / growing trees | **PASS** | Scenario 5 uses `includes`. Scenarios 6-8 use synthetic fixtures. Scenario 10 uses `length > 0` per root. Scenario 13 works per root. Verify-pack in the reference build enumerates from source, so a later `hosts/codex` needs no test edit. `REQUIRED_ITEMS` and the scenario-3 `missing` equality are spec constants, not tree censuses. Scenario 12's exact top-level set is rule-2-frozen (default stays Claude-only). |
| 5 | Integration feasibility and hygiene | **Feasible; 3 defects** | `--no-hardlinks` clone, symlinked `node_modules`, short `/private/tmp/claude-501/cg5802-*`, build/pack/verify inside the clone, fixed pin, `CLEARGATE_REPO_ROOT` set and restored, `PROBE_STUB`: all correct. Runtime measured at 9.6-11.7s. Excluded from default `npm test` (`package.json:46` `!test/**/*.integration.node.test.ts`; `run-default-tests.mjs:22-29`). The poisoned sibling is real (next to the clone). Defects: scenario 11 `generated_at` (F6) plus the unhashed flat payload (F7), scenario 12 `.mcp.json` (F8), scenario 13 victim and independence (F9). Scenario 12 runs the source `initHandler` against the tarball's payload, not the tarball's `dist`. That is acceptable here; the true packed-artifact install is rule 8 / STORY-058-08. |
| 6 | "Wrong reason" passes | **Symlink restructured (F3); PATH_MISSING OK** | After F3, the baseline fails on the discriminating assertion and the reference build passes. PATH_MISSING stays an honest, documented regression guard (`scaffold-source.ts:76-84` is unchanged by the plan). |
| 7 | Dynamic imports, tsc, cleanup, no outer writes | **PASS** | Per-test `pathToFileURL` imports in the unit file. The static `initHandler` import in the integration file points at an existing module. `tsc --noEmit` exits 0 on both amended files under a scratch tsconfig; it needs `"exclude": []`, because the root tsconfig excludes `**/*.test.ts`. Unit temp dirs are cleaned in `finally`, and integration uses `after()`; no `cg5802-*` was left. The real cli status is unchanged (the same 2 pre-existing untracked files). Outer MAIN has only hook-owned ledger deltas. The live `.claude/` was untouched. |

## Simulation evidence

Scratch: `git clone --no-hardlinks` of the cli into `/private/tmp/claude-501/cg5802/tpv-r1`, checked out at `43c4556` with a symlinked `node_modules`. I deleted it afterwards. The reference implementation had about 140 LOC across 9 files:
- case-exact `REQUIRED_ITEMS` probe via `readdirSync(withFileTypes)`
- `enumerateScaffoldRoots`
- `composePayload` options, symlink rejection and dir/file collision errors
- `buildManifest({ scaffoldRoot })` with per-root, compat and unclassified output, and core-vs-host collision
- split-view emission in the copier, with `ensureRequiredEmptyDirs: kind === 'core'`
- per-root presence and manifest-entry checks in verify-pack
- repoints in `manifest.ts:127-129`, `check-no-exec-mode-vocab.mjs:29`, `check-no-inline-id-regex.mjs:33` and `generate-changelog-diff.ts:222`

I simulated the ~70-file test repoint by deleting the flagged files. Each file was run solo.

| Run | Tests | Result |
|---|---|---|
| Unit, as written, reference impl, no repoint | 18 | 17 pass / 1 fail (`test/**` guard) |
| Unit, as written, after simulated repoint | guard only | FAIL: `3 test file(s)` = the three sealed files (F1) |
| Unit, F1+F2 guard, simulated repoint (−65) + 6 positive / 1 negative / 1 fixture probe | guard only | FAIL naming exactly the 5 false-negative files + 6 positive probes. Negatives and fixtures were not flagged. |
| Unit, F1+F2, after removing the 5 false-negative files | 18 | **18 / 0** |
| Unit, all fixes F1-F5, baseline impl `43c4556` | 18 | 1 pass (PATH_MISSING) / 17 fail. Guard names 70 test files and exactly the plan's 4 src/scripts files. Symlink fails on the discriminator. |
| Integration, as written, reference impl | 7 | 5 pass / 2 fail. 11: only the `core/` and `hosts/claude/` `MANIFEST.json` hashes differ. 12: `.mcp.json` extra. |
| Integration, F6-F9, reference impl | 7 | **7 / 0** (9.6s) |
| Integration, F6-F9, mutant "copier prefers `../cleargate-planning` when present" | 7 | 6 / 1. Scenario 11 kills it via `FLAT/.claude/POISON.md`. |
| `tsc --noEmit`, both amended files, scratch tsconfig | — | exit 0 |
| `npm pack --dry-run` of the reference build | — | split core 55, split claude 26, flat 80; `.gitignore` entries: **none** |

Baseline integration after F6-F9 stays red for the original reason, which I checked by reading the code: scenarios 11, 12 and 13 still fail first on the missing `templates/scaffold/**` (the `existsSync` assertion or ENOENT).

## Developer hints

- **Repoint set is 70 test files:** the 65 old-regex hits plus the 5 in F2. In prior-sprint `.red.` files, change the root constant only, never an assertion (carry-forward 4 names `claude-md-block-leads.red:35` as in scope). Live-side reads (`META_ROOT/.cleargate/**`, `META_ROOT/CLAUDE.md`) keep META_ROOT. The amended guard ignores them because they contain no `cleargate-planning` segment.
- **`MANIFEST.json` in every split view:** leave it out of the core-vs-host collision check, or re-running `build-manifest` without the copier throws. `INTENTIONALLY_UNTRACKED` (`build-manifest.ts:350-358`) already covers it for accounting.
- **`.gitignore` never ships in the tarball.** verify-pack must check per-root manifest entries against `npm pack --dry-run`, never the raw split-view tree.
- **Symlinks:** `Dirent.isDirectory()` from `readdirSync(withFileTypes)` is false for a symlink. The layout probe rejects symlinks for free that way, but `composePayload` needs an explicit `isSymbolicLink()` throw (cf2), because `copyFileSync` follows links.
- **Imports:** `build-manifest.ts` can statically import `'../src/lib/scaffold-layout.mjs'` under tsx (measured). Update `scaffold-layout.d.mts` with `enumerateScaffoldRoots` and the third `composePayload` parameter so `npm run typecheck` stays clean. `verify-pack.mjs` loads the module with a `pathToFileURL` dynamic import, the same way `copy-planning-payload.mjs:28` does.
- **`check-no-exec-mode-vocab.mjs:28`** still reads `outerRoot/CLAUDE.md` after the `:29` repoint. The plan says "CLI-local roots", so scan `scaffold/` (which contains `hosts/claude/CLAUDE.md`) and drop `outerRoot` entirely. The outer pre-commit runs `check-no-inline-id-regex.mjs`, so verify it from the outer repo after the change.
- **`init.ts` bridge:** cover it in the repointed `init-from-source.node.test.ts`. Check that composition goes to an owned temp dir, that the temp dir is removed in `finally`, that the source tree is byte-unchanged, and that `LAYOUT_INVALID` gives exit 2 naming the new items. `initHandler`'s final "Restart Claude Code" banner prints past the `stdout` seam (seen in the integration log). This is cosmetic and not in scope.
- Run the integration file solo: `npm run test:file -- test/scripts/scaffold-standalone.red.integration.node.test.ts`. It builds only inside its own clone, so rule 11 is not triggered.

## Script Incidents

None. No `run_script.sh` invocation; `.script-incidents/` has no entries from this session.

flashcards_flagged: [
  "2026-09-25 · #test-harness #tpv · A source-grep guard scans its own file too: its prose names the banned join. Allowlist the guard by exact path.",
  "2026-09-25 · #test-harness #manifest · Hash-comparing build output that holds MANIFEST.json compares wall-clock generated_at; strip it first.",
  "2026-09-25 · #npm #test-harness · npm pack never ships .gitignore; a negative control deleting 'first file under' a root can pick one.",
  "2026-09-25 · #init #test-harness · initHandler always writes .mcp.json (init.ts:423); an exact top-level install census must include it."
]

TPV: BLOCKED-WIRING-GAP — the scenario-9 test/** guard can never go green (it flags its own file, the sealed sibling integration red, and the -01 relocation red) and misses 5 real sibling reads; integration scenarios 11 and 12 red on a correct implementation.
