# STORY-058-04 — QA-Red

role: qa

Mode: RED. cli repo `cleargate-cli`, branch `story/STORY-058-04`, cut from `main` at
`55f5d95` (`STORY-058-03` merged, cli HEAD `0fb61b1` content). Commit: `a178d38`
(`qa-red(STORY-058-04): write failing tests`). Tests only — no `src/**` change and
no edit to `test/helpers/init-fixture.ts`, verified by `git status --short` before
commit (only the four new test files staged; the pre-existing unrelated untracked
`cleargate-0.25.0.tgz` left untouched, same as -03's QA-Red).

## Deliverables

- `cleargate-cli/test/hosts/host-selection.red.node.test.ts` — M2 plan scenarios 1-7
  (registry.ts's not-yet-existing `HOST_PROFILES`/`DEFAULT_HOSTS`/`HostSelectionError`/
  `collectHostOption`/`normalizeHostSelectors`/`payloadFilter`) plus the -03 post-flight
  FU-5 frozen-copy witness (routed to -04 per `reports/STORY-058-03-arch.md`).
- `cleargate-cli/test/commands/init-host-selection.red.node.test.ts` — scenarios 8-13
  (in-process acceptance via `runInitScenario` + an injected `hostRegistry`/`hosts`
  seam) plus the M2-A15 default-path routing witness (verbatim snippet from
  `plans/M2.md`, "Amendments from TPV (STORY-058-03, 2026-09-25)").
- `cleargate-cli/test/commands/init-host-parity.red.integration.node.test.ts` —
  scenario 14 (5 `INIT_SCENARIOS` × 3 host-selector forms vs. `$CLEARGATE_INIT_BASELINE`,
  `["all"]` excluded per the plan).
- `cleargate-cli/test/commands/init-host-cli.red.integration.node.test.ts` —
  scenarios 15-17, spawning the real `src/cli.ts` via tsx (flashcard P4 recipe), no
  `spawnSyncFn` seam available.

No change to `test/helpers/init-fixture.ts` was needed — every new test reuses its
existing exports (`runInitScenario`, `ExitSignal`, `INIT_SCENARIOS`, `captureOrCompare`,
`CLI_ROOT`, `composeCanonicalPayload`) unmodified. `extra` in `RunInitScenarioOptions`
already spreads after the default seams inside `invokeInit`, so `extra.exit` overrides
the default `exit` seam to capture an exit code without touching the helper (used in
scenario 12's three tests below).

## Per-scenario table

| # | Scenario | File | Test name | Red/Green @ `a178d38` | Reason |
|---|---|---|---|---|---|
| 1 | Default → claude | host-selection | `normalizeHostSelectors(undefined)/([]) default to ["claude"]...` | RED | `TypeError: normalizeHostSelectors is not a function` (export absent) |
| 2 | Repeated/comma/case | host-selection | `repeated flags, comma-joined values and mixed case...` | RED | same — `normalizeHostSelectors` absent |
| 3 | Profiles from registry | host-selection | `portable/all expand per-registry...` | RED | same — `normalizeHostSelectors` absent |
| 4 | Unknown host | host-selection | `"cursor" (bare or comma-joined) throws HostSelectionError...` | RED | `TypeError: Right-hand side of 'instanceof' is not an object` — `HostSelectionError` export absent (`undefined instanceof …`) |
| 5 | Empty/whitespace | host-selection | `"", "claude,", and "  " all throw HostSelectionError` | RED | same — `HostSelectionError` absent |
| 6 | Collector | host-selection | `collectHostOption("a", undefined) -> ["a"]...` | RED | `TypeError: collectHostOption is not a function` (export absent) |
| 7 | payloadFilter (fixture) | host-selection | `R2 fixture: owned roots gate on selection...` | RED | `TypeError: payloadFilter is not a function` (export absent) |
| 7 | payloadFilter (production identity) | host-selection | `production registry with ["claude"] admits every path...` | RED | same — `payloadFilter` absent |
| FU-5 | Frozen `names()`/`.valid` | host-selection | `mutating a names() result never reorders the registry...` | RED | `AssertionError: names() must return a frozen array` — confirmed by reading `registry.ts:113-118`: `names: () => order` and `new UnknownHostError(name, order)` both hand out the live internal array, unfrozen |
| 8 | No flag = claude-only (Gherkin 1) | init-host-selection | `claude installs once, codex 0 times; no .codex/**...` | RED | `.codex/fake.toml` present in the target — `copyPayload` has no `include` filter yet, so every payload file (including the injected fake host files) is copied regardless of selection. Routing half (`claude` installs once, `codex` 0 times) is accidentally already correct — `initHandler`'s hardcoded `[registry.resolve('claude')]` happens to match the no-flag case |
| 9 | Repeated+comma installs both once (Gherkin 2) | init-host-selection | `hosts: ["claude", "codex,claude"] installs claude and codex once each...` | RED | `codex install: 0 !== 1` — `initHandler` line 429 hardcodes `[registry.resolve('claude')]`, ignoring `hosts` entirely |
| 10 | codex-only omits claude | init-host-selection | `claude install 0 times; no .claude/**...` | RED | `claude install: 1 !== 0` — same hardcoded adapter list; claude always installs regardless of selection |
| 11 | `--host all` (§4.1) | init-host-selection | `all 3 adapters in R3 install exactly once...` | RED | `codex/copilot install: 0 !== 1` — same hardcoded adapter list |
| 12a | Unknown selector rejects (Gherkin 4) | init-host-selection | `hosts: ["cursor"] -> ExitSignal(2), stderr names "cursor"...` | RED | `capturedExitCode: undefined !== 2` — no Step 0 validation exists; init runs to completion instead of aborting |
| 12b | Empty selector rejects (Gherkin 5) | init-host-selection | `hosts: [""] -> ExitSignal(2), stderr names the empty value...` | RED | same — no Step 0 validation |
| 12c | M2-A9 tmpdir case | init-host-selection | `M2-A9: hosts: ["cursor"] + --from-source leaves no target write...` | RED | `capturedExitCode: undefined !== 2` (the fixture-is-empty / exit-2 half fails); the `cleargate-from-source-*` tmpdir-count half is separately green already today, since the current code always cleans its temp dir in the Steps 3-7 `finally` regardless of `hosts` — noted, not a false red |
| 13 | Case/comma/dedupe equivalence | init-host-selection | `"fresh"/"user-content": hosts undefined / ["claude"] / [" CLAUDE ", "claude,claude"] produce identical records` | **GREEN by design** | `hosts` has zero effect on `initHandler` today (silently-ignored extra field), so all three representations already produce byte-identical records — this is the same accidental-invariant pattern as -03's own parity file (STORY-058-04-qa-red.md is the second file to hit it; see also #14) |
| M2-A15 | Default-path routing witness | init-host-selection | `default (no-seam) init routes through the production claudeAdapter.install` | **GREEN by design** | The verbatim TPV snippet passes against unmodified `main`: `registry.resolve('claude')` already returns and calls the real singleton with no seam. This is a **mutation-testing witness**, not an acceptance criterion — it exists to catch a future *regression* ("route through the adapter only when `opts.hostRegistry` is set") during -04's Dev/TPV rounds, not to be red at the QA-Red commit |
| 14 | Byte-parity across `INIT_SCENARIOS` × 3 host forms | init-host-parity | `scenario 14: "<id>" with hosts=<label> matches the -03 captured baseline byte-for-byte` (15 tests) | **GREEN by design** | Same reason as #13 — `hosts` has no effect yet, so every selector form is behaviourally identical to `hosts: undefined`, which -03's own baseline already certifies. Confirmed 3 solo runs, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`: 15/15 pass every run |
| 15 | Repeatable+comma through the real CLI (Gherkin 2/4) | init-host-cli | `--host claude --host claude,cursor -> exit 2, stderr names "cursor"...` | RED | `exit code 1 !== 2`; stderr is Commander's own `error: unknown option '--host'\n(use \`cleargate --help\`)` — `--host` is not a registered option on `init` yet, so the real CLI wiring itself is what reds here, not a harness bug |
| 16 | Empty selector through the real CLI (Gherkin 5) | init-host-cli | `--host "" -> exit 2, stderr mentions "empty"...` | RED | same — `exit code 1 !== 0`(sic, expected 2); stderr is Commander's unknown-option message, no "empty" text yet |
| 17 | Success path through the real CLI | init-host-cli | `--host CLAUDE,claude (+ --from-source + --pin + probe stub) -> exit 0...` | RED | `exit code 1 !== 0` — same unknown-option rejection; the entire init flow never runs |

**Totals at `a178d38`:** 9/9 fail (host-selection.red.node.test.ts) · 7/10 fail, 3/10
pass-by-design (init-host-selection.red.node.test.ts) · 0/15 fail, 15/15 pass-by-design
in compare mode (init-host-parity, skipped entirely without `CLEARGATE_INIT_BASELINE`)
· 3/3 fail (init-host-cli). No test failed on a harness bug: `npm run typecheck` is
clean, and every module actually imported statically (`test/helpers/init-fixture.ts`,
`test/helpers/scaffold-roots.ts`) exists today, unchanged.

Stability: each file re-run solo 2-3 times (flashcard 2026-09-25 `#qa`/batch-noise
warning honoured — never run together, never with the default `npm test` glob for the
`.red.node.test.ts` files either, though those two ARE inside the default glob per
CR-111 naming and will run under a bare `npm test` once this lands). Identical
pass/fail counts every run:
- `host-selection.red.node.test.ts`: 9 tests / 0 pass / 9 fail — 2 runs
- `init-host-selection.red.node.test.ts`: 10 tests / 3 pass / 7 fail — 2 runs
- `init-host-parity.red.integration.node.test.ts` (compare mode): 15 tests / 15 pass / 0 fail — 3 runs
- `init-host-cli.red.integration.node.test.ts`: 3 tests / 0 pass / 3 fail — 2 runs

## -03's sealed files re-run (no helper edit made, re-run anyway for regression evidence)

- `test/hosts/host-adapter-contract.red.node.test.ts` → **19 tests / 19 pass / 0 fail**
- `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (compare mode,
  same baseline) → **5 tests / 5 pass / 0 fail**

Both match the dispatch's required 19/19 and 5/5. (No `init-fixture.ts` edit was made,
so this re-run is a courtesy regression check, not a required-by-helper-change gate.)

## Typecheck

```
npm run typecheck   → tsc --noEmit, exit 0, no output
```
Clean. `tsconfig.json` excludes `**/*.test.ts` (all four new files match), and `src/**`
is untouched by this dispatch — confirms no accidental `src/` edit slipped in.

## How the reasons were verified (not assumed)

Per M2 plan's own literal code snippets and anchor table (M2-A16, measured at cli
`0fb61b1`), cross-checked directly against the current `story/STORY-058-04` tree
(same content, confirmed by anchor grep before writing tests):
- `src/hosts/registry.ts:113-118` — `names: () => order` and
  `new UnknownHostError(name, order)` both hand out the registry's own live `order`
  array, unfrozen. This is FU-5's exact defect, confirmed by direct read (not inferred
  from the plan's prose alone) before writing the frozen-copy test.
- `src/commands/init.ts:429` — `const adapters = [registry.resolve('claude')];` —
  hardcoded, confirms scenarios 8-11's "claude always installs, others never do"
  failure mode independent of the M2 plan's own commentary.
- `src/init/copy-payload.ts:21-29` (`CopyPayloadOptions`) has no `include` field yet —
  confirms scenario 8/9's ".codex/** leaks through" failure mode.
- `src/cli.ts:144-153` — `init`'s option list has no `--host` yet; confirmed Commander's
  actual rejection shape (`error: unknown option '--host'\n(use \`cleargate --help\`)`,
  exit code 1) empirically by running scenarios 15-17, rather than assuming Commander's
  behavior.

## Plan ambiguities resolved (`orchestrator_confirmed: false`)

1. **`payloadFilter` production-identity test scope.** The M2 plan's scenario 7 says
   "production registry with `['claude']` admits every path of the composed payload."
   I read this as the FLAT composed payload (`composeCanonicalPayload`, core+claude),
   not the split `scaffold/{core,hosts/<h>}` view — matching M2-A12's table row for -04
   ("Flat view plus `include: payloadFilter(...)`"). `orchestrator_confirmed: false`.
2. **FU-5 test placement.** The M2 plan lists FU-5 under -04's Task Breakdown bullet 2
   ("Add HOST_PROFILES, ... to registry.ts ... names()/UnknownHostError.valid return a
   frozen copy") rather than under "Test scenarios 1-17." I placed its red test in
   `host-selection.red.node.test.ts` (the registry.ts unit file) since that's the file
   whose exports it exercises, rather than creating a fifth test file. `orchestrator_confirmed: false`.
3. **Scenario 12's exit-code capture mechanism.** `runInitScenario`/`invokeInit` swallow
   `ExitSignal` internally and never expose the code to the caller. Rather than editing
   `test/helpers/init-fixture.ts` (which the dispatch permits only for `after()` cleanup,
   not new capabilities), I used the existing `extra` spread-after-defaults contract to
   pass my own `exit` override that both records the code AND still throws the real
   `ExitSignal` class (so `invokeInit`'s own catch still swallows it correctly). This is
   additive, test-local, and touches no shared helper. `orchestrator_confirmed: false`.
4. **Scenario 12c's two sub-assertions have different red/green status.** The M2-A9
   addendum bundles "list `cleargate-from-source-*` entries under `os.tmpdir()` before
   and after — the two sets are equal" with "the fixture is empty" into one scenario. At
   the red commit the tmpdir-count half is already true (today's code always cleans its
   temp dir in `finally`, regardless of `hosts`), while the fixture-empty half is false.
   I kept both assertions in one test (per the plan's single-scenario framing) rather
   than splitting into two tests; the test fails on the second assertion, for the
   scenario's intended reason. `orchestrator_confirmed: false`.
5. **Scenario 13 / M2-A15 / scenario 14 "green by design."** None of these three needed
   a stated reason invented from scratch — the dispatch itself and M2-A15's own text
   ("the pre-refactor default path may already route through the adapter") anticipate
   this. I verified each is green for the *correct* underlying reason (hosts field
   currently inert; production registry's `resolve()` already returns the real
   singleton) by reading the relevant source lines, not by assuming the dispatch's
   framing was automatically true. `orchestrator_confirmed: false`.

## Script Incidents

None. No `bash .cleargate/scripts/run_script.sh`-wrapped script was invoked — all
commands were `npm run typecheck` / `npm run test:file -- <file>` inside the cli
checkout, per the dispatch's "Where" instructions (never `npm run build` here, never a
bare `cleargate`).

## flashcards_flagged

flashcards_flagged:
  - "2026-09-25 · #test-harness #init · runInitScenario's extra spreads after default seams — override extra.exit to capture ExitSignal's code, no helper edit needed."

## Re-seal (TPV round 1 → E1–E8)

New commit: `4785032` (`qa-red(STORY-058-04): re-seal per TPV E1-E8`), on `story/STORY-058-04`
on top of `a178d38`. Applied E1–E8 verbatim from `reports/STORY-058-04-tpv.md` §"Required
test edits" (M2-A17/M2-A18). No identifier adaptations were needed — `loadRegistry`,
`makeFakeAdapter`, `buildFixtures`, `listFilesRecursive` and `composeCanonicalPayload`
in `host-selection.red.node.test.ts` already matched the names E1/E2 assume, and `os`/
`CLI_ROOT` were already imported in `init-host-selection.red.node.test.ts` before E7.

Ambiguity 4 (from the original QA-Red report) is overruled per TPV W1: 12c's tmpdir-count
half was not "already true because the `finally` cleans" — it was vacuously true because
`runInitScenario` always sets `payloadDir`, which `init.ts` checks before `opts.fromSource`,
so the `--from-source` branch (and its mkdtemp) was never reached. E7 fixes this by passing
`payloadDir: undefined` and snapshotting the tempdir inside the exit seam. Ambiguities 1, 2,
3 and 5 stand as originally resolved; 7b's assertion (ambiguity 1's flat-payload scope) is
replaced by E1, not its underlying "flat view is correct" premise.

### Per-file measured counts (solo, ×2 each)

| File | Tests | Run 1 | Run 2 | Required |
|---|---|---|---|---|
| `test/hosts/host-selection.red.node.test.ts` | 11 | 0 pass / 11 fail | 0 pass / 11 fail | 0/11 |
| `test/commands/init-host-selection.red.node.test.ts` | 10 | 3 pass / 7 fail | 3 pass / 7 fail | 3/10 (13 ×2, M2-A15) |
| `test/commands/init-host-cli.red.integration.node.test.ts` | 4 | 0 pass / 4 fail | 0 pass / 4 fail | 0/4 |
| `test/commands/init-host-parity.red.integration.node.test.ts` (compare, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`) | 15 | 15 pass / 0 fail | 15 pass / 0 fail | 15/15 |
| `test/hosts/host-adapter-contract.red.node.test.ts` (-03, re-run) | 19 | 19 pass / 0 fail | — (single run, courtesy) | 19/19 |
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (-03, re-run, compare) | 5 | 5 pass / 0 fail | — (single run, courtesy) | 5/5 |

All counts reproduce the TPV's "Expected counts after re-seal" table exactly. `npm run
typecheck` → `tsc --noEmit`, exit 0, no output, both before and after the edits.

Verified the three edited files' post-edit reasons match TPV's own W1/W2/W3 accounting:
- 12c (E7) now fails at `assert.equal(capturedExitCode, 2)` (`undefined !== 2`) — a real,
  non-vacuous red, since `payloadDir: undefined` now lets `opts.fromSource` actually be
  read (confirmed by the assertion firing where W1 said it must: the exit-code check,
  not a downstream tmpdir check that could pass vacuously).
- 7b (E1) still fails today (`payloadFilter` absent), same as before — E1 changes what a
  *correct future -11* must satisfy, not today's red reason.
- 12a/12b (E5/E6) still fail at the pre-existing `capturedExitCode` assertion first (Step 0
  doesn't exist yet), so the new stdout/prefix assertions are additional, not-yet-reached
  coverage that will bind once Step 0 lands.
- 15b (E8) fails identically to 15/16: Commander rejects `--host` as unknown, exit 1.

No `src/**` change, no `test/helpers/init-fixture.ts` edit — confirmed via
`git status --short` before the commit (only the three modified test files staged,
`cleargate-0.25.0.tgz` left untouched).

### Identifier adaptations

None. Every local name E1/E2/E7/E8 assume (`loadRegistry`, `makeFakeAdapter`,
`buildFixtures`, `listFilesRecursive`, `composeCanonicalPayload`, `os`, `CLI_ROOT`,
`mkTmp`, `spawnCliInit`, `countEntries`) already matched the sealed file's own names.

### Script Incidents

None. Same constraints as the original seal: `npm run typecheck` / `npm run test:file --
<file>` only, inside the cli checkout, never a bare `cleargate`, never `npm run build`.

flashcards_flagged: []

STATUS=done
