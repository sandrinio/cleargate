<instructions>
FOLLOW THIS EXACT STRUCTURE. Output sections in order 1-5.
YAML Frontmatter: Bug ID, Parent Ref, Status, Severity, Reporter, Approved gate.
§1 The Anomaly: Expected vs. Actual behavior.
§2 Reproduction Protocol: Deterministic steps to recreate.
§3 Evidence & Context: Raw logs, stack traces, payloads — no paraphrasing.
§4 Execution Sandbox: Exact file paths to investigate. Restrict scope to prevent unrelated refactoring.
Task Breakdown: one `- [ ] <action>` row per executable step, in execution order. REQUIRED at L3 and above, optional at L2, omit the section entirely at L1. An absent section passes the gate; a present-but-empty one fails. Task Breakdown rows implement the Gherkin scenarios in §5; no row is written for an axis marked F.
§5 Verification Protocol: The failing test that proves the bug exists and proves the fix resolves it. §5 also carries a SPIDR coverage table (axes: Paths, Interfaces, Data, Rules) above a Gherkin block. Paths = more than one *successful* way through (the baseline error scenario is not a path). Interfaces = more than one surface exposes the behaviour (CLI / API / UI / hook). Data = behaviour differs by data type, shape or volume — usually a Scenario Outline with Examples. Rules = a business rule constrains the outcome — one scenario per rule, including breaking it. Tag each covered scenario with the matching `@paths` / `@interfaces` / `@data` / `@rules` marker directly above `Scenario:` / `Scenario Outline:`. There is no Spike row: open discovery is chartered as a SPIKE item before this Bug is written.
Output location: .cleargate/delivery/pending-sync/BUG-092_init-existing-settings-wires-two-of-seven-hooks.md

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
bug_id: BUG-092
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: init,settings-json,hooks
status: Draft
severity: P1-High
reporter: orchestrator (SPRINT-41 STORY-058-07 post-flight FU-3)
approved: false
context_source: measured by the STORY-058-07 Architect post-flight (reports/STORY-058-07-arch.md finding 3, FU-3; plans/M3.md M3-A44 probe) and verified against cleargate-cli src/hosts/claude.ts:26-56 and :95-110 on story/STORY-058-07 @ b146faf
created_at: 2026-09-26T00:00:00Z
updated_at: 2026-09-25T23:27:55Z
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
  last_gate_check: 2026-09-25T23:27:55Z
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

# BUG-092: `cleargate init` into an existing `.claude/settings.json` wires only 2 of the 7 ClearGate hooks

### Open Questions

- **Question:** Where should the Claude adapter get the hook set it merges into an existing settings file: the canonical payload's `.claude/settings.json`, read at install time, or a `CLAUDE_HOOK_ADDITION` constant widened to all 7 hooks?
- **Recommended:** Read the payload's `.claude/settings.json` at install time and merge its `hooks`. This leaves one source of truth, and it cannot drift from the shipped file. A hand-kept literal has already drifted once: BUG-089's byte-mismatch, where a literal that differs from the canonical command makes `mergeSettings`' exact-string dedup append a duplicate.
- **Human decision:** {pending Gate 1}

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** `cleargate init` in a repo that already has a `.claude/settings.json` installs all 7 ClearGate hook commands, the same set a fresh install writes, and keeps every user-authored key and hook.

**Actual Behavior:**
- The non-force payload copy skips the existing file (`cleargate-cli/src/init/copy-payload.ts:194-202`).
- The Claude adapter's `install()` then merges only `CLAUDE_HOOK_ADDITION` into it (`src/hosts/claude.ts:26-56` and `:107-108`). That addition holds just `pre-edit-gate.sh --host claude` (PreToolUse `Edit|Write`) and `stamp-and-gate.sh` (PostToolUse).
- These never land:
  - the SessionStart banner (`session-start.sh`)
  - the `Task|Agent` flashcard gate and dispatch sentinel (`pending-task-sentinel.sh`, `pre-tool-use-task.sh`)
  - the SubagentStop token ledger (`token-ledger.sh`)
  - the autonomy guard (`pre-tool-use-autonomy.sh`)
- Every Claude Code repo with project settings therefore runs ClearGate with most of its enforcement silently absent.
- The M2 `user-content` parity baseline records this 2-hook outcome as expected (`test/helpers/init-fixture.ts` T2 row).
- STORY-058-07 made it reachable on the default uninstall → re-init path. Its M3-A44 remediation closes only the empty-residue case, not user-authored files.

## 2. Reproduction Protocol
1. In a scratch directory outside any repo: `git init`, then write `.claude/settings.json` = `{"permissions":{"allow":["Bash(ls)"]}}`.
2. Run `node <cli>/dist/cli.js init --yes` in that directory, as one `(cd <dir> && …)` call.
3. Count the hook commands: `node -e 'const s=require("./.claude/settings.json");console.log(Object.values(s.hooks).flat().flatMap(e=>e.hooks).length)'` → `2`.
4. Repeat in a second scratch directory with no pre-existing `.claude/settings.json` → `7`, byte-equal to the payload's `.claude/settings.json`.

Edge conditions:
- a pre-existing file holding user hooks under ClearGate's events (they must survive)
- a pre-existing file holding a stale ClearGate variant (STORY-058-07's `supersedeHookCommands` must still replace it)
- a malformed existing file (today: a warning, then treated as empty)

## 3. Evidence & Context
```
cleargate-cli/src/hosts/claude.ts @ b146faf
 26  export const CLAUDE_HOOK_ADDITION: SettingsJson = {
 27    hooks: {
 28      PreToolUse: [ { matcher: 'Edit|Write', hooks: [ { … pre-edit-gate.sh --host claude } ] } ],
 44      PostToolUse: [ { matcher: 'Edit|Write', hooks: [ { … stamp-and-gate.sh } ] } ],
107    const supersededSettings = d.supersedeHookCommands(existingSettings, CLAUDE_HOOK_ADDITION);
108    const mergedSettings = d.mergeSettings(supersededSettings, CLAUDE_HOOK_ADDITION);

STORY-058-07 post-flight probe (plans/M3.md M3-A44): fresh install → uninstall (b146faf, file left as {}) → non-force re-init
  main 170ac4c: 7 hook commands after re-init;  b146faf: 2 hook commands after re-init
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/src/hosts/claude.ts`: `install()` step 4, the settings merge. Stop merging only `CLAUDE_HOOK_ADDITION`; keep `supersedeHookCommands`.
- `cleargate-cli/src/init/merge-settings.ts`: only if the merge needs a helper.
- `cleargate-cli/test/helpers/init-fixture.ts`: the `user-content` T2 `SANCTIONED_BASELINE_DELTAS` row. The fix changes the recorded `currentHash`, so add a new strict row per M3-A8.
- Do not touch `upgrade.ts` merge surgery; that is BUG-093.

## Task Breakdown
- [ ] QA-Red: init over a pre-existing settings file (user permissions; user hooks under a ClearGate event) yields all 7 canonical commands plus the user entries
- [ ] Merge the payload's canonical `.claude/settings.json` hooks in `claude.ts` `install()` instead of `CLAUDE_HOOK_ADDITION` alone
- [ ] Add the new strict sanctioned `user-content` row; re-run both M2 parity files in compare mode

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/hosts/claude-adapter-init-settings.red.node.test.ts` (new), then both M2 parity files in compare mode, each run solo.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Two successful installs: into an existing settings file, and fresh (unchanged) |
| Interfaces | F | One surface: `cleargate init` (host add reuses the same `install()`) |
| Data | T | Existing file shapes: user permissions only, user hooks under a ClearGate event, a stale ClearGate variant |
| Rules | T | User-authored entries are never removed; stale ClearGate variants are superseded |

```gherkin
Feature: init wires the full hook set into an existing settings file

  @paths
  Scenario: An existing settings file receives all seven ClearGate hooks
    Given a repo whose .claude/settings.json holds only user permissions
    When cleargate init --yes runs
    Then .claude/settings.json holds all seven canonical ClearGate hook commands
    And the user permissions are unchanged

  @data
  Scenario Outline: Existing file shapes keep their user content
    Given a repo whose .claude/settings.json holds <shape>
    When cleargate init --yes runs
    Then every canonical ClearGate hook command is present exactly once
    And the user content is preserved
    Examples:
      | shape |
      | a user hook under PreToolUse |
      | a stale pre-edit-gate.sh command without --host claude |

  @rules
  Scenario: A fresh install is unchanged
    Given a repo with no .claude/settings.json
    When cleargate init --yes runs
    Then .claude/settings.json is byte-equal to the payload's .claude/settings.json
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 3 | one per scenario (the outline counts once per example) |
| Integration tests | 1 | both M2 parity files with the new strict row |
| E2E / acceptance tests | 0 | the -09 clean-room baseline covers fresh installs only |

---

## Prior work

- [[BUG-089]] — made `CLAUDE_HOOK_ADDITION` byte-match the canonical command; its flashcard records why a hand-kept hook literal is brittle. This bug removes the partial-set limitation that literal imposes.
- [[STORY-058-07]] — made the defect reachable on the uninstall → re-init path; its M3-A44 remediation removes an emptied settings file, and its post-flight filed this as FU-3.
- [[STORY-058-03]] — the `HostAdapter` contract and the Claude adapter `install()` this bug changes.
- [[BUG-085]] — adjacent: live-instance drift, not install-time wiring.

## Context Source

**context_source:** STORY-058-07 Architect post-flight (FU-3) and the M3-A44 probe, verified against `cleargate-cli/src/hosts/claude.ts` on `story/STORY-058-07` @ `b146faf`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity** — the hook-source question is open; approval pending.

- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
