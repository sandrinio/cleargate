# CR-111 — Architect Post-Flight

role: architect · SPRINT-39 · M4 / w13 · mode: Post-Flight (standard lane, required) · 2026-08-30

Commits under review: cli `b13a2e39c7fa7b77ca3fc2ec1e3ee12b843846c6` (`story/CR-111`, own repo) ·
outer `248c9ff0a67e8295497a82328d3494b9dcc12323` (`.worktrees/CR-111`, `story/CR-111`).
QA-Red anchors: cli `9bb1467`, outer `640b6928`.

## Preflight

| Read | Result |
|---|---|
| `.worktrees/CR-111/.cleargate/sprint-runs/SPRINT-39/sprint-context.md` | Read. Cross-Cutting Rules 1-6 bind; Rules 3 and 4 are the load-bearing ones here. |
| `plans/M4.md` — WAVE 13 CR-111 (F1-F9, N1/N5/N6/N7/N9/N10, the T1-T11 table, the corrected file surface, the 11-item kick-back list), R6/R7, OD-7 incl. the X14 rider | Read. |
| `CR-111_Declare_Test_Layers_At_Planning.md` (worktree copy, post-Developer) | Read in full, both `ORCHESTRATOR AMENDMENT` blocks. |
| `CR-111-qa-red.md` (§ROUND 1/2/3, 570 lines), `CR-111-dev.md`, `CR-111-qa.md` | Read in full. |

Everything below that is stated as measured was measured in this dispatch. I did not re-run the
full suite (dispatch constraint); every run is targeted.

---

## 1 — Plan conformance

**Verdict: conforms.** All eleven M4 kick-back criteria clear. Three deviations found, all
non-blocking; two of them are corrections the plan itself was wrong about.

### The eleven kick-back criteria, each measured

| # | Criterion | Measured |
|---|---|---|
| 1 | T8 present; not a `section(N)` criterion (F6) | PASS — `test-layers-declared` is a closed-set predicate; `grep -c 'section('` on `readiness-gates.md` is **21 before and 21 after** the commit; no `section(N)` criterion added. |
| 2 | T3 present; evaluator checks the reason cell, not just row count (F9) | PASS — `readiness-predicates.ts` new function: `if (count === 0 && reasonRaw === '')` → fail. Probed directly (§Appendix A4). |
| 3 | T5 present; grandfathering NOT via `created_at_version` (F7) | PASS — no `created_at_version` read anywhere in the new function; grandfathering is the absence-passes branch. |
| 4 | `evalSection` unmodified and unexported (N5, T9) | PASS — independently hashed, §3 below. |
| 5 | No `## ` heading added to `story.md`/`CR.md`/`Bug.md` (N6) | PASS — heading lists identical pre/post in all six files, §3 below. |
| 6 | `expected-headings.ts` not opened; pinning test green | PASS — `git diff 9bb1467 b13a2e3 -- test/` is **empty**; `gate-section-index-pinning` `tests 14 · pass 14 · fail 0`. |
| 7 | `readiness-gates.md` predicate-shape count bumped | PASS — `:9` reads "exactly **11 predicate shapes**"; a numbered `**11. \`test-layers-declared\`**` vocabulary entry exists. Counted: 11 numbered shapes in the doc, 12 `ParsedPredicate` union kinds in source — the deliberate drift-by-one QA documented. |
| 8 | `developer.md` and `qa.md` updated alongside `SKILL.md` §C.3 (T7) | PASS — all three canonical files carry both forms plus the hyphen legacy form, in prose. |
| 9 | Zero live `.claude/**` paths in the commits (N1) | PASS — `git show --name-only` on both commits: **0** paths under `.claude/`. `.claude/` does not exist in the worktree at all. |
| 10 | Mirrored pairs byte-identical (Rule 1) | PASS — `diff -q` clean on all four pairs (three templates + `readiness-gates.md`). |
| 11 | Typecheck + suite numbers in the report (Rule 6) | PASS — both present in `CR-111-dev.md`; typecheck reproduced clean by QA and again here implicitly via `tsx` runs. |

### R7 (FULL, cross-repo) and the X14 rider

**Both satisfied.** CR-111 shipped FULL — templates + gates + doctrine + the cli predicate — not
the §2 escape clause's template-only half. The cli half exists as a separate commit in the
`cleargate-cli` repo, which is what "cross-repo" means here.

**X14 rider verified by measurement, not assertion:** cli `story/CR-111` branched from cli `main`
@ **`9df6f2a`**, which is `test(CR-108): replace frozen CLAUDE.md length pin with cross-tree
identity` — i.e. main's tip *after* CR-108 merged (and after BUG-045's `82da563`). `e4cb49f` is an
ancestor of `9df6f2a`, not the branch point. The rider is honoured exactly.

### Deviations

**D1 — the plan's "18/18/0/0" for T6 is wrong; `14/14/0/0` is right.** Not a Developer deviation —
a plan defect the QA-Red and Developer both caught and corrected in writing. `18` is the criteria
count printed inside S1a's and S6's test *titles*; `14` is the test count. See §3.

**D2 — `story.md`'s new row drops the "`0` is valid — state why" guidance that M4's
§"Schema change — verbatim" specified.** Shipped row:

```
| Integration tests | {N} | {e.g., "1 per *.integration.node.test.ts scenario — real Postgres/Redis, no mocks"} |
```

The plan's verbatim row also carried `` `0` is valid — state why ``. `CR.md`/`Bug.md` carry that
sentence in their `**Test layers.**` lead-in; `story.md` does not, because it extends an existing
table rather than adding a lead-in. Consequence: the `story` gate block is `severity: enforcing`,
so an author who writes `| Integration tests | 0 |  |` gets a hard failure from a template that
never told them a reason was required. Self-correcting (the failure detail names the requirement
verbatim) and T8b pins row *presence*, not Notes text, so the fix is a one-cell edit in two trees
with zero test coupling. **Non-blocking; follow-up FU-4.**

**D3 — no `cleargate-cli/CHANGELOG.md` bullet.** The Developer conformed to the blueprint: CR-111's
§"Corrected file surface" does not list the CHANGELOG. But M4 §Q5-C's *stated principle* is
"user-visible + touches `cleargate-cli/src` → one bullet under the existing `## Unreleased`", and
that census was written before F/X13 established that CR-111 has a cli half at all. CR-111 changes
`cleargate gate check` output for the three highest-volume buckets and newly fails 12 live items
(§4). The plan is internally inconsistent and the Developer followed the more specific instruction.
`grep -c '^## Unreleased'` is **1** and `test/changelog-format.node.test.ts` is `5/5` — a bullet
under the existing `### Added` is free. **Non-blocking; remediation named in FU-1.**

---

## 2 — `GOAL_RELATION`

**Confirmed. `off critical path` still holds for what actually shipped.** Form for the sprint
report to consume verbatim:

```
GOAL_RELATION (M4, all eight items incl. CR-111): off critical path
```

The three Sprint Goal clauses were met in M1/M2 and are untouched by CR-111 — re-measured this
dispatch against the CR-111 tree, not inherited:

1. **SPIKE charter** — `.cleargate/templates/spike.md` is not in either commit's file list.
2. **Task Breakdown section** — present in all three templates at positions 4 (`story.md`),
   7 (`CR.md`), 5 (`Bug.md`); `task-breakdown-complete` still registered; CR-111 *uses* the surface
   (nine ticked rows in its own item) and does not alter it.
3. **Gate-index repair** — 18 `section(N)` criteria = 16 pinnable + 2 known-unpinnable, **zero**
   heading mismatches, both trees, resolved against the CR-111 worktree (§3).

What CR-111 serves, in its own terms — for the report, not as goal linkage: it closes the
integration layer in `story.md` §4.1 and converts a convention living in 31 files and zero
documents into doctrine. It is the fifth of M4's eight items in the *"a correctness surface that
fails silently and reads green"* theme.

**Producer gap — unchanged by this item.** CR-110 shipped the *vocabulary* (canonical
`SKILL.md:246-256`) and the *consumer* obligation (`reporter.md:39-40`, `:63` — "quote that
milestone's own `GOAL_RELATION` line verbatim from its plan"). The **producer** is still an
Architect prose obligation with no emitter and no check: nothing in `.cleargate/scripts/**`,
`pre_gate_runner.sh`, or the cli asserts that a milestone plan file *contains* a `GOAL_RELATION`
line. `cr078_init.test.sh:684-742` asserts only that `reporter.md` and `SKILL.md` carry the
doctrine text — a doc-shape test, not an emitter. CR-111 neither creates nor closes that gap. The
assessment stands as previously recorded; do not re-file.

---

## 3 — Cross-Cutting Rules 3 and 4, verified independently

### Rule 3 — `evalSection` frozen

**PASS.** I re-extracted `evalSection` at three revisions with my own line-based extractor
(`function evalSection(` through the next column-0 `}`), independent of the test's brace-walk:

| Revision | Location | Chars | SHA256 | Exported |
|---|---|---|---|---|
| `9df6f2a` (cli main, pre-branch) | `:640-690` | 2109 | `9d9b5f5d…38c1fc` | no |
| `9bb1467` (QA-Red anchor) | `:640-690` | 2109 | `9d9b5f5d…38c1fc` | no |
| `b13a2e3` (Developer) | `:648-698` | 2109 | `9d9b5f5d…38c1fc` | no |

Byte-identical across all three; the only change is position (+8 lines, from the union member,
`parsePredicate` branch and `evaluate` case landing above it — exactly the drift A4's
signature-anchor design was built to survive). Hash matches `FROZEN_SHA256` in the red test.
`export function evalSection` → 0 hits; `export { … evalSection … }` → 0 hits.

The new function is the STORY-054-06 sibling shape, at end of file, per F9/A4. `git diff --unified=0`
hunks: docstring `:3`, union `:24`, `parsePredicate` `:139-141`, `evaluate` switch `:190-197`, new
function from `:1177`. Zero lines inside the frozen range.

### Rule 4 — no `section(N)` shifted

**PASS, confirmed by a check that does not depend on the pinning test.**

This matters because **`gate-section-index-pinning.node.test.ts` cannot see this branch.** Its root
is `const META_ROOT = path.resolve(CLI_ROOT, '..')` (`:97`) with **no `CLEARGATE_META_ROOT`
branch** — the property STORY-054-05's post-flight already recorded for `TEMPLATE_FOR.spike`. So
QA's "14/14/0/0 both redirected and unredirected" is one measurement performed twice against the
**main checkout**, which does not yet carry CR-111's template edits. I reproduced both runs
(`tests 14 · pass 14 · fail 0`, identical) and then measured the thing that actually answers the
question:

**(a) Heading-list identity, pre vs post, all six template files.** Split each body on
`/^(?=## )/m` after frontmatter strip — `evalSection`'s own splitter — at `c3e9f02b` (pre) and
`248c9ff0` (post):

```
.cleargate/templates/story.md                       9 -> 9 sections, list identical
.cleargate/templates/CR.md                         10 -> 10 sections, list identical
.cleargate/templates/Bug.md                         9 -> 9 sections, list identical
cleargate-planning/.cleargate/templates/story.md    9 -> 9 sections, list identical
cleargate-planning/.cleargate/templates/CR.md      10 -> 10 sections, list identical
cleargate-planning/.cleargate/templates/Bug.md      9 -> 9 sections, list identical
```

A `section(N)` cannot move when the ordered heading list is byte-identical. It is not.

**(b) Full criterion resolution against the CR-111 worktree** — the run the pinning test itself
can never perform. I replicated its `loadGateBlocksFromText` (incl. the load-bearing
`Array.isArray(parsed) ? parsed[0] : parsed` unwrap), `templateBodyOf` and `resolveHeadingLine`,
loaded the real `EXPECTED_HEADINGS` fixture unmodified, and resolved every criterion against the
worktree's own templates:

```
.worktrees/CR-111/cleargate-planning/.cleargate:  section(N) criteria=18  pinnable=16  unpinnable=2  mismatches=0
.worktrees/CR-111/.cleargate:                     section(N) criteria=18  pinnable=16  unpinnable=2  mismatches=0
```

**`18 = 16 pinnable + 2 known-unpinnable` holds on the post-CR-111 tree, in both trees, with zero
heading mismatches.** The `18` is the criteria count inside S1a/S6's test *titles*
(`:437`, `:640`); the acceptance number is `tests 14 · pass 14 · fail 0`, which I reproduced. The
fixture was not opened (`git diff … -- test/` empty), so the tampering Rule 4 forbids did not occur.

**Diff shape confirms it structurally too:** `git show 248c9ff0 -- <three templates> | grep '^[+-]## '`
returns zero. `CR.md`/`Bug.md` took the bold-lead-in form with no `### ` sub-heading at all, which
is even safer than the plan's fallback.

---

## 4 — Absence-passes contract

**PASS. The shipped predicate implements the TPV binding contract, not the CR's original
contradictory prose.**

The CR's §4 item 1 originally read *"a story file with no Integration row fails"*, which
contradicted item 5 (grandfathering) on the same input. The `ORCHESTRATOR AMENDMENT` resolved it to
absence-passes. Measured against the shipped code by direct `evaluate()` calls:

| Input | Result | Contract clause |
|---|---|---|
| Pre-CR-111 §4.1 table (Unit + E2E, no Integration row, no label) | **pass** — `not-applicable: no test-layer declaration …` | item 5 / absence-passes |
| `**Test layers.**` present, Integration row omitted | **fail** — `missing the "Integration tests" row` | amended item 1 |
| `\| Integration tests \| 0 \| pure function, no I/O \|` | **pass** | item 2 |
| `\| Integration tests \| 0 \|  \|` (empty reason) | **fail** — `count is 0 but carries no reason … an absent reason is not a decision` | item 3 |
| `\| Integration tests \| {N} \| … \|` (shipped template) | **fail** — `count "{N}" is not a non-negative integer` | T8 non-vacuity |
| `\| Integration tests \| -2 \| … \|` | **fail** — not a non-negative integer | contract |

All three contract clauses present: absence → pass **with** a `not-applicable:` detail; present →
all three layers, non-negative integer counts, every `0` carrying a reason. `doc.fm` is never read,
so the type-agnostic requirement (A8/REF-C) holds by construction rather than by branch.

**Corpus measurement — the ruling's own justification, re-derived against the shipped code.** I ran
the real `evaluate()` over every `STORY-`/`CR-`/`BUG-` file in the worktree's
`delivery/{pending-sync,archive}`:

```
story/cr/bug items scanned:            400
  absent  -> grandfathered, pass:      388
  trigger fires:                        12  ->  pass 0, fail 12
```

Absence-fails would have failed 388 of 400 — the ruling's 386/400 figure, confirmed to within the
two items whose classification differs by how the body is sliced. The ruling was correct on its
measurement and the code implements it.

**The 12 that do fail are correct-by-contract, and are a real corpus effect worth recording.** They
are legacy stories that hand-added an integration row and declared only *two* of three layers —
e.g. `STORY-018-05` has `Integration tests | 7` + `Unit tests | 0 | Integration only for this story`
but no E2E row; `STORY-023-01` has Unit + Integration but no E2E. Verified by reading the files:
these are genuinely-missing layers, not label-vocabulary mismatches. The gate blocks are
`severity: enforcing`, so this is a hard failure for those 12 on any future gate check. Designed
behaviour, not a defect — but it should be a recorded decision rather than a discovery (FU-5).

---

## 5 — Doctrine coherence, and the §C.3.5 ruling

### The new prose does not contradict anything it was scoped to

`developer.md:91` (inside `## Inner-loop test runner`), `qa.md:48` (item 7 of the RED-mode list) and
canonical `SKILL.md:338` + the qualified `:340` `File-naming:` clause all name the same three
forms — `*.integration.node.test.ts`, `*.red.integration.node.test.ts`, and the legacy hyphen
`<name>-integration.node.test.ts` (F3's third form, accounted for as legacy rather than left
silent). No contradiction with `developer.md`'s "Never mock the database" rule (the new sentence
explicitly points at it), with `sprint_context.md` §Test Stack's `Red-test naming` row (which the
agents are told overrides their defaults, and which named `*.red.node.test.ts` for *this* sprint's
reds — both CR-111 red files are correctly `*.red.node.test.ts`), or with anything in
`.cleargate/knowledge/`.

### The §C.3.5 question — RULING: acceptable to ship. Do not pull in now. File FU-1 with a trigger.

QA flagged `SKILL.md:383`. My sweep found **four** unqualified sites, not one, plus an executable
one QA did not reach:

| Site | Text | Exposure |
|---|---|---|
| `SKILL.md:383` (§C.3.5) | TPV dispatch prompt: *"list of `*.red.node.test.ts` files"* and *"(5) file naming `*.red.node.test.ts`"* | An Architect running TPV literally would flag a correctly-named `*.red.integration.node.test.ts` as a naming violation — a false `BLOCKED-WIRING-GAP` produced by CR-111's own new rule |
| `SKILL.md:346` (§C.3) | `RED_TESTS: <list of *.red.node.test.ts files written>` | Inside the *declared* sandbox. A return-shape placeholder, two lines below the now-qualified `:340`. Weak, but it is in scope |
| `SKILL.md:670`, `:677` (§D.5.1) | Consolidation red-test immutability check: `grep '\.red\.node\.test\.ts'` | The grep does not match `foo.red.integration.node.test.ts` |
| `cleargate-planning/.claude/hooks/pre-commit-surface-gate.sh:11` | `grep -E '\.red\.(node\.)?test\.ts$'` | **The immutability hook does not fire on `*.red.integration.node.test.ts` at all.** Six such files already exist and are unprotected |

**Why ship anyway.** (a) All four are outside CR-111's `## 3. Execution Sandbox`, which names
`SKILL.md` §C.3 only; the declared sandbox governs, and QA-Red's T7 was scoped to match it.
(b) The hook regex and the §D.5.1 grep are *executable enforcement* surfaces — changing them needs
its own red tests (a hook test exists: `test/hooks/red-gate.integration.node.test.ts`), which is a
story-sized change, not a doc tweak, and it is the wrong shape to bolt onto the last item of an
18/18 sprint. (c) The hole is **pre-existing**: the six `*.red.integration.node.test.ts` files
predate CR-111 and were already unprotected. CR-111 does not create the gap; it documents the form
that walks into it. (d) Nothing in flight is exposed — both CR-111 red files are
`*.red.node.test.ts` and are covered.

**But say the uncomfortable part plainly:** CR-111 §4 item 7 is worded *unscoped* — *"no doc claims
red tests may only be `*.red.node.test.ts`"*. That is satisfied **within §C.3** and **not satisfied
file-wide**. QA recorded the scoping honestly rather than papering over it, which is the correct
behaviour; the acceptance item's wording is looser than the sandbox that bounds it. I am ruling on
the sandbox. The exposure window is the *next* sprint's first §C.3.5 dispatch, so FU-1 carries a
trigger, not a wish.

---

## 6 — QA's two non-blocking findings

**(a) "2110 vs 2109 chars" — genuinely non-blocking. Confirmed independently.** My own extraction
gives **2109** characters and SHA `9d9b5f5dc4f28ad3a8d6130709672c8b667f86bd8fb33846f8bf950f7638c1fc`,
which is byte-identical to the `FROZEN_SHA256` literal at
`readiness-predicates-test-layers-declared.red.node.test.ts:504`. The load-bearing mechanism is the
hash, and it matches exactly. One correction to QA's framing: the stale `2110` is **not** only in
QA-Red's report — it is in two comment lines of the *shipped test file* (`:88`, `:494`). Still
prose, still non-executable, still not a bounce. FU-8, one-line.

**(b) `SKILL.md:383` — non-blocking, but larger than reported.** Confirmed non-blocking per §5.
QA's scoping analysis is correct; QA under-counted the site list (one of four, and the executable
hook was not reached). Escalating the *census*, not the verdict.

Neither finding is escalated. Both are recorded as follow-ups.

---

## 7 — Follow-ups (new only; the eight already-open items are not re-filed)

**FU-1 — red-integration naming is doctrine but not enforcement. Four doc sites + one hook.**
`SKILL.md:346`, `:383`, `:670`, `:677` and `pre-commit-surface-gate.sh:11` all key on
`*.red.node.test.ts` in a way that excludes `*.red.integration.node.test.ts`. The hook +
§D.5.1 pair is a genuine immutability hole covering six existing files. **Trigger: file before the
next sprint's first §C.3.5 TPV dispatch**, which is the first moment a false
`BLOCKED-WIRING-GAP` becomes reachable. Bundle the CHANGELOG bullet (D3) into the same item, or add
it directly on the cli branch before merge — one bullet under the existing `### Added`,
`grep -c '^## Unreleased'` must stay `1`, `test/changelog-format.node.test.ts` is `5/5` today.

**FU-2 — `qa.md`'s canonical-only edit introduces a NEW post-merge failure.**
`test/agents/qa-content.integration.node.test.ts` "CR-024 S2 Scenario 6: Mirror parity over
inserted sections" compares live `.claude/agents/qa.md` against canonical over the slice
`## Capability Surface` → `## Your one job`. CR-111's item 7 lands at `:48`, **inside that slice**.
Measured: live-vs-canonical(main, pre-merge) → `true`; live-vs-canonical(CR-111 worktree) →
`false`. The file passes `22/22` today and will fail at merge, clearing only at the Gate-4 live
re-sync. **Not a defect** — N1 and dispatch Deliverable D forbid committing the live path — but
`qa.md` must be on the Gate-4 re-sync list, and it is (the Developer listed all three files under
`adjacent_files`).

**FU-3 — the pre-merge residue accounting is one test short, and the post-merge target is not 3.**
`test/scaffold/sprint-execution-mirror.integration.node.test.ts` "diff command on live vs canonical
returns empty output" **fails in the main checkout right now**: live `SKILL.md` is 797 lines,
canonical is 829, the delta being CR-107's and CR-110's canonical edits with no live re-sync. It is
not in the dispatch's "3 inherited" nor in the Developer's itemised 18. It is **not** CR-111's — but
CR-111 adds two more canonical lines to the same file, so it stays red. Realistic post-merge
unredirected count: **≥5** (3 stated + this + FU-2's `qa.md`), of which everything except
BUG-067's `N6b` and the `sync.node.test.ts` network timeout clears at the Gate-4 live re-sync.
Correct the number before DevOps or the Reporter reads a post-merge suite.

**FU-4 — `story.md` §4.1's Integration row does not teach the `0`-needs-a-reason rule that the
`story` gate enforces.** D2. `CR.md`/`Bug.md` carry it in their lead-in; `story.md` does not.
One-cell edit in two trees; T8b pins row presence, not Notes text, so it costs nothing.

**FU-5 — 12 of 400 live `story`/`cr`/`bug` items now fail an `enforcing` criterion.** Correct by
contract (they declare two of three layers), but it is a corpus decision, not a discovery: either
sweep them, or record that archived items are out of scope for re-gating. Named in §4.

**FU-6 — `gate-section-index-pinning.node.test.ts` cannot be run against the branch that might
break it.** `META_ROOT = path.resolve(CLI_ROOT, '..')` (`:97`), no env override — so Cross-Cutting
Rule 4's own guard is unreachable pre-merge for every heading-inserting story, and a "redirected"
invocation is silently the same run twice. Both sibling CR-111 red files acquired the
`CLEARGATE_META_ROOT` branch (A9); this one predates it. Adding the same 4-line branch makes
Rule 4 verifiable in the worktree. (STORY-054-05's post-flight recorded the property for
`TEMPLATE_FOR.spike`; this is the consequence for Rule 4 specifically.)

**FU-7 — CR-111's shipped `## 3. Execution Sandbox` still declares the live `.claude/**` paths as
primary.** The N1/X9 inversion. The commit is canonical-only and correct; the item body was never
amended, so the shipped work item disagrees with the shipped commit on three of seven rows. Also
its committed `cached_gate_result` is stale — it records
`test-layers-declared: predicate error: unsupported predicate shape` (from 2026-08-29, before the
predicate existed) and an `existing-surfaces-verified` failure caused by that same live-path
citation being invisible from inside a worktree. Both clear on a re-stamp from the main checkout
post-merge.

**FU-8 — `2110` → `2109` in two comments of
`readiness-predicates-test-layers-declared.red.node.test.ts` (`:88`, `:494`).** Prose-only; the
hash is the mechanism and it is correct.

### Proposed flashcards (not written — FLASHCARD.md lives in the main checkout and this dispatch merges next)

- `2026-08-30 · #test-harness #gate #danger · A pinning test whose META_ROOT has no CLEARGATE_META_ROOT branch cannot see the branch under review — "redirected and unredirected" is then one measurement twice. Resolve the criteria by hand instead.`
- `2026-08-30 · #doctrine #danger · Blessing a new test-file naming form in prose does not extend the globs that enforce it: *.red.integration.node.test.ts does not match \.red\.(node\.)?test\.ts$, so the immutability hook never fires on it.`
- `2026-08-30 · #dogfood-split · A canonical-only agent-doc edit that lands INSIDE a live-vs-canonical parity slice creates a merge-time test failure that clears only at Gate-4 re-sync. Check the slice bounds before choosing the insertion point.`

---

## Appendix — every number above, reproducible

**A1 — `evalSection` freeze.** Extract `function evalSection(` → next column-0 `}` at `9df6f2a`,
`9bb1467`, `b13a2e3`; sha256 each. All three: 2109 chars, `9d9b5f5d…38c1fc`. Export probes:
`export function evalSection` and `export { … evalSection … }` → 0 hits at all three.

**A2 — section positions.** For each of six template files, `git show c3e9f02b:<f>` and
`git show 248c9ff0:<f>`, strip frontmatter, `split(/^(?=## )/m)`, list first line of each part.
Identical lists, identical lengths (9 / 10 / 9, both trees).

**A3 — criterion resolution against the worktree.** Replicate `loadGateBlocksFromText` (with the
`Array.isArray(parsed) ? parsed[0] : parsed` unwrap), `templateBodyOf`, `resolveHeadingLine`; import
the real `EXPECTED_HEADINGS`; resolve every `section(N)` criterion in the worktree's
`readiness-gates.md` against the worktree's templates. Both trees: `18 / 16 / 2 / 0 mismatches`.

**A4 — predicate probes.** Six synthetic bodies through `evaluate('test-layers-declared', …)` from
source. Results in §4's table.

**A5 — corpus sweep.** 400 `STORY-`/`CR-`/`BUG-` files in the worktree's
`delivery/{pending-sync,archive}`, frontmatter stripped, real `evaluate()`. 388 not-applicable,
12 trigger-and-fail.

**A6 — targeted runs (no full suite, per dispatch).**

```
CLEARGATE_META_ROOT=.worktrees/CR-111  tsx --test  readiness-predicates-test-layers-declared.red.node.test.ts
                                                   test-layers-declared-doctrine.red.node.test.ts
   -> tests 28 · pass 28 · fail 0 · skipped 0

tsx --test test/docs/gate-section-index-pinning.node.test.ts        -> tests 14 · pass 14 · fail 0
  (same, with CLEARGATE_META_ROOT set)                             -> tests 14 · pass 14 · fail 0   [env is inert here — FU-6]

tsx --test test/agents/qa-content.integration.node.test.ts          -> tests 22 · pass 22 · fail 0   [pre-merge; FU-2]
tsx --test test/scaffold/sprint-execution-mirror.integration…ts     -> tests  4 · pass  3 · fail 1   [pre-existing; FU-3]
tsx --test test/changelog-format.node.test.ts                       -> tests  5 · pass  5 · fail 0
```

**A7 — parity and surface.** `diff -q` clean on four mirrored pairs. `git show --name-only` on both
commits: zero `.claude/**` paths. `git diff 9bb1467 b13a2e3 -- test/`: empty (no red test amended;
`git show --stat b13a2e3` touches exactly `src/lib/readiness-predicates.ts`, 90 insertions /
2 deletions). `grep -c '^## Unreleased' cleargate-cli/CHANGELOG.md`: 1. Worktree
`git status --porcelain`: two untracked agent reports only — QA's `gate check` write-stamp was
reverted as claimed.

**A8 — branch points.** cli `story/CR-111` ← `main` @ `9df6f2a` (post-CR-108, post-BUG-045);
`e4cb49f` is an ancestor. Outer `story/CR-111` ← `sprint/S-39` @ `c3e9f02b`.

## Script Incidents

None. Every command was plain `git` / `grep` / `node` / `npx tsx`. No `.cleargate/scripts/**`
invocation was made, so `run_script.sh` was not applicable.

---

**Deviations found: 3 (D1 plan-defect already corrected in writing, D2 one template cell,
D3 one changelog bullet). Kick-back criteria failed: 0 of 11. Cross-Cutting Rules 3 and 4: both
independently confirmed on the post-CR-111 tree, by a route the sprint's own pinning test cannot
take. Absence-passes contract: implemented as ruled, verified against 400 live items.**

POSTFLIGHT=pass
