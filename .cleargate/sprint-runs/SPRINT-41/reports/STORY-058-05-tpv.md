# STORY-058-05 TPV — Round 1

role: architect

TPV: REJECTED — 4 of 13 lifecycle reds (scenarios 3, 4, 6a, 6b) are unsatisfiable by a plan-conformant build. Every install keeps the fixture's stub `readInstallManifest` (`files: []`), so every snapshot is empty. Scenarios 8 and 11 pass vacuously for the same reason. With that fixed, 14 of 39 mutants still survive, including the story's safety property (delete by `entryOwner`, not by path). Fix: re-seal R1–R10 below. It is one unified diff, and `git apply --check` is clean on `764f063`. If the expected counts reproduce, no second TPV round is needed.

Wiring is sound: every import resolves, every constructor and seam call matches its as-built signature, every `mock.fn` target exists, every handler call injects `exit`, and the naming follows §Test Stack.

**Reviewed:**
- cli `story/STORY-058-05` @ `764f063` (red commit on main `6b5ee5c`). It touches exactly the two new red files; no sealed file and no `test/helpers/*` changed.
- The plan: `plans/M3.md` §STORY-058-05 as superseded by T3, T4, M3-A2, M3-A5 and M3-A14..A18.
- Story amendments D1–D5 (D4 per M3-A18).
- `reports/STORY-058-05-qa-red.md`.

## TPV wiring checklist

| # | Check | Result |
|---|---|---|
| 1 | Imports resolve | Yes. The static imports (`scaffold-roots`, `init-fixture`, `registry`, `claude`, `manifest`, `sha256`, `types`) all exist. `lifecycle.ts` and `host.ts` are per-test dynamic imports. |
| 2 | Constructor calls | Yes. `createHostRegistry(adapters)` (`registry.ts:193`), `new ExitSignal(code)` (`init-fixture.ts:43-48`). The fakes satisfy `HostAdapter` (`types.ts:36-58`). Shared-vs-shared overlap is legal (`registry.ts:226-235`). |
| 3 | `mock.fn` targets | Yes. `install` and `remove` on plain `HostAdapter` objects. |
| 4 | Orphan state | No before-hooks and no env writes. `runInitScenario` restores `CLEARGATE_REPO_ROOT` (`:308-311`). Per-test temp dirs are never removed, the same as in every -03/-04/-06 file. This is a non-blocking leak. |
| 5 | Naming | `*.red.node.test.ts` and `*.red.integration.node.test.ts`. |

## Simulation

**Scratch setup.**
- Clone: `/private/tmp/cg-s41-tpv-058-05/cleargate-cli` at `764f063`, with `node_modules` symlinked.
- Meta-root: `git archive` copies of outer `HEAD`'s `.cleargate/`, `cleargate-planning/` and `CLAUDE.md`. Copies, not symlinks.
- `prebuild` and `build` ran only in the scratch clone.
- The main cli checkout was never edited, stashed, built or checked out:
  - It is still `story/STORY-058-05` @ `764f063`.
  - `git status` shows only the pre-existing `cleargate-0.25.0.tgz`.
  - `dist/cli.js` predates this session.
- The scratch clones are deleted.

**The plan-conformant -05.** 5 files, +391/−14. Typecheck exits 0.

`lifecycle.ts`:
- **`planHostRemoval`:**
  - Checks run in this order: not-installed (exit 2), then only-host (exit 1), then resolve.
  - The orphaned-shared predicate is M3-A16 verbatim.
- **`executeHostRemoval`,** in this order:
  1. Read the raw snapshot.
  2. Unlink each path in `deletes`.
  3. Prune empty directories bottom-up, only under owned ∪ shared roots.
  4. Call `adapter.remove` with T4-wrapped line sinks.
  5. Write `{ ...raw, files, hosts }` with a private tmp+rename writer.
- **`addHost`,** in this order:
  1. `registry.resolve`.
  2. Read the raw snapshot.
  3. `loadPackageManifest`.
  4. `copyPayload` (`force: false`, `include` = owned ∪ shared roots, init's verbs).
  5. `install` with `logPrefix`.
  6. Merge the entries and call `mergeInstalledHosts`.
- `computeHostHealth` and `HostLifecycleError(message, exitCode)`.

`host.ts`:
- Prefix `[cleargate host] `, raw default sinks, and a private `resolveHostPayloadDir` that returns `resolveDefaultPayloadDir()`.
- Handler order: snapshot check (exit 2), then `resolve` (exit 2), then the operation. `HostLifecycleError` maps to `exit(e.exitCode)`.

Other files:
- `types.ts`: `logPrefix?`, plus the T4 item 1 doc comments.
- `claude.ts`: `const p = ctx.logPrefix ?? '[cleargate init] '` across all 12 T3 sites, and the T4 item 2 `try` move. `command grep -c "\[cleargate init\] " src/hosts/claude.ts` returns `1`.
- `cli.ts`: the import beside `:36`, and the group between `:165` and `:167`.
- The final build also includes M3-A25.

## Measured red → green (each file solo)

| File | Sealed on `764f063` src | Sealed on conformant | Re-seal on `764f063` src | Re-seal on conformant without M3-A25 | Re-seal on conformant (final) |
|---|---|---|---|---|---|
| `host-lifecycle.red` | 0/13 (QA-Red) | **9/13** (3, 4, 6a, 6b red) | 0/17 (15 fail on missing `host.ts`, 2 on missing `lifecycle.ts`) | 16/17 (7d red) | **17/17** |
| `host-cli.red.integration` | 0/3 (QA-Red) | 3/3 | 0/3 (`unknown command 'host'`) | — | **3/3** |

**Sealed file on the conformant build:**

| Scenario | Result | Evidence |
|---|---|---|
| 3 | red | `sanity: … at least one copilot-owned deletable entry` (`expectedDeletePaths` is empty) |
| 4 | red | `the shared entry must still be listed in the snapshot after removing copilot` |
| 6a | red | `row for core must report files=undefined: core files=0 …` |
| 6b | red | `codex row must report missing=1: codex files=0 missing=0 …` |
| 8, 11 | vacuously green | The snapshot has 0 entries. |

**F1 — root cause.**
- `invokeInit` defaults `readInstallManifest: () => STUB_MANIFEST` (`init-fixture.ts:197`), and `files: []` (`:97-101`).
- None of the 12 `runInitScenario` calls overrides it.
- The -05 blueprint required a real reader. `readInstallManifest: undefined` is equivalent: `extra` spreads last (`:201`), so `init.ts:559` falls back to the payload manifest (M4 V2).

**Sealed contract files and parity on the conformant build.**
- Contract files:

  | File | Pass |
  |---|---|
  | `host-adapter-contract` | 19/19 |
  | `host-selection` | 11/11 |
  | `init-host-selection` | 10/10 |
  | `init-host-cli` | 4/4 |
  | `manifest-host-ownership` | 18/18 |
  | `init-host-snapshot` | 13/13 |

- Parity, compare mode, with `CAPTURE` unset:
  - `claude-adapter-init-parity`: **5/5**.
  - `init-host-parity`: **15/15**.
- `logPrefix` is byte-neutral. Mutant M10a (a changed default) drops parity to 0/5 and 0/15, so parity is its witness.

## Mutant table

Columns:
- **R1:** the sealed tests plus fix R1 only. This is the sealed file's real power; without R1, scenarios 3, 4, 6a and 6b "kill" every mutant vacuously.
- **Final:** the full re-seal.

| ID | Mutant | R1 | Final |
|---|---|---|---|
| M1 | Removal by owned-root path prefix instead of `entryOwner` | **survives** | 3b |
| M2a | Removal deletes surgery targets | 8 | 3b, 4, 8 |
| M2b | Removal deletes preserved entries | **survives** | 3b |
| M3a | Orphaned-shared detection missing | 4 | 4 |
| M3b | Orphaned-shared over-eager | 3, 4 | 3, 4 |
| M3c | Orphan check uses registered hosts, not installed | 4 | 4 |
| M3d | Orphan deleted on disk but kept in the snapshot | 4 | 4 |
| M4a | `addHost` duplicates entries | 2a | 2a |
| M4b | `addHost` duplicates hosts | 2a | 2a |
| M4c | `addHost` copies with `force: true` | **survives** | 2a, 12 |
| M4d | `addHost` drops prior entries | **survives** | 1 |
| M4e | `addHost` copies without `include` | **survives** | 1b |
| M4f | `include` = owned roots only | 1 | 1, 1b |
| M4g | Snapshot merge unfiltered | n/a | 1, 1b |
| M5 | `hosts: [host]` | 1, 2a | 1, 1b, 2a |
| M5b | `add` drops snapshot head keys | **survives** | 1 |
| M6 | Last-host removal allowed | 5, 10b | 5, 10b |
| M7a | Last-host exit 1 → 2 | 5, 10b | 5, 10b |
| M7b | Not-installed exit 2 → 1 | 7b | 7b |
| M7c | Unknown-host exit 2 → 1 | 7a, 10a | 7a, 10a |
| M7d | No-snapshot exit 2 → 1 | 7c | 7c |
| M8a | Snapshot rewritten before the plan throws | 5, 10b | 5, 10b |
| M8b | Copy before resolve | 7a | 7a, 7d |
| M8c | Copy before the manifest load (the error path writes) | **survives** | 7d |
| M9a | Raw sinks passed to `remove()` | 3 | 3 |
| M9b | Double newline | 3 | 3 |
| M9c | `host.ts` default line sinks | **survives** | 9 |
| M10a | `logPrefix` default ≠ `'[cleargate init] '` | parity 0/5, 0/15 | parity 0/5, 0/15 |
| M10b | Only stdout sites converted | **survives** (parity green) | 12 |
| M10c | `logPrefix` not passed to `install()` | **survives** (parity green) | 12 |
| M11a | `e.owner` in `planHostRemoval` | **survives** | 3b |
| M11b | `e.owner` in `computeHostHealth` | **survives** | 9 |
| M12a | List counts core shared entries under a host row | 6a | 6a |
| M13 | No empty-directory pruning | **survives** | 4 |
| M14 | Recursive prune | 3, 8 | 3, 4, 8 |
| M15 | `remove` drops snapshot head keys | **survives** | 3 |
| M16 | `nextFiles` = snapshot minus deletes | 8 | 3b, 8 |
| M17 | `adapter.remove` not called | 3, 8 | 3, 8 |
| M18 | List exits 1 when healthy | 6a, 11 | 6a, 11 |
| M19 | List never exits 1 | 6b | 6b |

**Why the 14 survivors matter.**
- **M1, M2b, M11a** break the DoD ("asserted directly on ownership"). The M3-A14 fixture makes owner ≡ path, so the sealed tests cannot tell them apart.
- **M11a becomes reachable at -10.** On the meta-repo's legacy snapshot, `host add codex` then `host remove claude` would strand all 21 owner-less `.claude/**` entries.
- **M4c, M4d, M5b, M15** lose user data or snapshot data.
- **M4e** installs another host's files.
- **M8c** breaks "nothing is written on any error path".
- **M9c, M10b, M10c** defeat the T3/T4 contract.
- **M13** leaves empty host roots behind.

## Regression witnesses

- 50 files, 522 tests per side, each run solo. The set:
  - `cli.node`.
  - Every `doctor*`, `init*`, `upgrade*` and `uninstall` file under `test/commands/`.
  - `test/init/*`.
  - `lib/manifest*`, `lib/settings-json-surgery` and `lib/claude-md-*`.
  - `docs/claude-md-block-leads-relocation` and `init-pre-member-isolation`.
  - `scripts/build-manifest`, `scripts/template-claude-md`, `hooks/scaffold-cli-resolution` and `scripts/verify-pack-compat.red`.
  - The six sealed contract files and both parity files.
- Comparison: the sealed tests on sealed src vs the sealed tests on the final conformant src. `prebuild` and `build` ran per side, so the dist-spawning files grade the right binary.
- **Result: no regression.**
  - The failing-name sets are empty on both sides.
  - The per-file counts are identical.
  - `cli.node` stays 23/23 with `host` registered.

**Dist smokes on the conformant dist:**
- `host add bogus` in an empty dir:
  - Prints `[cleargate host] ERROR: no ClearGate install found … Run: cleargate init`.
  - Exits 2.
  - Leaves the directory empty.
- `host list`, run read-only in OUTER:
  - Prints `installed: claude`, `core files=44 missing=2`, `claude files=21 missing=1`.
  - Exits **1**. The legacy snapshot still lists three retired ratchet paths, so this is correct drift reporting.
  - DevOps smoke 1 asserts the row owners and must not expect exit 0.
  - OUTER's `git status` was unchanged.

## Baseline integrity

| When | Digest | Files |
|---|---|---|
| Before | `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` | 425 |
| After | `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` | 425 |

Compare mode only; no capture flag was ever set.

## Rulings on QA-Red's two ambiguities

1. **`hostListHandler` exit-0 shape: accepted as sealed, no amendment.**
   - Returning and calling `exit(0)` are identical at the process level.
   - Scenario 6b pins `exit(1)` strictly.
   - D6 binds the Dev: the healthy path returns without calling `exit`.
2. **Scenario 1's empty-stderr assertion: accepted.**
   - Measured: the conformant build is silent on a clean add.
   - The only reachable stderr writers are the three `install()` WARNING lines (failure-only) and the handler `ERROR` lines.
   - R8 pins the WARNING prefix.

**Findings.**
- **F1:** the blocker above.
- **F2:** scenarios 8 and 11 were vacuous.
- **F3:** owner ≡ path in the fixture, so the ownership gate was never directly tested. R5 fixes it.
- **F4:** a frozen created-file list would go red at -11 (flashcard `#test-harness #tpv #scaffold`), so R10's oracle is derived from the payload tree.

## Binding Developer constraints

**D1 — `lifecycle.ts` exports exactly** `HostHealthRow`, `computeHostHealth`, `isPreservedOnRemoval`, `HostRemovalPlan`, `planHostRemoval`, `executeHostRemoval`, `addHost` and `HostLifecycleError`, with the pinned signatures.
- `HostLifecycleError`: `constructor(message: string, exitCode: 1 | 2)`, `name = 'HostLifecycleError'`, `readonly exitCode`.
- Imports: `pathUnderRoots`, `payloadFilter` and `HostRegistry` (registry); `entryOwner`, `installedHosts`, `mergeInstalledHosts` and `loadPackageManifest` (manifest); `copyPayload`.
- No `e.owner` and no `snapshot.hosts` reads in `lifecycle.ts` or `host.ts`.

**D2 — `planHostRemoval` is pure** (no `fs`).
- It throws the blueprint messages verbatim: not-installed (2) before only-host (1), then it resolves the adapter.
- `deletes` = (owner === host ∪ orphaned-shared) minus surgery targets minus preserved. `keeps` = the excluded entries (M3-A26).
- The predicate is M3-A16 verbatim.
- `nextFiles` = the snapshot in order, minus the host-owned entries, minus the orphaned-shared entries.
- `nextHosts` = the installed hosts minus `host`.

**D3 — `executeHostRemoval`,** in this order:
1. Read the raw snapshot (M3-A29).
2. Unlink each delete. Ignore `ENOENT`; any other error goes to stderr as `${logPrefix}WARNING: could not remove <path>: <msg>\n`, and the loop continues.
3. Prune (M3-A27).
4. `adapter.remove({ cwd, stdout: (s) => ctx.stdout(s + '\n'), stderr: (s) => ctx.stderr(s + '\n') })`. Nothing goes to stderr after this call.
5. Atomic tmp+rename write of `{ ...raw, files: plan.nextFiles, hosts: plan.nextHosts }` + `'\n'`.

It returns the deleted paths plus `report.removed`.

**D4 — `addHost`,** in this order:
1. `resolve`.
2. Read the raw snapshot.
3. `loadPackageManifest`, wrapped per M3-A25.
4. `copyPayload(payloadDir, cwd, { force: false, pinVersion, include })`, with `include` = `pathUnderRoots([...owned, ...shared], rel)` and init's verbs (`init.ts:403-411`) printed as `${logPrefix}${verb} ${relPath}\n`.
5. `install({ …, force: false, logPrefix })`.
6. `files` = the raw entries not re-listed, plus `pkg.files.filter(include)`, sorted with `localeCompare`. `hosts` = `mergeInstalledHosts(installedHosts(raw), [host], registry.names())`.
7. Atomic write of `{ ...raw, files, hosts }`.

**D5 — `computeHostHealth`.**
- Rows: `core`, then the installed hosts in registry order, then any unknown installed hosts.
- Counts use `entryOwner`; `missing` uses `existsSync`.
- `hosts` = `installedHosts(snapshot)`.

**D6 — `host.ts`.**
- `PREFIX = '[cleargate host] '`.
- Default sinks are raw (`(s) => process.stdout.write(s)` / `stderr`), the default exit is `process.exit`, `cwd` is `opts.cwd ?? process.cwd()` (never `CLEARGATE_REPO_ROOT`), and the default registry is `defaultHostRegistry`.
- Handler order:
  1. The snapshot must exist. If not: exit 2 with the blueprint message verbatim. An unparseable snapshot also exits 2 and writes nothing.
  2. `resolve`: `UnknownHostError` prints `${PREFIX}ERROR: ${e.message}\n` and exits 2.
  3. The operation: `HostLifecycleError` prints `${PREFIX}ERROR: ${e.message}\n` and calls `exit(e.exitCode)`.
- Every add/remove stdout line starts with `PREFIX`.
- The pin is `opts.pin ?? snapshot.pin_version ?? 'latest'`.
- A private `resolveHostPayloadDir(host)` returns `resolveDefaultPayloadDir()`.
- `list` uses the blueprint format. The healthy path returns without calling `exit`; the unhealthy path calls `exit(1)`.

**D7 — `types.ts`.**
- Add `readonly logPrefix?: string`, documented as "stdout and stderr line prefix; default `'[cleargate init] '`".
- Add doc comments: `InstallCtx` sinks are raw writers, `RemoveCtx` sinks are line sinks, and `remove()` never rejects on a per-target I/O error.

**D8 — `claude.ts`.**
- `const p = ctx.logPrefix ?? '[cleargate init] ';`, used at all 12 sites, including the 3 WARNING lines.
- `remove()`: move the `readFileSync` inside the `try`.
- Witnesses: the grep count is `1`, and parity is 5/5 and 15/15.

**D9 — `cli.ts`.**
- Import beside `:36`.
- The blueprint group goes verbatim between `:165` and `:167`.
- Not added to `GATED_COMMANDS`.

**D10 — Unchanged** (`git diff main` must be empty): `registry.ts`, `manifest.ts`, `init.ts`, `copy-payload.ts`, `uninstall.ts`, `settings-json-surgery.ts` and all of `test/`.

**D11 — How to run.**
- `npm run typecheck`.
- Each file solo.
- Parity in compare mode only.
- No `npm run build` in the main checkout, and no `CLEARGATE_META_ROOT`.
- `npm test` excludes `*.integration.node.test.ts`, so run `host-cli.red.integration` solo.

**D12 — Sealed after re-seal:** both red files. `test/helpers/*` stays untouched.

## Re-seal edits R1–R10 (QA-Red, one commit on `story/STORY-058-05`)

Apply the diff below verbatim on `764f063`. `git apply --check` is clean on a fresh clone at `764f063`. Post-apply sha256:
- `test/hosts/host-lifecycle.red.node.test.ts`: `171e2cdcfd43239fc72aa91226c9d77ca2299c65c6cc25e7ee753bcad2c5d42a`
- `test/commands/host-cli.red.integration.node.test.ts`: `4911ac5f296b516f4ce589f999aa4ab0bf3776d3211326ca26d863efaac3013b`

| Edit | Where | What | Kills |
|---|---|---|---|
| R1 | 12 `runInitScenario` calls plus a header note | `readInstallManifest: undefined` (M3-A24) | Unblocks 3, 4, 6a and 6b; makes 8 and 11 non-vacuous |
| R2 | Scenario 1 | Vacuity guard; pre-add entries and head keys survive | M4d, M5b |
| R3 | Scenario 2a | A user-edited claude-owned file survives a re-add | M4c |
| R4 | Scenario 3 | Snapshot after = before minus copilot entries; `hosts` and head keys kept | M15 |
| R5 | New 3b | Pure `planHostRemoval` over a synthetic snapshot | M1, M2b, M11a (and M2a, M16) |
| R6 | Scenario 4 | `.agents` pruned, `hooks.json` kept, `fake.toml` gone | M13 |
| R7 | New 7d | Payload with no `MANIFEST.json`: exit 2, `ERROR` prefix, nothing written | M8c |
| R8 | New 12 | `host add` stdout lines and the `install()` WARNING carry `[cleargate host] ` | M10b, M10c |
| R9 | Integration 9 | Legacy counts 44/21; no blank line | M11b, M9c |
| R10 | New 1b (R3/P3) | Exact payload-derived created set; no `.copilot-fake`; no copilot entry | M4e, M4g |

```diff
diff --git a/test/commands/host-cli.red.integration.node.test.ts b/test/commands/host-cli.red.integration.node.test.ts
index 277ee71..eb8902a 100644
--- a/test/commands/host-cli.red.integration.node.test.ts
+++ b/test/commands/host-cli.red.integration.node.test.ts
@@ -127,6 +127,17 @@ test('scenario 9: host list on the real legacy 0.10.0 snapshot prints "installed
   );
   const rowOwners = lines.slice(1).map((l) => l.trim().split(/\s+/)[0]).filter(Boolean);
   assert.deepStrictEqual(rowOwners, ['core', 'claude'], `rows=${JSON.stringify(rowOwners)} stdout=${result.stdout}`);
+
+  // Legacy entries carry no owner: counts must come from the legacy rule
+  // (entryOwner), never from `e.owner` (which would count 0 for both rows).
+  const legacy = JSON.parse(fs.readFileSync(LEGACY_FIXTURE, 'utf8')) as { files: Array<{ path: string }> };
+  const claudeCount = legacy.files.filter((e) => e.path === '.claude' || e.path.startsWith('.claude/')).length;
+  const coreCount = legacy.files.length - claudeCount;
+  assert.ok(lines[1]!.includes(`files=${coreCount}`), `core row must report files=${coreCount}: ${lines[1]}`);
+  assert.ok(lines[2]!.includes(`files=${claudeCount}`), `claude row must report files=${claudeCount}: ${lines[2]}`);
+
+  // T4 item 3: host.ts default sinks are raw writers, so no line is double-spaced.
+  assert.ok(!result.stdout.includes('\n\n'), `stdout must hold no blank line: ${JSON.stringify(result.stdout)}`);
 });
 
 // ── Scenario 10 ──────────────────────────────────────────────────────────────
diff --git a/test/hosts/host-lifecycle.red.node.test.ts b/test/hosts/host-lifecycle.red.node.test.ts
index a08300b..16ac486 100644
--- a/test/hosts/host-lifecycle.red.node.test.ts
+++ b/test/hosts/host-lifecycle.red.node.test.ts
@@ -28,6 +28,13 @@
  * uses a local fixture registry (R2/R3), never `defaultHostRegistry`
  * (flashcard 2026-09-25 #host #registry #test-harness).
  *
+ * TPV re-seal (plans/M3.md M3-A24): every install passes
+ * `readInstallManifest: undefined`, so init Step 7 falls back to
+ * `loadPackageManifest({ packageRoot: payloadDir })` and records the fixture
+ * payload's real, owner-stamped MANIFEST.json (M4 V2). The fixture default
+ * stub (`files: []`) leaves every snapshot empty, which makes the ownership,
+ * shared-retention and list scenarios unsatisfiable or vacuous.
+ *
  * Naming: *.red.node.test.ts — immutable post-QA-Red.
  */
 import { describe, test, mock } from 'node:test';
@@ -321,11 +328,13 @@ describe('Scenario 1 — add is additive and leaves other hosts untouched (Gherk
     const { registry } = makeR2();
     const record = await runInitScenario('fresh', {
       payloadDir,
-      extra: { hostRegistry: registry, hosts: ['claude'] },
+      extra: { hostRegistry: registry, hosts: ['claude'], readInstallManifest: undefined },
     });
 
     const SNAPSHOT_REL = '.cleargate/.install-manifest.json';
     const before = listTree(record.dir, new Set([SNAPSHOT_REL]));
+    const snapshotBefore = readSnapshot(record.dir);
+    assert.ok(snapshotBefore.files.length > 0, 'sanity: the install snapshot must record the payload entries (R1)');
 
     const { hostAddHandler } = await loadHost();
     const stderrChunks: string[] = [];
@@ -360,10 +369,56 @@ describe('Scenario 1 — add is additive and leaves other hosts untouched (Gherk
     const codexEntry = snapshot.files.find((f) => f.path === '.codex/fake.toml');
     assert.ok(codexEntry, '.codex/fake.toml entry missing from snapshot');
     assert.strictEqual(entryOwner(codexEntry!), 'codex');
+    const afterByPath = new Map(snapshot.files.map((f) => [f.path, f]));
+    for (const e of snapshotBefore.files) {
+      assert.deepStrictEqual(afterByPath.get(e.path), e, `pre-add snapshot entry ${e.path} must survive host add codex unchanged`);
+    }
+    const { files: _filesAfter, hosts: _hostsAfter, ...headAfter } = snapshot;
+    const { files: _filesBefore, hosts: _hostsBefore, ...headBefore } = snapshotBefore;
+    assert.deepStrictEqual(headAfter, headBefore, 'host add must keep every snapshot key other than files/hosts');
     assert.equal(stderrChunks.join(''), '', 'a clean additive add must write nothing to stderr');
   });
 });
 
+describe('Scenario 1b — add installs exactly one adapter (Gherkin 1, R3)', () => {
+  test('host add codex onto a claude-only R3 install creates only codex-owned and codex-shared files, never another host\'s', async () => {
+    const payloadDir = await getP3();
+    const { registry } = makeR3();
+    const record = await runInitScenario('fresh', {
+      payloadDir,
+      extra: { hostRegistry: registry, hosts: ['claude'], readInstallManifest: undefined },
+    });
+    const SNAPSHOT_REL = '.cleargate/.install-manifest.json';
+    const beforeRels = new Set(listTree(record.dir, new Set([SNAPSHOT_REL])).map((f) => f.rel));
+
+    const { hostAddHandler } = await loadHost();
+    await hostAddHandler('codex', {
+      cwd: record.dir,
+      hostRegistry: registry,
+      payloadDir,
+      stdout: () => {},
+      stderr: () => {},
+      exit: makeExitSeam(),
+    });
+
+    const created = listTree(record.dir, new Set([SNAPSHOT_REL]))
+      .map((f) => f.rel)
+      .filter((rel) => !beforeRels.has(rel));
+    // Oracle: every payload file under fakeCodex's declared roots (owned .codex,
+    // shared .agents) — derived from the fixture payload, never a frozen list,
+    // so a later canonical .agents/** file does not red this test.
+    const expected = listTree(payloadDir, new Set())
+      .map((f) => f.rel)
+      .filter((rel) => rel.startsWith('.codex/') || rel.startsWith('.agents/'));
+    assert.ok(expected.includes('.codex/fake.toml') && expected.includes('.agents/skills/demo/SKILL.md'), 'sanity: P3 carries the codex fixture files');
+    assert.deepStrictEqual(created, expected, 'host add codex creates exactly the payload files under codex-declared roots');
+    assert.ok(!fs.existsSync(path.join(record.dir, '.copilot-fake')), 'an uninstalled host\'s root must never be created');
+    const snapshot = readSnapshot(record.dir);
+    assert.deepStrictEqual(installedHosts(snapshot), ['claude', 'codex']);
+    assert.ok(!snapshot.files.some((e) => entryOwner(e) === 'copilot'), 'no copilot entry may be recorded');
+  });
+});
+
 // ── Scenario 2 — idempotent add (Gherkin 2) ─────────────────────────────────
 
 describe('Scenario 2 — add is idempotent', () => {
@@ -372,7 +427,7 @@ describe('Scenario 2 — add is idempotent', () => {
     const { registry } = makeR2();
     const record = await runInitScenario('fresh', {
       payloadDir,
-      extra: { hostRegistry: registry, hosts: ['codex'] },
+      extra: { hostRegistry: registry, hosts: ['codex'], readInstallManifest: undefined },
     });
     assert.ok(!fs.existsSync(path.join(record.dir, '.claude')), 'sanity: claude must not be installed by the codex-only setup pass');
 
@@ -388,7 +443,19 @@ describe('Scenario 2 — add is idempotent', () => {
       });
     };
     await runAdd();
+    const edited = readSnapshot(record.dir).files.find(
+      (e) => entryOwner(e) === 'claude' && !claudeAdapter.surgeryTargets().includes(e.path),
+    );
+    assert.ok(edited, 'sanity: the first add must record a claude-owned, non-surgery entry');
+    const editedAbs = path.join(record.dir, edited!.path);
+    fs.appendFileSync(editedAbs, '\n<!-- user edit -->\n');
+    const editedBytes = fs.readFileSync(editedAbs);
     await runAdd();
+    assert.deepStrictEqual(
+      fs.readFileSync(editedAbs),
+      editedBytes,
+      `a re-add must never overwrite the user-edited ${edited!.path} (copy is non-force)`,
+    );
 
     const settingsRaw = fs.readFileSync(path.join(record.dir, '.claude', 'settings.json'), 'utf8');
     for (const entries of Object.values(CLAUDE_HOOK_ADDITION.hooks ?? {})) {
@@ -421,7 +488,7 @@ describe('Scenario 2 — add is idempotent', () => {
     const { registry } = makeR2();
     const record = await runInitScenario('fresh', {
       payloadDir,
-      extra: { hostRegistry: registry, hosts: ['claude'] },
+      extra: { hostRegistry: registry, hosts: ['claude'], readInstallManifest: undefined },
     });
 
     const { hostAddHandler } = await loadHost();
@@ -454,7 +521,7 @@ describe('Scenario 3 — remove preserves everything it does not own (Gherkin 3)
     const { registry, fakeCopilot } = makeR3();
     const record = await runInitScenario('fresh', {
       payloadDir,
-      extra: { hostRegistry: registry, hosts: ['all'] },
+      extra: { hostRegistry: registry, hosts: ['all'], readInstallManifest: undefined },
     });
 
     // An untracked user file under the removed host's owned root.
@@ -510,6 +577,17 @@ describe('Scenario 3 — remove preserves everything it does not own (Gherkin 3)
 
     assert.equal(fakeCopilot.remove.mock.calls.length, 1, 'fakeCopilot.remove must be called exactly once');
 
+    const snapshotAfter = readSnapshot(record.dir);
+    assert.deepStrictEqual(installedHosts(snapshotAfter), ['claude', 'codex']);
+    assert.deepStrictEqual(
+      snapshotAfter.files,
+      snapshotBefore.files.filter((e) => entryOwner(e) !== 'copilot'),
+      'the snapshot after removal is the prior snapshot minus every copilot-owned entry',
+    );
+    const { files: _filesAfter, hosts: _hostsAfter, ...headAfter } = snapshotAfter;
+    const { files: _filesBefore, hosts: _hostsBefore, ...headBefore } = snapshotBefore;
+    assert.deepStrictEqual(headAfter, headBefore, 'host remove must keep every snapshot key other than files/hosts');
+
     // T4 item 3: a RemoveCtx sink is a line sink (callee omits '\n'); host.ts's
     // own stderr sink is raw (like init's), so the final collected chunk must
     // end with 'x\n' — not bare 'x'.
@@ -520,6 +598,52 @@ describe('Scenario 3 — remove preserves everything it does not own (Gherkin 3)
   });
 });
 
+// ── Scenario 3b — the plan selects by entryOwner, never by path (TPV) ───────
+
+describe('Scenario 3b — planHostRemoval selects by entryOwner, not by location (Gherkin 3, safety property)', () => {
+  test('legacy owner-less entries resolve through entryOwner; surgery targets and preserved entries are kept; a path never decides ownership', async () => {
+    const { registry } = makeR3();
+    const { planHostRemoval } = await loadLifecycle();
+    const mk = (p: string, extra: Partial<ManifestEntry> = {}): ManifestEntry => ({
+      path: p,
+      sha256: null,
+      tier: 'agent',
+      overwrite_policy: 'always',
+      preserve_on_uninstall: false,
+      ...extra,
+    });
+    const snapshot: ManifestFile = {
+      cleargate_version: '0.0.0-tpv',
+      generated_at: '2026-01-01T00:00:00.000Z',
+      hosts: ['claude', 'codex', 'copilot'],
+      files: [
+        mk('.claude/agents/legacy.md'), // no owner: the legacy rule makes it claude's
+        mk('.claude/settings.json', { tier: 'cli-config', overwrite_policy: 'merge-3way', owner: 'claude' }), // surgery target
+        mk('.claude/kept-by-tier.md', { tier: 'user-artifact', owner: 'claude' }),
+        mk('.claude/kept-by-flag.md', { preserve_on_uninstall: true, owner: 'claude' }),
+        mk('claude-owned-outside-roots.md', { owner: 'claude' }),
+        mk('.claude/core-owned-inside-root.md', { owner: 'core' }),
+        mk('.codex/fake.toml', { owner: 'codex' }),
+        mk('.agents/skills/demo/SKILL.md', { tier: 'skill', owner: 'core' }),
+      ],
+    };
+    const plan = planHostRemoval(snapshot, 'claude', registry);
+    assert.deepStrictEqual(
+      new Set(plan.deletes.map((e) => e.path)),
+      new Set(['.claude/agents/legacy.md', 'claude-owned-outside-roots.md']),
+    );
+    assert.deepStrictEqual(
+      new Set(plan.keeps.map((e) => e.path)),
+      new Set(['.claude/settings.json', '.claude/kept-by-tier.md', '.claude/kept-by-flag.md']),
+    );
+    assert.deepStrictEqual(
+      plan.nextFiles.map((e) => e.path),
+      ['.claude/core-owned-inside-root.md', '.codex/fake.toml', '.agents/skills/demo/SKILL.md'],
+    );
+    assert.deepStrictEqual([...plan.nextHosts], ['codex', 'copilot']);
+  });
+});
+
 // ── Scenario 4 — shared retention while a consumer remains (Gherkin 4) ──────
 
 describe('Scenario 4 — shared assets survive while another consumer remains (Gherkin 4)', () => {
@@ -528,7 +652,7 @@ describe('Scenario 4 — shared assets survive while another consumer remains (G
     const { registry } = makeR3();
     const record = await runInitScenario('fresh', {
       payloadDir,
-      extra: { hostRegistry: registry, hosts: ['all'] },
+      extra: { hostRegistry: registry, hosts: ['all'], readInstallManifest: undefined },
     });
     const skillPath = path.join(record.dir, '.agents', 'skills', 'demo', 'SKILL.md');
     assert.ok(fs.existsSync(skillPath), 'sanity: the shared skill file must exist after an all-hosts install');
@@ -554,6 +678,9 @@ describe('Scenario 4 — shared assets survive while another consumer remains (G
 
     await runRemove('codex');
     assert.ok(!fs.existsSync(skillPath), 'the shared skill must be deleted once no remaining host declares .agents');
+    assert.ok(!fs.existsSync(path.join(record.dir, '.agents')), 'the emptied .agents tree must be pruned bottom-up');
+    assert.ok(fs.existsSync(path.join(record.dir, '.codex', 'hooks.json')), 'a surgery target is never deleted wholesale');
+    assert.ok(!fs.existsSync(path.join(record.dir, '.codex', 'fake.toml')), 'codex-owned files are deleted');
     const snapshotAfter = readSnapshot(record.dir);
     assert.ok(
       !snapshotAfter.files.some((f) => f.path === '.agents/skills/demo/SKILL.md'),
@@ -570,7 +697,7 @@ describe('Scenario 5 — removing the last host is refused (Gherkin 5)', () => {
     const { registry } = makeR2();
     const record = await runInitScenario('fresh', {
       payloadDir,
-      extra: { hostRegistry: registry, hosts: ['claude'] },
+      extra: { hostRegistry: registry, hosts: ['claude'], readInstallManifest: undefined },
     });
     const before = listTree(record.dir, new Set());
 
@@ -607,7 +734,7 @@ describe('Scenario 6 — list reports the installed set and owned-file health (G
     const { registry } = makeR2();
     const record = await runInitScenario('fresh', {
       payloadDir,
-      extra: { hostRegistry: registry, hosts: ['all'] },
+      extra: { hostRegistry: registry, hosts: ['all'], readInstallManifest: undefined },
     });
     const snapshot = readSnapshot(record.dir);
     const counts = new Map<string, number>();
@@ -652,7 +779,7 @@ describe('Scenario 6 — list reports the installed set and owned-file health (G
     const { registry } = makeR2();
     const record = await runInitScenario('fresh', {
       payloadDir,
-      extra: { hostRegistry: registry, hosts: ['all'] },
+      extra: { hostRegistry: registry, hosts: ['all'], readInstallManifest: undefined },
     });
     fs.rmSync(path.join(record.dir, '.codex', 'fake.toml'));
 
@@ -687,7 +814,7 @@ describe('Scenario 7 — errors exit 2 and write nothing', () => {
     const { registry } = makeR2();
     const record = await runInitScenario('fresh', {
       payloadDir,
-      extra: { hostRegistry: registry, hosts: ['claude'] },
+      extra: { hostRegistry: registry, hosts: ['claude'], readInstallManifest: undefined },
     });
     const before = listTree(record.dir, new Set());
 
@@ -716,7 +843,7 @@ describe('Scenario 7 — errors exit 2 and write nothing', () => {
     const { registry } = makeR2();
     const record = await runInitScenario('fresh', {
       payloadDir,
-      extra: { hostRegistry: registry, hosts: ['claude'] },
+      extra: { hostRegistry: registry, hosts: ['claude'], readInstallManifest: undefined },
     });
     const before = listTree(record.dir, new Set());
 
@@ -739,6 +866,39 @@ describe('Scenario 7 — errors exit 2 and write nothing', () => {
     assert.deepStrictEqual(listTree(record.dir, new Set()), before, 'nothing must be written on a not-installed removal target');
   });
 
+  test('host add with a payload that has no MANIFEST.json: exit 2, nothing written', async () => {
+    const payloadDir = await getP2();
+    const { registry } = makeR2();
+    const record = await runInitScenario('fresh', {
+      payloadDir,
+      extra: { hostRegistry: registry, hosts: ['claude'], readInstallManifest: undefined },
+    });
+    const brokenPayload = mkTmp('cg-s41-host-nomanifest-');
+    fs.cpSync(payloadDir, brokenPayload, { recursive: true });
+    fs.rmSync(path.join(brokenPayload, 'MANIFEST.json'));
+    const before = listTree(record.dir, new Set());
+
+    const { hostAddHandler } = await loadHost();
+    const stderrChunks: string[] = [];
+    const code = await runCatchingExit(() =>
+      hostAddHandler('codex', {
+        cwd: record.dir,
+        hostRegistry: registry,
+        payloadDir: brokenPayload,
+        stdout: () => {},
+        stderr: (s: string) => {
+          stderrChunks.push(s);
+        },
+        exit: makeExitSeam(),
+      }),
+    );
+
+    assert.equal(code, 2, `stderr=${stderrChunks.join('')}`);
+    assert.ok(stderrChunks.join('').startsWith('[cleargate host] ERROR: '), stderrChunks.join(''));
+    assert.deepStrictEqual(listTree(record.dir, new Set()), before, 'nothing must be written when the payload is unusable');
+    fs.rmSync(brokenPayload, { recursive: true, force: true });
+  });
+
   test('any subcommand with no snapshot: exit 2, message names "cleargate init"', async () => {
     const dir = mkTmp('cg-s41-host-nosnap-');
     const { hostListHandler } = await loadHost();
@@ -766,7 +926,7 @@ describe('Scenario 8 — surgery targets are never deleted wholesale', () => {
     const { registry } = makeR2();
     const record = await runInitScenario('user-content', {
       payloadDir,
-      extra: { hostRegistry: registry, hosts: ['all'] },
+      extra: { hostRegistry: registry, hosts: ['all'], readInstallManifest: undefined },
     });
     const settingsPath = path.join(record.dir, '.claude', 'settings.json');
     const claudeMdPath = path.join(record.dir, 'CLAUDE.md');
@@ -799,6 +959,51 @@ describe('Scenario 8 — surgery targets are never deleted wholesale', () => {
   });
 });
 
+// ── Scenario 12 — host add prints under its own prefix (T3 logPrefix) ──────
+
+describe('Scenario 12 — host add threads InstallCtx.logPrefix into install() (T3)', () => {
+  test('host add claude onto a codex-only install prefixes every stdout line and the install() WARNING with [cleargate host]', async () => {
+    const payloadDir = await getP2();
+    const { registry } = makeR2();
+    const record = await runInitScenario('fresh', {
+      payloadDir,
+      extra: { hostRegistry: registry, hosts: ['codex'], readInstallManifest: undefined },
+    });
+    fs.mkdirSync(path.join(record.dir, '.claude'), { recursive: true });
+    fs.writeFileSync(path.join(record.dir, '.claude', 'settings.json'), '{not json');
+
+    const { hostAddHandler } = await loadHost();
+    const stdoutChunks: string[] = [];
+    const stderrChunks: string[] = [];
+    await hostAddHandler('claude', {
+      cwd: record.dir,
+      hostRegistry: registry,
+      payloadDir,
+      stdout: (s: string) => {
+        stdoutChunks.push(s);
+      },
+      stderr: (s: string) => {
+        stderrChunks.push(s);
+      },
+      exit: makeExitSeam(),
+    });
+
+    const stdoutLines = stdoutChunks.join('').split('\n').filter((l) => l.length > 0);
+    assert.ok(stdoutLines.length > 0, 'host add must report what it did');
+    for (const line of stdoutLines) {
+      assert.ok(line.startsWith('[cleargate host] '), `stdout line without the host prefix: ${JSON.stringify(line)}`);
+    }
+    assert.ok(
+      stderrChunks.join('').includes('[cleargate host] WARNING: could not parse'),
+      `stderr=${JSON.stringify(stderrChunks.join(''))}`,
+    );
+    assert.ok(
+      !(stdoutChunks.join('') + stderrChunks.join('')).includes('[cleargate init]'),
+      'host add must never print the init prefix',
+    );
+  });
+});
+
 // ── Scenario 11 — E2E: install all, remove one, list stays healthy ─────────
 
 describe('Scenario 11 — E2E: after removing one host, list reports every remaining row healthy', () => {
@@ -807,7 +1012,7 @@ describe('Scenario 11 — E2E: after removing one host, list reports every remai
     const { registry } = makeR3();
     const record = await runInitScenario('fresh', {
       payloadDir,
-      extra: { hostRegistry: registry, hosts: ['all'] },
+      extra: { hostRegistry: registry, hosts: ['all'], readInstallManifest: undefined },
     });
 
     const { hostRemoveHandler, hostListHandler } = await loadHost();
```

## Expected counts after re-seal (the orchestrator's acceptance check)

**Re-seal commit** (tests only, on `764f063` src):

| File | Tests | Pass | Fail | Red reason |
|---|---|---|---|---|
| `host-lifecycle.red` | 17 | 0 | 17 | 15 × `ERR_MODULE_NOT_FOUND` on `src/commands/host.ts`; 2 on `src/hosts/lifecycle.ts` (3 and 3b) |
| `host-cli.red.integration` | 3 | 0 | 3 | `unknown command 'host'` |

- `BASELINE_FAIL` goes from 16 to 20.
- The six sealed contract files stay green at 19/11/10/4/18/13.
- Parity stays 5/5 and 15/15.

**After a D1–D12 Dev commit:**
- `host-lifecycle.red` 17/17 and `host-cli.red.integration` 3/3.
- The sealed six are unchanged, and parity is 5/5 and 15/15.
- `npm run typecheck` exits 0.
- `command grep -c "\[cleargate init\] " src/hosts/claude.ts` returns `1`.
- The 50-file witness sweep shows 0 failing names.
- A full `npm test` gains +17 over -06's total. The integration file is excluded by the default glob, so run it solo.

**DevOps smoke 1 in OUTER** prints `installed: claude` with rows core and claude, and exits 1. The legacy snapshot lists three retired ratchet paths, so do not expect 0.

## Plan amendments

Appended `### Amendments from TPV (STORY-058-05, 2026-09-26)` to `plans/M3.md`, M3-A24..M3-A30:

| # | Rule |
|---|---|
| M3-A24 | Real-manifest fixture rule; binding for -07. |
| M3-A25 | A payload error in `host add` exits 2 and writes nothing. |
| M3-A26 | Preserved entries are never deleted, in either class. |
| M3-A27 | Exact pruning rule. |
| M3-A28 | Uniform `[cleargate host] ` prefix and raw default sinks. |
| M3-A29 | `executeHostRemoval` re-reads the raw snapshot. |
| M3-A30 | Re-seal and expected counts. |

M3 T12 stays open until -05 merges.

## Script Incidents

None. No `.cleargate/scripts/*` script was invoked. The executions were `npm run test:file`, `typecheck`, `prebuild` and `build` inside the scratch clone, `git` and `shasum` probes, and one read-only `node <scratch dist>/cli.js host list` in OUTER. The version check does not apply: no dependency is added or pinned.

```yaml
flashcards_flagged:
  - "2026-09-26 · #test-harness #init #tpv · init-fixture's stub readInstallManifest records files: []; lifecycle reds must pass readInstallManifest: undefined."
  - "2026-09-26 · #test-harness #tpv #qa · QA-Red reds never ran on a conformant build: 4/13 -05 reds were unsatisfiable, 2 vacuous. TPV must simulate first."
  - "2026-09-26 · #test-harness #cli #tpv · A spawned-CLI test that drops empty lines can't see a line-sink default sink; assert stdout has no '\\n\\n'."
  - "2026-09-26 · #test-harness #host #manifest · A fixture where owner == path can't test delete-by-owner; add a pure planHostRemoval case with owner != path."
```

STATUS=done
