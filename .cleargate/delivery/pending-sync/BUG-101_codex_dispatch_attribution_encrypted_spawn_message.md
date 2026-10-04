---
bug_id: BUG-101
parent_ref: EPIC-058
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-41
carry_over: false
area: codex-adapter
status: Triaged
severity: P1-High
reporter: orchestrator (SPRINT-41 Codex dogfood run, 2026-09-27)
approved: true
approved_by: "sandrinio (SPRINT-41 directives: 'log every issue you find and fix them'; 2026-09-27 'you watch and file all issues, then fix and then use codex to test again'); applied by the orchestrator under sprint autonomy"
approved_at: 2026-09-27T08:00:00Z
context_source: "Codex dogfood run r3 (live codex-cli 0.154.0, ChatGPT login) rollout rollout-2026-09-27T11-31-58-01a0e1c7…jsonl; hook logs pending-task-sentinel.log / token-ledger.log; verified codebase grounding at cli main f0c33f7: scaffold/hosts/codex/.codex/hooks/pending-task-sentinel.sh:321-332, token-ledger.sh:140-167, scripts/build-codex-payload.mjs R5"
created_at: 2026-09-27T08:00:00Z
updated_at: 2026-09-27T08:29:06Z
created_at_version: strategy-phase-pre-init
updated_at_version: 94da1ca3-dirty
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-27T07:50:25Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-101
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-27T07:50:25Z
  sessions: []
---

# BUG-101: Codex dispatches are never attributed to a work item: live `spawn_agent` messages are encrypted, and the hook reads only the message

### Open Questions

- **Question:** Where should the Codex dispatch hook get the work-item id, given that the live `spawn_agent` `message` is ciphertext?
- **Recommended:** Use both plaintext sources, in order.
  1. `tool_input.task_name`: match `(story|epic|cr|bug|proposal)[-_]?\d+([-_]\d+)?` case-insensitively and normalise it to `STORY-001-01`. The Codex playbook row (build-codex-payload.mjs R5) must tell the orchestrator to put the id in `task_name` (for example `story_001_01_qa`).
  2. The newest unconsumed `.dispatch-*.json` marker in the sprint dir whose `agent_type` matches the spawn. That marker is orchestrator-written plaintext. Consume it when claimed.

  The encrypted `message` stays a last-resort source, since it is plaintext under the scripted provider. R5's "skip the `write_dispatch.sh` fallback" guidance becomes: set `task_name`; the fallback marker is optional.
- **Human decision:** Recommended option taken by the orchestrator under the owner's SPRINT-41 directives. The owner may overrule at the next check-in.

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** Every role dispatch under Codex is attributed to its work item:
- the PreToolUse dispatch sentinel records `work_item_id`;
- the SubagentStop identity line records `work_item=STORY-NNN-NN`.

Per-story reporting then works, and so does the dashboard. STORY-058-13's `codex.loop.dispatch-identity` control expects `work_item=STORY-001-01` on the identity line.

**Actual Behavior:** In a live Codex session (ChatGPT login), `spawn_agent`'s `message` argument is encrypted (`"message":"gAAAAABquMaq…"`). The Codex branch of `pending-task-sentinel.sh` extracts the work item only from `.tool_input.prompt // .tool_input.message`, so every sentinel and every identity line records `work_item=` empty.
- The orchestrator's `write_dispatch.sh` markers are never consumed on the Codex path, and they pile up in the sprint dir.
- The scripted provider sends plaintext messages, so the clean-room harness never saw this.
- A live STORY-058-13 step L run would therefore fail `codex.loop.dispatch-identity`.

## 2. Reproduction Protocol
1. Install with `cleargate init --host codex` and start a sprint (`.active` set). Run a live Codex session with the owner's login, via `codex exec … --dangerously-bypass-hook-trust` or the TUI.
2. Have the orchestrator dispatch a role with `spawn_agent` (agent_type `qa`), with a brief that names `STORY-001-01`. Optionally run `write_dispatch.sh STORY-001-01 qa` first.
3. Observe:
   - `.cleargate/hook-log/pending-task-sentinel.log` shows `wrote sentinel sprint=SPRINT-01 agent=qa work_item= turn=0`;
   - `token-ledger.log` shows `codex-identity … agent_type=qa … work_item= …`;
   - the rollout's `spawn_agent` arguments show an encrypted `message`, with plaintext `task_name` and `agent_type`.

Edge conditions:
- The scripted provider (plaintext message) still attributes correctly and must keep doing so.
- Parallel or back-to-back dispatches of the same agent_type must each claim a distinct marker (oldest-first, as the sentinel claim already does).
- A `task_name` with no id falls through to the marker.

## 3. Evidence & Context
```
rollout-2026-09-27T11-31-58-01a0e1c7-1780-71c3-92cb-f56f4dc4b178.jsonl (live codex-cli 0.154.0):
spawn_agent {"task_name":"devops_preflight","agent_type":"devops","fork_turns":"none","message":"gAAAAABquMaqLCJTWNi0AcE9RJ6tkMnQ0AjBjQe3M496QEuGNi44HC5FJ0tDbYSE4h09rOAicWJlXjGFlixs72I_Iok5OmlD6TTkJ73KUuWLo48YbL33cOZVUDaSHGGGCr8of4l143I5M68pJm_…"}
spawn calls: 12

.cleargate/hook-log/pending-task-sentinel.log:
[2026-09-27T07:34:32Z] wrote sentinel sprint=SPRINT-01 agent=architect work_item= turn=0
[2026-09-27T07:41:13Z] wrote sentinel sprint=SPRINT-01 agent=qa work_item= turn=0
.cleargate/hook-log/token-ledger.log:
[2026-09-27T07:43:09Z] codex-identity sprint=SPRINT-01 agent_type=qa agent_id=01a0e1cf-9887-76a3-9051-33c80f83047b work_item= sentinel=.pending-codex-task-0-57009-28026.json metering=unavailable

Orphaned markers (never consumed), sprint-runs/SPRINT-01/:
.dispatch-1790494865-56634-1483.json {"work_item_id":"STORY-001-01","agent_type":"qa","spawned_at":"2026-09-27T07:41:05Z","session_id":"8da255a6-…","writer":"write_dispatch.sh@cleargate-unknown"}
(+3 more for M1/architect)

pending-task-sentinel.sh:321-331 (codex branch):
  PROMPT="$(printf '%s' "${INPUT}" | jq -r '.tool_input.prompt // .tool_input.message // empty')"
  WORK_ITEM_ID="$(printf '%s' "${PROMPT}" | grep -oE '(STORY|PROPOSAL|EPIC|CR|BUG)[-=]?[0-9]+(-[0-9]+)?' | head -1 | sed 's/=/-/g')"

build-codex-payload.mjs R5 row: "`write_dispatch.sh` fallback blocks … | skip the fallback: the `Agent\|.*spawn_agent` dispatch hook and the SubagentStop hook attribute every dispatch"
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/scaffold/hosts/codex/.codex/hooks/pending-task-sentinel.sh`: the codex branch's work-item source, in order task_name → matching `.dispatch-*.json` marker (claim and consume) → message.
- `cleargate-cli/scripts/build-codex-payload.mjs`: the R5 row text (require the id in `task_name`; the marker is optional). Then regenerate the Codex payload (`--check` must pass).
- Tests beside the existing codex hook tests (`codex-hooks-harness` fixtures stay green; add a live-shaped fixture with an encrypted-looking message).

**Do NOT modify:**
- the Claude hook `scaffold/hosts/claude/.claude/hooks/pending-task-sentinel.sh` (the Claude path reads a plaintext `prompt`);
- `scripts/clean-room/**` (STORY-058-13 in flight; its scripted routes keep plaintext messages);
- `token-ledger.sh`'s claim logic (it already reads `work_item_id` from the claimed sentinel).

## Task Breakdown

> **Binding plan:** `.cleargate/sprint-runs/SPRINT-41/plans/M7.md` §3 BUG-101 (errata §1 E1, E3, E4, E15; I16 R4 row (OD-M7-3)). The plan wins where it differs from this file.

- [x] QA-Red: codex-dispatch-attribution red (6); Test 31 R4/R5 re-pin; sentinel refusal-chain hash
- [x] Codex-branch source order task_name → marker (newest, 10 min, agent_type) → message; source= log field; R4 + R5 texts; gen:codex
- [x] Typecheck, targeted, codex-hooks-harness 91, --check, hooks-claude-parity, test 46 + scripted codex-loop (harness lane)

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/hooks/codex-dispatch-attribution.red.node.test.ts` (solo), plus `codex-hooks-harness` green.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | The id comes from task_name, from a dispatch marker, or from a plaintext message: three successful ways |
| Interfaces | F | One surface: the Codex PreToolUse dispatch hook (the SubagentStop identity reads what it wrote) |
| Data | T | An encrypted message vs a plaintext message; task_name with and without an id |
| Rules | T | A claimed marker is consumed exactly once; the Claude path is untouched |

```gherkin
Feature: Codex dispatches are attributed without reading the encrypted message

  @paths @data
  Scenario: The work item comes from task_name
    Given a codex spawn_agent payload with task_name "story_001_01_qa", agent_type "qa" and an encrypted message
    When pending-task-sentinel.sh runs under --host codex
    Then the sentinel records work_item_id "STORY-001-01"

  @paths @rules
  Scenario: The work item comes from the orchestrator's dispatch marker
    Given a .dispatch-*.json marker {work_item_id: "STORY-001-01", agent_type: "qa"} and a spawn with task_name "qa_verify"
    When the hook runs
    Then the sentinel records work_item_id "STORY-001-01" and the marker is consumed

  @paths @data
  Scenario: A plaintext message still attributes (scripted provider)
    Given a spawn payload whose message contains "STORY-001-01"
    When the hook runs
    Then the sentinel records work_item_id "STORY-001-01"

  @rules
  Scenario: The Claude hook is unchanged
    Given the Claude pending-task-sentinel.sh
    Then its bytes equal the recorded baseline
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | one per scenario, spawning the hook with fixture payloads in temp sprint dirs |
| Integration tests | 0 | codex-hooks-harness (existing) guards the scripted path |
| E2E / acceptance tests | 0 | proven by the SPRINT-41 Codex dogfood re-run (identity lines carry work_item) |

---

## Prior work

- [[STORY-058-10]]: added the Codex branch of pending-task-sentinel.sh (M5-A23: agent_type and message on Codex).
- [[STORY-058-12]]: the Codex playbook render (build-codex-payload.mjs R5) that tells the orchestrator to skip the write_dispatch fallback.
- [[STORY-058-13]]: its `codex.loop.dispatch-identity` control needs `work_item=STORY-001-01`, which a live run cannot produce until this is fixed.
- [[BUG-029]]: the dispatch-marker tuple-match on the Claude path, the pattern reused here.

## Context Source

**context_source:** Live Codex dogfood run r3 (2026-09-27) rollout and hook logs; code grounding at cli main `f0c33f7`; owner directives recorded in `approved_by`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
