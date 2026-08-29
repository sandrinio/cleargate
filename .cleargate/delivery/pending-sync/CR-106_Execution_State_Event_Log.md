---
cr_id: CR-106
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: "SPRINT-39"
carry_over: false
area: planning-layer
status: Draft
approved: true
context_source: verified codebase grounding (update_state.mjs:78-99 read-modify-write; state.schema.json; 27 non-test readers enumerated) + recorded direct approval in design conversation 2026-08-26
created_at: 2026-08-26T00:00:00Z
updated_at: 2026-08-25T20:50:14Z
created_at_version: cleargate@0.24.2
updated_at_version: dff83bd3-dirty
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-25T20:50:14Z
  transition: ready-to-apply
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# CR-106: Execution state becomes an append-only event log with a derived fold

> **CITATION REPAIR (orchestrator, 2026-08-29).** The live `.claude/skills/sprint-execution/SKILL.md` had drifted from canonical (777 vs 787 lines) because STORY-054-03's Gate-4 re-sync never ran. Live was re-synced from canonical today and is now byte-identical. Canonical is purely additive over the old live file -- a 9-line `### 2.1 Spikes run before the loop` block after `:99` and one reference line after `:765` -- so every citation in this file below `:100` shifted by +9 and every one below `:766` by +10. Repaired here: `:252`->`:261`. Each target was re-read after the re-sync and confirmed to carry the quoted text.


## 0.5 Open Questions

> Populate during drafting. Resolve every entry before flipping ambiguity to 🟢.

- **Question:** Should the fold run inline on every append (synchronous rewrite of `state.json`) or lazily on read?
- **Recommended:** Inline on every append. Lazy folding reintroduces a read-side race and would force all 27 readers to learn about the log. Inline keeps the invariant "`state.json` is always current" that every existing reader already assumes.
- **Human decision:** Inline — recorded 2026-08-26.

- **Question:** Does the event log replace `token-ledger.jsonl`?
- **Recommended:** No. The ledger is hook-owned and records cost, not lifecycle. Two logs with distinct owners and distinct schemas; do not merge them.
- **Human decision:** No — recorded 2026-08-26.

- **Question:** What happens if the fold and a hand-edited `state.json` disagree?
- **Recommended:** The log wins and the fold overwrites, matching the CLAUDE.md doctrine that derived caches rebuild. `validate_state.mjs` gains a check that flags a `state.json` whose content differs from `fold(events)` so silent hand-edits surface rather than persist.
- **Human decision:** Log wins, drift is flagged — recorded 2026-08-26.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- **Forget that `state.json` is a document that writers mutate.** Today `update_state.mjs` performs an unguarded read-modify-write of the whole file: it parses `state.json` (`:99`), mutates one story's record, and rewrites the entire document via tmp+rename (`:78-79`). The tmp+rename gives atomicity of the *write* — no torn file — but provides no lost-update protection. Two concurrent invocations interleave as: A reads → B reads → A writes → B writes over A's snapshot. **A's transition is silently lost.** This is a live defect today whenever two segments in the same wave transition simultaneously; it is not hypothetical, merely narrow.
- **Forget that the race is fixable with a lock.** A lockfile serializes access to a sharing that should not exist. Every field under `stories.<ID>` is owned by exactly one writer — that story's segment. There is no cross-story field. The only global keys, `last_action` and `updated_at`, are derivable (last event, max timestamp). The contention is an artifact of file layout, not of the domain.

**New Logic (The New Truth):**

- **`events.jsonl` is the truth. `state.json` is a fold over it.** Every lifecycle transition becomes one appended JSON line: `{ts, sprint_id, story_id, from, to, actor, run_id, wave, reason}`. **§ AMENDMENT (orchestrator, 2026-08-29, per M4 §CR-106 "WRONG PREMISE"). The design is correct;
the stated reason was not, and it is REPLACED here — the row stays, per the CR-105 rule.** The
original sentence read *"POSIX `O_APPEND` writes below `PIPE_BUF` (4096 bytes) are atomic"*. Two
errors in one sentence: `PIPE_BUF` governs **pipes and FIFOs** and says nothing about a regular
file, and a `.jsonl` append is a regular-file write; and on this machine `getconf PIPE_BUF /`
returns **512**, not 4096 — so even the number is wrong for the platform the sprint runs on.
The property actually relied on is that **`O_APPEND` makes the seek-to-end and the write a single
atomic operation with respect to other writers on the same file**, which POSIX does guarantee for
regular files and which Node reaches via `fs.appendFileSync(path, line, 'utf8')` (flag `'a'`).
Concurrent appends therefore cannot interleave and contention goes to zero regardless of wave
width. **Record this guarantee — not `PIPE_BUF` — in the `state-events.mjs` code comment.** Do not
size a record against 4096 and call it safe: that number has no meaning here, and a comment citing
it will be cargo-culted by the next reader.
- **`state.json` keeps its exact current schema and path.** After each append the folder rewrites it. **No reader changes.** All 27 non-test consumers keep working untouched.

  **§ AMENDMENT (orchestrator, 2026-08-29, per `TPV RULING — CR-106` T3 — the design stays, the
  justification is REPLACED, exactly as the `PIPE_BUF` sentence above was).** The original text
  claimed the folder *"gains exactly one writer — the folder — and folds are idempotent, so the
  lost-update race is structurally impossible rather than merely unlikely."* **Measured false for
  the derived cache.** A lock-free fold loses updates in **~1 of 5 full runs** (TPV §1.4: S1 lost
  10 of 20 transitions). Idempotent folds make `events.jsonl` safe — appends are atomic and the
  log is the truth — but `state.json` is still written by an **unserialized read-log → fold →
  overwrite**, and that is a read-modify-write like any other. Concurrency does not care that the
  value being written was derived rather than read.

  What is true, and is the CR's real gain: **the truth moves to an append-only log that cannot lose
  a write**, and the critical section over the cache shrinks from BUG-044's whole
  read-migrate-write to **~1 ms**. See the T3 ruling below for the consequence.
- **This finishes a pattern ClearGate already uses everywhere else.** `token-ledger.jsonl` is append-only JSONL, hook-owned, with an explicit "never edit by hand" rule (CLAUDE.md). `wiki/log.md` is an append-only YAML event stream. The CLAUDE.md doctrine already reads *"Wiki, memory, and `context_source` are derived caches… the code wins; the cache rebuilds."* `state.json` is the last machine-written surface still modelled as a mutable document.
- **Idempotency stops being a prose obligation.** `SKILL.md:261` currently *asks* segments to be idempotent as a "belt-and-suspenders safety net" for `resumeFromRunId`. With events keyed by `run_id`, a replayed GREEN segment appends a duplicate that the fold discards. The guarantee moves out of prose and into the data model.

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update: **none.** `state.json`'s schema, path, and semantics are unchanged by design — this CR adds a producer behind it, it does not alter the contract any consumer sees.
- [ ] Database schema impacts? **No.** No Postgres involvement; this is filesystem state under `.cleargate/sprint-runs/<id>/`.
- [ ] **Hard predecessor: [[BUG-044]]** — closes the lost-update race with a lockfile and ships the regression test this CR must keep green. Merges before this CR inside M4.
- [ ] **Forward dependency:** EPIC-055 (parallel wave scheduling) is blocked on this CR. Widening concurrency across waves multiplies the lost-update window; the log must land first.
- [ ] **`validate_state.mjs` gains a check** (fold-vs-file drift). This is additive — it cannot fail a tree that has no `events.jsonl` yet.
- [ ] **`init_sprint.mjs` must seed `events.jsonl`** alongside `state.json`, and must remain correct for sprints that predate the log.
- [ ] **Backward compatibility:** a sprint directory with `state.json` and no `events.jsonl` must keep working read-only (closed sprints: SPRINT-03 … SPRINT-38 all have `state.json` and no log). The folder synthesises a genesis event set from the existing `state.json` on first append, or the sprint is treated as legacy-immutable. Chosen: **legacy-immutable** — never rewrite a closed sprint's state.

## Existing Surfaces

> L1 reuse audit. List source-tree implementations this CR extends or modifies. Cite file:line.

- **Surface:** `.cleargate/scripts/update_state.mjs:78-79` — `atomicWrite()`; tmp+rename of the whole document. Prevents torn files, not lost updates. This CR keeps the function and moves it behind the folder.
- **Surface:** `.cleargate/scripts/update_state.mjs:99` — `JSON.parse(fs.readFileSync(stateFile))`; the read half of the unguarded read-modify-write. Replaced by an append.
- **Surface:** `.cleargate/scripts/state.schema.json` — the `state.json` shape contract. Unchanged by this CR; it becomes the fold's output contract.
- **Surface:** `.cleargate/scripts/validate_state.mjs` — existing shape validator. Extended with a fold-vs-file drift check.
- **Surface:** `.cleargate/scripts/_migrate-schema-v3.mjs:1-20` — established precedent for a versioned, idempotent, tmp+rename state migrator with a strip-on-read contract. The genesis/legacy handling reuses this shape rather than inventing one.
- **Surface:** `.claude/hooks/token-ledger.sh` + `.cleargate/sprint-runs/<id>/token-ledger.jsonl` — the existing append-only JSONL event surface in the very same directory. This CR mirrors its idiom (append-only, single owner, never hand-edited).
- **Why this CR extends rather than rebuilds:** The output contract (`state.json`, `state.schema.json`) and every one of its 27 non-test consumers stay exactly as they are. What changes is only the *producer* — a write path that today reconstructs the whole document from a stale read becomes an append plus a deterministic fold. `atomicWrite`, the schema, the migrator idiom, and the JSONL convention are all existing surfaces being composed, not replaced. A rebuild would mean changing the read contract, which is precisely what makes this cheap to adopt and what this CR deliberately avoids.

## Task Breakdown

> Rows authored by the M4 Architect in `.cleargate/sprint-runs/SPRINT-39/plans/M4.md`
> and committed into this item by the orchestrator on 2026-08-29 (M4 OD-5), before any
> worktree was cut. Execution order.

- [ ] Confirm BUG-044 is merged and node --test .cleargate/scripts/state-scripts.test.mjs is 12/12/0
- [ ] Create .cleargate/scripts/state-events.mjs: appendEvent(), fold(), EVENT_SCHEMA; fold() takes ONLY the event array
- [ ] QA-Red: author E2-E9; confirm the red set by MEASUREMENT, not prediction
- [ ] Rewrite update_state.mjs write path to appendEvent + fold; route :116 and :122 migration writes through it
- [ ] Extend validate_state.mjs with the fold-vs-file drift check (additive; must not fail a tree with no events.jsonl)
- [ ] Seed events.jsonl in init_sprint.mjs; collapse the duplicated tmp+rename idiom at :231-233
- [ ] Mirror all four scripts into cleargate-planning/ byte-identically, same commit
- [ ] Run both eviction greps; run node --test; record pass/fail/skipped verbatim
- [ ] Re-measure every line citation in the item and in this plan that points into a file this commit edited (N7)

## Prior work

> Duplicate-check evidence, enforced by the `prior-work-recorded` readiness predicate.

- `cleargate wiki query "execution state json concurrency event log append only"` → **none found**. Second query `"state.json lost update race"` → **none found**.
- Residual greps: `.cleargate/delivery/archive/` returns items that *read* state.json (`CR-078`, `BUG-002`, `EPIC-014`, `STORY-025-02`) but none that touch its write model or concurrency.
- `.cleargate/FLASHCARD.md` has two adjacent cards — line 22 (`HOOK_LOG` is append-only and never rotated; scope log-derived fallbacks by session id) and line 82 (`init_sprint.mjs` no longer writes `execution_mode` into state.json) — neither covers the write race. Card 22 is a **direct design input**: it is the known failure mode of an unscoped append-only log, and this CR's log is scoped by `sprint_id` per line for exactly that reason.
- Related but distinct: [[BUG-034]] (flashcard-gate restore not exception-safe) and [[BUG-033]] (collision surface fail-open) are the two prior concurrency-adjacent defects in the wave machinery; both are fixed and neither touches state.json.

## 3. Execution Sandbox

**Modify:**
- `.cleargate/scripts/update_state.mjs` — write path becomes `appendEvent()` + `fold()`; `atomicWrite` retained for the fold's output.
- `.cleargate/scripts/validate_state.mjs` — add fold-vs-file drift check.
- `.cleargate/scripts/init_sprint.mjs` — seed `events.jsonl` at sprint init.
- `.cleargate/scripts/state-scripts.test.mjs` — concurrency regression test (see §4).
- `cleargate-planning/.cleargate/scripts/update_state.mjs` — canonical mirror.
- `cleargate-planning/.cleargate/scripts/validate_state.mjs` — canonical mirror.
- `cleargate-planning/.cleargate/scripts/init_sprint.mjs` — canonical mirror.

**Create:**
- `.cleargate/scripts/state-events.mjs` — `appendEvent()`, `fold()`, `EVENT_SCHEMA`; the only module that writes `state.json`.
- `cleargate-planning/.cleargate/scripts/state-events.mjs` — canonical mirror.

**Do NOT modify:** any of the 27 non-test `state.json` readers. If a reader needs changing, the fold is wrong.

## § ORCHESTRATOR RULINGS — T3 and T6 (2026-08-29, pre-dispatch)

TPV routed two decisions here explicitly, with *"do not route this to a Developer — resolving it by
whichever half gets written last is exactly the failure the `§ RESOLVED` block was added to
prevent."*

### T3 — RULED: **(a) retain mutual exclusion around read-log → fold → write-cache.**

The measurement decides it. Lock-free: **loses updates in ~1 of 5 full runs**, with a known ~20%
flake on S1 and the addendum — TPV's own words, *"not an acceptable acceptance signal."* Retained
short lock: **`29 · 21 · 29 · 0 · 0`, stable, ~7.4 s** — which is also *faster* than today's 14.5 s
baseline, because the critical section shrinks from BUG-044's whole read-migrate-write to ~1 ms.

Accepting a knowingly-stale `state.json` is not available as a trade here: **all 27 non-test readers
read that file**, and §2's own promise is *"Invalidate/Update: none — no consumer changes."* A cache
that silently drops transitions would make that promise false for every one of them, which is a
correctness regression in exactly the surface this CR claims to leave untouched.

**This preserves the human's OD-1 decision to ship.** It is a scope *correction* — the CR still
delivers its architectural gain (the truth becomes an append-only log that cannot lose a write);
what it does not deliver is the deletion of the lock, which was a consequence the item asserted
rather than measured.

Consequences, all recorded above: S4/S5 retained · M4 kick-back #4 struck · §1's
"structurally impossible" justification replaced.

### T6 — RULED: the event contract is PINNED here. A Developer may not choose differently.

Each of these bounces a correct implementation if left unstated — the exact failure mode this gate
caught on BUG-044.

| # | Pinned |
|---|---|
| **C1** | **`appendEvent(eventsFile, event)` — path first.** E6's runner hardcodes argv order; `(event, eventsFile)` or `(sprintDir, event)` bounces on a wiring error that says nothing about behaviour. |
| **C2** | **Genesis = the first event carries `from: null` plus an `initial: {…}` payload** holding the non-transition fields. Not a `snapshot` event kind, and not a fold that defaults every non-transition field — E7's event array is hand-built and hardcodes `initial:`. |
| **C3** | **`sprint_status` is carried on every event.** `validateShapeIgnoringVersion` requires it (`validate_state.mjs:39-41`) and the per-event field is the tests' only source. A sprint-level event stream fails E4 and E7. |
| **C4** | **A `kind` discriminator is REQUIRED**: `transition` \| `qa-bounce` \| `arch-bounce` \| `lane` \| `lane-demote`. The documented 9-field shape describes only `transition`, yet the other four are **4 of the 5** action branches and **5 of the 7** `atomicWrite` sites the eviction check forces through the fold. Shipping without this leaves the majority of the writer's behaviour undefined. |
| **C5** | **All five `last_action` strings reproduce verbatim**, including the U+2192 arrow in `transition ${id} → ${to}`. Literal at `update_state.mjs:278`, `:299`, `:316`, `:333`, `:364`. Only the first is currently enforced by any test. |
| **C6** | **Terminal `sprint_status` is `'Completed'`.** `close_sprint.mjs:1044` is the only writer; 25 of 25 closed sprints on disk carry it; none carries `Closed`. `state.schema.json:30` lists `"Closed"` as a prose *example*, not a written value — guarding both is harmless, guarding only `Closed` is wrong. |

---

## 4. Verification Protocol

**Command/Test:** `node --test .cleargate/scripts/state-scripts.test.mjs`

New cases, all required:

1. **Lost-update regression — inherited from [[BUG-044]], not authored here.** BUG-044 lands first inside M4 and ships the Red-first 20-way concurrency test plus a lockfile that closes the race. This CR must keep that exact test green **after** the lock is removed and replaced by the single-writer fold. Do not delete or weaken it; it is the property that survives the architecture change. (Same shape as [[BUG-042]] → [[STORY-054-05]] in M0.)
2. **Fold determinism.** `fold(events)` twice over the same log yields byte-identical output.
3. **Replay idempotency.** Appending a duplicate event with an already-seen `run_id` leaves the fold unchanged.
4. **Schema conformance.** The fold's output validates against `state.schema.json` unchanged.
5. **Legacy sprint immutability.** A sprint dir with `state.json` and no `events.jsonl` is not rewritten and does not throw.
6. **Atomic append.** Concurrent appends produce no interleaved or truncated lines; every line parses as JSON.

**§ AMENDMENT (orchestrator, 2026-08-29, per M4 §CR-106 Omissions 1-3 and `TPV RULING — BUG-044` T4).
Three cases are ADDED and the eviction check is widened. Nothing above is deleted.**

7. **NEW — byte compatibility with the current writer.** Drive a real transition sequence through the
   OLD path and the NEW path against identical seeds; assert the resulting `state.json` files are
   **byte-identical**. Case 4 (schema conformance) is strictly weaker and does not reach this.
   `close_sprint.mjs` is the largest single reader — it runs the lifecycle reconciler and the Step
   2.6d backsync — so §2's *"Invalidate/Update: none"* is only true if the fold's output is
   byte-compatible, not merely schema-valid. Kills any fold that reorders keys, changes indentation
   from `JSON.stringify(state, null, 2) + '\n'` (`update_state.mjs:78`), or drops a field the schema
   permits but does not require. **This is the case that protects the 27 readers.**
8. **NEW — the vacuity mutant.** Assert `fold()` receives **only** the event array and performs **no**
   read of `state.json`. Grep the module: `readFileSync` must appear only for `events.jsonl`.
   Kills *a "fold" that reads the existing `state.json` and merges into it* — which passes cases 2,
   3, 4 and 6, produces correct-looking output, and **reintroduces the exact read-modify-write race
   this CR exists to remove.** This is CR-106's most dangerous mutant and nothing in the original
   §4 catches it.
9. **NEW — eviction, both halves.** See the widened check below.

Two further scope clarifications, both **inside already-declared files** — no new surface:

- **`update_state.mjs:114-117` and `:120-123`** (`migrateV1ToV2` + `atomicWrite`, `migrateStateToV3`
  + `atomicWrite`) are two full `state.json` writes that happen **before** the action branch. Under
  this CR they are also `state.json` writes and must either route through the fold or be explicitly
  exempted with a stated reason. The original eviction check cannot see them — they call
  `atomicWrite`, not `readFileSync`.
- **`init_sprint.mjs:231-233`** seeds `state.json` with its own inline tmp+rename, duplicating the
  idiom rather than importing it. *"Seed `events.jsonl` at sprint init"* must not assume a shared
  helper exists. Either import from `state-events.mjs` (preferred — that is the new module's job) or
  duplicate deliberately and say so. `init_sprint.mjs` is already a declared surface, so collapsing
  the duplication is in scope.

**§ AMENDMENT (orchestrator, 2026-08-29, per the BUG-044 Architect post-flight — BUG-044 is merged
and every line citation in this CR is now stale).** `update_state.mjs` went **246 -> 371 lines** in
three insertion-only hunks. Offset map: lines `1-20` shift **+0**, `21-32` **+4**, `33-96` **+115**,
`97-246` **+125**. All eleven anchors this CR depends on, re-measured against the merged file:

| Cited here | Now | What it is |
|---|---|---|
| `:78` | **`:193`** | `JSON.stringify(state, null, 2) + '\n'` — case 7's byte-compatibility anchor |
| `:76-80` | **`:191-195`** | `atomicWrite` |
| `:99` | **`:224`** | the read the fold must evict |
| `:114-117` | **`:239-242`** | `migrateV1ToV2` + `atomicWrite` |
| `:120-123` | **`:245-248`** | `migrateStateToV3` + `atomicWrite` |
| `:187-189` | **`:312-314`** | auto-escalation at `BOUNCE_CAP` |
| `:204-206` | **`:329-331`** | auto-escalation, second site |
| `:227-229` | **`:352-354`** | the idempotency no-op that returns without writing |
| `:233-235` | **`:358-360`** | `newState === 'Done'` sets `worktree = null` |
| `:246` | **`:371`** | `main()` is synchronous top-to-bottom |
| `:52-66` | **`:167-181`** | `migrateV1ToV2`, exported, external caller surface |

**`:78-99` is no longer a contiguous span** — lines `212-221` are now the lock acquire. Rewrite it as
two citations, never one range. And the eviction grep now returns **seven** hits, not the few this
CR's §4 implied — read them all before concluding the read-modify-write is gone.

**§ AMENDMENT — THE TRAP (orchestrator, 2026-08-29, per the same post-flight, finding 2). This is
the most dangerous thing in this CR and no case as written catches it.**

The test harness's cross-process arrival barrier **arms on `fs.readFileSync` of the state file**
(`state-scripts.test.mjs:118-119`, target set at `:482`, `:600`, `:794`). **This CR deletes exactly
that read.** If it does so without re-targeting the barrier, the barrier never arms, S1 / S2 / the
migration addendum silently degrade to unsynchronised spawns, and **E1 reads green with the harness
disarmed** — the CR would appear to prove the race is gone while actually having removed the only
thing that could detect it.

**The tell is wall-clock, and it is unambiguous: a run reporting `15/15` in under 6 seconds has
disarmed the barrier, not fixed the race.** BUG-044's own post-fix baseline is **~14.6s** (measured
five times across Developer, QA-Verify and post-flight: 14.62-15.94s). **Any acceptance run for this
CR must report wall-clock alongside pass/fail, and a sub-6s green is a kick-back, not a success.**
Re-target the barrier onto whatever read or append the new writer actually performs.

**§ AMENDMENT — SUPERSEDED by the T3 ruling below. S4 and S5 are RETAINED, not deleted.**
An earlier amendment here ordered S4 (dead-pid lock is stolen) and S5 (live lock is respected)
deleted alongside the lock, on the premise that the event log removed the need for mutual exclusion.
**That premise is measured false** (see the §1 amendment above and T3). The lock is retained, so
S4 and S5 stay and stay green — TPV measured the retained-lock reference implementation at
`29 · 21 · 29 · 0 · 0`, both intact.

**M4 kick-back criterion #4 is STRUCK.** It reads *"BUG-044's 20-way test deleted, weakened, or
skipped"* and its parenthetical penalised *"keeping the lock 'just in case'"*. Keeping the lock is
now the ruled-correct outcome, not a hedge. The 20-way test's protection stands unchanged.

**One correction of scope, carried from TPV §4:** the BUG-044 post-flight named *"S4, S5 and T1"* as
the lock-only set. That is **one test too wide.** BUG-044's `T1` (`:527-567`) carries non-lock
content — exit codes and the `already Escalated` / `not found` stderr strings for two error paths.
Only its two `!existsSync(lockFile)` assertions would go vacuous. **T1 stays either way.**

**§ RESOLVED (orchestrator, 2026-08-29) — E5 vs the inherited migration addendum. The conflict is
an artefact of a restatement, not a real design tension, and the item settles it in its own words.**

The BUG-044 post-flight flagged that E5 and BUG-044's migration addendum assert opposite things: the
addendum seeds a **v1 `state.json` with no `events.jsonl`** and asserts migration happens, while E5
says *"a sprint dir with `state.json` and no `events.jsonl` is not rewritten and does not throw."*
Both cannot hold as stated.

**They do not actually conflict.** §2's last bullet — the human's decision — reads:
*"a sprint directory with `state.json` and no `events.jsonl` must keep working **read-only** (closed
sprints: SPRINT-03 ... SPRINT-38 ...) ... Chosen: **legacy-immutable — never rewrite a CLOSED
sprint's state.**"* The criterion the human chose is **closed-ness**. E5's restatement substituted
*"has no `events.jsonl`"* as a proxy for *"is closed"*, and it is that proxy — not the human's rule —
that collides with the addendum. A v1 `state.json` in an **active** sprint is not a legacy sprint;
it is a sprint mid-upgrade, and refusing to migrate it would make it impossible to adopt the event
log on any sprint already in flight.

**Ruling — E5 keys on closed-ness, and the addendum stands unchanged:**

1. **E5's predicate is `sprint_status` reaching its terminal value, NOT the absence of
   `events.jsonl`.** A dir whose `state.json` carries the terminal `sprint_status` is never
   rewritten and never has genesis events synthesised for it.
2. **A transition against an ACTIVE sprint still migrates and still writes**, exactly as
   `update_state.mjs` does today. BUG-044's addendum keeps its v1 seed and is **not** re-seeded at
   `schema_version: 3` — TPV measured it the sole killer of the skip-the-migration-writes mutant,
   and re-seeding it would forfeit the only coverage of `:239-242` / `:245-248`.
3. **E5's test fixture must therefore be a CLOSED sprint**, not merely one lacking a log — otherwise
   the scenario passes for the wrong reason and stops discriminating. Write it against a terminal
   `sprint_status`.
4. The human's stated concern was **read-time** genesis synthesis (*"The folder synthesises a genesis
   event set from the existing `state.json` on first append, or the sprint is treated as
   legacy-immutable"*). Nothing in this ruling permits synthesising genesis events on a read of any
   sprint, closed or active.

This narrows E5 rather than the addendum, which is the direction that preserves both the human's
decision and the mutant coverage. It is recorded here rather than left to a Developer, because
resolving it by whichever test gets touched last is exactly how the wrong half wins.

**§ PRECONDITION (per `TPV RULING — BUG-044` T4). This CR owes the RUNNER; BUG-044 owed the GREEN.**
`.cleargate/scripts/state-scripts.test.mjs` is invoked by nothing — `grep -rn "state-scripts"` across
the tree returns only planning documents. Adding a runner was outside BUG-044's three-row surface, so
it lands here. Three corrected facts, measured, for whoever wires it:

- post-fix wall-clock is **14-22s**, not the 5-10s the original estimate assumed;
- the file spawns **32 real node child processes** per run;
- it **must run single-concurrency** — S1's lock-serialization time is already within ~3s of S5's
  hard 10s ceiling, and a parallel runner closes that gap.

By the time this CR runs, the baseline is **`tests 15 · suites 13 · pass 15 · fail 0 · skipped 0`**
(BUG-044's post-fix line). Acceptance is those three numbers, reported verbatim.

**§ MITIGATIONS REQUIRED (human decision at the M4 planning halt, 2026-08-29).** The M4 Architect
recommended deferring this CR (OD-1): it replaces the write path for `state.json` while
`.cleargate/sprint-runs/SPRINT-39/state.json` is **live and being written by the running sprint**,
from a main checkout sitting on `sprint/S-39` — so from the moment this merges, the new writer is
the writer for this sprint's own waves 12 and 13, with zero soak time. **The human ruled: ship it,
with the mitigations.** The mitigations are cases **7**, **8** and **9** above, plus a named
rollback: `git revert -m 1 <merge commit>` in the outer repo — **never `git reset --hard`.**

**Eviction check — BOTH halves must pass:**
1. `command grep -n "readFileSync.*stateFile" .cleargate/scripts/update_state.mjs` returns nothing — the read-modify-write is gone, not merely guarded.
2. `command grep -n "atomicWrite(stateFile" .cleargate/scripts/update_state.mjs` returns **only** the fold's own call site — the `:116`/`:122` migration writes are not still on the old path.

**Parity check:** `diff .cleargate/scripts/state-events.mjs cleargate-planning/.cleargate/scripts/state-events.mjs` is empty (dogfood-split rule, CLAUDE.md).

---

## Context Source

**context_source:** Verified codebase grounding — `update_state.mjs:78-99` read-modify-write confirmed by direct read; `state.json` per-story field ownership confirmed against `.cleargate/sprint-runs/SPRINT-38/state.json`; 27 non-test readers enumerated by grep. Direct approval recorded in the design conversation of 2026-08-26, in which the append-only-plus-fold shape and the "no reader migration" adoption path were both proposed and accepted.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Ready for Execution**

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity. — none exist; EPIC-055 is drafted downstream of this CR and already records the dependency.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.

> **Gate 1 sign-off: approved 2026-08-26** by sandrinio, in the design conversation that produced this CR.
