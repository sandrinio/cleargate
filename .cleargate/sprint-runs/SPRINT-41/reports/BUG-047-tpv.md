role: architect

# BUG-047 TPV report (live)

```
TPV: REJECTED
RESEAL_PATCH: reports/BUG-047-tpv-reseal.patch (also inline below)
RESEAL_SHA256: fda59c755350f752d9dbabf62a71ffc5503584eed2d3ee3e10ea71987216852e
RESEAL_SCOPE: 1 test file (test/lib/gate-cache-staleness.red.node.test.ts), +156/-17; git apply --check clean on <cw> cbb7248 (read-only check, <cw> status still clean); no src/scaffold/script/fixture/helper change
PLAN_AMENDMENT: "## Amendments to append to M7.md" below (TPV047-A1..A5)
COUNTS_AFTER_RESEAL: unchanged — 5 test() cases; at cbb7248 + re-seal: T1/T2/T5 red for the same reasons as the seal, T3/T4 green witnesses; D4 +5 → 3671 / 3669 (skips 2)
MUTANTS: sealed kills 12/22 non-equivalent; re-seal kills 22/22; 2 equivalent survivors (both need a hand-written cache)
INCIDENT: shared-scratchpad collision with the BUG-100 lane (see "Incident" below) — orchestrator action needed
```

## Verdict in one paragraph

The seal is wired correctly and it can be satisfied. Every import resolves (`gateCheckHandler` gate.ts:152, `stampHandler`, `sprintPreflightHandler` sprint.ts:1931, `parseFrontmatter`). No test imports the not-yet-existing `isGateCacheFresh`. The after-hook removes every temp dir, and the file name follows §Test Stack. A prototype that follows M7 §3 to the letter turns all 5 green, and the regression set is identical to base.

**T5 Case A conforms to §3; it does not over-reach.** §3 "Files / functions" pins `restoreIfOnlyTimestampMoved` (:1786) to restore "only when the **original** bytes' cache was fresh". §3 "Tests" names T5 as "a stale item keeps the advanced stamp, a fresh item is restored". E13 names the Step-0 recurrence it closes. QA-Red's note that the guard is "unconditional today" describes the defect the plan fixes, not a scope extension.

**The seal still does not pin what §3 pins.** 10 of 22 plausible wrong builds pass the sealed file and the whole existing suite:
- **The `>=` boundary** (M5, M9, M17, M18, M19). No fixture has `last_gate_check == updated_at`, yet that equality is the stamp-and-gate hook's normal output (stamp and gate in the same second). A `>` build would rewrite every hook-gated item once and then re-dirty main on the first post-BD preflight.
- **Check 5's sprint-plan staleness branch** (M21). It has no test anywhere: deleting sprint.ts:1709-1711 passes all 27 sprint-preflight tests. Yet it is exactly Codex recurrence 2 (`SPRINT-01 (stale)`) and the E13 remedy.
- **Pass-independence** (M12, M13, M25). The plan's freshness rule never reads `pass`, but every sealed fixture passes.
- **A stale verdict flip** (M11). A build that splices a new stamp onto the old verdict leaves a failing gate recorded as a fresh pass. T4 only flips a fresh item.

The re-seal adds sub-cases inside the existing 5 tests. It kills all 22, and the count stays at 5.

## Reproduced counts

Scratch root `/private/tmp/cg-s41-tpv047-20260927T085047` (deleted at the end): `git clone --no-hardlinks <cw>` at `cbb7248`, nested as `cleargate-cli/` in a `git archive` of the outer worktree `.worktrees/BUG-047` @ `7db0e89e`, `.claude` copied, `node_modules` symlinked, `npm run prebuild` + `npm run build` in scratch only. Without the outer nest, gate-unit, work-item-type-spike and 5 others fail on missing `<cli>/../.cleargate/**`, so the nest is required.

| Tree | T1 | T2 | T3 | T4 | T5 | Total |
|---|---|---|---|---|---|---|
| `cbb7248` sealed | red | red | green | green | red | 2/5 (= QA-Red) |
| sealed + M7 §3 prototype | green | green | green | green | green | 5/5 |
| `cbb7248` + re-seal | red | red | green | green | red | 2/5 |
| re-seal + prototype | green | green | green | green | green | 5/5 |

**Red reasons.** They are identical in the seal and the re-seal, and each is the intended one:
- T1: `expected last_gate_check (2026-01-01T01:00:00Z) >= updated_at (2026-01-01T02:00:00Z)`.
- T2: `1 !== 0` with `EPIC-047-02 (stale)` in the punch list.
- T5: `a stale item's Step-0 stamp advance must survive the restore guard` (actual equals the original bytes).

**Masking.** T5 Case B, and the re-seal's Cases C and D, cannot run at base because Case A throws first. Mutants M3, M4, M5 and M25 prove each later case is live once the fix lands.

`npm run typecheck` is clean on the prototype. Tests are outside `tsconfig` `include`, so the test casts are not type-checked. **Timing:** under load average ~30, the sealed file ran solo in 16.4 s and the re-sealed file in 24.7 s. When the host was idle, the sealed file took 3.2 s. The re-seal's T2 runs 3 preflights and its T5 runs 4.

## Check 1: plan conformance

| M7 §3 / bug §5 rule | Sealed test | Re-seal |
|---|---|---|
| gate → stamp → gate (same verdict) advances a stale cache (`last_gate_check >= updated_at`) | T1 (passing verdict) | T1 adds a **failing**-verdict half (freshness is pass-independent) |
| preflight Check 5 passes for a stamped-then-re-gated item | T2 (strict: re-gate at 03:00 > stamp 02:00) | T2 re-gates in the stamp's own second, so the item ends **at** the boundary. The plan fixture also sits at the boundary. |
| Check 5 plan site (`:1709`) uses the same freshness rule; E13 remedy `gate check <plan>` works | **none** (the plan site is untested anywhere) | T2 phase 2: stamp the plan → Check 5 prints `- SPRINT-01 (stale)`, exit 1 → `gate check <plan>` → exit 0. Step 0 is still not asked to refresh the plan (OD-M7-11 / FU-5). |
| CR-038 no-churn: two unedited gate checks leave a fresh item byte-identical | T3 (strictly fresh, passing) | T3 covers three shapes: strictly fresh, **boundary-fresh**, and **fresh-but-failing** (CR-038's original kickoff case, frontmatter-cache.ts:96-99) |
| a genuine verdict change writes both the verdict and a new stamp | T4 (fresh item) | T4 adds a flip back on a **stale** item (edit → stamp → gate): the new verdict, `failing_criteria: []`, and freshness |
| Step 0 restore guard: a stale item keeps the advance, a fresh one is restored | T5 A/B | T5 A pins the exact kept stamp. It adds C (a boundary-fresh item is restored) and D (a stale failing item keeps the stamp). |
| archived and terminal items stay skipped | sprint-preflight Scenarios 13 and 18 (the plan says existing) | unchanged |
| `isGateCacheFresh` is the single source at both Check 5 sites | not pinned | not pinned. It is equivalent on every writer-reachable state (M16/M22 below). QA-Verify checks it by code read. |
| Step 0 refreshes the plan | out of scope (OD-M7-11) | none, correctly |

**No sealed test asserts behavior that §3 does not require.**

## Check 2: satisfiable — prototype and regression witnesses

The prototype follows §3 verbatim: +31/-4 lines over two files, and `gate.ts` is unchanged.
- `frontmatter-cache.ts`: the export `isGateCacheFresh`, plus `&& isGateCacheFresh(existing, String(fm['updated_at'] ?? ''))` appended to the idempotency condition at :101-107.
- `sprint.ts`:
  - `:1665` and `:1709` become `!isGateCacheFresh(...)`;
  - `restoreIfOnlyTimestampMoved` keeps both of its guards, parses the **original** frontmatter, and restores only if `isGateCacheFresh`.

Regression set: every test file that references `restoreIfOnlyTimestampMoved`, `isGateCacheFresh` or `cached_gate_result` (found with `command grep -rl`), plus every importer of `writeCachedGate`, `gateCheckHandler` or `sprintPreflightHandler`. Each file ran solo, and dist was rebuilt for each tree.

| File | Base `cbb7248` | Prototype |
|---|---|---|
| commands/sprint-preflight | 27/27 | 27/27 |
| lib/frontmatter-cache | 11/11 | 11/11 |
| lib/frontmatter-writers.red | 30/30 | 30/30 |
| commands/gate-unit | 30/30 | 30/30 |
| commands/stamp | 10/10 | 10/10 |
| wiki/lint-checks-gate | 6/6 | 6/6 |
| commands/doctor | 40/40 | 40/40 |
| commands/doctor-session-start | 22/22 | 22/22 |
| lib/work-item-type-spike | 12/12 | 12/12 |
| integration/advisory-env-gate.red | 3/3 | 3/3 |
| scripts/close-sprint-assume-ack-guard | 20/20 | 20/20 |
| scripts/enforcement-section-13 | 11/11 | 11/11 |
| e2e/spidr-coverage.red.integration | 1/1 | 1/1 |
| e2e/frontmatter-authoring.red.integration | 9/9 | 9/9 |
| scripts/template-stubs.integration | 50/50 | 50/50 |
| commands/hotfix-new.integration | 7/9 | 7/9 (same 2: the meta-repo `wiki/index.md` has no "Hotfix Ledger"; pre-existing, unrelated) |
| scripts/template-sync-fields.integration | 16/20 | 16/20 (same 4: "live template … all 6 new keys" read the outer `.cleargate/templates`; pre-existing, unrelated) |

**Re-scope watch (§3).** No fixture flips:
- Scenario 20's 'stamp' fixture is fresh.
- Scenario 16 uses the 'success' behavior, which never writes.
- `frontmatter-cache.node.test.ts:216` and `frontmatter-writers.red.node.test.ts:413` carry no `updated_at`, so both are fresh via `updatedAt === ''`.

**cli main drift.** Since `f0c33f7`, cli `main` (`0e5b0ac`, -13 merged) has not touched `frontmatter-cache.ts`, `sprint.ts`, `gate.ts` or any witness file (`git diff --stat f0c33f7 main --` those paths is empty). Integration is a CHANGELOG keep-both only.

## Check 3: mutants (24 single-fault builds of the prototype)

"Existing" means a pre-existing suite file kills the mutant. Every file listed above was run for each mutant. The re-seal column is the re-sealed red file, plus the same existing kills, since those files are unchanged.

| Id | Wrong build | Sealed | Re-sealed |
|---|---|---|---|
| M1 | restore guard unconditional (today's code) | killed T5 | killed T5 |
| M2 | restore guard judges freshness from the **after** bytes | killed T5 | killed T5 |
| M3 | restore guard never restores | killed T5; existing S20 "timestamp-only rewrite is reverted" | killed |
| M4 | restore guard inverted | killed T5; existing S20 | killed |
| M5 | restore guard boundary `>` | **survived** | killed T5 C |
| M6 | `writeCachedGate` early return unconditional (today's code) | killed T1 T2 | killed |
| M7 | early return removed (fresh items churn) | killed T3; existing fw.red:413 | killed |
| M8 | freshness against `created_at` | killed T1 T2 | killed |
| M9 | `writeCachedGate` boundary `>` | **survived** | killed T3(b) |
| M10 | freshness of `newResult` instead of `existing` | killed T1 T2 | killed |
| M11 | stale: splice the new stamp onto the **old** verdict (a failing gate is left recorded as a fresh pass) | **survived** | killed T4 |
| M12 | early return only for passing verdicts (fresh failing items churn) | **survived** | killed T3(c) |
| M13 | stale failing items never advance | **survived** | killed T1 (failing half) |
| M14 | stale rewrite keeps the old `last_gate_check` | killed T1 T2 | killed T1 T2 T4 |
| M15 | empty `updated_at` counts as stale | killed, existing fw.red:413 only | killed, existing only |
| M16 | empty `last_gate_check` counts as fresh | survived (equivalent) | survived (equivalent) |
| M17 | `isGateCacheFresh` boundary `>` (all sites) | **survived** | killed T2 T3 T5 |
| M18 | Check 5 item site `<=` | **survived** | killed T2 |
| M19 | Check 5 plan site `<=` | **survived** | killed T2 |
| M20 | Check 5 item site never stale | killed, existing S11 "exit code is 1 … stale reason" and S16 | killed, existing |
| M21 | Check 5 plan site never stale | **survived; no test anywhere** | killed T2 phase 2 |
| M22 | Check 5 sites keep the inline comparison (no single source) | survived (equivalent) | survived (equivalent) |
| M23 | restore guard drops the verdict-equality check | killed, existing S20 "a genuine verdict change is NOT reverted" | killed, existing |
| M25 | restore guard reverts stale **failing** items | **survived** | killed T5 D |

**Totals:** sealed 12/22, re-sealed 22/22.

**Equivalence argument for M16 and M22.** Both differ from the plan only when a cache has `last_gate_check: ''` together with an equal verdict. No writer produces that state:
- `gate.ts:296` always passes `toIsoSecond(now)`.
- Template stubs carry `pass: null`. `readCachedGateSync` treats that as no cache (sprint.ts:1553). In `writeCachedGate`, `coerceCachedGate` turns the stub into `pass: false`, `[]`, which never equals a real verdict (fail implies non-empty criteria).

Only a hand-written `pass: true` cache without a stamp reaches the difference. Under the plan, Check 5 now calls that cache `stale`; see the brief.

**Sole killers to keep unmodified** (flashcard 273):
- `frontmatter-writers.red.node.test.ts:413`: M15 (and M7 alongside T3).
- sprint-preflight Scenario 11 and Scenario 16: M20.
- Scenario 20 "a genuine verdict change is NOT reverted": M23.

## Check 4: no accidental-detail pins

Every re-seal assertion is either a §3 or bug §5 rule, or a fixture guard on existing, unchanged code:
- `last_gate_check == updated_at` guards in T2. These depend on gate.ts:296 and stamp writing `toIsoSecond(now)`, and neither is in BUG-047's edit surface.
- `- SPRINT-01 (stale)`. This is today's punch-list bullet format (sprint.ts:1732-1733), and §3 keeps `reason = 'stale'`.
- `2026-12-31T23:59:59Z`. This is the mock's own write.
- `failing_criteria: []`. This is gate.ts's pass output.

Nothing pins:
- Step 0's `refreshed N` count, T5's exit codes, or Check 4;
- where `isGateCacheFresh` lives beyond the plan's named export;
- the comment wording.

The sealed file pins nothing beyond the plan either.

## Re-seal patch (test-only; QA-Red applies; unified diff against `cbb7248`)

Apply it from `<cw>` with `git apply reports/BUG-047-tpv-reseal.patch`, after checking sha256 `fda59c75…852e`. Commit subject: `qa-red(BUG-047): TPV re-seal — boundary, pass-independence, stale flip, plan-site staleness (5 tests, 3 red)`.

```diff
diff --git a/test/lib/gate-cache-staleness.red.node.test.ts b/test/lib/gate-cache-staleness.red.node.test.ts
index aaee055..3b43af2 100644
--- a/test/lib/gate-cache-staleness.red.node.test.ts
+++ b/test/lib/gate-cache-staleness.red.node.test.ts
@@ -82,7 +82,7 @@ const FAKE_VERSION: CodebaseVersion = {
   version_string: 'cleargate@0.0.0-test',
 };
 
-/** Minimal single-block gates doc: epic ready-for-decomposition. */
+/** Minimal gates doc: epic ready-for-decomposition, plus sprint ready-for-execution for T2's plan (one block per fence). */
 const GATES_DOC = `
 # Readiness Gates
 
@@ -96,6 +96,15 @@ const GATES_DOC = `
     - id: scope-populated
       check: "section(2) has ≥1 listed-item"
 \`\`\`
+
+\`\`\`yaml
+- work_item_type: sprint
+  transition: ready-for-execution
+  severity: enforcing
+  criteria:
+    - id: no-tbds
+      check: "body does not contain 'TBD'"
+\`\`\`
 `;
 
 /** A minimal Epic body that passes the gate above. */
@@ -135,6 +144,15 @@ function commitAll(dir: string, message: string): void {
   execSync(`git commit -m "${message}"`, { cwd: dir, stdio: 'pipe' });
 }
 
+/** Run `gate check`; a failing enforcing verdict exits 1, which is expected here. */
+async function gateCheckMayFail(absPath: string, dir: string, gatesDocPath: string, now: () => Date): Promise<void> {
+  try {
+    await gateCheckHandler(absPath, {}, { cwd: dir, now, gatesDocPath, stdout: noop, stderr: noop, exit: throwingExit });
+  } catch (err) {
+    assert.match(String((err as Error).message), /^exit\(1\)$/);
+  }
+}
+
 function makeCapture(): {
   stdout: (s: string) => void;
   stderr: (s: string) => void;
@@ -210,6 +228,28 @@ describe('T1 (BUG-047): gate check -> stamp -> gate check advances a stale cache
       cached.last_gate_check >= updatedAt,
       `BUG-047: expected last_gate_check (${cached.last_gate_check}) >= updated_at (${updatedAt}) after the second gate check`,
     );
+
+    // Same repro on a FAILING verdict. M7 §3: the early return needs an equal
+    // verdict AND a fresh cache; `pass` is not part of the freshness rule, so a
+    // stale failing item advances too (wiki lint's gate-stale reads this stamp).
+    const failPath = path.join(dir, 'EPIC-047-11_Test.md');
+    writeFile(
+      failPath,
+      epicBody('2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 'EPIC-047-11').replace('Intro text.', 'Intro text. TBD.'),
+    );
+    await gateCheckMayFail(failPath, dir, gatesDocPath, T1);
+    await stampHandler(failPath, {}, { cwd: dir, now: T2, stdout: noop, exit: throwingExit, getVersion: () => FAKE_VERSION });
+    await gateCheckMayFail(failPath, dir, gatesDocPath, T3);
+
+    const failFm = readFm(failPath);
+    const failCached = failFm['cached_gate_result'] as { pass: boolean; last_gate_check: string };
+    const failUpdatedAt = String(failFm['updated_at']);
+    assert.strictEqual(failUpdatedAt, '2026-01-01T02:00:00Z', 'fixture guard: stamp advanced updated_at');
+    assert.strictEqual(failCached.pass, false, 'the failing verdict never changed across this repro');
+    assert.ok(
+      failCached.last_gate_check >= failUpdatedAt,
+      `BUG-047: a stale FAILING item must advance too: last_gate_check (${failCached.last_gate_check}) >= updated_at (${failUpdatedAt})`,
+    );
   });
 });
 
@@ -223,11 +263,13 @@ async function buildStampedThenRegatedItem(dir: string): Promise<{ itemPath: str
 
   const T1 = () => new Date('2026-01-01T01:00:00.000Z');
   const T2 = () => new Date('2026-01-01T02:00:00.000Z');
-  const T3 = () => new Date('2026-01-01T03:00:00.000Z');
 
+  // The re-gate runs in the SAME second as the stamp — what the stamp-and-gate
+  // hook does on every edit — so the fixed item ends exactly at the freshness
+  // boundary (last_gate_check == updated_at), which M7 §3 defines as fresh (>=).
   await gateCheckHandler(itemPath, {}, { cwd: dir, now: T1, gatesDocPath, stdout: noop, stderr: noop, exit: throwingExit });
   await stampHandler(itemPath, {}, { cwd: dir, now: T2, stdout: noop, exit: throwingExit, getVersion: () => FAKE_VERSION });
-  await gateCheckHandler(itemPath, {}, { cwd: dir, now: T3, gatesDocPath, stdout: noop, stderr: noop, exit: throwingExit });
+  await gateCheckHandler(itemPath, {}, { cwd: dir, now: T2, gatesDocPath, stdout: noop, stderr: noop, exit: throwingExit });
 
   return { itemPath };
 }
@@ -237,9 +279,11 @@ describe('T2 (BUG-047): sprint preflight Check 5 passes for a stamped-then-re-ga
     const dir = makeTmpDir('cg-gcs-t2-');
     initGitRepo(dir);
 
-    await buildStampedThenRegatedItem(dir);
+    const { itemPath } = await buildStampedThenRegatedItem(dir);
 
     writeFile(path.join(dir, 'README.md'), '# fixture\n');
+    // The sprint plan also sits exactly at the boundary, so Check 5's plan
+    // self-check is held to the same >= rule as its item check.
     writeFile(
       path.join(dir, '.cleargate', 'delivery', 'pending-sync', 'SPRINT-01_Test_Sprint.md'),
       [
@@ -250,7 +294,8 @@ describe('T2 (BUG-047): sprint preflight Check 5 passes for a stamped-then-re-ga
         'cached_gate_result:',
         '  pass: true',
         '  failing_criteria: []',
-        '  last_gate_check: "2026-06-01T00:00:00Z"',
+        '  last_gate_check: "2026-01-01T00:00:00Z"',
+        '  transition: "ready-for-execution"',
         '---',
         '',
         '# SPRINT-01',
@@ -288,6 +333,39 @@ describe('T2 (BUG-047): sprint preflight Check 5 passes for a stamped-then-re-ga
       !cap.getErr().includes('EPIC-047-02'),
       `EPIC-047-02 must not appear in the failing punch list; stderr:\n${cap.getErr()}`,
     );
+    const fm = readFm(itemPath);
+    const cached = fm['cached_gate_result'] as { last_gate_check: string };
+    assert.strictEqual(
+      cached.last_gate_check,
+      String(fm['updated_at']),
+      'fixture guard: the re-gated item must sit exactly at the freshness boundary',
+    );
+
+    // Phase 2 — the sprint PLAN itself (BUG-047 Codex recurrence 2; M7 E13).
+    // After an edit (stamp) Check 5 names the plan stale; the punch list's own
+    // remedy, `gate check <plan>`, must then clear it. Step 0 does not refresh
+    // the plan (OD-M7-11 / FU-5), so the remedy is run by hand, as a user would.
+    const planPath = path.join(dir, '.cleargate', 'delivery', 'pending-sync', 'SPRINT-01_Test_Sprint.md');
+    const gatesDocPath = path.join(dir, '.cleargate', 'knowledge', 'readiness-gates.md');
+    const T5 = () => new Date('2026-01-01T05:00:00.000Z');
+    await stampHandler(planPath, {}, { cwd: dir, now: T5, stdout: noop, exit: throwingExit, getVersion: () => FAKE_VERSION });
+    commitAll(dir, 'fixture: T2 plan edited');
+    const capStale = makeCapture();
+    assert.strictEqual(
+      runPreflight('SPRINT-01', dir, capStale, execFn),
+      1,
+      `a stamped sprint plan must be reported stale; stderr:\n${capStale.getErr()}`,
+    );
+    assert.match(capStale.getErr(), /- SPRINT-01 \(stale\)/);
+
+    await gateCheckHandler(planPath, {}, { cwd: dir, now: T5, gatesDocPath, stdout: noop, stderr: noop, exit: throwingExit });
+    commitAll(dir, 'fixture: T2 plan re-gated');
+    const capFixed = makeCapture();
+    assert.strictEqual(
+      runPreflight('SPRINT-01', dir, capFixed, execFn),
+      0,
+      `BUG-047: gate check <plan> must clear the plan's staleness; stderr:\n${capFixed.getErr()}`,
+    );
   });
 });
 
@@ -296,26 +374,40 @@ describe('T2 (BUG-047): sprint preflight Check 5 passes for a stamped-then-re-ga
 describe('T3 (CR-038 regression): two gate checks with no edit leave a fresh item byte-identical', () => {
   test('a second, unedited gate check on an already-fresh item changes nothing', async () => {
     const dir = makeTmpDir('cg-gcs-t3-');
-    const absPath = path.join(dir, 'EPIC-047-03_Test.md');
     const gatesDocPath = path.join(dir, 'readiness-gates.md');
     writeFile(gatesDocPath, GATES_DOC);
-    writeFile(absPath, epicBody('2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 'EPIC-047-03'));
 
     const T1 = () => new Date('2026-01-01T01:00:00.000Z');
     const T2 = () => new Date('2026-01-01T02:00:00.000Z');
 
-    await gateCheckHandler(absPath, {}, { cwd: dir, now: T1, gatesDocPath, stdout: noop, stderr: noop, exit: throwingExit });
-    const afterFirst = fs.readFileSync(absPath, 'utf8');
-
-    // No stamp, no body edit: updated_at (T0) stays behind last_gate_check (T1) — fresh.
-    await gateCheckHandler(absPath, {}, { cwd: dir, now: T2, gatesDocPath, stdout: noop, stderr: noop, exit: throwingExit });
-    const afterSecond = fs.readFileSync(absPath, 'utf8');
-
-    assert.strictEqual(
-      afterSecond,
-      afterFirst,
-      'CR-038: an unedited, already-fresh item must not thrash last_gate_check on a repeat gate check',
-    );
+    // (a) strictly fresh: updated_at (T0) < last_gate_check (T1).
+    // (b) boundary-fresh: updated_at == last_gate_check (T1); M7 §3 pins >=.
+    // (c) fresh but FAILING: the CR-038 case (cached gate failures at kickoff).
+    const shapes = [
+      { id: 'EPIC-047-03', updatedAt: '2026-01-01T00:00:00Z', failing: false },
+      { id: 'EPIC-047-13', updatedAt: '2026-01-01T01:00:00Z', failing: false },
+      { id: 'EPIC-047-23', updatedAt: '2026-01-01T00:00:00Z', failing: true },
+    ];
+    for (const shape of shapes) {
+      const absPath = path.join(dir, `${shape.id}_Test.md`);
+      const body = epicBody('2026-01-01T00:00:00Z', shape.updatedAt, shape.id);
+      writeFile(absPath, shape.failing ? body.replace('Intro text.', 'Intro text. TBD.') : body);
+
+      await gateCheckMayFail(absPath, dir, gatesDocPath, T1);
+      const afterFirst = fs.readFileSync(absPath, 'utf8');
+      const cached = readFm(absPath)['cached_gate_result'] as { pass: boolean };
+      assert.strictEqual(cached.pass, !shape.failing, `fixture guard (${shape.id}): first verdict`);
+
+      // No stamp, no body edit: the cache stays fresh.
+      await gateCheckMayFail(absPath, dir, gatesDocPath, T2);
+      const afterSecond = fs.readFileSync(absPath, 'utf8');
+
+      assert.strictEqual(
+        afterSecond,
+        afterFirst,
+        `CR-038 (${shape.id}): an unedited, already-fresh item must not thrash last_gate_check on a repeat gate check`,
+      );
+    }
   });
 });
 
@@ -353,6 +445,23 @@ describe('T4 (CR-038 regression): a verdict flip on a fresh item writes both the
       after.last_gate_check > before.last_gate_check,
       `a genuine verdict change must also advance last_gate_check (before=${before.last_gate_check}, after=${after.last_gate_check})`,
     );
+
+    // Flip back on a STALE item (the real edit -> stamp -> gate order): the
+    // new verdict itself must be written, not just a newer stamp on the old one.
+    const T3 = () => new Date('2026-01-01T03:00:00.000Z');
+    const T4 = () => new Date('2026-01-01T04:00:00.000Z');
+    fs.writeFileSync(absPath, fs.readFileSync(absPath, 'utf8').replace('Intro text. TBD.', 'Intro text.'), 'utf8');
+    await stampHandler(absPath, {}, { cwd: dir, now: T3, stdout: noop, exit: throwingExit, getVersion: () => FAKE_VERSION });
+    await gateCheckHandler(absPath, {}, { cwd: dir, now: T4, gatesDocPath, stdout: noop, stderr: noop, exit: throwingExit });
+
+    const fm = readFm(absPath);
+    const back = fm['cached_gate_result'] as { pass: boolean; failing_criteria: unknown[]; last_gate_check: string };
+    assert.strictEqual(back.pass, true, 'the verdict flipped back to pass on a stale item must be written');
+    assert.deepStrictEqual(back.failing_criteria, [], 'the old failing criteria must be cleared');
+    assert.ok(
+      back.last_gate_check >= String(fm['updated_at']),
+      `the flipped-back verdict must be fresh (last_gate_check=${back.last_gate_check}, updated_at=${String(fm['updated_at'])})`,
+    );
   });
 });
 
@@ -451,6 +560,11 @@ describe('T5 (CR-038 + BUG-047): Step 0 restore guard — keep a stale advance,
       staleBefore,
       'BUG-047: a stale item’s Step-0 stamp advance must survive the restore guard',
     );
+    assert.strictEqual(
+      (readFm(staleItemPath)['cached_gate_result'] as { last_gate_check: string }).last_gate_check,
+      '2026-12-31T23:59:59Z',
+      'BUG-047: the surviving bytes carry the Step-0 stamp',
+    );
 
     // Case B — already FRESH before Step 0: the SAME timestamp-only
     // rewrite must still be reverted (CR-038 anti-thrash, unchanged by
@@ -470,5 +584,41 @@ describe('T5 (CR-038 + BUG-047): Step 0 restore guard — keep a stale advance,
       freshBefore,
       'CR-038: an already-fresh item’s timestamp-only rewrite must still be reverted',
     );
+
+    // Case C — FRESH exactly at the boundary (last_gate_check == updated_at,
+    // fresh per M7 §3's >=): still restored.
+    const edgeDir = makeTmpDir('cg-gcs-t5c-');
+    initGitRepo(edgeDir);
+    const { itemPath: edgeItemPath, before: edgeBefore } = buildSingleItemStep0Fixture(edgeDir, 'SPRINT-01', {
+      id: 'EPIC-047-07',
+      pass: true,
+      lastGateCheck: '2026-05-01T00:00:00Z',
+      updatedAt: '2026-05-01T00:00:00Z',
+    });
+    const cap3 = makeCapture();
+    runPreflight('SPRINT-01', edgeDir, cap3, makeStampMockExecFn('EPIC-047-07', edgeItemPath));
+    assert.strictEqual(
+      fs.readFileSync(edgeItemPath, 'utf8'),
+      edgeBefore,
+      'CR-038: a boundary-fresh item (last_gate_check == updated_at) must still be restored',
+    );
+
+    // Case D — STALE and FAILING: M7 §3's rule reads freshness only, not pass,
+    // so the Step-0 stamp survives here too.
+    const failDir = makeTmpDir('cg-gcs-t5d-');
+    initGitRepo(failDir);
+    const { itemPath: failItemPath } = buildSingleItemStep0Fixture(failDir, 'SPRINT-01', {
+      id: 'EPIC-047-08',
+      pass: false,
+      lastGateCheck: '2026-01-01T00:00:00Z',
+      updatedAt: '2026-05-01T00:00:00Z',
+    });
+    const cap4 = makeCapture();
+    runPreflight('SPRINT-01', failDir, cap4, makeStampMockExecFn('EPIC-047-08', failItemPath));
+    assert.strictEqual(
+      (readFm(failItemPath)['cached_gate_result'] as { last_gate_check: string }).last_gate_check,
+      '2026-12-31T23:59:59Z',
+      'BUG-047: a stale failing item keeps its Step-0 stamp too',
+    );
   });
 });
```

## Developer brief (binding with M7 §3 and TPV047-A1..A5)

**Files.** Edit only these:
- `src/lib/frontmatter-cache.ts`
- `src/commands/sprint.ts`
- `CHANGELOG.md` (`### Fixed` under `## Unreleased`)

Do not touch any of these:
- `gate.ts` (it already passes `now`, :296-305)
- `stamp-frontmatter.ts`
- the readiness predicates
- `wiki/lint-checks.ts` (its `<` rule at :428 already agrees with `>=` freshness)
- `refreshScopedGateCaches`' iteration (FU-5)
- the sealed tests

1. **`isGateCacheFresh`.** Export it from `frontmatter-cache.ts` with the signature `(cached: { last_gate_check: string } | null, updatedAt: string): boolean`. Its body is exactly `cached !== null && cached.last_gate_check !== '' && (updatedAt === '' || cached.last_gate_check >= updatedAt)`, a lexical ISO compare.
2. **`writeCachedGate` idempotency block (:100-109).** Append `&& isGateCacheFresh(existing, String(fm['updated_at'] ?? ''))`.
   - Use the **existing** cache and the file's `updated_at`; never `newResult` (M10) and never `created_at` (M8).
   - When the early return does not fire, write the full `newResult` as today. Never keep the old verdict with only a new stamp (M11).
   - `pass` plays no part in freshness (M12, M13).
   - Rewrite the comment at :93-99 to say that the skip applies only to a fresh cache.
3. **`sprint.ts`.**
   - Add `import { isGateCacheFresh } from '../lib/frontmatter-cache.js'`.
   - `:1665` becomes `} else if (!isGateCacheFresh(cachedGate, updatedAt)) {`.
   - `:1709` becomes `} else if (!isGateCacheFresh(sprintGate, sprintUpdatedAt)) {`.
   - Keep the reason string `'stale'` and the reason order (null → pass=false → stale).
4. **`restoreIfOnlyTimestampMoved` (:1786-1796).**
   - Keep `after === original → return` and the `withoutGateTimestamp` equality test (M23).
   - Then parse **`original`**, not `after` (M2): `{ fm } = parseFrontmatter(original)`. Derive the cached value as `{ last_gate_check: String(cgr.last_gate_check ?? '') }` if `cached_gate_result` is a mapping, else `null`.
   - Restore only when `isGateCacheFresh(cached, String(fm['updated_at'] ?? ''))`. This is pass-independent (M25) and treats the boundary as fresh (M5).
   - Keep the best-effort try/catch.
   - Update the Step-0 comment at :1852-1858 to say that only an already-fresh original is restored.
5. **Pinned consequences.** These are the contract, not defects:
   - A stale item's Step-0 refresh leaves the file modified, so Check 4 fails in that same run; commit, then re-run (§3 Gotchas).
   - Check 5 reports a hand-written `pass: true` cache with an empty or missing `last_gate_check` as `stale`. No writer can produce that state.
   - After BD, only strictly stale live items rewrite (R-5); items at the boundary do not.
6. **Verify.**
   - `npm run typecheck`.
   - `npm run test:file --` on each of these:
     - the re-sealed red file (5/5)
     - `test/commands/sprint-preflight.node.test.ts` (27/27)
     - `test/lib/frontmatter-cache.node.test.ts` (11/11)
     - `test/lib/frontmatter-writers.red.node.test.ts` (30/30)
     - `test/commands/gate-unit.node.test.ts` (30/30)
     - `test/commands/stamp.node.test.ts` (10/10)
     - `test/wiki/lint-checks-gate.node.test.ts` (6/6)
   - For QA-Verify, a code read confirms that both Check 5 sites call `isGateCacheFresh` (M22 is not test-visible).

## Amendments to append to M7.md

```markdown
## Amendments from TPV (BUG-047, 2026-09-27; role: architect; append-only)

- **TPV047-A1 — the `>=` boundary is load-bearing.** `last_gate_check == updated_at` is fresh at all four sites: the `writeCachedGate` early return, the Check 5 item site (`:1665`), the plan site (`:1709`) and `restoreIfOnlyTimestampMoved`. The stamp-and-gate hook writes both fields in the same second, so a `>` build rewrites every hook-gated item and re-dirties main on the first post-BD preflight. The re-seal pins the boundary in T2 (item and plan), T3(b) and T5 C.
- **TPV047-A2 — freshness is pass-independent.** A stale item with an unchanged **failing** verdict advances (`writeCachedGate`) and keeps its Step-0 stamp (restore guard). A fresh failing item stays byte-identical on a rerun, which is CR-038's original kickoff case. Re-seal: T1's failing half, T3(c), T5 D.
- **TPV047-A3 — stale verdict change and plan-site staleness.** A stale item whose verdict changes gets the new verdict written, not only a new stamp (T4, second half). The plan site's staleness had no test anywhere. T2 phase 2 pins the E13 remedy: stamp the plan → Check 5 `- SPRINT-01 (stale)` → `gate check <plan>` → exit 0. Step 0 still does not refresh the plan (OD-M7-11 / FU-5 unchanged).
- **TPV047-A4 — re-scope watch, sole killers.**
  - `test/lib/frontmatter-writers.red.node.test.ts:413` has no `updated_at`, so it is fresh via `updatedAt === ''`. It is the sole killer of an "empty `updated_at` is stale" build.
  - sprint-preflight Scenarios 11 and 16 are the sole killers of "item site never stale".
  - Scenario 20 "a genuine verdict change is NOT reverted" is the sole killer of "restore ignores the verdict comparison".
  - All three stay unmodified. BUG-047's count is unchanged: +5 (3671 / 3669).
- **TPV047-A5 — R-5 refinement.** After BUG-047's BD, only strictly stale live items (`last_gate_check < updated_at`) rewrite on their next gate; items at the boundary do not. Check 5 now reports a hand-written `pass: true` cache without a `last_gate_check` as `stale`; `gate check` clears it.
```

## Incident: shared-scratchpad collision with the BUG-100 lane (orchestrator action)

The session scratchpad `/private/tmp/claude-501/-Users-ssuladze-Documents-Dev-ClearGate/75d958ba-2473-408d-b4db-e15b774ad28f/scratchpad` is shared by concurrent agents.

**What happened.**
1. I kept my mutant script at `$SP/mutants.py`. At 13:58:12 another agent in the BUG-100 lane overwrote that path with its own `mutants.py`. That script's `CW` is the **BUG-100 worktree**, and its `restore()` copies `$SP/orig/{inject-codex-config.ts,codex.ts}` into it.
2. My later calls, 6 invocations between about 14:04 and 14:07, therefore ran that script.
   - It applied BUG-100 mutants M20, M23, M15 and then M20 again to `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-100/cleargate-cli/src/{init/inject-codex-config.ts,hosts/codex.ts}` and ran their red file.
   - Each invocation then restored those two files from the other agent's 13:58:12 `orig` snapshot.

**State now.** Both files byte-equal that snapshot; the last write was 14:06:40. BUG-100's worktree shows uncommitted `M CHANGELOG.md`, `M src/hosts/codex.ts` and `M src/init/inject-codex-config.ts` on `a15d8ce`.

**Risks.**
- Any edit made to those two files between 13:58:12 and 14:06:40 was reverted.
- Any BUG-100 mutant results measured around 14:03–14:07 may be corrupted.

**Action.**
- Have the BUG-100 agent confirm its working tree and re-run the mutants it measured in that window.
- Agents should namespace scratch files by item id, e.g. `$SP/<item>-<role>/`. My remaining steps used `$SP/bug047-tpv/`.

## Script Incidents

None. `run_script.sh` was not invoked; this TPV ran no sprint script.

## Probes executed

- Read-only in `<cw>` and in the outer checkout: `git log/show/status/diff`, `sed`, `command grep`, and `git apply --check` (no write).
- In scratch only: clone, archive, prebuild, build, typecheck, and test runs of the base, prototype, re-seal and 24 mutants.
- Scratch dir `/private/tmp/cg-s41-tpv047-20260927T085047` was deleted at the end.
- No codex binary, no harness, no `~/.codex`/`CODEX_HOME`/auth file, no commits.

```yaml
flashcards_flagged:
  - "2026-09-27 · #tpv #gate #cache · Gate freshness is >=: stamp-and-gate writes updated_at and last_gate_check in one second; pin equality."
  - "2026-09-27 · #tpv #preflight · Check 5's sprint-plan stale branch had no test: deleting it passed all 27 sprint-preflight tests."
  - "2026-09-27 · #test-harness #gate · loadGateBlocks unwraps [0] per yaml fence; a 2nd gate in the same fence is silently dropped."
  - "2026-09-27 · #tpv #test-harness · A same-inputs writeCachedGate rerun is byte-identical even if it writes; vary now to see churn."
  - "2026-09-27 · #tpv #danger · The session scratchpad is shared by parallel agents; a peer overwrote mutants.py. Namespace by item id."
```
