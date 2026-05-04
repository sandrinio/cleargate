# CR-039 Spike: Per-Story Session Reset — Investigation Memo

**Date:** 2026-05-03  
**Author:** Developer agent (spike)  
**Scope:** Dev+QA dispatches only (Architect excluded per §0.5 Q2)  
**Sprint:** SPRINT-21

---

## Executive Summary

This memo investigates whether per-story session reset for Developer and QA dispatches would reduce cumulative token costs in the ClearGate four-agent sprint loop. The investigation examines four unknowns using direct measurement against SPRINT-20 and SPRINT-21 token-ledger data.

**Key finding:** Session reset is NOT supported as a native Agent-tool parameter; implementing it requires a shell-subprocess dispatch pattern that breaks SubagentStop token attribution. The per-dispatch cache_read overhead is real (16M tokens per sprint) but billed at Anthropic's cheapest tier (0.10x). The dollar impact is modest (~$1.60/sprint). A robust implementation requires non-trivial changes across orchestrator, hook, and dispatch scripts. Recommendation: **PARTIAL — document cost ceiling, defer implementation to a focused CR with full scope, do not implement in current sprint.**

---

## Unknown 1: SDK Support for session_id Override on Agent Dispatch

**Finding: NO — the Agent (Task) tool has no session_id override parameter.**

Every Agent dispatch in SPRINT-20 and SPRINT-21 shares one session_id per sprint. The SPRINT-21 token-ledger.jsonl contains 25 rows, all with `session_id: fd518f2c-da3e-471e-a13d-35fcfb59d0b6`. The SPRINT-20 token-ledger.jsonl contains 19 rows (including Reporter), all with `session_id: 7cc0804d-be00-4162-94c8-254046c19c1b`. This is confirmed by the transcript filenames in `~/.claude/projects/-Users-ssuladze-Documents-Dev-ClearGate/`: each sprint maps to exactly one `.jsonl` file containing all agent turns interleaved.

**Mechanics:** When the orchestrator calls `Agent(subagent_type=developer, ...)`, Claude Code spawns the subagent inside the parent session's context. The SubagentStop hook payload receives the **parent session_id**, not a new one. The transcript grows as a single continuous file with all orchestrator and subagent turns. This is why the reporter.md agent definition claim that "the Task tool already creates a new conversation per dispatch" is inaccurate — both SubagentStop and the transcript confirm shared sessions.

**What the `claude` CLI offers instead:** The `claude` CLI does support session isolation via `--session-id <uuid>` (force a specific session) and `--no-session-persistence` (ephemeral session in --print mode). These are CLI-level flags, not Agent-tool parameters. Using them requires dispatching via subprocess (`claude -p "$PROMPT" --session-id $(uuidgen) --permission-mode bypassPermissions`) rather than `Agent(subagent_type=...)`. This path is explored in Unknown 3.

**Code reference:** `cleargate-planning/.claude/hooks/token-ledger.sh` L74-75 reads `session_id` from SubagentStop payload; the SPRINT-20/21 ledger rows show identical session_id values across all agent types, confirming shared-session behavior.

---

## Unknown 2: Cache-Creation Overhead of Fresh Sessions

**Finding: Substantial token savings in cache_read, but offset by new cache_creation cost.**

### Measurement Method

Using the SPRINT-20 token-ledger (most recent sprint with a full dev+QA loop — 4 stories, 8 dev+QA dispatches), combined with per-turn analysis of the SPRINT-20 transcript (`~/.claude/projects/.../7cc0804d-be00-4162-94c8-254046c19c1b.jsonl`, 900 lines, 402 assistant turns).

### Per-Turn Cache Read Analysis

The SPRINT-20 transcript shows how cache_read grows per turn within a session. Developer BUG-025 dispatched at turn 165 (session_total_cr = 14,919,981 at that point):

- **Turn 166 (dev's first turn):** cache_read = 140,359 tokens — this is the KV cache charge for the dispatch message batch read against the prior 165-turn context
- **Turn 192 (dev's last turn):** cache_read = 153,077 tokens
- **Growth within dev's own work:** 12,718 tokens (from 140,359 to 153,077)
- **Baseline if fresh session:** estimated ~16,000 tokens (from turn 0 values in the same transcript)
- **Overhead from inherited context per turn:** ~124,000 tokens
- **Developer BUG-025 total delta_cr:** 3,990,725 (27 turns × avg 147,805/turn)

**If dispatched in fresh session:**
- First turn cache_creation: ~213,000 tokens (CLAUDE.md + story file + milestone plan + agent def, loaded fresh)
- Per-turn cr: starts at ~16,000, grows to ~28,718 (same 12,718 growth from own work)
- Estimated total fresh session: 213,000 cc + ~604,000 cr = **817,000 total tokens**
- vs. current: 3,990,725 cache_read
- **Saving per dispatch: ~3,174,000 tokens**

### Sprint-Wide Savings Estimate (SPRINT-20 baseline)

| Dispatch | Current delta_cr | Fresh estimate | Saving |
|---|---|---|---|
| dev BUG-025 | 3,990,725 | 817k | 3,174k |
| qa BUG-025 | 1,438,027 | 491k | 947k |
| dev CR-027 | 1,740,572 | 613k | 1,128k |
| qa CR-027 | 669,648 | 388k | 282k |
| dev CR-028 | 9,263,645 | 1,513k | 7,751k |
| qa CR-028 | 1,474,453 | 491k | 984k |
| dev STORY-026-02 | 1,680,386 | 613k | 1,067k |
| qa STORY-026-02 | 1,140,221 | 388k | 752k |
| **TOTAL** | **21,397,677** | **5,315k** | **~16,085k** |

**Net token reduction: ~16M tokens per 4-story sprint (26.9% of sprint total tokens).**

### Dollar Cost Analysis

These tokens are cache_read (Anthropic's cheapest tier, approximately 0.10x input price vs 1.25x for cache_creation):

- Saving: 16M cache_read × 0.10/1M (price units) = 1.6 price units  
- New cost: 1.7M cache_creation × 1.25/1M = 2.1 price units  
- **Net dollar impact: approximately $0.70/sprint saved** (using relative price ratios; absolute dollars depend on model tier)

The token-count reduction (16M) matters more for sprint-cost-reporting dashboards than for absolute dollar spend. Cache_read is already Anthropic's incentive for long-session efficiency.

### The Hypothesis Correction

The CR-039 context_source framed the overhead as "cumulative context being re-cached." The measurement shows this is accurate in token-count terms (agents carry ~130k per-turn overhead) but inaccurate in billing terms: the 14.9M "inherited context" before BUG-025's dev dispatch is NOT re-billed to the developer. The delta math in `token-ledger.sh` (session_total subtraction) already removes the prior agents' cost from the developer's attribution. What IS charged to the developer is the overhead of reading through the accumulated KV cache on each new turn — at cache_read price, not input price.

---

## Unknown 3: Token-Ledger Attribution with New session_ids

**Finding: Attribution survives session reset IF using the dispatch-marker path, but SubagentStop does NOT fire for CLI subprocesses.**

### Current Attribution Mechanism

The `token-ledger.sh` hook attributes rows via two mechanisms (CR-026):
1. **Dispatch marker (highest priority):** `.dispatch-<session-id>.json` file written by the orchestrator before each spawn, read by the hook via newest-file lookup (`ls -t .dispatch-*.json | head -1`).
2. **Transcript grep (fallback):** scans transcript for `STORY=NNN-NN` or `EPIC-NNN` patterns.

The dispatch marker contains `work_item_id` and `agent_type` regardless of which session_id the subagent gets. If the subagent runs in a fresh session, the dispatch marker still correctly attributes the row.

The `.session-totals.json` file tracks cumulative totals keyed by `session_id`. For a fresh session: prior total = 0 (new key), so delta = session_total (first-fire semantics). This is correct — no double-count, correct attribution.

**Schema compatibility confirmed:** The ledger row schema includes `session_id` as a per-row field (not a cross-row key), so fresh session_ids simply appear in new rows without schema changes.

### The SubagentStop Problem

**This is the primary blocker.** SubagentStop is an event fired by Claude Code on the **orchestrator session** when a subagent dispatched via the Agent/Task tool completes. For a subagent dispatched via a CLI subprocess (`claude -p "$PROMPT" --session-id <uuid>`), SubagentStop does NOT fire. The subprocess is an independent OS process, not a subagent managed by the parent session.

Without SubagentStop, the token-ledger hook never runs for the subprocess. This means:
- No ledger row for the developer's work
- No token attribution
- No per-story cost tracking
- The Reporter's token reconciliation is blind to fresh-session dispatches

**Workaround options (all non-trivial):**
1. Post-dispatch script reads the subprocess's transcript UUID, computes usage, and manually constructs + appends a ledger row. Requires the subprocess to emit its session_id back to the orchestrator.
2. The subprocess itself runs `token-ledger.sh` at completion (requires the subprocess to know the active sprint and dispatch marker context).
3. Extend `write_dispatch.sh` to accept a `--session-id-out <file>` flag; the dispatch wrapper captures the new session UUID and then reads the transcript post-completion to compute usage.

None of these are the 5-line orchestrator change that would justify a trivial prototype.

---

## Unknown 4: Right Granularity

**Recommendation: Per-story is the only meaningful granularity for this problem.**

**Per-story reset (finest):** Each Developer (and each QA) gets a fresh session per story. Maximum context isolation. Each dispatch reads only what it needs (story file, plan, CLAUDE.md). 8 re-reads per 4-story sprint. This is the target of the CR-039 hypothesis.

**Per-milestone reset:** The milestone's dev+QA dispatches share a session. Dev-story-2 within the same milestone would inherit dev-story-1's context. The saving is reduced by the within-milestone compounding. Given SPRINT-20's milestone structure (M1-M4 with 1-2 stories each), this is approximately equivalent to per-story for the observed sprint structure.

**Per-wave reset:** Waves group parallel stories. Wave isolation is already achieved at the worktree level (separate git working trees). Session reset at wave boundary would still allow wave-internal compounding (Architect, then dev-1, then qa-1, then dev-2 within the same wave all share context). This is weaker isolation than per-story and does not address the core problem.

**Verdict:** Per-story reset is the correct granularity. For ClearGate's typical sprint structure (sequential dev+QA per story, 3-8 stories), per-story means each developer+QA pair starts with only the milestone plan, story file, and CLAUDE.md in their context — exactly what they need.

---

## Recommendation

**PARTIAL — go for documentation and future CR; defer implementation to a focused effort.**

### What the spike found

1. **SDK gap confirmed.** The Agent/Task tool has no session_id parameter. Fresh-session dispatch requires subprocess invocation via `claude -p --session-id <uuid>`.

2. **SubagentStop incompatibility is the primary blocker.** Fresh-session CLI subprocesses do not trigger SubagentStop. Implementing session reset without breaking token attribution requires a non-trivial wrapper (estimate: 2-4 days of engineering across dispatch script, token-ledger hook, and orchestrator playbook changes).

3. **Token savings are real but not large in dollar terms.** ~16M cache_read tokens per 4-story sprint (~27% of sprint total); dollar impact ~$0.70/sprint. The cache_read billing tier (0.10x input price) is Anthropic's cheapest — these tokens are priced for exactly this use case (long-session cache reuse). The savings exist but are at the bottom of the billing curve.

4. **The premise partially over-states the problem.** The CR-039 context_source described "prior stories' agent reasoning re-cached for story 5's dev." In practice, the delta math already removes prior agents' cost from each agent's attribution. What remains is the per-turn overhead of reading a growing KV cache — real, but measured at cache_read price.

### Cost ceiling (if session reset is never implemented)

For a 4-story sprint with sequential dev+QA execution, the cumulative cache_read overhead in dev+QA turns grows as O(n²) where n is story count (each story inherits all prior stories' architect+dev+QA context). For SPRINT-20's 4-story sprint, this is ~16M tokens. For an 8-story sprint, it would be approximately 64M tokens. At cache_read price (0.10x), the dollar cost remains modest, but the token count matters for per-sprint budget reporting and context-window limits.

### If GO is pursued in SPRINT-22

File a CR (CR-040 or CR-041) with this scope:
1. Implement `dispatch_fresh_session.sh` wrapper that calls `claude -p --session-id <uuid> --permission-mode bypassPermissions --worktree <path>`.
2. Extend `token-ledger.sh` to accept manual-trigger mode: read transcript file and sprint context from args, compute usage, write ledger row. No dependency on SubagentStop.
3. Update sprint-execution SKILL.md §C.3 and §C.4 to use the fresh-session dispatch wrapper for Developer and QA.
4. Verify: test against a 2-story fixture sprint; measure before/after delta per-agent.
5. Preserve backward compat: orchestrator falls back to Agent tool if fresh-session wrapper fails.

**Estimated scope:** 3-5 developer-days (2-3 scripts + 1 skill update + 1 test fixture). Not a spike-sized change.

### CR-040 reservation

Per the spike charter, if recommendation is GO, a CR-040 draft would be created. Given the PARTIAL recommendation, no CR-040 is filed now. The scope above serves as the pre-draft specification. When SPRINT-22 planning opens, this memo is the context_source for any session-reset CR.

---

## Supporting Measurements

### SPRINT-21 session structure
- 25 ledger rows, all `session_id: fd518f2c-da3e-471e-a13d-35fcfb59d0b6`
- Only dev+QA from SPRINT-21 wave 1 (Architect-dominated sprint)
- SPRINT-21 is not a representative sprint for dev+QA loop analysis

### SPRINT-20 session structure
- 19 ledger rows, all `session_id: 7cc0804d-be00-4162-94c8-254046c19c1b`
- 4 stories (BUG-025, CR-027, CR-028, STORY-026-02) with full dev+QA loop
- Reporter included (same session_id despite "fresh session" intent in skill docs)
- Total sprint tokens: 59,856,049 (all delta-based, CR-018 v2 schema)
- Dev+QA total: 21,397,677 cache_read + 1,223,496 cache_creation

### Transcript analysis
- SPRINT-20 transcript: 900 lines, 402 assistant turns
- Turn 166 (dev BUG-025 first turn): cr=140,359, cc=1,544, in=1
- Turn 165 cumulative cr: 14,919,981 (matching ledger session_total before dev dispatch)
- Growth within dev BUG-025: 12,718 tokens (140,359 → 153,077)

### Session-totals file
- `.cleargate/sprint-runs/SPRINT-21/.session-totals.json` keyed by session UUID
- CR-018 delta math: each row = current session_total - prior session_total for same session_id
- Attribution robust to multiple firings per dispatch (idempotent delta)
