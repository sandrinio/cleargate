role: qa
STORY: BUG-045

# QA-Verify: BUG-045 — `hotfix new` ID scan ignores `archive/`

Repo: `cleargate-cli` (own git repo, gitignored inside outer meta-repo). Branch `story/BUG-045`,
main checkout (not a worktree — `git ls-files cleargate-cli/` is 0 in the outer repo). Commit
verified independently: `git rev-parse story/BUG-045` -> `c589a039c4e3201c5e84ac959b175fb114e6aa00`,
matching the Developer's claimed SHA exactly.

## QA: PASS

## Commands re-run independently — status lines read from completed log files, never piped live (N10)

| Command | Result |
|---|---|
| `npm --prefix cleargate-cli run typecheck` | **exit 0**, clean |
| `npm --prefix cleargate-cli test` (full default suite) | `tests 2590 · suites 910 · pass 2588 · fail 1 · skipped 1` — **exact match** to the expected line. Sole failure: `test/commands/sync.node.test.ts:1:18146`, the pre-existing N10 network case (`cannot reach https://cleargate-mcp.soula.ge`). Confirmed via `grep -B5` on the log: no other `not ok`. |
| `npm --prefix cleargate-cli exec -- tsx --test test/commands/hotfix-id-archive-scan.red.node.test.ts` | `# tests 14 # suites 14 # pass 14 # fail 0` — **14/14/0**, exact match |
| `npm --prefix cleargate-cli exec -- tsx --test test/commands/hotfix-new.integration.node.test.ts` | `# tests 9 # suites 6 # pass 7 # fail 2` — **9/7/2**, exact match. Both failures are subtests under `not ok 5 - Scenario 5: wiki/index.md has Hotfix Ledger section...` (`failureType: subtestsFailed`, `error: '2 subtests failed'`) — the outer meta-repo's wiki, unrelated to id allocation. Confirmed the single top-level failure is Scenario 5 and nothing else. |
| `npm --prefix cleargate-cli run check:no-inline-id-regex` | `no inline work-item-id regexes`, exit 0 |

## TYPECHECK: pass

## TESTS: 2588 passed, 1 failed, 1 skipped (full suite; the 1 failure is pre-existing/N10, unrelated)

## The check the gate cannot perform — done by hand

`git diff -U0 -- src/commands/hotfix.ts | grep -n '/\^\?HOTFIX'` (diff scoped `e4cb49f..c589a039`, the full
branch range, and independently re-checked against `story/BUG-045` HEAD) → **no output, exit 1 (no
matches)**. No new HOTFIX-id regex literal appears on any added line — the only pre-existing regex-shaped
text in the file is the comment at `hotfix.ts:41-42` (`// BUG-041: was /^HOTFIX-(\d+)_.*\.md$/`), which
is unchanged context, not an addition (confirmed: it does not appear inside either diff hunk). The
implementation reaches the grammar only through `idFromFilename`, `classifyType`, `numericStem` imported
at `hotfix.ts:17` from `../lib/work-item-id.js` — verified by reading the full function body.

## Seven allocator constraints — verified by reading the code, each with the line I read

1. **Union semantics, both directories as peers — CONFIRMED.** `hotfix.ts:55` `let max = 0;` sits
   *outside* the `for (const dir of dirs)` loop (`:56`) and is never reset inside it. Single
   accumulator, true union.
2. **Per-directory missing-directory tolerance — CONFIRMED.** Each directory gets its own
   `try { entries = fs.readdirSync(dir); } catch { continue; }` (`hotfix.ts:58-61`) *inside* the loop
   body — not one catch wrapped around the whole loop. Both `pending-sync/` and `archive/` are
   independently ENOENT-tolerant; call-site argument order (`maxHotfixId(pendingDir, archiveDir)`,
   `:173`) cannot matter because each directory's failure is isolated and the accumulator persists
   across iterations.
3. **The type filter survives — CONFIRMED.** `classifyType(id) === 'HOTFIX'` still gates the inner
   loop at `hotfix.ts:65`, inside the widened per-directory scan. This is the constraint that defeats
   the item's own collision-freedom argument (TPV's M9 mutant) — verified present, not just absent of
   a clash.
4. **No new id regex — CONFIRMED.** See above.
5. **Pad width fixed literal `3` — CONFIRMED.** `hotfix.ts:175` `padStart(3, '0')`, unchanged, outside
   `maxHotfixId` entirely — the corpus scan has no knowledge of padding.
6. **`nextId = maxId + 1` — CONFIRMED.** `hotfix.ts:174`, unchanged (not touched by this diff at all).
7. **`countActiveHotfixes` byte-unchanged — CONFIRMED by `git diff`, not test result.**
   `git diff b79adbd..c589a039 --stat` (QA-Red's final commit to the Developer's commit) shows exactly
   two files: `CHANGELOG.md` (+12) and `src/commands/hotfix.ts` (+43/-17, net +26). Read the full
   `git show c589a039 -- src/commands/hotfix.ts`: the diff contains exactly two hunks — the
   `maxHotfixId` function body/signature, and the two-line call-site addition
   (`archiveDir` resolution + widened call). `countActiveHotfixes` (`hotfix.ts:82-121` in the current
   file) falls entirely outside both hunks. Zero changed lines in that span.

Also confirmed: `grep -rn "maxHotfixId" cleargate-cli/src` → exactly 2 hits
(`src/commands/hotfix.ts:54` definition, `:173` call site). The doc comment above `maxHotfixId`
(`hotfix.ts:44-51`) no longer claims "Scan pending-sync/" — it now states the union-of-directories,
per-directory-ENOENT-tolerant behaviour and cites BUG-045 by name (N7 satisfied).

## ACCEPTANCE_COVERAGE: 14 of 14 scenarios (R1-R7, R9-R15) have matching, passing tests; R8 is a
separate hand-run of the pre-existing integration file per TPV/plan ruling, also confirmed (9/7/2,
unrelated failures)

Verified the test file itself (`test/commands/hotfix-id-archive-scan.red.node.test.ts`) carries all
14 `describe` blocks named R1-R7, R9-R15 (grepped `^describe`), each matching its scenario name in the
TPV report and M4 plan. Wiring: imports resolve (`hotfixNewHandler` from `../../src/commands/hotfix.js`),
`afterEach` drains `tempRepos` and `rmSync`s each fixture root, `runHotfixNew` exercises the real
`cwd`/`exit`/`stdout`/`stderr` seam. No `t.mock.method()` used, nothing to mis-reference. This is the
red-now-green case (CR-081): R1, R2, R4, R6, R9, R11, R12, R13, R15 were red at `BASE`/`e4cb49f` (per
QA-Red's and TPV's independently-reproduced control) and are now green against `c589a039` — no separate
green-path file was required or expected.

MISSING: none.

## REGRESSIONS: none

Full suite delta from the pre-story control (`2576/2574/1/1`, per QA-Red's control measurement) to
post-fix (`2590/2588/1/1`) is fully accounted for by the +14 new scenarios in the red-test file (9 flip
red-to-green, 5 already green-by-design) — zero unrelated test files changed status. The one remaining
failure (`sync.node.test.ts` network case) is present identically at control, at QA-Red HEAD, at TPV's
independent re-measurement, and now — unchanged throughout, confirmed N10.

## CHANGELOG.md — verified

- `### Fixed` inserted immediately after `## Unreleased` (line 6), **above** the pre-existing
  `### Changed` — matches `## [0.24.2]`'s own Fixed → Added → Changed ordering (read that section
  directly to confirm the convention).
- `grep -c '^## Unreleased' CHANGELOG.md` → **1**.
- `git diff e4cb49f..c589a039 -- package.json` → **0 lines** (untouched).
- Entry content states all three required things: the user-visible behaviour (hotfix new reused
  archived ids), why it fires in normal use (the protocol mandates the pending-sync -> archive move,
  so the steady state is exactly the blind spot), and the mtime asymmetry (allocator ignores archive
  age; the cap still respects the 7-day window, and inheriting that filter would re-open the bug).

## Also verified

- **Test file byte-unchanged by the Developer's commit.** `git diff b79adbd..c589a039 -- test/commands/hotfix-id-archive-scan.red.node.test.ts` → 0 lines. Only `CHANGELOG.md` and `src/commands/hotfix.ts` are in the Developer's commit.
- **Zero outer-repo commits.** Outer repo `git log --oneline -5` shows no BUG-045 commit; `git status --porcelain` shows only the untracked `.cleargate/sprint-runs/SPRINT-39/BUG-045-dev.md` report file (not committed). All work is confined to the `cleargate-cli` commit `c589a039`.
- **No `dist/` rebuild (N9).** `cleargate-cli` `git status --porcelain` is clean; `dist/cli.js` mtime (Aug 28, 12:14) predates the commit (Aug 29, 14:18) and is untouched/uncommitted.
- **`stash@{0}` untouched.** `git stash list` still shows `stash@{0}: WIP on story/BUG-043: 1e01ea0 fix(EPIC-043): BUG-043 upgrade refuses...` — the BUG-043 WIP tarball, unaffected.
- **Commit message** correctly declares zero outer-repo commits and cites the N8/N4 rationale for not ticking the item file's Task Breakdown.

## Adjudication — the Developer's one declared plan deviation

The dispatch characterized this as "marked `orchestrator_confirmed: true`." **That characterization does
not match the actual report.** `grep -in "orchestrator_confirmed" BUG-045-dev.md` returns **zero hits** —
there is no `## plan_deviations` structured block at all (sibling reports this milestone, e.g.
`BUG-043-dev.md` and `BUG-046-dev.md`, carry one with `orchestrator_confirmed: false` per deviation; the
BUG-045 report has no such field, structured or otherwise). The Developer's report states the reasoning in
narrative prose under `## Task Breakdown` — citing M4 plan **N8** (surface gate inert on `BUG-`/`CR-`
items this milestone; item Task Breakdown rows exist "for the Developer's benefit, not the gate's") and
the dispatch's explicit "Zero outer-repo commits" mandate — and does **not** assert that the orchestrator
confirmed anything. If anything this under-claims relative to the sprint's own convention rather than
over-claims: it neither ticks the field `true` nor `false`, it simply omits it. The reasoning itself is
sound and citation-backed (N8 + the zero-outer-commit mandate are real constraints, both read directly in
the M4 plan and this dispatch).

**Substance check, all seven Task Breakdown rows, confirmed independently (not taken on the Developer's
word):**

1. Branch `story/BUG-045` from `cleargate-cli main @ e4cb49f`, main checkout — CONFIRMED (`git log`
   shows `story/BUG-045` built on `e4cb49f`; `git ls-files cleargate-cli/` in the outer repo is 0, so
   no worktree materialized it).
2. QA-Red authored R1-R7 (round 1, commit `6169ed7`) and R9-R15 (round 2, commit `b79adbd`) — CONFIRMED
   via the QA-Red report and `git log --oneline` on `story/BUG-045`.
3. `maxHotfixId` widened to N dirs, called `(pendingDir, archiveDir)` — CONFIRMED, `hotfix.ts:54`/`:173`.
4. `countActiveHotfixes` byte-unchanged — CONFIRMED via `git diff`, not test result (see constraint 7
   above).
5. `CHANGELOG.md` bullet under existing `## Unreleased` — CONFIRMED.
6. Typecheck + full suite run, numbers recorded — CONFIRMED, both independently re-run by me above with
   matching numbers.
7. `grep -rn "maxHotfixId" cleargate-cli/src` returns exactly 2 — CONFIRMED.

The outer-repo item file's `## Task Breakdown` checkboxes remain `- [ ]` (verified: all seven still
unchecked in `.cleargate/delivery/pending-sync/BUG-045_Hotfix_Id_Scan_Ignores_Archive.md`). Per M4 plan
R5, these rows are the orchestrator's to tick — not a QA blocker, and not something the Developer had
authority or a mandate to commit given the zero-outer-repo-commit constraint.

## Acceptance Gherkin / DoD (item §5, as amended)

Bug items use a Verification Protocol, not Gherkin. Read the item's amended §5 in full (orchestrator
amendments per TPV T9(a)/T9(c) applied 2026-08-29):

1. The failing test (archive-only HOTFIX-001 -> HOTFIX-002) — R1, green. ✓
2. Split-across-dirs, corrected to the diagnostic arrangement (`pending=002`/`archive=005`->`006`) per
   the amendment — R2, green. The item's §5 amendment text is present verbatim in the item file, matching
   TPV's T9(a) ruling exactly (confirmed by re-reading the item file). ✓
3. `archive/` missing -> no throw — R3/R9/R10, green. ✓
4. Malformed filenames ignored — R4/R12/R13, green. ✓
5. Zero-padding preserved — R5/R11, green. ✓
6. Existing behaviour with populated `pending-sync/` unchanged — R8 (integration file hand-run), 7/9
   green, 2 pre-existing unrelated failures. ✓
7. Collision-freedom-is-not-sufficient amendment (TPV T9(c)) — R14, green (type filter confirmed present
   in the code, not just passing by absence of a clash). ✓

All satisfied. Ambiguity Gate is 🟢 in the item frontmatter/footer and nothing in this dispatch's findings
reopens it.

## flashcards_flagged

- "2026-08-29 · #qa #process · A dispatch's characterization of a dev report's field can be stale/wrong — grep the literal field before adjudicating a claimed deviation, don't trust the framing."

STATUS=PASS
