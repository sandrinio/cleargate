---
bug_id: BUG-039
parent_ref: EPIC-043
parent_cleargate_id: EPIC-043
sprint_cleargate_id: null
carry_over: false
status: Triaged
severity: P1-High
reporter: sandrinio
approved: true
area: cli
context_source: verified codebase grounding — reproduced in a clean repo initialised by published cleargate 0.20.0, driving a real 2-story sprint; `grep -rn CLEARGATE_STATE_FILE cleargate-cli/src/` returns nothing
created_at: 2026-08-01T00:00:00Z
updated_at: 2026-08-01T00:00:00Z
created_at_version: 0.20.0
updated_at_version: 0.20.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-01T20:15:22Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-039
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-08-01T20:15:41Z
  sessions: []
---

# BUG-039: `cleargate state update` Crashes — It Never Resolves the State File It Documents

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** `cleargate state update <story-id> <new-state>` resolves `state.json` from the `.active` sentinel and updates the story's state. Its own `--help` says so:

```
Options:
  --sprint <id>  sprint ID for active-sprint lookup (overrides .active sentinel)
```

"Overrides the `.active` sentinel" only means anything if the sentinel is the default lookup.

**Actual Behavior:** it always throws, with an unhandled Node stack trace:

```
Error: CLEARGATE_STATE_FILE env var not set; cannot resolve state.json
    at resolveStateFile (file:///…/.cleargate/scripts/update_state.mjs:71:9)
```

The CLI shells out to `update_state.mjs`, which requires `CLEARGATE_STATE_FILE`. **The CLI never sets it.** `grep -rn "CLEARGATE_STATE_FILE" cleargate-cli/src/` returns nothing at all.

`--sprint SPRINT-01` fails identically — the flag is parsed and then discarded, because the resolution it claims to override was never implemented.

The state machine that drives the entire sprint loop is unreachable through its own documented CLI.

## 2. Reproduction Protocol

Deterministic, from a clean directory. Reproduced against published `cleargate@0.20.0`:

1. `mkdir repro && cd repro && git init && npm i -D cleargate@0.20.0 && npx cleargate init`
2. Draft an epic, a story, and a sprint plan; get all three past their gates.
3. `npx cleargate sprint init SPRINT-01 --stories STORY-001-01`
   Confirm `.cleargate/sprint-runs/.active` contains `SPRINT-01` and `state.json` exists.
4. `npx cleargate state update STORY-001-01 Done`
   **Observe:** raw Node stack trace, `CLEARGATE_STATE_FILE env var not set`.
5. `npx cleargate state update STORY-001-01 Done --sprint SPRINT-01`
   **Observe:** identical failure.
6. `CLEARGATE_STATE_FILE=.cleargate/sprint-runs/SPRINT-01/state.json npx cleargate state update STORY-001-01 Done`
   **Observe:** `Updated STORY-001-01: state="Done"` — works.

Step 6 is the workaround and the proof: the only missing piece is a value the CLI is positioned to compute and doesn't.

## 3. Evidence & Context

`CLEARGATE_STATE_FILE` is a real, load-bearing convention elsewhere in the scaffold — `run_script.sh` forwards it, `pre_gate_runner.sh`, `close_sprint.mjs`, `validate_state.mjs`, `prefill_report.mjs` and `validate_bounce_readiness.mjs` all read it, and both `.claude/agents/devops.md` and `.claude/skills/sprint-execution/SKILL.md` instruct the orchestrator to export it. `CR-080`'s wrapper test (`cr080_wrapper.test.sh` F8-3) asserts the wrapper *forwards* it to the child.

So the convention is: **the caller exports it.** That is coherent for agents driving `run_script.sh` directly. It is not coherent for a first-class CLI command that advertises sentinel-based lookup and takes a `--sprint` flag.

Two things are therefore wrong, and they are separable:

1. **The command does not do what it says.** It should resolve `state.json` itself — the sentinel reader already exists (`resolveSprintIdFromSentinel`, and post-`[[BUG-036]]` also `resolveActiveSprint`, which additionally reports whether the sprint is real). Everything needed is already in `sprint-file-locate.ts`.
2. **The failure is an unhandled exception.** Even if the env var stays required, a missing one should produce a one-line diagnostic naming the remedy, not a stack trace from a `.mjs` file the user has never heard of. Every other gate in this codebase fails with a sentence.

Because agents in a running sprint export the variable, this defect is invisible during normal orchestrated execution and hits exactly the person running the command by hand — which is what `--help` invites.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `cleargate-cli/src/commands/state.ts` (or wherever `state update` is wired in `cli.ts`) — resolve the state file before spawning: honour `--sprint`, else `resolveActiveSprint(cwd)`, then pass `CLEARGATE_STATE_FILE` in the child env. Respect an already-set env var so the agent path is unchanged.
- `cleargate-cli/src/cli.ts` — the `--sprint` option is currently accepted and dropped.
- `cleargate-planning/.cleargate/scripts/update_state.mjs:71` — keep the throw as a backstop, but the CLI should never reach it.

**Checked, and NOT affected:** `cleargate state validate <sprint-id>` shells out to `validate_state.mjs`, which reads the same env var — but it works, because the sprint id is a positional argument and the wrapper resolves the path from it:

```
$ npx cleargate state validate SPRINT-01
state.json at …/.cleargate/sprint-runs/SPRINT-01/state.json is valid (schema_version=3)
```

That makes the defect narrower and the fix clearer: `state validate` already does the resolution `state update` is missing, in the same command family. The sibling is the reference implementation, not a second bug.

**Out of scope:** the `CLEARGATE_STATE_FILE` convention itself, which is sound for the agent/`run_script.sh` path and should keep working unchanged.

## 5. Verification Protocol (The Failing Test)

**Command:** `cd cleargate-cli && npm test`

A failing test that proves the bug: build a temp project with a `.active` sentinel naming a sprint that has a `state.json`, invoke the `state update` handler with a spawn seam and **no** `CLEARGATE_STATE_FILE` in the environment, and assert the spawned child receives `CLEARGATE_STATE_FILE` pointing at that sprint's `state.json`. It fails today — the variable is absent.

Three more: `--sprint <id>` overrides the sentinel; an already-set `CLEARGATE_STATE_FILE` is not clobbered; and with no sentinel and no flag the command exits non-zero with a one-line message rather than throwing.

`test/commands/sprint-sentinel-validation.node.test.ts` established the fixture shape for a project with a real sprint and is the natural neighbour.

---

## Prior work

- [[BUG-036]] — added `resolveActiveSprint()` to `sprint-file-locate.ts`, which returns the sprint id *and* whether it is real. That is precisely the resolver this command needs; the fix is to call it.
- [[CR-080]] — established `run_script.sh` env forwarding and asserted `CLEARGATE_STATE_FILE` reaches the child. It fixed the wrapper path, not the CLI path.
- [[BUG-037]] and [[BUG-038]] — filed from the same clean-install dogfood run. All three share a shape: a surface that is correct for the orchestrated path and broken for the direct one.
- No prior item covers `cleargate state update` resolving its own state file.

## Context Source

**context_source:** verified codebase grounding. Found while driving a real two-story sprint in a throwaway repo initialised by published `cleargate@0.20.0` — the state transition after the first story merged failed outright. The absence of any `CLEARGATE_STATE_FILE` write in `cleargate-cli/src/` was confirmed by grep, and the workaround in step 6 was executed and observed to succeed. No PM-tool or remote input.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — deterministic repro, root cause confirmed by grep, resolver already exists**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
