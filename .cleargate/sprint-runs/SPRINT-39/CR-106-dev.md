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
