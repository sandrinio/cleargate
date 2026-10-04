role: architect

# BUG-100 TPV report — Codex sandbox writable root (SPRINT-41 M7)

```
TPV: REJECTED
RESEAL_PATCH: reports/BUG-100-tpv-reseal.patch (byte-identical copy embedded below)
RESEAL_SHA256: 98f8ede75bd376d246d6c275348fb67f5707545592a45b239c4de737c35d9b30
RESEAL_SCOPE: 1 test file (test/init/inject-codex-config-sandbox.red.node.test.ts), +184/-7; git apply --check clean on <cw> 608e529 (read-only check); no src/scaffold/helper/fixture change
PLAN_AMENDMENT: TPV100-A1..A5 (section "Amendments to append to M7.md"); A1 corrects a plan-internal contradiction (preflight placeholder root)
COUNTS_AFTER_RESEAL: file = 10 tests (8 red at 608e529 + re-seal, anchors T2 and T7). Default tier +10 for BUG-100 (plan +7, QA-Red +8)
MUTANTS: sealed kills 18/31, re-sealed kills 31/31 (0 equivalent)
```

## Verdict in one paragraph

The seal is wired correctly and satisfiable. All imports resolve. The local interfaces match the plan's signatures, and every red fails for the intended reason: an assertion, or `removeCodexWritableRoot is not a function`, never a fixture error. A minimal plan-conformant prototype (`inject-codex-config.ts` + `codex.ts`, +275/−19, built only in scratch) turns all 8 green, and every regression witness stays green. **The seal is too weak to reject wrong builds:** 13 of 31 plausible single-fault builds pass it. Each survivor breaks a pinned §3 BUG-100 rule that has no test:
- rule 2: keep an existing other `.git`; append only if absent; insert into a table without the key; append to a file without the table;
- rule 3: fail closed, and its "already holds the root" exception;
- rule 4: no extra line;
- rule 5: remove only `<root>`; keep the table while it has other keys; remove from a linked worktree;
- the preflight scan and the GIT_DIR gotcha.

Writing the preflight test exposed a **plan contradiction**. The plan's preflight placeholder root (`/__cleargate_preflight__/.git`) refuses an inline definition that already holds the real root, which makes rule 3's exception unreachable through `init` and `host add`. It also refuses a non-git install that the write would leave byte-identical (rule 4 / E12). TPV100-A1 fixes the plan. The re-seal is test-only, stays inside one file and pins nothing beyond the plan as amended. It kills all 31 mutants.

## Check 1 — plan conformance (M7 §3 BUG-100 rules vs sealed tests)

| # | Rule (M7 §3 BUG-100, E11, E12, OD-M7-6/7) | Sealed test at 608e529 | Gap (surviving mutant) | Re-seal |
|---|---|---|---|---|
| R1 | Owned root = realpath of `git rev-parse --git-common-dir` (main `.git`, covers `.worktrees/*`) | T1 (main checkout via `install()`), T5 (linked worktree) | none. The realpath kill relies on macOS `os.tmpdir()` being a `/var` → `/private/var` symlink (AV-1) | — |
| R2a | No `[sandbox_workspace_write]` → append the table | only greenfield (`existing === null`, T1/T5) | appending to an **existing** file without the table (`host add codex` onto a user's config) is untested (M31) | T3: file-without-table case (existing bytes stay a prefix) |
| R2b | Standard table without the key → insert the key | none | M24 (a second table is appended; the re-parse safety net throws) | T3: `network_access = true` table gains the key |
| R2c | Key present → keep every element, append `<root>` **if absent** | T3 (append) | duplicate `<root>` on re-init (M10) | T3: re-plan over the result is byte-identical, `'unchanged'` |
| R2d / OD-M7-7 | Stale = last segment `.git`, ≠ `<root>`, path missing → replaced; **existing other `.git` paths kept** | T4 (missing path replaced, `/opt/cache` kept) | existence check dropped, which deletes a user's real other-repo root (M07) | T4: adds an existing other repo's `.git` that must survive |
| R3 | Inline table / dotted keys → `CodexConfigError` naming the file, unless it already holds `<root>` | none | M21 (silently skipped), M22 (exception dropped) | new Test 8a |
| Pre | `assertCodexConfigParsable` runs the sandbox scan, so preflight refuses before any write | none | M20 (no scan); M23 (the plan-literal placeholder contradicts R3/R4) | new Test 8b + TPV100-A1 |
| R4 / E12 | Non-git cwd → no key, **no extra line**, bytes identical | T2 (bytes) | notice printed in non-git (M18) | T2: adapter `install()` in a non-git dir prints no `writable_roots` line |
| Gotcha | Resolver runs with `GIT_DIR` / `GIT_WORK_TREE` removed | none | M19. Real hazard, measured: a pre-commit hook in a **linked worktree** gets `GIT_DIR=<main>/.git/worktrees/<wt>` | T2: ambient `GIT_DIR`/`GIT_WORK_TREE` → still byte-identical; TPV100-A5 |
| R5 | Uninstall / host remove removes **only** `<root>`; key goes when the array empties; table goes when the table empties; `[features]` stays | T6a (root out, `/opt/cache` kept, emptied table removed, features kept), T6b (adapter wiring, main checkout) | removing every `.git` (M13); dropping a table that still has other keys (M14); `remove()` ignoring the resolver, which fails from a linked worktree (M30) | T6a: missing other `.git` kept, `network_access` table kept, no-op removal; T6b: linked-worktree `remove()` |
| Notice | Pinned text | T1 (`includes`, verbatim vs plan) | none | — |
| Claude | Plain `init --yes` writes no `.codex/`; Claude record unchanged | T7 (anchor) + M2 pair | none. The M2 pair in compare mode is 15/15 and 5/5 on the prototype | — |
| E11 | Scope: init, re-init, `host add` (→ `install`), uninstall/`host remove` (→ `remove`); upgrade out (FU-3) | T1 (`install`), T6b (`remove`) | none | — |

## Check 4 — no assertion pins an implementation accident (QA-Red's self-reported slip)

QA-Red read `inject-codex-config.ts` and `codex.ts` before sealing. I traced every sealed assertion to plan text:
- `writableRoot` `'added'`/`'replaced'` come from the pinned enum. The notice matches the §3 "Notice (pinned)" text character for character.
- `removeCodexWritableRoot(existing, root, file) → {next, removed}` is the pinned signature.
- The greenfield literal is E12. Removing the emptied table and keeping `[features]` is rule 5.
- The local `interface` declarations are erased types that mirror the §3 signatures.
- No assertion reads layout, table position, element order, stdout ordering or internal helper names. Tables are compared as parsed TOML.

**No accidental pins.** The re-seal keeps this property: the new multi-root checks compare sorted arrays, and the append case pins only "existing bytes stay a prefix".

Wiring checks (TPV contract §C.3.5):
1. Imports resolve: `../../src/init/inject-codex-config.js`, `../../src/hosts/codex.js`, `../helpers/scaffold-roots.js` (`composeCanonicalView`), `../helpers/init-fixture.js` (`runInitScenario`), `toml-eslint-parser`. Missing exports are dynamically imported inside each test, so a missing one fails only that test.
2. Signatures match: `createCodexAdapter(deps?)`, `install(InstallCtx)`, `remove(RemoveCtx)`, `preflight(cwd)` (`src/hosts/codex.ts:64-283`, `src/hosts/types.ts:45-109`).
3. No mocks.
4. No before-hooks. Temp dirs are not removed, which matches `codex-adapter.red` / `inject-codex-config.red` (AV-3).
5. Naming is `*.red.node.test.ts`.

## Check 2 — satisfiability (prototype in scratch)

Scratch: `/private/tmp/cg-s41-tpv100-20260927T084759Z` (removed at the end). `cli` = `git clone --no-hardlinks <cw>` at `608e529`, `node_modules` symlinked, `npm run prebuild` exit 0. `integ` = a clone of cli `main` `0e5b0ac` (STORY-058-13 merged) with the seal and the prototype applied, plus prebuild and build. `base` = `0e5b0ac` untouched. `npm run typecheck` exits 0 on every tree.

| Tree | red file | inject-codex-config.red | codex-adapter.red | init-codex.red | lifecycle-codex.red |
|---|---|---|---|---|---|
| 608e529 sealed, baseline src | 2/8 (T2, T7); 6 red, right reasons | 22/22 | 16/16 | 6/6 | 6/6 |
| 608e529 + prototype | **8/8** | 22/22 | 16/16 | 6/6 | 6/6 |
| + re-seal, baseline src | 2/10 (T2, T7); 8 red, right reasons (T8a/T8b: `Missing expected exception`) | — | — | — | — |
| + re-seal + prototype | **10/10** | 22/22 | 16/16 | 6/6 | 6/6 |
| `0e5b0ac` + seal + prototype (+ re-seal) | 8/8 (10/10) | — | — | — | — |

Other codex-touching files on the prototype, all green:
- `init-codex-sprint-execution` 3/3, `verify-install-codex` 9/9, `dispatch-mode` 2/2, `install-view` 12/12, `portable-skills` 6/6, `init-host-snapshot` 13/13, `init-fixture-cleanup` 3/3.
- On `integ`: `verify-install-codex-shape` 20/20.
- The M2 pair, run with `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline` in compare mode (no capture): `init-host-parity` 15/15, `claude-adapter-init-parity` 5/5.

**Full default tier, same-layout diff.** A standalone clone has no meta-repo parent, so 394 tests fail in both trees. These are ENOENT errors on `<clone-parent>/.cleargate/knowledge/cleargate-enforcement.md` (×34), `.cleargate/scripts/run_script.sh` (×20), `CLAUDE.md` (×14) and similar paths.

| Tree | tests | pass | fail | cancelled | skip |
|---|---|---|---|---|---|
| `base` 0e5b0ac | 3646 | 3215 | 394 | 28 | 9 |
| `integ` 0e5b0ac + seal + prototype | 3654 | 3223 | 394 | 28 | 9 |

The two failing sets are **identical** (437 `✖` lines; the `diff` is empty). The prototype adds 8 passes and no new failure.

**CLI smoke** (`integ` dist, fresh `git init` repo):
- `init --yes --host codex` exits 0. `.codex/config.toml` ends with `[sandbox_workspace_write]\nwritable_roots = ["<realpath>/.git"]`, equal to `realpath $(git rev-parse --git-common-dir)`. The notice prints as the 5th `Codex:` line.
- Re-init leaves the file byte-identical (sha `594c7564…` before and after) and prints `.codex/config.toml unchanged`.
- `verify-install --json` passes all 8 `codex.*` ids. That is the §5 BD row's witness.

## Check 3 — mutants (single-fault variants of the prototype)

| # | Mutant | Rule | Sealed | Re-sealed (killed by) |
|---|---|---|---|---|
| M01 | resolver returns raw `.git` (relative) | R1 | killed (T1, T6b) | killed (T1, T6b, T8b) |
| M02 | no `realpathSync` | R1 | killed (T1, T6b) | killed (T1, T6b, T8b) |
| M03 | `--git-dir` instead of `--git-common-dir` | R1 | killed (T5) | killed (T5, T6b) |
| M04 | worktree `toplevel/.git` (a file) | R1 | killed (T5) | killed (T5, T6b) |
| M05 | non-git falls back to `cwd/.git` | R4 | killed (T2) | killed (T2, T8b) |
| M06 | merge drops user roots | R2c | killed (T3, T4) | killed (T3, T4) |
| M07 | stale rule ignores existence | R2d | **survives** | killed (T4) |
| M08 | stale rule ignores the `.git` suffix | R2d | killed (T3, T4)¹ | killed (T3, T4)¹ |
| M09 | no stale replacement | R2d | killed (T4) | killed (T4) |
| M10 | duplicate append when root present | R2c | **survives** | killed (T3) |
| M11 | `replaced` reported as `added` | enum | killed (T4) | killed (T4) |
| M12 | uninstall drops the whole key | R5 | killed (T6a, T6b) | killed (T6a, T6b) |
| M13 | uninstall drops every `.git` root | R5 | **survives** | killed (T6a) |
| M14 | uninstall drops a table that has other keys | R5 | **survives** | killed (T6a) |
| M15 | `remove()` not wired | R5 | killed (T6b) | killed (T6b) |
| M16 | `remove()` root without realpath | R5 | killed (T6b) | killed (T6b) |
| M17 | notice missing | Notice | killed (T1) | killed (T1) |
| M18 | notice printed in non-git too | R4 | **survives** | killed (T2) |
| M19 | resolver keeps ambient `GIT_DIR` | Gotcha | **survives** | killed (T2) |
| M20 | preflight skips the sandbox scan | Pre | **survives** | killed (T8b) |
| M21 | inline table silently skipped | R3 | **survives** | killed (T8a, T8b) |
| M22 | inline table holding root still throws | R3 | **survives** | killed (T8a, T8b) |
| M23 | preflight uses the plan-literal placeholder | Pre / A1 | **survives** | killed (T8b) |
| M24 | table-without-key appends a 2nd table | R2b | **survives** | killed (T3) |
| M25 | uninstall leaves `writable_roots = []` | R5 | killed (T6a) | killed (T6a) |
| M26 | greenfield ignores the root | R2a | killed (T1, T5) | killed (T1, T5) |
| M27 | rev-parse output resolved against `process.cwd()` | R1 | killed (T1, T6b) | killed (T1, T6b, T8b) |
| M28 | existing-file path ignores `opts` | R2 | killed (T3, T4) | killed (T3, T4, T8a, T8b) |
| M29 | `added` reported as `unchanged` | enum | killed (T3) | killed (T3) |
| M30 | `remove()` ignores the resolver (`realpath(cwd)/.git` only) | R5 | **survives** | killed (T6b) |
| M31 | existing file without the table gains nothing | R2a | **survives** | killed (T3) |

**Sealed: 18/31 killed. Re-sealed: 31/31 killed.** No equivalent mutants.

¹ The kill depends on `/opt/cache` being absent on the machine (measured absent; AV-2).

## Advisory (non-blocking)

- **AV-1.** The M02/M16 realpath kills depend on the macOS tmpdir symlink. The cli has no `.github/workflows`, so every run is on macOS today. A Linux runner would need a symlinked-cwd fixture.
- **AV-2.** The M08 kill assumes `/opt/cache` does not exist on the test machine.
- **AV-3.** Temp dirs are never removed. That matches the sibling files, and there is no before-hook state, so it is not a wiring gap.
- **AV-4.** QA-Red's report says `BASELINE_FAIL: 6` and `+8`. After the re-seal both are 8 red and 10 tests.
- **AV-5.** The plan's `injectCodexConfig(..., { resolveGitCommonDir })` seam is declared and unused by the tests. That is harmless: the real-git tests are stronger.

## Re-seal patch (test-only; unified diff against `608e529`)

Apply with `git apply reports/BUG-100-tpv-reseal.patch` in `<cw>`, or extract it from this block between the ` ```diff ` fence and its closing fence (the file copy is byte-identical).

```diff
diff --git a/test/init/inject-codex-config-sandbox.red.node.test.ts b/test/init/inject-codex-config-sandbox.red.node.test.ts
index ec6b30e..1e4f4dc 100644
--- a/test/init/inject-codex-config-sandbox.red.node.test.ts
+++ b/test/init/inject-codex-config-sandbox.red.node.test.ts
@@ -20,7 +20,15 @@
  * holds today (the feature does not exist, so nothing about the guarded
  * path has changed yet) and MUST continue to hold after the fix — see E12
  * (non-git byte-identity) and the "Claude install is unchanged" Gherkin.
- * Tests 1, 3, 4, 5 and 6 fail today for the reason noted in each block.
+ * Tests 1, 3, 4, 5, 6 and 8 fail today for the reason noted in each block.
+ *
+ * TPV re-seal (BUG-100-tpv.md, 2026-09-27): Test 2 adds the ambient-GIT_DIR
+ * and no-notice checks (plan Gotchas + rule 4); Test 3 adds the no-op
+ * re-plan, the table-without-key insert and the file-without-table append
+ * (rule 2); Test 4 adds an existing other .git root that must survive
+ * (rule 2); Test 6 adds a missing other .git root, a table that keeps other
+ * keys, the no-op removal (rule 5) and a linked-worktree remove(); Test 8 is
+ * new (rule 3 + the preflight scan, M7 amendment TPV100-A1).
  *
  * Payloads come from `composeCanonicalView` (M5-A18) — never the
  * gitignored `templates/scaffold/**` prebuild output.
@@ -85,6 +93,7 @@ interface PlanCodexConfigResult {
 }
 
 interface InjectCodexConfigSandboxModule {
+  CodexConfigError: new (message: string, file: string) => Error & { file: string };
   planCodexConfig: (
     existing: string | null,
     pinVersion: string,
@@ -110,6 +119,13 @@ async function loadInjectModule(): Promise<InjectCodexConfigSandboxModule> {
 interface CodexAdapterLike {
   install: (ctx: unknown) => Promise<void>;
   remove: (ctx: unknown) => Promise<{ removed: readonly string[] }>;
+  preflight: (cwd: string) => void;
+}
+
+/** A CodexConfigError naming `file` (checked by name + file, not module identity). */
+function isCodexConfigErrorFor(file: string): (e: unknown) => boolean {
+  return (e: unknown) =>
+    e instanceof Error && e.name === 'CodexConfigError' && (e as Error & { file?: string }).file === file;
 }
 
 async function loadCodexAdapter(): Promise<{ createCodexAdapter: (deps?: Record<string, unknown>) => CodexAdapterLike }> {
@@ -219,7 +235,7 @@ describe('Test 1 — a fresh Codex install writes the git common dir as a writab
 // git-detection logic leaks a key into a non-git install.
 
 describe('[ANCHOR] Test 2 — a non-git cwd is byte-identical to today\'s greenfield literal', () => {
-  test('injectCodexConfig on a plain (non-git) tmp dir writes exactly the pre-BUG-100 literal', async () => {
+  test('injectCodexConfig on a plain (non-git) tmp dir writes exactly the pre-BUG-100 literal, even under an ambient GIT_DIR, and install() prints no notice', async () => {
     const { injectCodexConfig } = await loadInjectModule();
     const cwd = mkTmp('cg-s41-100-nongit-');
     const result = injectCodexConfig(cwd, FIXED_PIN);
@@ -231,6 +247,42 @@ describe('[ANCHOR] Test 2 — a non-git cwd is byte-identical to today\'s greenf
       greenfieldTomlNoRoot(FIXED_PIN),
       'a non-git cwd must never gain a [sandbox_workspace_write] table (E12)',
     );
+
+    // Plan §3 BUG-100 Gotchas: the resolver runs with GIT_DIR / GIT_WORK_TREE
+    // removed from its env. A pre-commit hook in a linked worktree exports
+    // GIT_DIR (measured by TPV), so an ambient value pointing at another repo
+    // must never turn a non-git cwd into a key.
+    const otherRepo = mkTmp('cg-s41-100-nongit-ambient-repo-');
+    initGitRepo(otherRepo);
+    commitAllowEmpty(otherRepo, 'init');
+    const cwd2 = mkTmp('cg-s41-100-nongit-ambient-');
+    const prevGitDir = process.env.GIT_DIR;
+    const prevWorkTree = process.env.GIT_WORK_TREE;
+    process.env.GIT_DIR = path.join(otherRepo, '.git');
+    process.env.GIT_WORK_TREE = otherRepo;
+    try {
+      injectCodexConfig(cwd2, FIXED_PIN);
+    } finally {
+      if (prevGitDir === undefined) delete process.env.GIT_DIR;
+      else process.env.GIT_DIR = prevGitDir;
+      if (prevWorkTree === undefined) delete process.env.GIT_WORK_TREE;
+      else process.env.GIT_WORK_TREE = prevWorkTree;
+    }
+    assert.equal(
+      fs.readFileSync(path.join(cwd2, '.codex', 'config.toml'), 'utf8'),
+      greenfieldTomlNoRoot(FIXED_PIN),
+      'an ambient GIT_DIR / GIT_WORK_TREE must not reach the git common-dir resolver',
+    );
+
+    // Rule 4: a non-git install prints no extra line either.
+    const { createCodexAdapter } = await loadCodexAdapter();
+    const payloadDir = await getCodexPayloadDir();
+    const cwd3 = mkTmp('cg-s41-100-nongit-adapter-');
+    const stdoutLines: string[] = [];
+    await createCodexAdapter().install(makeCtx(cwd3, payloadDir, { stdout: (s: string) => stdoutLines.push(s) }));
+    const joined = stdoutLines.join('');
+    assert.ok(!joined.includes('writable_roots'), `a non-git install must print no writable-root notice; got:\n${joined}`);
+    assert.equal(fs.readFileSync(path.join(cwd3, '.codex', 'config.toml'), 'utf8'), greenfieldTomlNoRoot(FIXED_PIN));
   });
 });
 
@@ -240,7 +292,7 @@ describe('[ANCHOR] Test 2 — a non-git cwd is byte-identical to today\'s greenf
 // root is never added and result.writableRoot is undefined, not 'added'.
 
 describe('Test 3 — merging into an existing [sandbox_workspace_write] table keeps a user-added root', () => {
-  test('a user root "/opt/cache" survives when the ClearGate root is added', async () => {
+  test('a user root "/opt/cache" survives when the ClearGate root is added; a re-plan is a no-op; a table without the key, or a file without the table, gains it', async () => {
     const { planCodexConfig } = await loadInjectModule();
     const existing =
       '[sandbox_workspace_write]\n' + 'writable_roots = ["/opt/cache"]\n' + '\n' + greenfieldTomlNoRoot(FIXED_PIN);
@@ -253,6 +305,31 @@ describe('Test 3 — merging into an existing [sandbox_workspace_write] table ke
     assert.ok(roots!.includes('/opt/cache'), `the user root must survive; got ${JSON.stringify(roots)}`);
     assert.ok(roots!.includes(newRoot), `the ClearGate root must be added; got ${JSON.stringify(roots)}`);
     assert.equal(result.writableRoot, 'added');
+
+    // Rule 2 "append <root> if absent": re-planning over the result with the
+    // same root changes nothing (no duplicate root on re-init).
+    const again = planCodexConfig(result.next, FIXED_PIN, '/tmp/fake/.codex/config.toml', { writableRoot: newRoot });
+    assert.equal(again.next, result.next, 're-planning with the same root must not change a byte');
+    assert.equal(again.action, 'unchanged');
+    assert.equal(again.writableRoot, 'unchanged');
+
+    // Rule 2 "a standard table without the key -> insert the key": the
+    // table's other keys survive and no second table is appended.
+    const noKey = '[sandbox_workspace_write]\n' + 'network_access = true\n' + '\n' + greenfieldTomlNoRoot(FIXED_PIN);
+    const inserted = planCodexConfig(noKey, FIXED_PIN, '/tmp/fake/.codex/config.toml', { writableRoot: newRoot });
+    const parsedInserted = await parsedToml(inserted.next);
+    assert.deepEqual(parsedInserted.sandbox_workspace_write, { network_access: true, writable_roots: [newRoot] });
+    assert.equal(inserted.writableRoot, 'added');
+
+    // Rule 2 "no [sandbox_workspace_write] -> append the table": an existing
+    // file without it (host add codex onto a user's config) keeps its bytes as
+    // a prefix and gains the table.
+    const withoutTable = greenfieldTomlNoRoot(FIXED_PIN);
+    const appended = planCodexConfig(withoutTable, FIXED_PIN, '/tmp/fake/.codex/config.toml', { writableRoot: newRoot });
+    assert.ok(appended.next.startsWith(withoutTable), `the existing bytes must stay a prefix; got:\n${appended.next}`);
+    assert.deepEqual(await readWritableRoots(appended.next), [newRoot]);
+    assert.equal(appended.action, 'updated');
+    assert.equal(appended.writableRoot, 'added');
   });
 });
 
@@ -272,9 +349,15 @@ describe('Test 4 — re-init after the repository moved replaces only the stale
     const staleRoot = path.join(staleParent, 'gone-repo', '.git'); // deliberately never created
     assert.equal(fs.existsSync(staleRoot), false, 'the stale fixture path must not exist on disk');
 
+    // Rule 2: "Existing other .git paths are kept" — only a MISSING one is stale.
+    const otherRepo = mkTmp('cg-s41-100-moved-otherrepo-');
+    initGitRepo(otherRepo);
+    const otherGit = gitCommonDirRealpath(otherRepo);
+    assert.equal(fs.existsSync(otherGit), true, 'the other .git fixture must exist on disk');
+
     const existing =
       '[sandbox_workspace_write]\n' +
-      `writable_roots = ["${staleRoot}", "/opt/cache"]\n` +
+      `writable_roots = ["${staleRoot}", "${otherGit}", "/opt/cache"]\n` +
       '\n' +
       greenfieldTomlNoRoot(FIXED_PIN);
     const result = planCodexConfig(existing, FIXED_PIN, '/tmp/fake/.codex/config.toml', {
@@ -285,6 +368,7 @@ describe('Test 4 — re-init after the repository moved replaces only the stale
     assert.ok(!roots!.includes(staleRoot), `the stale root must be dropped; got ${JSON.stringify(roots)}`);
     assert.ok(roots!.includes(newRoot), `the new git common dir must be present; got ${JSON.stringify(roots)}`);
     assert.ok(roots!.includes('/opt/cache'), `the user root must survive; got ${JSON.stringify(roots)}`);
+    assert.ok(roots!.includes(otherGit), `an existing other .git root must survive; got ${JSON.stringify(roots)}`);
     assert.equal(result.writableRoot, 'replaced');
   });
 });
@@ -331,21 +415,44 @@ describe("Test 5 — a linked worktree writes the MAIN repository's .git as the
 // second sub-test's deepEqual fails — the ClearGate root is still present).
 
 describe('Test 6 — uninstall / host remove drops only the ClearGate-owned root', () => {
-  test('removeCodexWritableRoot removes only the named root, keeps a user root, and empties the table when nothing is left', async () => {
+  test('removeCodexWritableRoot removes only the named root, keeps user roots and other keys, and empties the table when nothing is left', async () => {
     const { removeCodexWritableRoot } = await loadInjectModule();
     const clearGateRoot = '/repo/real/.git';
     const file = '/tmp/fake/.codex/config.toml';
+    // Another .git root that does not exist on disk: uninstall removes ONLY <root> (rule 5),
+    // never another .git path and never a "stale" one.
+    const otherGit = '/cg-s41-100-nonexistent/other-repo/.git';
 
     const withUserRoot =
       '[sandbox_workspace_write]\n' +
-      `writable_roots = ["${clearGateRoot}", "/opt/cache"]\n` +
+      `writable_roots = ["${clearGateRoot}", "${otherGit}", "/opt/cache"]\n` +
       '\n' +
       '[features]\n' +
       'hooks = true\n';
     const r1 = removeCodexWritableRoot(withUserRoot, clearGateRoot, file);
     assert.equal(r1.removed, true);
     const roots1 = await readWritableRoots(r1.next);
-    assert.deepEqual(roots1, ['/opt/cache']);
+    assert.deepEqual([...(roots1 ?? [])].sort(), [otherGit, '/opt/cache'].sort());
+
+    // Rule 5: the key goes when its array empties; the table stays while it holds other keys.
+    const withOtherKey =
+      '[sandbox_workspace_write]\n' +
+      `writable_roots = ["${clearGateRoot}"]\n` +
+      'network_access = true\n' +
+      '\n' +
+      '[features]\n' +
+      'hooks = true\n';
+    const r3 = removeCodexWritableRoot(withOtherKey, clearGateRoot, file);
+    assert.equal(r3.removed, true);
+    const parsed3 = await parsedToml(r3.next);
+    assert.deepEqual(parsed3.sandbox_workspace_write, { network_access: true });
+    assert.deepEqual(parsed3.features, { hooks: true });
+
+    // Nothing to remove -> removed: false, bytes unchanged.
+    const noTable = '[features]\nhooks = true\n';
+    const r0 = removeCodexWritableRoot(noTable, clearGateRoot, file);
+    assert.equal(r0.removed, false);
+    assert.equal(r0.next, noTable);
 
     const onlyClearGateRoot =
       '[sandbox_workspace_write]\n' + `writable_roots = ["${clearGateRoot}"]\n` + '\n' + '[features]\nhooks = true\n';
@@ -376,6 +483,76 @@ describe('Test 6 — uninstall / host remove drops only the ClearGate-owned root
     const after = fs.readFileSync(configPath, 'utf8');
     const roots = await readWritableRoots(after);
     assert.deepEqual(roots, ['/opt/cache'], `expected only the user root to remain; got:\n${after}`);
+
+    // remove() from a linked worktree resolves the same common dir (plan: realpath of the
+    // git common dir first; realpath(cwd)/.git is only the non-git fallback).
+    const wtParent = mkTmp('cg-s41-100-remove-wt-parent-');
+    const wt = path.join(wtParent, 'linked');
+    git(cwd, ['worktree', 'add', wt, '-b', 'cg-s41-100-remove-wt-branch']);
+    fs.mkdirSync(path.join(wt, '.codex'), { recursive: true });
+    const wtConfig = path.join(wt, '.codex', 'config.toml');
+    fs.writeFileSync(
+      wtConfig,
+      '[sandbox_workspace_write]\n' + `writable_roots = ["${clearGateRoot}", "/opt/cache"]\n` + '\n' + greenfieldTomlNoRoot(FIXED_PIN),
+    );
+    await createCodexAdapter().remove({ cwd: wt, stdout: () => {}, stderr: () => {} });
+    const wtAfter = fs.readFileSync(wtConfig, 'utf8');
+    assert.deepEqual(await readWritableRoots(wtAfter), ['/opt/cache'], `linked-worktree remove(); got:\n${wtAfter}`);
+  });
+});
+
+// ── Test 8: rule 3 fail-closed shapes, in the planner and in preflight ──────
+// FAILS TODAY: the planner ignores [sandbox_workspace_write] entirely (no
+// throw on an inline table, no `writableRoot` field), and preflight never
+// scans the sandbox key. M7 amendment TPV100-A1: preflight resolves the real
+// root the same way the write does (no placeholder), so it refuses exactly
+// what the write refuses and never scans in a non-git cwd.
+
+describe('Test 8 — an inline-table or dotted-key sandbox definition fails closed unless it already holds the root', () => {
+  test('planCodexConfig throws CodexConfigError naming the file; a definition that holds the root is left alone; no root means no scan', async () => {
+    const { planCodexConfig } = await loadInjectModule();
+    const file = '/tmp/fake/.codex/config.toml';
+    const root = '/repo/real/.git';
+    const inline = 'sandbox_workspace_write = { writable_roots = ["/opt/cache"] }\n' + '\n' + greenfieldTomlNoRoot(FIXED_PIN);
+    const dotted = 'sandbox_workspace_write.writable_roots = ["/opt/cache"]\n' + '\n' + greenfieldTomlNoRoot(FIXED_PIN);
+    for (const text of [inline, dotted]) {
+      assert.throws(() => planCodexConfig(text, FIXED_PIN, file, { writableRoot: root }), isCodexConfigErrorFor(file));
+    }
+
+    const holds = `sandbox_workspace_write = { writable_roots = ["${root}"] }\n` + '\n' + greenfieldTomlNoRoot(FIXED_PIN);
+    const ok = planCodexConfig(holds, FIXED_PIN, file, { writableRoot: root });
+    assert.equal(ok.next, holds);
+    assert.equal(ok.writableRoot, 'unchanged');
+
+    // Rule 4: without a root (non-git) the sandbox key is never scanned.
+    const noRoot = planCodexConfig(inline, FIXED_PIN, file);
+    assert.equal(noRoot.next, inline);
+    assert.equal(noRoot.writableRoot, 'none');
+  });
+
+  test('the adapter preflight refuses the same shape before any write in a git repo, and passes when the root is held or the cwd is not a repo', async () => {
+    const { createCodexAdapter } = await loadCodexAdapter();
+    const adapter = createCodexAdapter();
+    const lacking = 'sandbox_workspace_write = { writable_roots = ["/opt/cache"] }\n';
+
+    const repo = mkTmp('cg-s41-100-preflight-git-');
+    initGitRepo(repo);
+    commitAllowEmpty(repo, 'init');
+    const root = gitCommonDirRealpath(repo);
+    const file = path.join(repo, '.codex', 'config.toml');
+    fs.mkdirSync(path.dirname(file), { recursive: true });
+    fs.writeFileSync(file, lacking);
+    assert.throws(() => adapter.preflight(repo), isCodexConfigErrorFor(file));
+    assert.equal(fs.readFileSync(file, 'utf8'), lacking, 'preflight must not write');
+
+    const holding = `sandbox_workspace_write = { writable_roots = ["${root}"] }\n`;
+    fs.writeFileSync(file, holding);
+    assert.doesNotThrow(() => adapter.preflight(repo), 'a definition that already holds this clone\'s root passes, as the write does');
+
+    const plain = mkTmp('cg-s41-100-preflight-nongit-');
+    fs.mkdirSync(path.join(plain, '.codex'), { recursive: true });
+    fs.writeFileSync(path.join(plain, '.codex', 'config.toml'), lacking);
+    assert.doesNotThrow(() => adapter.preflight(plain), 'a non-git cwd never scans the sandbox key (rule 4)');
   });
 });
 
```

## Developer brief (binding with M7 §3 BUG-100 as amended by TPV100-A1..A5)

**Files (only these):** `src/init/inject-codex-config.ts`, `src/hosts/codex.ts`, and a `CHANGELOG.md` `### Fixed` line. Do not touch `src/commands/verify-install.ts` (FU-1), `scripts/clean-room/**` (FU-2), `src/commands/upgrade.ts` (FU-3), any Claude writer, or any test. QA-Red owns the re-seal.

**`src/init/inject-codex-config.ts`**
1. `export function resolveGitCommonDir(cwd: string): string | null` (new export; `codex.ts` uses it).
   - Runs `spawnSync('git', ['-C', cwd, 'rev-parse', '--git-common-dir'])` with `GIT_DIR`, `GIT_WORK_TREE` and `GIT_COMMON_DIR` deleted from a copy of `process.env`, and stderr ignored.
   - A non-zero exit or empty stdout returns `null`.
   - Otherwise returns `fs.realpathSync(path.resolve(cwd, out))`; a realpath failure returns `null`.
   - Pinned by T1, T2 (ambient `GIT_DIR`), T5 and T6b.
2. `PlanCodexConfigResult` gains `writableRoot: 'added' | 'replaced' | 'unchanged' | 'none'`. `planCodexConfig(existing, pinVersion, file, opts: { writableRoot?: string | null } = {})`; the first three parameters are unchanged (C1 frozen).
   - **root null/absent:** no sandbox scan at all, output byte-identical to today, `'none'` (T2, T8a).
   - **greenfield + root:** `greenfieldToml(pin) + '\n' + '[sandbox_workspace_write]\nwritable_roots = ["<root>"]\n'`, `'added'` (T1, T5). The non-git prefix stays exactly today's literal.
   - **existing file, no table:** append the table as a third piece of the existing append chunk (after `[features]` and MCP, blank-line separated). Existing bytes stay a prefix. `'added'` (T3).
   - **standard table without the key:** insert `\nwritable_roots = ["<root>"]` at `table.range[1]` (flashcard 179: the range excludes the newline). Other keys survive. `'added'` (T3).
   - **key present:** it must be a single-segment key with a `TOMLArray` of strings, else `CodexConfigError` naming the file. Apply TPV100-A2 (stale rule, outcome labels) and rewrite only the array value range. If `<root>` is present and nothing is stale, make no edit and return `'unchanged'` (T3 re-plan).
   - **top-level key `sandbox_workspace_write` (inline table or dotted keys), or a non-standard/sub-table/array-of-tables whose resolved key starts with it:** throw `CodexConfigError` naming the file, unless the static `writable_roots` already includes `<root>`. In that case make no edit and return `'unchanged'` (T8a).
   - Keep the re-parse safety net. `JSON.stringify(path)` is a valid TOML basic string for these paths.
3. `injectCodexConfig(cwd, pin, opts: { resolveGitCommonDir?: (cwd) => string | null } = {})` resolves the root with `opts.resolveGitCommonDir ?? resolveGitCommonDir` and passes it to the planner. It returns `{ action, flippedHooksFlag, writableRoot, root }`; the last two fields are additive, and existing callers read only the first two.
4. `assertCodexConfigParsable(cwd, opts = {})` resolves the root the same way and calls `planCodexConfig(existing, '0.0.0', file, { writableRoot: root })`. **No placeholder root** (TPV100-A1; T8b).
5. `export function removeCodexWritableRoot(existing, root, file): { next, removed }`.
   - Removes only elements `=== root` (T6a).
   - Kept elements non-empty → rewrite the array.
   - Emptied and the table has other key-values → remove that key-value plus its trailing `\n` (T6a `network_access`).
   - Emptied and it was the table's only key-value → remove the table plus up to two trailing `\n` (T6a).
   - No table, no key, or root absent → `{ next: existing, removed: false }` (T6a).
   - An inline/dotted definition that holds `<root>` → `CodexConfigError`. An inline/dotted definition without it → `{ existing, false }`.
   - Re-parse safety net on any change.

**`src/hosts/codex.ts`**
6. Import `removeCodexWritableRoot` and `resolveGitCommonDir`. `CodexAdapterDeps` and `DEFAULT_DEPS` gain `removeCodexWritableRoot`.
7. `install()`: read `writableRoot` and `root` from `d.injectCodexConfig(...)`, treating missing fields as `'none'`/`null` so an injected stub stays valid. After the four existing `Codex:` lines, print the pinned notice when `root !== null && writableRoot !== 'none'` (TPV100-A3; T1 positive, T2 negative). Keep the existing `Created/Updated/unchanged .codex/config.toml …` lines byte-for-byte (`codex-adapter.red` Test 2 pins `'Created .codex/config.toml'`).
8. `remove()`, inside the existing `.codex/config.toml` block:
   - After `d.removeCodexMcpServer`, compute `root = resolveGitCommonDir(cwd) ?? path.join(realpath(cwd), '.git')`, where `realpath(cwd)` falls back to `cwd` on error.
   - Run `d.removeCodexWritableRoot(next, root, file)` in **its own** `try`. A throw writes one `stderr` warning and never loses the MCP-table removal (the TPV R-A5 "per-target error does not skip" spirit).
   - Write once when either removal changed the file. Push `'.codex/config.toml (ClearGate writable root)'` to `removed` when the root was removed (T6b main checkout + linked worktree).

**Verification (Developer and QA-Verify):**
- `npm run typecheck`.
- Solo: `npm run test:file -- test/init/inject-codex-config-sandbox.red.node.test.ts` → 10/10.
- Witnesses: `inject-codex-config.red` 22/22, `codex-adapter.red` 16/16, `init-codex.red` 6/6, `lifecycle-codex.red` 6/6, `init-codex-sprint-execution.red` 3/3, `verify-install-codex.red` 9/9, `init-host-snapshot.red` 13/13.
- The M2 pair (`init-host-parity.red.integration`, `claude-adapter-init-parity.red.integration`) with `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, **without** `CLEARGATE_INIT_BASELINE_CAPTURE`: 15/15 and 5/5.
- Git-repo smoke per the §5 BD row: key = realpath `.git`; the notice prints; re-init is byte-identical; verify-install passes the 8 codex ids.

## Amendments to append to M7.md

```markdown
## Amendments from TPV (BUG-100, 2026-09-27; role: architect; append-only)

- **TPV100-A1 (preflight root; replaces the §3 BUG-100 bullet "`assertCodexConfigParsable` also runs the sandbox scan (placeholder root `/__cleargate_preflight__/.git`)").** `assertCodexConfigParsable(cwd)` resolves the root exactly as `injectCodexConfig` does (same default resolver, same optional `{ resolveGitCommonDir }` seam) and calls `planCodexConfig(existing, '0.0.0', file, { writableRoot: root })`. A null root (non-git cwd) skips the sandbox scan. Reason: with the placeholder, preflight refuses an inline/dotted definition that already holds the real root, so rule 3's exception is unreachable through `init`/`host add`, and it refuses a non-git install that the write leaves byte-identical (rule 4, E12). Pinned by re-sealed Test 8b.
- **TPV100-A2 (stale rule and outcome labels; §3 BUG-100 rule 2, OD-M7-7).** An element is a stale ClearGate root iff it is an absolute path, its last segment is `.git`, it is not equal to `<root>`, and `fs.existsSync(element)` is false. Relative elements are never stale (Codex ignores them; their existence depends on the process cwd). The first stale element becomes `<root>` when `<root>` is absent; further stale elements are dropped. `writableRoot` is `'replaced'` when any stale element was replaced or dropped, `'added'` when `<root>` was appended (new table, inserted key or appended element), `'unchanged'` when `<root>` was already present with nothing stale (or an inline/dotted definition already holds it), and `'none'` when no root was given.
- **TPV100-A3 (notice condition; §3 BUG-100 "Notice (pinned)").** The fifth `Codex:` line prints after the four existing `Codex:` lines on every install whose resolved root is non-null (`writableRoot` `added`, `replaced` or `unchanged`); never in a non-git cwd. Pinned by re-sealed Tests 1 and 2.
- **TPV100-A4 (counts; §2.3 row 2 and §3 BUG-100 D4).** BUG-100's red file has 10 tests (8 red, 2 anchors), not 7: default-tier Δ +10. Every §2.3 row from #2 on shifts by +3 (row 2 = 3669 / 3667); the final projection is 3702 / 3700 / 0 fail / 2 skip if the other items' counts hold.
- **TPV100-A5 (resolver env; §3 BUG-100 Gotchas).** The default resolver deletes `GIT_DIR`, `GIT_WORK_TREE` and `GIT_COMMON_DIR` from its child env. Measured: a pre-commit hook in a linked worktree receives `GIT_DIR=<main>/.git/worktrees/<wt>`, which would otherwise turn any cwd, git or not, into that repo's common dir. Pinned (GIT_DIR/GIT_WORK_TREE) by re-sealed Test 2.
```

## Routing

- REJECTED. QA-Red applies `reports/BUG-100-tpv-reseal.patch` (sha256 `98f8ede7…9b30`) on `story/BUG-100` at `608e529` and re-runs the file solo. Expect 10 tests: 2 pass (T2, T7), 8 fail, each failure an assertion or `removeCodexWritableRoot is not a function`. QA-Red then commits and records `BASELINE_FAIL: 8`, file count 10.
- The orchestrator appends the amendment block to `plans/M7.md` before the Developer is dispatched, and increments `arch_bounces` (`update_state.mjs BUG-100 --arch-bounce`).
- A re-check TPV is optional. The re-seal was measured here: 10/10 on the prototype and 31/31 mutants killed.

## Script Incidents

None. `run_script.sh` was not used: every command was `git`/`npm` inside the scratch clones, or a read-only `git apply --check` / `git status` on `<cw>`. No `.cleargate/scripts/*` was invoked.

**Hygiene:**
- `<cw>` is untouched: `608e529`, clean `git status`.
- No commits anywhere.
- No codex binary or harness was run. `~/.codex`, `CODEX_HOME` and auth files were never touched.
- The scratch dir `/private/tmp/cg-s41-tpv100-20260927T084759Z` was deleted by exact path after this report was written.
- Files written: this report and `reports/BUG-100-tpv-reseal.patch`, both uncommitted.

```yaml
flashcards_flagged:
  - "2026-09-27 · #git #test-harness · A pre-commit hook in a linked worktree exports GIT_DIR; git children a CLI spawns must drop it."
  - "2026-09-27 · #tpv #preflight · A preflight that plans with a placeholder input refuses what the real write accepts; use the real one."
  - "2026-09-27 · #tpv #toml · Merge-rule reds need negatives: other entry kept, re-plan no-op, table without key, file without table."
  - "2026-09-27 · #tpv #test-harness · A standalone cli clone fails ~394 tests on meta-repo paths; diff failing sets vs a same-layout base."
```
