# STORY-058-03 — QA-Verify

role: qa

STORY: STORY-058-03

Mode: VERIFY (read-only acceptance trace). cli `cleargate-cli`, branch `story/STORY-058-03` @ `0fb61b1` (red `11fe514`, cut from `a821d40`). Lane: standard. Story is cli-only — no outer tracked path other than this report and the item file's Task Breakdown checkboxes (see Finding 1, advisory).

## 1. Sealed tests and baseline

- `git diff 11fe514..0fb61b1 -- test/` → **empty**. Confirmed: the Dev added no new test files and edited none of the three sealed files (`test/helpers/init-fixture.ts`, `test/hosts/host-adapter-contract.red.node.test.ts`, `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts`).
- Baseline intact: `find /private/tmp/cg-s41-m2-init-baseline -type f | wc -l` → **425**. `find … -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256` → `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` — **matches** the pinned value exactly. Re-verified a second time after all other checks below (still unchanged — never written to).

## 2. Reds solo

- `npm run test:file -- test/hosts/host-adapter-contract.red.node.test.ts` → **19/19 pass**, 11 suites, 0 fail.
- `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline npm run test:file -- test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (compare mode, no capture flag) → **5/5 pass**.
- `npm run typecheck` → `tsc --noEmit`, exit clean, no output.

## 3. Q1 static gate

```
$ command grep -nE '\b(mergeSettings|injectClaudeMd|extractBlock|injectMcpJson)\(' src/commands/init.ts
(no output)
```
Confirmed empty — no inline Step 4/5/5b surgery survives in `init.ts`.

`init.ts:226`: `const registry = opts.hostRegistry ?? defaultHostRegistry;` — sits unconditionally right after the seam destructuring (`spawnSyncFn`), before Step 1's `if (!fs.existsSync(cwd))`. Not inside any `if`. The M-b mutant ("route through the adapter only when `opts.hostRegistry` is set") is not reachable from this line's shape.

## 4. Verbatim-move review

**`install()` vs `git show a821d40:src/commands/init.ts` lines 461-557, minus the 3 `.mcp.json` capture lines (`:539`/`:540`/`:557`):** mechanically diffed (dedented, line-for-line). Every hunk is one of the sanctioned substitutions:
- `mergeSettings(` → `d.mergeSettings(`
- `HOOK_ADDITION` → `CLAUDE_HOOK_ADDITION`
- `extractBlock(` → `d.extractBlock(`
- the D1 fallback: `'<!-- CLEARGATE:START -->\n<!-- CLEARGATE:END -->'` → `` `${CLEARGATE_START}\n${CLEARGATE_END}` ``
- `injectClaudeMd(` → `d.injectClaudeMd(`
- `injectMcpJson(cwd, pinVersion ?? 'latest')` → `d.injectMcpJson(cwd, ctx.pinVersion)`

No other hunk exists. `CLAUDE_HOOK_ADDITION` (`claude.ts:27-57`, doc comment `:21-26`) byte-diffed against `git show a821d40:src/commands/init.ts` lines 35-71 (with only `const HOOK_ADDITION` → `export const CLAUDE_HOOK_ADDITION` normalized) — **zero remaining diff**. Byte-identical, doc comment and BUG-089 comment included.

**`remove()` vs `git show a821d40:src/commands/uninstall.ts` lines 434-456:** the two warning strings are verbatim: `` `Warning: could not strip CLAUDE.md block: ${(err as Error).message}` `` and `` `Warning: could not update settings.json: ${(err as Error).message}` ``. Behavior matches the plan's own remove() description exactly (existence-check + write + push label, per-surgery-that-ran). Two non-substantive textual differences outside the plan's list, both explainable and non-blocking:
- `if (claudeMdContent !== null)` (uninstall.ts, using a variable computed upstream at uninstall.ts:325-341, which "stays in uninstall.ts" per plan) became `if (fs.existsSync(claudeMdPath)) { const claudeMdContent = fs.readFileSync(...) }` in claude.ts — required because that pre-validation variable is not in scope for a standalone adapter method; the plan's own remove() prose describes it exactly this way ("If CLAUDE.md exists, write removeBlock(content)").
- `await writeAtomic(...)` (uninstall.ts's own async `fsp`-based helper) became sync `writeAtomic(...)` — claude.ts's private `writeAtomic` is the sync copy from `init.ts:228-232`, per M2-A3 (deliberately: one private helper shared by both `install()` and `remove()`, not two).
- `removedPaths.push(...)` → `removed.push(...)` (local variable renamed to match `RemoveReport.removed`) and `'utf-8'` → `'utf8'` on the settings.json read (functionally identical Node encoding alias). Neither affects behavior or bytes written.

## 5. Structure

- **M2-A1/A2** confirmed by reading `init.ts:256-261` (hoisted `let payloadDir/fromSourceTempDir/pinVersion/preMutationMcpJson/postMutationMcpJson`, byte-unchanged) and `init.ts:331-609` (Steps-3-7 `try { … } finally { … }`, adapter loop at `:426-432` inside it, no re-indentation). No `exit()` call sits inside that `try`; all four `exit()` call sites (`:231`, `:242`, `:312`, `:324`) are above `:331`, matching M2-A2's constraint exactly.
- **D3** confirmed: `createClaudeAdapter` returns a plain object literal (`claude.ts:223-230`) — no `class`, no `this`, not frozen.
- **D4** confirmed: `claude.ts` imports only `node:fs`, `node:path`, the five surgery helpers, `extractSessionLoadDelta`, and `type`-only `./types.js`. `registry.ts` imports `./types.js` and `./claude.js` — one direction only. No cycle.
- **Registry invariants** (`registry.ts`) match story §3.3: `UnknownHostError` (name/host/valid), Map-backed `createHostRegistry` (duplicate-name throw, invalid-root throw via `isValidRoot`, owned-vs-owned/shared overlap throw via `rootsOverlap`, shared-vs-shared allowed), `pathUnderRoots`, `defaultHostRegistry = createHostRegistry([claudeAdapter])`. `byName` is a `Map`, so `resolve('constructor')`/`resolve('__proto__')` fall through to `UnknownHostError` rather than resolving a prototype property.
- **Unchanged files:** `git diff a821d40..0fb61b1 --stat` touches only `src/commands/init.ts` (151 −, additions inline) and the four new `src/hosts/*` + three new `test/**` files. `git diff a821d40..0fb61b1 -- <path>` is empty (0 lines) for each of: `src/commands/uninstall.ts`, `src/commands/upgrade.ts`, `src/init/copy-payload.ts`, `src/init/inject-claude-md.ts`, `src/init/inject-mcp-json.ts`, `src/init/merge-settings.ts`, `src/lib/claude-md-surgery.ts`, `src/lib/settings-json-surgery.ts`.

## 6. Gherkin mapping

| # | Scenario (§2.1, as amended by M2-A5) | Test(s) | Result |
|---|---|---|---|
| 1 | No-flag init is byte-identical through the adapter | Unit scenario 10 (`no-flag init calls install exactly once with the correct ctx, and remove zero times`) + integration scenario 12 (5× `matches the captured baseline byte-for-byte`) + QA-Verify's Q1 static grep (closes the "adapter only when seam is set" gap the injected-spy test can't) | PASS — 19/19 + 5/5 + grep empty |
| 2 | Registry rejects an unknown host | Unit scenario 3 (`resolve throws UnknownHostError for bogus/case-mismatch/prototype-pollution names`) | PASS |
| 3 | Claude adapter delegates rather than reimplements | Unit scenario 7 (`Install delegation` — bare + user-content fixtures, each real helper called once) + scenario 11 (`no CLEARGATE:START regex literal and no mcpServers token`) + direct evidence (§4 verbatim-move review above) | PASS |
| 4 | Adapter declares its own payload roots and inverse | Unit scenario 6 (`ownedRoots is [".claude"], sharedRoots is [], surgeryTargets is the 3-file set`) + scenario 8 (`Remove delegation and inverse` — strips content, preserves user content, `.mcp.json` untouched, helpers called once each, plus the neither-file and marker-less sub-cases) | PASS |

ACCEPTANCE_COVERAGE: 4 of 4 Gherkin scenarios have matching tests (all red-now-green under CR-081; the parity file was green-by-design at the red commit and is now proven to exercise the real refactored path via scenario 10 + the Q1 static check, per TPV Q1).

## 7. Bundled dist

Scratch clone at `0fb61b1` (`/private/tmp/cg-s41-qa-058-03-build`, `node_modules` symlinked, deleted after). `npm run build` succeeded (tsup CJS+ESM+DTS, no errors).

Fresh `git init`-ed target, `node <clone>/dist/cli.js init --yes` run twice:
- **Run 1** (fresh): created `.claude/settings.json` already carrying both hook commands from the payload (adapter's `mergeSettings` reported "unchanged" — expected, the shipped `settings.json` payload already contains them), created `CLAUDE.md` with one bounded block, created `.mcp.json`.
- **Run 2** (reinit): all three surgery targets reported "unchanged."
- **After both runs:** `pre-edit-gate.sh --host claude` occurs **1** time and `stamp-and-gate.sh` occurs **1** time in `.claude/settings.json`; `<!-- CLEARGATE:START -->` / `<!-- CLEARGATE:END -->` each occur **1** time as real line-anchored markers in `CLAUDE.md` (a naive `grep -c` on the bare token over-counts because the "Project overrides" paragraph also mentions the literal marker string in prose — anchored `^<!-- CLEARGATE:START -->$` / `^<!-- CLEARGATE:END -->$` give the correct count of 1 each — see flashcard below); `.mcp.json` present with the `cleargate` server entry. Every stdout line from both runs carries the `[cleargate init] ` prefix (verified: `grep -v '^\[cleargate init\]'` against a third run's output, after stripping the restart banner and blank lines, returned nothing).
- `test/commands/init-from-source-dist.integration.node.test.ts` run solo in the **main checkout** (not the scratch clone — it clones `HEAD` internally): **1/1 pass**.

Scratch clone and target directory deleted after the run.

## 8. Regression witnesses solo

All run one file at a time from the main cli checkout (`0fb61b1`):

| File | Result |
|---|---|
| `test/commands/init.node.test.ts` | 29/29 pass |
| `test/commands/init-from-source.node.test.ts` | 14/14 pass |
| `test/init/claude-md-block-leads.red.node.test.ts` | 15/15 pass |
| `test/init/inject-mcp-json.node.test.ts` | 12/12 pass |
| `test/commands/uninstall.node.test.ts` | 20/20 pass |
| `test/commands/upgrade-claude-md.red.node.test.ts` | 4/4 pass |
| `test/lib/settings-json-surgery.node.test.ts` | 13/13 pass |

Known pre-existing integration failures, re-run solo and diagnosis-matched:
- `test/integration/foreign-repo.integration.node.test.ts` → **6 tests / 4 pass / 2 fail**. Failing names: `Scenario 1: Init into blank Node repo succeeds`, `Scenario 2: Init into bare Go repo succeeds` (both under `assertScaffoldShape`, asserting a string where a `.install-manifest.json cleargate_version field` message was expected — the swapped-argument test-bug shape the 058-02 DevOps diagnosed 2026-05-18). Matches Dev's report exactly.
- `test/e2e/dogfood-install.integration.node.test.ts` → **1 test / 1 fail**. Failing name: `Scenario 1: Install + doctor + upgrade-dry-run all clean` — matches the failure the 058-02 QA already confirmed pre-existing at `464e1e4`, and matches Dev's report exactly.

Neither failure set is new or refactor-caused: same counts, same test names, same assertion shapes as both prior diagnoses and the Dev's own `git stash` differential.

## 9. Process check

- `git -C cleargate-cli stash list` → `stash@{0}: WIP on story/BUG-043: 1e01ea0 fix(EPIC-043): BUG-043 upgrade refuses rather than overwrites a user's CLAUDE.md` — only the old BUG-043 stash, nothing from this story's Dev run lost.
- `git -C cleargate-cli status --short` → `?? cleargate-0.25.0.tgz` only (pre-existing untracked artifact, not from this story).
- Outer pre-commit compatibility: `npm run check:no-vitest --prefix cleargate-cli` → `no vitest residue`. `npm run --silent check:no-inline-id-regex --prefix cleargate-cli` → `no inline work-item-id regexes`.
- Outer `git status --short` → only `.session-totals.json` / `token-ledger.jsonl` (hook-owned, expected); the 29-file pending-sync back-sync noise the Dev's `npm test` run produced (rule 14) is **not** present — already reverted by the time of this QA pass. Nothing for QA to revert.

## Task Breakdown (advisory, EPIC-054 WS7)

All six `## Task Breakdown` rows in the story file remain unchecked (`- [ ]`). This is explained, not silent: the Dev's dispatch scope forbade editing any outer tracked path except this-story's own report, so the Dev could not tick the story file's checkboxes and flagged this explicitly in their report for the orchestrator to tick or waive at the boundary step. All six rows' underlying work is verified done in §§1-6 above. Advisory only, not a bounce criterion.

## Script Incidents

None. All commands were `npm run typecheck` / `npm run test:file -- <file>` / `npm run build` inside the main cli checkout or a disposable scratch clone, plus the two outer `npm run check:*` scripts and the plain `git`/`find`/`shasum`/`grep` inspection commands used above — no `.cleargate/scripts/run_script.sh`-wrapped script was invoked.

flashcards_flagged:
  - "2026-09-25 · #qa #test-harness · grep -c on a bare CLEARGATE:START token over-counts (CLAUDE.md's own 'Project overrides' prose repeats it) — anchor to ^<!-- CLEARGATE:START -->$ for a real marker count."

QA=PASS
