# STORY-058-04 TPV — Round 1

role: architect

TPV: REJECTED — BLOCKED-WIRING-GAP: scenario 12c (M2-A9) passes `fromSource` through `runInitScenario`, whose default `payloadDir` seam outranks it (`init.ts:262` checks `opts.payloadDir` before `opts.fromSource` at `:265`). The `--from-source` mkdtemp at `:270` is therefore unreachable, and the tmpdir assertion is vacuous. Separately, scenario 7b is a time bomb that goes red for a correct -11. Exact fixes are E1–E8 below. After re-seal, no second TPV round is needed, provided the edits are pasted verbatim and the counts in "Expected counts after re-seal" reproduce.

Reviewed:
- cli `story/STORY-058-04` @ `a178d38`, whose red commit sits on main `55f5d95`.
- Four files: `test/hosts/host-selection.red.node.test.ts` (9), `test/commands/init-host-selection.red.node.test.ts` (10), `test/commands/init-host-parity.red.integration.node.test.ts` (15) and `test/commands/init-host-cli.red.integration.node.test.ts` (3).
- The plan: `plans/M2.md` §STORY-058-04 as superseded by M2-A9, A12, A15 and A16.

## Simulation

I cloned the cli repo to `/private/tmp/cg-s41-tpv-058-04` at `a178d38`, with `node_modules` symlinked from the main checkout. The clone is now deleted. I wrote a minimal plan-conformant -04 across 4 files (+121/−10):

- **`src/hosts/registry.ts`:**
  - `HOST_PROFILES` and `DEFAULT_HOSTS`.
  - `HostSelectionError(message, value)`.
  - `collectHostOption` (spread copy).
  - `normalizeHostSelectors(raw, registry = defaultHostRegistry)`:
    - split on `,`, then trim, then lowercase
    - an empty token throws, naming the occurrence
    - `all` = `names()`; `portable` = `names().filter(n => n !== 'claude')`; an empty expansion throws
    - an unknown token throws, naming the token
    - the result is deduplicated through a `Set` and returned as `names().filter(n => wanted.has(n))`
    - messages are verbatim from the plan
  - `payloadFilter`: owned root → selected; else shared root → a selected declaring adapter; else core → true. Every check goes through `pathUnderRoots`.
  - FU-5: `const frozenOrder = Object.freeze([...order])` serves both `names()` and `new UnknownHostError(name, frozenOrder)`.
- **`src/init/copy-payload.ts`:** additive `include?`, applied as a second `.filter` on the file list at `:131`.
- **`src/commands/init.ts`:**
  - `InitOptions.hosts?: readonly string[]`.
  - Step 0 right after `const registry = …` (`:226`), before `// Step 1` (`:228`). It uses the M2 snippet verbatim (`stderr('[cleargate init] ERROR: …')`, `exit(2)`, `return`).
  - `copyPayload(..., { force, pinVersion, include: payloadFilter(registry, selected) })`.
  - `const adapters = selected.map((n) => registry.resolve(n));`.
- **`src/cli.ts`:** `.option('--host <value>', <registry-derived help>, collectHostOption)`, and the action passes `hosts: opts.host`.

Every file ran solo via `npm run test:file`. The parity files ran in compare mode only (`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, no capture flag). `npm run typecheck` exited 0 on the conformant build and on every mutant.

### Measured red → green

| File (tests) | Sealed `a178d38` | Conformant | Conformant, 2 repeat runs |
|---|---|---|---|
| host-selection (9) | 0/9 | **9/9** | — |
| init-host-selection (10) | 3/10 (13 ×2, M2-A15) | **10/10** | — |
| init-host-parity (15, compare) | 15/15 | **15/15** | — |
| init-host-cli (3) | 0/3 | **3/3** | — |
| -03 host-adapter-contract (19) | 19/19 | **19/19** | — |
| -03 claude-adapter-init-parity (5, compare) | 5/5 | **5/5** | — |
| **After E1–E8** (host-selection 11 / init-host-selection 10 / cli 4 / parity 15) | 0/11 · 3/10 · 0/4 · 15/15 | **11/11 · 10/10 · 4/4 · 15/15** | identical (×2) |

- The sealed counts reproduce QA-Red exactly.
- The conformant build needs no binding constraint to pass the sealed files. The D-constraints below close mutants, not failures.

### Baseline hash (read-only, never captured)

`find /private/tmp/cg-s41-m2-init-baseline -type f -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256`:
- **Before:** 425 files, `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2`
- **After:** 425 files, `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2`

The two are equal. The directory was kept.

## Mutants (measured; reference = conformant)

"Sealed" means the four sealed -04 files plus -03's two. "Amended" means the same files after E1–E8.

| # | Mutant (a Dev could plausibly ship it) | Sealed killer(s) | Amended killer(s) |
|---|---|---|---|
| M-a | Route through the adapter only when `opts.hostRegistry` is set; otherwise use a fresh `createClaudeAdapter()` | **M2-A15 witness** only | same |
| M-b | `--host` parsed, `copyPayload` gets no `include` | scenarios 8, 10 | 8, 10 |
| M-c1 | Step 0 after Step 1 (write probe + `Target:` line) | **none (survives)** | E5 12a, E6 12b, E7 12c |
| M-c2 | Step 0 after Step 2 (after the from-source mkdtemp) | CLI 15/16, **incidental**: under tsx the default payload `src/templates/cleargate-planning` (`init.ts:123`) never exists, so init exits **1** at `:322`, not 2. In-process 12c is green. | E5, E6, E7, plus CLI 15/15b/16 |
| M-c3 | Step 0 inside the Steps 3–7 `try`, just before `copyPayload`: the lazy placement. Production `process.exit` skips the `finally` at `:602`, so `--from-source` leaks a temp dir. | CLI 15/16, **incidental** (same reason). In-process 12c is green because a throwing exit seam unwinds the `finally`. | E5, E6, **E7** (tmpdir snapshot taken inside the exit seam) |
| M-d | No dedupe (`claude,claude` installs twice) | scenarios 2, 3, 9, 13 ×2; parity ×5 | same |
| M-e1 | `names()` frozen, `UnknownHostError.valid` = live array | FU-5 | same |
| M-e2 | `names()` live, `.valid` frozen | FU-5 | same |
| M-f1 | Selector error exits 1 | 12a/b/c, CLI 15/16 | same |
| M-f2 | Unknown message omits the selector | scenario 4, 12a, CLI 15 | same, plus 15b |
| M-g | Shared roots treated as core | scenarios 7, 8 | same |
| M-h | `all`/`portable` = hard-coded `['claude','codex','copilot']` / `['codex','copilot']` ∩ `names()` | **none (survives)**: scenario 3's R1–R3 use only names that the hard-coded list holds | **E2 test 1** |
| M-i | `include` applied inside the copy loop **after** `fs.mkdirSync(path.dirname(dstPath))` (`copy-payload.ts:138`): an empty `.codex/`/`.agents/` in no-flag installs, an empty `.claude/**` tree in codex-only | **none (survives)**: `record.files` lists files only | **E3, E4** |
| M-j | CLI non-repeatable, last-wins (`host?: string`, `hosts: [opts.host]`) | **none (survives)**: scenario 15 puts `cursor` in the **last** occurrence | **E8 (15b)** |
| M-k | Error line printed without the `[cleargate init] ERROR: ` prefix (story §3.3 contract) | **none (survives)** | E5, E6 |
| M-l | Empty tokens silently skipped | scenario 5, 12b, CLI 16 | same |
| M-m | Result in argv order, not registry order | scenario 2 | same, plus E2 test 1 |
| M-o | `payloadFilter(defaultHostRegistry, …)` in init | scenario 8 | same |
| M-p | Install loop ignores the selection | scenarios 9, 10, 11 | same |
| M-q | `normalizeHostSelectors(opts.hosts)` without the registry arg | scenarios 9, 10, 11 | same |
| M-r | Owned-root match by `startsWith(root)` (no segment boundary) | **none (survives)** | **E2 test 2** |
| M-s | `portable` = `names().slice(1)` | **none (survives)** | **E2 test 1** |
| M-v | Prints a `Hosts: …` stdout line | both parity files (15 + 5) | same |
| M-w | `normalizeHostSelectors(undefined)` returns the frozen `DEFAULT_HOSTS` by reference | none | none: **equivalent** (no caller mutates it) |

- **Sealed:** 8 of 23 non-equivalent mutants survive, and 2 more die only incidentally.
- **Amended:** 0 of 23 survive.

## Findings

**W1 (wiring, blocking): scenario 12c cannot observe its own target.**
- `invokeInit` always passes `payloadDir` (`init-fixture.ts:183`), and `extra` spreads after it (`:195`). `init.ts:262` takes `opts.payloadDir` before `opts.fromSource` (`:265`). The M2-A9 case therefore never enters the branch that runs the mkdtemp at `:270`.
- Measured through the same seam: `extra: { fromSource: '/definitely/not/a/scaffold' }` gives a full 84-file install with `exit` never called. Adding `payloadDir: undefined` gives exit 2 with `Path does not exist`.
- The M-c2 and M-c3 rows are the consequence: the tmpdir half is "green" because it is vacuous, not because of the `finally`. This also answers QA-Red ambiguity 4.
- A second defect sits in the same test. A throwing `exit` seam runs the pending `finally`, and real `process.exit` does not. An after-the-run tmpdir listing cannot see the production leak even once the branch is reachable. E7 snapshots the tmpdir **inside** the exit seam, in an isolated `TMPDIR`, so it is also race-free against other suites' `cleargate-from-source-*` dirs.

**W2 (blocking, forward): scenario 7b turns red for a correct -11.**
- 7b asserts that `payloadFilter(defaultHostRegistry, ['claude'])` admits every path of `composeCanonicalPayload` (core + claude).
- M3.md:1082-1085 and the sprint-context amendment of 2026-09-25T15:05 put `.agents/**` in `scaffold/core` under codex's `sharedRoots(['.agents'])`. From -11 on, the flat payload contains `.agents/**`, and a correct no-flag Claude install must **exclude** it.
- Simulated in the scratch clone: production registry = [claude, fake codex {owned `.codex`, shared `.agents`, surgery `AGENTS.md`, `.codex/hooks.json`}] plus `scaffold/core/.agents/skills/demo/SKILL.md`:
  - Sealed 7b: **red**.
  - Every other sealed -04 file, both parity files and -03's contract file: green.
  - The re-scoped 7b (E1): green.
- This is the flashcard P1/#32 class: a census over a growing set, pinned to production-registry membership. E1 keeps full identity at -04, where there are no foreign declarations, and skips only paths that another registered host declares.

**W3 (coverage, non-blocking on its own):** M-c1, M-h, M-i, M-j, M-k, M-r and M-s survive the sealed set. E2–E6 and E8 close them. Each is small, measured red on sealed and green on conformant, and kills its mutant.

## Required test edits (QA-Red re-seal; paste verbatim; recorded as M2-A17/M2-A18)

**E1 (W2) — `test/hosts/host-selection.red.node.test.ts`:** replace the whole second test of `describe('Scenario 7 …')` (`:263-273`, `'production registry with ["claude"] admits every path of the composed payload (identity)'`) with:

```ts
  test('production registry with ["claude"] admits every composed-payload path that no other registered host declares', async () => {
    const { defaultHostRegistry, payloadFilter, pathUnderRoots } = await loadRegistry();
    const dst = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-s41-host-selection-payload-'));
    await composeCanonicalPayload(dst);
    const filter = payloadFilter(defaultHostRegistry, ['claude']);
    // A path another registered host declares (owned root, shared root or surgery target) is that
    // host's contract, and a claude-only install must EXCLUDE it (-11 puts .agents/** in scaffold/core
    // under codex's sharedRoots). Census everything else; never the whole growing tree against the
    // production registry (flashcards 2026-09-25 #host #registry and #scaffold census).
    const claudeShared = defaultHostRegistry.resolve('claude').sharedRoots();
    const foreign = defaultHostRegistry
      .names()
      .filter((n) => n !== 'claude')
      .flatMap((n) => {
        const a = defaultHostRegistry.resolve(n);
        return [...a.ownedRoots(), ...a.sharedRoots(), ...a.surgeryTargets()];
      });
    const files = listFilesRecursive(dst);
    assert.ok(files.some((r) => r.startsWith('.claude/')), 'composed payload must carry .claude/**');
    assert.ok(files.some((r) => r.startsWith('.cleargate/')), 'composed payload must carry .cleargate/**');
    for (const rel of files) {
      if (pathUnderRoots(foreign, rel) && !pathUnderRoots(claudeShared, rel)) continue;
      assert.equal(filter(rel), true, `expected "${rel}" to be admitted with the production registry + ["claude"]`);
    }
  });
```

**E2 (M-h, M-m, M-r, M-s) — same file:** append at end of file:

```ts

// ── TPV M2-A18 — profiles and payloadFilter stay registry-derived ────────────

describe('TPV M2-A18 — registry-derived profiles and segment-boundary roots', () => {
  test('profiles follow the registry for a host no hard-coded list names, in registry order, claude not first', async () => {
    const { createHostRegistry, normalizeHostSelectors } = await loadRegistry();
    const R4 = createHostRegistry([
      makeFakeAdapter('codex', ['.codex'], ['.agents']),
      makeFakeAdapter('claude', ['.claude'], []),
      makeFakeAdapter('gemini', ['.gemini'], []),
    ]);
    assert.deepEqual(normalizeHostSelectors(['all'], R4), ['codex', 'claude', 'gemini']);
    assert.deepEqual(normalizeHostSelectors(['portable'], R4), ['codex', 'gemini']);
    assert.deepEqual(normalizeHostSelectors(['gemini,claude'], R4), ['claude', 'gemini']);
  });

  test('payloadFilter matches owned and shared roots on a path-segment boundary', async () => {
    const { createHostRegistry, payloadFilter } = await loadRegistry();
    const { R2 } = buildFixtures(createHostRegistry);
    const onlyCodex = payloadFilter(R2, ['codex']);
    assert.equal(onlyCodex('.claude'), false);
    assert.equal(onlyCodex('.claudex/a'), true);
    const onlyClaude = payloadFilter(R2, ['claude']);
    assert.equal(onlyClaude('.agentsx/a'), true);
    assert.equal(onlyClaude('.codexrc'), true);
  });
});
```

(`gemini` lies outside the `HostName` union on purpose. Test files are not type-checked (`tsconfig` excludes `**/*.test.ts`), and the registry accepts it at runtime.)

**E3 (M-i) — `test/commands/init-host-selection.red.node.test.ts`, scenario 8:** after `assert.ok(hasRel(record, 'CLAUDE.md'));` (`:124`), add:

```ts
    for (const d of ['.codex', '.agents']) {
      assert.ok(!fs.existsSync(path.join(record.dir, d)), `${d}/ must not exist on the no-flag path, not even empty`);
    }
```

**E4 (M-i) — same file, scenario 10:** after `assert.ok(hasPrefix(record, '.cleargate/'), 'core payload must still install');` (`:171`), add:

```ts
    assert.ok(!fs.existsSync(path.join(record.dir, '.claude')), '.claude/ must not exist on a codex-only install, not even empty');
```

**E5 (M-c1, M-k) — same file, 12a:** after `assert.equal(record.files.length, 0, 'fixture must stay empty on a rejected selector');` in the `hosts: ["cursor"]` test (`:216`), add:

```ts
    assert.equal(record.stdout, '', 'selector validation precedes Step 1: no Target line, no write probe');
    assert.ok(record.stderr.startsWith('[cleargate init] ERROR: --host: '), record.stderr);
    assert.ok(record.stderr.includes('"cursor"'), record.stderr);
```

**E6 (M-c1, M-k) — same file, 12b:** after the same line in the `hosts: [""]` test (`:232`), add:

```ts
    assert.equal(record.stdout, '', 'selector validation precedes Step 1');
    assert.ok(record.stderr.startsWith('[cleargate init] ERROR: --host: '), record.stderr);
```

**E7 (W1; M-c1/c2/c3) — same file:** replace the whole 12c test (`:235-259`, `'M2-A9: hosts: ["cursor"] + --from-source leaves no target write …'`) with:

```ts
  test('M2-A9: hosts: ["cursor"] + --from-source exits 2 with no from-source tempdir alive at exit(), no stdout, no target write', async () => {
    // runInitScenario always passes a payloadDir seam, and initHandler checks opts.payloadDir BEFORE
    // opts.fromSource, so without `payloadDir: undefined` the --from-source branch (and its mkdtemp)
    // is unreachable. process.exit never runs a pending finally: the tempdir state AT exit() is the
    // final state, so snapshot it inside the exit seam. Isolated TMPDIR: no cross-suite noise.
    const isolatedTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-s41-a9-tmpdir-'));
    const prevTmp = process.env.TMPDIR;
    process.env.TMPDIR = isolatedTmp;
    let capturedExitCode: number | undefined;
    let tmpAtExit: string[] | undefined;
    try {
      const record = await runInitScenario('fresh', {
        extra: {
          payloadDir: undefined,
          hosts: ['cursor'],
          fromSource: path.join(CLI_ROOT, 'scaffold'),
          exit: (code: number): never => {
            capturedExitCode = code;
            tmpAtExit = fs.readdirSync(isolatedTmp).filter((n) => n.startsWith('cleargate-from-source-'));
            throw new ExitSignal(code);
          },
        },
      });
      assert.equal(capturedExitCode, 2);
      assert.deepEqual(tmpAtExit, [], 'a cleargate-from-source-* dir existed when exit(2) was called');
      assert.equal(record.stdout, '');
      assert.equal(record.files.length, 0, 'fixture must stay empty');
    } finally {
      if (prevTmp === undefined) delete process.env.TMPDIR;
      else process.env.TMPDIR = prevTmp;
      fs.rmSync(isolatedTmp, { recursive: true, force: true });
    }
  });
```

(`os.tmpdir()` re-reads `TMPDIR` on every call, so the mkdtemp at `init.ts:270` lands inside `isolatedTmp`. Measured: M-c2 and M-c3 leave one `cleargate-from-source-*` there at exit time.)

**E8 (M-j) — `test/commands/init-host-cli.red.integration.node.test.ts`:** insert between scenario 15 (ends `:94`) and scenario 16 (`:96`):

```ts
test('scenario 15b: --host claude,cursor --host claude -> exit 2 naming "cursor" (an earlier occurrence is not replaced by a later one)', async () => {
  const fixtureDir = mkTmp('cg-s41-host-cli-order-');
  const result = await spawnCliInit(fixtureDir, ['--yes', '--host', 'claude,cursor', '--host', 'claude']);
  assert.equal(result.code, 2, `expected exit 2; stdout=${result.stdout} stderr=${result.stderr}`);
  assert.ok(result.stderr.includes('"cursor"'), `stderr must name "cursor": ${result.stderr}`);
  assert.equal(countEntries(fixtureDir), 0, 'fixture must stay empty on a rejected selector');
});

```

### Expected counts after re-seal (measured on the exact text above)

| File | Tests | Sealed `src` (red commit) | Conformant `src` |
|---|---|---|---|
| host-selection | 11 | 0 pass / 11 fail | 11 / 0 |
| init-host-selection | 10 | 3 pass (13 ×2, M2-A15) / 7 fail | 10 / 0 |
| init-host-cli | 4 | 0 / 4 | 4 / 0 |
| init-host-parity (compare) | 15 | 15 / 0 | 15 / 0 |

- The simulated post-(-11) world (above) with E1–E8 scores 11/11, 10/10, 4/4 and 15/15.
- The orchestrator verifies the re-seal by reproducing the "Sealed `src`" column at the new QA-Red commit. If it matches, Dev dispatches without a second TPV.

## Rulings on QA-Red's 5 ambiguities (`orchestrator_confirmed: false`)

1. **7b over the FLAT payload: view ACCEPTED, assertion REPLACED.** Flat is correct per M2-A12 (-04 consumes the flat view). The "admits every path" census, however, is W2's time bomb, so E1 replaces it with a census that is identical at -04 and stable at -10/-11.
2. **FU-5 test placement in `host-selection`: ACCEPTED.** Measured, it is the sole killer of M-e1 and M-e2.
3. **`extra.exit` override to capture the code: ACCEPTED.** `extra` spreads after the defaults (`init-fixture.ts:195`). The same mechanism makes E7's `payloadDir: undefined` work, and it is also why sealed 12c was vacuous: an `extra` key can only override a default, and `fromSource` does not displace `payloadDir`.
4. **12c's two halves: REJECTED as reasoned.** The tmpdir half is not "already true because the `finally` cleans". It is vacuously true, because the from-source branch is never reached (W1, measured). E7 replaces the test.
5. **13 / M2-A15 / 14 green-by-design: ACCEPTED.** Measured:
   - M2-A15 is the sole killer of M-a.
   - 13 and parity kill M-d.
   - Parity kills M-v.

   As flashcard 2026-09-25 (#tpv #init) predicts, none of the three can show that the selector is wired. That is the job of 8–12 and the CLI file.

## Binding Developer constraints (M2-A19)

- **D1 — Step 0 placement.**
  - Where: immediately after `const registry = opts.hostRegistry ?? defaultHostRegistry;` (`init.ts:226`) and before `// Step 1: Validate cwd` (`:228`). Not after the write probe, not after Step 2, and never inside the Steps 3–7 `try`.
  - Body: exactly `stderr(\`[cleargate init] ERROR: ${e.message}\n\`); exit(2); return;` for a `HostSelectionError`. Rethrow anything else.
  - Kills: M-c1/c2/c3 (E5–E7) and M-k.
- **D2 — `include` is a list filter.** In `copy-payload.ts`, apply `include` to the `files` array at `:131`, as `.filter((r) => !SKIP_FILES.has(r))` followed by `.filter((r) => (include ? include(r) : true))`. Never apply it inside the per-file loop after `fs.mkdirSync(path.dirname(dstPath), …)` (`:138`). Kills M-i (E3/E4).
- **D3 — `payloadFilter` uses `pathUnderRoots` for both owned and shared checks.** No `startsWith(root)` without the `/` boundary. Kills M-r (E2).
- **D4 — Profiles are computed from `registry.names()` at call time.** `all` → `names`; `portable` → `names.filter((n) => n !== 'claude')`. No hard-coded host list, no intersection with one, no `slice(1)`. Kills M-h and M-s (E2).
- **D5 — The result is in registry order and deduplicated.** Accumulate in a `Set`, then `return names.filter((n) => wanted.has(n));`. Kills M-d and M-m.
- **D6 — FU-5.**
  - After the registration loop: `const frozenOrder: readonly HostName[] = Object.freeze([...order]);`, then `names: () => frozenOrder` and `throw new UnknownHostError(name, frozenOrder)`.
  - Hardening the `UnknownHostError` constructor to `Object.freeze([...valid])` a non-frozen input is permitted.
  - Do not freeze `claudeAdapter`: M2-A15's `t.mock.method` needs it writable (-03 TPV D3).
- **D7 — The `--host` option.**
  - Register it with `collectHostOption` as commander's third argument (`.option('--host <value>', help, collectHostOption)`), and pass `hosts: opts.host`.
  - Not variadic (`<value...>`), not last-wins. Kills M-j (E8).
  - Build the help from `defaultHostRegistry.names()` and `HOST_PROFILES`. Import from `./hosts/registry.js`: `init.ts` already loads that module, so nothing new loads at startup.
- **D8 — No new stdout line on a valid selection** (M-v). Both parity files enforce it, but they are integration-only, so run them.
- **Reference implementation (measured green, 4 files, typecheck 0):** the Simulation bullets above. The `selected` binding is `let selected: HostName[];`, assigned in a `try` whose `catch` either returns or rethrows. `tsc` accepts it as definitely assigned.

**QA-Verify additions:**
- `command grep -nE "^export (const (HOST_PROFILES|DEFAULT_HOSTS)|class HostSelectionError|function (collectHostOption|normalizeHostSelectors|payloadFilter))" src/hosts/registry.ts` prints 6 lines. `DEFAULT_HOSTS` has no sealed witness.
- `git diff main -- src/init/copy-payload.ts` shows only the additive `include` field and the second `.filter`.
- Rerun the -03 static grep from M2-A15: `command grep -nE '\b(mergeSettings|injectClaudeMd|extractBlock|injectMcpJson)\(' src/commands/init.ts` must print nothing.

## Regression witnesses (differential)

I ran 33 existing files solo against the sealed `src` (4 files at `a178d38`) and then against the conformant `src`, in the same clone.

**The files:**
- `init.node`, `init-from-source`, `init-gitignore-expansion`, `init-participant`, `init-root-gitignore`, `init-restart-banner`, `init-no-dep0190`
- `claude-md-block-leads.red`, `inject-mcp-json`, `init-test-stack-detect.red`, `copy-payload-perms`, `copy-payload-manifest.red`
- `claude-md-surgery`, `settings-json-surgery`, `manifest`
- `uninstall`, `upgrade`, `upgrade-claude-md.red`, `upgrade-preserves-gate-commands`, `upgrade-payload-root`, `upgrade-pin-and-prune`, `upgrade-registers-new-files`, `upgrade-restart-warning.red`, `upgrade-state-parity.red`, `upgrade-changelog`
- `scaffold-cli-resolution`, `doctor`, `cli-gating`, `dashboard/cr101`, `docs/readme-qa-doc-truth-043-06.red`, `docs/pin-placeholder-coverage`
- `integration/foreign-repo`, `e2e/dogfood-install`

**Result:** the failing test-name sets are **identical in all 33 files**, and so are the cancelled/todo counts. Every existing failure is environmental to the scratch clone, which has no `dist/`, no prebuilt `templates/` and no outer meta-repo:
- `init.node` scenario 7 (`../templates/synthesis`)
- `claude-md-block-leads` 8c
- `scaffold-cli-resolution` ×3 (`templates/cleargate-planning` absent)
- `readme-qa-doc-truth` ×11
- `foreign-repo` ×6 and `dogfood-install` ×1 (no `dist/` or `src/lib/MANIFEST.json`)
- `init-restart-banner`, `init-no-dep0190` and `init-test-stack-detect` cancellations (`dist/cli.js` absent)

The dist-spawning witnesses remain post-BD witnesses per plan.

## Forward notes (M2-A20, for the M3 dispatch text)

- **-10/-11:**
  - The re-scoped 7b (E1) skips every path a non-claude registered adapter declares, **including its `surgeryTargets()`**. That is consistent with M3.md:1337 item 8 (-10 excludes `AGENTS.md` from `payloadFilter`).
  - If -10 adds a root-level block source to `scaffold/core`, it must be declared as a codex surgery target. Otherwise E1 flags it as a Claude-install leak, which is correct behaviour.
- **World-11 simulation verdict:** after E1, every sealed -04 assertion is stable under codex registration plus `.agents/**` in core. Flashcard P1 is honoured file-wide.
- **-05:** `host add` reuses `pathUnderRoots` and the list-filter form of `include` (D2). An empty foreign root directory counts as a coexistence leak there too.

## Script Incidents

None. No `run_script.sh`-wrapped script was invoked. I ran only `npm run test:file`, `npm run typecheck` and `git` inside the scratch clone, plus read-only `find`/`shasum` on the baseline. Nothing in the main cli checkout, the story file, the story branch or the baseline was modified. The main checkout is still on `story/STORY-058-04` @ `a178d38`, with only the pre-existing untracked `cleargate-0.25.0.tgz`.

**Orphan state (advisory, same as -03):** the new tests' `mkdtemp` dirs (`cg-s41-host-selection-payload-*`, `cg-s41-init-host-selection-payload-*`, `cg-s41-host-cli-*`) are never removed. They are unique per run, so they only grow disk. E7 cleans its own `TMPDIR`.

flashcards_flagged:
  - "2026-09-25 · #test-harness #init #tpv · runInitScenario always sets payloadDir, checked before fromSource; add payloadDir: undefined or extra.fromSource is dead."
  - "2026-09-25 · #test-harness #node-exit #tpv · A throwing exit seam runs pending finally blocks; process.exit does not. Snapshot leak state inside the exit seam."
  - "2026-09-25 · #host #registry #tpv · Registry-derived-profile tests need a fake host no hard-coded list names; known names can't kill hardcoded∩registry."
  - "2026-09-25 · #test-harness #cli #tpv · A CLI red with the bad --host value in the LAST occurrence passes last-wins parsing; put it FIRST to prove repeatable."
  - "2026-09-25 · #test-harness #scaffold #host · 'Filter admits every flat-payload path' reds at -11 (.agents in core, codex shared); skip paths other hosts declare."
  - "2026-09-25 · #test-harness #tpv · Files-only tree records miss empty dirs: an include filter applied after mkdir leaks empty host roots. existsSync the root."

STATUS=done
