# STORY-054-06 — QA-Red

role: qa

Mode: RED — write failing tests against §4 acceptance, no implementation Read access.

## Execution route

Worked in `cleargate-cli/` (own git repo, gitignored in the outer meta-repo, main checkout — no worktree, per BUG-046 / M2 plan's execution-route ruling). Both checkouts on `story/STORY-054-06`: outer cut from `sprint/S-39`, cli cut from `main` @ `507f67c`. Read the outer meta-repo (`cleargate-planning/.cleargate/templates/story.md`) directly for Scenario 7's canonical pin, per the same `CLI_ROOT`/`META_ROOT`/`CANON` pattern `gate-section-index-pinning.node.test.ts` established in STORY-054-05.

Preflight: read `sprint-context.md` in full (both halves, incl. the 351-line Mid-Sprint-Amendments tail), the story's §3.1 AMENDMENT block, the M2 plan's full STORY-054-06 blueprint (N1–N7, Schema changes, Test shape, QA kick-back list), `readiness-predicates.ts` source in full, and grepped FLASHCARD.md for `#test-harness`/`#gate`/`#id-parsing`. No implementation file was Read for reference beyond `readiness-predicates.ts` itself (the file the predicate will land in — reading it is what confirms the throw line and the exact shapes of the three existing absence-tolerant named predicates the M2 plan tells me to model on; §4.1's own Gherkin is the acceptance source, and I did not read any in-flight implementation, because none exists on this branch).

## Deliverable

`cleargate-cli/test/lib/readiness-predicates-task-breakdown.red.node.test.ts` — committed at `c9d44ba` on `story/STORY-054-06` (cli repo), subject `test(EPIC-054): STORY-054-06 red — task breakdown predicate`.

`git status --short` before staging: only the new file untracked (plus the pre-existing, unrelated `cleargate-0.23.1.tgz`). `git diff --stat`: empty — zero existing files touched, confirming the do-not-touch list (`expected-headings.ts`, `gate-section-index-pinning.node.test.ts`, `KNOWN_UNPINNABLE`, the two block-census lines, S4, S7, `evalSection`) is untouched.

## Scenario table (7 scenarios, 8 `it()` cases)

| # | §2.1 Gherkin row | Test | Result today |
|---|---|---|---|
| 1 | An L3 story carries its sequence | body w/ `## Task Breakdown` + one `- [ ]` row → `pass: true`, detail `/1 task row/` | ✖ red (throw) |
| 2 | An L1 story omits the section | no `## Task Breakdown` anywhere → `pass: true`, detail `/absent/` | ✖ red (throw) |
| 3a | A legacy item passes on absence | synthetic pre-EPIC-051 shape (4 `## ` headings, no trailing sections) → `pass: true`, `/absent/` | ✖ red (throw) |
| 3b | (same scenario, N5 residue pin) | same body, `evaluate('section(5) has ≥1 listed-item', …)` → `pass: false`, `/section 5 not found/` | ✔ green (existing `section` predicate, unrelated to the new one) |
| 4 | The reserved requirement reference is accepted | row `- [ ] wire the predicate -> R5` → `pass: true`; detail does **not** mention `R5` | ✖ red (throw) |
| 5 | Error — a shifted index is not updated | reuse, not re-implemented: pins that `gate-section-index-pinning.node.test.ts` (STORY-054-05's S1b) still exists at the exact path `readiness-gates.md:36` cites | ✔ green (`fs.existsSync` — no `evaluate()` call at all) |
| 6 | (M2 plan addition) present-but-row-free teeth | verbatim shipped guidance block (M2 §Schema (1)), zero `- ` rows → `pass: false`, `/no .* task rows/` | ✖ red (throw) |
| 7 | (M2 plan addition) non-vacuity pin | canonical `cleargate-planning/.cleargate/templates/story.md`, `<instructions>`+frontmatter stripped the way `templateBodyOf` does → `pass: false` | ✖ red (throw) |

## Red-phase design

Unlike STORY-054-05 (whose red-ness had to be relocated into mutation scenarios because the live/canonical tree was already correct), this predicate does not exist in `readiness-predicates.ts` at all on this branch — `parsePredicate` falls through every closed-set branch and throws `unsupported predicate shape: task-breakdown-complete` at line 134, before `evaluate`'s switch is ever reached. Six of the eight `it()` cases call `evaluate('task-breakdown-complete', doc)` directly and unguarded — no `existsSync`/skip guard sits in front of any of them — so the throw is a genuine assertion-line failure, not a fixture-guard short-circuit (FLASHCARD 2026-08-27 `#test-harness #tpv #danger`, cited in the M2 plan). Verified in the real run (see below): all six fail with the identical stack, throwing from `parsePredicate:134` → `evaluate:159` → the test's own `evaluate(...)` call line.

Two `it()` cases are deliberately **not** red, by design, and this is stated rather than hidden:

- **Scenario 3's second assertion** exercises the *existing*, already-implemented `section(N)` predicate kind (`section(5) has ≥1 listed-item`) against the same legacy body, to pin the N5-accepted residue (a pre-EPIC-051 item hard-failing `section 5 not found`) as *not this story's regression*. This predicate shape has nothing to do with `task-breakdown-complete` and evaluates correctly today.
- **Scenario 5** cannot be a red assertion against this predicate at all — the M2 plan's own §Reuse table rules out writing a second index checker (BUG-041 shape: a divergent parser guarding a parser defect). `gate-section-index-pinning.node.test.ts` S1b already *is* this scenario and re-runs every time the default suite runs; my file only pins that the promoted path `readiness-gates.md:36` cites still exists on disk, so the reference cannot silently rot. This assertion is green today and stays green throughout — it is a coverage/reuse pointer, not a predicate test.

**Scenario 7 mechanics, worth stating explicitly:** the canonical `story.md` on this branch does **not** yet carry a `## Task Breakdown` section (confirmed by reading the file — no gated heading insertion has landed). The test still throws at the `evaluate()` call, before the missing-section question is ever reached, so the read + strip helper (`templateBodyOf`, replicated locally from the pinning test file's un-exported function of the same name, same treatment Cross-Cutting Rule 3 already gives `evalSection`) genuinely executes against the real file — proving the wiring, not faking it. Once the Developer's Commit B inserts the guidance-only, zero-row section into canonical `story.md` in the same working-tree turn Commit A's predicate code lands (per the M2 plan's Commit-plan note: "run typecheck + full suite once, with both halves present in the working tree"), this assertion will read the real shipped section and correctly return `pass: false` — the non-vacuity pin (Pin-A shape, M1 §A3 precedent).

## Baseline runs

**Targeted** (`npm --prefix cleargate-cli exec -- tsx --test cleargate-cli/test/lib/readiness-predicates-task-breakdown.red.node.test.ts`):
```
ℹ tests 8
ℹ suites 7
ℹ pass 2
ℹ fail 6
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```
All 6 failures: `Error: unsupported predicate shape: task-breakdown-complete` at `parsePredicate` (`readiness-predicates.ts:134:9`) → `evaluate` (`:159:18`) → the test's own call site. Identical stack shape across all six — confirming the design's claim that every helper (body construction, and for Scenario 7 the real canonical-file read + strip) executes before the throw, not stopped by an earlier guard.

**Typecheck** (`npm --prefix cleargate-cli run typecheck`): clean, no output, exit 0.

**Full suite** (`npm --prefix cleargate-cli test`, run twice — see note below):
```
ℹ tests 2524
ℹ suites 885
ℹ pass 2516
ℹ fail 7
ℹ cancelled 0
ℹ skipped 1
ℹ todo 0
ℹ duration_ms 389635.556625
```
Exact delta vs. the dispatch's stated baseline `2516/2514/1/1`: **+8 tests / +2 pass / +6 fail / +0 skip** — precisely my file's 8 `it()` cases (2 green: 3b + 5; 6 red: 1, 2, 3a, 4, 6, 7). The 7 failures in this run are exactly: the 1 pre-existing `test/commands/sync.node.test.ts` network case, plus my 6 (confirmed by grepping every `test at …:1:` line in the full output — no other file fails).

**Note on the first run.** My first full-suite pass (before this clean one) additionally showed `test/scaffold/skill-md-conditional-architect.red.node.test.ts` failing on "payload SKILL.md is byte-identical to canonical (after prebuild)" — a payload/canonical drift on `SKILL.md` unrelated to Task Breakdown (the diff was STORY-054-03's spike-doctrine §2.1 content, missing from the gitignored npm payload). I did not run `prebuild`/`copy-planning-payload.mjs` myself — that is explicitly Gate-4/close scope (Cross-Cutting Rule 2) and outside a QA-Red dispatch. Between the two runs the payload file's mtime moved to the run window and it became byte-identical to canonical (`diff` now silent), most likely the concurrent session (PID 38044, per the dispatch's concurrency constraint) running its own `npm run prebuild` in the same `cleargate-cli` checkout, independent of my work. The second, clean full-suite run (numbers above) shows no trace of it. Reported for the record, not chased — it touches no file this story owns and self-resolved before I re-ran.

## TYPECHECK: pass
## SUITE (delta): 2524/2516/7/1 — vs baseline 2516/2514/1/1: +8 tests / +2 pass / +6 fail / +0 skip, all attributable to this file
## PREEXISTING_FAIL: unchanged — `test/commands/sync.node.test.ts` (same test id, same network error), present in both runs

## Untouched (do-not-touch list)

`git diff --stat` on the cli repo: empty. Confirmed unmodified: `expected-headings.ts`, `gate-section-index-pinning.node.test.ts`, `KNOWN_UNPINNABLE`, the two block-census lines (`gate-unit.node.test.ts:748` and `readiness-predicates.node.test.ts:714`, both independently re-read and still `11`), S4, S7, and `readiness-predicates.ts`'s `evalSection` (`:632-657`, untouched — no code written this dispatch at all, only a new test file).

## Script Incidents

None. Every command run was a plain sanctioned Test-Stack command (`npm --prefix cleargate-cli run typecheck`, `npm --prefix cleargate-cli exec -- tsx --test <path>`, `npm --prefix cleargate-cli test`) or plain `git`/`diff`/`grep`. No `.cleargate/scripts/**` invocation was needed, so `run_script.sh` does not apply.

## flashcards_flagged

None new. The load-bearing cards for this dispatch (`#test-harness #tpv #danger` on throw-before-guard red design, `#gate #cross-repo #danger` on ungated cli commits, `#gate #npm #workspace` on `npm --prefix`) were all already in FLASHCARD.md and are cited inline in the M2 plan; nothing surprised during authoring that isn't already recorded there.

---

```
QA_RED: done
COMMIT: c9d44ba861b7af685b2fe4277ddcce92f0a9bf62
FILE: cleargate-cli/test/lib/readiness-predicates-task-breakdown.red.node.test.ts
SCENARIOS: 7 (8 it() cases) — 1 red (throw), 2 red (throw), 3a red (throw) + 3b green (existing section predicate, N5 residue pin), 4 red (throw), 5 green (reuse pointer, no evaluate() call — S1b in gate-section-index-pinning.node.test.ts already IS this scenario), 6 red (throw), 7 red (throw, canonical file genuinely read+stripped first)
RED_REASON: all six evaluate('task-breakdown-complete', …) calls die at the SAME early throw (parsePredicate:134, "unsupported predicate shape: task-breakdown-complete") — but each is reached via a DISTINCT body/scenario construction (including, for Scenario 7, a real disk read + instructions/frontmatter strip of canonical story.md), so the baseline certifies real per-scenario wiring, not one shared guard. Two cases (3b, 5) are not throw-based by design — see Red-phase design above.
SUITE: 2524/2516/7/1 — delta vs 2516/2514/1/1: +8 total / +2 pass / +6 fail / +0 skip
PREEXISTING_FAIL: unchanged — test/commands/sync.node.test.ts, same test + same network error in both runs
TYPECHECK: pass (npm --prefix cleargate-cli run typecheck, clean, exit 0)
UNTOUCHED: confirmed — git diff --stat empty in cleargate-cli; expected-headings.ts, gate-section-index-pinning.node.test.ts, KNOWN_UNPINNABLE, both block-census lines (still 11), S4, S7, evalSection all unmodified
HEADING_LITERAL: "## Task Breakdown" — asserted as the exact firstLine match target in every body I constructed (Scenarios 1, 4, 6); never "## 9. Task Breakdown" anywhere in this file
SURPRISES: one transient, story-unrelated failure on the FIRST full-suite pass — test/scaffold/skill-md-conditional-architect.red.node.test.ts (SKILL.md payload≠canonical parity, content from STORY-054-03's spike doctrine, not Task Breakdown). Self-resolved before the second run (payload mtime moved into the run window, now byte-identical to canonical) — most likely the concurrent session's own npm run prebuild in the same cleargate-cli checkout, not caused by anything in this dispatch. I did not run prebuild myself (Cross-Cutting Rule 2, Gate-4/close scope). Second clean run: 2524/2516/7/1, no trace of it.
flashcards_flagged: []
```

---

## Round 2 — TPV rulings

role: qa

Mode: RED, round 2. Dispatch: strengthen the STORY-054-06 red baseline per TPV's 8-mutant
battery (`STORY-054-06-tpv.md`, `TPV: rulings-required`). Round-1 file stays as-is structurally
(5/5 wiring checks passed, not sent back for rework) — this round applies exactly four of TPV's
ten rulings, the four scoped to QA: Rulings 1, 2, 4, 5. Ruling 3 is implementation-facing (not
mine, listed only so my assertions match its shape); Rulings 6-10 bind the Developer / DevOps at
commit and merge time.

### What TPV found

Out-of-tree, an 8-mutant battery run against the round-1 file's 8 assertions (P2 state: predicate
implemented per M2 §Schema(4), guidance-only section shipped in canonical `story.md`) killed 6 of
8 mutants and found 2 survivors:

- **M3** (`listed-item` counter `/^\s*- /gm` instead of checkbox rows `- [ ]`/`- [x]`) — 0 fail
  against all 8 round-1 assertions. This is the exact implementation M2 §N2 forbids on BUG-054
  grounds.
- **M8/M6** (literal `firstLine.trim() === '## Task Breakdown'` compare, or an over-broad
  `startsWith('Task')` check, neither calling `headingTitleOf`) — 0 fail against all 8 round-1
  assertions. Contradicts the "numeric prefixes tolerated" promise in the Predicate Vocabulary
  (registry edit 3) and the `evalTaskBreakdownComplete` docstring.

### What I changed — exactly four edits, nothing else

1. **New `it()` — TPV Ruling 1 pin (kills M3).** Body: `## Task Breakdown` section containing one
   plain `- a plain bullet, no checkbox` row and zero `- [ ]`/`- [x]` rows. Asserts
   `pass: false`, `detail` matching `/no .* task rows/`. A `listed-item` counter would score this
   body 1 row and wrongly pass; the required checkbox-row counter must see zero.
2. **New `it()` — TPV Ruling 2 pin (kills M8/M6).** Body: heading `## 3.5 Task Breakdown` with one
   `- [ ] wire the predicate branch` row. Asserts `pass: true`, `detail` matching `/1 task row/`.
   A literal or `startsWith('Task')` heading compare fails to recognize this heading (it starts
   with `3.5`, not `Task`) and reports the section absent; the required `headingTitleOf`-based
   locator must still find it.
3. **Retitled Scenario 3b's second `it()`** (Ruling 4). Old title claimed "the accepted N5
   residue, not this story's regression" without stating the body is synthetic. New title: *"the
   same SYNTHETIC 4-section legacy body still hard-fails section(5) has >=1 listed-item — not the
   registry and not a corpus item; the real witness for the section(4)->section(5) bump is
   gate-section-index-pinning.node.test.ts S1b"*. **Assertion body unchanged** — same
   `evaluate('section(5) has ≥1 listed-item', makeDoc(legacyBody))` call, same
   `assert.strictEqual(result.pass, false)` / `assert.match(result.detail, /section 5 not
   found/)`.
4. **Corrected Scenario 5's comment** (Ruling 5). Old comment said the assertion pins "the file
   the M2 plan and readiness-gates.md's Predicate Vocabulary both cite" — which reads as pinning
   the citation itself. New comment states explicitly: this pins a **hardcoded path constant**
   (`PINNING_TEST_PATH`), not a read of `readiness-gates.md:36`; that citation-vs-reality check is
   the pinning test's own S7. States what the assertion IS good for: the only witness that
   survives deletion/rename/relocation of `gate-section-index-pinning.node.test.ts`, since that
   file's S7 lives inside the file it asserts about and dies with it. Explicitly notes: do NOT
   extend this to read the registry (would import S7's cross-branch fragility for nothing).
   **Assertion unchanged** — same `assert.ok(fs.existsSync(PINNING_TEST_PATH), ...)`.

Also added one non-assertion paragraph to the file's top docstring, noting the round-2 additions
and that they are TPV mutant pins, not new §2.1 Gherkin rows — so the mapping table (unchanged,
still 7 rows for 7 real acceptance scenarios) stays accurate. No other line in the round-1 file
was touched; `git diff --stat` shows exactly one file, 63 insertions / 6 deletions (the deletions
are the two retitled/recommented blocks being replaced, not removed content).

### Independent verification that the new assertions actually discriminate the two mutants

Before trusting the new assertions, I built a standalone shape-probe (three tiny functions:
`correct`, `M3_listed_item`, `M8_literal_heading`, mirroring TPV's mutant descriptions) outside
either repo and ran both new test bodies against all three:

```
correct       : Ruling1 -> {pass:false, "...carries no `- [ ]` task rows"} -> assertions PASS
                Ruling2 -> {pass:true,  "...has 1 task row(s)"}            -> assertions PASS
M3_listed_item: Ruling1 -> {pass:true,  "...has 1 task row(s)"}            -> assertions FAIL (killed)
                Ruling2 -> {pass:true,  "...has 1 task row(s)"}            -> assertions PASS (M3 doesn't touch heading match)
M8_literal_hdg: Ruling1 -> {pass:false, "...carries no `- [ ]` task rows"} -> assertions PASS (M8 doesn't touch row counting)
                Ruling2 -> {pass:true,  "Task Breakdown absent"}           -> assertions FAIL (killed)
```

Confirms: Ruling 1's assertions kill M3 and are silent on M8 (as expected — different failure
axis); Ruling 2's assertions kill M8/M6 and are silent on M3. Together with the round-1 file's six
mutant kills, all eight of TPV's battery mutants are now covered by at least one assertion.

### Runs (all re-measured this round, real tree)

**Targeted** (`npm --prefix cleargate-cli exec -- tsx --test
cleargate-cli/test/lib/readiness-predicates-task-breakdown.red.node.test.ts`):
```
ℹ tests 10
ℹ suites 9
ℹ pass 2
ℹ fail 8
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```
All 8 failures throw `Error: unsupported predicate shape: task-breakdown-complete` from
`parsePredicate:134` → `evaluate:159` → the test's own `evaluate()` call line — including the two
new cases, which fail at their own assertion lines (`:247`, `:269`), not at any earlier guard.
Genuine red, same shape as round 1.

**Typecheck** (`npm --prefix cleargate-cli run typecheck`): clean, no output, exit 0.

**Full suite** (`npm --prefix cleargate-cli test`, captured to a file with no truncating pipe this
time — round 1's first attempt piped through `tail -100`, which silently swallows the real exit
code; caught and corrected before trusting the number):
```
ℹ tests 2526
ℹ suites 887
ℹ pass 2516
ℹ fail 9
ℹ cancelled 0
ℹ skipped 1
ℹ todo 0
ℹ duration_ms 271170.732959
```
Delta vs round-1 baseline `2524/2516/7/1`: **+2 tests / +0 pass / +2 fail / +0 skip** — exactly the
two new red cases, nothing else moved. The 9 failures are exactly: the 1 pre-existing
`test/commands/sync.node.test.ts` network case (same test id, same
`Error: cannot reach https://cleargate-mcp.soula.ge (fetch failed)` message) + all 8 red cases in
this file (verified by grepping every `✖` line under the `✖ failing tests:` recap — no other file
appears). Both green cases (Scenario 3b's retitled `it()`, Scenario 5) confirmed passing by title
in the full-suite log.

### Concurrency / tree-stability check

Re-ran the targeted file, typecheck, and full suite as fresh, independent measurements this
round rather than trusting round-1's numbers — per the dispatch's "re-run anything unexplained
before concluding" instruction. All three reproduced cleanly with no repeat of round-1's
transient `skill-md-conditional-architect.red.node.test.ts` failure (not present in this round's
full-suite output at all). `cleargate-cli` `git status --short` before staging: only the one
modified file plus the pre-existing untracked `cleargate-0.23.1.tgz`. Outer meta-repo: read-only
this round (no file touched, no command run there) — its `git status --short` still shows only
the pre-existing concurrent-session churn (delivery drafts, sprint-run artifacts, wiki files,
`cleargate-planning/MANIFEST.json`, plus `EPIC-058` untracked files and the
`.session-totals.json.tmp.*` scratch file) — none of it touched or staged by this dispatch.

### Commit

One commit, staged by name (`git add test/lib/readiness-predicates-task-breakdown.red.node.test.ts`
— confirmed via `git status --short` that only that path was staged, `cleargate-0.23.1.tgz` left
untracked). Subject: `test(EPIC-054): STORY-054-06 red round 2 — TPV mutant-survival pins`. No
`--no-verify` (moot — cli commits are ungated per Cross-Cutting Rule 6, verified by hand instead:
typecheck + full suite both run and reported above). No `git reset --hard`.

```
QA_RED_2: done
COMMIT: e9c780f (cli repo, story/STORY-054-06)
CASES: 10 it() — 8 red / 2 green
RULING_1: NEW case red — yes (throws unsupported predicate shape at its own assertion line, :247). Message asserted: pass:false + detail matches /no .* task rows/, against a body with one plain "- " bullet and zero checkbox rows. Independently verified to kill mutant M3 (listed-item counter) via a standalone shape-probe outside both repos.
RULING_2: NEW case red — yes (throws at :269). Message asserted: pass:true + detail matches /1 task row/, against heading "## 3.5 Task Breakdown" + one "- [ ]" row. Independently verified to kill mutants M8/M6 (literal heading compare / over-broad startsWith('Task')) via the same shape-probe.
RULING_4: New title — "the same SYNTHETIC 4-section legacy body still hard-fails section(5) has >=1 listed-item — not the registry and not a corpus item; the real witness for the section(4)->section(5) bump is gate-section-index-pinning.node.test.ts S1b". Assertion body byte-identical to round 1; confirmed still green in the full-suite run.
RULING_5: New comment — states the assertion pins a HARDCODED path constant (PINNING_TEST_PATH), not readiness-gates.md:36's citation (that is gate-section-index-pinning.node.test.ts's own S7); states it is the only witness that survives deletion/rename/relocation of that file; explicitly instructs not to extend it to read the registry. Assertion unchanged; confirmed still green.
SUITE: 2526/2516/9/1 (tests/pass/fail/skipped) — delta vs round-1 2524/2516/7/1: +2 tests / +0 pass / +2 fail / +0 skip, both attributable to the two new TPV-ruling cases
PREEXISTING_FAIL: unchanged — test/commands/sync.node.test.ts "exits 2 when no MCP URL or token is configured", same fetch-failed network error, present in this run same as round 1
TYPECHECK: pass (npm --prefix cleargate-cli run typecheck, clean, exit 0)
UNCHANGED: confirmed — Scenario 7 (canonical story.md non-vacuity pin) byte-identical to round 1, still the last describe block in the file, untouched. Scenarios 1, 2, 3a, 4, 6 byte-identical. Scenario 3b's first it() (absence pass) and its describe-level title also byte-identical — only the SECOND it()'s title changed, per Ruling 4's scope. git diff --stat: exactly one file, 63 insertions / 6 deletions, matching two comment/title replacements plus two new describe blocks plus one docstring addition; no other cli or outer-repo file touched.
REPRODUCED: (1) targeted run of the red file, twice — same 10/2/8/0 both times; (2) full suite run, captured to an untruncated log file after discovering round 1's own first attempt (piped through tail -100) silently swallowed the real npm-test exit code — this round's log confirms 2526/2516/9/1 with the full "failing tests:" recap grepped line-by-line, all 9 accounted for; (3) typecheck, clean; (4) independent shape-probe (outside both repos) confirming the two new assertions kill M3 and M8/M6 respectively and are silent on the other mutant, matching TPV's mutation table; (5) grepped both green test titles in the full-suite log to confirm they still pass under Ruling 4/5's rewritten text.
flashcards_flagged: []
```
