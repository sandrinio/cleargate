# STORY-058-06 — QA-Red Report

role: qa

Commit: `387185739b1b30e9611ca6640f9315cc48efd4ea` (`story/STORY-058-06`, cli repo) — `qa-red(STORY-058-06): write failing tests`

## Per-scenario table

| # | File | Test | Red/Green @ commit | Reason (verified against source) |
|---|---|---|---|---|
| 1 | manifest-host-ownership.red.node.test.ts | Scenario 1 — every perRoot entry carries exactly the owning root's owner; no cross-root duplicate | RED | `buildManifest({scaffoldRoot})`'s `walkDir`/`buildMultiRootManifest` (scripts/build-manifest.ts) does not stamp `owner` on any entry yet — every entry's `owner` is `undefined`. |
| 2 | manifest-host-ownership.red.node.test.ts | Scenario 2 — compat.files has no fake-host entries and deep-equals buildViewManifest(core+claude).files | RED | FU-1 not implemented: `compat` still unions **every** enumerated root (STORY-058-02 behaviour), so `.claude/agents/fake-only.md` is present. |
| 3 | manifest-host-ownership.red.node.test.ts | Scenario 3 — hosts/fake also writing .claude/agents/a.md throws a collision naming the exact path | **GREEN** (regression guard) | `buildMultiRootManifest`'s all-roots collision check (STORY-058-02) already exists unchanged; this scenario doesn't touch new -06 surface. |
| 4a | manifest-host-ownership.red.node.test.ts | Scenario 4 — write: true at \<pkgRoot\>/scaffold throws /refusing to write/, and no MANIFEST.json is written | RED | FU-4's tracked-scaffold write-refusal doesn't exist; the call writes `core/MANIFEST.json` without throwing. |
| 4b | manifest-host-ownership.red.node.test.ts | Scenario 4 — write: false at the same tracked scaffold path returns normally and writes nothing (may already be green) | **GREEN** (regression guard) | `write:false` already short-circuits every write path today, independent of FU-4. |
| 4c | manifest-host-ownership.red.node.test.ts | Scenario 4 — control: scaffoldRoot = \<pkgRoot\>/templates/scaffold with write: true writes the per-root manifests (may already be green) | **GREEN** (regression guard) | Today's unconditional write path already writes per-root manifests regardless of scaffoldRoot location; FU-4 only adds a refusal for the OTHER path. |
| 5 | manifest-host-ownership.red.node.test.ts | Scenario 5 — a core-held shared asset has owner "core" and appears exactly once; a duplicate elsewhere still collides | RED | First assertion (`owner === 'core'`) fails — owner not yet stamped. (The collision half, reached only if the first half passed, is itself already-passing behaviour; the test aborts at the owner check.) |
| 6 | manifest-host-ownership.red.node.test.ts | Scenario 6 — cross-check: real-payload owner agrees with adapter roots and entryOwner (never pins membership) | RED | "every union entry under a's ownedRoots has owner a" fails: real `.claude/**` entries (e.g. `.claude/agents/architect-reader.md`) have `owner === undefined`, not `'claude'`. |
| 7.1 | manifest-host-ownership.red.node.test.ts | Scenario 7 — entryOwner: explicit owner wins; absent owner defaults by the .claude/** prefix rule | RED | `manifestLib.entryOwner is not a function` — not yet exported from `src/lib/manifest.ts`. |
| 7.2 | manifest-host-ownership.red.node.test.ts | Scenario 7 — installedHosts defaults to the legacy ["claude"] for null/undefined/hosts-absent snapshots | RED | `manifestLib.installedHosts is not a function`. |
| 7.3 | manifest-host-ownership.red.node.test.ts | Scenario 7 — mutating installedHosts's return value never affects LEGACY_INSTALLED_HOSTS or later calls | RED | Same — `installedHosts` absent. |
| 7.4 | manifest-host-ownership.red.node.test.ts | Scenario 7 — installedHosts returns a fresh copy of an explicit hosts array, not the same reference | RED | Same — `installedHosts` absent. |
| 8 | manifest-host-ownership.red.node.test.ts | Scenario 8 — loadInstallSnapshot + installedHosts/entryOwner agree on all 65 entries; the file stays byte-unchanged | RED | Fails at `manifestLib.installedHosts(loaded)` — not yet a function. |
| 9 | manifest-host-ownership.red.node.test.ts | Scenario 9 — composeCanonicalPayload stamps owner on every entry, matching buildManifest(scaffoldRoot).compat.files | RED | `composeCanonicalPayload` (test/helpers/scaffold-roots.ts) still calls the legacy `planningRoot`-mode `buildManifest`, which never stamps `owner` — first entry checked (`.claude/agents/architect-reader.md`) has `owner === undefined`. |
| 10.1 | manifest-host-ownership.red.node.test.ts | Scenario 10 — src/commands/init.ts contains neither "resolveCliPackageRoot" nor the string "build-manifest" | RED | Both literal strings are still present in `src/commands/init.ts` today (FU-2 retirement not done). |
| 10.2 | manifest-host-ownership.red.node.test.ts | Scenario 10 — scripts/build-manifest.ts re-exports TIER_RULES and unclassifiedPaths by IDENTITY from the lib | RED | `Cannot find module .../src/lib/manifest-builder.ts` (FU-2 file doesn't exist). |
| 10.3 | manifest-host-ownership.red.node.test.ts | Scenario 10 — src/lib/manifest-builder.ts exports buildViewManifest, buildInstallView and COMPAT_ROOT_KEYS | RED | Same — module not found. |
| 11 | init-host-snapshot.red.node.test.ts | Scenario 11 — hosts is ["claude"] and is the LAST key; every entry has owner; the path set matches the payload manifest | RED | Init Step 7's snapshot literal has no `hosts` key at all — key order ends at `pin_version`. |
| 12 | init-host-snapshot.red.node.test.ts | Scenario 12 — R2, hosts: ["all"] — snapshot hosts is exactly ["claude","codex"]; all 4 stub entries are present | RED | `snapshot.hosts` is `undefined` (Step 7 doesn't write `hosts` yet). |
| 13 | init-host-snapshot.red.node.test.ts | Scenario 13 — R2, hosts: ["claude"] — snapshot hosts is ["claude"]; .codex/fake.toml and .agents/** excluded | RED | `snapshot.hosts` is `undefined`. |
| 14 | init-host-snapshot.red.node.test.ts | Scenario 14 — R2, hosts: ["codex"] — snapshot hosts is ["codex"]; .claude/agents/a.md excluded | RED | `snapshot.hosts` is `undefined`. |
| 15.1 | init-host-snapshot.red.node.test.ts | Scenario 15 — a baseline differing ONLY by the sanctioned hosts-key delta passes | **GREEN** (mechanism self-test) | Exercises `SANCTIONED_BASELINE_DELTAS`/`captureOrCompare`, which QA-Red itself implements in this same commit (a test-helper deliverable, not a Developer one) — green by design. |
| 15.2 | init-host-snapshot.red.node.test.ts | Scenario 15 — a byte change on a DIFFERENT (unsanctioned) file fails, naming that path | **GREEN** (mechanism self-test) | Same — proves the mechanism still rejects an unrelated drift and names the path. |
| 15.3 | init-host-snapshot.red.node.test.ts | Scenario 15 — the sanctioned file drifting to a THIRD (unexpected) hash fails, naming that path | **GREEN** (mechanism self-test) | Same — proves the mechanism rejects a hash matching neither anchor. |
| 16.1 | verify-pack-compat.red.node.test.ts | returns [] for a consistent compat manifest / packedFiles pair | RED | `Cannot find module .../scripts/verify-pack-checks.mjs` (FU-3 file doesn't exist). |
| 16.2 | verify-pack-compat.red.node.test.ts | a compat entry missing from packedFiles produces one error naming the path | RED | Same — module not found. |
| 16.3 | verify-pack-compat.red.node.test.ts | owner: "codex" (outside core/claude) produces one error naming the path | RED | Same. |
| 16.4 | verify-pack-compat.red.node.test.ts | an entry with no owner at all produces one error naming the path | RED | Same. |
| 16.5 | verify-pack-compat.red.node.test.ts | owner: "claude" at a path outside .claude/ produces one error naming the path | RED | Same. |
| 16.6 | verify-pack-compat.red.node.test.ts | owner: "core" at a path under .claude/ produces one error naming the path | RED | Same. |
| 17 | manifest-legacy-snapshot.red.integration.node.test.ts | hook-health mode, then --check-scaffold mode: the snapshot stays byte-unchanged after both | **GREEN** (regression guard) | Neither `runHookHealth` nor `runCheckScaffold` (src/commands/doctor.ts) ever writes `.install-manifest.json` today — verified by reading both functions; unaffected by owner/hosts being absent. |
| 18 | scaffold-layout.red.node.test.ts (amended) | produces per-root manifests plus an unchanged compat manifest, all sharing one frozen now | RED | The amended comparison now calls the not-yet-existing `buildViewManifest` (src/lib/manifest-builder.ts) — `Cannot find module`. All other 17 tests in this sealed file are unaffected and still pass. |
| 19 | init-from-source.node.test.ts (amended) | STORY-058-06 scenario 19: initHandler({fromSource}) writes a snapshot whose every entry has owner and whose hosts is ["claude"] | RED | Snapshot entries lack `owner` (`entry.owner === undefined`). |
| 20 | init-from-source-dist.integration.node.test.ts (amended) | with scripts/ removed: init --from-source --pin 0.0.0-m3 exits 0 and every snapshot entry has owner | RED | The current `--from-source` bridge still dynamically imports `scripts/build-manifest.ts` via `resolveCliPackageRoot`; with the clone's `scripts/` removed it throws `ScaffoldSourceError` (exit 2) — exactly the runtime dependency FU-2 removes. `execFileSync` throws naturally (same convention the sealed test above already uses). |
| 21a | init-host-snapshot.red.node.test.ts | 21(a): claude then codex — hosts is ["claude","codex"]; claude entry survives; .claude/** untouched by pass 2 | RED | `snapshot.hosts` is `undefined` (M3-A2's `mergeInstalledHosts` + Step 7 carry-forward not implemented). |
| 21b | init-host-snapshot.red.node.test.ts | 21(b): claude+codex then no flag — hosts stays ["claude","codex"]; .codex/fake.toml survives byte-unchanged | RED | Same — `snapshot.hosts` undefined. |
| 21c | init-host-snapshot.red.node.test.ts | 21(c): a fresh dir with hosts: ["codex"] gives hosts ["codex"] | RED | Same — `snapshot.hosts` undefined. |
| 21d | init-host-snapshot.red.node.test.ts | Scenario 21(d) — mergeInstalledHosts unit | RED | `manifestLib.mergeInstalledHosts is not a function` — not yet exported from `src/lib/manifest.ts`. |

Totals: 38 scenario-rows across the 4 new files (17+11+6+1) plus the 3 amended-file scenarios (1 each). 31 RED (the intended Developer/FU surface), 7 GREEN — 4 pre-existing regression guards (scenario 3, 4b, 4c, 17) plus 3 self-tests of the sanctioned-delta mechanism itself (scenario 15.1–15.3, a QA-Red-owned test-helper deliverable). Each row-count is cross-checked against that file's actual `node:test` total in the per-file table below.

## Per-file counts — 2 solo runs each (`npm run test:file -- <file>`)

| File | Run 1 | Run 2 | Notes |
|---|---|---|---|
| test/lib/manifest-host-ownership.red.node.test.ts | 17 tests, 3 pass, 14 fail | 17 tests, 3 pass, 14 fail | Identical both runs. |
| test/commands/init-host-snapshot.red.node.test.ts | 11 tests, 3 pass, 8 fail | 11 tests, 3 pass, 8 fail | Numbers shown are POST the `captureOrCompare` fix (see below); pre-fix runs were identical on this file too — the fix only changed parity-file behaviour, not this file's own scenario 15 self-tests. |
| test/scripts/verify-pack-compat.red.node.test.ts | 6 tests, 0 pass, 6 fail | 6 tests, 0 pass, 6 fail | Identical both runs. |
| test/lib/manifest-legacy-snapshot.red.integration.node.test.ts | 1 test, 1 pass, 0 fail | 1 test, 1 pass, 0 fail | Identical both runs; regression guard. |
| test/scripts/scaffold-layout.red.node.test.ts (amended) | 18 tests, 17 pass, 1 fail | 18 tests, 17 pass, 1 fail | Identical both runs. |
| test/commands/init-from-source.node.test.ts (amended) | 11 tests, 10 pass, 1 fail | 11 tests, 10 pass, 1 fail | Identical both runs. |
| test/commands/init-from-source-dist.integration.node.test.ts (amended) | 2 tests, 1 pass, 1 fail | 2 tests, 1 pass, 1 fail | Identical both runs; each run does a full clone + `npm run prebuild` + `npm run build` (~9s). |

`npm run typecheck` → exit 0 (test files are outside `tsconfig.json`'s `include: ["src/**/*"]`, so none of the above is type-checked — confirmed by reading `tsconfig.json` directly, not assumed).

## Sealed -03/-04 re-run counts (must stay green — init-fixture.ts was touched)

| File | Run 1 | Run 2 |
|---|---|---|
| test/hosts/host-adapter-contract.red.node.test.ts | 19/19 pass | 19/19 pass |
| test/hosts/host-selection.red.node.test.ts | 11/11 pass | 11/11 pass |
| test/commands/init-host-selection.red.node.test.ts | 10/10 pass | 10/10 pass |
| test/commands/init-host-cli.red.integration.node.test.ts | 4/4 pass | 4/4 pass |

All four match their dispatch-declared counts exactly, both runs.

## M2 parity files (compare mode, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`)

- `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` — **5/5 pass** (2 runs, both green).
- `test/commands/init-host-parity.red.integration.node.test.ts` — **15/15 pass** (2 runs, both green).

**Important correction made mid-session.** My first `SANCTIONED_BASELINE_DELTAS` implementation asserted the CURRENT run's `.cleargate/.install-manifest.json` hash must equal `currentHash(id)` unconditionally. That failed both parity files (`malformed`/`force` in the claude-adapter file) with `actual: '12efef5a...' (baselineHash), expected: 'd37ce8d2...' (currentHash)` — because at the QA-Red commit, `init.ts` Step 7 has not yet been changed to write `hosts`, so the live run still produces the OLD (pre-delta) bytes. The dispatch's own wording — "The -06 delta row asserts record sha == currentHash only when the snapshot changed" — says this is expected, not a defect. I changed the compare-side check to accept EITHER `baselineHash(id)` (not-yet-landed) OR `currentHash(id)` (landed), and reject anything else (a real regression). Re-ran both parity files after the fix: 5/5 and 15/15, confirmed twice each. Baseline integrity hash (`find ... | sort | xargs shasum -a 256 | shasum -a 256`) was `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` **before any changes**, and is still `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` **after every run** (checked after the full test sweep) — unchanged, as required (compare-only, never capture).

## Baseline hash

- Before: `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2`
- After: `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2`

## Fixture sha256

`test/fixtures/manifest/legacy-install-manifest-0.10.0.json` — `fa0c79ac7f2b61295d02c75a5c5a01360c8b1483a0fd520bb24c1b05fd0d39c7`. Verified via `shasum -a 256` on `OUTER/.cleargate/.install-manifest.json` BEFORE copying (matched the dispatch's recorded hash exactly), then `diff`'d byte-identical against the copy. The test never reads the live outer file — it reads only the committed fixture path.

First-principles hash check for the -06 `SANCTIONED_BASELINE_DELTAS` row (computed independently in Node, matching the dispatch's literals exactly):
- `baselineHash` (stub snapshot, no `hosts`) = `12efef5a49365b232044de43c0c839fa214ab4094b64d741e83c1cfa58bae26d` ✓
- `currentHash` (stub snapshot + `hosts: ['claude']` last) = `d37ce8d25785eb6fcb070673b45ad049b9c653d1e3266d6537b7b7bff013ca4f` ✓

## Plan ambiguities resolved (orchestrator_confirmed: false for all)

1. **Scenario 5's "two fake adapters in a fixture registry both declare it in sharedRoots()"** — `buildManifest` takes no registry parameter; ownership is derived purely from the physical root a file was copied from. I interpreted this phrase as narrative justification for WHY a shared asset lives in `core/` (tying to story §1.2's Gherkin), not as a literal registry object the test must construct and pass in. The test places `shared.md` under `core/` and asserts `owner === 'core'`, appears once, and a duplicate under a different host root collides — matching the Gherkin's observable behaviour exactly.

2. **`test/helpers/scaffold-roots.ts`'s `composeCanonicalPayload` was left UNEDITED.** The -06 blueprint's "Files" list assigns its rewrite (to call the not-yet-existing `buildInstallView`) as part of FU-2, which is Developer scope, not QA-Red's per the story's Task-Breakdown row ("QA-Red: ownership, snapshot, verify-pack-compat unit reds ... Add the real 0.10.0 snapshot fixture and the init-fixture sanctioned-delta row" — `scaffold-roots.ts` is not named). Leaving it unedited still produces a fully legitimate RED for scenario 9 (the function runs fine but its output lacks `owner`), so no QA-Red change to that helper was needed to satisfy any scenario.

3. **The sanctioned-delta "only when the snapshot changed" clause** required an explicit two-hash acceptance window (baseline OR current) rather than a single hard-coded expectation — see the "Important correction" note above. I resolved the ambiguous English into the literal dual-branch check that makes both parity files pass 5/5 and 15/15 at the red commit while still catching a genuinely wrong third value.

4. **Scenarios 4b/4c and 17 are recorded GREEN, not forced red.** The story text doesn't flag these as "may already pass" the way STORY-058-02's scaffold-layout scenario 2 was explicitly flagged in that file's own docstring, but the same honesty convention applies (established by that precedent and by flashcard `2026-09-02 #test-harness #qa`: "invert where edited" / never force a red). I verified each by reading the relevant source (`buildMultiRootManifest`'s `doWrite` guard; `runHookHealth`/`runCheckScaffold` never calling any `.install-manifest.json` writer) rather than assuming.

5. **Verify §4's sealed-file list (4 files) was treated as complete**, not the plan's broader "How Dev and QA run" list (which additionally names `build-manifest.node.test.ts`, `manifest.node.test.ts`, several `upgrade-*`/`doctor-*` files, etc.). My dispatch's own explicit Verify section names exactly the 4 -03/-04 contract files as "must stay green, because you touch init-fixture.ts" — I re-ran exactly those, twice each, and did not expand scope to the plan's Developer/QA-Verify-facing list.

## Script Incidents

None. Every script invocation went through `npm run test:file`/`npm run typecheck` directly per Cross-Cutting Rule 18 (never a bare `cleargate`); no `.cleargate/scripts/*` wrapper script was executed by QA-Red for this story.

flashcards_flagged:
  - "2026-09-25 · #test-harness #host #qa-red · SANCTIONED_BASELINE_DELTAS must accept EITHER the not-yet-landed baseline hash or the landed delta hash — a hard currentHash-only check reds the M2 parity files before the Developer lands."

STATUS=done
