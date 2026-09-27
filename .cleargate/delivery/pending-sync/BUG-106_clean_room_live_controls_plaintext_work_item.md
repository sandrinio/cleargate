---
bug_id: BUG-106
parent_ref: STORY-058-13
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-41
carry_over: false
area: clean-room
status: Triaged
severity: P1-High
reporter: architect (plans/M7.md §4.3 / E15, from the SPRINT-41 Codex dogfood finding I12)
approved: true
approved_by: "sandrinio (SPRINT-41 directives: 'log every issue you find and fix them'; 2026-09-27 'you watch and file all issues, then fix and then use codex to test again'); registered by the orchestrator per plans/M7.md OD-M7-2"
approved_at: 2026-09-27T09:10:00Z
context_source: "plans/M7.md §1 E15, §3 BUG-106, §4.3, §4.5 R5; verified codebase grounding at story/STORY-058-13 f33cc4a: scripts/clean-room/loop-script.mjs:60-66 (task_name 'cg_probe', id only in message), scripts/clean-room/codex-hooks.mjs:395-410 (C6 dispatch, live prompt names no task), scripts/clean-room/codex-loop.mjs:668-679 (kickoff artifacts left uncommitted), evidence.mjs:839-875 (codex.live.dispatch-identity requires work_item=STORY-001-01)"
created_at: 2026-09-27T09:10:00Z
updated_at: 2026-09-27T08:29:10Z
created_at_version: strategy-phase-pre-init
updated_at_version: 94da1ca3-dirty
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-27T08:28:35Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-106
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-27T08:28:35Z
  sessions: []
---

# BUG-106: The clean-room harness's live dispatch controls carry the work-item id only in the encrypted message, so live dispatch-identity cannot pass

### Open Questions

- **Question:** How should the live S4 (codex-loop) and C6 (codex-hooks) controls supply a plaintext work-item id, given that `task_name "cg_probe"` is hardcoded in the `codex.live.roles` verdict and in sealed fixtures?
- **Recommended:** Keep `task_name "cg_probe"`. The harness runs the room's own `bash .cleargate/scripts/write_dispatch.sh STORY-001-01 qa` (installed environment) right before S4 and C6, so BUG-101's marker claim supplies the id. C6's live `dispatchPrompt` states the exact spawn arguments, in the same pattern as `SPAWN_INSTRUCTION`. `codex-loop` commits its kickoff artifacts as `chore(SPRINT-01): kickoff` on `sprint/S-01`, so a live orchestrator's §C.1 clean-tree check holds. `KNOWN_GAPS[0].followUp` cites BUG-100. The verdict code is unchanged (plans/M7.md §3 BUG-106).
- **Human decision:** Recommended option taken by the orchestrator per plans/M7.md OD-M7-2, under the owner's SPRINT-41 directives. The owner may overrule at the next check-in.

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** A live (logged-in) Codex run of the clean-room harness can pass `codex.live.dispatch-identity`, which needs exactly one `codex-identity` line containing `work_item=STORY-001-01` (evidence.mjs:839-875). That covers RS-4L's C6 and STORY-058-13 step L's S4.

**Actual Behavior:**
- Live `spawn_agent` messages are ciphertext (BUG-101).
- S4's `SPAWN_INSTRUCTION` uses `task_name "cg_probe"` and puts the id only in `message` (loop-script.mjs:60-66).
- C6's live prompt does not state the task at all (codex-hooks.mjs:400-403).

So even after BUG-101 (task_name first, then a dispatch marker, then the message), no plaintext source carries the id, and live dispatch-identity FAILs. Separately, codex-loop leaves the kickoff files uncommitted: `state.json`, `sprint-context.md`, `plans/waves.json` and `reports/PROBE-dev.md` (codex-loop.mjs:668-679). A live orchestrator following §C.1 therefore sees a dirty tree (M7 §4.5 R5).

## 2. Reproduction Protocol
1. Read the scripted routes of `codex-loop.mjs` (S4) and `codex-hooks.mjs` (C6) at `f33cc4a`. The only carrier of `STORY-001-01` for the spawn is the `message` field.
2. Feed BUG-101's resolution order (task_name "cg_probe" → no marker → encrypted message) through `evidence.mjs:839-875`: no identity line contains `work_item=STORY-001-01`, so dispatch-identity FAILs.
3. After `codex-loop prepare`, run `git status` in the room: the kickoff files are uncommitted.

Edge conditions:
- Scripted runs (plaintext message) must keep passing unchanged.
- `write_dispatch.sh` must run in the room's installed environment, not the meta-repo's.
- The kickoff commit must land on `sprint/S-01`, never `main`.

## 3. Evidence & Context
```
loop-script.mjs:60-66 (f33cc4a):
  task_name: 'cg_probe', agent_type: 'qa', fork_turns: 'none', message: CHILD_TASK
  const SPAWN_INSTRUCTION = `Call spawn_agent exactly once with agent_type "qa", task_name "cg_probe", fork_turns "none" and message "${CHILD_TASK}"`;
codex-hooks.mjs:406: const c6 = await turn('C6', { prompt: dispatchPrompt, toolItem: spawnAgentItem('call_c6', dispatchArgs), settle: childSettled });
evidence.mjs:839-875: codex.live.dispatch-identity requires exactly one codex-identity line with work_item=STORY-001-01
Live rollout (dogfood r3): spawn_agent {"task_name":"devops_preflight","agent_type":"devops","fork_turns":"none","message":"gAAAAABquMaq…"}
plans/M7.md §4.3: "After BUG-101: FAIL (task_name 'cg_probe' (loop-script.mjs:66), no marker)" · "After BUG-101 + BUG-106: PASS path"
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/scripts/clean-room/codex-loop.mjs`:
  - `write_dispatch.sh STORY-001-01 qa` before S4, run in the room;
  - a kickoff commit on `sprint/S-01` after `waves.json`;
  - `KNOWN_GAPS[0].followUp` → BUG-100.
- `cleargate-cli/scripts/clean-room/codex-hooks.mjs`: `write_dispatch.sh` before C6, and a live `dispatchPrompt` that states the exact spawn arguments.
- Tests beside `codex-loop-harness` / `codex-hooks-harness` (QA-Red re-scopes any sealed fixture that pins these sequences).

**Do NOT modify:** `evidence.mjs` or `loop-evidence.mjs` verdict code; `task_name "cg_probe"` (pinned by the `codex.live.roles` verdict and 91 sealed fixtures); anything under `src/` or `scaffold/` (this item is not an artifact input).

## Task Breakdown
- [ ] QA-Red: harness tests — a dispatch marker exists before S4 and before C6; the kickoff commit is on sprint/S-01 before S5; the scripted runs' verdicts are unchanged
- [ ] Implement the codex-loop and codex-hooks changes and the KNOWN_GAPS text
- [ ] Typecheck, codex-loop-harness / codex-hooks-harness / evidence tests green, one scripted codex-loop reproduction (harness lane)

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/scripts/clean-room-live-controls-plaintext.red.node.test.ts` (solo), plus `codex-loop-harness` and `codex-hooks-harness` green.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Two controls (codex-loop S4, codex-hooks C6) each gain the marker path |
| Interfaces | T | Two harness CLIs (codex-loop.mjs, codex-hooks.mjs) |
| Data | F | No data-shape variation; the marker shape is write_dispatch.sh's |
| Rules | T | Scripted verdicts are unchanged; the kickoff commit never lands on main |

```gherkin
Feature: Live dispatch controls carry a plaintext work-item id

  @paths @interfaces
  Scenario: codex-loop writes a dispatch marker before S4
    Given a prepared codex-loop room
    When the harness reaches S4
    Then .cleargate/sprint-runs/SPRINT-01 holds a .dispatch-*.json with work_item_id "STORY-001-01" and agent_type "qa" written before the S4 turn

  @paths @interfaces
  Scenario: codex-hooks writes a dispatch marker before C6 and states the spawn
    Given a prepared codex-hooks room
    When the harness reaches C6
    Then a .dispatch-*.json for STORY-001-01/qa exists and the C6 prompt names agent_type "qa" and task_name "cg_probe"

  @rules
  Scenario: The kickoff is committed on the sprint branch
    When codex-loop prepare finishes the kickoff
    Then sprint/S-01 has a "chore(SPRINT-01): kickoff" commit, main is unchanged and the room tree is clean
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 3 | one per scenario, scripted harness in temp rooms |
| Integration tests | 0 | the existing harness e2e covers the full scripted run |
| E2E / acceptance tests | 0 | the formal live run (RS-L / RS-4L) is the real proof |

---

## Prior work

- [[STORY-058-13]]: owns codex-loop.mjs and the S4 control.
- [[STORY-058-10]]: owns codex-hooks.mjs and the C6 control.
- [[BUG-101]]: the dispatch-marker claim this item feeds.

## Context Source

**context_source:** plans/M7.md §1 E15, §3, §4.3, §4.5 (architect, 2026-09-27); code grounding at story/STORY-058-13 `f33cc4a`; owner directives recorded in `approved_by`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
