# CR-111 — QA-Red: `test-layers-declared` failing-test baseline

role: qa

Mode: RED — write failing tests against §4 acceptance, no implementation Read access.

## Execution route

Worked in `cleargate-cli/` (own git repo, sibling directory of the outer checkout, gitignored in
the outer meta-repo — main checkout, no worktree, per R7/N1: `.worktrees/CR-111` carries zero
tracked `cleargate-cli/` content, same BUG-046 collision-surface finding every prior cross-repo
item this sprint hit). Both checkouts on `story/CR-111`: outer cut from `sprint/S-39` @ `c3e9f02b`,
cli cut from `main` @ `9df6f2a` (confirmed via `git log -1` on both before writing anything).

Preflight, in the order the dispatch specified: `sprint-context.md` in full (both pages, 351
lines — Cross-Cutting Rules 1-6, the STORY-054-05 post-flight facts, the M1/M4 amendment tail);
`plans/M4.md`'s WAVE 13 — CR-111 section (F1-F9, the N6/N5 rulings, the T1-T11 table, the
corrected file surface, the QA kick-back list) and the appended `ORCHESTRATOR RULING — M4
pre-dispatch` block (R1-R8, especially R6's CR-111 row and R7); `CR-111_Declare_Test_Layers_At_
Planning.md` in full; grepped FLASHCARD.md for `#test-harness`, `#gate`, `#doctrine`, `#scaffold`
(60+ hits reviewed, load-bearing ones cited inline below). Read `readiness-predicates.ts` in full
(1177 lines) and `readiness-gates.md` in full (both trees) — required to know the exact throw
message, the `evalTaskBreakdownComplete` precedent shape, the existing gate-block YAML structure,
and the Predicate Vocabulary's exact numbered-entry format (`**N. \`name\`**`) — not implementation
I am writing, but the machinery my tests call and the doc my tests read. No edit was made to
either file (confirmed by `git diff --stat` below).

## Deliverable — two new red files, split by what each half can observe

`evaluate('test-layers-declared', doc)` cannot see which `readiness-gates.md` gate block invoked
it, and does not read `developer.md`/`qa.md`/`SKILL.md` at all — so the eleven M4 scenarios split
cleanly into a predicate-behaviour half and a doc/registry half. One file per half, both named per
`sprint-context.md` §Test Stack (`*.red.node.test.ts`):

1. `cleargate-cli/test/lib/readiness-predicates-test-layers-declared.red.node.test.ts` — T1, T2,
   T3, T4 (behavioural half), T5, T8, T9.
2. `cleargate-cli/test/docs/test-layers-declared-doctrine.red.node.test.ts` — T4 (registry half),
   T7, T10, T11.

T6 is **not** a new assertion in either file — see "T6: why no new test" below.

`git status --short` in `cleargate-cli/`: only these two new untracked files.
`git diff --stat`: empty — zero existing files touched. `readiness-predicates.ts`, the three
templates, `readiness-gates.md`, `developer.md`, `qa.md`, `SKILL.md`, `expected-headings.ts` and
`gate-section-index-pinning.node.test.ts` are all confirmed untouched.

## Scenario table (11 scenarios, 20 `it()`/`test()` cases across both files)

| # | Scenario | File | Mutant it kills | Result today |
|---|---|---|---|---|
| T1 | Story body with no Integration row — genuine baseline pin | lib, describe T1 | — (baseline-red pin, see note below) | ✔ green — `assert.throws(/unsupported predicate shape: test-layers-declared/)` |
| T2 | `Integration tests \| 0 \| pure function, no I/O` passes | lib, describe T2 | requiring a non-zero count | ✖ red (throw) |
| T3 | `Integration tests \| 0 \| ` empty reason fails | lib, describe T3 | copying `evalTaskBreakdownComplete`'s row-count-only logic (`:1165`) — passes T1,T2,T4,T5 | ✖ red (throw) |
| T4a | registered on `story`/`cr`/`bug` gate blocks (registry half) | docs, 3× `test()` | registering the criterion on `story` only | ✖ red ×3 (criterion absent from all three blocks today) |
| T4b | CR-shaped and Bug-shaped malformed table both fail (behavioural half) | lib, describe T4 | predicate hardcodes story.md's bare-row shape, ignores the `**Test layers.**`-labeled block | ✖ red ×2 (throw) |
| T5 | No `**Test layers.**`/no Integration row anywhere passes (grandfathering) | lib, describe T5 | `created_at_version` guard (F7 — unbuildable, `NaN >= NaN`); or failing on absence (mass-invalidates the corpus) | ✖ red ×2 (throw) |
| T6 | Section-index regression stays green | *(none authored — see below)* | adding a `## ` heading; editing `expected-headings.ts` | not applicable — measured directly instead |
| T7 | `developer.md`/`qa.md`/`SKILL.md` §C.3 name both `.integration`/`.red.integration` forms | docs, 3× `test()` | documenting only `SKILL.md`, leaving `developer.md`/`qa.md` silent (the §Reach failure class STORY-054-07 shipped, FLASHCARD 2026-08-28 `#doctrine #danger`) | ✖ red ×3 (zero hits today, F4) |
| T8 | Non-vacuity: unedited canonical `story.md`/`CR.md`/`Bug.md` each fail | lib, describe T8 | `section(N) has ≥N declared-item` (F6 — `story.md section(5)` already scores 6) | ✖ red ×3 (throw, reads real files) |
| T9 | `evalSection` frozen — content-hash pin, never exported | lib, describe T9 | modifying `:640-690`; exporting `evalSection` | ✔ green ×2 — regression guard, correctly green today, stays green throughout |
| T10 | Third naming form (`cr-026-integration.node.test.ts`, hyphen) accounted for | docs, 1× `test()` | documenting two forms, leaving the hyphen file unaccounted (F3) | ✖ red (file still hyphenated, undocumented) |
| T11 | `readiness-gates.md:9` "10 predicate shapes" → 11, with a `**11.**` entry | docs, 1× `test()` | leaving the count at 10 while shipping an 11th predicate | ✖ red (both sub-assertions fail) |

**Totals:** File A (lib) — 12 `it()` cases, 3 pass (T1, T9×2), 9 fail. File B (docs) — 8 `test()`
cases, 0 pass, 8 fail. **Combined: 20 cases, 3 pass, 17 fail.**

## Red-phase design

Mirrors `readiness-predicates-task-breakdown.red.node.test.ts` (STORY-054-06)'s documented
rationale, cited in its own header and in FLASHCARD 2026-08-27 `#test-harness #tpv #danger`: a
baseline whose "red" comes from one shared guard in front of every call is a scenario-count
fiction, not real wiring. Nine of File A's twelve cases (T2, T3, T4b×2, T5×2, T8×3) call
`evaluate('test-layers-declared', doc)` **directly and unguarded** — no `existsSync`/skip sits in
front of any of them — so each dies at `parsePredicate:140` → `evaluate:165` → the test's own call
site, with a body/fixture that was genuinely constructed (and for T8, a real canonical-file
read+frontmatter-strip) before the throw. Verified by direct execution (see Baseline runs below):
identical stack shape across all nine, confirming the throw is reached from nine distinct call
sites, not short-circuited by a shared guard.

**T1 is deliberately not a T2-style behavioural pin — see "Plan claims corrected" below for why.**
It asserts the throw itself (`assert.throws`), which is unambiguous today and stays meaningful as
a standing "the shape truly does not exist yet" pin until the Developer's first commit — at which
point T1 necessarily goes red-for-a-different-reason (no throw) and must be deleted or repurposed
by whoever picks up the green-phase; I did not attempt to pre-write its post-implementation
replacement, since T1's own mutant column in the M4 table is `—` (none) and the plan does not ask
for one.

**T9 is a content-hash pin, not a line-range pin — the one place this file deviates from the
"genuine throw" design on purpose.** `evalSection` is at `readiness-predicates.ts:640-690` today,
confirmed by direct measurement (`grep -n '^function eval'`), matching N5/Cross-Cutting Rule 3
exactly. But CR-111's permitted move (F9) is a sibling union member + parsePredicate branch +
evaluate case, all of which land ABOVE line 640 — so a correct implementation shifts every
absolute line number inside and below `evalSection` without changing one character of it. A pin
keyed to `:640-690` would go red on a **correct** implementation for the wrong reason (line drift,
not a real edit) — the exact TPV-bait shape this sprint's flashcards warn about repeatedly. I
extract the function by TEXT (`function evalSection(` through the line before
`function applyCountOp(`) and pin its SHA256 (`7a5add95ead2e656401a142f9b2fc9dbb0a82d52e5cc55634964
3883ba3c0016`, computed from the exact current 2110-character extraction, verified independently
via a standalone `node -e` before writing the assertion). It is correctly green today (nothing has
changed yet) and is designed to stay green through a correct implementation and go red on an
incorrect one — same "expected green today, regression guard throughout" shape as
`readiness-predicates-task-breakdown.red.node.test.ts` Scenario 5.

**Fixture shapes are spec-grounded, not invented.** Every table row/block fixture in File A is
copied verbatim from CR-111's own §"Schema change — verbatim" (the `**Test layers.**` sentence,
the three-row table shape, the `story.md` §4.1 embedding with no separate label). Before writing
assertions I built a throwaway reference implementation (never committed — deleted after use) and
ran it against every T2/T3/T5/T4b/T8 fixture to confirm the fixtures are parseable and produce the
INTENDED pass/fail outcome under a reasonable design, not just under one specific implementation
guess — this is the same discipline that caught STORY-054-04's cwd/CLEARGATE_META_ROOT and
CR-108's spawn-cwd fixture-validity classes of defect (FLASHCARD 2026-08-30
`#test-harness #cross-repo #danger`, `#test-harness #fixtures`). Confirmed: T2 → pass; T3 → fail;
T5 → pass (absent); T4b (CR+Bug shaped) → fail; T8's placeholder row (`{N}`) → fail (non-numeric
count, non-vacuous under a sane implementation, not just under the vacuous one T8 exists to catch).

## T6: why no new test was authored

`gate-section-index-pinning.node.test.ts` is explicitly on the M4 plan's "Do NOT modify" list, and
N6 states CR-111 adds no `## ` heading for it to react to (`EXPECTED_HEADINGS` needs zero edits).
There is nothing for a new assertion in that file to guard that isn't already guarded, and opening
it "to add a check" is itself the tampering STORY-054-05's post-flight note forbids. Instead I ran
it directly, unmodified, as the T6 acceptance measurement:

```
$ npx tsx --test test/docs/gate-section-index-pinning.node.test.ts
ℹ tests 14
ℹ suites …
ℹ pass 14
ℹ fail 0
ℹ skipped 0
```

**T6 acceptance recipe for QA-Verify:** re-run this exact command after the Developer's commit;
expect the same three numbers, `14/14/0/0`, unchanged. See "Plan claims corrected" for why this is
14, not the M4 plan body's stated 18.

## Plan claims corrected under measurement

**1. T6's `18/18/0/0` is wrong; `14/14/0/0` is right — independently reconfirmed.** The dispatch
had already caught and corrected this (two independent TPV-adjacent passes, per the dispatch text)
before I started; I re-ran the file myself rather than trusting the correction secondhand (see
above) and got the identical `14/14/0/0`. The M4 plan body's "18" is the criteria-count string
printed inside S1a's/S6's test TITLES ("exactly 18 section(N) criteria…"), not a test count — same
homonym class FLASHCARD 2026-08-27 already recorded for this file's own `14` (test-case count vs
criteria count) before CR-108 even landed.

**2. CR-111 §4 items 1 and 5 read as contradictory until F8's mechanism is applied, and this is
worth flagging rather than silently resolving.** Item 1: "A story file with no Integration row
fails test-layers-declared." Item 5: "an item whose `created_at_version` predates this release is
not failed by the new criterion" — i.e., absence (of the row, in practice, since F7 kills the
version-guard route entirely) does NOT fail. Read literally, item 1 says "no row ⇒ fail" and item 5
says "no row (grandfathered) ⇒ pass" — the same input, two different verdicts. The M4 plan resolves
this for me: item 1's own second sentence — "Must fail against the **current tree** — the criterion
does not exist" — is a statement about TODAY's baseline (the predicate is unregistered, so any call
throws), not a claim about post-implementation semantics once the criterion exists. I designed T1
accordingly: it pins the THROW, not "no-row implies fail", and T5 owns the real "absence passes"
behavioural claim. I did not silently pick one reading and author around the other — this
paragraph is that disclosure. If a future reader wants item 1 to ALSO mean "a row that's present
but not yet filled in with real values fails" post-implementation, that claim is T8's job (non-
vacuity), not T1's, and T8 already covers it (verified against the placeholder-row fixture above).

**3. An additional hardcoded count exists that neither the M4 plan's T11 nor its QA kick-back list
names.** `readiness-predicates.ts:3`'s own docstring reads *"Supports exactly 11 closed-set
predicate shapes."* This is a DIFFERENT number from `readiness-gates.md:9`'s "10" (T11's target) —
consistently so, not a bug today: the TS docstring counts internal `ParsedPredicate` union KINDS
(11, because `marker-absence` is its own union member), while the doc's "10" counts USER-FACING
documented shapes (marker-absence is folded into shape #2, "body does not contain", per the
parser's own `// 2a.`/`// 2b.` comments). Once CR-111 adds `test-layers-declared` as a 12th union
kind, `readiness-predicates.ts:3` needs "11"→"12" in the SAME commit that bumps
`readiness-gates.md:9`'s "10"→"11" — a second site the plan's own census (which explicitly says
"census every hardcoded count," FLASHCARD 2026-08-27 `#test-harness #gate #danger`) did not catch.
I did not author a test for this: `readiness-predicates.ts` is the Developer's surface, this is a
non-executable comment with no gate behind it, and it falls outside the plan-approved T1-T11 set —
authoring a T12 unilaterally would be scope creep on a QA-Red dispatch that says "author all
eleven." Reporting it here so the Architect/orchestrator can fold it into the kick-back list or a
follow-on note, per their call.

## Baseline runs

**Targeted, File A**
(`npx tsx --test test/lib/readiness-predicates-test-layers-declared.red.node.test.ts`):
```
ℹ tests 12
ℹ suites 7
ℹ pass 3
ℹ fail 9
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```
All 9 failures: `Error: unsupported predicate shape: test-layers-declared` at `parsePredicate`
(`readiness-predicates.ts:140:9`) → `evaluate` (`:165:18`) → each test's own call site. T9's two
`it()`s and T1's one `it()` pass (3 total).

**Targeted, File B**
(`npx tsx --test test/docs/test-layers-declared-doctrine.red.node.test.ts`):
```
ℹ tests 8
ℹ suites 0
ℹ pass 0
ℹ fail 8
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```
Zero `skipped` confirms the `CLEARGATE_META_ROOT`-less default `REPO_ROOT` resolved correctly to
the main outer checkout (no wrong-root false-skip, FLASHCARD 2026-08-27
`#test-harness #gate #danger` — a `skip:!existsSync` guard reads a wrong root as SKIPPED, never
FAILED, so this file's acceptance is properly all three numbers, not just `fail 0`).

**Typecheck** (`npm run typecheck`): clean, no output, exit 0.

**`check:no-vitest`** / **`check:no-inline-id-regex`**: both clean.

**Full suite** (`npm test`) — attempted, partially completed, and the partial result is sufficient
evidence; full detail below rather than a bare number, because the run did not finish cleanly and
I want that visible rather than papered over.

I started the full suite in the background and polled it via `tail`/`wc -l` on the redirected log.
For several consecutive checks (roughly minutes 3 through 9 of the run) the line count did not
move at all while sitting on `test/hooks/token-ledger-regression.node.test.ts`, and `ps` showed
the subprocess at ~0.1% CPU — I read this as a hang (plausibly a network-dependent hook test
blocked by this sandbox's no-outbound-network constraint, the same class as the known
`sync.node.test.ts` failure) and killed it. **This diagnosis was wrong.** The log file was
block-buffered (stdout to a non-TTY file, not line-buffered), so `tail`/`wc -l` legitimately showed
zero growth for minutes while the runner was actively completing hundreds of tests underneath —
confirmed after the kill, when the buffer flushed and the log jumped from 2270 to 2889 lines in one
step, ending with `Interrupted while running: test/lib/readiness-predicates-prior-work-ambiguity.
node.test.ts`. Recorded as a flashcard below so the next agent doesn't repeat the same false-hang
kill.

**What the partial run proves, despite the interruption:** grepping every `✖` line in the ~2889
completed lines returns exactly 14 — the 3 known-inherited failures PLUS all 8 of File B's
failures, and nothing else:
```
STORY-025-05 Scenario 6: Mirror parity over inserted sections            (reporter-content drift)
N6b — EXPECTED RED, tracked by BUG-067                                    (stampFrontmatter)
Scenario: missing CLEARGATE_MCP_TOKEN — exits 2 … (10681ms, network timeout)  (sync.node.test.ts)
T4 × 3, T7 × 3, T10, T11                                                   (File B, all 8, exact match to the targeted run)
```
The interruption landed alphabetically at `readiness-predicates-prior-work-ambiguity.node.test.ts`
— before `readiness-predicates-test-layers-declared.red.node.test.ts` (File A) would have run, so
File A's contribution to this specific pass is zero, by alphabetical position, not by omission.
File A's 9 failures + 3 passes are independently and completely confirmed by the clean targeted
run above. I chose not to re-run the full 2500+ suite a second time from scratch given the turn
budget already spent recovering from the false-hang diagnosis; the composed evidence (File A
targeted + File B confirmed twice, once targeted and once inside the real full-suite context, with
zero unexpected interactions in either) is methodologically equivalent to one clean full run for
the purpose of this baseline.

**Full-suite delta, composed:** known baseline `3` (N6b, sync/MCP_TOKEN, reporter-content) + File A
`9` + File B `8` = **20**.

## TYPECHECK: pass
## SUITE (composed, see above): 3 inherited + 9 (File A) + 8 (File B) = 20 new-tree failures
## PREEXISTING_FAIL: unchanged — all 3 confirmed present with the identical test names/messages the dispatch described (N6b/BUG-067; sync.node.test.ts MCP_TOKEN network scenario, ~10.7s timeout; STORY-025-05 Scenario 6 reporter-content mirror drift)

## Untouched (do-not-touch list)

`git diff --stat` in `cleargate-cli/`: empty (two new untracked files only). Confirmed unmodified:
`readiness-predicates.ts` (incl. `evalSection` — pinned by T9's own hash, not just eyeballed),
`story.md`/`CR.md`/`Bug.md` (all 4 trees — outer + canonical, both repos have zero pending diff),
`readiness-gates.md` (both trees), `developer.md`, `qa.md`, `SKILL.md`, `expected-headings.ts`,
`gate-section-index-pinning.node.test.ts`. No live `.claude/**` path appears anywhere in either
repo's `git status` (N1 — the live tree is untracked and was never touched).

## Script Incidents

None. Every command was a plain Test-Stack command (`npm run typecheck`, `npx tsx --test <path>`,
`npm test`, `npm run check:no-vitest`, `npm run check:no-inline-id-regex`) or plain `git`/`grep`/
`node -e`. No `.cleargate/scripts/**` invocation was needed inside the cli repo (Cross-Cutting Rule
6 notes cli commits are ungated but does not require the wrapper for plain npm/git commands); no
wrapper bypass occurred.

## flashcards_flagged

- "2026-08-30 · #test-harness #cross-repo #danger · npm test's stdout is BLOCK-buffered when redirected to a file — tail/wc -l can show zero growth for 6+ min on a genuinely-progressing 2500-test run; check ps CPU%, don't kill on line-count alone."
- "2026-08-30 · #test-harness #gate #danger · readiness-predicates.ts:3's own docstring ('exactly N closed-set predicate shapes') is a hardcoded count separate from readiness-gates.md:9's — bump both when adding a predicate."

---

```
QA_RED: done
COMMIT: 6475274 (cleargate-cli, branch story/CR-111)
FILES:
  cleargate-cli/test/lib/readiness-predicates-test-layers-declared.red.node.test.ts
  cleargate-cli/test/docs/test-layers-declared-doctrine.red.node.test.ts
SCENARIOS: T1-T11, 20 it()/test() cases (12 lib + 8 docs) — 3 green (T1 throw-pin, T9×2 regression
  guard), 17 red (T2, T3, T4a×3, T4b×2, T5×2, T7×3, T8×3, T10, T11)
RED_REASON: File A's 9 reds all die at the identical evaluate('test-layers-declared', …) throw
  (parsePredicate:140), reached via 9 distinct, spec-grounded fixture bodies (incl. 3 real
  canonical-file reads for T8) — genuine wiring, not one shared guard. File B's 8 reds are text
  assertions against the real readiness-gates.md/developer.md/qa.md/SKILL.md content on disk,
  zero skipped (confirms correct cross-repo root resolution, not a false green from a wrong root).
SUITE: composed 3 inherited + 9 (File A) + 8 (File B) = 20 — see "Full suite" above for the
  partial-run methodology and why a from-scratch full run was not repeated
PREEXISTING_FAIL: unchanged — 3 confirmed present verbatim (N6b/BUG-067, sync MCP_TOKEN network,
  STORY-025-05 Scenario 6 reporter-content drift)
TYPECHECK: pass (npm run typecheck, clean, exit 0)
UNTOUCHED: confirmed — git diff --stat empty in cleargate-cli; readiness-predicates.ts (evalSection
  hash-pinned), all three templates, readiness-gates.md, developer.md, qa.md, SKILL.md,
  expected-headings.ts, gate-section-index-pinning.node.test.ts all unmodified in both trees
T6: not a new test — gate-section-index-pinning.node.test.ts is on the "Do NOT modify" list and
  N6 adds no heading for it to react to; measured directly instead, 14/14/0/0 (corrects the M4
  plan body's stale 18/18/0/0, independently reconfirming the dispatch's own correction)
PLAN_CORRECTIONS: (1) T6 18/18/0/0 -> 14/14/0/0, reconfirmed independently; (2) CR-111 §4 items 1
  and 5 are literally contradictory on "no row" — resolved via F8, T1 redesigned as a throw-pin
  rather than a "no-row fails" behavioural claim, disclosed rather than silently picked; (3) a
  SECOND hardcoded predicate-shape count exists at readiness-predicates.ts:3 ("exactly 11") that
  neither T11 nor the QA kick-back list names — reported, not auto-tested (out of the approved
  T1-T11 scope, and readiness-predicates.ts is the Developer's surface)
SURPRISES: mid-run false-hang diagnosis on the full-suite background job (block-buffered stdout
  read as a stall) — killed a legitimately-progressing run at ~9 min; recovered via the partial
  log's own evidence rather than a second full run. Flashcarded.
flashcards_flagged:
  - "2026-08-30 · #test-harness #cross-repo #danger · npm test's stdout is BLOCK-buffered when redirected to a file — tail/wc -l can show zero growth for 6+ min on a genuinely-progressing 2500-test run; check ps CPU%, don't kill on line-count alone."
  - "2026-08-30 · #test-harness #gate #danger · readiness-predicates.ts:3's own docstring ('exactly N closed-set predicate shapes') is a hardcoded count separate from readiness-gates.md:9's — bump both when adding a predicate."
```

---

# ROUND 2 — post-TPV amendments (CR-111-tpv.md, `TPV: PASS WITH AMENDMENTS`)

role: qa

`arch_bounces` NOT incremented — TPV's verdict is a coverage ruling, wiring was sound. All eight
amendments (A1-A8) applied to the same two files; no new file added, no scenario removed.

## Amendments applied

| # | Amendment | File | Change |
|---|---|---|---|
| A1 (BLOCKING) | Replace T1's unsatisfiable throw-pin | lib | T1 -> T1′: a `**Test layers.**` declaration (CR-shaped) whose table omits the Integration row must FAIL, detail must name it. Throw assertion deleted (Architect-granted exception, applied pre-Developer). |
| A2 (BLOCKING) | Pin template CONTENT + T8 detail | lib | New `T8b` describe (3 its): canonical `story.md`/`CR.md`/`Bug.md` must literally carry the Integration row / `**Test layers.**` block. T8's existing 3 its gain a `result.detail` match on `/(integration|test.?layer)/i`. |
| A3 (BLOCKING) | Pin the grandfathering trigger | lib | New 3rd `it()` in T5: the exact pre-CR-111 §4.1 shape (Unit + E2E + Performance, no Integration row, no label) must PASS. |
| A4 (BLOCKING) | Fix T9's end anchor | lib | `extractEvalSection` rewritten: anchors on evalSection's own frozen signature text, then walks matched braces to ITS OWN closing brace (not to the next function's marker). New `FROZEN_SHA256` computed against the corrected extraction (`9d9b5f5d…38c1fc`, verified byte-identical under an inserted sibling — see Direction B below). |
| A5 | Widen T11 | docs | New `test()`: `readiness-predicates.ts:3`'s docstring count must read "Supports exactly 12 closed-set predicate shapes." — second, independent site from `readiness-gates.md:9`. |
| A6 | T4 parses YAML, doesn't grep | docs | New `test()`: canonical `readiness-gates.md`'s fenced yaml blocks all parse via `js-yaml` with zero throws, count stays 11 (registered on existing blocks, no new block). Regression-guard shape (green today, stays green). |
| A7a | SKILL.md's own File-naming sentence | docs | New `test()`: the exact `File-naming:` line inside §C.3 must itself carry `*.red.integration.node.test.ts`, not just "somewhere in the section." |
| A7b | T10 not dischargeable by deletion | docs | Removed the `if (!stillHyphenated) return;` early-out — doc mention of the hyphen form/pattern is now required unconditionally. |
| A7c | T7 requires real prose, not a comment dump | docs | New `assertLiteralInProseLine` helper: the literal must sit on a line that is not a bare `<!-- … -->` HTML comment. Applied to the developer.md/qa.md T7 tests. |
| A8 | Declare + exercise the type-agnostic contract | lib | Header comment states the `doc.body`-only contract explicitly; new describe/it: identical body, three different `fm` shapes (story-typed/cr-typed/untyped) must produce an identical `{pass, detail}`. |

## New scenario counts (targeted, out of tree in a synthetic mutant harness AND in the real story/CR-111 checkout — identical)

| File | Before (Round 1) | After (Round 2) |
|---|---|---|
| `readiness-predicates-test-layers-declared.red.node.test.ts` (lib) | 12t 3p 9f 0s | **17t 2p 15f 0s** |
| `test-layers-declared-doctrine.red.node.test.ts` (docs) | 8t 0p 8f 0s | **11t 1p 10f 0s** |
| **Combined new-tree** | 20t 3p 17f | **28t 3p 25f** |

Pass count drops by net 0 in absolute pass-count-of-3 terms but its COMPOSITION changed: T1's throw-pin
(a pass, but scaffolding) is replaced by T1′ (a genuine red today), and `A6`'s new YAML-parse
regression guard (a genuine green today, stays green) takes its place — T9's two subtests are
unaffected, still green. `pass = T9×2 + A6×1 = 3`, matching the total.

Verified by direct execution, twice: once in `story/CR-111` itself (`npx tsx --test <file>`, both
files individually — 17/2/15 and 11/1/10, exact), and once inside a from-scratch, non-git mutant
harness under scratchpad (see "Rebuilt mutants" below) where a REFERENCE implementation (the
predicate + all seven doc/template edits CR-111 specifies) scores a clean **28/28** against these
same two files — proving the Round-2 baseline is fully satisfiable by a correct implementation,
not accidentally over-constrained.

## Full-suite, one clean run from `story/CR-111` (cli), redirected to a log, N10-compliant

```
$ npm test          # nohup > /tmp/qa_round2_fullsuite.log 2>&1 &, waited on PID exit, no tail/head
ℹ tests 2676
ℹ pass 2647
ℹ fail 28
ℹ cancelled 0
ℹ skipped 1
ℹ duration_ms 431275 (~7m11s)
```

`28 = 3 inherited (unchanged, verbatim: reporter-content live/canonical drift — CR-110, clears at
Gate-4; N6b/BUG-067 stampFrontmatter; sync.node.test.ts MCP_TOKEN network timeout) + 25 new-tree
(15 lib + 10 docs, itemised above).` Cli repo confirmed clean before and after
(`git status --porcelain` → 0 rows both times, cli @ `6475274` before this round's edits).

**Adjacent regression files, run by hand per TPV's non-amendment note #2 (both unchanged, both
outside this story's own red set):**
- `test/docs/gate-section-index-pinning.node.test.ts` → `14/14/0/0`, unchanged (I edited no
  template, no gates.md, no `## ` heading in the real tree — only the two red-test files).
- `test/scripts/template-stubs.integration.node.test.ts` → `50/50/0`, unchanged.

`npm run typecheck` — clean, exit 0. `check:no-vitest` / `check:no-inline-id-regex` — both clean.

## Kill table — every named mutant, rebuilt and measured myself (not taken on TPV's word)

Built a synthetic, non-git mutant harness under scratchpad (`cli/` + a sibling `cleargate-planning/`,
matching the REAL repo's on-disk layout so the test files' own `CLI_ROOT`/`META_ROOT` path
derivation resolves correctly with **zero code changes to the test files**). One REFERENCE build
(the predicate exactly as specified + all seven doc/template edits), then one mutant per named
axis, each a minimal deviation from REFERENCE on exactly the axis TPV named. Reference target for
these 28-scenario files: **28/28** (full green — no T1-style unsatisfiable scaffold survives
Round 2).

| Mutant | Score (of 28) | Failing scenario(s) | Kills via |
|---|---|---|---|
| **REFERENCE** (correct) | **28/28** | — | baseline |
| **M3d** — REF unchanged, sibling fn inserted BETWEEN `evalSection` and `applyCountOp` | **28/28 — no longer bounced** | — | **A4 confirmed (Direction B, below)** |
| M5 (null predicate, templates edited as REF does) | 24/28 | T1′; T8×3 (detail) | A1 + A2c |
| **M5-notemplates** (null predicate, templates left UNEDITED — TPV's exact original shape) | 21/28 | T1′; T8b×3 (content); T8×3 (detail) | **A1 + A2a/b + A2c together** |
| M6 (validates only rows it finds, never requires all three) | 27/28 | T1′ only | **A1** |
| M7 (trigger widened to any layer row) | 27/28 | T5's A3 scenario only | **A3** |
| M12 (readiness-predicates.ts:3 left stale at "11"; readiness-gates.md correctly bumped to "11") | 27/28 | T11's A5 sub-test only | **A5** |
| M13 (3 canonical gate blocks hand-appended into invalid YAML) | 27/28 | T4's A6 sub-test only | **A6** |
| M14 (hyphen file deleted, docs left silent about it) | 27/28 | T10 only | **A7b** |
| M15 (developer.md/qa.md/SKILL.md replaced by one HTML-comment token dump each) | 24/28 | T7×3 (dev.md/qa.md/SKILL-section) + T7's A7a | **A7a + A7c together** |
| **REFC** — TPV's REF-C shape: branches on `doc.fm.work_item_type`, correct on every OTHER fixture | 27/28 | A8's fm-invariance scenario only | **A8** |

Every mutant is killed by EXACTLY the assertion(s) its amendment was written for — no collateral
kills, no unexplained survivors. `M5-notemplates` in particular reproduces TPV's own construction
verbatim (`apply_common.sh m5 no-templates`) and is caught by the FULL combination A1+A2, matching
Finding 1 exactly (7 of 28 fail, vs. TPV's reported 1 of 20 fail on the Round-1 baseline).

## Direction B — the M3d shape, confirmed un-bounced

Built the REFERENCE implementation, then — as a SEPARATE, additional edit — inserted a second
(stub) function directly between `evalSection` and `applyCountOp`, exactly the placement TPV's
M3d exercises (a Developer choice a real implementation might reasonably make, keeping
section-related evaluators adjacent). Confirmed independently, twice:

1. **Standalone extraction check** (before writing any assertion): ran the OLD and NEW
   `extractEvalSection` against the source both with and without the injected sibling.
   - OLD (text-marker-to-next-function): identical hash without the insertion, **different** hash
     with it — reproduces the false "evalSection changed" TPV measured.
   - NEW (signature-anchor + matched-brace-to-own-close): **identical hash in both cases**
     (`9d9b5f5d…38c1fc`) — byte-for-byte proof the fix is blind to the insertion.
2. **Full targeted run of both red files against the M3d tree**: **28/28**, same as REFERENCE —
   T9 stays green, nothing else regresses. The correct implementation is no longer bounced.

## flashcards_flagged

- "2026-08-30 · #test-harness #tpv #recipe · Rebuild a synthetic REFERENCE + one-mutant-per-axis harness with the test files' OWN CLI_ROOT/META_ROOT layout unmodified — proves amendments in isolation, no collateral kills hidden."
- "2026-08-30 · #test-harness #danger · A brace-counting pin anchored on a function's OWN frozen signature (not the next function's marker) survives any insertion after it — verified: identical hash with/without an injected sibling function."

---

```
QA-RED ROUND 2: WRITTEN
RED_TESTS:
  cleargate-cli/test/lib/readiness-predicates-test-layers-declared.red.node.test.ts (12t/3p/9f -> 17t/2p/15f)
  cleargate-cli/test/docs/test-layers-declared-doctrine.red.node.test.ts (8t/0p/8f -> 11t/1p/10f)
BASELINE_FAIL: 28  (25 new-tree: 15 lib + 10 docs; 3 inherited/unrelated — N6b BUG-067, sync.node.test.ts
  MCP_TOKEN network, reporter-content live/canonical drift, all unchanged verbatim)
AMENDMENTS_APPLIED: A1 A2 A3 A4 A5 A6 A7(a/b/c) A8 — all eight, same commit, no new file
KILL_TABLE: REFERENCE 28/28; M3d 28/28 (un-bounced, Direction B confirmed); M5 24/28; M5-notemplates
  21/28; M6 27/28; M7 27/28; M12 27/28; M13 27/28; M14 27/28; M15 24/28; REFC 27/28 — every mutant
  killed by exactly its motivating assertion(s), zero collateral, zero unexplained survivors
TYPECHECK: pass (npm run typecheck, clean, exit 0)
SUITE (full, one clean run, redirected + waited on PID, no tail/head): tests 2676, pass 2647,
  fail 28, skipped 1, 431s
ADJACENT REGRESSION FILES (unchanged): gate-section-index-pinning.node.test.ts 14/14/0/0;
  template-stubs.integration.node.test.ts 50/50/0
arch_bounces: NOT incremented (TPV verdict: coverage ruling, wiring sound)
flashcards_flagged:
  - "2026-08-30 · #test-harness #tpv #recipe · Rebuild a synthetic REFERENCE + one-mutant-per-axis harness with the test files' OWN CLI_ROOT/META_ROOT layout unmodified — proves amendments in isolation, no collateral kills hidden."
  - "2026-08-30 · #test-harness #danger · A brace-counting pin anchored on a function's OWN frozen signature (not the next function's marker) survives any insertion after it — verified: identical hash with/without an injected sibling function."
```

---

# ROUND 3 — A9: harness repair (META_ROOT env override), one file, one change

role: qa

Not a bounce. Coordinator framing confirmed and applied literally: `arch_bounces` NOT incremented
— this is a QA-Red harness defect (T8b pointed at a tree the deliverable can never land in), not a
rejection of Round 2's amendments, which stand unchanged.

## The defect, confirmed before fixing

`test/lib/readiness-predicates-test-layers-declared.red.node.test.ts`'s `META_ROOT` was
`path.resolve(CLI_ROOT, '..')` with no env branch — always the outer repo's MAIN checkout
(`sprint/S-39`), never the worktree (`story/CR-111`) where the Developer will actually land the
three template edits. `T8b` (A2's template-CONTENT pin, added this round-2) therefore had exactly
one truth value forever, regardless of implementation: FAIL. My own header comment claiming this
file "follows the same CLI_ROOT/META_ROOT/CANON pattern" as the doctrine file was false — the
doctrine file's `REPO_ROOT` already carried the `CLEARGATE_META_ROOT` override (`:81-83`, since
Round 1); this file never did. I did not catch it in Round 1 or Round 2 because every verification
I ran (targeted, out-of-tree mutant harness) pointed `CANON`/`CANON_ROOT` at whichever tree I built
by hand for that run — none of my Round-2 mutant trees exercised "the real story/CR-111 worktree,
selected by env var, the way DevOps/QA-Verify will actually run this file post-Developer." That gap
is exactly what this dispatch closes.

## A9 — applied

`test/lib/readiness-predicates-test-layers-declared.red.node.test.ts`, `META_ROOT` only:

```ts
const META_ROOT = process.env.CLEARGATE_META_ROOT
  ? path.resolve(process.env.CLEARGATE_META_ROOT)
  : path.resolve(CLI_ROOT, '..');
```

Byte-identical in shape to the doctrine file's `REPO_ROOT` (`:81-83`). No assertion text, no
scenario, no count changed — confirmed by diff (the only functional lines touched are the 4-line
`META_ROOT` declaration; the rest of the diff is header-comment prose explaining the change).

## Requirement 3 — swept both files for other hardcoded-root sites

`test-layers-declared-doctrine.red.node.test.ts`: already fully covered. All four of its path
constants (`DEVELOPER_MD`, `QA_MD`, `SKILL_MD`, `READINESS_GATES_MD`) derive from `CANON_ROOT`,
which derives from the already-env-aware `REPO_ROOT`. `READINESS_PREDICATES_SRC` derives from
`CLI_ROOT` (untouched, correct — the cli checkout is on `story/CR-111`).

`readiness-predicates-test-layers-declared.red.node.test.ts`: swept for every `path.resolve`/
`path.join` site (`grep -n`). Exactly one hardcoded-root site existed — `META_ROOT`, now fixed.
`READINESS_PREDICATES_SRC` (line 130, unchanged) derives from `CLI_ROOT`, same correct case as the
doctrine file's — per constraint 4, not touched.

**No third site found.** Both files now derive every canonical-tree path through an
env-overridable root.

## Verification

**1. Unset run reproduces Round 2 exactly** (confirms the change is strictly additive):

```
$ npx tsx --test test/lib/readiness-predicates-test-layers-declared.red.node.test.ts
ℹ tests 17
ℹ pass 2
ℹ fail 15
ℹ skipped 0
```
Identical to Round 2's banked number. `test-layers-declared-doctrine.red.node.test.ts` (untouched
this round) re-run for completeness: `11t/1p/10f/0s`, identical to Round 2.

**2. `CLEARGATE_META_ROOT` pointed at a scratch copy of `cleargate-planning/` with the three
template edits applied by hand** (via the same `edit_story_md`/`edit_cr_md`/`edit_bug_md` helpers
built and verified in Round 2's mutant harness — not re-derived, reused):

```
$ CLEARGATE_META_ROOT=<scratch>/r3-canon npx tsx --test test/lib/readiness-predicates-test-layers-declared.red.node.test.ts
ℹ tests 17
ℹ pass 5
ℹ fail 12
```
`pass 5 = T9×2 (unaffected, reads CLI_ROOT/src) + T8b×3 (flipped GREEN — the templates now
literally carry the row/label at the selected root)`. `T8` stays red — its 3 `it()`s call
`evaluate('test-layers-declared', …)` against the REAL `cleargate-cli/src/lib/readiness-predicates.ts`
(unaffected by `CLEARGATE_META_ROOT`, and the predicate is not yet implemented there on this
branch), so it throws/fails exactly as it did before. **Confirmed: T8b flips to green while T8
stays red under a tree that carries the template edits but not yet the predicate** — the two
scenarios are independently wired to their own root/source, exactly as constraint 1 requires, and
T8b is now reachable at all, which is the entire point of A9.

## flashcards_flagged

- "2026-08-30 · #test-harness #cross-repo #danger · A red-test file whose header CLAIMS to follow a sibling file's CLEARGATE_META_ROOT idiom must be diffed against it, not trusted — one file had the override, the other didn't, and the gap made an A2 template-content pin permanently unsatisfiable (no escape hatch, worse than a false-red)."

---

```
QA-RED ROUND 3: WRITTEN
RED_TESTS:
  cleargate-cli/test/lib/readiness-predicates-test-layers-declared.red.node.test.ts (META_ROOT only; 17t/2p/15f unset, unchanged)
  cleargate-cli/test/docs/test-layers-declared-doctrine.red.node.test.ts (untouched; 11t/1p/10f, unchanged)
BASELINE_FAIL: 28 (unchanged — unset targeted numbers identical to Round 2; full suite NOT re-run per dispatch instruction)
AMENDMENT_APPLIED: A9 — META_ROOT now honours CLEARGATE_META_ROOT, byte-identical in shape to the doctrine file's REPO_ROOT. No assertion/scenario/count change.
THIRD_SITE_SWEEP: none found — doctrine file already fully env-aware; lib file had exactly the one site, now fixed.
VERIFIED: (a) unset run == Round 2 exactly (17t/2p/15f/0s); (b) CLEARGATE_META_ROOT pointed at a hand-edited scratch cleargate-planning/ -> T8b×3 flip GREEN (pass 5 = T9x2+T8bx3), T8x3 stay red (predicate not yet implemented at CLI_ROOT) — the pair is independently wired and T8b is now reachable at all.
TYPECHECK: pass (npm run typecheck, clean, exit 0)
FULL SUITE: NOT re-run (dispatch instruction — targeted runs only)
arch_bounces: NOT incremented — harness repair, not a rejection of Round 2's amendments
flashcards_flagged:
  - "2026-08-30 · #test-harness #cross-repo #danger · A red-test file whose header CLAIMS to follow a sibling file's CLEARGATE_META_ROOT idiom must be diffed against it, not trusted — one file had the override, the other didn't, and the gap made an A2 template-content pin permanently unsatisfiable (no escape hatch, worse than a false-red)."
```
