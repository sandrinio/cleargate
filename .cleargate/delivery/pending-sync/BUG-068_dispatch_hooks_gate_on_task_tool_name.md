---
bug_id: BUG-068
parent_ref: ""
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: In Fix
severity: P0-Critical
reporter: orchestrator (field report from doc_processor SPRINT-15)
approved: true
area: scaffold-hooks
context_source: verified codebase grounding — hook sources, live settings.json, and two repos' hook-log evidence read directly 2026-08-31
created_at: 2026-08-31T12:23:21Z
updated_at: 2026-09-01T18:49:08Z
created_at_version: 0.25.0
updated_at_version: 0.25.0
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
  last_gate_check: 2026-09-01T18:49:25Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# BUG-068: Every PreToolUse dispatch hook gates on the tool name `Task`; this Claude Code build spawns agents with `Agent`

> **Field report.** Surfaced 2026-08-31 from a live sprint in a consumer repo (`doc_processor`
> SPRINT-15) running cleargate 0.25.0, and independently confirmed against this repo's own scaffold.
> **This is a regression of [[CR-026]]**, the fix that closed [[BUG-024]]. The fix itself is intact;
> the host renamed the tool it keys on.

### Open Questions

- **Question:** Match `Agent` in addition to `Task`, or stop matching on tool name entirely and key on the presence of `tool_input.subagent_type`?
- **Recommended:** **Match both names AND keep a `subagent_type` presence check as the real predicate.** A name allow-list (`Task|Agent`) restores today's behaviour immediately; treating `tool_input.subagent_type` as the actual signal makes the hook survive the next rename. Do both: accept when the tool name is in `{Task, Agent}` *or* when `subagent_type` is present.
- **Human decision:** Accepted as recommended — Gate 1 approval recorded 2026-09-01.

- **Question:** Should the tool-name mismatch path log?
- **Recommended:** **Yes — this is the core lesson.** The mismatch is the only early-exit in `pre-tool-use-task.sh` that writes no log line, which is precisely why the failure was invisible for four days. Every early exit must leave a trace. See [[BUG-058]] (predicate vocabulary omits marker absence) for the same class of defect.
- **Human decision:** Accepted as recommended — Gate 1 approval recorded 2026-09-01.

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** When the orchestrator dispatches a sprint agent, the `PreToolUse` hooks fire and (a) `pre-tool-use-task.sh` writes a `.dispatch-<ts>-<pid>-<rand>.json` marker naming the agent role and work item, and (b) `pending-task-sentinel.sh` enforces the pre-dispatch flashcard gate and sets the pending-task sentinel.

**Actual Behavior:** Neither hook does anything. Both gate on `tool_name == "Task"`, and this Claude Code build's agent-spawn tool is named **`Agent`**. All three mechanisms are silently dead:

1. **No dispatch marker is ever written** — so `token-ledger.sh` falls back to its legacy path and mis-attributes every row (amplified into permanent corruption by [[BUG-069]]).
2. **The pre-dispatch flashcard gate never fires** — `pending-task-sentinel.sh:53` guards the whole barrier on `TOOL_NAME_EARLY == "Task"`. Unprocessed flashcards no longer block dispatch. This is a silent safety regression, not just an accounting one.
3. **The pending-task sentinel is never set** — `pending-task-sentinel.log` is 0 bytes and has been since 2026-07-13.

The failure is **completely silent**. `pre-tool-use-task.sh` logs a reason on every other early exit (`no marker: regex miss`, `no marker: agent_type absent or not in allow-list`, `no .active sentinel`), but the tool-name mismatch at line 45 exits before writing anything. `pre-tool-use-task.log` is therefore never even created.

## 2. Reproduction Protocol

1. In any repo with the ClearGate scaffold installed, set an active sprint: `.cleargate/sprint-runs/.active` contains a sprint id.
2. Dispatch any sprint agent from the orchestrator (`architect`, `developer`, `qa`, `reporter`).
3. `ls .cleargate/sprint-runs/<sprint>/.dispatch-*.json` → **no matches**.
4. `ls .cleargate/hook-log/pre-tool-use-task.log` → **file does not exist** (the hook never reached its first log write).
5. `wc -c .cleargate/hook-log/pending-task-sentinel.log` → **0**.
6. Confirm the tool name: the orchestrator transcript records `"name":"Agent"` on the dispatch, not `"name":"Task"`.

**Boundary condition that dates the regression:** this worked until the host renamed the tool. This repo's `.cleargate/hook-log/write_dispatch.log` has normal entries through `2026-08-30T22:15:27Z` (`wrote dispatch: sprint=SPRINT-39 ... agent=reporter`) written by a session on the older build; a session started `2026-08-31T09:02Z` on the newer build writes none.

## 3. Evidence & Context

Consumer-repo evidence (`doc_processor`, SPRINT-15, cleargate 0.25.0):

```
$ ls .cleargate/sprint-runs/SPRINT-15/.dispatch-*.json
zsh: no matches found

$ ls -la .cleargate/hook-log/
-rw-r--r--  1 ssuladze  staff        0 Jul 13 15:12 pending-task-sentinel.log
-rw-r--r--  1 ssuladze  staff    24303 Aug 28 13:03 write_dispatch.log     <- last entry SPRINT-13
(no pre-tool-use-task.log at all)

$ tail -1 .cleargate/hook-log/write_dispatch.log
[2026-08-28T09:03:30Z] wrote dispatch: sprint=SPRINT-13 session=93b063b9-... work_item=SPRINT-13 agent=reporter
```

Tool-name census over the live orchestrator transcript (2370 records, sprint window `2026-08-31T09:02Z`–`12:13Z`):

```
tool uses: [('Bash', 314), ('Agent', 23), ('Skill', 2), ('AskUserQuestion', 2),
            ('Edit', 1), ('Write', 1), ('SendMessage', 1)]
Task dispatches total: 0
```

23 agent spawns, all via `Agent`; zero via `Task`.

The three guards, verbatim:

```bash
# .claude/settings.json:15
"matcher": "Task",

# .claude/hooks/pre-tool-use-task.sh:43-48
# ─── Extract tool_name to confirm this is a Task spawn ───
TOOL_NAME="$(printf '%s' "${INPUT}" | jq -r '.tool_name // empty' 2>/dev/null)"
if [[ "${TOOL_NAME}" != "Task" ]]; then
  # Not a Task spawn — nothing to do; exit silently.
  exit 0
fi

# .claude/hooks/pending-task-sentinel.sh:53  (flashcard gate barrier)
if [[ "${TOOL_NAME_EARLY}" == "Task" && "${SKIP_FLASHCARD_GATE:-0}" != "1" && "${SPRINT_ID}" != "_off-sprint" ]]; then

# .claude/hooks/pending-task-sentinel.sh:157  (sentinel write)
  if [[ "${TOOL_NAME}" != "Task" ]]; then
    exit 0
  fi
```

**Blast radius is every install, not just this repo.** The `"matcher": "Task"` string is byte-identical in canonical, the live dogfood instance, and the npm payload:

```
cleargate-planning/.claude/settings.json:15:        "matcher": "Task",
.claude/settings.json:15:                          "matcher": "Task",
cleargate-cli/templates/cleargate-planning/.claude/settings.json:15:        "matcher": "Task",
```

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `cleargate-planning/.claude/hooks/pre-tool-use-task.sh` — the tool-name guard and its silent exit
- `cleargate-planning/.claude/hooks/pending-task-sentinel.sh` — flashcard-gate barrier and sentinel guard
- `cleargate-planning/.claude/settings.json` — the `PreToolUse` matcher
- `cleargate-planning/.claude/hooks/token-ledger.sh` — consumer of the marker; verify it reads correctly once markers return

Canonical → payload → live mirror discipline applies: after the canonical edit, re-sync the npm payload and the live `/.claude/` instance. See [[CR-099]] (dogfood split integrity) — the whole point of that item is that canonical edits do not propagate on their own.

## Task Breakdown

- [ ] Replace the `!= "Task"` guard in `pre-tool-use-task.sh` with an accept-predicate: tool name in `{Task, Agent}` OR `tool_input.subagent_type` present
- [ ] Add a log line to the rejected-tool-name path so the exit is never silent again
- [ ] Apply the same accept-predicate to both guards in `pending-task-sentinel.sh` (line 53 barrier, line 157 sentinel)
- [ ] Change the `PreToolUse` matcher in `settings.json` from `"Task"` to `"Task|Agent"`
- [ ] Re-sync npm payload (`npm run prebuild`) and the live `/.claude/` instance
- [ ] Add a regression test that feeds a synthetic `Agent` PreToolUse payload to both hooks and asserts a marker is written

## 5. Verification Protocol (The Failing Test)

**Command:** `cd cleargate-cli && npx tsx --test src/**/*.node.test.ts`

Red test (must fail before the fix): construct a `PreToolUse` payload with `tool_name: "Agent"`, `tool_input.subagent_type: "developer"`, and a prompt naming a work item; pipe it to `pre-tool-use-task.sh` with `.active` set; assert exactly one `.dispatch-*.json` appears naming `agent_type=developer`. Today zero files appear.

Second red test: same payload to `pending-task-sentinel.sh` with an unprocessed flashcard present; assert the barrier blocks (non-zero exit / stderr message). Today it passes through.

Third: assert the rejected-name path writes a log line for a genuinely unrelated tool name (`tool_name: "Bash"`).

**Test layers.**

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 3 | one per guard surface: dispatch-marker write, flashcard barrier, silent-exit logging |
| Integration tests | 1 | end-to-end: synthetic `Agent` dispatch → marker written → `token-ledger.sh` consumes it and attributes the row correctly |
| E2E / acceptance tests | 0 | no user-facing CLI surface changes; the contract is hook-internal and fully covered by the integration case above |

---

## Prior work

- [[BUG-024]] — the original token-ledger attribution spike (100% of rows misrouted). Same symptom, different cause; its fix is what regressed here.
- [[CR-026]] — the fix that closed BUG-024 by introducing the `PreToolUse:Task` hook and dispatch markers. **This bug is that CR's regression.**
- [[BUG-034]] — flashcard-gate suppression leaking in the parallel path. Different mechanism (exception-safety of `SKIP_FLASHCARD_GATE` restore); this bug disables the same gate from the front.
- [[BUG-058]] — predicate vocabulary omits marker absence: the same "absence is invisible" failure class.
- [[CR-099]] — dogfood split integrity; governs the canonical → payload → live re-sync this fix requires.

## Context Source

**context_source:** verified codebase grounding — hook sources, `settings.json` matchers across all three copies, and hook-log evidence from two repos read directly on 2026-08-31; plus a field report from the `doc_processor` SPRINT-15 orchestrator which independently reached the same root cause.

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
