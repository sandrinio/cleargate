---
bug_id: BUG-027
parent_ref: BUG-024 (Done) — token-ledger attribution spike, SubagentStop hook misroutes
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
  SPRINT-02 dogfood test on /Users/ssuladze/Documents/Dev/markdown_file_renderer
  (2026-05-04 to 2026-05-05). Live monitor on the test repo's
  .cleargate/hook-log/token-ledger.log captured 12 distinct rows tagged
  work_item=EPIC-001 via `work_item_id fallback grep`, all during a sprint
  whose ONLY active epic was EPIC-002 (EPIC-001 was archived after SPRINT-01
  in that repo). The misattribution affected ~75k of ~310k session output
  tokens (~25%) — orchestrator-architect coordination calls between
  sub-agent dispatches, sprint M1 init, sprint close. BUG-024 (Done in
  SPRINT-19) was supposed to fix the SubagentStop attribution path but
  scoped only to dispatch-marker resolution; the fallback grep itself was
  not made resilient to multi-epic histories. This bug captures the
  residual failure mode.
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-05T08:52:13Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-027
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-05T08:50:55Z
  sessions: []
---

# BUG-027: Token-ledger fallback grep mis-tags work_item to first lexical EPIC-NNN

Regression of [[BUG-024]] (closed Done in SPRINT-19): orchestrator-architect calls between dispatches still get mis-attributed to the wrong epic via the grep fallback path.

### 0.5 Open Questions

- **Question:** Is the fallback grep supposed to be hit at all post-BUG-024, or was that fix scoped only to subagent-dispatch rows (not orchestrator-coordination rows)?
- **Recommended:** Fallback should consult `.cleargate/sprint-runs/.active` sentinel + most-recent dispatch-marker before grep; grep is a last resort, not the primary path.
- **Human decision:** _populated during Brief review_

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** When the token-ledger writes a row for an orchestrator-architect call (no preceding `write_dispatch` for that turn), the `work_item` field should reflect the active epic/story in scope — derivable from `.active` sentinel + the most recent `dispatch-marker` in the ledger.

**Actual Behavior:** Token-ledger falls back to a grep that returns the lexically-first `EPIC-NNN` it finds in some artifact (likely the dispatch file, prompt context, or sprint plan). In a SPRINT-02 (EPIC-002) test, this returned `EPIC-001` for **every** off-loop architect call — observed 12 instances totaling ~75k output tokens (~25% of session) tagged to the wrong epic. Sprint bucket is correct; epic field is wrong.

## 2. Reproduction Protocol

- **Step 1 — Set up multi-epic history.** In a target repo, ensure `.cleargate/delivery/archive/` contains at least two epic IDs (e.g., `EPIC-001` shipped from a prior sprint, with the file present in archive).
- **Step 2 — Activate a new sprint with a different epic in scope.** Draft `SPRINT-NN_*.md` with `EPIC-002` as the only in-scope epic; run `cleargate sprint init` so `.cleargate/sprint-runs/.active` points to `SPRINT-NN`.
- **Step 3 — Trigger orchestrator-architect coordination calls.** Run an end-to-end sprint via the four-agent loop. The orchestrator will spawn an Architect for M1 init, between-story handoffs, and sprint close — these calls have NO preceding `write_dispatch.sh` invocation, so the token-ledger hook hits the fallback resolver.
- **Step 4 — Inspect the hook log.** `grep "work_item_id fallback grep:" .cleargate/hook-log/token-ledger.log` returns one or more lines, each followed by a `wrote row: ... work_item=EPIC-001` line.
- **Step 5 — Compare against expected.** The active epic per `.active` sentinel is `SPRINT-NN`; the active epic per the most recent `dispatch-marker` line is `EPIC-002`. The fallback nonetheless tags `EPIC-001` because that ID is lexically first in some grepped artifact (archive item, sprint plan, or transcript). Misattribution is 100% on every off-loop architect call.

## 3. Evidence & Context

Hook log excerpt from `markdown_file_renderer/.cleargate/hook-log/token-ledger.log` (SPRINT-02 test, 2026-05-04 — 2026-05-05):

```
[2026-05-04T23:18:03Z] work_item_id fallback grep: EPIC-001
[2026-05-04T23:18:03Z] wrote row: sprint=_off-sprint agent=architect work_item=EPIC-001 ... delta=in:340/out:235606
[2026-05-04T23:24:24Z] work_item_id fallback grep: EPIC-001
[2026-05-04T23:24:24Z] wrote row: sprint=SPRINT-02 agent=architect work_item=EPIC-001 ... delta=in:421/out:282077
[2026-05-05T01:32:57Z] wrote row: sprint=SPRINT-02 agent=architect work_item=EPIC-001 ... delta=in:9/out:5613
[2026-05-05T06:15:05Z] wrote row: sprint=SPRINT-02 agent=architect work_item=EPIC-001 ... delta=in:2/out:2288
[2026-05-05T06:26:23Z] wrote row: sprint=SPRINT-02 agent=architect work_item=EPIC-001 ... delta=in:11/out:8217
[2026-05-05T06:51:40Z] wrote row: sprint=SPRINT-02 agent=architect work_item=EPIC-001 ... delta=in:8/out:4630
[2026-05-05T06:54:29Z] wrote row: sprint=SPRINT-02 agent=architect work_item=EPIC-001 ... delta=in:27/out:10578
[2026-05-05T07:11:18Z] wrote row: sprint=SPRINT-02 agent=architect work_item=EPIC-001 ... delta=in:8/out:8006
[2026-05-05T07:21:38Z] wrote row: sprint=SPRINT-02 agent=architect work_item=EPIC-001 ... delta=in:32/out:32829
[2026-05-05T07:45:22Z] wrote row: sprint=SPRINT-02 agent=architect work_item=EPIC-001 ... delta=in:5/out:6428
[2026-05-05T07:45:30Z] wrote row: sprint=SPRINT-02 agent=architect work_item=EPIC-001 ... delta=in:6/out:114
[2026-05-05T07:49:24Z] wrote row: sprint=SPRINT-02 agent=architect work_item=EPIC-001 ... delta=in:12/out:7006
```

12 misattributions across the run. The active epic was `EPIC-002` throughout; `EPIC-001` was archived after SPRINT-01.

**Cumulative impact:** ~75k output tokens of ~310k session total (~25%) tagged to the wrong epic. Reporter cost analysis per-epic is skewed.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `cleargate-planning/.claude/hooks/token-ledger.sh` — the resolver chain that ends in `work_item_id fallback grep`. Need to identify the grep target file and add a sentinel-first / dispatch-marker-first lookup.
- `cleargate-planning/.cleargate/scripts/` — any helper script invoked by `token-ledger.sh` for work-item resolution.
- The mirror copies under `cleargate-cli/templates/cleargate-planning/.claude/hooks/` and live `/.claude/hooks/`.

**Do NOT touch:** the dispatch-marker write path (`write_dispatch.sh`); that's working correctly. Only the resolver fallback is broken.

## 5. Verification Protocol (The Failing Test)

**Reproduction harness:** add `cleargate-cli/test/scripts/test_token_ledger_resolver.sh` that:
1. Creates a fixture project with `.active` sentinel pointing to `SPRINT-NN` and a `dispatch-marker` for `EPIC-002`.
2. Plants an archive item containing `EPIC-001` reference.
3. Invokes the token-ledger resolver with no explicit work-item arg.
4. Asserts: resolved work_item is `EPIC-002` (from sentinel + marker), NOT `EPIC-001` (from archive grep).

**Manual verification:** re-run a SPRINT-NN+1 dogfood test in `markdown_file_renderer` and confirm `grep "work_item_id fallback grep" .cleargate/hook-log/token-ledger.log` returns 0 EPIC-001 hits when EPIC-002 is the active epic.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity** — repro is solid (12 instances captured); resolver chain needs source-code inspection to confirm exact grep target.

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [ ] Verification command (failing test) is provided. — *test harness sketched, not yet written*
- [ ] `approved: true` is set in the YAML frontmatter.
