---
cr_id: CR-018
parent_ref: STORY-014-05
parent_cleargate_id: "STORY-014-05"
sprint_cleargate_id: "SPRINT-15"
status: Approved
approved: true
approved_at: 2026-04-28T00:00:00Z
approved_by: sandrinio
sprint: SPRINT-15
milestone: M3
closes:
  - BUG-022
related:
  - CR-016
created_at: 2026-04-28T00:00:00Z
updated_at: 2026-04-28T00:00:00Z
created_at_version: cleargate@0.8.2
updated_at_version: cleargate@0.8.2
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-29T11:16:05Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
context_source: |
  Conversation 2026-04-28 — split out from the original unified CR-016
  hook-v2 redesign per granularity rubric (L3+high → default split).
  CR-016 owns dispatch-marker attribution (closes BUG-021); this CR owns
  per-turn delta math + new row schema + Reporter contract change (closes
  BUG-022). Sequenced after CR-016 in SPRINT-15 M3 because both modify
  .claude/hooks/token-ledger.sh. CR-018 cuts the 0.9.0 release that
  absorbs both fixes.
stamp_error: no ledger rows for work_item_id CR-018
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-28T17:59:13Z
  sessions: []
---

# CR-018: Token Ledger — Per-Turn Delta Math + Reporter Contract

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- **Cumulative-snapshot rows.** Each row records the session-to-date totals from Claude Code's session metadata. Two rows from the same session double-count earlier turns; sum-of-rows ≈ N × real-cost where N = SubagentStop fires per session. SPRINT-001 evidence: 17 rows, sum 892 M tokens, real cost ~68 M (~13× over-count). Reporter currently has to hand-pick `last row` to estimate cost — fragile, breaks across multi-session sprints.
- **Reporter cost math.** `reporter.md` template currently sums flat fields across the ledger. Under cumulative semantics this multiplies error by row count.

**New Logic (The New Truth):**

- **Per-turn delta math in the hook.** Hook maintains `.cleargate/sprint-runs/<id>/.session-totals.json` keyed by session_id with last-known cumulative totals. On each SubagentStop:
  1. Load prev totals for the session_id (or zero if first row).
  2. Compute `delta = current_session_total − prev_session_total` per field.
  3. Write a row carrying both `delta` and `session_total` blocks.
  4. Save new totals.
- **New row schema (additive over CR-016's attribution-corrected row):**

```jsonl
{"ts":"...","sprint_id":"...","story_id":"...","agent_type":"...",
 "delta":{"input":N,"output":N,"cache_creation":N,"cache_read":N},
 "session_total":{"input":N,"output":N,"cache_creation":N,"cache_read":N},
 "session_id":"...","model":"...","turns":N}
```

- **Reporter prefers `delta.*` for cost.** Reporter agent template switches sum field from row totals to `.delta.*`. `session_total` retained for Anthropic-dashboard reconciliation only.
- **Backwards-compat read path.** When Reporter encounters a pre-0.9.0 ledger row (flat `input/output/cache_*` fields, no `delta` block), it falls back to the last-row trick AND emits a one-line REPORT.md caveat naming the ledger format.

## 2. Blast Radius & Invalidation

- [x] **Closes BUG-022** — Token-ledger rows store cumulative session totals, not per-turn deltas.
- [x] **Companion CR-016** — must merge first. Both touch `.claude/hooks/token-ledger.sh`; CR-016's dispatch-read block sits at the top of the SubagentStop handler, CR-018's delta computation wraps the row write at the bottom.
- [x] **Reset gate on STORY-014-05** (Cross-Project Ledger Routing, shipped). STORY-014-05's contract assumed flat-field rows; CR-018 changes that. No code rollback needed (additive `delta`/`session_total` blocks), but the Reporter agent contract at `.claude/agents/reporter.md` MUST land in the same commit as this CR's hook edit — partial-shipped state where the hook writes the new schema but the Reporter still reads flat fields produces silent zero-cost reports.
- [x] **Reset gate on past Reporter REPORT.md files going forward** — row-sum math is replaced by delta-sum math. Past sprint REPORT.md files are NOT re-generated; their figures stand as historical record with the documented caveat.
- [x] **Database schema impacts?** No. Ledger is JSONL on disk.
- [x] **Version bump:** cleargate 0.8.x → **0.9.0**. CR-018 owns the floor bump because the row schema change is the ABI break (additive but consumer-side switch in Reporter is required). CR-016 rides this bump in the same sprint close.

## 3. Execution Sandbox

**Modify:**

- `cleargate-planning/.claude/hooks/token-ledger.sh` — wrap the row-write step. Compute deltas via `.session-totals.json` state file keyed by session_id; write the new row schema with `delta` + `session_total` blocks. Sequenced after CR-016's dispatch-read block in the same file.
- `.claude/agents/reporter.md` — switch sum field from `.input/.output/.cache_*` to `.delta.input/.delta.output/.delta.cache_*`. Document `session_total` as debug-only. Add the one-line caveat for pre-0.9.0 ledger fallback.
- `cleargate-cli/package.json` — bump version to `0.9.0`.

**Create:**

- `cleargate-cli/src/lib/ledger.ts` — Reporter-side reader. Exports `sumDeltas(rows: LedgerRow[]): TokenTotals`. Prefers `row.delta.*`; falls back to last-row trick when `delta` block absent (returns `{ totals, format: 'pre-0.9.0' | 'delta' }` so caller can render the caveat).

**Tests:**

- `cleargate-cli/test/hooks/token-ledger-delta.test.ts` — table-driven:
  - single session, multi-fire → sum of `delta.*` equals last `session_total.*`
  - multi-session sprint → sum of `delta.*` across all rows equals sum of last-row-per-session
  - first row in a session → prev totals absent → `delta == session_total`
  - missing `.session-totals.json` (sprint started fresh) → first row treated as first-fire correctly
- `cleargate-cli/test/lib/ledger-reader.test.ts` — Reporter reader scenarios:
  - new-format ledger → returns `format: 'delta'`, sums correctly
  - pre-0.9.0 ledger (flat fields only) → returns `format: 'pre-0.9.0'` with last-row totals, no exception

**Out of scope:**

- Re-generating historical REPORT.md files (one-shot caveat documented in §1).
- Changing the SubagentStop hook trigger or `.claude/settings.json` wiring (already correct from EPIC-014).
- Re-running the dispatch-marker attribution (CR-016 owns).

## 4. Verification Protocol

**Failing test (proves the bug):**

```bash
# Multi-fire single session
sum_input=$(jq -s 'map(.input) | add' token-ledger.jsonl)
last_input=$(jq -s 'last | .input' token-ledger.jsonl)
# Pre-fix: sum_input >> last_input (multiplicative inflation)
# Post-fix: sum of .delta.input matches actual usage; .session_total.input on
# last row equals previous flat-field sum
```

**Acceptance scenarios (Gherkin shape):**

1. **Single-session multi-fire** — 3 SubagentStop events in one session → 3 rows, each with `delta` reflecting per-turn increment, `session_total` reflecting cumulative-to-that-point. Sum of `delta.*` across the 3 rows equals the last row's `session_total.*`.
2. **Multi-session sprint** — 2 sessions, 2 fires each → 4 rows, each with own `session_id`. Sum of all `delta.input` = total real input across sprint.
3. **First row in a session** — no prior `.session-totals.json` entry → `delta` equals `session_total` for that row; subsequent rows compute deltas correctly.
4. **Reporter on new-format ledger** — Sprint Cost section reads `.delta.*` directly; figures match Anthropic dashboard within ±5%.
5. **Reporter on pre-0.9.0 ledger** — flat-field rows only → falls back to last-row trick, REPORT.md emits the one-line caveat naming the ledger format.
6. **State file persists across hook fires** — `.session-totals.json` updated atomically; concurrent fires (rare but possible across worktrees) do not corrupt it (file lock or atomic-rename).

**Command/Test:**

```bash
cd cleargate-cli && npm run typecheck && npm test -- token-ledger-delta ledger-reader
```

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Ready for Execution**

- [x] "Obsolete Logic" to be evicted is explicitly declared (cumulative-snapshot rows + flat-field Reporter sum).
- [x] All impacted downstream items identified (BUG-022 closed; CR-016 sequenced before; STORY-014-05 reset; Reporter agent contract changed; 0.9.0 cut).
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command + 6 acceptance scenarios provided.
- [x] `approved: true` is set in the YAML frontmatter.
