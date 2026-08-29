# CR-106 QA-Red report — event-log fold baseline (E2-E9)

role: qa · SPRINT-39 · wave 11 · M4 · Mode: QA-RED

Worktree `.worktrees/CR-106`, branch `story/CR-106`, cut from `sprint/S-39` at `a9304776`.

**Commit:** `649c24aa` — `test(CR-106): QA-Red baseline for the event-log fold (E2-E9)`. One file
touched: `.cleargate/scripts/state-scripts.test.mjs` (515 insertions, 0 deletions). No production
code, no `state-events.mjs`, no edit to `update_state.mjs` or its `cleargate-planning/` mirror
(`git diff --stat` on both confirmed empty before commit). No canonical mirror created for the test
file — correct, per the M4 plan's own verdict for BUG-044/CR-106: the canonical tree ships no
script-test files at all.

## QA-RED: WRITTEN

## Baseline, measured (not inherited)

Pre-existing baseline in this worktree, before my commit, three consecutive numbers:
`node --test .cleargate/scripts/state-scripts.test.mjs` → **tests 15 · suites 13 · pass 15 · fail 0
· skipped 0**, `duration_ms 14434.92`, wall-clock 14s (shell timer). Matches BUG-044's post-fix line
exactly (N3 / R1 precondition satisfied — no automatic runner exists for this file, but it is green
by hand, and the barrier is armed: 14s, not sub-6s).

**After this commit, measured twice:**

| Run | tests | suites | pass | fail | skipped | duration_ms (node:test) | wall-clock (shell) |
|---|---|---|---|---|---|---|---|
| 1 | 29 | 21 | 15 | 14 | 0 | 14424.23 | 15s |
| 2 | 29 | 21 | 15 | 14 | 0 | 14506.68 | 14s |

**All 15 inherited tests stay green, unmodified.** All 14 new tests (E2×3, E3×3, E4×1, E5×1, E6×1,
E7×1, E8×2, E9×2 = 14) are RED. Wall-clock is ~14.4-14.6s in both runs — **not** the sub-6s
disarm tell from the item's own trap warning. This is expected and correct at this stage: I did not
touch `update_state.mjs`, so BUG-044's barrier (which arms on `readFileSync` of `state.json` inside
the lock) is untouched and still fires normally. The trap becomes live only once the Developer's
commit deletes that read; **QA-Verify must re-measure wall-clock against the Developer's commit**,
not assume it from this baseline.

## Per-scenario red/green table

| # | Scenario | Sub-tests | Result (HEAD `649c24aa`) | Mutant(s) it kills |
|---|---|---|---|---|
| E1 | 20-way concurrency (inherited, not authored) | — | **GREEN**, unchanged (`BUG-044 S1` describe block) | deleting the test with the lock; keeping the lock "just in case" |
| E2 | Fold determinism | 3 | **RED** (module absent) | (a) twice-call byte-identical — `Object.keys`/`Set` reordering; (b) `updated_at === max(event.ts)` explicit value check — `Date.now()` embedded instead of derived; (c) log-order story-key insertion (Z,A,M not A,M,Z) — a re-sorting fold |
| E3 | Replay idempotency | 3 | **RED** (module absent) | (a) literal duplicate `run_id` is a no-op; (b) two different stories sharing one `ts` are both applied — kills a **ts-keyed** dedupe; (c) a second bounce cycle to the same target state (`STORY→Bouncing` twice, different `run_id`) is applied, not collapsed — kills a **(story_id,to)-keyed** dedupe |
| E4 | Schema conformance | 1 | **RED** (module absent) | `fold()` output must pass `validateState()` (reused, not forked, per the item's own "Reuse" section) |
| E5 | Legacy immutability, keyed on **closed-ness** | 1 | **RED** — genuine behavioural gap, not module-absence | today's code has no closed-sprint guard at all; measured diff shows `state`, `worktree`, `updated_at`, `last_action` all mutated on a `sprint_status: "Completed"` fixture |
| E6 | Atomic append | 1 | **RED** (module absent) | interleaved/torn concurrent `appendEvent()` writes; `'w'` instead of append-mode |
| E7 | Byte compatibility, OLD vs NEW path | 1 | **RED** (module absent) | key reordering, indentation change, dropped-but-permitted field |
| E8 | The vacuity mutant | 2 | **RED** — (a) module absent; (b) file absent | (a) behavioural: fold reading an unrelated on-disk `state.json` via `CLEARGATE_STATE_FILE`/cwd must not leak into the output; (b) static: `readFileSync` in `state-events.mjs` must target only `events.jsonl` |
| E9 | Eviction, both halves | 2 | **RED** — genuine, not module-absence | grep 1: 1 hit today (`:224`, expect 0); grep 2: **7** call sites today (`:241,:247,:280,:301,:318,:335,:366`, expect 1) — matches the BUG-044 post-flight's measured seven exactly |

**S4/S5 (`BUG-044 S4/S5`, dead-pid-lock-stolen / live-lock-respected) are unmodified — pure lock
semantics, zero race content.** Per the item's own § AMENDMENT, they must be deleted **with the
lock, in the same commit**, and that deletion must be **stated** in the Developer's commit message
and report (not silent). I did not delete them — deleting a test tied to `update_state.mjs`'s
internals is scoped to the commit that removes the lock, which is Developer work, not QA-Red's. This
requirement is also recorded as an in-file comment directly above the new CR-106 section so it
travels with the test file, not just this report.

## Soundness validation (out-of-tree, not committed — mirrors BUG-044 TPV's own technique)

Built a hand-written reference `state-events.mjs` (`fold`/`appendEvent`/`EVENT_SCHEMA`) in a scratch
copy of `.cleargate/scripts/` (never touched the worktree or main checkout) and re-ran the new tests
against it, to confirm they are not vacuous:

- **With only the reference `state-events.mjs` added** (real, unmodified `update_state.mjs`):
  `tests 14 · pass 11 · fail 3` — E2, E3 (all 3), E4, E6, E7, E8 (both) go **green**; E5 and E9
  correctly stay **red** (they require `update_state.mjs` changes the reference doesn't make).
- **With a second scratch rewrite of `update_state.mjs`** (fold-based write path + a closed-sprint
  guard): `tests 14 · pass 13 · fail 1` — E5 and E9 also go green. The one remaining red (E7) is an
  artefact of the validation itself (I had replaced the "OLD, unmodified" writer, invalidating E7's
  own premise for that run) — re-run separately against a fresh copy with the **real, untouched**
  `update_state.mjs` + the reference fold: **E7 passes** (`tests 1 · pass 1 · fail 0`).
- **Mutant-kill spot checks:** a `(story_id,to)`-keyed dedupe mutant is caught **only** by E3's
  third sub-test (the other two stay green, as designed — confirms it is the unique discriminator,
  not redundant). A vacuity mutant (fold reads `CLEARGATE_STATE_FILE` and merges) is caught by E8's
  **behavioural** sub-test; E8's **static** sub-test does *not* catch it when the mutant uses a
  differently-named local variable instead of `stateFile`/`statePath` — a real, now-documented blind
  spot of literal-text greps (same class as the FLASHCARD already on file for BUG-046's C13/T3).
  The behavioural sub-test is the reliable kill; the static one is a cheap first-line check, not a
  substitute.
- Also surfaced during this validation: the eviction grep's own literal wording
  (`readFileSync.*stateFile`) is satisfiable by a legacy-sprint-status read that simply names its
  local variable something other than `stateFile` — meaning a real implementation's still-required
  active-legacy-sprint migration read (kept per the item's own § RESOLVED ruling) does not
  automatically fail E9 grep 1 as long as it avoids that one variable name. Not a defect in E9 as
  authored (the grep text is copied verbatim from the CR item/M4 plan, not invented here) — flagged
  so QA-Verify reads the diff rather than trusting the grep alone, same discipline BUG-046's TPV
  round already established for this codebase.

None of this validation touched the real worktree; all reference files and mutants were built and
run from scratch temp directories, then discarded.

## What I could not author with full certainty, and why

CR-106's documented event shape (`{ts, sprint_id, story_id, from, to, actor, run_id, wave, reason}`)
covers **transitions only**. Nothing in the item, the M4 plan, or BUG-044's artefacts specifies:

1. **The genesis/creation event shape.** `fold()` takes *only* the event array (Task Breakdown row
   2, E8's own property) — so every non-transition field a story needs (`qa_bounces`, `arch_bounces`,
   `worktree`, `notes`, and the schema's `lane*` fields) has to come from *somewhere* in the log, and
   the CR never says where. I adopted a documented, in-file-flagged convention — a story's first
   event has `from: null`, and (for E7 only) an extra `initial: {...}` payload carrying the starting
   record — and validated it works mechanically against a reference `fold()`. **This is a QA-Red
   placeholder, not a specified contract.** If the Developer's real genesis representation differs,
   the *properties* these tests check (determinism, dedupe key, schema conformance, byte-compat,
   vacuity, eviction) are still the right properties; only the event-array literals inside the tests
   would need a mechanical adjustment to match the real shape. Recommend the Developer either adopts
   this convention or states the real one explicitly in their commit, so QA-Verify can tell which it
   is.
2. **`appendEvent()`'s exact signature.** Assumed `appendEvent(eventsFile, event)` (path-first,
   mirroring `atomicWrite(stateFile, state)`). Only E6 depends on this; if the real signature differs,
   E6's tiny external runner script (`makeAppendEventRunnerFile`) needs a one-line fix, not a redesign.
3. **`state.json`'s top-level `sprint_status` is likewise absent from the documented 9-field event
   shape.** Threaded a `sprint_status` field onto every event (redundant, matching how `sprint_id` is
   already carried per-event) rather than inventing a second event type. Flagged for the same reason
   as (1).

Everything else in the E2-E9 table was authored directly from the item's own text and measured
against the real tree (update_state.mjs citations, the eviction grep's expected counts, the
closed-sprint fixture, the byte-compat golden-run mechanism) — no other gaps.

## Re-anchored citations used (verified current, not re-derived from stale sources)

All `update_state.mjs` line citations in the new tests were read directly from the merged
`update_state.mjs` in this worktree (371 lines), matching the BUG-044 post-flight's Group A table
exactly: `:224` (the read E9 grep 1 evicts), `:241/:247/:280/:301/:318/:335/:366` (the seven
`atomicWrite(stateFile` call sites E9 grep 2 collapses), `:193` (`JSON.stringify(state, null, 2) +
'\n'`, E7's byte anchor), `:191-195` (`atomicWrite`). No stale citation was carried forward.

## flashcards_flagged

- "2026-08-29 · #qa-red #test-harness #event-log · An event-log CR that specifies only transition events leaves fold()'s genesis/creation shape undefined -- QA-Red must invent and FLAG a placeholder, not assume one silently."
- "2026-08-29 · #qa-red #test-harness #danger · A literal-text eviction grep (readFileSync.*stateFile) is evaded by renaming the local variable -- pair it with a behavioural test; the static check is a floor, not a ceiling."

STATUS=done

---

## Round 2 (TPV rulings applied)

role: qa · Mode: QA-RED round 2 · SPRINT-39 · wave 11 · M4 · CR-106

TPV returned RULINGS-REQUIRED with 12 rulings (`CR-106-tpv.md`). Wiring was sound (`arch_bounces` not
incremented). Four rulings were BLOCKING on QA-Red (T1, T2, T4, T5); one BLOCKING on the orchestrator
(T3, resolved by the item's own `§ ORCHESTRATOR RULINGS — T3 and T6` block before this dispatch: the
lock is RETAINED); one more orchestrator ruling (T6, pinning the event contract C1–C6) also landed
before this dispatch. Seven advisory (T7–T12 + naming). All applied except none — every ruling routed
to QA-Red was actionable.

**Commit:** `<see below, filled after commit>` — one file touched:
`.cleargate/scripts/state-scripts.test.mjs` (+307/-82 by `git diff --stat`, all hunks scoped to: the
top-level import comment, Scenario 3's two tests, the S4/S5 obligation comment, the
`makeAppendEventRunnerFile` helper, the E6 describe block, the E7 describe block (full rewrite,
frozen-golden), the E9 grep-1 comment, and one new appended describe block for the T4 canary). No
production code, no `state-events.mjs`, no edit to `update_state.mjs`. Confirmed via
`git diff --name-only`: one file.

### T1 — BLOCKING · applied · added to Scenario 3 (pre-existing test, not a new describe)

Per TPV's explicit instruction, two assertions were added to Scenario 3's first test (the one that
already drives a real transition):
1. `events.jsonl` exists beside `state.json` and holds ≥1 line whose `story_id`/`to` match the
   invocation;
2. `JSON.stringify(fold(readEvents(eventsFile)), null, 2) + '\n'` equals the on-disk `state.json`
   byte-for-byte.

This is a **directed exception** to the "do not modify the 15 inherited tests" default: it transitions
Scenario 3's first test from green-at-baseline to red-at-baseline (state-events.mjs does not exist
yet). Nothing else in the file was changed inside that test; only appended assertions. Scenario 3's
SECOND test (the no-op) is unaffected by T1 and stays green.

**Validated, out-of-tree, in a scratch mirror (never touched the real worktree):**
- A plausible-correct reference implementation (minimal `state-events.mjs` fold/appendEvent/readEvents
  + a targeted rewrite of `update_state.mjs`'s plain-transition branch, retaining the lock) passes
  BOTH new Scenario 3 assertions cleanly, alongside E2/E3/E4/E6/E7/E8/T4-canary (15/15 green in the
  targeted run) — no false positives introduced.
- **TPV's mutant #19 (the null implementation) is caught.** Built the exact shape: real, unmodified
  `update_state.mjs` (never touches events.jsonl) + a correct-but-unused `state-events.mjs`. Result:
  Scenario 3's first test **fails** with `events.jsonl should exist beside state.json ... after a
  successful transition` — exactly the gap TPV identified. Confirmed this is the SAME mutant shape
  that scored 29/29 at 15.5s in TPV's own measurement before this fix.

### T2 — BLOCKING · applied · E7 rewritten as a frozen literal golden, no live spawn

Round 1's E7 spawned `update_state.mjs` live as the "OLD path" — TPV measured this self-destructs on
the Developer's own commit (key-reorder/dropped-`notes`/lane-defaults mutants all go 27/27 green
post-fix). Fixed via TPV's option 2 variant: captured the golden bytes **once**, out-of-tree, from the
real unmodified `update_state.mjs` in this worktree (commit `21991c12`, before any Developer edit),
for the exact seed (`STORY-FAKE-E7`, `worktree: '/some/worktree/path'`, transition to `Done`, frozen
timestamp `2026-08-29T12:00:00.000Z`). The golden is now a literal template-string constant
(`E7_GOLDEN_STATE_JSON`, 17-line JSON block including the trailing newline) committed directly in the
test file — never regenerated by spawning anything, present or future.

Verified byte-for-byte match between the captured golden and the literal embedded in the test file
(Python round-trip diff, `diff` reported identical). Verified the new E7 test passes against the
scratch reference `fold()` (part of the 15/15 targeted validation above).

### T4 — BLOCKING · applied · canary added, proven reliable

Added a new describe block (`CR-106 T4 canary`) that is explicitly **not** a CR-106 acceptance
scenario — a harness self-check. It spawns 20 barrier-synchronized, deliberately UNLOCKED
read-compute-write processes (a throwaway fixture script, not `state-events.mjs`/`update_state.mjs`)
against the same `state.json`, and asserts the result IS missing transitions. If it doesn't lose any,
the assertion fails with a one-line message naming the barrier as disarmed.

**Reliability measured out-of-tree before wiring into the suite** (8 standalone runs): first attempt
used a non-atomic `writeFileSync`, which crashed 4 of 8 runs on a torn read (`Unexpected end of JSON
input`) — fixed by switching the canary's write to tmp+rename (mirroring `atomicWrite`), matching
TPV's own `vb` methodology (atomic write, race is about lost updates, not corruption). After the fix:
8 of 8 runs lost updates (1–5 of 20 bounced each time, well under `N`). Wired into the actual test
file and re-confirmed green across 3 full-suite runs (below).

Wall-clock is reported alongside pass/fail throughout this report, per T4's own instruction, but is
not used as a gate anywhere in this round's changes.

### T5 — BLOCKING · applied · barrier added to E6, plus a static check

`makeAppendEventRunnerFile`'s generated child now touches (`fs.readFileSync(eventsFile, 'utf8')`,
result discarded) before calling `appendEvent()`, arming the same barrier shim S1/S2/the addendum use.
E6's test now spawns its 20 children with `--import` the barrier shim and
`CG_TEST_BARRIER_TARGET=eventsFile`. A second test asserts, statically, that `state-events.mjs`
reaches the append through `fs.appendFileSync` or an `fs.openSync(..., 'a')`.

**Reliability measured out-of-tree before wiring in** (8 runs each):
| writer | barrier | mutant #18 undetected (of 8) |
|---|---|---|
| correct (`appendFileSync`) | yes | 0/8 (no false positives) |
| mutant #18 (read-modify-write) | no (round-1 baseline) | 6/8 (matches TPV's "survives 7/8") |
| mutant #18 (read-modify-write) | **yes (T5 fix)** | **0/8 — caught every run** |

### T3 / T6 — ORCHESTRATOR rulings, already resolved before this dispatch, reflected in-file

T3(a) (retain the lock) and T6 (pin C1–C6) were resolved in the CR item's own
`§ ORCHESTRATOR RULINGS — T3 and T6` block prior to this dispatch. Consequence applied here: the
in-file comment above the CR-106 section (previously stating "S4/S5 must be deleted with the lock")
is **rewritten** to record the reversal — S4 and S5 stay, must stay green, and the item's original
`§ AMENDMENT` language is superseded. No test logic changed for S4/S5/T1 (BUG-044's) — confirmed
unmodified and green in every run below.

### T7 (advisory) — applied · in-file limitation note on E9 grep 1

Added a comment directly above E9's `describe()` explaining grep 1 is a naming rule (mutant #21 false
positive / mutant #6 false negative), not a proof of eviction, and pointing at T1's coupling pair and
E8's behavioural check as the tests that carry the real weight.

### T8 (advisory) — applied · no-op-appends-nothing, added to Scenario 3's second test

Cheap given events.jsonl's line count is already observable after the first test's real transition.
Guarded with `fs.existsSync(eventsFile)` so it degrades to a no-op check at today's baseline (file
doesn't exist yet) without producing a spurious failure unrelated to the no-op property itself.

### T9 (advisory) — not applied

`--lane`/`--lane-demote` coverage gap noted by TPV but out of scope for this round's four BLOCKING
items and the cheap advisories; not authored. Flagged here so it isn't silently dropped: **zero
test coverage for `--lane`/`--lane-demote` under the event-log architecture remains a real gap** for
QA-Verify or a future round to pick up.

### T10 (advisory) — satisfied by construction

Nothing deleted this round (S4/S5 explicitly retained per T3). No commit-message obligation triggered.

### T11 (advisory) — applied · in-file comment on the `validate_state.mjs` import coupling

Added directly above the `import { validateState } from './validate_state.mjs'` line.

### T12 (advisory, citation hygiene) — not applied

Line-number citations inside this file's own comments will shift again on the Developer's commit
(same class TPV flagged for the CR item and M4.md). Already a Task Breakdown row per TPV; not
re-verified or touched this round beyond what T1/T2/T5/T7/T11 already required editing.

### Full-suite measurements (4 runs, `node --test .cleargate/scripts/state-scripts.test.mjs`, N10: redirected to a log file, status line read from the completed file, never piped through `tail`)

| Run | tests | suites | pass | fail | skipped | duration_ms | wall-clock |
|---|---|---|---|---|---|---|---|
| 1 (pre-fix, canary escape bug) | 31 | 22 | 14 | 17 | 0 | 15271.35 | 16s |
| 2 (post-fix) | 31 | 22 | 15 | 16 | 0 | 17622.56 | 17s |
| 3 | 31 | 22 | 15 | 16 | 0 | 14991.31 | 15s |
| 4 | 31 | 22 | 15 | 16 | 0 | 15155.28 | 15s |

Run 1 is included for the record: the T4 canary's first wiring had a JS-string-escape bug (a
single-backslash `"\n"` inside the code-generator array was evaluated as an actual newline by THIS
file's own parser, corrupting the generated child script) that made the canary process crash rather
than race. Fixed by dropping the unnecessary trailing-newline literal in the canary's own write (not
needed — nothing compares the canary's temp JSON byte-for-byte, only `.stories[id].state` is read).
Runs 2–4 have **identical failing-test-name sets** (diffed, byte-identical) — stable.

**Failing-test set (16, runs 2–4, identical):** Scenario 3's first test (newly red, by design/T1) +
all 14 original CR-106 E2–E9 reds (module absence, unchanged in count/shape) + E6's new static check
(new, red — module absence). **Passing set includes the T4 canary every run**, plus 14 of the 15
originally-inherited tests (Scenario 3's SECOND test, all of Scenarios 1/2/4/5/6, and all of BUG-044
S1/T1/S2/S3/S4/S5/addendum).

### Confirmation: S4/S5/T1 and the 15 inherited tests

Explicitly grepped the run-4 log for each name: **Scenario 1, 2, 4, 5, 6 — green. BUG-044 S1, T1, S2,
S3, S4, S5, addendum — all green.** Scenario 3 is the one deliberate exception (test 1 newly red per
T1, test 2 still green). `git diff --name-only` confirms only `state-scripts.test.mjs` changed —
`update_state.mjs`, `validate_state.mjs`, `state.schema.json`, and no `state-events.mjs`, are all
untouched.

### Per-ruling red/green table (this round's new/modified assertions only)

| Ruling | Assertion | Baseline (today, no state-events.mjs) | Scratch correct reference | Scratch null-mutant (#19) |
|---|---|---|---|---|
| T1.1 | events.jsonl exists w/ matching story_id/to | RED | GREEN | RED (correctly fails) |
| T1.2 | fold(readEvents) == on-disk bytes | RED (assert.fail upstream) | GREEN | RED (correctly fails) |
| T2 | fold(events) == frozen golden | RED (module absent) | GREEN | n/a (E7 no longer spawns update_state.mjs) |
| T4 | canary loses ≥1 transition | GREEN (module-independent) | GREEN | GREEN (module-independent) |
| T5.1 | 20 barrier-synced appendEvent, N lines/N run_ids | RED (module absent) | GREEN | n/a |
| T5.2 | static appendFileSync/openSync('a') check | RED (module absent) | GREEN | n/a |
| T8 | no-op appends nothing | GREEN (guarded no-op) | GREEN | n/a |

### Rulings I could not apply, and why

None. All rulings routed to QA-Red (T1, T2, T4, T5 blocking; T7, T8, T11 advisory-and-cheap) were
applied. T9 (advisory) was explicitly NOT applied — recorded above as a real, still-open gap, not
silently dropped. T10 required no action (nothing deleted this round). T12 required no action beyond
what other rulings already touched. T3 and T6 were orchestrator-level and already resolved in the CR
item before this dispatch; reflected here via the S4/S5 comment rewrite (T3) only, since T6's C1–C6
were already consumed correctly by round 1's own conventions (appendEvent path-first, genesis
`initial:` payload, per-event `sprint_status`) and require no test-file change beyond what already
existed — C4 (the `kind` discriminator) and C5 (all five `last_action` strings) remain Developer-side
implementation obligations this round did not add new tests for (T9's `--lane`/`--lane-demote` gap is
the direct consequence and is recorded above, not hidden).

### flashcards_flagged

- "2026-08-29 · #test-harness #danger · A single-backslash \"\\n\" inside a code-GENERATOR array is evaluated by the PARSER writing the generator, not the child it generates -- use double-backslash or drop the literal." 
- "2026-08-29 · #test-harness #tpv · Validating a new assertion against BOTH a correct reference AND the exact named mutant shape (not just 'does it pass a plausible impl') is what catches false confidence -- confirmed T1 kills TPV's #19 by building it, not by reasoning about it."

STATUS=done
