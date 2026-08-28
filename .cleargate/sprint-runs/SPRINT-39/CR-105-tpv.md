# CR-105 TPV Report — SPRINT-39 wave 9 / M3

role: architect · Mode: TPV (mutation-testing gate) · 2026-08-29

# TPV: rulings-required

**Three holes, stated first rather than buried.**

1. **M5 — an implementation that decides "does a block already exist" by counting SUBSTRING
   occurrences of the START marker survives the entire baseline with ZERO witnesses.** 250 tests
   across the 23 affected files: `pass 248 · fail 0`. Measured consequence on this repo's own root
   `CLAUDE.md`: `cleargate init` stacks a second block instead of relocating the first, and does it
   again on every run — **187 → 246 → 305 → 364 lines, anchoredStarts 1 → 2 → 3 → 4, not
   idempotent.** This is the N9 trap on the *implementation* side. Kick-back criterion 6 forbids it
   in the *tests* (scenario 8 pins that), and nothing forbids it in the code.
2. **M6b — the outer relocation silently dropping a line of user prose survives with ZERO
   witnesses.** `pass 248 · fail 0`. Kick-back criterion 12 ("any content lost or reordered … `git
   diff -U0` must show a pure relocation") is an eyeball step with no machine backstop, in the one
   commit that rewrites a 186-line file the user owns.
3. **The `§0.5` Q1 relocation notice — a recorded human decision — has no witness at all.** Measured
   directly: an otherwise-correct implementation with the notice removed entirely is `pass 248 ·
   fail 0`. Task B confirmed; remedy in T3.

Everything else in the battery is killed, and two of QA-Red's three load-bearing discrimination
claims (4b for M2, doc-truth 3 for M7) reproduce exactly.

---

## Method

Out-of-tree mirror at
`/private/tmp/claude-501/.../scratchpad/cr105/meta/` — `rsync` of `cleargate-cli` @ `851d4df`
(`node_modules` and `dist` symlinked to the real checkout), under a fake meta-root carrying **copies**
(not symlinks) of `CLAUDE.md`, `cleargate-planning/`, `.claude/`, `.cleargate/{templates,knowledge,
config.yml,scripts,.install-manifest.json}` so the outer-tree-reading tests resolve and so the outer
half could be mutated without touching the real files. `apply.mjs <variant>` resets five files from
pristine and applies one variant. Mutants destroyed at the end (mirror reset to `base`); both repos
verified untouched — `cleargate-cli` clean at `851d4df`, `stash@{0}` intact, root `CLAUDE.md`
unmodified.

Runner: `npx tsx --test --test-reporter=tap <files>`, output captured to a log file and the runner's
own `# fail` line read from it (never piped through `tail`).

**Affected-file set — a complete census, not a sample.** 23 files = every test importing
`injectClaudeMd`/`extractBlock` (2), `upgradeHandler` (6 non-integration), or `initHandler` (5 more),
plus every test reading root or canonical `CLAUDE.md` (`template-claude-md`,
`dogfood-split-integrity`, `no-exec-mode-vocab`, `enforcement-doc-coherence`,
`no-execution-mode-vocabulary`, `build-manifest`, the two new CR-105 files), plus
`claude-md-surgery`, `uninstall`, `doctor-drift-guard`. **250 tests, 88 suites.**

**The census was validated against the full suite.** Full mirror `npm test` at `base` and at
`correct-cli`: the only difference in the failing set is the six cli-half reds going green and
scenario 11 appearing — no collateral anywhere in the 2500+ test suite. `correct-cli` → `correct`:
the only difference is doc-truth 1 and 2 going green. Nothing else moves, in either step.

| state | what is applied | affected-set result |
|---|---|---|
| `base` | QA-Red `851d4df`, no src change | 250 / 240 / **8** / 2 |
| `correct-cli` | commit 2 (inject body + docstring, `init.ts` notice, `upgrade.ts:381`) | 250 / 245 / **3** / 2 |
| `correct` | + commit 3 (root relocated, canonical `:3` rewritten) | 250 / 247 / **1** / 2 |

The `base` 8 are exactly QA-Red's 8 — zero collateral in the red baseline. The 2 skips are
`dogfood-split-integrity`'s two `git ls-files` tests skipping on a `.git`-less mirror; they run in
the real checkout.

---

## Part 1 — Mutation battery

| # | Mutant | Survived? | Killed by |
|---|---|---|---|
| **M1** | prepend without stripping the existing block | **no** | block-leads **3** (`anchoredStarts===1`, `!includes('OLD')`), **4a**, **4b**, **4c**, **5**; `claude-md-anchoring` probe-4; `init.node.test.ts` scenario 4 — 7 witnesses |
| **M2** | missing the `rest.length === 0` branch | **no** | block-leads **4b — and 4b alone.** 4a is green under it. |
| **M3** | `trimStart()` instead of `.trim()` | **no** | block-leads **4a** + **4c** (4b green under it) |
| **M4** | partial fix — prose-no-block path prepends, block-present path stays an in-place swap | **no** | block-leads **3 — and 3 alone**, on its `startsWith(START)` assertion |
| **M5** | strip decision made by **substring count** of the START marker | **YES — no witness** | — |
| **M6** | prepends correctly but drops the first line of surviving user prose | **no** | block-leads **2, 3, 4a, 4c, 7, 10**; `init.node.test.ts` scenarios **3** and **4** — 8 witnesses |
| **M7** | relocate root `CLAUDE.md` but change one byte **inside** the block | **no** | doc-truth **3** (block-body hash parity) — and 3 alone |
| **M8a** | relocate root, leave canonical `:3` saying "appends" | **no** | doc-truth **2** |
| **M8b** | rewrite canonical `:3`, leave root un-relocated | **no** | doc-truth **1** |
| **M6b** *(added)* | relocate root correctly but drop one line of user prose in the move | **YES — no witness** | — |
| **M10** *(added)* | compose `removeBlock` **unguarded** (the reading CR-105 `## Existing Surfaces` invites) | **no** | 7 red, incl. block-leads **8** and `claude-md-anchoring` `D:` — it throws on a no-markers file |
| **M11** *(added)* | compose `removeBlock` guarded by `hasAnchoredBlock` | **n/a — this is a CORRECT alternative** | 0 red; measured equivalent to the plan's verbatim body. Accept it if the Developer writes it. |
| **M9** | grammar mutant | — | ruling below, T7 |
| — | `correct` minus the `§0.5` Q1 notice | **YES — no witness** | — (Task B) |

### M5 in detail — the finding

Body under test (the shape a Developer writes when implementing `§4`'s *"exactly one block in the
file"* with the same reflex kick-back 6 forbids in tests):

```ts
const startCount = existing.split('<!-- CLEARGATE:START -->').length - 1;
const stripped = startCount === 1 ? existing.replace(BLOCK_REGEX, '') : existing;
```

The shipped block quotes its own markers inline (`CLAUDE.md:178`, `cleargate-planning/CLAUDE.md:56`),
so **every installed repo returns 2**, the strip is skipped, and the new block is prepended above the
old one. Measured on the real root `CLAUDE.md` (`injectClaudeMd(root, extractBlock(canonical))`):

```
                       lines   anchoredSTART
input (today)            187        1
after 1 init             246        2
after 2 inits            305        3
after 3 inits            364        4        idempotent? false
CORRECT: 187 / 1 at every step,               idempotent? true
```

The damage compounds: once two anchored blocks exist, the greedy `BLOCK_REGEX` spans first-START to
last-END, so the next `removeBlock` / `uninstall` / drift read eats everything between them — the
BUG-061 shape, reached from a CR-105 defect.

**Why the baseline misses it.** Scenario 8 loads the real canonical block, but passes it as the
`block` *argument* with `existing = '# Some prose.\n'`. Every fixture whose `existing` **contains** a
block uses a synthetic one-substring block. **No scenario feeds a file whose existing block is the
real one.** That is a one-line gap in an otherwise well-built table.

---

## Part 2 — Adjudications

### A. QA-Red's scenario-11 finding — REPRODUCED INDEPENDENTLY. It is correct, and P5 is wrong.

Measured, not simulated: applying the full commit-2 diff (`inject-claude-md.ts` body **and**
`upgrade.ts:381` per P9/O2) reds `upgrade-claude-md.red.node.test.ts` **"scenario 11 (regression):
both well-formed, choice=t"** at `:197`, `assert.ok(finalContent.startsWith('# My Project\n\nMy own
rules.\n\n'))`, error `'prose above the block must survive'`. Control isolation:

| applied | affected-set fail |
|---|---|
| inject body + `init.ts` notice + outer relocation, **no** `upgrade.ts` change | **0** |
| the same **plus** `upgrade.ts:381` | **1** — scenario 11 |

**(i) P5's "exactly ONE existing test" is wrong, and the mechanism is a bad census predicate.**
P5 justified completeness with *"`claude-md-anchoring.red.node.test.ts` is the only test file in the
tree importing `injectClaudeMd` or `extractBlock`, so no unexamined file can observe the change."*
That predicate is sound for a change confined to `inject-claude-md.ts`. Commit 2 also **adds an
import of `injectClaudeMd` into `upgrade.ts`**, which makes every test importing `upgradeHandler` a
candidate — and `upgrade-claude-md.red.node.test.ts` imports `upgradeHandler`, not `injectClaudeMd`.
The predicate could not see it by construction.

The correct predicate, and the one I ran: `{importers of injectClaudeMd/extractBlock} ∪ {importers of
upgradeHandler} ∪ {importers of initHandler} ∪ {readers of root/canonical CLAUDE.md}` = 23 files /
250 tests. Every one measured.

**The true full red set, measured against the pre-CR-105 control (`1133bf7`, BUG-043 as shipped), is
TWO existing tests, not one:**

1. `test/commands/init.node.test.ts` scenario 3 (`:299-319`, assertion `:314`) — already inverted by
   QA-Red in commit 1, so it is green from commit 2 onward.
2. `test/commands/upgrade-claude-md.red.node.test.ts` scenario 11 (`:194-201`, assertion `:197`).

Nothing else. Confirmed at both the affected-set level (250 tests) and the full-suite level.

**(ii) Disposition: INVERT AND RETITLE — the `init.node.test.ts` scenario-3 treatment. Do not
delete.** The assertion encodes exactly what CR-105 `§1` evicts (*"Replacement is a pure in-place
swap that never moves the block. Forget 'position is whatever it already was.'"*). Three reasons the
unreachability argument does **not** carry to deletion:

- **O2 chose option (a): implement the `upgrade` half as latent defense-in-depth.** The stated value
  is *"removes a landmine that arms the moment anyone adds a `CLAUDE.md` manifest row."* On the day
  that row is added, scenario 11 is the only thing in the repo that will say whether the branch
  behaves. Deleting it converts (a) into (b) plus fifteen lines of untested code.
- **Scenario 11 is the ONLY test that reaches the write.** TPV R2 established that `ourBlock ===
  null` strictly precedes every other route, so scenarios 9 and 10 return before line 381; scenario
  12 asserts the branch is unreachable in production. Delete 11 and the exact line P9 asks the
  Developer to change has zero coverage. Changing a line and deleting its only test in the same
  commit is the worst available pairing.
- **The precedent runs the other way.** BUG-043 shipped scenarios 9–12 as this branch's first-ever
  coverage precisely because a traced-but-never-executed defect needs an execution witness
  (FLASHCARD 2026-08-28 `#dogfood-split #danger`). Deleting coverage for being unreachable would
  retire that whole file by the same argument.

The test **does** encode an expectation about behaviour nobody can observe in production. That is a
titling problem, not a deletion argument, and R9's header caveat already carries the fix. Ruling: see
**T4** for the verbatim replacement (measured 2-red on baseline, 0-red under P9).

### B. The `§0.5` Q1 relocation notice — CONFIRMED to have no witness. It is authorable, and here it is.

Confirmed two ways. By reading: no assertion in either new file, in `init.node.test.ts`, or anywhere
in the 23-file set inspects `init`'s stdout for a relocation line. Scenario 10 collects `out` and
`err` into arrays and asserts nothing about either. By measurement: `correct` with the notice removed
entirely is **250 / 248 / 0 / 2**.

A red assertion **is** authorable — scenario 10 already has the stdout channel in hand. It should
assert the recorded decision literally (*"the run emits one line naming how many lines of user
content now follow it and why"*), which is three properties: exactly one line, a count of user-content
lines, and a stated reason. The reason it was not authored is the ordinary one: QA-Red cannot pin a
message string the Architect has not specified. So I specify it. **T3** carries the verbatim
implementation and the verbatim assertion, both executed: notice fires once with `2` on the fixture,
does **not** fire on the idempotent second run, absent entirely on baseline.

### C. Scenario 3's discrimination — ADEQUATE AS WRITTEN. QA-Red's observation is true but is about the wrong axis.

Assertion-by-assertion on the baseline (measured):

| | assertion | true on baseline? |
|---|---|---|
| a1 | `startsWith(START)` | **false** |
| a2 | `includes('# Top')` | true |
| a3 | `includes('Some content.')` | true |
| a4 | `anchoredStarts === 1` | true |
| a5 | `anchoredEnds === 1` | true |
| a6 | `includes('NEW')` | true |
| a7 | `!includes('OLD')` | true |

QA-Red is right that only a1 discriminates **against the baseline**. But "already true on the
baseline" and "carries no witness" are different properties, and the battery separates them:

- **a1 is the sole witness for M4** across all 250 tests — the "edit one branch and stop" shape.
- **a4 and a7 are what kill M1** inside this test (a1 is *true* under M1, which prepends).
- **a2 is what kills M6** here.

So six of seven assertions carry a measured witness; only a5 (`anchoredEnds`) is dominated by a4. The
test is not vacuous and hides neither M1 nor M4 — it is the sole detector for M4. No change required.
Keep the sub-note in the report; it is a fair caution, not a defect.

### D. O1's red-window claim — CORRECT on the window, WRONG on the closing invariant.

Measured (affected set, 250 tests / 88 suites):

| state | fail | which |
|---|---|---|
| commit 1 (`851d4df`, as shipped) | **8** | doc-truth 1, doc-truth 2, block-leads 2/3/6/7/10, `init.node.test.ts` sc. 3 |
| after commit 2 (cli fix, outer un-relocated) | **3** | doc-truth 1, doc-truth 2, **upgrade sc. 11** |
| after commit 3 (outer relocated) | **1** | **upgrade sc. 11** |

- **O1's claim that P8's doc-truth file moves the red window's close from commit 2 to commit 3:
  CONFIRMED.** Both doc-truth reds are still red after commit 2 and both go green at commit 3. The
  required order 1 → 2 → 3 stands; a red cli suite after commit 2 is correct behaviour, not a
  regression.
- **O1's implicit corollary — "no test is red at commit 3 that was green at commit 1" — is FALSE as
  the baseline stands.** Scenario 11 is green at commit 1, red at commit 2, and **still red at commit
  3**. With T4's inversion applied inside commit 2 the property holds again, and commit 3 ends at
  `fail 0` across the affected set (the only residual suite failure being the documented
  `sync.node.test.ts` network test).

---

## Part 2b — M9, and the grammar question

**QA-Red's copy DOES contain a marker-matching pattern.** `claude-md-block-leads.red.node.test.ts:44-48`
builds `new RegExp('^' + escapedMarker + '[ \\t]*$', 'gm')` — that is the single-marker half of
BUG-043's anchoring convention, `[ \t]*` tolerance decision included, byte-identical to
`claude-md-anchoring.red.node.test.ts:304-308`.

**Ruling, in one sentence a future reader can check: it is a fourth instance of the *marker-line*
grammar but not of the *block-span* grammar CR-113 names, and that distinction is only worth
anything until someone changes the tolerance — at which point both test copies keep asserting the old
convention and stay green.** Census as of `851d4df`: `claude-md-surgery.ts:12` and
`inject-claude-md.ts:23` (span, `src`), `claude-md-anchoring.red.node.test.ts:304` and
`claude-md-block-leads.red.node.test.ts:44` (marker-line, `test`). Four encodings of
`^<marker>[ \t]*$`.

**Does anything in the tree detect grammar proliferation? No.** Measured:

- N7's shared-corpus equivalence probe (`claude-md-anchoring.red.node.test.ts:258`) compares
  `surgery.hasAnchoredBlock` against `inject.extractBlock` — both imported from `src/`. It has no
  knowledge of any test-local helper and is **structurally blind** to a copy that lives in a test
  file. It could not have caught this and cannot catch the fifth.
- `check:no-inline-id-regex` is scoped to work-item ids (`scripts/check-no-inline-id-regex.mjs`);
  `check:no-vitest`, `check:no-shell-true-in-init`, `check:no-execution-mode-vocabulary` are
  unrelated. There is no marker-grammar gate.
- And `cleargate-cli` has **zero installed git hooks** (Cross-Cutting Rule 6), so even if one
  existed it would not run on these commits.

**This is not a QA-Red kick-back** — duplicating an unexported helper follows existing precedent, and
exporting a test helper across test files is its own smell. **But the grammar is removable outright,
for free**, and T7 requires it: the regex form is exactly equivalent to a regex-free line filter,
verified over 10 fixtures × 2 markers (LF, CRLF, trailing whitespace, indented, inline-only, stray
END, no-final-newline, two-block, and both real `CLAUDE.md` files) — **20/20 agreement, zero
disagreements.**

---

## Part 3 — Numbers for the Developer's dispatch

Anchor: **commit 1 = `851d4df` = 2572 tests / 2562 pass / 9 fail / 1 skipped**, measured by QA-Red in
the real checkout and matching the dispatch's control ladder. The 9 = 8 QA-Red reds + the documented
`test/commands/sync.node.test.ts` network failure. Every figure below is that anchor plus deltas
measured in the mirror and confirmed against the full mirror suite.

**Commit sequence (T4/T1/T2/T3 fold in a test-only commit 2a):**

| after | `npm --prefix cleargate-cli test` |
|---|---|
| **commit 1** — `851d4df`, already made | `tests 2572 · pass 2562 · fail 9 · skipped 1` |
| **commit 2a** — tests only (4 new tests + sc. 11 inversion) | `tests 2576 · pass 2562 · fail 13 · skipped 1` |
| **commit 2b** — cli src (`inject-claude-md.ts`, `init.ts`, `upgrade.ts`, `CHANGELOG.md`) | `tests 2576 · pass 2572 · fail 3 · skipped 1` |
| **commit 3** — outer (`CLAUDE.md` relocation + canonical `:3`) | `tests 2576 · pass 2574 · fail 1 · skipped 1` |

If the Developer collapses 2a+2b into one commit 2 (permitted, not preferred — see T4), there is no
2a line and commit 2 lands directly on `2576 / 2572 / 3 / 1`.

The residual `fail 1` at commit 3 is **only** `test/commands/sync.node.test.ts` — *"exits 2 when no
MCP URL or token is configured"*, `Error: cannot reach https://cleargate-mcp.soula.ge (fetch failed)`.
Pre-existing, unrelated, do not chase. The `fail 3` at commit 2b is that plus doc-truth 1 and 2,
which close at commit 3 and are correct until then (O1).

### Red → green at commit 2b — the complete list, 10 tests

`test/init/claude-md-block-leads.red.node.test.ts`
1. `2: prose with no existing block — output starts with the block, every byte of prose survives below it`
2. `3: block sits at the bottom — relocated to the top, prose intact below, old body gone, exactly one block`
3. `6: evicted logic — for fixture 2, the final non-empty line is never the END marker`
4. `7: evicted logic, direct — the block index precedes the user-content index (exact inversion of init.node.test.ts:314)`
5. `initHandler leaves the block leading and the user prose intact below it` (scenario 10)
6. **NEW** `8b:` — the real-block strip pin (T1)
7. **NEW** `8c:` — the real root `CLAUDE.md` round-trip pin (T1)
8. **NEW** the `§0.5` Q1 relocation-notice test (T3)

`test/commands/init.node.test.ts`
9. `scenario 3: existing CLAUDE.md without markers — CR-105: block leads, user content follows`

`test/commands/upgrade-claude-md.red.node.test.ts`
10. `scenario 11` — after T4's inversion

### Red → green at commit 3 — 2 tests

`test/docs/claude-md-block-leads-relocation.red.node.test.ts`
11. `1 (RED today): root CLAUDE.md's first non-empty line is the CLEARGATE:START marker …`
12. `2 (RED today): canonical CLAUDE.md's line 3 no longer describes the evicted append contract …`

### Green → red, and where the inversion lands

`test/commands/upgrade-claude-md.red.node.test.ts` **scenario 11** flips green → red the moment
`upgrade.ts:381` changes. It **must** be inverted, and the inversion lands in **commit 2a** (test
only, so the eviction is visible as a red — the same discipline the plan applied to
`init.node.test.ts` scenario 3). If the Developer does not split, the inversion lands inside commit 2
and the report must carry the measured pre-inversion failure instead (T4).

### Must-stay-green, named — a green here is load-bearing, not incidental

`test/docs/claude-md-block-leads-relocation.red.node.test.ts` assertion **3** (block-body hash
parity — the sole witness for M7; a `false` here means bare `cleargate doctor` blocks on
`claude-md-block-mismatch`) · block-leads **1, 4a, 4b, 4c, 5, 8, 9** · upgrade scenarios **9, 10,
12** · `test/scripts/build-manifest.node.test.ts:258-261` · `test/scripts/template-claude-md.node.test.ts`
· `test/docs/dogfood-split-integrity.node.test.ts` · `test/scaffold/enforcement-doc-coherence.node.test.ts`
· `test/commands/no-exec-mode-vocab.node.test.ts` · `test/docs/no-execution-mode-vocabulary.red.node.test.ts`
· the four `D`/`F`/`G` equivalence rows and `D: injectClaudeMd …` in `claude-md-anchoring.red.node.test.ts`
(P6 held under CR-105 — re-confirmed here at `correct`).

### Acceptance clause for the doc-truth file — assert all three numbers

`test/docs/claude-md-block-leads-relocation.red.node.test.ts`'s three tests are
`{ skip: !fs.existsSync(...) }`-guarded. FLASHCARD 2026-08-27 `#test-harness #gate #danger`: a
skip-guarded test reports **skipped**, never **failed**, when its root resolves wrongly, so `fail 0`
is satisfied by a run that asserted nothing. Acceptance for commit 3 is therefore
**`pass 3 · fail 0 · skipped 0`** on a targeted run of that file, not merely a green full suite:

```
npm --prefix cleargate-cli exec -- tsx --test cleargate-cli/test/docs/claude-md-block-leads-relocation.red.node.test.ts
```

If it reports `skipped 3`, the outer half is uncertified regardless of the suite total.

---

## Rulings — T1 … T12

Reproduced verbatim in `plans/M3.md` under **TPV RULING — CR-105**. See that block for the full text.

---

## Script Incidents

None. No script was invoked through `run_script.sh`. All measurement was direct execution of `npx
tsx`, `npx tsc`, `node`, `git` and `command grep`, read-only against the real checkouts and
read-write only inside the out-of-tree mirror.

## Flashcards — PROPOSED, not written

`FLASHCARD.md` is contended by the concurrent session. Proposed for the Gate-4 pass, after a dupe grep:

- `2026-08-29 · #test-harness #tpv #danger · An "exactly one block" IMPLEMENTATION that counts START SUBSTRINGS survived every test: the shipped block quotes its own markers, so every install reads 2, the strip is skipped and init STACKS a block per run (187→246→305 lines, measured). A kick-back that forbids substring counting in TESTS does not forbid it in CODE — mutate the implementation, not just the assertion. [SPRINT-39 CR-105 TPV]`
- `2026-08-29 · #test-harness #tpv #danger · A red-set census predicated on "which tests import the module I am changing" is void when the change ADDS an import elsewhere: CR-105 put injectClaudeMd into upgrade.ts, and the one test it reds imports upgradeHandler, not injectClaudeMd. Census by the files the COMMIT touches, not by the module the story is named after. [SPRINT-39 CR-105]`
- `2026-08-29 · #test-harness #danger · A doc-truth baseline that pins the block's POSITION and the block's HASH still lets the relocation silently delete user prose — measured, zero witnesses. When a commit rewrites a file the user owns, one assertion must pin what SURVIVES, not only what moved. [SPRINT-39 CR-105 TPV]`
- `2026-08-29 · #test-harness #regex · countAnchoredLines' `^marker[ \t]*$` is exactly equivalent to `split('\n').filter(l => l.trimEnd() === marker)` — verified 10 fixtures x 2 markers incl. CRLF, trailing ws, indented, inline, two-block and both real CLAUDE.md files. A marker grammar can be deleted rather than deduplicated. [SPRINT-39 CR-105 TPV]`
- `2026-08-29 · #dogfood-split #danger · cleargate-cli/dist/cli.js is PRE-BUG-043 (no anchored grammar, no hasAnchoredBlock): every test that spawns the built binary, and any manual `node dist/cli.js init`, exercises the OLD contract until a Gate-4 rebuild. Verifying a src fix through dist reads as a failed fix. [SPRINT-39 M3]`
