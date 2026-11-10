---
cr_id: CR-120
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-43
carry_over: false
status: Draft
approved: false
context_source: "2026-09-06 execution-efficiency audit: all 4,437 ledger rows carry claude-opus-*, zero Sonnet rows; SPRINT-39 orchestrator transcript sums to the exact figure SPRINT-39_REPORT.md:305 publishes as sprint total"
area: sprint-execution,instrumentation,ledger,reporting
created_at: 2026-09-06T00:00:00Z
updated_at: 2026-09-06T00:00:00Z
created_at_version: cleargate@0.26.1
updated_at_version: cleargate@0.26.1
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-06T16:38:42Z
  transition: ready-to-apply
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-120
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-06T16:38:42Z
  sessions: []
---

# CR-120: Measure the Subagent, Not the Orchestrator — `subagent-ledger.mjs`

## 0.5 Open Questions

- **Question:** Should this replace `token-ledger.jsonl` or sit beside it?
- **Recommended:** Beside it. `token-ledger.jsonl` has consumers (`count_tokens.mjs`, `lib/ledger-digest.mjs`, `prep_reporter_context.mjs`, `stamp-tokens.ts`, the dashboard) and a `surface-whitelist.txt` row. A sibling `subagent-ledger.jsonl` gets 100% of the benefit with none of the migration risk. The existing ledger gains one honest label; it is not deleted.
- **Human decision:** {populated during Brief review}

- **Question:** Where does the new script get invoked?
- **Recommended:** One existing call site — `count_tokens.mjs`, which already owns the `<sprint-id>` CLI and the `--json` digest that `prep_reporter_context.mjs` consumes. Runs once at Gate 4, measured at 0.89 s for 158 agents. No hook, no emitter, no schema migration.
- **Human decision:** {populated during Brief review}

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- The belief that `token-ledger.jsonl` rows labelled `developer` or `qa` describe a Sonnet subagent's spend. They do not. `token-ledger.sh:270-283` slices the **parent orchestrator's** `TRANSCRIPT_PATH` by assistant-turn index and sums `.message.usage` from there. Every row in every sprint carries `claude-opus-*`; there is not one Sonnet row in the repo.
- The published figure `648,152,176` at `SPRINT-39_REPORT.md:305`. It is 2.17× the true orchestrator spend of `299,049,713` because both transcript tiers write each message twice and nothing dedupes by `message.id`.
- `count_tokens.mjs`'s dispatch counts. It reports 2,495 architect dispatches for SPRINT-39 against a true 70 — a denominator off by ~16×.
- Any tuning decision justified by a per-dispatch `cache_read` number. Two of the four largest claims in the 2026-09-06 audit were refuted by re-measuring the same data.

**New Logic (The New Truth):**

- A new read-only `.cleargate/scripts/subagent-ledger.mjs` (~30 lines) walks `dirname(transcript)/basename(transcript,'.jsonl')/subagents/`, reading the `agent-<id>.jsonl` + `agent-<id>.meta.json` pairs the host already writes (158 pairs survived on disk for SPRINT-39, 10 days later), dedupes by `message.id`, and emits one row per dispatch: `{agent_type, description, model, started_at, ended_at, wall_ms, turns, tool_uses, usage{...}}` into a sibling `subagent-ledger.jsonl`.
- Every row `token-ledger.sh` emits gains `"measures": "orchestrator-window"`, and `lib/ledger-digest.mjs` labels the column accordingly. The number stops being wrong by pretending to be something else.
- One SKILL.md line fixes the Agent `description` format to `<stage> <WORK-ITEM-ID>[ — note]`. 148 of 158 SPRINT-39 descriptions already parse; the rule takes the join to 100% at zero runtime cost.
- A `pre-gate.jsonl` line per scan — `{ts, mode, item, exit, flagged_checks[]}`. Today the only record is `${WORKTREE}/.cleargate/reports/pre-<mode>-scan.txt`, which dies with the worktree at §C.7 — which is exactly why nobody noticed the arch scan has never returned 0 (see [[BUG-087]]).

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update Story: none — no story depends on the ledger's per-agent semantics.
- [ ] Invalidate/Update Epic: none.
- [ ] Database schema impacts? No — JSONL files on disk only.

Downstream readers to verify, not change: `count_tokens.mjs`, `.cleargate/scripts/lib/ledger-digest.mjs`, `prep_reporter_context.mjs`, `reporter.md` §5, the sprint dashboard. Adding a field to existing rows and adding a sibling file must leave all of them working.

## Existing Surfaces

- **Surface:** `.cleargate/scripts/count_tokens.mjs` — already owns the `<sprint-id>` CLI and the `--json` digest that `prep_reporter_context.mjs` consumes.
- **Coverage of this requirement:** partial — correct host and correct invocation moment; it currently reads only the misattributed ledger.
- **Surface:** `.claude/hooks/token-ledger.sh:270-283` — the transcript slice that is the root of the misattribution.
- **Coverage of this requirement:** none — this is the defect being labelled, not fixed. It is deliberately left computing what it computes; only its self-description changes.
- **Surface:** `.cleargate/scripts/lib/ledger-digest.mjs` — the digest layer the Reporter reads at close.
- **Coverage of this requirement:** partial — the right place for the column label.
- **Surface:** `.cleargate/scripts/sprint_trends.mjs` — a 71-line stub whose output is literally "deferred to CR-027".
- **Coverage of this requirement:** none yet — the natural roll-up host once real per-dispatch data exists.

## Prior work

- none found for subagent-level instrumentation — the `cleargate-wiki-query` pass returned no prior item.
- [[EPIC-044]] — Completed, "Agent Dispatch Reliability & Token Efficiency". Covers token efficiency at the dispatch level, not subagent granularity. This CR supplies the measurement EPIC-044 optimised without.
- [[BUG-087]] — sibling in SPRINT-42; the `pre-gate.jsonl` line in this CR is what would have surfaced BUG-087's defect years earlier.
- [[BUG-085]] — Draft. Same family of "the thing we believe is running is not". Not a dependency.

## 3. Execution Sandbox

**Modify:**
- `.cleargate/scripts/subagent-ledger.mjs` (new) and its canonical mirror
- `.cleargate/scripts/count_tokens.mjs` and canonical — one call site
- `.cleargate/scripts/lib/ledger-digest.mjs` and canonical — column label
- `.claude/hooks/token-ledger.sh` and canonical — add the `measures` field only
- `.cleargate/scripts/surface-whitelist.txt` and canonical — add `subagent-ledger.jsonl` and `pre-gate.jsonl` rows beside the existing `token-ledger.jsonl` row
- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` and live — the `description` format line

**Do NOT modify:**
- `events.jsonl`, or `state-events.mjs`. `fold()`'s `maxTs = event.ts` assignment runs BEFORE the kind switch, so an unrecognised kind is not identity — `updated_at` still moves, `checkFoldDrift`'s byte-exact compare then fails, and `update_state.mjs:313` hard-exits 1 on every subsequent state write. That surfaces at the DevOps merge step, after a whole wave's work is complete, with remediation text telling the operator to delete the event log. The CR-106 purity contract is test-pinned at `state-scripts.test.mjs:1034`.
- `token-ledger.sh`'s computation. It fires ~16× per agent, so work added there costs 16× for none of the accuracy.
- `run_id` plumbing or the ledger schema version. Out of scope.

## Task Breakdown

- [ ] Write `subagent-ledger.mjs`: walk the `subagents/` dir, read `agent-*.jsonl` + `.meta.json` pairs, dedupe by `message.id`
- [ ] Emit one row per dispatch to a sibling `subagent-ledger.jsonl`
- [ ] Degrade to a warning and exit 0 if the host moves the `subagents/` path — this must never fail a Gate-4 close
- [ ] Wire the single call site in `count_tokens.mjs`
- [ ] Add `"measures": "orchestrator-window"` to `token-ledger.sh`'s emitted rows
- [ ] Label the column in `lib/ledger-digest.mjs`
- [ ] Add the two `surface-whitelist.txt` rows
- [ ] Add the `description` format line to SKILL.md
- [ ] Add the `pre-gate.jsonl` write to `pre_gate_runner.sh`
- [ ] Mirror every script to canonical

## 4. Verification Protocol

**Command/Test:** `bash .cleargate/scripts/test/cr120_subagent_ledger.red.sh`

The harness builds a `mktemp -d` fixture containing a synthetic `subagents/` directory with two `agent-*.jsonl` + `.meta.json` pairs, one carrying a duplicated `message.id`, and asserts: rows are emitted per dispatch; the duplicate is counted once; a missing `subagents/` directory yields a warning and exit 0; `token-ledger.jsonl` rows carry `measures`.

**Test layers.** Declare all three below.

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | pair-walk, `message.id` dedupe, missing-dir degradation, row shape |
| Integration tests | 0 | No Postgres/Redis surface; the transcript pairs are plain files |
| E2E / acceptance tests | 4 | 1 per assertion above, via the bash harness |

**Cross-check available:** the parent transcript's `duration_ms` and `tool_uses` are accurate to 0.04% and make a cheap validation of the new rows. Do NOT use its `<usage><subagent_tokens>` as a cost figure — measured, that field is the agent's final-turn context, not cumulative spend (qa sums to 8.5M by that field against 400.9M measured).

## Context Source

**context_source:** 2026-09-06 execution-efficiency audit. Verified: all 4,437 ledger rows carry `claude-opus-*`; summing all 2,581 assistant turns of the SPRINT-39 orchestrator transcript reproduces exactly the 648,152,176 that `SPRINT-39_REPORT.md:305` publishes as sprint total; `resolvedModel: claude-sonnet-5` appears on all 19 Developer Agent results in the same transcript; 158 `agent-*.jsonl`/`.meta.json` pairs confirmed still on disk; prototype walk measured at 0.89 s.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity. *(None impacted — §2 states this explicitly; no item depends on the ledger's per-agent semantics.)*
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.

> The single unchecked box is the Gate-1 human decision, plus the two §0.5 questions.
