# CR-106 Developer report — execution state becomes an append-only event log

role: developer · SPRINT-39 · wave 11 · M4 · CR-106

Worktree `.worktrees/CR-106`, branch `story/CR-106`, base `ed924d7a` (QA-Red round 2), commit `d6edc45d`.

## Design kept

**T3(a) — the lock is RETAINED**, exactly as ruled in the item's `§ ORCHESTRATOR RULINGS`. The
critical section in `update_state.mjs` (`acquireLock` → `readStateDocument` → closed-sprint check →
in-memory migration → genesis synthesis (if needed) → the action's own event → `appendEvent` ×N →
`fold(readEvents(eventsFile))` → the ONE remaining `atomicWrite` call) is all held under BUG-044's
existing lockfile, unchanged retry/steal policy. `events.jsonl`'s own appends are lock-free (`O_APPEND`
atomicity, not `PIPE_BUF` — the code comment in `state-events.mjs` records the corrected guarantee).
BUG-044's S4/S5 (dead-lock-stolen / live-lock-respected) are **not deleted**; both green in every run.

## Numbers

`node --test .cleargate/scripts/state-scripts.test.mjs`, three separate sessions, six total runs, all
`tests 31 · suites 22 · pass 31 · fail 0 · skipped 0`:

| Run | duration_ms | wall |
|---|---|---|
| pre-mirror 1 | 16866.68 (had 2 fails — my own doc comments tripped E9's greps, fixed) | — |
| pre-mirror 2 | 16612.11 | 17s |
| pre-mirror 3 | 16773.24 | 17s |
| pre-mirror 4 | 16224.51 | 16s |
| post-mirror/drift-check 1 | 16054.41 | 16s |
| post-mirror/drift-check 2 | 16385.29 | 16s |
| post-mirror/drift-check 3 | 16059.48 | 16s |
| post-stash-restore a | 16261.06 | 16s |
| post-stash-restore b | 15987.22 | 16s |
| post-stash-restore c | 16836.93 | 17s |

Stable at **~16.0–16.8s**, well above the sub-6s disarm tell and consistent with TPV's own retained-lock
reference (`~7.3–7.6s`) once T1/T2/T4/T5's round-2 additions (two more 20-process barrier-synchronized
scenarios, E6's static check, Scenario 3's two new assertions) are folded into the total — TPV's own
§6 explicitly asked for the totals to be restated with those folded in.

**Red-without-the-change, verified by `git stash push --include-untracked`** (not by prediction):
`tests 31 · suites 22 · pass 15 · fail 16 · skipped 0` — matches the dispatch's stated baseline and
QA-Red's own measured baseline exactly. Stash popped, implementation restored, re-verified green.

## Eviction greps (independently re-measured, both required to change)

```
command grep -n "readFileSync.*stateFile" .cleargate/scripts/update_state.mjs   # 0 hits (was 1, :224)
command grep -n "atomicWrite(stateFile" .cleargate/scripts/update_state.mjs     # 1 hit, :428 (was 7)
```

The surviving legacy/migration read lives in a helper (`readStateDocument(docPath)`,
`update_state.mjs:222-224`) whose own line reads `fs.readFileSync(docPath, 'utf8')` — no `stateFile`
substring on that line. Per T7 (advisory): this is a naming convention the grep enforces, not a
behavioural difference; the read genuinely still happens, for the closed-sprint check and the v1→v3
migration, both of which real correctness requires.

**Gotcha hit and fixed:** my own doc-comment prose literally contained the substrings
`atomicWrite(stateFile` and `readFileSync.*stateFile` (describing the eviction greps in English), which
tripped the very tests they were describing. Rephrased both comments; confirmed via the same two `grep`
commands that only the real call site remains.

## A bug caught by manual review, not by any test

`state-scripts.test.mjs` has zero coverage of `init_sprint.mjs`'s new events.jsonl-seeding path beyond
"state.json still has the right stories/counters" (Scenario 1 never asserts `last_action`). My first
implementation hand-built `state.last_action = "Sprint ${sprintId} initialised"` in parallel with
synthesizing genesis events for `events.jsonl` — and `checkFoldDrift()` immediately flagged them as
disagreeing the moment I manually ran `init_sprint.mjs` then `validate_state.mjs` back to back: fold()'s
genesis case is `kind: 'transition'` by the item's own pin (C2 — not a separate "snapshot" kind), so
`fold(genesisEvents).last_action` reads `"transition <last-story-id> → Ready to Bounce"`, not
`"Sprint X initialised"`. Fixed by deriving `state.json` via `fold(genesisEvents)` instead of
hand-assembling it alongside them — the two now cannot drift by construction. Verified end-to-end with
a scratch sprint (`/tmp/cr106-init`): fresh init, `validate_state.mjs` → valid; a subsequent
`update_state.mjs` transition → valid; no re-synthesis of genesis on the second call.

**This changes visible UX**: a freshly-initialized sprint's `state.json.last_action` no longer reads
"Sprint X initialised" — it reads the transition string for the last story processed by
`synthesizeGenesisEvents`. No test pins the old string (verified: `grep -n "initialised" state-scripts.test.mjs` → 0 hits), but this is a real, deliberate behavior change flagged as `plan_deviations` below since it wasn't discussed with the orchestrator ahead of time — it fell directly out of the pinned genesis-as-transition contract (C2) once I insisted on drift-free-by-construction.

## Manual verification (review-only obligations — T9's --lane/--lane-demote gap)

`grep -n "\-\-lane" state-scripts.test.mjs` confirms 0 hits — TPV's T9 gap is real and untouched by QA-Red
round 2 (deliberately, per their report). Verified both action kinds by hand against a scratch sprint
(`/tmp/cr106-manual`): `--lane standard` correctly reads the story's pre-existing `lane: "fast"` from its
(synthesized) genesis `initial:` payload, flips it, and reproduces the exact pre-CR-106 `last_action`
string (`lane-set ${id}: lane=${value} (human-override)`) and stdout message. `--arch-bounce` then
`--lane-demote <reason>` correctly zero both bounce counters and reproduce
`lane-demote ${id}: "${reason}"` verbatim, including the escalation-adjacent counters reset. All four
`last_action` literal strings (`qa-bounce`, `arch-bounce`, `lane-set`, `lane-demote`) and the transition
one (C5, including the U+2192 arrow) live in `state-events.mjs`'s `fold()`, not in `update_state.mjs`
anymore — see the N7 table below for their new locations.

## N7 — line citations re-measured after this commit

`update_state.mjs` went **371 → 433 lines**. The five `last_action` literals moved out of this file
entirely (they now live in `state-events.mjs`'s `fold()`, since `fold()` derives `last_action`, not the
CLI script):

| Cited (pre-CR-106, in `update_state.mjs`) | Now |
|---|---|
| `:224` read the fold must evict | `update_state.mjs:222-224` (`readStateDocument`, helper) / call site `:282` |
| `:191-195` / `:193` `atomicWrite` + its byte format | `state-events.mjs:82-93` (moved into the shared module; also imported by `init_sprint.mjs`) |
| `:239-242` migrateV1ToV2 + atomicWrite | `update_state.mjs:307-312` (`migrateV1ToV2` call, no `atomicWrite` — evicted) |
| `:245-248` migrateStateToV3 + atomicWrite | `update_state.mjs:314-315` (call, no `atomicWrite` — evicted) |
| `:278` `lane-set` last_action literal | `state-events.mjs:252` |
| `:299` `lane-demote` last_action literal | `state-events.mjs:262` |
| `:312-314` qa-bounce auto-escalation | `state-events.mjs:235-236` (fold's `qa-bounce` case) |
| `:316` `qa-bounce` last_action literal | `state-events.mjs:238` |
| `:329-331` arch-bounce auto-escalation | `state-events.mjs:242-243` (fold's `arch-bounce` case) |
| `:333` `arch-bounce` last_action literal | `state-events.mjs:245` |
| `:352-354` idempotency no-op | `update_state.mjs:410-415` |
| `:358-360` `to==='Done' ⇒ worktree=null` | `state-events.mjs:269-270` (fold's `transition` case) |
| `:364` `transition` last_action literal | `state-events.mjs:271` |
| `:371` `main()` synchronous call | `update_state.mjs:433` |

The nine stale line-comment citations inside `state-scripts.test.mjs` itself (flagged by TPV T12 / the
BUG-044 post-flight Group C) are **not** touched — that file is QA-Red-owned and forbidden to me
(`## Forbidden Surfaces`); QA-Verify or a future round owns re-anchoring them.

## Files changed

- `.cleargate/scripts/state-events.mjs` (new) — `appendEvent`, `readEvents`, `fold`, `EVENT_SCHEMA`,
  `TERMINAL_SPRINT_STATUSES`, `genesisRunId`, `synthesizeGenesisEvents`, `atomicWrite`, `writeEventsFile`.
- `.cleargate/scripts/update_state.mjs` — write path rewritten to append + fold; closed-sprint refusal;
  both migration writes evicted onto the single fold-and-write call.
- `.cleargate/scripts/validate_state.mjs` — additive `checkFoldDrift(stateFile)`, wired into the CLI
  path only (not into the module-load-time-imported `validateState` export).
- `.cleargate/scripts/init_sprint.mjs` — seeds `events.jsonl` via `synthesizeGenesisEvents` +
  `writeEventsFile`; derives `state.json` via `fold(genesisEvents)` (drift-free by construction);
  collapsed its inline tmp+rename onto the shared `atomicWrite`.
- Byte-identical mirrors of all four under `cleargate-planning/.cleargate/scripts/` (verified via `diff`,
  same commit).
- **Not modified:** `state.schema.json`, `constants.mjs`, `state-scripts.test.mjs` (verified via
  `git diff --stat`, all three empty).

## flashcards_flagged

- `2026-08-29 · #event-log #danger · Hand-built state fields silently drift from fold() output -- always derive via fold(events), never build both paths.`
- `2026-08-29 · #test-harness #danger · A literal-text eviction grep can be tripped by prose IN A COMMENT describing the pattern, not just by code.`

## Script Incidents

None. All verification was direct `node --test` / `node --check` / manual `node <script>` invocations
in this worktree and in `/tmp/cr106-*` scratch sprint directories; no `run_script.sh`-wrapped script was
invoked.

## Round 2 (arch bounce — fold-drift floor)

role: developer · round 2 · SPRINT-39 · wave 11 · M4 · CR-106

**Base:** `d6edc45d`. **New commit:** see report header at close of this session (single amendment
commit on `story/CR-106`, no push, no merge, no `--no-verify`, no `dist/` rebuild).

### The fix, verbatim

`update_state.mjs` now imports `checkFoldDrift` from `validate_state.mjs` (already exported at
`:146`, previously dead — its only caller was that module's own CLI guard) and calls it immediately
after the closed-sprint check, before any migration, genesis synthesis, or append:

```js
const drift = checkFoldDrift(stateFile);
if (!drift.skipped && !drift.valid) {
  for (const e of drift.errors) process.stderr.write(`Error: ${e}\n`);
  process.stderr.write(
    `Refusing to fold: delete ${eventsFile} to re-synthesize genesis from state.json.\n`
  );
  process.exit(1);
}
```

`checkFoldDrift` itself was not touched (it already existed, byte-for-byte, from round 1). Its
`fs.existsSync(eventsFile)` skip gate is what satisfies requirement 1 (never fires on the genesis
path) for free — no separate genesis-detection logic was added at the call site. Requirement 2
(coverage, not equality) holds by construction of where I placed the call: it runs BEFORE this
invocation's own genesis synthesis and BEFORE its own action append, so it is comparing the
document as the PREVIOUS invocation left it (state.json) against fold() of the log as the PREVIOUS
invocation left it (events.jsonl) — two artifacts that a correct prior run always leaves
byte-identical (fold is deterministic, case 2). A byte-equality check at that specific checkpoint is
therefore never tripped by "a legitimate transition changes fields" — the transition about to
happen hasn't been folded into either side yet. It only fires when the pair was already
inconsistent before this invocation touched anything, which is exactly the missing-stories case: a
truncated or stale `events.jsonl` folds to fewer stories than the `state.json` beside it, byte
equality catches that as a strict special case of "does not cover," and refuses.

Total diff: one import-line addition, one 15-line guard block. No other file changed except the
`cleargate-planning/` mirror (byte-identical, confirmed via `diff`) and the CR item's own Task
Breakdown checkboxes (see below). `validate_state.mjs`, `state-events.mjs`, `init_sprint.mjs`,
`state.schema.json`, `constants.mjs`, and `state-scripts.test.mjs` are all untouched — confirmed via
`git diff --stat`, all empty except the two `update_state.mjs` copies.

### Requirement 1 — does not fire on genesis

Verified by direct repro, not by inspection alone. A byte-copy of the live
`.cleargate/sprint-runs/SPRINT-39/state.json` (18 stories, `sprint_status: "Active"`,
`CR-106.state: "Bouncing"`) with **no `events.jsonl` at all** (genesis path) was transitioned three
times, into three fresh scratch copies each time (a spent genesis dir cannot be re-run as genesis a
second time, since the first run creates the log):

```
Run 1: Updated CR-106: state="Done"    exit=0   events.jsonl: 19 lines   diff: 4 changed lines
Run 2: Updated CR-106: state="Done"    exit=0   events.jsonl: 19 lines   diff: 4 changed lines
Run 3: Updated CR-106: state="Done"    exit=0   events.jsonl: 19 lines   diff: 4 changed lines
```

Diff shape, every run, identical to the post-flight's own measured shape — exactly the four fields a
correct transition should change (per-story `state`, per-story `updated_at`, top-level
`last_action`, top-level `updated_at`):

```
139c139
<       "state": "Bouncing",
---
>       "state": "Done",
143c143
<       "updated_at": "2026-08-29T13:24:30.319Z",
---
>       "updated_at": "2026-08-29T13:29:16.442Z",
223,224c223,224
<   "last_action": "arch-bounce CR-106: arch_bounces=1",
<   "updated_at": "2026-08-29T13:24:30.319Z"
---
>   "last_action": "transition CR-106 → Done",
>   "updated_at": "2026-08-29T13:29:16.442Z"
```

(`last_action` reads `"arch-bounce CR-106..."` pre-transition rather than the post-flight's
`"transition CR-107 → Bouncing"` because the live sprint file has moved on between the post-flight's
review and this round-2 fix — the orchestrator's own arch-bounce of CR-106 landed in between. The
shape of the diff — four fields, nothing else — is what's being verified, and it is identical.)

### Requirement 2 — refuses on drift, never deletes

Same live-file byte-copy, this time with a **zero-byte `events.jsonl`** placed beside it (the
post-flight's exact repro), run three times against the same seed (state never advances on refusal,
so re-running the identical seed is valid — unlike the genesis case above):

```
Run 1: Error: state.json content differs from fold(events.jsonl) -- the derived cache has drifted
       from the event log (a hand-edit, or a write that bypassed update_state.mjs); the log at
       <scratch>/events.jsonl is the source of truth, re-run any update_state.mjs invocation to
       re-fold it
       Refusing to fold: delete <scratch>/events.jsonl to re-synthesize genesis from state.json.
       exit=1   stories on disk after: 18
Run 2: identical message, exit=1, stories on disk after: 18
Run 3: identical message, exit=1, stories on disk after: 18
```

No stray `.tmp.<pid>` or `.lock` file left behind after any of the three runs (`ls` on the scratch
dir shows only `state.json` + `events.jsonl`, both unchanged in byte count) — the lock's
`process.on('exit')` release fires cleanly on `process.exit(1)`, as it did before this change.

**Regression-proof by stash, not by prediction** (mandatory for non-trivial logic, per the dev
skill). `git stash push --include-untracked -- .cleargate/scripts/update_state.mjs` reverted the
file to `d6edc45d`'s state (confirmed: `grep checkFoldDrift update_state.mjs` → 0 hits), then the
exact same zero-byte-log repro was re-run against a fresh scratch copy of the same 18-story seed:

```
Updated CR-106: state="Done"    exit=0    stories on disk after: 1
```

Reproduces the post-flight's finding exactly — 17 of 18 stories silently deleted, exit 0, no
stderr. `git stash pop` restored the fix; `diff .cleargate/scripts/update_state.mjs
cleargate-planning/.cleargate/scripts/update_state.mjs` confirmed empty (parity intact) and
`node --check` passed on both files after the restore.

### Full suite, three runs (plus a fourth post-restore confirmation)

`node --test .cleargate/scripts/state-scripts.test.mjs`, all four runs `tests 31 · suites 22 ·
pass 31 · fail 0 · skipped 0`:

| Run | wall-clock |
|---|---|
| 1 | 16.4s |
| 2 | 17.6s |
| 3 | 17.5s |
| 4 (post stash-pop restore) | 17.4s |

Stable at ~16.4-17.6s, matching my own round-1 range (16.0-16.8s) and the post-flight's independent
21s measurement (both well above the sub-6s disarm tell) — the barrier is armed, the new drift check
adds one `readEvents` + one `fold` + one string comparison to the hot path per invocation, which is
consistent with the small additional per-run cost. No test file was modified (forbidden surface,
QA-Red-owned); the acceptance case the post-flight suggested ("seed a valid multi-story state.json,
truncate events.jsonl to zero bytes, assert exit 1 and state.json unchanged") was NOT added here —
it belongs to a future QA-Red pass, not to this dev round, per `## Forbidden Surfaces` and the
dispatch's explicit "Do not modify any test."

### Eviction greps — re-confirmed unaffected

```
command grep -n "readFileSync.*stateFile" .cleargate/scripts/update_state.mjs   # 0 hits (unchanged)
command grep -n "atomicWrite(stateFile" .cleargate/scripts/update_state.mjs     # 1 hit, :443 (was :428; +15 lines from the new guard)
```

### Task Breakdown

All nine rows in the CR item's `## Task Breakdown` were still `- [ ]` going into this round (round 1
never ticked them, though every underlying task was demonstrably complete — the round-1 report and
the post-flight both document each one done). Per the box-ticking-actor contract, I ticked all nine
in this round's commit, since I am the developer landing on this branch and no other agent will tick
them. Two rows got a one-sentence annotation rather than a bare checkmark:

- Row 1 ("...is 12/12/0") — the literal number in the row is stale; the item's own
  `§ PRECONDITION` section (authored well before this round) already corrects it to 15/13/0. Ticked,
  annotated, not silently checked against a number that was never true.
- Row 5 (fold-vs-file drift check) — landed round 1 as an exported-but-uncalled helper; this round
  is what wires it into the write path and makes it load-bearing, per the post-flight's own framing
  ("makes an existing helper load-bearing"). Annotated to reflect the two-round history rather than
  implying it was fully done in round 1.

### Out of scope, confirmed untouched

Per the dispatch's explicit "Do not fix these" list: `close_sprint.mjs` (CR-107's surface this same
wave), the retained-lock span/contention story (EPIC-055's problem), the eviction-grep-1
rename-vs-eviction distinction, `events.jsonl` gitignore/whitelist status, the `wave` field, and the
`actor: 'migration'` genesis-vs-adoption distinction. None of these files or behaviors were touched.
`git diff --stat` against `d6edc45d` shows exactly three files: the two `update_state.mjs` copies and
the CR item's own markdown (Task Breakdown ticks + the gate-check hook's automatic frontmatter
re-stamp, triggered by editing a `pending-sync/` file — not authored by me). An unrelated full
`cleargate wiki` re-ingest was triggered as a side effect of that same edit (pulling in several
wholly unrelated pending items into `wiki/index.md`); I reverted those four wiki files
(`git checkout --`) before committing, since they were out of this round's scope and not requested.

### flashcards_flagged (round 2)

- `2026-08-29 · #event-log #danger #load-bearing · An exported-but-uncalled safety check (checkFoldDrift) is not a safety check -- wire it into the write path in the SAME commit that exports it, or it protects nothing until someone remembers.`
