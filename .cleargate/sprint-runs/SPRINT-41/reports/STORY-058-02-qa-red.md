# STORY-058-02 — QA-Red report

role: qa

Mode: RED. Wrote failing tests against the M1 plan (`sprint-runs/SPRINT-41/plans/M1.md`
§STORY-058-02) test scenarios 1-13, plus STORY-058-01 post-flight carry-forwards 1-2. Read
`sprint-context.md` (rules 9-18, the Rule-10 amendment, and *Adjacent Implementations*), the story
file, the M1 plan section, the as-built STORY-058-01 code
(`scaffold-layout.mjs`/`.d.mts`, `scaffold-source.ts`, `build-manifest.ts`, `verify-pack.mjs`,
`copy-planning-payload.mjs`, `init.ts`, `manifest.ts`, `scaffold/**`) per the dispatch's explicit
"Read first" list, the STORY-058-01 red tests as a style precedent, and the flashcard grep. No
implementation edit made; no repointing of any existing test file.

Branch: `story/STORY-058-02` in the cli main checkout, cut from `story/STORY-058-01`'s merge commit
`464e1e4`. cli-only — no outer worktree.

## RED_TESTS

- `cleargate-cli/test/scripts/scaffold-layout.red.node.test.ts` (unit — scenarios 1-9, carry-forwards 1-2)
- `cleargate-cli/test/scripts/scaffold-standalone.red.integration.node.test.ts` (integration — scenarios 10-13)

Both untracked/uncommitted per the "do not commit" rule (`git status --porcelain` shows only the two
new files plus a pre-existing, unrelated `cleargate-0.25.0.tgz` that was already untracked before
this dispatch started).

## Scope table

| Scenario (M1 plan §STORY-058-02) | Test(s) |
|---|---|
| 1. Valid layout | `scaffold-layout...`: "resolveScaffoldRoot does not throw for a valid core/host fixture...", "REQUIRED_ITEMS names the exact core/host layout..." |
| 2. PATH_MISSING | `scaffold-layout...`: "a nonexistent --from-source path throws ScaffoldSourceError with code PATH_MISSING" |
| 3. LAYOUT_INVALID naming exact missing items; wrong case/type | `scaffold-layout...`: "an empty source directory names all three...", "a source with only core/.cleargate...", "wrong case (hosts/Claude...)", "a file where a directory is required..." |
| 4. Symlink/escape rejected | `scaffold-layout...`: "a symlinked hosts/claude/.claude does not satisfy...", "enumerateScaffoldRoots excludes a symlinked hosts/* entry that escapes..." |
| 5. Synthetic hosts/fake enumerated, no invented .codex | `scaffold-layout...`: "enumerateScaffoldRoots discovers hosts/claude and hosts/fake..." |
| 6. Per-root manifests + unchanged compat manifest, frozen now | `scaffold-layout...`: "produces per-root manifests plus an unchanged compat manifest, all sharing one frozen now" |
| 7. File-accounting rule | `scaffold-layout...`: "the file-accounting rule: every shipped file is classified, INTENTIONALLY_UNTRACKED, or TIER_RULES-excluded" |
| 8. Within-view collision rejected | `scaffold-layout...`: "two roots writing the same logical path throw a descriptive collision error" |
| 9. Guard: no META/REPO join with cleargate-planning | `scaffold-layout...`: "no test/** file (excluding fixtures/_archive/allowlist)...", "no src/** or scripts/** file outside the allowlist..." |
| Carry-forward 1 (composePayload additive option) | `scaffold-layout...`: "ensureRequiredEmptyDirs: false skips REQUIRED_EMPTY_DIRS for a host-only root; the default call still creates them" |
| Carry-forward 2 (descriptive errors, not raw fs errno) | `scaffold-layout...`: "a dir-vs-file collision across roots fails with a path-naming error...", "an intra-root symlink is rejected with a descriptive error..." |
| 10. Clone → prebuild/build/pack/verify-pack succeed; tarball carries core + every host root | `scaffold-standalone...`: "(precondition): the clone has no cleargate-planning sibling", "prebuild, build, pack, and verify-pack all succeed...", "(Gherkin scenario 2): tarball carries the core AND every host split-view root" |
| 11. Poisoned sibling leaves output unchanged | `scaffold-standalone...`: "a poisoned cleargate-planning sibling leaves the composed split-view payload unchanged" |
| 12. E2E install from tarball, fixed pin, Claude-only payload | `scaffold-standalone...`: "installing from the packed tarball with a fixed pin gives the Claude-only payload" |
| 13. Negative verify-pack, names the root | `scaffold-standalone...`: "verify-pack fails and names the root when a core payload asset is missing", "...when a host payload asset is missing" |

## BASELINE_FAIL

Ran each file solo (`npx tsx --test --test-reporter=spec <file>`), per FLASHCARD 2026-09-25
`#qa #test-harness` (batch/parallel runs are noisy here).

**Unit file** (`scaffold-layout.red.node.test.ts`):
```
tests 18
suites 10
pass 2
fail 16
skipped 0
```
16/18 fail for a legitimate reason in one of three classes:
- **Missing export** (`undefined` !== `'function'`/truthy): `REQUIRED_ITEMS` is not exported from
  `scaffold-source.ts` today; `enumerateScaffoldRoots` and the multi-root `buildManifest` seam
  (`perRoot`/`compat`/`unclassified`) do not exist in `scaffold-layout.mjs`/`build-manifest.ts`.
- **Current behavior mismatch**: `resolveScaffoldRoot` still validates the flat
  `['.claude','.cleargate','CLAUDE.md']` layout and throws `LAYOUT_INVALID` for every core/host
  fixture (valid or not), so scenario 1's "does not throw" and scenario 3's exact-`missing[]`
  assertions all fail with today's flat `missing` array (`['.claude','.cleargate','CLAUDE.md']`
  every time) instead of the new core/host paths; `composePayload` follows a same-target-type
  symlink silently and throws a raw `EISDIR: illegal operation on a directory, copyfile ...` on a
  dir-vs-file collision (carry-forward 2); `composePayload` has no third parameter so
  `ensureRequiredEmptyDirs:false` is a no-op today (carry-forward 1).
- **Guard finds real violations**: the src/scripts guard names exactly the 4 files the plan
  identifies (`scripts/check-no-exec-mode-vocab.mjs`, `scripts/check-no-inline-id-regex.mjs`,
  `scripts/generate-changelog-diff.ts`, `src/lib/manifest.ts`); the test/** guard names 64 files
  (dispatch estimate: "about 58" — same order of magnitude; the difference is my regex additionally
  catches a `'..'`-chain sibling-read style the dispatch's headline count may not have keyed on,
  see "Assumptions for TPV" below).

2/18 **pass today** — both are honest regression-guard cases, not forced reds, and are called out
inline in the test file comments:
- **"a nonexistent --from-source path throws ScaffoldSourceError with code PATH_MISSING"**
  (scenario 2). Story §3.3: "`ScaffoldSourceError` keeps its `code` union ... Callers are
  unaffected." `PATH_MISSING` fires before any layout check and is architecturally unchanged by
  this story — there is no new behavior here to be red against.
- **"a symlinked hosts/claude/.claude does not satisfy the layout requirement"** (scenario 4, first
  test). Passes today for the WRONG discriminating reason: today's flat validator rejects *every*
  core/host-shaped fixture regardless of the symlink (same failure mode as scenario 1), so the
  symlink itself is never actually exercised yet. It is still the correct assertion for the
  post-implementation contract and will become a real regression guard once `REQUIRED_ITEMS`
  recognizes the new layout — flagged here so TPV doesn't misread it as evidence the guard already
  works.

**Integration file** (`scaffold-standalone.red.integration.node.test.ts`), full clone+build+pack
inside a fixture (`/private/tmp/claude-501/cg5802-*`), ~21s wall clock:
```
tests 7
suites 1
pass 2
fail 5
skipped 0
```
2 pass: the no-sibling precondition, and the full `prebuild && build && pack && verify-pack`
pipeline itself — STORY-058-01 already delivered a working sibling-free pipeline, so this is a
correct green baseline confirmation, not a gap. 5/7 fail, all `ENOENT`/missing-directory or
missing-tarball-entry on `templates/scaffold/{core,hosts/claude}/**` — the new split-view payload
`copy-planning-payload.mjs` must emit does not exist at all yet, so every split-view-dependent
assertion (tarball contents, poison-immunity, tarball-install split-view check, negative
verify-pack against split-view assets) fails for that single, correct reason.

**Combined: 25 tests, 4 pass (2 documented regression guards, 1 documented false-positive-today
symlink case, 1 already-shipped -01 pipeline confirmation), 21 fail — zero harness errors, zero
flaky reruns.**

## Assumptions for TPV

The M1 plan gives behavior and file lists but not every exact signature. Per dispatch guidance, each
choice below is imported via a per-test dynamic, non-literal specifier
(`pathToFileURL(...).href`), so a wrong guess reports as an isolated assertion red per scenario, not
a file-collapsing link error:

1. **`enumerateScaffoldRoots` lives in `src/lib/scaffold-layout.mjs`.** The plan says
   `build-manifest.ts` should "parameterize over `enumerateScaffoldRoots`" but not which module
   exports it. `scaffold-layout.mjs` already owns "the multi-root composition primitive" per its own
   header comment and is Node-builtins-only (no dependency), matching the enumeration function's
   needs. Chose this over inventing a third module.
2. **Multi-root `buildManifest` seam shape.** Assumed
   `buildManifest({ scaffoldRoot, now, write })` (an additive alternative to the existing
   `planningRoot`-based call) returning `{ perRoot: Record<string, ManifestFile>, compat:
   ManifestFile, unclassified: string[] }`, where `scaffoldRoot` is the *physical* parent containing
   `core/` and `hosts/*` (matching the plan's "classify on the logical install path (strip only
   `core/` or `hosts/<name>/`)" — that phrasing only makes sense for a single walk over the physical
   `scaffold/` tree, not per-root calls with the existing `planningRoot` option, which already
   naturally produces unprefixed logical paths). `result.perRoot` is looked up tolerantly
   (`result.perRoot['hosts/claude'] ?? result.perRoot.claude`) so either a slash-qualified or a
   bare-name key satisfies the test.
3. **`REQUIRED_ITEMS` shape.** Tolerant of `string[]` or `{path}[]` — extracts `.path` when
   object-shaped. Type-checking behavior (dir vs file) is verified via scenario 3's file-for-dir
   case rather than via `REQUIRED_ITEMS`'s own shape, since the plan doesn't specify whether type is
   carried on the constant or hardcoded in the validator.
4. **`enumerateScaffoldRoots` return shape.** Tolerant of `string[]` (host names) or `{name}[]`.
5. **Scenario 9 allowlist is a real, open tension — not fully resolved here, by design.** The
   dispatch explicitly says "Do not whitelist `cleargate-planning/DEPRECATED.md` readers (carry-
   forward 5)." The guard's test/** scan hits `test/scripts/scaffold-relocation.red.node.test.ts`
   (STORY-058-01's own sealed, immutable scenario-5 test), which permanently reads
   `path.join(META_ROOT, 'cleargate-planning', 'DEPRECATED.md')` for a legitimate, permanent
   doc-truth check (DEPRECATED.md is the frozen marker explaining the relocation — nothing about it
   is a "canonical read" that -02 should repoint). I read carry-forward 5 as scoped to the
   **src/scripts** half of the guard ("No cli code reads it" — i.e. no *production* code needs a
   DEPRECATED.md exception, so don't invent one there), not as a blanket ban on ever allowlisting a
   specific, named, sealed test file in the **test/** half. I deliberately did **not** add that file
   to my allowlist, both because I read the carry-forward narrowly and because a QA-Red author
   pre-committing the "final" allowlist risks being wrong in a way the Architect can't easily see.
   **Net effect: the test/** guard test, as written, will likely remain red even after a complete
   -02 repoint of the other ~63 files**, because that one sealed line can never be edited (immutable
   post-QA-Red) and is not in my allowlist. Architect/TPV should confirm one of: (a) add that one
   file, by exact path, to the allowlist (not a semantic "DEPRECATED.md reader" rule — carry-forward
   5 is about semantic rules, this would be a path-keyed exception), or (b) narrow the guard's match
   pattern so a direct, intentional `.../cleargate-planning/DEPRECATED.md` read doesn't trip it while
   a payload-source join still does, or (c) accept one permanently-named residual violation in the
   story's DoD. I did not choose for the Architect — flagging per "do not invent silently."
6. **Guard regex needed strengthening beyond a named-identifier match.** My first draft only matched
   `META_ROOT`/`REPO_ROOT`/`CANON_ROOT`/`metaRoot`/`repoRoot`/`canonRoot`, which missed
   `src/lib/manifest.ts`'s `here`-based `'..','..','..' ,'cleargate-planning'` chain and
   `generate-changelog-diff.ts`'s `pkgRoot`-based one-`'..'` chain entirely — both files are named
   explicitly in the plan as -02's responsibility, so a guard that couldn't see them would be worse
   than no guard. Added a second alternation: a bare 1-6-deep `'..'` chain immediately followed by
   the `'cleargate-planning'` literal, regardless of the preceding identifier's name (also added
   `outerRoot`, the identifier `check-no-exec-mode-vocab.mjs`/`check-no-inline-id-regex.mjs` use, to
   the named list). Re-verified: the src/scripts guard now names exactly the plan's 4 files, no more,
   no less.

## Guidance followed

- Per-test dynamic import throughout both files (FLASHCARD 2026-08-29 `#test-harness #qa-red`;
  2026-09-25 `#test-harness #tpv #scaffold`) — every module under test (`scaffold-source.ts`,
  `scaffold-layout.mjs`, `build-manifest.ts`) is loaded via `pathToFileURL(...).href` inside each
  test body. This was load-bearing here for a second reason beyond isolating reds: a **static**
  named import of a not-yet-exported symbol (`REQUIRED_ITEMS`, `enumerateScaffoldRoots`) is a real
  ESM `SyntaxError` at link time (Node enforces named exports strictly), which would have collapsed
  the whole file into one failure and also broken the scratch-tsconfig typecheck; dynamic import
  resolves to `any`, sidestepping both.
- Ran each file solo, never batched (FLASHCARD 2026-09-25 `#qa #test-harness`).
- Scenario 9's guard is keyed on an explicit, path-based `ALLOWLIST` Set (`scripts/migrate-024-
  citations.mjs` only, per the plan's explicit historical-script exception) — never a semantic rule
  about the *content* of what's being read (see Assumption 5).
- Integration scenarios 10-13 clone, build, pack, and install entirely inside
  `/private/tmp/claude-501/cg5802-*` (short TMPDIR per FLASHCARD 2026-09-12); `node_modules` is
  symlinked from the real checkout (toolchain access, explicitly allowed); a single `before`/`after`
  clones and builds once, individual `it()`s layer incremental mutations/checks to keep total
  wall-clock bounded (~21s). `git clone` of a local repo checks out only committed content at the
  source's current HEAD (`story/STORY-058-02` @ `464e1e4`), so this is testing the clean baseline by
  construction — no working-tree contamination is possible even though I ran it from inside the
  actual story branch checkout.
- `initHandler` calls (unit carry-forward tests don't call it; only integration scenario 12 does)
  set `CLEARGATE_REPO_ROOT` to the fixture and restore it in `finally`, and stub `spawnSyncFn` with
  a `PROBE_STUB` matching the precedent at `test/commands/init-from-source.node.test.ts:227`.
- Did not run `npm run build`/`npm run prebuild`/a bare `cleargate` in the **real checkout** (rules
  11, 18) — the only `build`/`prebuild`/`pack` invocations happen inside the disposable clone, which
  the dispatch explicitly sanctions ("The clone, build, pack and install all happen inside the
  fixture, never in the real checkout").
- Did not touch the outer MAIN checkout, `cleargate-planning/`, or the live `.claude/`.
- Typechecked both files under a scratch tsconfig (`extends: "./tsconfig.json"`,
  `rootDir: "."`, `include` limited to the two red files only — the cli's own `tsconfig.json` covers
  only `src/**`). `npx tsc --noEmit -p <scratch>` exited 0 after two small fixes: narrowing
  `unknown` in two `assert.throws` predicates (`(err as { code?: string }).code`, since the
  dynamically-imported `ScaffoldSourceError` is `any`-typed and doesn't narrow `err` via
  `instanceof`), and dropping an unused `@ts-expect-error` (the third `composePayload` argument
  doesn't error under `any` typing, so the directive was itself flagged unused) and an unused `os`
  import in the integration file. The scratch tsconfig was deleted after use; it is not part of the
  diff.

## Script Incidents

None. No script was invoked through `bash .cleargate/scripts/run_script.sh` — all invocations were
direct `npx tsc`/`npx tsx --test`/`git`/`npm` calls per the dispatch (the wrapper governs ClearGate's
own governed scripts, not raw test-runner/toolchain invocations), so no
`.cleargate/sprint-runs/_off-sprint/.script-incidents/*` files were created by this session. Checked
`cleargate-cli/.cleargate/sprint-runs/_off-sprint/.script-incidents/` before and after — all entries
present are pre-existing (dated 2026-06 through 2026-08); none created or deleted by this dispatch.

## Not run / not touched

- No `npm run build`/`prebuild`/full `npm test` in the real `cleargate-cli` checkout (rules 11, 14).
- No bare `cleargate` (rule 18).
- No implementation, scaffold, or non-test file edit of any kind — read-only on all non-test files.
- No repointing of any existing test file (that is the Developer's job).
- No `git add`/commit/checkout/stash/reset in either repo.
- Left `/private/tmp/claude-501/cg5802-*` fixtures cleaned via the test's own `after()` hook (`fs.rmSync(tmpRoot, { recursive: true, force: true })`); verified no `cg5802-*` directory remains under `/private/tmp/claude-501/`.

## flashcards_flagged

flashcards_flagged: []

## Round 2

TPV round 1 verdict: `BLOCKED-WIRING-GAP`. Applied all nine required fixes (F1-F9) plus both
optional improvements from `STORY-058-02-tpv.md` §"Required QA-Red fixes", test-only, to the two
files committed at cli `43c4556`. Edited the working tree only — `43c4556` was not amended, nothing
was committed.

### Per-fix change

**`scaffold-layout.red.node.test.ts`**

1. **F1 — allowlist.** Replaced the single-entry `ALLOWLIST` with the exact four paths the amended
   plan (carry-forward 5, TPV R1) names: `scripts/migrate-024-citations.mjs`, the sealed
   `test/scripts/scaffold-relocation.red.node.test.ts` (STORY-058-01's own DEPRECATED.md doc-truth
   read), this guard's own file (its prose names the banned join), and
   `test/scripts/scaffold-standalone.red.integration.node.test.ts` (names the sibling only to assert
   its absence / poison it). Path-keyed, no pattern, no semantic rule — resolves the Assumption-5
   tension I flagged in round 1 exactly as TPV ruled (option (a), extended to two sealed files, not
   one).
2. **F2 — regex block.** Replaced `NAMED_ROOT_JOIN_RE`/`DOTDOT_CHAIN_JOIN_RE`/`META_JOIN_RE` verbatim
   with the TPV `ROOT_ID`/`CP_LIT`/`ROOT_ARG` composition plus `CLIMB_STRING_RE`, `TEMPLATE_JOIN_RE`,
   and `stripLineComments`. Verified it now catches all 5 files TPV named as false negatives
   (`gate-run.integration.node.test.ts`, `run-id-ledger-attribution.red.node.test.ts`,
   `stamp-and-gate.node.test.ts`, `code-map-integration.red.node.test.ts`,
   `enforcement-doc-coherence.node.test.ts`) — confirmed by grepping the failure message for each
   filename (all 5 present) — while the src/scripts half still names exactly the plan's 4 files, no
   more, no less.
3. **F3 — symlink test discriminator.** Replaced the boolean `err instanceof ScaffoldSourceError &&
   code === 'LAYOUT_INVALID'` predicate with the TPV version: asserts `missing` names
   `hosts/claude/.claude` and does NOT wrongly flag the valid `core/.cleargate` or
   `hosts/claude/CLAUDE.md`. Confirmed the test now fails at baseline with `symlinked
   hosts/claude/.claude not named: .claude, .cleargate, CLAUDE.md` — it discriminates today, unlike
   round 1's coincidental pass.
4. **F4 — escape test accepts throw-or-exclusion.** Wrapped `mod.enumerateScaffoldRoots(src)` in a
   try/catch: a descriptive throw naming `evil` is accepted (asserted via `assert.match(message,
   /evil/)` then early-return); absent a throw, falls through to the original "claude present, evil
   absent" assertions (now also asserting `claude` is present, per TPV's version, not just that
   `evil` is absent).
5. **F5 — scenario 7 de-vacuous.** Added one seed file per accounting class (`.gitignore` and
   `CLAUDE.md` → `INTENTIONALLY_UNTRACKED`, `.cleargate/scripts/test/x.sh` → TIER_RULES exclude) plus
   one deliberately unaccounted `.cleargate/stray.bin`, and changed the assertion from
   `deepStrictEqual(result.unclassified, [])` to `length === 1` + `endsWith('.cleargate/stray.bin')`
   on that one entry — exactly TPV's version, verbatim.
6. **Optional — scenario 8 classified collision path.** Changed the colliding path from
   `.cleargate/dup.txt` to `.cleargate/knowledge/dup.md` (a real `TIER_RULES` entry) in both the core
   and the synthetic second-host fixture, so an implementation that only checks collisions among
   manifest entries (not raw files) is still caught.
7. **Optional — scenario 6 literal "unchanged compat".** Added a trailing block inside the same
   `it()`: composes the same fixture's `core`+`hosts/claude` via the OLD single-root
   `composePayload`+`buildManifest({ planningRoot })` path and asserts `result.compat.files`
   deep-equals that legacy manifest's `files` — makes "unchanged compatibility manifest" a literal
   equality, not just "has the right paths in it."

**`scaffold-standalone.red.integration.node.test.ts`**

8. **F6 — hashTree MANIFEST.json normalization.** In the file branch of `hashTree`'s walk, when
   `entry.name === 'MANIFEST.json'`, parse it, delete `generated_at`, and hash the re-serialized
   buffer instead of the raw bytes — exactly TPV's patch. Everything else is hashed unchanged.
9. **F7 — scenario 11 also hashes the flat payload.** Captures `hashTree(flatOut)` (`templates/
   cleargate-planning`) alongside `hashTree(scaffoldOut)`, remapped under a `FLAT/` prefix to avoid
   collisions with the split view's own relative paths, both before and after the poisoned prebuild.
10. **F8 — scenario 12 includes `.mcp.json`.** Expected top-level set is now `['.claude',
    '.cleargate', '.gitignore', '.mcp.json', 'CLAUDE.md']` (was missing `.mcp.json`, which
    `initHandler` always writes per `init.ts:423-441`).
11. **F9 — scenario 13 deterministic victim + independence.** Replaced `firstFileUnder` (readdir-order
    dependent, could pick an un-shipped `.gitignore`) with `manifestVictim(rootDir)`, which reads that
    root's own `MANIFEST.json` and takes the alphabetically-first listed path — deterministic and
    guaranteed to be something verify-pack/npm actually ships. Both scenario-13 tests now save the
    victim's bytes, delete it, run verify-pack inside a `try`, and restore the victim in `finally` —
    so the core-deletion no longer leaks into the host test (independence fixed).

### Typecheck

Both files typecheck clean under a scratch tsconfig with `"exclude": []` (as TPV's check-table item
7 notes: the root `tsconfig.json`'s `exclude: ["node_modules", "dist", "**/*.test.ts"]` would
otherwise exclude both red files from the scratch config's own resolution graph). `extends:
"./tsconfig.json"`, `rootDir: "."`, `include` limited to the two red files. `npx tsc --noEmit -p
<scratch>` exited 0 with zero errors — no additional fixes needed beyond round 1's two narrowing
casts. The scratch tsconfig was deleted immediately after use; not part of the diff.

### Re-run baseline counts (round 2)

Unit file, run solo:
```
tests 18
suites 10
pass 1
fail 17
skipped 0
```
Matches the TPV-predicted baseline exactly: the only pass is the documented PATH_MISSING regression
guard (scenario 2 — `ScaffoldSourceError`'s `code` union is unchanged by this story, story §3.3).
The guard now names **70 test files** (was 64 in round 1) — confirmed the 5 new files from F2 are
all present in the failure list (`gate-run.integration.node.test.ts`,
`run-id-ledger-attribution.red.node.test.ts`, `stamp-and-gate.node.test.ts`,
`code-map-integration.red.node.test.ts`, `enforcement-doc-coherence.node.test.ts`) and the
src/scripts half still names exactly the plan's 4 files (`scripts/check-no-exec-mode-vocab.mjs`,
`scripts/check-no-inline-id-regex.mjs`, `scripts/generate-changelog-diff.ts`, `src/lib/manifest.ts`).
The round-1 "wrong reason" symlink pass is gone: it now fails on `symlinked hosts/claude/.claude not
named: .claude, .cleargate, CLAUDE.md`, a real discriminator.

Integration file, run solo (~19.6s wall clock, `test-concurrency=1`):
```
tests 7
suites 1
pass 2
fail 5
skipped 0
```
Matches the TPV-predicted baseline: 2 pass (the no-sibling precondition, and the full
`prebuild && build && pack && verify-pack` pipeline itself — STORY-058-01's already-shipped
sibling-free pipeline, an honest green, not a gap), 5 fail, all still on the single original,
correct reason — `templates/scaffold/{core,hosts/claude}` does not exist yet (checked each failure
message individually: all 5 are still `ENOENT`/missing-directory/missing-tarball-entry on the
split-view payload, unchanged in class from round 1; F6-F9 did not introduce any new failure
reasons on the unimplemented baseline).

Combined: **25 tests, 3 pass (1 documented PATH_MISSING regression guard, 2 already-shipped -01
pipeline confirmations), 22 fail** — zero harness errors, zero flaky reruns. (Round 1 was 25/4/21;
the round-1 symlink "wrong reason" pass is now a correctly-discriminating fail, net -1 pass / +1
fail, exactly as TPV's simulation predicted: "1 pass (PATH_MISSING) / 17 fail" for the unit file.)

### Script Incidents

None. No `run_script.sh` invocation this round either — all calls were direct `npx tsc`/`npx tsx
--test` (the wrapper governs ClearGate's own governed scripts, not raw test-runner invocations).
Checked `cleargate-cli/.cleargate/sprint-runs/_off-sprint/.script-incidents/` before and after this
round: no new entries (`find ... -newermt "2026-09-25 00:00:00"` returned nothing new from this
session).

### Hard rules honored

No `npm run build`/`prebuild`/full `npm test` in the real checkout (the only `build`/`prebuild`/
`pack` calls happen inside the integration test's own disposable clone, unchanged from round 1). No
bare `cleargate`. No edit to any non-test file — `git status --porcelain` shows only the two red
test files modified, plus two pre-existing untracked items neither created by this session:
`cleargate-0.25.0.tgz` (present before round 1 started) and `.cleargate/reports/pre-arch-scan.txt`
(timestamped `14:18:20`, matching the `43c4556` commit — an Architect/TPV-side artifact from the
round-1 review, not touched or created by QA). No `git checkout`/`stash`/`reset`. No commit —
`43c4556` untouched; both files remain modified, uncommitted, in the working tree. No `cg5802-*`
temp directory left under `/private/tmp/claude-501/` (integration file's own `after()` hook cleaned
it).

QA-RED: WRITTEN
