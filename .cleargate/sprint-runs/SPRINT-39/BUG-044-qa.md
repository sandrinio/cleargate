# BUG-044 — QA-Verify report

role: qa · SPRINT-39 · wave 10 · M4 · Mode: VERIFY

Subject: `.worktrees/BUG-044` @ `871270d1` (branch `story/BUG-044`, not yet merged to `sprint/S-39` at time of verify).

## Independent re-run — `node --test .cleargate/scripts/state-scripts.test.mjs`, worktree, 4 consecutive runs

(Ran in `.worktrees/BUG-044`, not the main checkout — the main checkout does not yet carry the
fix; confirmed by an initial mis-run against the main checkout that reproduced the pre-existing
`pass 7 · fail 1` baseline and was discarded once the mismatch was diagnosed.)

| Run | tests | suites | pass | fail | skipped | exit | wall-clock |
|---|---|---|---|---|---|---|---|
| 1 | 15 | 13 | 15 | 0 | 0 | 0 | 15.88s |
| 2 | 15 | 13 | 15 | 0 | 0 | 0 | 15.45s |
| 3 | 15 | 13 | 15 | 0 | 0 | 0 | 15.51s |
| 4 | 15 | 13 | 15 | 0 | 0 | 0 | ~15s |

Captured to log files under the scratchpad, read after completion (N10 respected — no `tail`/`head`
piped on a live runner). No leftover `state.json.lock` anywhere under the repo after any run
(`find … -name state.json.lock` empty). Worktree `git status --porcelain` clean after all four runs.
Matches the Developer's reported `15/15/0/0` (14.95s/15.94s/14.62s) and TPV's REF-C prediction
(`14/14/0 in 4/4 runs, ~14s` — +1 for T1).

## Check 1 (load-bearing) — release strictly after `renameSync` returns

Read `git show 871270d1 -- .cleargate/scripts/update_state.mjs` in full. Release is registered as:

```js
process.on('exit', () => {
  try {
    fs.unlinkSync(lockPath);
  } catch {
    // Already released, or stolen by another process after a crash -- nothing to do.
  }
});
```

registered once, immediately inside `acquireLock()` on successful acquire (`fs.writeSync(fd, payload); fs.closeSync(fd); process.on('exit', …)`). `main()` is fully synchronous; the handler cannot run until the Node process begins its exit sequence, which cannot happen until the synchronous body of `main()` — including every `atomicWrite()` call (`writeFileSync` + `renameSync`) on every action branch and both migration branches — has already returned, whether `main()` returns normally or reaches one of its `process.exit()` calls. There is no code path where the `'exit'` handler can fire before a `renameSync` in progress has completed. **CONFIRMED** — release cannot precede `renameSync` returning.

## Check 2 (load-bearing) — critical section encloses `:116`/`:122`-equivalent (the two migration writes)

Read the committed `main()`. Lock acquire (`acquireLock(lockPath)`) is called at the point immediately after the `existsSync` guard and immediately before `JSON.parse(fs.readFileSync(stateFile, …))` — i.e. before the original `:99` read. Both migration `atomicWrite()` calls (v1→v2 at the post-`if (state.schema_version === 1)` branch, v2→v3 at the `migrateStateToV3` branch) execute after the acquire and before any `process.exit`/return that would trigger release. **CONFIRMED** — both migration writes are inside the held window, not just the five action-branch writes.

## Eleven lock-design constraints — read from the diff, each CONFIRMED

1. `openSync(lockPath, 'wx')` — **CONFIRMED**, `fs.openSync(lockPath, 'wx')`.
2. Acquire before the `:99`-equivalent read — **CONFIRMED**, acquire precedes `JSON.parse(fs.readFileSync(...))`.
3. Critical section encloses both migration writes — **CONFIRMED** (Check 2 above).
4. Release via `process.on('exit')` registered immediately at acquire, not `finally` — **CONFIRMED**, no `finally` anywhere in the diff; registration is the last statement inside the success branch of `acquireLock()`.
5. Release fires on all ten in-lock exit sites — **CONFIRMED by enumeration.** Post-acquire `process.exit()` call sites in the committed file: `:227` (parse error), `:235` (pre-migration invalid shape), `:255` (post-migration invalid), `:260` (story not found), `:271` (`--lane` bad value), `:291` (`--lane-demote` missing reason), `:309` (`--qa-bounce` already-Escalated), `:326` (`--arch-bounce` already-Escalated), `:348` (invalid state literal), `:354` (idempotent no-op) — **ten**, matching TPV's corrected count. `:157` (usage) and `:209` (existsSync guard) fire *before* acquire and are correctly excluded. All ten are process-wide `process.on('exit')`, which does not distinguish exit site — coverage is structural, not per-site.
6. Release strictly after `renameSync` returns — **CONFIRMED** (Check 1 above).
7. Steal guarded by both pid liveness and an age ceiling — **CONFIRMED.** `isPidAlive()`: `ESRCH` → dead (stealable); any other error including `EPERM` → returns `true` (alive, do not steal) — explicit comment states this. `stale = !alive || ageMs > LOCK_STALE_AGE_MS` with `LOCK_STALE_AGE_MS = 5 * 60 * 1000` (5 minutes), commented as a "backstop steal for a live-LOOKING lock whose pid has been recycled" — liveness is primary, age is the backstop, as required.
8. Lock path exactly `` `${stateFile}.lock` `` — **CONFIRMED**, `const lockPath = \`${stateFile}.lock\`;`, no global path.
9. Per-holder retry budget, 2000ms, reset on holder-identity change — **CONFIRMED.** `LOCK_RETRY_BUDGET_MS = 2000`; `holderKeyNow = \`${pid}:${lockInfo.at}\``, deadline reset only `if (holderKeyNow !== holderKey)` — keyed on the lock payload's `pid`+`at` pair, not on elapsed time or attempt count.
10. `Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)` for retry sleep — **CONFIRMED**, `sleepSync()` uses exactly this form.
11. One `openSync` + one `unlinkSync` on the happy path; lock read only on `EEXIST` — **CONFIRMED.** Uncontended path: single `openSync`, `writeSync`, `closeSync`; the lock payload is only read (`readFileSync`, not `statSync`, but no extra filesystem probe beyond the one read) inside the `catch (err) { if (err.code !== 'EEXIST') throw err; … }` branch. No `statSync` added anywhere.

## Also verified

- **Mirror parity.** `diff .cleargate/scripts/update_state.mjs cleargate-planning/.cleargate/scripts/update_state.mjs` (worktree) — **empty**.
- **Three-row surface.** The six BUG-044 commits (`5c96f2b4`, `e9e3b87a`, `fd5479c7`, `e55431ec`, `fe13d30f`, `871270d1`) touch, in total, exactly: `.cleargate/scripts/state-scripts.test.mjs`, `.cleargate/scripts/update_state.mjs`, `cleargate-planning/.cleargate/scripts/update_state.mjs`. No fourth file. `.gitignore` diff between branch point and HEAD is empty — no `state.json.lock` ignore rule added (T6 respected).
- **No test scenario edited except T5.** Commit A (`5c96f2b4`) diff: exactly the two-assertion `schema_version`/`SCHEMA_VERSION` swap, imports for later commits, no other assertion touched. Round-2 commit (`fe13d30f`) diff against round-1 HEAD (`e55431ec`): the new `BUG-044 T1` describe/test block, plus **message-string-only** rewrites on S1/addendum failure text (T3's misattribution fix) — zero assertion logic changed. Developer's commit (`871270d1`) touches the test file for exactly one line: T5's stale title (`schema_version=1` → `schema_version=SCHEMA_VERSION`) at what is now `:186`. Confirmed via `git show` on each commit.
- **`state-scripts.test.mjs:90`-equivalent (now `:205-206`)** — two-assertion form present: `assert.strictEqual(state.schema_version, SCHEMA_VERSION, …)` and `assert.strictEqual(SCHEMA_VERSION, 3, …)`, with `SCHEMA_VERSION` imported from `./constants.mjs`. Not a bare literal, not self-fulfilling.
- **QA-Red's T1 case stays green.** Confirmed green in all four independent runs; Developer's commit does not touch it.
- **S3 green.** Confirmed in all four runs — the release-mechanism tripwire holds.
- **No leftover lock** after any of my four runs, repo-wide `find` empty.
- **Blast radius.** `git diff` against `state.schema.json`, `validate_state.mjs`, `_migrate-schema-v3.mjs`, `constants.mjs`, `init_sprint.mjs`, `close_sprint.mjs` between branch point and HEAD is empty — none of the 27 non-test readers touched. `migrateV1ToV2` export signature unchanged (still `export function migrateV1ToV2(state)`); `atomicWrite`'s per-process tmp naming unchanged (still `` `${stateFile}.tmp.${process.pid}` ``) — no "hardening" added.
- **Acceptance Gherkin / DoD (item §5).** Case 1 (20-concurrent) → S1 green. Case 2 (same-story) → S2 green (rescoped comment, not a mutant-guard, per T2 — correct). Case 3 (existing stays green) → Scenarios 1–6 green in all runs. Case 4 (stale lock) → S4/S5 green. Case 5 (carry-forward for CR-106) → process note, not applicable to QA.
- **Task Breakdown (advisory, EPIC-054 WS7).** The main-checkout copy of `BUG-044_Update_State_Lost_Update_Race.md` still shows all seven `- [ ]` rows unchecked — expected pre-merge state (checkboxes are typically flipped post-merge/DevOps, and the branch is not yet merged at time of this verify); not a bounce reason per the advisory-in-v1 instruction.

## Not independently re-verified

TPV's out-of-tree mutation battery (M1–M9, ten mutants, 8 killed / 2 accepted residuals) was not
re-run — that is TPV's own sandboxed, destroy-after-use method (`.cleargate/sprint-runs/SPRINT-39/BUG-044-tpv.md`
§0). QA-Verify's job per this dispatch was to re-run the shipped suite and read the diff for the
two mutant-proof-only constraints (checks 1–2 above), both done.

## Commands run, verbatim

```
node --test .cleargate/scripts/state-scripts.test.mjs   (worktree .worktrees/BUG-044, ×4)  → exit 0 each, tests 15/suites 13/pass 15/fail 0/skipped 0 each
diff .cleargate/scripts/update_state.mjs cleargate-planning/.cleargate/scripts/update_state.mjs  → exit 0, empty
git diff 5a33eae5 871270d1 -- state.schema.json validate_state.mjs _migrate-schema-v3.mjs constants.mjs init_sprint.mjs close_sprint.mjs  → exit 0, empty
git diff 5a33eae5 871270d1 -- .gitignore  → exit 0, empty
find <repo> -name state.json.lock  → exit 0, no output
```

## Script Incidents

None. No `run_script.sh`-wrapped script was invoked.

## Verdict

**QA: PASS**

All eleven lock-design constraints confirmed by direct code read against the committed diff. The
two checks no test performs (release-after-`renameSync`, critical section enclosing the migration
writes) both hold. Suite independently reproduced 4/4 at `15/15/0/0`, no leftover lock, mirror
parity empty, three-row surface exact, no test scenario reshaped beyond the one authorized title
fix (T5). Ship it.

flashcards_flagged: []
