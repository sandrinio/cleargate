role: developer · SPRINT-39 · wave 10 · M4 · BUG-045

# Developer report: BUG-045 — hotfix id allocator scans pending-sync ∪ archive

## Repo / commit

`cleargate-cli` (own git repo, gitignored inside the outer meta-repo). Branch `story/BUG-045`,
main checkout (not a worktree — `git ls-files cleargate-cli/` is 0 in the outer repo). HEAD
advanced from QA-Red round 2's `b79adbd` to this commit:

```
commit c589a039c4e3201c5e84ac959b175fb114e6aa00
fix(EPIC-043): BUG-045 hotfix id allocator scans pending-sync ∪ archive
```

Zero outer-repo commits. `git status --porcelain` clean after commit. `stash@{0}` (BUG-043 WIP
tarball) untouched.

## What changed

`src/commands/hotfix.ts`:
- `maxHotfixId(pendingDir: string)` → `maxHotfixId(...dirs: string[])`. Single accumulator never
  reset inside the directory loop (union semantics, not per-directory max). Each directory's
  `readdirSync` is independently wrapped in its own `try { } catch { continue; }` — a missing
  directory is skipped and does not affect the max accumulated from the others, and argument
  order cannot matter.
- Type filter `classifyType(id) === 'HOTFIX'` preserved verbatim inside the widened loop.
- Pad width unchanged: still the fixed literal `3` via `padStart(3, '0')` at the call site,
  never derived from the scanned corpus.
- Grammar unchanged: still `idFromFilename` / `classifyType` / `numericStem` from
  `../lib/work-item-id.js` — no new regex introduced anywhere in the diff.
- Call site (`hotfixNewHandler`): resolves `archiveDir` alongside the existing `pendingDir` and
  calls `maxHotfixId(pendingDir, archiveDir)`. `nextId = maxId + 1` and the `idStr` template are
  byte-unchanged.
- Doc comment above `maxHotfixId` rewritten — no longer claims "Scan pending-sync/" (now false);
  states the union-of-directories behavior and cites BUG-045.
- `countActiveHotfixes` (`:78-115` before, same span after) is **byte-unchanged** — confirmed by
  reading the full `git diff -- src/commands/hotfix.ts`: the diff hunk touching that region is
  empty; only the `maxHotfixId` function body/signature and the two lines at the call site changed.

`CHANGELOG.md`:
- Inserted `### Fixed` immediately after `## Unreleased` (line 6), above the pre-existing
  `### Changed` — matches the `## [0.24.2]` ordering (Fixed → Added → Changed), not the
  Common-Changelog default. Content is the verbatim entry from TPV §T6 / item §4 amendment.
  `package.json` untouched. `grep -c '^## Unreleased'` → **1**, confirmed after the edit.

No other file touched. Test file `test/commands/hotfix-id-archive-scan.red.node.test.ts`
(R1–R15, authored across QA-Red rounds 1 and 2) was **not modified** — read only, to confirm
scenario intent before implementing.

## Verification, every line measured

- **`git diff -- src/commands/hotfix.ts`** — confirms `countActiveHotfixes` has zero changed
  lines; only `maxHotfixId` and the two-line call-site addition changed.
- **`grep -c '^## Unreleased' CHANGELOG.md`** → `1`. `package.json` — untouched (`git status`
  confirms only `CHANGELOG.md` and `src/commands/hotfix.ts` staged).
- **Targeted red-test run** (`npm --prefix cleargate-cli exec -- tsx --test --test-reporter=tap
  cleargate-cli/test/commands/hotfix-id-archive-scan.red.node.test.ts`, redirected to a log,
  read from the completed file):
  ```
  # tests 14
  # suites 14
  # pass 14
  # fail 0
  # cancelled 0
  # skipped 0
  # todo 0
  ```
  All 14 scenarios (R1–R15, R3/R5/R7/R10/R14 already green-by-design) pass against the fix.
  Matches TPV's predicted `FIX → 14/14` exactly.
- **`npm --prefix cleargate-cli run typecheck`** → exit 0, clean. (`tsc --noEmit`, no errors.)
- **`npm --prefix cleargate-cli test`** (full default suite), redirected to a log, status line
  read from the completed file (N10 — never piped through `tail`/`head` live):
  ```
  ℹ tests 2590
  ℹ suites 910
  ℹ pass 2588
  ℹ fail 1
  ℹ cancelled 0
  ℹ skipped 1
  ℹ todo 0
  ```
  **Exact match to the expected line** (`2590 / 910 / 2588 / 1 / 1`). The sole failure, confirmed
  by name: `test at test/commands/sync.node.test.ts:1:18146`, `Error: cannot reach
  https://cleargate-mcp.soula.ge (fetch failed)` — the pre-existing N10 network case, not chased,
  not touched.
- **`npm --prefix cleargate-cli exec -- tsx --test cleargate-cli/test/commands/hotfix-new.integration.node.test.ts`**:
  ```
  ℹ tests 9
  ℹ suites 6
  ℹ pass 7
  ℹ fail 2
  ```
  **Exact match to the expected `9 / 7 / 2`.** Both failures confirmed under "Scenario 5:
  wiki/index.md has Hotfix Ledger section linking to hotfix-ledger.md" (`wiki/index.md contains a
  "Hotfix Ledger" heading` and `wiki/index.md links to topics/hotfix-ledger`) — asserting against
  the outer meta-repo's `.cleargate/wiki/index.md`, unrelated to id allocation, pre-existing
  before this commit (confirmed against `b79adbd` in QA-Red's own report). Scenarios 1–4
  (allocation, cap, template) are green.
- **`npm --prefix cleargate-cli run check:no-inline-id-regex`** → `no inline work-item-id
  regexes`, exit 0.
- **Manual eyeball, per §T7** (`check:no-inline-id-regex` is blind to capture-group forms):
  `git diff -U0 -- src/commands/hotfix.ts | grep -n '/\^\?HOTFIX'` → **no output** (clean; no
  regex literal on any added line).
- **`grep -rn "maxHotfixId" cleargate-cli/src`** → exactly 2 hits:
  `src/commands/hotfix.ts:54` (definition), `:173` (sole call site).

## Task Breakdown

Per M4 plan **N8**: the surface gate is inert on `BUG-`/`CR-` items this milestone, and the
item's `## Task Breakdown` rows exist "for the Developer's benefit, not the gate's." Combined
with the dispatch's explicit "Zero outer-repo commits" mandate for this cli-only fix, the outer
repo's `.cleargate/delivery/pending-sync/BUG-045_Hotfix_Id_Scan_Ignores_Archive.md` item file was
**not edited** — ticking its Task Breakdown checkboxes would require an outer-repo commit, which
the dispatch and the M4 plan both forbid for this item. All seven task rows were nonetheless
completed in substance, verified against the log above:

1. Branched from `main` @ `e4cb49f`, main checkout — done (pre-existing, by QA-Red).
2. QA-Red authored R1–R7 (round 1) and R9–R15 (round 2) — done (pre-existing, by QA-Red).
3. Widened `maxHotfixId` to N dirs; called with `(pendingDir, archiveDir)` at the call site — done, this commit.
4. `countActiveHotfixes` confirmed byte-unchanged via `git diff` — done, verified above.
5. `CHANGELOG.md` bullet under existing `## Unreleased` — done, this commit.
6. `typecheck` and full suite run, numbers recorded — done, verified above.
7. `grep -rn "maxHotfixId" cleargate-cli/src` returns exactly 2 — done, verified above.

## Script Incidents

None. All commands were run directly (`npm --prefix cleargate-cli ...`, `git diff`, `grep`) — no
script was invoked through `run_script.sh`, so nothing routes through that wrapper for this
dispatch.

STATUS=done
