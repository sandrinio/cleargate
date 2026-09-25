role: developer

# STORY-058-04 — Developer

Commit: `128bad6` on `story/STORY-058-04` (cli repo `cleargate-cli`), parent `4785032`
(the sealed re-seal commit, on cli `main` `55f5d95`). One commit, per the dispatch.

## Files changed

- `cleargate-cli/src/hosts/registry.ts` — `HOST_PROFILES`, `DEFAULT_HOSTS`,
  `HostSelectionError`, `collectHostOption`, `normalizeHostSelectors`,
  `payloadFilter`; `createHostRegistry` now shares one frozen
  registration-order array between `names()` and `UnknownHostError` (FU-5);
  `UnknownHostError`'s constructor also defensively freezes its own `valid`
  copy (D6 hardening).
- `cleargate-cli/src/init/copy-payload.ts` — additive `CopyPayloadOptions.include?`,
  applied as a second `.filter` on the file list (D2).
- `cleargate-cli/src/commands/init.ts` — `InitOptions.hosts?: readonly string[]`;
  Step 0 selector-validation seam; `copyPayload` call gains `include`; the
  adapter loop replaces the hardcoded `[registry.resolve('claude')]`.
- `cleargate-cli/src/cli.ts` — registers `--host <value>` on `init` with
  registry-derived help text via `collectHostOption`.

No other file touched. `git status --short` before commit showed only these
four plus the pre-existing untracked `cleargate-0.25.0.tgz`, left alone.

## Measured count table (solo, one file per command)

| File | Tests | Result |
|---|---|---|
| `test/hosts/host-selection.red.node.test.ts` | 11 | **11/11 pass** |
| `test/commands/init-host-selection.red.node.test.ts` | 10 | **10/10 pass** |
| `test/commands/init-host-cli.red.integration.node.test.ts` | 4 | **4/4 pass** |
| `test/commands/init-host-parity.red.integration.node.test.ts` (compare, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`) | 15 | **15/15 pass** |
| `test/hosts/host-adapter-contract.red.node.test.ts` (-03, re-run) | 19 | **19/19 pass** |
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (-03, re-run, compare) | 5 | **5/5 pass** |

All six match the TPV's "Expected counts after re-seal" table exactly
(11/11 · 10/10 · 4/4 · 15/15, plus -03's 19/19 · 5/5).

`npm run typecheck` → `tsc --noEmit`, exit 0, no output.

## Regression witnesses (solo, this checkout — has `dist/`, prebuilt templates, outer meta-repo)

Ran every file the dispatch's "Verify" section named (init*, copy-payload*,
uninstall, upgrade*, settings-json-surgery, claude-md-surgery, manifest,
cli-gating), plus the M2 plan's two extra copyPayload-caller witnesses
(`scaffold-cli-resolution`, `doctor`):

`init.node`(29) `init-from-source`(14) `init-gitignore-expansion`(5)
`init-no-dep0190`(2) `init-participant`(3) `init-restart-banner`(3)
`init-root-gitignore`(9) `uninstall`(20) `upgrade-changelog`(7)
`upgrade-claude-md.red`(4) `upgrade-payload-root`(3) `upgrade-pin-and-prune`(11)
`upgrade-preserves-gate-commands`(4) `upgrade-registers-new-files`(4)
`upgrade-restart-warning.red`(4) `upgrade-state-parity.red`(2) `upgrade`(14)
`copy-payload-manifest.red`(2) `copy-payload-perms`(4) `claude-md-surgery`(10)
`manifest`(30) `settings-json-surgery`(13) `scaffold-cli-resolution`(3)
`doctor`(39) `cli-gating`(20)

**Failing-test-name diff vs `main` (`55f5d95`):** empty set — every one of the
25 files above ran **0 failed / 0 cancelled** in this checkout, a clean
super-set of the `main` baseline (rule 14: 2683 tests / 2680 pass / 0 fail /
3 skipped). Unlike the TPV's scratch-clone simulation (which recorded ~8
environmental fails from a bare clone with no `dist/`, no prebuilt
`templates/`, no outer meta-repo — flashcard 2026-09-25 `#qa #test-harness`),
this checkout has all three, so none of those environmental fails reproduce
here. `include` is additive and optional; `copyPayload`'s only production
caller is `init.ts` (`command grep -rn "copyPayload(" src` confirms), so
`doctor`/`manifest`/`scaffold-cli-resolution` were never at risk — confirmed
green rather than assumed.

Did not run the full `npm test` (cross-cutting rule 14 — writes into the outer
main checkout; targeted regression witnesses above already cover every
touched surface). DevOps runs the full suite once at merge per rule 15.

## Static checks (TPV "QA-Verify additions")

```
$ command grep -nE "^export (const (HOST_PROFILES|DEFAULT_HOSTS)|class HostSelectionError|function (collectHostOption|normalizeHostSelectors|payloadFilter))" src/hosts/registry.ts
43:export const HOST_PROFILES = ['portable', 'all'] as const;
47:export const DEFAULT_HOSTS: readonly HostName[] = Object.freeze(['claude']);
50:export class HostSelectionError extends Error {
65:export function collectHostOption(value: string, previous: string[] | undefined): string[] {
82:export function normalizeHostSelectors(
139:export function payloadFilter(
```
6 lines, matches.

```
$ command grep -nE '\b(mergeSettings|injectClaudeMd|extractBlock|injectMcpJson)\(' src/commands/init.ts
(no output)
```

```
$ git diff main -- src/init/copy-payload.ts
```
Shows only the additive `include?` field on `CopyPayloadOptions` and the
second `.filter((r) => (opts.include ? opts.include(r) : true))` — no other
change to the file.

## Anchor lines for M3 tags T6–T10 (measured at `128bad6`)

- **`selected` binding / Step 0** — `src/commands/init.ts`:
  - `hostRegistry?: HostRegistry;` → `:113`
  - `hosts?: readonly string[];` → `:119`
  - `// Step 0: Normalize --host selectors (STORY-058-04)...` → `:241`
  - `let selected: HostName[];` → `:244`
  - `selected = normalizeHostSelectors(opts.hosts, registry);` → `:246`
  - `const adapters = selected.map((n) => registry.resolve(n));` → `:461`
- **`copyPayload(..., { include })` / `payloadFilter` signature**:
  - `const copyReport = copyPayload(payloadDir, cwd, {` → `src/commands/init.ts:419`
  - `include: payloadFilter(registry, selected),` → `src/commands/init.ts:422`
  - `export function payloadFilter(` → `src/hosts/registry.ts:139`
- **`cleargate-from-source-` bridge line after Step 0** (unmoved by this story,
  now downstream of Step 0): `tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cleargate-from-source-'));`
  → `src/commands/init.ts:298`
- **`cli.ts` `init` command block**: `program` → `:145`; `.command('init')` →
  `:146`; `--host` option → `:152-156`; block closes (`});`) → `:165`.
  `.command('doctor')` → `:575`; `.command('uninstall')` → `:633`.
- **`InitOptions.hosts` / `hostRegistry`**: `src/commands/init.ts:113` (`hostRegistry`)
  and `:119` (`hosts`, added directly beneath it).

## Deviations from the plan

None. Implemented the TPV's "Simulation"/"Reference implementation" and the
binding D1–D8 constraints verbatim: Step 0 placed exactly between the
`registry` seam and `// Step 1`; `include` applied as the second `.filter` at
`copy-payload.ts` before the copy loop, never inside it; `payloadFilter` uses
`pathUnderRoots` for both owned and shared checks (no bare `startsWith`);
`all`/`portable` derived from `registry.names()` at call time; the result
accumulates in a `Set` and returns in registry order; one frozen `order`
array serves both `names()` and `UnknownHostError`, `claudeAdapter` left
unfrozen; `--host` registered with `collectHostOption` as the parser
(non-variadic, not last-wins); no new stdout line on a valid selection (both
parity files enforce this and stayed green). One implementation liberty
beyond the plan's literal snippet: `DEFAULT_HOSTS` is `Object.freeze(['claude'])`
rather than a plain array — behaviourally identical (every consumer spreads
it via `[...DEFAULT_HOSTS]` before returning), so not listed as a
`plan_deviations` entry.

## Flashcards

None new. Every surprise in this story's territory (vacuous scenario 12c,
the 7b census time-bomb, empty-dir leak via `include`-after-mkdir, last-wins
CLI parsing, registry-derived profiles) was already flagged by TPV/QA-Red and
is present in `.cleargate/FLASHCARD.md`.

flashcards_flagged: []

---

STORY: STORY-058-04
STATUS: done
COMMIT: 128bad6
TYPECHECK: pass
TESTS: 64 passed, 0 failed (11 host-selection + 10 init-host-selection + 4 init-host-cli + 15 init-host-parity + 19 -03 host-adapter-contract + 5 -03 claude-adapter-init-parity), plus 25 regression-witness files all green (0 failed / 0 cancelled across every one)
FILES_CHANGED:
  - /Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli/src/hosts/registry.ts
  - /Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli/src/init/copy-payload.ts
  - /Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli/src/commands/init.ts
  - /Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli/src/cli.ts
  - /Users/ssuladze/Documents/Dev/ClearGate/.cleargate/delivery/pending-sync/STORY-058-04_init_host_selector_parsing.md (Task Breakdown ticked)
NOTES: Implemented the TPV's binding D1–D8 constraints verbatim across the four cli files; all sealed/re-sealed counts reproduce exactly (11/11, 10/10, 4/4, 15/15, plus -03's 19/19 and 5/5), typecheck is clean, static QA-Verify greps match, and 25 regression-witness files ran 0 failed in this checkout (a clean superset of main's baseline, since this checkout — unlike the TPV's bare scratch clone — has dist/, prebuilt templates and the outer meta-repo). No plan deviations beyond a harmless `Object.freeze` on `DEFAULT_HOSTS` not present in the plan's literal snippet; no new flashcards, since every surprise in this story's surface was already captured by QA-Red/TPV.
r_coverage:
  - { r_id: "R1", covered: true, deferred: false, clarified: false }
  - { r_id: "R2", covered: true, deferred: false, clarified: false }
  - { r_id: "R3", covered: true, deferred: false, clarified: false }
  - { r_id: "R4", covered: true, deferred: false, clarified: false }
  - { r_id: "R5", covered: true, deferred: false, clarified: false }
plan_deviations: []
adjacent_files:
  - "cleargate-cli/src/hosts/claude.ts"

STATUS=done
