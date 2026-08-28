---
bug_id: BUG-044
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: "SPRINT-39"
carry_over: false
area: planning-layer
status: Triaged
severity: P1-High
reporter: sandrinio
approved: true
context_source: verified codebase grounding — update_state.mjs:78-79,99 read directly; state.json per-story field ownership confirmed against .cleargate/sprint-runs/SPRINT-38/state.json; discovered during the parallel-wave design review 2026-08-26 and approved in the same conversation
created_at: 2026-08-26T00:00:00Z
updated_at: 2026-08-25T20:55:37Z
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
  last_gate_check: 2026-08-25T20:55:37Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# BUG-044: Concurrent `update_state.mjs` invocations silently lose story transitions

### Open Questions

- **Question:** Lockfile or per-story shard as the fix?
- **Recommended:** Lockfile. A shard layout is the right *end state* but it is [[CR-106]]'s job via the event-log fold; doing it here would duplicate that work. This bug wants the smallest change that closes the defect and can survive [[CR-106]] being trimmed.
- **Human decision:** Lockfile — recorded 2026-08-26.

- **Question:** Does this bug become redundant once [[CR-106]] lands?
- **Recommended:** No. CR-106 removes the race *structurally* (one writer, idempotent fold), but this bug's regression test is what proves the property holds — before **and** after the refactor. Same pattern as [[BUG-042]] → [[STORY-054-05]] in M0: fix supplies the correction, test pins it across later change.
- **Human decision:** Keep both; test carries forward — recorded 2026-08-26.

## 1. The Anomaly (Expected vs. Actual)

**Expected:** Two segments in the same wave transitioning two different stories concurrently both persist. `state.json` ends with both transitions applied.

**Actual:** One transition is silently lost. No error, no warning, no torn file — `state.json` is valid JSON containing stale data for one story.

`update_state.mjs` performs an unguarded read-modify-write of the **entire** document:

- `:99` — `state = JSON.parse(fs.readFileSync(stateFile, 'utf8'))` reads the whole file
- mutates exactly one entry under `stories.<ID>`
- `:78-79` — `atomicWrite()` writes a tmp file and renames it over the original

The tmp+rename gives atomicity of the *write* — a reader never sees a partial file. It gives **no** lost-update protection. Interleaving:

```
A reads  (state v1)
B reads  (state v1)          ← B's snapshot predates A's mutation
A writes (v1 + A's change)   ← v2
B writes (v1 + B's change)   ← v2', A's change is gone
```

**Why this is P1-High rather than P2:** the loss is silent and the lost record is a *lifecycle state*. A story stuck at a stale state can be re-dispatched, skipped at merge, or mis-counted by the lifecycle reconciler at sprint close. Nothing in the pipeline detects it — `validate_state.mjs` checks shape, not causality.

**Why it has not been noticed:** the window is the few milliseconds between read and rename, and waves are usually narrow. It is a genuine live defect at current concurrency, not a future one — and [[EPIC-055]] (parallel wave scheduling) multiplies the window by the number of concurrently admitted waves.

## 2. Reproduction Protocol

Deterministic, no timing dependency required — the harness forces the interleave:

1. Create a sprint dir with a `state.json` containing ≥2 stories (`init_sprint.mjs`, or copy `.cleargate/sprint-runs/SPRINT-38/state.json`).
2. Export `CLEARGATE_STATE_FILE=<that path>`.
3. Spawn N=20 concurrent `node .cleargate/scripts/update_state.mjs STORY-<i> --state <newstate>` processes, one per distinct story id, via `Promise.all` over `child_process.spawn` (no shell `&`, so all start before any completes).
4. Read the resulting `state.json` and count how many of the 20 transitions are present.

**Observed:** fewer than 20. **Expected:** exactly 20.

**Edge conditions that must also hold after the fix:**
- Two invocations against the **same** story id: last-writer-wins is acceptable; neither may corrupt the file.
- A crashed invocation must not leave a lock that blocks all future writes (stale-lock timeout or pid-liveness check required).
- Single-invocation performance must not regress meaningfully — this runs on every state transition in every sprint.

## 3. Evidence & Context

Verbatim from `.cleargate/scripts/update_state.mjs`:

```js
function atomicWrite(stateFile, state) {                      // :76
  const tmpFile = `${stateFile}.tmp.${process.pid}`;          // :77
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2) + '\n', 'utf8');  // :78
  fs.renameSync(tmpFile, stateFile);                          // :79
}
```

```js
  let state;
  try {
    state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));   // :99
  } catch (err) {
```

No `flock`, no `O_EXCL` lockfile, no compare-and-swap, no re-read before write. Confirmed by `command grep -n "lock\|flock" .cleargate/scripts/update_state.mjs` → no matches.

**Structural note (why a lock is sufficient and a redesign is not required here):** every field under `stories.<ID>` is owned by exactly one writer — that story's segment. There is no cross-story field. The only global keys, `last_action` and `updated_at`, are derivable. The document has no genuinely shared state; the contention is an artifact of file layout. A lock closes the defect correctly; [[CR-106]] removes the layout that made it possible.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / modify:**
- `.cleargate/scripts/update_state.mjs` — add the lock around read-modify-write.
- `cleargate-planning/.cleargate/scripts/update_state.mjs` — canonical mirror (dogfood-split rule).
- `.cleargate/scripts/state-scripts.test.mjs` — regression test.

**Do NOT modify:** `state.schema.json`, `validate_state.mjs`, `_migrate-schema-v3.mjs`, or any of the 27 non-test `state.json` readers. The fix is confined to the write path.

**Blast radius:** every state transition in every sprint runs through this file. A stale-lock bug here halts sprint execution, so the timeout/liveness path is the highest-risk part of the change and must be tested explicitly (§5 case 4).

## 5. Verification Protocol (The Failing Test)

**Command:** `node --test .cleargate/scripts/state-scripts.test.mjs`

1. **The failing test.** 20 concurrent invocations against 20 distinct story ids → assert all 20 transitions present. **Must fail against the current tree** (that is the proof the bug exists) and pass after the fix.
2. Same-story concurrent writes → file stays valid JSON, one of the two writes wins, neither corrupts.
3. Single-invocation behaviour unchanged — existing `state-scripts.test.mjs` cases stay green.
4. **Stale lock.** A lock left by a dead process does not block a subsequent write indefinitely.
5. **Carry-forward.** This test file is [[CR-106]]'s acceptance criterion too: it must stay green after the event-log refactor replaces the lock. Do not delete it when CR-106 lands.

**Parity check:** `diff .cleargate/scripts/update_state.mjs cleargate-planning/.cleargate/scripts/update_state.mjs` is empty.

## Task Breakdown

> Rows authored by the M4 Architect in `.cleargate/sprint-runs/SPRINT-39/plans/M4.md`
> and committed into this item by the orchestrator on 2026-08-29 (M4 OD-5), before any
> worktree was cut. Execution order.

- [ ] Cut story/BUG-044 from sprint/S-39; confirm both trees' update_state.mjs diff clean
- [ ] Commit A: fix state-scripts.test.mjs:90 to the two-assertion form + import SCHEMA_VERSION; run, expect 8/8/0
- [ ] Commit B (QA-Red): author S1-S5 red; seed at schema_version 3, drive `Bouncing`, never `--state`; expect 12/8/4
- [ ] Implement the lock in .cleargate/scripts/update_state.mjs: 'wx' acquire after :95, process.on('exit') release, Atomics.wait retry, liveness + age steal
- [ ] Mirror byte-identically into cleargate-planning/.cleargate/scripts/update_state.mjs
- [ ] Commit C with both trees; run node --test; record pass/fail/skipped verbatim
- [ ] Verify diff between trees is empty; verify no file outside the three-row surface is staged

## Prior work

- `cleargate wiki query "state.json lost update race"` → **none found**. Second probe `"execution state json concurrency"` → **none found**.
- [[CR-106]] — the architectural successor. Removes the shared-document layout entirely. This bug is its hard predecessor inside SPRINT-39 M4.
- [[BUG-034]] — flashcard-gate restore not exception-safe. Nearest prior concurrency defect in the wave machinery; different surface (env var, not state file), same class of "narrow window nobody hit yet."
- [[BUG-033]] — collision-surface fail-open. Also wave-adjacent, unrelated mechanism.
- `.cleargate/FLASHCARD.md:82` — records that `init_sprint.mjs` stopped writing `execution_mode` into `state.json`; touches the same file, not the write model.

## Context Source

**context_source:** Verified codebase grounding — `update_state.mjs:78-79` and `:99` read directly during the parallel-wave design review of 2026-08-26; per-story field ownership confirmed against `.cleargate/sprint-runs/SPRINT-38/state.json`. Direct approval recorded in the same conversation.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Ready for Fix**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
