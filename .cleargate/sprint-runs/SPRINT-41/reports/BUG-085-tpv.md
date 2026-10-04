# BUG-085 — TPV (Test Pattern Validation) Report
role: architect

TPV: REJECTED — a plan-conformant BUG-085 turns all 47 QA-Red tests green and keeps every sealed contract green, but 5 plan-relevant mutants survive, and the two Rule-2 rows pass parity at the red commit, which breaks M3-A8/E2. The 5 survivors are: the session-start exit code changing on drift, the drift line counting `allowed` entries, an unparseable block that does not block, an unanchored pin match, and a dropped `README.md` include. Re-seal R1–R7 below closes all of them; `git apply --check` is clean on `ec29f45`.

## Subject and setup

- **Subject:** cli `story/BUG-085` @ `ec29f45` (the QA-Red commit, on main `b100ea8`). Five files:
  - `test/lib/drift-check-scaffold.red.node.test.ts` (22)
  - `test/commands/doctor-drift-guard.node.test.ts` (12)
  - `test/hooks/pending-task-sentinel-cards.red.node.test.ts` (12)
  - `test/scaffold/canonical-live-parity.red.integration.node.test.ts` (Scenario 4 deleted)
  - `test/helpers/init-fixture.ts` (two delta rows, plus the `captureOrCompare` change)
- **Scratch clone:** `/private/tmp/cg-s41-tpv-085/cleargate-cli` at `ec29f45`.
  - `node_modules` is symlinked.
  - The parent meta-root holds `git archive` copies of outer `HEAD` (`b4f36e98`): `.cleargate/`, `cleargate-planning/` and `CLAUDE.md`.
  - `npm run prebuild` and `npm run build` ran in the clone: one build per side, plus one per re-seal side, for the dist-spawning doctor cases (M3-A47).
- **Outer-half simulation:** `/private/tmp/cg-s41-tpv-085/outer-sim`, a `git archive` of the worktree `HEAD` (`ac6eb16e`). The CLAUDE.md (a)–(d) edits and the bug068 repoint were applied there, never in the worktree.
- **Clean-up:** the clone and the simulation were deleted with a literal `rm -rf -- /private/tmp/cg-s41-tpv-085`.
- **What was not touched.** Nothing was edited, stashed, built or checked out in any of these:
  - the main cli checkout (still `story/BUG-085` @ `ec29f45`, status `?? cleargate-0.25.0.tgz` only)
  - the outer repo
  - the outer worktree `.worktrees/BUG-085` (still `ac6eb16e`, clean)
  - the live `.claude/hooks`: the tree hash `fffd18ad…9aa1e6e` was the same before and after bug068 live mode ran against it read-only

  Only this report and the M3.md append were written.
- **Every test file ran solo** with `npm run test:file`, with `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline` set on every run. That is compare mode only; no capture flag was ever set.
- **Baseline integrity** (`find /private/tmp/cg-s41-m2-init-baseline -type f -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256`, absolute path):
  - before: `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` (425 files)
  - after: `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` (425 files), unchanged
- **QA-Red counts reproduce exactly on `ec29f45`:**
  - drift-check-scaffold 2/22
  - doctor-drift-guard 3/12 (with a pre-BUG-085 build)
  - sentinel-cards 2/12
  - canonical-live-parity 10/11
  - parity 5/5 and 15/15
  - init-host-snapshot 13/13

## Simulation: the plan-conformant BUG-085 written in the scratch clone

`npm run typecheck` exits 0. The simulated change set, by file:
- **`src/lib/drift-check.ts`** — the blueprint's surface, verbatim:
  - `DriftReason` gains `live-only`; `DriftReport` gains `allowed`.
  - `META_REPO_DRIFT_EXCEPTIONS`, `LIVE_ONLY_CLAUDE_ENTRIES`, `PIN_PLACEHOLDER` and `pinTolerantEqual` are exported.
  - The scaffold is `cwd/cleargate-cli/scaffold`. The check is skipped when `core/.cleargate` or `hosts/claude/.claude` is absent.
  - `.claude/**` is compared two ways. The live-only entries are skipped by equality or a `e + '/'` prefix in both walks; symlinks are skipped.
  - `.cleargate/**` is compared canonical-driven only, over `scripts`, `knowledge` and `templates`, plus `README.md` and `config.example.yml`.
  - A mismatch on an exception path goes to `allowed`.
  - Pin equality normalises both sides. It escapes the literal parts; the first placeholder is `([0-9A-Za-z][0-9A-Za-z.+-]*)` and later ones are `\1`, anchored `^…$`.
  - The CLAUDE.md block compare is kept, rooted at `scaffold/hosts/claude/CLAUDE.md`.
  - Both lists are sorted by path. The function never throws and never writes.
- **`src/commands/doctor.ts`:**
  - The drift-block comment is reworded; the drift-block logic is byte-unchanged.
  - The blueprint's two-line block goes after the CR-009 resolver block and before BUG-036 (M3-A46).
  - Nothing else changes.
- **`scaffold/hosts/claude/.claude/hooks/pending-task-sentinel.sh`:**
  - (a) `${REPORT_FILES[@]+"${REPORT_FILES[@]}"}`.
  - (b) JSON mode, with `JSON_STR_RE` held in a variable, unescape, the unquoted-`]` terminator and `UNPARSEABLE_FILES` fail-closed.
  - (c) M3-A53: every `break` becomes a reset plus `continue`.
  - M3-A48's loop head.
  - The gate condition is `cards > 0 || unparseable > 0`. It prints the blueprint's stderr text, and warns in advisory mode.
  - The core parser is reproduced at the end of this report for reference only. It is not binding verbatim.
- **`scaffold/core/.cleargate/scripts/validate_state.mjs`:** a byte copy of live, sha256 `9702f974…3958fae`, mode 644.
- **Outer half (simulation):**
  - bug068: the two-line `CLI_ROOT`/`HOOKS_DIR` form verbatim, the comment and usage lines, and the exit-2 message printing `HOOKS_DIR`.
  - CLAUDE.md: (a)–(d) at the four grep keys. The block hash is unchanged: `d36eb478…` in the simulation, the worktree and `scaffold/hosts/claude/CLAUDE.md`.

## Rulings on the QA-Red ambiguities

**#1: confirmed by the orchestrator.** Scenarios 11–12 live in `doctor-drift-guard.node.test.ts`.

**#2a — do the two BUG-085 rows satisfy M3-A8? Ruling: no. Re-seal R1 (M3-A54).**
- **What M3-A8/E2 require.** The current side is an expectation that never passes on the baseline hash. The -06 and -07 rows meet that: each builds its current hash from a hand-written object, independent of the implementation.
- **What the BUG-085 rows do.** Both read the canonical file, which is the Developer's product.
- **Measured consequences:**
  - At `ec29f45` the parity files pass 5/5 and 15/15, where M3-A8 expects 0/5 and 0/15.
  - A Dev commit that never ports `validate_state.mjs` passes both parity files (mutant M21 before the re-seal).
  - A port that is not byte-identical also passes both (M16). Only `canonical-live-parity` Scenario 2 kills it.
- **R1:**
  - The `validate_state.mjs` current hash becomes the literal `9702f974…3958fae`.
  - The sentinel row keeps the pin-substituted canonical hash, because the Dev's bytes cannot be known in advance, but refuses it while it equals the baseline `b1ab7702…9636e`.
- **After R1:**
  - Re-seal commit: 0/5 and 0/15. Every failure is the sentinel row's "current hash mismatch", across all 5 scenarios.
  - Conformant: 5/5 and 15/15.
  - Conformant hook without the port: 0/5 and 0/15 on the `validate_state.mjs` row.
  - A port with one extra trailing newline: 21 kills. That is Scenario 2 plus all 20 parity cases.
- **Forward rule (M3-A54).** The sentinel row accepts any later canonical bytes, so a later item that edits the hook must replace this row's `currentHash` with its own expectation.

**#2b — is the `captureOrCompare` both-absent skip sound? Ruling: sound in intent, but it weakens the net. Keep it, restricted to synthetic baselines. Re-seal R2 (M3-A55).**
- **What it keeps.** The one-sided throw, which is the Rule-2 guard.
- **Why narrowing the rows is not the answer.** All 5 real scenarios hold both paths (measured in every `meta.json`), so leaving `'fresh'` out of the rows would be wrong.
- **What it loses.** On a real captured baseline, a mis-keyed row becomes a silent no-op. Measured: a `TYPO` row passes `claude-adapter-init-parity` 5/5 under QA-Red's helper.
- **R2.** Skip only when the scenario has no `tree/`. Every real capture writes `tree/`; the sealed Scenario 15 fixtures write only `meta.json`.
- **After R2:**
  - The `TYPO` row throws "missing from the baseline" (0/5).
  - `init-host-snapshot` stays 13/13 on both sides.

**#3 — does M3-A53 case A1 reproduce as tabled? Ruling: no; the table is corrected (M3-A56).**
- Measured with the `ec29f45` hook under `/bin/bash`, with the stub keyed by subcommand and both gate variables unset:

  | Shape between the two YAML blocks | Cards listed |
  |---|---|
  | blank line + `## Remediation` | `card-one`, `card-two` |
  | adjacent blocks | `card-one`, `card-two` |
  | a `Notes: some prose line here.` line | `card-one` only |

- The A1 and A2 rows now say "separated by a non-indented prose or key line". The sealed 17c-1 already uses that shape.

## Red → green: the 50 tests after the re-seal, plus the parity files

"Sealed" means `src` and `scaffold` at `ec29f45`; "conformant" means the simulation. Each file ran solo. The conformant BUG-085 files ran twice, with identical counts.

**`drift-check-scaffold` — sealed 2/24, conformant 24/24.**

| Test | Sealed | Conformant |
|---|---|---|
| 5 export and shape tests | red | green |
| S1 parity | red | green |
| S2 `config.example.yml` | red | green |
| **S2b `README.md` (R7)** | red | green |
| S3 `validate_state.mjs` | red | green |
| S4a pin equal | green (vacuous; kills a no-pin-tolerance mutant) | green |
| S4b / S4c / S4d | red | green |
| **S4e anchored (R6)** | red | green |
| S5a / S5b | red | green |
| S6a / S6b / S6c | red | green |
| S7 | red | green |
| S8a | red | green |
| S8b prose | green (vacuous; kills M7) | green |
| S9 | red | green |
| S10 | red | green |

**`doctor-drift-guard` — sealed 3/13 with a pre-BUG-085 build, conformant 13/13 with a post-BUG-085 build.**

| Test | Sealed | Conformant |
|---|---|---|
| 3 re-rooted unit cases | red | green |
| skip case | green (anchor) | green |
| 2 dist-spawning drift cases | red (they lag BD) | green |
| dist report-only case | green | green |
| S11 drift / advisory | red | green |
| S11b allowed-only | red | green |
| **S12 placement + no-drift twin exit (R3)** | red | green |
| **S12 allowed-only, no drift line (R4)** | red | green |
| S12 no-scaffold anchor | green | green |

**`pending-task-sentinel-cards` — sealed 2/13, conformant 13/13.**

| Test | Sealed | Conformant |
|---|---|---|
| 13(a), 14(b), 15, 16 | red | green |
| **16b (R5)** | red | green |
| 17(a) / 17(b) | green (anchors) | green |
| 17b-i / 17b-ii | red | green |
| 17c-1..4 | red | green |

**`canonical-live-parity`:** sealed 10/11 (Scenario 2); conformant 11/11. Restoring Scenario 4 gives 11/12 (M17).

**Parity files:**

| File | Sealed as QA-Red left it | Sealed after the re-seal | Conformant (either seal) |
|---|---|---|---|
| `claude-adapter-init-parity` | 5/5 (M3-A8 violation) | **0/5** | 5/5 |
| `init-host-parity` | 15/15 (M3-A8 violation) | **0/15** | 15/15 |

**The sealed -03..-07 contract files under the conformant build, after the re-seal:** 19/11/10/4/18/13/17/3/6/10/6/16/4. Every one is green and matches the expected counts.

**Other files, all green:**
- `doctor.node` 39/39
- `doctor-session-start` 20/20. The six `out[1]` pins hold (M3-A46).
- `hook-signal` 14/14 and 3/3
- `hooks-snapshots` 14/14. No `pending-task-sentinel` snapshot exists, so there is nothing to re-baseline.

## Mutants

Measured on the conformant build. Each mutant was applied alone and the files named ran solo. The "Before re-seal" column is the QA-Red seal.

| # | Mutant | Before re-seal | Killer(s) after re-seal |
|---|---|---|---|
| M1 | `drift-check` falls back to `cleargate-planning/` when the scaffold is absent | killed | DC S9 |
| M2 | no live-only walk | killed | DC S6a |
| M3 | `LIVE_ONLY_CLAUDE_ENTRIES` not honoured | killed | DC S6b; DDG clean, 11b, S12 placement, R4 |
| M4a | pin values may differ (no `\1`) | killed | DC S4b, S4d |
| M4b | unsafe pin value accepted (`[^\n]+`) | killed | DC S4c, S4d |
| M4c | pin regex without `^…$` | **survived** | **R6 (S4e)** |
| M5 | exceptions reported as drift | killed | DC S1, S5a; DDG 11b, R4 |
| M6 | `config.yml` walked, so it lands in `allowed` | killed | DC S1, S5b |
| M6b | `README.md` include dropped | **survived** | **R7 (S2b)** |
| M7 | CLAUDE.md prose diff reported (whole-file compare) | killed | DC S1, S8b; DDG clean, 11b, S12, R4 |
| M8 | `skipped: false` when the scaffold is absent | killed | DC S9; DDG skip case |
| M8b | skip checks `core/.cleargate` only | survived | accepted: the half-scaffold layout does not occur (M3-A58) |
| M9 | drift line at line 2 (before the resolver) | killed | DDG S12 placement |
| M10 | drift sets `outcome.blocker`, so `--session-start` exits 1 on drift | **survived** (S12 compared two drifted runs) | **R3 (S12, no-drift twin)** |
| M10b | as M10, but advisory-aware | killed | DDG S12 |
| M18 | drift line counts and prints `allowed` entries | **survived** | **R4** |
| M11 | no empty-array guard | killed | 13(a) |
| M12 | JSON not unescaped | killed | 15 |
| M13 | no EOF fail-closed | killed | 16, 16b |
| M13b | unparseable reported but not blocking | **survived** (16's "dangling" card blocks anyway) | **R5 (16b)** |
| M14 | no `\|\| [[ -n $line ]]` | killed | 17b-i, 17b-ii |
| M15a | inline-`[]` `break` kept | killed | 17c-2 |
| M15b | YAML-end `break` kept | killed | 17c-1 |
| M15c | md-end `break` kept | killed | 17c-3 |
| M30 | JSON open without leading-whitespace tolerance | survived | accepted: the SPRINT-41 reports indent nothing (M3-A58) |
| M16 | `validate_state` port not byte-identical (extra `\n`) | killed by clp S2 only | clp S2 + parity 5 + 15 (R1) |
| M21 | `validate_state` not ported | killed by clp S2 only; parity green | clp S2 + parity 0/5, 0/15 (R1) |
| M20 | sentinel hook unchanged | sentinel 10 reds; parity green | sentinel reds + parity 0/5, 0/15 (R1) |
| M17 | Scenario 4 not deleted | clp 11/12 | clp 11/12 |
| M19 | mis-keyed delta row (helper) | **survived**: parity 5/5 | **R2**: parity 0/5, "missing from the baseline" |

DC = drift-check-scaffold; DDG = doctor-drift-guard; clp = canonical-live-parity.

## Regression witnesses

The runs used sealed `src` and `scaffold` (with a sealed build) and then conformant (with a conformant build), each file solo. The failing-name sets were diffed per file.

**Default witnesses: 31 files, identical failing-name sets in all 31.** The files:
- the `doctor*.node` files
- all 15 of `test/hooks/*`
- all 9 of `test/scaffold/*`
- `test/scripts/parallel-dispatch.red.node`
- `test/docs/autonomy-contract.red.node`
- `hooks-snapshots`

The pre-existing failures are identical on both sides, and all come from the scratch environment: each reads the meta-root's gitignored live `.claude/hooks/*`, which a `git archive` meta-root does not contain.
- `cr-026-integration` 0/1
- `run-id-ledger-attribution` 4/10. QA-Red measured 10/10 in the main checkout, where live `.claude/` exists.
- `token-ledger-delta.integration` 3/8

**Rule 16:** `command grep -rl CLEARGATE_META_ROOT test` lists 20 test files (the helper is excluded).
- **With `CLEARGATE_META_ROOT=/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-085` (read-only):** identical failing-name sets, sealed vs conformant.
  - The only failures are `close-sprint-assume-ack-guard` 18/20 on both sides. The worktree has no `cleargate-cli/src`.
  - The worktree status stayed clean.
- **With the outer-half simulation (CLAUDE.md edited):** identical, except `scaffold-relocation` 14/15. The simulation is not a git repo, so `git ls-files` finds 0; it is 15/15 against the real worktree.
- **No test pins the CLAUDE.md prose being edited.** `command grep` finds zero hits for the four grep keys or `BUG-024 shipped` in cli `test`, `scripts` and `src`.

**bug068 (file 19):**
- Canonical mode (`CLEARGATE_CLI_ROOT=<scratch cli>`): 10/10, exit 0.
- No cli root: exit 2, and the message names the resolved `HOOKS_DIR`.
- Live mode (`BUG068_HOOKS_DIR=OUTER/.claude/hooks`, read-only): 10/10.

## Expected counts after the re-seal (the orchestrator's acceptance check)

QA-Red applies the diff below verbatim, in one commit on `story/BUG-085`.

| File | At the re-seal commit (sealed src) | After a conformant Dev commit |
|---|---|---|
| `test/lib/drift-check-scaffold.red.node.test.ts` | 2/24 | 24/24 |
| `test/commands/doctor-drift-guard.node.test.ts` | 3/13 with a pre-BUG-085 dist (the report-only case green) | 13/13 with a post-BUG-085 build |
| `test/hooks/pending-task-sentinel-cards.red.node.test.ts` | 2/13 | 13/13 |
| `test/scaffold/canonical-live-parity.red.integration.node.test.ts` | 10/11 | 11/11 |
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` | **0/5** (sentinel row, "current hash mismatch") | 5/5 |
| `test/commands/init-host-parity.red.integration.node.test.ts` | **0/15** (same) | 15/15 |
| `test/commands/init-host-snapshot.red.node.test.ts` | 13/13 | 13/13 |
| Sealed -03..-07 contract files | 19/11/10/4/18/13/17/3/6/10/6/16/4 | unchanged |

The default-suite delta for DevOps step 3 is +43 over the -07 post-merge count (2944): drift-check-scaffold 24, sentinel-cards 13, doctor-drift-guard +6.

## Re-seal diff (R1–R7)

- It applies to `ec29f45`: `git apply --check` is clean on a fresh `ec29f45` checkout.
- Patch sha256: `7adc1598178c7b0d412eba52ff4feca516424044ddf47ffb70f3e2e5bc5989a5`.
- Stat: 4 files, 132 insertions, 24 deletions.

What each part does:
- **R1:** strict delta rows (M3-A54).
- **R2:** a tree-gated skip (M3-A55).
- **R3:** scenario 12's exit-code check uses a no-drift twin.
- **R4:** allowed-only session-start prints no drift line.
- **R5:** test 16b.
- **R6:** anchored pin equality.
- **R7:** the `README.md` include.

```diff
diff --git a/test/commands/doctor-drift-guard.node.test.ts b/test/commands/doctor-drift-guard.node.test.ts
index 2ebc920..c6e07e0 100644
--- a/test/commands/doctor-drift-guard.node.test.ts
+++ b/test/commands/doctor-drift-guard.node.test.ts
@@ -401,6 +401,37 @@ function buildHandlerFixture(tmpDir: string): void {
   buildContentMismatchFixture(tmpDir);
 }
 
+/** TPV R3: the no-drift twin of buildHandlerFixture (same files, qa.md in parity). */
+function buildCleanHandlerFixture(tmpDir: string): void {
+  const cleargate = path.join(tmpDir, '.cleargate');
+  fs.mkdirSync(cleargate, { recursive: true });
+  fs.writeFileSync(
+    path.join(cleargate, '.install-manifest.json'),
+    JSON.stringify({ version: '0.17.1', installedAt: '2026-07-19T00:00:00Z', files: [] }, null, 2) + '\n',
+    'utf8'
+  );
+  buildCleanFixture(tmpDir);
+}
+
+/** TPV R4: the allowed-only fixture of Scenario 11b (gate-checks.json differs, nothing else). */
+function buildAllowedOnlyHandlerFixture(tmpDir: string): void {
+  const cleargate = path.join(tmpDir, '.cleargate');
+  fs.mkdirSync(path.join(cleargate, 'scripts'), { recursive: true });
+  fs.writeFileSync(
+    path.join(cleargate, '.install-manifest.json'),
+    JSON.stringify({ version: '0.17.1', installedAt: '2026-07-19T00:00:00Z', files: [] }, null, 2) + '\n',
+    'utf8'
+  );
+  buildCleanFixture(tmpDir);
+  fs.mkdirSync(path.join(tmpDir, 'cleargate-cli', 'scaffold', 'core', '.cleargate', 'scripts'), { recursive: true });
+  fs.writeFileSync(
+    path.join(tmpDir, 'cleargate-cli', 'scaffold', 'core', '.cleargate', 'scripts', 'gate-checks.json'),
+    '{"generated_at":"canonical"}\n',
+    'utf8'
+  );
+  fs.writeFileSync(path.join(cleargate, 'scripts', 'gate-checks.json'), '{"generated_at":"live"}\n', 'utf8');
+}
+
 describe('Scenario 11: default (hook-health) mode drift reporting', () => {
   let tmpDir: string;
 
@@ -489,8 +520,31 @@ describe('Scenario 12: --session-start ClearGate drift: line placement (M3-A46)'
       `line 3 must be the exact drift line, got: ${JSON.stringify(lines)}`
     );
 
-    const { codes: codesAfter } = await runDoctorHandler(tmpDir, { sessionStart: true }, { CLEARGATE_ADVISORY: '1' });
-    assert.deepStrictEqual(codesAfter, codesBefore, '--session-start exit code must be identical with and without drift');
+    // TPV R3: compare against a no-drift twin, not a second drifted run.
+    const clean = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-handler-session-clean-'));
+    try {
+      buildCleanHandlerFixture(clean);
+      assert.deepStrictEqual(checkCanonicalDrift(clean).drifted, [], 'the twin must hold no drift');
+      const { lines: cleanLines, codes: codesClean } = await runDoctorHandler(clean, { sessionStart: true }, { CLEARGATE_ADVISORY: undefined });
+      assert.ok(!cleanLines.some((l) => l.startsWith('ClearGate drift:')), `no drift → no drift line, got: ${JSON.stringify(cleanLines)}`);
+      assert.deepStrictEqual(codesBefore, codesClean, '--session-start exit code must be identical with and without drift');
+    } finally {
+      fs.rmSync(clean, { recursive: true, force: true });
+    }
+  });
+
+  it('allowed-only drift (gate-checks.json) → no ClearGate drift: line (TPV R4)', async () => {
+    const allowedOnly = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-handler-session-allowed-'));
+    try {
+      buildAllowedOnlyHandlerFixture(allowedOnly);
+      const report = checkCanonicalDrift(allowedOnly);
+      assert.strictEqual(report.skipped, false, 'fixture must engage the scaffold-rooted drift check');
+      assert.deepStrictEqual(report.drifted, [], 'fixture must hold no blocking drift');
+      const { lines } = await runDoctorHandler(allowedOnly, { sessionStart: true }, { CLEARGATE_ADVISORY: undefined });
+      assert.ok(!lines.some((l) => l.startsWith('ClearGate drift:')), `allowed entries never produce the drift line, got: ${JSON.stringify(lines)}`);
+    } finally {
+      fs.rmSync(allowedOnly, { recursive: true, force: true });
+    }
   });
 
   it('no scaffold → no drift line (regression anchor: session-start must stay silent for target-repo installs)', async () => {
diff --git a/test/helpers/init-fixture.ts b/test/helpers/init-fixture.ts
index 997c8e2..ccc0c94 100644
--- a/test/helpers/init-fixture.ts
+++ b/test/helpers/init-fixture.ts
@@ -449,9 +449,7 @@ function userContentSettingsCurrentHash(): string {
 /**
  * BUG-085 (M3 T11 anchors): reads the REAL canonical scaffold source at test
  * time and applies the exact same pin substitution `copyPayload` performs
- * (PIN_PLACEHOLDER -> FIXED_PIN, raw byte replace, no other normalization) —
- * so the sanctioned-delta row above tracks whatever the Developer's commit
- * actually ships instead of a hardcoded guess at future bytes.
+ * (PIN_PLACEHOLDER -> FIXED_PIN, raw byte replace, no other normalization).
  */
 function currentPinSubstitutedHash(rel: string): string {
   const raw = fs.readFileSync(canonicalPath(rel));
@@ -461,9 +459,17 @@ function currentPinSubstitutedHash(rel: string): string {
   return createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
 }
 
-/** Same as currentPinSubstitutedHash but for a file with no pin placeholder. */
-function currentRawHash(rel: string): string {
-  return createHash('sha256').update(fs.readFileSync(canonicalPath(rel))).digest('hex');
+/** BUG-085: the recorded M2 baseline hash of the installed sentinel hook (T11). */
+const BUG085_SENTINEL_BASELINE = 'b1ab7702066788282302efa160c7b5075adec971ec1318112d13a4b949f9636e';
+
+/**
+ * TPV R1 (M3-A8 / E2): the hook's post-delta bytes are the Developer's, so the
+ * current side is derived from canonical — but it never accepts the baseline.
+ * A canonical hook still equal to the M2 bytes means the delta has not landed.
+ */
+function bug085SentinelCurrentHash(): string {
+  const h = currentPinSubstitutedHash('.claude/hooks/pending-task-sentinel.sh');
+  return h === BUG085_SENTINEL_BASELINE ? `<BUG-085 sentinel delta not landed: canonical still ${h}>` : h;
 }
 
 export const SANCTIONED_BASELINE_DELTAS: readonly SanctionedDelta[] = Object.freeze([
@@ -499,15 +505,13 @@ export const SANCTIONED_BASELINE_DELTAS: readonly SanctionedDelta[] = Object.fre
     // (0.0.0-m2), mode 755 — plans/M3.md "As-built resolution after
     // STORY-058-07" T11, independently recomputed against
     // scaffold/hosts/claude/.claude/hooks/pending-task-sentinel.sh on b100ea8.
-    baselineHash: () => 'b1ab7702066788282302efa160c7b5075adec971ec1318112d13a4b949f9636e',
-    // Computed from first principles at test time (M3-A8: strict on both
-    // sides, never a guessed future literal): read the REAL canonical source
-    // and apply the exact substitution copyPayload performs
-    // (PIN_PLACEHOLDER -> FIXED_PIN). Equal to the baseline above until
-    // BUG-085's bash-3.2 empty-array guard + JSON-array parser land, at which
-    // point it diverges — expected red ("has not landed") at QA-Red's own
-    // commit; parity goes green once the Dev commit lands.
-    currentHash: () => currentPinSubstitutedHash('.claude/hooks/pending-task-sentinel.sh'),
+    baselineHash: () => BUG085_SENTINEL_BASELINE,
+    // TPV R1 (M3-A8 / E2): the REAL canonical source with copyPayload's exact
+    // substitution (PIN_PLACEHOLDER -> FIXED_PIN), refused while it still
+    // equals the baseline. Red at the QA-Red commit on every scenario; green
+    // once the Dev commit changes the hook. It accepts any later canonical
+    // bytes, so a later item that edits this hook must say so (M3-A54).
+    currentHash: () => bug085SentinelCurrentHash(),
   },
   {
     item: 'BUG-085',
@@ -516,12 +520,11 @@ export const SANCTIONED_BASELINE_DELTAS: readonly SanctionedDelta[] = Object.fre
     // Pre-port canonical (stale, CR-045-era), mode 644 — plans/M3.md T11,
     // measured on a821d40 / b100ea8; independently recomputed above.
     baselineHash: () => 'c868234c77f4a25d15eeca066eff6f04b2f1dc7a1a16f9240e8ea1976b58fd7d',
-    // Computed from first principles at test time: no pin substitution
-    // applies to a .mjs script. Equal to the baseline above (a no-op delta)
-    // until the CR-117 port lands, then must equal the live-measured target
-    // 9702f9741f4d89f6c4a32aadd59a70ffb4cf6b455abd592f953d083ec3958fae
-    // (independently recomputed above against OUTER/.cleargate/scripts/validate_state.mjs).
-    currentHash: () => currentRawHash('.cleargate/scripts/validate_state.mjs'),
+    // TPV R1 (M3-A8): the port is a byte copy of live
+    // OUTER/.cleargate/scripts/validate_state.mjs (CR-117), so the post-delta
+    // hash is that live-measured literal, never read from canonical. Red at
+    // the QA-Red commit on every scenario; green once the byte copy lands.
+    currentHash: () => '9702f9741f4d89f6c4a32aadd59a70ffb4cf6b455abd592f953d083ec3958fae',
   },
 ]);
 
@@ -605,7 +608,9 @@ export async function captureOrCompare(
     // treated as an error. Present on exactly ONE side is still a hard
     // failure: that is the asymmetry the original STORY-058-06 check exists
     // to catch (a delta whose `rel` never reaches a REAL captured tree).
-    if (!storedEntry && !recordEntry) continue;
+    // TPV R2: only a synthetic baseline (meta.json with no captured tree/) may
+    // skip. Every real capture writes tree/, so a mis-keyed row still throws.
+    if (!storedEntry && !recordEntry && !fs.existsSync(treeDir)) continue;
     if (!storedEntry || !recordEntry) {
       throw new Error(
         `captureOrCompare: sanctioned delta "${delta.rel}" (${delta.item}) is missing from ` +
diff --git a/test/hooks/pending-task-sentinel-cards.red.node.test.ts b/test/hooks/pending-task-sentinel-cards.red.node.test.ts
index 26d52b9..b125249 100644
--- a/test/hooks/pending-task-sentinel-cards.red.node.test.ts
+++ b/test/hooks/pending-task-sentinel-cards.red.node.test.ts
@@ -214,6 +214,22 @@ test('16: an unterminated flashcards_flagged: [ with no closing ] before EOF fai
   }
 });
 
+test('16b: an unterminated array fails closed even when every card in it is already marked (TPV R5)', () => {
+  const f = fixture();
+  try {
+    const reportPath = writeReport(f, 'STORY-FX-dev.md', 'flashcards_flagged: [\n  "dangling"\n\nSTATUS=done\n');
+    touchMarker(f, 'dangling');
+    const r = invoke(f.root);
+    assert.equal(r.status, 2, `an unparseable block must block on its own, not only through an unmarked card; got status=${r.status} stderr=${r.stderr}`);
+    assert.ok(r.stderr.includes('unparseable flashcards_flagged'), `expected "unparseable flashcards_flagged" on stderr, got: ${JSON.stringify(r.stderr)}`);
+    assert.ok(r.stderr.includes(path.basename(reportPath)), `expected the file name on stderr, got: ${JSON.stringify(r.stderr)}`);
+    const cardLines = r.stderr.split('\n').filter((l) => l.trim().startsWith('card:'));
+    assert.deepEqual(cardLines, [], `the marked card must not be listed, got: ${JSON.stringify(cardLines)}`);
+  } finally {
+    fs.rmSync(f.root, { recursive: true, force: true });
+  }
+});
+
 // ── Scenario 17: regression anchors — already-green behaviour must not break ─
 
 test('17(a): flashcards_flagged: [] → no cards (regression anchor, already green on baseline)', () => {
diff --git a/test/lib/drift-check-scaffold.red.node.test.ts b/test/lib/drift-check-scaffold.red.node.test.ts
index d3082ae..89dcffe 100644
--- a/test/lib/drift-check-scaffold.red.node.test.ts
+++ b/test/lib/drift-check-scaffold.red.node.test.ts
@@ -223,6 +223,23 @@ describe('Scenario 2: live-behind — canonical config.example.yml edited', () =
   });
 });
 
+describe('Scenario 2b: .cleargate/README.md is in the canonical-driven include set (TPV R7)', () => {
+  let tmpDir: string;
+  before(() => {
+    tmpDir = mkTmp('drift-readme-');
+    buildBaseFixture(tmpDir);
+    fs.writeFileSync(path.join(tmpDir, '.cleargate', 'README.md'), '# README\nLIVE HAND-EDIT\n', 'utf8');
+  });
+  after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));
+
+  test('names .cleargate/README.md as content-mismatch', async () => {
+    const { checkCanonicalDrift } = await loadDrift();
+    const report = checkCanonicalDrift(tmpDir);
+    assert.equal(report.skipped, false);
+    assert.equal(findPath(report.drifted, '.cleargate/README.md')?.reason, 'content-mismatch');
+  });
+});
+
 describe('Scenario 3: canonical-behind — live validate_state.mjs edited', () => {
   let tmpDir: string;
   before(() => {
@@ -283,6 +300,22 @@ describe('Scenario 4: pin-tolerant equality', () => {
     }
   });
 
+  test('pin-tolerant equality is anchored: extra live content before or after is content-mismatch (TPV R6)', async () => {
+    const mod = await loadDrift();
+    assert.equal(typeof mod.pinTolerantEqual, 'function', 'pinTolerantEqual is not yet exported');
+    assert.equal(mod.pinTolerantEqual(PIN_HOOK_CANONICAL, pinHookLive('0.20.0', '0.20.0') + 'echo appended\n'), false);
+    assert.equal(mod.pinTolerantEqual(PIN_HOOK_CANONICAL, 'echo prepended\n' + pinHookLive('0.20.0', '0.20.0')), false);
+    const tmpDir = mkTmp('drift-pin-anchored-');
+    try {
+      buildBaseFixture(tmpDir);
+      fs.writeFileSync(path.join(tmpDir, '.claude', 'hooks', 'pin-demo.sh'), pinHookLive('0.20.0', '0.20.0') + 'echo appended\n', 'utf8');
+      const report = mod.checkCanonicalDrift(tmpDir);
+      assert.equal(findPath(report.drifted, '.claude/hooks/pin-demo.sh')?.reason, 'content-mismatch');
+    } finally {
+      fs.rmSync(tmpDir, { recursive: true, force: true });
+    }
+  });
+
   test('pinTolerantEqual itself: identical single-value substitution is equal, a semicolon-bearing value is not', async () => {
     const mod = await loadDrift();
     assert.equal(typeof mod.pinTolerantEqual, 'function', 'pinTolerantEqual is not yet exported');
```

## Binding Developer constraints

**Cli (`story/BUG-085`, on top of the re-seal):**
- **G1 — `drift-check.ts`.** Export exactly the blueprint's surface.
  - Skip when `scaffold/core/.cleargate` or `scaffold/hosts/claude/.claude` is absent, returning `{ skipped: true, drifted: [], allowed: [] }`.
  - Never read `cwd/cleargate-planning/`, never throw, never write. Sort both lists by path.
  - Do not call `selectEntriesForHosts` and do not read `.install-manifest.json` (M3-A50).
- **G2 — `pinTolerantEqual`.**
  - Normalise both sides exactly as `hashNormalized` does, and escape each literal part.
  - The first placeholder captures `([0-9A-Za-z][0-9A-Za-z.+-]*)`; every later one is the backreference `\1`.
  - Anchor the whole pattern `^…$` (R6).
  - Without a placeholder, compare hashes.
- **G3 — walks.**
  - `.claude/**` is compared two ways (`missing-in-live`, `content-mismatch`, `live-only`). Skip `LIVE_ONLY_CLAUDE_ENTRIES` by equality or `entry + '/'` prefix in both walks, and skip symlinks.
  - `.cleargate/**` is canonical-driven only: the `scripts`, `knowledge` and `templates` directories, plus the files `README.md` and `config.example.yml`. `config.yml` is never walked.
  - An exception-path mismatch goes to `allowed`.
- **G4 — `doctor.ts`.**
  - Change only the drift-block comment. Its lines, the advisory prefix and the blocker are unchanged, and `allowed` prints nothing.
  - Insert the session-start line after the CR-009 resolver block and before BUG-036 (M3-A46).
  - The condition is `!d.skipped && d.drifted.length > 0`. The count is `d.drifted.length`. The text is the blueprint's, verbatim.
  - Never set `outcome.blocker` or `outcome.configError` from it (R3, R4, M3-A57).
  - `runCheckScaffold`, `emitSummary`, the `--host` guard and `DriftMapEntry.owner` stay byte-unchanged (M3-A50).
- **G5 — `pending-task-sentinel.sh`.**
  - (a) Use `${REPORT_FILES[@]+"${REPORT_FILES[@]}"}`. Under `/bin/bash` 3.2, `"${!arr[@]}"` and `${#arr[@]}` on an empty array are safe. That is re-measured: 14(b) runs `for i in "${!UNPARSEABLE_FILES[@]}"` on an empty array and passes.
  - (b) Check JSON mode first on every line.
    - The entry regex allows leading whitespace. Keep `JSON_STR_RE='"(([^"\\]|\\.)*)"'` in a variable.
    - Unescape `\"` then `\\` before hashing.
    - The block ends when the line's unquoted remainder contains `]`.
  - (c) Apply M3-A53's reset semantics at all three stop points. An inline `[]` resets and continues.
  - Use M3-A48's loop head.
  - Fail closed: at EOF in JSON mode, add the file to `UNPARSEABLE_FILES`.
  - The gate condition is `cards > 0 || unparseable > 0` (R5). The stderr text is the blueprint's, verbatim. Advisory mode warns.
  - Keep scanning only `*-dev.md` and `*-qa.md` (Decision 6). Leave the pin literal and the `TIER_RULES` entry unchanged.
  - Never unescape list-form cards.
- **G6 — `validate_state.mjs`.** It is a byte copy of live: sha256 `9702f9741f4d89f6c4a32aadd59a70ffb4cf6b455abd592f953d083ec3958fae`, mode 644. The R1 row pins both.
- **G7 — no test edits.** After the re-seal, the Dev commit touches no file under `test/`. `state-scripts.test.mjs` stays live-only.
- **G8 — dist.** The 3 dist-spawning doctor-drift-guard cases need a story-branch build or a scratch build. Under rule 11, a story-branch build is disclosed in the Dev report.
- **G9 — run list.**
  - typecheck
  - the three BUG-085 files, solo
  - canonical-live-parity
  - both parity files, in compare mode with the absolute baseline path
  - the 13 sealed files
  - `doctor.node`, `doctor-session-start` and `hook-signal*`
  - `hooks-snapshots`, `run-id-ledger-attribution`, `parallel-dispatch` and `autonomy-contract`
  - Rule 16: every `CLEARGATE_META_ROOT` file, solo, with `CLEARGATE_META_ROOT=OUTER/.worktrees/BUG-085`, after the outer half is committed there. Never with the full suite.
- **G10 — CHANGELOG.** The plan names none, so none is required.

**Outer (`.worktrees/BUG-085`, `story/BUG-085`):**
- **G11 — bug068 repoint.**
  - The comment names `cleargate-cli/scaffold/hosts/claude/.claude/hooks/` and the live mode.
  - Add the usage line `BUG068_HOOKS_DIR="$PWD/.claude/hooks" bash …`.
  - Replace line `:61` with the blueprint's two lines, verbatim (`CLI_ROOT=…`, `HOOKS_DIR="${BUG068_HOOKS_DIR:-${CLI_ROOT}/scaffold/hosts/claude/.claude/hooks}"`).
  - The `exit 2` message prints the resolved `HOOKS_DIR`.
  - Run it with `CLEARGATE_CLI_ROOT=OUTER/cleargate-cli`. Measured in the simulation: 10/10, and 10/10 in live mode.
- **G12 — CLAUDE.md.** Re-measure by grep key, then edit:
  - `scaffold canonical at` (`:62`): edit (a).
  - `deprecated, frozen` (`:121`, M3-A49): edit (c). The sentence "It stays only until BUG-085's D4 re-declarations and a handful of outer shell tests stop reading it" must no longer name BUG-085 as a pending reader.
  - `Edits to canonical do` (`:127`): edits (b) and (d). The (d) sentence is the blueprint's, verbatim, and it replaces the BUG-024 prose.
  - `remind the user to re-sync` (`:189`): edit (b).
  - The `<!-- CLEARGATE:START -->…END` block bytes must stay equal to `scaffold/hosts/claude/CLAUDE.md`'s block. Today both hash `d36eb478…`.
- **G13 — outer orchestration.** Orchestration rows only: `BUG-085_…md`, the reports and `.cleargate/wiki/log.md`. The surface gate is inert on BUG items.

**DevOps / RS-BUG085 (from M3-A59):**
- **G14 — step 6.1 preview.**
  - 6 cards become newly visible: the -02 dev and qa JSON cards, 3 each. There are 0 unparseable files.
  - The orchestrator confirms them against sprint §4 2026-09-25T14:10, then touches the markers before step 6.3.
  - The dry-parse is repeated on the real tree at RS time; reports may have been added since.
- **G15 — between merge and step 6.4.**
  - `doctor --cwd OUTER` prints exactly one `scaffold drift: .claude/hooks/pending-task-sentinel.sh (content-mismatch)` line and exits 1, and SessionStart shows `ClearGate drift: 1 …`. Both are expected.
  - After the re-sync, both are clean.
  - Measured today against the pre-port canonical: `drifted = [validate_state.mjs]`, `allowed = [gate-checks.json]`. There is no pin, live-only or CLAUDE.md drift.
- **G16 — forward (M3-A54).** A later item that edits `pending-task-sentinel.sh` replaces the BUG-085 sentinel row's `currentHash`. It does not add a second row for the same `rel`.

## Plan amendments

`plans/M3.md` § "Amendments from TPV (BUG-085, 2026-09-26)" was appended: M3-A54 (R1 rows), M3-A55 (R2 skip), M3-A56 (M3-A53 A1/A2 correction), M3-A57 (session-start drift-line contract), M3-A58 (R5–R7 plus the accepted survivors), M3-A59 (RS-BUG085 preview) and M3-A60 (route and counts).

## Outer status

At the start (before the scratch setup):
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
?? .cleargate/sprint-runs/SPRINT-41/.pending-task-2179-74966-21674.json
```

At the end (after the clone deletion, before this report and the M3.md append). The untracked pending-task sentinel was consumed by the ledger hook; nothing from this TPV:
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```

This report and the M3.md append are the only writes to the outer tree.

## Script incidents

None. No wrapped script was executed. `npm run test:file`, `typecheck`, `prebuild` and `build` ran only inside the scratch clone.

## Version check

No dependency is added or pinned, so `npm view` does not apply.

## Reference only: the simulated parser core (not binding verbatim; G5 is binding)

```bash
  UNPARSEABLE_FILES=()
  # JSON string literal (bash 3.2: the regex must live in a variable).
  JSON_STR_RE='"(([^"\\]|\\.)*)"'

  # Record one card (hash + marker check).
  add_card() {
    local card="$1"
    [[ -z "${card}" ]] && return 0
    local hash
    hash="$(printf '%s' "${card}" | shasum -a 1 | cut -c1-12)"
    if [[ ! -f "${SPRINT_DIR}/.processed-${hash}" ]]; then
      UNPROCESSED_CARDS+=("${card}")
      UNPROCESSED_HASHES+=("${hash}")
    fi
  }

  # Extract every JSON string in $1; end the JSON block when the unquoted remainder holds "]".
  scan_json() {
    local rest="$1" unq="" m s
    while [[ "${rest}" =~ $JSON_STR_RE ]]; do
      m="${BASH_REMATCH[0]}"
      s="${BASH_REMATCH[1]}"
      unq="${unq}${rest%%"${m}"*}"
      rest="${rest#*"${m}"}"
      s="${s//\\\"/\"}"
      s="${s//\\\\/\\}"
      add_card "${s}"
    done
    unq="${unq}${rest}"
    if [[ "${unq}" == *"]"* ]]; then
      IN_BLOCK=0
      BLOCK_TYPE=""
    fi
  }

  for REPORT_FILE in ${REPORT_FILES[@]+"${REPORT_FILES[@]}"}; do
    [[ ! -f "${REPORT_FILE}" ]] && continue
    # Parse every flashcards_flagged block (M3-A53). Formats:
    #   YAML key:  flashcards_flagged: []  |  flashcards_flagged:\n  - "card"
    #   md heading: ## flashcards_flagged\n- "card"
    #   JSON array: flashcards_flagged: ["a", "b"]  (inline or multi-line, fenced or not)
    IN_BLOCK=0
    BLOCK_TYPE=""  # "yaml", "md" or "json"
    while IFS= read -r line || [[ -n "${line}" ]]; do
      if [[ "${BLOCK_TYPE}" == "json" ]]; then
        scan_json "${line}"
        continue
      fi
      # Inline empty list — this block has no cards; keep scanning.
      if [[ "${line}" =~ ^[[:space:]]*flashcards_flagged:[[:space:]]*\[[[:space:]]*\] ]]; then
        IN_BLOCK=0
        BLOCK_TYPE=""
        continue
      fi
      # JSON array (inline or opening a multi-line array).
      if [[ "${line}" =~ ^[[:space:]]*flashcards_flagged:[[:space:]]*\[(.*)$ ]]; then
        IN_BLOCK=1
        BLOCK_TYPE="json"
        scan_json "${BASH_REMATCH[1]}"
        continue
      fi
      if [[ "${line}" =~ ^flashcards_flagged:[[:space:]]*$ ]]; then
        IN_BLOCK=1
        BLOCK_TYPE="yaml"
        continue
      fi
      if [[ "${line}" =~ ^##[[:space:]]+[Ff]lashcards_flagged ]]; then
        IN_BLOCK=1
        BLOCK_TYPE="md"
        continue
      fi

      if [[ "${IN_BLOCK}" == "1" ]]; then
        if [[ "${BLOCK_TYPE}" == "yaml" ]]; then
          if [[ "${line}" =~ ^[a-zA-Z_] ]]; then
            IN_BLOCK=0
            BLOCK_TYPE=""
            continue
          fi
        elif [[ "${BLOCK_TYPE}" == "md" ]]; then
          if [[ "${line}" =~ ^# ]]; then
            IN_BLOCK=0
            BLOCK_TYPE=""
            continue
          fi
        fi
        if [[ "${line}" =~ ^[[:space:]]*-[[:space:]]+(.*) ]]; then
          CARD="${BASH_REMATCH[1]}"
          CARD="${CARD#\"}"
          CARD="${CARD%\"}"
          CARD="${CARD#\'}"
          CARD="${CARD%\'}"
          add_card "${CARD}"
        fi
      fi
    done < "${REPORT_FILE}"
    # Fail closed: EOF while still inside a JSON array.
    if [[ "${BLOCK_TYPE}" == "json" ]]; then
      UNPARSEABLE_FILES+=("${REPORT_FILE}")
    fi
  done

  if [[ "${#UNPROCESSED_CARDS[@]}" -gt 0 || "${#UNPARSEABLE_FILES[@]}" -gt 0 ]]; then
    printf '[%s] flashcard-gate: %d unprocessed card(s), %d unparseable file(s)\n' \
      "$(date -u +%FT%TZ)" "${#UNPROCESSED_CARDS[@]}" "${#UNPARSEABLE_FILES[@]}" >> "${HOOK_LOG}"
    if [[ "${CLEARGATE_ADVISORY:-0}" == "1" ]]; then
      # Advisory mode: warning only, continue to sentinel write
      printf 'FLASHCARD GATE WARNING: %d unprocessed flashcard(s).\n' \
        "${#UNPROCESSED_CARDS[@]}" >&2
      for i in "${!UNPROCESSED_CARDS[@]}"; do
        CARD="${UNPROCESSED_CARDS[$i]}"
        HASH="${UNPROCESSED_HASHES[$i]}"
        printf '  card: %s\n' "${CARD}" >&2
        printf '  mark processed: touch %s/.processed-%s\n' "${SPRINT_DIR}" "${HASH}" >&2
      done
      for i in "${!UNPARSEABLE_FILES[@]}"; do
        printf 'FLASHCARD GATE WARNING: unparseable flashcards_flagged block in %s — rewrite it as a "- \\"card\\"" list.\n' "${UNPARSEABLE_FILES[$i]}" >&2
      done
    else
      # Default: block Task spawn — diagnostic on stderr (real stderr, not log)
      printf 'FLASHCARD GATE BLOCKED: %d unprocessed flashcard(s) must be processed before spawning next Task.\n' \
        "${#UNPROCESSED_CARDS[@]}" >&2
      for i in "${!UNPROCESSED_CARDS[@]}"; do
        CARD="${UNPROCESSED_CARDS[$i]}"
        HASH="${UNPROCESSED_HASHES[$i]}"
        printf '  card: %s\n' "${CARD}" >&2
        printf '  mark processed: touch %s/.processed-%s\n' "${SPRINT_DIR}" "${HASH}" >&2
      done
      for i in "${!UNPARSEABLE_FILES[@]}"; do
        printf 'FLASHCARD GATE BLOCKED: unparseable flashcards_flagged block in %s — rewrite it as a "- \\"card\\"" list.\n' "${UNPARSEABLE_FILES[$i]}" >&2
      done
```

## flashcards_flagged

flashcards_flagged:
  - "2026-09-26 · #test-harness #tpv · Delta-row currentHash read from canonical passes at the red commit; refuse the baseline hash or pin a literal."
  - "2026-09-26 · #test-harness #tpv · 'Same exit with and without X' needs a twin run without X; two runs that both have X prove nothing."
  - "2026-09-26 · #hooks #flashcard-gate #tpv · Fail-closed test: mark the block's cards first, else an unmarked card blocks anyway and masks it."
  - "2026-09-26 · #doctor #drift · A pin regex without ^…$ lets a live hook with extra lines pass as pin-equal; anchor it, test appended text."
  - "2026-09-26 · #test-harness #host · Skip a both-absent delta row only for synthetic baselines (no tree/); a mis-keyed row must throw on real ones."

STATUS=done
