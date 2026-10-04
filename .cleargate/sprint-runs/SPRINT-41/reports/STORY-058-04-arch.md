# STORY-058-04 — Architect post-flight

role: architect

ARCH: PASS

**Subject.** cli `story/STORY-058-04` @ `128bad6`. Its parent is the sealed re-seal commit `4785032`, whose parent is main `55f5d95`. I read everything with `git show` / `git diff`; no build, stash, checkout or suite run.

**Diff shape (`git diff --stat 55f5d95 128bad6 -- src scaffold scripts package.json tsconfig.json test/helpers`):**
- Exactly 4 files change, +203/−10: `src/cli.ts`, `src/commands/init.ts`, `src/hosts/registry.ts` and `src/init/copy-payload.ts`.
- `git diff 4785032 128bad6 -- test` is empty, so no sealed or re-sealed test changed after the seal.
- These are untouched: `src/hosts/claude.ts`, `src/hosts/types.ts`, `uninstall.ts`, `upgrade.ts`, the five surgery helpers, `scaffold/**`, `scripts/**` and `test/helpers/**`.

**Verdict.** Every D1–D8 constraint (M2-A19) and every plan item holds. The Developer's "no deviations" claim holds, with two permitted liberties (rows 4 and 12). I found no defect, so there is no bounce. The forward findings below are routed as FU-1..FU-8. Two of them are binding M3 blueprint amendments, and the orchestrator must apply them before -06's QA-Red seals: **M3-A1 and M3-A2** in the `plans/M3.md` append.

## Conformance

| # | Plan item / constraint | As built (`128bad6`) | Verdict |
|---|---|---|---|
| 1 | **D1.** Step 0 goes immediately after the `registry` seam and before `// Step 1`. Body: `stderr('[cleargate init] ERROR: …\n'); exit(2); return;`, and any other error is rethrown. | `init.ts:239` seam; Step 0 `:241-254` (`let selected: HostName[]` `:244`, `normalizeHostSelectors(opts.hosts, registry)` `:246`, `HostSelectionError` branch `:248-252`, rethrow `:253`); `// Step 1` `:256` | ✅ |
| 2 | **D2.** `include` is a second list `.filter`, never applied inside the loop after `mkdirSync` | `copy-payload.ts:141-143` (the `SKIP_FILES` filter, then the `include` filter); `mkdirSync` is at `:150`, inside the loop over the filtered list | ✅ |
| 3 | **D3.** Owned and shared checks use `pathUnderRoots` only | `registry.ts:150`, `:154` (`pathUnderRoots` at `:189-191`); no bare `startsWith(root)` | ✅ |
| 4 | **D4.** Profiles come from `names()` at call time: `all` = `names`, `portable` = `names.filter(n => n !== 'claude')` | `registry.ts:90`, `:107` | ✅ |
| 5 | **D5.** A `Set` accumulator, returned in registry order | `registry.ts:93`, `:128` (`names.filter((n) => wanted.has(n))`) | ✅ |
| 6 | **D6.** One frozen order array serves both `names()` and `UnknownHostError`. `claudeAdapter` is not frozen. | `registry.ts:248` (`frozenOrder`), `:251`, `:255`. The constructor also freezes its own copy (`:32`), which D6 explicitly permits. `claude.ts` is untouched. | ✅ (permitted liberty) |
| 7 | **D7.** `.option('--host <value>', help, collectHostOption)`: not variadic, not last-wins, help derived from the registry, import from `./hosts/registry.js` | `cli.ts:36` import; `:152-156` option; `:163` `hosts: opts.host` | ✅ |
| 8 | **D8.** No new stdout line on a valid selection | The diff adds no `stdout(` call. The parity files enforce this (15/15, 5/5, per the Dev report). | ✅ |
| 9 | Registry exports: `HOST_PROFILES`, `HostProfile`, `DEFAULT_HOSTS`, `HostSelectionError` (`name`, `value`), `collectHostOption` (copies, never mutates), `normalizeHostSelectors(raw, registry = defaultHostRegistry)`, `payloadFilter(registry, selected)` | `registry.ts:43`, `:44`, `:47`, `:50-58`, `:65-67`, `:82-129`, `:139-162` | ✅ |
| 10 | Three error messages, verbatim | `registry.ts:100-103` (empty), `:109-112` (profile), `:119-122` (unknown). Each starts with `--host: `. | ✅ |
| 11 | Absent or `[]` input yields `['claude']`. Pipeline: split, then trim, then lowercase; an empty token is an error; profile expansion (an empty expansion is an error); the token must be registered; dedupe. | `registry.ts:86-88`, `:95-128` | ✅ |
| 12 | `DEFAULT_HOSTS` is a plain `readonly` array | It is `Object.freeze(['claude'])` (`:47`). The value is never handed out, because `normalizeHostSelectors` returns `[...DEFAULT_HOSTS]` (`:87`), which is TPV mutant M-w and equivalent. | ✅ (noted liberty) |
| 13 | `InitOptions.hosts?: readonly string[]` with a doc comment, placed after `hostRegistry?` | `init.ts:114-119` | ✅ |
| 14 | `copyPayload(..., { force, pinVersion, include: payloadFilter(registry, selected) })` | `init.ts:419-423` | ✅ |
| 15 | The -03 loop becomes `selected.map((n) => registry.resolve(n))`, still inside the Steps 3–7 `try` (M2-A1/A2) | `init.ts:461`; the `try` spans `:359` → `} finally {` `:634` | ✅ |
| 16 | Step 7 is unchanged (the `hosts` key is -06's) | `init.ts:573-622`: the Step 7 block is identical to `55f5d95:541-590`, shifted +32 | ✅ |
| 17 | Header step list | `init.ts:5` (`0. Normalize --host selectors …`) | ✅ |
| 18 | FU-5 (-03 post-flight) | Row 6 | ✅ |
| 19 | M2-A15 witness and M2-A17/A18 re-seal (E1–E8) respected | Tests untouched since `4785032`. The Dev measured 11/11, 10/10, 4/4, 15/15 and -03's 19/19, 5/5, matching TPV's "Expected counts after re-seal". Re-running is QA-Verify's job. | ✅ |
| 20 | Files — outer: Orchestration rows only | The Dev ticked the story's Task Breakdown boxes. The orchestrator committed that in `3aebcc95`; it is a literal Orchestration row. | ✅ |

**The Dev report's anchors (T6–T10) all verify exactly:** `init.ts:113`, `:119`, `:241`, `:244`, `:246`, `:461`, `:419`, `:422`, `:298`; `registry.ts:139`; `cli.ts:145`, `:146`, `:152-156`, `:165`, `:575`, `:633`.

## Design quality

**`payloadFilter` semantics (`registry.ts:139-162`)** are correct for every future consumer. The rule is: an owned root admits the path iff its host is selected; a shared root admits it iff a **selected** adapter declares a covering shared root; anything else is core and is admitted.
- **Owned-first is unambiguous.** `createHostRegistry` forbids an owned root that overlaps any other adapter's owned or shared root, and checks it in both registration orders (`:215-235`). A path therefore matches at most one owner, and never a foreign shared root.
- **Shared semantics equal -05's orphan rule** ("kept iff a remaining installed adapter declares a covering shared root", M3 `:366`). So `payloadFilter(registry, nextHosts)` and `planHostRemoval` agree by construction.
- **-06 Step 7:** the flat-view manifest filtered through the same predicate is the identity under the production registry with `['claude']`. That is what parity asserts today on the copy side.
- **-07 `selectEntriesForHosts`:** `payloadFilter(registry, [])` is valid and admits core only, so no special case is needed when no installed host is registered. `known` needs a `HostName[]` type guard (FU-7).
- **-10/-11:** `.agents/**` placed in `scaffold/core` under codex `sharedRoots(['.agents'])` is excluded from a claude-only install (sealed scenario 7a). **Root-level surgery targets such as `AGENTS.md` are not handled.** They classify as core and are admitted. That is -10's job, but the rule M3 T4 item 8 prescribes for it now contradicts sealed E1 (FU-1).

**`copyPayload`'s `include` versus `SKIP_FILES` and the force path (`copy-payload.ts:141-231`).**
- The two filters combine as a conjunction: `SKIP_FILES` (`CLAUDE.md`, `MANIFEST.json`, `:73`) runs first, so `include` never sees them.
- `force`, `FIRST_INSTALL_ONLY` and the exec-bit re-assertion act only on files that survive both filters. `--force` therefore never overwrites or re-chmods an unselected host's files (Rule 3).
- No empty foreign root is created, because the filter runs before the per-file `mkdirSync` at `:150` (E3 and E4 witness this).
- The only production caller is `init.ts` (`git grep copyPayload( 128bad6 -- src`). The field's doc (`:31-32`) wrongly lists "doctor, manifest" as callers: those are witness test files, not callers. This is a doc nit (FU-8).

**Step 0 leaves no half-state.**
- Lines `:229-239` only bind seams.
- Step 0 runs before the write probe (`:264-272`), the `Target:` line (`:274`), the `--from-source` `mkdtemp` (`:298`) and the Steps 3–7 `try` (`:359`).
- `exit(2)` is called inside Step 0's own `catch`:
  - A throwing seam (`ExitSignal`) propagates straight out, with no enclosing `try` or `finally`.
  - A returning seam hits `return`.
  - Production `process.exit` has nothing pending.
- `selected` is definitely assigned on every path that reaches `:419`, because the catch returns or rethrows.

**The error-message contract matches story §3.3** (`[cleargate init] ERROR: --host: … ` then exit 2 before any write).
- Every `HostSelectionError` message starts `--host: `, and the only prefixing site is `:249`.
- The `unknown` case quotes the **normalized** token: `--host Cursor` prints `unknown host "cursor"`. Gherkin 4 needs "names `cursor`" and is satisfied.
- `.value` is the normalized token for unknown and profile errors, and the raw occurrence for empty errors (scenario 4 needs `.value === 'cursor'`).
- An `UnknownHostError` cannot reach the user from `init`, because `selected ⊆ names()`.

**`cli.ts` help derivation (`:152-156`).**
- The text interpolates `defaultHostRegistry.names().join('|')` and `HOST_PROFILES.join('|')` at module load, so after -10 it reads `claude|codex` with no edit.
- `(default: claude)` is a literal, as in the plan. It is a Rule-2 constant and will never change (close).
- No new startup module: `cli.ts` already loads `registry.ts` transitively through `init.ts`.
- There is no import cycle, because `claude.ts` imports only `init/*`, `lib/*` and `./types.js` (`claude.ts:11-19`).
- The program-level `--all` (`cli.ts:73`) does not collide, because `all` is consumed as the option's value. `--host --all` fails as an unknown host: user error, harmless.
- No test pins the `init --help` text (`git grep` over `test/`).

**Interim state, known and closed by -06.** Step 7 still snapshots every payload-manifest entry. A fixture `hosts: ['codex']` install at `128bad6` therefore records `.claude/**` entries it never copied. This cannot happen in production (the registry is `{claude}`) until -06 filters it.

## Forward impact on M3 (-06, -05, -07, BUG-085)

- **-06.** T6, T8 and the T5 rows moved by +28 to +32 lines. They are re-derived in the M3 append. Two blueprint changes are forced:
  - **M3-A1:** one hoisted `include` predicate shared by copy and Step 7.
  - **M3-A2:** snapshot `hosts` must be the *installed set*. -04 made `selected` concrete as *this run's* selection: absent means `['claude']` regardless of any prior install. The -06 blueprint's `hosts: [...selected]`, together with the entry filter, would make `init --host codex` on an existing Claude install (reachable once -10 registers codex) record `hosts: ['codex']` and drop every claude entry from the snapshot. That violates Rule 3 and story -06 §1.2 ("the installed set"), and orphans claude from `host list`, `doctor` and `uninstall`.
- **-05.**
  - The `host` block inserts after `cli.ts:165`.
  - `addHost`'s `include` (owned ∪ shared roots of the added host) is consistent with D2 and `payloadFilter`.
  - `addHost` reuses -06's `mergeInstalledHosts` (M3-A2).
  - Its default payload source must stay a single function so -10 can switch it (FU-4).
- **-07.** Doctor and uninstall `--host` anchors moved (`cli.ts:574-610`, `:632-669`). `selectEntriesForHosts` works on `payloadFilter` unchanged.
- **BUG-085.** No impact. -04 touched neither `doctor.ts`, `drift-check.ts`, the sentinel nor `validate_state.mjs`. T11 stays open until -07 merges.

## Follow-ups

| FU | Finding | Route |
|---|---|---|
| FU-1 | **M3 T4 item 8, and -03 arch FU-4's "exclude … from `payloadFilter`" wording, would turn sealed E1 red.**<br>• E1 (`test/hosts/host-selection.red.node.test.ts:263-287`) asserts that `payloadFilter(defaultHostRegistry, ['claude'])` admits every composed-payload path that no non-claude adapter declares.<br>• That includes the root `CLAUDE.md`, which the composed payload carries (`composeCanonicalPayload`, `test/helpers/scaffold-roots.ts:53-63`).<br>• `CLAUDE.md` is claude's own surgery target and lies under no owned root (`claude.ts:227`). "Exclude **every** registered adapter's root-level surgery targets" therefore returns `false` for it, and E1 goes red.<br>**Decided:** -10 (a) admits a root-level surgery target iff a **selected** adapter declares it (the shared-root rule), and (b) keeps the never-wholesale copy rule at the copy layer. The details are M3-A3. | **-10** (dispatch text; M3-A3 supersedes T4 item 8) |
| FU-2 | Snapshot `hosts` = the installed set (prior ∪ selected, registry order). Entries of installed-but-unselected hosts carry forward. New pure helper `mergeInstalledHosts` in `src/lib/manifest.ts`. Never call `installedHosts(null)` for the prior set, because it returns the legacy `['claude']`. Details and the new scenario 21 are in M3-A2. | **-06** (binding before QA-Red seals; also C6's Task Breakdown row) |
| FU-3 | Hoist `const include = payloadFilter(registry, selected);` above `init.ts:419`, pass it to `copyPayload`, and reuse it at Step 7 (`:599`), all within the same `try`. This gives one predicate object, not two calls (M3-A1). | **-06** |
| FU-4 | **Payload source per selection.** -04's Step 0 precedes Step 2, so -10 picks the view in Step 2 from `selected`:<br>• A selection containing a non-claude host gets `buildInstallView` over `templates/scaffold/core` plus each selected `hosts/<h>`.<br>• That temp dir is tracked in `fromSourceTempDir` so the finally at `:634-641` removes it.<br>• A compose error exits before the `try` (M2-A2).<br>• The `--from-source` bridge composes the selected hosts, not the hard-coded `hosts/claude` (`init.ts:300`).<br>• -05's `hostAddHandler` resolves its default `payloadDir` through one private function in `host.ts`, so -10 swaps that one site instead of shipping `host add codex` against the core+claude flat view. | **-10** (+ **-05** single-site payload resolution) |
| FU-5 | Keep `AGENTS.md` (and any root block source) out of `TIER_RULES` / in `INTENTIONALLY_UNTRACKED`, like `CLAUDE.md`. Otherwise the snapshot records the payload sha of a file that is only ever block-edited, and doctor reports it `user-modified` forever. | **-10** |
| FU-6 | Refresh the cli anchors for -05 and -07 (`cli.ts:36`, `:165`/`:167`, `:574-610`, `:632-669`) and -05's verb mirror (`init.ts:424-432`) and `resolveDefaultPayloadDir` (`init.ts:136`). | **-05**, **-07** (in the M3 append) |
| FU-7 | `selectEntriesForHosts` narrows `known` with a `HostName` type guard before `payloadFilter(registry, known)`. An empty `known` needs no special case. | **-07** |
| FU-8 | The `CopyPayloadOptions.include` doc (`copy-payload.ts:31-32`) names "doctor, manifest" as `copyPayload` callers. They are witness test files, not callers; the only production caller is `init.ts`. Fix it whenever `copy-payload.ts` is next edited. | **close** (doc nit) |

**No action (recorded):**
- TPV's advisory orphan `mkdtemp` directories in the new tests.
- The literal `(default: claude)`.
- `DEFAULT_HOSTS` is not validated against the registry: a registry without claude plus no flag throws after the copy. This cannot happen in production: -03's sealed scenario 1 pins `'claude' ∈ defaultHostRegistry.names()`.

## *Adjacent Implementations* row (orchestrator pastes it after the merge; it refines M2 open decision 5)

> | STORY-058-04 | `normalizeHostSelectors(raw, registry?)` → registry-ordered deduped `HostName[]` (absent/`[]` → `['claude']`); `collectHostOption` (commander accumulator); `payloadFilter(registry, selected)` (owned → selected host; shared → a selected declarer; else core; root-level surgery targets not yet handled — M3-A3); `HOST_PROFILES` (`portable` = all but claude, `all` = `names()`); `DEFAULT_HOSTS` (frozen); `HostSelectionError` (`.value`); frozen `names()`/`UnknownHostError.valid`; `copyPayload(..., { include })` (list filter before `mkdirSync`); `InitOptions.hosts` + `selected` (Step 0, before any write) | `cleargate-cli/src/hosts/registry.ts`, `src/init/copy-payload.ts`, `src/commands/init.ts`, `src/cli.ts` |

## Script Incidents

None. No wrapped script was invoked. I ran only read-only `git show`/`git diff`/`git grep`/`git log`/`git status` in both repos, and wrote copies of `init.ts`/`cli.ts` at `55f5d95` and `128bad6` into the session scratchpad for grep.

flashcards_flagged:
  - "2026-09-25 · #host #copy #test-harness · Sealed E1 needs payloadFilter to admit claude's own CLAUDE.md; exclude only UNSELECTED hosts' root surgery targets."
  - "2026-09-25 · #manifest #host · Snapshot hosts = installed set, not this run's --host selection; init --host codex on a Claude install keeps claude."
  - "2026-09-25 · #manifest #host #danger · installedHosts(null) returns the legacy ['claude']; a prior-hosts merge must use prior ? installedHosts(prior) : []."

STATUS=done
