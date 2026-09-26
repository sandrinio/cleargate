# STORY-058-08 — TPV (Test Pattern Validation) Report
role: architect

TPV: REJECTED — a plan-conformant -08 turns all 36 QA-Red tests green and leaves every sealed contract and parity file unchanged. However, U9 contradicts the plan's host-resolution formula (a plan gap, resolved by M4-A5, not a test bug), and 22 plan-relevant mutants survive. The survivors include:
- §3.3's missing `--cwd` → exit 2
- the read-only guard on the real doctor path
- the `--host` narrowing that -09 relies on
- an installed host this cleargate does not register passing silently
- `.cleargate/.gitignore` (the BUG-040 packaging check) going unchecked
- the matcher in settings triples
- the deep `.mcp.json` compare
- three contract points of `findCleargatePackageRoot`

Re-seal R1–R17 below closes all 22. It is one unified diff over two test files, and `git apply --check` is clean on `81c05e9`. If the counts in "Expected counts after the re-seal" reproduce, no second TPV round is needed.

## Subject and setup

- **Cli.** `story/STORY-058-08` @ `81c05e9` (one commit on main `b244551`; `git diff b244551 81c05e9 --stat` covers the three test files only).
- **Scratch.** `/private/tmp/cg-s41-tpv-058-08/`:
  - `cleargate-cli/` is `git clone --no-hardlinks --branch story/STORY-058-08`, with `node_modules` symlinked to the main checkout's.
  - The parent meta-root is `git archive HEAD .cleargate cleargate-planning CLAUDE.md` of outer `d41dd7e6`.
  - A minimal plan-conformant `.cleargate/knowledge/clean-room-verification.md` was written into the scratch meta-root only.
  - `npm run prebuild` and later `npm run build` ran inside the clone only. `prebuild` writes only under `<clone>/templates`.
- **Environment for every run.** `CLEARGATE_META_ROOT=/private/tmp/cg-s41-tpv-058-08` and `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline` (compare mode).
- **Cleanup.** The clone was deleted with `rm -rf -- /private/tmp/cg-s41-tpv-058-08`.
- **Writes outside the scratch dir.** None. No main checkout, outer worktree or live `.claude/` was written. The one scratch-dist smoke ran as a single `(cd /private/tmp/cg-s41-tpv-058-08/room && …)` call.
- **Red confirmed at `81c05e9`.** Unit 0/22, integration 0/5, doc 0/9, i.e. 36 red. That matches the QA-Red report.

## Simulation: a minimal plan-conformant -08 in the scratch clone

| File | `git diff 81c05e9 --numstat` | What |
|---|---|---|
| `src/lib/cli-package-root.ts` | new, 26 lines | `findCleargatePackageRoot(startDir)`:<br>• walks up from `path.resolve(startDir)` inclusive<br>• returns the first dir whose `package.json` has `name === 'cleargate'`<br>• walks past an unparseable `package.json`<br>• `undefined` at the filesystem root |
| `src/commands/init.ts` | 3 / 19 | One import, plus the M3 V3 body of `readRunningCliVersion` verbatim (`findCleargatePackageRoot` + `readPackageVersion` ?? `'0.0.0'`) |
| `src/commands/verify-install.ts` | new, 392 lines | The pinned exports:<br>• the 12 checks in catalogue order, the skip rule, fail-closed `<h>.no-verifier`<br>• the claude verifier with 6 + 1 live ids<br>• text and `--json` output; exit 0/1/2 through a seam; read-only<br>• the default `runDoctor` = in-process `doctorHandler({}, …)` with captured sinks and a throwing seam |
| `src/cli.ts` | 11 / 0 | The import after `:34`; the plan's block immediately before `program` `:636` / `.command('upgrade')` `:637`; not in `GATED_COMMANDS` |
| `CHANGELOG.md` | 2 / 0 | FU-10: bullet appended to the existing `### Added` (still exactly one `### Added` under `## Unreleased`). FU-11: a BUG-085 sentinel bullet appended after -07's `### Fixed` bullets |

**Checks.**
- `npm run typecheck` exits 0.
- `command grep -c "__CLEARGATE_VERSION__" src/commands/verify-install.ts` = 0.
- `src/**` imports no `scripts/**`.

**Measured on the conformant build.**
- The fixture snapshot has 74 entries, owners `{claude, core}`, `hosts: ["claude"]`, `cleargate_version` 0.26.1 and `pin_version` `0.0.0-m2`.
- `selectEntriesForHosts(files, ['claude'])` = 74.
- There are 9 `.claude/hooks/*.sh` entries. 7 are referenced by settings; `pre-commit.sh` and `pre-commit-surface-gate.sh` are not.
- `.cleargate/knowledge/cleargate-protocol.md` has tier `protocol`.
- `CLAUDE.md` and `.mcp.json` are **not** snapshot entries; `.claude/settings.json` is. So check 5 needs the surgery targets (U3b).
- The real in-process doctor exits 0 on the fixture. `checkCanonicalDrift` skips because the fixture has no `cleargate-cli`.

**Bundled smoke** (scratch `dist`, local-dist install, scratch room; all four results are recorded in **Regression witnesses** below):
- `init --yes --pin 0.0.0-tpv` → exit 0
- `verify-install` → `Result: PASS`, exit 0, with the live list printed
- after deleting `cleargate-protocol.md` → `FAIL  payload-files` / `missing: .cleargate/knowledge/cleargate-protocol.md (tier protocol)` / `Result: FAIL (1 of 12 checks failed)`
- `--cwd <missing>` → exit 2

**The one plan gap found by simulating.**
- The plan sets `verified = --host h ? [h] : installed.filter(registered)`, with `installed = snapshot ? … : []`.
- With the snapshot absent, that yields **no** host checks.
- Yet the plan's own skip rule ("host checks skip when snapshot fails") and U9 need `claude.*` present as `skip`.
- Measured: the plan-literal formula (mutant X1) fails U9.
- The simulation falls back to `registered ∩ keys(verifiers)` when the snapshot is null, and the verifier returns its checks as `skip`. That rule is now binding as M4-A5. U9 is correct as sealed.

## Rulings on the QA-Red ambiguities

1. **#1, the sealed digit list.** No action, per the orchestrator. Measured today: `lifecycle-per-host` 3/3 **and** `uninstall-reinit` 4/4, both green in both states. I added both to the witness set.
2. **#2 (I rule): does `findCleargatePackageRoot` need a direct test? Yes.**
   - Measured without one:
     - F1 (stops at an unparseable `package.json`), F2 (ignores the name) and F4 (starts at the parent) survive the three red files **and** `init-from-source.node.test.ts`.
     - Only F3 and F5 (returns the wrong shape, or never finds a root) die, via I1, I3 and init-from-source scenario 19.
   - F1 is the exact behaviour M3 V3 made binding ("keeps walking past an unparseable package.json").
   - R16 adds U17a–e to the existing unit file, so there is no new file and no §3.1 change:
     - a) the tsx walk (`<CLI_ROOT>/src/commands` → `CLI_ROOT`)
     - b) the bundled walk: the package dir itself and its `dist/`
     - c) a nearer foreign-named `package.json` is walked past
     - d) an unparseable `package.json` is walked past
     - e) no cleargate root → `undefined`
   - U17 compares realpaths, so an implementation that realpaths is allowed.
3. **#3, substring latitude. Confirmed.**
   - Where the catalogue pins a template, the tests assert it literally, and the Developer emits it verbatim (H7):
     - `missing: <path> (tier <t>)`, `<path> (owner <x>)`, `<h> not installed`
     - `this cleargate cannot verify host <h>`
     - the version-match sentence
     - `UnknownHostError`'s own message
   - Elsewhere, `.includes()` on the named substrings (a path, an event, a matcher, a host) is the correct reading. The re-seal follows the same rule.
4. **#4.** No action.

## Red → green (after the re-seal)

| File | At `81c05e9` + re-seal | Conformant | Solo run 2 |
|---|---|---|---|
| `test/commands/verify-install.red.node.test.ts` | 0/38. Every failure is the dynamic `import()` `ERR_MODULE_NOT_FOUND` of `verify-install.js` or `cli-package-root.js` | 38/38 | 38/38 |
| `test/commands/verify-install-cli.red.integration.node.test.ts` (unchanged) | 0/5 (unknown command) | 5/5 | 5/5 |
| `test/docs/clean-room-verification-doc.red.node.test.ts` (one line changed) | 0/9 with `CLEARGATE_META_ROOT=.worktrees/STORY-058-08` (doc absent; read-only) | 9/9 against the plan-conformant doc | 9/9 |

`BASELINE_FAIL` after the re-seal is 52. Before it was 36 (22 + 5 + 9); now it is 38 + 5 + 9.

**The 16 unit tests the re-seal adds**, 22 → 38:
- U1b, U4b, U5c, U6c, U7b, U9b
- U11c, U11d, U12b
- U14b, U16b
- U17a–e

**Unit tests the re-seal extends, count unchanged:** U10, U11b and U13.

## Mutants

58 mutants in all, each measured on the conformant build.
- **"Sealed"** means the 36 tests at `81c05e9`.
- **"Re-sealed"** means the 52 tests after R1–R17.
- **The Killer column** names the test that fails. Integration file tests are I1–I5; doc file tests are D1–D2.

### The dispatch list

| # | Mutant | Sealed | Re-sealed (killer) |
|---|---|---|---|
| 1 | Check order changed (doctor before gitignore) | U1 | U1 |
| 2 | A check id renamed (`gitignore-generated` → `gitignore`) | U1, U9, U16 | U1, U9, U16, U10, U16b |
| 3a | Skip without its dependency failing: gitignore and doctor skip when the snapshot fails | U9 | U9 |
| 3b | …checks 9/10/12 also skip on version mismatch | **survives** | U10 (R8) |
| 3c | …payload-files skips on version mismatch | **survives** | U10 (R8) |
| 3d | …hooks-executable always skips | U1, U4, I1–I3 | same, plus U1b |
| 4 | `version-match` not gating 8/11 | U10 | U10 |
| 5 | `payload-files` on `snapshot.files` unfiltered (no `selectEntriesForHosts`) | **survives** | U13 (R13) |
| 6 | `pin-substituted` re-types the literal | survives | survives — runtime-equivalent; enforced by the H8 grep |
| 7 | `pin-substituted` misses surgery targets (`.mcp.json`) | U3b | U3b |
| 8 | `gitignore` checks only the root file | **survives** | U16b (R15) |
| 9 | `doctor` not propagating | U15 | U15 |
| 10 | A non-throwing exit seam in the default `runDoctor` | survives | survives — equivalent today, because every hook-health exit is terminal (`doctor.ts:1146-1156`); H11 binds the throwing seam |
| 11 | `claude.settings-hooks` ignores the matcher | **survives** | U7b (R6) |
| 12a | `hooks-executable` checks only the snapshot entries | **survives** | U4b (R3) |
| 12b | `hooks-executable` checks only settings-referenced scripts | **survives** | U4b (R3) |
| 13 | `no-foreign-hooks` flags `echo hi` | U8c | U8c |
| 14 | Instruction block counted unanchored (`includes` per line) | U1, U4, I1, I3 — the block prose repeats both markers | same |
| 14b | Instruction block counted by `raw.split(marker)` | U1, U4, I1, I3 | same |
| 15 | `mcp-registration` compared shallowly (`command` only) | **survives** | U5c (R4) |
| 16 | `manifest-hosts` misses the owner leak | U13 | U13 |
| 17a | An installed, registered host with no verifier passes (no `no-verifier`) | U12 | U12 |
| 17b | An installed host this cleargate does **not register** passes (manifest-hosts rule (a) dropped) | **survives** | U12b (R12) |
| 18a | `runVerifyInstall` writes a file | U14 | U14, U14b |
| 18b | The default `runDoctor` uses `--check-scaffold` (writes `.drift-state.json`) | **survives** — U14 stubs `runDoctor`, so its `.drift-state.json` assertion was vacuous | U14b (R14) |
| 18c | The handler writes a file | **survives** | U14b (R14) |
| 19 | `--host nope` prints a report | U11b | U11b, U11c |
| 20 | A missing `--cwd` does not exit 2 | **survives** | U11c (R10) |
| 21 | `verify-install` gated as a member command | I1, I2, I3. The fixture is pre-member because it has no per-repo `.join.json` (`membership.ts` BUG-031). I4 passes because the gate also exits 2 | same |
| 22 | The doc misses a pinned H2 | D1 (headings) | D1 |
| 23 | `npm publish` allowed in the doc | D2 | D2 |

### Extra mutants

| # | Mutant | Sealed | Re-sealed (killer) |
|---|---|---|---|
| X1 | The plan-literal `verified` (no host checks when the snapshot fails) | U9 | U9 — see M4-A5 |
| X2 | `claude.live.agents-md-exposure` never emitted | **survives** | U1b (R2) |
| X3 | Instruction-block payload comparison dropped | **survives** | U6c (R5) |
| X4 | `mcp-registration` uses `version`, not `snapshot.pin_version` | U1, U4, I1, I3 | same |
| X5 | The handler returns without `exit(0)` on ok | U1 | U1, U14b |
| X6 | The default `runDoctor` lets doctor print to `process.stdout` | I3 (JSON parse) | I3 |
| X7 | The settings-hooks script-existence rule dropped | survives | survives — equivalent, because every payload hook script is a snapshot entry (payload-files); H12 |
| X8 | The no-foreign path rule dropped | U8b | U8b |
| X9 | The no-foreign `--host` rule dropped | U8a | U8a |
| X10 | `payloadDir` from `dirname(import.meta.url)/..` (the `resolveDefaultPayloadDir` shape) | I1, I3 | I1, I3 |
| X11 | The `--host=x` form not flagged | survives | survives — ClearGate never writes that form; not binding |
| X12 | An unparseable snapshot reported as "absent" | **survives** | U9b (R7) |
| X13 | `ok` ignores skips | survives | survives — equivalent under the H6 skip invariant |
| X14 | `--host h` widened to all installed hosts | **survives** | U11d (R11) — the `--host claude` contract -09 depends on |
| X15 | manifest-hosts rule (b) dropped | U11a | U11a |
| X16 | The settings-hooks detail omits the matcher | U7 | U7, U7b |
| X17 | Unknown `--host` resolved after the checks run | **survives** | U11b spy (R9) |
| X17b | `--cwd` checked after doctor | **survives** (as #20) | U11c |
| M24 | `{ hidden: true }` on the command | survives | survives — equivalent: `cli.ts` `configureHelp.visibleCommands` ignores `hidden` (`stamp` is hidden and still listed); M4-A11 |
| M25 | The doc's §4 body has no command (heading only) | **survives** — `section()` includes the heading line, which names the driver | D1 §4 (R17) |
| M26 | The doc says "Recreated per run." (capital R) | D1 Location | D1 Location |
| M27 | The doc forbids publishing with "Never run `npm publish`" | D2 (case-sensitive `\bnever\b`) | D2 |
| F1 | `findCleargatePackageRoot` stops at an unparseable `package.json` | **survives** (all three red files plus `init-from-source`) | U17d (R16) |
| F2 | …ignores the name | **survives** | U17c |
| F3 | …returns the `package.json` path | I1, I3, init-from-source scenario 19 | plus U17a–d |
| F4 | …starts at the parent of `startDir` | **survives** | U17b |
| F5 | …always `undefined` | I1, I3, init-from-source scenario 19 | plus U17a–d |

### Tally

- At the sealed commit, 28 of 58 survive. 22 of those are plan-relevant, and R1–R17 kill all 22.
- After the re-seal, 6 survive: M6, M10, X7, X11, X13 and M24. Each is runtime-equivalent or out of contract.
- M6 and M10 are held by binding constraints H8 and H11.

## Regression witnesses

57 files, each run SOLO in two states:
- **conformant:** the simulated -08, plus a scratch `dist` rebuilt from it
- **sealed:** the -08 src and CHANGELOG stashed, the new modules moved aside, and `dist` rebuilt from `81c05e9`

Failing-NAME diff between the two states: **0 files.** Totals: sealed 686/687, conformant 686/687.

**The sealed -03..-07 and BUG-085 set** (exact counts, identical in both states):

| File | Count |
|---|---|
| `host-adapter-contract` | 19/19 |
| `host-selection` | 11/11 |
| `host-lifecycle` | 17/17 |
| `manifest-query` | 6/6 |
| `manifest-host-ownership` | 18/18 |
| `init-host-selection` | 10/10 |
| `init-host-snapshot` | 13/13 |
| `doctor-per-host` | 10/10 |
| `upgrade-per-host` | 6/6 |
| `uninstall-per-host` | 16/16 |
| `uninstall-reinit` | 4/4 |
| `init-host-cli` | 4/4 |
| `host-cli` | 3/3 |
| `lifecycle-per-host` | 3/3 |
| `drift-check-scaffold` | 24/24 |
| `pending-task-sentinel-cards` | 13/13 |
| `doctor-drift-guard` | 13/13 |

**Parity** (compare mode): `claude-adapter-init-parity` **5/5**, `init-host-parity` **15/15**.

**Witnesses:**

| File | Count |
|---|---|
| `cli.node` | 23/23 |
| `init.node` | 29/29 |
| `init-from-source.node` | 11/11 |
| `init-from-source-dist.integration` | 2/2 — the bundled `readRunningCliVersion` via the scratch `dist` |
| `init-gitignore-expansion` | 5/5 |
| `init-no-dep0190` | 2/2 |
| `init-participant` | 3/3 |
| `init-restart-banner` | 3/3 |
| `init-root-gitignore` | 9/9 |
| `doctor.node` | 39/39 |
| `doctor-membership-banner` | 4/4 |
| `doctor-notifier` | 6/6 |
| `doctor-pricing` | 5/5 |
| `doctor-retired-field.red` | 3/3 |
| `doctor-session-start` | 20/20 |
| `upgrade-state-parity.red` | 2/2 |

**Rule 16:** all 22 files that honour `CLEARGATE_META_ROOT` ran solo against the scratch meta-root, which holds the conformant doc.
- 21 are green in both states.
- `test/scripts/scaffold-relocation.red.node.test.ts` is 14/15 in **both** states: "expected >= 9 tracked 100755 files, found 0". The scratch meta-root is a `git archive` extract, not a git repository. This is a harness artefact, not a regression; on the real outer worktree the file reads git.
- The live-only doc was never flagged. `checkCanonicalDrift(<scratch meta-root>)` listed 0 `knowledge` entries; the 24 drifted entries are `.claude/**` missing-in-live, because the extract has no `.claude/`.

**Scratch-dist smokes:**

| Command | Result |
|---|---|
| `verify-install --help` | exit 0; lists `--host`, `--json`, `--cwd` |
| `init --yes` + `verify-install` | exit 0 |
| after deleting `cleargate-protocol.md` | exit 1, naming it |
| `--cwd` pointing at a missing directory | exit 2 |

## Baseline integrity

`/private/tmp/cg-s41-m2-init-baseline`, 425 files, hashed with absolute paths (`find -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256`):
- before: `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2`
- after: `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` (identical, 425 files)

## Expected counts after the re-seal (the orchestrator's acceptance check)

| Check | Expected |
|---|---|
| Patch | SHA-256 `30e6ff852faac0d252cc7adc3ebf25cd7f0db1142fae8d352a85de9d127219bf`, 484 lines. `git apply --check` is clean on `81c05e9` |
| `git diff 81c05e9 --numstat` | `362 1 test/commands/verify-install.red.node.test.ts` and `2 1 test/docs/clean-room-verification-doc.red.node.test.ts`. The integration file is unchanged |
| Unit, at the re-seal commit | `tests 38 / pass 0 / fail 38`. Every failure is `ERR_MODULE_NOT_FOUND` from the per-test dynamic `import()` |
| Integration | `tests 5 / pass 0 / fail 5` (unchanged) |
| Doc (with `CLEARGATE_META_ROOT` = main checkout or `.worktrees/STORY-058-08`) | `tests 9 / pass 0 / fail 9` |
| Sealed and parity files | Unchanged, at the counts in *Regression witnesses* |
| `npm run typecheck` | exit 0 (test files are outside `tsconfig` `include`) |
| After the Dev, on a conformant build | 38/38, 5/5, 9/9 |

## Re-seal diff (R1–R17), for QA-Red to apply verbatim on `story/STORY-058-08`

| R | Hunk | Kills |
|---|---|---|
| R1 | helpers `loadCliPackageRoot`, `runHandler` | (support) |
| R2 | U1b AGENTS.md exposure | X2 |
| R3 | U4b | 12a, 12b |
| R4 | U5c | 15 |
| R5 | U6c | X3 |
| R6 | U7b | 11 |
| R7 | U9b | X12 |
| R8 | U10 extension | 3b, 3c |
| R9 | U11b doctor spy | X17 |
| R10 | U11c | 20, X17b |
| R11 | U11d | X14 |
| R12 | U12b | 17b |
| R13 | U13 extension | 5 |
| R14 | U14b | 18b, 18c |
| R15 | U16b | 8 |
| R16 | U17a–e | F1, F2, F4 |
| R17 | doc §4 body-only | M25 |

Fixture registries use only fake names (`fake`, `ghost`). No production registry membership is pinned.

```diff
diff --git a/test/commands/verify-install.red.node.test.ts b/test/commands/verify-install.red.node.test.ts
index cda9fdb..d33c2b6 100644
--- a/test/commands/verify-install.red.node.test.ts
+++ b/test/commands/verify-install.red.node.test.ts
@@ -116,6 +116,39 @@ async function loadVerifyInstall(): Promise<VerifyInstallModule> {
   return (await import('../../src/commands/verify-install.js')) as unknown as VerifyInstallModule;
 }
 
+interface CliPackageRootModule {
+  findCleargatePackageRoot(startDir: string): string | undefined;
+}
+
+async function loadCliPackageRoot(): Promise<CliPackageRootModule> {
+  return (await import('../../src/lib/cli-package-root.js')) as unknown as CliPackageRootModule;
+}
+
+/** Throwing exit seam that records the code (flashcard #test-harness #node-exit). */
+async function runHandler(
+  handler: VerifyInstallModule['verifyInstallHandler'],
+  opts: VerifyInstallCliOptions,
+  cli: Omit<VerifyInstallOptions, 'cwd' | 'host'>,
+): Promise<{ code: number | undefined; stdout: string[]; stderr: string[] }> {
+  let code: number | undefined;
+  const stdout: string[] = [];
+  const stderr: string[] = [];
+  try {
+    await handler(opts, {
+      ...cli,
+      stdout: (s) => stdout.push(s),
+      stderr: (s) => stderr.push(s),
+      exit: (c: number): never => {
+        code = c;
+        throw new ExitSignal(c);
+      },
+    });
+  } catch (e) {
+    if (!(e instanceof ExitSignal)) throw e;
+  }
+  return { code, stdout, stderr };
+}
+
 const stubDoctor0 = async (): Promise<number> => 0;
 const EXPECTED_CHECK_IDS = [
   'snapshot',
@@ -291,6 +324,30 @@ describe('U1: correct install', () => {
   });
 });
 
+// ── U1b — AGENTS.md exposure live check (M4 live table, F4) ────────────────
+
+describe('U1b: AGENTS.md exposure live check', () => {
+  test('claude.live.agents-md-exposure is listed only when <cwd>/AGENTS.md exists; no machine check fails on it', async () => {
+    const dir = await freshInstall();
+    const { runVerifyInstall } = await loadVerifyInstall();
+    const opts = { cwd: dir, payloadDir: PAYLOAD_DIR, version: VERSION, registry: defaultHostRegistry, runDoctor: stubDoctor0 };
+
+    const without = await runVerifyInstall(opts);
+    assert.ok(
+      !without.live.some((l) => l.id === 'claude.live.agents-md-exposure'),
+      `live=${JSON.stringify(without.live.map((l) => l.id))}`,
+    );
+
+    fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Agents\n');
+    const withFile = await runVerifyInstall(opts);
+    assert.ok(
+      withFile.live.some((l) => l.id === 'claude.live.agents-md-exposure' && l.host === 'claude' && l.description.length > 0),
+      `live=${JSON.stringify(withFile.live.map((l) => l.id))}`,
+    );
+    assert.equal(withFile.ok, true, JSON.stringify(withFile.checks.filter((c) => c.status !== 'pass')));
+  });
+});
+
 // ── U2 — missing payload file (Gherkin 2) ───────────────────────────────────
 
 describe('U2: missing payload file', () => {
@@ -402,6 +459,37 @@ describe('U4: lost hook executable bit', () => {
     const otherFailing = report.checks.filter((c) => c.id !== 'claude.hooks-executable' && c.status !== 'pass');
     assert.deepStrictEqual(otherFailing, [], `only claude.hooks-executable must fail: ${JSON.stringify(otherFailing)}`);
   });
+
+  test('b) an unreferenced snapshot hook and a settings-referenced non-snapshot script are both checked', async () => {
+    const dir = await freshInstall();
+    const unreferenced = '.claude/hooks/pre-commit-surface-gate.sh';
+    assert.ok(readSnapshot(dir).files.some((e) => e.path === unreferenced), 'fixture sanity: a snapshot entry');
+    assert.ok(!JSON.stringify(readSettings(dir)).includes('pre-commit-surface-gate.sh'), 'fixture sanity: not referenced by settings.json');
+    fs.chmodSync(path.join(dir, unreferenced), 0o644);
+
+    const userHook = '.claude/hooks/user-hook.sh';
+    fs.writeFileSync(path.join(dir, userHook), '#!/bin/sh\nexit 0\n');
+    fs.chmodSync(path.join(dir, userHook), 0o644);
+    const settings = readSettings(dir) as { hooks: { PreToolUse: unknown[] } };
+    settings.hooks.PreToolUse.push({
+      matcher: 'Bash',
+      hooks: [{ type: 'command', command: '${CLAUDE_PROJECT_DIR}/.claude/hooks/user-hook.sh' }],
+    });
+    writeSettings(dir, settings);
+
+    const { runVerifyInstall } = await loadVerifyInstall();
+    const report = await runVerifyInstall({
+      cwd: dir,
+      payloadDir: PAYLOAD_DIR,
+      version: VERSION,
+      registry: defaultHostRegistry,
+      runDoctor: stubDoctor0,
+    });
+    const check = report.checks.find((c) => c.id === 'claude.hooks-executable');
+    assert.equal(check!.status, 'fail');
+    assert.ok(check!.details.some((d) => d.includes(unreferenced)), `details=${JSON.stringify(check!.details)}`);
+    assert.ok(check!.details.some((d) => d.includes(userHook)), `details=${JSON.stringify(check!.details)}`);
+  });
 });
 
 // ── U5 — MCP registration ───────────────────────────────────────────────────
@@ -445,6 +533,26 @@ describe('U5: MCP registration', () => {
       `details=${JSON.stringify(check!.details)}`,
     );
   });
+
+  test('c) a pin in mcpServers.cleargate.args that differs from the snapshot pin fails (deep compare)', async () => {
+    const dir = await freshInstall();
+    const pin = readSnapshot(dir).pin_version!;
+    const mcpPath = path.join(dir, '.mcp.json');
+    const raw = fs.readFileSync(mcpPath, 'utf8');
+    assert.ok(raw.includes(`cleargate@${pin}`), 'fixture sanity: .mcp.json carries the snapshot pin');
+    fs.writeFileSync(mcpPath, raw.replace(`cleargate@${pin}`, 'cleargate@0.0.1'));
+
+    const { runVerifyInstall } = await loadVerifyInstall();
+    const report = await runVerifyInstall({
+      cwd: dir,
+      payloadDir: PAYLOAD_DIR,
+      version: VERSION,
+      registry: defaultHostRegistry,
+      runDoctor: stubDoctor0,
+    });
+    const check = report.checks.find((c) => c.id === 'claude.mcp-registration');
+    assert.equal(check!.status, 'fail', `details=${JSON.stringify(check!.details)}`);
+  });
 });
 
 // ── U6 — instruction block ──────────────────────────────────────────────────
@@ -491,6 +599,27 @@ describe('U6: instruction block', () => {
     const check = report.checks.find((c) => c.id === 'claude.instruction-block');
     assert.equal(check!.status, 'fail');
   });
+
+  test('c) an edited line inside the block fails claude.instruction-block (exact block comparison)', async () => {
+    const dir = await freshInstall();
+    const mdPath = path.join(dir, 'CLAUDE.md');
+    const mdLines = fs.readFileSync(mdPath, 'utf8').split('\n');
+    const startIdx = mdLines.indexOf(CLEARGATE_START);
+    assert.ok(startIdx >= 0 && mdLines[startIdx + 1] !== CLEARGATE_END, 'fixture sanity: a non-empty block');
+    mdLines[startIdx + 1] = `${mdLines[startIdx + 1]} (edited)`;
+    fs.writeFileSync(mdPath, mdLines.join('\n'));
+
+    const { runVerifyInstall } = await loadVerifyInstall();
+    const report = await runVerifyInstall({
+      cwd: dir,
+      payloadDir: PAYLOAD_DIR,
+      version: VERSION,
+      registry: defaultHostRegistry,
+      runDoctor: stubDoctor0,
+    });
+    const check = report.checks.find((c) => c.id === 'claude.instruction-block');
+    assert.equal(check!.status, 'fail', `details=${JSON.stringify(check!.details)}`);
+  });
 });
 
 function escapeRe(s: string): string {
@@ -523,6 +652,34 @@ describe('U7: settings triple removed', () => {
       `details=${JSON.stringify(check!.details)}`,
     );
   });
+
+  test('b) a triple wired under another matcher fails claude.settings-hooks naming the expected matcher', async () => {
+    const dir = await freshInstall();
+    const settings = readSettings(dir) as {
+      hooks: { PreToolUse: Array<{ matcher?: string; hooks: Array<{ command: string }> }> };
+    };
+    const group = settings.hooks.PreToolUse.find(
+      (g) => g.matcher === 'Edit|Write' && g.hooks.some((h) => h.command.includes('pre-edit-gate.sh')),
+    );
+    assert.ok(group, 'fixture sanity: the Edit|Write pre-edit-gate.sh group exists');
+    group!.matcher = 'Write';
+    writeSettings(dir, settings);
+
+    const { runVerifyInstall } = await loadVerifyInstall();
+    const report = await runVerifyInstall({
+      cwd: dir,
+      payloadDir: PAYLOAD_DIR,
+      version: VERSION,
+      registry: defaultHostRegistry,
+      runDoctor: stubDoctor0,
+    });
+    const check = report.checks.find((c) => c.id === 'claude.settings-hooks');
+    assert.equal(check!.status, 'fail', `details=${JSON.stringify(check!.details)}`);
+    assert.ok(
+      check!.details.some((d) => d.includes('PreToolUse') && d.includes('Edit|Write') && d.includes('pre-edit-gate.sh')),
+      `details=${JSON.stringify(check!.details)}`,
+    );
+  });
 });
 
 // ── U8 — foreign hooks ───────────────────────────────────────────────────────
@@ -632,6 +789,29 @@ describe('U9: snapshot absent', () => {
   });
 });
 
+// ── U9b — snapshot unparseable ──────────────────────────────────────────────
+
+describe('U9b: snapshot unparseable', () => {
+  test('an unparseable snapshot fails with an "unparseable" detail, never "absent"', async () => {
+    const dir = await freshInstall();
+    fs.writeFileSync(snapshotPath(dir), '{ not json');
+
+    const { runVerifyInstall } = await loadVerifyInstall();
+    const report = await runVerifyInstall({
+      cwd: dir,
+      payloadDir: PAYLOAD_DIR,
+      version: VERSION,
+      registry: defaultHostRegistry,
+      runDoctor: stubDoctor0,
+    });
+    const check = report.checks.find((c) => c.id === 'snapshot');
+    assert.equal(check!.status, 'fail');
+    assert.ok(check!.details.some((d) => d.includes('unparseable')), `details=${JSON.stringify(check!.details)}`);
+    assert.ok(!check!.details.some((d) => d.includes('absent')), `details=${JSON.stringify(check!.details)}`);
+    assert.equal(report.ok, false);
+  });
+});
+
 // ── U10 — version mismatch ──────────────────────────────────────────────────
 
 describe('U10: version mismatch', () => {
@@ -658,6 +838,18 @@ describe('U10: version mismatch', () => {
     );
     assert.equal(byId.get('claude.settings-hooks')!.status, 'skip');
     assert.equal(byId.get('claude.instruction-block')!.status, 'skip');
+    for (const id of [
+      'manifest-hosts',
+      'payload-files',
+      'pin-substituted',
+      'gitignore-generated',
+      'doctor',
+      'claude.hooks-executable',
+      'claude.no-foreign-hooks',
+      'claude.mcp-registration',
+    ]) {
+      assert.equal(byId.get(id)!.status, 'pass', `${id} does not depend on version-match and must still run`);
+    }
     assert.equal(report.ok, false);
 
     let exitCode: number | undefined;
@@ -715,6 +907,7 @@ describe('U11: host arguments', () => {
     let exitCode: number | undefined;
     const stdoutChunks: string[] = [];
     const stderrChunks: string[] = [];
+    let doctorRan = false;
     try {
       await verifyInstallHandler(
         { cwd: dir, host: 'nope', json: false },
@@ -722,7 +915,10 @@ describe('U11: host arguments', () => {
           registry: defaultHostRegistry,
           payloadDir: PAYLOAD_DIR,
           version: VERSION,
-          runDoctor: stubDoctor0,
+          runDoctor: async (): Promise<number> => {
+            doctorRan = true;
+            return 0;
+          },
           stdout: (s) => stdoutChunks.push(s),
           stderr: (s) => stderrChunks.push(s),
           exit: (code: number): never => {
@@ -740,6 +936,49 @@ describe('U11: host arguments', () => {
       `stderr=${stderrChunks.join('')}`,
     );
     assert.deepStrictEqual(stdoutChunks, [], 'no report may be printed on a usage error');
+    assert.equal(doctorRan, false, 'no check may run on a usage error');
+  });
+
+  test('c) a --cwd that does not exist exits 2 before any check and prints no report', async () => {
+    const missing = path.join(os.tmpdir(), `cg-vi-missing-${process.pid}-${Date.now()}`);
+    assert.ok(!fs.existsSync(missing), 'fixture sanity: the directory must not exist');
+    let doctorRan = false;
+    const { verifyInstallHandler } = await loadVerifyInstall();
+    const r = await runHandler(verifyInstallHandler, { cwd: missing, json: false }, {
+      registry: defaultHostRegistry,
+      payloadDir: PAYLOAD_DIR,
+      version: VERSION,
+      runDoctor: async (): Promise<number> => {
+        doctorRan = true;
+        return 0;
+      },
+    });
+    assert.equal(r.code, 2, `stdout=${r.stdout.join('')} stderr=${r.stderr.join('')}`);
+    assert.deepStrictEqual(r.stdout, [], 'no report may be printed on a usage error');
+    assert.ok(r.stderr.join('').length > 0, 'the usage error must be explained on stderr');
+    assert.equal(doctorRan, false, 'no check may run on a usage error');
+    assert.ok(!fs.existsSync(missing), 'verify-install must never create the --cwd directory');
+  });
+
+  test('d) --host claude verifies only claude: another installed host without a verifier is not reported', async () => {
+    const dir = await freshInstall();
+    mutateSnapshot(dir, (snap) => {
+      snap.hosts = ['claude', 'fake'];
+    });
+    const registry = createHostRegistry([defaultHostRegistry.resolve('claude'), makeFakeAdapter('fake', ['.fakehost'])]);
+
+    const { runVerifyInstall } = await loadVerifyInstall();
+    const report = await runVerifyInstall({
+      cwd: dir,
+      host: 'claude',
+      payloadDir: PAYLOAD_DIR,
+      version: VERSION,
+      registry,
+      runDoctor: stubDoctor0,
+    });
+    assert.deepStrictEqual([...report.verified], ['claude']);
+    assert.deepStrictEqual(report.checks.filter((c) => c.id.startsWith('fake.')), []);
+    assert.equal(report.ok, true, JSON.stringify(report.checks.filter((c) => c.status !== 'pass')));
   });
 });
 
@@ -794,6 +1033,28 @@ describe('U12: fail-closed host', () => {
   });
 });
 
+describe('U12b: installed host this cleargate does not register', () => {
+  test('manifest-hosts fails naming an installed host missing from the registry; ok is false', async () => {
+    const dir = await freshInstall();
+    mutateSnapshot(dir, (snap) => {
+      snap.hosts = ['claude', 'ghost'];
+    });
+
+    const { runVerifyInstall } = await loadVerifyInstall();
+    const report = await runVerifyInstall({
+      cwd: dir,
+      payloadDir: PAYLOAD_DIR,
+      version: VERSION,
+      registry: defaultHostRegistry,
+      runDoctor: stubDoctor0,
+    });
+    const check = report.checks.find((c) => c.id === 'manifest-hosts');
+    assert.equal(check!.status, 'fail');
+    assert.ok(check!.details.some((d) => d.includes('ghost')), `details=${JSON.stringify(check!.details)}`);
+    assert.equal(report.ok, false);
+  });
+});
+
 // ── U13 — owner leak (FU-1) ──────────────────────────────────────────────────
 
 describe('U13: owner leak', () => {
@@ -826,6 +1087,12 @@ describe('U13: owner leak', () => {
       check!.details.some((d) => d.includes('.fakehost/x.toml (owner fake)')),
       `details=${JSON.stringify(check!.details)}`,
     );
+    const payload = report.checks.find((c) => c.id === 'payload-files');
+    assert.equal(
+      payload!.status,
+      'pass',
+      `an entry owned by an unregistered host is never selected, so never reported missing (M3 V5): ${JSON.stringify(payload!.details)}`,
+    );
   });
 });
 
@@ -849,6 +1116,24 @@ describe('U14: read-only', () => {
     assert.deepStrictEqual(after, before, 'runVerifyInstall must never write to the target tree');
     assert.ok(!fs.existsSync(path.join(dir, '.cleargate', '.drift-state.json')));
   });
+
+  test('b) the handler with the default in-process doctor also leaves the tree untouched and exits 0', async () => {
+    const dir = await freshInstall();
+    const before = snapshotTree(dir);
+
+    const { verifyInstallHandler } = await loadVerifyInstall();
+    const r = await runHandler(verifyInstallHandler, { cwd: dir, json: true }, {
+      registry: defaultHostRegistry,
+      payloadDir: PAYLOAD_DIR,
+      version: VERSION,
+    });
+    assert.equal(r.code, 0, `stdout=${r.stdout.join('')} stderr=${r.stderr.join('')}`);
+    assert.equal((JSON.parse(r.stdout.join('')) as { ok?: boolean }).ok, true);
+
+    const after = snapshotTree(dir);
+    assert.deepStrictEqual(after, before, 'verifyInstallHandler and the default doctor must never write to the target tree');
+    assert.ok(!fs.existsSync(path.join(dir, '.cleargate', '.drift-state.json')));
+  });
 });
 
 // ── U15 — doctor propagates ──────────────────────────────────────────────────
@@ -899,4 +1184,80 @@ describe('U16: gitignore', () => {
     );
     assert.equal(report.ok, false);
   });
+
+  test('b) a .cleargate/.gitignore without the /.participant.json line fails gitignore-generated naming it', async () => {
+    const dir = await freshInstall();
+    const giPath = path.join(dir, '.cleargate', '.gitignore');
+    const raw = fs.readFileSync(giPath, 'utf8');
+    assert.ok(raw.split('\n').includes('/.participant.json'), 'fixture sanity: the line is present before mutation');
+    fs.writeFileSync(giPath, raw.split('\n').filter((l) => l !== '/.participant.json').join('\n'));
+
+    const { runVerifyInstall } = await loadVerifyInstall();
+    const report = await runVerifyInstall({
+      cwd: dir,
+      payloadDir: PAYLOAD_DIR,
+      version: VERSION,
+      registry: defaultHostRegistry,
+      runDoctor: stubDoctor0,
+    });
+    const check = report.checks.find((c) => c.id === 'gitignore-generated');
+    assert.equal(check!.status, 'fail');
+    assert.ok(
+      check!.details.some((d) => d.includes('.cleargate/.gitignore')),
+      `details=${JSON.stringify(check!.details)}`,
+    );
+    assert.equal(report.ok, false);
+  });
+});
+
+// ── U17 — findCleargatePackageRoot (ruling #2 of the -08 TPV) ─────────────────
+
+function writePackageJson(dir: string, body: string): void {
+  fs.mkdirSync(dir, { recursive: true });
+  fs.writeFileSync(path.join(dir, 'package.json'), body);
+}
+
+function real(p: string | undefined): string | undefined {
+  return p === undefined ? undefined : fs.realpathSync(p);
+}
+
+describe('U17: findCleargatePackageRoot', () => {
+  test('a) tsx walk: from <CLI_ROOT>/src/commands it returns CLI_ROOT', async () => {
+    const { findCleargatePackageRoot } = await loadCliPackageRoot();
+    assert.equal(real(findCleargatePackageRoot(path.join(CLI_ROOT, 'src', 'commands'))), fs.realpathSync(CLI_ROOT));
+  });
+
+  test('b) bundled walk: the package dir itself and its dist/ both resolve to the package dir', async () => {
+    const { findCleargatePackageRoot } = await loadCliPackageRoot();
+    const pkg = path.join(fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cg-vi-pkgroot-'))), 'pkg');
+    writePackageJson(pkg, JSON.stringify({ name: 'cleargate', version: '9.9.9' }));
+    fs.mkdirSync(path.join(pkg, 'dist'));
+    assert.equal(real(findCleargatePackageRoot(pkg)), pkg);
+    assert.equal(real(findCleargatePackageRoot(path.join(pkg, 'dist'))), pkg);
+  });
+
+  test('c) a nearer package.json with another name is walked past', async () => {
+    const { findCleargatePackageRoot } = await loadCliPackageRoot();
+    const pkg = path.join(fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cg-vi-pkgroot-'))), 'pkg');
+    writePackageJson(pkg, JSON.stringify({ name: 'cleargate', version: '9.9.9' }));
+    const nested = path.join(pkg, 'node_modules', 'other');
+    writePackageJson(nested, JSON.stringify({ name: 'other', version: '1.0.0' }));
+    fs.mkdirSync(path.join(nested, 'lib'));
+    assert.equal(real(findCleargatePackageRoot(path.join(nested, 'lib'))), pkg);
+  });
+
+  test('d) an unparseable package.json is walked past', async () => {
+    const { findCleargatePackageRoot } = await loadCliPackageRoot();
+    const pkg = path.join(fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cg-vi-pkgroot-'))), 'pkg');
+    writePackageJson(pkg, JSON.stringify({ name: 'cleargate', version: '9.9.9' }));
+    writePackageJson(path.join(pkg, 'dist'), '{ not json');
+    assert.equal(real(findCleargatePackageRoot(path.join(pkg, 'dist'))), pkg);
+  });
+
+  test('e) no cleargate package.json up to the filesystem root returns undefined', async () => {
+    const { findCleargatePackageRoot } = await loadCliPackageRoot();
+    const start = path.join(fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cg-vi-pkgroot-'))), 'none', 'a');
+    fs.mkdirSync(start, { recursive: true });
+    assert.equal(findCleargatePackageRoot(start), undefined);
+  });
 });
diff --git a/test/docs/clean-room-verification-doc.red.node.test.ts b/test/docs/clean-room-verification-doc.red.node.test.ts
index c53d605..f6055bd 100644
--- a/test/docs/clean-room-verification-doc.red.node.test.ts
+++ b/test/docs/clean-room-verification-doc.red.node.test.ts
@@ -121,7 +121,8 @@ describe('D1: the procedure doc exists and carries its pinned sections (Gherkin
   test('## 4. Machine checks (cleargate verify-install) names the driver', () => {
     assert.ok(fs.existsSync(DOC_PATH), `doc must exist first: ${DOC_PATH}`);
     const md = fs.readFileSync(DOC_PATH, 'utf8');
-    const body = section(md, '## 4. Machine checks (cleargate verify-install)');
+    // Body only: the heading line itself names the driver, so it must not satisfy the check.
+    const body = section(md, '## 4. Machine checks (cleargate verify-install)').split('\n').slice(1).join('\n');
     assert.ok(body.includes('cleargate verify-install'), `body=${body}`);
   });
 });
```

## Binding Developer constraints

These bind the Dev after the re-seal lands. H-rows are cli; D-rows are the outer doc.

### Cli (`story/STORY-058-08`, main checkout, R1)

**H1 — `src/lib/cli-package-root.ts`.**
- Signature: `export function findCleargatePackageRoot(startDir: string): string | undefined`.
- Walk from `path.resolve(startDir)` inclusive to the filesystem root.
- Return the first directory whose `package.json` parses with `name === 'cleargate'`.
- Walk past a `package.json` that is unparseable or has another name.
- Return `undefined` at the root.
- Node built-ins only. It never throws for fs or JSON reasons.

**H2 — `src/commands/init.ts`: only the M3 V3 routing.**
- One import line, plus the body `const root = findCleargatePackageRoot(path.dirname(fileURLToPath(import.meta.url))); return (root ? readPackageVersion(path.join(root, 'package.json')) : null) ?? '0.0.0';`.
- `git diff main --numstat -- src/commands/init.ts` reads `3 19`.
- Accepted edge: a `cleargate`-named `package.json` without a version now yields `'0.0.0'` instead of walking further. No real layout has one.

**H3 — `src/commands/verify-install.ts`.**
- The exports and types are exactly the plan's pinned block. `HOST_VERIFIERS` is a frozen `{ claude }`.
- The default package comes from `findCleargatePackageRoot(path.dirname(fileURLToPath(import.meta.url)))`:
  - `version` from its `package.json`
  - `payloadDir` = `<root>/templates/cleargate-planning`
- Never `resolveDefaultPayloadDir()`: X10, killed by I1 and I3.
- `src/**` imports no `scripts/**`.

**H4 — Usage errors come before anything else (M4-A8).**
- Order:
  1. `cwd = path.resolve(opts.cwd ?? process.cwd())`
  2. `registry.resolve(opts.host)` when `host` is given
  3. `--cwd` must exist and be a directory
  4. only then the snapshot read, the checks and `runDoctor`
- The handler maps `e instanceof UnknownHostError` (import it from `../hosts/registry.js`) and its own usage-error class to:
  - stderr: the error's message, verbatim, with an optional `cleargate verify-install: ` prefix
  - no stdout at all
  - `exit(2)`
- Never walk up: no `resolveProjectRoot`.
- Never create a directory or temp dir.

**H5 — Host resolution (M4-A5).**
- `installed = snapshot ? installedHosts(snapshot) : []`
- `verified =`
  - `host ? [host]`
  - `: snapshot ? installed.filter(h ∈ registry.names())`
  - `: registry.names().filter(n => verifiers[n])`
- When `ctx.snapshot === null`, a verifier returns every one of its checks with `status: 'skip'`.
- `report.installed` is `[]` when the snapshot is absent or unparseable (U9).

**H6 — Skip rule, exact.**
- Checks 2–5 and every host check skip iff check 1 failed.
- Checks 8 and 11 also skip iff check 2 failed.
- Nothing else ever skips:
  - checks 6 and 7 always run
  - checks 3, 4, 5, 9, 10 and 12 run under a version mismatch (U10 / R8)
- `ok = checks.every(c => c.status === 'pass')`.

**H7 — Detail templates, verbatim where pinned.**
- Pinned:
  - `absent: .cleargate/.install-manifest.json` vs `unparseable: .cleargate/.install-manifest.json` (`fs.existsSync` first; U9b)
  - the version-match sentence `installed by <a>, verifying with <b> — verify with the installing version, or run cleargate upgrade`
  - `<h> not installed`
  - `<path> (owner <o>)`
  - `missing: <path> (tier <tier>)`
  - `this cleargate cannot verify host <h>`
- Every other detail names the offending cwd-relative POSIX path (`.claude/hooks/x.sh`, `.mcp.json`, `.gitignore`, `.cleargate/.gitignore`, `CLAUDE.md`).
- Settings triples are named `<event> <matcher> <command>`.
- `.mcp.json` missing → a detail containing `absent`.
- An installed unregistered host → a manifest-hosts detail containing its name (U12b).

**H8 — Check 5.**
- `import { PIN_PLACEHOLDER } from '../init/copy-payload.js'`.
- `command grep -c "__CLEARGATE_VERSION__" src/commands/verify-install.ts` must read `0`, comments included. M6 is runtime-equivalent; this grep is its only guard, and QA-Verify runs it.
- Files scanned:
  - the check-4 selection
  - plus, for each verified **registered** host, `registry.resolve(h).surgeryTargets()` that exist
- Skip missing files; check 4 owns them.

**H9 — Checks 3 and 4.**
- Check 3 uses `installedHosts` and `entryOwner` only, never `e.owner` or `snapshot.hosts` (flashcard `#manifest #host`).
- Check 4 calls `selectEntriesForHosts(snapshot.files, verified, registry)`. Never `snapshot.files` directly, never `payloadFilter` alone.
- An entry owned by an unregistered host is never reported missing (U13 / R13).

**H10 — Check 6 is line-anchored.**
- Root `.gitignore` has a line `=== ROOT_BLOCK_START` and a line `=== ROOT_BLOCK_END` (imported).
- `.cleargate/.gitignore` has a line `=== '/.participant.json'`.
- Either file absent → fail naming it.

**H11 — Check 7's default `runDoctor` (M4-A7).**
- The call is `doctorHandler({}, { cwd, stdout: <capture>, stderr: <capture>, exit: <throwing seam> })`:
  - flags exactly `{}` (hook-health)
  - a local seam class
  - return its code
  - rethrow anything else
- Doctor output never reaches `process.stdout` (I3 parses `--json`).
- Never `checkScaffold`: it writes `.drift-state.json` (U14b).
- Failure detail: `cleargate doctor exited <n>`.
- The throwing seam is binding even though M10 is equivalent today (flashcard `#test-harness #node-exit`).

**H12 — Check 8.**
- Triple = (event, `matcher ?? ''`, command), compared by exact string equality **including the matcher** (U7b).
- Payload triples come from `<payloadDir>/.claude/settings.json`.
- Also verify that each payload triple's script exists: its first token with `${CLAUDE_PROJECT_DIR}/` stripped. X7 is equivalent, but the rule stays in.
- `.claude/settings.json` absent or unparseable → fail naming it.

**H13 — Check 9.**
- Candidates:
  - snapshot entries matching `.claude/hooks/*.sh`
  - ∪ the script of every installed-settings command whose first token starts with `${CLAUDE_PROJECT_DIR}/` (also accept `$CLAUDE_PROJECT_DIR/`)
- Missing files are not reported here.
- `statSync(...).mode & 0o111` must be non-zero.

**H14 — Check 10.**
- Fail on a `--host <x>` token pair with `x !== 'claude'`.
- Fail on a command token (prefix stripped) that `pathUnderRoots` places under another registered adapter's `ownedRoots() ∪ sharedRoots()`.
- A command matching neither passes (`echo hi`).

**H15 — Check 11.**
- Split on `/\r?\n/`. Exactly one line `=== CLEARGATE_START` and one `=== CLEARGATE_END`, START before END.
- Then `extractBlock(installed) === extractBlock(<payloadDir>/CLAUDE.md)` (U6c).
- Never count by substring: U1 fails, because the block prose repeats both markers.

**H16 — Check 12.** `isDeepStrictEqual(mcpServers.cleargate, buildStdioEntry(snapshot.pin_version ?? version))` (U5c).

**H17 — Fail-closed.**
- `<h>.no-verifier` (`owner` h, detail `this cleargate cannot verify host <h>`) is emitted only for a host that is installed **and** registered **and** has no verifier.
- It is appended after the core checks, in `verified` order.
- Under `--host claude`, no other host's checks or `no-verifier` rows appear (U11d).

**H18 — Live list.**
- Claude returns the six ids in plan order, each with host `claude` and a non-empty description.
- It appends `claude.live.agents-md-exposure` iff `<cwd>/AGENTS.md` exists (U1b).
- `report.live` concatenates the lists of the verified hosts that have a verifier.

**H19 — Output.**
- `stdout` is a line sink (`s + '\n'`).
- Text output, in order:
  1. the header `cleargate verify-install — <cwd> (cleargate <version>; verifying: <hosts>)`
  2. `PASS|FAIL|SKIP  <id>` (two spaces), with indented detail lines for non-pass checks
  3. the exact line `NOT CHECKED — needs a live host session:` (U+2014), then `  <id>  <description>` per live check
  4. the last line: `Result: PASS` or `Result: FAIL (<fails> of <all> checks failed)`, where `<fails>` counts `fail` only (M4-A6)
- `--json` prints only `JSON.stringify(report, null, 2)`.
- The handler **always** calls `exit`: 0 when ok, 1 otherwise (U1, U14b).

**H20 — `src/cli.ts`.**
- The import goes on the line after `:34`.
- The plan's block goes verbatim immediately before `program` `:636`.
- Not in `GATED_COMMANDS`. Leave `{ hidden }` off; it is inert here anyway (M4-A11).
- `git diff main --numstat -- src/cli.ts` reads `11 0` (flashcard `#test-harness #git`).

**H21 — `CHANGELOG.md`.**
- FU-10: append the plan's bullet to the existing `### Added` under `## Unreleased`.
- FU-11: append one BUG-085 sentinel bullet after -07's `### Fixed` bullets, covering JSON-array cards, every `flashcards_flagged` block, the final unterminated line, and fail-closed on an unterminated array.
- `awk '/^## Unreleased/{f=1} /^## \[0.26.1\]/{f=0} f && /^### /'` prints exactly `### Added` and `### Fixed`.

**H22 — Untouched.** No change to `scaffold/**`, `templates/**`, `scripts/**`, `package.json` or the lockfile (Rule 2; M4 is byte-neutral).

**H23 — Verification. The Dev edits no test.**
- Run the three red files SOLO, the sealed set and the parity pair in compare mode (`CLEARGATE_INIT_BASELINE`), plus `npm run typecheck`.
- Rule 16: run all 22 `CLEARGATE_META_ROOT` files with `CLEARGATE_META_ROOT=/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-08`.
- `scaffold-relocation.red` needs a git meta-root; the worktree is one.

**H24 — `templates/cleargate-planning` (M4-A12).**
- I1 and I3 read the gitignored `<CLI_ROOT>/templates/cleargate-planning`.
- The main checkout's copy (BD from `b244551`) equals the branch scaffold. Measured with `diff -r`; only `MANIFEST.json` differs, and only in `generated_at`.
- The Dev runs neither `prebuild` nor `build` in the main checkout (Rule 11).
- A fresh clone (QA-Verify) runs `npm run prebuild` in the clone before the integration file.

### Outer doc (`.worktrees/STORY-058-08`; live-only per D-1; no `cleargate-cli/scaffold/core` twin)

- **D1.** All 12 pinned H2 lines, each alone on its line, matched by exact trimmed equality. `## 5. Live host checks — Claude Code` uses U+2014.
- **D2.** The `## Location` body contains, literally:
  - `~/Documents/Dev/`
  - `disposable`
  - lowercase `recreated per run`

  The blueprint's "Never reused. Recreated per run." **fails** (measured, M26). Write e.g. "disposable and recreated per run".
- **D3.** `## Why not /tmp or inside the repository` contains `/private/tmp`. `## Why not the in-repo dogfood instance` contains `gitignored`.
- **D4.** `## 1. Build the packed artifact` contains `npm pack`, plus the plan's four commands and the `rev-parse` / `shasum` record.
- **D5.** `## 2. Install the artifact` contains:
  - `command -v cleargate` (the F1 identity gate)
  - the env-scrub list
  - the M4-A1 sentence: no room ever contains a `cleargate-cli` entry, directory or symlink
- **D6.** The `## 4. Machine checks (cleargate verify-install)` **body** (not the heading) contains `cleargate verify-install` (R17). Record `doctor --check-scaffold` as information only (F8).
- **D7.** Every line containing `npm publish` also contains the word `No` (capital N) or `never` (lowercase), and the doc mentions `npm publish` at least once. "Never run `npm publish`" **fails** D2 (measured, M27); "No `npm publish`, no push." passes.
- **D8.** No outer path besides the doc and the §3.1 orchestration rows. Never edit live `/.claude/**` or `cleargate-planning/**`.
- **D9.** Neither verify-install output nor the doc's user-facing commands cite this meta-repo doc path to users (plan).
- **D10.** Content follows the plan's 12-section blueprint, including:
  - F1–F4 and F8–F9
  - `--setting-sources project,local`
  - the S1/S2 prompts, verbatim from -09 when it lands (at -08, describe S1 = one Edit on a delivery item, S2 = one Agent dispatch of `qa`)
  - `scaffold-lint` is not a clean-room check

  QA-Verify's end-to-end run (DoD) is the witness for content that no test pins.

## Plan amendments

M4-A5 through M4-A13 are appended to `plans/M4.md` as `### Amendments from TPV (STORY-058-08, 2026-09-26)`.

## Outer status

**Start** (outer `d41dd7e6`, `sprint/S-41`):
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
?? .cleargate/sprint-runs/SPRINT-41/.pending-task-2325-42450-29157.json
```

**End**, before this report and the M4 append (outer `d41dd7e6`):
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```
- The pending-task JSON is hook-owned; this dispatch never touched it.
- This dispatch's only outer writes are this report and the append to `plans/M4.md`.
- The cli checkout is unchanged: `story/STORY-058-08` @ `81c05e9`, with only the pre-existing untracked `cleargate-0.25.0.tgz`.
- The outer worktree `.worktrees/STORY-058-08` @ `787dc899` is clean.

## Script incidents

None. No wrapped `.cleargate/scripts/*` script was executed. Every process was a direct `git` / `npm run test:file` / `npm run prebuild|build|typecheck` / `node` call inside the scratch clone, or a read-only call elsewhere.

## Version check

No dependency is added or pinned, so `npm view` is not applicable. Protocol numbering: no protocol or enforcement section is added.

## Reference only: the simulated host resolution and doctor seam (H4–H6 and H11 are binding, not this text)

```ts
const cwd = path.resolve(opts.cwd ?? process.cwd());
if (opts.host !== undefined) registry.resolve(opts.host);           // UnknownHostError → handler exit 2
if (!fs.existsSync(cwd) || !fs.statSync(cwd).isDirectory()) throw new VerifyInstallUsageError(`--cwd ${cwd} does not exist`);
const snapExists = fs.existsSync(path.join(cwd, '.cleargate/.install-manifest.json'));
const snapshot = snapExists ? await loadInstallSnapshot(cwd) : null;
const installed = snapshot ? installedHosts(snapshot) : [];
const verified = opts.host !== undefined ? [opts.host]
  : snapshot ? installed.filter((h) => registered.includes(h))
  : registered.filter((h) => verifiers[h] !== undefined);            // M4-A5
const versionMatches = snapshot !== null && snapshot.cleargate_version === version;

class DoctorExit { constructor(readonly code: number) {} }
async function defaultRunDoctor(cwd: string): Promise<number> {
  try {
    await doctorHandler({}, { cwd, stdout: () => {}, stderr: () => {}, exit: (c: number): never => { throw new DoctorExit(c); } });
  } catch (e) { if (e instanceof DoctorExit) return e.code; throw e; }
  return 0;
}
```

## flashcards_flagged

flashcards_flagged:
  - "2026-09-26 · #cli #help · cli.ts configureHelp.visibleCommands ignores hidden:true — stamp still shows in top-level help; hidden is inert."
  - "2026-09-26 · #test-harness #tpv · A section() slice that keeps its heading line makes 'body names X' vacuous when the heading names X."
  - "2026-09-26 · #test-harness #doctor #tpv · A read-only test with runDoctor stubbed can't see doctor writes; one case must use the real default."
  - "2026-09-26 · #verify-install #tpv · verified = installed∩registered leaves no host checks to skip when the snapshot is absent; fall back to verifier hosts."
  - "2026-09-26 · #docs #test-harness · /\\bNo\\b|\\bnever\\b/ is case-sensitive: 'Never run npm publish' fails D2; lowercase 'no' fails too."

STATUS=done
