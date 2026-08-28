# BUG-043 QA-Red report

```
QA_RED: done
COMMIT: c6540dd8a211a3d7aa3ce8ffae808a4cd22b7cb6
FILE(S):
  - cleargate-cli/test/lib/claude-md-anchoring.red.node.test.ts
  - cleargate-cli/test/commands/upgrade-claude-md.red.node.test.ts
SCENARIOS: 29 total (25 + 4) — 20 red, 9 green (pins). Full breakdown:

  claude-md-anchoring.red.node.test.ts (25 tests, 18 red / 7 green):
    RED (10):
    - D: readBlock returns null for inline-only markers               — RED (today: " and ", non-null)
    - D: injectClaudeMd appends instead of splicing, "and" survives    — RED (today destroys " and ")
    - probe-4: "I documented the " survives, anchoredStarts/Ends===1   — RED (today destroys the phrase)
    - C: readBlock === "\nBLOCK\n" exactly (trailing ws tolerated)     — RED (today captures "  \nBLOCK\n", leading spaces leak into body)
    - G: readBlock returns null for indented markers                  — RED (today non-null; deliberate behaviour change)
    - D: writeBlock throws NOT_ANCHORED                                — RED (today mutates silently instead)
    - D: removeBlock throws NOT_ANCHORED                               — RED (today mutates silently instead)
    - G: writeBlock throws NOT_ANCHORED                                — RED (today mutates silently instead)
    - G: removeBlock throws NOT_ANCHORED                               — RED (today mutates silently instead)
    - shared-corpus equivalence x9 (A,B,C,D,F,G,H,I,J)                 — RED, ALL NINE, same cause: `hasAnchoredBlock`
      does not exist on baseline; `surgery.hasAnchoredBlock(x)` throws
      "surgery.hasAnchoredBlock is not a function" (TypeError) for every row.
    GREEN (pins, unaffected by the fix, verified both directions):
    - B: CRLF round-trips ("\r\nBLOCK\r\n") — N1, never broken
    - A/I/J: byte-identical before/after (regression pin)
    - H: known-limitation body pinned identical before/after
    - real-file pin: canonical CLAUDE.md body length === 11762, identical before/after
    - A: writeBlock still changes content (guards against an over-broad "throw everything" fix)
    - C: writeBlock does NOT throw (see CORRECTION below)
    - F: writeBlock still throws the pre-existing missing-marker message, unchanged

  upgrade-claude-md.red.node.test.ts (4 tests, 2 red / 2 green):
    RED (2):
    - scenario 9 (no markers, choice=t): today the file is fully overwritten with `theirs`
      (Defect A, live via a synthetic manifest entry) — asserted file must stay === ours.
    - scenario 10 (markers inline-only, choice=t): today the file is mangled (spliced), matching
      neither ours nor theirs — asserted file must stay === ours (see CORRECTION below).
    GREEN (pins):
    - scenario 11 (regression, both well-formed, choice=t): block body replaced, prose preserved
      — unaffected by the fix, unchanged before/after.
    - scenario 12 (real MANIFEST.json census): 70 entries, 0 named CLAUDE.md — confirms N4
      (branch unreachable in production), independent of the fix.

RED_REASON: Two distinct failure shapes, not one shared early exit.
  1. Assertion-level reds (11 of 20: 5 anchoring + 4 guard-divergence + 2 upgrade scenarios) each
     die at their own `assert.strictEqual`/`assert.throws`/`Missing expected exception` line —
     distinct assertions, distinct messages, each pinned to the specific measured baseline value
     (e.g. C's baseline body is "  \nBLOCK\n", not merely "non-null"; scenario 9's baseline file
     equals `theirs` exactly; scenario 10's baseline file is a specific mangled string).
  2. The 9 shared-corpus-equivalence tests share ONE early exit by construction: `hasAnchoredBlock`
     does not exist yet, so every row throws the identical `TypeError: surgery.hasAnchoredBlock is
     not a function` before reaching the comparison logic. This is deliberate and wiring-sound —
     `claude-md-surgery.ts` is imported via `import * as surgery from '...'` (namespace import,
     not a named import of `hasAnchoredBlock`) specifically so the missing export fails per-test
     with a catchable TypeError rather than crashing the whole file at ESM link time. Verified
     directly: a static `import { hasAnchoredBlock }` DOES crash file-load on this baseline
     (confirmed via a throwaway probe before committing to the namespace-import approach) — the
     namespace import was a deliberate choice, not an oversight.

DEFECT_A_COVERAGE: Titled explicitly. Scenario 12's title states verbatim: "upgrade's CLAUDE.md
  branch is unreachable in production — CLAUDE.md is INTENTIONALLY_UNTRACKED (build-manifest.ts:334),
  0 rows in the real 70-entry manifest." The file's header comment also states scenarios 9-11 use a
  SYNTHETIC manifest entry, and scenario 12 uses the REAL one, so a future reader cannot mistake the
  branch for live. Verified directly against `cleargate-planning/MANIFEST.json`: 70 entries, 0 named
  CLAUDE.md.

DEFECT_B_LIMITATION: Pinned. `FIXTURE_H` test is titled "H: KNOWN LIMITATION — a stray END alone on
  its own line still extends the greedy match" with an inline comment stating the assertion must
  hold BOTH before and after the fix, and instructing a future reader not to "fix" it when the real
  fix lands. Verified the baseline and the fixed-regex simulation produce the byte-identical captured
  body (`"\nscaffold\n<!-- CLEARGATE:END -->\n\nuser line one\n"`), confirming this is a true
  regression pin, not an accidental red.

INCLUDES_GUARD: Pinned, and asserts the removal HAPPENED, not merely that the call returned/threw.
  - The D/G throw tests assert `assert.throws(..., NOT_ANCHORED_MSG)` — a failing regex-message
    match would itself fail the assertion, so a wrong-message throw is caught, not just any throw.
  - The companion "must still change" tests (A, C) assert `result.includes('NEW')` AND
    `!result.includes('HELLO'|'BLOCK')` — i.e. the OLD body is actually gone and the NEW body is
    actually present, not just "no exception was thrown." This directly guards against a
    silent-no-op regression re-appearing under a different guise (the exact CR-085-shaped hazard
    N3 names): a no-op would pass a bare "did not throw" check but fail these content assertions.

MARKER_COUNT: Counts anchored LINES via `countAnchoredLines()`, a `^<marker>[ \t]*$` regex run with
  `/gm` over the OUTPUT, never a substring/split count. Used in the probe-4 test to assert
  `anchoredStarts === 1 && anchoredEnds === 1` post-injection. Evidence both files have 2 raw
  substring occurrences was reproduced independently by the Architect/plan (root L129/186 + inline
  L178; canonical L7/64 + inline L56) and is why this test counts anchored lines specifically —
  a naive substring count would be wrong for the canonical/root files themselves. Not re-verified
  by me against the live files in this dispatch (out of BUG-043's file scope — CR-105 owns "exactly
  one block in the file" against the real files); this test only counts within the probe-4 fixture's
  own synthetic output.

CRLF: Asserted as already-matching (regression pin), explicitly NOT as normalisation. Test name:
  "B: CRLF was never broken — \r is a JS LineTerminator, so /m anchors span it (N1)". Comment states
  this must be true BOTH before and after anchoring. Verified directly: baseline `readBlock` on a
  fully-CRLF fixture returns `"\r\nBLOCK\r\n"`; the fixed-regex simulation returns the identical
  string. No mutation of file bytes occurs anywhere in this test — it only calls `readBlock`.

HARDCODED_PATH_TEST: Left untouched — `test/lib/claude-md-surgery.node.test.ts:211-223`'s "dogfood
  sanity" block (absolute `/Users/ssuladze/Documents/Dev/ClearGate/CLAUDE.md` literal) was not
  edited, viewed for edit, or referenced by path from my new files. Confirmed still green: it passed
  in the full-suite run below (no failure attributed to that file in the 21 failing-test list).
  BUG-060 remains the filed, deferred owner of that defect; I did not add a fifth `/Users/` literal
  — my real-file pin (`real-file pin: readBlock on canonical cleargate-planning/CLAUDE.md`) resolves
  `CANONICAL_CLAUDE_MD` via the same module-relative `REPO_ROOT` pattern as
  `test/scripts/template-claude-md.node.test.ts:16`.

SUITE: 2555 / 2533 / 21 / 1 — delta vs baseline 2526/2524/1/1 is exactly +29 total / +9 pass / +20
  fail / +0 skip, matching my two new files' own counts precisely (25+4=29 tests; 7+2=9 pass;
  18+2=20 fail). All 21 failing tests were enumerated from the full-suite run's "failing tests"
  section: exactly 1 is the pre-existing `test/commands/sync.node.test.ts` network-dependent case
  ("cannot reach https://cleargate-mcp.soula.ge (fetch failed)") — unchanged message, confirmed
  still present and still the ONLY non-mine failure — and the other 20 are exactly my two new files'
  red scenarios, by file:line cross-check. Zero unexpected regressions anywhere else in the 2555-test
  suite.

TYPECHECK: pass — `npm run typecheck` (`tsc --noEmit`) clean, no output. Note: `tsconfig.json`
  `exclude` list includes `**/*.test.ts`, so `test/**` (including both new files) is NOT actually
  type-checked by this command — this is a pre-existing repo convention (test files are transpiled
  by `tsx`, not type-checked by `tsc`), not something introduced or worked around here. I removed an
  unused `FIXTURE_DIR` const from the anchoring file after noticing it was dead (harmless either way
  given the exclude, but no reason to ship a dead const) and re-ran both files to confirm no
  behaviour changed.

REPRODUCED:
  - `npm run typecheck` — clean, both before and after the `FIXTURE_DIR` cleanup.
  - `npx tsx --test --test-reporter=spec test/lib/claude-md-anchoring.red.node.test.ts` — 25/7/18/0.
  - `npx tsx --test --test-reporter=spec test/commands/upgrade-claude-md.red.node.test.ts` — 4/2/2/0.
  - `npm test` (full suite, `run-default-tests.mjs`, 891 suites, test-concurrency=1) — 2555/2533/21/1,
    background run, completed in ~556s.
  - Every fixture's expected value in both files was independently executed via throwaway `tsx`
    probes against the REAL baseline functions (`readBlock`/`writeBlock`/`removeBlock`/
    `injectClaudeMd`/`upgradeHandler`) BEFORE being written into the test files — not inferred from
    the plan's prose. Probes covered: D, C, G, B, H, I, J, F, A (pure functions); probe-4 end-to-end;
    the guard-divergence table for D/G/C/A/F; the canonical CLAUDE.md real-file length; the real
    `cleargate-planning/MANIFEST.json` census; and full `upgradeHandler` runs for scenarios 9 and 10
    via a tmp-dir harness matching the real test harness.

SURPRISES:
  1. **N3's table is wrong for fixture C, measured.** The plan's N3 table lists "C | marker with
     trailing spaces | today: changed | anchored+includes-only guards: NO-OP, silent" — implying C
     needs the third guard to avoid a silent no-op. Direct execution of the FINAL N2 regex (which
     already includes `[ \t]*$` tolerance) shows `BLOCK_REGEX.test(C)` is `true` — C matches fine,
     `writeBlock(C, ...)` changes the content successfully, no divergence, no throw. Only D and G
     actually diverge under the shipped N2 regex. I believe N3's table modeled an intermediate,
     stricter anchor (`^...$` without `[ \t]*`) as an illustration of the general hazard, not the
     final N2 regex — but as written it would mislead a Developer into either (a) writing a test
     asserting C throws, which would be permanently red even against a correct implementation, or
     (b) adding a guard/regex variant that makes C throw when it should not. My tests assert the
     MEASURED reality: C does not throw (both before and after); D and G do (after only). Flag this
     to the Architect/orchestrator for a plan correction before Developer dispatch — a Developer
     reading only the plan's N3 table might "fix" my C test to match the wrong expectation.
  2. **Scenario 10 as literally described in the plan is unreachable; corrected, not dropped.** The
     plan's scenario 10 says "writeBlock throws NOT_ANCHORED, the catch refuses" for markers-only-
     inline `ours`. Traced and measured: `readBlock` and `writeBlock`'s third guard both test the
     exact same `BLOCK_REGEX` against the exact same `ours` string, so `readBlock(ours) === null` is
     a strict superset of every condition under which `writeBlock` would throw NOT_ANCHORED —
     `upgrade.ts`'s `if (ourBlock === null)` branch always intercepts first, and `writeBlock` is
     never called for this fixture in the upgrade path (confirmed via a scratch simulation of the
     exact planned `upgrade.ts` control flow, matching the plan's own "Source changes, verbatim").
     The test still exists (scenario 10 kept, not deleted) and still asserts the correct OBSERVABLE
     outcome (file unchanged, same refusal message as scenario 9) — I just corrected the internal-
     route narrative in the test's title/comment rather than asserting a route that cannot fire.
     This is a second, finer-grained corollary of the plan's own N4 finding (the branch is
     unreachable end-to-end); worth folding into N4 or a new ruling before Developer dispatch.
  3. Node's default `tsx --test` output (no explicit `--test-reporter`) does not print the numeric
     summary section in this environment when piped through `tail`/`grep` the way I first tried —
     had to match `run-default-tests.mjs`'s own `--test-reporter=spec` flag to get reliable
     `ℹ tests/pass/fail/skipped` lines. Not a code defect, just a repro-command note for whoever
     re-runs these files standalone.
  4. A static `import { hasAnchoredBlock } from '.../claude-md-surgery.js'` (named import of an
     export that doesn't exist yet) crashes the ENTIRE file at ESM link time in this repo's `tsx`
     setup — confirmed via a throwaway probe before writing the real file. Used
     `import * as surgery from '...'` instead so the missing export fails per-test (TypeError,
     catchable, scenario-local) rather than taking down all 25 scenarios in the file. Recorded as a
     flashcard below.
```

## Notes for Developer / Architect

- Fixture corpus, exact expected values, and every "measured, not reasoned" claim in this report
  and in the two test files were verified by direct `tsx` execution against baseline `9e46ce5`
  before being committed — see `SURPRISES` above for the two corrections against the plan's own
  tables (N3's C row; scenario 10's internal-route narrative).
- Both new files are additive-only. Neither modifies `test/lib/claude-md-surgery.node.test.ts`,
  `test/commands/init.node.test.ts`, `test/commands/upgrade.node.test.ts`, or any implementation
  file. `test/commands/init.node.test.ts:268`'s private `GREEDY_BLOCK_REGEX` replacement (N7) is
  Developer scope per the M3 plan, not QA-Red scope — not touched here.
- `hasAnchoredBlock` must be exported from `claude-md-surgery.ts` per N8's exact signature
  (`export function hasAnchoredBlock(content: string): boolean`) for the 9 shared-corpus tests and
  the `A (well-formed): hasAnchoredBlock() agrees...` test family to turn green — a differently-named
  or differently-typed export will keep them red for a new reason.

## flashcards_flagged

- "2026-08-28 · #test-harness #qa · A static `import {name}` of a not-yet-existing export crashes an ENTIRE tsx test file at ESM link time; use `import * as ns` for QA-Red imports of unshipped exports so failures stay per-test. [BUG-043]"
- "2026-08-28 · #danger #plan-drift · Measure plan tables before copying them into a red test — N3's C-fixture row modeled an intermediate anchor, not the shipped `[ \\t]*` regex; a literal copy would have pinned the wrong behaviour permanently. [BUG-043]"

## Round 2 — TPV rulings

```
QA_RED_2: done
COMMIT: c013589 (cleargate-cli, story/BUG-043; parent c6540dd)
R3_CRLF_TEST: Added verbatim to claude-md-anchoring.red.node.test.ts, new describe block
  "Defect B — CRLF write path (R3)", using FIXTURE_B exactly as given. BUT measured, not
  assumed: on the completely unfixed baseline (c6540dd, no anchoring, no guards, no
  normalisation), BOTH new tests are GREEN, not red — see SURPRISES #1. They go green
  under the correct N2/N3 fix (unchanged behaviour) and would go RED under a
  \r\n->\n-normalising "fix" (the literal, human-rejected Q2 reading) — verified by
  hand-tracing writeBlock/removeBlock's replace() against FIXTURE_B for both the today
  regex and the N2 regex; neither path touches CRLF bytes outside the block, so the
  gap these tests close is purely against a FUTURE wrong implementation, not today's.
  Anchoring file: 25/7/18 -> 27/9/18 (both new tests landed in the +2 pass column).
R4_PROBE: Rewritten to extractBlock per the plan's verbatim replacement — widened the
  import at :32 to `{ injectClaudeMd, extractBlock }`, replaced the corpus-loop body
  (:242-252 pre-edit) to compare `surgery.hasAnchoredBlock(content)` against
  `try { extractBlock(content); ... } catch { ... }` instead of a re-derived append
  string, and replaced the D-inject test's exact append-shape equality (old :112) with
  the two `countAnchoredLines` assertions. Confirmed same 25/7/18(+2 from R3)=27/9/18
  baseline red/green split — all 9 corpus rows still fail with the identical
  `surgery.hasAnchoredBlock is not a function` TypeError, D/D-inject/probe-4/C/G still
  fail for their original assertion reasons. Did NOT independently re-apply CR-105's
  injectClaudeMd body in this round (no src edits permitted, CR-105 is wave-9/not yet
  written) — the CR-105-immunity number (25/25 after fix+CR-105) is TPV's own
  measurement, not re-derived here. What I did verify directly: the probe now imports
  and calls `extractBlock`/`hasAnchoredBlock` — the grammar — and never touches
  `injectClaudeMd`'s return value shape, so it is immune to an output-shape change
  by construction, matching R4's stated rationale.
R6_R7_R9: All three applied, non-behavioural, quoted:
  R6 — appended to FIXTURE_H's docblock: "Once anchored, non-greedy `[\s\S]*?` returns
    the identical 11762-char body on both real CLAUDE.md files — kick-back criterion 4's
    stated truncation rationale is false post-anchoring. H is now the SOLE fixture in
    this corpus that discriminates greedy from non-greedy retention (R6)."
  R7 — appended to FIXTURE_B's docblock: "Also the SOLE witness for kick-back 3 (`\s*`
    vs `[ \t]*`): `\s*$` is identical to N2 on A/C/D/G/H/I/J and on both real CLAUDE.md
    files, differing only on B — `\s*` would swallow the trailing CRLF and return
    `"\nBLOCK\r\n"` instead of `"\r\nBLOCK\r\n"` (R7)."
  R9 — added to upgrade-claude-md.red.node.test.ts's file header, above scenario 9,
    verbatim per the ruling: "(R9, TPV round 2) Scenarios 9-11 drive this branch
    through a SYNTHETIC single-entry manifest. In production the branch is
    unreachable — `CLAUDE.md` is `INTENTIONALLY_UNTRACKED` (`build-manifest.ts:334`),
    0 rows in the real 70-entry manifest; scenario 12 pins that."
UNTOUCHED: Confirmed by diff — only two files changed (claude-md-anchoring.red.node.test.ts,
  upgrade-claude-md.red.node.test.ts), 59 insertions / 13 deletions total.
  - Fixture F: byte-identical, not opened.
  - Both C tests (readBlock trailing-ws pin, writeBlock-does-not-throw correction test
    with its SURPRISES-referencing title): byte-identical.
  - Scenario 10: body byte-identical (only the file HEADER gained the R9 sentence,
    scenario 10's own title/body/assertions untouched).
  - The 11762 real-file pin test: byte-identical.
  - claude-md-surgery.node.test.ts:211-218 (BUG-060 hardcoded path): not in this diff
    at all — file was never opened.
SUITE: 2557 / 2535 / 21 / 1 — delta vs round-1's 2555/2533/21/1 is exactly
  +2 total / +2 pass / +0 fail / +0 skip, matching the two new R3 tests precisely.
  21 failures unchanged in composition: 1 pre-existing test/commands/sync.node.test.ts
  network failure ("cannot reach https://cleargate-mcp.soula.ge (fetch failed)") + 2
  upgrade scenarios (9, 10) + 18 anchoring reds (D-readBlock, D-inject, probe-4,
  C-readBlock, G-readBlock, D/G writeBlock+removeBlock throws x4, 9x shared-corpus
  equivalence). Zero unexpected regressions anywhere else in the 2557-test suite.
TYPECHECK: pass — `npm run typecheck` (`tsc --noEmit`) clean, no output.
REPRODUCED:
  - `npx tsx --test --test-reporter=spec test/lib/claude-md-anchoring.red.node.test.ts`
    -> tests 27, suites 4, pass 9, fail 18, skipped 0.
  - `npx tsx --test --test-reporter=spec test/commands/upgrade-claude-md.red.node.test.ts`
    -> tests 4, suites 1, pass 2, fail 2, skipped 0 (unchanged from round 1).
  - `npm run typecheck` -> clean.
  - `npm test` (full suite, run-default-tests.mjs, 892 suites) -> tests 2557, pass 2535,
    fail 21, skipped 1, run in background to completion (~9 min).
SURPRISES:
  1. **R3's two new tests are GREEN on today's actual unfixed baseline (c6540dd), not
     RED.** The dispatch text said "It must be red on baseline for the right reason";
     measured directly, that is not what happens. Hand-traced and confirmed by running:
     `writeBlock`/`removeBlock` on FIXTURE_B under the completely unfixed src (unanchored
     regex, `includes()`-only guards, zero CRLF handling anywhere) already preserve
     CRLF outside the block byte-for-byte, because nothing in either the old or the
     new (N2/N3) implementation touches CRLF at all — only a THIRD, hypothetical
     implementation (one that normalises `\r\n`->`\n` before matching, the literal Q2
     reading N1 rejects) would fail these assertions. This is exactly what TPV's own R3
     text says ("Both are green under the N2/N3 implementation and red under any
     normalising one") — TPV never claimed baseline-red, only green-under-correct-fix
     and red-under-a-specific-wrong-future-fix. The dispatch's "red on baseline" framing
     overstated TPV's own claim. Functionally these two tests are structurally identical
     to the existing "B: CRLF was never broken" green pin (same fixture, same "must hold
     both before and after" shape) — a witness against a specific wrong implementation,
     not a scenario currently unimplemented. Reporting the measured reality rather than
     the predicted one, per the dispatch's own instruction.
  2. R13 (two stale line-citation corrections: `upgrade-claude-md.red.node.test.ts:10`'s
     `upgrade.ts:364-378` citation and the plan's own `uninstall.ts:437-441` citation) is
     named in the TPV ruling block but was NOT in this round's task list (R3/R4/R6/R7/R9
     only). Left untouched — out of this dispatch's explicit scope, not overlooked.
     Flagging so it isn't silently dropped before the fix commit.
```
