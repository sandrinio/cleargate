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
