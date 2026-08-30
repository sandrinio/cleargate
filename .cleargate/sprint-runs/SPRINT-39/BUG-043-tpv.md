# BUG-043 — TPV (Test Pattern Validation)

role: architect · dispatched between QA-Red and Developer · wave 8 · 2026-08-28

Under review: `cleargate-cli` `c6540dd` on `story/BUG-043` (cut from cli `main` @ `9e46ce5`).

```
TPV: rulings-required
T1_SHARED_EXIT: HONEST but SHAPE-FRAGILE. All nine rows go green under the plan's verbatim fix, and
  the corpus does discriminate: a surgery-only implementation (M1) and a wrong `hasAnchoredBlock`
  (M8) both red the D and G rows. The other seven rows (A/B/C/F/H/I/J) cannot red under ANY
  mixture of the anchored/unanchored grammars — both grammars agree on them by construction — so
  they are corpus ballast, not decoration. The real defect is elsewhere: the loop probes
  `injectClaudeMd`'s OUTPUT SHAPE (a re-derived append-string) instead of its grammar, and CR-105
  (wave 9) changes that shape. Measured: CR-105's `injectClaudeMd` body turns FOUR wave-8 tests red
  (D/F/G equivalence rows + `D: injectClaudeMd does not splice`). RULING R4 rewrites the probe to
  `extractBlock` — same 25/7/18 red baseline, same discrimination, immune to CR-105.
T2_GREENS_BITE: 7 of 9 bite; 1 half-bites; 1 is a sentinel, not a fix-pin. Per pin:
  B (CRLF)          -> M6 `\r?$`, M4 `\s*`, M14 read-path CRLF normalise. Triple-duty; also the
                       SOLE witness for kick-back 3 (`\s*`).
  A/I/J             -> M15 body-shape change (`match[1].trim()`). Regex-shape-insensitive.
  H (limitation)    -> M5 non-greedy. SOLE witness for kick-back 4 once anchored (R6).
  real-file 11762   -> HALF-DECORATIVE. All six candidate grammars return 11762 on both real files;
                       the length cannot distinguish any implementation. The `notStrictEqual(body,
                       null)` half DOES bite: indenting canonical's START marker reds it (proved).
  A: writeBlock changes -> M9 throw-everything guard.
  C: writeBlock no-throw -> M13 strict `^...$` without `[ \t]*`. Load-bearing.
  F: pre-existing msg -> M7 unified message AND M10 guard hoisted above the includes guards.
                       Pins guard ORDER, which no other test does.
  scenario 11       -> M9 (over-broad refusal in upgrade).
  scenario 12       -> SENTINEL: fires when a CLAUDE.md manifest row appears (proved), never on an
                       implementation variant. Correctly titled as such; keep, do not read as a pin.
T3A_FIXTURE_C: QA-RED IS RIGHT; the plan's N3 table is WRONG for C. Measured against the shipped N2
  regex: `BLOCK_REGEX.test(C) === true`, capture `"\nBLOCK\n"`, `writeBlock(C,…)` changes content
  and does not throw. The table's "C -> NO-OP, silent" row models `^...$` WITHOUT `[ \t]*` (my
  M13). Only D and G diverge. The third guard stays mandatory (D and G alone justify it). R1.
T3B_SCENARIO_10: QA-RED IS RIGHT; unreachable as the plan words it. `readBlock` and the third guard
  test the identical BLOCK_REGEX against the identical `ours`, so `ourBlock === null` strictly
  precedes every NOT_ANCHORED condition and `writeBlock` is never called for that fixture. Still red
  today for the corrected reason (baseline mangles the file — it matches neither `ours` nor
  `theirs`), reproduced 4/2/2. Keep the `catch` verbatim anyway; do NOT add a test asserting the
  catch route fires. R2.
T4_INCLUDES_GUARD: YES — CAUGHT. Buggy impl constructed (M2: anchored regex, `includes()`-only
  guards): the four D/G `writeBlock`/`removeBlock` throw tests go red on "Missing expected
  exception". Nothing else in the entire nine-file, 136-test CLAUDE.md set catches it — including
  `uninstall.node.test.ts`, which stays green. Correction to QA-Red's INCLUDES_GUARD claim: the
  no-op is caught by the missing-EXCEPTION assertions, not by the "old body GONE + new body
  PRESENT" assertions (those are the A and C tests and they guard the opposite error, an over-broad
  throw). The two halves bracket the hazard; the report conflates them.
T5_TITLING: Defect-B limitation (H) — HONEST, correctly titled and commented; add one line that it
  is now the sole greedy witness (R6). Defect-A — scenario 12's title is honest and exact.
  Scenarios 9-11's titles are NOT, and the synthetic-vs-real caveat lives only inside scenario 12's
  BODY (`:202-203`). QA-Red's report claims it is in the file header docstring; it is not. R9 moves
  it above scenario 9.
T6_SEQUENCE: NO INERT INTERMEDIATE. Two commits; commit 2 is atomic across three files.
  S0 QA-Red commit -> 20 red (the 18+2, exactly; zero collateral on the 7 pre-existing files)
  S1 surgery.ts only -> 6 red (D/G equivalence, D-inject, probe-4, scenarios 9+10) — the two
     duplicated grammars are DIVERGENT here, the BUG-041 shape
  S1b inject only -> 18 red
  S2 surgery + inject + guards + hasAnchoredBlock -> 2 red (scenarios 9 + 10 only)
  S3 + upgrade refusal -> 0 red
  `init.node.test.ts`'s N7 edit is a NAMED import of `hasAnchoredBlock`: measured, it crashes that
  file at ESM link time (28 tests -> `tests 1 / fail 1`) if it lands before the export. It must ship
  in the same commit as `claude-md-surgery.ts`. R10.
REPRODUCED: QA-Red's 25/7/18 and 4/2/2 in BOTH the scratch mirror and the real `story/BUG-043`
  checkout (29/9/20 combined). The 107/107 inertness claim was NOT re-inherited — I re-measured the
  nine-file set (136 tests) at five states. 17 mutations executed end-to-end. The N2/N3/N4 fix
  applied verbatim from the plan into an out-of-tree mirror: 29/29 green. CR-105's `injectClaudeMd`
  body applied on top: 4 red. `init.node.test.ts` N7 replacement written and run: 28/28 green
  post-fix, hard-crash pre-fix. Canonical-file and manifest tampering both proved to bite.
RULINGS: 13, below. R3 and R4 are the two that change what the Developer ships.
REPO_CLEAN: yes for everything I touched. All mutation work ran in
  /private/tmp/.../scratchpad/tpv043/meta (out-of-tree mirror; cleargate-planning + CLAUDE.md
  symlinked read-only). `cleargate-cli` working tree: clean apart from the pre-existing untracked
  `cleargate-0.23.1.tgz`; still on `story/BUG-043`. Outer repo: still on `sprint/S-39`.
  `cleargate-planning/MANIFEST.json` — NOT touched by me; it IS modified in the outer tree by the
  concurrent session (PID 38044): `generated_at` bumped to 2026-08-28T17:11:01Z plus agent-file sha
  bumps, still 70 entries / 0 CLAUDE.md rows, so scenario 12 stays green. `cleargate init` was not
  run. No `cleargate wiki` command was run. Nothing committed or staged.
```

---

## Wiring checks (the five TPV items)

| # | Check | Result |
|---|---|---|
| 1 | Imports resolve to real modules at the cited paths | **PASS** — both files execute; every specifier resolves. `import * as surgery` (`:31`) is the deliberate namespace form and is correct: a named import of the not-yet-existing `hasAnchoredBlock` crashes the whole file at ESM link time (independently reproduced — see R10's `init.node.test.ts` measurement, `tests 1 / fail 1`). |
| 2 | Constructor / function signatures match source | **PASS** — `upgradeHandler(flags, cli)` (`upgrade.ts:459-462`); `UpgradeCliOptions` carries `cwd` (`:78`) and `packageRoot` (`:84`); `loadPackageManifest({packageRoot})` (`manifest.ts:144`); `hashNormalized` (`sha256.ts:22`). `flags.yes` short-circuits to `choice = 't'` at `upgrade.ts:337-340`, so omitting `makePromptStub` is correct, not a gap. |
| 3 | `t.mock.method()` references real methods | **N/A** — no mocking used in either file. |
| 4 | Setup/teardown leaves no orphan state | **PASS** — `afterEach` drains `tmpDirs` via `splice(0)` + `rmSync(recursive, force)`. The pure-function file writes nothing. |
| 5 | Red-test naming per `sprint-context.md` §Test Stack | **PASS** — `*.red.node.test.ts`; picked up by `run-default-tests.mjs`'s default tier (QA-Red's +29 suite delta is the proof). |

**Additional finding (FLASHCARD 2026-08-27 `#test-harness #tpv` card 39 shape):** `countAnchoredLines`
(`:262-266`) had **never executed** on the red baseline — probe-4 dies at `:117` before reaching the
call at `:121`. Executed out-of-band: correct, returns 1/1 post-fix. Recorded so QA-Verify does not
re-derive it.

## Mutation matrix — measured, 17 mutations

Every row: apply to the plan-verbatim fix in the out-of-tree mirror, run both red files.

| # | Mutation | Tests that fire |
|---|---|---|
| M1 | `inject-claude-md.ts:18` left unanchored (surgery patched) | D+G equivalence, `D: injectClaudeMd…`, probe-4 |
| M2 | Third guard omitted in BOTH functions — **the silent no-op** | 4× D/G `writeBlock`/`removeBlock` throw |
| M2b | Third guard omitted in `removeBlock` only | 2× D/G `removeBlock` throw |
| M3 | `upgrade.ts` left unpatched | scenarios 9 + 10 |
| M4 | `\s*` instead of `[ \t]*` (kick-back 3) | **B only** |
| M5 | Non-greedy `[\s\S]*?` (kick-back 4) | **H only** |
| M6 | `\r?$` instead of `$` | B |
| M7 | Two `includes` messages unified into `NOT_ANCHORED` (kick-back 2) | F |
| M8 | `hasAnchoredBlock` exported but built on the OLD grammar | D+G equivalence |
| M9 | Guard throws for every input | A-writeBlock, C-writeBlock, scenario 11 |
| M10 | Third guard hoisted ABOVE the two `includes` guards | F |
| M11b | `upgrade` warns loudly, then still substitutes the payload | scenarios 9 + 10 |
| M12 | `upgrade` refuses with a message naming neither marker nor `cleargate init` | scenarios 9 + 10 |
| M13 | Strict `^…$` without `[ \t]*` (the plan's N3-table model) | C-readBlock, C-writeBlock |
| M14 | CRLF→LF normalise on the READ path | B |
| M15 | `match[1].trim()` | A/I/J, B, C, H, real-file pin |
| **M16** | **CRLF→LF normalise on the WRITE path (`writeBlock`)** | **NOTHING — 0 of 136** |
| **M17** | **CRLF→LF normalise in `removeBlock`** | **NOTHING — 0 of 136** |

M16/M17 are the gap R3 closes. They are the literal reading of BUG-043 §Open-Questions Q2 that N1
explicitly rejects ("a literal implementation rewrites a CRLF user file to LF wholesale — the
precise harm class BUG-043 exists to close"), and the entire red baseline plus the entire
pre-existing CLAUDE.md suite is blind to them.

## Regex-variant table — every claim in R5/R6/R7 in one place

Capture length on the two real files, and capture value per fixture:

| grammar | canonical | root | A | B | C | D | G | H |
|---|---|---|---|---|---|---|---|---|
| today (unanchored greedy) | 11762 | 11762 | `\nHELLO\n` | `\r\nBLOCK\r\n` | `  \nBLOCK\n` | `" and "` | `\nBLOCK\n  ` | long |
| **N2 anchored greedy** | 11762 | 11762 | `\nHELLO\n` | `\r\nBLOCK\r\n` | `\nBLOCK\n` | null | null | long |
| anchored NON-greedy | **11762** | **11762** | `\nHELLO\n` | `\r\nBLOCK\r\n` | `\nBLOCK\n` | null | null | `\nscaffold\n` |
| unanchored NON-greedy | 10606 | 10606 | `\nHELLO\n` | `\r\nBLOCK\r\n` | `  \nBLOCK\n` | `" and "` | `\nBLOCK\n  ` | `\nscaffold\n` |
| anchored `\s*` | 11762 | 11762 | `\nHELLO\n` | **`\nBLOCK\r\n`** | `\nBLOCK\n` | null | null | long |
| strict `^…$` (no `[ \t]*`) | 11762 | 11762 | `\nHELLO\n` | `\r\nBLOCK\r\n` | **null** | null | null | long |

Reading: anchoring alone defuses the real files' inline marker mentions, so **non-greedy stops being
detectable on the real files** — the plan's kick-back-4 rationale is void post-anchoring and H is the
only remaining witness (R6). `\s*` differs from N2 on exactly one fixture in the corpus, B (R7).
`[ \t]*` is what keeps C matching (R1, R5).

## Sequencing — the nine-file measurement

Files: `test/lib/claude-md-surgery.node.test.ts`, `test/commands/init.node.test.ts`,
`test/commands/init-from-source.node.test.ts`, `test/commands/uninstall.node.test.ts`,
`test/commands/doctor-drift-guard.node.test.ts`, `test/scripts/template-claude-md.node.test.ts`,
`test/commands/upgrade.node.test.ts`, plus the two new red files. 136 tests.

A **constant 10 failures** appear at every state: `doctor-drift-guard.node.test.ts` (5) and
`template-claude-md.node.test.ts` (5). They need a live `.claude/` + `.cleargate/templates/` tree
that the scratch meta-root does not have; **25/25 green in the real checkout**, verified. Subtracted
from every row below.

| state | src content | red | which |
|---|---|---|---|
| S0 | QA-Red commit `c6540dd`, no src change | 20 | the 18 + 2 QA-Red red set, exactly |
| S1 | `claude-md-surgery.ts` only | 6 | D+G equivalence, `D: injectClaudeMd…`, probe-4, scenarios 9+10 |
| S1b | `inject-claude-md.ts` only | 18 | all but probe-4 and `D: injectClaudeMd…` |
| S2 | both regexes + both guards + `hasAnchoredBlock` | 2 | scenarios 9 + 10 |
| S3 | + `upgrade.ts` refusal | 0 | — |

`drift-check.ts` needs no source edit and its behaviour does not move: it compares
`readBlock(canonical)` with `readBlock(root)`, and both return the identical 11762-char body under
today's and N2's grammar (table above). The §4-AMENDMENT site is correctly *named* and correctly
requires *zero* change.

## Coverage gaps recorded but NOT ruled (non-blocking)

1. **`uninstall` end-to-end is uncovered.** N3's stated downstream harm — `uninstall.ts:434-443`
   writes the file back unchanged and pushes `'CLAUDE.md (CLEARGATE block)'` onto `removedPaths` —
   has no test. Measured: `uninstall.node.test.ts` is green under M2. The four unit-level
   `removeBlock` throw tests are the proxy and they do fire, so the fix is guarded; only the
   downstream *reporting* claim is unpinned.
2. **Scenario 12 reads the outer working tree's `cleargate-planning/MANIFEST.json`**, which the
   concurrent session is actively regenerating. Same class as FLASHCARD 2026-08-27
   `#test-harness #cross-repo`. Stable for this assertion (0 CLAUDE.md rows across the regeneration),
   so no action — but a cli-only checkout has no `cleargate-planning/` sibling and
   `loadPackageManifest` **throws** rather than skipping (`manifest.ts:148-152`), so the test hard-fails
   outside the dogfood layout. There is no CI in `cleargate-cli`, so nothing surfaces it today.
3. **Root `CLAUDE.md`'s marker-line-alone precondition is unpinned.** Only the canonical file has a
   real-file pin. Root `CLAUDE.md` (L129/L186) is what `init`/`upgrade` actually rewrite in the
   dogfood repo.

## Script Incidents

None. No `run_script.sh`-wrapped script was invoked.
