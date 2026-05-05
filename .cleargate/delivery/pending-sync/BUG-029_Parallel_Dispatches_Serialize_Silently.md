---
bug_id: BUG-029
parent_ref: EPIC-013 — Execution Phase v2
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
severity: P2-Medium
reporter: sandrinio
approved: true
approved_at: 2026-05-05T08:40:00Z
approved_by: sandrinio
created_at: 2026-05-05T08:00:00Z
updated_at: 2026-05-05T08:00:00Z
created_at_version: cleargate@0.11.3
updated_at_version: cleargate@0.11.3
server_pushed_at_version: null
context_source: |
  Observed during SPRINT-02 dogfood on /Users/ssuladze/Documents/Dev/markdown_file_renderer
  (2026-05-04). The Architect's M1 plan declared STORY-002-03 and STORY-002-04
  as parallel_eligible; both received write_dispatch entries at the SAME
  timestamp (00:42:33Z). However only STORY-002-03 actually executed — no
  token-ledger row was ever written for the first STORY-002-04 dispatch.
  After STORY-002-03 closed at 00:51:33Z, STORY-002-04 was re-dispatched
  fresh at 01:00:24Z and ran serially. Net effect: parallel_eligible is
  effectively documentation-only; the second dispatch is silently dropped
  and re-issued sequentially. Wastes the planning intent and obscures the
  fact that "parallel" doesn't actually parallelize.
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-05T08:51:47Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-029
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-05T08:51:06Z
  sessions: []
---

# BUG-029: Parallel-eligible story dispatches silently serialize

### 0.5 Open Questions

- **Question:** Is `parallel_eligible` supposed to spawn dispatches in separate Claude Code sessions, or just within the same orchestrator session via concurrent Task tool calls?
- **Recommended:** Within-session via concurrent Task calls (single message, multiple Agent blocks). The orchestrator skill must enforce this; a serial dispatch loop disqualifies parallel intent.
- **Question:** When two write_dispatch markers land at the same timestamp, what is the SubagentStop hook supposed to do? Today only one row is written.
- **Recommended:** Hook should match each SubagentStop completion to its specific dispatch by `(work_item_id, agent)` tuple — currently it appears to match by session_id alone, collapsing concurrent runs.
- **Human decision:** _populated during Brief review_

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** When the Architect M1 plan marks two stories `parallel_eligible: true` in the same wave, the orchestrator dispatches both Developer agents concurrently (single message with two Agent tool calls). Both runs execute in parallel; both produce token-ledger rows; the wall-clock duration is `max(t_a, t_b)`, not `t_a + t_b`.

**Actual Behavior:** Two `wrote dispatch:` lines fire at the same timestamp, but only the first dispatched story produces a token-ledger row. The second dispatch is dropped silently. After the first completes, the second is re-dispatched fresh and runs sequentially. Wall-clock duration is `t_a + t_b`. Planning intent (parallelism) is lost without any error or warning.

## 2. Reproduction Protocol

- **Step 1 — Plan two parallel stories.** Architect M1 plan §2.1 Phase Plan declares two stories in the same wave with `parallel_eligible: true`, no inter-dependency.
- **Step 2 — Dispatch in same orchestrator turn.** Orchestrator issues a single message containing two Developer Agent tool calls (one per story).
- **Step 3 — Inspect dispatch log.** `tail .cleargate/hook-log/write_dispatch.log` shows two `wrote dispatch:` lines with the same or very-close timestamp.
- **Step 4 — Wait for both to nominally complete.** Wait until orchestrator reports both stories closed.
- **Step 5 — Inspect ledger.** `grep "story=STORY-NNN-XX" .cleargate/sprint-runs/<id>/token-ledger.jsonl` — only ONE row exists for the FIRST-dispatched story. The second story's first dispatch produced no row.
- **Step 6 — Look for re-dispatch.** Same `write_dispatch.log` shows the second story re-dispatched at a LATER timestamp (after the first completed) and that one DID produce a ledger row.

## 3. Evidence & Context

`/Users/ssuladze/Documents/Dev/markdown_file_renderer/.cleargate/hook-log/write_dispatch.log` excerpt (SPRINT-02, 2026-05-05):

```
[2026-05-05T00:42:33Z] wrote dispatch: sprint=SPRINT-02 ... work_item=STORY-002-03 agent=developer
[2026-05-05T00:42:33Z] wrote dispatch: sprint=SPRINT-02 ... work_item=STORY-002-04 agent=developer
[2026-05-05T00:42:51Z] wrote dispatch: sprint=SPRINT-02 ... work_item=STORY-002-03 agent=developer  ← duplicate
...
[2026-05-05T00:51:33Z] dispatch-marker: ... work_item=STORY-002-03 agent=developer  ← only STORY-002-03 ran
[2026-05-05T00:51:34Z] wrote row: ... agent=developer work_item=STORY-002-03 ...
...
[2026-05-05T01:00:24Z] wrote dispatch: sprint=SPRINT-02 ... work_item=STORY-002-04 agent=developer  ← re-dispatched
[2026-05-05T01:09:10Z] dispatch-marker: ... work_item=STORY-002-04 agent=developer  ← finally ran
[2026-05-05T01:09:10Z] wrote row: ... agent=developer work_item=STORY-002-04 ...
```

Note three findings: (a) two dispatches at `00:42:33Z`, (b) only STORY-002-03 produced a `dispatch-marker`/`wrote row` pair, (c) STORY-002-04 was re-dispatched 18 minutes later and ran serially. Wall-clock cost: `t_03 + t_04 = ~17 min` instead of `max(t_03, t_04) = ~9 min`.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `.claude/skills/sprint-execution/SKILL.md` — confirm whether the dispatch instruction tells the orchestrator to use a SINGLE message with multiple Agent calls (true parallelism per Claude Code) or sequential messages (effectively serial).
- `cleargate-planning/.claude/hooks/pending-task-sentinel.sh` + `pre-tool-use-task.sh` — investigate whether the sentinel/marker locking serializes concurrent Task dispatches.
- `cleargate-planning/.claude/hooks/token-ledger.sh` SubagentStop handler — confirm match-on-(work_item, agent) vs match-on-session_id. Two concurrent SubagentStop fires from one orchestrator session may collide on session_id.

**Do NOT touch:** the per-story write_dispatch.sh writer; it correctly fires twice. The bug is downstream.

## 5. Verification Protocol (The Failing Test)

**Test:** add `cleargate-cli/test/skills/test_parallel_dispatch.sh` that:
1. Sets up a fixture sprint with two parallel-eligible stories.
2. Spawns two Developer-shaped Task tool calls in a single orchestrator message (test seam: mock the Task tool).
3. Asserts both stories produce a token-ledger row.
4. Asserts wall-clock duration ≤ 1.5 × max(t_a, t_b), not t_a + t_b.

**Command:** `cd cleargate-cli && npm test`

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity** — repro is observable; root cause needs source-level investigation to determine whether the bug is in the orchestrator skill, the sentinel hook, or the SubagentStop handler.

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [ ] Verification command (failing test) is provided. — *test sketched, not yet written*
- [ ] `approved: true` is set in the YAML frontmatter.
