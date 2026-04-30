---
bug_id: BUG-022
parent_ref: BUG-021
superseded_by: CR-018
status: Abandoned
severity: P2-Medium
reporter: sandrinio
sprint: SPRINT-15
milestone: M2
approved: true
approved_at: 2026-04-27T00:00:00Z
approved_by: sandrinio
created_at: 2026-04-27T00:00:00Z
updated_at: 2026-04-27T00:00:00Z
created_at_version: cleargate@0.8.2
updated_at_version: cleargate@0.8.2
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: repro-steps-deterministic
      detail: section 2 has 0 listed-item (≥3 required)
  last_gate_check: 2026-04-28T17:59:14Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
context_source: |
  Surfaced 2026-04-27 by SPRINT-001 Reporter ledger caveat #2: "The cache_read
  figure (~842 M) reflects ledger rows being snapshots of cumulative session
  usage rather than per-turn deltas. True incremental cost is closer to the
  *last* row's totals (~68 M tokens, ~$140 USD) than the row-sum."

  Sum-of-rows = 892M tokens; real cost ≈ 68M. ~13× over-count. Reporter has
  to manually pick the last row to estimate cost; this is fragile and only
  works when one session generates the whole sprint (false in multi-session
  sprints). Cost dashboards / Reporter automation cannot trust the ledger.
stamp_error: no ledger rows for work_item_id BUG-022
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-28T17:59:14Z
  sessions: []
---

# BUG-022: Token-ledger rows store cumulative session totals, not per-turn deltas

## 1. The Anomaly (Expected vs. Actual)

**Expected:** Each ledger row records the **incremental** input/output/cache
tokens for that one SubagentStop event. Sum-of-rows = sprint total.

**Actual:** Each row records the **cumulative session-to-date** totals as
read from Claude Code's session metadata. Two rows from the same session
double-count earlier turns; sum-of-rows ≈ N × real-cost where N is the
number of SubagentStop fires in the session. SPRINT-001: 17 rows, sum
892M tokens, real cost ~68M.

## 2. Reproduction Protocol

1. Run a sprint where one Claude Code session spawns multiple subagents.
2. Inspect ledger rows: `jq -s '[.[].input] | add' token-ledger.jsonl`.
3. Compare against Anthropic dashboard for the same session.
4. **Observe**: ledger sum is ~N× the dashboard figure where N = ledger row count.

## 3. Evidence & Context

- SPRINT-001 ledger sum: input 11 652 + output 5 281 940 + cache_creation 44 727 974 + cache_read 842 162 230 = **892 183 796**
- SPRINT-001 last-row totals (proxy for true): input 1036 + output 422 938 + cache_creation 3 562 475 + cache_read 73 715 514 = **77 701 963**
- Ratio: 11.5× over-count.
- Hook source: `cleargate-planning/.claude/hooks/token-ledger.sh` reads the session metadata block from the transcript and writes it verbatim — no delta math.

## 4. Recommended Fix Path

**Compute deltas in the hook, store both delta and snapshot:**

```jsonl
{"ts":"...","sprint_id":"...","story_id":"...","agent_type":"...",
 "delta":{"input":N,"output":N,"cache_creation":N,"cache_read":N},
 "session_total":{"input":N,"output":N,"cache_creation":N,"cache_read":N},
 "session_id":"...","model":"...","turns":N}
```

- Hook maintains `.cleargate/sprint-runs/<id>/.session-totals.json` keyed by
  session_id, last-known totals.
- On SubagentStop: load prev totals → compute delta → write row with both →
  save new totals.
- Reporter sums `delta.*` for sprint-cost (correct).
- `session_total` retained for debugging / Anthropic-dashboard reconciliation.

Backwards-compat: if a row only has flat fields (pre-0.9.0 format), treat
as snapshot for older sprints.

## 5. Execution Sandbox

- `cleargate-planning/.claude/hooks/token-ledger.sh` — delta computation + state file.
- `cleargate-cli/src/lib/ledger.ts` (new or existing) — Reporter-side reader that
  prefers `delta.*` and falls back to last-row trick when only flat fields exist.
- Reporter agent template — switch sum field to `.delta.*`.
- Tests: `test/hooks/token-ledger-delta.test.ts` — table-driven (single session,
  multi-session, missing prev-totals file = first row).

## 6. Verification Protocol

**Failing test (proves the bug):**
```bash
# Multi-fire single session
sum_input=$(jq -s 'map(.input) | add' token-ledger.jsonl)
last_input=$(jq -s 'last | .input' token-ledger.jsonl)
# Pre-fix: sum_input >> last_input (multiplicative inflation)
# Post-fix: sum of .delta.input matches actual usage; .session_total.input on
# last row equals previous sum
```

**Ship together with BUG-021** as a single 0.9.0 release (both touch the same
hook + Reporter expectations).
