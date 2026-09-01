---
bug_id: BUG-074
parent_ref: EPIC-NNN | STORY-NNN-NN
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Triaged
severity: P1-High
reporter: "{name}"
approved: false
context_source: approved Epic / verified codebase grounding + recorded direct approval
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-17T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
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
  last_gate_check: 2026-09-01T23:13:43Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
area: sprint-scripts
---

# BUG-074: A state transition dirties the tree and fails the next story's bounce-readiness check

> **First-user field report,** 2026-09-02. Breaks the parallel-wave path
> specifically — the feature `waves.json` exists to enable.

### Open Questions

- **Question:** Exclude `.cleargate/sprint-runs/**` from the clean-tree check, or batch a wave's transitions into one call?
- **Recommended:** **Exclude the path.** The check exists to catch uncommitted *user* work that a worktree would strand; framework-owned in-flight bookkeeping is not that. Batching helps but still leaves one dirty window, and any later script that writes sprint state reintroduces the problem.
- **Human decision:** Unresolved — replace this entire line with the human's decision.

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** preparing a parallel wave, each story's bounce-readiness
check passes in turn.

**Actual Behavior:** the first story's `update_state.mjs` writes `state.json` and
`events.jsonl` under `.cleargate/sprint-runs/`, and the second story's check then
fails the clean-tree condition on those exact files. The dirt is 100% the
framework's own bookkeeping; no user work is involved.

## 2. Reproduction Protocol

1. A sprint whose `waves.json` declares two stories in one parallel wave.
2. `validate_bounce_readiness.mjs STORY-A` → passes.
3. `update_state.mjs STORY-A Bouncing` → writes state.json + events.jsonl.
4. `validate_bounce_readiness.mjs STORY-B` → fails, listing
   ` M .cleargate/sprint-runs/<id>/state.json` as uncommitted changes.

Serial waves never see it: one transition, then the work and merge absorb the
churn. Parallel waves always see it, because all N transitions happen before any
dispatch.

## 3. Evidence & Context

`.cleargate/scripts/validate_bounce_readiness.mjs:89` requires
`git status --porcelain` to be entirely empty (§(d) "git working tree is clean"),
with no path exclusions. `update_state.mjs` writes into
`.cleargate/sprint-runs/<sprint>/`.

Observed in a fresh consumer repo, wave 1 of SPRINT-01
(`STORY-001-01 ‖ STORY-001-02`, declared parallel by `architect-synth`):

```
$ validate_bounce_readiness.mjs STORY-001-01
Bounce readiness check passed for STORY-001-01 (state="Ready to Bounce", clean tree)
$ update_state.mjs STORY-001-01 Bouncing
Updated STORY-001-01: state="Bouncing"
$ validate_bounce_readiness.mjs STORY-001-02
 M .cleargate/sprint-runs/SPRINT-01/state.json
```

The operator's only options are to commit sprint bookkeeping between every
transition — noise, and `state.json` is live in-flight state rather than a
commit-worthy artifact — or to ignore a failing gate.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `cleargate-planning/.cleargate/scripts/validate_bounce_readiness.mjs` — the clean-tree check

## Task Breakdown

- [ ] Exclude `.cleargate/sprint-runs/**` from the clean-tree condition
- [ ] Keep every other path in scope — the check must still catch stranded user work
- [ ] Regression test: dirty `sprint-runs/` passes; dirty `src/` still fails
- [ ] Re-sync npm payload and the live `/.claude/` instance

## 5. Verification Protocol (The Failing Test)

**Command:** `bash .cleargate/scripts/test/bug074_bounce_readiness_sprintruns.red.sh`

Red test: in a fixture repo, dirty only `.cleargate/sprint-runs/<id>/state.json`
and assert `validate_bounce_readiness.mjs` for a `Ready to Bounce` story exits 0.
Today it exits non-zero. Second: dirty `src/foo.mjs` and assert it still fails —
the exclusion must not weaken the real check.

**Test layers.**

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 2 | sprint-runs dirt passes; source dirt still fails |
| Integration tests | 1 | two-story parallel wave: both stories transition and both checks pass |
| E2E / acceptance tests | 0 | covered by the integration case |

---

## Prior work

- [[BUG-002]] — sprint init missing the active sentinel and ledger; same script family, same class of sprint-state bookkeeping defect.
- none found for the clean-tree interaction specifically.

## Context Source

**context_source:** verified codebase grounding — `validate_bounce_readiness.mjs:89`, `update_state.mjs`'s write targets, and a live two-story parallel wave in a fresh consumer repo, read directly 2026-09-02.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity — awaiting the human decision in Open Questions**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
