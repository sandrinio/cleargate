# BUG-067 TPV (Test Pattern Validation)

role: architect

STORY: BUG-067
QA-Red commit: `dc9f8cb` (cli `story/BUG-067`)
Mode: TPV, wiring only. Test logic was not evaluated.

## Verdict

**TPV: APPROVED**

The wiring is sound on all five checks and on dispatch questions A–D. The pre-gate `typecheck: exit 254` flag is structural: the outer worktree has no nested cli repo. In the cli checkout, `npm run typecheck` (`tsc --noEmit`) exits 0 at `dc9f8cb`. It ran read-only through `run_script.sh`.

## Five checks

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Imports resolve | PASS | Every static import resolves to a real export: `stamp.ts`, `stamp-frontmatter.ts`, `stamp-tokens.ts`, `frontmatter-cache.ts`, `parse-frontmatter.ts`, `new.ts`, `gate.ts`, `copy-payload.ts`. The one missing module, `src/lib/frontmatter-locator.ts`, is loaded dynamically via `'../../src/lib/frontmatter-locator.js'` (locator test, line 30). That path is exactly what the M0 plan names (`CLI_ROOT/src/lib/frontmatter-locator.ts`). In the scratch proof below, that import resolved with no `ERR_MODULE_NOT_FOUND`. |
| 2 | Signatures match | PASS | `stampFrontmatter(absPath, opts?)` matches `stamp-frontmatter.ts:32`: `StampOptions{now,version}` and the `reason` union at `:17`. `stampHandler(file,{dryRun},cli?)` matches `stamp.ts:62` (`StampCliOptions` `:20-26`, including `getVersion`). `stampTokensHandler(file,opts,cli?)` matches `stamp-tokens.ts:54` (`sprintRunsRoot` `:31`). `writeCachedGate(absPath,result,opts?)` / `readCachedGate` match `frontmatter-cache.ts:35,62`; the `CachedGate.transition?` field is at `:28`. `newHandler(opts,cli?)` is sync and takes `now?: string`, matching `new.ts:38-45,202`. `gateCheckHandler(file,opts,cli?)` with the `gatesDocPath` seam matches `gate.ts:39-49,152`. `copyPayload(dir,cwd,{force,pinVersion})` matches `copy-payload.ts:21-28,120`. The locator's `FrontmatterSpan` / `locateFrontmatter` / `replaceFrontmatter` (locator test, lines 12-23) match the M0 plan's API block field for field. |
| 3 | Injected seams exist | PASS | The tests inject `cli.exit`, `stdout`, `stderr`, `now`, `cwd`, `sprintRunsRoot`, `gatesDocPath` and `getVersion`. Each is a real optional field on the matching `*CliOptions` interface listed above. Nothing is mocked with `t.mock.method`. |
| 4 | Teardown | PASS | The writer and integration files both register `afterEach`, which pops every `mkdtempSync` root and `rm -rf`s it. The hook subprocess keeps its writes inside the fixture root (`TMPDIR`, `CLAUDE_PROJECT_DIR` and `ORCHESTRATOR_PROJECT_DIR` all point there). After six runs, `os.tmpdir()/bug067-e2e` and `bug067-w` were both empty. The locator file creates no state. |
| 5 | Naming | PASS | Two files use `*.red.node.test.ts` and one uses `*.red.integration.node.test.ts`, as `sprint-context.md` §Test Stack requires. |

## Dispatch questions

**A. Is the locator API specified?** Yes, completely. The M0 plan (BUG-067 section, "Add one module") gives the module path, the five readonly `FrontmatterSpan` fields, and both function signatures verbatim. The test pins one detail the plan leaves implicit: `yamlEnd` is the offset where the closing `---` line starts, so it includes the last YAML line's EOL. `end` is the offset just after the closing `---`. The empty map gives `yamlStart === yamlEnd`. This agrees with the plan's "end: after closing ---, before its line ending". The error cases use a bare `assert.throws` with no class or message required, which matches the plan's "is an error". The Developer does not have to guess anything.

**B. Can a correct fix go green without touching `dist/`?** Yes. This was proven empirically; see the scratch proof and the recipe below.
- The fixture really does route through `CLEARGATE_BUILT_CLI`. The rendered `stamp-and-gate.sh:12-18` tries three resolvers in order:
  1. `${CLAUDE_PROJECT_DIR}/cleargate-cli/dist/cli.js`. The fixture root has no `cleargate-cli/`, so this is skipped. The live repo's dist is never reached.
  2. `command -v cleargate`. The test puts `<fixture>/bin` first on `PATH`. The shim there is `exec <process.execPath> <builtCli>` (integration test, lines 369-377), so it wins over the global `/opt/homebrew/bin/cleargate`.
  3. `npx`. Never reached.
- A positive and a negative run discriminate the route. The fixed temp build went green. Pointing `CLEARGATE_BUILT_CLI` at the pre-fix live `dist/cli.js`, with the in-process source still fixed, turned only the hook scenario red. The global binary is pre-fix too, so it could not have produced the green run.
- The build uses `tsup.config.ts` with entries `src/cli.ts` plus six others, formats esm and cjs, a `createRequire` banner, `external: ['typescript']`, and `dts: true`. Three constraints follow from that config and from tsup behaviour:
  1. **`--onSuccess true` is required.** The config's `onSuccess` copies `../cleargate-planning/MANIFEST.json` to the hardcoded `<pkgRoot>/dist/MANIFEST.json`, whatever `--out-dir` is. Without the override, the temp build mutates live dist. In a control run the config hook fired when `--onSuccess` was absent and did not fire when it was passed. tsup's CLI flags override config keys (`index.js:1419` `{...configFile, ...override}`).
  2. **The out-dir must sit exactly one directory under the cli package root.** tsup leaves runtime `dependencies` (commander, js-yaml, zod, diff, @napi-rs/keyring) as bare imports, and the bundle resolves `templates/synthesis`, `package.json` and `MANIFEST` via `dirname(import.meta.url)/..`. A copy of `dist/` placed outside the package fails with `ERR_MODULE_NOT_FOUND` (verified).
  3. **Never run `npm run build`.** Its `prebuild` rewrites `templates/cleargate-planning/` and the outer main checkout's `cleargate-planning/MANIFEST.json`, and `build` runs `rm -rf dist`.

**C. Do subprocesses use absolute paths?** PASS. There is one spawn: `spawnSync('bash', [hook], {cwd: fixture.root})` at line 387. The hook path is absolute (derived from `mkdtempSync(os.tmpdir()/…)`). The shim uses absolute `process.execPath` and `builtCli`. No subprocess uses tsx, because the built JS runs under plain node. That is exactly why a built CLI is required.
- **Caveat (recipe hazard, not a gap):** the test uses `CLEARGATE_BUILT_CLI` as given, without `path.resolve`. A relative value passes the `existsSync` check, because the test's cwd is CLI_ROOT, but the shim fails inside the fixture cwd. Measured result: `stamp=1 gate=1 ingest=1`, which looks like a real red. **The env value must be absolute.**

**D. Is `CLEARGATE_META_ROOT` honoured?** PASS. `META_ROOT` honours `CLEARGATE_META_ROOT` (integration test, lines 30-32). It drives the eight templates, `readiness-gates.md`, `config.yml`, and the authored BUG-067 item used as the hook-chain source. With `META_ROOT=.worktrees/BUG-067`, all of these came from the worktree. There is one exception:
- The hook template comes from `CLI_ROOT/templates/cleargate-planning/.claude/hooks/stamp-and-gate.sh` (`PAYLOAD_SOURCE`, line 36). That is the generated npm payload, not META_ROOT canonical.
- This is acceptable because BUG-067 must not modify the hook: the M0 plan says "rendered, unmodified fixture `stamp-and-gate.sh`". Today the SHA-256 is identical in all three trees (`63f92131…2b87`): main canonical, worktree canonical, and cli payload.
- If a Developer did edit the canonical hook, this test would not exercise the edit. QA-Verify should confirm the hook SHA is unchanged.

## Scratch proof (outside both repos, cleaned up)

1. Extracted the tree with `git archive dc9f8cb` into the scratchpad. Linked `node_modules` and copied `templates/cleargate-planning`.
2. Applied a scratch minimal fix covering four of the five runtime edits: a locator, `parse-frontmatter`, `stamp-tokens`, `writeCachedGate` and `stampFrontmatter`. The `stamp.ts` dry-run edit was deliberately left out.
3. Built with `npx tsup --out-dir .bug067-build --onSuccess true`. The build took about 3 s, `node .bug067-build/cli.js --version` printed `0.26.1`, and no `dist/` was created.

Results:
- **Integration, 9/9 green.** That includes the hook scenario (`stamp=0 gate=0`), with `CLEARGATE_META_ROOT=<worktree>` and `CLEARGATE_BUILT_CLI=<abs>/.bug067-build/cli.js`. The fully authored fixture can reach `gate=0` against the shipped readiness definitions.
- **Unit tests, 40/41 green.** The one red is the `stamp --dry-run` preview test. It targets the M0-specified `stamp.ts:83-109` edit that the scratch fix skipped, so it is aimed at the right change.
- **Total:** 49 of the 50 QA-Red tests turned green with the partial fix. The remaining one is covered by a planned edit.
- **Repos untouched:** the real cli `dist/cli.js` and `dist/MANIFEST.json` SHA-256 matched before and after. Cli `git status` is unchanged (only the pre-existing `?? cleargate-0.25.0.tgz`). The outer worktree is clean.

## Recipe for Developer and QA-Verify (cli `story/BUG-067`)

```bash
CLI=/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli
WT=/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-067
RS=/Users/ssuladze/Documents/Dev/ClearGate/.cleargate/scripts/run_script.sh
cd "$CLI"
shasum -a 256 dist/cli.js dist/MANIFEST.json > /tmp/bug067-dist.sha   # live-dist baseline (use your scratchpad path)
# 1. Temp build: one dir under package root; --onSuccess true stops the config writing dist/MANIFEST.json.
#    Do NOT use `npm run build` (prebuild rewrites payload + outer MANIFEST; build rm -rf's dist).
bash "$RS" npx tsup --out-dir .bug067-build --onSuccess true
# 2. Confirm the fix is bundled (node, not BSD grep: FLASHCARD 2026-08-28 long-line bundle).
node -e "const fs=require('fs'),d='$CLI/.bug067-build';process.exit(fs.readdirSync(d).filter(f=>f.endsWith('.js')).some(f=>fs.readFileSync(d+'/'+f,'utf8').includes('locateFrontmatter'))?0:1)"
# 3. Red files (CLEARGATE_BUILT_CLI MUST be absolute).
CLEARGATE_META_ROOT="$WT" bash "$RS" npm run test:file -- test/lib/frontmatter-locator.red.node.test.ts test/lib/frontmatter-writers.red.node.test.ts
CLEARGATE_META_ROOT="$WT" CLEARGATE_BUILT_CLI="$CLI/.bug067-build/cli.js" bash "$RS" npm run test:file -- test/e2e/frontmatter-authoring.red.integration.node.test.ts
# 4. Clean up; prove live dist untouched. `.bug067-build/` is NOT gitignored: never stage it.
rm -rf "$CLI/.bug067-build"
shasum -a 256 -c /tmp/bug067-dist.sha && git -C "$CLI" status --porcelain   # expect only ?? cleargate-0.25.0.tgz
```

This recipe does not build `dist`, so sprint rule 11 needs no disclosure. BD still rebuilds `dist` from cli `main` after the merge.

## Advisories (non-blocking)

1. **Fixture fragility.**
   - The hook-chain scenario reads the live work item `META_ROOT/.cleargate/delivery/pending-sync/BUG-067_…md` and asserts `status === 'Triaged'` plus `gate=0` against its content.
   - It breaks if the item's status or frontmatter changes, or if the item moves to `archive/` at close.
   - QA-Verify must run before any edit to the item's frontmatter.
   - Integration files are excluded from the default `npm test` (package.json `test` glob), so the test ratchet is unaffected.
   - Vendoring a fixture copy into `test/fixtures/` is a follow-up, not in scope; the test is sealed.
2. **N6b reactivation is the Developer's job.** The M0 plan's "Reactivate the existing N6b witness" edits the existing `test/commands/new-command.node.test.ts`. QA-Red correctly left it alone, so the Developer dispatch must name it.
3. **Typecheck does not cover test files.** `npm run typecheck` checks only `src/**/*` (`tsconfig.json` `include`, `exclude **/*.test.ts`). QA-Red's typecheck exit 0 says nothing about the tests; they are validated only by execution under tsx.

## Script Incidents

None from wrapped invocations: `run_script.sh npm run typecheck` exited 0.

Disclosure: the scratch-proof commands (`npx tsup`, `npm run test:file`, and the negative controls) ran unwrapped. They ran against a throwaway `git archive` copy in the session scratchpad, not repo scripts, and that copy has been deleted. No `.script-incidents` entries correspond to them.

## flashcards_flagged

- `2026-09-25 · #build #dogfood-split #danger · tsup onSuccess writes <cli>/dist/MANIFEST.json even with --out-dir; temp builds need --onSuccess true or mutate live dist`
- `2026-09-25 · #build #test-harness · temp CLI build must sit one dir under cleargate-cli/: deps external + import.meta.url/.. paths; elsewhere ERR_MODULE_NOT_FOUND`
- `2026-09-25 · #test-harness #cross-repo · CLEARGATE_BUILT_CLI must be absolute: existsSync passes from CLI_ROOT, hook shim runs in fixture cwd → stamp=1 gate=1 fake red`
- `2026-09-25 · #test-harness #fixture · BUG-067 hook-chain e2e reads the live pending-sync BUG-067 item and asserts status Triaged; breaks on status edit/archive`
