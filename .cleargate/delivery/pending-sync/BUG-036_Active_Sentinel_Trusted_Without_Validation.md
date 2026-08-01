---
bug_id: BUG-036
parent_ref: EPIC-043
parent_cleargate_id: "EPIC-043"
sprint_cleargate_id: "SPRINT-99"
carry_over: false
status: Triaged
severity: P2-Medium
reporter: sandrinio
approved: true
area: cli
context_source: verified codebase grounding — live phantom sprint in this repo (.cleargate/sprint-runs/SPRINT-99), dated evidence in .cleargate/hook-log/token-ledger.log
created_at: 2026-08-01T00:00:00Z
updated_at: 2026-08-01T00:00:00Z
created_at_version: 0.20.0
updated_at_version: 0.20.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-01T11:33:02Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-036
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-08-01T11:29:50Z
  sessions: []
---

# BUG-036: The `.active` Sentinel Is Trusted Without Anyone Checking the Sprint Exists

### Open Questions

- **Question:** Should `cleargate doctor` fail (non-zero) when `.active` names a sprint with no plan file, or only warn?
- **Recommended:** Warn at `--session-start` and list it under `doctor`'s findings, but do not fail. A sprint can legitimately exist for a few minutes before its plan lands, and a hard failure on a routine banner would train people to ignore the banner. The failure mode here is silence, not insufficient severity.
- **Human decision:** {populated during Brief review}

- **Question:** How did SPRINT-99 come to exist at all — did `sprint init` run without a plan file, or was the sentinel hand-edited?
- **Recommended:** Determine before fixing. If `sprint init` can create `state.json` for a sprint whose plan does not exist, that is the deeper defect and this bug's fix is a detector for it rather than the cure. `sprint init` runs a decomposition gate (CR-017), so it should not have been reachable.
- **Human decision:** {populated during Brief review}

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** `.cleargate/sprint-runs/.active` names a sprint that exists — one with a plan file under `.cleargate/delivery/`. Anything reading the sentinel (SessionStart banner, token-ledger routing, dashboard, `sprint` subcommands) can rely on that.

**Actual Behavior:** Nothing validates the sentinel. This repo's `.active` names `SPRINT-99`, which has **no plan file anywhere** under `delivery/`, and a `state.json` containing a single fabricated `STORY-99-01` that corresponds to no story document. Every consumer trusts it:

- The SessionStart banner announces `Active sprint detected. Load skill: sprint-execution` on every session.
- `token-ledger.sh` routes rows into `sprint-runs/SPRINT-99/`, where 66,679,111 tokens accumulated.
- `cleargate sprint dashboard` rendered it as a healthy Active sprint and exited 0.

`[[CR-097]]` makes the dashboard *report* this, which is how it was found. It does not stop the sentinel being wrong, and the other consumers still say nothing.

## 2. Reproduction Protocol

Deterministic, from any ClearGate project:

1. `printf 'SPRINT-999\n' > .cleargate/sprint-runs/.active` — a sprint id with no plan file.
2. `mkdir -p .cleargate/sprint-runs/SPRINT-999 && printf '{"schema_version":3,"sprint_id":"SPRINT-999","sprint_status":"Active","stories":{},"last_action":"x","updated_at":"2026-08-01T00:00:00Z"}' > .cleargate/sprint-runs/SPRINT-999/state.json`
3. Start a new session, or run `cleargate doctor --session-start`.
4. **Observe:** the banner reports an active sprint. No command anywhere reports that SPRINT-999 has no plan.
5. `cleargate sprint dashboard` — post-CR-097 this now warns. Every other consumer stays silent.

## 3. Evidence & Context

The live sentinel and its phantom run directory:

```
$ cat .cleargate/sprint-runs/.active
SPRINT-99

$ find .cleargate/delivery -name "*SPRINT-99*"
(no output)

$ cat .cleargate/sprint-runs/SPRINT-99/state.json
{
  "schema_version": 3,
  "sprint_id": "SPRINT-99",
  "sprint_status": "Active",
  "stories": {
    "STORY-99-01": {
      "state": "Ready to Bounce",
      "worktree": ".worktrees/STORY-99-01",
      "lane_assigned_by": "migration-default",
      ...
    }
  },
  "last_action": "Sprint SPRINT-99 initialised",
  "updated_at": "2026-08-01T01:17:51.469Z"
}
```

Ledger routing into the phantom, and the resulting spend:

```
[2026-08-01T01:42:47Z] routing to sprint=SPRINT-99 (sentinel)
[2026-08-01T01:42:47Z] work_item_id from dispatch-marker log: SPRINT-38
[2026-08-01T01:42:47Z] wrote row: sprint=SPRINT-99 agent=architect work_item=SPRINT-38 ...
```

```
$ cleargate sprint dashboard
warning: no sprint plan for SPRINT-99 found under .cleargate/delivery/ — story titles and
  milestone grouping are unavailable. If SPRINT-99 is not a real sprint,
  .cleargate/sprint-runs/.active is stale.
warning: 5 of 5 token-ledger rows attribute work to SPRINT-38 — token spend shown below may
  belong to another sprint
```

Note `last_action: "Sprint SPRINT-99 initialised"` — something ran `sprint init` for a sprint with no plan file. That is the second open question above.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `cleargate-cli/src/commands/sprint-file-locate.ts` — `resolveSprintIdFromSentinel()`, the shared sentinel reader every consumer goes through. The natural place for a validated variant.
- `cleargate-cli/src/commands/doctor.ts` — `--session-start` banner; should report a sentinel naming a sprint with no plan.
- `cleargate-cli/src/commands/sprint.ts` — `sprintInitHandler`; determine whether it can create `state.json` without a plan file (open question 2).
- `cleargate-planning/.claude/hooks/session-start.sh` — emits the `Active sprint detected` line.
- `cleargate-planning/.claude/hooks/token-ledger.sh` — routes on the sentinel; `[[CR-097]]` bounded the *attribution*, not the routing.

**Out of scope:** the dashboard, which `[[CR-097]]` already handles. Deleting this repo's SPRINT-99 state is an operational cleanup, not part of the fix.

## 5. Verification Protocol (The Failing Test)

**Command:** `cd cleargate-cli && npm test`

A failing test that proves the bug: seed a project whose `.active` names a sprint with no plan file, run the `doctor --session-start` handler, and assert the banner mentions the stale sentinel. It fails today — the banner reports a healthy active sprint.

The fix is proven when that test passes and the existing session-start tests still do.

---

## Prior work

- [[CR-097]] — surfaced this bug; makes the dashboard report the condition but does not validate the sentinel or fix the other consumers.
- [[CR-086]] — gitignored runtime sentinels (`.active`) are absent in linked worktrees; the same file, a different failure.
- [[CR-017]] — introduced the `sprint init` decomposition gate, which should have made a plan-less sprint unreachable. Relevant to open question 2.
- No prior item covers validating that the sentinel names a real sprint.

## Context Source

**context_source:** verified codebase grounding. Found while diagnosing a dashboard complaint: the phantom sprint is live in this repo, and `.cleargate/hook-log/token-ledger.log` dates both the routing and the misattribution. No PM-tool or remote input.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — promoted from 🟡 at Gate 1**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
