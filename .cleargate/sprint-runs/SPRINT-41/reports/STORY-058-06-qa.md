# STORY-058-06 — QA-Verify Report

role: qa

QA: PASS

Commit chain verified: `10176ea` (Dev) on top of `e990607` (QA-Red re-seal) on `3871857` (QA-Red red) on main `2e566b5`. cli repo, `story/STORY-058-06`.

## 1. Sealed-test integrity

| Check | Expected | Observed | Result |
|---|---|---|---|
| `git diff e990607 10176ea --stat -- test/` | only `test/helpers/scaffold-roots.ts` | exactly `test/helpers/scaffold-roots.ts` (+27/−15) | PASS |
| `git diff e990607 10176ea --stat` (whole diff) | exactly 7 files | `scripts/build-manifest.ts`, `scripts/verify-pack-checks.mjs` (new), `scripts/verify-pack.mjs`, `src/commands/init.ts`, `src/lib/manifest-builder.ts` (new), `src/lib/manifest.ts`, `test/helpers/scaffold-roots.ts` — 7 files, 1107(+)/656(−) | PASS |

## 2. Typecheck

`npm run typecheck` → exit 0.

## 3. Solo re-runs (`npm run test:file -- <file>`)

| File | Result | Required |
|---|---|---|
| `test/lib/manifest-host-ownership.red.node.test.ts` | 18/18 | 18/18 |
| `test/commands/init-host-snapshot.red.node.test.ts` | 13/13 | 13/13 |
| `test/scripts/verify-pack-compat.red.node.test.ts` | 7/7 | 7/7 |
| `test/lib/manifest-legacy-snapshot.red.integration.node.test.ts` | 1/1 | 1/1 |
| `test/scripts/scaffold-layout.red.node.test.ts` | 18/18 | 18/18 |
| `test/commands/init-from-source.node.test.ts` | 11/11 | 11/11 |
| `test/commands/init-from-source-dist.integration.node.test.ts` | 2/2 | 2/2 |
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (compare, `CLEARGATE_INIT_BASELINE`) | 5/5 | 5/5 |
| `test/commands/init-host-parity.red.integration.node.test.ts` (compare) | 15/15 | 15/15 |
| `test/hosts/host-adapter-contract.red.node.test.ts` (sealed -03) | 19/19 | 19 |
| `test/hosts/host-selection.red.node.test.ts` (sealed -04) | 11/11 | 11 |
| `test/commands/init-host-selection.red.node.test.ts` (sealed -04) | 10/10 | 10 |
| `test/commands/init-host-cli.red.integration.node.test.ts` (sealed -04) | 4/4 | 4 |

Parity files run compare-mode only, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`; no capture flag ever set.

Baseline integrity (`find … -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256`):
- Before: `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` (425 files)
- After: `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` — unchanged.

Regression-witness spot-check (3 files): `test/lib/manifest.node.test.ts` 30/30, `test/scripts/build-manifest.node.test.ts` 20/20, `test/commands/upgrade.node.test.ts` 14/14 — all match the Dev's reported counts exactly.

## 4. Pre-existing failure — proved on `main`, not reasoned about

`test/scripts/test_version_bump_alignment.integration.node.test.ts` hardcodes `REPO_ROOT = path.resolve(__dirname, '..', '..', '..')` (three levels up from `test/scripts/`) and reads `<REPO_ROOT>/cleargate-cli/package.json` + `<REPO_ROOT>/mcp/package.json` by literal sibling directory NAME — a plain worktree at an arbitrary path (e.g. `/private/tmp/cg-s41-qa-058-06-main`) ENOENTs instead of reproducing the real assertion.

Procedure used:
1. `git worktree add /private/tmp/cg-s41-qa-058-06-root/cleargate-cli main` (directory literally named `cleargate-cli`, so `REPO_ROOT` = its parent).
2. `ln -s /Users/ssuladze/Documents/Dev/ClearGate/mcp /private/tmp/cg-s41-qa-058-06-root/mcp` (real sibling `mcp/`, read-only symlink).
3. `ln -s <cli>/node_modules` into the worktree.
4. Ran the one file solo inside the worktree.
5. `git worktree remove --force`, temp dir removed.

Result on `main` (`2e566b5`, no `-06` changes at all): **2 pass, 1 fail** — `cli/mcp major.minor pair is in SUPPORTED_PAIRS` fails identically (cli 0.26.1 / mcp 0.2.0 not in the test's own hardcoded `SUPPORTED_PAIRS` list). This is the exact same single failure the Dev reported on the story branch. **Confirmed pre-existing, unrelated to this story** (the test's other two assertions, including the one that exercises `composeCanonicalPayload`/`buildInstallView`, pass on both sides).

The main checkout itself was never touched (only a disposable worktree + a read-only symlink into `mcp/`); the worktree is torn down.

## 5. Static checks

| Command | Result |
|---|---|
| `command grep -n "resolveCliPackageRoot\|build-manifest" src/commands/init.ts` | no output (exit 1) |
| `command grep -rn "from '../../scripts\|from '../scripts" src/` | no output (exit 1) |
| `command grep -n "import.meta.url" src/lib/manifest-builder.ts` | no output (exit 1) |

All three print nothing, as required.

## 6. D1–D13 conformance (read against `git diff e990607 10176ea`)

| Item | Verified | Notes |
|---|---|---|
| FU-1 compat restricted to core+claude, collision check stays all-roots, check happens BEFORE the `COMPAT_ROOT_KEYS.has` gate | PASS | `buildMultiRootManifest`: collision-map set/throw runs unconditionally per entry; `if (COMPAT_ROOT_KEYS.has(root.key)) compatEntries.push(entry)` only after. |
| FU-4 guarded `sameDir` first in `buildMultiRootManifest` | PASS | `sameDir` (try/catch realpathSync) defined and checked as the first statement after reading `pkgRoot`/`now`/`write`, before `enumerateScaffoldRoots` and before any write — matches M3-A9 exactly. |
| `owner` as the LAST key | PASS | `walkDir` builds the entry object first, then `if (ownerOf) entry.owner = ownerOf(...)` — assigned after construction. Snapshot literal in `init.ts` also ends `pin_version: pinVersion, hosts: hostsAfter,` — `hosts` last. |
| `buildViewManifest` provenance, not a prefix | PASS | `ownerOf` in `buildViewManifest` does `fs.lstatSync(path.join(r.dir, ...segments)).isFile()` across `opts.roots`, throws on 0 or 2+ matches — no `.claude` string test. Kills mutant MU. |
| `entryOwner`'s `/` boundary | PASS | `entry.path === '.claude' \|\| entry.path.startsWith('.claude/')` — `.clauderc` correctly falls through to `'core'`. |
| `installedHosts` returns copies | PASS | `snapshot?.hosts ? [...snapshot.hosts] : [...LEGACY_INSTALLED_HOSTS]` — fresh array both branches. |
| `mergeInstalledHosts` | PASS | One-liner matches M3-A2 exactly: registry-ordered union of prior∪added, then not-yet-registered prior names appended. |
| Step 7 exactly as in M3-A7, `hosts: hostsAfter` last, carry-forward sort | PASS | `prior`/`priorHosts`/`hostsAfter`/`registered`/`keep`/`carried` block is byte-identical to the M3-A7 binding code block in `plans/M3.md`; `rehashedFiles = pkgManifest.files.filter((e) => include(e.path)).map(...)`; `listed`/`files` carry-forward + sort present; snapshot literal ends `pin_version: pinVersion, hosts: hostsAfter,`. |
| `readRunningCliVersion` | PASS | Walks up from `path.dirname(fileURLToPath(import.meta.url))` to first `package.json` named `"cleargate"`, falls back to `'0.0.0'` — matches D7. `resolveCliPackageRoot`, its doc, and the `pathToFileURL`/`composePayload` imports are deleted from `init.ts`. |
| 3c wiring | PASS | `verify-pack.mjs` after check 3b: dynamic import of `verify-pack-checks.mjs`, reads `templates/cleargate-planning/MANIFEST.json`, and the E7-pinned line `errors.push(...checkCompatPayload({ packedFiles: files, compatManifest }));` is present verbatim. `checkCompatPayload` in `verify-pack-checks.mjs` is the M3-A11 `else if` chain (out-of-enum owner → error; `else if` claude-not-under-.claude → error; `else if` core-under-.claude → error), never a biconditional. |

**Ruling on the Dev's one deviation (try/catch around 3c).** Accepted, non-blocking. D10 asked for check 3c to "run exactly" the `errors.push(...)` line; the Dev wrapped the dynamic import + `MANIFEST.json` read + that line in a `try/catch` that reports `"...MANIFEST.json is unreadable — run \`npm run prebuild\`"` on failure. This mirrors the **existing sealed** pattern in check 3b two lines above it (same script, same convention, pre-dating this story) — a missing/corrupt compat manifest already fails loud there via an identical try/catch. The E7 static test only regex-matches the source for the load and the exact `errors.push(...checkCompatPayload(...))` line — both are present verbatim inside the `try`, so the wiring assertion holds regardless of the wrapper. It is strictly safer (a named error vs. an unhandled `SyntaxError`/`ENOENT` crashing the whole script) and does not weaken any of scenario 16's negative controls (those exercise `checkCompatPayload` directly, not through the wrapped call site). Confirmed by both `verify-pack-compat.red.node.test.ts` (7/7) and the Dev's own real end-to-end build/pack/verify run.

## 7. Real build-script smoke

`npm run prebuild` → exit 0, no unclassified-file warning.

- `templates/cleargate-planning/MANIFEST.json`: 74 entries, all owners ∈ `{core, claude}`, 0 entries missing `owner`, no `hosts` key. Top-level keys: `cleargate_version, generated_at, files` (correct — install-snapshot-only field absent from the shipped manifest).
- `templates/scaffold/core/MANIFEST.json`: 50 entries, owner `core` only.
- `templates/scaffold/hosts/claude/MANIFEST.json`: 24 entries, owner `claude` only.
- 50 + 24 = 74, matching the compat manifest's entry count exactly.
- `git status --short` in the cli repo after prebuild shows no tracked-file diff (`templates/` is gitignored); only the pre-existing untracked `cleargate-0.25.0.tgz` remains.

## 8. Gherkin / requirement coverage map

| §2.1 Scenario | Test(s) | Result |
|---|---|---|
| Every payload file resolves to exactly one owner | `manifest-host-ownership.red` Scenario 1 (perRoot owners), Scenario 6 (real-payload cross-check vs adapter roots), Scenario 9 (composeCanonicalPayload agrees with buildManifest), Scenario 10 (static wiring); `verify-pack-compat.red` Scenario 16 (owner enforcement on the shipped compat payload) | covered, all green |
| Shared assets are owned by core | `manifest-host-ownership.red` Scenario 5 (core-held shared asset, owner core, appears once; duplicate collides), Scenario 2b (TPV E5 — `buildViewManifest` owner by provenance, not `.claude` prefix); `init-host-snapshot.red` Scenario 21(b)/21(e) (a still-installed host's shared core entry survives a no-flag reinit; a no-longer-shipped core entry does not carry forward) | covered, all green |
| Legacy snapshot is read as a Claude install | `manifest-host-ownership.red` Scenario 7 (`entryOwner`/`installedHosts` unit, incl. TPV E6 `.clauderc`→core / `.claude`→claude boundary), Scenario 8 (real captured 0.10.0 snapshot: all 65 entries agree, file byte-unchanged); `manifest-legacy-snapshot.red.integration` Scenario 17 (doctor never mutates the legacy snapshot in either mode) | covered, all green |
| Snapshot records the installed set | `init-host-snapshot.red` Scenarios 11 (no-flag → `['claude']`, last key), 12–14 (R2 profile/selection combinations), 21(a)-(e) (M3-A2/M3-A7 carry-forward, sort, `mergeInstalledHosts` unit); both M2 parity files (5/5, 15/15) as the sanctioned-delta regression guard | covered, all green |

§1.2 requirements: all five bullets (owner field on entries; `hosts` on the snapshot; legacy read-time default; shared-core no-duplication; derivation-not-declaration in `build-manifest.ts`) trace to the rows above — no requirement without a covered scenario.

§4.1 minimums: unit ≥4 (far exceeded — 18+13+7 across the three new unit files), integration ≥1 (`manifest-legacy-snapshot.red.integration`, 1/1), e2e/acceptance ≥1 (`init-host-snapshot.red` Scenario 12, `--host all` full-set install).

DoD §4 "tested against a real captured snapshot, not synthesized": confirmed — `test/fixtures/manifest/legacy-install-manifest-0.10.0.json` re-hashed independently to `fa0c79ac7f2b61295d02c75a5c5a01360c8b1483a0fd520bb24c1b05fd0d39c7` (matches QA-Red's recorded hash exactly), 65 entries, no `hosts`/`owner` keys, `cleargate_version`/`pin_version` both `0.10.0`.

MISSING: none.

## Regressions

None. No name-set difference against the sealed/main baseline in any file re-run (solo, per-file). The one `test_version_bump_alignment` failure is independently reproduced as pre-existing on `main` (§4 above), not a regression.

## Task Breakdown advisory (EPIC-054 WS7)

All 8 rows in the story's `## Task Breakdown` are still `- [ ]` (unchecked) despite the underlying work being complete and verified (FU-1..FU-4, owner stamping, Step 7 = M3-A7, typecheck/witnesses/parity all green). Advisory only, not a bounce condition — flagged for the orchestrator to reconcile the checklist state before or at merge.

## Script Incidents

None. All script invocations were `npm run test:file`/`typecheck`/`prebuild` (via `npm run`, per Cross-Cutting Rule 18 — never a bare `cleargate`), plus read-only `git`/`shasum`/`node -e` inspection and one disposable `git worktree add`/`remove` pair. No `.cleargate/scripts/*` wrapper was invoked, so no wrapper incident applies.

flashcards_flagged:
  - "2026-09-25 · #qa #test-harness #cross-repo · A worktree proving pre-existing-on-main must be literally NAMED cleargate-cli with a symlinked sibling mcp/ — test_version_bump_alignment's REPO_ROOT is 3-up-from-test/scripts by directory NAME, not by git structure."

STATUS=done
