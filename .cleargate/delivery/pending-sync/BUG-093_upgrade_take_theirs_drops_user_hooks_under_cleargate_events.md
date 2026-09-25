<instructions>
FOLLOW THIS EXACT STRUCTURE. Output sections in order 1-5.
YAML Frontmatter: Bug ID, Parent Ref, Status, Severity, Reporter, Approved gate.
§1 The Anomaly: Expected vs. Actual behavior.
§2 Reproduction Protocol: Deterministic steps to recreate.
§3 Evidence & Context: Raw logs, stack traces, payloads — no paraphrasing.
§4 Execution Sandbox: Exact file paths to investigate. Restrict scope to prevent unrelated refactoring.
Task Breakdown: one `- [ ] <action>` row per executable step, in execution order. REQUIRED at L3 and above, optional at L2, omit the section entirely at L1. An absent section passes the gate; a present-but-empty one fails. Task Breakdown rows implement the Gherkin scenarios in §5; no row is written for an axis marked F.
§5 Verification Protocol: The failing test that proves the bug exists and proves the fix resolves it. §5 also carries a SPIDR coverage table (axes: Paths, Interfaces, Data, Rules) above a Gherkin block. Paths = more than one *successful* way through (the baseline error scenario is not a path). Interfaces = more than one surface exposes the behaviour (CLI / API / UI / hook). Data = behaviour differs by data type, shape or volume — usually a Scenario Outline with Examples. Rules = a business rule constrains the outcome — one scenario per rule, including breaking it. Tag each covered scenario with the matching `@paths` / `@interfaces` / `@data` / `@rules` marker directly above `Scenario:` / `Scenario Outline:`. There is no Spike row: open discovery is chartered as a SPIKE item before this Bug is written.
Output location: .cleargate/delivery/pending-sync/BUG-093_upgrade-take-theirs-drops-user-hooks-under-cleargate-events.md

POST-WRITE BRIEF
After Writing this document, render a Brief in chat with the following sections,
mechanically extracted from the document's own structure:

  - Prior work    ← cleargate-wiki-query result (cite [[IDs]] or write "none found")
  - Summary        ← §1 The Anomaly (repro)
  - Open Questions ← ### Open Questions
  - Edge Cases     ← §2 Reproduction Protocol (edge conditions)
  - SPIDR          ← §5 Verification Protocol (SPIDR coverage table)
  - Risks          ← §4 Execution Sandbox (suspected blast radius)
  - Ambiguity      ← bottom-of-doc ambiguity gate block

Halt for human review. When ambiguity reaches 🟢, proceed to call cleargate_push_item.
Do NOT ask separately for push confirmation — Brief approval covers it.

Do NOT output these instructions.
</instructions>

---
bug_id: BUG-093
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: upgrade,settings-json,hooks
status: Draft
severity: P2-Medium
reporter: orchestrator (SPRINT-41 STORY-058-07 post-flight FU-4)
approved: false
context_source: found by the STORY-058-07 Architect post-flight (reports/STORY-058-07-arch.md FU-4) and verified against cleargate-cli src/hosts/claude.ts mergeSurgeryTarget (the settings branch, moved verbatim from upgrade.ts take-theirs) on story/STORY-058-07 @ b146faf
created_at: 2026-09-26T00:00:00Z
updated_at: 2026-09-25T23:27:56Z
created_at_version: strategy-phase-pre-init
updated_at_version: 820a2f42-dirty
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
  last_gate_check: 2026-09-25T23:27:56Z
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

# BUG-093: `cleargate upgrade` take-theirs merge drops user hooks under any event ClearGate also uses

### Open Questions

- **Question:** Should the fix reuse `mergeSettings(removeClearGateHooks(ours), theirs)`, the form SPRINT-41 M5 AD-4 specifies for Codex, or merge per matcher inside the existing spread?
- **Recommended:** Reuse `mergeSettings(removeClearGateHooks(ours), theirs)`. It already preserves user matchers and dedups by exact command, and the Codex adapter will use the same form, so both hosts share one merge rule.
- **Human decision:** {pending Gate 1}

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** When `cleargate upgrade` takes the upstream `.claude/settings.json`, whether through `upgrade --yes` or a merge-3way `t` choice, ClearGate's hooks are replaced by the new ones and every user-authored hook survives, including user hooks under `PreToolUse`, `PostToolUse`, `SessionStart` or `SubagentStop`.

**Actual Behavior:**
- The take-theirs surgery strips ClearGate hooks from `ours`, then builds `merged.hooks = { ...(withoutOurCg.hooks ?? {}), ...cgHooks }`.
- That spread replaces each event array wholesale. For any event that `theirs` also declares, the user's entries under that event are lost.
- ClearGate declares all four common events, so on a real upgrade the user keeps only hooks under events ClearGate does not use.
- The code predates SPRINT-41. STORY-058-07 moved it verbatim from `upgrade.ts` into `claude.ts` `mergeSurgeryTarget`.

## 2. Reproduction Protocol
1. Take `ours` = the canonical `.claude/settings.json` plus a user entry `{"matcher":"Bash","hooks":[{"type":"command","command":"./my-hook.sh"}]}` appended to `hooks.PreToolUse`. Take `theirs` = the canonical file.
2. Call the surgery directly, as one read-only process: `node --import tsx/esm -e "import('./src/hosts/claude.ts').then(m=>console.log(m.createClaudeAdapter().mergeSurgeryTarget('.claude/settings.json', OURS, THEIRS, {stderr: console.error})))"` from `cleargate-cli/`.
3. Observe that `./my-hook.sh` is absent from the output.
4. Control: put the same user entry under an event ClearGate never declares, such as `Notification`. It survives.

Edge conditions:
- a user hook inside a ClearGate matcher (for example `Edit|Write`) must survive
- `theirs` without a `hooks` key must leave the user hooks untouched
- malformed JSON on either side keeps today's full-overwrite fallback

## 3. Evidence & Context
```
cleargate-cli/src/hosts/claude.ts @ b146faf, mergeSurgeryTarget, settings branch
  const withoutOurCg = d.removeClearGateHooks(ourSettings);
  const cgHooks = theirSettings.hooks ?? {};
  const merged: ClaudeSettings = { ...withoutOurCg };
  if (Object.keys(cgHooks).length > 0) {
    merged.hooks = { ...(withoutOurCg.hooks ?? {}), ...cgHooks };   // per-event spread: user arrays replaced
  }
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/src/hosts/claude.ts`: `mergeSurgeryTarget`, the `.claude/settings.json` branch only.
- The tests: `test/commands/upgrade-claude-md.red.node.test.ts` (it must stay green) and a new red for the settings branch.
- Do not touch init's merge; that is BUG-092.

## Task Breakdown
- [ ] QA-Red: take-theirs keeps a user hook under PreToolUse and inside a ClearGate matcher; ClearGate hooks are replaced by theirs
- [ ] Replace the per-event spread with `mergeSettings(removeClearGateHooks(ours), theirs)`
- [ ] Re-run the upgrade witnesses solo

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/hosts/claude-merge-surgery-settings.red.node.test.ts` (new), plus `test/commands/upgrade-claude-md.red.node.test.ts` and `test/commands/upgrade.node.test.ts`, each run solo.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Two successful merges: user hook under a ClearGate event, and under a non-ClearGate event (control) |
| Interfaces | F | One surface: the upgrade take-theirs surgery |
| Data | T | User hook in its own matcher vs inside a ClearGate matcher |
| Rules | T | User hooks are never dropped; ClearGate hooks always come from theirs |

```gherkin
Feature: upgrade take-theirs preserves user hooks

  @paths @rules
  Scenario: A user hook under a ClearGate event survives take-theirs
    Given .claude/settings.json holds a user Bash hook under PreToolUse
    When upgrade takes the upstream settings.json
    Then the user Bash hook is still present
    And the ClearGate hooks equal the upstream ClearGate hooks

  @data
  Scenario: A user hook inside a ClearGate matcher survives take-theirs
    Given a user command inside the Edit|Write PreToolUse matcher
    When upgrade takes the upstream settings.json
    Then the user command is still present beside the upstream ClearGate command
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 2 | one per scenario |
| Integration tests | 1 | `upgrade --yes` over a user-hook fixture |
| E2E / acceptance tests | 0 | none |

---

## Prior work

- [[STORY-009-05]] — the original three-way merge driver; it did not specify per-event hook preservation.
- [[STORY-058-07]] — moved this surgery verbatim into `claude.ts` `mergeSurgeryTarget`; its post-flight filed this as FU-4.
- [[BUG-089]] — adjacent: hook command byte-matching in the merge, not event-level preservation.

## Context Source

**context_source:** STORY-058-07 Architect post-flight (FU-4), verified against `cleargate-cli/src/hosts/claude.ts` `mergeSurgeryTarget` on `story/STORY-058-07` @ `b146faf`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity** — the merge-form question is open; approval pending.

- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
