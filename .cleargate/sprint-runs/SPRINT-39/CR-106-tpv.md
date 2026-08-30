# CR-106 TPV — mutation gate on the event-log fold baseline

role: architect · SPRINT-39 · wave 11 · M4 · Mode: TPV (mutation-testing gate)

Baseline under test: `.worktrees/CR-106` @ `21991c12`; test commit `649c24aa`
(`.cleargate/scripts/state-scripts.test.mjs`, +515/-0).

**Every number below is measured in a scratch mirror of `.cleargate/scripts/`
(`git init`-ed scratch root so `REPO_ROOT` never resolves into a real checkout). Nothing under
`.worktrees/CR-106` was written, moved or renamed; `git status --porcelain` there is empty and
`HEAD` is still `21991c12`. No commit, no merge, no branch switch, no `dist/` rebuild.**

---

## VERDICT: RULINGS-REQUIRED

**Twelve rulings, T1–T12. Four BLOCKING on QA-Red, one BLOCKING on the orchestrator, seven advisory.**

**The wiring is sound.** All imports resolve; the dynamic `import('./state-events.mjs')` guard is
correct and is what keeps a missing module from aborting the whole file; `appendEvent`/`fold` are
called with the signatures the runner script constructs; every `before` has its `after`; `E8`'s
`process.chdir`/env mutation is restored in a `finally`. Nothing here is a wiring gap.
**`arch_bounces` must NOT increment.** This is a coverage-and-adjudication gate, not a QA-Red bounce.

The defects are that **three separate wrong implementations pass this baseline at full green**, that
**the one scenario the human named as a mitigation (E7) stops working on the Developer's own
commit**, and that **the contract the tests assume is not written down anywhere a Developer will
read it**.

---

## §1 — Reference implementations and what they measure

I built four trees. Every suite run was redirected to a file and the runner's own `ℹ` status lines
read from it (N10 — no `tail`/`head` on a live runner).

| Tree | What it is | `tests·suites·pass·fail·skipped` | `duration_ms` | wall |
|---|---|---|---|---|
| `rt` | HEAD `649c24aa`, unmodified | **29 · 21 · 15 · 14 · 0** | 14485.12 | 14 s |
| `rt+M` | + a hand-written reference `state-events.mjs` only; `update_state.mjs` untouched | 29 · 21 · **26 · 3** · 0 | 15624.44 | 16 s |
| `vb` | full lock-free rewrite (`appendEvent`+`fold`), S4/S5 deleted, barrier target untouched | **27 · 19 · 27 · 0 · 0** | 5445.69 | **5.2–6.6 s** |
| `vc1` | same fold **plus a short lock** around read-log→fold→write-cache, S4/S5 kept | **29 · 21 · 29 · 0 · 0** | 7300.01 / 7441.13 | **7.4–7.6 s** |
| `nullcr` | **today's code**, one local renamed, seven `atomicWrite` sites collapsed to one, a closed-sprint guard, and a correct-but-**unused** `state-events.mjs` | **29 · 21 · 29 · 0 · 0** | 15320.06 | **15.5 s** |

### 1.1 Is the baseline satisfiable? **Yes — and cheaply.**

`rt+M` reproduces QA-Red's own soundness run exactly: adding nothing but a reference
`state-events.mjs` flips **11 of the 14** reds green (E2×3, E3×3, E4, E6, E7, E8×2) and leaves
**E5 and E9×2** red, because those two require `update_state.mjs` changes. E7's byte-identity
passed on the first attempt from a fold written against the item text plus the test file's own
`GENESIS CONVENTION` comment. The baseline is satisfiable and its E7 fixture is not
over-constrained.

### 1.2 What is a correct implementation's wall-clock? **5.2–6.6 s lock-free, 7.4 s locked.**

Both are far below the 14.6 s post-BUG-044 baseline, and the null implementation sits at **15.5 s**.

**Therefore wall-clock is neither necessary nor sufficient as the barrier witness.** The item's
`§ AMENDMENT — THE TRAP` says *"a run reporting 15/15 in under 6 seconds has disarmed the barrier"*.
Measured: a correct **locked** implementation lands at 7.4 s (passes the 6 s test but is 2× faster
than baseline), and the **null** implementation lands at 15.5 s (passes the wall-clock test while
shipping nothing). The tell is a useful smell; it is not a control. See **T4**.

### 1.3 Does the barrier disarm? **Partly — and the collapse is real but mis-attributed.**

The shim arms on the first `readFileSync` whose resolved path equals `CG_TEST_BARRIER_TARGET`
(`state-scripts.test.mjs:118-119`), set to the **state.json path** at `:482`, `:600`, `:794`.

Under `vb` the barrier **still arms** — the legacy-adoption bootstrap must read `state.json` (every
S1/S2/addendum fixture is a bare `state.json` with no `events.jsonl`) — but it no longer *serializes*.
Pre-fix the read sat inside the lock, so 20 holders each paid one 300 ms inactivity window
(S1 = 6381 ms). Post-fix all 20 arrive together, quorum completes immediately, and S1 falls to
**953 ms**; the addendum falls 3117 → 667 ms; S2 472 → 301 ms. That is where the 14.5 s → 5.6 s
collapse comes from.

Measured barrier-marker counts after S1 (`readdirSync(barrierDir).length`, N = 20):

| tree | markers |
|---|---|
| `rt` (pre-fix) | 20 |
| `vb` (lock-free fold) | 20 |
| `vc1` (locked fold) | **15** |

`vc1` drops to 15 because five processes find `events.jsonl` already seeded by a faster sibling and
skip the bootstrap read entirely. **So "assert the barrier armed N times" is NOT a sound witness —
it goes red on a correct implementation.** I measured this before recommending it, and it is
rejected. See **T4** for the witness that does work.

### 1.4 The residual race — measured, and it is real

`vb` — the "obviously correct" lock-free implementation — **loses updates.**

| run | full-suite result |
|---|---|
| 1 | 27 pass · 0 fail (5601 ms) |
| 2 | 27 pass · 0 fail (6582 ms) |
| 3 | **26 pass · 1 fail** — addendum: *"only 9 [of 10] did"* (6264 ms) |
| 4–6 | 27 pass · 0 fail (5320 / 5224 / 5358 ms) |
| targeted `S1` run (separate) | **fail** — *"only 10 [of 20] did — lost: STORY-FAKE-02, -03, -06, -07, -08, -10, -13, -16, -17, -18"* |

**~1 failure in 5 full runs. The mechanism:** `events.jsonl` is safe — `O_APPEND` orders the
appends — but the *derived cache* write is still `read-log → fold → overwrite state.json` with no
mutual exclusion. Interleave `append(P) · read(P) · append(Q) · read(Q) · write(Q)[full] ·
write(P)[stale]` and Q's transition is gone from `state.json`. `events.jsonl` still has it; **all 27
readers read `state.json`.**

`vc1` — the identical fold with a **short** lock held across read-log→fold→write-cache — is
**29/29 stable at 7.4 s across 2 full runs**, and S4/S5 pass unchanged because the lock file
semantics are BUG-044's.

**This falsifies CR-106 §1's central claim** (*"folds are idempotent, so the lost-update race is
structurally impossible rather than merely unlikely"*) **as applied to `state.json`.** It is true of
the log; it is not true of the cache. And it collides head-on with M4's own kick-back criterion
(*"keeping the lock 'just in case'"* is listed as a mutant E1 must kill) and with the item's
`§ AMENDMENT` ordering S4/S5 deleted **with** the lock. See **T3** — this is an orchestrator ruling,
not a Developer judgement call.

---

## §2 — Mutant table

`pre` = mutant applied to `rt` (real `update_state.mjs`); `post` = applied to `vb`.
Kills listed exclude E5/E9, which are red on `rt` for unrelated reasons.

| # | Mutant | Killed by | Verdict |
|---|---|---|---|
| 1 | fold re-sorts story keys (`Object.keys().sort()`) instead of log order | **E2c** (sole) | KILLED |
| 2 | `updated_at = new Date().toISOString()` instead of `max(event.ts)` | **E2b** + E7 | KILLED |
| 3 | dedupe keyed on `ts` | **E3b** (sole) | KILLED |
| 4 | dedupe keyed on `(story_id, to)` | **E3c** (sole) | KILLED — confirms QA-Red's uniqueness claim |
| 5 | vacuity: fold reads `CLEARGATE_STATE_FILE` and merges, local named `stateFile` | **E8 behavioural + E8 static** | KILLED |
| 6 | same, local renamed `basePath` | **E8 behavioural only** | KILLED — **static half evaded, exactly as QA-Red flagged** |
| 7 | vacuity via a second parameter: `fold(events, docRoot)`, path passed by `update_state.mjs` | **neither E8 half**; caught only stochastically by the addendum (9/10) | **SURVIVES E8** |
| 8 | fold drops the `notes` field | E7 (**pre** only) | KILLED pre · **SURVIVES post** |
| 9 | fold reorders top-level keys (`updated_at` before `last_action`) | E7 (**pre** only) | KILLED pre · **SURVIVES post — measured 27/27** |
| 10 | `JSON.stringify(state, null, **4**)` in `atomicWrite` | **E7** (pre and post) | KILLED |
| 11 | fold emits lane defaults on every story | E7 (**pre** only) | KILLED pre · **SURVIVES post (27/27)** |
| 12 | fold drops `qa/arch_bounces >= BOUNCE_CAP ⇒ 'Escalated'` (`:312-314`, `:329-331`) | **inherited Scenario 4** (both sub-tests) — **no E-scenario** | KILLED (post) |
| 13 | fold drops `to === 'Done' ⇒ worktree = null` (`:358-360`) | **E7** | KILLED |
| 14 | append an event on the idempotency no-op path (`:352-354`), skipping the cache rewrite | **nothing** | **SURVIVES** |
| 15 | one migration write (`:241`/`:247`) left on the old `atomicWrite` path | **E9 grep 2** | KILLED — but see #19: it *counts*, it does not discriminate |
| 16 | no closed-sprint guard → genesis synthesised on a `Completed` sprint | **E5** (sole) | KILLED |
| 17 | legacy predicate = "no `events.jsonl`" instead of closed-ness | **10 tests**, mostly inherited | KILLED — the `§ RESOLVED` ruling is well enforced |
| 18 | `appendEvent` = read-modify-write (`readFileSync` + `writeFileSync`) instead of `appendFileSync` | **E6 — 1 run in 8** | **EFFECTIVELY SURVIVES** |
| 19 | **null implementation** — today's read-modify-write kept verbatim; one local renamed `doc`; the 7 `atomicWrite(stateFile` calls collapsed to 1; a closed-sprint guard; a correct **but never imported** `state-events.mjs` | **nothing** — 29/29, both eviction greps pass, S4/S5 green, 15.5 s | **SURVIVES** |
| 20 | correct fold, barrier not re-targeted (the item's own trap) | **nothing** — 27/27 at 5.6 s | **SURVIVES** |
| 21 | correct implementation, honest `stateFile` on the *required* legacy read | **E9 grep 1** | **FALSE POSITIVE — a correct implementation is bounced by an identifier** |

### 2.1 The two most dangerous survivors

**#19, the null implementation.** ~10 edited lines, none of them architectural. `update_state.mjs`
never appends an event, never imports `state-events.mjs`, never creates `events.jsonl`, and still
performs the read-modify-write CR-106 exists to remove — and it reports
`tests 29 · suites 21 · pass 29 · fail 0 · skipped 0` at **15.5 s**, i.e. it *also* passes the
wall-clock witness. Every CR-106 scenario except E5/E9 exercises `state-events.mjs` **in isolation**;
E9 is text-only; nothing in the file asserts that the production writer *uses* the module. This is
"looks proven, proves nothing" in its purest form.

**#20, the disarm.** A correct fold with the barrier left pointing at `state.json`: 27/27 at 5.6 s,
S1 down to 953 ms — and not one assertion notices. Worse, the residual race of §1.4 then goes
undetected ~4 runs in 5.

### 2.2 E9's two greps, adjudicated

- **grep 1 (`readFileSync.*stateFile` → 0)** is not an eviction proof. Measured on `rt`: 1 hit,
  `:224`. But a correct implementation **must still read `state.json`** — for the closed-sprint
  check (E5's fixture has no log) and for the v1→v3 migration the inherited addendum requires
  (`§ RESOLVED` item 2 keeps that path). So the grep can only ever be satisfied by *moving or
  renaming* the read. Mutant #21 proves the false-positive direction (correct code bounced by the
  identifier); mutant #6 proves the false-negative direction (wrong code passed by a rename).
- **grep 2 (`atomicWrite(stateFile` → exactly 1)** counts; it does not discriminate. Baseline
  independently re-measured: **7** hits at `:241, :247, :280, :301, :318, :335, :366` — matches
  QA-Red and the BUG-044 post-flight exactly. Mutant #19 collapses those seven into one call site
  **on the old path** and passes.

Both greps are the item's own verbatim text, so QA-Red authored them correctly. They are floors.
They need the behavioural pair in **T1**.

### 2.3 E5, E9 and the red-set census

Of the 14 reds, **11 fail through `requireStateEvents()` / `existsSync` — module absence.** Only
**three** fail behaviourally: E5, and E9's two greps. Verified independently:

- **E5** — the diff is a genuine mutation of a `sprint_status: "Completed"` fixture: `state`
  `Done → Bouncing`, `updated_at` refreshed, `last_action` rewritten. Today's code has no
  closed-sprint guard at all. E5's fixture keys on **terminal `sprint_status`** (`:1096`,
  `sprint_status: 'Completed'`), not on the absence of `events.jsonl` — the `§ RESOLVED` requirement
  is honoured. E5 is the **sole** killer of mutant #16.
- **E9** — both greps read the real file. Counts confirmed above.

An 11-of-14 module-absence red set is normal for a new module and is not a defect. It is, however,
precisely why the mutation results above matter more than the red count.

---

## §3 — The unspecified contract, adjudicated

QA-Red flagged three gaps and adopted flagged placeholders. There is a **fourth** it did not raise.
Ruling on each:

| # | Item | Ruling |
|---|---|---|
| C1 | `appendEvent(eventsFile, event)` — path first | **PIN IT.** E6's runner (`makeAppendEventRunnerFile`) hardcodes argv order. A Developer choosing `(event, eventsFile)` or `(sprintDir, event)` bounces on a wiring error that says nothing about behaviour. Cheap to pin, expensive to discover. |
| C2 | Genesis = first event has `from: null`, plus an `initial: {…}` payload carrying the non-transition fields | **PIN IT.** E7's event array is hand-built and hardcodes `initial:`. A correct implementation using a `snapshot` event kind, or a fold that defaults every non-transition field, fails E7 for a reason unrelated to byte compatibility. **This is the exact BUG-044 shape this gate exists to catch.** |
| C3 | `sprint_status` carried on every event | **PIN IT.** `validateShapeIgnoringVersion` requires `sprint_status` (`validate_state.mjs:39-41`) and E7's golden carries `"Active"`; the per-event field is the only source in the tests' arrays. A sprint-level event stream would fail E4 and E7. |
| C4 | **The four non-transition actions have no event shape at all** — not raised by QA-Red | **PIN IT — BLOCKING.** `--qa-bounce`, `--arch-bounce`, `--lane`, `--lane-demote` are **4 of the 5** action branches and **5 of the 7** `atomicWrite` sites E9 grep 2 forces through the fold. The documented 9-field `{ts,sprint_id,story_id,from,to,actor,run_id,wave,reason}` shape describes **none** of them. Pin a `kind` discriminator (`transition` \| `qa-bounce` \| `arch-bounce` \| `lane` \| `lane-demote`) or an equivalent, before dispatch. |
| C5 | The five `last_action` strings | **PIN by citation.** Only `transition ${id} → ${to}` is enforced (by E7, including the U+2192 arrow). The other four are unpinned by any test. They are literal at `update_state.mjs:278`, `:299`, `:316`, `:333`, `:364` — the fold must reproduce all five verbatim. |
| C6 | Terminal `sprint_status` vocabulary | **`'Completed'`.** `close_sprint.mjs:1044` is the only writer; **25 of 25** closed sprints on disk carry it, SPRINT-39 carries `Active`, and no sprint anywhere carries `Closed`. `state.schema.json:30` lists `"Closed"` as a prose *example* — it is not a written value. Guarding both is harmless; guarding only `Closed` is wrong. |

C1–C3 are safe conventions the Developer can adopt as-is **provided the dispatch states them**.
Left unstated, each one bounces a correct implementation. C4 and C6 must be decided before dispatch.

---

## §4 — Also adjudicated

**S4/S5 deletion.** Read in full: **S4** (`:672-709`) seeds a dead-pid lock and asserts exit 0,
transition applied, stale lock gone. **S5** (`:712-749`) seeds a live lock holding the test's own pid
and asserts non-zero exit, state untouched, lock survives. Each is a single `spawnSync`, no barrier,
no concurrency. **Confirmed: pure lock semantics, zero race content**, and E1's "do not delete or
weaken" protection correctly does not extend to them. QA-Red was right not to delete them (Developer
scope) and right to record the obligation in-file so it travels with the test.

**But the deletion is CONDITIONAL on T3.** If the short lock is retained (§1.4), S4/S5 must **stay**
and stay green — measured: `vc1` is 29/29 with both intact.

**T1 stays either way.** BUG-044's `T1` (`:527-567`) carries non-lock content: exit codes and the
`already Escalated` / `not found` stderr strings for two error paths. Only its two
`!existsSync(lockFile)` assertions go vacuous. **The item's `§ AMENDMENT` names S4 and S5 only and
is correct; the BUG-044 post-flight's "S4, S5 and T1" is one test too wide.** QA-Red's in-file note
resolves it the right way.

**Inherited-test integrity — CONFIRMED.** `git diff -U0 a9304776 649c24aa` is exactly two hunks:
one inserted line at `:19` and 514 appended lines after `:825`. `numstat` = `515  0`. Lines 1–18 are
byte-identical, and old `19–825` are byte-identical to new `20–826`. **All 15 inherited tests are
untouched.**

One consequence nobody has written down: the inserted line is
`import { validateState } from './validate_state.mjs';` — a **top-level, module-load-time**
dependency for the *whole file*. CR-106's Task Breakdown row 5 edits `validate_state.mjs`. If that
edit removes the `validateState` export or adds import-time side effects (its CLI block is guarded
at `:122` — keep it that way), **all 29 tests fail at once**, including the inherited 15, for a
reason that looks like a catastrophic regression. See **T11**.

---

## §5 — Rulings

### T1 — BLOCKING · QA-Red · the null-implementation survivor

Nothing asserts that `update_state.mjs` *produces or consumes* an event log. Add to an existing
scenario (Scenario 3 is the natural host, it already drives a real transition):

1. after a successful transition, `events.jsonl` exists in the same directory as `state.json` and
   contains ≥ 1 line that parses to an object whose `story_id` and `to` match the invocation;
2. `JSON.stringify(fold(readEvents(eventsFile)), null, 2) + '\n'` **equals the on-disk `state.json`
   byte-for-byte.**

Two assertions. They kill mutant **#19** and mutant **#7** deterministically, and they are the only
thing in the file that couples the production writer to the module the CR exists to add.

### T2 — BLOCKING · QA-Red · E7 self-destructs on the Developer's own commit

E7's "OLD path" spawns `update_state.mjs`. After the Developer rewrites it, both sides of the
comparison go through the same `fold`, and the byte-compatibility guarantee the human named as
mitigation **case 7** evaporates. Measured on `vb`: key-reorder **27/27 green**, dropped-`notes`
**green**, lane-defaults **green** — all three are killed pre-fix and survive post-fix. Only the
indentation mutant still dies, because the test's own `JSON.stringify(folded, null, 2)` literal
pins it.

Fix — either is fine, both are cheap:
- commit the pre-CR-106 golden as a **literal string fixture** in the test (the 17-line JSON block
  today's writer produces for E7's seed), and compare `fold` output to it; or
- commit a frozen copy of today's `update_state.mjs` under a fixture path and spawn **that** as the
  OLD path.

Without this, CR-106's own mitigation is dead on arrival and the 27 readers are unprotected.

### T3 — BLOCKING · ORCHESTRATOR · the residual race on the derived cache

Measured (§1.4): the lock-free fold loses updates in ~1 of 5 full runs; the same fold with a short
lock is stable at 29/29. `state.json` is what all 27 readers read, and its write is still an
unserialized read-log→fold→overwrite.

Decide, before dispatch, one of:

- **(a) Retain mutual exclusion** around read-log → fold → write-cache. The critical section shrinks
  from BUG-044's whole read-migrate-write to ~1 ms. **Consequence:** S4/S5 are **not** deleted; M4
  kick-back criterion #4 ("keeping the lock 'just in case'") must be struck; the item's
  `§ AMENDMENT` ordering S4/S5 deleted must be amended; §1's "structurally impossible" sentence must
  be rewritten the way the `PIPE_BUF` sentence already was (replace the justification, keep the row).
  Expected: `29 · 21 · 29 · 0 · 0` at ~7.4 s.
- **(b) Accept a possibly-stale derived cache** and say so in the item, plus a stated reconciliation
  path (e.g. `validate_state.mjs`'s new fold-vs-file drift check becomes load-bearing rather than
  advisory). Expected: `27 · 19 · 27 · 0 · 0` at ~5.5 s, **with a known ~20 % flake on S1/addendum**
  — which is not an acceptable acceptance signal.

**Do not route this to a Developer.** Resolving it by whichever half gets written last is exactly
the failure the `§ RESOLVED` block was added to prevent.

### T4 — BLOCKING · QA-Red · the barrier needs a witness, and it is not wall-clock

Measured: correct lock-free **5.2–6.6 s**, correct locked **7.4 s**, null implementation **15.5 s**.
The "sub-6 s = disarmed" rule admits the null implementation and nearly rejects a correct one.
Marker-count is also unsound — `vc1` legitimately arms **15** of 20.

**The witness that works: a canary.** Add one test that writes a *deliberately stale-fold* writer to
a temp dir (same technique as `makeAppendEventRunnerFile`/`makeBarrierShimFile`), spawns N of them
against S1's fixture under the barrier, and **asserts the final `state.json` IS missing
transitions**. If the canary goes green — i.e. the harness can no longer detect a writer that is
provably racy — the barrier is disarmed and the test says so in one line. This is the BUG-044
post-flight's own ruling #2 ("re-prove redness by construction") turned into an assertion instead of
an instruction.

Keep reporting wall-clock alongside pass/fail. Report it as evidence, not as the gate.

### T5 — BLOCKING · QA-Red · E6 kills its own named mutant 1 run in 8

Mutant #18 (`appendEvent` as read-modify-write — the mutant E6's own docstring names) survives 7 of
8 targeted runs. E6 spawns 20 children with **no arrival barrier** — the "spawn N and hope they
interleave" pattern that BUG-044's harness exists to eliminate and that FLASHCARD 2026-08-28
`#test-harness #danger` forbids by name.

Fix: give the `appendEvent` runner the same barrier shim (`CG_TEST_BARRIER_TARGET` = the events
file, `N` = 20) so all 20 children are guaranteed to be inside the write window together; **and**
add a static assertion that `state-events.mjs` reaches the append through `appendFileSync` (or an
`openSync` carrying flag `'a'`), since that is the property the item's `§ AMENDMENT` actually
records.

### T6 — BLOCKING · ORCHESTRATOR · pin the contract before dispatch

C1–C6 in §3. C1/C2/C3 are safe conventions **only if stated in the dispatch**; C4 (no event shape
for four of five actions) and C6 (terminal vocabulary) are genuine gaps that need a decision.

### T7 — advisory · Developer (dispatch note) · E9 grep 1 is a naming rule, not an eviction proof

A correct implementation must still read `state.json` (closed-sprint check + the inherited v1
migration). Mutant #21 shows the identifier alone decides pass/fail. State plainly in the dispatch:
*"the surviving legacy/migration read must not appear on a line matching `readFileSync.*stateFile`
— put it behind a helper or name the local something else; this is a lint the item wrote, not a
behavioural requirement."* Then T1's behavioural pair carries the real weight.

### T8 — advisory · Developer · the no-op must append nothing

Mutant #14 survives. The M4 Gotcha (*"under an event log, 'no-op' must mean no event appended"*) has
zero coverage. Either add the assertion (`events.jsonl` line count unchanged across a repeated
transition) or accept unbounded log growth on the commonest path in normal operation and say so.

### T9 — advisory · Developer · `--lane` / `--lane-demote` have zero coverage anywhere

`grep -n "\-\-lane" state-scripts.test.mjs` → **0 hits**, in the whole 1340-line file. Yet E9 grep 2
forces both branches (`:280`, `:301`) through the fold. **Two of the seven rewritten write sites have
no witness at all.** Their `last_action` strings and field effects are at `:275-283` and `:293-304`;
reproduce them by reading, not by inference.

### T10 — advisory · Developer · S4/S5 deletion is conditional; T1 stays

Per §4 and **T3**. If the lock survives, S4/S5 survive. Whatever is deleted must be **named in the
commit message and the report** — the item requires it, and a suite that silently shrinks from 29 is
indistinguishable from a suite with deleted failures.

### T11 — advisory · Developer · the new top-level import couples all 29 tests to `validate_state.mjs`

`state-scripts.test.mjs:19`. Task Breakdown row 5 edits that module. Keep `validateState` exported;
keep the module free of import-time side effects (the CLI block's `process.argv[1] === …` guard at
`:122` is what makes this safe today); do **not** make the new drift check run at import.

### T12 — advisory · Developer · citation hygiene (N7)

Every `update_state.mjs` line number in this file, in the CR item, and in `M4.md` moves again on the
Developer's commit — including the **nine comment/title sites inside `state-scripts.test.mjs`
itself** that the BUG-044 post-flight §Group C already flagged and routed here. That is already a
Task Breakdown row; it covers the test file's comments too.

### Test-naming (TPV check 5)

`sprint-context.md` §Test Stack declares `*.red.node.test.ts`. This baseline appends to
`.cleargate/scripts/state-scripts.test.mjs` instead. **Compliant by exception, no bounce:** the CR's
§3 Execution Sandbox names that exact file, the M4 plan's acceptance command is
`node --test .cleargate/scripts/state-scripts.test.mjs`, and the `*.red.node.test.ts` convention
belongs to `cleargate-cli/test/**`, whose runner glob does not reach `.cleargate/scripts/`.

---

## §6 — Numbers for the Developer's dispatch

### Expected post-fix suite line — depends on T3

- **T3(a), lock retained** — `tests 29 · suites 21 · pass 29 · fail 0 · skipped 0`,
  wall-clock **~7.3–7.6 s** (measured, stable 2/2). S4/S5 kept.
- **T3(b), lock removed** — `tests 27 · suites 19 · pass 27 · fail 0 · skipped 0`,
  wall-clock **~5.2–6.6 s** — **and expect ~20 % flake on S1/the addendum.** Do not accept a single
  green run as evidence under this branch.

Add whatever T1/T2/T4/T5 contribute to those totals and restate them; the numbers above are for the
baseline as committed.

**Report wall-clock next to pass/fail, always.** A 15 s green is not proof (mutant #19 sits there);
a 7 s green is not a failure. The number is evidence for the report, not the gate.

### Red → green (14, all of them)

E2×3 · E3×3 · E4 · E5 · E6 · E7 · E8×2 · E9×2.
E5 and E9 need `update_state.mjs` changes; the other 11 go green on `state-events.mjs` alone
(measured: `26 pass · 3 fail` with the module and nothing else).

### Must stay green (15 inherited, byte-unchanged)

Scenarios 1–6 (7 tests) · BUG-044 S1 (E1 — **do not delete or weaken**) · T1 · S2 · S3 · the
QA-Red migration addendum · and S4/S5 **iff** T3(a).

### Implementation constraints a measured mutant proved necessary

1. `fold(events)` is a **pure function of its single array argument** — no `state.json` read, no
   env, no cwd, **and no second path parameter** (mutant #7 evades both E8 halves).
2. Story insertion order = **log order**; never `Object.keys().sort()` or a `Set` round-trip (#1).
3. Top-level `updated_at` = **`max(event.ts)`**, never `Date.now()` (#2).
4. Dedupe key = **`run_id`**. Not `ts` (#3), not `(story_id, to)` (#4).
5. Top-level key order, exact: `schema_version, sprint_id, sprint_status, stories, last_action,
   updated_at` (#9 — and note E7 stops enforcing this post-fix; T2 restores it).
6. Story key order, exact: `state, qa_bounces, arch_bounces, worktree, updated_at, notes`, with any
   `initial:` extras appended after `notes`. **No lane defaults on a story whose genesis carries
   none** (#11).
7. Output bytes: `JSON.stringify(state, null, 2) + '\n'` — `update_state.mjs:193`, unchanged (#10).
8. Derived consequences the fold must reproduce: `to === 'Done' ⇒ worktree = null` (`:358-360`, #13);
   `qa_bounces >= BOUNCE_CAP ⇒ state = 'Escalated'` (`:312-314`) and the `arch_bounces` twin
   (`:329-331`) — the latter two are caught **only** by inherited Scenario 4 (#12).
9. `last_action`, all five, verbatim from `:278`, `:299`, `:316`, `:333`, `:364` — including the
   U+2192 arrow in the transition string.
10. Legacy immutability keys on **terminal `sprint_status` (`'Completed'`)**, never on the absence of
    `events.jsonl` (#16, #17). Refusal is `stderr.write` + `process.exit(N)`, never a bare `throw`
    (E5 asserts no `\n    at ` stack frame).
11. An **active** v1 sprint with no log still migrates and still writes — the inherited addendum owns
    the only coverage of `:239-242` / `:245-248`; do not re-seed it.
12. `appendEvent` reaches the file through `fs.appendFileSync` / flag `'a'` (#18 — E6 catches the
    alternative 1 run in 8, so this is a review item, not a test-enforced one, until T5 lands).
13. Genesis events appended concurrently by N adopters must be **deduplicated by a derived
    `run_id`** (e.g. `genesis:<sprint_id>:<story_id>`) — random run_ids on the bootstrap path
    re-create the race inside the migration itself.
14. `events.jsonl` lines stay **`sprint_id`-scoped**, per FLASHCARD `.cleargate/FLASHCARD.md:22`.
15. The code comment records **`O_APPEND` atomicity for regular files**, not `PIPE_BUF`
    (`getconf PIPE_BUF /` → 512 here, and irrelevant either way).

### Eviction greps — baseline, independently re-measured

- `readFileSync.*stateFile` → **1** hit today (`:224`); expected **0**.
- `atomicWrite(stateFile` call sites → **7** today (`:241, :247, :280, :301, :318, :335, :366`);
  expected **1**. Both numbers reproduce QA-Red's and the BUG-044 post-flight's exactly.

---

## §7 — flashcards_flagged

- `2026-08-29 · #test-harness #tpv #danger · Testing a new module in ISOLATION proves nothing about the writer that is supposed to use it: CR-106's 8 new scenarios all passed against an update_state.mjs that never imported it — 29/29 at full baseline wall-clock. Assert that the producer emits the artefact, not just that the module can.`
- `2026-08-29 · #test-harness #tpv #danger · A byte-compat golden captured by SPAWNING the file under change dies on the commit it gates: post-rewrite both sides of CR-106's E7 run the same fold, and key-reorder/dropped-field mutants go 27/27 green. Freeze the golden as a fixture, never as a live spawn.`
- `2026-08-29 · #concurrency #danger · An append-only log removes the race from the LOG, not from the DERIVED cache: append→fold→overwrite state.json still loses updates (measured 1 run in 5, 10 of 20 transitions dropped). Every reader reads the cache. Mutual exclusion on the cache write is still required.`
- `2026-08-29 · #test-harness #danger · Wall-clock as a barrier witness cuts both ways: a correct locked implementation ran 7.4s and a NULL implementation ran 15.5s, so "sub-6s = disarmed" admits the null and nearly rejects the correct. Assert redness by construction (a canary racy writer), not by elapsed time.`

## Script Incidents

None. No `run_script.sh`-wrapped script was invoked; every measurement was a direct
`node --test` run inside a scratch mirror.
