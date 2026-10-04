role: developer

# BUG-100 Developer report — Codex sandbox writable root (SPRINT-41 M7)

```
STORY: BUG-100
STATUS: done
COMMIT: 5ce64c3 (cli, branch story/BUG-100, parent a15d8ce; base cli main f0c33f7)
TYPECHECK: pass
TESTS: 10 passed, 0 failed (test/init/inject-codex-config-sandbox.red.node.test.ts, solo); witnesses 198/198 across 17 files (listed below); M2 pair 15/15 + 5/5 in compare mode
FILES_CHANGED: cleargate-cli/src/init/inject-codex-config.ts, cleargate-cli/src/hosts/codex.ts, cleargate-cli/CHANGELOG.md
NOTES: Implemented the TPV developer brief (M7 §3 BUG-100 as amended by TPV100-A1..A5). No test file was edited and no other source file was touched. All 31 TPV mutants are killed by the sealed file against this code, with each mutant confirmed still in place after its run. INCIDENT: another agent (the BUG-047 TPV) ran my mutants.py from the shared session scratchpad around 14:03–14:07 local. My own first mutant pass and one clean run overlapped that window and gave three wrong readings (below). Recovery: the sources are byte-identical to my 13:58:12 snapshot, which I took after my last edit. I moved all scratch work to /private/tmp/cg-s41-dev100-20260927T103549Z/, deleted my files from the shared scratchpad, and re-ran typecheck, the red file, all witnesses, the M2 pair and the full mutant pass before committing. Meta-repo: 48 `.cleargate/delivery/pending-sync/*` files were modified at 14:42:51–52 local. They come from the merge lane's full cli suite (BUG-101 merge, `run-default-tests.mjs` started 14:42:00 in the cli MAIN checkout; Rule 14 back-sync), not from me. I left them for DevOps to revert. I did not tick the Task Breakdown rows: they live in the outer bug file, and this dispatch forbids edits to the outer checkouts. The orchestrator should tick them (all three rows are done).
r_coverage:
  - { r_id: "R1", covered: true, deferred: false, clarified: false }   # fresh git install writes realpath(git common dir) + notice — T1
  - { r_id: "R2", covered: true, deferred: false, clarified: false }   # re-init after move: stale ClearGate root replaced, /opt/cache and existing other .git kept — T4
  - { r_id: "R3", covered: true, deferred: false, clarified: false }   # linked worktree resolves the MAIN .git (install and remove) — T5, T6b
  - { r_id: "R4", covered: true, deferred: false, clarified: false }   # Claude install unchanged — T7 + M2 pair 15/15, 5/5
  - { r_id: "R5", covered: true, deferred: false, clarified: false }   # uninstall/host remove drop only <root>; key/table emptied rules; [features] kept — T6a, T6b
  - { r_id: "R6", covered: true, deferred: false, clarified: false }   # non-git cwd byte-identical, no notice, ambient GIT_DIR ignored — T2
  - { r_id: "R7", covered: true, deferred: false, clarified: false }   # inline/dotted fail closed unless it holds the root; preflight resolves the real root (TPV100-A1) — T8a, T8b
  - { r_id: "R8", covered: false, deferred: true, clarified: false }   # upgrade refreshes the key — FU-3 (E11, OD-M7-6)
  - { r_id: "R9", covered: false, deferred: true, clarified: false }   # verify-install codex.sandbox-writable-root — FU-1
plan_deviations:
  - { what: "array append is an insert after the last element, not a whole-array rewrite; one stale element is replaced in place", why: "the edit stays inside the array value range as the brief says, and keeps a user's comments, multi-line layout and trailing comma; the array is rewritten only when an element must be dropped", orchestrator_confirmed: false }
  - { what: "removing the key or the emptied table also removes the same-line trailing comment and leading indentation, and handles CRLF newlines", why: "otherwise an orphan '# comment' or blank-indented line is left behind; the brief's trailing-newline rule is otherwise followed exactly (T6a pins the LF shapes)", orchestrator_confirmed: false }
adjacent_files:
  - "cleargate-cli/src/commands/init.ts"
  - "cleargate-cli/src/hosts/lifecycle.ts"
  - "cleargate-cli/src/commands/uninstall.ts"
  - "cleargate-cli/src/commands/verify-install.ts"
  - "cleargate-cli/scripts/clean-room/codex-loop.mjs"
flashcards_flagged:
  - "2026-09-27 · #test-harness #danger · Mutant scripts left in the shared session scratchpad get run by other agents; keep them in a per-item /private/tmp dir."
  - "2026-09-27 · #test-harness #tpv · A mutant driver must re-read each mutated file after its run; a concurrent writer fakes kills and survivals."
  - "2026-09-27 · #toml #codex · Append to a TOML array at the last element's range end: comments, layout and a trailing comma survive."
```

## What changed

**`src/init/inject-codex-config.ts`**
- `resolveGitCommonDir(cwd)`, a new export.
  - Runs `git -C <cwd> rev-parse --git-common-dir` with `GIT_DIR`, `GIT_WORK_TREE` and `GIT_COMMON_DIR` removed from the child env; stderr is ignored.
  - Returns `realpathSync(path.resolve(cwd, out))`, or `null` on any failure.
- `planCodexConfig(existing, pin, file, opts = {})`. The fourth parameter is additive; the first three are unchanged (C1 shape).
  - Adds `writableRoot: 'added'|'replaced'|'unchanged'|'none'` to the result.
  - A null root does no sandbox scan, so the output is byte-identical to before.
  - Greenfield plus a root: the literal, then `\n[sandbox_workspace_write]\nwritable_roots = ["<root>"]\n`.
  - An existing file without the table: the table is appended as the third append piece.
  - A table without the key: the key is inserted at `table.range[1]`.
  - The key present: must be a single-segment array of strings, else `CodexConfigError`. The TPV100-A2 stale rule and labels apply.
  - An inline, dotted, sub-table or array-of-tables shape throws `CodexConfigError` unless its static `writable_roots` already holds the root.
  - The re-parse safety net is kept.
- `injectCodexConfig(cwd, pin, opts = {})` returns `{ action, flippedHooksFlag, writableRoot, root }` and has a `resolveGitCommonDir` seam.
- `assertCodexConfigParsable(cwd, opts = {})` resolves the real root, with no placeholder (TPV100-A1).
- `removeCodexWritableRoot(existing, root, file) → { next, removed }`, a new export.
  - Removes only `=== root`.
  - If elements remain, the array is rewritten.
  - If the array empties and the table has other keys, only the key-value is removed.
  - If the array empties and it was the table's only key, the table is removed along with up to two trailing newlines.
  - An inline or dotted definition that holds the root throws.

**`src/hosts/codex.ts`**
- `CodexAdapterDeps` and `DEFAULT_DEPS` gain `removeCodexWritableRoot`.
- `install()` reads `writableRoot` and `root` defensively, so a stub returning two fields still works. It prints the pinned fifth `Codex:` line after the four existing ones when `root !== null && writableRoot !== 'none'`.
- `remove()` runs the MCP-table removal and the root removal in separate `try` blocks.
  - Root = `resolveGitCommonDir(cwd) ?? realpath(cwd)/.git`.
  - The file is written once.
  - It pushes `.codex/config.toml (ClearGate writable root)`.

**`CHANGELOG.md`**: one `### Fixed` entry under Unreleased.

## Verification (in `<cw>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-100/cleargate-cli`; all re-run after the incident)

| Check | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `inject-codex-config-sandbox.red` (solo) | 10/10 (plus two more clean confirmation runs, 10/10 each) |
| `inject-codex-config.red` | 22/22 |
| `codex-adapter.red` | 16/16 |
| `init-codex.red` | 6/6 |
| `lifecycle-codex.red` | 6/6 |
| `init-codex-sprint-execution.red` | 3/3 |
| `verify-install-codex.red` | 9/9 |
| `init-host-snapshot.red` | 13/13 |
| `dispatch-mode.red` | 2/2 |
| `install-view.red` | 12/12 |
| `codex-hook-scripts.red` | 18/18 |
| `harness-shim.red` | 18/18 |
| `codex-payload.red` | 14/14 |
| `codex-agents-codegen.red` | 30/30 |
| `scaffold-relocation.red` | 15/15 |
| `portable-skills.red` | 6/6 |
| `init-fixture-cleanup.red` | 3/3 |
| `changelog-format` | 5/5 (it needs `dist/`; it failed once with ENOENT before the first build, then passed) |
| M2 pair: `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, `CLEARGATE_INIT_BASELINE_CAPTURE` unset | `init-host-parity.red.integration` 15/15, `claude-adapter-init-parity.red.integration` 5/5. The baseline dir is unmodified: 0 files newer than my scratch dir. |

The witness list covers every test file under `test/` that imports `inject-codex-config` or `hosts/codex` (`command grep -rlE "inject-codex-config|hosts/codex" test`), plus the brief's named witnesses. Default-tier delta for this item: +10, as QA-Red counted (TPV100-A4).

## Mutant cross-check (TPV Check 3, against commit 5ce64c3's sources)

Method: each mutant is applied in place to `src/`. Then the sealed file runs solo, the driver checks that the mutated bytes are still on disk, and the sources are restored from the snapshot and `cmp`-verified. This is the final pass, run from `/private/tmp/cg-s41-dev100-20260927T103549Z/` after the incident. Every row reports `intact=True`, and the killers are identical to my earlier post-window pass. **31/31 killed.**

| # | Mutant | Killed by (sealed file) |
|---|---|---|
| M01 | resolver returns the raw relative `.git` | Test 1, Test 6 (6b), Test 8 (8b) |
| M02 | no `realpathSync` | Test 1, Test 6 (6b), Test 8 (8b) |
| M03 | `--git-dir` instead of `--git-common-dir` | Test 5, Test 6 (6b linked worktree) |
| M04 | worktree `toplevel/.git` | Test 5, Test 6 (6b linked worktree) |
| M05 | non-git falls back to `cwd/.git` | Test 2, Test 8 (8b) |
| M06 | merge drops user roots | Test 3 |
| M07 | stale rule ignores existence | Test 4 |
| M08 | stale rule ignores the `.git` suffix | Test 3, Test 4 |
| M09 | no stale replacement | Test 4 |
| M10 | duplicate append when the root is present | Test 3 |
| M11 | `replaced` reported as `added` | Test 4 |
| M12 | uninstall drops the whole key | Test 6 (6a, 6b) |
| M13 | uninstall drops every `.git` root | Test 6 (6a) |
| M14 | uninstall drops a table that has other keys | Test 6 (6a) |
| M15 | `remove()` not wired | Test 6 (6b) |
| M16 | `remove()` root without realpath (`/private` stripped) | Test 6 (6b) |
| M17 | notice missing | Test 1 |
| M18 | notice printed in non-git too | Test 2 |
| M19 | resolver keeps ambient `GIT_DIR` | Test 2 |
| M20 | preflight skips the sandbox scan | Test 8 (8b) |
| M21 | inline table silently skipped | Test 8 (8a, 8b) |
| M22 | inline table holding the root still throws | Test 8 (8a, 8b) |
| M23 | preflight uses the placeholder `/__cleargate_preflight__/.git` | Test 8 (8b) |
| M24 | table without the key appends a second table | Test 3 |
| M25 | uninstall leaves `writable_roots = []` | Test 6 (6a) |
| M26 | greenfield ignores the root | Test 1, Test 5 |
| M27 | rev-parse output resolved against `process.cwd()` | Test 1, Test 6 (6b), Test 8 (8b) |
| M28 | existing-file path ignores `opts` | Test 3, Test 4, Test 8 |
| M29 | `added` reported as `unchanged` | Test 3 |
| M30 | `remove()` ignores the resolver (`realpath(cwd)/.git` only) | Test 6 (6b linked worktree) |
| M31 | existing file without the table gains nothing | Test 3 |

Every killer matches the TPV table's re-sealed column.

## Incident and recovery (orchestrator notice, 2026-09-27)

- **What happened.** The BUG-047 TPV ran my `mutants.py` from the shared session scratchpad six times, around 14:03–14:07 local (10:03–10:07Z). It applied BUG-100 mutants in my cli worktree and restored `src/init/inject-codex-config.ts` and `src/hosts/codex.ts` from my 13:58:12 snapshot.
- **Readings it corrupted.** Three of my measurements overlapped that window:
  - In my first mutant pass, M17 was attributed to Test 8 and M18 "survived".
  - One unmutated run failed Test 6b: the root was left, as with M15/M16.
  - I had already isolated M17 and M18 (each killed by Test 1 / Test 2) and replayed the sequence: no failure in about 33 further clean runs, including 12 run in parallel.
  - I had not found a cause in the product code; the notice explains all three readings.
- **Edits lost.** None. After my last source edit I ran typecheck (exit 0) and the build (13:56). The snapshot was taken at 13:58:12, after both. Both files are byte-identical to it (sha256 inject `69f08790…`, codex `41299aab…`), and I re-reviewed the full diff against HEAD.
- **Recovery.**
  - Scratch now lives only in `/private/tmp/cg-s41-dev100-20260927T103549Z/`.
  - I deleted my own files from the shared scratchpad: `mutants.py`, the snapshot copies and logs. Other agents' `mutants-*` files were left alone.
  - I re-ran typecheck, the red file, all witnesses, the M2 pair and the whole mutant pass. That pass now checks that each mutant is still in place after its run.
  - `dist` was rebuilt from the verified sources before the smoke.

## Smoke transcript (dist built in `<cw>` from 5ce64c3's sources; scratch `/private/tmp/cg-s41-dev100-20260927T103549Z/`, each writing command run as its own `(cd /literal && node …)` call)

1. **Fresh git repo** (`git init -b main repo1`, one empty commit), then `(cd …/repo1 && node <cw>/dist/cli.js init --yes --host codex)`: exit 0.
   ```
   [cleargate init] Created .codex/config.toml ([features] hooks = true; cleargate MCP server registered).
   [cleargate init] Codex: .codex/config.toml pins [features] hooks = true as the ClearGate install contract (current Codex enables hooks by default).
   [cleargate init] Codex: project .codex/ config and hooks load only in a trusted workspace — trust this directory when Codex asks.
   [cleargate init] Codex: Codex trusts each hook command by its exact hash — review and approve the ClearGate hooks it lists (again after an upgrade changes one).
   [cleargate init] Codex: AGENTS.md instructions are discovered whether or not the workspace is trusted.
   [cleargate init] Codex: .codex/config.toml [sandbox_workspace_write] writable_roots includes /private/tmp/cg-s41-dev100-20260927T103549Z/repo1/.git (this clone's absolute git dir) so sprint git steps can write; after moving or re-cloning the repo, re-run cleargate init --host codex.
   ```
   `.codex/config.toml`:
   ```
   [features]
   hooks = true

   [mcp_servers.cleargate]
   command = "npx"
   args = ["-y", "cleargate@0.26.1", "mcp", "serve"]

   [sandbox_workspace_write]
   writable_roots = ["/private/tmp/cg-s41-dev100-20260927T103549Z/repo1/.git"]
   ```
   `realpath $(git rev-parse --git-common-dir)` gives `/private/tmp/cg-s41-dev100-20260927T103549Z/repo1/.git`, the same path. stderr carried only the existing "Restart Claude Code" banner, which is BUG-105's papercut and out of scope.
2. **Re-init** (`init --yes --host codex` again): exit 0. It prints `.codex/config.toml unchanged (cleargate entries already present)` and the notice again (TPV100-A3). The sha256 is `66c5b5e0f4f270486f620c7ead46d0acb0f1bd44e5053d0ba41095b55dc7b95c` before and after, so the file is **byte-identical**. A read-only `verify-install --json` exits 0 with `ok: true`. The base `f0c33f7` predates STORY-058-13, so only `codex.features-hooks` exists there and it passes.
3. **Linked worktree.** `git -C repo1 worktree add …/wt1 -b wt1` creates a worktree whose `.git` is the file `gitdir: …/repo1/.git/worktrees/wt1`. Then:
   - `(cd …/wt1 && node … init --yes)` (Claude only) exits 0 and creates no `.codex`.
   - `(cd …/wt1 && node … host add codex)` exits 0 and prints `[cleargate host] Codex: … writable_roots includes /private/tmp/cg-s41-dev100-20260927T103549Z/repo1/.git …`. The file `wt1/.codex/config.toml` ends with `writable_roots = ["/private/tmp/cg-s41-dev100-20260927T103549Z/repo1/.git"]`: the **main** common dir, not `.git/worktrees/wt1`.
   - After pre-seeding `"/opt/cache"` into that array, `(cd …/wt1 && node … host remove codex)` exits 0. Resulting file:
   ```
   [features]
   hooks = true



   [sandbox_workspace_write]
   writable_roots = ["/opt/cache"]
   ```
   The blank lines come from the existing AD-4 MCP-table removal, which is unchanged by this item.
4. **Main repo uninstall.**
   - Pre-seed `"/opt/cache"` into repo1's array: `["/opt/cache", "<repo1>/.git"]`.
   - Re-init: exit 0, `unchanged`, and the sha256 `e6f922ab…` is equal before and after, so the user root is kept.
   - Commit the install.
   - `(cd …/repo1 && node … uninstall --yes)`: exit 0. "Will remove 72 files, keep 1 files …". The kept `.codex/config.toml` has only `[features] hooks = true` and `writable_roots = ["/opt/cache"]`: ClearGate's root is gone and the user root stays.
5. **Non-git dir.** `git -C …/nongit rev-parse` exits 128. Then `(cd …/nongit && node … init --yes --host codex)` exits 0 and prints only the four existing `Codex:` lines. `writable_roots` appears 0 times in stdout and stderr. The file equals the pre-BUG-100 greenfield literal for pin 0.26.1 (`true`).

Observation, out of scope: after the full uninstall, the empty directories `.codex/agents` and `.codex/hooks` remain. This is existing uninstall behaviour.

## Meta-repo check

`git -C /Users/ssuladze/Documents/Dev/ClearGate status --short` shows:
- the 4 ledger files (`.session-totals.json`, `events.jsonl`, `state.json`, `token-ledger.jsonl`);
- this report, untracked;
- 48 modified `.cleargate/delivery/pending-sync/*.md` files, mostly `parent_cleargate_id: null → "<parent>"`, mtimes 14:42:51–52 local.

Those 48 files are **not** mine. The merge lane's full cli suite for the BUG-101 merge (cli main `8c98177`; `node scripts/run-default-tests.mjs …`, pid 30661, started 14:42:00 local in the cli MAIN checkout) writes delivery back-syncs into the outer MAIN checkout (Cross-Cutting Rule 14). None of my commands ran in or against the meta-repo. My tests ran in `<cw>`, whose outer worktree is still clean, and my smoke ran only under `/private/tmp/cg-s41-dev100-*`. DevOps owns the revert.

## Integration note

cli `main` moved from `f0c33f7` to `8c98177` while I built (STORY-058-13 and BUG-101 merged). Rule 21 integration applies: CHANGELOG keep-both, and my two source files are shared with nothing in M7 (§2.2). The TPV measured the seal and prototype on `0e5b0ac` (−13 merged) at 10/10, with `verify-install-codex-shape` 20/20.

## Script Incidents

None. `run_script.sh` was not used: no `.cleargate/scripts/*` was invoked, and every command was `git`, `npm`, `node` or `python3` inside `<cw>` or my scratch dir.

## Hygiene

- No codex binary. `~/.codex`, `CODEX_HOME` and auth files were never touched.
- `/private/tmp/cg-s41-m2-init-baseline` was used in compare mode only and has no modified files. The other protected dirs and `CG_TEST` were untouched.
- No `git stash`, no reset, no push, no branch moves. One commit on `story/BUG-100`; no `--no-verify` (the cli repo has no pre-commit hook, so typecheck and tests were run by hand).
- The scratch dir `/private/tmp/cg-s41-dev100-20260927T103549Z/` was deleted by exact path after this report was written.
