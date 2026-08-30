role: qa (QA-RED)
STORY: BUG-045
commit SHA: 6169ed7777ec5a30a2c2789329e225f19898fe75 (`git rev-parse story/BUG-045`, verified)
short SHA: 6169ed7 — subject `test(BUG-045): red baseline for the archive-blind id scan`

Repo: `cleargate-cli` (own git repo, gitignored inside the outer meta-repo). Branch `story/BUG-045`,
cut from `main` @ `e4cb49f`, main checkout (not a worktree — per the M4 plan's execution route,
`git ls-files cleargate-cli/` is 0 in the outer repo so a worktree never materializes it). Zero
outer-repo commits — this item is cli-only.

## Mode

QA-Red. No implementation file touched. `git diff --stat e4cb49f..story/BUG-045` shows exactly one
file: `test/commands/hotfix-id-archive-scan.red.node.test.ts` (+286 lines, new file). `hotfix.ts`,
`work-item-id.ts`, `work-item-type.ts`, `stamp-frontmatter.ts`, `cli.ts` are all byte-unchanged —
read-only per the dispatch.

## File authored

- `cleargate-cli/test/commands/hotfix-id-archive-scan.red.node.test.ts` (new, 286 lines)

Naming per `sprint-context.md` §Test Stack (`*.red.node.test.ts`), even though the file it extends
(`hotfix-new.integration.node.test.ts`) is `*.integration.node.test.ts` — the M4 plan flags this as
a CR-111-scoped naming collision and explicitly says not to resolve it here.

`makeTmpRepo`/`makeExitSeam`/`makeCapture` in the existing integration file are file-local, not
exported (confirmed by grep before writing) — so this file carries a **minimal** local seed of the
same three seams rather than re-deriving the 448-line harness, per the plan's explicit instruction.

## Real-tree reproduction (the bug live in this repo, today)

Read-only. No outer-repo file was written, moved, or renamed — the transcript below only reads
`.cleargate/delivery/{pending-sync,archive}/` and calls the exported `idFromFilename`/`classifyType`/
`numericStem` helpers from `work-item-id.ts` (same helpers `hotfix.ts` imports; no new regex).

```
$ ls .cleargate/delivery/pending-sync/ | grep '^HOTFIX-'
(empty)
$ ls .cleargate/delivery/archive/ | grep '^HOTFIX-'
HOTFIX-001_init_skip_strips_exec_bit.md
```

Matches the M4 plan's own measurement exactly. Then, replicating `maxHotfixId`'s exact scan logic
(pendingDir only, as shipped, vs. the union-of-both-dirs the fix must implement) via the real
exported grammar helpers, against the live outer-repo directories:

```
pendingDir entries: []
archiveDir entries (HOTFIX-*): [ 'HOTFIX-001_init_skip_strips_exec_bit.md' ]
shipped maxHotfixId(pendingDir) = 0 -> next id would be HOTFIX-001
union  maxHotfixId(pendingDir, archiveDir) = 1 -> next id would be HOTFIX-002
COLLISION: shipped code would allocate HOTFIX-001, colliding with the archived
           HOTFIX-001_init_skip_strips_exec_bit.md
```

`cleargate hotfix new` was never invoked against the outer repo (that would write a file there,
forbidden by the dispatch) — the collision is demonstrated by replaying the shipped scan logic
read-only against the real directory listing, which is sufficient to prove the defect fires exactly
as BUG-045 §1 describes, in this repo, without any synthetic fixture.

## Control measurement — BEFORE the red file existed on disk

Captured to a log file, read from the log (never piped through `tail`/`head` live).

```
$ npm --prefix cleargate-cli run typecheck > typecheck-baseline.log 2>&1; echo EXIT=$? >> typecheck-baseline.log
EXIT=0
```

Full suite (`npm --prefix cleargate-cli test`), background job started **before**
`hotfix-id-archive-scan.red.node.test.ts` was written to disk — confirmed by inspecting the running
process's own `tsx --test <file-list>` argv, which does not include the new file (`run-default-tests.mjs`
globs synchronously at process start, before the file existed):

```
ℹ tests 2576
ℹ suites 896
ℹ pass 2574
ℹ fail 1
ℹ cancelled 0
ℹ skipped 1
ℹ todo 0
```

**2576 / 2574 / 1 / 1 — exact match to the dispatch's stated control number.** The one failure is the
pre-existing `test/commands/sync.node.test.ts` network case (`Error: cannot reach
https://cleargate-mcp.soula.ge`), identical to N10's description. No other delta. Not chased.

## Post-authoring measurement — full suite WITH the red file present

Re-run synchronously per orchestrator instruction, captured to `/tmp/bug045-suite.log`, summary read
from the completed log file (not the live pipe):

```
$ npm --prefix cleargate-cli test > /tmp/bug045-suite.log 2>&1
$ grep -n "^ℹ " /tmp/bug045-suite.log | tail -7
ℹ tests 2583
ℹ suites 903
ℹ pass 2577
ℹ fail 5
ℹ cancelled 0
ℹ skipped 1
ℹ todo 0
```

Delta from control: **+7 tests, +3 pass, +4 fail, skipped unchanged** — exactly the 7 scenarios in
the new file (3 green, 4 red). The 5 failing tests, by name:

```
test/commands/hotfix-id-archive-scan.red.node.test.ts:1:2692   (R1)
test/commands/hotfix-id-archive-scan.red.node.test.ts:1:3260   (R2)
test/commands/hotfix-id-archive-scan.red.node.test.ts:1:4227   (R4)
test/commands/hotfix-id-archive-scan.red.node.test.ts:1:5209   (R6)
test/commands/sync.node.test.ts:1:18146                        (pre-existing, unchanged)
```

**No other file in the suite regressed.** Typecheck re-run after the commit: clean, exit 0.
`node scripts/check-no-inline-id-regex.mjs` → `no inline work-item-id regexes` (my file lives under
`test/`, outside `DEFAULT_ROOTS` anyway, and introduces no hand-rolled id pattern).

## Per-scenario red/green table, with the mutant each kills

Measured via the targeted runner (`npm --prefix cleargate-cli exec -- tsx --test
test/commands/hotfix-id-archive-scan.red.node.test.ts`), reproduced identically inside the full-suite
run above.

| # | Scenario | Status | Mutant it kills |
|---|---|---|---|
| R1 | `archive/` holds `HOTFIX-001`, `pending-sync/` empty → next is `HOTFIX-002` | **RED** | scanning `pendingDir` only — the shipped code (`hotfix.ts:164`) |
| R2 | `pending-sync/` `HOTFIX-002`, `archive/` `HOTFIX-005` → next is `HOTFIX-006` (union, not per-dir) | **RED** | treating `archiveDir` as a fallback consulted only when `pendingDir` is empty, instead of a true peer in the union. See note below — deliberately NOT the item's illustrative "001 archived / 002 pending → 003" example. |
| R3 | `archive/` absent entirely (directory does not exist) → no throw, allocation proceeds from `pending-sync/` alone | GREEN (already, at both control and post-authoring) | dropping the `try/catch` around the archive `readdirSync` (would throw `ENOENT` on a fresh install with no `archive/` at all) — vacuously true today since the shipped `maxHotfixId` never touches `archiveDir`; becomes a live guard once the fix adds the read. |
| R4 | Malformed filenames in both dirs (`HOTFIX-notes.md` in pending, a lowercase `hotfix-099_x.md` in archive) are ignored, not parsed as 0/NaN/99 | **RED** | replacing `idFromFilename`/`classifyType` with a hand-rolled, case-insensitive regex (the BUG-041 shape) — the lowercase entry is deliberately numbered *higher* (99) than the one real archived id (5) so a case-insensitive mutant inflates the max and is caught, rather than being masked by a lower phantom value |
| R5 | `HOTFIX-009` present (pending only) → next is `HOTFIX-010`, not `HOTFIX-10` | GREEN (already) | removing `padStart(3,'0')`, or padding to a width derived from the input — deliberately isolated to `pendingDir` only, orthogonal to the archive-scan defect, already correct pre-fix |
| R6 | `archive/` `HOTFIX-001` backdated 30 days → next is still `HOTFIX-002` (allocator ignores mtime) | **RED** | **the one that matters** — inheriting `countActiveHotfixes`'s 7-day mtime filter (`hotfix.ts:106-108`) into the allocator. Passes R1–R5 and re-opens the bug for any archive older than a week. |
| R7 | 3 hotfixes archived 30 days ago (ids 901-903, deliberately disjoint from every other scenario's id range) → the cap does NOT block a new hotfix | GREEN (already) | applying the new union-scan to `countActiveHotfixes` as well, which would make the cap permanent. Assertion scoped strictly to exit code + absence of the `"Hotfix cap"` message — never to the specific id allocated, so this scenario cannot fail for an allocator reason and mask its named cap-permanence mutant. |
| R8 | Existing `hotfix-new.integration.node.test.ts` Scenarios 1–5 stay green | 7 of 9 pass; **2 pre-existing failures, unrelated to BUG-045** — see below | any accidental regression in the id/cap logic those scenarios cover |

4 of 7 authored scenarios (R1, R2, R4, R6) are genuinely red against the clean `e4cb49f` baseline; R3,
R5, R7 are legitimate green-by-design regression guards, each naming the specific future mutant it
exists to catch, per the same allowance used in prior QA-Red rounds this sprint (e.g. BUG-046's C3/C5).

### R2 — deliberate deviation from the item's illustrative example (measured, not assumed)

BUG-045 §5 case 2 and the M4 plan's own scenario text read "001 archived, 002 pending → next is
003." I built that exact fixture first and measured it: `pendingDir`'s own (shipped, archive-blind)
max is already `2`, so the shipped code computes `HOTFIX-003` — the CORRECT answer, by coincidence,
because `pendingDir` happens to hold the higher id. That fixture is **not diagnostic against
e4cb49f** — it would be green at baseline, contradicting the Task Breakdown's own instruction to
"confirm R1, R2, R6 red." I re-derived R2 with `archiveDir` holding the higher id instead
(`pending=002`, `archive=005`, correct next = `006`), which IS red at baseline and still proves the
union-scan requirement (a plausible "consult archive only when pending is empty" mutant would
compute `002`'s own max and miss `005`). Noted honestly rather than silently keeping the item's
literal numbers: no single two-id fixture can be simultaneously red-at-baseline AND diagnostic
against every conceivable ordering mutant (an "archiveDir-alone-unconditionally" mutant, in
particular, is not independently distinguished by R2 — it would need a third fixture where
`pendingDir`'s max exceeds `archiveDir`'s, which is the same non-diagnostic-at-baseline shape as the
item's own example).

### R8 — the 2 failures are pre-existing and out of BUG-045's scope

```
$ npm --prefix cleargate-cli exec -- tsx --test test/commands/hotfix-new.integration.node.test.ts
ℹ tests 9
ℹ pass 7
ℹ fail 2
```

Both failures are in "Scenario 5: wiki/index.md has Hotfix Ledger section linking to
hotfix-ledger.md" — that scenario reads the OUTER meta-repo's `.cleargate/wiki/index.md` (a
cross-repo dependency baked into the existing test's own `REPO_ROOT` resolution, pre-dating this
story). Confirmed directly: `grep -c "Hotfix Ledger" .cleargate/wiki/index.md` in the outer repo
returns 0 today — the outer wiki simply hasn't been rebuilt with that section in this checkout
state. Scenarios 1-3 (id allocation and cap logic — the only parts of this file BUG-045 touches) and
Scenario 4 (template check) are fully green, both before and after my commit. This file is also
excluded from the default `npm test` glob (`*.integration.node.test.ts` is negated in
`run-default-tests.mjs`), so it does not appear in either of the two full-suite numbers above. Not
fixed here — out of scope, outer-repo, forbidden surface.

## Cross-Cutting Rule 6 numbers (commits inside `cleargate-cli` are ungated)

- `npm --prefix cleargate-cli run typecheck` — **exit 0**, both before authoring and after the
  commit.
- `npm --prefix cleargate-cli test` (full default suite) — **control 2576/2574/1/1**, **post-commit
  2583/2577/5/1** (delta fully accounted for by the 4 intentionally-red + 3 intentionally-green new
  scenarios; zero unrelated regressions).

## What I did NOT author, and why

- `cleargate-cli/CHANGELOG.md` bullet — explicitly the Developer's row per the dispatch (M4 plan
  §Q5-C: BUG-045 adds one bullet under the existing `## Unreleased`, not opening a second one). Not
  touched.
- `hotfix.ts`, `work-item-id.ts`, `work-item-type.ts`, `stamp-frontmatter.ts`, `cli.ts` — read for
  context only, per the dispatch's forbidden-edit list. `maxHotfixId` widening to accept N
  directories is the Developer's task.

## Flashcards flagged

None new. The relevant existing cards (`#test-harness #npm #danger` on `npm --prefix ... test -- <file>`
not filtering; `#id-parsing #danger` on hand-rolled regexes; `#test-harness #danger` on piping a live
run through `tail`) were followed, not rediscovered.

STATUS=done

---

role: qa (QA-RED, round 2 — TPV rulings applied)

## Round 2 (TPV rulings applied)

commit SHA: b79adbd93adb8dab9270e70799ed50c1fff1c318 (`git rev-parse story/BUG-045`, verified)
short SHA: b79adbd — subject `test(BUG-045): TPV round-2 — type filter, per-dir ENOENT, grammar and padding`

Repo: `cleargate-cli`, branch `story/BUG-045`, HEAD advanced from round-1's `6169ed7`.
`git status --porcelain` clean after commit. `git diff --stat 6169ed7..b79adbd`: exactly one
file, `test/commands/hotfix-id-archive-scan.red.node.test.ts` (+191/-11 — R9-R15 appended,
`makeTmpRepo`/`useRepo` widened to accept `seedPendingDir`, R5's comment corrected). No
implementation file touched. `stash@{0}` (BUG-043 WIP tarball) untouched.

Source for R9-R15: `.cleargate/sprint-runs/SPRINT-39/BUG-045-tpv.md` §T8 (measured,
copy-ready spec) — each fixture built to TPV's exact spec, then independently re-measured
against `BASE` here rather than trusted blind.

### New cases, measured red/green and the mutant each kills

All measured via `npm --prefix cleargate-cli exec -- tsx --test --test-reporter=tap
test/commands/hotfix-id-archive-scan.red.node.test.ts`, output redirected to a log and read
from the completed file (N10 — never piped through `tail`/`head` live).

| # | Scenario | at BASE (measured) | TPV predicted | Match |
|---|---|---|---|---|
| R9 | pending-sync/ absent entirely, archive/ `HOTFIX-001` → `HOTFIX-002` | **RED** | RED | ✓ |
| R10 | pending `HOTFIX-009`, archive/ absent entirely → `HOTFIX-010` | green | green | ✓ |
| R11 | archive/ holds unpadded `HOTFIX-12` → `HOTFIX-013` | **RED** | RED | ✓ |
| R12 | archive/ holds dash-separated `HOTFIX-007-dash-slug.md` → `HOTFIX-008` | **RED** | RED | ✓ |
| R13 | archive/ holds bare `HOTFIX-013.md` (no separator) → `HOTFIX-014` | **RED** | RED | ✓ |
| R14 | archive/ holds only non-HOTFIX ids (`STORY-999-01`, `CR-500`) → `HOTFIX-001` | green | green | ✓ |
| R15 | item §2 protocol verbatim: create → mv to archive/ → create → `HOTFIX-002` | **RED** | RED | ✓ |

Mutant attribution (per TPV §T8, not independently re-derived by mutation — QA-Red has no
out-of-tree mutation harness; TPV already built and measured the 17 mutants):

- **R9** — sole R1-R15 killer, with R10, of **M6b/M6c** (one `try/catch` around the whole
  directory loop instead of one per directory). R9 catches the case where `pendingDir` is
  the ABSENT one and `archiveDir` holds the data that must survive.
- **R10** — kills **M6b** specifically (the `catch { return 0 }` variant): if `pendingDir`
  (scanned first) accumulates `max=9` and `archiveDir` then throws, a single wrap-the-whole-
  loop catch discards the accumulated 9. Does not independently distinguish M6c (`catch {
  return max }`), which is already correct on this fixture — that's R9's job.
- **R11** — sole killer of **M5d** (pad width inherited from the widest scanned stem,
  defaulting to 3 only on an empty corpus). A 2-character stem ("12") in a non-empty corpus
  makes an inheriting mutant emit `HOTFIX-13` instead of the fixed-literal `HOTFIX-013`.
- **R12, R13** — sole killers of **M3b** (hand-rolled, case-sensitive, underscore-only id
  regex `/^HOTFIX-(\d+)_/`), from the dash-separator and no-separator directions
  respectively. R4 (round 1) covers only the case-insensitivity direction of the same
  mutant class; neither R12 nor R13 duplicates it.
- **R14** — sole killer of **M9** (drops `classifyType(id) === 'HOTFIX'` while widening the
  scan). Minimal reproduction, not the real-tree numbers from §T4 — two non-HOTFIX archived
  ids with numeric stems far higher than any real HOTFIX id; the fix must ignore both.
- **R15** — kills the shipped archive-blind scan end-to-end (two sequential real
  `hotfixNewHandler` invocations through create → mv → create), and independently kills
  **M5c** (empty-corpus default-1 padding) via its FIRST creation, which runs against a
  genuinely empty `pending-sync/` AND `archive/` — a case R3 does not reach (R3 leaves
  `pending-sync/` present-and-empty, never both dirs empty at once).

**R5 comment correction applied** (TPV §T3, not a behavior change — same fixture, same
assertions): the prior comment framed R5's `pendingDir`-only fixture as "isolated … orthogonal
to the archive-scan defect." Corrected to state it is the SOLE R1-R7 killer of M1 (scan
`archiveDir` alone) and M2b (per-directory max, last-dir-wins) precisely because of that
isolation, and that moving its id into `archive/` would destroy both kills. No fixture or
assertion changed — attribution only.

**No delta from TPV's predicted table.** All 7 new cases plus R5's re-verified R1-R7 baseline
matched TPV's §T8 row-by-row exactly on the first run — no reconciliation needed.

### Suite line — after R9-R15, before Developer's `hotfix.ts` fix

Targeted file alone (`npm --prefix cleargate-cli exec -- tsx --test --test-reporter=tap
test/commands/hotfix-id-archive-scan.red.node.test.ts`):

```
tests 14
suites 14
pass 5
fail 9
```

Matches TPV's "Augmented file measured: BASE → pass 5 · fail 9" exactly (§T8).

Full suite (`npm test`, redirected to `/tmp/bug045-r2-fullsuite.log`, read from the completed
file — never piped live through `tail`/`head`, N10):

```
ℹ tests 2590
ℹ suites 910
ℹ pass 2579
ℹ fail 10
ℹ cancelled 0
ℹ skipped 1
ℹ todo 0
```

**Matches TPV's derived pre-fix line exactly: `2590 / 910 / 2579 / 10 / 1`.** Failing-test
list confirmed as exactly R1, R2, R4, R6 (round 1), R9, R11, R12, R13, R15 (round 2, all in
`hotfix-id-archive-scan.red.node.test.ts`) plus the one pre-existing
`test/commands/sync.node.test.ts` network case (`cannot reach https://cleargate-mcp.soula.ge`,
N10, not chased). No other file in the suite regressed. `npm run typecheck` → exit 0.
`npm run check:no-inline-id-regex` → `no inline work-item-id regexes`, exit 0.

### Integration file (`hotfix-new.integration.node.test.ts`) — run, not greened

```
$ npm --prefix cleargate-cli exec -- tsx --test test/commands/hotfix-new.integration.node.test.ts
ℹ tests 9
ℹ suites 6
ℹ pass 7
ℹ fail 2
```

**9 / 7 / 2 — exact match to the dispatch's stated number.** Both failures are Scenario 5
("wiki/index.md has Hotfix Ledger section linking to hotfix-ledger.md"), asserting against the
OUTER meta-repo's `.cleargate/wiki/index.md`, which today carries no `## Hotfix Ledger`
heading. Unrelated to id allocation — Scenarios 1-3 (allocation + cap) and 4 (template) are
green. Not touched, per TPV §T5 and the dispatch: this file carries the only pre-existing
regression guard on the allocator and stays in a tier no hook/CI runs, which is exactly why
`hotfix-id-archive-scan.red.node.test.ts` staying in the **default** tier matters.

### Cases I could not author verbatim

None. All seven of R9-R15 were authored to TPV's §T8 spec and matched its predicted red/green
on first measurement — no substitution, no deviation.

### What I did NOT touch

- `cleargate-cli/src/commands/hotfix.ts` and every other implementation file — read-only,
  forbidden surface, untouched (confirmed by `git diff --stat`).
- `CHANGELOG.md` — Developer's row per the dispatch and TPV §T6 (explicit "declared Developer
  surface" amendment).
- No outer-repo file written, moved, or renamed.
- No `cleargate init`, `cleargate wiki`, bare `cleargate`, or `dist/cli.js` verification (N9).
- No `git reset --hard`, `checkout --`, `stash`, force push, or branch switch. `stash@{0}`
  left untouched.

## Flashcards flagged

None new this round — TPV's §T10 proposed cards are explicitly the orchestrator's to write
(outside this dispatch), and I have nothing additional to add beyond what TPV already
surfaced and independently reconfirmed above.

STATUS=done
