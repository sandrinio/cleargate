# CR-106 QA-Verify report — execution state becomes an append-only event log

role: qa · SPRINT-39 · wave 11 · M4 · Mode: VERIFY · CR-106

STORY: CR-106

Worktree `.worktrees/CR-106`, branch `story/CR-106`, commit `d6edc45d` (parent `ed924d7a`, QA-Red
round 2). Re-ran everything myself; did not trust the Developer's or QA-Red's numbers without
independent reproduction.

## QA: PASS

## Independent re-run (3 runs, N10-compliant: redirected to a log file, status line read from the
completed file, never piped through `tail`/`head`)

`node --test .cleargate/scripts/state-scripts.test.mjs`, from the worktree:

| Run | tests | suites | pass | fail | skipped | duration_ms | wall-clock |
|---|---|---|---|---|---|---|---|
| 1 | 31 | 22 | 31 | 0 | 0 | 16280.67 | 17s |
| 2 | 31 | 22 | 31 | 0 | 0 | 16733.62 | 17s |
| 3 | 31 | 22 | 31 | 0 | 0 | 17171.92 | 17s |

Matches the Developer's own six runs (16.0–16.8s) and is well clear of the item's own sub-6s disarm
tell (`§ AMENDMENT — THE TRAP`) and of TPV's retained-lock reference (~7.3–7.6s) once T1/T2/T4/T5's
round-2 additions (two more 20-process barrier-synchronized scenarios, E6's static check, Scenario
3's two new assertions) are folded in, exactly as TPV's §6 asked for. Confirmed by name (not just
count) in run 1's log: all 15 inherited tests green and unmodified (Scenario 1/2/4/5/6, BUG-044
S1/T1/S2/S3/S4/S5/addendum), all 14 CR-106 E2–E9 reds now green, both round-2 additions (T4 canary,
E6 static check) green, Scenario 3's two new T1 assertions green.

TYPECHECK: n/a — `.cleargate/scripts/*.mjs` is not part of the `tsc` project; no typecheck command
applies to this surface (Test Stack's typecheck command targets `cleargate-cli/`, untouched by this
commit).

TESTS: 31 passed, 0 failed, 0 skipped (full file — this test file *is* the full CR-106 + inherited
BUG-044 suite; there is no narrower "package" to scope to for this surface).

## Adjudication of the declared plan deviation — ORCHESTRATOR RULING BASIS INDEPENDENTLY CONFIRMED

The Developer's deviation (init_sprint.mjs's fresh-sprint `last_action` now reads the transition
string for the last genesis event, not `"Sprint <id> initialised"`, because deriving `state.json`
via `fold(genesisEvents)` makes drift with the log structurally impossible) is **ACCEPTED**, and I
independently re-verified the orchestrator's stated basis rather than trusting it:

- `command grep -rn "last_action" .cleargate/scripts/*.mjs *.sh *.json` (both trees) → writers only:
  `state-events.mjs:295` (the fold's own field), `close_sprint.mjs:1045` (`close_sprint: sprint
  <id> completed`), `constants.mjs:24`/`state.schema.json` (schema comment/type), and `.sh`/`.mjs`
  **test fixtures** constructing throwaway `last_action: "test"`/`"fixture"` placeholders. No
  production branch or display reads the field's *value*.
- `command grep -rn "last_action" src/` in `cleargate-cli/`, `admin/`, `mcp/` → **zero hits in all
  three**, including `cleargate-cli/src/dashboard/collect.ts` (the one module that reads
  `state.json` for human display) — it consumes `state`, `sprint_status`, per-story fields, never
  `last_action`.
- Confirmed the resulting string is structurally correct, not merely unread: I ran
  `synthesizeGenesisEvents()`/`fold()` by hand (see below) and the genesis case is exactly `kind:
  'transition'` per the pinned C2 contract, so `fold(genesisEvents).last_action` is definitionally
  the last story's transition string — there is no "correct" alternative available to the
  Developer inside the drift-free-by-construction design.

**Ruling confirmed: cosmetic-only, zero consumers, correctly derived. Not a kick-back.**

## Fifteen implementation constraints — verified by reading the code, not by trusting green tests

1. **CONFIRMED.** `state-events.mjs:186` `export function fold(events)` — single parameter. No
   `state.json` read, no env var, no cwd lookup anywhere in the function body (`state-events.mjs:186-297`).
2. **CONFIRMED.** `state-events.mjs:227-231` — `if (!(storyId in stories)) { stories[storyId] =
   newStorySkeleton(); }` inside the `for (const event of events)` loop — insertion order is log
   order. No `Object.keys().sort()`, no `Set` round-trip anywhere in `fold()`.
3. **CONFIRMED.** `state-events.mjs:213` `if (event.ts != null && (maxTs === null || event.ts >
   maxTs)) maxTs = event.ts;`, returned as `updated_at: maxTs` (`:296`). Never `Date.now()`.
4. **CONFIRMED.** `state-events.mjs:207-210` — dedupe on `event.run_id` via a `Set`, `continue` on
   a seen id. Not `ts`, not `(story_id,to)`.
5. **CONFIRMED.** `state-events.mjs:291-297` return object literal key order: `schema_version,
   sprint_id, sprint_status, stories, last_action, updated_at`.
6. **CONFIRMED, and genuinely mutation-tested, not just structurally plausible.** `newStorySkeleton()`
   (`:172-181`) fixes `state, qa_bounces, arch_bounces, worktree, updated_at, notes`; `initial:`
   merge (`:283-289`) only sets a key `if (key in event.initial …)`, appended after `notes`.
   Verified twice: (a) by hand — my own `--lane`/`--lane-demote` runs below show the exact key
   order on disk; (b) by re-reading E7's frozen golden (`state-scripts.test.mjs:1290-1310`): the
   seed story (`makeStory()`, the pre-existing BUG-044 helper) carries **no** lane fields, and the
   golden's `STORY-FAKE-E7` entry correspondingly has **no** lane keys — so a mutant that injects
   default lane fields onto every story would fail this byte-compat assertion. Constraint #6 has
   real coverage via E7, not merely "looks right."
7. **CONFIRMED.** `state-events.mjs:82-93` `atomicWrite()`:
   ``` fs.writeFileSync(tmpFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8'); fs.renameSync(...) ```
   — identical bytes to the pre-CR-106 `update_state.mjs:78` format.
8. **CONFIRMED.** `state-events.mjs:270-271` `if (event.to === 'Done') story.worktree = null;`
   inside the `transition` case; `qa-bounce`/`arch-bounce` cases (`:233-244`) set `state =
   'Escalated'` at `>= BOUNCE_CAP`. Inherited Scenario 4 (both sub-tests) green in all 3 of my runs.
9. **CONFIRMED, byte-for-byte, against the pre-CR-106 original.** Diffed the five literals against
   `git show a9304776:.cleargate/scripts/update_state.mjs`: `lane-set ${id}: lane=${value}
   (human-override)`, `lane-demote ${id}: "${reason}"`, `qa-bounce ${id}: qa_bounces=${n}`,
   `arch-bounce ${id}: arch_bounces=${n}`, `transition ${id} → ${to}` (U+2192, confirmed via
   `python3` byte inspection: `\xe2\x86\x92`) — all five reproduced verbatim in
   `state-events.mjs:252/262/238/245/271`. Also reproduced live in my hand-run below.
10. **CONFIRMED.** `update_state.mjs:295-304` — `TERMINAL_SPRINT_STATUSES.includes(doc.sprint_status)`
    → `process.stderr.write(...)` + `process.exit(1)`, never a `throw`. Verified by hand (below):
    exit 1, `events.jsonl` never created, `state.json` byte-unchanged.
11. **CONFIRMED.** `state-events.mjs:167-170`'s carried-keys migration path + `update_state.mjs`'s
    in-memory `migrateV1ToV2`/`migrateStateToV3` calls (no longer their own `atomicWrite`) — the
    inherited "BUG-044 QA-Red addendum: concurrent invocations against a fresh v1 state.json"
    scenario passed green in all 3 of my runs, exercising exactly this path.
12. **CONFIRMED.** `state-events.mjs:69` `export function appendEvent(eventsFile, event) {
    fs.appendFileSync(eventsFile, ...); }`. E6's new static check (`state-scripts.test.mjs:1263-1272`)
    also passed in all 3 runs.
13. **CONFIRMED.** `state-events.mjs:139` `genesisRunId(sprintId, storyId) => \`genesis:${sprintId}:${storyId}\`` —
    deterministic, not `Math.random()`/`Date.now()`-derived.
14. **CONFIRMED.** `eventsFileFor(stateFile)` (`update_state.mjs`) = same directory as `state.json`,
    i.e. `.cleargate/sprint-runs/<sprint-id>/events.jsonl`; every event also carries `sprint_id`.
15. **CONFIRMED.** `state-events.mjs`'s module doc comment records "`O_APPEND` makes the seek-to-end
    and the write a single atomic operation with respect to other writers on the same regular
    file" and explicitly repudiates the original `PIPE_BUF` citation (512 on this machine, and
    governs pipes/FIFOs, not regular files). No `4096` or `PIPE_BUF` anywhere in the file.

## The checks no test performs — verified directly

- **T3(a) lock retention — CONFIRMED by reading the diff, not by the tests.** `update_state.mjs`'s
  `acquireLock(lockPath)` call (unmodified BUG-044 code, `:107-166`, untouched by this diff) still
  runs before `readStateDocument(stateFile)`, and the lock's `process.on('exit', …)` release
  handler fires only after `main()`'s synchronous body — including the final `fold(readEvents(...))`
  + `atomicWrite(stateFile, folded)` — returns (release is registered via `process.on('exit')`,
  not `finally`, specifically because the idempotent no-op path calls `process.exit(0)` directly —
  documented in the function's own comment, `:99-105`). The critical section genuinely covers
  read-log → fold → write-cache, matching T3(a)'s ruling exactly. Confirmed structurally, and
  confirmed empirically: 3/3 of my runs plus the Developer's 6/6 are flake-free at `31·22·31·0·0`
  — a lock-free fold would show ~1-in-5 flake per TPV's own §1.4 measurement, and none appeared.
- **S4/S5 present and green.** Confirmed by name in my run-1 log: `BUG-044 S4: stale lock (dead
  pid) is stolen...` and `BUG-044 S5: a live lock (this process's own pid) is respected...`, both ✔.
- **Null-implementation check — CONFIRMED genuine, not TPV's mutant #19 shape.** Read the full diff
  of `update_state.mjs`: it imports `appendEvent, readEvents, fold, synthesizeGenesisEvents,
  TERMINAL_SPRINT_STATUSES, atomicWrite` from `state-events.mjs` and *calls* all of them inside
  `main()`'s real control flow — `appendEvent(eventsFile, event)` per genesis/action event,
  `fold(readEvents(eventsFile))` then `atomicWrite(stateFile, folded)` as the file's one remaining
  write. Not import-then-ignore. Scenario 3's T1 assertions (events.jsonl exists + byte-match)
  additionally make this class of mutant fail a *named acceptance test*, not just my manual read.
- **`--lane`/`--lane-demote` re-verified BY HAND, independently** (T9: zero automated coverage).
  Built a scratch sprint (`state.json`, `schema_version: 3`, one story, no `events.jsonl`), set
  `CLEARGATE_STATE_FILE`, and ran both commands directly:
  - `--lane standard`: stdout `Updated STORY-QA-01: lane="standard",
    lane_assigned_by="human-override"`; on-disk `last_action`: `"lane-set STORY-QA-01: lane=standard
    (human-override)"`. Exact match to the pinned C5 string and the pre-CR-106 stdout format.
  - Built qa_bounces=1, arch_bounces=1, then `--lane-demote "repeated flake in CI"`: stdout
    `Updated STORY-QA-01: lane="standard", lane_demoted_at="...", qa_bounces=0, arch_bounces=0`;
    on-disk `last_action`: `"lane-demote STORY-QA-01: \"repeated flake in CI\""`; `qa_bounces` and
    `arch_bounces` both reset to `0` on disk. Exact match.
  - Resulting `state.json` story key order on disk: `state, qa_bounces, arch_bounces, worktree,
    updated_at, notes, lane, lane_assigned_by, lane_demoted_at, lane_demotion_reason` — matches
    constraint #6 exactly.
  T9's gap is real (still zero automated coverage) but the Developer's hand-verification claim is
  independently reproduced, not merely trusted.
- **Closed-sprint refusal — re-verified by hand.** Built a `sprint_status: "Completed"` fixture,
  ran a transition attempt: `stderr: "Error: sprint SPRINT-CLOSED is closed
  (sprint_status=\"Completed\"); state.json is immutable"`, exit 1, no `events.jsonl` created,
  `state.json` byte-unchanged on disk.
- **`checkFoldDrift` — re-verified by hand.** `validate_state.mjs` on the in-sync scratch sprint →
  valid, exit 0. On the closed-sprint fixture (no `events.jsonl`) → valid (skipped, not invalid),
  exit 0. Hand-edited `last_action` in `state.json` directly (bypassing `update_state.mjs`) →
  `validate_state.mjs` correctly reports "state.json content differs from fold(events.jsonl) —
  the derived cache has drifted..." and exits 1. All three of the Open Questions' human decision
  ("log wins, drift is flagged") behaviors confirmed live.
- **`atomicWrite` single-copy — CONFIRMED, correctly scoped.** `update_state.mjs`'s own local
  `atomicWrite(stateFile, state)` function (pre-CR-106) is deleted; both `update_state.mjs` and
  `init_sprint.mjs` now import it from `state-events.mjs` (`:90`), the only definition in the
  write-path surface this CR touches. Note for the record: `command grep -rn "^function
  atomicWrite" .cleargate/scripts/*.mjs` also finds unrelated private copies in
  `close_sprint.mjs`, `prefill_report.mjs`, `prep_qa_context.mjs`, `prep_reporter_context.mjs`,
  `suggest_improvements.mjs` — none of these write `state.json`, all pre-date and are out of scope
  for this CR. "Exactly one copy left" is correctly scoped to the state.json write path, not the
  whole `.cleargate/scripts/` tree.

## Eviction, mirrors, hygiene

- `command grep -n "readFileSync.*stateFile" .cleargate/scripts/update_state.mjs` → **0 hits**
  (was 1, `:224`). The surviving legacy/migration read lives in `readStateDocument(docPath)`
  (`:222-224`), whose own line reads `fs.readFileSync(docPath, 'utf8')` — no `stateFile` substring.
  Confirmed the final in-file comment text (T7's own advisory note, directly above the helper)
  does **not** itself contain the literal grep pattern — it describes the eviction grep in prose
  without reproducing `readFileSync.*stateFile` as a substring, so it does not self-trip.
- `command grep -n "atomicWrite(stateFile" .cleargate/scripts/update_state.mjs` → **1 hit**, `:428`
  (was 7: `:241,:247,:280,:301,:318,:335,:366`). Read the surrounding code: `:427-428` is
  `const folded = fold(readEvents(eventsFile)); atomicWrite(stateFile, folded);` — the fold's own
  write, exactly as claimed, not a stray leftover migration branch. The top-of-file docstring's
  prose ("There is exactly ONE `atomicWrite` call site left in this file...") also does not contain
  the literal `atomicWrite(stateFile` substring, so it does not self-trip either. Both greps pass
  for the right reason.
- Mirror parity, all four pairs, `diff`:
  - `.cleargate/scripts/state-events.mjs` vs `cleargate-planning/.cleargate/scripts/state-events.mjs` → **identical**
  - `.cleargate/scripts/update_state.mjs` vs `cleargate-planning/.cleargate/scripts/update_state.mjs` → **identical**
  - `.cleargate/scripts/validate_state.mjs` vs `cleargate-planning/.cleargate/scripts/validate_state.mjs` → **identical**
  - `.cleargate/scripts/init_sprint.mjs` vs `cleargate-planning/.cleargate/scripts/init_sprint.mjs` → **identical**
- `state.schema.json`, `constants.mjs`, `state-scripts.test.mjs` untouched **by the Developer's
  own commit**: `git diff --stat ed924d7a d6edc45d -- .cleargate/scripts/state.schema.json
  .cleargate/scripts/constants.mjs .cleargate/scripts/state-scripts.test.mjs` → empty. (Note: a
  diff against the wave-10 merge-base `a9304776` is non-empty for `state-scripts.test.mjs` — that
  740-line delta is QA-Red's own two-round contribution, not the Developer's; scoping the diff to
  the Developer's parent commit is what isolates the right claim.)
- The 15 inherited BUG-044 tests green (confirmed by name in my logs) and byte-unchanged (the test
  file has zero Developer edits, per the diff-stat above — nothing to check for drift beyond what
  QA-Red/TPV already validated in their own rounds).

## `npm --prefix cleargate-cli run prebuild` — the Developer's reasoning checked, not trusted

The Developer's stated reasoning ("prebuild is a Gate-4 step; nothing in `cleargate-cli/` was
edited") is **correct**, but I verified the *reason it's correct* is not the naive one — a cli test
can read outer-repo files without `cleargate-cli/` itself being touched. Checked both directions:

1. **`skill-md-conditional-architect.red.node.test.ts` S5** — the payload-parity test the dispatch
   named — only compares `cleargate-cli/templates/cleargate-planning/.claude/skills/sprint-execution/SKILL.md`
   against canonical `SKILL.md`. CR-106 never touches `SKILL.md`. **Not affected**, and never was.
2. **The one test that DOES byte-compare one of CR-106's four files**:
   `test/scaffold/canonical-live-parity.red.integration.node.test.ts` Scenario 2 compares canonical
   `cleargate-planning/.cleargate/scripts/validate_state.mjs` against the OUTER repo's own **live**
   `.cleargate/scripts/validate_state.mjs` (not the npm payload) — and this CR's commit updates
   both trees identically in the same commit (confirmed above), so this scenario stays green
   whenever it runs, merged or not. It is also moot for gating purposes regardless: the filename
   matches `run-default-tests.mjs`'s `!test/**/*.integration.node.test.ts` exclusion, so it is
   **not** part of the `npm --prefix cleargate-cli test` command Test Stack designates as the
   gating suite.
3. Searched the default (non-integration) suite for any `.cleargate/scripts/{state-events,
   update_state,validate_state,init_sprint}.mjs` dependency: `migrate-schema-v3.red.node.test.ts`
   imports `_migrate-schema-v3.mjs` directly — a file CR-106 never touches (confirmed via the
   Developer's own diff --stat: not in the changed-files list). No other default-suite file
   references these four scripts.

**Finding: no default-gating cli test goes red because of this commit, now or after merge.** The
Developer's decision not to run `prebuild` is safe as stated. I did not run the full ~2493-test cli
suite myself (not warranted — the specific risk named in the dispatch is resolved analytically by
reading the relevant test files, and this CR touches zero `cleargate-cli/` source).

## N7 — citation accuracy spot-check

Spot-checked 4 of the Developer's N7 table rows against the merged file directly:
- `update_state.mjs:222-224` (`readStateDocument`) — confirmed, matches.
- call site `:282` (`doc = readStateDocument(stateFile);`) — confirmed, matches.
- `:410-415` (idempotency no-op) — confirmed, matches exactly (lines 408-416 read, no-op logic at
  the cited span).
- `:433` (`main()` synchronous call) — confirmed, file is 433 lines, last line is `main();`.

## Task Breakdown (EPIC-054 WS7, advisory)

CR-106's own `## Task Breakdown` section (9 rows) is **entirely unchecked** (`- [ ]`) in the item
file as of this QA pass. All 9 rows are in fact done — confirmed against the commit and this
report's own findings (BUG-044 merged and 15/12/0 baseline reproduced by QA-Red; `state-events.mjs`
created with the pinned signatures; QA-Red authored E2-E9 by measurement; `update_state.mjs`
rewritten and both migration writes routed through the fold; `validate_state.mjs` extended
additively; `events.jsonl` seeded in `init_sprint.mjs` with the duplicated tmp+rename collapsed;
all four mirrors byte-identical in the same commit; both eviction greps pass, numbers recorded
verbatim; N7 citations re-measured). Per policy this is **advisory in v1** — reported, not a
kick-back reason on its own. Recommend the orchestrator check the 9 boxes on ingest.

## MISSING

None. All 14 CR-106 scenarios (E2×3, E3×3, E4, E5, E6, E7, E8×2, E9×2) plus the round-2 additions
(T1's two Scenario-3 assertions, T2's frozen-golden E7, T4's canary, T5's barrier+static pair, T8's
no-op-appends-nothing) are green. Red-now-green mapping: every one of the 14 originally-red QA-Red
scenarios is now passing against the Developer's commit; no separate "green-path" file exists or is
required (CR-081 red-now-green clause).

## REGRESSIONS

None. All 15 inherited BUG-044 tests green across all 3 of my independent runs, byte-unchanged test
file. No flakiness observed (3/3 clean; combined with the Developer's 6/6, that's 9/9 clean runs on
record for this exact commit).

## ACCEPTANCE_COVERAGE

31 of 31 tests passing map to acceptance: 15 inherited (BUG-044's own, protected per the item's own
§4 case 1) + 16 CR-106-owned (14 original E2-E9 + T4 canary + E6 static check, with T1's 2
assertions folded into Scenario 3 rather than counted as separate tests, and T2's fix folded into
E7 rather than adding a test).

## Script Incidents

None. All verification was direct `node --test` (redirected to log files) and manual `node
<script>` invocations against scratch fixtures in the QA scratchpad; no `run_script.sh`-wrapped
script was invoked (consistent with Developer's and QA-Red's own reports for this same surface).

## VERDICT

Ship it. All fifteen pinned implementation constraints verified by direct code inspection (not
inference from green tests). T3(a)'s lock retention, S4/S5's survival, the null-implementation
risk, and the `--lane`/`--lane-demote` hand-verified gap were all independently re-confirmed rather
than taken on the Developer's or QA-Red's word. The declared plan deviation (init_sprint.mjs's
`last_action` string) is correctly ruled ACCEPTED — I independently re-derived the "zero non-test
readers" finding via my own greps across `.cleargate/scripts/`, `cleargate-cli/src/`, `admin/src/`,
`mcp/src/`, all empty. The one open risk the dispatch specifically asked me to chase down
(`npm run prebuild` skip vs. the cli suite) resolves cleanly: the named test doesn't touch this
CR's files, the test that does touch one of them stays green regardless (identical trees) and is
excluded from the gating command anyway. Only finding of note is advisory: the CR item's own Task
Breakdown checkboxes were never ticked — cosmetic, does not affect the shipped code.

## flashcards_flagged

- "2026-08-29 · #test-harness #reuse · 'Exactly one atomicWrite copy left' must be scoped to the write-path a CR touches -- 5 unrelated scripts each keep their own private atomicWrite, correctly out of scope."

---

## Round 2 — verifying the arch post-flight fix

role: qa · SPRINT-39 · wave 11 · M4 · Mode: VERIFY (round 2, post arch-bounce) · CR-106

Worktree `.worktrees/CR-106`, branch `story/CR-106`. Base of this round: `d6edc45d` (my own round-1
PASS). New commit: `c84a0958`. Scope: the fix and its blast radius only — the fifteen round-1
constraints were not re-derived, only checked for disturbance.

## QA: PASS

## The diff, confirmed minimal

`git diff --stat d6edc45d c84a0958` (in the worktree): exactly three files — the two
`update_state.mjs` copies (outer + `cleargate-planning/` mirror, +17/-0 each) and the CR item's own
markdown (Task Breakdown ticks + an automatic gate-check frontmatter re-stamp, not hand-authored).
`git diff --stat` on each of `state.schema.json`, `constants.mjs`, `state-scripts.test.mjs`,
`validate_state.mjs`, `state-events.mjs`, `init_sprint.mjs` individually between the two commits →
**all six empty**. `checkFoldDrift` itself is untouched — it existed byte-for-byte since round 1; the
only change is one new import + a 15-line guard block in `update_state.mjs`, placed at `:307-320`,
immediately after the closed-sprint check (`:300-305`) and before migration/genesis/append.

## Requirement 1 — reproduced the refusal myself, in scratch, never against the real sprint file

Copied the live `.cleargate/sprint-runs/SPRINT-39/state.json` (verified 18 stories) to a session
scratchpad dir, placed a zero-byte `events.jsonl` beside it, ran the fixed script:

```
$ CLEARGATE_STATE_FILE=<scratch>/state.json node .cleargate/scripts/update_state.mjs CR-106 Done
exit=1
stderr: Error: state.json content differs from fold(events.jsonl) -- the derived cache has drifted
        from the event log (a hand-edit, or a write that bypassed update_state.mjs); the log at
        <scratch>/events.jsonl is the source of truth, re-run any update_state.mjs invocation to
        re-fold it
        Refusing to fold: delete <scratch>/events.jsonl to re-synthesize genesis from state.json.
```

Non-zero exit, named stderr error, `state.json` byte-diffed against the original — **identical, all
18 stories intact.** No `.lock` or `.tmp.<pid>` file left in the scratch dir. Re-ran the same refusal
a second time on the same seed — same result, no accumulated lock.

## Requirement 2 — not a bare throw

Inspected the captured stderr bytes directly (not just eyeballed): `'\n    at '` (the E5 stack-frame
tell) is **absent** from the stderr stream, both greppped and via a byte-level Python check. Two
clean `Error: ...` / `Refusing to fold: ...` lines, nothing else. Controlled `stderr.write` +
`process.exit(1)`, confirmed, not inferred from the source read alone.

## Requirement 3 — load-bearing, independently re-derived (not trusted from the Developer's stash)

Built my own pre-fix copy of `update_state.mjs` (`git show d6edc45d:.cleargate/scripts/update_state.mjs`
into a scratch copy of the scripts dir — confirmed zero `checkFoldDrift` references), ran it against a
**fresh copy of the same 18-story seed** with the same zero-byte `events.jsonl`:

```
$ node <scratch-scripts-prefix>/update_state.mjs CR-106 Done   # CLEARGATE_STATE_FILE=<fresh-copy>
Updated CR-106: state="Done"
exit=0
```

Story count after: **1**. The survivor's `lane`/`lane_assigned_by`/`lane_demoted_at`/
`lane_demotion_reason` fields are gone (checked the actual JSON, not just the count). This is an
independent reproduction, not a re-statement of the Developer's number — same seed, my own
pre-fix binary, my own scratch dir. **The check is load-bearing.**

## Requirement 4 — genesis path unaffected

Fresh scratch copy of the live seed, **no `events.jsonl` at all**, ran the fixed script:

```
exit=0, stdout: Updated CR-106: state="Done"
events.jsonl: 19 lines (18 genesis + 1 action)
stories after: 18
```

Diff against the pre-existing original — exactly the same 4-line shape the post-flight and the
Developer both measured (per-story `state`, per-story `updated_at`, top-level `last_action`,
top-level `updated_at`). Confirmed: the new check never fires on this path (its own
`existsSync(eventsFile)` skip gate).

## Requirement 5 — floor is coverage, not equality (tested the claim, not just read it)

Against the now-consistent pair produced by the genesis run above:

1. `CR-108 → Bouncing` (already in that state) → clean no-op, exit 0, `events.jsonl` unchanged at 19
   lines (idempotency path, not the drift path).
2. `CR-110 → Bouncing` (real transition, `Ready to Bounce → Bouncing`) → **succeeded**, exit 0,
   `events.jsonl` grew 19 → 20, all 18 stories retained, `CR-110.state === "Bouncing"` on disk.

A real, field-changing transition against a consistent pair is never refused. This directly tests
the Developer's placement argument (compares a previously-consistent pair, before this invocation's
own writes) rather than accepting the argument on prose alone.

## Full suite — 3 independent runs, wall-clock

`node --test .cleargate/scripts/state-scripts.test.mjs`, redirected to log files, status line read
from the completed log:

| Run | tests | suites | pass | fail | skipped | wall-clock |
|---|---|---|---|---|---|---|
| 1 | 31 | 22 | 31 | 0 | 0 | 17.62s |
| 2 | 31 | 22 | 31 | 0 | 0 | 20.25s |
| 3 | 31 | 22 | 31 | 0 | 0 | 22.15s |

Unchanged at `31·22·31·0·0`. All three well above the sub-6s disarm tell (barrier armed); this
session's wall-clock ran a bit higher than the Developer's 16.4-17.6s range, consistent with local
machine load, not a behavioral change (test *count* and pass/fail are what's load-bearing here, and
they match exactly).

## No test modified

`git diff --stat d6edc45d c84a0958 -- <file>` run individually for `state-scripts.test.mjs`,
`state.schema.json`, `constants.mjs` → **all three empty**, confirmed directly (not re-stating the
Developer's own diff-stat claim).

## Two-tree parity

`diff .cleargate/scripts/update_state.mjs cleargate-planning/.cleargate/scripts/update_state.mjs` in
the worktree → **empty**. Identical.

## Round-1 constraints checked for disturbance (not re-derived)

- **`fold()` still pure in its single array argument** — `state-events.mjs` has a zero diff between
  `d6edc45d` and `c84a0958`; the function this round's guard calls (`checkFoldDrift`) reads
  `state.json` + `events.jsonl` from disk itself, outside `fold()`, and passes only the parsed event
  array into `fold()`. Purity undisturbed by construction (file untouched).
- **Lock still encloses read-log → fold → write-cache** — read the surrounding code directly:
  `acquireLock(lockPath)` at `:274`, the new guard at `:313-320`, sits between the closed-sprint check
  (`:300-305`) and the migration/genesis/append/fold/write block that follows, all inside the same
  `main()` body the lock spans. The new call site is strictly inside the existing span, not outside
  or after it.
- **`process.on('exit')` release still fires on the new refusal exit path** — this is the new in-lock
  exit site BUG-044's T1/M6 finding was about. Directly tested: after both refusal runs above (a
  fresh seed and a repeat run on the same seed), `ls` on the scratch dir shows **no `.lock` file**
  either time. Lock release confirmed on this specific exit path, not assumed from the general
  `process.on('exit')` mechanism.

## Adjudication of the two declared deviations

- **Reverted wiki re-ingest side effects (4 files).** `git show --name-only c84a0958` contains **zero**
  paths under `.cleargate/wiki/` — confirmed directly, not taken on the Developer's word. Whatever the
  wiki rebuild pulled in from unrelated pending items is derived-cache content keyed off those other
  items' own files, not authored content belonging to this CR; reverting it before commit was correct
  and nothing authored was lost (the commit's only markdown change is the CR-106 item file itself).
- **Ticked Task Breakdown rows, merge-resolved to the Developer's version.** Read the file directly:
  no conflict markers (`<<<<<<<`/`=======`/`>>>>>>>`) anywhere in
  `CR-106_Execution_State_Event_Log.md`. All nine rows are `- [x]`, and the two annotated rows match
  the description exactly — row 1 corrects the stale "12/12/0" to the item's own already-stated
  15/13/0 baseline; row 5 notes the two-round history (exported-but-uncalled round 1, wired round 2).
  File is coherent.

## Blast radius — cli suite

No new re-check needed: the only production file touched this round (`update_state.mjs`) is a strict
subset of what round 1's blast-radius sweep already covered (round 1's Architect post-flight built a
scratch meta-root and ran the full 314-test cli suite against all four scripts including
`update_state.mjs`, finding zero CR-106-caused regressions). This round adds one new call to an
already-imported module (`validate_state.mjs`, already an import in `d6edc45d`) with no new external
dependency. `cleargate-cli/` remains absent from the worktree (confirmed, per flashcard
`#worktree #collision-surface #danger`) — nothing new to spawn-path-test that round 1 didn't already
clear. `node --check` passes on both the outer and mirrored `update_state.mjs`.

## MISSING

None — this round verifies a bugfix to existing write-path behavior, not new acceptance scenarios.
The post-flight's own suggested acceptance test ("seed a valid multi-story state.json, truncate
events.jsonl to zero bytes, assert exit 1 and state.json unchanged") was correctly NOT added by the
Developer (forbidden surface, QA-Red-owned) — I verified that exact scenario by hand instead
(Requirement 1/3 above), which is the QA-Verify substitute for a missing automated case on a
Forbidden Surface.

## REGRESSIONS

None. Full suite stable at `31·22·31·0·0` across 3 runs; all fifteen round-1 constraints undisturbed
per the targeted checks above.

## Script Incidents

None. All verification was direct `node --test` (redirected to log files), `node --check`, `git show`
/`git diff` read-only queries, and manual `node <script>` invocations against scratch fixtures in the
QA scratchpad (never against the live `.cleargate/sprint-runs/SPRINT-39/state.json` itself — only
byte-copies of it). No `run_script.sh`-wrapped script was invoked.

## VERDICT

Ship it. The fix closes exactly the hole the post-flight measured: reproduced the refusal
independently (18/18 intact, exit 1, named stderr, no stack frame, no stray lock), independently
re-derived load-bearing-ness against my own pre-fix copy of the script (not the Developer's stash),
confirmed the genesis path is untouched (same 4-line diff shape), and tested — not merely read — the
coverage-not-equality claim with two real transitions against a consistent pair (idempotent no-op and
a field-changing transition, both succeeded). The three round-1 constraints most exposed by a new
in-lock call site (fold purity, lock span, exit-path lock release) are all confirmed undisturbed. Both
declared deviations (reverted wiki side effects, Task-Breakdown merge resolution) check out on direct
inspection — no conflict markers, no authored content lost, no wiki paths in the commit. Diff is
exactly as narrow as claimed: one file's write path plus its mirror plus the item's own bookkeeping.

## flashcards_flagged

- "2026-08-29 · #qa #test-harness · Testing a 'refuses only on drift, never on a legit transition' claim requires RUNNING a real state-changing transition against a consistent pair, not just reading the call-site placement argument."
