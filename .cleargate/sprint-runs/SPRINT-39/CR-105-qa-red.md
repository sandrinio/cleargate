# CR-105 QA-Red Report — SPRINT-39 wave9

role: qa

**Mode: RED.** cleargate-cli branch `story/CR-105`, commit `851d4dfe3ac1954010c3c86e277d837fd645455c`,
subject `test(CR-105): red baseline for block-leads contract`, cut from cli `main` at `1133bf7`
(BUG-043 merged). Outer repo untouched (`764ad6ba`, still on `story/CR-105`, no commits added).

## Files authored / modified

| File | Δ | Purpose |
|---|---|---|
| `cleargate-cli/test/init/claude-md-block-leads.red.node.test.ts` | +252 (new) | 10 scenarios against `injectClaudeMd`/`initHandler`, per M3 plan's CR-105 `### Test scenarios` table |
| `cleargate-cli/test/docs/claude-md-block-leads-relocation.red.node.test.ts` | +85 (new) | outer-half doc-truth (BUG-043 post-flight P8) — 3 assertions against root/canonical `CLAUDE.md` |
| `cleargate-cli/test/commands/init.node.test.ts` | +6/-5 | scenario 3 inverted + retitled; scenario 4 retitled |
| `cleargate-cli/test/lib/claude-md-anchoring.red.node.test.ts` | +1/-1 | `:109` title fixed (`— appends instead` → `(CR-105: block leads, not appends)`) |
| `cleargate-cli/test/commands/upgrade-claude-md.red.node.test.ts` | +2/-1 | `:10` comment-only citation repair (`upgrade.ts:364-378` → `:368-388`) |

Total: 346 insertions / 7 deletions across 5 files, one commit.

## Suite numbers

| | tests | pass | fail | skipped |
|---|---|---|---|---|
| **Control** (`story/CR-105` @ `1133bf7`, before this commit — measured via `git stash push -u`, full suite, then popped) | 2557 | 2555 | 1 | 1 |
| **After this commit** | 2572 | 2562 | 9 | 1 |
| **Δ** | +15 | +7 | +8 | 0 |

Control matches the dispatch's expected `2557/2555/1/1` exactly — the single pre-existing failure
is `test/commands/sync.node.test.ts` "exits 2 when no MCP URL or token is configured", `Error:
cannot reach https://cleargate-mcp.soula.ge (fetch failed)` — unrelated, unchanged, not chased.

`npm --prefix cleargate-cli run typecheck`: **clean, exit 0**.

+15 tests = 12 in the new cli-half file + 3 in the new outer-half doc-truth file. +8 new failures
(9 total − 1 pre-existing) = 5 in the cli-half file (scenarios 2, 3, 6, 7, 10) + 2 in the outer-half
file (assertions 1, 2) + 1 from inverting `init.node.test.ts` scenario 3.

## Per-scenario red/green — `claude-md-block-leads.red.node.test.ts` (12 tests, 5 red / 7 green)

| # | Scenario | Baseline | Justification |
|---|---|---|---|
| 1 | `existing === null` | **GREEN** | Branch untouched by CR-105 (Gotcha: "leave it alone"). Regression pin against a future refactor accidentally touching this branch. |
| 2 | prose, no block | **RED** | Today's `injectClaudeMd` appends; output does not start with START. |
| 3 | block at bottom | **RED** | Today's in-place replace leaves the block at the bottom. (Sub-note: "prose intact" and "old body gone" are individually ALREADY true under baseline — only `starts with START` discriminates. The test as a unit is still red since one failing assert aborts it.) |
| 4a | idempotence, general round trip (bottom fixture, run twice) | **GREEN** | Also green under today's in-place replace (position is stable both times at the bottom, not the top). Regression pin against unbounded growth across repeated applications, not an eviction marker. |
| 4b | idempotence, already-at-top **block-only** (no prose), single application | **GREEN** | Kills a specific mutant: an implementation missing the `rest.length === 0` branch (measured — see below) is byte-**un**identical here (`block+'\n'` → `block+'\n\n\n'`), so this is the load-bearing sub-case, not 4a. |
| 4c | idempotence, already-at-top **with prose**, single application | **GREEN** | Regression pin for `.trim()` on both ends (dispatch: "Do not `trimStart()` only"). Does not by itself discriminate old-vs-new or the `rest.length===0` bug (that code path already returns the same bytes whether or not the branch exists, when `rest` is non-empty) — 4b is what catches that. |
| 5 | block replacement | **GREEN** | Already true under today's in-place replace (body-swap correctness is unrelated to CR-105's position change). Regression pin against future body-swap residue. |
| 6 | evicted logic — final line ≠ END | **RED** | Today's append makes the END marker the file's trailing content. |
| 7 | evicted logic, direct — `startIdx < userIdx` | **RED** | Exact inversion of `init.node.test.ts`'s (now-corrected) `:314` assertion; same fixture text. |
| 8 | N9 — `anchoredStarts===1` despite substring count 2 | **GREEN** | Verified this is a **counting-method** invariant, not a position invariant: measured under BOTH old (append) and new (prepend) logic using the REAL canonical block (which quotes its own markers inline at line 56) — `anchoredStarts` is 1 either way. Pins the exact N9 trap for whichever implementation ships. |
| 9 | manifest invariant (N5) | **GREEN** | Static invariant, independent of CR-105's behaviour change (`classifyPath('CLAUDE.md')===null`, 0/70 rows). Regression pin against a future dev "fixing" `upgrade`'s unreachable branch by adding a manifest row. |
| 10 | handler-level, `initHandler` against a tmpdir | **RED** | Same mechanism as 2/7, exercised through the full `init` pipeline rather than the pure function — independent, integration-level duplicate of the inverted `init.node.test.ts` scenario 3. |

**Discrimination proof for 4b** (measured, not reasoned): a candidate `injectClaudeMd` body of the
shape `return block + '\n\n' + stripped.trim() + '\n';` (no `rest.length === 0` branch) applied once
to the block-only-at-top fixture `${BLOCK}\n` produces `${BLOCK}\n\n\n` — **not** byte-identical to
the fixture — while the same buggy body applied to a two-run round trip on a prose-bearing fixture
(4a's shape) stabilises after one application because `.trim()` erases accumulated blank-line growth
on every call, so 4a alone would NOT have caught this. 4b is therefore load-bearing; 4a is not
redundant to include (it is the literal CR-105 §4 acceptance-bullet phrasing and guards a different,
real mutant — non-terminating growth across a chain of repeated applications more generally).

## Per-assertion red/green — outer-half doc-truth (3 tests, 2 red / 1 green)

| # | Assertion | Baseline | Justification |
|---|---|---|---|
| 1 | root `CLAUDE.md` first non-empty line === START marker | **RED** | Measured: `"# ClearGate Meta-Repo"`. Block still at lines 129–186 of 186. |
| 2 | canonical `CLAUDE.md:3` contains no `"appends"` | **RED** | Measured: line 3 verbatim still reads `"…init **appends** the bounded block below…"`. |
| 3 | block-body hash parity (`hashNormalized(readBlock(root)) === hashNormalized(readBlock(canonical))`) | **GREEN, must stay green** | Measured 11762/11762. Not decorative — `drift-check.ts:118-128` compares exactly this and a mismatch sets `outcome.blocker = true` on bare `cleargate doctor`. Relocation must move the block, never edit it; this is the only test that would catch a one-byte drift introduced during relocation. |

## Line citations I re-derived — all matched the plan/dispatch, none disagreed

Per the dispatch's own warning that several plan citations were stale (pre-BUG-043 shift), I
re-measured every one from the live tree rather than trusting either the M3 plan body or the
dispatch text:

- `inject-claude-md.ts`: `BLOCK_REGEX` at `:23`, `injectClaudeMd` body's append/replace branch at
  `:51-57` (P7's corrected range) — matches P7, not the M3 plan body's stale `:46-52`/`:7-10`.
- `claude-md-surgery.ts`: `BLOCK_REGEX` `:12`, `hasAnchoredBlock` `:20-22`, `writeBlock` `:39-50`,
  `removeBlock` `:56-...` — matches N2/N3/N8 as shipped.
- `test/commands/init.node.test.ts` scenario 3: test spans `:299-319`, assertion at `:314` — matches
  P5 exactly (`assert.ok(startIdx > userIdx)` before my edit). Scenario 4: `:323-344` (P7(b) cites
  `:323-346`, off by the closing-brace/blank-line count only — same test, no disagreement on content).
- `test/lib/claude-md-anchoring.red.node.test.ts:109` — the stale-titled test, confirmed at exactly
  that line. `countAnchoredLines` helper confirmed unexported (local to that file, `:304-308`), so my
  new file carries its own copy of the same counting logic (not a second `BLOCK_REGEX` — N7's
  kick-back is about the grammar, this is a line-counting helper).
- `upgrade.ts`: `mergedContent = writeBlock(ours, theirBlock);` confirmed at **`:381`**, `try` at
  `:368`, `catch` closing at `:388` — matches P9 and P10(a) exactly. `upgrade-claude-md.red.node.test.ts:10`'s
  stale citation (`:364-378`) confirmed and repaired to `:368-388`.
- `uninstall.ts`: `try :436`, `removeBlock :437`, `writeAtomic :438`, `push :439`, `catch :440-442` —
  matches P10(b)'s "original citation is CORRECT" finding. **Not touched**, per the dispatch's explicit
  instruction not to act on TPV R13(b).
- Manifest census: `classifyPath('CLAUDE.md') === null`; `.install-manifest.json` 65 files / 0
  `CLAUDE.md`; `cleargate-planning/MANIFEST.json` 70 files / 0 `CLAUDE.md` — matches N4/N5/P2/P8
  exactly.
- Root `CLAUDE.md`: START `:129`, END `:186`, 186 total lines. Canonical: START `:7`, END `:64`, 64
  total lines. Block-equal: `true`, 11762 chars each; full block with markers 11808 — matches the
  dispatch's measured numbers exactly, no disagreement.

No citation in the plan or dispatch disagreed with the live tree. All were verbatim-correct once
re-derived.

## A finding not accounted for anywhere in the plan, dispatch, or kick-back criteria

**`upgrade-claude-md.red.node.test.ts` scenario 11 will go RED the moment the Developer implements
ORCHESTRATOR RULING O2 / post-flight P9's `upgrade.ts` change — and nothing currently says so.**

P9 directs the Developer's commit 2 to replace `upgrade.ts:381`'s
`mergedContent = writeBlock(ours, theirBlock);` with `injectClaudeMd(ours, extractBlock(theirs));`.
Measured directly (simulated the exact replacement against the file's own fixtures, not reasoned):

```
OURS_WELL_FORMED = '# My Project\n\nMy own rules.\n\n<!--START-->\nOLD SCAFFOLD\n<!--END-->\n\n## Footer\n'
THEIRS_WITH_BLOCK = '# Payload\n\n<!--START-->\nNEW SCAFFOLD\n<!--END-->\n'

old (writeBlock):        '# My Project\n\nMy own rules.\n\n<!--START-->\nNEW SCAFFOLD\n<!--END-->\n\n## Footer\n'
new (injectClaudeMd+P9): '<!--START-->\nNEW SCAFFOLD\n<!--END-->\n\n# My Project\n\nMy own rules.\n\n\n\n## Footer\n'
```

Scenario 11's existing assertion `assert.ok(finalContent.startsWith('# My Project\n\nMy own rules.\n\n'))`
(`upgrade-claude-md.red.node.test.ts`, "regression: both well-formed, choice=t") is satisfied by the
OLD merge and **fails** against the NEW one — the block relocates to the top under P9 exactly as it
does for `init`. `OURS_WELL_FORMED` reaches this code path because scenarios 9-11 in that file drive
`upgrade`'s branch through a **synthetic** single-entry manifest (the file's own header docstring,
per R9/P8, says so) — the branch is reachable *in this test*, even though N4 established it is
unreachable in production.

- **Why this was missed:** P5's re-measured red-set ladder (`138/138/0/0 → 138/137/1/0`) applied
  only "CR-105's `injectClaudeMd` body… on top" (Measurement appendix step 4) — it did not also apply
  the `upgrade.ts` change from step 3/P9. P5 says "Exactly one existing test" reds; that claim is true
  only for the `inject-claude-md.ts` half, not once P9's `upgrade.ts` edit lands in the same commit.
- **Why I did not fix it myself:** my dispatch's Task C enumerates exactly four stale-prose sites
  and this is not one of them. Deciding what scenario 11's assertion *should* say post-relocation
  (retitle + invert, analogous to `init.node.test.ts` scenario 3) is an Architect/Developer-scoped
  edit to a file outside my authorized surface, and I was explicitly told not to introduce changes
  beyond the four named sites.
- **Consequence if unaddressed:** the Developer's commit 2 will present as breaking an "unrelated"
  upgrade test unless this is flagged in advance; QA-Verify should expect this red and treat it as
  the same class of eviction as `init.node.test.ts` scenario 3, not a regression.

I have **not** edited `upgrade-claude-md.red.node.test.ts` beyond the authorized `:10` comment fix.

## What I could not / did not author, and why

- **No changes to `upgrade-claude-md.red.node.test.ts` scenario 11** — see finding above; out of
  authorized scope, flagged instead of silently fixed.
- **No new tests for the `upgrade.ts` P9 relocation itself** — not in the M3 plan's CR-105 `### Test
  scenarios` table (all 10 rows target `injectClaudeMd`/`initHandler`), not named in my dispatch's
  Task A/B/C, and O2 states the branch "delivers nothing observable today" in production. Scenarios
  9/10/12 in the existing file are unaffected (confirmed by trace: `ourBlock === null` returns early
  before line 381 for both, per TPV R2, which the shipped file already encodes correctly).
- **No outer-repo edits** — root `CLAUDE.md` relocation and canonical `:3` sentence rewrite are the
  Developer's commit 3, per the plan. I read both files to measure the doc-truth red assertions; I
  wrote nothing there. Outer repo `git status`/`HEAD` unchanged by this dispatch (`764ad6ba`).
- **No `src/` edits** — confirmed by `git diff --cached --stat`: only `test/` paths touched.

## Reuse discipline (N7)

No second `BLOCK_REGEX` introduced anywhere. `countAnchoredLines` in my new cli-half file is a
duplicate of the identical **counting helper** already local (unexported) to
`claude-md-anchoring.red.node.test.ts:304-308` — not a second grammar; N7's kick-back is scoped to
the block-matching regex itself, which both new files reuse via `hasAnchoredBlock` / `extractBlock` /
`readBlock` / `CLEARGATE_START` / `CLEARGATE_END`, all imported from `src/`.

flashcards_flagged:
  - "2026-08-28 · #test-harness #qa-red #danger · A cross-commit dependency (upgrade.ts P9's relocation) reds an existing synthetic-manifest test scenario the plan's red-set measurement never included — measure the FULL commit-2 diff, not just the module the story is named after."

STATUS=done

## Round 2 (TPV rulings applied)

role: qa

**Mode: RED, round 2.** cleargate-cli branch `story/CR-105`, commit `474d57e` (parent `851d4df`),
subject `test(CR-105): TPV round-2 — close the substring-count, prose-loss and notice holes`.
Applies rulings T1, T2, T3, T4, T7 from `plans/M3.md` `TPV RULING — CR-105`. T3 is the QA-Red
test half only — the `init.ts` implementation in T3's first code block is the Developer's and was
not touched. T5, T6, T8–T12 are informational/Developer-scoped and required no action here.

### Files modified (4, all under `test/`, zero `src/` edits)

| File | Δ | Purpose |
|---|---|---|
| `cleargate-cli/test/init/claude-md-block-leads.red.node.test.ts` | +54/-6 | T1 (8b, 8c), T3 (test 11), T7 (grammar deletion + comment) |
| `cleargate-cli/test/docs/claude-md-block-leads-relocation.red.node.test.ts` | +38/-5 | T2 (`OUTSIDE_HEADINGS` + test 4, docstring updated to "Four assertions") |
| `cleargate-cli/test/commands/upgrade-claude-md.red.node.test.ts` | +14/-4 | T4 (scenario 11 inverted and retitled) |
| `cleargate-cli/test/lib/claude-md-anchoring.red.node.test.ts` | +7/-4 | T7 (sibling grammar deletion) |

`git diff --stat`: 4 files changed, 128 insertions(+), 14 deletions(-). No `src/` file appears in
the diff — confirmed by `git status --short` before commit.

### The five new/changed tests, measured red/green

| # | Test | File | Measured | Ruling |
|---|---|---|---|---|
| 1 | `8b: a file that ALREADY contains the REAL block is stripped, not stacked …` | `claude-md-block-leads.red.node.test.ts` | **RED** — `assert.ok(output.startsWith(CLEARGATE_START))` fails | T1 |
| 2 | `8c: this repo's own root CLAUDE.md round-trips …` | `claude-md-block-leads.red.node.test.ts` | **RED** — `assert.ok(out1.startsWith(CLEARGATE_START))` fails | T1 |
| 3 | `4 (GREEN today, MUST STAY GREEN): relocation is a PURE MOVE …` (`OUTSIDE_HEADINGS`) | `claude-md-block-leads-relocation.red.node.test.ts` | **GREEN** — 97 non-empty lines outside the block, all headings present and ordered | T2 |
| 4 | `11: the relocation notice — init emits ONE line naming how many lines of user content now follow the block, and why (CR-105 §0.5 Q1)` | `claude-md-block-leads.red.node.test.ts` (inside scenario 10's `describe`) | **RED** — 0 notices emitted on baseline; the assertion `notices.length === 1` fails | T3 (test half only) |
| 5 | `scenario 11 (CR-105: the block leads): both well-formed, choice=t -> block RELOCATED to the top, body replaced, prose preserved below` (inverted from the old "regression" title) | `upgrade-claude-md.red.node.test.ts` | **RED** — `finalContent.startsWith(CLEARGATE_START + '\n')` fails on the un-relocated baseline | T4 |

Exactly matches the dispatch's prediction: 4 new failures (rows 1, 2, 4, 5) and 1 new green
(row 3). Individually re-run per file with `npx tsx --test --test-reporter=spec <file>`:

- `claude-md-block-leads.red.node.test.ts`: **tests 15, pass 7, fail 8** (5 pre-existing baseline
  reds — scenarios 2, 3, 6, 7, 10 — plus the 3 new reds: 8b, 8c, 11).
- `claude-md-block-leads-relocation.red.node.test.ts`: **tests 4, pass 2, fail 2** (pre-existing
  reds 1 and 2 unchanged; new test 4 green; pre-existing test 3 green, unchanged).
- `upgrade-claude-md.red.node.test.ts`: **tests 4, pass 3, fail 1** (scenarios 9, 10, 12 green
  unchanged; scenario 11 now red under its new identity).

### T7 inertness — provable, not asserted

`claude-md-anchoring.red.node.test.ts` is **27/27 green both before and after** T7's rewrite.
Verified by extracting the pre-edit blob via `git show HEAD~1:test/lib/claude-md-anchoring.red.node.test.ts`
(from before this commit), running it in place under a throwaway filename
(`test/lib/_tmp-pre-anchoring.node.test.ts`, deleted immediately after), and diffing test-name/line
positions against the committed version — the only line that moved is the `countAnchoredLines`
function declaration itself (`:304` → `:309`, pure comment-block growth); no test title, count, or
assertion shape changed. `claude-md-block-leads.red.node.test.ts`'s own `countAnchoredLines`
rewrite is provably inert too: every call site (`countAnchoredLines(output, CLEARGATE_START/END)`)
is unchanged, and the file's fail count (8 of 15, exactly the pre-T7 + T1 + T3 total) matches the
component sum computed independently of T7 (5 pre-existing + 2 T1 + 1 T3 = 8) — no assertion in the
file depends on the counting mechanism's internal shape, only its return value, which is identical
by construction (regex-anchored-line-count ≡ trimEnd-line-filter, both count exact-match lines).

### Suite line — matches the TPV ladder exactly

Full suite (`npm --prefix cleargate-cli test`, `run-default-tests.mjs`, all files):

```
ℹ tests 2576
ℹ suites 896
ℹ pass 2562
ℹ fail 13
ℹ cancelled 0
ℹ skipped 1
ℹ todo 0
ℹ duration_ms 564070.6
```

**`2576 / 2562 / 13 / 1` — exactly the dispatch's expected commit-2a numbers.** No delta to report.
`npm --prefix cleargate-cli run typecheck`: **clean, exit 0.**

The 13 failures, all individually accounted for:

| Failure | Class |
|---|---|
| `init.node.test.ts` scenario 3 | pre-existing (QA-Red round 1) |
| `sync.node.test.ts` "exits 2 when no MCP URL or token is configured" | pre-existing, unrelated (network) |
| `upgrade-claude-md.red.node.test.ts` scenario 11 (new identity) | **T4** |
| `claude-md-block-leads-relocation.red.node.test.ts` test 1 | pre-existing (QA-Red round 1, doc-truth) |
| `claude-md-block-leads-relocation.red.node.test.ts` test 2 | pre-existing (QA-Red round 1, doc-truth) |
| `claude-md-block-leads.red.node.test.ts` scenario 2 | pre-existing (QA-Red round 1) |
| `claude-md-block-leads.red.node.test.ts` scenario 3 | pre-existing (QA-Red round 1) |
| `claude-md-block-leads.red.node.test.ts` scenario 6 | pre-existing (QA-Red round 1) |
| `claude-md-block-leads.red.node.test.ts` scenario 7 | pre-existing (QA-Red round 1) |
| `claude-md-block-leads.red.node.test.ts` test 8b | **T1 (new)** |
| `claude-md-block-leads.red.node.test.ts` test 8c | **T1 (new)** |
| `claude-md-block-leads.red.node.test.ts` scenario 10 (initHandler) | pre-existing (QA-Red round 1) |
| `claude-md-block-leads.red.node.test.ts` test 11 | **T3 (new)** |

9 pre-existing + 4 new (T1×2, T3×1, T4×1 — T4 is a content flip on an existing slot, not a new
test, so it does not change the `tests 2576` total, only the pass/fail split) = 13. Matches.

### Rulings not fully applicable, and why

None. All five rulings assigned to me (T1, T2, T3-test-half, T4, T7) were applied verbatim exactly
as specified in `plans/M3.md`. No deviation, no substitution.

### Forbidden-surface confirmation

- Zero `src/` files touched — `git diff --stat` HEAD~1..HEAD lists only 4 `test/` files.
- T3's `init.ts` implementation (T3's first code block) — **not written**, per dispatch. Left for
  the Developer.
- Outer repo (`CLAUDE.md`, `cleargate-planning/CLAUDE.md`) — untouched; `git status --short -- CLAUDE.md
  cleargate-planning/CLAUDE.md` in the outer repo returns empty.
- `stash@{0}` (the stray tarball WIP) — untouched, confirmed present and unmodified after commit.
- No `git reset`/`checkout --`/`stash`/force-push/history-rewrite/`--no-verify` used.
- No `cleargate init`, no `cleargate wiki`, no bare `cleargate` — all verification ran via
  `npx tsx --test` from source; `dist/cli.js` was never invoked (T12).
- No suite output piped through `tail`/`head` for the pass/fail counts themselves (`tail`/`wc` used
  only to poll a running background log for completion, never to derive a reported number — every
  number in this report was read via `command grep`/`Read` against the full log or a direct
  single-file run).

### flashcards_flagged

Carrying forward the round-1 card plus the TPV-proposed cards (still pending write — `FLASHCARD.md`
remains contended by the concurrent EPIC-058 session per the round-1 report and this dispatch's
forbidden list):

  - "2026-08-28 · #test-harness #qa-red #danger · A cross-commit dependency (upgrade.ts P9's relocation) reds an existing synthetic-manifest test scenario the plan's red-set measurement never included — measure the FULL commit-2 diff, not just the module the story is named after."
  - "2026-08-29 · #test-harness #tpv #danger · An 'exactly one block' IMPLEMENTATION that counts START SUBSTRINGS survived every test: the shipped block quotes its own markers, so every install reads 2, the strip is skipped and init STACKS a block per run (187→246→305 lines, measured). A kick-back that forbids substring counting in TESTS does not forbid it in CODE — mutate the implementation, not just the assertion. [SPRINT-39 CR-105 TPV]"
  - "2026-08-29 · #test-harness #danger · A doc-truth baseline that pins the block's POSITION and the block's HASH still lets the relocation silently delete user prose — measured, zero witnesses. When a commit rewrites a file the user owns, one assertion must pin what SURVIVES, not only what moved. [SPRINT-39 CR-105 TPV]"
  - "2026-08-29 · #test-harness #regex · countAnchoredLines' `^marker[ \\t]*$` is exactly equivalent to `split('\\n').filter(l => l.trimEnd() === marker)` — verified 10 fixtures x 2 markers incl. CRLF, trailing ws, indented, inline, two-block and both real CLAUDE.md files. A marker grammar can be deleted rather than deduplicated. [SPRINT-39 CR-105 TPV]"

STATUS=done
