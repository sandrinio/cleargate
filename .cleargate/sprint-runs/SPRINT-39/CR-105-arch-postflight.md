# CR-105 — Architect POST-FLIGHT + M3 milestone close

role: architect · SPRINT-39 · wave 9 · M3 · post-flight

```
POSTFLIGHT: pass
GOAL_RELATION: off critical path
```

Branches at review time: `cleargate-cli` `story/CR-105` @ `45816b9`; outer `story/CR-105` @
`71037e5a`. One worktree entry (the main checkout) — the outer edit was not made in a worktree.
`cleargate-cli/stash@{0}` untouched. No file edited in either repo. Every number below was
re-derived from the tree; nothing is inherited from the Dev, QA-Verify, QA-Red or TPV reports.

---

## Q1 — Scope and correctness

**Six files. All six are declared surfaces after the orchestrator's §3/§4 amendments (O7). Nothing
undeclared was touched. Nothing declared-and-needed was left untouched. No new dependency. No
schema drift. Cross-Cutting Rule 4 is not engaged.**

### Q1.1 The six files, against the amended §3

| File | Commit | Declared where |
|---|---|---|
| `cleargate-cli/src/init/inject-claude-md.ts` | `45816b9` | §3 `Modify` row 1 + the `:11` docstring row added by the 2026-08-28 amendment |
| `cleargate-cli/src/commands/init.ts` | `45816b9` | §3 `Modify` row 2 — **retained** by the amendment with its false justification replaced (P7(d)) |
| `cleargate-cli/src/commands/upgrade.ts` | `45816b9` | §3 `Modify` row 3, named to the line by P9 |
| `cleargate-cli/CHANGELOG.md` | `45816b9` | §3 `Modify`, added by BUG-043 post-flight P3 |
| `CLAUDE.md` (outer root) | `71037e5a` | §3 `Modify` — "this repo's own root file; relocate the block to lead" |
| `cleargate-planning/CLAUDE.md` | `71037e5a` | §3 `Modify`, rewritten by the amendment (the `:3` sentence) |

`git diff --stat 1133bf7..45816b9` on the cli side and `git show --stat 71037e5a` on the outer side
return exactly these, plus the five test files authored by QA-Red at `851d4df` / `474d57e` — which
are §3's *"New `*.node.test.ts` under `cleargate-cli/test/`, plus a doc-truth red file"*, the
`init.node.test.ts` scenario-3 inversion row, the `claude-md-anchoring.red.node.test.ts:109`
retitle row, and the `upgrade-claude-md.red.node.test.ts:10` citation-repair row. All four
test-side rows are declared. **The Developer edited zero test files**, which is what the dispatch
required and what `git show --stat 45816b9` proves.

### Q1.2 Declared-and-needed, left untouched: none. Both at-risk rows verified individually.

Two amendment rows had no source consequence and could plausibly have been skipped. Both landed:

- `test/lib/claude-md-anchoring.red.node.test.ts:109` — P6's stale-title residue. Now reads
  `D: injectClaudeMd does not splice into the sentence — word "and" survives (CR-105: block leads,
  not appends)`. `grep 'appends instead'` returns nothing.
- `test/commands/upgrade-claude-md.red.node.test.ts:10` — O6's citation repair. Now reads
  `upgrade.ts:368-388 … the original :364-378 citation was stale`.

`init.node.test.ts` scenarios 3 and 4 are inverted and retitled (kick-back 5); `grep` for "appends"
and "above and below" in that file returns nothing.

### Q1.3 The `Do NOT modify` list — all five clean, verified by numstat, not by reading

`git diff --numstat 1133bf7..45816b9` returns **zero** entries for each of
`src/lib/drift-check.ts`, `src/commands/uninstall.ts`, `src/init/root-gitignore.ts`,
`src/lib/claude-md-surgery.ts` and `package.json`. `git diff` on the two `BLOCK_REGEX`-bearing
files is empty, so BUG-043's grammar shipped through wave 9 byte-identical — kick-back 7 clear, and
CR-113's premise unchanged.

### Q1.4 No new dependency

`git diff --name-only 1133bf7..45816b9 | grep -E 'package(-lock)?\.json'` → **NONE**. The outer
commit touches two markdown files and nothing else. `package.json` was correctly not bumped (§3's
last `Do NOT modify` row); the version bump is the release lane's.

### Q1.5 No schema drift, and no `## ` heading that engages Cross-Cutting Rule 4

**Exactly one `## ` heading was inserted anywhere in CR-105: `## Unreleased` in
`cleargate-cli/CHANGELOG.md`.** `git diff 1133bf7..45816b9 | grep -E '^\+## '` returns that one
line and no other. `CHANGELOG.md` is not a gated template, carries no `section(N)` criterion, and
lives in neither `.cleargate/templates/` tree. Rule 4 is not engaged.

Root `CLAUDE.md`'s eleven `## ` headings were **reordered** — the block's own
`## 🔄 ClearGate Planning Framework` moved from mid-file to the top — but the sorted heading set is
**identical** before and after (`diff` of the sorted `grep '^#'` output is empty). Nothing added,
nothing removed. Root `CLAUDE.md` is not a gated document and no `section(N)` criterion targets it.

Machine witnesses, re-run for this ruling:

```
test/docs/gate-section-index-pinning.node.test.ts   tests 14 · pass 14 · fail 0 · skipped 0
```

and a repo-wide census for line-number couplings to root `CLAUDE.md`:

```
grep -rE "CLAUDE\.md.{0,4}:[0-9]+" .cleargate/scripts/ .claude/hooks/ \
     cleargate-planning/.cleargate/scripts/ cleargate-cli/src/ cleargate-cli/scripts/
  -> zero hits
```

No script, hook, or source file anywhere reaches root `CLAUDE.md` by offset, so the reorder is
inert to the machine. This re-derives CR-105 `§3`'s own claim rather than inheriting it.

No frontmatter change, no migration, no template edit, no `readiness-gates.md` criterion touched.

### Q1.6 The three invariants the item is actually about — re-measured

```
block-equal (bounded-block bodies, root vs canonical) : true  11762 / 11762
full block incl. markers                              : true  11808 / 11808
root CLAUDE.md   anchoredSTART 1 · anchoredEND 1 · first non-empty line = <!-- CLEARGATE:START -->
canonical        anchoredSTART 1 · anchoredEND 1 · first non-empty line = the :1-6 preamble H1
```

Kick-back 4 clear (a mismatch sets `outcome.blocker = true` at `doctor.ts:279` via
`drift-check.ts:118-128`). Kick-back 1 clear — the canonical preamble survives, which is correct:
`extractBlock` ships only the bounded block.

The relocation is a pure move, re-derived a third way independent of QA's two: the delta between
`71037e5a^:CLAUDE.md` and `71037e5a:CLAUDE.md` over all 128 uniquely-matched non-empty lines is
**exactly two-valued** — `-128` for the 34 matched lines inside the block, `+59` for the 94 outside
— with **zero** lines at any other delta. A relocation that lost or reordered content would produce
a third value.

Targeted re-runs, all from source via `tsx`, never through `dist/cli.js`:

```
test/docs/claude-md-block-leads-relocation.red.node.test.ts   4 / 4 / 0 / 0
test/init/claude-md-block-leads.red.node.test.ts
  + test/lib/claude-md-anchoring.red.node.test.ts
  + test/commands/init.node.test.ts
  + test/commands/upgrade-claude-md.red.node.test.ts          74 / 74 / 0 / 0
test/changelog-format + changelog-slice + upgrade-changelog   26 / 26 / 0 / 0
npm --prefix cleargate-cli run typecheck                      clean, exit 0
```

The doc-truth file reports `skipped 0`, so T9's acceptance clause is satisfied by execution, not by
`skip: !existsSync` vacuity.

### Q1.7 `upgrade.ts` — one behavioural line, read directly

```
:369  try {
:372    if (ourBlock === null)   -> refusal, return { updated: false, newSha: null }
:379    if (theirBlock === null) -> refusal, return { updated: false, newSha: null }
:382    mergedContent = injectClaudeMd(ours, extractBlock(theirs));
:383  } catch (err)              -> refusal
```

No `mergedContent = theirs` survives anywhere inside the `isClaudeMd` branch (`:365-389`) — BUG-043
kick-back 5 still clear one wave later. P9 named `:381`; it is `:382` because CR-105's own import
addition shifted the file by one. Recorded, not a finding.

**One freshly-created stale citation, and it is worth naming because of how it was created.** The
comment at `upgrade-claude-md.red.node.test.ts:10` was repaired this wave from `:364-378` to
`:368-388` — correct against BUG-043's tree. The same commit then added two import lines to
`upgrade.ts`, so the real range is now `try :369` … `catch` closing `:389`. Comment-only, zero
assertions, not a kick-back. Route to DevOps at merge or to the next reader of the file. The
lesson generalises and is proposed as a flashcard: **a line citation repaired in the same commit
that edits the cited file must be re-measured after the edit, not before.**

**Verdict: `POSTFLIGHT: pass`.** No kick-back criterion is tripped, no undeclared surface, no
dependency, no schema drift, no engaged Rule 4.

---

## Q2 — The M3 milestone verdict

**`GOAL_RELATION: off critical path` is confirmed, and it is now confirmed by machine witness
rather than by argument.**

O5 and Open decision 6 adopted the language before either M3 item landed. The reason to re-test it
now is that "off critical path" is only true if the goal is met **without** M3. That is checkable,
and it checks out. The Sprint Goal has three clauses; all three have a witness in the tree that
predates wave 8:

| Clause | Witness, measured 2026-08-29 |
|---|---|
| 1 — a pre-sprint SPIKE charter | `.cleargate/templates/spike.md` exists in both trees, `diff -q` silent (Cross-Cutting Rule 1 satisfied); `spike` carries 2 gate blocks in `readiness-gates.md` |
| 2 — a Task Breakdown section inside Story/CR/Bug | `^## Task Breakdown` present exactly once in each of `story.md`, `CR.md`, `Bug.md`, in **both** trees — 6/6 |
| 3 — repair the gate-index defect that blocks clause 2 | `epic.affected-files-declared` = `section(8)`, `cr.blast-radius-populated` = `section(3)`, `cr.sandbox-paths-declared` = `section(6)`; the pinning test resolves all 14 criteria to their named headings, `14 / 14 / 0 / 0` |

M3 contributes to none of these. It adds no decomposition surface, edits no template, no
`readiness-gates.md` criterion, no predicate, no `section(N)` index, and no gate. Had M3 slipped
entirely, the three witnesses above would read identically.

**What M3 did serve, in the plan's own terms** (`plans/M3.md` §"How M3 relates to the Sprint Goal",
re-read and re-affirmed, not paraphrased into something larger):

- **BUG-043 served scaffold integrity.** `injectClaudeMd` / `readBlock` / `writeBlock` /
  `removeBlock` are the only four functions in the product that rewrite a file the user owns and
  did not ask ClearGate to manage. Wave 8 narrowed the live half of that hazard and replaced two
  destructive routes on the latent half with a named refusal.
- **CR-105 served prompt-cache prefix stability** — a token-cost property of every session in every
  repo that installs ClearGate, grounded in this repo's own file (block was 129–186 of 186; it is
  now 1–58).
- **Both served the release**, in the narrow sense of being the last two `cleargate-cli` behaviour
  changes before the Gate-4 publish that M2 P3 already required for an unrelated reason.

These are a **theme** — "a silent, green-looking failure in a correctness surface", the same value
BUG-042 served — not a goal clause. The distinction is the whole point of the verdict, and the
sprint report must keep it: **do not write a sentence that makes M3 sound like part of the goal.**
Report `met` for the Sprint Goal on the strength of M1 and M2, and report M3 separately as
off-critical-path work that shipped in the same window.

Reporting constraints that survive this close, carried forward verbatim from the rulings that
created them: BUG-043's severity qualification is fixed by post-flight **P2** and is the only
wording the Reporter may use; no unqualified "P1 data-loss bug fixed" line may appear anywhere
(O3). CR-105's `upgrade` half is latent defense-in-depth and may not be described as a shipped
behaviour change (O2) — re-verified this wave: `CLAUDE.md` remains absent from all 70 manifest rows
and all 65 install-snapshot rows.

---

## Q3 — Residuals: three candidates, one item

Bar applied literally: *would a user or a future agent be misled?*

### Q3.1 The `## Unreleased` CHANGELOG gap — **NO ITEM.** The entry is not at risk.

The Developer's measurement is correct and I reproduced it. `changelog-format.node.test.ts:129`
matches `/^## \[(\d+\.\d+\.\d+)\] — \d{4}-\d{2}-\d{2}$/gm`, so `## Unreleased` is invisible to the
topmost-version check. `src/lib/changelog.ts:33` uses the **same** bracketed pattern, so
`parseChangelog` starts its first section at the first bracketed heading and content above it is
dropped entirely. Measured against the committed tree:

```
parseChangelog(CHANGELOG.md) -> 34 sections, top = 0.24.2
any section body contains "CR-105"  : false
raw file contains "CR-105"          : true
```

So today CR-105's entry is invisible to `cleargate upgrade`'s changelog printer. **That is correct
behaviour, not a defect** — unreleased content should not be printed to users — and the window
closes at release.

The disposal question is what happens at Gate 4, and it has a precedent in this repo's own history,
which I traced rather than assumed:

```
55bc887  fix(EPIC-043): CR-093/094/095 ...   +## Unreleased
260bf8a  release(cleargate): v0.21.0 ...     -## Unreleased  +## [0.21.0] — 2026-08-02
                                              package.json 0.20.0 -> 0.21.0
```

The release commit **renames** the heading and bumps `package.json` in the same commit. The
Developer's precedent claim is exact.

Enumerating the ways Gate 4 could go wrong:

| Path | Outcome | Caught? |
|---|---|---|
| Rename `## Unreleased` → `## [X.Y.Z] — <date>` + bump (the `260bf8a` recipe) | entry ships, visible to `upgrade` | correct |
| Bump `package.json`, forget the CHANGELOG entirely | topmost bracketed = `0.24.2` ≠ `X.Y.Z` | **`changelog-format` scenario 2 fails loudly** |
| Insert a new `## [X.Y.Z]` heading **above** a forgotten `## Unreleased` | simulated: the CR-105 text is swallowed into the `X.Y.Z` section body and **is** reachable via `sliceChangelog('0.24.2','0.25.0')` | cosmetic only — a stray `## Unreleased` subheading inside a released section |

No path loses the entry. The blind spot is also what *enables* the staging convention: a regex that
matched `## Unreleased` would fail scenario 2 on every staged fix. Filing an item here would not
clear the bar — nobody is misled.

**What is warranted instead — a Gate-4 checklist line, not an item.**
`.cleargate/knowledge/sprint-closeout-checklist.md` §2 says "CHANGELOG files — any user-visible
change" and §"version bump" says "only if releasing this sprint"; **neither names the
`## Unreleased` → `## [X.Y.Z] — <date>` rename**. Add: *"If `cleargate-cli/CHANGELOG.md` carries an
`## Unreleased` section and you are releasing, rename it to `## [X.Y.Z] — <ISO date>` in the same
commit as the `package.json` bump (precedent `260bf8a`). Content above the first bracketed heading
is invisible to `parseChangelog` and therefore to `cleargate upgrade`."*

### Q3.2 `dist/cli.js` is stale (T12) — **NO ITEM.** Already owned; the obligation is confirmed and sharpened.

T12 is confirmed and extended: `dist/cli.js` (built 2026-08-28 12:14, untracked — `git ls-files
dist/` returns 0) is pre-BUG-043 **and** pre-CR-105 on four independent markers:

```
hasAnchoredBlock                              ABSENT
"has CLEARGATE markers but no anchored block" ABSENT
"Moved the ClearGate block to the top"        ABSENT
"prompt-cache prefix stability"               ABSENT
dist/cli.js:1513   return existing.trimEnd() + "\n\n" + block + "\n";   <- the evicted append branch
dist BLOCK_REGEX   /CLEARGATE:START -->([\s\S]*)<!-- CLEARGATE:END -->/  <- unanchored, pre-BUG-043
node dist/cli.js --version -> 0.24.2   (the global /opt/homebrew binary is also 0.24.2)
```

**What breaks if someone demos through the built binary before the rebuild — measured, not
reasoned.** I replicated `dist`'s grammar and `injectClaudeMd` body verbatim and ran both it and
the shipped source against the same two fixtures:

```
fresh downstream repo, CLAUDE.md with prose and NO block
  dist   : starts with START? false   last non-empty line: "<!-- CLEARGATE:END -->"
  source : starts with START? true    last non-empty line: "More prose."
```

The stale binary produces exactly the output CR-105 `§4`'s "old logic evicted" assertion forbids. A
demo in any repo without an existing block reads as *"CR-105 did not ship"*, and the §0.5 Q1
relocation notice never prints because `init.ts`'s new branch is not in the bundle.

**One counter-intuitive result worth recording so nobody draws the wrong conclusion from a clean
demo:** run against **this** repo's now-relocated root `CLAUDE.md`, the stale binary is
byte-identical to a no-op (`out === root`, one anchored block, idempotent) — its replace-in-place
branch fires and the block is already at the top. So a demo *here* looks fine and proves nothing.
The failure is only visible in a repo whose block is absent or mid-file.

No item: the rebuild is already a Gate-4 obligation (M2 P3, and the release lane owns it). Filing
would duplicate an owned obligation. **What is warranted is a verification recipe** so the rebuild
is confirmed rather than assumed — after `npm --prefix cleargate-cli run build`, all four markers
above must flip to PRESENT and `grep 'existing.trimEnd() + "\\n\\n" + block' dist/cli.js` must
return nothing.

### Q3.3 T8's blank-line scar — **ITEM FILED: [[CR-114]].** This is the one with no carrier.

Reproduced against the shipped `injectClaudeMd` @ `45816b9`:

```
in  : "# Proj\n\n<!-- CLEARGATE:START -->\nBLOCK\n<!-- CLEARGATE:END -->\n\nFooter.\n"
out : "<!-- CLEARGATE:START -->\nBLOCK\n<!-- CLEARGATE:END -->\n\n# Proj\n\n\n\nFooter.\n"
idempotent (2nd application byte-identical) : true
max blank run : 1 in, 3 out
```

Exactly T8's prediction. Correct as specified — `stripped.trim()` acts on the string's ends, and the
only cheap way to remove the interior gap is a global blank-run collapse, which would rewrite blank
lines the user authored elsewhere: the harm class BUG-043 exists to close, and the one N1 explicitly
refused.

**Where it is recorded today — a complete census, not a sample:**

| Surface | Records the scar? |
|---|---|
| `src/init/inject-claude-md.ts` (`:51-57`, the comment directly above the cause) | **no** |
| every test title and assertion in the tree | **no** |
| `cleargate-cli/CHANGELOG.md` | **no**, and its clause *"it is not touched or reordered otherwise"* is true of content and false of whitespace |
| the CR-105 work item | **no** |
| `plans/M3.md` T8 and `CR-105-tpv.md` | **yes — and both are sprint-scoped artefacts that stop being read at close** |

And the coverage is worse than absent, it is *deceptive*: `claude-md-block-leads.red.node.test.ts:135-140`
(scenario 5) feeds a mid-file block on **every run** and asserts only `includes('NEW')` /
`!includes('OLD')`. The scar is executed constantly with zero witnesses.

This clears the bar on the future-agent limb, and the evidence is that it has **already** happened
prospectively: T8 exists precisely because the TPV Architect predicted QA-Verify would read the
doubled blank line as content loss. That prediction was correct and the warning that prevented it
expires with this sprint. The natural next move — a later story adding a byte-equality assertion to
satisfy kick-back 12's "pure relocation" — walks straight into it.

Filed as `.cleargate/delivery/pending-sync/CR-114_Relocation_Whitespace_Scar_Unrecorded.md`.
`approved: false`, 🟡, gate **9/9 pass** under `node cleargate-cli/dist/cli.js gate check`, authored
by heredoc so the PostToolUse ingest hook did not fire (`.cleargate/wiki/**` is held by a concurrent
session; `git status` confirms no `wiki/crs/CR-114.md` was created). Scope is deliberately small and
the Recommended route is **document and pin, do not fix** — a comment beside
`inject-claude-md.ts:56`, one exact-string assertion on scenario 5, one CHANGELOG clause. Its `§0.5`
carries the document-versus-fix decision for the human rather than resolving it.

---

## Q4 — The surface-declaration pattern, re-measured

**The "five for five / six for six" claim does not survive measurement. The defensible number is
7 of 8, and two items were never examined at all.**

SPRINT-39 has 18 items; 10 executed through wave 9. Of those 10, **two never had their own
surface list reviewed**: `plans/M0.md` authored an exhaustive `### File surface` table for BUG-042
(`:192`) and STORY-054-05 (`:286`) rather than pronouncing on the item's own `§3`/`§4`. So the
denominator for "examined" is **8**, not 10 and not 6.

| Item | Wave | Architect verdict on its own declared surface | Failure mode |
|---|---|---|---|
| BUG-042 | 1 | not examined — M0 authored the file surface directly | — |
| STORY-054-05 | 2 | not examined — same | — |
| STORY-054-01 | 3 | *"§3.1 is correct as written"* (`M1.md:81`), never reversed | **none — the one clean list** |
| STORY-054-04 | 3 | *"correct as amended"* (`M1.md:175`) with an advisory fix that is materially load-bearing: R22 (`M1.md:704`) measures row 13's "byte-identical" obligation as wrong and states that *"a Developer who reads row 13 literally deletes this repo's gate and worktree configuration"* | **wrong justification** |
| STORY-054-02 | 4 | *"INCOMPLETE. Three sites missing; one of them is required."* (`M1.md:346`) | **omission** |
| STORY-054-03 | 5 | *"substantially correct"* at plan time (`M1.md:536`) — the `Related Files` cell declares an **untracked** live path that cannot be staged without forbidden `git add -f`; then found incomplete at milestone close, root `CLAUDE.md:161` never declared, which became BUG-057 (`STORY-054-03-arch-postflight.md:78-79`) | **omission**, discovered post-hoc |
| STORY-054-06 | 6 | *"INCOMPLETE. The outer half is exactly right; the entire cli half is missing."* (`M2.md:333`) | **omission** |
| STORY-054-07 | 7 | *"INCOMPLETE, and inverted."* (`M2.md:773`) — Primary/Mirror labelling backwards, and one omitted path turns the cli suite red | **omission + inversion** |
| BUG-043 | 8 | *"INCOMPLETE"* (`M3.md:355`) | **omission + wrong premise** |
| CR-105 | 9 | *"WRONG"* (`M3.md:686`) | **wrong justification + unsatisfiable assertion + omission** |

**7 of 8 examined surface lists were defective. The single clean one was STORY-054-01's.** That is
the number for the sprint report, and it is stronger evidence than the inflated one because it
carries a counter-example: a correct surface list is achievable in this repo, and one item achieved
it.

### Q4.1 The pattern held for both M3 items — but the failure modes were different, and that is the finding

**BUG-043 — omission, plus a wrong premise.** The orchestrator's `§4 AMENDMENT` correctly added
three files and still omitted the fix's actual hazard: the `includes()` guards at
`claude-md-surgery.ts:25-30` / `:39-44`, whose divergence from an anchored regex turns
`String.replace` into a silent no-op and makes `uninstall.ts` report a block removed that is still
there. The named *files* were right; the specific *lines that had to change inside them* were not,
and that gap is the difference between a fix and a new silent corruption. Two secondary defects: the
recorded Q2 CRLF rationale is measurably false for JavaScript (`\r` is a LineTerminator, so `/m`
anchors already span it — N1), and `§4` named a `doctor --drift` flag that does not exist (N6).

**CR-105 — wrong justification, and this is the rarest and most dangerous mode of the three.** `§3`
listed `src/commands/init.ts` as *"the call site that must adopt the new contract."* Measured false:
`init.ts:371-388` needs nothing, because `injectClaudeMd` owns the contract and its signature is
unchanged. **The row was right; the reason was wrong** — the file was needed for an entirely
different purpose, as the only viable site for `§0.5` Q1's recorded human decision (the relocation
notice, `init.ts:390-396`). The failure mode is directional: an omission is caught by a Developer who
opens the file anyway, whereas a false justification actively steers the Developer *away* from the
lines that matter, and the obvious remedy — deleting a row whose justification is false — would have
dropped a recorded human decision on the floor. That is P7(d)'s point and it is worth stating in the
report as a general rule: **when a declared surface's justification is wrong, replace the
justification; do not delete the row until you have found out why the file is really there.**

CR-105 also carried an **unsatisfiable** assertion — `§2` bullet 5 and `§4`'s *"assert the install
manifest sha for `CLAUDE.md` is refreshed"*, against a file that has never been a manifest row
(re-verified this wave: 0 of 70 payload rows, 0 of 65 install-snapshot rows) — and the usual
omissions, all repaired by amendment: `init.node.test.ts` scenario 3 (the one existing red),
`CHANGELOG.md`, three stale-title files, and the outer doc-truth red file.

---

## Q5 — M4 handoff

Waves 10–13: `BUG-044 ‖ BUG-045 ‖ BUG-046` → `CR-106 ‖ CR-107` → `CR-108 ‖ CR-110` → `CR-111`.
Not planned here. Four things only this post-flight can supply.

### Q5.1 The root `CLAUDE.md` renumbering map — and the census result is a clean zero

The relocation is exactly two-valued, measured over all 128 uniquely-matched non-empty lines with
zero exceptions:

```
lines INSIDE  the block (old 129-186) : new = old - 128      (34 matched, all agree)
lines OUTSIDE the block (old   1-128) : new = old + 59       (94 matched, all agree)
file length unchanged at 186 newlines; block now at 1-58
```

This confirms the orchestrator's BUG-057 repair arithmetically: `:162 - 128 = :34` and
`:161 - 128 = :33`. Both correct.

**Census of the eight M4 items: none of them cites a root `CLAUDE.md` line number.** `grep -E
'CLAUDE\.md:[0-9]+'` over all eight returns zero hits. Three mention `CLAUDE.md` at all — BUG-045
(×3) and CR-106 (×3) **quote protocol prose with no citation and no edit**, so both are unaffected;
CR-108 is the exception and is Q5.2. Nothing else needs repair. This is the answer, and it is a good
one: the exposure the dispatch anticipated does not exist beyond BUG-057, which is already repaired.

### Q5.2 Collisions — exactly one, and it is CR-108

`grep` over all eight M4 items for every path BUG-043 or CR-105 touched returns **one** hit:

```
CR-108_Universal_Work_Item_Scaffold.md:102
  - `CLAUDE.md` (root + `cleargate-planning/`) — drafting directive.
```

Three consequences, all measured:

1. **CR-108's own `## Prior work` is now false.** Line 92 reads *"[[CR-105]], [[BUG-043]] — also
   SPRINT-39, also two-tree template/marker edits, but on `CLAUDE.md` handling rather than the
   templates themselves. **No overlap.**"* Its own `§3` declares both `CLAUDE.md` files, which is
   exactly the pair `71037e5a` rewrote. The overlap is at file level and it is real. The M4
   Architect must correct that sentence before dispatch — it is precisely the stale-prose class this
   sprint exists to remove, sitting in an unexecuted item.
2. **CR-108's target sentence is inside the bounded block, and it is adjacent to BUG-057's.**
   *"Use the templates in `.cleargate/templates/`"* is root `CLAUDE.md:33` (canonical `:39`);
   BUG-057's *"Save drafts to …"* is root `:34` (canonical `:40`). Same list, consecutive lines.
   BUG-057 is `approved: false` and not in any wave, so no in-sprint collision — but if both ever
   run, they collide on adjacent lines.
3. **The two-tree hash coupling binds CR-108 and nothing warns it at test time.** An edit inside
   `CLAUDE.md:1-58` not mirrored into `cleargate-planning/CLAUDE.md:7-64` makes bare `cleargate
   doctor` set `outcome.blocker = true` (`drift-check.ts:118-128` → `doctor.ts:279`). No cli test
   catches it — the four outer-reading tests check phrase *presence*, not block equality; the only
   block-equality assertion in the tree is CR-105's new doc-truth file, which is scoped to that
   invariant and will catch it, but only if someone runs it. CR-108's `§3` correctly names both
   trees; BUG-057's `§4` does too. Neither states *why*. Give the M4 Architect the `block-equal`
   one-liner as the cheap detector.

No other M4 item touches any file BUG-043 or CR-105 changed. **No M4 item declares
`cleargate-cli/CHANGELOG.md`** — worth flagging, since P3 established it as a user-facing carrier
printed by `cleargate upgrade`, and CR-108 (`cleargate new`), CR-107 (merge policy) and CR-106
(state format) are all user-visible. If any of them lands before the release, it appends under the
existing `## Unreleased` heading; it must not open a second one.

### Q5.3 Invalidated, redundant, or newly blocked — one finding, and it is CR-110

**Nothing M3 shipped invalidates or blocks any M4 item.** But one is now provably incomplete, and
SPRINT-39's own M3 is the counter-example:

**CR-110 — "The sprint goal gets an acceptance check."** Its `§1` New Logic states: *"The Reporter's
verdict reads the check instead of judging. `met` means the recorded check passed; `partial`/`missed`
name which part did not."* Its vocabulary is `met | partial | missed`, plus
`not-mechanically-verifiable` for a goal with no mechanical check.

**There is no slot for a milestone that serves no clause of the goal at all.** M3 is exactly that,
and this post-flight had to invent `GOAL_RELATION: off critical path` to report it honestly. Under
CR-110 as drafted, M3 would have to be scored `met`, `partial` or `missed` against a goal it does
not serve — which is the manufactured linkage O5 forbade in the same sprint. Note the distinction:
`not-mechanically-verifiable` is about *how* a goal is checked; `off critical path` is about
*whether the work relates to the goal at all*. They are orthogonal, and CR-110 has only the first.

Route to the M4 Architect as a scope question for CR-110, with SPRINT-39 M3 as the worked example.
It is a vocabulary addition, not a redesign, and it is cheapest to add before the CR is executed.

Three lighter notes for the M4 Architect, in descending value:

- **BUG-046** — its own finding (a worktree materialises tracked files only; `cleargate-cli/` does
  not exist inside `.worktrees/*`) was load-bearing for both M3 items and held: BUG-043 ran in the
  `cleargate-cli` main checkout and CR-105's outer half ran in the outer **main** checkout, not a
  worktree. `git worktree list` shows one entry. M3 is a second confirming witness, not a
  counter-example.
- **CR-111** — inserts `## ` headings into templates and therefore engages Cross-Cutting Rule 4.
  M3 inserted none, so it left CR-111's ground untouched: `gate-section-index-pinning` is `14/14`
  and the three BUG-042 indices are unmoved. CR-111 inherits the M2 close state exactly.
- **Do not verify any M4 work through `dist/cli.js` until the Gate-4 rebuild.** Q3.2's four absent
  markers apply to every wave-10-onward dispatch, and `node cleargate-cli/dist/cli.js gate check
  <file>` remains the one sanctioned use of the built binary.

---

## Flashcards — PROPOSED, deliberately NOT written

`.cleargate/FLASHCARD.md` is held by a concurrent session and is on this dispatch's forbidden list.
Append at Gate 4, newest on top, after a dupe grep.

- `2026-08-29 · #surface-declaration #danger · A declared surface that is RIGHT FOR THE WRONG REASON beats an omitted one for damage: CR-105 listed init.ts as "the call site that must adopt the contract" (false), so a Dev following the justification skips the file and a recorded human decision never ships. Replace the justification; never delete the row until you know why the file is really there. [SPRINT-39 M3 / CR-105]`
- `2026-08-29 · #test-harness #danger · A fixture that EXERCISES a behaviour is not coverage of it. block-leads scenario 5 feeds a mid-file block on every run and asserts only body substitution, so the relocation whitespace scar has executed hundreds of times with zero witnesses. Grep for the fixture, then grep for an assertion about it. [SPRINT-39 M3 / CR-114]`
- `2026-08-29 · #dogfood-split #danger · cleargate-cli/dist/cli.js is untracked and hand-built, so after any CLI behaviour fix it silently exercises the OLD contract — measured post-CR-105: dist still carries the evicted append branch and the unanchored regex. A demo through dist reads as "the fix did not ship". And in a repo where the new contract is already satisfied it is a byte-identical no-op, so a clean demo proves nothing either. [SPRINT-39 M3]`
- `2026-08-29 · #changelog #release · Content above the first "## [X.Y.Z]" heading is invisible to BOTH changelog-format's topmost-version check AND parseChangelog, so an "## Unreleased" section never reaches cleargate upgrade. Correct while staging; the release commit must RENAME the heading in the same commit as the package.json bump (precedent 260bf8a). [SPRINT-39 M3]`
- `2026-08-29 · #citations #process · A line citation repaired in the same commit that edits the cited file must be re-measured AFTER the edit. CR-105 repaired upgrade-claude-md.red:10 from :364-378 to :368-388, then added two imports to upgrade.ts and re-staled it by one in the same commit. [SPRINT-39 M3]`
- `2026-08-29 · #goal #reporting · A milestone can serve NO clause of the sprint goal. "met | partial | missed" has no slot for that and forces a manufactured linkage, so report GOAL_RELATION: off critical path instead. Orthogonal to "not-mechanically-verifiable", which is about HOW a goal is checked, not WHETHER the work relates to it. [SPRINT-39 M3 / feeds CR-110]`

---

## Gate-4 obligations this close hands forward

1. **Rebuild `cleargate-cli/dist/`** and confirm, do not assume: `hasAnchoredBlock`, the
   `NOT_ANCHORED` message, `Moved the ClearGate block to the top` and `prompt-cache prefix
   stability` must all be PRESENT in `dist/cli.js`, and `existing.trimEnd() + "\n\n" + block` must be
   GONE. Four greps.
2. **Rename `## Unreleased` → `## [X.Y.Z] — <ISO date>`** in the same commit as the `package.json`
   bump, if releasing. Add the corresponding line to `sprint-closeout-checklist.md` §2 (Q3.1).
3. **`cleargate-planning/MANIFEST.json` regeneration** — unchanged obligation, DevOps, in
   coordination with the concurrent session that holds the file.
4. **Append the six proposed flashcards** after a dupe grep.
5. **Add the stale-line-citation note to BUG-057** — already done by the orchestrator (`:162`→`:34`,
   `:161`→`:33`), arithmetically confirmed here. Nothing further.
6. **Fix `upgrade-claude-md.red.node.test.ts:10`'s new off-by-one** (`:368-388` → `:369-389`),
   comment-only, at whoever's convenience.

## Script Incidents

None. No script was invoked through `run_script.sh`; all measurement was direct `git` / `grep` /
`node` / `npx tsx` execution plus `node cleargate-cli/dist/cli.js gate check` for the one gate check.

## Method-constraint compliance

- No source, test, or `CLAUDE.md` file edited in either repo. One new file written:
  `.cleargate/delivery/pending-sync/CR-114_Relocation_Whitespace_Scar_Unrecorded.md`, by heredoc.
- No `git reset --hard`, `stash`, force push, history rewrite, `--no-verify`, branch switch, or
  merge. `cleargate-cli/stash@{0}` untouched. Both repos left on `story/CR-105`.
- No `cleargate init`, no `cleargate wiki`, no bare `cleargate`. No suite run piped through
  `tail`/`head`.
- Never verified through `cleargate-cli/dist/cli.js`; all behaviour measurement ran from source via
  `tsx` or by replicating `dist`'s bundled code in a scratch script for the explicit purpose of
  measuring the staleness in Q3.2.
- Did not touch `EPIC-058_*.md`, `.cleargate/wiki/**`, `cleargate-planning/MANIFEST.json`, or
  `.cleargate/FLASHCARD.md`. `git status` confirms no `wiki/crs/CR-114.md` — the ingest hook did not
  fire.
