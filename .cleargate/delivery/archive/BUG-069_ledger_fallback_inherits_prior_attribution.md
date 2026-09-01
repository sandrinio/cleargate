---
bug_id: BUG-069
parent_ref: ""
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Completed
severity: P1-High
reporter: orchestrator (field report from doc_processor SPRINT-15)
approved: true
area: scaffold-hooks
context_source: verified codebase grounding — token-ledger.sh fallback chain read directly, plus 101 poisoned ledger rows from a live sprint 2026-08-31
created_at: 2026-08-31T12:23:21Z
updated_at: 2026-09-01T18:49:08Z
created_at_version: 0.25.0
updated_at_version: 0.25.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-01T18:49:26Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
draft_tokens:
  input: 0
  output: 0
  cache_creation: 0
  cache_read: 0
  model: claude-opus-5
  last_stamp: 2026-09-01T20:23:24Z
  sessions:
    - session: 8bcf54da-73f3-4121-84d7-7ae0579f82d8
      model: claude-opus-5
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-09-01T20:13:06Z
---

# BUG-069: The token ledger's no-marker fallback inherits the previous row's attribution, so one bad row poisons the sprint permanently

> **Field report.** Surfaced 2026-08-31 alongside [[BUG-068]]. BUG-068 is the trigger (no dispatch
> marker is written); **this is the amplifier**, and it is the more dangerous half. BUG-068 alone
> would cost one row's attribution. This defect converts that into 101 consecutive wrong rows that
> can never self-correct.

### Open Questions

- **Question:** When no dispatch marker exists, should the ledger inherit the prior row, or refuse to attribute?
- **Recommended:** **Refuse.** Write the row with `agent_type: "unattributed"` and `work_item_id: ""`, and log the reason. A wrong attribution is strictly worse than a missing one because it *looks like data* — the Reporter consumes it without suspicion and publishes a confident, false cost table. A missing attribution is self-announcing and forces the question. This is the same posture the collision extractor already takes under [[BUG-033]]: when the surface is unknown, fail *safe and visible*, not *silently plausible*.
- **Human decision:** Accepted as recommended — Gate 1 approval recorded 2026-09-01.

- **Question:** Should the fix also repair already-poisoned ledgers?
- **Recommended:** **No — out of scope, and destructive.** Rewriting historical ledger rows would fabricate attribution that was never measured. Instead the Reporter should refuse to publish a per-agent cost table when the ledger contains `unattributed` rows or a single-value `agent_type` census, and say so. File that as a follow-on if the human agrees.
- **Human decision:** Accepted as recommended — Gate 1 approval recorded 2026-09-01.

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** When `token-ledger.sh` fires on `SubagentStop` and cannot determine which agent and work item the tokens belong to, it records that it could not determine them.

**Actual Behavior:** It copies the attribution from the most recent row already in the ledger. Because the ledger is append-only and the fallback reads its own previous output, the first wrong value is copied forward into every subsequent row for the life of the sprint. There is no path back to a correct value — the fallback can only ever reproduce what it last wrote.

In the observed sprint this produced **101 out of 101 rows** carrying identical, wrong attribution:

- `agent_type: "architect"` — architect never ran in that sprint
- `work_item_id: "CR-068"` — not a member of the sprint at all; it was scraped from the SessionStart banner's *blocked-items* list by an earlier transcript-grep
- `story_id: ""` — empty on every row
- `model: "claude-opus-5"` — the orchestrator's model, not the subagents' (they ran sonnet/haiku)
- `session_id` / `transcript` — the orchestrator's own session, not the subagent's

## 2. Reproduction Protocol

1. Ensure no dispatch marker will be written (today, [[BUG-068]] guarantees this; otherwise delete `.cleargate/sprint-runs/<sprint>/.dispatch-*.json` between dispatches).
2. Start a sprint and let one `SubagentStop` fire while the orchestrator transcript contains *any* id-shaped token — including one in the SessionStart banner. The legacy transcript-grep latches it.
3. Dispatch a genuinely different agent on a genuinely different work item. Let `SubagentStop` fire again.
4. `tail -2 .cleargate/sprint-runs/<sprint>/token-ledger.jsonl` → both rows carry the **same** `agent_type` and `work_item_id`.
5. Repeat any number of times. The value never changes and never corrects.

**Edge condition:** the poisoning is order-dependent and unrecoverable — it does not matter how many correctly-markered dispatches follow, because the fallback is only consulted when a marker is *absent*, and when consulted it never looks anywhere except the previous row.

## 3. Evidence & Context

The fallback chain, verbatim from `cleargate-planning/.claude/hooks/token-ledger.sh`:

```bash
360:    # Step 1: Read most-recent prior ledger row's work_item_id.
368:      PRIOR_LEDGER_ROW="$(tail -1 "${LEDGER}" 2>/dev/null)"
376:        printf '[%s] work_item_id from prior ledger row: %s\n' "$(date -u +%FT%TZ)" "${WORK_ITEM_ID}" >> "${HOOK_LOG}"
```

The hook names the behaviour in its own log line: `work_item_id from prior ledger row`.

Census over the live ledger (`doc_processor/.cleargate/sprint-runs/SPRINT-15/token-ledger.jsonl`, 101 rows):

```
keys: [('ts',101), ('sprint_id',101), ('story_id',101), ('work_item_id',101),
       ('agent_type',101), ('session_id',101), ('transcript',101),
       ('sentinel_started_at',101), ('delta_from_turn',101), ('delta',101),
       ('session_total',101), ('model',101), ('turns',101)]
agents: [(('agent_type','architect'), 101)]
```

One distinct value across 101 rows. A representative row:

```json
{"ts":"2026-08-31T12:08:44Z","sprint_id":"SPRINT-15","story_id":"","work_item_id":"CR-068",
 "agent_type":"architect","session_id":"b1bf8860-6327-4b36-8440-762d8f5df766",
 "transcript":"/Users/.../b1bf8860-....jsonl","sentinel_started_at":"","delta_from_turn":0,
 "delta":{"input":48,"output":29438,"cache_creation":45291,"cache_read":8345787},
 "session_total":{"input":1310,"output":781725,"cache_creation":1776540,"cache_read":143277424},
 "model":"claude-opus-5","turns":655}
```

`session_total.cache_read` is 143M and climbing — these are the *orchestrator's* cumulative totals, re-attributed to `architect` on every fire.

**Downstream consequence.** The Reporter derives the per-agent cost table from this file at sprint close. Left as-is it will state that `architect` spent ~185M tokens on `CR-068` during a sprint in which architect never ran and `CR-068` was not in scope.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `cleargate-planning/.claude/hooks/token-ledger.sh` — the Step-1 fallback at lines 360-376 and the surrounding fallback chain
- `cleargate-planning/.claude/agents/reporter.md` — the consumer; should refuse a per-agent cost table built on unattributed rows rather than publishing one

Do **not** touch the marker-writing path here — that is [[BUG-068]]'s scope. This item changes only what happens when the marker is absent.

## Task Breakdown

- [x] Replace the prior-row inheritance at `token-ledger.sh:360-376` with an explicit refusal: `agent_type="unattributed"`, `work_item_id=""`
- [x] Log the refusal with the reason (marker absent) so the condition is visible in `token-ledger.log`
- [x] Audit the remaining fallback steps for the same self-referential read — Steps 2/3/4 (dispatch-marker log scrape, first-user-message scan, anywhere-grep) were also self-referential/inference-based and were deleted along with Step 1, per M1.md §2's discharge note.
- [x] Teach the Reporter to detect unattributed rows and refuse to publish a per-agent cost table, naming the reason
- [ ] Re-sync npm payload and the live `/.claude/` instance — superseded by M1.md §0 item 4 (post-merge orchestrator/human step, not Developer scope for this milestone); left unticked per plan.
- [x] Add a regression test asserting two marker-less fires produce two `unattributed` rows, not two copies of row one — authored by QA-Red as `bug069_ledger_fallback.red.sh` Scenario 2, committed before this dispatch; verified green (17/17) against this change.

## 5. Verification Protocol (The Failing Test)

**Command:** `cd cleargate-cli && npx tsx --test src/**/*.node.test.ts`

Red test (must fail before the fix): seed a ledger whose last row reads `agent_type=architect, work_item_id=CR-068`. Fire `token-ledger.sh` with no dispatch marker present. Assert the appended row carries `agent_type=unattributed` and an empty `work_item_id`. Today it appends a verbatim copy of the seeded attribution.

Second red test: fire twice in a row with no marker and assert the ledger contains zero rows attributed to `architect` — proving the inheritance chain is broken, not merely relabelled once.

**Test layers.**

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 2 | single marker-less fire refuses to attribute; consecutive fires do not chain |
| Integration tests | 1 | seeded-ledger fixture through the real hook, asserting the full row shape written to disk |
| E2E / acceptance tests | 0 | no CLI surface; the Reporter refusal is asserted in the unit layer against a fixture ledger |

---

## Prior work

- [[BUG-068]] — the trigger. No dispatch marker is written because the PreToolUse hooks gate on the wrong tool name. **These two ship together or the fix is untestable in the field.**
- [[BUG-024]] — the original attribution spike; documents the legacy transcript-grep that supplies the first poisoned value.
- [[CR-026]] — introduced the dispatch-marker mechanism and this fallback chain alongside it.
- [[BUG-033]] — establishes the precedent this fix should follow: when metadata is unknown, fail safe and *visible* rather than silently plausible.
- [[CR-097]] — dashboard truthfulness; same principle applied to a different surface, and its Open Questions already record a sprint with "66.7M mis-attributed tokens".

## Context Source

**context_source:** verified codebase grounding — `token-ledger.sh` fallback chain read directly at lines 360-376; 101-row ledger census computed from a live consumer-repo sprint on 2026-08-31.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — approved at Gate 1 (2026-09-01)**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
