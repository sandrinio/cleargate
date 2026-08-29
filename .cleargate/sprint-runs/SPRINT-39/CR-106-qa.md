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
