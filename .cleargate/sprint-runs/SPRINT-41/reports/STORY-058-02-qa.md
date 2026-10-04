# STORY-058-02 — QA-Verify

role: qa

STORY: STORY-058-02

Reviewed: cli `story/STORY-058-02` @ `477b942` (reds `43c4556`→`20a40ff`, impl `477b942`). Base `464e1e4`. Read `sprint-context.md`, the story file, `plans/M1.md` §STORY-058-02, `reports/STORY-058-02-{qa-red,tpv,dev}.md`, and grepped FLASHCARD.md for `#qa #test-harness #scaffold #npm #tsup`. Main checkout left untouched (still on `story/STORY-058-02` @ `477b942`, no build run there); all builds/packs done in scratch clones under `/private/tmp/cg-s41-qa-058-02/*`, deleted at the end. No `run_script.sh` invocation this session (npm/git/node/tsx only, matching precedent).

## 1. Red-file integrity

- `git diff 20a40ff..477b942 -- test/scripts/scaffold-layout.red.node.test.ts test/scripts/scaffold-standalone.red.integration.node.test.ts` → **empty**. Sealed tests untouched.
- `test/scripts/scaffold-layout.red.node.test.ts` solo: **18/18 pass**.
- `test/scripts/scaffold-standalone.red.integration.node.test.ts` solo: **7/7 pass** (66.9s; scenario 10 build+pack+verify-pack, scenario 11 poisoned-sibling, scenario 12 tarball install, scenario 13 negative verify-pack ×2).
- `npm run typecheck`: **clean, 0 errors**.

## 2. Gherkin mapping (M1.md-amended §2.1)

| # | Scenario | Verdict | Evidence |
|---|---|---|---|
| 1 | Pack succeeds with no sibling directories | **PASS** | Independently reproduced in a fresh standalone clone (`git clone` with no `cleargate-planning` sibling anywhere under it): `npm run prebuild && npm run build && npm pack` all succeeded; also proven by the sealed scenario-10 integration test (7/7). |
| 2 | Tarball carries core plus every host payload | **PASS** | `node scripts/verify-pack.mjs` in the same clone: `[verify-pack] OK — 196 files, payload 80, version 0.26.1.` Sealed scenario-10 Gherkin sub-test also passes. |
| 3 | `--from-source` validates the new layout | **FAIL on the substantive requirement** (literal negative-path text still passes) | See Finding 1. The malformed-directory branch (`resolveScaffoldRoot` throwing before any composition) is unaffected and correctly exits non-zero with `LAYOUT_INVALID`. But §1.2's "`--from-source <path>` keeps working" is false for a **valid** scaffold source once `node dist/cli.js` is the entry point: it crashes with an uncaught `ERR_MODULE_NOT_FOUND`, never reaching `ScaffoldSourceError` classification. No test in the 70-file repoint set or the new reds exercises `--from-source` through the built `dist/cli.js`; all coverage is in-process (`initHandler()` under tsx), which never bundles and therefore never reproduces the bug. |
| 4 | Manifest classifies core and host files | **PASS** | `scaffold-layout.red.node.test.ts` scenarios 6-7 (18/18 total, solo). |

## 3. Guard-evasion check (Dev Plan Deviation 1) — cleared

`test/scaffold/enforcement-doc-coherence.node.test.ts` and `test/scaffold/ratchet-retired.node.test.ts` both rename `process.env.CLEARGATE_META_ROOT` access into an intermediate `metaOverrideEnv` variable, breaking the guard's `ROOT_ID` regex match (`\b\w*(?:META|REPO|CANON|OUTER)_?ROOT\w*\b` — "metaOverrideEnv" contains no "Root"/"ROOT" substring at all, not just a proximity change).

Verified this does **not** mask a real sibling read:
- Both files route every `cleargate-planning/...`-prefixed `REL` entry through a new `resolveRel()` → `canonicalPath()` (imported from `test/helpers/scaffold-roots.ts`), confirmed by reading the diff in full (`git diff 20a40ff..477b942` for both files).
- `canonicalPath()` (`test/helpers/scaffold-roots.ts:35-42`) resolves unconditionally to `<CLI_ROOT>/scaffold/{core,hosts/claude}` — never `CLEARGATE_META_ROOT`/`REPO_ROOT`/the outer sibling. `REPO_ROOT` is still used, but only for the **live**-side branch (`.cleargate/**` at the real repo root), which is correct and unchanged behavior.
- Manually computed the original (pre-rename) false-positive: `CLEARGATE_META_ROOT)` sits ~90 chars before the first `'cleargate-planning/CLAUDE.md'` literal in the `REL` object below it — inside the guard's 120-char window, with no actual join between them (confirmed by reading the intervening code, which is just object-literal declarations). This matches the Dev's and TPV's own characterization of this guard-quality class of issue (TPV F1 did the same kind of allowlist-vs-pattern fix on the guard itself).
- Grepped the full implementation diff for other `cleargate-planning` occurrences outside the sealed/allowlisted files (`command grep -rn cleargate-planning src/ scripts/ test/`) and spot-checked every file with a *code* (non-comment) reference: `file-surface-gate-e2e`, `pre-commit-downstream-safe`, `sprint-execution-mirror.integration`, `canonical-live-parity.red.integration`, `skill-md-consolidation-d5.red`, `skill-md-conditional-architect.red`, `status-vocab-phase-b.red` — all route through `canonicalPath()`, none read the outer sibling. No other identifier rename that looks guard-motivated was found elsewhere in the diff.

**Verdict: legitimate false-positive fix, not evasion.** The rename correctly reflects that these two files no longer read the outer sibling at all.

## 4. `--from-source` under plain-node dist (Dev Plan Deviation 2) — **FAIL, Finding 1**

See Finding 1 below. Root cause: `src/commands/init.ts:269-275`'s dynamic-import path for `scripts/build-manifest.ts` uses two `'..'` segments, correct only when unbundled (`dirname(import.meta.url)` = `src/commands/`, 2 levels to pkgRoot). Under the bundled `dist/cli.js`, `import.meta.url` collapses to the bundle's own file (the exact hazard the Dev's own code comment at `:265-268` cites for the *sibling* isMain problem) — so `dirname(...)` = `dist/`, needing only **one** `'..'` to reach pkgRoot, matching the proven-correct sibling pattern already in the same file (`resolveDefaultPayloadDir()`, `:158`, and the `package.json` read at `:365`, both one level up). The extra `'..'` walks one directory *above* the package root.

Confirmed via direct reproduction and a one-line fix-and-retest (both in a disposable scratch clone, reverted before further use):
- Built the clone (`npm run build`, succeeded), ran `node dist/cli.js init --from-source <clone>/scaffold --yes` against a fresh git-initialized target dir → crashed: `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '<parent-of-clone>/scripts/build-manifest.ts' imported from '<clone>/dist/cli.js'`, exit code 1, raw Node stack trace (not a `ScaffoldSourceError`, not `LAYOUT_INVALID`/`PATH_MISSING`).
- Confirmed via `npx tsx src/cli.ts init --from-source ...` (unbundled) that the identical command **succeeds** — this is exactly why none of the 70 repointed tests or `init-from-source.node.test.ts` (10/10, in-process only) caught it.
- Patched the two `'..'` down to one, rebuilt, reran the identical `node dist/cli.js init --from-source ...` command → succeeded cleanly (install completed, `.cleargate/.install-manifest.json` written, target's own tree clean). Reverted the patch before continuing other checks.
- No temp-dir leak on the crash path: the `catch` block's `fs.rmSync(tempDir, ...)` does run before the re-throw (confirmed no `cleargate-from-source-*` directories left under `os.tmpdir()`), and the crash occurs before Step 3 ever writes into the target, so the target directory itself stays clean. The bug is a hard crash with a bad error surface, not data corruption.
- Confirmed `scripts/build-manifest.ts` is not in `npm pack --dry-run`'s file list (only `dist`, `templates`, README/LICENSE/CHANGELOG per `package.json`'s `files` array) — so `--from-source` against a **globally npm-installed** package would additionally fail for a *different*, likely-intentional reason (the flag's own description says "meta-repo dogfood"); that's a separate, non-blocking question the dispatch flagged for reporting, answered here: from-source is effectively usable only when running `dist/cli.js` from inside a full git checkout that still has `scripts/` on disk (which is the intended dogfood use), and even in that intended context it currently crashes.

This is new code introduced by this story (the whole compose+generate-manifest bridge did not exist before — pre-story `--from-source` used the payload directly with no composition step), so it is a story-introduced defect, not a carried-over pre-existing issue.

## 5. "Pre-existing" failure claims — verified, with two additions

Methodology: nested a scratch clone as `<tmp>/nested-base/cleargate-cli` at `464e1e4` with `<tmp>/nested-base/cleargate-planning` symlinked to the real outer `cleargate-planning/` and `<tmp>/nested-base/.cleargate` symlinked to the real outer `.cleargate/` (several of these files hardcode `REPO_ROOT` via `import.meta.url`, 3 levels up, with **no** `CLEARGATE_META_ROOT` override — confirmed by reading each file — so a bare env-var export does nothing for them; they must be physically nested to resolve correctly). Impl side (`477b942`) run directly in the real cli main checkout in place (read-only `npm run test:file`, no build, no branch switch, no commit) since it is already the real nested location.

| File | Dev claim | QA base (464e1e4) | QA impl (477b942) | Verdict |
|---|---|---|---|---|
| `dogfood-install.integration` | pre-existing | 1 fail: "Scenario 1: Install + doctor + upgrade-dry-run all clean" | same 1 fail, same name | **Confirmed pre-existing** |
| `agent-developer-section.integration` | pre-existing (arg-order bug) | 1 fail: "Scenario 2: live developer.md is byte-identical to scaffold" | same 1 fail, same name | **Confirmed pre-existing** |
| `canonical-live-parity.red.integration` | 2 pre-existing (validate_state.mjs, test_test_ratchet.sh) | 2 fails: those exact two | same 2 fails, same names | **Confirmed pre-existing** |
| `template-sync-fields.integration` | pre-existing (comma-operator bug) | 4 fails: "…parseFrontmatter returns all 6 new keys" ×4 (epic/story/CR/Bug) | same 4 fails, same names | **Confirmed pre-existing** (dev's report undercounts detail but names the right root cause) |
| `test_version_bump_alignment.integration` | 1 pre-existing (SUPPORTED_PAIRS drift) | 2 fails: "all three version strings parse as semver" + "SUPPORTED_PAIRS" | 1 fail: "SUPPORTED_PAIRS" only | **Strict subset — OK per dispatch rule.** The repoint's own composed-MANIFEST assertions (both) now pass; matches Dev's claim exactly. |
| `token-ledger-resolver.red.integration` | 5 pre-existing (BUG-027) | 5 fails, same names | same 5 fails, same names | **Confirmed pre-existing** |
| `test_close_sprint_v21.integration` | pre-existing (Step 3.5/6.6, unrelated to `REPORTER_MD_SCAFFOLD`) | 5 fails (one run) | **7 fails, then 4 fails** across two more reruns of the identical commit — different subsets each time | **Confirmed pre-existing but flaky, not a stable set — see Finding 2** |
| `gate-run.integration` (dev's table row #3, not in the "pre-existing" list — dev marked it **✅ solo**) | not disclosed as failing | 1 fail: "Scenario 7: … gates.precommit with typecheck + test" | same 1 fail, same name | **New finding — see Finding 3**: pre-existing and unrelated to the story (reads the real outer `.cleargate/config.yml`, which already uses the post-CR-077 `npm --prefix cleargate-cli …` form the assertion's substring check doesn't expect), but the Dev's own table entry is inaccurate. |

The diffs to `test_close_sprint_v21.integration.node.test.ts` and `gate-run.integration.node.test.ts` were read in full: the former is a single `REPORTER_MD_SCAFFOLD` constant repoint via `canonicalPath()`, the latter's repoint is unrelated to the failing Scenario 7 (a live-config assertion, not a canonical read). Neither failure is caused by this story's changes.

## 6. Repoint spot-check (10 files, solo, read for weakened assertions)

`init.node.test.ts` (29/29), `init-from-source.node.test.ts` (10/10), `canonical-live-parity.red.integration` (10/12, the 2 pre-existing above), `test_version_bump_alignment.integration` (2/3, the 1 pre-existing above), `code-map-integration.red` (8/8), `run-id-ledger-attribution.red` (10/10), `stamp-and-gate` (7/7), `wiki-ingest-sprint-report.red` (15/15), `ci-no-pm-sdk.integration` (14/14), `claude-md-block-leads.red` (15/15), `pin-placeholder-coverage` (4/4). All pass or match the disclosed pre-existing set.

`git diff 20a40ff..477b942 --stat -- test/` shows no deleted assertions and no new `.skip`/`skip:`/`todo` markers — every line delta in the reviewed files is a root-constant swap (`REPO_ROOT`-based join → `canonicalPath()`/`composeCanonicalPayload()`), matching the plan's "change the root constant only, never an assertion" instruction. Diffstat total: 85 files changed (12 lib/script files + `test/helpers/scaffold-roots.ts` + 2 new sealed red files + 70 repointed test files) — arithmetic matches the "70 test files" claim exactly.

## 7. Carry-forwards 1-5 — all present as specified

1. `composePayload(roots, dst, { ensureRequiredEmptyDirs = true } = {})` — confirmed at `src/lib/scaffold-layout.mjs:162`, `.d.mts` updated.
2. Descriptive collision/symlink errors — confirmed at `src/lib/scaffold-layout.mjs` `copyDir()`: symlink refusal + dir-vs-file collision in both directions, named paths, no raw `fs` errno.
3. `test_version_bump_alignment.integration.node.test.ts:137` area repointed — confirmed, composes fresh via `composeCanonicalPayload`, comment cites carry-forward 3 explicitly.
4. `DEPRECATED.md` fixture leak closed — confirmed in `init.node.test.ts` (`assert.strictEqual(fs.existsSync(path.join(tmpDir, 'DEPRECATED.md')), false)`).
5. Guard allowlist exactly the four named paths — confirmed byte-for-byte at `test/scripts/scaffold-layout.red.node.test.ts:424-434`.

## 8. Scope

- `command grep -rn HostAdapter src/` → no hits. No `src/hosts/**` directory. No new `--host` option (`grep -n -- '--host' src/cli.ts` only shows the pre-existing BUG-089 `cleargate hook signal --host`, untouched by this diff).
- `git diff 464e1e4..477b942 --stat -- scaffold/` → empty; no scaffold content files touched.
- `git diff 464e1e4..477b942 -- src/commands/scaffold-lint.ts src/wiki/derive-repo.ts src/lib/drift-check.ts` → empty; all three out-of-scope files confirmed untouched.
- `.gitignore` gains exactly `templates/scaffold/`.
- Outer pre-commit compat (from `/Users/ssuladze/Documents/Dev/ClearGate`): `npm run check:no-vitest --prefix cleargate-cli` → "no vitest residue"; `npm run --silent check:no-inline-id-regex --prefix cleargate-cli` → "no inline work-item-id regexes". Both pass.

## 9. verify-pack

In the standalone scratch clone (post-build): `node scripts/verify-pack.mjs` → `[verify-pack] OK — 196 files, payload 80, version 0.26.1.` The script only emits detail on failure (confirmed by reading `verify-pack.mjs`'s `console.log`/`errors.push` call sites) — the one-line OK is the expected passing output, not a truncated report.

## Findings

1. **[BLOCKING] `src/commands/init.ts:269-275` — `--from-source` crashes under the built CLI for a *valid* scaffold source.** The dynamic import path for `scripts/build-manifest.ts` uses `path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'scripts', 'build-manifest.ts')` — two `'..'` segments. That is correct only when unbundled (`src/commands/` is 2 levels below package root). Under `dist/cli.js`, every module's `import.meta.url` collapses to the bundle file (`dist/`, 1 level below package root — the same hazard the surrounding comment at `:265-268` correctly diagnoses for a *different* problem, the `isMain` self-invocation). The extra `'..'` resolves one directory above the package root, so `node dist/cli.js init --from-source <valid-scaffold-root>` throws an uncaught `Error [ERR_MODULE_NOT_FOUND]` and exits 1 — never producing the `ScaffoldSourceError`/`LAYOUT_INVALID`/`PATH_MISSING` contract §1.2/§3.3 require, and never completing the install. Reproduced directly against a built `dist/cli.js`; fixed by dropping to a single `'..'` (mirroring the already-correct `resolveDefaultPayloadDir()` at `:158` and the `package.json` read at `:365` in the same file) and reproduced the fix working. No test in this story's diff exercises `--from-source` through the actual built artifact — all coverage is in-process against unbundled TS, which cannot see this class of bug by construction. This is new code this story introduces (pre-story `--from-source` had no composition step), so it is a regression the story ships, not a pre-existing gap.

2. **[NON-BLOCKING, report-accuracy] `test_close_sprint_v21.integration.node.test.ts` is flaky, not a stable "7 named failures."** Three consecutive runs of the identical `477b942` commit produced three different failure subsets (5, then 7, then 4 named tests, overlapping but not identical — see §5 table). The story's one-line diff to this file (`REPORTER_MD_SCAFFOLD` → `canonicalPath(...)`) is unrelated to any of the failing areas (Step 2.7/2.8/3.5/6.5-6.7/7/assume-ack timing). Not a regression — the same flakiness reproduces at base `464e1e4` too — but the Dev's report characterizes this as a fixed, named failure list rather than disclosing the flakiness, which will surprise the next person who reruns it and gets a different count.

3. **[NON-BLOCKING, report-accuracy] Dev's 70-file repoint table row #3 (`test/commands/gate-run.integration.node.test.ts`) is marked "✅ solo" but the file has one failing test**, `Scenario 7: … gates.precommit with typecheck + test` (`test/commands/gate-run.integration.node.test.ts:342`). Confirmed pre-existing at `464e1e4` too (identical failure, same assertion) and unrelated to this story — the test asserts the outer live `.cleargate/config.yml`'s `gates.precommit` string contains the literal substring `'npm run typecheck'`, but the real file (post-CR-077) reads `"npm --prefix cleargate-cli run typecheck && npm --prefix cleargate-cli test"`, which does not contain either expected substring. Not caused by this story's repoint (which only touched this file's `CANONICAL_*` constants, not the live-config Scenario 7 test), but the Dev's own per-file table entry for this file is wrong.

## flashcards_flagged

```
flashcards_flagged: [
  "2026-09-25 · #test-harness #tsup #danger · A new dynamic import(scripts/*.ts) path built from import.meta.url must use ONE '..' to pkgRoot under bundled dist.js (every module collapses to dist/), never the src-relative depth — verify against a real built dist, not just in-process tsx tests.",
  "2026-09-25 · #qa #test-harness #danger · test_close_sprint_v21.integration.node.test.ts is flaky: 3 runs of one commit gave 3 different failure subsets (Step 2.7/2.8/3.5/6.5-7/assume-ack). Don't trust a single run's named-failure list as the pre-existing baseline.",
  "2026-09-25 · #test-harness #danger · Files with REPO_ROOT hardcoded via import.meta.url (no CLEARGATE_META_ROOT branch) need physical nesting (symlink cleargate-planning + .cleargate alongside the clone) to reproduce base-commit behavior in a scratch clone — an env var alone does nothing."
]
```

## Script Incidents

None. No `.cleargate/scripts/run_script.sh` invocation this session.

QA=FAIL
1. `src/commands/init.ts:269-275` — `--from-source` throws an uncaught `ERR_MODULE_NOT_FOUND` under the built `dist/cli.js` for a valid scaffold source (two `'..'` segments where bundling requires one), violating §1.2's "keeps working" requirement and never reaching the `ScaffoldSourceError` contract. Reproduced and confirmed the one-character-class fix resolves it. Everything else in this story (layout validation, per-root manifest, standalone pack/verify-pack, 70-file test repoint, sibling-read guard, carry-forwards 1-5) is correct and evidenced above — this is the sole blocker.

## Round 2 (post QA bounce 1)

Re-verify scope: Finding 1 fix only (`358ae35` on top of `477b942`). Round-1 PASS verdicts on everything else (guard-evasion, carry-forwards 1-5, scope, repoint spot-check, verify-pack, pre-existing-failure confirmations) stand unchanged. Findings 2-3 were report-accuracy corrections only, not fixes — the Dev's addendum accepts both, no code change needed or made for them.

### 1. Commit contents — `git show 358ae35`

- **`resolveCliPackageRoot(startDir)`** (new, exported from `src/commands/init.ts`): walks up from `startDir` looking for the first ancestor where `package.json` exists AND parses with `name === 'cleargate'` AND `scripts/build-manifest.ts` exists on disk; returns `undefined` at the filesystem root with no match. This is structural (by directory contents), not depth-based — confirmed by reading the loop (`path.dirname(dir)` fixed-point termination, no counted `'..'`). The `--from-source` bridge now calls `resolveCliPackageRoot(path.dirname(fileURLToPath(import.meta.url)))` and builds `buildManifestModulePath = path.join(cliPackageRoot, 'scripts', 'build-manifest.ts')` from the result — no more hardcoded `'..','..'`.
- **No-ancestor path:** when `resolveCliPackageRoot` returns `undefined`, the code `throw`s a `ScaffoldSourceError({ code: 'PATH_MISSING', missing: ['scripts/build-manifest.ts'], message: '--from-source requires a cleargate-cli source checkout (scripts/build-manifest.ts not found in any ancestor directory)' })` **inside** the existing `try` block that wraps `composePayload`/the dynamic import. The existing `catch (e)` immediately below is unchanged: it still runs `fs.rmSync(tempDir, ...)` (since `fromSourceTempDir` is not yet assigned at throw time) before the `e instanceof ScaffoldSourceError` branch prints the message and calls `exit(2)`. Read the full surrounding block (`src/commands/init.ts:296-352`) to confirm the throw sits inside that try and nothing else in the try/catch structure moved.
- **Nothing else in `init.ts` changed:** `git diff 477b942..358ae35 -- src/commands/init.ts | grep resolveDefaultPayloadDir` → only the pre-existing `@@` hunk header context line, no edits to that function's body. The rest of the file's diff is purely additive (the new function + the bridge's 2-statement swap).
- Test-file diff: `test/commands/init-from-source.node.test.ts` (+42/-0, new `describe` block only) and new `test/commands/init-from-source-dist.integration.node.test.ts` (+116, new file). No existing assertions touched.

**Verdict: matches the coordinator's description exactly.**

### 2. Fresh scratch-clone reproduction at `358ae35`

`git clone --no-hardlinks` into a fresh `/private/tmp` scratch dir, checked out `358ae35`, symlinked `node_modules`, `npm run build` (prebuild ran automatically as npm's `pre`-hook — `templates/scaffold/{core,hosts}` populated). Then, from a fresh `git init`-ed `mktemp`-style target dir:

```
node <clone>/dist/cli.js init --from-source <clone>/scaffold --yes
```

- **Exit code: 0.**
- `.cleargate/.install-manifest.json` present in the target (18509 bytes).
- `git -C <clone> status --porcelain` → **empty** (clone tree untouched by the install).
- `find /var/folders /tmp -iname "cleargate-from-source-*"` → **no matches** (no leftover temp dir).

Matches round-1's confirmation that a single-`'..'` fix resolves the crash — this is the shipped fix reproducing the same result via the real `resolveCliPackageRoot`, independently verified.

### 3. Installed-package error path (no `scripts/`)

Copied only `<clone>/dist`, `<clone>/package.json` and `<clone>/templates` into a separate directory (no `scripts/` — confirmed absent), symlinked `node_modules` there too, then ran:

```
node <installed>/dist/cli.js init --from-source <clone>/scaffold --yes
```

against a fresh `git init`-ed target.

- **Exit code: 2.**
- stdout/stderr, in full:
  ```
  [cleargate init] Target: /private/tmp/.../target2
  --from-source requires a cleargate-cli source checkout (scripts/build-manifest.ts not found in any ancestor directory)
  ```
- **No raw stack trace** — a single clean message, matching the `ScaffoldSourceError` exit-2 path exactly (`stderr(`${e.message}\n`); exit(2);`).
- `find ... -iname "cleargate-from-source-*"` → none. Target dir `git status --porcelain` → empty (nothing written before the throw).

This is the case the dispatch allowed skipping if impractical; it was practical (plain `cp` + symlink, no `npm pack`/install needed) and is fully confirmed.

### 4. Solo runs in the main checkout (read-only)

| Check | Result |
|---|---|
| `test/commands/init-from-source.node.test.ts` | **14/14 pass** (10 original + 4 new `resolveCliPackageRoot` structural-resolution tests: from `src/commands`, from `<CLI_ROOT>/dist`, from a synthetic `.some-build-dir`, from an unrelated tmp dir → `undefined`) |
| `test/commands/init-from-source-dist.integration.node.test.ts` | **1/1 pass** (8.4s; clones `CLI_ROOT`, builds inside the clone, runs the real built dist against a fresh target) — `git -C cleargate-cli status --porcelain` captured immediately before and immediately after: **byte-identical (both empty)** |
| `npm run typecheck` | **clean, 0 errors** |

No build was run and no branch was switched in the main checkout for any of these — all three are read-only `npm run test:file`/`npm run typecheck` invocations against the already-checked-out `358ae35`.

### 5. Sealed red files — still byte-unchanged

`git diff 20a40ff..358ae35 -- test/scripts/scaffold-layout.red.node.test.ts test/scripts/scaffold-standalone.red.integration.node.test.ts` → **empty**. Both sealed reds remain untouched through the bounce.

### Findings 2-3 disposition

Both accepted as-is in the Dev's addendum (report-accuracy corrections, no code change): `test_close_sprint_v21.integration.node.test.ts`'s flakiness and `gate-run.integration.node.test.ts` Scenario 7's pre-existing failure are now correctly disclosed. Nothing further to re-verify — round 1 already established both are pre-existing and unrelated to this story's diff.

### Cleanup

`/private/tmp/cg-s41-qa-058-02r2*` removed. No `.cleargate/reports/` or `.script-incidents` files created this round (no `run_script.sh` invocation). Main checkout: `git status --porcelain` shows only the pre-existing untracked `cleargate-0.25.0.tgz` (predates both QA rounds, not created by me).

QA=PASS
