---
cr_id: CR-046
parent_ref: EPIC-013
parent_cleargate_id: EPIC-013
sprint_cleargate_id: SPRINT-23
carry_over: false
status: Ready
approved: true
approved_at: 2026-05-04T10:30:00Z
approved_by: human
created_at: 2026-05-04T10:00:00Z
updated_at: 2026-05-04T10:30:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
context_source: |
  V-Bounce-Engine reference (skills/agent-team/SKILL.md L753-790): all agent
  script invocations go through `run_script.sh` wrapper. Wrapper captures:
  command, exit code, stdout, stderr, attempt-self-repair output. Failed
  scripts log a structured `## Script Incidents` section in agent reports.

  ClearGate evidence of need: SPRINT-21 had several mystery-staged-changes
  incidents (the duplicate `--emit-json` flag in assert_story_files.mjs,
  hook auto-stamps that triggered confusing diffs). The orchestrator
  manually investigated each; with run_script.sh, every script invocation
  would have a captured stderr + exit + repro context, written to a
  dedicated section in the dispatching agent's report.

  SPRINT-22 also surfaced this: pre-commit-surface-gate.sh failures were
  diagnosed by reading bash output in chat. With run_script.sh, the failure
  + repro would be structured into the dispatch's report automatically.
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-04T12:34:46Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-046
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-04T10:21:58Z
  sessions: []
---

# CR-046: run_script.sh wrapper + script-incidents reporting

## 0.5 Open Questions

- **Question:** Where does the wrapper live?
  - **Recommended:** `.cleargate/scripts/run_script.sh`. Sibling of the existing scripts (close_sprint.mjs, init_sprint.mjs, etc.). Bash for portability + zero install cost.
  - **Human decision:** _populated during Brief review_

- **Question:** What's the wrapper's interface?
  - **Recommended:** `bash .cleargate/scripts/run_script.sh <command> [args...]`. Wraps execution; on success exits 0 with passthrough stdout/stderr; on failure exits with the wrapped command's exit code AND writes a structured incident JSON to `.cleargate/sprint-runs/<sprint-id>/.script-incidents/<timestamp>-<command-hash>.json`. Agent dispatching the script reads the incident JSON in its report.
  - **Human decision:** _populated during Brief review_

- **Question:** Self-repair attempts?
  - **Recommended:** SCOPE OUT for v1. V-Bounce wrapper has self-repair logic; ClearGate's v1 just captures + reports + propagates exit code. Self-repair is CR-049-candidate (future).
  - **Human decision:** _populated during Brief review_

- **Question:** Which scripts MUST go through the wrapper?
  - **Recommended:** mandatory for all bash scripts dispatched FROM agents (Dev/QA/Architect/Reporter/DevOps). Optional for orchestrator-direct invocation (orchestrator surfaces failures conversationally already). Document in SKILL.md §C dispatch contracts.
  - **Human decision:** _populated during Brief review_

- **Question:** Incident schema?
  - **Recommended:** JSON with fields: `ts`, `command`, `args`, `cwd`, `exit_code`, `stdout` (truncated at 4KB), `stderr` (truncated at 4KB), `agent_type`, `work_item_id`. Schema defined in `cleargate-cli/src/lib/script-incident.ts` for typed consumption by reporter.
  - **Human decision:** _populated during Brief review_

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- Agents invoke scripts directly: `bash .cleargate/scripts/init_sprint.mjs SPRINT-NN`.
- Script failures appear as raw bash output in chat or in the agent's free-form report.
- Each script-failure investigation requires the orchestrator to manually re-run + capture context.

**New Logic (The New Truth):**
- Agents invoke scripts via wrapper: `bash .cleargate/scripts/run_script.sh node .cleargate/scripts/init_sprint.mjs SPRINT-NN`.
- Wrapper captures: command, args, cwd, exit code, stdout/stderr (truncated 4KB each), agent_type, work_item_id.
- On failure: wrapper writes structured incident JSON; agent's report includes `## Script Incidents` section listing all incidents from this dispatch.
- Reporter at sprint close aggregates incidents across all dispatches; surfaces patterns in sprint REPORT.md.

## 2. Blast Radius & Invalidation

- [ ] **`.cleargate/scripts/run_script.sh`** — NEW wrapper script.
- [ ] **`cleargate-cli/src/lib/script-incident.ts`** — NEW typed schema for incident JSON.
- [ ] **`cleargate-planning/.claude/skills/sprint-execution/SKILL.md` §C dispatch contracts** — document wrapper-mandatory rule for agent dispatches.
- [ ] **`cleargate-planning/.claude/agents/{developer,qa,architect,devops,reporter}.md`** — add "Script Invocation" section instructing wrapper use.
- [ ] **`cleargate-planning/.claude/agents/reporter.md`** — extend prompt to aggregate `## Script Incidents` sections from agent reports into REPORT.md §Risks Materialized.
- [ ] **`.cleargate/sprint-runs/<sprint-id>/.script-incidents/`** — NEW directory written by wrapper. Add to .gitignore? Decision: TRACK incident JSONs (they're sprint history; valuable for retrospective).
- [ ] **No state-machine change.**

## Existing Surfaces

- **Surface:** `.cleargate/scripts/init_sprint.mjs` — sprint orchestration script (sample callee for the wrapper).
- **Surface:** `.cleargate/scripts/close_sprint.mjs` — close-pipeline script (sample callee).
- **Surface:** `.cleargate/scripts/update_state.mjs` — state-mutation script (sample callee).
- **Surface:** `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` §C — dispatch contracts. Wrapper rule lands here.
- **Surface:** `cleargate-planning/.claude/agents/reporter.md` — Reporter aggregates incidents.
- **Why this CR extends rather than rebuilds:** existing scripts stay; wrapper is additive infrastructure. Not a from-scratch CI/test framework.

## 3. Execution Sandbox

**Modify:**
- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` §C dispatch contracts
- `cleargate-planning/.claude/agents/{developer,qa,architect,devops,reporter}.md`

**Add:**
- `.cleargate/scripts/run_script.sh` — bash wrapper
- `cleargate-cli/src/lib/script-incident.ts` — typed schema
- `cleargate-cli/test/scripts/run-script-wrapper.node.test.ts` — 5 scenarios: success-passthrough, failure-captures-stdout-stderr, exit-code-propagation, incident-json-schema-valid, truncation-at-4KB.

**Out of scope:**
- Self-repair logic (CR-049-candidate, future).
- Wrapping orchestrator-direct script invocations (optional — orchestrator surfaces failures conversationally already).
- Retroactively wrapping every existing script call site (only NEW agent dispatches go through the wrapper from CR-046 onward).

## 4. Verification Protocol

**Acceptance:**
1. `bash .cleargate/scripts/run_script.sh true` exits 0 with no stderr; no incident JSON written.
2. `bash .cleargate/scripts/run_script.sh false` exits 1 with structured stderr; incident JSON written to `.cleargate/sprint-runs/<active>/.script-incidents/`.
3. Incident JSON validates against `cleargate-cli/src/lib/script-incident.ts` schema.
4. NEW `*.red.node.test.ts` (QA-Red authored) covers the 5 scenarios above; Dev makes them pass.
5. SKILL.md §C dispatch contracts mandate wrapper for Dev/QA/Architect/DevOps script invocations.
6. Reporter prompt in reporter.md aggregates `## Script Incidents` sections from agent reports.
7. Mirror parity: `diff` canonical ↔ npm payload empty for all touched files post-prebuild.

**Test Commands:**
- `npm test -- test/scripts/run-script-wrapper.node.test.ts`
- (Manual) `bash .cleargate/scripts/run_script.sh ls /nonexistent` and inspect generated incident JSON.

**Pre-commit:** `cd cleargate-cli && npm run typecheck` + `npm test` (node:test only). Never `--no-verify`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Yellow — Awaiting Brief approval**

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] Downstream impacts identified (NEW wrapper + schema + dir; SKILL.md + 5 agent prompts).
- [x] Execution Sandbox contains exact file paths.
- [x] Verification commands provided (7 acceptance criteria).
- [ ] `approved: true` is set in YAML frontmatter (post-Brief).
- [x] §Existing Surfaces cites at least one source-tree path the CR extends.
