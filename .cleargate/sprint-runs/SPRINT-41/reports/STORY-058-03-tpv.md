# STORY-058-03 TPV — Round 1

role: architect

TPV: APPROVED. No test-side fix is needed. One Developer constraint is binding (D1): a strictly verbatim move of `init.ts:497` reds scenario 11, and a runtime-identical constant substitution turns it green.

Reviewed: cli `story/STORY-058-03` @ `11fe514` (red commit on main `a821d40`). The files are `test/helpers/init-fixture.ts`, `test/hosts/host-adapter-contract.red.node.test.ts` (19 tests) and `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (5 tests). The plan is `plans/M2.md` §STORY-058-03 as superseded by M2-A1..A8.

## Simulation

I cloned the repo to `/private/tmp/cg-s41-tpv-058-03` at `11fe514` and symlinked `node_modules` from the main checkout. The clone is deleted now. I wrote a minimal plan-conformant implementation:
- **`src/hosts/types.ts`:** the §3.3 contract, verbatim.
- **`src/hosts/registry.ts`:**
  - `UnknownHostError`, a Map-backed `createHostRegistry` with the duplicate-name, root-shape and owned-overlap invariants, `pathUnderRoots`, and `defaultHostRegistry = createHostRegistry([claudeAdapter])`.
- **`src/hosts/claude.ts`:**
  - `HOOK_ADDITION` plus its doc comment (`init.ts:35-71`) moved verbatim as `export const CLAUDE_HOOK_ADDITION`.
  - A private sync copy of `writeAtomic` (`:228-232`).
  - `createClaudeAdapter(overrides: Partial<ClaudeAdapterDeps> = {})`, whose deps are merged per key over the real helpers. It returns a plain object of closures.
  - `install` is `init.ts:461-557` minus the three `.mcp.json` capture lines (`:539`, `:540`, `:557`). It applies only the M2-A3 substitutions, and every helper call goes through `deps.*`.
  - `remove` mirrors `uninstall.ts:434-456`.
- **`src/commands/init.ts`, per M2-A1/A2/A4/A5:**
  - The M2-A1 block replaces `:461-557` inside the Steps 3–7 `try`. The hoisted `let`s are untouched.
  - The `registry` seam goes after `:261`, and `hostRegistry?: HostRegistry` after `:142`.
  - The `:20/:21/:22/:24` imports are deleted, and `defaultHostRegistry, type HostRegistry` plus `type InstallCtx` are added.
  - The header rows `:8-9` become one `4–5b.` row.

I ran each file solo with `npm run test:file`. Parity ran in compare mode (`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, no capture flag).

### Measured red → green

| Build | Unit (19) | Parity (5) | typecheck | Notes |
|---|---|---|---|---|
| `11fe514` as sealed (no `src/hosts`) | 0 / 19 | 5 / 5 | exit 0 | Matches QA-Red. Parity is green by design (see Q1). |
| Conformant, **strictly verbatim** move | 18 / 19 | 5 / 5 | exit 0 | Scenario 11 red: `claude.ts` contains `CLEARGATE:START` (see Q3) |
| Conformant **+ D1** (the ruling below) | **19 / 19** (×3 runs) | **5 / 5** (×3 runs) | **exit 0** | `check-no-exec-mode-vocab.mjs` and `check-no-inline-id-regex.mjs` both exit 0 |

The baseline is intact and was never written. Before and after my runs it holds `425` files, and `find … -type f -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256` gives `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2`. That equals QA-Red's recorded value. The baseline was captured hours earlier and still compares green, which is direct evidence that the harness does not depend on the clock.

### Mutants (measured, conformant+D1 as reference)

| Mutant | Unit | Parity | Killed by |
|---|---|---|---|
| M-a: `src/hosts` present, `init.ts` left at `11fe514` (helpers still inline, seam ignored) | 18/19 | 5/5 | Scenario 10 only |
| M-b: route through the adapter **only when `opts.hostRegistry` is set**, else the inline Steps 4–5b | 19/19 | 5/5 | **nothing sealed** (see Q1) |
| M-c: `claude.ts` calls the helpers directly and ignores `deps` | 16/19 | 5/5 | Scenarios 7 (×2) and 8 (first test) |
| M-d: inline Steps 4–5b kept **and** the adapter loop runs | 18/19 | 0/5 | Parity (duplicate stdout lines) and scenario 10 |

### Regression witnesses (differential, scratch)

I ran 15 witness files solo against red-commit `init.ts` and against the conformant `init.ts`, with the same `src/hosts` in both:
- `init.node`, `init-from-source`, `init-gitignore-expansion`, `init-participant`, `init-root-gitignore`
- `claude-md-block-leads.red`, `inject-mcp-json`, `init-test-stack-detect.red`
- `claude-md-surgery`, `settings-json-surgery`
- `uninstall`, `upgrade-claude-md.red`, `upgrade-preserves-gate-commands`
- `dashboard/cr101`, `docs/readme-qa-doc-truth-043-06.red`

The failing test-name sets are **identical**; only durations differ. The fails that do exist come from the scratch clone having no outer meta-repo beside it:
- `init.node` scenario 7
- `claude-md-block-leads` 8c
- 11 of the README/qa.md checks

None of them is caused by the refactor. The source-pinned strings (`.dashboard.json`, `POST_PROCESSED_FILES`/`hashNormalized`, `[cleargate init] Done`) still pass from `init.ts`. The dist-spawning witnesses (`init-restart-banner`, `init-no-dep0190`, `cli.node`, `init-pre-member-isolation`, `init-from-source-dist`) were not run, because they grade `dist` and are post-BD witnesses per plan.

## Wiring questions

**Q1 — Does parity exercise the adapter path, or can it pass with init still calling the helpers directly?** Parity alone passes with init calling the helpers directly: M-a scores 5/5, and so does the unmodified red commit. Scenario 10 is the witness that closes that gap. It kills M-a because the injected spy registry's `install` is called 0 times, and parity kills M-d.

Scenario 10 does not fully close the gap, though. It spies on an **injected** registry, so it proves only that init honours `opts.hostRegistry` when one is given. M-b routes through the adapter only when the seam is set and runs inline surgery otherwise, and it survives all 24 tests. M-b is contrived: it keeps dead-in-spirit inline code that M2-A4's import deletion would otherwise remove, and no plan-following Developer writes it. So this is a QA-Verify check, not a QA-Red bounce:
- **QA-Verify (-03):** `command grep -nE '\b(mergeSettings|injectClaudeMd|extractBlock|injectMcpJson)\(' src/commands/init.ts` must print nothing. Measured: 0 hits on the conformant build, 4 hits on M-b.
- **-04 QA-Red (recommended, not required here):** add a default-path routing witness to -04's reds, since -04 rewrites the no-flag default. The version below was measured green on conformant and red on M-b, and `t.mock.method` auto-restores:
  ```ts
  test('default (no-seam) init routes through the production claudeAdapter.install', async (t) => {
    const { claudeAdapter } = await import('../../src/hosts/claude.js');
    const spy = t.mock.method(claudeAdapter, 'install');
    const record = await runInitScenario('fresh');
    assert.equal(spy.mock.calls.length, 1);
    assert.equal(spy.mock.calls[0].arguments[0].cwd, record.dir);
  });
  ```

**Q2 — Are the scenario 7/8 "calls the real helpers once each" assertions satisfiable with the `deps?` shape M2 pins?** Yes, measured 3/3 green. Scenario 7 passes the four install deps and scenario 8 the two remove deps, and both are satisfied by `createClaudeAdapter(deps?: Partial<ClaudeAdapterDeps>)` with a per-key merge over the real helpers. The assertions discriminate: M-c, which bypasses `deps`, fails all three delegation tests.

The count assertions are exact-once, and the verbatim body calls each of `extractBlock`, `injectClaudeMd`, `mergeSettings` and `injectMcpJson` exactly once. `removeBlock` and `removeClearGateHooks` are also called exactly once when both files exist. Scenario 7's bare fixture has no `.claude/` directory, because the copier is not in play, so the moved `fs.mkdirSync(path.dirname(settingsPath), { recursive: true })` (from `init.ts:477`) is load-bearing there.

**Q3 — Does scenario 11's static check hold for a verbatim move?** It does not. The verbatim Step 5 code contains the token itself, in the payload-unreadable fallback at `init.ts:497`:
```ts
    claudeMdBlock = '<!-- CLEARGATE:START -->\n<!-- CLEARGATE:END -->';
```
Scenario 11 (`host-adapter-contract.red.node.test.ts:456-459`) asserts `!text.includes('CLEARGATE:START')`. That is stricter than the plan's wording ("no regex literal containing `CLEARGATE:START`"), and a literal-verbatim move scores 18/19. `mcpServers` does not appear anywhere in the moved range or the moved doc comment, so the second half holds.

**Ruling:** keep the sealed test as it is. Its stricter form states the story's intent ("delegate, don't hardcode the marker") better than the plan's wording did. The Developer resolves it with D1 below, which is runtime-identical: a tsx probe confirmed `` `${CLEARGATE_START}\n${CLEARGATE_END}` `` equals the old literal. `claude.ts` already imports both constants for the CR-105 notice. The fallback branch is the one Step 4/5/5b path that no parity scenario reaches, which is why its byte-equality was proven by the probe and not by the baseline.

**Q4 — Is any test order-, clock- or environment-dependent?**
- **Order:**
  - Every run uses `--test-concurrency=1` with one process per file (`scripts/run-default-tests.mjs:42`), and tests within a file are sequential.
  - `process.env.CLEARGATE_REPO_ROOT` is restored in a `finally` (`init-fixture.ts:288-291`).
  - Scenario 10 spreads into a new object and never mutates `claudeAdapter`.
  - The per-file payload caches are read-only for every consumer.
  - Result: no order dependence.
- **Clock:**
  - `now` is frozen, and `writeAtomic`'s `Date.now()` touches only the temp name, which is renamed away.
  - The QA-Red baseline, captured earlier, compares green now.
  - Result: none.
- **PATH:**
  - `spawnSyncFn` is stubbed (`init-fixture.ts:82-89`), and `init.ts` has no direct `spawnSync(`, `execSync` or `process.env` read.
  - None of `src/init/*.ts`, `lib/identity.ts`, `banners.ts`, `session-load-delta.ts`, `manifest.ts` or `prompts.ts` reads `process.env`.
  - `runWikiBuild` and `readInstallManifest` are stubbed.
  - Result: none.
- **TMPDIR:**
  - The fixture prefers `/tmp` (`init-fixture.ts:49-56`). `getSharedPayloadDir` hardcodes `/tmp` (`contract test :91`), and `mkTmp` uses `os.tmpdir()`.
  - All of these work on macOS and Linux, and nothing path-length-sensitive runs.
  - The fixture root is normalized to `<ROOT>` in the transcripts.
  - Result: none.
- **Real `process.stderr` banner:** `emitMcpRestartBanner` bypasses the `stderr` seam, so it is never recorded or compared. It is terminal noise only, the same before and after the refactor, and its call site stays in `init.ts`.
- **Orphan state (advisory, non-blocking):**
  - No test removes its temp dirs. My runs left 114 `cg-s41-{fix,payload,contract-payload}-*` dirs under `/tmp` and 45 `cg-s41-{install,remove}-*` dirs under `os.tmpdir()`.
  - The names are unique per `mkdtemp`, so they cannot affect a result. The only cost is disk growth, because the unit file runs in the default `npm test`.
  - -04's QA-Red may add `after()` cleanup to `init-fixture.ts`. Whoever does it must never touch `/private/tmp/cg-s41-m2-init-baseline`.

**Q5 — Does the unit file pin the production registry's exact membership (flashcard P1)?** It does not:
- Scenario 1 uses `names().includes('claude')`.
- Scenario 3 compares `e.valid` and the message against the **dynamic** `defaultHostRegistry.names()`.
- Scenarios 2 and 4 use fixture registries, and scenario 10 injects a one-adapter spy registry.

After -10 registers codex, every assertion still holds.

## Rulings on QA-Red's 5 ambiguities (`orchestrator_confirmed: false`)

1. **`runInitScenario` returns an extra `dir` field — ACCEPTED.** The field is load-bearing: scenarios 9b (`:408`) and 10 (`:439`) read `record.dir`. It is never compared, because `captureOrCompare` diffs only `files`/`stdout`/`stderr` (`init-fixture.ts:352-366`). -04 reuses it as is.
2. **`captureOrCompare(…, sourceDir?)` 4th parameter — ACCEPTED.** Only capture mode reads it. Compare mode reads `meta.json` alone. It is additive, so the plan's 3-arity call still type-checks.
3. **Raw sha256, not `hashNormalized` — ACCEPTED.** It is required for a byte-identity criterion: `hashNormalized` would mask BOM/CRLF/trailing-newline drift. Modes are compared as `& 0o777`.
4. **Concrete `user-content`/`malformed` seed literals — ACCEPTED.** I measured that the 5-scenario baseline reaches every Step 4/5/5b branch except the payload-unreadable fallback:
   - settings: merged, unchanged, and the parse-warning branch (`malformed`)
   - `CLAUDE.md`: created, updated, unchanged, and the CR-105 relocation notice (`user-content`, `force`)
   - `.mcp.json`: created, merged, unchanged, and the invalid-JSON warning (`malformed`)

   D1's probe covers the one unreached branch.
5. **Dot-form name `*.red.integration.node.test.ts` — ACCEPTED.** It matches sprint-context §Test Stack ("integration layer `*.red.integration.node.test.ts`"). `package.json:46`'s `!test/**/*.integration.node.test.ts` excludes it from the default `npm test`, as the plan requires. The unit file stays in the default glob.

## Developer hints

- **D1 (binding; amends M2-A3):** in `claude.ts`, the Step 5 fallback moves as `` claudeMdBlock = `${CLEARGATE_START}\n${CLEARGATE_END}`; `` and not as the `init.ts:497` string literal. This is the only non-mechanical token change in the move. It is runtime byte-identical (measured), and without it scenario 11 stays red (18/19). **Orchestrator:** paste this into the Dev dispatch verbatim, or append it to `plans/M2.md` as `M2-A14 (TPV 058-03): the init.ts:497 fallback literal moves as \`${CLEARGATE_START}\n${CLEARGATE_END}\`; scenario 11 forbids the CLEARGATE:START token anywhere in claude.ts`. A Developer reading "verbatim" alone will hit red.
- **D2:** Write `createClaudeAdapter(deps: Partial<ClaudeAdapterDeps> = {})` with `const d = { ...DEFAULT_DEPS, ...deps }`, and call every helper as `d.<helper>(...)` inside both `install` and `remove`. A direct call is M-c, which fails scenarios 7 and 8.
- **D3:** `claudeAdapter` must be a plain object whose methods are own enumerable closures: no class and no `this`, as the plan says.
  - Scenario 10 builds `{ ...claudeAdapter, install, remove }`. A class instance loses `ownedRoots`, `sharedRoots` and `surgeryTargets` under spread, so `createHostRegistry` would throw a `TypeError`.
  - Do not `Object.freeze` it either. The recommended -04 default-path witness uses `t.mock.method(claudeAdapter, 'install')`, which needs a writable property.
- **D4:** Keep the import direction `init.ts → hosts/registry.ts → hosts/claude.ts → {init/*, lib/*}`, which type-checks clean. `claude.ts` must not import `registry.ts` or `commands/init.ts`, or the result is a cycle.
- **D5:** Destructure `const { stdout, stderr } = ctx;` at the top of `install`, and optionally `const { cwd, payloadDir } = ctx;`. The moved body then stays textually identical apart from `pinVersion ?? 'latest'` → `ctx.pinVersion`, `HOOK_ADDITION` → `CLAUDE_HOOK_ADDITION`, and `deps.` prefixes. That keeps the post-flight diff review of `:461-557` mechanical.
- **D6:** In `init.ts`, keep `writeAtomic` (it is still used at Steps 5c/5d/7) and `extractSessionLoadDelta` (the banner at `:856`). With exactly M2-A4's four import deletions plus the two new host imports, `noUnusedLocals` passes.
- **D7:** In `remove()`, the two warning strings are `uninstall.ts:441` and `:455`, copied verbatim with no trailing `\n`. The marker-less case works because `removeBlock` throws on a missing `CLEARGATE_START` (`lib/claude-md-surgery.ts:57`). No pre-validation belongs in the adapter.
- **D8:** Commit before running `init-from-source-dist.integration.node.test.ts` (M2-A7), because it clones `HEAD`. Run it solo.
- **QA-Verify:** In addition to the plan's checks, run the Q1 static grep on `src/commands/init.ts`. It must print nothing.

## Script Incidents

None. No `run_script.sh`-wrapped script was invoked; I ran `npm run test:file` and `npm run typecheck` inside the scratch clone only. The main cli checkout, the story, the plan and the baseline were not modified.

flashcards_flagged:
  - "2026-09-25 · #test-harness #tpv #init · A parity baseline captured pre-refactor is also green on UNREFACTORED code; only a routing spy proves the new path runs."
  - "2026-09-25 · #test-harness #tpv #host · A spy on an injected registry seam misses 'route only when the seam is set'; spy the production adapter via t.mock.method."
  - "2026-09-25 · #tpv #host #init · 'Move verbatim' vs a no-CLEARGATE:START guard: init.ts:497's fallback literal holds the marker; move it as the constants."

TPV=APPROVED
