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
