# STORY-058-03 — QA-Red

role: qa

Mode: RED. cli repo `cleargate-cli`, branch `story/STORY-058-03`, cut from `main` at `a821d40`. Commit: `11fe514` (`qa-red(STORY-058-03): write failing tests`). Tests + `test/helpers/init-fixture.ts` only — no `src/**` change, verified by `git status --short` before commit (only the three new test-tree files staged; one pre-existing unrelated untracked artifact `cleargate-0.25.0.tgz` left untouched).

## Deliverables

- `cleargate-cli/test/helpers/init-fixture.ts` — frozen-clock `initHandler` fixture. Exports `FROZEN_NOW`, `FIXED_PIN`, `ExitSignal`, `ScenarioId`, `INIT_SCENARIOS` (5-element: fresh/user-content/reinit/malformed/force), `seedUserContentFixture(dir)`, `runInitScenario(id, {payloadDir?, extra?})`, `captureOrCompare(baselineDir, id, record, sourceDir?)`.
- `cleargate-cli/test/hosts/host-adapter-contract.red.node.test.ts` — scenarios 1-11 (19 leaf tests, 11 describe groups).
- `cleargate-cli/test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` — scenario 12 (5 tests, one per `INIT_SCENARIOS` entry).

## Per-scenario table

| # | Scenario | Test name(s) | Red/Green @ 11fe514 | Failure reason |
|---|---|---|---|---|
| 1 | Contract shape | `defaultHostRegistry.names() includes claude; resolve("claude") exposes the full HostAdapter surface` | RED | `ERR_MODULE_NOT_FOUND` — `src/hosts/registry.js` absent |
| 2 | Resolve / registration order | `createHostRegistry preserves registration order; resolve returns the exact instance given` | RED | `ERR_MODULE_NOT_FOUND` — `src/hosts/registry.js` absent |
| 3 | Reject unknown | `resolve throws UnknownHostError for bogus/case-mismatch/prototype-pollution names` | RED | `ERR_MODULE_NOT_FOUND` — `src/hosts/registry.js` absent |
| 4 | Registry invariants | `rejects a duplicate adapter name` | RED | `ERR_MODULE_NOT_FOUND` — `src/hosts/registry.js` absent |
| 4 | Registry invariants | `rejects owned roots where one lies inside another (.claude vs .claude/hooks)` | RED | `ERR_MODULE_NOT_FOUND` — `src/hosts/registry.js` absent |
| 4 | Registry invariants | `rejects an owned root equal to another adapter's shared root` | RED | `ERR_MODULE_NOT_FOUND` — `src/hosts/registry.js` absent |
| 4 | Registry invariants | `rejects malformed root strings: absolute, parent-traversal, trailing slash, empty` | RED | `ERR_MODULE_NOT_FOUND` — `src/hosts/registry.js` absent |
| 4 | Registry invariants | `accepts two adapters sharing the same shared root` | RED | `ERR_MODULE_NOT_FOUND` — `src/hosts/registry.js` absent |
| 5 | Path ownership | `true for the root itself and a nested path; false for a sibling prefix, an unrelated file, or an unrelated tree` | RED | `ERR_MODULE_NOT_FOUND` — `src/hosts/registry.js` absent |
| 6 | Claude declarations | `ownedRoots is [".claude"], sharedRoots is [], surgeryTargets is the 3-file set` | RED | `ERR_MODULE_NOT_FOUND` — `src/hosts/claude.js` absent |
| 7 | Install delegation | `on a bare fixture` | RED | `ERR_MODULE_NOT_FOUND` — `src/hosts/claude.js` absent |
| 7 | Install delegation | `on a user-content fixture` | RED | `ERR_MODULE_NOT_FOUND` — `src/hosts/claude.js` absent |
| 8 | Remove delegation + inverse | `strips ClearGate content, preserves user content, leaves .mcp.json untouched, and calls the real surgery helpers once each` | RED | `ERR_MODULE_NOT_FOUND` — `src/hosts/claude.js` absent |
| 8 | Remove delegation + inverse | `on a directory with neither file: no throw, removed: []` | RED | `ERR_MODULE_NOT_FOUND` — `src/hosts/claude.js` absent |
| 8 | Remove delegation + inverse | `on a marker-less CLAUDE.md: no throw, file byte-unchanged, stderr warns` | RED | `ERR_MODULE_NOT_FOUND` — `src/hosts/claude.js` absent |
| 9 | Hook literal guard | `every CLAUDE_HOOK_ADDITION command byte-matches the canonical settings.json, under the same event/matcher` | RED | `ERR_MODULE_NOT_FOUND` — `src/hosts/claude.js` absent |
| 9 | Hook literal guard | `a fresh install's .claude/settings.json contains each command string exactly once` | RED | `ERR_MODULE_NOT_FOUND` — `src/hosts/claude.js` absent |
| 10 | Routing (Gherkin 1 first half) | `no-flag init calls install exactly once with the correct ctx, and remove zero times` | RED | `ERR_MODULE_NOT_FOUND` — `src/hosts/registry.js` absent |
| 11 | No reimplementation (static) | `no CLEARGATE:START regex literal and no mcpServers token` | RED | `AssertionError`: "expected src/hosts/claude.ts to exist at .../src/hosts/claude.ts" (explicit existence assertion, not an import throw — file genuinely absent) |
| 12 | Byte-identity (integration) | `scenario 12: "fresh"/"user-content"/"reinit"/"malformed"/"force" matches the captured baseline byte-for-byte` | **GREEN by design** | Compares pre-refactor `initHandler` against a baseline captured from that same pre-refactor code (see below) |

All 19 unit-file leaf tests fail for the intended reason: either `ERR_MODULE_NOT_FOUND` resolving `src/hosts/registry.js` or `src/hosts/claude.js` (both genuinely absent at this commit — confirmed by `ls cleargate-cli/src/hosts/` returning nothing), or (scenario 11 only) an explicit `assert.ok(fs.existsSync(...))` failure, which is deliberately an assertion rather than an import throw since that test's whole point is "the file doesn't exist yet / doesn't reimplement" and a raw import would collapse the distinction the TPV needs. No test fails on a harness bug: `npm run typecheck` is clean (see below), and every module actually imported statically (`inject-claude-md.ts`, `merge-settings.ts`, `inject-mcp-json.ts`, `claude-md-surgery.ts`, `settings-json-surgery.ts`, `test/helpers/scaffold-roots.ts`, `test/helpers/init-fixture.ts`, `src/commands/init.ts`) exists today, unchanged.

Verified stable across 3 solo runs (`npm run test:file`, one file at a time — flashcard 2026-09-25 `#qa`/#16 batch-noise warning honoured): unit file `19 tests / 0 pass / 19 fail` every run; integration file `5 tests / 5 pass / 0 fail` every run in compare mode.

## Baseline capture evidence

Command (per M2 plan, run before any `src/` change exists — confirmed `src/hosts/` absent at capture time):
```
CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline CLEARGATE_INIT_BASELINE_CAPTURE=1 \
  npm run test:file -- test/hosts/claude-adapter-init-parity.red.integration.node.test.ts
```
Result: `5 tests / 5 pass / 0 fail` (capture mode performs no assertion, only refuses a non-empty target dir — none existed).

- cli HEAD sha at capture: `a821d402ef18fa924a3113f1f0be093e3e54491b` (commit under test was staged but not yet made; capture ran against the working tree at that SHA plus the uncommitted new test files, which is correct — the baseline records pre-refactor `src/` behavior, and the test files are the instrument, not the subject).
- File count: **425** files under `/private/tmp/cg-s41-m2-init-baseline` (5 scenario subdirs × ~85 files/tree + 5 `meta.json`).
- Total bytes: **4,619,226**.
- sha256 of sorted listing: the plan's literal recipe (`find <dir> -type f | sort | xargs shasum -a 256 | shasum -a 256`) breaks on a payload filename containing spaces (`.cleargate/templates/Sprint Plan Template.md` — word-splits under unquoted `xargs`); re-ran with NUL-delimited `-print0`/`sort -z`/`xargs -0` for a correct value:
  ```
  find /private/tmp/cg-s41-m2-init-baseline -type f -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256
  → bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2  -
  ```
- Baseline layout: `<dir>/<scenario-id>/tree/**` (the real installed file tree, byte + mode exact) + `<dir>/<scenario-id>/meta.json` (`{files, stdout, stderr}` record for programmatic compare). Not deleted; left in place for the rest of M2 per the plan.

## Determinism re-run

Re-ran the same file **3 times** without the capture flag (`CLEARGATE_INIT_BASELINE` set, `CLEARGATE_INIT_BASELINE_CAPTURE` unset → compare mode):
```
CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline npm run test:file -- test/hosts/claude-adapter-init-parity.red.integration.node.test.ts
```
All 3 runs: `5 tests / 5 pass / 0 fail`. This proves the harness is deterministic — frozen clock (`FROZEN_NOW`) and fixed pin (`FIXED_PIN`) mean no `generated_at` or wall-clock byte leaks into the recorded tree/stdout/stderr, and the stubbed `spawnSyncFn`/`readInstallManifest` remove the last two sources of environment-dependent output (PATH-dependent resolver branch, real MANIFEST.json timestamp/version).

Note (informational, not a defect): the `.mcp.json` restart banner (`emitMcpRestartBanner`, `src/lib/banners.ts`) writes directly to the real `process.stderr`, bypassing the injected `stderr` seam. It fires on every scenario including `malformed` (that file's `.mcp.json` write is a JSON.parse failure inside `extractSessionLoadDelta`, which is deliberately conservative and returns `true`/"warn" on any parse failure). This is unrelated to the HostAdapter refactor (the banner call site sits after the Steps 3-7 try/finally, never moved into `claude.ts`) and is invisible to our captured record either way — noted so a future reader isn't surprised by the banner text appearing in the terminal during a green run.

## Typecheck

```
npm run typecheck   → tsc --noEmit, exit 0, no output
```
Clean. `tsconfig.json` excludes `**/*.test.ts` (all three new files match that glob), and `src/**` is untouched by this dispatch, so this is expected — confirms no accidental `src/` edit slipped in.

## Plan ambiguity resolved (`orchestrator_confirmed: false`)

1. **`runInitScenario` return shape.** The M2 plan documents `runInitScenario(id, {payloadDir, extra?}) → {files, stdout, stderr}`. I added a fourth field, `dir` (the fixture root), because `captureOrCompare`'s capture mode needs real source bytes to populate `<baselineDir>/<id>/tree/**` — the plan's own capture recipe (`find <dir> -type f | sort | xargs shasum -a 256`) only makes sense against a real file tree, not a hash-only record. This is additive (existing `{files, stdout, stderr}` destructuring still works) and does not change any comparison semantics — `captureOrCompare` still only diffs `files`/`stdout`/`stderr`.
2. **`captureOrCompare` arity.** Documented as `captureOrCompare(baselineDir, id, record)`. I added an optional 4th parameter, `sourceDir`, used only in capture mode to physically copy bytes (see above). Compare mode ignores it entirely and needs only `record.files`' hashes.
3. **Byte-identity hashing.** Used a raw (non-normalized) sha256 over each file's exact bytes in `listFiles()`, not `hashNormalized` from `src/lib/sha256.ts` — that helper strips BOM/CRLF/enforces trailing newline, which would mask exactly the byte-level differences a "byte-identical" acceptance criterion (Gherkin scenario 1) needs to catch.
4. **`user-content` / `malformed` seed content.** The story's Gherkin and M2 plan describe the *shape* of these fixtures ("one user PreToolUse hook plus a stale stamp-and-gate command", "settings.json and .mcp.json hold `{not json`") but not exact literal values. I chose concrete, deterministic content satisfying the shape (see `seedUserContentFixture` in `test/helpers/init-fixture.ts`). Since scenario 12 compares the SAME seed function's output pre- vs. post-refactor, the exact literal choice doesn't affect what's being proven; only determinism and shape-fidelity matter, and both hold (3-run determinism check above).
5. **Test-layer naming (CR-111).** Followed the dispatch's naming instruction literally: integration-layer red is `claude-adapter-init-parity.red.integration.node.test.ts` (dot form, not the legacy hyphenated form).

## Script Incidents

None. No `bash .cleargate/scripts/run_script.sh`-wrapped script was invoked — all commands were `npm run typecheck` / `npm run test:file -- <file>` inside the cli checkout, per the dispatch's explicit "Where" instructions (never a bare `cleargate`, never `npm run build` in this checkout).

## flashcards_flagged

flashcards_flagged: []

STATUS=done
