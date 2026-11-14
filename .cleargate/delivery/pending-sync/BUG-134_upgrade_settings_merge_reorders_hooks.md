---
bug_id: BUG-134
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-45
carry_over: false
area: cli-upgrade
status: Draft
severity: P3-Low
reporter: orchestrator (field upgrade watch 0.27.0 → 0.30.1 in a Python target repo, replayed on a scratch copy, 2026-11-13)
approved: true
approved_by: sandrinio
approved_at: 2026-11-14T00:00:00Z
context_source: "Field upgrade watch 2026-11-13: .claude/settings.json hook order before and after the replayed 0.27.0 → 0.30.1 upgrade of a repo with two user hooks (a guard on Edit|Write and on Bash); the session had to compare hooks as sets to confirm nothing was lost; code grounding at cli main dbccc79: src/lib/settings-json-surgery.ts:106 (removeClearGateHooks), src/init/merge-settings.ts:50-100 (mergeSettings: upstream groups pushed after the user's, upstream hooks appended after the user's in a shared group)"
created_at: 2026-11-13T09:14:27.410Z
updated_at: 2026-11-13T23:02:54Z
created_at_version: strategy-phase-pre-init
updated_at_version: 37c2b2f1-dirty
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-13T23:02:54Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-134
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-13T09:22:47Z
  sessions: []
last_contradict_sha: "4fc37402096e4f61ca75b17610053576ee3e61e8c7c1c2c7e299f95ea6accadd"
---

# BUG-134: Upgrade reorders the hooks in .claude/settings.json

### Open Questions

- **Question:** What order should the merged file have?
- **Recommended:** Upstream's order for ClearGate's groups and hooks, with each of the user's hooks kept right after the ClearGate hooks of the group it was in, and the user's own groups kept after upstream's groups in their original relative order. That is what a fresh `init` plus the user's hooks produces, so a repo that changed nothing gets the same bytes from every upgrade.
- **Human decision:** As recommended (owner approved with the SPRINT-45 Brief, 2026-11-14). Events keep the user's placement: an event only the user has stays before the ClearGate event it preceded; an event upstream adds takes upstream's position. *(CR:spec-clarification, SPRINT-45 M1 plan, 2026-11-14.)*

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** After upgrade, `git diff .claude/settings.json` shows only the hooks ClearGate added, removed or changed. The order of everything else is unchanged.

**Actual Behavior:** Upgrade removes ClearGate's hooks (`removeClearGateHooks`) and merges upstream's back in (`mergeSettings`, `merge-settings.ts:50-100`), which pushes an upstream group after the user's groups and appends upstream hooks after the user's hooks in a shared group. Groups that held only ClearGate hooks move to the end of their event; in a group the user had added a hook to, the user's hook moves first. The diff against HEAD is mostly reordering, so the field session had to compare the hooks as sets to confirm nothing was lost. Claude Code runs a group's matching hooks in parallel, so this is review cost, not a behaviour change.

## 2. Reproduction Protocol
1. A repo installed at 0.27.0 whose `.claude/settings.json` has a user hook `guard.sh` added to ClearGate's `PreToolUse` `Edit|Write` group and a user `PreToolUse` `Bash` group holding `guard.sh`.
2. `cleargate upgrade --yes` (0.30.1).
3. List each event's groups and hooks in order, before and after.

Edge conditions:
- A repo with no user hooks gets upstream's file exactly.
- A user group under an event ClearGate does not use is untouched.
- Running upgrade twice leaves the file byte-identical the second time.
- User hooks are never dropped (BUG-093).

## 3. Evidence & Context
Hook order before (0.27.0 install) and after the replayed upgrade (0.30.1), `<event> <matcher> [hooks]`:
```
before:
PreToolUse 'Task|Agent' ['pending-task-sentinel.sh --host claude', 'pre-tool-use-task.sh']
PreToolUse 'Edit|Write' ['pre-edit-gate.sh --host claude', 'pre-edit-codex-guard.sh']
PreToolUse 'AskUserQuestion' ['pre-tool-use-autonomy.sh']
PreToolUse 'Bash' ['pre-edit-codex-guard.sh']
after:
PreToolUse 'Edit|Write' ['pre-edit-codex-guard.sh', 'pre-edit-gate.sh --host claude']
PreToolUse 'Bash' ['pre-edit-codex-guard.sh']
PreToolUse 'Task|Agent' ['pending-task-sentinel.sh --host claude', 'pre-tool-use-task.sh']
PreToolUse 'AskUserQuestion' ['pre-tool-use-autonomy.sh']
```
(`SubagentStop`, `PostToolUse` and `SessionStart` kept their order; `PostToolUse` `Bash` → `post-shell-ingest.sh` was added, as intended.)

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/src/init/merge-settings.ts` (`mergeSettings` ordering).
- `cleargate-cli/src/lib/settings-json-surgery.ts` (if the merge needs each removed hook's former position).
- `cleargate-cli/src/commands/upgrade.ts` (the settings.json call site only).
- `cleargate-cli/src/hosts/claude.ts` and `cleargate-cli/src/hosts/codex.ts` — added 2026-11-14 from the SPRINT-45 design review: these hold the real merge call sites (`removeClearGateHooks` then `mergeSettings`, claude.ts:363-368, codex.ts:313-316). The upgrade command file has no direct call.
- Only upgrade's take path changes: a new `mergeUpstreamSettings` in `merge-settings.ts`, called from `mergeSurgeryTarget` in `hosts/claude.ts` and `hosts/codex.ts`. `mergeSettings`, the install paths and `upgrade.ts` are unchanged. New integration red: `cleargate-cli/test/commands/upgrade-settings-order.red.integration.node.test.ts`. *(CR:spec-clarification, SPRINT-45 M1 plan, 2026-11-14.)*

**Do NOT modify:** which hooks are ClearGate's (`clearGateHooksProjection`, BUG-122); the keep-user-hooks rule (BUG-093); `init` into a settings.json with no ClearGate hooks (BUG-092).

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/init/merge-settings-order.red.node.test.ts`

| Axis | Cover | Reason |
|---|---|---|
| Paths | F | one merge path |
| Interfaces | F | `init` and upgrade share `mergeSettings`; the unit test drives it |
| Data | T | user hook in a ClearGate group, own group, no user hooks |
| Rules | T | idempotent; no hook dropped |

```gherkin
Feature: Upgrade keeps the order of .claude/settings.json

  @data
  Scenario Outline: Merging upstream keeps the user's layout
    Given a settings file with <user hooks> and upstream's hooks unchanged
    When upgrade merges upstream's settings
    Then the result lists every event's groups and hooks in <order>

    Examples:
      | user hooks                                      | order                                                              |
      | none                                            | upstream's order                                                   |
      | guard.sh in ClearGate's Edit/Write group        | Edit/Write: pre-edit-gate.sh, then guard.sh; groups in upstream order |
      | guard.sh in its own Bash group                  | upstream's PreToolUse groups, then the Bash group                  |

  @rules
  Scenario: A second upgrade changes nothing
    Given the output of one merge
    When the same upstream settings are merged into it again
    Then the file is byte-identical

  @rules
  Scenario: No user hook is dropped
    Given user hooks under PreToolUse, PostToolUse and SessionStart
    When upgrade merges upstream's settings
    Then every user hook is present with its matcher
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 5 | one per example row and rule |
| Integration tests | 1 | upgrade `--yes` on a fixture install with user hooks |
| E2E / acceptance tests | 0 | the next field upgrade |

---

## Prior work

- [[BUG-093]] (Completed, 0.30.1): upgrade keeps user hooks by removing only ClearGate's and merging upstream's in; this ordering is a side effect of that merge.
- [[BUG-092]] (Draft): `init` into an existing settings.json wires only some hooks; related.
- [[BUG-122]] (Completed, 0.30.1): hashes settings.json by ClearGate's hooks alone.

## Context Source

**context_source:** field upgrade watch 2026-11-13, replayed on a scratch copy; code grounding at cli main `dbccc79`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
