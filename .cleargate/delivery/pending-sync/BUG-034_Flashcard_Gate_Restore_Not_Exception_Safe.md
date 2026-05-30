---
bug_id: BUG-034
parent_ref: STORY-033-04 (EPIC-033)
parent_cleargate_id: STORY-033-04
sprint_cleargate_id: null
carry_over: false
status: Draft
severity: P2-Medium
reporter: sandrinio
approved: false
area: sprint-execution,orchestration,workflows
created_at: 2026-05-31T00:00:00Z
updated_at: 2026-05-31T00:00:00Z
created_at_version: cleargate@0.14.0
updated_at_version: cleargate@0.14.0
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: repro-steps-deterministic
      detail: section 2 has 2 declared-item (≥3 required)
    - id: discovery-checked
      detail: expected context_source != "null", got undefined
  last_gate_check: 2026-05-30T21:06:17Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-034
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-30T21:06:17Z
  sessions: []
---

# BUG-034: SKIP_FLASHCARD_GATE restore is not exception-safe — a mid-barrier throw leaks gate suppression into the serial fallback

> **Context:** Surfaced by the SPRINT-32 post-close adversarial audit of EPIC-033 (workflow run `wf_0e91626a-587`, 2026-05-31). Latent — only reachable once `execution_mode: v2-parallel` runs a live wave (never yet executed). **Must fix BEFORE the first live wave.** This is the one finding that partially breaches EPIC-033's headline "serial loop untouched / zero behavior change" guarantee.

## 0.5 Open Questions

- **Question:** Should the env save/restore live inside `launch_wave.mjs` (wrap `parallel()`+barrier in `try/finally`) or stay an Orchestrator-prose obligation in SKILL.md §C.0.1 with a code-enforced guard added?
- **Recommended:** Move it into `launch_wave.mjs` — set `SKIP_FLASHCARD_GATE` at the top of `launchWave()`, restore in a `finally` that runs regardless of validator/merge throws. Prose-only obligations are exactly what failed here. Keep the SKILL.md step as documentation.
- **Human decision:** {populated during Brief review}

- **Question:** Should the restore snapshot the *prior* value (env var may have been legitimately set before launch) rather than hard-deleting it?
- **Recommended:** Yes — capture `const prev = env.SKIP_FLASHCARD_GATE` and restore exactly that (delete if it was unset), so the gate returns to its true pre-wave state.
- **Human decision:** {populated during Brief review}

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** The flashcard **write**-gate is suppressed only for the duration of a parallel wave (per the spike: per-thunk env isn't settable, so the Orchestrator sets `SKIP_FLASHCARD_GATE=1` in its own env, inherited by all segments) and is **unconditionally restored at the barrier** — including when a segment verdict fails validation or a barrier merge errors. The serial five-dispatch fallback must never observe a suppressed gate.

**Actual Behavior:** The restore is a prose-language obligation (SKILL.md §C.0.1 "restore env at the barrier") with **no `try/finally` (or any error handler) in `launch_wave.mjs`** around the `parallel()`/barrier region. If anything between launch and the restore line throws — `validateVerdicts()` raising on a malformed segment verdict, a merge conflict, an ESCALATED segment — the Orchestrator's sequential execution halts **before** the restore runs. `SKIP_FLASHCARD_GATE=1` then persists in the session env for the remainder of the session, silently disabling the flashcard write-gate for **all subsequent work, including the serial fallback path** that EPIC-033 promises is untouched.

## 2. Reproduction Protocol

1. Enable `execution_mode: v2-parallel` and launch a wave with ≥2 segments via `launch_wave.mjs` (orchestrator sets `SKIP_FLASHCARD_GATE=1` first).
2. Cause a segment to return a verdict that fails `validateVerdicts()` (e.g. a non-GREEN verdict with no `blocker`, or a missing `tokens` sub-object), OR force a barrier merge conflict.
3. Observe the barrier throws → orchestration halts before the env-restore step.
4. In the same session, fall back to the serial loop (or run any later Task dispatch) and observe the `pending-task-sentinel.sh` flashcard gate is bypassed because `SKIP_FLASHCARD_GATE=1` is still set.

## 3. Evidence & Context

`.cleargate/scripts/launch_wave.mjs` (header documents the env contract; grep confirms **no** `try`/`finally`/`catch` in the file):

```
*   - Per-thunk child env is NOT settable → the Orchestrator sets `SKIP_FLASHCARD_GATE=1` in
*     its OWN env before launch (inherited by all children) and restores it at the barrier.
...
* flashcards (between-wave) → merge GREEN stories one worktree at a time → restore env.
```

```
$ grep -nE "try|finally|catch|SKIP_FLASHCARD" .cleargate/scripts/launch_wave.mjs
# → only the header-comment references above; NO try/finally/catch construct exists.
```

The restore is therefore reachable only on the happy path. `validateVerdicts()` is explicitly designed to throw (named-error per offending storyId) — a designed throw site sits directly between launch and restore.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `.cleargate/scripts/launch_wave.mjs` — wrap the `parallel()`+validate+merge region in `try { … } finally { restore }`; snapshot prior `SKIP_FLASHCARD_GATE` value and restore exactly.
- `cleargate-planning/.cleargate/scripts/launch_wave.mjs` — **canonical mirror; patch identically** (dogfood split). Re-sync live `/.cleargate/scripts/` after.
- `.claude/skills/sprint-execution/SKILL.md` §C.0.1 — keep the prose step but point it at the now-code-enforced guarantee.

**Do NOT** alter the serial §C.1–§C.9 loop or the kill-switch (`shouldRunParallel`).

## 5. Verification Protocol (The Failing Test)

Extend `test/scripts/wave-execution-barrier.red.node.test.ts`:
- Given `SKIP_FLASHCARD_GATE` unset, when `launchWave()` is invoked and the barrier throws (inject a verdict that fails `validateVerdicts`), then after the throw the env var is **restored to unset** (assert via the function's env handle or a finally-spy).
- Given `SKIP_FLASHCARD_GATE` had a prior value, it is restored to that exact prior value (not hard-deleted).
- Regression: happy-path wave still restores correctly.

**Command:** `cd cleargate-cli && npx tsx --test test/scripts/wave-execution-barrier.red.node.test.ts`

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached. (Source excerpt + grep — this is a missing-handler gap, not a crash.)
- [x] Verification command (failing test) is provided.
- [ ] §0.5 Open Questions resolved at Brief review (restore location: in-code finally vs prose; prior-value snapshot).
- [ ] `approved: true` is set in the YAML frontmatter.
